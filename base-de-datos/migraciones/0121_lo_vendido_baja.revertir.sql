-- Deshace la 0121: lo vendido deja de bajar del almacén.
--
-- **Lo que se pierde:** la cola de lo que faltaba por restar y la lista de lo que bajó cada plato
-- cobrado («Por producto» y «Vendidos sin escandallo» se quedan sin datos). **Lo que no se pierde:**
-- los movimientos de consumo que ya se apuntaron siguen en el libro, porque el libro solo se añade.

drop policy if exists salida_de_lote_lo_vendido on estook.salida_de_lote;
drop policy if exists lote_lo_vendido on estook.lote;
drop policy if exists movimiento_lo_vendido on estook.movimiento_de_stock;

drop table if exists estook.linea_bajada;
drop table if exists estook.lo_vendido_por_bajar;

alter table estook.cobro_de_linea
  drop constraint if exists cobro_de_linea_posicion_en_rango,
  drop column if exists posicion;
