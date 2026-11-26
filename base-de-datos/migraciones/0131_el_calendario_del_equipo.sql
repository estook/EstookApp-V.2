-- 0131 · La Ampliación 4 · 3 · El calendario del equipo (decisión 0153, sección 5; Plan, M14)
--
-- Lo que pidió Richi el 11-nov y pulió el 24-nov: en **Calendario › Equipo**, el gerente y los jefes
-- ponen días o tramos con aviso (una limpieza a fondo, la inspección de Sanidad, una formación…) para
-- todos, solo sala o solo cocina; **avisa ese día, y cada día si son varios**. Y en **Personal**, las
-- notas de cada uno, que no ve nadie más (tampoco el gerente), con aviso si quiere.
--
--   A · Los recordatorios del equipo son **avisos del Calendario** (la capa `aviso` de la 0032, que ya
--       filtra por roles en la base): se les añade la hora del aviso (`avisa_a`).
--   B · `nota_personal`: las notas de cada uno. Solo las ve y las toca su dueño.
--   C · `lo_que_avisa_el_calendario`: lo que toca avisar entre dos instantes, para el reloj. Solo
--       contesta al sistema (las notas no las lee nadie más, ni el reloj sin ella).
--   D · Los avisos: «Lo del calendario del equipo» y «Tus notas», y que el reloj los pueda programar.

-- ═══════════════════════════════════════════════════════════════════════════
-- A · La hora del aviso de un recordatorio
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Un recordatorio es una fila de `evento_de_calendario` con `capa = 'aviso'` y
-- `origen = 'recordatorio'`: su `grupo` dice qué es (limpieza, inspeccion, formacion u
-- otro) y sus `roles`, para quién (nulo: todos; los de sala o los de cocina). Lo que
-- faltaba es **cuándo avisa**: a esa hora, cada día que dura. Nulo: sin aviso.

alter table estook.evento_de_calendario add column avisa_a time;

comment on column estook.evento_de_calendario.avisa_a is
  'Los recordatorios del equipo (0131): la hora a la que avisa, cada día que dura. Nulo: sin aviso.';

alter table estook.evento_de_calendario
  add constraint evento_recordatorio_con_su_tipo check (
    origen <> 'recordatorio'
    or (capa = 'aviso' and grupo in ('limpieza', 'inspeccion', 'formacion', 'otro'))
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- B · Las notas de cada uno
-- ═══════════════════════════════════════════════════════════════════════════

create table estook.nota_personal (
  id               uuid         primary key default gen_random_uuid(),
  organizacion_id  uuid         not null references estook.organizacion (id) on delete cascade,
  -- El local en el que la apuntó: su reloj es el que dice cuándo avisar.
  local_id         uuid         not null references estook.local (id) on delete cascade,
  persona_id       uuid         not null references estook.persona (id) on delete cascade,
  dia              date         not null,
  texto            text         not null,
  -- A qué hora avisa ese día. Nulo: sin aviso.
  avisa_a          time,
  creada_en        timestamptz  not null default now(),
  actualizado_en   timestamptz  not null default now(),

  constraint nota_personal_texto check (char_length(btrim(texto)) between 1 and 200)
);

comment on table estook.nota_personal is
  'Las notas de cada uno en Calendario › Personal (0153). Solo las ve y las toca su dueño: tampoco el gerente.';

create index nota_personal_por_persona on estook.nota_personal (persona_id, dia);

create trigger nota_personal_actualizada before update on estook.nota_personal
  for each row execute function estook.marcar_actualizado();

alter table estook.nota_personal enable row level security;

create policy nota_personal_la_mia on estook.nota_personal
  for all using (persona_id = estook.persona_actual())
  with check (persona_id = estook.persona_actual());

revoke all on estook.nota_personal from public;
grant select, insert, update, delete on estook.nota_personal to estook_api;

-- ═══════════════════════════════════════════════════════════════════════════
-- C · Lo que toca avisar, para el reloj
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Cada hora, el reloj apunta lo de la hora siguiente; al llegar su hora, lo vuelve a
-- leer por si se quitó o se movió (`p_id` y `p_dia`). Un recordatorio de tres días son
-- tres avisos, uno por día, a su hora en el reloj del local.

create function estook.lo_que_avisa_el_calendario(
  p_desde timestamptz,
  p_hasta timestamptz,
  p_id uuid default null,
  p_dia date default null
)
returns table (
  clase            text,
  id               uuid,
  local_id         uuid,
  organizacion_id  uuid,
  persona_id       uuid,
  dia              date,
  dia_de           integer,
  dias             integer,
  titulo           text,
  grupo            text,
  roles            text[],
  desde            text,
  avisa_en         timestamptz
)
language sql
stable
security definer
set search_path = estook, pg_catalog, pg_temp
as $$
  select 'recordatorio', e.id, e.local_id, l.organizacion_id, null::uuid, d::date,
         (d::date - e.dia) + 1, (coalesce(e.hasta_el, e.dia) - e.dia) + 1,
         e.titulo, e.grupo, e.roles, to_char(e.desde, 'HH24:MI'),
         (d::date + e.avisa_a) at time zone l.zona_horaria
    from estook.evento_de_calendario e
    join estook.local l on l.id = e.local_id and l.activo and not l.es_ejemplo
    cross join lateral generate_series(e.dia, coalesce(e.hasta_el, e.dia), interval '1 day') d
   where estook.es_el_sistema()
     and e.capa = 'aviso' and e.origen = 'recordatorio' and e.avisa_a is not null
     and not e.es_ejemplo
     and (
       (p_id is null and (d::date + e.avisa_a) at time zone l.zona_horaria >= p_desde
                     and (d::date + e.avisa_a) at time zone l.zona_horaria < p_hasta)
       or (e.id = p_id and d::date = p_dia)
     )
  union all
  select 'nota', n.id, n.local_id, n.organizacion_id, n.persona_id, n.dia, 1, 1,
         n.texto, null, null, to_char(n.avisa_a, 'HH24:MI'),
         (n.dia + n.avisa_a) at time zone l.zona_horaria
    from estook.nota_personal n
    join estook.local l on l.id = n.local_id and l.activo and not l.es_ejemplo
   where estook.es_el_sistema()
     and n.avisa_a is not null
     and (
       (p_id is null and (n.dia + n.avisa_a) at time zone l.zona_horaria >= p_desde
                     and (n.dia + n.avisa_a) at time zone l.zona_horaria < p_hasta)
       or (n.id = p_id and n.dia = p_dia)
     )
$$;

comment on function estook.lo_que_avisa_el_calendario(timestamptz, timestamptz, uuid, date) is
  'Los recordatorios del equipo y las notas con aviso que tocan entre dos instantes, uno por día, con cuándo avisar. Solo contesta al sistema (0131).';

revoke all on function estook.lo_que_avisa_el_calendario(timestamptz, timestamptz, uuid, date) from public;
grant execute on function estook.lo_que_avisa_el_calendario(timestamptz, timestamptz, uuid, date) to estook_api;

-- ═══════════════════════════════════════════════════════════════════════════
-- D · Los avisos
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Las dos listas, copiadas enteras de la 0129 con `calendario.recordatorio` y `calendario.nota`.

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
  'vacaciones.pedidas', 'vacaciones.respondidas',
  'calendario.recordatorio', 'calendario.nota'
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
  'vacaciones.pedidas', 'vacaciones.respondidas',
  'calendario.recordatorio', 'calendario.nota'
));

alter table estook.al_movil_programado drop constraint programado_tipo_conocido;
alter table estook.al_movil_programado add constraint programado_tipo_conocido check (
  tipo in (
    'turno.entras', 'lote.caduca', 'pedido.no_llega', 'chat.confirmar',
    'calendario.recordatorio', 'calendario.nota'
  )
);
