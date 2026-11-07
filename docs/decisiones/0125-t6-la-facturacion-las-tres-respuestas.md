# 0125 · T6 · La facturación: las tres respuestas de Richi, mirado en la ley

**Fecha:** 2 de noviembre de 2026
**Estado:** decidido. Las maquetas de T6
([`t6-la-facturacion.html`](../maquetas/t6-la-facturacion.html)) están **aprobadas** con la A en las
tres preguntas. Todavía sin código.
**Sigue:** el «Terminado cuando» de T6 en el
[plan de M20A](../m20a-la-sala-y-la-cocina.md), del 2-nov.
**Cambia:** el plan de M20A (T6 · 1 y T6 · 2), el Anexo (4.5 y 5.3) y
[`lo-investigado.md`](../legal/lo-investigado.md) (A5 y de A18 a A23).

## 1 · Lo que dijo Richi

El 2-nov, a las tres preguntas de las maquetas: «sí a las tres. Revísalas, que estén bien, que no den
problemas a futuro, que sigan la ley y que todo esté de lujo».

1. **La factura a mano** desde Estook, para un evento o una comida de empresa: **sí, en T6 · 2**.
2. **«Pide tu factura»**, el QR del ticket con el que el cliente la pide él solo: **sí**. La página va
   en T6 · 2 y el QR en el ticket, con el cobro (T7).
3. **Con qué NIF se prueba**: **la empresa de pruebas de Verifacti** en T6, y el NIF de Richi antes
   del primer cliente.

## 2 · Lo que se miró en la ley, y lo que cambia

Se miró en el BOE y en las preguntas frecuentes de la AEAT el 2-nov. Está entero, con sus enlaces, en
`lo-investigado.md`. **No es asesoramiento**, y lo revisa el asesor antes de pasar a real (Anexo,
capítulo 9).

| Lo mirado                                                                                            | Lo que cambia en T6                                                                              |
| ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| La factura completa lleva **el NIF y el domicilio del cliente** (A18)                                | La factura a mano y la página del cliente **piden el domicilio siempre**                         |
| Para alguien de fuera, VeriFactu admite **su pasaporte o su número de IVA, con su país** (A18)       | **Un turista también puede pedir factura**, cosa que los demás TPV no resuelven                  |
| El canje **no es una rectificativa**, es una **F3** y puede sustituir a **varios tickets** (A19)     | **Varios tickets en una factura**: la comida de empresa de cada día del mes, cada ticket una vez |
| El reglamento **no corta el plazo** para pedir el canje (A19)                                        | La página del cliente **no caduca** a los pocos días                                             |
| Un dato mal que **no es un importe** se corrige con **R4**, no con R1 (A20)                          | **«Corregir los datos del cliente»**, R4 por sustitución. El Anexo decía R1, y estaba mal        |
| A una empresa, **la factura antes del día 16 del mes siguiente** (A21)                               | La factura a mano **avisa del plazo** si la fecha de la operación es de otro mes                 |
| **La señal se factura al cobrarla** (A22)                                                            | **«Factura de la señal»**, y la factura final la descuenta sola                                  |
| **El QR tributario siempre primero** (A23), y la factura por correo vale si el cliente la elige (A8) | El QR de «Pide tu factura» va **abajo y más pequeño**; pedirla en la página es elegirla          |

## 3 · Lo que se decide para que no dé problemas a futuro

1. **Pruebas y real no se mezclan nunca.** Cada documento y cada serie llevan su entorno, numeran
   aparte, y lo de pruebas no cuenta en las ventas ni en Negocio. **Al pasar a real, las series
   empiezan en 1.** Es lo que evita el error más caro: un hueco o un salto en la numeración real.
2. **La empresa de pruebas de Verifacti solo la elige el admin**, y solo en una cuenta de prueba.
   Ajustes › Facturación dice arriba que es la de pruebas. Es compartida, así que **el prefijo que
   añade al número no se programa** (Anexo 4.3): con un NIF propio no existe.
3. **«Pide tu factura» no enseña nada a quien no debe.** El código no se puede adivinar y es de un
   solo ticket. Solo funciona cuando el ticket está registrado. El importe no se toca. Una vez hecha,
   la página solo dice «Este ticket ya tiene factura» y **la reenvía al correo que se dio**, nunca a
   uno nuevo, y sin enseñar los datos de nadie. Hay un límite de intentos. **El aviso de privacidad
   dice la verdad**: el responsable es el restaurante, Estook es su encargado, y se piden solo los
   datos que la factura exige. **El local la puede apagar**, y viene encendida de fábrica.
4. ~~**Los clientes de la factura a mano se guardan** para la vez siguiente~~. **Ya no**: Richi lo
   cambió el 7-nov, no hay lista, y quien vuelve se rellena desde su última factura ([0139](0139-sin-lista-de-clientes.md)).
5. **Un aviso para T7**: mientras un local esté en pruebas, **no cobra a clientes de verdad con
   Estook TPV**. Un papel «PRUEBA · SIN VALIDEZ» no es el ticket que la ley le obliga a dar. El local
   del amigo de Richi sigue cobrando con su TPV hasta pasar a real.

## 4 · Lo que sigue sin cambiar

- **Todo en pruebas hasta las once condiciones** del capítulo 9 del Anexo. La primera es la revisión
  escrita de un asesor, y sigue sin haberlo.
- **R2 y R3 no se programan.** Nunca se llama a la eliminación permanente de un NIF.
- **El aplazamiento a octubre de 2028 sigue sin estar en el BOE** (mirado el 2-nov). Mandan las
  fechas de 2027, y no cambia nada de lo que se construye.
