-- Deshace la 0139: la función vuelve a ser la de la 0137, sin la excepción de RRHH.

create or replace function estook.manda_mas_que(p_persona uuid, p_organizacion uuid)
returns boolean
language sql
stable
security definer
set search_path = estook, pg_catalog, pg_temp
as $$
  with vivas as (
    select m.persona_id, r.amplitud
      from estook.membresia m
      join estook.rol r on r.codigo = m.rol
     where m.organizacion_id = p_organizacion
       and m.persona_id in (estook.persona_actual(), p_persona)
       and m.desde <= current_date
       and (m.hasta is null or m.hasta >= current_date)
       and (m.revocada_en is null or m.revocada_en > now())
  )
  select estook.persona_actual() is not null
     and estook.persona_actual() <> p_persona
     and coalesce((select max(amplitud) from vivas where persona_id = estook.persona_actual()), -1)
       > coalesce((select max(amplitud) from vivas where persona_id = p_persona), -1)
$$;

comment on function estook.manda_mas_que(uuid, uuid) is
  'Si quien pregunta manda más que esa persona en la organización (0137): la ficha privada solo se ve hacia abajo.';
