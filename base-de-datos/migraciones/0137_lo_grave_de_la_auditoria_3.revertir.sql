-- Deshace la 0137: las políticas vuelven a ser las de la 0008 y la 0127, y se quitan las dos funciones.

drop policy organizacion_escritura on estook.organizacion;
create policy organizacion_escritura on estook.organizacion
  for update using (
    estook.nivel_de_permiso_en_organizacion(estook.persona_actual(), id, 'app.ajustes') = 'ver_y_editar'
  );

drop policy membresia_escritura on estook.membresia;
create policy membresia_escritura on estook.membresia
  for all using (
    case
      when local_id is not null
        then estook.nivel_de_permiso(estook.persona_actual(), local_id, 'accion.invitar_personas') = 'ver_y_editar'
      else estook.nivel_de_permiso_en_organizacion(
        estook.persona_actual(), organizacion_id, 'accion.invitar_personas'
      ) = 'ver_y_editar'
    end
  )
  with check (
    case
      when local_id is not null
        then estook.nivel_de_permiso(estook.persona_actual(), local_id, 'accion.invitar_personas') = 'ver_y_editar'
      else estook.nivel_de_permiso_en_organizacion(
        estook.persona_actual(), organizacion_id, 'accion.invitar_personas'
      ) = 'ver_y_editar'
    end
  );

drop policy ficha_laboral_quien_lleva on estook.ficha_laboral;
create policy ficha_laboral_quien_lleva on estook.ficha_laboral
  for select using (estook.la_lleva(persona_id, organizacion_id, 'app.equipo', false));

drop policy ficha_laboral_la_pone_quien_lleva on estook.ficha_laboral;
create policy ficha_laboral_la_pone_quien_lleva on estook.ficha_laboral
  for insert with check (
    persona_id <> estook.persona_actual()
    and estook.la_lleva(persona_id, organizacion_id, 'dato.datos_del_equipo', true)
  );

drop policy ficha_laboral_la_cambia_quien_lleva on estook.ficha_laboral;
create policy ficha_laboral_la_cambia_quien_lleva on estook.ficha_laboral
  for update using (
    persona_id <> estook.persona_actual()
    and estook.la_lleva(persona_id, organizacion_id, 'dato.datos_del_equipo', true)
  )
  with check (
    persona_id <> estook.persona_actual()
    and estook.la_lleva(persona_id, organizacion_id, 'dato.datos_del_equipo', true)
  );

drop policy ficha_privada_quien_lleva_los_datos on estook.ficha_privada;
create policy ficha_privada_quien_lleva_los_datos on estook.ficha_privada
  for select using (estook.la_lleva(persona_id, organizacion_id, 'dato.datos_del_equipo', false));

drop policy ficha_privada_la_pone_quien_lleva on estook.ficha_privada;
create policy ficha_privada_la_pone_quien_lleva on estook.ficha_privada
  for insert with check (
    persona_id <> estook.persona_actual()
    and estook.la_lleva(persona_id, organizacion_id, 'dato.datos_del_equipo', true)
  );

drop policy ficha_privada_la_cambia_quien_lleva on estook.ficha_privada;
create policy ficha_privada_la_cambia_quien_lleva on estook.ficha_privada
  for update using (
    persona_id <> estook.persona_actual()
    and estook.la_lleva(persona_id, organizacion_id, 'dato.datos_del_equipo', true)
  )
  with check (
    persona_id <> estook.persona_actual()
    and estook.la_lleva(persona_id, organizacion_id, 'dato.datos_del_equipo', true)
  );

drop policy documento_de_persona_quien_lleva_los_datos on estook.documento_de_persona;
create policy documento_de_persona_quien_lleva_los_datos on estook.documento_de_persona
  for select using (estook.la_lleva(persona_id, organizacion_id, 'dato.datos_del_equipo', false));

drop policy documento_de_persona_lo_sube_quien_lleva on estook.documento_de_persona;
create policy documento_de_persona_lo_sube_quien_lleva on estook.documento_de_persona
  for insert with check (
    persona_id <> estook.persona_actual()
    and estook.la_lleva(persona_id, organizacion_id, 'dato.datos_del_equipo', true)
  );

drop function estook.manda_mas_que(uuid, uuid);
drop function estook.es_de_toda_la_organizacion(uuid);
