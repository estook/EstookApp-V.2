# 0133 · R3 · Los Ajustes del TPV y las secciones con su icono y su color

**Fecha:** 6 de noviembre de 2026
**Estado:** construido en la rama `r3-ajustes-y-secciones`, **con la migración 0104**.
**Sigue:** la [0132](0132-r2-2-servido-y-cambiar-un-plato.md) (R2 · 2, fusionada con la #166) y la
[0130](0130-la-pausa-del-5-nov-r1-lo-rapido.md) (la pausa del 5-nov). Las maquetas, aprobadas por
Richi el 5-nov (puntos 1.4 y 6).
**Cambia:** el Anexo (11.10 y 11.11), ESTADO y el plan de M20A.

La tercera de las cuatro entregas de la pausa del 5-nov. Después va **R4 · Precios, IA y papeles**
(con lo que Richi añadió el 6-nov, abajo) y luego T6 · 2 · 1.

## 1 · Los Ajustes del TPV, compactos (punto 1.4)

Antes, títulos pequeños, grises y en mayúsculas, baldosas altas y grupos de una sola baldosa con
media fila vacía. Ahora, **como los ajustes del teléfono**:

- **Tres grupos**, cada uno una lista de filas de una línea: **Lo que se vende** (Agotados, La sala y
  las mesas, Productos y precios, Cocina y barra), **Lo que se conecta** (Aparatos del local,
  Impresoras y cajón) y **Seguridad y Hacienda** (PIN y bloqueo, Facturación, Declaración
  responsable). «Hoy» se fue: solo tenía Agotados.
- **El título de cada grupo, grande y legible**, en blanco y sin mayúsculas.
- **Dos columnas en la tablet que se reparten solas**, una en el móvil: cabe en una pantalla.
- Cada fila dice cómo está, en corto: «8 secciones · 18 productos», «Ámbar 10′, rojo 20′ · suena»,
  «Se bloquea a los 2 min».
- **Sus iconos, de Lucide**: eran trazos dibujados a mano, y Richi pidió que ninguno lo fuera. Los
  mismos en la lista de aparatos y en la barra de arriba.

## 2 · Productos y precios, en dos columnas (punto 6)

- **A la izquierda, las secciones**, con su icono y su color, cuántos productos tienen y quién las
  prepara. Se arrastran para ordenarlas, en el mismo orden que el comandero. Arriba, «Lo más pedido»,
  que dice si sale o no.
- **A la derecha, la que se toca**: su baldosa grande, «Icono y color», «Nombre», quién la prepara y
  **sus productos tal como se ven al pedir**, con su precio y la franja de su color, y «+ De la carta».
- **En el móvil**, primero la lista; al tocar una sección se abre su detalle, con «‹ Secciones».
- **«Página» pasa a llamarse «Sección»**, como en la Carta de Estook: eran dos nombres para lo mismo.
  Por dentro sigue siendo `pagina_del_tpv`: cambiar el nombre de la tabla no le da nada a nadie y
  rompería la caja de centro y lo guardado sin internet.
- La explicación larga se pliega en **«¿Cómo funciona?»**.

## 3 · Cada sección con su icono y su color (punto 6)

- **Once colores**: los nueve de T3 y dos más, **amarillo** (el de «Lo más pedido») y **marrón** (el
  de los cafés), con sus fichas en el sistema de diseño (`seccion-amarillo` y `seccion-marron`).
- **Treinta iconos de comida y bebida, todos de Lucide**, añadidos a `herramientas/traer-iconos.mjs`
  y descargados con ella. **Nunca dibujados a mano.** Hamburguesa y paella no existen en Lucide: van
  con el bocadillo y la olla.
- **Estook los pone solo por el nombre** (`comoSeVeElNombre`, en `@estook/dominio`): Cervezas, la
  jarra en naranja; Vinos, la copa en morado; Cafés, la taza en marrón; Postres, rosa; lo que no
  reconoce, los cubiertos en gris. **Se calcula al leer**: una sección recién creada, traída de la
  carta o renombrada lo lleva sin más, y lo que el local eligió se guarda y manda.
- **«Icono y color»**: arriba cómo quedará en el comandero, debajo los colores y los iconos.
- **En el comandero y en la caja**, cada sección es **una baldosa de su color con su icono** y su
  nombre debajo, y **cada producto lleva la franja del color de su sección** (también en «Lo más
  pedido»).

## 4 · «Lo más pedido», solo si se marca algo

Richi, 6-nov: «que se active solo si se activa en el plato; ahora sale porque sí… ocupa mucho y
tienen que deslizar mucho los camareros para ver todas las secciones».

- **Sin ningún producto marcado, «Lo más pedido» no sale** en el comandero ni en la caja.
- **Con algo marcado**, sale la primera: lo marcado, y detrás lo más vendido a esa hora, como hasta
  hoy.
- El interruptor del producto se llama ahora **«En Lo más pedido»** y explica cuándo sale.
- En Productos y precios, la fila de «Lo más pedido» dice «No sale: nada marcado» o «Sale · 2
  marcados», y al tocarla enseña lo marcado.

## 5 · La base

Migración **0104**:

- `pagina_del_tpv.icono`: el icono que eligió el local, uno de los treinta (la base no deja otro).
  Nulo, el que propone su nombre.
- Los colores de la sección y del botón pasan de nueve a once. **Nada de lo que había se reescribe.**
- La vuelta atrás deja «sin color» lo que estuviera en amarillo o marrón, y lo dice.

`crear_pagina_del_tpv` y `cambiar_pagina_del_tpv` aceptan `icono`. **La API sigue con 119 consultas y
336 comandos.**

## 6 · Lo que Richi añadió el 6-nov para R4

Esto **no se construye en R3**: va en R4, en su rama, después de esta. Se escribe aquí para que R4
empiece con las cifras finales.

1. **Los planes, sin IVA y con el precio final**: **Esencial 39 €**, **Pro 99 €**, **Cadena 89 €** por
   local y **Pausa 9 €**, todos **+ IVA**. En Stripe, `tax_behavior: 'exclusive'`. Richi: «es el final»,
   y en todos los documentos tiene que quedar este, sin rastro de los anteriores. La Pausa, con las
   reglas de la [0130](0130-la-pausa-del-5-nov-r1-lo-rapido.md): de uno a seis meses, una vez cada
   doce, al instante y sin penalización al volver, con el mes empezado prorrateado.
2. **La IA a un tercio**: 100 créditos en Esencial y 500 en Pro, tope de 1,65 € por local y mes, y
   «Analiza mi zona» una vez cada diez días.
3. **El coste por local** con Verifacti a 14,99 € + IVA el primer NIF al mes y 1,99 € cada NIF más.
4. **Estook TPV para Android, y después iOS** (el 6-nov pasó a la [0134](0134-estook-tpv-para-android-y-cobrar-en-el-aparato.md), con el TPV portátil y cobrar con tarjeta en el aparato, **detrás de T7 y en este repositorio**, no al final ni en uno aparte; **R4 queda aplazada**). Lo de antes decía, como módulo final: **una app aparte, en su propio
   repositorio, que comparte el dominio, la API y el sistema de diseño**; primero Android y, cuando el
   mercado lo pida, iOS.

## 7 · Lo que decidió la IA al construirlo

1. **Once colores como dijo Richi: los nueve de antes más amarillo y marrón.** La maqueta traía gris
   en vez de ámbar; el gris se queda solo para la sección que no se reconoce (los cubiertos), sin
   ofrecerse para elegir. **Amarillo y ámbar se parecen**: si a Richi no le gusta, se cambia el ámbar
   por gris en una línea.
2. **El icono y el color se calculan al leer**, sin rellenar la base: así cada camino (traer la
   carta, entrar solo, crear a mano) lo lleva sin tocar las funciones de la base.
3. **«Lo más pedido» marcado sigue completándose con lo más vendido**: lo que Richi pidió es que no
   salga si nadie ha marcado nada; lo de dentro no cambia.
4. **«Monta tus bebidas» y «Nuevo producto», arriba junto al título**, y no al pie del detalle como
   en la maqueta: en el móvil, sin una sección abierta, no se llegaba a ellos.
5. **«Lo más pedido» lleva el rótulo corto «Lo más»** en la baldosa del comandero, como en la
   maqueta; quien no ve la pantalla oye el nombre entero.
6. **El menú del día**, en el comandero, con el gorro del chef en naranja.
7. **Las palabras cortas se miran enteras** al proponer el icono: «cana» no se cuela en «americana»
   ni «ron» en «Ronda». Lo vigila una prueba.
