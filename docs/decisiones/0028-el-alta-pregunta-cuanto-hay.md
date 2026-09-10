# 0028 · El alta de producto pregunta cuánto hay, no cuánto se aprovecha

**Fecha:** 10 de septiembre de 2026
**Estado:** decidido y construido en M6½ · sin migración nueva
**Completa:** la [decisión 0021](0021-el-producto-se-mide-en-una-unidad.md)

## Lo que se pidió

Que un producto nuevo **actualice el stock**: preguntar cuánto hay, en kilos,
litros o unidades; si son unidades, cuántas vienen y el precio; y la caducidad más
próxima. Quitar «qué porcentaje se aprovecha». Etiquetas de una palabra —
«producto», no «cómo se llama»; «proveedor (opcional)», no «a quién se lo
compras»—. Y en la lista, un **+ verde** para lo que llega, con el producto y el
precio puestos y editables, guardando el cambio de precio para la inteligencia, y
un **− rojo** que pregunte por qué sale.

## Lo que había

El producto nacía **a cero**: para que la cámara lo contara había que abrir su
ficha y apuntar una entrada. El valor de la cámara salía a cero en un local recién
dado de alta, que es justo cuando alguien lo mira para ver si Estook sirve.

## Uno · Cuánto hay, como primera línea del libro

El alta pregunta **cuánto hay ahora** y **cuándo caduca lo más próximo**. Con eso
entra en el libro una línea de tipo entrada y origen `alta`, valorada a su coste
por unidad de uso, con su lote si hay caducidad. No se escribe el stock: se apunta,
como todo lo demás (regla 8). La cámara lo cuenta desde el primer segundo.

## Dos · El aprovechamiento no se pregunta

Nadie sabe al dar de alta qué parte de una caja de pulpo se aprovecha, y un número
inventado ahí **encarece o abarata todas las fichas que lo lleven**. Nace en el
100 %; la ficha lo enseña como «se aprovecha 100 % · sin medir», y lo corrige la
calibración con recuentos de verdad (M8). Quien lo sepa lo puede corregir en la
ficha.

## Tres · El formulario, con las palabras de la cocina

Producto · en qué se mide (kg, L, ml, g, unidades) · **cuánto trae** —en unidades:
«cuántas unidades vienen»— · **precio, por todo** · cuánto hay ahora · caduca el ·
categoría · proveedor (opcional). Debajo del precio, la cuenta hecha: «sale a
1,20 €/kg». El envase se compone solo con lo que trae; el del catálogo se respeta
si no se toca.

## Cuatro · El + y el −

- **+**: ha llegado género. Con **el precio de siempre ya escrito**. Si se cambia,
  un interruptor lo deja como su precio **a partir de hoy**; el de antes queda en
  el histórico con su vigencia, que es lo que leerá Fogón para decir «el pulpo te
  ha subido un 18 %».
- **−**: ha salido, y se dice por qué: gastado o vendido, uno de los motivos de
  merma —y entonces va a mermas con su partida ([0026](0026-la-merma-tiene-motivo-y-partida.md))—,
  a otro local, u otra cosa con su nota.
- Y en la ficha, un enlace pequeño: «¿No cuadra lo que hay? Corrígelo», que es un
  ajuste con motivo. Ya no hay un botón grande de «ajustar lo que hay» al lado de
  los que se usan cada día.

## Lo que queda

Cuando las ventas bajen el stock solas (M20), el − se usará para lo que las ventas
no cuentan: lo que se tira y lo que se va a otro sitio. **La calibración** del
aprovechamiento es M8.
