# 0131 · R2 · 1 · La sala y la mesa

**Fecha:** 5 de noviembre de 2026
**Estado:** construido en la rama `r2-la-sala-y-la-mesa`, **sin migración**.
**Sigue:** la [0130](0130-la-pausa-del-5-nov-r1-lo-rapido.md) (la pausa del 5-nov y R1, en producción
con la #164). Las maquetas, aprobadas por Richi el 5-nov.
**Cambia:** el Anexo (11.4 y 11.8: los estados, tocar una mesa, «Mías» y Bloquear), ESTADO y el plan
de M20A.

R2 se entrega en dos: **R2 · 1 · La sala y la mesa** (esta) y **R2 · 2 · Servido y cambiar un plato**,
que lleva migración (la opción de Ajustes, el plato cambiado y su merma).

## 1 · Cada mesa dice la verdad (puntos 1.1 y 8)

Richi, 5-nov: «cuando se manda a cocina pone "comiendo"… y no es verdad, sería preparando». Ahora el
plano dice:

| Estado                               | Se ve                                       | Cuándo                                                  |
| ------------------------------------ | ------------------------------------------- | ------------------------------------------------------- |
| **Esperando**                        | Azul, ámbar o rojo, con sus minutos         | Algo suyo está en la cocina y aún no ha salido          |
| **Comiendo**                         | Verde («Bebiendo» si solo pidieron bebida)  | Lo de cocina ha salido entero                           |
| **¿Cuenta?**                         | Morado, con sus minutos, y en «Para cobrar» | Comieron, ha salido todo y hace 15 minutos de lo último |
| Sin pedir, sin mandar y toca marchar | Como siempre                                | Como siempre                                            |

- **Esperando cuenta como la tarjeta de cocina**: desde que la cocina lo recibe, o desde la última
  marcha si hubo más de una, **con la misma función** (`desdeCuandoEnCocina`) y **los mismos colores y
  minutos** que la pantalla de cocina (`elColorDelTiempo`, que pasa al dominio). Plano y cocina no
  pueden decir cosas distintas.
- **«¿Cuenta?» es una sugerencia, sin sonido** (un compañero, no un policía): la mesa en morado y una
  franja arriba, «Para cobrar: Mesa 7 · 18'», que se toca y abre la mesa. Lo último es lo último
  servido **o pedido**: si piden cafés, vuelve a contar. **Una mesa solo de bebida no pide la cuenta**,
  que en la barra saldría cada 15 minutos. «Pide la cuenta», en naranja, llega con el cobro (M20C).
- **Con la cocina solo en papel** nadie tacha y la sala no puede saber qué ha salido: la mesa se queda
  «Esperando» en azul, sin ponerse en rojo, y nunca pide la cuenta sola. Con R2 · 2, el camarero lo
  marcará servido.

## 2 · Tocar una mesa (puntos 1.3 y 8)

Antes salía una lista de trece opciones y los platos no se veían. Ahora, **la mesa entera en una hoja
del alto de lo que lleva**: sus platos con cómo va cada uno (la misma cuenta que dentro de la mesa), el
total y «Marchar el 2.º» si toca. Abajo, **Pedir, Cuenta (imprimirla) y Cobrar** (apagado: llega con el
cobro). Arriba, **tres iconos**: **mover** (cambiar de mesa, juntar, pasar a otro camarero, quedármela),
**la nota para cocina** (en naranja si tiene) y **«···»** (alergias, tienen prisa, comensales, todo
junto o por pases, reimprimir, liberar y, en rojo, anular).

**Dentro de la mesa**, los mismos tres iconos en vez de «Opciones», y abajo **«La cuenta · 9 platos»**
con el total, que abre la cuenta. «Servido» llega con R2 · 2.

## 3 · La barra de arriba (punto 8)

En el móvil ocupaba un tercio de la pantalla en cuatro filas. Ahora, arriba quién y dónde, con **tu
nombre y el candado** para bloquear; debajo, las salas y **«Mías»**, un botón que se pulsa y se suelta.
**Dentro de una mesa, en el móvil, no hay «Bloquear»**: no cabe con los tres iconos, y se bloquea desde
el plano o solo, al rato sin tocarlo (el Anexo 11.4 lo dice así ahora).

## 4 · Los iconos

**Todos de Lucide** (Richi, 5-nov: nunca dibujados a mano), añadidos a `herramientas/traer-iconos.mjs`
con su porqué: cubiertos, la cuenta con euro, mover, cambiar, juntar, cobrar, prisa, pases, imprimir,
candado y el círculo de libre. Los estados de la mesa, que eran trazos a mano, pasan a Lucide.

## 5 · Lo que decidió la IA al construirlo

1. «Bebiendo» para la mesa que solo pidió bebida, en vez de «Comiendo» o «Tomando algo» (que no cabía).
2. La palabra y los minutos en líneas distintas en la casilla del móvil y del plano dibujado: juntos se
   cortaban («Esperand…»).
3. Los 15 minutos de «¿Cuenta?», fijos por ahora (`MINUTOS_PARA_LA_CUENTA`); hacerlos un ajuste va con
   R2 · 2, que ya lleva migración.
4. Los campos nuevos del plano, opcionales en el TPV: la web se publica al fusionar y la API se despliega
   después, y entretanto el plano se pinta como antes.
5. La `Hoja` común gana dos opciones que no cambian nada a quien ya la usa: del alto de lo que lleva
   (`ajustada`) e iconos junto al título (`acciones`).
6. «Imprimir la cuenta», dentro de la mesa, en «···»: fuera de ella es el botón «Cuenta».
