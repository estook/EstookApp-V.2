# 0097 · Fogón 1: las respuestas, el gasto y la primera entrega

**Fecha:** 18 de octubre de 2026
**Estado:** contestada por Richi el 18-oct. **Fogón 1 · 1 construida** en la rama `fogon-1-la-base`.
**Sigue:** la [0095](0095-lo-vendido-sin-escandallo-y-cuando-llega-fogon.md) (Fogón en dos mitades), la [0023](0023-fogon-nunca-arma-su-contexto-en-el-navegador.md) (el contexto lo arma el servidor) y la [0015](0015-fogon-es-una-burbuja-no-una-pestana.md) (dónde vive).

## 1 · Fogón 1, en tres entregas

La 0095 le pone a Fogón 1 nueve cosas. Van en tres entregas, y cada una se puede usar sin esperar a las demás:

| Entrega                           | Qué trae                                                                                                                                                                                                                  |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1 · La base y los escandallos** | El motor en el servidor, con sus topes y su contador · **preguntarle** desde el banner del «+» · **«Rellenar con Fogón»** en Escandallos · **«Escribir los pasos con Fogón»** en Fichas · los dos interruptores del admin |
| **2 · Fotos y voz**               | El albarán por foto al recibir · la merma por foto y por voz · el cierre de caja por foto (el Z)                                                                                                                          |
| **3 · El que revisa y prepara**   | Revisar los datos (de noche, una vez a la semana) · borradores de pedido y de cuadrante · la respuesta propuesta a una reseña                                                                                             |

## 2 · Las tres respuestas de Richi

**1 · El modelo: el más barato (A).** «La IA es una ayuda, no el resultado final sin revisión»: un escandallo de Fogón es **un borrador** que la persona corrige y adapta antes de guardar. Fogón 1 usa **Claude Haiku 5.5** para todo (0,10 $ por millón de tokens que lee y 0,50 $ por millón que escribe; diez veces menos que el Haiku 4.5 que suponía el coste por local). El nombre del modelo es un secreto del servidor (`AI_MODELO_RAPIDO`): cambiarlo no pide tocar el código.

**2 · El gasto: un local no pasa de 5 € al mes de IA, «tirando por lo alto», con límites diarios.** Richi pidió una recomendación; la IA propuso **dos frenos y un interruptor**, y es lo construido:

| Freno                                          | Cuánto                                                                                                                    | Para qué                                                                            |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| **Los créditos** (lo que ve el local)          | Los del plan (Manifiesto 32): **300 al mes en Esencial, 1.500 en Pro y Cadena**, y **una décima parte al día** (30 y 150) | Que un día raro no se coma el mes. Se ve lo que queda en el propio Fogón            |
| **Los euros** (lo que paga Estook, por dentro) | **5 € al mes y 0,25 € al día por local**, con lo que de verdad ha costado cada llamada                                    | La red de seguridad: si un día cambia el modelo o el precio, corta antes de pasarse |
| **Anthropic**                                  | El límite de gasto de la cuenta, que pone Richi en su consola (20 $ el primer mes)                                        | Lo último: ni un fallo nuestro pasa de ahí                                          |

Lo que cuesta cada acción: **preguntar, 1 crédito**; **rellenar un escandallo o escribir los pasos, 2**. Con Haiku 5.5, un local Pro que gasta los 1.500 créditos del mes cuesta **unos 0,55 €**: muy por debajo de los 5 €. Cuando se acaban, Fogón se para y **todo lo demás de la app sigue igual**.

**Cómo se hace rápido y barato** (lo que hacen las apps que lo hacen bien, y lo que ya pedía el Manifiesto en el capítulo 20):

1. **Los números los calcula Estook**, nunca la IA. Fogón recibe las cifras hechas y las explica.
2. **Fogón no lee la base de datos.** El servidor le arma **un resumen corto de la pantalla en la que estás** con las mismas consultas que pinta la app, solo con lo que tú puedes ver. Unas pocas líneas, no la tabla entera.
3. **Ese resumen va cacheado**: si preguntas otra cosa en los cinco minutos siguientes, Anthropic cobra lo repetido a una décima parte.
4. **Respuestas cortas** (cuatro frases como mucho) y el modelo con el esfuerzo bajo: menos que escribir es más rápido y más barato.
5. **Cada botón dice lo que gasta y solo gasta si lo pulsas.** Nada llama a la IA al abrir una pantalla.
6. **Cada llamada se apunta** con sus tokens y lo que costó: lo mirará Richi con el piloto.

**3 · Quién lo tiene encendido: apagado para todos, y se enciende desde el admin (A).** Hay **dos interruptores**: uno para **cada cliente** y **uno general**, los dos en la sección **Fogón** del admin, que lo apaga o enciende para todos a la vez, para un cambio de IA o un mantenimiento. Richi: **«pon el botón, ya no hace falta medir lo que cuesta, eso lo miraremos nosotros con el piloto»**. Cambia la regla 11 del Plan: **encender Fogón no espera a tener el coste medido**; venderlo, sí.

## 3 · Lo que hace Fogón 1 · 1

- **Preguntarle** en el banner del «+» (y `Ctrl+J`). Contesta con los datos de tu local y de la pantalla en la que estás, **solo con lo que tú ves**: a quien no ve importes no le da un euro. Si el dato no está, lo dice. Dice siempre que es una IA (Reglamento europeo de IA, art. 50). La conversación vive mientras está abierta: al cambiar de local o cerrar la sesión, se borra (0023).
- **«Rellenar con Fogón»** al desgranar un plato que no tiene nada: «Dímelo rápido» (opcional) y Fogón propone las líneas. **Cada una pregunta cuál de tus productos es**, con el que más se parece propuesto, igual que «Empezar desde la de Estook». Hasta que se elija, no se puede guardar. Y avisa: **«La IA no es precisa: revísalo y ajústalo antes de guardar»**.
- **«Escribir los pasos con Fogón»** en la ficha técnica: con un resumen corto, o sin nada (sale de lo que lleva el plato), propone los pasos y los deja en las cajas para que los cambies. Nada se guarda sin pulsar Guardar.

**Quién puede:** preguntar, quien tiene Fogón en su rol (también camareros y cocineros, que ya lo tenían «acotado» desde la 0010); rellenar y escribir pasos, quien edita Escandallos. **En una visita de demostración, Fogón no está**: la demostración no escribe nada.

## 4 · La prueba de la plantilla

Ningún trabajo nuevo para nadie (los botones lo quitan) · no bloquea nada (con Fogón apagado o sin créditos, todo sigue igual) · se entiende sin formación (un botón donde ya se trabaja) · no avisa de nada: contesta cuando se le pregunta · con datos a medias dice lo que falta · no señala a nadie.

## 5 · Lo que necesita de Richi

1. **Una clave de la API de Anthropic**, puesta como secreto `AI_API_KEY` en Supabase (nunca por el chat), y **el límite de gasto en la consola de Anthropic**. Sin clave, Fogón dice que no está conectado y no se rompe nada.
2. **Encenderlo** en el admin: el general y el de IKATZ.

## 6 · Lo que vio Richi al probarlo (19-oct)

**Fogón no contestaba**: con la clave y el saldo puestos, decía «no ha contestado bien» sin decir por qué. **El código se tragaba el motivo de Anthropic.** Ahora:

- **El fallo trae lo que dice Anthropic** (su código, su tipo y su frase, nunca la clave) y queda en los registros de Supabase y en Sentry.
- **Admin › Fogón › «Probar la conexión»**: una pregunta de una palabra que dice si funciona y, si no, **qué tocar**, en castellano (la clave no vale, sin saldo, el modelo no existe, el límite, Anthropic saturado…) con la frase de Anthropic debajo.

**«Tiene que ser un chat normal»**, con el logo de Estook y «sabe que estás en (sitio), pregunta lo que necesites», y ayudando a entender qué se puede hacer en cada página. Ahora:

- **Vacío**: el logo de Estook, «Pregunta lo que necesites», «Fogón sabe que estás en Almacén» y **tres o cuatro preguntas de esa pantalla que se tocan y se mandan**; las de dinero, solo a quien ve importes.
- **Conversación**: tus mensajes a la derecha, los de Fogón a la izquierda con su llama; un fallo es un mensaje más, con su motivo.
- **La caja, fija abajo**, con el botón de enviar como el chat del equipo, y debajo lo que queda de créditos. Fuera los botones de «Lo que puedes hacer aquí ahora» cuando Fogón habla.
- Y el resumen lleva **para qué sirve cada app**, para que «¿Qué puedo hacer en esta pantalla?» tenga respuesta.

## Lo que decidí al construirlo

Los que tomó la IA por su cuenta, para que Richi los sepa (también en [`lo-que-decidio-la-ia.md`](../lo-que-decidio-la-ia.md)):

1. **La conversación no se guarda en la base**: vive en la pantalla. Lo que sí se guarda de cada llamada es lo que se preguntó, a qué local, cuánto costó y el sello del resumen (0023, regla tres). Las dos últimas preguntas viajan con la nueva para que pueda seguir el hilo.
2. **El plan que da los créditos**: el de la suscripción, también en los días de prueba; de la casa, o sin plan elegido todavía, los de Pro.
3. **«Rellenar con Fogón» solo sale con el escandallo vacío, y «Escribir los pasos» con la ficha sin pasos**, como «Empezar desde la de Estook»: sobre lo escrito por una persona, lo pisaría (y los pasos perderían sus fotos).
4. **A la IA no le llegan nombres de personas**: ni del equipo ni de quien pregunta. Al rellenar un escandallo le llegan el nombre del plato, lo que el local escribió de él y **los nombres de sus productos del Almacén, sin precios**, para que escriba los ingredientes como ya se llaman y casarlos sea más fácil.
5. **Lo que le llega a la IA va a Anthropic** (Estados Unidos), que no lo usa para entrenar. Anthropic pasa a ser **subencargado del tratamiento**: está apuntado en [`docs/legal/`](../legal/cumplimiento.md) y es una pregunta más para el asesor.
6. **La llamada se hace dentro de la transacción**, con el local bloqueado para que el tope no se pase entre dos pestañas, y un tope de 25 segundos. Con Haiku contesta en uno o dos; si con el piloto se ve que ocupa demasiado las conexiones de la base, se saca fuera.
7. **El asistente sigue llamándose Fogón**, con el logo de Estook encima: Richi pidió el logo de Estook, y el nombre de la IA ya estaba decidido.
8. **«Probar la conexión» no se apunta en ningún local**: no es de ninguno, y cuesta menos de una milésima de céntimo.
9. **Las preguntas sugeridas son solo de lo que Fogón sabe contestar en cada pantalla**: una sugerencia que no sabe contestar enseña a no usarlo.
