-- Deshace la 0131: sin recordatorios del equipo con aviso ni notas personales. **Se pierden las
-- notas, los recordatorios y sus avisos.**

delete from estook.aviso where tipo in ('calendario.recordatorio', 'calendario.nota');
delete from estook.preferencia_de_aviso where tipo in ('calendario.recordatorio', 'calendario.nota');
delete from estook.al_movil_programado where tipo in ('calendario.recordatorio', 'calendario.nota');
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
  'nomina.subida',
  'vacaciones.pedidas', 'vacaciones.respondidas'
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
  'nomina.subida',
  'vacaciones.pedidas', 'vacaciones.respondidas'
));

alter table estook.al_movil_programado drop constraint programado_tipo_conocido;
alter table estook.al_movil_programado add constraint programado_tipo_conocido check (
  tipo in (
    'turno.entras', 'lote.caduca', 'pedido.no_llega', 'chat.confirmar'
  )
);

drop function estook.lo_que_avisa_el_calendario(timestamptz, timestamptz, uuid, date);
drop table estook.nota_personal;

delete from estook.evento_de_calendario where origen = 'recordatorio';
alter table estook.evento_de_calendario drop constraint evento_recordatorio_con_su_tipo;
alter table estook.evento_de_calendario drop column avisa_a;
