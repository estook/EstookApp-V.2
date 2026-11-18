# 0148 · El rediseño de Estook TPV y del Panel

**Fecha:** 18 de noviembre de 2026
**Estado:** la maqueta, [`el-rediseno.html`](../maquetas/el-rediseno.html), **aprobada por Richi el 18-nov**
(«me gusta la maqueta y todo lo propuesto, manos a la obra»). **Entrega 1, construida** en
`el-rediseno-1-la-sala`, con la migración **0119**. Las entregas 2 y 3, después.
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

| Entrega                 | Qué lleva                                                                                                                                                                                                                         |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1 · La sala**         | La puerta con botones, la barra de arriba con el símbolo y sus iconos, el plano con los seis colores y las sillas, la columna «Ahora» con la mesa dentro, el aviso de 6 horas, la leyenda; y **todos toman nota y cobran** (0119) |
| **2 · La venta rápida** | El rayo en la puerta y arriba, la venta rápida con un toque por método y «Pasar a una mesa», «Repetir pedido» en «⋯», los avisos y la campana, la barra de abajo del móvil, Ajustes en tres grupos                                |
| **3 · El Panel**        | Los widgets de cada puesto (también los jefes), los añadidos abajo, «Ventas según canal», las gráficas que responden y las siluetas del primer día                                                                                |

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
