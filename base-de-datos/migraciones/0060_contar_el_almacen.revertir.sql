-- Deshace la 0060: sin inventarios en dos pasos, sin lotes que se gastan solos, sin
-- mínimo calculado y sin los avisos de inventario.
--
-- **Lo que se pierde:** lo contado que no se había cerrado (lo cerrado sigue en el
-- libro, como siempre), de qué lotes salió cada salida y lo que le quedaba a cada
-- lote, y qué mínimos rehacía Estook (el mínimo se queda con lo que valiera). Los
-- lotes que se acabaron solos se quedan retirados, como «gastados».

delete from estook.aviso where tipo in ('inventario.toca', 'inventario.contado', 'inventario.recontar');
delete from estook.preferencia_de_aviso
 where tipo in ('inventario.toca', 'inventario.contado', 'inventario.recontar');

alter table estook.aviso drop constraint aviso_tipo_conocido;
alter table estook.aviso add constraint aviso_tipo_conocido check (tipo in (
  'pedido.empezado', 'pedido.mandado', 'pedido.invitacion', 'pedido.listo',
  'albaran.incidencias', 'merma.grande', 'precio.subida', 'carta.publicada', 'tablon.nota',
  'pedido.toca', 'almacen.bajo_minimo', 'informe.dia', 'informe.semana', 'informe.mes',
  'google.nota',
  'fichaje.corregido',
  'horario.publicado', 'horario.cambiado',
  'turno.entras', 'lote.caduca', 'pedido.no_llega', 'fichaje.sin_apuntar',
  'chat.confirmar'
));

alter table estook.preferencia_de_aviso drop constraint preferencia_tipo_conocido;
alter table estook.preferencia_de_aviso add constraint preferencia_tipo_conocido check (tipo in (
  'pedido.empezado', 'pedido.mandado', 'pedido.invitacion', 'pedido.listo',
  'albaran.incidencias', 'merma.grande', 'precio.subida', 'carta.publicada', 'tablon.nota',
  'pedido.toca', 'almacen.bajo_minimo', 'informe.dia', 'informe.semana', 'informe.mes',
  'google.nota',
  'fichaje.corregido',
  'horario.publicado', 'horario.cambiado',
  'turno.entras', 'lote.caduca', 'pedido.no_llega', 'fichaje.sin_apuntar',
  'chat.confirmar'
));

alter table estook.producto drop column if exists minimo_calculado;

drop policy if exists lote_gasto on estook.lote;
drop table if exists estook.salida_de_lote;

drop trigger if exists lote_empieza_lleno on estook.lote;
drop function if exists estook.el_lote_empieza_lleno();

update estook.lote set como_se_retiro = 'gastado' where como_se_retiro = 'se_acabo';
alter table estook.lote drop constraint lote_como_se_retiro_conocido;
alter table estook.lote add constraint lote_como_se_retiro_conocido check (
  como_se_retiro is null or como_se_retiro in ('gastado', 'tirado')
);

alter table estook.lote
  drop constraint if exists lote_queda_no_negativa,
  drop column if exists queda;

drop table if exists estook.linea_de_inventario;
drop table if exists estook.inventario;
