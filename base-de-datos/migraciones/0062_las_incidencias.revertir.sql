-- Deshace la 0062: el horario de siempre vuelve a contar donde no hay nada publicado,
-- y no se puede justificar una incidencia.
--
-- **Lo que se pierde:** las justificaciones puestas. Los fichajes y los horarios
-- siguen enteros; lo que se hubiera justificado vuelve a contar como falta o retraso.

drop index if exists estook.fichaje_por_persona_y_entrada;
drop table if exists estook.justificacion;
drop function if exists estook.justificacion_en_su_sitio();
drop type if exists estook.motivo_de_justificacion;

comment on table estook.horario_habitual is null;

-- Las dos de la 0054, copiadas enteras.
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
           select 1 from estook.horario_habitual hh
            where hh.persona_id = p.id and hh.desde <= current_date
              and (hh.hasta is null or hh.hasta >= current_date)
         ) or exists (
           select 1 from estook.turno_publicado tp
            where tp.persona_id = p.id and tp.tipo = 'trabajo'
              and tp.dia between current_date - 14 and current_date + 14
         )
    from estook.persona p
   where estook.es_el_sistema()
     and p.id = any (p_personas)
$$;

comment on function estook.como_le_suena(uuid[]) is
  'Si cada persona está fichada y si tiene horario, para saber cuándo le puede sonar el móvil. Solo contesta al sistema (0070).';

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
  dias as (
    select d::date as fecha
      from generate_series(
        (p_desde at time zone 'UTC')::date - 2,
        (p_hasta at time zone 'UTC')::date + 1,
        interval '1 day'
      ) d
  ),
  publicadas as (
    select s.local_id, s.lunes
      from estook.semana_de_horario s
     where s.publicada_en is not null
       and s.lunes between (p_desde at time zone 'UTC')::date - 9 and (p_hasta at time zone 'UTC')::date + 1
  ),
  de_siempre as (
    select hh.persona_id, l.id as local_id,
           ((case when hh.entra >= l.hora_de_corte then dd.fecha else dd.fecha + 1 end) + hh.entra)
             at time zone l.zona_horaria as empieza,
           (case when hh.sale > hh.entra then hh.sale - hh.entra
                 else hh.sale - hh.entra + interval '24 hours' end) as dura
      from estook.horario_habitual hh
      join locales l on l.id = hh.local_id
      join dias dd on hh.dia_de_la_semana = extract(isodow from dd.fecha)::int
     where hh.persona_id = any (p_personas)
       and hh.desde <= dd.fecha
       and (hh.hasta is null or hh.hasta >= dd.fecha)
       and not exists (
         select 1 from publicadas pu
          where pu.local_id = l.id and dd.fecha between pu.lunes and pu.lunes + 6
       )
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
  ),
  todos as (
    select * from de_siempre
    union all
    select * from publicados
  )
  select t.persona_id, t.local_id, t.empieza, t.empieza + t.dura as acaba
    from todos t
   where estook.es_el_sistema()
     and t.empieza + t.dura > p_desde
     and t.empieza < p_hasta
   order by t.empieza
$$;

comment on function estook.turnos_de(uuid[], timestamptz, timestamptz) is
  'Los tramos de trabajo de unas personas entre dos instantes: lo publicado en las semanas publicadas, y el de siempre en las demás. Solo contesta al sistema (0070).';
