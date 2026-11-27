-- 0137 · Lo grave de la Auditoría 3 (27-nov; docs/auditorias/auditoria-2026-11-27-la-auditoria-3.md)
--
-- Tres fallos con la misma raíz: lo de toda la organización se decidía con el rol que uno tuviera en
-- **cualquier** local (`nivel_de_permiso_en_organizacion` no mira el alcance), y la ficha privada se
-- enseñaba a quien lleva a la persona **aunque mande menos que ella**.
--
--   G1 · Lo privado de la ficha (DNI, teléfono, domicilio, sueldo, contrato y nóminas) y sus condiciones
--        solo los ve **quien manda más** que esa persona y la lleva, y ella misma. La misma regla que ya
--        había para rellenarla (`puedeRellenarLaFicha`): una gerente no ve la ficha de la dirección ni la de
--        otra gerente; el area manager no ve la de la dirección.
--   G2 · Cambiar la organización (su nombre, el doble factor de todos, el correo de recuperación) es de
--        quien tiene un puesto **de toda la organización**: una gerente de un local ya no renombra la cadena.
--   G3 · Dar un puesto de toda la organización o de un área, también: una gerente de un local ya no crea un
--        RRHH ni una gestoría para todos los locales.
--
-- Las políticas se rehacen enteras, copiadas de la 0008 y la 0127, con la condición nueva añadida.

-- ═══════════════════════════════════════════════════════════════════════════
-- Las dos preguntas nuevas
-- ═══════════════════════════════════════════════════════════════════════════

-- Si quien pregunta tiene, hoy, un puesto de toda esa organización. Lee las membresías con privilegio por
-- la misma razón que `nivel_de_permiso_en_organizacion`: la usa la política de `membresia`.
create or replace function estook.es_de_toda_la_organizacion(p_organizacion uuid)
returns boolean
language sql
stable
security definer
set search_path = estook, pg_catalog, pg_temp
as $$
  select exists (
    select 1
      from estook.membresia m
     where m.persona_id = estook.persona_actual()
       and m.organizacion_id = p_organizacion
       and m.alcance = 'organizacion'
       and m.desde <= current_date
       and (m.hasta is null or m.hasta >= current_date)
       and (m.revocada_en is null or m.revocada_en > now())
  )
$$;

comment on function estook.es_de_toda_la_organizacion(uuid) is
  'Si quien pregunta tiene hoy un puesto de toda la organización (0137): lo de la organización entera es solo suyo.';

revoke all on function estook.es_de_toda_la_organizacion(uuid) from public;
grant execute on function estook.es_de_toda_la_organizacion(uuid) to estook_api;

-- Si quien pregunta manda más que esa persona en la organización: el puesto más alto de cada uno, de los
-- que siguen vivos. La regla de lo que cobra cada uno (0027) y de la ficha: **nunca hacia arriba ni entre
-- iguales**. Lee las membresías de la otra persona, que un jefe no siempre ve: por eso con privilegio.
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

revoke all on function estook.manda_mas_que(uuid, uuid) from public;
grant execute on function estook.manda_mas_que(uuid, uuid) to estook_api;

-- ═══════════════════════════════════════════════════════════════════════════
-- G2 · La organización, solo para quien es de toda ella (la de la 0008, con la condición nueva)
-- ═══════════════════════════════════════════════════════════════════════════

drop policy organizacion_escritura on estook.organizacion;
create policy organizacion_escritura on estook.organizacion
  for update using (
    estook.nivel_de_permiso_en_organizacion(estook.persona_actual(), id, 'app.ajustes') = 'ver_y_editar'
    and estook.es_de_toda_la_organizacion(id)
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- G3 · Los puestos de toda la organización o de un área, solo los da quien es de toda ella
-- ═══════════════════════════════════════════════════════════════════════════

drop policy membresia_escritura on estook.membresia;
create policy membresia_escritura on estook.membresia
  for all using (
    case
      when local_id is not null
        then estook.nivel_de_permiso(estook.persona_actual(), local_id, 'accion.invitar_personas') = 'ver_y_editar'
      else estook.nivel_de_permiso_en_organizacion(
        estook.persona_actual(), organizacion_id, 'accion.invitar_personas'
      ) = 'ver_y_editar'
        and estook.es_de_toda_la_organizacion(organizacion_id)
    end
  )
  with check (
    case
      when local_id is not null
        then estook.nivel_de_permiso(estook.persona_actual(), local_id, 'accion.invitar_personas') = 'ver_y_editar'
      else estook.nivel_de_permiso_en_organizacion(
        estook.persona_actual(), organizacion_id, 'accion.invitar_personas'
      ) = 'ver_y_editar'
        and estook.es_de_toda_la_organizacion(organizacion_id)
    end
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- G1 · La ficha, solo hacia abajo (las de la 0127, con la condición nueva)
-- ═══════════════════════════════════════════════════════════════════════════

drop policy ficha_laboral_quien_lleva on estook.ficha_laboral;
create policy ficha_laboral_quien_lleva on estook.ficha_laboral
  for select using (
    estook.la_lleva(persona_id, organizacion_id, 'app.equipo', false)
    and estook.manda_mas_que(persona_id, organizacion_id)
  );

drop policy ficha_laboral_la_pone_quien_lleva on estook.ficha_laboral;
create policy ficha_laboral_la_pone_quien_lleva on estook.ficha_laboral
  for insert with check (
    persona_id <> estook.persona_actual()
    and estook.la_lleva(persona_id, organizacion_id, 'dato.datos_del_equipo', true)
    and estook.manda_mas_que(persona_id, organizacion_id)
  );

drop policy ficha_laboral_la_cambia_quien_lleva on estook.ficha_laboral;
create policy ficha_laboral_la_cambia_quien_lleva on estook.ficha_laboral
  for update using (
    persona_id <> estook.persona_actual()
    and estook.la_lleva(persona_id, organizacion_id, 'dato.datos_del_equipo', true)
    and estook.manda_mas_que(persona_id, organizacion_id)
  )
  with check (
    persona_id <> estook.persona_actual()
    and estook.la_lleva(persona_id, organizacion_id, 'dato.datos_del_equipo', true)
    and estook.manda_mas_que(persona_id, organizacion_id)
  );

drop policy ficha_privada_quien_lleva_los_datos on estook.ficha_privada;
create policy ficha_privada_quien_lleva_los_datos on estook.ficha_privada
  for select using (
    estook.la_lleva(persona_id, organizacion_id, 'dato.datos_del_equipo', false)
    and estook.manda_mas_que(persona_id, organizacion_id)
  );

drop policy ficha_privada_la_pone_quien_lleva on estook.ficha_privada;
create policy ficha_privada_la_pone_quien_lleva on estook.ficha_privada
  for insert with check (
    persona_id <> estook.persona_actual()
    and estook.la_lleva(persona_id, organizacion_id, 'dato.datos_del_equipo', true)
    and estook.manda_mas_que(persona_id, organizacion_id)
  );

drop policy ficha_privada_la_cambia_quien_lleva on estook.ficha_privada;
create policy ficha_privada_la_cambia_quien_lleva on estook.ficha_privada
  for update using (
    persona_id <> estook.persona_actual()
    and estook.la_lleva(persona_id, organizacion_id, 'dato.datos_del_equipo', true)
    and estook.manda_mas_que(persona_id, organizacion_id)
  )
  with check (
    persona_id <> estook.persona_actual()
    and estook.la_lleva(persona_id, organizacion_id, 'dato.datos_del_equipo', true)
    and estook.manda_mas_que(persona_id, organizacion_id)
  );

drop policy documento_de_persona_quien_lleva_los_datos on estook.documento_de_persona;
create policy documento_de_persona_quien_lleva_los_datos on estook.documento_de_persona
  for select using (
    estook.la_lleva(persona_id, organizacion_id, 'dato.datos_del_equipo', false)
    and estook.manda_mas_que(persona_id, organizacion_id)
  );

drop policy documento_de_persona_lo_sube_quien_lleva on estook.documento_de_persona;
create policy documento_de_persona_lo_sube_quien_lleva on estook.documento_de_persona
  for insert with check (
    persona_id <> estook.persona_actual()
    and estook.la_lleva(persona_id, organizacion_id, 'dato.datos_del_equipo', true)
    and estook.manda_mas_que(persona_id, organizacion_id)
  );
