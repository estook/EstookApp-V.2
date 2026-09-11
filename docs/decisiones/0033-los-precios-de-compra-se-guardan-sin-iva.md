# 0033 · Los precios de compra se guardan sin IVA, y se escriben como venga el papel

**Fecha:** 11 de septiembre de 2026
**Estado:** decidido y construido en el repaso de M7 (migración `0033`)

## Lo que se preguntó, y lo que contestó Richi

Al cerrar la primera entrega de M7 se le preguntó si los precios que había puesto a
sus productos llevaban IVA, porque las compras de [0032](0032-las-compras-se-mandan-se-reciben-y-se-concilian.md)
comparan sin él y M6 no lo decía en la pantalla.

Richi: «Sí, actualmente cuento con los precios con IVA, pero estaría genial añadir
una opción para elegir si el IVA está incluido o excluido. Bien puesto, por favor,
no a lo loco: mira cómo lo gestionan las mejores aplicaciones y copia su
estructura, ya que funciona.»

## Cómo lo hacen las que funcionan

Los programas de compras y de contabilidad resuelven lo mismo de la misma manera:
**un solo importe guardado, el neto**, y al escribir se dice si lo escrito lleva el
impuesto. Xero lo pone en cada documento («los importes son: sin impuestos · con
impuestos · sin impuestos aplicables»); QuickBooks, Holded y Odoo guardan el neto y
calculan el bruto al enseñarlo. Nadie guarda los dos, porque dos cifras que dicen lo
mismo acaban diciendo cosas distintas.

Y hay una razón de fondo para que el guardado sea el neto: **el IVA de compra se
recupera**. Lo que le cuesta de verdad el aceite a un restaurante es el precio sin
IVA; el escandallo, el food cost y el valor de la cámara se calculan con ese.

## Lo que se decide

### Uno · Se guarda sin IVA, siempre

Un número en la base: el precio sin impuesto, en céntimos. Pedidos, albaranes y
facturas ya iban así (0032); ahora también la lista de precios, sin excepciones.

### Dos · Cada producto sabe su IVA de compra

`producto.iva_de_compra`. Si está vacío, **el de su categoría fiscal**, que lo
calcula el dominio (`ivaDeCompraPorDefecto`):

| Categoría fiscal                    | IVA al comprarlo |
| ----------------------------------- | ---------------- |
| Alimento                            | 10 %             |
| Bebida refrescante sin azúcar       | 10 %             |
| Bebida alcohólica, azucarada y otro | 21 %             |

Se cambia en la ficha para lo raro: el pan, la leche o los huevos, al 4 %; o «sin
IVA». **En Canarias, Ceuta y Melilla no se propone ninguno**: no hay IVA, y el IGIC
y el IPSI de compra dependen del bien ([0006](0006-el-motor-fiscal.md): sin regla, no
se inventa un tipo). Allí el precio se escribe sin impuesto y ya está.

### Tres · El local elige cómo escribe, y cada campo deja cambiarlo

`local.precios_de_compra_con_iva`, en **Ajustes → Tus precios de compra**. Es el
punto de partida de cada campo de precio de compra —el alta, «cambiar el precio» y
la entrada de género—, y **cada campo lleva sus dos pastillas**, «Sin IVA» y «Con
IVA», con el tipo al lado y la otra cifra ya calculada debajo: el ticket del
mayorista trae IVA y el albarán del pescadero no, y los dos se apuntan el mismo día.
La cuenta es del dominio (`sinIva`, `conIva`), que es su único dueño.

### Cuatro · Lo que ya había se arregla una vez

`quitar_iva_a_los_precios`, desde la misma tarjeta y con confirmación. A cada precio
vivo de cada producto activo se le quita el IVA de su producto, **como un precio
nuevo** —el de antes queda en el histórico, con quién y por qué
(`se_quito_el_iva`)—. Se hace **una sola vez** por local
(`iva_quitado_de_los_precios_en`), con un candado para que dos pulsaciones no
dividan dos veces. Lo que no tiene tipo se deja como está y se dice cuántos son.

## Lo que no se hace

- **No se guardan dos precios.** El bruto se calcula al enseñarlo.
- **No se escribe IVA en pedidos, albaranes ni facturas.** La factura se compara con
  su base imponible, como hasta ahora.
- **No se toca el IVA de venta.** Es otra cosa: el de la carta sale de la categoría
  fiscal del plato y del motor fiscal (0006).

## Lo que cambia en otros sitios

La regla 41 de `ESTADO.md` decía «cada campo de precio de compra dice "sin IVA"».
Ahora dice que **cada campo deja escribirlo con o sin IVA, y se guarda sin él**.
