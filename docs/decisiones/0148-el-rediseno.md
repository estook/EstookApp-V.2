# 0148 · El rediseño de Estook TPV y del Panel

**Fecha:** 18 de noviembre de 2026
**Estado:** la maqueta, [`el-rediseno.html`](../maquetas/el-rediseno.html), **aprobada por Richi el 18-nov**
(«me gusta la maqueta y todo lo propuesto, manos a la obra»). **Entrega 1, fusionada** (#192, con la
migración **0119**) y probada por Richi el 18-nov («todo probado»). **Entrega 2 · 1** (la venta rápida y «Repetir pedido»), fusionada (#193) con la API desplegada el
18-nov. **Entrega 2 · 2, construida** en `el-rediseno-2-2-avisos-y-movil`, sin migración. La 3 (el
Panel), después.
**Sigue:** lo que pidió Richi el 17-nov y contestó el 18-nov, antes de seguir con los módulos, para que
lo que venga nazca con el estilo nuevo.
**Cambia:** Roles 1.12, el Anexo (11.4, 11.5, 11.8 y 11.12), las fichas de color de `@estook/ui`, el
[mapa](../MAPA-de-modulos.md) y ESTADO.

## 1 · Lo que contestó Richi (17 y 18-nov)

- **El PIN se queda como está**: nada de dejar abierta la sesión del gerente. Pero **todos toman
  nota y todos cobran, cada uno con su PIN** («he entrado con un cocinero y me dice que no puede; sí
  puede, pueden todos»; «sí, todos pueden cobrar»). Los Ajustes cambian según quién entra.
- **La puerta, con botones**: Entrar (si no ha fichado, ficha ahí), la venta rápida (el rayo),
  Tickets y Abrir caja, cada uno con su símbolo y su color; el teclado sale grande al tocar uno. Sin
  los textos que explicaban lo que ya se ve.
- **Las mesas, sólidas y legibles**, con **sus sillas** según sus plazas, y **la leyenda de los
  colores** en Ajustes, al final. Los seis colores, aprobados.
- **El logo de Estook** en vez de la «E»; **el PC, aprovechado entero**; tablet y móvil, a la altura.
- **«Repetir pedido»**, nunca «Otra ronda», y **dentro de «⋯ Más opciones»** de la mesa, con la nota
  a cocina arriba. **Nada de deshacer en cinco segundos**: lo mandado se cambia y cocina recibe el
  aviso (ya existe, 0132). Sin teclas F1. La pastilla «Sin internet» sí.
- **Mesa abierta más de 6 horas**: aviso. **La columna «Ahora»**, **la pastilla de la caja** y **el
  Panel con siluetas** el primer día, aceptados.
- **El Panel**: cada puesto lo suyo, **también el jefe de cocina y el jefe de sala**; los fijos
  arriba y **los que se añaden, abajo y del mismo tamaño**; «Ventas según canal» (nunca «Por dónde
  entra»); **las gráficas dicen lo suyo al pasar el ratón o al tocarlas**.
- **La venta rápida entra en el rediseño**; **las reservas**, con su hueco pensado y sin verse
  hasta tener su módulo.

## 2 · En tres entregas, cada una con su pull request

| Entrega                     | Qué lleva                                                                                                                                                                                                                         |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1 · La sala**             | La puerta con botones, la barra de arriba con el símbolo y sus iconos, el plano con los seis colores y las sillas, la columna «Ahora» con la mesa dentro, el aviso de 6 horas, la leyenda; y **todos toman nota y cobran** (0119) |
| **2 · 1 · La venta rápida** | El rayo en la puerta y arriba, la venta rápida con un toque por método, «Aquí · Para llevar», el nombre o número y «Pasar a una mesa»; «Repetir pedido» en «⋯»                                                                    |
| **2 · 2 · Avisos y móvil**  | Los avisos y la campana, la barra de abajo del móvil (Sala · Mías · Avisos · Tú) y Ajustes en tres grupos (Tú · El local · El dinero)                                                                                             |
| **3 · El Panel**            | Los widgets de cada puesto (también los jefes), los añadidos abajo, «Ventas según canal», las gráficas que responden y las siluetas del primer día                                                                                |

## 3 · Lo que decidió la IA al construir la entrega 1

1. **«Fichar» se queda en la puerta**: la maqueta no lo llevaba, pero quitarlo deshacía la 0115
   (fichar la entrada, **la pausa o la salida** sin entrar). **Richi dijo que sí el 18-nov**, con
   los de abajo en este orden y en color: **la caja** en verde (en ámbar para cerrarla), **Tickets** en
   azul y **Fichar** en naranja, «bonito, colorido e intuitivo», como la maqueta.
2. **En el PC, teclear una cifra en la puerta es tocar «Entrar»**: quien tiene teclado no busca el
   botón.
3. **La columna «Ahora» desde 1280 píxeles de ancho**; por debajo, el botón «Ahora» con su número,
   que la abre en una hoja; en el móvil, las franjas de siempre.
4. **«Para llevar» es la barra y lo de llevar** (`#/llevar`), el mismo sitio de antes con su nombre
   de la maqueta; deja de ser una pestaña más de las zonas.
5. **«Esperando» es siempre azul**; la cocina justa o tarde se ve en **la chapa de los minutos**
   (ámbar o roja) y, tarde, con **el borde rojo**: así no se mezcla con el ámbar de «te toca».
6. **«Para el encargado»** es quien puede quitar de cocina (jefe de sala, gerente y dirección).
7. **La mesa abierta en la columna es un diálogo que no tapa nada** (`aria-modal` falso): se lee
   igual para quien no ve.
8. **El móvil, de dos en fila** y no de tres: se toca con el pulgar.

## 4 · Lo que decidió la IA al construir la entrega 2 · 1

1. **La entrega 2, en dos pull requests**: la venta rápida y «Repetir pedido» primero, que son de
   cobrar y tomar nota; los avisos, el móvil y Ajustes después, que tocan todas las pantallas. Así
   cada una se prueba sola.
2. **La venta rápida, solo en la caja** (`#/rapida`): es donde está el cajón (0115). En el
   comandero no sale, ni arriba ni en la puerta.
3. **La cuenta nace al cobrar o al pasarla a una mesa**, no al primer toque: lo ticado vive en el
   aparato hasta entonces y sigue ahí si se bloquea a medias. Al cobrar se abre (en barra o para
   llevar, sin pases), se manda a cocina y a la barra, y se cobra con **el cobro de siempre** (0144)
   ya puesto en el método tocado. Si se vuelve sin cobrar, la venta queda abierta en «Para llevar»,
   y lo dice.
4. **«Pasar a una mesa» manda a cocina**: si la mesa está libre, se abre con lo ticado; si está
   ocupada, lo ticado es un pedido más de esa mesa.
5. **Sin internet, la venta rápida todavía no cobra** (T7): lo dice y lo ticado no se pierde.
6. **Los métodos, los que el local cobra**: efectivo, tarjeta y Bizum si lo usa; lo demás (cheque,
   dividir), en el cobro de siempre.
7. **En el móvil, el total y los métodos, fijos al pie**: no hay que bajar para cobrar.
8. **«Repetir pedido» repite lo último que se mandó a la vez**, y entra en lo que se pide (no se
   manda solo): se quita o cambia algo antes. **No repite** lo quitado, los menús, lo que lleva
   opciones ni lo que se pesa. **Está siempre en su sitio**, el primero de «⋯», apagado si no hay
   nada que repetir: que no aparezca de golpe y empuje lo de debajo. El Anexo pasa de «Otra ronda,
   2 toques» a **«Repetir pedido, 3 toques»** (⋯, Repetir, Mandar), por estar en «⋯» como pidió Richi.
9. **La API dice cuándo se mandó cada plato** (`mandadaEn` en `la_mesa`): con eso se sabe qué fue
   «lo último». Es un dato más en la respuesta, sin migración; **hay que desplegar la API**.

## 5 · Lo que decidió la IA al construir la entrega 2 · 2

1. **Los avisos, una sola pieza para todo el TPV**: la cocina que llama, el efectivo por cobrar, la
   impresora y la mesa de más de 6 horas dejan de ser franjas sueltas encima del plano (y dentro de
   la mesa) y salen **arriba a la derecha**, como mucho tres; en el PC, a la izquierda de la columna
   «Ahora», para no taparla. **En el móvil de la sala salen encima de la barra de abajo**: arriba
   tapaban los iconos.
2. **La «×» quita el aviso de la vista, no lo borra**: sigue en la campana hasta que se atiende
   («Ya voy», cobrar, cambiar el papel). Una llamada nueva de la cocina vuelve a salir.
3. **Suena y vibra lo mismo que antes**: vibra el móvil de quien atiende la mesa que llaman; la
   impresora suena una vez en la caja. Nada nuevo que suene («un compañero, no un policía»).
4. **La columna «Ahora» se queda como está**: es lo que toca hacer; los avisos son lo que pide
   atención ya. El efectivo y las 6 horas salen en los dos sitios.
5. **La barra de abajo solo en el móvil y en la sala**; en la mesa abierta manda su barra de
   «Mandar». **«Mías» es un filtro** que se pulsa y se suelta, como el botón de encima del plano.
6. **«Tú» lleva el tema, Ajustes y Bloquear; Fichar, solo en la caja**: la pausa se ficha donde se
   ficha todo (0115), así que en el comandero no sale. «Tu PIN» de la maqueta no tiene pantalla
   todavía: el PIN se cambia en Estook.
7. **Ajustes, en Tú · El local · El dinero**: «PIN y bloqueo» va en El local (es del local, no de
   cada uno) y la declaración responsable en El dinero, con la facturación.
8. **Un fallo de antes, arreglado**: en el comandero el engranaje no abría nada (Ajustes solo existía
   en la caja). Ahora abre «Tú» con el tema, y dice que lo demás se ajusta en la caja.
