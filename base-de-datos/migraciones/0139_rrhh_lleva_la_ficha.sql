-- 0139 · RRHH lleva la ficha de todos, menos la del propietario (Richi, 27-nov; la Auditoría 3)
--
-- Con la 0137, la ficha privada (DNI, sueldo, contrato y nóminas) solo la ve y la rellena quien manda más que esa
-- persona. RRHH manda menos que un gerente en Estook (60 frente a 70), así que no podía llevar la ficha de los
-- gerentes ni la del area manager, y en una empresa de verdad es justo su trabajo. Richi: RRHH lleva **a todos
-- menos al propietario** (la dirección). Lo demás no cambia: un gerente no ve la ficha de otro gerente; la ve el
-- propietario, el area manager de su zona y RRHH.
--
-- La función de la 0137 entera, con la excepción de RRHH añadida.

create or replace function estook.manda_mas_que(p_persona uuid, p_organizacion uuid)
returns boolean
language sql
stable
security definer
set search_path = estook, pg_catalog, pg_temp
as $$
  with vivas as (
    select m.persona_id, m.rol, r.amplitud
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
     and (
       coalesce((select max(amplitud) from vivas where persona_id = estook.persona_actual()), -1)
         > coalesce((select max(amplitud) from vivas where persona_id = p_persona), -1)
       -- RRHH, a todos menos al propietario (0139).
       or (
         exists (select 1 from vivas where persona_id = estook.persona_actual() and rol = 'rrhh')
         and not exists (select 1 from vivas where persona_id = p_persona and rol = 'direccion')
       )
     )
$$;

comment on function estook.manda_mas_que(uuid, uuid) is
  'Si quien pregunta manda más que esa persona en la organización (0137), o es RRHH y ella no es el propietario (0139): la ficha privada solo se ve hacia abajo.';
