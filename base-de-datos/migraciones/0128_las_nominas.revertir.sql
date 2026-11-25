-- Deshace la 0128: sin nóminas. **Se pierde la lista de nóminas subidas** y sus avisos; los
-- ficheros se quedan en el cubo `equipo`, que no se borra.

delete from estook.llamada_a_fogon where que = 'leer_nominas';
alter table estook.llamada_a_fogon drop constraint llamada_a_fogon_que;
alter table estook.llamada_a_fogon add constraint llamada_a_fogon_que check (que in (
  'preguntar', 'rellenar_escandallo', 'escribir_pasos',
  'leer_albaran', 'leer_cierre', 'leer_merma_foto', 'leer_merma_voz',
  'revisar_datos', 'ajustar_pedido', 'hacer_cuadrante', 'responder_resena',
  'leer_carta', 'analizar_zona', 'leer_contrato'
));

delete from estook.aviso where tipo = 'nomina.subida';
delete from estook.preferencia_de_aviso where tipo = 'nomina.subida';
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
  'caja.descuadre'
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
  'caja.descuadre'
));

delete from estook.documento_de_persona where tipo = 'nomina';
drop index estook.documento_de_persona_nominas_por_mes;
alter table estook.documento_de_persona
  drop constraint documento_de_persona_importes_de_nomina,
  drop constraint documento_de_persona_el_mes_es_su_dia_uno,
  drop constraint documento_de_persona_la_nomina_con_su_mes,
  drop constraint documento_de_persona_tipo;
alter table estook.documento_de_persona
  add constraint documento_de_persona_tipo check (tipo in ('contrato')),
  drop column neto_centimos,
  drop column bruto_centimos,
  drop column mes;
