-- Deshace la 0053: sin el horario de la semana.
--
-- **Lo que se pierde:** todas las semanas montadas, en borrador y publicadas, y los
-- avisos de horario que haya en la campana. El horario de siempre (0027) no se toca:
-- vuelve a ser lo único que mira el aviso de fichar.

delete from estook.aviso where tipo in ('horario.publicado', 'horario.cambiado');
delete from estook.preferencia_de_aviso where tipo in ('horario.publicado', 'horario.cambiado');

alter table estook.aviso drop constraint aviso_tipo_conocido;
alter table estook.aviso add constraint aviso_tipo_conocido check (tipo in (
  'pedido.empezado', 'pedido.mandado', 'pedido.invitacion', 'pedido.listo',
  'albaran.incidencias', 'merma.grande', 'precio.subida', 'carta.publicada', 'tablon.nota',
  'pedido.toca', 'almacen.bajo_minimo', 'informe.dia', 'informe.semana', 'informe.mes',
  'google.nota',
  'fichaje.corregido'
));

alter table estook.preferencia_de_aviso drop constraint preferencia_tipo_conocido;
alter table estook.preferencia_de_aviso add constraint preferencia_tipo_conocido check (tipo in (
  'pedido.empezado', 'pedido.mandado', 'pedido.invitacion', 'pedido.listo',
  'albaran.incidencias', 'merma.grande', 'precio.subida', 'carta.publicada', 'tablon.nota',
  'pedido.toca', 'almacen.bajo_minimo', 'informe.dia', 'informe.semana', 'informe.mes',
  'google.nota',
  'fichaje.corregido'
));

drop function if exists estook.horas_de_contrato(uuid, date);

drop table if exists estook.turno_publicado;
drop trigger if exists turno_en_su_sitio on estook.turno;
drop table if exists estook.turno;
drop function if exists estook.turno_en_su_sitio();
drop type if exists estook.tipo_de_turno;
drop table if exists estook.semana_de_horario;
