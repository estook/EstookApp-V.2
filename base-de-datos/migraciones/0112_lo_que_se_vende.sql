-- 0112 · La pausa del 8-nov · P2 · Lo que se vende y cómo funciona el local (decisión 0142)
--
-- Servicio › Jornadas › Información y Negocio › Informes leen **las mesas de Estook TPV**: cada plato
-- pedido, de quién era la mesa, cuándo se mandó y cuándo lo tachó la cocina, si volvió, si se quitó
-- y por qué, y las mesas que se anularon. Hasta T7 es lo pedido en las mesas; con el cobro, lo cobrado.
--
-- **Por qué dos funciones y no una política más**: las mesas las ven quien toma nota y quien cocina
-- (0106), y los informes los mira quien ve las ventas —la dirección, un area manager— aunque no tome
-- nota. Darle las mesas enteras a quien ve ventas abriría la sala por otra puerta; estas funciones
-- **solo leen**, solo lo de un local, y solo a quien tiene `dato.ventas` en él (lo mira la propia
-- función, no la pantalla). Sin importes para nadie más: quien no ve ventas recibe un error.
--
-- **La jornada de cada mesa** es la de cuando se liberó (o se anuló, o se abrió si sigue abierta),
-- de hora de corte a hora de corte en el reloj del local, como el resto de Estook (M16a, 0105).

create function estook.las_lineas_vendidas(p_local uuid, p_desde date, p_hasta date)
returns table (
  linea_id         uuid,
  cuenta_id        uuid,
  plato_id         uuid,
  menu_id          uuid,
  parte_de         uuid,
  nombre           text,
  seccion          text,
  destino          text,
  cantidad         integer,
  precio_centimos  integer,
  pase             smallint,
  pedida_en        timestamptz,
  mandada_en       timestamptz,
  marchado_en      timestamptz,
  salio_en         timestamptz,
  quitada_en       timestamptz,
  motivo_de_quitar text,
  cambiada         boolean,
  estaba_hecho     boolean,
  vuelve_en        timestamptz,
  motivo_de_vuelve text,
  camarero_id      uuid,
  jornada          date,
  hora             integer,
  dia_de_semana    integer
)
language plpgsql
stable
security definer
set search_path = estook, pg_catalog, pg_temp
as $$
begin
  if not estook.puede_ver('dato.ventas', p_local) then
    raise exception 'sin_permiso' using errcode = '42501';
  end if;
  return query
    with el_local as (
      select l.zona_horaria, l.hora_de_corte from estook.local l where l.id = p_local
    ), cuentas as (
      select c.id, c.camarero_id,
             ((coalesce(c.liberada_en, c.abierta_en) at time zone el.zona_horaria)
               - el.hora_de_corte::interval)::date as jornada
        from estook.cuenta c, el_local el
       where c.local_id = p_local
         and c.anulada_en is null
         -- Juntada con otra: sus platos ya están en la otra.
         and c.unida_a is null
    )
    select ld.id, ld.cuenta_id, ld.plato_id, ld.menu_id, ld.parte_de, ld.nombre,
           coalesce(sc.nombre, case when ld.menu_id is not null then 'Menús' end),
           ld.destino, ld.cantidad, ld.precio_centimos, ld.pase,
           ld.pedida_en, ld.mandada_en, pa.marchado_en, ld.salio_en,
           ld.quitada_en, ld.motivo_de_quitar, ld.cambiada_por is not null, ld.estaba_hecho,
           ld.vuelve_en, ld.motivo_de_vuelve,
           cu.camarero_id, cu.jornada,
           extract(hour from (ld.pedida_en at time zone el.zona_horaria))::integer,
           extract(isodow from (ld.pedida_en at time zone el.zona_horaria))::integer
      from estook.linea_de_cuenta ld
      join cuentas cu on cu.id = ld.cuenta_id
      cross join el_local el
      left join estook.plato p on p.id = ld.plato_id
      left join estook.seccion_de_carta sc on sc.id = p.seccion_id
      left join estook.pase pa on pa.cuenta_id = ld.cuenta_id and pa.numero = ld.pase
     where ld.local_id = p_local
       and cu.jornada between p_desde and p_hasta;
end;
$$;

comment on function estook.las_lineas_vendidas(uuid, date, date) is
  'Los platos de las mesas de un local entre dos jornadas, quitados incluidos, para Información e Informes (0142). Solo a quien ve las ventas de ese local; solo lee.';

revoke all on function estook.las_lineas_vendidas(uuid, date, date) from public;
grant execute on function estook.las_lineas_vendidas(uuid, date, date) to estook_api;

create function estook.las_mesas_del_servicio(p_local uuid, p_desde date, p_hasta date)
returns table (
  cuenta_id        uuid,
  tipo             text,
  personas         smallint,
  camarero_id      uuid,
  abierta_en       timestamptz,
  liberada_en      timestamptz,
  anulada_en       timestamptz,
  motivo_de_anular text,
  jornada          date
)
language plpgsql
stable
security definer
set search_path = estook, pg_catalog, pg_temp
as $$
begin
  if not estook.puede_ver('dato.ventas', p_local) then
    raise exception 'sin_permiso' using errcode = '42501';
  end if;
  return query
    select c.id, c.tipo, c.personas, c.camarero_id, c.abierta_en, c.liberada_en, c.anulada_en,
           c.motivo_de_anular,
           ((coalesce(c.liberada_en, c.anulada_en, c.abierta_en) at time zone l.zona_horaria)
             - l.hora_de_corte::interval)::date as jornada
      from estook.cuenta c
      join estook.local l on l.id = c.local_id
     where c.local_id = p_local
       and c.unida_a is null
       and ((coalesce(c.liberada_en, c.anulada_en, c.abierta_en) at time zone l.zona_horaria)
             - l.hora_de_corte::interval)::date between p_desde and p_hasta;
end;
$$;

comment on function estook.las_mesas_del_servicio(uuid, date, date) is
  'Las mesas de un local entre dos jornadas, anuladas incluidas, con sus personas y su camarero (0142). Solo a quien ve las ventas de ese local; solo lee.';

revoke all on function estook.las_mesas_del_servicio(uuid, date, date) from public;
grant execute on function estook.las_mesas_del_servicio(uuid, date, date) to estook_api;
