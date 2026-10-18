-- 0074 · Fogón 1 · 1: los dos interruptores y cada llamada apuntada (decisión 0097)
--
-- Fogón empieza a hablar. Para que no se vaya de las manos hacen falta dos cosas en la
-- base, y nada más:
--
--   A · **Si está encendido.** Dos interruptores, los dos del admin: uno general (para
--       un cambio de IA o un mantenimiento, apaga a todos a la vez) y uno por cliente.
--       Los dos empiezan apagados: Fogón no habla con nadie hasta que Richi lo enciende.
--   B · **Cada llamada al modelo, apuntada**: quién, en qué local, qué se preguntó,
--       cuántos tokens y lo que costó. De ahí salen los topes (créditos y euros, por
--       día y por mes) y lo que mira Richi con el piloto. Y es la regla tres de la 0023:
--       el día que alguien diga «Fogón me contó cosas de otro local», se puede mirar.
--
-- Los topes no viven aquí: son números del código (`@estook/dominio`, `fogon.ts`), y se
-- calculan sumando las llamadas del día y del mes. Sin contador aparte que se desfase.

-- ═══════════════════════════════════════════════════════════════════════════
-- A · Los dos interruptores
-- ═══════════════════════════════════════════════════════════════════════════

create table plataforma.fogon (
  -- Una sola fila, y lo dice la base (como la oferta de prueba, 0038).
  unica         boolean      primary key default true,
  encendido     boolean      not null default false,
  cambiado_en   timestamptz  not null default now(),
  cambiado_por  uuid             null references estook.persona (id) on delete restrict,
  constraint fogon_una_sola check (unica)
);

comment on table plataforma.fogon is
  'El interruptor general de Fogón: apagado, no habla con nadie. Una sola fila; la cambia un admin total (0097).';

insert into plataforma.fogon (unica) values (true);

create table plataforma.fogon_del_cliente (
  organizacion_id  uuid         primary key references estook.organizacion (id) on delete cascade,
  encendido        boolean      not null default false,
  cambiado_en      timestamptz  not null default now(),
  cambiado_por     uuid             null references estook.persona (id) on delete restrict
);

comment on table plataforma.fogon_del_cliente is
  'Si Fogón está encendido para un cliente. Sin fila, apagado. Lo cambia un admin total (0097).';

alter table plataforma.fogon enable row level security;
alter table plataforma.fogon_del_cliente enable row level security;

-- Los leen los admins; los cambia el admin total. La app no los lee: pregunta a
-- `estook.como_esta_fogon`, que solo dice cómo está para su organización.
create policy fogon_lectura on plataforma.fogon
  for select using (plataforma.nivel_de(estook.persona_actual()) is not null);

create policy fogon_escritura on plataforma.fogon
  for update using (plataforma.nivel_de(estook.persona_actual()) = 'total')
  with check (plataforma.nivel_de(estook.persona_actual()) = 'total');

create policy fogon_del_cliente_lectura on plataforma.fogon_del_cliente
  for select using (plataforma.nivel_de(estook.persona_actual()) is not null);

create policy fogon_del_cliente_alta on plataforma.fogon_del_cliente
  for insert with check (plataforma.nivel_de(estook.persona_actual()) = 'total');

create policy fogon_del_cliente_cambio on plataforma.fogon_del_cliente
  for update using (plataforma.nivel_de(estook.persona_actual()) = 'total')
  with check (plataforma.nivel_de(estook.persona_actual()) = 'total');

revoke all on plataforma.fogon from public;
revoke all on plataforma.fogon_del_cliente from public;
grant select, update on plataforma.fogon to estook_api;
grant select, insert, update on plataforma.fogon_del_cliente to estook_api;

-- Cómo está Fogón para una organización: `encendido`, `apagado_general` (mantenimiento)
-- o `apagado_cliente`; y su plan, que dice cuántos créditos tiene (`@estook/dominio`).
-- Con privilegio porque la app no lee `plataforma` y un camarero no lee la suscripción;
-- y solo contesta a quien es de esa organización, que es a quien le importa.
create function estook.como_esta_fogon(p_organizacion uuid)
returns table (como text, plan text, de_la_casa boolean)
language sql
stable
security definer
set search_path = estook, plataforma, pg_catalog, pg_temp
as $$
  select
    case
      when not coalesce((select f.encendido from plataforma.fogon f where f.unica), false)
        then 'apagado_general'
      when not coalesce(
        (select c.encendido from plataforma.fogon_del_cliente c where c.organizacion_id = p_organizacion),
        false
      ) then 'apagado_cliente'
      else 'encendido'
    end,
    s.plan,
    coalesce(s.de_la_casa, false)
  from (select 1) as una
  left join estook.suscripcion s on s.organizacion_id = p_organizacion
  where exists (
    select 1 from estook.organizaciones_visibles(estook.persona_actual()) v
     where v.organizacion_id = p_organizacion
  )
$$;

comment on function estook.como_esta_fogon(uuid) is
  'Si Fogón habla en una organización (encendido, apagado_general o apagado_cliente) y su plan. Solo a sus miembros (0097).';

revoke all on function estook.como_esta_fogon(uuid) from public;
grant execute on function estook.como_esta_fogon(uuid) to estook_api;

-- ═══════════════════════════════════════════════════════════════════════════
-- B · Cada llamada, apuntada
-- ═══════════════════════════════════════════════════════════════════════════

create table estook.llamada_a_fogon (
  id                     uuid         primary key default gen_random_uuid(),
  organizacion_id        uuid         not null references estook.organizacion (id) on delete cascade,
  local_id               uuid         not null references estook.local (id) on delete cascade,
  persona_id             uuid             null references estook.persona (id) on delete set null,
  -- Qué se le pidió. Cada cosa gasta sus créditos (`@estook/dominio`, `fogon.ts`).
  que                    text         not null,
  -- Dónde estaba quien preguntó: la app y la pantalla («almacen/compras»).
  donde                  text             null,
  -- Lo que escribió la persona, recortado. Ni una cifra del local: eso es el resumen.
  pregunta               text             null,
  -- El sello del resumen que se mandó (0023): de qué local, a qué hora y de qué tamaño.
  sello                  jsonb        not null default '{}'::jsonb,
  modelo                 text         not null,
  tokens_entrada         integer      not null default 0,
  tokens_cache_leidos    integer      not null default 0,
  tokens_cache_escritos  integer      not null default 0,
  tokens_salida          integer      not null default 0,
  -- Lo que costó, en millonésimas de euro: los topes en euros suman esto.
  coste_micro_euros      integer      not null default 0,
  creditos               smallint     not null,
  hecha_en               timestamptz  not null default now(),

  constraint llamada_a_fogon_que check (que in ('preguntar', 'rellenar_escandallo', 'escribir_pasos')),
  constraint llamada_a_fogon_donde_corto check (donde is null or char_length(donde) <= 80),
  constraint llamada_a_fogon_pregunta_corta check (pregunta is null or char_length(pregunta) <= 600),
  constraint llamada_a_fogon_sello_objeto check (jsonb_typeof(sello) = 'object'),
  constraint llamada_a_fogon_tokens_no_negativos check (
    tokens_entrada >= 0 and tokens_cache_leidos >= 0 and tokens_cache_escritos >= 0 and tokens_salida >= 0
  ),
  constraint llamada_a_fogon_coste_no_negativo check (coste_micro_euros >= 0),
  constraint llamada_a_fogon_creditos check (creditos between 1 and 20)
);

comment on table estook.llamada_a_fogon is
  'Cada llamada de Fogón al modelo: quién, dónde, qué, sus tokens y lo que costó. De aquí salen los topes (0023, 0097).';

-- Los topes suman el día y el mes de un local: por local y hora.
create index llamada_a_fogon_por_local on estook.llamada_a_fogon (local_id, hecha_en);
-- Lo que mira el admin: lo de cada cliente este mes.
create index llamada_a_fogon_por_cliente on estook.llamada_a_fogon (organizacion_id, hecha_en);

alter table estook.llamada_a_fogon enable row level security;

-- La ves tú, la ve quien lleva Ajustes en ese local (lo que lleva gastado), y los admins.
create policy llamada_a_fogon_lectura on estook.llamada_a_fogon
  for select using (
    persona_id = estook.persona_actual()
    or estook.puede_ver('app.ajustes', local_id)
    or plataforma.nivel_de(estook.persona_actual()) is not null
  );

-- La apunta quien pregunta, en un local donde tiene Fogón, y a su nombre.
create policy llamada_a_fogon_alta on estook.llamada_a_fogon
  for insert with check (
    persona_id = estook.persona_actual()
    and estook.puede_ver('app.fogon', local_id)
  );

-- Solo se lee y se añade: lo apuntado no se cambia ni se borra (0089).
revoke all on estook.llamada_a_fogon from public;
grant select, insert on estook.llamada_a_fogon to estook_api;

-- Lo gastado en un local hoy y este mes, **de todo el local**: los topes son del local,
-- no de quien pregunta, y un camarero solo lee sus propias llamadas. Por eso con
-- privilegio, y solo a quien tiene Fogón en ese local. El día y el mes, los del
-- calendario del local («mañana vuelve», «el día 1 vuelven»).
create function estook.lo_gastado_en_fogon(p_local uuid)
returns table (creditos_hoy integer, creditos_mes integer, micro_euros_hoy bigint, micro_euros_mes bigint)
language sql
stable
security definer
set search_path = estook, pg_catalog, pg_temp
as $$
  with zona as (
    select l.zona_horaria as z from estook.local l where l.id = p_local
  ),
  desde as (
    select (date_trunc('day', now() at time zone z.z) at time zone z.z) as dia,
           (date_trunc('month', now() at time zone z.z) at time zone z.z) as mes
      from zona z
  )
  select
    coalesce(sum(f.creditos) filter (where f.hecha_en >= d.dia), 0)::integer,
    coalesce(sum(f.creditos), 0)::integer,
    coalesce(sum(f.coste_micro_euros) filter (where f.hecha_en >= d.dia), 0)::bigint,
    coalesce(sum(f.coste_micro_euros), 0)::bigint
  from desde d
  left join estook.llamada_a_fogon f on f.local_id = p_local and f.hecha_en >= d.mes
  where estook.puede_ver('app.fogon', p_local)
  group by d.dia
$$;

comment on function estook.lo_gastado_en_fogon(uuid) is
  'Créditos y euros de Fogón gastados hoy y este mes en un local, de todo el local. Solo a quien tiene Fogón allí (0097).';

revoke all on function estook.lo_gastado_en_fogon(uuid) from public;
grant execute on function estook.lo_gastado_en_fogon(uuid) to estook_api;
