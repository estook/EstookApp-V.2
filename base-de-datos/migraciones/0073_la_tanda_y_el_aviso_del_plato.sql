-- 0073 · La receta por tanda, y el aviso de «un plato cruza la raya» (M9 · 3, decisiones 0092 y 0093)
--
-- ═══════════════════════════════════════════════════════════════════════════
-- A · La tanda
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Hasta hoy la receta de un plato era **una ración**. Lo de la casa que se hace en olla
-- —un puchero, unas lentejas— se cocina por tandas: «esta olla sale para 25 raciones»,
-- y escribirla dividida por 25 nadie la sigue. Las diez recetas de Estook ya vienen así
-- (la tortilla para 8, las croquetas para 40).
--
-- `raciones` dice cuántas salen de la receta tal como está escrita. **Vacía es una
-- ración**, que es lo de siempre: ninguna receta que ya existe cambia. El escandallo
-- sigue diciendo lo que cuesta **una** ración (divide), y la desviación de los platos
-- también divide (lo vendido son raciones, no ollas).
--
-- Solo para platos: una elaboración ya dice lo que rinde (`elaboracion.rinde_*`).

alter table estook.receta
  add column raciones smallint;

alter table estook.receta
  add constraint receta_raciones_razonables
  check (raciones is null or raciones between 2 and 1000);

alter table estook.receta
  add constraint receta_raciones_solo_de_un_plato
  check (raciones is null or plato_id is not null);

comment on column estook.receta.raciones is
  'Cuántas raciones salen de la receta tal como está escrita (una olla, una tanda). Vacía es una ración. Solo de platos (0092).';

-- ═══════════════════════════════════════════════════════════════════════════
-- B · El aviso de «un plato cruza la raya»
-- ═══════════════════════════════════════════════════════════════════════════
--
-- «Qué ha cambiado» (0092, 1B) avisa en la campana **solo cuando un plato cruza una
-- raya**: pasa de tu objetivo de coste, o empieza a perder dinero en un canal. Una vez
-- por plato y por raya, no con cada albarán. Lo mira el reloj cada mañana comparando el
-- escandallo de ayer con el de hoy, así que no hace falta guardar nada más.
--
-- Las listas enteras, copiadas de la 0061 y con lo nuevo al final.

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
