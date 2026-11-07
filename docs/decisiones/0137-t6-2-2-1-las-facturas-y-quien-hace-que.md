# 0137 · T6 · 2 · 2 · 1 · Las facturas y quién hace qué

**Fecha:** 7 de noviembre de 2026
**Estado:** construido en la rama `t6-2-2-1-las-facturas`, **con la migración 0107**. Sin caja
nueva: la 1.3.0 ya imprime lo que hace falta.
**Sigue:** la [0136](0136-t6-2-1-el-motor-y-el-ticket.md) (el motor), la
[0125](0125-t6-la-facturacion-las-tres-respuestas.md) (lo aprobado de T6) y la
[0128](0128-quien-lleva-la-facturacion.md) (quién lleva lo fiscal).
**Maqueta:** [`t6-2-2-las-facturas.html`](../maquetas/t6-2-2-las-facturas.html), aprobada por Richi
el 6-nov: «la maqueta está bien, revísala si está todo ok, hazla».
**Cambia:** el Anexo (4.4, 4.9, 4.10, 5.3, 7.6, 8 y 11.7), Roles (1.12), el plan de M20A, el mapa y
ESTADO.

T6 · 2 · 2 se parte en dos, porque es demasiado para un solo pull request: **esta**, con la factura
a mano, el canje, la lista y los permisos; y **T6 · 2 · 2 · 2**, con las devoluciones (R5 y R1),
corregir los datos del cliente (R4), anular y la señal. **Todo en pruebas**: nada llega a Hacienda de
verdad hasta las once condiciones del capítulo 9 del Anexo.

## 1 · Quién hace qué (Richi, 6-nov)

«Hay días que el gerente o los jefes no están; los camareros claro que pueden hacer facturas, pero no
corregirlas», y «no quiero que emitir una factura obligue a dar acceso a toda la administración
fiscal». **Esto deja sin efecto el punto 8 de la 0136**, que lo había puesto todo tras la facturación.
Permisos aparte, cada uno con su valor de fábrica por puesto, que la dirección cambia a cada persona
con un interruptor en **Ajustes › Facturación › Quién hace qué**, en Estook y en los Ajustes del TPV:

| Acción                                                     | Camarero                 | Jefe de sala | Gerente | Area manager | Dirección | Gestoría       |
| ---------------------------------------------------------- | ------------------------ | ------------ | ------- | ------------ | --------- | -------------- |
| Factura de un ticket y copias (`factura_de_un_ticket`)     | Sí                       | Sí           | Sí      | Sí           | Sí        | No             |
| Factura a mano (`factura_a_mano`)                          | No                       | Sí           | Sí      | Sí           | Sí        | No             |
| Consultar todo (`ver_documentos`)                          | Hoy y ayer, y por número | Sí           | Sí      | Sí           | Sí        | Sí, solo mirar |
| La empresa, las series y Verifacti (`alta_de_facturacion`) | No                       | No           | No      | No           | Sí        | Si se la dan   |

El administrador de cuenta, como el area manager en las dos primeras y en consultar. **Solo la
dirección cambia estos permisos**, y lo mira también la base: la regla de la 0100, ampliada, no deja
que un gerente se los dé a sí mismo. Cada cambio queda en la auditoría.

**Devolver, corregir y anular llegan con T6 · 2 · 2 · 2**, cada uno con su permiso y su motivo. Lo que
todavía no existe no se enseña en «Quién hace qué».

## 2 · Lo que propuso la IA sobre el reparto de Richi, y se hizo así

Todo se puede cambiar con un interruptor, por eso no se paró a preguntar:

1. **La factura a mano no es de los camareros de fábrica.** La de un ticket tiene el importe fijo y no
   puede inventar nada; la de a mano puede facturar lo que nunca se vendió.
2. **El camarero ve hoy y ayer, y lo demás por su número exacto**, y no ve la lista de clientes: si
   escribe un NIF conocido, se rellena solo. Atiende al cliente que vuelve con su ticket sin poder
   hojear DNI y domicilios (RGPD, art. 5, datos mínimos).
3. **El jefe de sala**, que su lista no nombraba, va como el gerente en facturas y consultar: suele ser
   quien queda cuando no están los jefes.
4. **La factura también sale en el papel de ticket**: la ley pide lo que lleva, no un tamaño. Así el
   camarero se la da al cliente en el momento, sin impresora de A4.

## 3 · Lo que se puede hacer

- **Tickets y facturas**, la misma pantalla en **Servicio › Ventas** y en **Estook TPV** (botón
  «Tickets» arriba, en cualquier aparato de sala): buscador, elegir fechas, filtros, y **lo que falla
  arriba sea del día que sea**.
- **Hacer factura de uno o varios tickets (F3)**: el importe es el de los tickets y lo vuelve a mirar
  la base; los platos iguales se juntan en una línea; cada ticket una vez, también si dos aparatos lo
  intentan a la vez; los tickets no se tocan.
- **Hacer una factura a mano (F1)**: el cliente, platos de la carta o conceptos libres con su IVA de
  las reglas vigentes del local, la fecha de la comida, **el aviso del plazo** si es una empresa (art.
  11), y cobrada o por cobrar con su vencimiento y «Marcar cobrada». No mueve la caja ni el almacén.
- **El cliente**: empresa o autónomo (el NIF trae el nombre de Hacienda), particular (nombre y DNI) o
  de fuera (su número de IVA, mirado en el censo europeo, o su pasaporte). **Se guarda** para la vez
  siguiente; se puede quitar, y lo emitido lleva su copia y no cambia.
- **El papel**: el A4 en PDF (Descargar y mandar por correo, que queda en su historia) y el de ticket.
  Los dos llevan **el precio unitario sin impuesto**.
- **Lo rechazado llega a la campana** de quien lleva la facturación.

## 4 · Lo que se encontró al revisar T6 · 2 · 1, y se arregla aquí

1. **Estook seguía diciendo «En Hacienda» con el ticket ya en Hacienda** (lo vio Richi en IKATZ el
   6-nov: lo emitió a las 19:51, a las 19:56 seguía así y la AEAT lo encontraba a las 19:57). Se
   preguntaba solo en el minuto 2 y en cada hora: si Hacienda contestaba en el minuto 3 y el aviso no
   llegaba, se quedaba una hora. Ahora, **en cada latido hasta los cinco minutos, cada cinco hasta la
   hora y cada hora**, con dos latidos de margen (`tocaPreguntar`). **La causa exacta en IKATZ no se ha
   podido leer**; el aviso de Verifacti hay que verlo en su panel. **Esto no lo arregló**: la causa era otra, y
   está en la [0138](0138-el-reloj-de-los-documentos-y-la-auditoria-de-las-facturas.md).
2. **El A4 aprobado el 2-nov no llevaba el precio unitario sin impuesto**, que pide el RD 1619/2012,
   art. 6.1.f (leído en el BOE el 6-nov).
3. **El año de la serie salía de la fecha de la operación**: una factura de enero por una comida de
   diciembre se habría numerado en la serie del año pasado. Sale de cuándo se hace, en la hora del local.
4. **La historia se ordenaba por la hora**, sin el día: lo de pasada la medianoche salía antes.
5. **Lo que falla solo salía del día elegido**: un rechazo de hace tres días desaparecía.
6. **Un aviso enseñaba a la plantilla «llega con T6 · 2 · 2»**, y Ajustes decía que emitir llegaba en
   la siguiente entrega.
7. **La prueba 2 del Anexo no la hacía nadie** ni estaba en la lista de la 0136. Ya está.

## 5 · Lo que dice Verifacti (`verifactu.min.yaml` y `nifs.min.yaml`, leídas el 6-nov)

- F1, F3, R1 y R4 piden `nombre` y `nif` o `id_otro` (`id_type` 02 IVA, 03 pasaporte, con
  `codigo_pais`); **F2 y R5 no admiten destinatario**. **No tiene campo de domicilio**: va en el papel.
- `facturas_sustituidas` lleva serie, número y `fecha_expedicion`: **la del envío aceptado**, que es la
  que tiene Hacienda, no la de preparar.
- `POST /nifs/validar` (el nombre es obligatorio para una persona) y `POST /nifs/validar/vies`.
- `POST /verifactu/cancel` responde con **su propio uuid y sin QR**, y `PUT /verifactu/modify` subsana.
  Los usa T6 · 2 · 2 · 2.

## 6 · Lo que queda para el asesor (Anexo, capítulo 9)

- **Con un registro «Incorrecto» Verifacti ofrece dos caminos**: subsanar con el mismo número
  (`rechazo_previo`) o hacer una rectificativa, y las preguntas frecuentes de la AEAT no lo tratan. Se
  sigue lo aprobado, **corregir con otro documento**.
- **Si la fecha de operación de una F3 de varios tickets es la última de ellos** (art. 13).
- **La señal de un particular que no quiere dar su DNI**, para T6 · 2 · 2 · 2.

## 7 · Lo que sigue sin hacer, para que nadie lo dé por hecho

- **«Cuenta en las ventas» (0125) se hace con T7**: en pruebas no cuenta nada, y hoy Negocio sale de los
  cierres del día a mano, así que sumarla ahora contaría dos veces la misma comida.
- **La gestoría tiene el permiso y la API le contesta, pero no tiene pantalla**: su vista aparte
  (`app.gestoria`) no está construida. Llega con esa vista.
- **El prefijo de la empresa de pruebas**: en la AEAT el ticket de IKATZ sale como
  `4833_T-IKA-2026-000001`. Sin comprobar si estorba al citar el ticket en una F3: se ve al hacerla en
  IKATZ, y con un NIF propio no existe (Anexo 4.3).
- **Un rechazo hecho a propósito** ya no se consigue con un NIF falso, porque se para antes de numerar.

## 8 · Las pruebas del capítulo 8 del Anexo

En `las-facturas.prueba.ts`, contra la base y el Verifacti de mentira, y en
`tickets-y-facturas.spec.ts` desde la pantalla, en Estook y en el TPV: **2, 6, 11 y 20**. La 17, más
exigente. **Con T6 · 2 · 2 · 2**: 13 y la R5 de la 12.
