-- Deshace la 0037: se va la puerta del admin entera.
--
-- `sesion_activa` se restaura **antes** de quitar la columna, por lo mismo que en
-- la 0020: si se quitara primero, la función nombraría una columna que ya no
-- existe y la base no podría resolver una sola sesión.

drop policy if exists persona_la_ve_un_admin_si_es_admin on estook.persona;

drop function if exists estook.sesion_activa(text);

create function estook.sesion_activa(p_huella text)
returns table (
  sesion_id             uuid,
  persona_id            uuid,
  organizacion_id       uuid,
  local_id              uuid,
  doble_factor_superado boolean,
  debe_cambiar_clave    boolean,
  es_demostracion       boolean
)
language plpgsql
volatile
security definer
set search_path = estook, pg_catalog, pg_temp
as $$
begin
  -- Se refresca la actividad, pero solo si hace mas de quince minutos: escribir
  -- una fila en cada peticion, para nada.
  update estook.sesion s
     set ultima_actividad_en = now()
   where s.huella = p_huella
     and s.cerrada_en is null
     and s.caduca_en > now()
     and s.ultima_actividad_en < now() - interval '15 minutes';

  -- El `join` con la persona **y su `activa`** no es decorativo: es lo que hace
  -- que retirarle el acceso a alguien mate sus sesiones al instante, sin esperar
  -- a que caduquen. Estaba en la 0018 y se conserva tal cual.
  return query
    select s.id, s.persona_id, s.organizacion_id, s.local_id, s.doble_factor_superado,
           coalesce(c.debe_cambiarla, false),
           s.es_demostracion
      from estook.sesion s
      join estook.persona p on p.id = s.persona_id and p.activa
      left join estook.credencial c on c.persona_id = s.persona_id
     where s.huella = p_huella
       and s.cerrada_en is null
       and s.caduca_en > now();
end;
$$;

comment on function estook.sesion_activa(text) is
  'De la huella del token a quien pregunta. Se llama antes de declarar la identidad, asi que tiene que ver sin ella. Desde M5 dice ademas si la visita es una demostracion.';

revoke all on function estook.sesion_activa(text) from public;
grant execute on function estook.sesion_activa(text) to estook_api;

-- Las sesiones del admin se cierran con la columna: sin ella serían sesiones de un
-- mes que nadie abrió para eso. Se cierran, no se borran (principio 6).
update estook.sesion set cerrada_en = now() where para_admin and cerrada_en is null;

alter table estook.sesion drop constraint if exists sesion_de_admin_dura_ocho_horas;
alter table estook.sesion drop column if exists para_admin;

-- La auditoría del admin no se puede borrar fila a fila (su guardián lo impide),
-- pero sí entera con su esquema: revertir una migración es decidir que no existió.
drop schema if exists plataforma cascade;
