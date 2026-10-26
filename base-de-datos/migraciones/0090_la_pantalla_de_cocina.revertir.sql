-- Deshace la 0090: la pantalla de cocina deja de ser alguien para la base, y se van «tienen
-- prisa», «la cocina te llama» y los minutos y el sonido de la cocina. Las funciones vuelven
-- tal cual estaban (0005, 0081, 0083 y 0089).

drop function estook.cambiar_lo_del_tpv_del_local(uuid, text, text, boolean, smallint, smallint, smallint, smallint, boolean);

create function estook.cambiar_lo_del_tpv_del_local(
  p_local             uuid,
  p_camino            text     default null,
  p_camino_si_no_hay  text     default null,
  p_entra_solo        boolean  default null,
  p_dosis_ml          smallint default null,
  p_copa_de_vino_ml   smallint default null
)
returns void
language plpgsql
security definer
set search_path = estook, pg_catalog, pg_temp
as $$
begin
  if not estook.puede_editar('accion.ajustes_del_tpv', p_local) then
    raise exception 'sin_permiso' using errcode = '42501';
  end if;
  update estook.local
     set botonera_camino = coalesce(p_camino, botonera_camino, p_camino_si_no_hay),
         botonera_entra_solo = coalesce(p_entra_solo, botonera_entra_solo),
         dosis_de_la_copa_ml = coalesce(p_dosis_ml, dosis_de_la_copa_ml),
         copa_de_vino_ml = coalesce(p_copa_de_vino_ml, copa_de_vino_ml)
   where id = p_local;
end;
$$;

comment on function estook.cambiar_lo_del_tpv_del_local(uuid, text, text, boolean, smallint, smallint) is
  'Cambia del local solo lo del TPV (cómo se montó la botonera, si lo nuevo entra solo, las dosis), a quien tiene los Ajustes del TPV (0114).';

revoke all on function estook.cambiar_lo_del_tpv_del_local(uuid, text, text, boolean, smallint, smallint) from public;
grant execute on function estook.cambiar_lo_del_tpv_del_local(uuid, text, text, boolean, smallint, smallint) to estook_api;

create or replace function estook.el_pase_lo_marcha_la_sala()
returns trigger
language plpgsql
set search_path = estook, public, pg_catalog, pg_temp
as $$
begin
  if estook.persona_actual() is not null
     and new.marchado_en is distinct from old.marchado_en
     and not estook.puede_editar('accion.tomar_nota', new.local_id) then
    raise exception 'sin_permiso: marchar es de la sala, nunca de la cocina'
      using errcode = '42501';
  end if;
  if old.marchado_en is not null and new.marchado_en is null then
    raise exception 'pase_marchado: un pase marchado no se desmarcha'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create or replace function estook.lo_mandado_no_se_reescribe()
returns trigger
language plpgsql
set search_path = estook, public, pg_catalog, pg_temp
as $$
declare
  v_persona uuid := estook.persona_actual();
begin
  -- Lo quitado se queda como se quitó.
  if old.quitada_en is not null
     and (new.quitada_en, new.quitada_por, new.motivo_de_quitar, new.salio_en, new.nota, new.cantidad)
         is distinct from
         (old.quitada_en, old.quitada_por, old.motivo_de_quitar, old.salio_en, old.nota, old.cantidad) then
    raise exception 'linea_quitada: un plato quitado ya no se cambia'
      using errcode = 'P0001';
  end if;

  if old.mandada_en is not null then
    -- Lo que es, cuántos, a qué precio y a dónde va no cambia una vez en cocina.
    if (new.plato_id, new.menu_id, new.parte_de, new.nombre, new.cantidad, new.precio_centimos,
        new.destino, new.mandada_en)
       is distinct from
       (old.plato_id, old.menu_id, old.parte_de, old.nombre, old.cantidad, old.precio_centimos,
        old.destino, old.mandada_en) then
      raise exception 'linea_mandada: lo que ya está en cocina no se reescribe; se quita con motivo y se pide otra vez'
        using errcode = 'P0001';
    end if;
    -- Quitar lo que está en cocina pide motivo y el permiso de quitarlo, o la
    -- aprobación de quien lo tiene (0107).
    if old.quitada_en is null and new.quitada_en is not null then
      if new.motivo_de_quitar is null then
        raise exception 'falta_motivo: quitar lo que ya está en cocina pide un motivo'
          using errcode = 'P0001';
      end if;
      if v_persona is not null
         and not estook.puede_editar('accion.quitar_de_cocina', new.local_id)
         and not exists (
           select 1
             from estook.aprobacion a
            where a.id = new.aprobacion_id
              and a.local_id = new.local_id
              and a.operacion = 'quitar_de_cocina'
              and a.sobre in (new.id, new.parte_de)
              and a.pedida_por = v_persona
              and a.creada_en > now() - interval '2 minutes'
              and estook.nivel_de_permiso(a.aprobada_por, a.local_id, 'accion.quitar_de_cocina') = 'ver_y_editar'
         ) then
        raise exception 'sin_permiso: quitar lo que ya está en cocina lo aprueba un jefe'
          using errcode = '42501';
      end if;
    end if;
  elsif new.mandada_en is null
        and (new.salio_en is not null or new.vuelve_en is not null) then
    raise exception 'linea_sin_mandar: no se tacha lo que no ha llegado a cocina'
      using errcode = 'P0001';
  end if;

  -- Tachar y destachar es de la cocina. La sala solo lo destacha al devolverlo («VUELVE»).
  if v_persona is not null
     and new.salio_en is distinct from old.salio_en
     and not estook.puede_editar('accion.cocinar', new.local_id)
     and not (
       new.salio_en is null
       and new.vuelve_en is distinct from old.vuelve_en
       and estook.puede_editar('accion.tomar_nota', new.local_id)
     ) then
    raise exception 'sin_permiso: tachar lo que sale es de la cocina'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create or replace function estook.puede_ver(p_permiso text, p_local uuid)
returns boolean
language sql
stable
as $$
  select estook.nivel_de_permiso(estook.persona_actual(), p_local, p_permiso) <> 'sin_acceso'
$$;

create or replace function estook.puede_editar(p_permiso text, p_local uuid)
returns boolean
language sql
stable
as $$
  select estook.nivel_de_permiso(estook.persona_actual(), p_local, p_permiso) = 'ver_y_editar'
$$;

drop policy auditoria_la_lee_su_pantalla_al_apuntar on estook.auditoria;
drop policy auditoria_la_anade_su_pantalla on estook.auditoria;
drop function estook.la_pantalla_apunta_en(uuid, uuid);
drop policy mesa_la_lee_su_pantalla on estook.mesa;
drop function estook.la_cocina_del_local(uuid);
drop function estook.los_nombres_de_la_sala(uuid);
drop function estook.es_la_pantalla_del_local(uuid);
drop function estook.pantalla_actual();

alter table estook.local drop constraint local_minutos_de_cocina;
alter table estook.local
  drop column cocina_suena,
  drop column cocina_tarde_min,
  drop column cocina_aviso_min;
alter table estook.cuenta drop column cocina_llama_en, drop column con_prisa;
