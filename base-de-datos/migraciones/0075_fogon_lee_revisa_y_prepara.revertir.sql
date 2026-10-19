-- Deshace la 0075: Fogón vuelve a lo de la 1 · 1, sin revisión ni su aviso.
--
-- Las llamadas de lo nuevo (leer, revisar, preparar) se borran: con la lista de antes
-- no caben. Se avisa de cuántas había, para que no se pierda sin saberlo.

do $$
declare
  llamadas int;
  revisiones int;
begin
  select count(*) into llamadas from estook.llamada_a_fogon
   where que not in ('preguntar', 'rellenar_escandallo', 'escribir_pasos');
  if llamadas > 0 then
    raise notice '% llamada(s) a Fogón de lo nuevo se borran', llamadas;
  end if;
  select count(*) into revisiones from estook.revision_de_fogon;
  if revisiones > 0 then
    raise notice '% revisión(es) de Fogón se borran con la tabla', revisiones;
  end if;
end
$$;

delete from estook.aviso where tipo = 'fogon.revision';
delete from estook.preferencia_de_aviso where tipo = 'fogon.revision';

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
  'plato.raya'
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
  'plato.raya'
));

drop function if exists estook.cuentas_con_fogon();
drop table if exists estook.revision_de_fogon;

delete from estook.llamada_a_fogon
 where que not in ('preguntar', 'rellenar_escandallo', 'escribir_pasos');

drop policy llamada_a_fogon_alta on estook.llamada_a_fogon;
create policy llamada_a_fogon_alta on estook.llamada_a_fogon
  for insert with check (
    persona_id = estook.persona_actual()
    and estook.puede_ver('app.fogon', local_id)
  );

alter table estook.llamada_a_fogon drop constraint llamada_a_fogon_que;
alter table estook.llamada_a_fogon add constraint llamada_a_fogon_que check (
  que in ('preguntar', 'rellenar_escandallo', 'escribir_pasos')
);
