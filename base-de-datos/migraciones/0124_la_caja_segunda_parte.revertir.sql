-- Deshace la 0124: la caja vuelve a la de R3 · 1.
--
-- **Para si ya se ha usado**: con propinas apuntadas, cajas entregadas o propinas repartidas, deshacerla
-- borraría lo que dice el Z de esos días. Se mira antes y no se toca nada.
--
-- **Lo que se pierde sin avisar:** los avisos del descuadre que haya en la campana y lo que cada uno
-- eligiera para ellos en Ajustes › Avisos. Son avisos, no cuentas.

do $$
begin
  if exists (select 1 from estook.movimiento_de_caja where tipo = 'propina')
     or exists (select 1 from estook.turno_de_caja where entregada_a is not null or recibida_de is not null)
     or exists (select 1 from estook.reparto_de_propinas) then
    raise exception 'Ya hay propinas, cajas entregadas o repartos apuntados: revertir la 0124 cambiaría el Z de esos días. Míralo antes.'
      using errcode = '23514';
  end if;
end;
$$;

-- ═══ 5 · El aviso del descuadre ════════════════════════════════════════════════

delete from estook.aviso where tipo = 'caja.descuadre';
delete from estook.preferencia_de_aviso where tipo = 'caja.descuadre';

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
  'documento.rechazado'
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
  'documento.rechazado'
));

-- ═══ 4 · El reparto ════════════════════════════════════════════════════════════

drop function estook.fichados_del_dia(uuid, date);
drop table estook.reparto_de_propinas;

-- ═══ 3 · Entregar la caja ══════════════════════════════════════════════════════

alter table estook.turno_de_caja
  drop constraint turno_propinas_en_rango,
  drop constraint turno_entregada_si_cerrada,
  drop column recibida_de,
  drop column entregada_a,
  drop column propinas;

-- ═══ 2 · La propina ════════════════════════════════════════════════════════════

drop policy movimiento_alta on estook.movimiento_de_caja;
create policy movimiento_alta on estook.movimiento_de_caja
  for insert with check (
    (tipo in ('cambio', 'sacar', 'meter') and (
      estook.puede_editar('accion.abrir_el_cajon', local_id) or estook.puede_llevar_la_caja(local_id)
    ))
    or (tipo = 'devolucion' and estook.puede_editar('accion.devolver', local_id))
    or estook.es_el_sistema()
  );

drop index estook.movimiento_una_propina_por_cobro;
alter table estook.movimiento_de_caja
  drop constraint movimiento_propina_de_un_cobro,
  drop constraint movimiento_tipo_conocido,
  add constraint movimiento_tipo_conocido check (tipo in ('cambio', 'sacar', 'meter', 'devolucion')),
  drop column cobro_id;

-- ═══ 1 · Los ajustes ═══════════════════════════════════════════════════════════

alter table estook.ajustes_del_tpv
  drop constraint ajustes_avisar_en_rango,
  drop constraint ajustes_retirar_en_rango,
  drop column avisar_desde,
  drop column retirar_desde,
  drop column repartir_propinas,
  drop column propina_al_cobrar,
  drop column contar_escribiendo;
