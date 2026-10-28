# 0114 · T3 · 2 · 2 · Monta tus bebidas: las raciones, las copas y los cafés

**Fecha:** 25 de octubre de 2026
**Estado:** construida, en su pull request (`t3-2-monta-tus-bebidas`, después de la #138), con la
migración 0089.
**Sigue:** la [0113](0113-t3-2-1-las-opciones.md), la [0106](0106-estook-tpv-la-sala-y-la-cocina.md) (19 a 23) y las maquetas 1 a 3 de T3 · 2
([`docs/maquetas/t3-2-lo-de-cada-producto.html`](../maquetas/t3-2-lo-de-cada-producto.html)), aprobadas
por Richi el 25-oct y auditadas.
**Cambia:** el plan (T3 · 2 entregada), el Anexo 7.2 y ESTADO.

## 1 · Lo que dijo Richi

Las tres respuestas del 25-oct, las mismas de la [0113](0113-t3-2-1-las-opciones.md): **las maquetas le
valen** (con la auditoría), **la copa lleva 50 ml y la copa de vino 150 ml**, y **el precio de la copa
lleva el refresco dentro**.

## 2 · Qué deja T3 · 2 · 2

En la caja, **Ajustes del TPV › Productos › «Monta tus bebidas»**, con tres pestañas:

- **Bebidas**: lo que el almacén tiene en sus familias de bebidas, con **cómo se vende** ya propuesto. La
  cerveza de barril, «Caña 200 ml» y «Doble 330 ml» encendidas y «Jarra 500 ml» apagada; el vino, la copa
  (con la dosis de la casa) y la botella; un refresco o una lata, entera. Cada ración dice **lo que cuesta
  del almacén**, lleva su precio, y lo que ya está en el TPV sale marcado y no se repite. Con buscador,
  **«Solo lo que falta»**, **«Mismo precio a todas»** y **«+ Una que no está en el almacén»**, que abre el
  producto nuevo del TPV.
- **Copas**: las botellas para copas (el ron, la ginebra, el whisky), cada una con su precio y **lo que te
  deja sin IVA, sin el refresco**. **La dosis de la casa** se elige una vez (de 20 a 80 ml) y una botella
  puede llevar la suya. **«¿Con qué?»**: los refrescos del almacén, con interruptor, y «Solo,
  con hielo». Lo que no se reconoce por su nombre se añade con **«+ Añadir botellas del almacén»**.
- **Cafés**: los de serie (solo, cortado, con leche, americano, descafeinado, bombón, las infusiones y el
  Cola Cao), cada uno con su coste: **el de verdad**, si el almacén tiene su café y su leche, o **el
  aproximado**, diciendo qué falta. Y **«+ Otro café, con su receta»**.

**Al pedir**, la caña es un toque; **la copa, dos**: la botella y su refresco, porque su «¿Con qué?» es
un solo grupo obligatorio de una (0113).

**La base** (migración 0089, con su `.revertir.sql`): en `local`, **`dosis_de_la_copa_ml`** (50) y
**`copa_de_vino_ml`** (150); y la función **`cambiar_lo_del_tpv_del_local`**.

**La API**: `las_bebidas_para_montar` y cuatro órdenes (`montar_bebidas`, `montar_copas`,
`montar_cafes` y `cambiar_las_dosis`), solo en el TPV y nunca en el móvil de nadie. La lógica de qué es
cada bebida y cómo se vende, en `@estook/dominio` (`bebidas.ts`).

## 3 · Lo que decidí al construirlo

1. **Cada bebida es un plato de la carta con su botón y su escandallo**: «tal cual» con su ración (la
   caña, 200 ml del barril; la copa, 50 ml de su botella) o con su receta (el café con leche). Así,
   cuando el almacén descuente lo vendido (con el cobro, T7), lo hará igual que con todo lo demás.
2. **Lo que la carta ya tiene con ese nombre no se repite**: se salta y se dice («ya estaban: …»).
3. **Sin precio no se pone**: «Poner N en el TPV» no se enciende mientras falte alguno, y dice cuántos.
4. **Cada bebida va a su página**: Cervezas, Vinos, Refrescos o Bebidas; **el agua, a «Pan y agua»** y
   los cafés a **«Cafés»**, las páginas de siempre (0112). Si la página no está, se crea.
5. **Un solo «¿Con qué?» para todas las copas**, obligatorio y de una: cada refresco **gasta su unidad
   del almacén**, sin sumar al precio (Richi: la copa ya lo lleva), y «Solo, con hielo» no gasta nada.
   Si ya estaba, se pone al día con los refrescos encendidos.
6. **La dosis de la casa es del local** y vale para lo que se monte después: lo ya montado no cambia. Una
   botella con su dosis propia la lleva en su escandallo.
7. **Las botellas para copas se reconocen por su nombre** (ron, ginebra, whisky, vodka…), nunca el vino
   ni la cerveza; **el vino de cocinar no se vende**. Lo demás en ml se puede añadir a mano.
8. **Un vino sin lo que trae su botella se vende entero**: para venderlo por copas, su ficha del almacén
   tiene que decir los ml (no se adivina).
9. **Un café lleva receta solo si el almacén tiene todo lo suyo**: una receta a medias daría un coste
   falso, y la pantalla enseña el aproximado con lo que falta.
10. **Montar bebidas pide poder cambiar la carta y Escandallos**, además de los Ajustes del TPV, porque
    escribe en los dos. Sin ellos, la pantalla lo dice y no deja.
11. **Lo de la botonera que vive en el local** (el camino, lo que entra solo y ahora las dosis) **se
    guarda con `cambiar_lo_del_tpv_del_local`**, que mira el permiso de los Ajustes del TPV. **Arregla un
    fallo de T3 · 1**: el local solo lo podía escribir quien tiene los Ajustes de Estook, así que para
    otro cualquiera el cambio no se guardaba y nadie se enteraba.
12. **«Mismo precio a todas» sale solo donde hay varias bebidas que se venden de una forma** (los
    refrescos, las latas): la caña y la doble del mismo barril no cuestan lo mismo.

## 4 · Lo que no entra en T3 · 2 · 2

- **Que el almacén descuente** lo vendido en el TPV: con el cobro (T7). Cada bebida ya tiene su
  escandallo para entonces.
- **Las bebidas del reparto con su precio propio**: cuando el reparto entre en el TPV.
- **Lo siguiente es T4 · Cocina y barra** ([el plan](../m20a-la-sala-y-la-cocina.md)).
