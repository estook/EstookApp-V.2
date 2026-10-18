-- Deshace la 0073: las recetas vuelven a ser de una ración y se va el aviso del plato.
--
-- Una receta escrita por tanda se queda con sus cantidades, que se leerían como de una
-- ración: se avisa de cuántas hay antes de quitar la columna.

do $$
declare
  por_tanda int;
begin
  select count(*) into por_tanda from estook.receta where raciones is not null;
  if por_tanda > 0 then
    raise notice '% receta(s) estaban escritas por tanda: sus cantidades se leerán como de una ración', por_tanda;
  end if;
end
$$;

alter table estook.receta drop constraint receta_raciones_solo_de_un_plato;
alter table estook.receta drop constraint receta_raciones_razonables;
alter table estook.receta drop column raciones;

delete from estook.aviso where tipo = 'plato.raya';
delete from estook.preferencia_de_aviso where tipo = 'plato.raya';

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
  'inventario.falta'
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
  'inventario.falta'
));
