-- 0120 · Los recomendados (el rediseño, entrega 3 · decisión 0148; Richi, 21-nov).
--
-- «Desde Carta, el gerente podría marcar cualquier producto con una opción "Recomendar para
-- venta", y estos aparecerían automáticamente en ese apartado del TPV para que los camareros
-- puedan ofrecerlos fácilmente.» Y después: «solo "Recomendados"», sin lo más vendido.
--
-- Hasta hoy existía algo parecido, pero colgado del botón del TPV: `boton_del_tpv.fijado`, lo
-- «fijado en Lo más pedido» de Ajustes del TPV › Productos. Un plato con dos botones (en dos
-- páginas) podía estar fijado en uno y no en el otro, y la Carta no sabía nada. **Recomendar es
-- del plato**: lo marcan la Carta y Ajustes del TPV, que escriben lo mismo, y lo leen el TPV
-- («Recomendados») y el Panel de la sala («Para recomendar»).
--
-- Lo que ya estaba fijado pasa a recomendado. Como mucho ocho a la vez (el tope lo pone el
-- servidor al marcar, `TOPE_DE_RECOMENDADOS`): lo que ya hubiera de más se queda, y para marcar
-- otro hay que quitar alguno.

alter table estook.plato
  add column recomendado boolean not null default false;

comment on column estook.plato.recomendado is
  'Lo que la casa recomienda (0148, entrega 3): sale en «Recomendados» del TPV y en «Para recomendar» del Panel de la sala, si no está agotado. Lo marcan la Carta y Ajustes del TPV; ocho como mucho, lo dice el servidor.';

update estook.plato p
   set recomendado = true
 where exists (
   select 1 from estook.boton_del_tpv b where b.plato_id = p.id and b.fijado
 );

-- **El fijado del botón se queda, sin usar**, hasta una migración de después. Entre migrar y desplegar
-- la API pasa un rato (primero fusionar, después migrar, después desplegar), y la API de antes lo lee
-- al montar la carta de la sala: borrarlo ahora dejaría el TPV sin poder tomar nota en ese rato.
comment on column estook.boton_del_tpv.fijado is
  'Sin usar desde la 0120: lo recomendado es del plato (plato.recomendado). Se quita en una migración de después, cuando ninguna API lo lea.';

create index plato_recomendado on estook.plato (local_id) where recomendado;
