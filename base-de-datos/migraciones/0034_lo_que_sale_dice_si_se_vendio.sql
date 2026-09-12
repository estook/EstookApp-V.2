-- 0034 · Lo que sale de la camara dice si se vendio, y a cuanto
--
-- ═══════════════════════════════════════════════════════════════════════════
--
-- ── El agujero que esto tapa ────────────────────────────────────────────────
--
-- Sacar genero de la camara ofrecia «Gastado o vendido» como primera opcion. Las
-- dos cosas en el mismo boton, y no se parecen en nada:
--
--   · **Vendido** es genero que salio y **entro dinero por el**.
--   · **Gastado** es genero que salio y no entro nada: se cocino con ello.
--
-- Con las dos juntas, Estook no puede contestar «cuanto he vendido de esto» ni
-- «cuanto me ha dejado», que son las dos preguntas de las que cuelga el margen.
-- Es el mismo fallo que el Manifiesto 28 ya arreglo un escalon mas abajo —«la
-- comida del personal no es merma»— y que la 0028 arreglo con los motivos.
--
-- ── Lo que NO hace, y es lo mas importante de esta migracion ───────────────
--
-- **Una venta apuntada aqui no suma dinero a ningun sitio por su cuenta.** El
-- dinero de una jornada tiene un solo dueno, que es el cierre de caja (0027). Si
-- una salida de camara sumara a las ganancias y ademas se metiera el papel de la
-- caja, el dia se contaria dos veces y **no se veria**: el total del mes saldria
-- mal y todo lo demas pareceria correcto.
--
-- Lo que se guarda aqui es **lo que se cobro por ese genero**. Al cerrar la caja
-- sale propuesto, con su nombre y su importe, y decide una persona.

-- ═══════════════════════════════════════════════════════════════════════════
-- A · Un movimiento puede ser una venta
-- ═══════════════════════════════════════════════════════════════════════════
--
-- `salida` se queda como estaba: genero que sale y no es ni merma ni venta. Lo
-- decia su propio comentario de la 0023 desde el primer dia, esperando esto.
--
-- Y no es `consumo`: `consumo` lo produce M20 al explotar la ficha de un plato
-- vendido —sale harina porque se vendio una pizza— y `venta` es el genero que se
-- vende **tal cual**, que es media barra de un bar.

-- `after 'merma'` y no al final: el orden de un tipo enumerado es el orden en el
-- que se lee en todas partes, y `venta` va con las otras salidas de camara, no
-- detras de `recuento`. El dominio lo declara en ese mismo sitio, y hay una
-- prueba que cuadra las dos listas.
alter type estook.tipo_de_movimiento add value if not exists 'venta' after 'merma';

-- ═══════════════════════════════════════════════════════════════════════════
-- B · Lo que se cobro por lo que salio
-- ═══════════════════════════════════════════════════════════════════════════
--
-- **Con impuesto**, por la misma razon que el cierre de caja guarda su total con
-- el: es lo que se le cobra al cliente, el unico numero que quien lo apunta sabe
-- con certeza. Quitarselo es cosa del motor fiscal y depende de la operacion.
--
-- Nulo se acepta a proposito: se puede vender algo sin acordarse de a cuanto, y
-- perder el dato de que se vendio por no saber el importe seria peor. Por eso el
-- que dice «esto fue una venta» es el tipo, y no esta columna.

alter table estook.movimiento_de_stock
  add column ingreso_centimos bigint,
  add constraint movimiento_ingreso_no_negativo check (
    ingreso_centimos is null or ingreso_centimos >= 0
  ),
  -- ── Por que `tipo::text` y no `tipo = 'venta'` ───────────────────────────
  --
  -- Porque Postgres no deja **usar** un valor de un tipo enumerado en la misma
  -- transaccion en la que se anade, y las migraciones van de una en una dentro de
  -- su transaccion. Comparar el texto no usa el valor nuevo: lo lee. Es el mismo
  -- rodeo que la 0029 con los JSON, y por el mismo motivo (0029).
  add constraint movimiento_solo_la_venta_trae_dinero check (
    ingreso_centimos is null or tipo::text = 'venta'
  );

comment on column estook.movimiento_de_stock.ingreso_centimos is
  'Lo que se cobro por este genero, con impuesto. Solo en las ventas. No suma a ninguna ganancia: el dinero lo cuenta el cierre de caja.';

-- ═══════════════════════════════════════════════════════════════════════════
-- C · A cuanto se vende, cuando se vende tal cual
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Una cana, un botellin, una botella de vino: genero que sale de la camara y se
-- cobra sin pasar por una ficha de plato. Ese precio es el de la pizarra, asi que
-- **se guarda con impuesto**, al reves que el de compra (0033) y por el motivo
-- contrario: el IVA de compra se recupera y el de venta se ingresa.
--
-- `iva_de_venta` nulo quiere decir «el de la actividad»: en peninsula y Baleares,
-- un servicio de restauracion va al 10 % sea lo que sea lo que se sirva, porque
-- lo que se vende es el servicio y no la botella (0006). Donde no es IVA
-- —Canarias, Ceuta y Melilla— no se supone nada y se escribe el suyo.
--
-- Lo que esto NO es: la carta. La carta y sus platos son M10, y un plato tiene
-- ficha, escandallo y alergenos. Esto es el precio de un producto que se vende
-- tal cual, que es lo unico que se puede saber hoy sin inventarse un modulo.

alter table estook.producto
  add column precio_de_venta_centimos bigint,
  add column iva_de_venta             numeric(5, 4),
  add constraint producto_precio_de_venta_no_negativo check (
    precio_de_venta_centimos is null or precio_de_venta_centimos >= 0
  ),
  add constraint producto_iva_de_venta_razonable check (
    iva_de_venta is null or (iva_de_venta >= 0 and iva_de_venta <= 0.30)
  );

comment on column estook.producto.precio_de_venta_centimos is
  'A cuanto se vende tal cual, con impuesto: es el precio de la pizarra. Nulo cuando no se vende solo, que es lo normal en un ingrediente.';
comment on column estook.producto.iva_de_venta is
  'El tipo que se repercute al venderlo (0,10 es un 10 %). Nulo: el de la actividad. Los platos de la carta son M10 y tendran el suyo.';
