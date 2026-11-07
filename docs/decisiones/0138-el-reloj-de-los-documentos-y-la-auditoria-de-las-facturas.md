# 0138 · El reloj de los documentos y la auditoría de las facturas

**Fecha:** 7 de noviembre de 2026
**Estado:** construido en la rama `t6-2-2-1-el-reloj-de-los-documentos`, **con la migración 0108**. Sin
caja nueva.
**Corrige:** la [0136](0136-t6-2-1-el-motor-y-el-ticket.md) (punto 3 de cómo se emite) y la
[0137](0137-t6-2-2-1-las-facturas-y-quien-hace-que.md) (punto 1 de lo que se encontró al revisar).
**Cambia:** el Anexo (4.9, 4.10 y las pruebas 11 y 17), ESTADO y el mapa.

## Lo que pasó

Richi probó en IKATZ la #171 ya en producción. La factura salía bien y la AEAT la encontraba, pero **nada
salía nunca de «En Hacienda»**, y arriba sumaba 5,40 € con una sola venta de 2,70 €. Preguntó si estaba
todo bien, y al contestar que no pidió arreglarlo y auditar el apartado entero.

**La causa de lo primero fue un error de la IA, y su primer arreglo no la tocó.** El repaso se colgó en
la 0136 del latido del móvil, y ese latido `pg_cron` solo lo llama si hay algo que mandar al móvil (0054,
«la base mira si hay algo»). Sin un aviso pendiente, no se llamaba nunca. En la 0137 se cambió cada cuánto
se pregunta, sin haber podido leer la causa. **Leído en producción el 7-nov:** los tres documentos, con un
solo registro «Pendiente» de su alta; ningún aviso de Verifacti recibido ni pedido, porque también
los pide ese repaso.

**Las pruebas no lo vieron** porque llaman a la función por dentro, sin pasar por `pg_cron`, que en sus
bases no existe (lección 257).

## Lo que se arregla

**1 · El reloj, con su camino.** `estook-documentos`, cada minuto, llama a `/tareas/documentos` si hay algo
sin terminar. Ya no depende del móvil. Lo que hay sin terminar va en una cola (`facturacion.por_repasar`)
que se mantiene sola con disparadores: mirar cada minuto no recorre todos los documentos de todos los
clientes. El documento y lo que se le añade siguen siendo de solo inserción; esto es trabajo por hacer.

**2 · Que no vuelva a pasar en silencio**, por tres sitios: `bd:comprobar-api` sale en rojo si el reloj no
está programado, si la API no conoce el camino **o si algo lleva más de dos horas sin terminar**; el
latido de cada hora, que no depende de este reloj, lo manda a Sentry; y en la pantalla, lo que lleva más
de un día sin contestar sale arriba, en una sola frase por muchos que sean («Estook sigue preguntando solo»), para que «En Hacienda» no parezca
que está bien.

**3 · Lo que encontró la auditoría**, todo con su prueba:

| Lo que pasaba                                                                                                                         | Cómo queda                                                                                      |
| ------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| **El total contaba dos veces** el ticket canjeado y su factura                                                                        | Una sola venta. Solos, cada uno suma. Lo que Hacienda no tiene no suma                          |
| **Un ticket cuya factura se rechazaba quedaba canjeado para siempre**: se pedía «vuelve a hacerla» y no se podía                      | Una factura que Hacienda no tiene no canjea: el ticket queda libre (`sigue_en_pie`)             |
| **Una factura de verdad podía sustituir un ticket de pruebas**, o de otra empresa, al pasar a real                                    | La base lo rechaza                                                                              |
| **Total, cuenta y «Con algo pendiente» salían de los 500 últimos**: con fechas largas, mal y sin decir nada                           | Salen de todo lo pedido, en la base, y la pantalla dice que enseña los últimos                  |
| **Al preguntar si Hacienda ya tiene un documento faltaba la fecha de la operación**, que Verifacti exige: podía registrarse dos veces | Va cuando es otra                                                                               |
| **Pedir los avisos se atascaba** si ya había uno con esa dirección (409), y con dos NIF se creaban dos                                | Usa el que hay, con este secreto y encendido. Uno por entorno                                   |
| **Un estado que no se conociera** salía «En Hacienda» y no se volvía a preguntar                                                      | Sigue en la cola. Una prueba compara la lista de la base con la del dominio                     |
| **Cincuenta atascados tapaban a todos los demás** al repasar                                                                          | Solo ocupa sitio lo que toca en ese minuto, y primero lo que no está registrado                 |
| **El repaso podía adelantarse a quien acaba de emitir**, y el ticket de prueba se quedaba sin papel                                   | Lo de menos de dos minutos no se toca                                                           |
| **Con Verifacti caído se reintentaba cada dos minutos**, y cada intento queda apuntado para siempre                                   | Cada vez menos: como `tocaPreguntar`                                                            |
| **Las bases de las líneas podían no sumar la base del total**, por algún céntimo                                                      | Suman exacto: lo que sobra va a la línea mayor                                                  |
| **Mandado otro día, el papel y el PDF llevaban la fecha de prepararlo**, y el QR la de Hacienda                                       | Llevan la de Hacienda, y la de la operación si es otra                                          |
| **Un PDF podía salir sin QR** si el registro solo traía su dirección                                                                  | Sin imagen del QR no se genera                                                                  |
| **Si el correo al cliente fallaba, nadie se enteraba**                                                                                | Se dice al hacer la factura                                                                     |
| **Lo que Hacienda rechaza se podía reimprimir y mandar**, con un QR que no lleva a nada                                               | No se entrega; se puede mirar y descargar                                                       |
| **Una fecha imposible** (31 de febrero) llegaba a la base                                                                             | Se para antes                                                                                   |
| **Un aviso sin su id** se daría por repetido del siguiente                                                                            | Se usa su firma                                                                                 |
| **El Verifacti de verdad no lo probaba nadie**: solo el de mentira                                                                    | `verifacti.prueba.ts`, con lo que contesta según su especificación, que se volvió a leer entera |

## Lo que se miró y está bien

El circuito de firmas de los avisos, los permisos por acción, la numeración con su candado, que lo fiscal
solo se inserta, el importe del canje, las reglas del A4 (la factura de IKATZ, mirada entera: QR, «VERI\*FACTU»,
«Sustituye a», precio sin impuesto) y que la clave de un NIF no sale nunca.

## Lo que no se puede saber hasta desplegarlo

**Nada de esto ha corrido todavía contra el Verifacti de verdad**, porque no se puede sin desplegar:

- **Si Hacienda dice «Correcto» o «Aceptado con errores»** en la factura de IKATZ. «Encontrada» en la AEAT
  dice que la tiene, no que esté sin errores: hasta leerlo, la duda del prefijo `4833_` sigue a medias.
- **Si Verifacti acepta pedir avisos para su empresa de pruebas**, que es de todos. Si no, sale en Sentry y
  el reloj pregunta igual.

Lo dirá la base una hora después de desplegar: los tres documentos, con su estado nuevo.

## Para T6 · 2 · 2 · 2

Una anulación crea otro registro sobre un documento ya terminado: **tendrá que volver a entrar en la cola**
hasta que Hacienda conteste. Y `Duplicado` trae `estado_registro_duplicado`, que hoy no se mira: se lee como
correcto, y con anulaciones puede no serlo.

## Las pruebas

`emitir-el-ticket.prueba.ts` (el reloj, la cola, el secreto, el aviso en Sentry), `las-facturas.prueba.ts`
(el canje, las cuentas, lo mandado otro día), `verifacti.prueba.ts` (nueva), `emitir.prueba.ts`, las del
dominio, `api.prueba.ts` y `tickets-y-facturas.spec.ts` (el correo que no sale). **Que `pg_cron` lo llame de
verdad no lo puede probar ninguna base de pruebas**: lo mira `bd:comprobar-api` contra producción.
