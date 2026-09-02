-- Reversion de 0018 · Identidad y acceso
--
-- Se deshace en el orden contrario al que se hizo: primero lo que depende de
-- otras cosas, al final lo que las sostiene.

drop function if exists estook.tiene_como_volver_a_entrar(uuid, uuid);
drop function if exists estook.cerrar_sesiones_de(uuid, uuid);
drop function if exists estook.persona_por_correo(text);
drop function if exists estook.poner_credencial(uuid, text, uuid);
drop function if exists estook.sesion_activa(text);
drop function if exists estook.abrir_sesion(uuid, text, text, uuid, uuid, boolean, integer);
drop function if exists estook.anotar_intento_de_pin(uuid, boolean);
drop function if exists estook.anotar_intento_de_contrasena(uuid, boolean);
drop function if exists estook.pin_del_quiosco(uuid, text);
drop function if exists estook.pines_para_entrar(text);
drop function if exists estook.credencial_para_entrar(text);

drop table if exists estook.sesion;
drop table if exists estook.doble_factor;
drop table if exists estook.pin;
drop table if exists estook.credencial;

drop trigger if exists organizacion_nace_en_prueba on estook.organizacion;
drop function if exists estook.suscripcion_al_crear_organizacion();
drop table if exists estook.suscripcion;
drop type if exists estook.estado_de_suscripcion;

-- Las cuatro funciones de visibilidad, tal y como las dejo la 0005. Se restauran
-- **antes** de quitar la columna: si se quitara primero, seguirian nombrando una
-- columna que ya no existe y la reversion dejaria la base sin poder consultarse.

create or replace function estook.locales_visibles(p_persona uuid)
returns table (local_id uuid)
language sql
stable
security definer
set search_path = estook, pg_catalog, pg_temp
as $$
  select distinct l.id
  from estook.local l
  join estook.membresia m on m.organizacion_id = l.organizacion_id
  where m.persona_id = p_persona
    and l.activo
    and m.desde <= current_date
    and (m.hasta is null or m.hasta >= current_date)
    and (
      m.alcance = 'organizacion'
      or (m.alcance = 'area' and l.area_id = m.area_id)
      or (m.alcance = 'local' and l.id = m.local_id)
    )
$$;

create or replace function estook.organizaciones_visibles(p_persona uuid)
returns table (organizacion_id uuid)
language sql
stable
security definer
set search_path = estook, pg_catalog, pg_temp
as $$
  select distinct m.organizacion_id
  from estook.membresia m
  where m.persona_id = p_persona
    and m.desde <= current_date
    and (m.hasta is null or m.hasta >= current_date)
$$;

create or replace function estook.nivel_de_permiso(
  p_persona uuid,
  p_local uuid,
  p_permiso text
)
returns estook.nivel_de_permiso
language sql
stable
security definer
set search_path = estook, pg_catalog, pg_temp
as $$
  select coalesce(
    (
      select coalesce(rec.nivel, pr.nivel)
      from estook.membresia m
      join estook.local l
        on l.id = p_local
       and l.organizacion_id = m.organizacion_id
      left join estook.permiso_de_rol pr
        on pr.rol = m.rol
       and pr.permiso = p_permiso
      left join estook.recorte_de_permiso rec
        on rec.membresia_id = m.id
       and rec.local_id = p_local
       and rec.permiso = p_permiso
      where m.persona_id = p_persona
        and l.activo
        and m.desde <= current_date
        and (m.hasta is null or m.hasta >= current_date)
        and (
          m.alcance = 'organizacion'
          or (m.alcance = 'area' and l.area_id = m.area_id)
          or (m.alcance = 'local' and l.id = m.local_id)
        )
        and (pr.nivel is not null or rec.nivel is not null)
      order by coalesce(rec.nivel, pr.nivel) desc
      limit 1
    ),
    'sin_acceso'
  )
$$;

create or replace function estook.nivel_de_permiso_en_organizacion(
  p_persona uuid,
  p_organizacion uuid,
  p_permiso text
)
returns estook.nivel_de_permiso
language sql
stable
security definer
set search_path = estook, pg_catalog, pg_temp
as $$
  select coalesce(
    (
      select pr.nivel
      from estook.membresia m
      join estook.permiso_de_rol pr
        on pr.rol = m.rol
       and pr.permiso = p_permiso
      where m.persona_id = p_persona
        and m.organizacion_id = p_organizacion
        and m.desde <= current_date
        and (m.hasta is null or m.hasta >= current_date)
      order by pr.nivel desc
      limit 1
    ),
    'sin_acceso'
  )
$$;

drop index if exists estook.membresia_revocada;

alter table estook.membresia
  drop column if exists revocada_en;

alter table estook.persona
  drop column if exists ultimo_acceso_en;

-- El comentario de auth_id vuelve al que tenia la 0002, para que revertir deje
-- la base exactamente como estaba y no a medio camino.
comment on column estook.persona.auth_id is
  'Vacio hasta que acepta la invitacion. El login se construye en M4.';

alter table estook.local
  drop constraint if exists local_onboarding_en_rango;

alter table estook.local
  drop column if exists onboarding_terminado,
  drop column if exists onboarding_paso,
  drop column if exists sal_del_pin;

alter table estook.organizacion
  drop constraint if exists organizacion_correo_de_recuperacion_con_forma;

alter table estook.organizacion
  drop column if exists correo_de_recuperacion,
  drop column if exists exige_doble_factor;
