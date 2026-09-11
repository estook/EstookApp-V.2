# 0035 · El alta pregunta cómo se compra, y la cuenta la hace el dominio

**Fecha:** 11 de septiembre de 2026
**Estado:** decidido y construido en el repaso de M7 · **amplía** la
[0021](0021-el-producto-se-mide-en-una-unidad.md), no la sustituye

## Lo que pidió Richi

«Al añadir un producto, por ejemplo queso azul, si viene en un envase que pesa
250 g, tendremos que poner una opción de envase: cuántas unidades, cuánto pesa cada
una y cuánto cuestan todas en total o el precio unitario, y que haga el cálculo. Si
compran fruta, por kilo; leche, por litro. Que el hostelero elija la que más le
valga, rápido y sobre todo lógico, que no cueste entenderlo. **No explicándolo con
texto sino haciendo un buen diseño y cálculos internos, quitándoles trabajo.**»

Y de paso: «No pongas 1,7500 €: es 1,75 €. Solo dos decimales, que es lo habitual.
Otro ejemplo: "32,00 € envase de 50 l · sale a 0,6400 €/l".»

## Lo que había

El alta de M6½ preguntaba «en qué se mide» —kg, l, ud, g, ml— y «cuánto trae». Era
corta, pero obligaba a pensar en **la unidad de cuenta**, que es un concepto de
Estook y no del hostelero: quien compra seis tarros de 250 g piensa «una caja de seis
tarros», no «ud con factor 6». Y no había dónde decir que cada tarro trae 250 g, así
que el kilo de queso no se podía calcular.

## Lo que se decide

### Uno · Tres formas de comprar, y nada más

«¿Cómo lo compras?», con tres tarjetas y su ejemplo debajo:

| Forma            | Qué pregunta después                                         |
| ---------------- | ------------------------------------------------------------ |
| **Por peso**     | nada, si es suelto; si viene en cajas o sacos, cuánto trae   |
| **Por litros**   | lo mismo, en garrafas o bidones                              |
| **Por unidades** | cómo viene cada una, qué trae (250 g) y cuántas trae la caja |

Y debajo, lo que se va a guardar en una línea: «Caja de 6 tarros de 250 g · 1,5 kg
en total».

### Dos · El precio que se tenga a mano

El de la caja o el de cada cosa, con dos pastillas, y **la otra cifra sale sola**:
«La caja sale a 21,00 € · 14,00 € el kg». Se guarda siempre **el precio de lo que se
compra** —el del formato—, sin IVA ([0033](0033-los-precios-de-compra-se-guardan-sin-iva.md)).

### Tres · La cuenta es del dominio

`packages/dominio/src/presentacion.ts`: `presentacionDe` saca de las respuestas la
unidad de uso, el factor, el nombre del formato y lo que trae cada unidad;
`precioDelFormato` y `loQueSale` hacen las cuentas del precio, con `entreFactor` y
`porCantidad` (regla 9: nada de redondear por su cuenta). Es la misma cuenta en el
alta y al corregir la ficha, que usa las mismas tres preguntas.

Lo que trae cada unidad se guarda en dos columnas nuevas,
`producto.contenido_por_unidad` y `producto.unidad_del_contenido` (las dos o
ninguna). **La unidad de uso sigue siendo una** (0021): esto solo dice cuánto pesa
cada una, para poder dar el precio por kilo.

### Cuatro · Con género apuntado, la forma no se cambia

El libro de movimientos está en esa unidad: pasar de kg a ud reinterpretaría todo lo
apuntado. El servidor lo rechaza (`faltan_datos`) y la ficha lo dice antes, sin
dejar tocar la forma. Lo que sí se cambia es cómo te lo traen.

### Cinco · Dos decimales, siempre

Un precio por unidad se enseña **con dos decimales**. Si con dos no llega —el gramo
de azafrán—, **se cambia de unidad, no se añaden decimales**: los productos de antes
en g o ml se enseñan en €/kg o €/l («0,64 €/l»), y lo que no llega a un céntimo, por
cada cien («0,40 € cada 100 ud»). Por dentro sigue todo en milésimas de céntimo: lo
que se redondea es lo que se lee, nunca lo que se calcula.

## Lo que no se hace

- **No se convierten los productos de antes.** Los que se dieron de alta en g o ml
  siguen en g o ml; se leen en kg o l.
- **No se pregunta el aprovechamiento** en el alta (0028). Sigue en la ficha.
