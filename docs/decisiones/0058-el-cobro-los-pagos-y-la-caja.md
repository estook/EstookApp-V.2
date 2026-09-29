# 0058 · El cobro, sus pagos y la caja; la bolsa del camarero; la venta nace al cobrar

**Fecha:** 30 de septiembre de 2026
**Estado:** decidido (auditoría profunda, [0055](0055-la-auditoria-profunda.md)). **Solo
documentos**: se construye en M20 y M20C.
**Corrige:** el modelo del Anexo 7.3 (`cobros` con una sola forma de pago), el Plan M20
(«descuenta al emitirse el ticket») y el Anexo 7.6 («al emitir un ticket se crea la
venta»).
**Cambia:** el Anexo (5, 7 y 10.6), el Plan (M20 y M20C), Roles (1.12), la Auditoría de
flujos (2.29, 2.31, 2.32 y 2.34) y el Manifiesto (17).

## Lo que pasó

La auditoría encontró tres fallos en cómo el Anexo guardaba el cobro y la caja, y uno en
cuándo nace la venta:

1. **Un pago mixto no cabía.** 20 € en efectivo y el resto con tarjeta es un ticket con
   dos pagos, y `cobros` solo guardaba una forma de pago.
2. **Faltaba la bolsa del camarero.** En muchos restaurantes el camarero cobra en la
   mesa con su comandero, lleva el efectivo encima y lo liquida al acabar el turno.
3. **El cierre de caja de Servicio es uno por día y local** (`cierre_uno_por_jornada`,
   migración 0029), y el Anexo quería que lo rellenara el Z de cada caja: con dos
   cajones o dos turnos, el segundo Z pisaría al primero.
4. **La venta nacía al emitir el ticket.** Sin internet el ticket sale horas después, y
   el almacén no se movía hasta entonces; y «Quedan 3» no contaba lo que ya estaba en
   cocina sin cobrar.

Richi contestó: **las dos formas de cobrar, a elegir por local**, y sobre los pagos,
«sin meternos en cosas que no podemos».

## Lo que se decide

### 1 · Cuatro piezas que no se mezclan

```
CUENTA   lo que pide la mesa (o la barra, o el para llevar, o el reparto)
  └─ COBRO    lo que se cobra de una vez: unas líneas, unos comensales o una parte
       ├─ DOCUMENTO FISCAL   el ticket o la factura de ese cobro (o su justificante)
       ├─ PAGOS              uno o varios: efectivo, tarjeta, Bizum del banco...
       │    └─ MOVIMIENTO DE CAJA   solo el efectivo, en su turno de caja o en su bolsa
       └─ VENTA              lo que mueve el almacén y cuenta en Negocio
```

- **Un cobro, un documento.** Dividir la cuenta son varios cobros, cada uno con su
  ticket, y la mesa se libera con el último.
- **Un cobro, uno o varios pagos.** El mixto son dos pagos del mismo cobro.
- **Solo el efectivo mueve la caja.** La tarjeta la cuadra el datáfono al cerrar.
- **La invitación no es un pago**: es un descuento del 100 % en esas líneas, con permiso
  y motivo, y cuenta como consumo interno, no como merma.

### 2 · El turno de caja y la bolsa del camarero

| Pieza                  | Qué es                                                                                      |
| ---------------------- | ------------------------------------------------------------------------------------------- |
| **Cajón**              | El cajón físico, enchufado a una impresora. Varios terminales pueden usar el mismo           |
| **Turno de caja**      | Apertura con su fondo contado → movimientos → arqueo ciego → cierre (el Z). Uno abierto por cajón |
| **Bolsa del camarero** | Un turno de caja de una persona, sin cajón: lo que lleva encima. Se liquida en un cajón      |
| **Cierre del día**     | La suma de los Z del día. Es lo que rellena el cierre de caja de Servicio                    |

- **El local elige**: caja central (de fábrica), bolsa del camarero, o las dos según la
  persona. Es lo que contestó Richi.
- **Liquidar la bolsa** es una entrada en el turno de caja, con arqueo ciego de lo que
  se entrega, y su diferencia se guarda a nombre de quien la entrega.
- **El cierre de caja de Servicio sigue siendo uno por día**, y ahora eso es lo
  correcto: es **el cierre del día**, no el de un cajón. No cambia ni una tabla de lo
  construido: cambia lo que significa, y se escribe.

### 3 · La venta nace al cobrar

- **La venta nace con el cobro**, haya ticket o justificante, y el documento fiscal la
  acompaña (o la sigue, si no había conexión). Así el almacén se mueve al momento
  también sin internet.
- **«Quedan N» = lo que hay − lo comprometido**: lo mandado a cocina y todavía sin
  cobrar, calculado al vuelo con el escandallo. **No se guarda un segundo número.**
- Anular o devolver genera los movimientos contrarios con el coste que se congeló. Nunca
  se borra un movimiento.

### 4 · Lo que Estook no hace con el dinero

Lo que Richi dijo, «sin meternos en cosas que no podemos», escrito como regla:

- **Estook nunca guarda dinero de nadie** ni pasa a ser entidad de pago (Real
  Decreto-ley 19/2018, de servicios de pago). Solo **apunta** cómo se ha pagado.
- **El datáfono conectado** (Stripe Terminal, Viva.com o SumUp) es **del local**, con su
  cuenta a su nombre: el dinero va de la tarjeta del cliente a la cuenta del local.
- **Pagar en la mesa con el móvil** y **Bizum** siguen la misma regla: el proveedor es
  del local.
- **Estook no cobra comisión por los pagos del local**, ni en la primera versión ni
  después, sin una decisión escrita y la revisión del asesor.

## Lo que va al asesor

- **Las propinas en efectivo**: se apuntan como entrada de caja con motivo, fuera de la
  venta. ¿Es correcto que no vayan al ticket?
- **La comida del personal y las invitaciones**: ¿son autoconsumo a efectos del IVA?
  Hasta la respuesta, se apuntan como consumo interno sin documento.

Están en [`docs/legal/preguntas-al-asesor.md`](../legal/preguntas-al-asesor.md).
