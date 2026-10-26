# 0117 · T4 · 2 · La barra y la alergia de la mesa

**Fecha:** 26 de octubre de 2026
**Estado:** construida, en su pull request (`t4-2-la-barra-y-la-alergia`), con la migración 0092.
**Sigue:** la [0116](0116-t4-1-la-cocina.md) y las maquetas de T4, 2.ª versión
([`docs/maquetas/t4-la-cocina-y-la-barra.html`](../maquetas/t4-la-cocina-y-la-barra.html), 3, 4 y
5), que Richi dio por buenas el 26-oct.
**Cambia:** el Anexo 3.1, 3.2, 3.7 y 7.2, el plan (T4 · 2) y ESTADO.

## 1 · Lo que dijo Richi

De las maquetas de T4: la alergia de la mesa **se marca en la sala, avisa al camarero y en cocina
se ve en rojo**, y **la cocina no confirma nada**: lo ve, que es lo que importa (25-oct). La barra,
«lo mismo, con lo que prepara la barra»: bebidas, cafés y copas, todo en marcha al momento, y lo
que se pide en la barra sin mesa. Lo de «Nadie» (el pan, el agua) no sale en ninguna pantalla.

## 2 · Qué deja

- **La pantalla de barra**, la cuarta función al vincular: la misma pantalla que la de cocina, sin
  PIN y siempre encendida, con lo que prepara la barra. **Sin pases**: lo que llega, en marcha.
  **Por rondas**: lo que se pide con lo de antes ya servido empieza tarjeta nueva. Tachar,
  destachar, «Llamar a Lucía», el sonido y Acabados, como en cocina.
- **La hora en el ✓ de la cuenta**: lo que sale de la cocina o de la barra se ve en la cuenta de la
  sala con «✓ 21:33».
- **La alergia de la mesa**: en las opciones de la mesa, **«⚠ Alergias»**, los catorce de un
  toque. En la botonera, lo que la lleva sale con el borde rojo y el alérgeno en rojo; al tocarlo,
  **«⚠ Croquetas lleva gluten»**: «No pedirlo» o «Pedirlo, la cocina lo verá». En la cuenta, «⚠
  Lleva gluten» debajo del plato. En cocina y en la barra, **la franja roja** arriba de la tarjeta
  y **«LLEVA GLUTEN»** en el plato. Nadie confirma nada.
- **Lo que lleva cada plato se congela al pedirlo**, como el precio: los alérgenos puestos a mano,
  los de su receta y los de lo que añaden sus opciones.

**La base** (migración 0092, con su `.revertir.sql`): `alergeno_de_la_cuenta` (la cuenta, el
alérgeno de los catorce, quién lo marcó y cuándo), que la leen quienes ven las mesas y la pantalla
del local, y la marcan y la quitan solo la sala; y en `linea_de_cuenta`, **`alergenos`**, lo que
lleva, con la regla de los catorce. La pantalla de barra no pide nada nuevo: la 0090 ya la
reconocía con el permiso de cocinar y ningún otro.

**La API**: una orden nueva, `cambiar_las_alergias`; la pantalla de barra entra por las mismas de
la de cocina, que dicen qué prepara (`prepara`). Con esto, **113 consultas y 303 comandos**.

## 3 · Lo que decidí al construirlo

1. **La pantalla de barra no tiene órdenes propias**: entra por `la_pantalla_de_cocina`,
   `tachar_en_la_pantalla`, `destachar_en_la_pantalla` y `llamar_al_camarero`, que miran la
   función del aparato y solo dejan tocar lo suyo. Una sola pantalla, una sola forma de probarla.
2. **La barra, por rondas**: una ronda nueva empieza cuando llega algo y lo de antes ya estaba
   servido. Así la tarjeta de la mesa no crece con todo lo de la noche, y lo que llega mientras la
   barra aún sirve entra en la misma, con «NUEVO». Las horas van al segundo: a la misma hora, lo
   servido va antes que lo recién pedido.
3. **Lo que lleva, congelado en la línea**: la pantalla no lee la carta ni las fichas (0116), y lo
   pedido no cambia si mañana cambia la ficha. Lo pedido antes de la 0092 no lleva nada.
4. **Lo que añade una opción suma su alérgeno; lo que quita no quita el aviso**: con una alergia,
   ante la duda, se avisa, y el nombre de la opción («Pan sin gluten») ya se lee en la comanda.
5. **Avisar, no prohibir**: el cliente puede saber lo que pide, o la alergia es de otro de la mesa.
   En el menú del día se avisa al elegir el primero, no a cada uno de los cuatro menús.
6. **Los nombres de servicio**: «Gluten», «Lácteos», «Frutos secos», «Huevo», cortos para un botón
   y una marca. El del reglamento se queda para la carta y la ficha.
7. **La alergia se dice entera** (`cambiar_las_alergias` con la lista): lo que no está, se quita.
   Quitar borra la fila; lo que había queda en el rastro de la mesa.
8. **Al juntar dos mesas, la alergia de las dos se queda en la que queda.**
9. **Lo de la barra también se devuelve** («VUELVE»), a su pantalla: la caña caliente se rehace.
10. **Suena también lo que vuelve de Acabados y lo pedido de más** (los postres, otra ronda en la
    barra), como lo nuevo. Antes solo sonaba una mesa nueva: vale también para la cocina.
11. **La ⚠ no sale en el plano**: en las opciones de la mesa, en la botonera, en la cuenta y en las
    pantallas. En el plano, con la prisa y la llamada, sería otro color más que mirar.

## 4 · Lo que no entra en T4 · 2

- **El papel** (la comanda impresa en la barra o en la cocina): con la caja para Windows y Estook
  Link (T5).
- **La entrada nueva del TPV** (la sala primero y el engranaje): sus maquetas esperan a Richi en la
  rama `la-entrada-del-tpv`.
