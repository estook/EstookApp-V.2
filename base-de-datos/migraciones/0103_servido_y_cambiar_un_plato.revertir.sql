-- Deshace la 0103: las dos funciones vuelven a ser las de la 0090 y la 0093, y se quitan las
-- columnas del plato servido por la sala, del plato cambiado y los dos ajustes del local.
--
-- **Postgres no sabe quitar un valor de un tipo enumerado**: `cambio_del_cliente` se queda en
-- `estook.motivo_de_merma`, sin usar. Si hay mermas apuntadas con él, esta reversión **para**:
-- quitárselo sería cambiar en silencio por qué se tiró algo.

do $$
begin
  if exists (select 1 from estook.movimiento_de_stock where motivo_de_merma::text = 'cambio_del_cliente') then
    raise exception 'Hay mermas apuntadas como «Cambio del cliente». Revertir la 0103 las dejaría sin motivo que se entienda. Míralas antes.'
      using errcode = '23514';
  end if;
end;
$$;

-- La regla de lo mandado, la de la 0090: sin marcar servido ni cambiar un plato.
create or replace function estook.lo_mandado_no_se_reescribe()
returns trigger
language plpgsql
set search_path = estook, public, pg_catalog, pg_temp
as $$
declare
  v_persona uuid := estook.persona_actual();
  -- Una persona o la pantalla del local: alguien que sirve, no una migración (0116).
  v_alguien boolean := estook.persona_actual() is not null or estook.pantalla_actual() is not null;
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
      if v_alguien
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
  if v_alguien
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

drop function estook.cambiar_lo_del_tpv_del_local(uuid, text, text, boolean, smallint, smallint, smallint, smallint, boolean, text, text, boolean, smallint);

create function estook.cambiar_lo_del_tpv_del_local(
  p_local             uuid,
  p_camino            text     default null,
  p_camino_si_no_hay  text     default null,
  p_entra_solo        boolean  default null,
  p_dosis_ml          smallint default null,
  p_copa_de_vino_ml   smallint default null,
  p_aviso_min         smallint default null,
  p_tarde_min         smallint default null,
  p_suena             boolean  default null,
  p_cocina_sale_en    text     default null,
  p_barra_sale_en     text     default null
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
         copa_de_vino_ml = coalesce(p_copa_de_vino_ml, copa_de_vino_ml),
         cocina_aviso_min = coalesce(p_aviso_min, cocina_aviso_min),
         cocina_tarde_min = coalesce(p_tarde_min, cocina_tarde_min),
         cocina_suena = coalesce(p_suena, cocina_suena),
         cocina_sale_en = coalesce(p_cocina_sale_en, cocina_sale_en),
         barra_sale_en = coalesce(p_barra_sale_en, barra_sale_en)
   where id = p_local;
end;
$$;

comment on function estook.cambiar_lo_del_tpv_del_local(uuid, text, text, boolean, smallint, smallint, smallint, smallint, boolean, text, text) is
  'Cambia del local solo lo del TPV (la botonera, lo que entra solo, las dosis, los minutos y el sonido de la cocina, y dónde sale lo de la cocina y la barra), a quien tiene los Ajustes del TPV (0114, 0116, 0119).';

revoke all on function estook.cambiar_lo_del_tpv_del_local(uuid, text, text, boolean, smallint, smallint, smallint, smallint, boolean, text, text) from public;
grant execute on function estook.cambiar_lo_del_tpv_del_local(uuid, text, text, boolean, smallint, smallint, smallint, smallint, boolean, text, text) to estook_api;

drop function estook.la_cocina_del_local(uuid);

create function estook.la_cocina_del_local(p_local uuid)
returns table (
  zona_horaria  text,
  hora_de_corte text,
  aviso_min     smallint,
  tarde_min     smallint,
  suena         boolean
)
language sql
stable
security definer
set search_path = estook, pg_catalog, pg_temp
as $$
  select l.zona_horaria, to_char(l.hora_de_corte, 'HH24:MI'), l.cocina_aviso_min,
         l.cocina_tarde_min, l.cocina_suena
    from estook.local l
   where l.id = p_local
     and (estook.es_la_pantalla_del_local(p_local)
          or p_local in (select local_id from estook.locales_visibles()))
$$;

comment on function estook.la_cocina_del_local(uuid) is
  'Cuándo empieza el día y los minutos y el sonido de la cocina de un local, para su pantalla y para quien lo ve (0116).';

revoke all on function estook.la_cocina_del_local(uuid) from public;
grant execute on function estook.la_cocina_del_local(uuid) to estook_api;

alter table estook.linea_de_cuenta
  drop constraint if exists linea_cambiada_si_quitada,
  drop constraint if exists linea_cambio_de_con_medida,
  drop constraint if exists linea_servida_en_sala_si_salio,
  drop column if exists estaba_hecho,
  drop column if exists cambiada_por,
  drop column if exists cambio_de,
  drop column if exists servida_en_sala;

alter table estook.local
  drop constraint if exists local_minutos_para_la_cuenta,
  drop column if exists minutos_para_la_cuenta,
  drop column if exists camareros_marcan_servido;
