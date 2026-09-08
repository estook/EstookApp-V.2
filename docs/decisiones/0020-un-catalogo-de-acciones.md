# 0020 · Un catálogo de acciones, y una acción es una dirección

**Fecha:** 8 de septiembre de 2026
**Estado:** decidido y construido en M6½

## El problema

Hasta M6½, cada operación vivía **dentro de la pantalla que la ofrece**. El botón
«Añadir producto» existía en Productos y en ningún otro sitio; el de invitar,
dentro de Equipo · Personas. Eso tiene tres consecuencias, y las tres se notan:

1. **El buscador universal encuentra cosas, no cosas que hacer.** B5 dice
   literalmente que busca «también acciones», y las que ofrecía eran ir a una app,
   ir a Ajustes y cambiar el tamaño de letra. Eso es navegación, no acciones.
2. **El Panel no puede tener accesos rápidos**, que el Manifiesto pide en su tabla
   de widgets: «Accesos rápidos · los botones que cada uno quiera».
3. **Y Fogón no tiene de dónde sacar qué puede hacer por ti.** «Que rellene la
   ficha de un producto», «que deje el pedido en borrador»: para eso hace falta una
   lista de acciones con su permiso y su forma de abrirse, no ocho pantallas cada
   una con sus botones.

## Lo decidido

**Un catálogo de acciones**, `apps/app/src/acciones/catalogo.tsx`, único dueño de
«qué se puede hacer». Es el mismo patrón que `apps.ts` resolvió para la navegación:
un catálogo, un dueño, varios consumidores. Aquí los consumidores son tres —los
accesos rápidos del Panel, la paleta del buscador y los botones de Fogón— y por eso
merece la pena.

Cada acción declara su nombre en cristiano y en imperativo, qué hace en una frase,
su icono, **el permiso que hace falta y de qué clase** —`ver` para las que solo
llevan a mirar, `editar` para las que cambian algo, porque sin esa distinción a un
cocinero se le ofrecería «invitar a alguien» por el hecho de ver Equipo— y a dónde
lleva.

## Y una acción es una dirección, no una llamada

Esta es la mitad interesante. Las acciones tienen que poder pulsarse desde tres
sitios, y ninguno de los tres está dentro de la pantalla que abre el formulario. La
forma fácil sería un estado global de «hay que abrir el alta de producto», y es la
mala: se queda pegado al navegar, se dispara dos veces si se vuelve atrás, y no se
puede compartir.

Así que una acción es **una dirección**:
`/inventario/productos/todo?hacer=nuevo`. Eso trae tres cosas de balde:

- El enlace **se puede copiar y pegar** en el chat del equipo, y funciona.
- Volver atrás con el botón del navegador cierra lo que se abrió, porque la
  dirección de antes no llevaba `hacer`.
- Y la pantalla no tiene que saber quién la llamó.

En cuanto se abre, el `hacer` se borra de la dirección con `replace`, para que
recargar la página no vuelva a abrir el formulario encima de lo que se estuviera
haciendo. Con `replace` y no navegando: si dejara rastro en el historial, el botón
de atrás lo reabriría.

## Lo que NO está en el catálogo

**Lo que Fogón hará y todavía no puede hacer.** Dictar una merma, pedir por foto de
albarán, montar un horario, analizar la carta. Eso vive en la ventana de Fogón,
contado como lo que es —algo que llega, con su módulo— y **no como un botón**.

Es la regla que este proyecto lleva persiguiendo desde M4: un control que promete
algo y no lo hace es el fallo que más veces ha aparecido aquí. Y el sitio donde más
caro sale es el widget de accesos rápidos del Panel, que es lo que más se pulsa.

## Y qué evita esto

«Algo construido, registrado y probado a lo que la pantalla no llama» es la familia
de fallo que este proyecto arrastra desde M4, y que en M5 fueron seis de catorce.
Una acción de este catálogo **se alcanza desde tres sitios a la vez**, así que la
que no se pueda alcanzar salta antes.

## Dónde se guarda qué acciones quiere cada uno

En el navegador, y **esto sí**. Es la única cosa del Panel que no va al servidor, y
tiene su razón: la composición del Panel va al servidor porque «para siempre tiene
que serlo en todos los aparatos» ([0019](0019-el-panel-de-cada-uno-vive-en-el-servidor.md));
qué cuatro botones tienes a mano es **lo contrario de eso**. En el móvil de la
cocina quieres «apuntar lo que ha llegado» y en el ordenador de la oficina quieres
«ver el libro».

Si algún día se demuestra que no, se sube con la lista de widgets, que ya tiene su
tabla.
