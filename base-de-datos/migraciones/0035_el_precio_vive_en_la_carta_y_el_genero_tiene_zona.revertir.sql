-- Deshace la 0035: el lote pierde su cantidad, el producto su zona, y vuelven el
-- precio de venta y el importe de la linea que la 0034 habia puesto.
--
-- Las politicas del producto se dejan **como estaban antes de la 0035**, que es
-- como las escribio la 0023: sin la zona.

alter table estook.lote
  drop constraint if exists lote_cantidad_positiva,
  drop column if exists cantidad;

drop policy if exists producto_lectura on estook.producto;
drop policy if exists producto_escritura on estook.producto;

create policy producto_lectura on estook.producto
  for select using (local_id in (select local_id from estook.locales_visibles()));

create policy producto_escritura on estook.producto
  for all using (estook.puede_editar('app.inventario', local_id))
  with check (estook.puede_editar('app.inventario', local_id));

drop function if exists estook.zonas_que_ve(uuid);

drop index if exists estook.producto_por_zona;

alter table estook.producto
  drop column if exists zona;

drop type if exists estook.zona_del_producto;

-- Y lo de la 0034, tal cual lo dejo ella. Lo que se hubiera apuntado en esas
-- columnas no vuelve: se fue al aplicar la 0035, que es lo que dice su cabecera.

alter table estook.movimiento_de_stock
  add column ingreso_centimos bigint,
  add constraint movimiento_ingreso_no_negativo check (
    ingreso_centimos is null or ingreso_centimos >= 0
  ),
  add constraint movimiento_solo_la_venta_trae_dinero check (
    ingreso_centimos is null or tipo::text = 'venta'
  );

alter table estook.producto
  add column precio_de_venta_centimos bigint,
  add column iva_de_venta             numeric(5, 4),
  add constraint producto_precio_de_venta_no_negativo check (
    precio_de_venta_centimos is null or precio_de_venta_centimos >= 0
  ),
  add constraint producto_iva_de_venta_razonable check (
    iva_de_venta is null or (iva_de_venta >= 0 and iva_de_venta <= 0.30)
  );
