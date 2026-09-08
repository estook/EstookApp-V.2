# 0018 · Cada app tiene destinos, y cada destino sus vistas

**Fecha:** 8 de septiembre de 2026
**Estado:** decidido y construido en M6½

## Lo que había

Cada app tenía una lista plana de «pestañas», con un máximo de cuatro y un «Más»
si hacían falta cinco. Así estaba en la tabla de B5 desde M3, y salió mal de tres
maneras a la vez.

**Pestañas muertas.** Inventario gastaba una de sus cuatro posiciones en
«Pedidos», que es M7 y enseñaba un cartel, y otra en un «Más» que era el cajón
donde vivía Proveedores. **Dos de cuatro no llevaban a ningún sitio** — en la
barra de navegación principal de la app, y en el aparato donde de verdad se usa
Estook.

**Pestañas que eran la misma pantalla.** Calendario gastaba tres posiciones en
«Mes», «Semana» y «Día». No son tres sitios: son el mismo calendario con otro
aumento. Con eso, la app entera se quedaba con una posición para todo lo demás.

**Y un cajón de sastre por app.** Un «Más» no responde a ninguna pregunta, así
que nadie sabe qué hay dentro hasta que lo abre. Y lo que se mete ahí no se
encuentra nunca más.

Al mismo tiempo, y por el otro lado: los filtros de la lista de productos —lo que
está bajo mínimo, lo que no tiene precio, lo desactivado— vivían en **un
interruptor suelto en mitad del contenido** y en dos casillas apiladas. Son la
misma lista mirada de otra forma, y estaban en el sitio donde peor se ven.

## Lo decidido

Dos niveles, y cada uno con un trabajo.

> **Destino** · un sitio de la app que responde a **una pregunta**. Va en la barra
> de abajo en móvil y en el menú lateral en escritorio. Como mucho cuatro, y
> **solo entran los que existen de verdad**.
>
> **Vista** · la misma pantalla mirada de otra forma. Va en un control segmentado
> arriba, dentro del destino.

Y tres reglas que van con ello:

1. **Un destino que todavía no se ha construido no ocupa posición.** Lleva su
   módulo apuntado, se cuenta en el menú lateral y en la pantalla de «lo que
   llega», y no le quita el hueco a lo que sí funciona.
2. **Ninguna app tiene un «Más».** Lo que antes se metía ahí es una vista de un
   destino que sí contesta algo. Hay una prueba que lo prohíbe por nombre.
3. **Cada destino declara qué pregunta contesta**, en una frase que acaba en
   interrogación. Otra prueba lo exige. Si un destino no sabe qué pregunta
   contesta, es un cajón con otro nombre.

## Y la regla de profundidad sigue intacta

B5 dice «máximo tres niveles». Con destinos y vistas la dirección tiene tres
trozos —`/inventario/productos/bajo-minimo`— y parece que hay un piso más. No lo
hay, y la diferencia es comprobable:

- **Cambiar de vista no cambia el título de la pantalla**, ni las migas, ni a
  dónde lleva el botón de volver.
- La ficha sigue abriéndose **encima**, en panel lateral, sin cambiar de
  dirección.

Así que los niveles son **app → destino → ficha**, tres. La vista es un filtro de
la pantalla del medio, y va en la dirección por dos razones concretas: el enlace a
«lo que está bajo mínimo» se puede copiar y mandar por el chat del equipo, y volver
atrás devuelve a la vista de antes en vez de al principio.

## Lo que se descartó

**Dejar las pestañas y quitar solo las vacías.** Habría arreglado Inventario y no
Calendario: «Mes / Semana / Día» seguirían siendo tres destinos, y la primera app
que necesitara cinco sitios volvería a inventarse un «Más».

**Subir las pestañas a la pantalla y dejar abajo solo las apps.** Es lo que se
pidió al principio —«abajo queda raro»— y se descartó porque lo raro no era el
sitio: eran las dos posiciones vacías. Abajo es donde llega el pulgar, y es lo que
recomienda Apple para navegar. Lo que sí subió es el nivel que de verdad no es
navegación: las vistas.

## Cómo se comprueba que no se deshace

`packages/ui/src/apps.prueba.ts` **lee la tabla de B5 del Plan** y la compara con
el catálogo del código. Antes esa prueba llevaba los valores copiados dentro, y
por eso estuvo en verde mientras el código decía que Negocio tenía «Reseñas» donde
B5 dice «Pulse»: tres sitios, dos valores, y la comprobación del lado equivocado.

Y `pruebas/e2e/esqueleto.spec.ts` recorre **los destinos que cada app ofrece de
verdad** en su propia barra, no los del catálogo: si un día alguien pusiera en la
barra un destino sin construir, la prueba lo abriría y se caería.
