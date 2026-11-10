# 0144 · R3 · La caja: abrir, cobrar y cerrar en Estook TPV

**Fecha:** 9 de noviembre de 2026
**Estado:** aprobada por Richi el 9-nov con su maqueta (versión 3): «Aprobada, empieza». **En dos entregas**
(R3 · 1 y R3 · 2), cada una con su pull request a `main`.
**Sigue:** la [0143](0143-el-repaso-del-8-nov.md) (R3 es su tercera entrega y lo primero de T7), la
[0142](0142-la-pausa-del-8-nov.md) (el botón al lado de Fichar y «Cierres de caja»), la
[0121](0121-la-pausa-del-tpv.md) (la caja de Richi) y el Anexo, 5.5, 10.5, 10.6 y 11.6.
**Maqueta:** [R3 · La caja](../maquetas/r3-la-caja.html), aprobada el 9-nov.
**Cambia:** el Anexo (11.6, 5.5 y 10.6), Roles (1.12), el plan de Estook TPV (T7), el mapa y ESTADO.

Con la caja, Estook TPV cobra: se abre contando el cajón, se cobra en efectivo, con tarjeta o dividido,
se mete y se saca dinero, y se cierra contando a ciegas. En Estook, con Pro, los cierres llegan solos y
solo se miran.

## 1 · Lo que contestó Richi el 9-nov

1. **«Abrir caja» y «Cerrar caja»**, y **cerrar caja es cerrar el día**: con Pro, la pantalla «Cierre» de
   Estook (escribir a mano lo vendido) la hace la caja. Con dos cajones, cada uno se cierra aparte y el
   día queda cerrado con el último; en Estook, **una fila por día con el total**, y dentro el día entero
   arriba y cada caja con lo suyo, como Toast. **«Abrir el cajón»** es otra cosa: abrir el cajón de las
   monedas para dar cambio, sacar o meter dinero.
2. **«Está correcto · Abrir caja»** y «Contar» (nunca «Es eso»). Y en Ajustes, **«Recuento obligatorio
   al abrir»**, apagado de fábrica: encendido, siempre se cuenta.
3. **En pruebas no se marca nada**: la app funciona como en real y lo cobrado cuenta normal; solo el papel
   dice «PRUEBA», porque lo pone Hacienda. Con Pro, el cierre a mano se va en cuanto esté la caja.
4. **No hay asesor** (Richi, sin dinero): lo legal lo investiga la IA en fuentes oficiales y dice qué está
   confirmado y qué no. El segundo modo de mandar los tickets (T6 · 3) **no se adelanta**: va después
   del cobro.
5. **R3 en dos entregas.**
6. **Añadido por Richi:** en Ajustes, que **también los camareros** puedan abrir y cerrar caja, por si
   no hay un encargado. Apagado de fábrica; lo contado queda a su nombre.
7. **Los extras E1 a E8**, en R3: Bizum y cheque restaurante (que se encienden en Ajustes), el aviso de
   retirar, el aviso del descuadre, imprimir el X y reimprimir un Z, las propinas, escribir el total,
   entregar la caja a otro encargado y los descuentos (que se encienden en Ajustes, explicado). **E9, la
   bolsa del camarero, después**, con Estook TPV para Android.

## 2 · Las dos entregas

| Entrega    | Qué lleva                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **R3 · 1** | **Abrir caja** (al lado de Fichar y arriba en la sala) con el PIN de quien puede, «Está correcto» o «Contar»; **cobrar** en efectivo (billetes de un toque y el cambio), con tarjeta (el datáfono de siempre) o **dividido** (a partes iguales, por platos, o efectivo y tarjeta); **abrir el cajón** (cambio, sacar o meter dinero, siempre con para qué); **«Cómo va»** (el X); **cerrar caja** a ciegas en cuatro pasos; **Cierres de caja** en Estook con Pro; **Bizum y cheque** (E1); **imprimir el X y reimprimir un Z** (E4); y en Ajustes, **quién abre** y **el recuento obligatorio** |
| **R3 · 2** | El aviso de retirar (E2), el aviso del descuadre al gerente (E3), las propinas (E5), escribir el total al contar (E6), entregar la caja a otro encargado (E7) y los descuentos al cobrar (E8)                                                                                                                                                                                                                                                                                                                                                                                                    |

## 3 · Cómo funciona

- **Una caja por cajón.** La caja es el cajón que tiene el aparato (`terminal.cajon_id`): dos aparatos con
  el mismo cajón comparten caja. **Una abierta por cajón**, y lo guarda la base (un índice único).
- **Abrir y cerrar** los hace quien tiene el permiso nuevo `accion.llevar_la_caja` (Roles 1.12: jefe de
  sala, gerente, area manager y dirección), **o cualquiera que tome nota si el local enciende «También
  camareros»**. Con el PIN de quien abre: en la pantalla del PIN se teclea; dentro, si quien está no
  puede, lo aprueba uno que sí, con su PIN, ahí mismo.
- **Se propone lo que se dejó en el cajón al cerrar la última vez.** «Está correcto · Abrir caja» abre con
  eso; «Contar» va billete a billete y dice si hay más o menos que anoche, sin parar. El primer día se
  pregunta con cuánto se empieza. Con «Recuento obligatorio» no sale «Está correcto».
- **Sin caja abierta no se cobra**, ni con tarjeta: el cobro dice «Abre la caja para cobrar» y se abre ahí
  mismo. **Pedir y mandar a cocina no la piden nunca.**
- **Se cobra en la caja.** El comandero toma nota y la cuenta se cobra en la caja; cobrar en la mesa es la
  bolsa del camarero (E9) y el «TPV portátil» de Android (M20D).
- **Un cobro, un ticket** (Anexo 5.1). Pagar con efectivo y tarjeta a la vez son **dos pagos del mismo
  cobro**, con un ticket. **Dividir** hace un cobro y un ticket por parte: por platos, el ticket lleva sus
  platos; a partes iguales, una línea «Servicio de restauración · Mesa 12 · parte 1 de 4», que es lo que
  pide la factura simplificada (RD 1619/2012, art. 7: «identificación del tipo de bienes o servicios»).
  **La mesa queda libre con la última parte.**
- **El cobro nace en el aparato con su id**: mandarlo dos veces, o perder la respuesta y volver a
  mandarlo, no cobra dos veces. **Dos cajas cobrando la misma mesa a la vez**: gana una, y la otra lo
  dice. La base no deja cobrar más de lo que queda de la cuenta.
- **El ticket sale solo**, en cuanto Hacienda contesta (el mismo motor de T6 · 2), con su QR tributario y
  el de **«Pide tu factura»**; si Hacienda no contesta, el justificante. **Con efectivo o cheque, el cajón
  se abre al momento**, sin esperar al papel.
- **Abrir el cajón** siempre pregunta para qué: **Cambio** (sin importe), **Sacar dinero** (compras, un
  proveedor, propinas, al banco u otro) o **Meter dinero** (cambio del banco u otro). Con el permiso de
  siempre (`accion.abrir_el_cajon`) o la aprobación de un encargado con su PIN. Queda quién, cuándo y por
  qué, y sale en el X y en el Z.
- **Devolver un ticket pagado en efectivo, desde la caja**, saca el dinero del cajón solo, con su motivo.
- **Cerrar caja, en cuatro pasos:** contar **sin ver lo que debería haber** (a ciegas, de fábrica; el
  gerente lo apaga), el total del datáfono, lo que se queda para mañana (se propone el fondo de siempre) y,
  **solo entonces, la diferencia**, en efectivo y en tarjeta. **No bloquea nada** y queda a nombre de quien
  cerró. Después, un motivo de un toque si se sabe. Se imprime el Z si se quiere. Si quedan mesas
  abiertas, lo dice y deja seguir: lo que cobren va a la caja de mañana.
- **Lo que debería haber en el cajón** = el fondo + lo cobrado en efectivo + lo metido − lo sacado − lo
  devuelto en efectivo. Los cheques y Bizum, aparte.
- **Una caja que se quedó abierta ayer** no deja abrir otra en ese cajón: sale «La caja de ayer sigue
  abierta · Cerrarla», y mientras tanto se sigue cobrando con ella.
- **Un cierre no se edita.** El Z se guarda tal cual se cerró.
- **El día.** Con Pro, cuando se cierra la última caja abierta del día, el cierre del día (`cierre_de_caja`,
  el de siempre) se escribe solo con lo de todas sus cajas y `origen = 'tpv'`. Si el día estaba
  reabierto, se corrige; reabrir un día sigue igual. Con Esencial, «Cierre» sigue como hoy.
- **En Estook, con Pro, «Cierre» pasa a «Cierres de caja»** (Servicio › Jornada), **solo para ver**: hoy
  en vivo (lo que hay en cada cajón ahora), un día por fila con el total y si cuadra, «Con diferencia» y
  buscar un día; dentro, el día entero arriba y cada caja con su Z y «Descargar su Z». El color: «Cuadra»
  en verde; hasta 10 € de diferencia en ámbar, y más, en rojo.

## 4 · Lo que no entra en R3 (y dónde va)

- **Cobrar sin internet**, con su justificante (lo pedía la 0122): sin internet, «Cobrar» dice que no hay
  conexión. Va con lo siguiente de T7.
- **Las ventas de hoy con sus totales, la venta rápida y que lo cobrado baje del almacén** (M20), con lo
  siguiente de T7, antes de T6 · 3. Información, Informes y Empleados siguen leyendo las mesas hasta
  entonces.
- **Cobrar en la mesa** (la bolsa del camarero, E9, y Tap to Pay, M20D).
- Lo marcado **[VERIFICAR]** en el Anexo (el ticket por correo o en un QR en pantalla, cambiar la forma de
  pago de un ticket, invitar como autoconsumo): se investiga antes de hacerlo.

## 5 · El modelo

- `estook.turno_de_caja`: cada caja abierta, de un cajón, con el fondo, quién y cómo la abrió (contada o
  «Está correcto»), y al cerrar, **lo que salió congelado**: lo esperado, lo contado por billetes, el
  datáfono, lo que se quedó para mañana, la diferencia y su motivo. Un índice único: una abierta por cajón.
- `estook.cobro`: cada cobro, con su id nacido en el aparato, su cuenta, su caja, su ticket y lo que cubre
  (unos platos o una parte); `estook.pago`: cada pago del cobro (efectivo con lo entregado y el cambio,
  tarjeta, Bizum o cheque).
- `estook.movimiento_de_caja`: todo lo que mueve el cajón (el fondo, lo cobrado en efectivo y en cheque, lo
  metido, lo sacado, lo devuelto y el cajón abierto para cambio), **solo se añade**.
- `estook.ajustes_del_tpv`, con lo de la caja: quién abre, el recuento obligatorio, a ciegas, el fondo de
  siempre, Bizum y el cheque.
- **Los permisos nuevos**: `accion.llevar_la_caja` (abrir, cerrar y «Cómo va») y `accion.cobrar` (Roles
  1.12: el camarero, «si el local lo permite», encendido de fábrica, y todos los de sala).

## 6 · Lo que decidió la IA al diseñarlo

1. **Se cobra en la caja, no en el comandero**, en R3 (arriba): el efectivo necesita un cajón y la tarjeta
   en la mesa es la bolsa del camarero o Android.
2. **La diferencia se enseña con la caja ya cerrada**: así nadie vuelve a contar hasta cuadrar. El motivo
   se elige después.
3. **El ticket de una parte igual** lleva una sola línea con el servicio y la parte (arriba, con su
   artículo del reglamento).
4. **Ámbar hasta 10 € y rojo desde ahí**, la misma cifra que el aviso al gerente (E3).

## 7 · El repaso del 10-nov, antes de fusionar R3 · 1

La cuenta que entró el 10-nov acabó lo que quedaba del relevo y **vio la caja funcionando**, con una prueba de
pantalla nueva (`pruebas/e2e/la-caja.spec.ts`) que abre la caja, cobra en efectivo y dividido, saca dinero, mira
«Cómo va», la cierra y la ve en Estook. Lo que encontró y arregló:

1. **«Abrir caja», al lado de Fichar, no llevaba a abrirla**: al teclear el PIN se caía en la sala, como
   cualquier entrada. Ahora entra directo a hacerlo, que es lo que dice la maqueta.
2. **El cambio desaparecía de la pantalla.** Al cobrar una mesa entera la mesa queda libre, el plano se refresca y
   cerraba la ventana, con «Cambio 10,00 €» dentro, antes de tocar «Listo». Mientras se cobra, la ventana se queda.
3. **Devolver en la caja lo que se pagó en efectivo saca el dinero del cajón** (sección 3, sin construir hasta
   hoy): queda apuntado en la caja abierta con su motivo y su rectificativa, abre el cajón, y la pantalla dice
   «Devuelve 9,00 € del cajón». Sale en el X, en el Z y en lo que debería haber.
4. **En Estook quedaban botones de cerrar a mano** que, con Estook TPV, llevaban a una pantalla de solo ver:
   «Cerrar la caja» en el «+», en el buscador, en Fogón y en el Panel; «Cerrar la caja de hoy» en Negocio › Ventas;
   y «Cerrar el día» y «Falta cerrar el…» en Información. Con Estook TPV ya no salen.
5. **Tres pruebas de pantalla esperaban lo de antes** (el cierre a mano, sus cifras y «Cobrar: llega pronto»): el
   cierre a mano y sus cifras se prueban ahora con una cuenta Esencial, que es donde siguen.
6. **La prueba que ataca toda la API desde otro negocio** confundía `plataforma.cobro` (lo que cobra Estook) con
   `estook.cobro` (lo que cobra la caja), por llamarse igual: ahora mira el esquema (lección 267).

### Lo que decidió la IA en el repaso

1. **Del cajón sale solo lo que se pagó en efectivo**, y nunca más de lo que queda de eso: de un ticket de 40 €
   pagado con 10 € en efectivo y 30 € con tarjeta, salen 10 € como mucho; lo demás se devuelve en el datáfono.
   Desde Estook, desde un comandero o con la caja cerrada no se apunta nada: ahí no hay cajón del que sacar.
2. **Lo que se cerró a mano antes de tener la caja se sigue viendo**: en Negocio › Ventas, un cierre hecho a mano
   abre su día como siempre; uno hecho por la caja abre su día en Cierres de caja.
3. **Con Estook TPV, «Falta cerrar el…» no sale en Estook**: lo dice la caja («La caja de ayer sigue abierta ·
   Cerrarla»), que es donde se puede hacer algo.
4. **Cierres de caja no lleva las cifras de Servicio** («Cómo va»: ventas, ticket medio, food cost): no están en su
   maqueta, y lo vendido se mira en Información. Con Esencial siguen debajo del cierre a mano.

### Lo que queda de la maqueta, sin construir

- **«Descargar su Z» y «Sus tickets»**, los dos botones de cada caja dentro de un día, en Estook › Cierres de caja.
  El Z se puede reimprimir en la caja («Imprimir el Z»); descargarlo en Estook y saltar a sus tickets, no todavía.
