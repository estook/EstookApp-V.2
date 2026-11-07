# 0140 · T6 · 2 · 2 · 2 · Las correcciones

**Fecha:** 7 de noviembre de 2026
**Estado:** en producción con la #175 (7-nov), **migración 0110**. En IKATZ, una anulación «Anulado» y una devolución de un ticket «Correcto». Sin caja
nueva: la 1.3.0 ya imprime estos papeles.
**Sigue:** la [0137](0137-t6-2-2-1-las-facturas-y-quien-hace-que.md), la
[0138](0138-el-reloj-de-los-documentos-y-la-auditoria-de-las-facturas.md) y la
[0125](0125-t6-la-facturacion-las-tres-respuestas.md).
**Maquetas:** las aprobadas el 2-nov ([T6, 5](../maquetas/t6-la-facturacion.html)) y el 6-nov
([T6 · 2 · 2, 4 a 8](../maquetas/t6-2-2-las-facturas.html)). No hizo falta ninguna nueva.
**Cambia:** el Anexo (4.5, 4.10, 5.3, 5.4, 7.6, 8 y 11.7), Roles (1.12), el plan de M20A, el mapa y
ESTADO.

Lo emitido no se toca nunca: **se corrige con otro documento**, y cada corrección tiene su permiso y su
motivo. **Todo en pruebas**: nada llega a Hacienda de verdad hasta las once condiciones.

## 1 · Lo que se puede hacer

| Qué                              | Con qué documento                               | Quién, de fábrica                                          |
| -------------------------------- | ----------------------------------------------- | ---------------------------------------------------------- |
| Devolver un ticket               | **R5**, por diferencias, sin cliente            | Gerente, area manager, dirección y administrador de cuenta |
| Devolver una factura             | **R1**, por diferencias, con su cliente         | Los mismos                                                 |
| Corregir los datos               | **R4**, por sustitución                         | Gerente y dirección                                        |
| Anular                           | Un registro de anulación, con su motivo         | Gerente y dirección                                        |
| La señal de un evento            | **F1**, cobrada ese día, que la final descuenta | Quien hace facturas a mano: jefe de sala en adelante       |
| Corregir lo que rechazó Hacienda | Otro documento igual, con otro número           | Quien corrige los datos                                    |

**Devolver** sirve para todo, para una de dos raciones y para lo cobrado de más, que devuelve dinero de
una línea sin devolver ninguna ración. Un ticket con factura se devuelve sobre su factura, y uno con
devolución ya no se canjea. **Solo la dirección cambia estos permisos**, persona a persona, en «Quién hace
qué» (0137). **Ni la caja ni el almacén se mueven**: llega con el cobro, T7.

## 2 · Lo que dice Verifacti (`verifactu.min.yaml` y `codigos-verifactu.yaml`, leídos el 7-nov)

- `tipo_rectificativa` (`S` o `I`) es obligatorio en toda rectificativa. `importe_rectificativa`
  (`base_rectificada` y `cuota_rectificada`) es obligatorio con `S` y **no se admite** con `I`.
- `facturas_rectificadas` lleva serie, número y `fecha_expedicion`: la del envío aceptado, que es la que
  tiene Hacienda. Se manda aunque no sea obligatorio: el papel y Hacienda tienen que decir lo mismo.
- R5 **no admite** `nombre`, `nif` ni `id_otro`; R1 y R4 los **exigen**.
- Por diferencias, los importes van en negativo (su ejemplo de `I`, y su regla de signos lo permite).
- `POST /verifactu/cancel` pide `serie`, `numero` y `fecha_expedicion`, **sin fecha de operación**, y contesta
  con **su propio uuid**, su huella y su estado, sin QR. «Anulado» es el estado bueno; «Factura inexistente»,
  «No registrado» e «Incorrecto» no.
- `estado_registro_duplicado` dice cómo tiene Hacienda lo que sale «Duplicado». **Sin lista cerrada de
  valores**: lo que no se conoce se queda en «Duplicado».
- **Lo que no dice**: qué trae el aviso (webhook) de una anulación. Se trata como el del alta, por su uuid, y
  **el reloj pregunta igual**, así que si no llegara, se sabe igual.

## 3 · Lo que costaba de verdad: una anulación es otro registro

El primer diseño apuntaba los estados de la anulación en `registro`, junto a los del alta. Es lo que se lee
en cinco sitios para saber cómo está un documento. **Una anulación que Hacienda no acepta habría convertido
en «Rechazada» una factura que seguía valiendo**, y su ticket se habría podido volver a facturar.

Por eso **lo que pasa con una anulación vive aparte** (`anulacion` y `paso_de_anulacion`), y solo cuando
Hacienda dice «Anulado» se añade a `registro`: desde ahí, todo lo que lee el último registro lo ve anulado sin
saber nada de esto. Si no sale, el documento sigue como estaba, sale un aviso en la campana y se puede volver a
intentar. Y **vuelve a `por_repasar`** al pedirse, porque ya había salido de la cola: sin esto, se habría
quedado «Anulando» para siempre (lección 262).

## 4 · Lo que hace falta que mire la base, con el candado del documento

- **Lo devuelto no se devuelve dos veces**, tampoco a la vez desde dos aparatos: por línea y por documento. Lo
  que Hacienda rechaza no cuenta, y lo devuelto vuelve a quedar.
- **Sobre un ticket, R5; sobre una factura, R1.** Lo contrario declara mal el documento.
- **Una señal, una sola vez y del mismo cliente.** Lo descontado es lo que le queda, y tiene que ser lo que
  dicen las líneas en negativo de la final.
- **No se anula** lo que Hacienda no ha contestado, lo que tiene una factura o una devolución encima, ni una
  señal, ni lo que ya se está anulando.
- Lo que no se puede emitir se dice **antes de numerar**: no gasta un número.

## 5 · Lo que decidió la IA, sobre lo aprobado, y por qué

Todo es lo lógico para que no quede un callejón sin salida. Está escrito para poder cambiarlo.

1. **«La aprueba un encargado con su PIN» no se construye.** Lo dibujaba la maqueta del 2-nov. La del 6-nov dice
   «los que no se pueden usar no salen», y Richi quiso cada corrección con su permiso. **Quien puede entra con su
   PIN en ese aparato y lo hace a su nombre**, que deja el mismo rastro con un paso menos.
2. **Una corrección de datos sigue siendo una factura**: se puede devolver y volver a corregir. La maqueta le ponía
   solo «Reimprimir o Descargar · Mandar», y entonces una factura corregida no se podría devolver nunca. La
   anterior, «Corregida», lleva a ella.
3. **Corregir una factura con una devolución encima recoge lo que queda** y dice que rectifica las dos, con lo que
   Hacienda tiene de ambas como lo de antes. Lo otro era no poder corregirla.
4. **Lo que rechaza Hacienda se rehace igual**, con los datos del cliente editables, y lo que iba con él pasa al
   nuevo, después de volver a mirarlo: los tickets, las señales y lo que rectificaba.
5. **Si la final se anula, se rechaza o se devuelve entera, su señal queda libre**: no se perdería ese dinero en
   ningún sitio. Una parte de la final no puede pasar de lo que queda, para no devolver lo ya pagado con la señal.
6. **La señal no cabe si es mayor que lo facturado a su mismo tipo**, aunque el total salga bien: una comida al 21 %
   no paga una señal al 10 %. Si es justo igual, sale a cero, y es correcto.
7. **La devolución lleva la fecha del día en que se devuelve**; la corrección de datos, la de la operación, que no
   ha cambiado (art. 89 de la Ley del IVA, para el asesor).
8. **La señal se descuenta solo en la factura a mano.** En la de un ticket, con T7, cuando el cobro la conozca.
9. **El motivo de la corrección de datos lo escribe Estook** («Corrige el NIF y el domicilio»): la maqueta no pide
   teclear nada, y así no puede faltar.
10. **La devolución no sale sola por la impresora**: se imprime con su botón, porque hoy no hay cobro detrás.

## 6 · Lo que queda para el asesor (Anexo, capítulo 9)

- **Por diferencias en las devoluciones de hostelería** (ya marcado en el Anexo 4.5): se cambia en un sitio.
- **La señal de un particular que no quiere dar su DNI**. Hoy se pide: va en una F1, que exige destinatario.
- **La fecha de operación de una devolución** de otro mes, y el motivo de **«Duplicado» con «Incorrecto»**.

## 7 · Lo que sigue sin hacer, para que nadie lo dé por hecho

- **Sacar el dinero de la caja y devolver el género al almacén**, con T7. La prueba 12 pide la salida de caja:
  se cierra entera allí. Hoy prueba lo fiscal.
- **Un rechazo de verdad** y **una anulación que Hacienda no acepta** no se pueden forzar en IKATZ: se han visto
  contra el Verifacti de mentira, no contra el de verdad.
- **El aviso (webhook) de una anulación**: su forma no está en la documentación de Verifacti. Se verá en IKATZ.

## 8 · Las pruebas del capítulo 8 del Anexo

En `las-correcciones.prueba.ts`, contra la base y el Verifacti de mentira, y en `tickets-y-facturas.spec.ts` desde
la pantalla: **13** y **12, en lo fiscal**. La **17** se extiende a la anulación: el reloj la vuelve a mirar.
