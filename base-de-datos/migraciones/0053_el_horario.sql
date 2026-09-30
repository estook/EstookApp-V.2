-- 0053 · H2 · El horario de la semana (decisiones 0066, 0068 y 0069)
--
-- Hasta hoy Estook sabía a qué hora entra **normalmente** cada persona (el horario
-- de siempre, 0027). Esto es **quién trabaja el jueves que viene**: la semana del
-- local, tramo a tramo, con sus libres, vacaciones y bajas.
--
--   A · **La semana** del local: una fila por local y lunes, que dice si está
--       publicada, cuándo y quién.
--   B · **Los tramos en borrador**, `turno`: los monta quien lleva el cuadrante y no
--       los ve nadie más (Manifiesto 15: hasta publicar, el equipo no lo ve).
--   C · **Lo publicado**, `turno_publicado`: la copia que se hace al publicar, y lo
--       único que ve el equipo. Así se puede seguir tocando el borrador de una
--       semana publicada sin que el equipo vea cada paso, y al volver a publicar se
--       sabe exactamente a quién le ha cambiado algo.
--   D · **Las horas de contrato** de la gente, sin sus sueldos, para avisar de quién
--       se pasa a quien monta el horario aunque no vea euros.
--   E · Los dos avisos nuevos de la campana.
--
-- ── Lo que no está aquí, a propósito ────────────────────────────────────────
--
-- **Los euros.** Lo que cuesta la semana lo cuenta el servidor con la retribución
-- de cada uno, que sigue tan cerrada como en la 0027: quien monta el horario sin
-- `dato.coste_de_personal` ve horas, nunca dinero.

-- ═══════════════════════════════════════════════════════════════════════════
-- A · La semana
-- ═══════════════════════════════════════════════════════════════════════════

create table estook.semana_de_horario (
  id               uuid         primary key default gen_random_uuid(),
  organizacion_id  uuid         not null references estook.organizacion (id) on delete cascade,
  local_id         uuid         not null references estook.local (id) on delete cascade,
  -- La semana va de lunes a domingo (h-horarios, punto 1).
  lunes            date         not null,

  -- La última vez que se publicó. Nula mientras solo es borrador.
  publicada_en     timestamptz,
  publicada_por    uuid         references estook.persona (id) on delete set null,
  veces_publicada  integer      not null default 0,
  -- El último cambio del borrador: si es posterior a `publicada_en`, hay cambios
  -- que el equipo todavía no ve.
  cambiada_en      timestamptz  not null default now(),

  creado_por       uuid         references estook.persona (id) on delete set null,
  creado_en        timestamptz  not null default now(),
  actualizado_en   timestamptz  not null default now(),
  version          integer      not null default 1,

  constraint semana_empieza_en_lunes check (extract(isodow from lunes) = 1),
  constraint semana_publicada_con_nombre check (
    (publicada_en is null) = (veces_publicada = 0)
  ),
  constraint semana_una_por_local unique (local_id, lunes)
);

comment on table estook.semana_de_horario is
  'Una semana del horario de un local (H2, 0069). Dice si está publicada y si el borrador tiene cambios que el equipo todavía no ve.';

create trigger semana_de_horario_sube_version before update on estook.semana_de_horario
  for each row execute function estook.subir_version();

-- ═══════════════════════════════════════════════════════════════════════════
-- B · Los tramos en borrador
-- ═══════════════════════════════════════════════════════════════════════════
--
-- ── Un tramo, no un día ─────────────────────────────────────────────────────
--
-- El horario partido son **dos tramos** el mismo día (0068). Y una ausencia —libre,
-- vacaciones o baja— es una fila sin horas, que ocupa el día entero: no convive con
-- tramos de trabajo ese día (lo guarda el disparador de abajo).
--
-- `sale` puede ser **menor** que `entra`, como en el horario de siempre: es el turno
-- de noche, del día en que empieza. Igual no: un tramo de cero minutos no es nada.

create type estook.tipo_de_turno as enum ('trabajo', 'libre', 'vacaciones', 'baja');

comment on type estook.tipo_de_turno is
  'Qué es un día del horario: trabajo con sus horas, o una ausencia que ocupa el día entero.';

create table estook.turno (
  id                uuid     primary key default gen_random_uuid(),
  semana_id         uuid     not null references estook.semana_de_horario (id) on delete cascade,
  local_id          uuid     not null references estook.local (id) on delete cascade,
  persona_id        uuid     not null references estook.persona (id) on delete cascade,
  -- El día en que empieza.
  dia               date     not null,
  tipo              estook.tipo_de_turno  not null default 'trabajo',
  entra             time,
  sale              time,
  -- El descanso previsto dentro del tramo (0068): «12:00–17:00, 30 min de descanso».
  descanso_minutos  smallint not null default 0,
  nota              text,

  creado_por        uuid         references estook.persona (id) on delete set null,
  creado_en         timestamptz  not null default now(),
  actualizado_en    timestamptz  not null default now(),
  version           integer      not null default 1,

  constraint turno_trabajo_con_horas check (
    (tipo = 'trabajo' and entra is not null and sale is not null and entra <> sale)
    or (tipo <> 'trabajo' and entra is null and sale is null and descanso_minutos = 0)
  ),
  constraint turno_descanso_razonable check (descanso_minutos between 0 and 240),
  constraint turno_nota_corta check (nota is null or char_length(nota) <= 200)
);

comment on table estook.turno is
  'Un tramo del horario en borrador, o una ausencia de un día (H2, 0069). Solo lo ve quien monta el horario; el equipo ve turno_publicado.';
comment on column estook.turno.sale is
  'Puede ser menor que entra: el tramo cruza la medianoche, y es del día en que empieza.';

create index turno_por_semana on estook.turno (semana_id, persona_id, dia);

create trigger turno_sube_version before update on estook.turno
  for each row execute function estook.subir_version();

-- ── La guarda: en su semana, y una ausencia ocupa el día entero ────────────

create or replace function estook.turno_en_su_sitio()
returns trigger
language plpgsql
as $$
declare
  la_semana estook.semana_de_horario;
begin
  select * into la_semana from estook.semana_de_horario where id = new.semana_id;
  if la_semana.id is null or la_semana.local_id <> new.local_id then
    raise exception 'Un tramo va en una semana de su mismo local'
      using errcode = 'check_violation';
  end if;
  if new.dia < la_semana.lunes or new.dia > la_semana.lunes + 6 then
    raise exception 'Un tramo va en un día de su semana'
      using errcode = 'check_violation';
  end if;

  if new.tipo <> 'trabajo' and exists (
    select 1 from estook.turno t
     where t.persona_id = new.persona_id and t.dia = new.dia
       and t.semana_id = new.semana_id and t.id <> new.id
  ) then
    raise exception 'Una ausencia ocupa el día entero: ese día ya tiene algo puesto'
      using errcode = 'check_violation';
  end if;
  if new.tipo = 'trabajo' and exists (
    select 1 from estook.turno t
     where t.persona_id = new.persona_id and t.dia = new.dia
       and t.semana_id = new.semana_id and t.id <> new.id and t.tipo <> 'trabajo'
  ) then
    raise exception 'Ese día está marcado como libre, vacaciones o baja'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger turno_en_su_sitio before insert or update on estook.turno
  for each row execute function estook.turno_en_su_sitio();

-- ═══════════════════════════════════════════════════════════════════════════
-- C · Lo publicado
-- ═══════════════════════════════════════════════════════════════════════════
--
-- La copia de los tramos en el momento de publicar. **Lo único que ve el equipo.**
-- Publicar borra lo publicado de esa semana y copia el borrador: nunca se cambia
-- una fila de aquí, así que no hay `update`.

create table estook.turno_publicado (
  id                uuid     primary key default gen_random_uuid(),
  semana_id         uuid     not null references estook.semana_de_horario (id) on delete cascade,
  local_id          uuid     not null references estook.local (id) on delete cascade,
  persona_id        uuid     not null references estook.persona (id) on delete cascade,
  dia               date     not null,
  tipo              estook.tipo_de_turno  not null,
  entra             time,
  sale              time,
  descanso_minutos  smallint not null default 0,
  nota              text,
  publicado_en      timestamptz  not null default now(),

  constraint turno_publicado_trabajo_con_horas check (
    (tipo = 'trabajo' and entra is not null and sale is not null and entra <> sale)
    or (tipo <> 'trabajo' and entra is null and sale is null)
  )
);

comment on table estook.turno_publicado is
  'El horario que ve el equipo: la copia del borrador al publicar (H2, 0069). Horas, nunca euros.';

create index turno_publicado_por_semana on estook.turno_publicado (semana_id, persona_id, dia);
create index turno_publicado_por_persona on estook.turno_publicado (persona_id, dia);
create index turno_publicado_por_local on estook.turno_publicado (local_id, dia);

-- ═══════════════════════════════════════════════════════════════════════════
-- Seguridad por filas
-- ═══════════════════════════════════════════════════════════════════════════
--
-- ── Quién ve qué ────────────────────────────────────────────────────────────
--
--   · **La semana y lo publicado, todo el equipo del local** (0068): en un bar el
--     horario está en la pared. Cambia lo que decía Roles 1.3.
--   · **El borrador, solo quien monta el horario**: `accion.publicar_cuadrante`,
--     que tienen el jefe de sala, el jefe de cocina —los dos, el de los dos
--     (0010)—, el gerente, RRHH y quien está por encima.

alter table estook.semana_de_horario enable row level security;
alter table estook.turno             enable row level security;
alter table estook.turno_publicado   enable row level security;

create policy semana_la_ve_el_local on estook.semana_de_horario
  for select using (local_id in (select local_id from estook.locales_visibles()));

create policy semana_la_monta_quien_publica on estook.semana_de_horario
  for insert with check (
    estook.puede_editar('accion.publicar_cuadrante', local_id)
    and local_id in (select local_id from estook.locales_visibles())
  );

create policy semana_la_cambia_quien_publica on estook.semana_de_horario
  for update using (estook.puede_editar('accion.publicar_cuadrante', local_id))
  with check (estook.puede_editar('accion.publicar_cuadrante', local_id));

create policy turno_solo_quien_monta on estook.turno
  for all using (estook.puede_editar('accion.publicar_cuadrante', local_id))
  with check (
    estook.puede_editar('accion.publicar_cuadrante', local_id)
    and local_id in (select local_id from estook.locales_visibles())
  );

create policy turno_publicado_lo_ve_el_local on estook.turno_publicado
  for select using (local_id in (select local_id from estook.locales_visibles()));

create policy turno_publicado_lo_pone_quien_publica on estook.turno_publicado
  for insert with check (estook.puede_editar('accion.publicar_cuadrante', local_id));

create policy turno_publicado_lo_quita_quien_publica on estook.turno_publicado
  for delete using (estook.puede_editar('accion.publicar_cuadrante', local_id));

revoke all on estook.semana_de_horario from public;
revoke all on estook.turno             from public;
revoke all on estook.turno_publicado   from public;

-- Una semana no se borra: se vacía. Lo publicado se reemplaza, nunca se cambia.
grant select, insert, update on estook.semana_de_horario to estook_api;
grant select, insert, update, delete on estook.turno to estook_api;
grant select, insert, delete on estook.turno_publicado to estook_api;

-- ═══════════════════════════════════════════════════════════════════════════
-- D · Las horas de contrato, sin los sueldos
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Quien monta el horario tiene que saber quién se pasa de sus horas **aunque no vea
-- lo que cobra**: el jefe de cocina lleva el horario de su gente y no sus nóminas.
-- Las horas de contrato viven en `retribucion`, que está cerrada (0027), así que
-- esta función devuelve **solo las horas**, y solo a quien monta el horario de ese
-- local. Nada de importes.

create or replace function estook.horas_de_contrato(p_local uuid, p_fecha date)
returns table (persona_id uuid, horas numeric)
language sql
stable
security definer
set search_path = estook, pg_catalog, pg_temp
as $$
  select distinct on (re.persona_id) re.persona_id, re.horas_semanales
    from estook.retribucion re
    join estook.local l on l.id = p_local
   where estook.puede_editar('accion.publicar_cuadrante', p_local)
     and re.organizacion_id = l.organizacion_id
     and re.horas_semanales is not null
     and (re.local_id is null or re.local_id = p_local)
     and re.desde <= p_fecha
     and (re.hasta is null or re.hasta >= p_fecha)
   order by re.persona_id, re.local_id nulls last, re.desde desc
$$;

comment on function estook.horas_de_contrato(uuid, date) is
  'Las horas de contrato a la semana de la gente de un local, sin importes, para avisar de quién se pasa al montar el horario (0069). Solo a quien lo monta.';

revoke all on function estook.horas_de_contrato(uuid, date) from public;
grant execute on function estook.horas_de_contrato(uuid, date) to estook_api;

-- ═══════════════════════════════════════════════════════════════════════════
-- E · Los dos avisos del horario
-- ═══════════════════════════════════════════════════════════════════════════
--
-- La lista entera, copiada de la 0052 y con los dos nuevos al final.

alter table estook.aviso drop constraint aviso_tipo_conocido;
alter table estook.aviso add constraint aviso_tipo_conocido check (tipo in (
  'pedido.empezado', 'pedido.mandado', 'pedido.invitacion', 'pedido.listo',
  'albaran.incidencias', 'merma.grande', 'precio.subida', 'carta.publicada', 'tablon.nota',
  'pedido.toca', 'almacen.bajo_minimo', 'informe.dia', 'informe.semana', 'informe.mes',
  'google.nota',
  'fichaje.corregido',
  'horario.publicado', 'horario.cambiado'
));

alter table estook.preferencia_de_aviso drop constraint preferencia_tipo_conocido;
alter table estook.preferencia_de_aviso add constraint preferencia_tipo_conocido check (tipo in (
  'pedido.empezado', 'pedido.mandado', 'pedido.invitacion', 'pedido.listo',
  'albaran.incidencias', 'merma.grande', 'precio.subida', 'carta.publicada', 'tablon.nota',
  'pedido.toca', 'almacen.bajo_minimo', 'informe.dia', 'informe.semana', 'informe.mes',
  'google.nota',
  'fichaje.corregido',
  'horario.publicado', 'horario.cambiado'
));
