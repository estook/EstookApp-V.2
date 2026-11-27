-- 0138 · El doble factor que se exigió (la Auditoría 3, apartado 16.4; lo vio Richi el 27-nov)
--
-- El doble factor es de cada persona. Cuando la empresa lo exige, cada uno lo activa en su cuenta; y si después
-- la empresa deja de exigirlo, la persona lo seguía teniendo y Estook se lo seguía pidiendo. En IKATZ se exigió
-- del 11 al 28 de octubre, y a dos personas se les seguía pidiendo.
--
-- Ahora se apunta **si lo activó porque era obligatorio**. Al dejar de exigirlo, a esos se les quita; quien lo
-- puso por su cuenta lo conserva (es suyo). Los de antes se sacan del historial de la organización: lo
-- activaron cuando alguna de sus organizaciones lo exigía.

alter table estook.doble_factor
  add column por_obligacion boolean not null default false;

comment on column estook.doble_factor.por_obligacion is
  'Si lo activó porque su organización lo exigía (0138): al dejar de exigirlo, se le quita. Quien lo puso por su cuenta lo conserva.';

update estook.doble_factor d
   set por_obligacion = true
 where d.confirmado_en is not null
   and exists (
     select 1
       from estook.membresia m
      where m.persona_id = d.persona_id
        and (
          select a.despues ->> 'exige_doble_factor'
            from estook.auditoria a
           where a.entidad = 'organizacion'
             and a.entidad_id = m.organizacion_id::text
             and a.despues ? 'exige_doble_factor'
             and a.ocurrido_en <= d.confirmado_en
           order by a.ocurrido_en desc
           limit 1
        ) = 'true'
   );

-- Y a quien ya está así hoy (lo activó por obligación y ninguna de sus organizaciones lo exige ya), se le quita
-- ahora: es lo que habría pasado al quitar la obligación si esto hubiera existido entonces.
delete from estook.doble_factor d
 where d.por_obligacion
   and not exists (
     select 1
       from estook.membresia m
       join estook.organizacion o on o.id = m.organizacion_id
      where m.persona_id = d.persona_id
        and o.exige_doble_factor
        and (m.revocada_en is null or m.revocada_en > now())
   );

-- **Y el del admin de Estook** (lo vio Richi): el admin lo exige siempre, y como el doble factor es de la persona,
-- la app también se lo pedía a los administradores aunque su empresa no lo exija. Ahora se apunta si se activó
-- para el admin: en el admin se sigue pidiendo siempre; en la app, solo si la empresa lo exige.
alter table estook.doble_factor
  add column por_el_admin boolean not null default false;

comment on column estook.doble_factor.por_el_admin is
  'Si se activó para entrar en el admin de Estook (0138): en el admin se pide siempre; en la app, solo si la empresa lo exige.';

-- Los de antes: los administradores que lo activaron al darles el acceso (el admin no deja entrar sin él).
update estook.doble_factor d
   set por_el_admin = true
 where d.confirmado_en is not null
   and not d.por_obligacion
   and exists (
     select 1 from plataforma.administrador ad
      where ad.persona_id = d.persona_id
        and d.confirmado_en <= ad.dado_en + interval '1 day'
   );

-- Quitárselo a quien lo activó por obligación, cuando la organización deja de exigirlo. Lo hace quien es de toda
-- la organización y lleva sus Ajustes (0137), y solo a quien ninguna otra organización suya se lo sigue exigiendo.
-- Con privilegio porque toca el doble factor de otras personas, que cada uno solo ve el suyo.
create or replace function estook.quitar_el_doble_factor_exigido(p_organizacion uuid)
returns integer
language plpgsql
volatile
security definer
set search_path = estook, pg_catalog, pg_temp
as $$
declare
  quitados integer;
begin
  if not estook.es_de_toda_la_organizacion(p_organizacion)
     or estook.nivel_de_permiso_en_organizacion(estook.persona_actual(), p_organizacion, 'app.ajustes')
        <> 'ver_y_editar' then
    raise exception 'solo_quien_lleva_la_empresa' using errcode = '42501';
  end if;
  if (select exige_doble_factor from estook.organizacion where id = p_organizacion) then
    return 0;
  end if;

  delete from estook.doble_factor d
   where d.por_obligacion
     and d.persona_id in (
       select m.persona_id from estook.membresia m
        where m.organizacion_id = p_organizacion
          and (m.revocada_en is null or m.revocada_en > now())
     )
     and not exists (
       select 1
         from estook.membresia m
         join estook.organizacion o on o.id = m.organizacion_id
        where m.persona_id = d.persona_id
          and o.exige_doble_factor
          and (m.revocada_en is null or m.revocada_en > now())
     );
  get diagnostics quitados = row_count;
  return quitados;
end;
$$;

comment on function estook.quitar_el_doble_factor_exigido(uuid) is
  'Al dejar de exigir el doble factor (0138): se lo quita a quien lo activó por obligación y no tiene otra organización que se lo exija.';

revoke all on function estook.quitar_el_doble_factor_exigido(uuid) from public;
grant execute on function estook.quitar_el_doble_factor_exigido(uuid) to estook_api;
