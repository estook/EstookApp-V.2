-- Deshace la 0052: sin personas sin correo, sin aparato para fichar, sin pausas y
-- sin el historial de las correcciones.
--
-- **Lo que se pierde:** las pausas, las correcciones guardadas una a una y los
-- aparatos para fichar. Los fichajes se quedan como estaban, con su última hora y
-- su último motivo, como antes de la 0052. **Y no se puede deshacer si hay alguien
-- sin correo**: el correo vuelve a ser obligatorio, y esa persona no lo tiene. Se
-- dice, en vez de inventarle uno.

alter table estook.aviso drop constraint aviso_tipo_conocido;
alter table estook.aviso add constraint aviso_tipo_conocido check (tipo in (
  'pedido.empezado', 'pedido.mandado', 'pedido.invitacion', 'pedido.listo',
  'albaran.incidencias', 'merma.grande', 'precio.subida', 'carta.publicada', 'tablon.nota',
  'pedido.toca', 'almacen.bajo_minimo', 'informe.dia', 'informe.semana', 'informe.mes',
  'google.nota'
));

alter table estook.preferencia_de_aviso drop constraint preferencia_tipo_conocido;
alter table estook.preferencia_de_aviso add constraint preferencia_tipo_conocido check (tipo in (
  'pedido.empezado', 'pedido.mandado', 'pedido.invitacion', 'pedido.listo',
  'albaran.incidencias', 'merma.grande', 'precio.subida', 'carta.publicada', 'tablon.nota',
  'pedido.toca', 'almacen.bajo_minimo', 'informe.dia', 'informe.semana', 'informe.mes',
  'google.nota'
));

drop function if exists estook.segundos_trabajados(estook.fichaje, timestamptz);

drop trigger if exists fichaje_deja_su_correccion on estook.fichaje;
drop trigger if exists fichaje_se_corrige_con_nombre on estook.fichaje;
drop function if exists estook.fichaje_deja_su_correccion();
drop function if exists estook.fichaje_se_corrige_con_nombre();

drop table if exists estook.correccion_de_fichaje;
drop function if exists estook.correccion_no_se_toca();
alter table estook.fichaje drop column if exists correcciones;

drop table if exists estook.pausa;
alter table estook.local
  drop column if exists pausas_en_uso,
  drop column if exists pausa_cuenta_como_trabajo;

alter table estook.fichaje drop column if exists terminal_id;
drop function if exists estook.anotar_intento_en_terminal(uuid, boolean);
drop function if exists estook.terminal_por_llave(text);
drop table if exists estook.terminal;

alter table estook.persona alter column correo set not null;
