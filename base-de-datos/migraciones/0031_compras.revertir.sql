-- Revertir la 0031.
--
-- Se van los pedidos, los albaranes, las facturas y lo pactado, y el proveedor
-- vuelve a su ficha corta de M6. **Lo que NO se deshace es lo que los albaranes
-- apuntaron en el libro**: el libro solo se añade, y esas entradas siguen ahí,
-- como entradas a mano sin su papel. Si había compras dentro, esto borra de dónde
-- vino el género, no el género.

drop trigger if exists albaran_guardado on estook.albaran;
drop trigger if exists linea_de_albaran_guardada on estook.linea_de_albaran;
drop trigger if exists factura_guardada on estook.factura_de_compra;
drop trigger if exists pedido_guardado on estook.pedido_de_compra;
drop trigger if exists linea_de_pedido_guardada on estook.linea_de_pedido;

drop table if exists estook.precio_pactado;
drop table if exists estook.linea_de_albaran;
alter table if exists estook.albaran drop constraint if exists albaran_factura;
drop table if exists estook.factura_de_compra;
drop table if exists estook.albaran;
drop table if exists estook.linea_de_pedido;
drop table if exists estook.pedido_de_compra;

drop function if exists estook.albaran_guardian();
drop function if exists estook.linea_de_albaran_guardian();
drop function if exists estook.factura_guardian();
drop function if exists estook.pedido_guardian();
drop function if exists estook.linea_de_pedido_guardian();

drop type if exists estook.estado_de_factura;
drop type if exists estook.tipo_de_factura;
drop type if exists estook.incidencia_de_recepcion;
drop type if exists estook.tipo_de_albaran;
drop type if exists estook.estado_de_pedido;

delete from estook.recorte_de_permiso where permiso = 'accion.enviar_pedidos';
delete from estook.permiso_de_rol where permiso = 'accion.enviar_pedidos';
delete from estook.permiso where codigo = 'accion.enviar_pedidos';

alter table estook.proveedor
  drop constraint if exists proveedor_dias_de_reparto_de_la_semana,
  drop constraint if exists proveedor_plazo_con_sentido,
  drop constraint if exists proveedor_minimo_no_negativo,
  drop constraint if exists proveedor_portes_no_negativos,
  drop constraint if exists proveedor_dias_de_pago_con_sentido,
  drop constraint if exists proveedor_correo_con_forma;

alter table estook.proveedor
  drop column if exists cif,
  drop column if exists contacto,
  drop column if exists telefono,
  drop column if exists whatsapp,
  drop column if exists correo,
  drop column if exists web,
  drop column if exists como_se_pide,
  drop column if exists dias_de_reparto,
  drop column if exists plazo_de_entrega,
  drop column if exists hora_limite,
  drop column if exists pedido_minimo_centimos,
  drop column if exists portes_centimos,
  drop column if exists forma_de_pago,
  drop column if exists dias_de_pago;

drop type if exists estook.canal_de_pedido;
drop type if exists estook.forma_de_pago;
