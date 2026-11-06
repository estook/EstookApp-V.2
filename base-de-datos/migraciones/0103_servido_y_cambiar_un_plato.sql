-- 0103 · R2 · 2 · Servido y cambiar un plato (decisión 0132; la pausa del 5-nov, puntos 1.2 y 8.1)
--
-- Richi, 5-nov: «una opción en ajustes para que los camareros puedan tachar lo servido», y
-- «si lo cambian se cambia y listo… si ya estaba hecho, se apunta en merma como cambio del
-- cliente». Sin PIN: en un servicio cada segundo es oro.
--
--   · **Los camareros también marcan lo servido**: una opción del local, apagada de fábrica.
--     Lo marcado por la sala queda tachado como lo de la cocina, pero se sabe que fue la sala:
--     la cocina lo ve en verde, «Lucía ha marcado servido», con su «Deshacer».
--   · **Cambiar un plato**: el de antes queda quitado con «Cambio del cliente» y apunta al nuevo;
--     el nuevo sabe qué cambió («CAMBIO · Croquetas → Bravas»). Si ya estaba hecho, lo dice el
--     camarero, y lo que llevaba va a merma con su motivo propio.
--   · **Los minutos de «¿Cuenta?»**, que eran 15 fijos, pasan a ser del local.

-- ═══ El motivo de merma nuevo ═════════════════════════════════════════════════
--
-- Va en la partida de **pérdida** (`partida_de_la_merma` cae en el `else`): el plato se hizo y no
-- se vende. Postgres no deja usar un valor nuevo en la misma transacción que lo crea, y esta
-- migración no lo usa.
alter type estook.motivo_de_merma add value if not exists 'cambio_del_cliente' after 'fallo_de_elaboracion';

-- ═══ Lo del local ═════════════════════════════════════════════════════════════

alter table estook.local
  add column camareros_marcan_servido  boolean   not null default false,
  add column minutos_para_la_cuenta    smallint  not null default 15,
  add constraint local_minutos_para_la_cuenta check (minutos_para_la_cuenta between 5 and 120);

comment on column estook.local.camareros_marcan_servido is
  'Si los camareros también marcan lo servido desde la mesa (0132). Apagado, solo tacha la cocina. Con la cocina solo en papel, la sala lo marca siempre.';
comment on column estook.local.minutos_para_la_cuenta is
  'A los cuántos minutos de lo último una mesa que ha comido sale en «¿Cuenta?» (0131, 0132; 15 de fábrica).';

-- ═══ El plato servido por la sala y el plato cambiado ═════════════════════════

alter table estook.linea_de_cuenta
  add column servida_en_sala  boolean  not null default false,
  add column cambio_de        text,
  add column cambiada_por     uuid     references estook.linea_de_cuenta (id) on delete set null,
  add column estaba_hecho     boolean,
  add constraint linea_servida_en_sala_si_salio check (not servida_en_sala or salio_en is not null),
  add constraint linea_cambio_de_con_medida check (
    cambio_de is null or char_length(cambio_de) between 1 and 200
  ),
  add constraint linea_cambiada_si_quitada check (cambiada_por is null or quitada_en is not null);

comment on column estook.linea_de_cuenta.servida_en_sala is
  'La tachó la sala con «Servido» (0132), no la cocina: la cocina lo ve en verde, con quién y su «Deshacer».';
comment on column estook.linea_de_cuenta.cambio_de is
  'Lo que había antes de cambiar el plato: «1 Croquetas». La cocina lo ve: «CAMBIO · Croquetas → Bravas» (0132).';
comment on column estook.linea_de_cuenta.cambiada_por is
  'El plato que la sustituye, en un plato cambiado (quitado con «Cambio del cliente», 0132).';
comment on column estook.linea_de_cuenta.estaba_hecho is
  'En un plato cambiado ya mandado: si ya estaba hecho (lo dice el camarero). Si lo estaba, lo que llevaba va a merma.';

-- ═══ Lo de la cocina del local, con lo nuevo ═══════════════════════════════════
--
-- La de la 0090, copiada entera, con dos columnas más: si los camareros marcan lo servido y los
-- minutos de «¿Cuenta?». Cambia lo que devuelve, así que se quita y se vuelve a crear.

drop function estook.la_cocina_del_local(uuid);

create function estook.la_cocina_del_local(p_local uuid)
returns table (
  zona_horaria            text,
  hora_de_corte           text,
  aviso_min               smallint,
  tarde_min               smallint,
  suena                   boolean,
  camareros_marcan        boolean,
  minutos_para_la_cuenta  smallint
)
language sql
stable
security definer
set search_path = estook, pg_catalog, pg_temp
as $$
  select l.zona_horaria, to_char(l.hora_de_corte, 'HH24:MI'), l.cocina_aviso_min,
         l.cocina_tarde_min, l.cocina_suena, l.camareros_marcan_servido, l.minutos_para_la_cuenta
    from estook.local l
   where l.id = p_local
     and (estook.es_la_pantalla_del_local(p_local)
          or p_local in (select local_id from estook.locales_visibles()))
$$;

comment on function estook.la_cocina_del_local(uuid) is
  'Cuándo empieza el día, los minutos y el sonido de la cocina de un local, si la sala marca lo servido y los minutos de «¿Cuenta?», para su pantalla y para quien lo ve (0116, 0132).';

revoke all on function estook.la_cocina_del_local(uuid) from public;
grant execute on function estook.la_cocina_del_local(uuid) to estook_api;

-- ═══ Cambiar lo del TPV del local, con lo nuevo ════════════════════════════════
--
-- La de la 0093, copiada entera, con dos parámetros más al final.

drop function estook.cambiar_lo_del_tpv_del_local(uuid, text, text, boolean, smallint, smallint, smallint, smallint, boolean, text, text);

create function estook.cambiar_lo_del_tpv_del_local(
  p_local                   uuid,
  p_camino                  text     default null,
  p_camino_si_no_hay        text     default null,
  p_entra_solo              boolean  default null,
  p_dosis_ml                smallint default null,
  p_copa_de_vino_ml         smallint default null,
  p_aviso_min               smallint default null,
  p_tarde_min               smallint default null,
  p_suena                   boolean  default null,
  p_cocina_sale_en          text     default null,
  p_barra_sale_en           text     default null,
  p_camareros_marcan        boolean  default null,
  p_minutos_para_la_cuenta  smallint default null
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
         barra_sale_en = coalesce(p_barra_sale_en, barra_sale_en),
         camareros_marcan_servido = coalesce(p_camareros_marcan, camareros_marcan_servido),
         minutos_para_la_cuenta = coalesce(p_minutos_para_la_cuenta, minutos_para_la_cuenta)
   where id = p_local;
end;
$$;

comment on function estook.cambiar_lo_del_tpv_del_local(uuid, text, text, boolean, smallint, smallint, smallint, smallint, boolean, text, text, boolean, smallint) is
  'Cambia del local solo lo del TPV (la botonera, lo que entra solo, las dosis, los minutos y el sonido de la cocina, dónde sale lo de la cocina y la barra, si la sala marca lo servido y los minutos de «¿Cuenta?»), a quien tiene los Ajustes del TPV (0114, 0116, 0119, 0132).';

revoke all on function estook.cambiar_lo_del_tpv_del_local(uuid, text, text, boolean, smallint, smallint, smallint, smallint, boolean, text, text, boolean, smallint) from public;
grant execute on function estook.cambiar_lo_del_tpv_del_local(uuid, text, text, boolean, smallint, smallint, smallint, smallint, boolean, text, text, boolean, smallint) to estook_api;

-- ═══ Lo que la base deja a la sala: marcar lo servido y cambiar un plato ═══════════
--
-- La de la 0090, copiada entera, con dos puertas más:
--   · **marcar servido**: la sala tacha (y destacha lo suyo) si el local lo deja o si eso solo sale
--     en papel; lo que tacha la cocina sigue siendo solo de la cocina
--   · **un plato cambiado** se quita sin PIN, solo si en su lugar hay otro de verdad: de la misma
--     mesa, ya mandado y que dice qué cambió. Quitar sin más sigue pidiendo un jefe (0107)

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
