-- Deshace la 0129: sin vacaciones pedidas. **Se pierden las solicitudes** y sus avisos.

delete from estook.aviso where tipo in ('vacaciones.pedidas', 'vacaciones.respondidas');
delete from estook.preferencia_de_aviso where tipo in ('vacaciones.pedidas', 'vacaciones.respondidas');
alter table estook.aviso drop constraint aviso_tipo_conocido;
alter table estook.aviso add constraint aviso_tipo_conocido check (tipo in (
  'pedido.empezado', 'pedido.mandado', 'pedido.invitacion', 'pedido.listo',
  'albaran.incidencias', 'merma.grande', 'precio.subida', 'carta.publicada', 'tablon.nota',
  'pedido.toca', 'almacen.bajo_minimo', 'informe.dia', 'informe.semana', 'informe.mes',
  'google.nota',
  'fichaje.corregido',
  'horario.publicado', 'horario.cambiado',
  'turno.entras', 'lote.caduca', 'pedido.no_llega', 'fichaje.sin_apuntar',
  'chat.confirmar',
  'inventario.toca', 'inventario.contado', 'inventario.recontar',
  'inventario.falta',
  'plato.raya',
  'fogon.revision',
  'documento.rechazado',
  'caja.descuadre',
  'nomina.subida'
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
  'chat.confirmar',
  'inventario.toca', 'inventario.contado', 'inventario.recontar',
  'inventario.falta',
  'plato.raya',
  'fogon.revision',
  'documento.rechazado',
  'caja.descuadre',
  'nomina.subida'
));

drop function estook.vacaciones_aprobadas(uuid, date, date);
drop table estook.solicitud_de_vacaciones;
delete from estook.permiso_de_rol where permiso = 'accion.gestionar_vacaciones';
delete from estook.permiso where codigo = 'accion.gestionar_vacaciones';
