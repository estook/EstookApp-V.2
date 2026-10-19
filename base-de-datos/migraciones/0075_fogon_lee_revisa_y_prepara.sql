-- 0075 · Fogón lee, revisa y prepara (Fogón 1 · 2 y 1 · 3, decisión 0098)
--
-- Fogón 1 · 1 (0074) dejó el motor: los interruptores, cada llamada apuntada y sus
-- topes. Lo que llega ahora usa el mismo motor y solo necesita tres cosas de la base:
--
--   A · Las cosas nuevas que se le piden, para que cada llamada se apunte con la suya:
--       leer un albarán, un Z o una merma (por foto o dicha), revisar los datos,
--       ajustar un pedido, hacer el cuadrante y responder una reseña.
--   B · La revisión de los datos: lo que encuentra Fogón, guardado, para enseñarlo en
--       su ventana y avisar en la campana. Una vez a la semana de noche, o cuando lo
--       pida quien lleva el almacén.
--   C · El aviso de esa revisión en la campana (`fogon.revision`).
--
-- Y la revisión de noche la hace el reloj, sin persona: su llamada se apunta sin
-- nadie detrás.

-- ═══════════════════════════════════════════════════════════════════════════
-- A · Lo que se le pide a Fogón
-- ═══════════════════════════════════════════════════════════════════════════

alter table estook.llamada_a_fogon drop constraint llamada_a_fogon_que;
alter table estook.llamada_a_fogon add constraint llamada_a_fogon_que check (que in (
  'preguntar', 'rellenar_escandallo', 'escribir_pasos',
  'leer_albaran', 'leer_cierre', 'leer_merma_foto', 'leer_merma_voz',
  'revisar_datos', 'ajustar_pedido', 'hacer_cuadrante', 'responder_resena'
));

-- La revisión de noche la lanza el reloj: se apunta sin persona, en un local donde
-- quien la va a recibir tiene Fogón. Todo lo demás, a nombre de quien lo pide.
drop policy llamada_a_fogon_alta on estook.llamada_a_fogon;
create policy llamada_a_fogon_alta on estook.llamada_a_fogon
  for insert with check (
    (persona_id = estook.persona_actual() or (persona_id is null and que = 'revisar_datos'))
    and estook.puede_ver('app.fogon', local_id)
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- B · La revisión de los datos
-- ═══════════════════════════════════════════════════════════════════════════
--
-- «El espía» de Richi, que vigila **los datos, nunca a las personas** (0095): dos
-- productos que son el mismo, un plato sin escandallo, un paso que habla de algo que
-- el plato no lleva. Lo que es una regla lo mira Estook gratis; lo que es texto, Fogón.
-- Aquí se guarda lo que encontró, tal cual se enseña: no hay que volver a calcularlo.

create table estook.revision_de_fogon (
  id               uuid         primary key default gen_random_uuid(),
  organizacion_id  uuid         not null references estook.organizacion (id) on delete cascade,
  local_id         uuid         not null references estook.local (id) on delete cascade,
  -- Quién la pidió; nula, la de noche.
  persona_id       uuid             null references estook.persona (id) on delete set null,
  -- El lunes de la semana: la de noche se hace una vez por semana y local.
  semana           date         not null,
  de_noche         boolean      not null default false,
  -- Lo encontrado: [{ "que": "repetido", "texto": "…", "ir": "/almacen/…" }, …].
  hallazgos        jsonb        not null default '[]'::jsonb,
  hecha_en         timestamptz  not null default now(),

  constraint revision_de_fogon_hallazgos_lista check (jsonb_typeof(hallazgos) = 'array'),
  constraint revision_de_fogon_semana_en_lunes check (extract(isodow from semana) = 1)
);

comment on table estook.revision_de_fogon is
  'Lo que encontró Fogón al revisar los datos de un local: los datos, nunca las personas (0095, 0098).';

-- Una de noche por local y semana: el reloj late cada hora y no la repite.
create unique index revision_de_fogon_una_de_noche
  on estook.revision_de_fogon (local_id, semana) where de_noche;
create index revision_de_fogon_la_ultima on estook.revision_de_fogon (local_id, hecha_en desc);

alter table estook.revision_de_fogon enable row level security;

-- La ve quien tiene Fogón y lleva el almacén en ese local: es a quien le toca arreglarlo.
create policy revision_de_fogon_lectura on estook.revision_de_fogon
  for select using (
    estook.puede_ver('app.fogon', local_id) and estook.puede_ver('app.almacen', local_id)
  );

-- La apunta quien la pide, o el reloj (sin persona) en nombre de quien la recibirá.
create policy revision_de_fogon_alta on estook.revision_de_fogon
  for insert with check (
    (persona_id = estook.persona_actual() or (persona_id is null and de_noche))
    and estook.puede_ver('app.fogon', local_id)
    and estook.puede_ver('app.almacen', local_id)
  );

-- Lo encontrado no se cambia: si se arregla, la siguiente revisión ya no lo dice.
revoke all on estook.revision_de_fogon from public;
grant select, insert on estook.revision_de_fogon to estook_api;

-- Las cuentas con Fogón encendido (el general y el suyo), para la revisión de noche. El
-- reloj no es nadie y no lee `plataforma`: se lo dice la base, y solo a él.
create function estook.cuentas_con_fogon()
returns table (organizacion_id uuid)
language sql
stable
security definer
set search_path = estook, plataforma, pg_catalog, pg_temp
as $$
  select c.organizacion_id
    from plataforma.fogon_del_cliente c
   where c.encendido
     and coalesce((select f.encendido from plataforma.fogon f where f.unica), false)
     and estook.es_el_sistema()
$$;

comment on function estook.cuentas_con_fogon() is
  'Las organizaciones con Fogón encendido (el general y el suyo). Solo al sistema: la revisión de noche (0098).';

revoke all on function estook.cuentas_con_fogon() from public;
grant execute on function estook.cuentas_con_fogon() to estook_api;

-- ═══════════════════════════════════════════════════════════════════════════
-- C · El aviso de la revisión
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Las listas enteras, copiadas de la 0073 y con lo nuevo al final.

alter table estook.aviso drop constraint aviso_tipo_conocido;
alter table estook.aviso add constraint aviso_tipo_conocido check (tipo in (
  'pedido.empezado', 'pedido.mandado', 'pedido.invitacion', 'pedido.listo',
  'albaran.incidencias', 'merma.grande', 'precio.subida', 'carta.publicada', 'tablon.nota',
  'pedido.toca', 'almacen.bajo_minimo', 'informe.dia', 'informe.semana', 'informe.mes',
  'google.nota',
  'fichaje.corregido',
  'horario.publicado', 'horario.cambiado',
  'turno.entras', 'lote.caduca', 'pedido.no_llega', 'fichaje.sin_apuntar',
  'chat.confirmar',
  'inventario.toca', 'inventario.contado', 'inventario.recontar',
  'inventario.falta',
  'plato.raya',
  'fogon.revision'
));
alter table estook.preferencia_de_aviso drop constraint preferencia_tipo_conocido;
alter table estook.preferencia_de_aviso add constraint preferencia_tipo_conocido check (tipo in (
  'pedido.empezado', 'pedido.mandado', 'pedido.invitacion', 'pedido.listo',
  'albaran.incidencias', 'merma.grande', 'precio.subida', 'carta.publicada', 'tablon.nota',
  'pedido.toca', 'almacen.bajo_minimo', 'informe.dia', 'informe.semana', 'informe.mes',
  'google.nota',
  'fichaje.corregido',
  'horario.publicado', 'horario.cambiado',
  'turno.entras', 'lote.caduca', 'pedido.no_llega', 'fichaje.sin_apuntar',
  'chat.confirmar',
  'inventario.toca', 'inventario.contado', 'inventario.recontar',
  'inventario.falta',
  'plato.raya',
  'fogon.revision'
));
