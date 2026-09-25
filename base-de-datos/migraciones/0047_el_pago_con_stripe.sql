-- 0047 · El pago con Stripe, el estado de la cuenta cumplido y el reloj (decisión 0048)
--
-- Cinco cosas:
--
--   A · La suscripción de cada organización guarda lo que hace falta para cobrarla
--       y para decir cómo está: plan, cada cuánto, cuántos locales, hasta cuándo,
--       si se cancela, desde cuándo no se cobra, los días de prueba que se le
--       ofrecieron y si es **de la casa** (no se cobra: `ikatz` y los ejemplos).
--   B · Toda organización nueva nace **pendiente de pago** (salvo los ejemplos):
--       sin pago no hay app, también con la oferta de prueba encendida.
--   C · Lo que es de Stripe y del sistema, en `plataforma`, y solo lo lee el
--       sistema: el catálogo de Stripe y el secreto de su aviso, los avisos ya
--       aplicados, los correos de la cuenta ya mandados y el historial de cambios.
--   D · Dos funciones con privilegio: cambiar la suscripción (la llaman Stripe y el
--       reloj, que no tienen persona) y leer las cuentas (el reloj y el admin).
--   E · El reloj de la 0016: `pg_cron` llama cada hora a la API. Solo donde existe
--       `pg_cron` (Supabase); en las bases de las pruebas no hace nada.

-- ═══════════════════════════════════════════════════════════════════════════
-- A · La suscripción, con lo que hace falta para cobrarla
-- ═══════════════════════════════════════════════════════════════════════════

alter table estook.suscripcion
  add column intervalo          text,
  add column locales_pagados    smallint,
  add column periodo_hasta      timestamptz,
  add column cancela_al_acabar  boolean      not null default false,
  add column impago_desde       timestamptz,
  add column dias_de_prueba     smallint,
  add column de_la_casa         boolean      not null default false,
  add column stripe_modo        text,
  add column stripe_cliente     text,
  add column stripe_suscripcion text,
  add column tarjeta            text,
  add constraint suscripcion_plan_conocido
    check (plan is null or plan in ('esencial', 'pro', 'cadena', 'pausa')),
  add constraint suscripcion_intervalo_conocido
    check (intervalo is null or intervalo in ('mes', 'ano')),
  add constraint suscripcion_locales_positivos
    check (locales_pagados is null or locales_pagados > 0),
  add constraint suscripcion_dias_de_prueba_razonables
    check (dias_de_prueba is null or dias_de_prueba between 1 and 90),
  add constraint suscripcion_modo_conocido
    check (stripe_modo is null or stripe_modo in ('prueba', 'real'));

comment on column estook.suscripcion.de_la_casa is
  'No se cobra: la cuenta de Estook para probar (ikatz) y los negocios de ejemplo. Siempre al día (0048).';
comment on column estook.suscripcion.impago_desde is
  'El primer cobro fallido sin resolver. De ahí cuentan los siete días de gracia (0048).';
comment on column estook.suscripcion.dias_de_prueba is
  'Los días de prueba que tenía la oferta al crear la cuenta. Se guardan: apagar la oferta después no se los quita (0048).';
comment on column estook.suscripcion.stripe_modo is
  'Si los identificadores de Stripe son del modo de prueba o del real: no sirven de uno a otro (0048).';

-- ═══════════════════════════════════════════════════════════════════════════
-- B · Sin pago no hay app
-- ═══════════════════════════════════════════════════════════════════════════
--
-- La función del disparador de la 0018, entera y cambiada en lo que nace: antes
-- toda organización nacía en prueba de catorce días; ahora nace pendiente de pago,
-- y los ejemplos, de la casa.

create or replace function estook.suscripcion_al_crear_organizacion()
returns trigger
language plpgsql
security definer
set search_path = estook, pg_catalog, pg_temp
as $$
begin
  insert into estook.suscripcion (organizacion_id, estado, prueba_hasta, de_la_casa)
  values (
    new.id,
    case when new.es_ejemplo then 'activa' else 'pendiente_de_pago' end::estook.estado_de_suscripcion,
    null,
    new.es_ejemplo
  )
  on conflict (organizacion_id) do nothing;
  return new;
end;
$$;

-- Lo que ya hay. Los ejemplos, de la casa. Y `ikatz`, el negocio de Richi, también:
-- es con la que se prueba todo antes de cobrar a nadie (Richi, 25-sep). Las demás
-- se quedan como están, y cómo están lo dice `comoEstaLaCuenta`: `burger-king`,
-- con la prueba caducada y sin tarjeta, tendrá que elegir su plan.
update estook.suscripcion s
   set estado = 'activa', prueba_hasta = null, de_la_casa = true
  from estook.organizacion o
 where o.id = s.organizacion_id
   and (o.es_ejemplo or o.codigo = 'ikatz');

-- ═══════════════════════════════════════════════════════════════════════════
-- C · Lo de Stripe y del sistema, en plataforma
-- ═══════════════════════════════════════════════════════════════════════════

-- Quién es «el sistema»: el aviso de Stripe y el reloj, que no traen persona. Lo
-- declara la API, y solo en esos caminos (`enNombreDelSistema`).
create function estook.es_el_sistema()
returns boolean
language sql
stable
set search_path = estook, pg_catalog, pg_temp
as $$
  select coalesce(current_setting('estook.sistema', true), '') = 'si'
$$;

comment on function estook.es_el_sistema() is
  'Si la petición la hace Estook y no una persona: el aviso de Stripe y el reloj (0048).';

-- Lo que el código creó en Stripe, por modo: se crea una vez y se reutiliza.
create table plataforma.stripe (
  modo            text         primary key,
  precios         jsonb        not null default '{}'::jsonb,
  iva             text,
  portal          text,
  aviso           text,
  aviso_secreto   text,
  preparado_en    timestamptz  not null default now(),
  constraint stripe_modo_conocido check (modo in ('prueba', 'real'))
);

comment on table plataforma.stripe is
  'Productos, precios, IVA, portal y aviso que el código creó en Stripe. El secreto del aviso solo lo da Stripe al crearlo (0048).';

-- Cada aviso de Stripe, una vez.
create table plataforma.aviso_de_stripe (
  id             text         primary key,
  tipo           text         not null,
  recibido_en    timestamptz  not null default now()
);

comment on table plataforma.aviso_de_stripe is
  'Los avisos de Stripe ya aplicados, por su identificador: repetirlos no hace nada (0048).';

-- Cada correo de la cuenta, una vez: «te quedan 3 días» no sale dos veces el mismo día.
create table plataforma.correo_de_la_cuenta (
  organizacion_id  uuid         not null references estook.organizacion (id) on delete cascade,
  tipo             text         not null,
  clave            text         not null,
  enviado_en       timestamptz  not null default now(),
  primary key (organizacion_id, tipo, clave)
);

comment on table plataforma.correo_de_la_cuenta is
  'Los correos del pago ya mandados: el de cada día de impago, el de fin de prueba… (0048).';

-- De qué a qué, cuándo, quién y por qué. Solo se añade.
create table plataforma.cambio_de_suscripcion (
  id               bigint       generated always as identity primary key,
  organizacion_id  uuid         not null references estook.organizacion (id) on delete cascade,
  de_estado        text,
  a_estado         text         not null,
  plan             text,
  quien            text         not null,
  porque           text         not null,
  en               timestamptz  not null default now()
);

create index cambio_de_suscripcion_por_organizacion
  on plataforma.cambio_de_suscripcion (organizacion_id, en desc);

comment on table plataforma.cambio_de_suscripcion is
  'El historial del estado de cada cuenta: Stripe, el reloj o una persona, y por qué (0048).';

create function plataforma.cambio_de_suscripcion_no_se_toca()
returns trigger
language plpgsql
set search_path = plataforma, pg_catalog, pg_temp
as $$
begin
  raise exception 'El historial de la suscripción solo se añade.';
end;
$$;

create trigger cambio_de_suscripcion_solo_se_anade
  before update or delete on plataforma.cambio_de_suscripcion
  for each row execute function plataforma.cambio_de_suscripcion_no_se_toca();

-- El reloj: dónde llamar y la huella de su secreto. El secreto de verdad vive en el
-- Vault de Supabase, que es de donde lo lee `pg_cron`.
create table plataforma.reloj (
  unica          boolean      primary key default true,
  url            text         not null,
  huella         text         not null,
  programado     boolean      not null default false,
  ultimo_latido  timestamptz,
  ultimo_diario  date,
  constraint reloj_una_sola check (unica)
);

comment on table plataforma.reloj is
  'El reloj de la 0016: la dirección del latido, la huella de su secreto y cuándo latió (0048).';

alter table plataforma.stripe                enable row level security;
alter table plataforma.aviso_de_stripe       enable row level security;
alter table plataforma.correo_de_la_cuenta   enable row level security;
alter table plataforma.cambio_de_suscripcion enable row level security;
alter table plataforma.reloj                 enable row level security;

create policy stripe_el_sistema on plataforma.stripe
  for all using (estook.es_el_sistema()) with check (estook.es_el_sistema());
create policy aviso_de_stripe_el_sistema on plataforma.aviso_de_stripe
  for all using (estook.es_el_sistema()) with check (estook.es_el_sistema());
create policy correo_de_la_cuenta_el_sistema on plataforma.correo_de_la_cuenta
  for all using (estook.es_el_sistema()) with check (estook.es_el_sistema());
create policy reloj_el_sistema on plataforma.reloj
  for all using (estook.es_el_sistema()) with check (estook.es_el_sistema());
-- El historial lo lee también un admin; lo escribe `cambiar_la_suscripcion`.
create policy cambio_de_suscripcion_lectura on plataforma.cambio_de_suscripcion
  for select using (
    estook.es_el_sistema() or plataforma.nivel_de(estook.persona_actual()) is not null
  );

revoke all on plataforma.stripe, plataforma.aviso_de_stripe, plataforma.correo_de_la_cuenta,
  plataforma.cambio_de_suscripcion, plataforma.reloj from public;
grant select, insert, update on plataforma.stripe to estook_api;
grant select, insert on plataforma.aviso_de_stripe to estook_api;
grant select, insert on plataforma.correo_de_la_cuenta to estook_api;
grant select on plataforma.cambio_de_suscripcion to estook_api;
grant select, update on plataforma.reloj to estook_api;

-- ═══════════════════════════════════════════════════════════════════════════
-- D · Las dos funciones con privilegio
-- ═══════════════════════════════════════════════════════════════════════════

-- Cambiar la suscripción: solo lo que viene en `p_cambios`, y el historial si
-- cambia el estado. El impago no se escribe con fecha: se dice si lo hay, y la
-- fecha es la del primer fallo (la que ya había, o ahora).
create function estook.cambiar_la_suscripcion(
  p_organizacion uuid,
  p_cambios jsonb,
  p_quien text,
  p_porque text
)
returns void
language plpgsql
volatile
security definer
set search_path = estook, pg_catalog, pg_temp
as $$
declare
  antes  estook.estado_de_suscripcion;
  ahora  estook.estado_de_suscripcion;
  el_plan text;
begin
  select s.estado into antes from estook.suscripcion s where s.organizacion_id = p_organizacion
   for update;
  if not found then
    raise exception 'Esa organización no tiene suscripción.';
  end if;

  update estook.suscripcion s set
    estado             = coalesce((p_cambios ->> 'estado')::estook.estado_de_suscripcion, s.estado),
    plan               = case when p_cambios ? 'plan' then p_cambios ->> 'plan' else s.plan end,
    intervalo          = case when p_cambios ? 'intervalo' then p_cambios ->> 'intervalo' else s.intervalo end,
    locales_pagados    = case when p_cambios ? 'locales_pagados' then (p_cambios ->> 'locales_pagados')::smallint else s.locales_pagados end,
    prueba_hasta       = case when p_cambios ? 'prueba_hasta' then (p_cambios ->> 'prueba_hasta')::date else s.prueba_hasta end,
    periodo_hasta      = case when p_cambios ? 'periodo_hasta' then (p_cambios ->> 'periodo_hasta')::timestamptz else s.periodo_hasta end,
    cancela_al_acabar  = coalesce((p_cambios ->> 'cancela_al_acabar')::boolean, s.cancela_al_acabar),
    impago_desde       = case
                           when not p_cambios ? 'impago' then s.impago_desde
                           when (p_cambios ->> 'impago')::boolean then coalesce(s.impago_desde, now())
                           else null
                         end,
    dias_de_prueba     = case when p_cambios ? 'dias_de_prueba' then (p_cambios ->> 'dias_de_prueba')::smallint else s.dias_de_prueba end,
    stripe_modo        = case when p_cambios ? 'stripe_modo' then p_cambios ->> 'stripe_modo' else s.stripe_modo end,
    stripe_cliente     = case when p_cambios ? 'stripe_cliente' then p_cambios ->> 'stripe_cliente' else s.stripe_cliente end,
    stripe_suscripcion = case when p_cambios ? 'stripe_suscripcion' then p_cambios ->> 'stripe_suscripcion' else s.stripe_suscripcion end,
    tarjeta            = case when p_cambios ? 'tarjeta' then p_cambios ->> 'tarjeta' else s.tarjeta end
   where s.organizacion_id = p_organizacion
  returning s.estado, s.plan into ahora, el_plan;

  if ahora is distinct from antes then
    insert into plataforma.cambio_de_suscripcion (organizacion_id, de_estado, a_estado, plan, quien, porque)
    values (p_organizacion, antes::text, ahora::text, el_plan, p_quien, p_porque);
  end if;
end;
$$;

comment on function estook.cambiar_la_suscripcion(uuid, jsonb, text, text) is
  'Cambia la suscripción de una organización y apunta el cambio de estado. La llaman Stripe, el reloj y las operaciones de pago (0048).';

-- Las cuentas: todas, con lo que hace falta para el reloj y para el admin. Quién la
-- puede leer lo decide la API (el reloj, o un admin con `soloAdmin`).
create function estook.las_cuentas()
returns table (
  organizacion_id    uuid,
  codigo             text,
  nombre             text,
  es_ejemplo         boolean,
  estado             text,
  plan               text,
  intervalo          text,
  locales_pagados    smallint,
  locales_activos    integer,
  prueba_hasta       date,
  periodo_hasta      timestamptz,
  cancela_al_acabar  boolean,
  impago_desde       timestamptz,
  de_la_casa         boolean,
  stripe_modo        text,
  stripe_suscripcion text,
  tarjeta            text,
  correos            text[]
)
language sql
stable
security definer
set search_path = estook, pg_catalog, pg_temp
as $$
  select o.id, o.codigo, o.nombre, o.es_ejemplo,
         s.estado::text, s.plan, s.intervalo, s.locales_pagados,
         (select count(*)::integer from estook.local l where l.organizacion_id = o.id and l.activo),
         s.prueba_hasta, s.periodo_hasta, s.cancela_al_acabar, s.impago_desde, s.de_la_casa,
         s.stripe_modo, s.stripe_suscripcion, s.tarjeta,
         coalesce((
           select array_agg(distinct p.correo order by p.correo)
             from estook.membresia m
             join estook.persona p on p.id = m.persona_id
            where m.organizacion_id = o.id
              and m.rol = 'direccion'
              and m.desde <= current_date
              and (m.hasta is null or m.hasta >= current_date)
              and (m.revocada_en is null or m.revocada_en > now())
              and p.activa
         ), '{}')
    from estook.organizacion o
    join estook.suscripcion s on s.organizacion_id = o.id
   where o.activa
   order by o.nombre
$$;

comment on function estook.las_cuentas() is
  'Todas las cuentas con su suscripción y los correos de quien las lleva. Para el reloj y el admin (0048).';

do $$
declare
  la_funcion text;
begin
  foreach la_funcion in array array[
    'estook.cambiar_la_suscripcion(uuid, jsonb, text, text)',
    'estook.las_cuentas()'
  ]
  loop
    execute format('revoke all on function %s from public', la_funcion);
    execute format('grant execute on function %s to estook_api', la_funcion);
  end loop;
end;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- E · El reloj (0016): cada hora, la base llama a la API
-- ═══════════════════════════════════════════════════════════════════════════
--
-- El secreto se genera aquí: al Vault, para que `pg_cron` lo mande, y a
-- `plataforma.reloj` solo su huella, que es lo que compara la API. Nadie lo escribe
-- a mano ni pasa por un chat.
--
-- Solo donde hay `pg_cron`. Y si algo falla al programarlo, **la migración no se
-- para**: queda `programado = false` y `bd:comprobar-api` lo dice en rojo, que es
-- lo que pide la 0016 («un reloj parado tiene que salir en rojo»).

do $$
declare
  el_secreto text := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
  la_url     text := 'https://efgtzujwjztihyiwgpwg.supabase.co/functions/v1/api/tareas/latir';
begin
  insert into plataforma.reloj (unica, url, huella)
  values (true, la_url, encode(sha256(convert_to(el_secreto, 'UTF8')), 'hex'));

  if not exists (select 1 from pg_available_extensions where name = 'pg_cron')
     or not exists (select 1 from pg_available_extensions where name = 'pg_net') then
    return;
  end if;

  begin
    create extension if not exists pg_cron with schema pg_catalog;
    create extension if not exists pg_net;

    perform vault.create_secret(el_secreto, 'estook_reloj', 'El secreto del reloj de Estook (0048)');

    perform cron.schedule(
      'estook-latido',
      '7 * * * *',
      $cron$
        select net.http_post(
          url := (select r.url from plataforma.reloj r where r.unica),
          headers := jsonb_build_object(
            'content-type', 'application/json',
            'x-reloj', (select d.decrypted_secret from vault.decrypted_secrets d where d.name = 'estook_reloj')
          ),
          body := '{}'::jsonb,
          -- Un minuto: lo del día llama a Stripe y a Resend, y los cinco segundos de
          -- serie cortarían la espera (la API sigue, pero el reloj no sabría cómo acabó).
          timeout_milliseconds := 60000
        )
      $cron$
    );

    update plataforma.reloj set programado = true where unica;
  exception when others then
    raise notice 'El reloj no se ha podido programar: %. Lo dirá bd:comprobar-api.', sqlerrm;
  end;
end;
$$;
