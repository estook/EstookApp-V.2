-- Deshace la 0061: sin emparejar la caja con el almacén, sin foto en las mermas y sin
-- el aviso de lo que falta al cerrar.
--
-- **Lo que se pierde:** qué producto era cada línea de la caja (se vuelve a decir) y
-- qué foto llevaba cada merma (las fotos se quedan en el almacén de ficheros, sin que
-- nadie las nombre). Las mermas, la caja y el libro siguen enteros.

delete from estook.aviso where tipo = 'inventario.falta';
delete from estook.preferencia_de_aviso where tipo = 'inventario.falta';

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
  'inventario.toca', 'inventario.contado', 'inventario.recontar'
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
  'inventario.toca', 'inventario.contado', 'inventario.recontar'
));

drop table if exists estook.foto_de_merma;

drop trigger if exists concepto_de_caja_normaliza on estook.concepto_de_caja;
drop table if exists estook.concepto_de_caja;
drop function if exists estook.normalizar_el_concepto_emparejado();
