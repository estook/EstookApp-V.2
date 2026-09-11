-- Deshace la 0033: los lotes vuelven a no saber si se quitaron ni si se
-- congelaron, el producto pierde su IVA de compra y su contenido, y el local su
-- preferencia. Lo que se guardó en esas columnas se pierde con ellas.

alter table estook.local
  drop column if exists iva_quitado_de_los_precios_en,
  drop column if exists precios_de_compra_con_iva;

alter table estook.producto
  drop constraint if exists producto_contenido_con_su_unidad,
  drop constraint if exists producto_contenido_positivo,
  drop constraint if exists producto_iva_de_compra_razonable,
  drop column if exists unidad_del_contenido,
  drop column if exists contenido_por_unidad,
  drop column if exists iva_de_compra;

drop index if exists estook.lote_congelado_vivo;
drop index if exists estook.lote_vivo_que_caduca;

alter table estook.lote
  drop constraint if exists lote_retirado_coherente,
  drop constraint if exists lote_como_se_retiro_conocido,
  drop column if exists como_se_retiro,
  drop column if exists retirado_por,
  drop column if exists retirado_en,
  drop column if exists congelado_el;
