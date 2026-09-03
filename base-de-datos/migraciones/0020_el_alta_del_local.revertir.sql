-- Reversion de 0020 · El alta del local
--
-- Se deshace en el orden contrario al que se hizo: primero lo que depende de
-- otras cosas, al final lo que las sostiene.
--
-- Ojo con `abrir_sesion`: hay que **restaurar la de siete argumentos y borrar la
-- de ocho**, en ese orden, o quedaria una sesion sin poder abrirse. Y por lo
-- mismo que en la migracion, primero se borra la vieja firma para que no
-- convivan dos que encajen con la misma llamada.

-- ── La politica de `local`, como la dejo la 0008 ─────────────────────────────
--
-- Se restaura la de escritura entera y se quitan las dos de M5. Ojo con lo que
-- eso significa: al volver atras, un gerente deja de poder configurar su propio
-- local. Es correcto —es como estaba— pero conviene saberlo.

drop policy if exists local_edicion on estook.local;
drop policy if exists local_alta on estook.local;

create policy local_escritura on estook.local
  for all using (
    estook.nivel_de_permiso_en_organizacion(
      estook.persona_actual(), organizacion_id, 'accion.gestionar_locales'
    ) = 'ver_y_editar'
  )
  with check (
    estook.nivel_de_permiso_en_organizacion(
      estook.persona_actual(), organizacion_id, 'accion.gestionar_locales'
    ) = 'ver_y_editar'
  );

-- ── I · El modo demostracion ─────────────────────────────────────────────────
--
-- `sesion_activa` se restaura sin la columna nueva **antes** de quitarla: si se
-- quitara primero, la funcion quedaria nombrando una columna que ya no existe y
-- la base se quedaria sin poder resolver una sola sesion.

drop function if exists estook.cerrar_demostracion(uuid);
drop function if exists estook.abrir_demostracion(text, integer);
drop function if exists estook.sesion_activa(text);

create function estook.sesion_activa(p_huella text)
returns table (
  sesion_id             uuid,
  persona_id            uuid,
  organizacion_id       uuid,
  local_id              uuid,
  doble_factor_superado boolean,
  debe_cambiar_clave    boolean
)
language plpgsql
volatile
security definer
set search_path = estook, pg_catalog, pg_temp
as $$
begin
  update estook.sesion s
     set ultima_actividad_en = now()
   where s.huella = p_huella
     and s.cerrada_en is null
     and s.caduca_en > now()
     and s.ultima_actividad_en < now() - interval '15 minutes';

  return query
    select s.id, s.persona_id, s.organizacion_id, s.local_id, s.doble_factor_superado,
           coalesce(c.debe_cambiarla, false)
      from estook.sesion s
      join estook.persona p on p.id = s.persona_id and p.activa
      left join estook.credencial c on c.persona_id = s.persona_id
     where s.huella = p_huella
       and s.cerrada_en is null
       and s.caduca_en > now();
end;
$$;

revoke all on function estook.sesion_activa(text) from public;
grant execute on function estook.sesion_activa(text) to estook_api;

-- Las visitas de demostracion se van con la columna: no son sesiones de nadie.
delete from estook.sesion where es_demostracion;

drop index if exists estook.sesion_de_demostracion;
alter table estook.sesion drop column if exists es_demostracion;

-- ── H · El aparato ───────────────────────────────────────────────────────────

drop function if exists estook.abrir_sesion(uuid, text, text, uuid, uuid, boolean, integer, uuid);

create function estook.abrir_sesion(
  p_persona uuid,
  p_huella text,
  p_entro_con text,
  p_organizacion uuid,
  p_local uuid,
  p_doble_factor_superado boolean,
  p_dias integer
)
returns uuid
language plpgsql
volatile
security definer
set search_path = estook, pg_catalog, pg_temp
as $$
declare
  la_sesion uuid;
begin
  insert into estook.sesion (
    persona_id, huella, entro_con, organizacion_id, local_id,
    doble_factor_superado, caduca_en
  )
  values (
    p_persona, p_huella, p_entro_con, p_organizacion, p_local,
    p_doble_factor_superado, now() + make_interval(days => p_dias)
  )
  returning id into la_sesion;

  update estook.persona set ultimo_acceso_en = now() where id = p_persona;

  return la_sesion;
end;
$$;

revoke all on function estook.abrir_sesion(uuid, text, text, uuid, uuid, boolean, integer) from public;
grant execute on function estook.abrir_sesion(uuid, text, text, uuid, uuid, boolean, integer) to estook_api;

drop function if exists estook.reconocer_dispositivo(uuid, text, text, estook.tipo_de_dispositivo, uuid);
drop index if exists estook.dispositivo_uno_por_huella;

-- ── G · Los datos de ejemplo ─────────────────────────────────────────────────

drop function if exists estook.quitar_ejemplos(uuid);
drop function if exists estook.contar_ejemplos(uuid);
drop trigger if exists dato_de_ejemplo_de_una_tabla_real on estook.dato_de_ejemplo;
drop function if exists estook.tabla_de_ejemplo_existe();
drop table if exists estook.dato_de_ejemplo;

-- ── F · Las importaciones ────────────────────────────────────────────────────

drop table if exists estook.importacion;
drop type if exists estook.estado_de_importacion;
drop type if exists estook.destino_de_importacion;

-- ── E · El catalogo de referencia ────────────────────────────────────────────

drop table if exists estook.linea_de_receta_de_referencia;
drop table if exists estook.receta_de_referencia;
drop trigger if exists producto_de_referencia_con_alergenos_conocidos on estook.producto_de_referencia;
drop table if exists estook.producto_de_referencia;
drop function if exists estook.alergenos_conocidos();
drop type if exists estook.unidad_de_uso;

-- ── D · Los alergenos ────────────────────────────────────────────────────────

drop table if exists estook.alergeno;

-- ── C · El alta ──────────────────────────────────────────────────────────────

alter table estook.local
  drop constraint if exists local_onboarding_terminado_coherente;

alter table estook.local
  drop column if exists onboarding_saltados,
  drop column if exists onboarding_terminado_en;

-- ── B · Los objetivos ────────────────────────────────────────────────────────

drop table if exists estook.objetivo_de_partida;
drop table if exists estook.objetivo;
drop type if exists estook.clave_de_objetivo;

-- ── A · La ficha del local ───────────────────────────────────────────────────

alter table estook.local
  drop constraint if exists local_logo_coherente,
  drop constraint if exists local_telefono_con_forma,
  drop constraint if exists local_codigo_postal_con_forma,
  drop constraint if exists local_color_con_forma;

alter table estook.local
  drop column if exists logo_puesto_en,
  drop column if exists logo_clave,
  drop column if exists color_de_marca,
  drop column if exists hora_de_corte,
  drop column if exists telefono,
  drop column if exists provincia,
  drop column if exists poblacion,
  drop column if exists codigo_postal,
  drop column if exists direccion,
  drop column if exists tipo;

drop type if exists estook.tipo_de_local;
