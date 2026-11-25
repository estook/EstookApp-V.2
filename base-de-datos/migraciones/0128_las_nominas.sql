-- 0128 · La Ampliación 3 · 2 · Las nóminas (decisión 0153, sección 4; Plan, M13)
--
-- Lo que pidió Richi el 24-nov y contestó (pregunta 5): las nóminas, **en la ficha de cada
-- persona, por meses**, y **la persona ve y descarga las suyas**. Y la mejora que aprobó:
-- **«Subir las nóminas del mes»** con el PDF entero de la gestoría, que Fogón reparte página
-- a página por el DNI y el nombre.
--
--   A · **La nómina es un documento de la persona** (`documento_de_persona`, 0127), con su mes,
--       el bruto y el neto. Las mismas políticas: la ven quien lleva los datos del equipo y la
--       propia persona, nadie más. **El PDF de la gestoría entero no se guarda nunca**: lleva
--       las nóminas de todos. Cada una se guarda sola, con su página.
--   B · **A la persona le llega su aviso**: «Tu nómina de noviembre ya está».
--   C · Fogón aprende a leer nóminas (`leer_nominas`).

-- ═══════════════════════════════════════════════════════════════════════════
-- A · La nómina, documento de la persona
-- ═══════════════════════════════════════════════════════════════════════════

alter table estook.documento_de_persona
  add column mes             date,
  add column bruto_centimos  bigint,
  add column neto_centimos   bigint;

alter table estook.documento_de_persona drop constraint documento_de_persona_tipo;
alter table estook.documento_de_persona
  add constraint documento_de_persona_tipo check (tipo in ('contrato', 'nomina')),
  add constraint documento_de_persona_la_nomina_con_su_mes check ((tipo = 'nomina') = (mes is not null)),
  add constraint documento_de_persona_el_mes_es_su_dia_uno check (mes is null or extract(day from mes) = 1),
  add constraint documento_de_persona_importes_de_nomina check (
    (tipo = 'nomina' or (bruto_centimos is null and neto_centimos is null))
    and (bruto_centimos is null or bruto_centimos > 0)
    and (neto_centimos is null or neto_centimos > 0)
  );

comment on column estook.documento_de_persona.mes is
  'De qué mes es la nómina (su día 1). Solo en las nóminas.';
comment on column estook.documento_de_persona.bruto_centimos is
  'El bruto de la nómina, si se sabe: lo lee Fogón o lo escribe quien la sube. Privado como la nómina.';

create index documento_de_persona_nominas_por_mes
  on estook.documento_de_persona (organizacion_id, mes)
  where tipo = 'nomina';

-- ═══════════════════════════════════════════════════════════════════════════
-- B · El aviso de la nómina
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Las dos listas, copiadas enteras de la 0124 con `nomina.subida` al final.

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

-- ═══════════════════════════════════════════════════════════════════════════
-- C · Fogón lee nóminas
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Copiada de la 0127 entera, con `leer_nominas` añadido.

alter table estook.llamada_a_fogon drop constraint llamada_a_fogon_que;
alter table estook.llamada_a_fogon add constraint llamada_a_fogon_que check (que in (
  'preguntar', 'rellenar_escandallo', 'escribir_pasos',
  'leer_albaran', 'leer_cierre', 'leer_merma_foto', 'leer_merma_voz',
  'revisar_datos', 'ajustar_pedido', 'hacer_cuadrante', 'responder_resena',
  'leer_carta', 'analizar_zona', 'leer_contrato', 'leer_nominas'
));
