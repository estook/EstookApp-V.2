-- Deshace la 0034: el producto pierde su precio de venta y el libro deja de
-- poder guardar lo que se cobro por lo que salio.
--
-- ── Lo unico que no se deshace, y se dice ───────────────────────────────────
--
-- **Postgres no sabe quitar un valor de un tipo enumerado.** `venta` se queda
-- escrito en `estook.tipo_de_movimiento`, sin usar. No estorba: el tipo entero
-- desaparece al revertir la 0023, que es la que lo crea.
--
-- Lo que si se comprueba es que no haya ventas apuntadas. Si las hay, esta
-- reversion **para**: quitarles el importe seria borrar dinero apuntado sin
-- decirlo, y este libro no pierde nada en silencio.

do $$
begin
  if exists (select 1 from estook.movimiento_de_stock where tipo::text = 'venta') then
    raise exception 'Hay ventas apuntadas en el libro de movimientos. Revertir la 0034 les quitaria lo que se cobro. Miralas antes.'
      using errcode = '23514';
  end if;
end;
$$;

alter table estook.producto
  drop constraint if exists producto_iva_de_venta_razonable,
  drop constraint if exists producto_precio_de_venta_no_negativo,
  drop column if exists iva_de_venta,
  drop column if exists precio_de_venta_centimos;

alter table estook.movimiento_de_stock
  drop constraint if exists movimiento_solo_la_venta_trae_dinero,
  drop constraint if exists movimiento_ingreso_no_negativo,
  drop column if exists ingreso_centimos;
