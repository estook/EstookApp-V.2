-- 0129 · La Ampliación 4 · 2 · Las vacaciones (decisión 0153, sección 5; Plan, M14)
--
-- Lo que pidió Richi el 11-nov y pulió el 24-nov: **pedir vacaciones** desde Calendario › Personal,
-- con el saldo de la ficha (0127) y sin poder pedir más días de los que hay; **aprobar, proponer otras
-- fechas o rechazar con motivo** en Calendario › Propuestas; la contrapropuesta, como tarjeta azul
-- arriba de Personal (pregunta 8); y, al aprobarse, **que salgan en Turnos**.
--
--   A · El permiso nuevo: `accion.gestionar_vacaciones`. Lo tienen quien lleva el local y los jefes,
--       para su gente. **Sin ver sueldos ni documentos** (eso sigue en `dato.datos_del_equipo`).
--   B · `solicitud_de_vacaciones`: cada petición, con su estado. La ven la persona y quien gestiona
--       las vacaciones de su equipo; nadie más.
--   C · `vacaciones_aprobadas`: los días aprobados de un local, sin notas ni motivos, para pintarlos
--       en Turnos (que ve todo el equipo, como el horario de la pared).
--   D · Los avisos: «Te piden vacaciones» y «Te responden a tus vacaciones».

-- ═══════════════════════════════════════════════════════════════════════════
-- A · El permiso
-- ═══════════════════════════════════════════════════════════════════════════

insert into estook.permiso (codigo, nombre, familia, ambito, descripcion) values
  ('accion.gestionar_vacaciones', 'Gestionar vacaciones', 'accion', 'local',
   'Aprobar, proponer otras fechas o rechazar las vacaciones de su gente, y ponérselas. Sin ver sueldos, nóminas ni documentos');

-- Roles 1.13: «Vacaciones e incidencias de su gente», los jefes y quien lleva el local (Richi, 24-nov).
insert into estook.permiso_de_rol (rol, permiso, nivel) values
  ('jefe_de_sala',   'accion.gestionar_vacaciones', 'ver_y_editar'),
  ('jefe_de_cocina', 'accion.gestionar_vacaciones', 'ver_y_editar'),
  ('gerente',        'accion.gestionar_vacaciones', 'ver_y_editar'),
  ('area_manager',   'accion.gestionar_vacaciones', 'ver_y_editar'),
  ('direccion',      'accion.gestionar_vacaciones', 'ver_y_editar'),
  ('rrhh',           'accion.gestionar_vacaciones', 'ver_y_editar');

-- ═══════════════════════════════════════════════════════════════════════════
-- B · Las solicitudes
-- ═══════════════════════════════════════════════════════════════════════════

create table estook.solicitud_de_vacaciones (
  id                uuid          primary key default gen_random_uuid(),
  organizacion_id   uuid          not null references estook.organizacion (id) on delete cascade,
  local_id          uuid          not null references estook.local (id) on delete cascade,
  persona_id        uuid          not null references estook.persona (id) on delete cascade,
  desde             date          not null,
  hasta             date          not null,
  -- Los días que cuentan, como dice su ficha (naturales o laborables): lo calcula el servidor.
  dias              numeric(5, 1) not null,
  estado            text          not null default 'pedida',
  -- Lo que dice quien pide.
  nota              text,
  -- Por qué se rechaza o se proponen otras fechas.
  motivo            text,
  propuesta_desde   date,
  propuesta_hasta   date,
  pedida_por        uuid          references estook.persona (id) on delete set null,
  pedida_en         timestamptz   not null default now(),
  decidida_por      uuid          references estook.persona (id) on delete set null,
  decidida_en       timestamptz,
  constraint solicitud_de_vacaciones_fechas check (hasta >= desde and hasta - desde <= 366),
  constraint solicitud_de_vacaciones_dias check (dias >= 0 and dias <= 400),
  constraint solicitud_de_vacaciones_estado check (
    estado in ('pedida', 'aprobada', 'rechazada', 'contrapropuesta', 'retirada')
  ),
  constraint solicitud_de_vacaciones_la_propuesta check (
    (estado = 'contrapropuesta') = (propuesta_desde is not null and propuesta_hasta is not null)
    and (propuesta_hasta is null or propuesta_hasta >= propuesta_desde)
  ),
  constraint solicitud_de_vacaciones_nota check (nota is null or char_length(nota) between 1 and 300),
  constraint solicitud_de_vacaciones_motivo check (motivo is null or char_length(motivo) between 1 and 300)
);

comment on table estook.solicitud_de_vacaciones is
  'Las vacaciones pedidas, aprobadas, propuestas o rechazadas (0153). Las ven la persona y quien gestiona las vacaciones de su equipo.';

create index solicitud_de_vacaciones_por_local on estook.solicitud_de_vacaciones (local_id, desde, hasta);
create index solicitud_de_vacaciones_por_persona on estook.solicitud_de_vacaciones (persona_id, estado);

alter table estook.solicitud_de_vacaciones enable row level security;

create policy solicitud_de_vacaciones_la_mia on estook.solicitud_de_vacaciones
  for select using (persona_id = estook.persona_actual());

create policy solicitud_de_vacaciones_las_de_mi_gente on estook.solicitud_de_vacaciones
  for select using (
    estook.puede_ver('accion.gestionar_vacaciones', local_id)
    and persona_id in (select q.persona_id from estook.a_quien_lleva(local_id) q)
  );

-- Se pide para uno mismo; y quien gestiona las de su gente se las pone o les contesta.
create policy solicitud_de_vacaciones_se_pide on estook.solicitud_de_vacaciones
  for insert with check (
    persona_id = estook.persona_actual()
    or (
      estook.puede_editar('accion.gestionar_vacaciones', local_id)
      and persona_id in (select q.persona_id from estook.a_quien_lleva(local_id) q)
    )
  );

create policy solicitud_de_vacaciones_se_contesta on estook.solicitud_de_vacaciones
  for update using (
    persona_id = estook.persona_actual()
    or (
      estook.puede_editar('accion.gestionar_vacaciones', local_id)
      and persona_id in (select q.persona_id from estook.a_quien_lleva(local_id) q)
    )
  )
  with check (
    persona_id = estook.persona_actual()
    or (
      estook.puede_editar('accion.gestionar_vacaciones', local_id)
      and persona_id in (select q.persona_id from estook.a_quien_lleva(local_id) q)
    )
  );

revoke all on estook.solicitud_de_vacaciones from public;
-- Sin `delete`: una petición se retira, no se borra.
grant select, insert, update on estook.solicitud_de_vacaciones to estook_api;

-- ═══════════════════════════════════════════════════════════════════════════
-- C · Los días aprobados de un local, para Turnos
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function estook.vacaciones_aprobadas(p_local uuid, p_desde date, p_hasta date)
returns table (persona_id uuid, desde date, hasta date)
language sql
stable
security definer
set search_path = estook, pg_catalog, pg_temp
as $$
  select s.persona_id, s.desde, s.hasta
    from estook.solicitud_de_vacaciones s
   where s.local_id = p_local
     and s.estado = 'aprobada'
     and s.desde <= p_hasta
     and s.hasta >= p_desde
     and (
       estook.es_el_sistema()
       or p_local in (select v.local_id from estook.locales_visibles() v)
     )
$$;

comment on function estook.vacaciones_aprobadas(uuid, date, date) is
  'Quién está de vacaciones aprobadas en un local entre dos fechas, sin notas ni motivos: para pintarlo en Turnos, que ve todo el equipo (0153).';

revoke all on function estook.vacaciones_aprobadas(uuid, date, date) from public;
grant execute on function estook.vacaciones_aprobadas(uuid, date, date) to estook_api;

-- ═══════════════════════════════════════════════════════════════════════════
-- D · Los avisos
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Las dos listas, copiadas enteras de la 0128 con `vacaciones.pedidas` y `vacaciones.respondidas`.

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
  'fogon.revision',
  'documento.rechazado',
  'caja.descuadre',
  'nomina.subida',
  'vacaciones.pedidas', 'vacaciones.respondidas'
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
  'fogon.revision',
  'documento.rechazado',
  'caja.descuadre',
  'nomina.subida',
  'vacaciones.pedidas', 'vacaciones.respondidas'
));
