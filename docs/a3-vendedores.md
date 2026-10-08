# A3 · Vendedores · el plan

**Escrito el 7 de octubre de 2026** y **contestado por Richi ese mismo día** ([0076](decisiones/0076-a3-los-vendedores.md)), que lo simplificó: **el vendedor solo trae el cliente, no entra en Estook, y las comisiones se pactan fuera**. Construido en la misma entrega, con la migración `0058`.

## Qué es A3, en llano

**Saber qué vendedor trajo a cada cliente, y cómo le va a cada uno.** El vendedor reparte su enlace o su QR; quien se registra con él queda apuntado para siempre como suyo, y con su código el cliente tiene **un descuento el primer mes**.

| Pieza              | Qué es                                                                                                     |
| ------------------ | ---------------------------------------------------------------------------------------------------------- |
| **El vendedor**    | Una ficha en el admin: nombre, teléfono, correo y notas. **No entra en Estook**                            |
| **Sus códigos**    | `JUAN26`, `JUAN-FERIA`: los que quiera, cada uno con su campaña, **su enlace**, **su QR** y su descuento   |
| **El registro**    | Por el enlace, el código **sale ya escrito**; si no, la casilla **«Código de vendedor»**                   |
| **De dónde viene** | Cada cliente nuevo, con su vendedor o por dónde llegó: anuncios, buscadores, otra web o directo            |
| **Cómo le va**     | Cuántos trae, cuántos pagan, cuántos lo usan y cuántos se duermen, cuánto dejan al mes y cuánto llevan     |
| **El descuento**   | Un tanto por ciento del **primer cobro mensual**, en el código. Los días de prueba, de la oferta del admin |

En el admin, una pestaña nueva, **Vendedores**. Y en **Clientes**, cada ficha dice con quién vino, y la lista se filtra por vendedor.

## Lo que contestó Richi, y cómo queda

| Pregunta                              | Queda así                                                                                            |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| **¿Los vendedores entran en Estook?** | **No**: «solo traen el cliente». Nada de panel, asignaciones ni nivel de admin                       |
| **¿Enlace, QR y casilla?**            | **Los tres.** Lo de guardarlo en el navegador, no: pide un aviso de cookies y gana poco (0076, tres) |
| **¿Comisiones?**                      | **Se pactan fuera**, con las cifras de cada vendedor                                                 |
| **¿El código le da algo al cliente?** | **Un descuento del primer mes**. Los días de prueba, desde el admin, como hasta hoy                  |
| **¿Una sola entrega?**                | **Sí**                                                                                               |

## Lo que decido yo, para que lo sepas

Si alguna no te cuadra, dímelo y se cambia.

1. **El código**: de 3 a 20 letras, números o guiones, sin distinguir mayúsculas (`juan26` es `JUAN26`). **No se reutiliza nunca**, ni cerrado.
2. **El descuento se pone al crear el código y no se cambia**: para otro descuento, otro código. Así lo que se le prometió a un cliente no cambia por debajo.
3. **Solo en el pago mensual**: el anual ya lleva dos meses gratis.
4. **Con prueba, el descuento cae en el primer cobro**, al acabar la prueba. Si un admin le alarga la prueba, sigue cayendo en el primer cobro.
5. **Un código cerrado ya no vale para nadie nuevo**, pero quien se registró con él **conserva su descuento** si todavía no ha pagado.
6. **Un vendedor de baja** cierra todos sus códigos; sus clientes **siguen apuntados a él**, que es la historia.
7. **De la web de la que venía se guarda solo el nombre** (`google.com`), nunca la dirección entera.
8. **El cliente no pone el código después de registrarse**: lo pone un admin, con motivo. Así ningún vendedor se apunta clientes que ya estaban.
9. **La casilla del código, plegada** en «¿Tienes un código de vendedor?», salvo que llegue por un enlace: en ese caso, abierta y escrita.
10. **Lo comercial es nuestro**: poner o cambiar el vendedor de un cliente queda en **nuestra** auditoría, no en la del cliente.

## Lo que cuesta · cero

**Nada más al mes.** Vive en la base y en la API que ya hay. Los descuentos son **cupones de Stripe**, que no cobran nada por usarlos. **Y de Richi no hace falta nada**: ninguna clave nueva. Una migración y un despliegue, como siempre.

## Lo que no entra

- **Las comisiones**: se pactan fuera.
- **El contrato con cada vendedor y cómo se le paga.** Un vendedor de fuera que cobra comisiones suele ser **agente comercial** (Ley 12/1992) y te factura a ti: eso, con el asesor, el día que haya el primero.
- **El tablero de ventas** y sus gráficas, con lo que llega por cada sitio: es **A4**, justo después.

## Cómo se comprueba que A3 está terminado

- Un cliente entra por `estook.com/?ref=JUAN26`: en «Crear cuenta» sale `JUAN26` escrito y su descuento. Al registrarse, en el admin sale «vino con Juan».
- Otro escribe `juan26` a mano y queda igual de Juan; uno que escribe un código cerrado se registra sin él, avisado.
- Con prueba, el descuento se pone en Stripe al acabar la prueba; sin prueba, en la página de pago. En anual, no.
- Un admin pone el vendedor a un cliente que se olvidó del código, con motivo, y queda en la auditoría.
- Dar de baja a Juan cierra sus códigos; sus clientes siguen siendo suyos.
- Una sesión de la app no lee nada de los vendedores, ni preguntando a la API a pelo. Un cliente de ejemplo no cambia ninguna cifra.
- Todo en la batería de pantalla, **mirado en el móvil**.
