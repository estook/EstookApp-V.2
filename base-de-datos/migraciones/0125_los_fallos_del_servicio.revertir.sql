-- Deshace la 0125: la sala vuelve a marcar lo de la barra solo si el local lo deja o va en papel, y la
-- cola de lo vendido vuelve a la política de la 0121.
--
-- No borra nada: lo ya marcado servido se queda como está. La función vuelve a la de la 0103,
-- copiada entera.

drop policy lo_vendido_por_bajar_del_sistema on estook.lo_vendido_por_bajar;
drop policy lo_vendido_por_bajar_lectura on estook.lo_vendido_por_bajar;

create policy lo_vendido_por_bajar_del_local on estook.lo_vendido_por_bajar
  for all using (estook.es_el_sistema() or local_id in (select local_id from estook.locales_visibles()))
  with check (estook.es_el_sistema() or local_id in (select local_id from estook.locales_visibles()));

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
         )
         -- **Un plato cambiado** (0132): lo quita la sala sin PIN, porque en su lugar va otro
         -- de verdad, ya en cocina, de la misma mesa y que dice qué cambió.
         and not (
           new.cambiada_por is not null
           and estook.puede_editar('accion.tomar_nota', new.local_id)
           and exists (
             select 1
               from estook.linea_de_cuenta x
              where x.id = new.cambiada_por
                and x.cuenta_id = new.cuenta_id
                and x.mandada_en is not null
                and x.quitada_en is null
                and x.cambio_de is not null
           )
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

  -- Tachar y destachar es de la cocina. La sala lo destacha al devolverlo («VUELVE»), y
  -- marca lo servido si el local lo deja (0132).
  if v_alguien
     and new.salio_en is distinct from old.salio_en
     and not estook.puede_editar('accion.cocinar', new.local_id)
     and not (
       new.salio_en is null
       and new.vuelve_en is distinct from old.vuelve_en
       and estook.puede_editar('accion.tomar_nota', new.local_id)
     )
     -- **La sala marca lo servido** (0132) si el local lo deja, o si eso solo sale en papel; y
     -- desmarca lo que marcó ella. Lo que tacha la cocina, solo lo destacha la cocina.
     and not (
       estook.puede_editar('accion.tomar_nota', new.local_id)
       and (
         (new.salio_en is not null and new.servida_en_sala
          and exists (
            select 1 from estook.local l
             where l.id = new.local_id
               and (l.camareros_marcan_servido
                    or (new.destino = 'cocina' and l.cocina_sale_en = 'papel')
                    or (new.destino = 'barra' and l.barra_sale_en = 'papel'))
          ))
         or (new.salio_en is null and old.servida_en_sala and not new.servida_en_sala)
       )
     ) then
    raise exception 'sin_permiso: tachar lo que sale es de la cocina'
      using errcode = '42501';
  end if;
  return new;
end;
$$;
