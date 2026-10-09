-- 0062 · Un solo horario y las incidencias del equipo (repaso del 9-oct, decisión 0081)
--
-- Lo que pidió Richi el 9-oct por la tarde:
--
--   2  «Hay dos horarios, el de la ficha de "Persona" y el de la pestaña Horarios.
--      Hay que quitar el de la ficha: no concuerdan y no tiene sentido. Que la app
--      haga caso al de Horarios, que es el oficial.»
--   2a «Si un día un trabajador no ficha y no está justificado, no hay sitio donde
--      lo muestre.»
--
--   A · **El horario de siempre deja de contar.** Lo que dice cuándo entra cada uno
--       es lo publicado en Horarios, y nada más: las dos funciones que todavía lo
--       miraban —cuándo puede sonar el móvil y los tramos de trabajo— se rehacen
--       sin él. La tabla `horario_habitual` **se queda, sin usar**: lo que hay
--       escrito no se borra a escondidas, y quitarla del todo es de M13, con las
--       vacaciones y los cambios de turno.
--   B · **Justificar una incidencia**: quien lleva al equipo dice por qué alguien no
--       vino a su turno, o llegó tarde —estaba de baja, cambió el turno, avisó—, y
--       deja de contar. Es lo único que guarda la base: **cuándo falta alguien o
--       llega tarde lo calcula el servidor** con el horario publicado y los fichajes,
--       que ya estaban (`lasEntradasDelHorario`).

-- ═══════════════════════════════════════════════════════════════════════════
-- A · El horario de siempre deja de contar
-- ═══════════════════════════════════════════════════════════════════════════

comment on table estook.horario_habitual is
  'En desuso desde la 0062 (0081): el horario es el publicado en Horarios. Nada la lee ni la escribe; se quita con M13.';

-- Si cada persona está fichada y si tiene horario. Es la de la 0054, copiada entera,
-- sin el horario de siempre: tener horario es tener algo publicado alrededor de hoy.
create or replace function estook.como_le_suena(p_personas uuid[])
returns table (persona_id uuid, fichado boolean, tiene_horario boolean)
language sql
stable
security definer
set search_path = estook, pg_catalog, pg_temp
as $$
  select p.id,
         exists (select 1 from estook.fichaje f where f.persona_id = p.id and f.salio_en is null),
         exists (
           select 1 from estook.turno_publicado tp
            where tp.persona_id = p.id and tp.tipo = 'trabajo'
              and tp.dia between current_date - 14 and current_date + 14
         )
    from estook.persona p
   where estook.es_el_sistema()
     and p.id = any (p_personas)
$$;

comment on function estook.como_le_suena(uuid[]) is
  'Si cada persona está fichada y si tiene algo publicado en Horarios, para saber cuándo le puede sonar el móvil. Solo contesta al sistema (0070, 0081).';

-- Los tramos de trabajo. Es la de la 0054, copiada entera, sin el de siempre: solo lo
-- publicado. Un tramo que sale antes de entrar acaba al día siguiente.
create or replace function estook.turnos_de(p_personas uuid[], p_desde timestamptz, p_hasta timestamptz)
returns table (persona_id uuid, local_id uuid, empieza timestamptz, acaba timestamptz)
language sql
stable
security definer
set search_path = estook, pg_catalog, pg_temp
as $$
  with locales as (
    select l.id, l.zona_horaria, l.hora_de_corte
      from estook.local l
     where l.activo and not l.es_ejemplo
  ),
  publicadas as (
    select s.local_id, s.lunes
      from estook.semana_de_horario s
     where s.publicada_en is not null
       and s.lunes between (p_desde at time zone 'UTC')::date - 9 and (p_hasta at time zone 'UTC')::date + 1
  ),
  publicados as (
    select tp.persona_id, l.id as local_id,
           (tp.dia + tp.entra) at time zone l.zona_horaria as empieza,
           (case when tp.sale > tp.entra then tp.sale - tp.entra
                 else tp.sale - tp.entra + interval '24 hours' end) as dura
      from estook.turno_publicado tp
      join locales l on l.id = tp.local_id
      join publicadas pu on pu.local_id = tp.local_id and tp.dia between pu.lunes and pu.lunes + 6
     where tp.persona_id = any (p_personas)
       and tp.tipo = 'trabajo'
  )
  select t.persona_id, t.local_id, t.empieza, t.empieza + t.dura as acaba
    from publicados t
   where estook.es_el_sistema()
     and t.empieza + t.dura > p_desde
     and t.empieza < p_hasta
   order by t.empieza
$$;

comment on function estook.turnos_de(uuid[], timestamptz, timestamptz) is
  'Los tramos de trabajo de unas personas entre dos instantes: lo publicado en Horarios. Solo contesta al sistema (0070, 0081).';

-- ═══════════════════════════════════════════════════════════════════════════
-- B · Justificar una incidencia
-- ═══════════════════════════════════════════════════════════════════════════
--
-- ── Qué se justifica, y cómo se reconoce ────────────────────────────────────
--
-- Una **falta** (tenía un tramo publicado, acabó, y no fichó en él) o un **retraso**
-- (fichó tarde, pasado el margen del local). Las dos son de un tramo del horario, y
-- un tramo se reconoce por **cuándo empieza**: la persona, el local y ese instante.
-- No se apunta al tramo publicado por su id porque volver a publicar la semana los
-- rehace todos, y la justificación se perdería sin que nadie la quitara.
--
-- Lo demás que sale en Incidencias —un fichaje sin cerrar, lejos del local, sin
-- ubicación— no se justifica: se corrige el fichaje, que ya tiene su camino.

create type estook.motivo_de_justificacion as enum (
  'enfermedad', 'permiso', 'cambio_de_turno', 'avisado', 'otro'
);

create table estook.justificacion (
  id               uuid         primary key default gen_random_uuid(),
  organizacion_id  uuid         not null references estook.organizacion (id) on delete cascade,
  local_id         uuid         not null references estook.local (id) on delete cascade,
  persona_id       uuid         not null references estook.persona (id) on delete cascade,
  tipo             text         not null,
  -- El tramo: cuándo empezaba, y la jornada a la que pertenece.
  empieza          timestamptz  not null,
  fecha            date         not null,
  motivo           estook.motivo_de_justificacion  not null,
  nota             text,
  puesta_por       uuid         references estook.persona (id) on delete set null,
  puesta_en        timestamptz  not null default now(),
  constraint justificacion_tipo_conocido check (tipo in ('falta', 'retraso')),
  constraint justificacion_nota_corta check (nota is null or char_length(nota) <= 200),
  constraint justificacion_una_por_tramo unique (persona_id, local_id, tipo, empieza)
);

comment on table estook.justificacion is
  'Por qué alguien no vino a un tramo publicado, o llegó tarde, dicho por quien lleva al equipo (0081). Justificada, no cuenta como incidencia.';

create index justificacion_por_local_y_fecha on estook.justificacion (local_id, fecha);

-- La organización es la del local, siempre: la pone la base y no quien escribe.
create function estook.justificacion_en_su_sitio()
returns trigger
language plpgsql
set search_path = estook, pg_catalog, pg_temp
as $$
begin
  select l.organizacion_id into new.organizacion_id from estook.local l where l.id = new.local_id;
  return new;
end;
$$;

create trigger justificacion_en_su_sitio
  before insert or update on estook.justificacion
  for each row execute function estook.justificacion_en_su_sitio();

alter table estook.justificacion enable row level security;

-- La ve quien ve los fichajes de esa persona (las de la 0027), y la propia persona:
-- es su registro horario, y lo que se diga de él lo puede leer.
create policy justificacion_la_mia on estook.justificacion
  for select using (persona_id = estook.persona_actual());

create policy justificacion_los_del_equipo on estook.justificacion
  for select using (
    estook.puede_ver('app.equipo', local_id)
    and persona_id in (select q.persona_id from estook.a_quien_lleva(local_id) q)
  );

-- La pone y la quita quien corrige los fichajes del equipo, y **nunca la propia
-- persona**: justificarse a uno mismo no es justificar.
create policy justificacion_la_pone_quien_lleva on estook.justificacion
  for insert with check (
    estook.puede_editar('app.equipo', local_id)
    and persona_id <> estook.persona_actual()
    and persona_id in (select q.persona_id from estook.a_quien_lleva(local_id) q)
  );

create policy justificacion_la_quita_quien_lleva on estook.justificacion
  for delete using (
    estook.puede_editar('app.equipo', local_id)
    and persona_id <> estook.persona_actual()
    and persona_id in (select q.persona_id from estook.a_quien_lleva(local_id) q)
  );

revoke all on estook.justificacion from public;
-- Sin `update`: se quita y se pone otra, con su nombre y su hora.
grant select, insert, delete on estook.justificacion to estook_api;

-- ═══════════════════════════════════════════════════════════════════════════
-- C · Que siga siendo rápido con años de fichajes
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Las faltas y los retrasos buscan, por cada tramo publicado, el fichaje de esa
-- persona más cercano a su hora de entrada. Con el índice de la 0027 —persona y
-- jornada— se recorrían **todos** los fichajes de la persona; con este se va directo
-- a las horas de alrededor. Un local con quince personas y tres años son unos quince
-- mil fichajes: la diferencia entre leer quince mil filas y leer diez.

create index fichaje_por_persona_y_entrada on estook.fichaje (persona_id, entro_en);
