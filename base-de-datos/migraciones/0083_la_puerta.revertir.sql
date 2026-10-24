-- Deshace la 0083: Estook TPV pierde su puerta. Los aparatos que no son para fichar se
-- van (los fichajes hechos en ellos se quedan, sin decir en qué aparato); los de fichar
-- siguen como estaban. Lo que pasó sigue en la auditoría.

-- La regla de la 0081, tal cual era.
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
    -- Quitar lo que está en cocina pide motivo y el permiso de quitarlo.
    if old.quitada_en is null and new.quitada_en is not null then
      if new.motivo_de_quitar is null then
        raise exception 'falta_motivo: quitar lo que ya está en cocina pide un motivo'
          using errcode = 'P0001';
      end if;
      if v_persona is not null and not estook.puede_editar('accion.quitar_de_cocina', new.local_id) then
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

alter table estook.linea_de_cuenta drop column if exists aprobacion_id;
drop table if exists estook.aprobacion;
drop table if exists estook.ajustes_del_tpv;

drop function if exists estook.fichados_en_el_aparato(text);
drop function if exists estook.aparato_por_llave(text);
drop function if exists estook.turno_activo(text, text);
drop table if exists estook.turno_del_operador;
drop table if exists estook.intento_de_vincular;
drop function if exists estook.codigo_vivo_por_huella(text, timestamptz);
drop table if exists estook.codigo_para_vincular;

-- Los aparatos que no son para fichar no caben en la 0052.
update estook.fichaje set terminal_id = null
 where terminal_id in (select id from estook.terminal where funcion <> 'fichar');
delete from estook.terminal where funcion <> 'fichar';

drop policy if exists terminal_lectura on estook.terminal;
drop policy if exists terminal_alta on estook.terminal;
drop policy if exists terminal_cambio on estook.terminal;

create policy terminal_lectura on estook.terminal
  for select using (estook.puede_ver('app.ajustes', local_id));

create policy terminal_alta on estook.terminal
  for insert with check (
    estook.puede_editar('app.ajustes', local_id)
    and creado_por = estook.persona_actual()
  );

create policy terminal_retirar on estook.terminal
  for update using (estook.puede_editar('app.ajustes', local_id))
  with check (estook.puede_editar('app.ajustes', local_id));

comment on table estook.terminal is
  'Un aparato del local con su propia llave (0057, 0068). Hoy solo ficha: cada uno teclea su PIN. Retirarlo lo deja sin valer al momento.';

drop index if exists estook.terminal_tema_unico;
alter table estook.terminal
  drop constraint if exists terminal_funcion_conocida,
  drop constraint if exists terminal_cajon_en_la_caja,
  drop constraint if exists terminal_dueno_en_el_comandero,
  drop constraint if exists terminal_version_corta,
  drop constraint if exists terminal_tema_con_forma,
  drop column if exists persona_id,
  drop column if exists cajon_id,
  drop column if exists version_de_la_app,
  drop column if exists ultimo_latido_en,
  drop column if exists tema_al_segundo;
alter table estook.terminal
  add constraint terminal_funcion_conocida check (funcion in ('fichar'));

drop table if exists estook.cajon;

delete from estook.permiso_de_rol
 where permiso in ('accion.vincular_aparatos', 'accion.ajustes_del_tpv');
delete from estook.permiso
 where codigo in ('accion.vincular_aparatos', 'accion.ajustes_del_tpv');
