# 0145 · Cobrar en la mesa, el efectivo pendiente en la caja y Negocio › Ventas en tres

**Fecha:** 11 de noviembre de 2026
**Estado:** pedido y contestado por Richi el 10 y el 11-nov, en el chat (sus cuatro respuestas, abajo).
**Sigue:** la [0144](0144-r3-la-caja.md) (R3 · 1 · La caja), cuya decisión 1 de la IA («se cobra en la
caja, no en el comandero») **queda corregida**; y la [0137](0137-t6-2-2-1-las-facturas-y-quien-hace-que.md)
en lo de quién ve Tickets y facturas en Estook.
**Cambia:** el Anexo (11.6), Roles (1.12), el Plan (la tabla B5), CAMBIOS, el mapa y ESTADO.

## 1 · Lo que pidió Richi

- **El comandero cobra** (10-nov): «si es un aparato tipo comandero, llevan datáfono aparte y claro que lo
  pueden cobrar». Con tarjeta, Bizum y cheque, en la mesa. Ir a la caja por eso «carece de sentido».
- **El efectivo, en la caja**: el camarero lo deja pendiente; en la caja sale «Cobro pendiente · Mesa X ·
  Ricardo», a la izquierda en la pantalla del PIN **y en la propia mesa** con la caja abierta (11-nov). Se
  toca, se teclea el PIN, «¿Cuánto te da?», el cambio, se imprime el ticket y **la impresora abre el
  cajón**.
- **Cerrar caja sin el datáfono** (11-nov): «la app confía»; con pagos integrados no hace falta nunca.
- **Negocio › Ventas en tres pestañas** (10-nov), y Ventas fuera de Servicio: Resumen (con lo cobrado, la
  tarjeta y el efectivo, 11-nov), los cobros y los tickets de Hacienda.
- **«Descargar su Z» y «Sus tickets»**, lo que quedaba de la maqueta de R3 (10-nov: «sí, hazlo»).

## 2 · Lo que contestó el 11-nov

1. **El PIN al cobrar un pendiente, siempre**, también con la caja desbloqueada: «así la responsabilidad
   del cobro es de esa persona, no del responsable que haya abierto el TPV». El cobro queda a su nombre.
   (Corrige, solo para esto, el «PIN al entrar, no al cobrar» del 28-oct.)
2. **El ticket de un cobro en la mesa sale por la impresora de cada aparato**; sin elegir, la de la caja.
3. **En Estook, Tickets y facturas y el dinero son de quien lleva el local** (gerente, area manager y
   dirección); un jefe de cocina o de sala, si se le da el permiso. **Los camareros facturan en Estook TPV**,
   donde ya está («la app para los trabajadores es organizarse, no nada sensible»).
4. **El datáfono no se cuenta al cerrar**: sin pagos integrados no hay forma de saberlo, y pedir una foto
   de cada recibo «es un lío».

## 3 · Cómo funciona

- **En el comandero, «Cobrar»** abre lo mismo que en la caja: tarjeta (el datáfono de siempre y «Cobrado
  con tarjeta»), Bizum, cheque y dividir. **El efectivo** dice «El efectivo se cobra en la caja» y
  «Dejar 40,00 € para la caja». Dividido igual: lo de tarjeta se cobra ya, y el efectivo va a la caja **en
  el mismo ticket** (un cobro, dos pagos, Anexo 5.1).
- **Lo pendiente** (`estook.cobro_pendiente`, migración 0117) guarda qué cubre (la cuenta, unos platos o una
  parte), cuánto, lo ya pagado en la mesa y quién lo dejó. Uno a la vez por cuenta y parte; resuelto, no se
  toca. La cuenta con efectivo pendiente no se cobra por otro lado hasta quitarlo («Quitar», si al final
  paga con tarjeta).
- **En la caja**, la mesa enseña «Cobro en caja» en el plano y «Cobrar efectivo · Ricardo · 30,00 €» al
  tocarla. **En la pantalla del PIN**, la lista de los de todos; la caja bloqueada se entera al momento con
  el toque de la sala. Desde ahí, el PIN es el de entrar y no se pide otra vez.
- **Con más de una caja abierta**, el comandero pregunta en cuál va lo que cobra, y se queda elegida.
- **Cerrar caja** queda en tres pasos: contar, lo que se queda para mañana y el resultado.
- **Negocio › Ventas**: **Resumen** (lo de antes, más «Cómo se cobró» y «Hoy» en el periodo; con Estook TPV,
  de cada cobro, también lo de hoy sin cerrar), **Cobros** (cada cobro con su hora, su mesa, cómo se pagó,
  lo entregado y el cambio, quién lo cobró y su ticket; los de un día o los de una caja) y **Tickets y
  facturas** (lo de Hacienda, que estaba en Servicio). Cada pestaña, para quien la puede ver. Los enlaces de
  antes llevan a la nueva.
- **Cierres de caja**, en cada caja: «Descargar su Z» (el cierre en A4, que no es un documento fiscal) y «Sus
  tickets», que abre Cobros con los de esa caja.

## 4 · Lo que decidió la IA

1. **«Cobros» y no «Cobros tarjeta» y «Cobros efectivo»**: un ticket de Hacienda no es «de tarjeta» (se paga
   también en efectivo) y un pago mixto saldría partido en dos pestañas. Una lista con «Todos · Efectivo ·
   Tarjeta…» arriba enseña lo mismo sin duplicar (se lo propuse a Richi el 10-nov y no lo cambió).
2. **Cierres de caja se queda en Servicio › Jornadas**: es el arqueo de cada día (Richi, 11-nov: «son dos
   cosas diferentes»). Lo que dije de que se duplicaba con Ventas era un error mío.
3. **El cajón lo abre la impresora de la caja al confirmar el cobro**, con su orden, como ya hacía la 0144;
   el ticket sale en cuanto contesta Hacienda, segundos después. No se espera al papel para abrir: con
   Hacienda lenta, el cliente esperaría su cambio.
4. **Sin cajón no se cobra efectivo, ni con permiso**: el dinero tiene que acabar en un cajón contado.
5. **Toast y Square** lo resuelven igual: el aparato de mano toma nota y cobra con tarjeta; el efectivo va al
   terminal con cajón ([Toast](https://support.toasttab.com/en/article/Optimising-Your-Bar-Workflow-Using-Toast-Flex-and-TG3-Together)).
   De Revo no hay documentación pública.

## 5 · Lo que no entra aquí

- **Cobrar con el aparato que lleva la tarjeta dentro** (Sunmi, Tap to Pay): con Android, M20D
  ([0134](0134-estook-tpv-para-android-y-cobrar-en-el-aparato.md)). El botón de tarjeta será el mismo: abrirá el
  cobro del aparato con el importe.
- **Que lo cobrado baje del almacén**: lo siguiente de T7, con su decisión.
