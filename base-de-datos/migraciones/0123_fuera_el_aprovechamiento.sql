-- 0123 · Fuera el aprovechamiento (decisión 0150; Richi, 22-nov)
--
-- «Te llega un kilo de atún, guardas un kilo. Si le quitas 200 gramos, apuntas 200 gramos de merma. Y
-- si un escandallo pone 100 gramos de atún, salen 100 gramos de atún, punto y final.» Hasta hoy cada
-- producto llevaba «lo que se aprovecha» (un 70 %), y el coste de un plato y lo que restaba una venta
-- se dividían entre ese número: un lío para la plantilla y una fuente de descuadres.
--
--   1. **Todos los productos, al 100 %.** Con eso, la API de antes —que sigue en marcha entre migrar y
--      desplegar— ya cuesta los platos igual que la nueva, que no lo lee.
--   2. **Las columnas se quedan, sin usar** (lección 276): la API de antes las lee y las escribe. Se
--      quitan en una migración de después. Los precios y lo pactado las piden, así que nacen al 100 %.
--
--   3. **«Al limpiarlo», un motivo de merma nuevo.** Lo que se quita al limpiar o pelar ahora es merma, y
--      con los motivos de antes la plantilla lo apuntaría como «Estaba malo». Cae en «Pérdida», como lo
--      demás que se tira: lo decide `partida_de_la_merma`, que manda ahí todo lo que no es personal ni
--      atenciones.
--
-- Lo que es de una elaboración («la salsa rinde 2 litros») **no se toca**: es otra cosa, cuánto sale
-- de una receta, y sigue igual.

alter type estook.motivo_de_merma add value if not exists 'limpieza' before 'caducado';

update estook.producto set rendimiento = 1 where rendimiento <> 1;

alter table estook.precio_de_producto alter column rendimiento set default 1;
alter table estook.precio_pactado alter column rendimiento set default 1;

comment on column estook.producto.rendimiento is
  'Sin usar desde la 0123 (0150): no hay aprovechamiento; lo que se tira al limpiar es merma. Se quita en una migración de después, cuando ninguna API lo lea.';
comment on column estook.producto.sin_verificar is
  'Sin usar desde la 0123 (0150): marcaba el aprovechamiento supuesto, que ya no existe. Se quita en una migración de después.';
comment on column estook.precio_de_producto.rendimiento is
  'Sin usar desde la 0123 (0150): siempre 1. Lo de antes se queda como se guardó. Se quita en una migración de después.';
comment on column estook.precio_pactado.rendimiento is
  'Sin usar desde la 0123 (0150): siempre 1. Se quita en una migración de después.';
