# I · La app instalable · el plan

**Escrito el 1 de octubre de 2026**, con H entera en producción, y **construido el mismo día** con las respuestas de Richi ([0070](decisiones/0070-la-app-instalable.md), migración `0054`). Dice qué es I, qué estaba decidido, lo que decidí yo, lo que contestó Richi, lo que cuesta y lo que hay que saber del iPhone. Las mejoras de las que sale son la **14** y la **15** de [`mejoras-antes-de-m8.md`](mejoras-antes-de-m8.md).

## Qué es I, en llano

Hoy Estook se abre en el navegador del móvil y, si se añade a la pantalla de inicio, se abre sin la barra del navegador (el manifiesto lo puso M6). Pero **sin conexión no abre**, **no avisa al móvil** y **no hay nada que te diga cómo instalarla**. I trae tres cosas, y las tres salen de la misma pieza, un _service worker_: un trocito de la app que se queda en el móvil y funciona aunque Estook esté cerrada.

| Pieza                        | Qué es                                                                                                       |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------ |
| **En la pantalla de inicio** | Estook se instala como una app más, con su icono. En Android, con un botón; en iPhone, con dos toques        |
| **Sin conexión**             | Fichar y apuntar mermas sin señal: se guarda en el móvil y se manda solo al volver, con la hora del servidor |
| **Los avisos al móvil**      | Lo que no puede esperar suena en el móvil, aunque Estook esté cerrada, y cuando tú eliges                    |

## Lo que ya está decidido, y no se vuelve a preguntar

| Qué                                                                                                                   | Dónde se decidió                                         |
| --------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| Avisos al móvil **con claves propias (VAPID), sin servicio de pago**                                                  | Mejora 14                                                |
| En iPhone, **solo con Estook en la pantalla de inicio** (iOS 16.4 o posterior), y la app lo explica                   | Mejora 14 y [0017](decisiones/0017-como-avisa-estook.md) |
| **El permiso se pide cuando tiene sentido**, nunca al entrar                                                          | Mejora 14                                                |
| Tres avisos nuevos: **lo que caduca**, **«entras en 5 minutos»** y **el pedido que no ha llegado**                    | Mejora 14                                                |
| **Lo que suena en el móvil no llega también por correo**                                                              | 0017                                                     |
| **Cada uno elige qué le llega y cuándo suena**: en su turno, o fuera de sus **horas de silencio**                     | 0017 (regla 3), mejora 14 y Richi (pregunta 4)           |
| Sin conexión, **solo fichar y apuntar mermas**                                                                        | Mejora 15                                                |
| **La hora la pone el servidor**, nunca el móvil; el fichaje sale **«hecho sin conexión»** y con más de 12 h se revisa | Regla 10 del Plan y mejora 15                            |
| La app dice **cuántas cosas tiene sin mandar**: guardar sin decirlo es peor que no guardar                            | Mejora 15 (regla 34)                                     |
| Mandar dos veces lo mismo **no apunta dos veces**: cada comando ya lleva su clave                                     | Cliente de la API, desde M2                              |
| **La campana es lo que ha pasado**; los interruptores viven en **Ajustes → Avisos**                                   | [0052](decisiones/0052-la-campana-y-los-avisos.md)       |
| **Al segundo, no**: que el servidor empuje lo que cambia mientras miras llega con el chat                             | `apps/app/src/datos/alDia.ts`                            |

## Lo que decido yo, para que lo sepas

Si alguna no te cuadra, dímelo y se cambia.

1. **La hora de un fichaje sin conexión, mejor que lo planeado.** El plan decía medir el tiempo con el reloj interno del móvil, pero ese reloj **se pierde si el móvil cierra la app**, y el iPhone las cierra a menudo. Así que el móvil apunta **cuánto ha pasado** entre fichar y mandarlo, con su propio reloj, y el servidor resta eso a **su** hora. Que el móvil vaya cinco minutos adelantado da igual: solo cuenta la diferencia. Solo saldría mal si alguien **cambia la hora del móvil mientras está sin señal**, y para eso: si la app no se ha cerrado, se compara con el reloj interno y, si no cuadran, el fichaje va a revisión. Con más de 12 horas, a revisión siempre.
2. **Cerrar sesión borra lo guardado en el móvil** y deja de mandarle avisos. Si había algo sin mandar, lo dice antes y deja mandarlo o tirarlo.
3. **El aparato del local para fichar nunca recibe avisos**: no es de nadie.
4. **El permiso se pide en dos sitios**: después de fichar por primera vez desde el móvil, y en **Ajustes → Avisos** con «Recibir en este móvil», para quien no ficha (gerencia, dirección). Siempre al tocar un botón: el iPhone no deja de otra forma.
5. **Instalar se ofrece una vez**, con una tarjeta pequeña en el Panel del móvil que se cierra y no vuelve: en Android, un botón «Instalar»; en iPhone, el dibujo de los dos toques. En el ordenador, no.
6. **Ajustes → Avisos gana una tercera columna, «Móvil»**, al lado de Campana y Correo. **Sin campana no hay móvil**, igual que no hay correo.
7. **Si un móvil deja de existir** (se cambió de teléfono, desinstaló Estook), su suscripción se borra sola al primer fallo, y ese aviso sale por correo si lo tenía encendido.
8. **El número en el icono** de Estook: los avisos sin leer de la campana, en Android y en iPhone.
9. **El reloj solo despierta a la API cuando hay algo que mandar.** «Entras en 5 minutos» necesita mirar cada minuto, y hoy el reloj late cada hora. Mirar cada minuto se hace dentro de la base, que es gratis; la API solo se llama si alguien tiene que recibir algo.
10. **Lo de la semana siguiente**: «entras en 5 minutos» del domingo por la noche mirará el horario de la semana que empieza (lo que la [0069](decisiones/0069-el-horario.md) dejó para aquí).

## Las respuestas de Richi (1-oct)

Contestó las seis el mismo día, pidiendo **«lo mejor para la empresa y el restaurante, lo más lógico y menos enrevesado, que se sienta pulido y profesional»**. Cada respuesta, y lo que hice con ella, está en la [0070](decisiones/0070-la-app-instalable.md). En corto:

| #   | La pregunta                          | Quedó así                                                                                                           |
| --- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| 1   | ¿Dos entregas?                       | **Una**: una migración, un despliegue y dos secretos, una sola vez                                                  |
| 2   | ¿Lo último que viste, sin señal?     | **Sí**, solo para mirar, con «Sin conexión · lo de las 10:42» arriba                                                |
| 3   | ¿El aparato del local sin wifi?      | **Sí**, con el PIN **cifrado**: en la tablet no queda ninguno legible                                               |
| 4   | ¿Horas de silencio?                  | **Cada uno elige** en Ajustes: «solo en mi turno» o «siempre, menos en mis horas de silencio», y a qué horas        |
| 5   | ¿«Suele llegar hacia las…»?          | **Sí, opcional**; en blanco no avisa                                                                                |
| 6   | ¿Lo que suena de fábrica?            | La lista propuesta, **todo personalizable**, y que nada se quede sin ver: si el móvil no lo recibe, sale por correo |
| 7   | Extra: imprimir tickets en la cocina | Ya pensado: es **Estook Link** (M19a), no I                                                                         |

## Lo que cuesta

**Nada.** Ni ahora ni al crecer:

| Qué                                       | Cuánto                                                                                                                                             |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mandar avisos al móvil                    | **0 €**. Los servicios que los entregan (los de Google, Apple y Mozilla) son gratis y no piden cuenta. Las claves VAPID las generamos nosotros     |
| Cuenta de desarrollador de Apple o Google | **No hace falta.** Esas (99 $ al año y 25 $ una vez) son para publicar en las tiendas, y Estook no va a las tiendas                                |
| Supabase                                  | Dentro del plan gratuito: una tabla pequeña (un móvil por fila) y mirar cada minuto dentro de la base. La API solo se llama si hay algo que mandar |
| Correo (Resend)                           | **Baja**: lo que suene en el móvil deja de salir por correo                                                                                        |
| El trocito que se queda en el móvil       | Unos KB. No se usa ninguna librería de fuera: se hace a mano, pequeño y rápido                                                                     |

**Lo único que hace falta de Richi** son **dos secretos en Supabase** (`VAPID_CLAVE_PUBLICA` y `VAPID_CLAVE_PRIVADA`), que se generan con `.\estook.cmd movil:claves` en su ordenador y **no pasan por el chat**. Los pasos, en [`pasos-antes-de-m8.md`](pasos-antes-de-m8.md).

## Lo que hay que saber del iPhone

1. **Los avisos solo llegan con Estook en la pantalla de inicio**, y con **iOS 16.4 o posterior** (un iPhone 8 o más nuevo). Es una regla de Apple. En la Unión Europea funciona: Apple lo quiso quitar en 2024 y lo devolvió.
2. **Apple no deja poner un botón «Instalar».** Se hace desde Safari (o Chrome): **Compartir → Añadir a pantalla de inicio**. La app lo enseña con un dibujo.
3. **La primera vez hay que entrar otra vez.** La Estook instalada es como otro navegador: no se lleva la sesión de Safari.
4. **El permiso de avisos se pide una sola vez.** Si alguien dice «No permitir», la app ya no puede volver a preguntar: se cambia en **Ajustes del iPhone → Notificaciones → Estook**. Por eso se pide en el momento justo, y la app lo explica si está apagado.
5. **Sin conexión, el iPhone no manda nada por detrás**: lo pendiente sale **al abrir Estook con señal**. Por eso la app dice cuánto tiene sin mandar.
6. **«No molestar» y los modos de concentración del iPhone mandan** por encima de nuestras horas de silencio.
7. **Apple corta los avisos a la app que manda avisos invisibles.** No es problema: los de Estook siempre se ven.

**Y una cosa para la mudanza** (de GitHub Pages a Cloudflare): los avisos y lo instalado van atados a la dirección **`estook.com/app/`**. Mientras no cambie, la mudanza no se nota en los móviles. Si cambiara, cada uno tendría que instalar Estook de nuevo.

## Lo que lleva (en una sola entrega)

| **En el móvil y sin conexión**                                                                  | **Los avisos al móvil**                                                                 |
| ----------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| El _service worker_: Estook abre sin señal, y se pone al día sola al publicar una versión nueva | El permiso, en el momento justo, y «Recibir en este móvil» en Ajustes                   |
| Instalar: el botón en Android y los dos toques en iPhone                                        | La columna **Móvil** en Ajustes → Avisos, y las horas de silencio                       |
| Fichar sin conexión, con la hora del servidor y «hecho sin conexión»                            | Cuándo suena: en tu turno, o fuera de tus horas de silencio                             |
| Apuntar mermas sin conexión                                                                     | Los tres avisos nuevos: lo que caduca, entras en 5 minutos, el pedido que no ha llegado |
| «2 sin mandar» arriba, y qué pasa al cerrar sesión con cosas pendientes                         | El número en el icono, y el correo que deja de salir cuando ya suena en el móvil        |
| Mirar lo último sin señal, y el aparato del local sin wifi                                      | «Suele llegar hacia las…» en el proveedor                                               |

## Lo que no entra en I

El chat y que lo que cambia se vea al segundo (C) · hacer pedidos, inventarios o recibir mercancía sin conexión · publicar Estook en el App Store o en Google Play · los avisos del APPCC (M16b), que usarán esta misma pieza.

## Cómo se comprobará que I está terminado

- En un Android, Estook se instala con un botón; en un iPhone, con los dos toques que enseña la app.
- Con el móvil en modo avión se ficha y se apunta una merma; arriba pone «2 sin mandar»; al volver la señal se mandan solas, **una vez cada una**, y el fichaje lleva la hora del servidor y «hecho sin conexión».
- Un móvil con la hora cambiada a mano no cambia la hora del fichaje.
- Con Estook cerrada, «entras en 5 minutos» suena en un Android y en un iPhone instalado, y nada suena en las horas de silencio de cada uno.
- Lo que suena en el móvil no llega también por correo.
- Las pruebas con fechas pasan la semana entera (`pnpm prueba:semana`).
