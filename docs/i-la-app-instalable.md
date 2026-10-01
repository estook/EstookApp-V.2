# I · La app instalable · el plan

**Escrito el 1 de octubre de 2026**, con H entera en producción. Dice qué es I, qué está ya decidido, lo que decido yo, **las seis preguntas para Richi**, lo que cuesta y lo que hay que saber del iPhone. Las mejoras de las que sale son la **14** y la **15** de [`mejoras-antes-de-m8.md`](mejoras-antes-de-m8.md).

## Qué es I, en llano

Hoy Estook se abre en el navegador del móvil y, si se añade a la pantalla de inicio, se abre sin la barra del navegador (el manifiesto lo puso M6). Pero **sin conexión no abre**, **no avisa al móvil** y **no hay nada que te diga cómo instalarla**. I trae tres cosas, y las tres salen de la misma pieza, un _service worker_: un trocito de la app que se queda en el móvil y funciona aunque Estook esté cerrada.

| Pieza                        | Qué es                                                                                                       |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------ |
| **En la pantalla de inicio** | Estook se instala como una app más, con su icono. En Android, con un botón; en iPhone, con dos toques        |
| **Sin conexión**             | Fichar y apuntar mermas sin señal: se guarda en el móvil y se manda solo al volver, con la hora del servidor |
| **Los avisos al móvil**      | Lo que no puede esperar suena en el móvil, aunque Estook esté cerrada, y solo cuando estás de turno          |

## Lo que ya está decidido, y no se vuelve a preguntar

| Qué                                                                                                                   | Dónde se decidió                                         |
| --------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| Avisos al móvil **con claves propias (VAPID), sin servicio de pago**                                                  | Mejora 14                                                |
| En iPhone, **solo con Estook en la pantalla de inicio** (iOS 16.4 o posterior), y la app lo explica                   | Mejora 14 y [0017](decisiones/0017-como-avisa-estook.md) |
| **El permiso se pide cuando tiene sentido**, nunca al entrar                                                          | Mejora 14                                                |
| Tres avisos nuevos: **lo que caduca**, **«entras en 5 minutos»** y **el pedido que no ha llegado**                    | Mejora 14                                                |
| **Lo que suena en el móvil no llega también por correo**                                                              | 0017                                                     |
| **Fuera de turno no suena nada**, y cada uno elige qué le llega y tiene **horas de silencio**                         | 0017 (regla 3) y mejora 14                               |
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

## Las preguntas para Richi

Cada una se contesta con **sí** o **no**. Va primero mi recomendación y por qué.

**1 · ¿I en dos entregas, como H?** Recomiendo **sí**. **I1 · En el móvil y sin conexión** (instalar, fichar y mermas sin señal). **I2 · Los avisos al móvil** (el permiso, los tres avisos nuevos, la columna «Móvil», las horas de silencio). I1 se puede usar antes y no te pide nada; I2 necesita que pongas dos claves en Supabase.

**2 · Sin señal, ¿la app enseña lo último que viste?** Recomiendo **sí**. Solo para mirar, con un aviso arriba: «Sin conexión · lo de las 10:42». En la cámara o en un sótano sin cobertura se puede mirar el horario, «Mi turno» o cuánto queda de algo. Se borra al cerrar sesión. Si dices que no, sin señal solo se ve fichar y mermas.

**3 · El aparato del local para fichar, si se cae el wifi: ¿que siga dejando fichar?** Recomiendo **sí**. Es donde fichan los que no tienen correo, y el registro horario es obligatorio. El PIN no se puede comprobar sin conexión (no sale del servidor), así que el aparato dice «guardado; se comprueba al volver la conexión». Si el PIN estaba mal, ese fichaje no cuenta y lo ve quien lleva el equipo. Lo malo: sin conexión no funciona el freno de los diez PIN fallados. Si dices que no, el aparato dice «sin conexión, ficha en tu móvil o avisa al encargado».

**4 · Quien no sale en el horario (gerencia, dirección), ¿usa horas de silencio, de fábrica de 23:00 a 8:00?** Recomiendo **sí**. «Fuera de turno no suena nada» está claro para quien tiene horario publicado. Quien no lo tiene no tiene turno, así que necesita sus horas de silencio, y cada uno las cambia en Ajustes. Nada se pierde: lo que llega en silencio está en la campana.

**5 · El pedido que no ha llegado: ¿añadimos al proveedor «suele llegar hacia las…»?** Recomiendo **sí**. Hoy el pedido sabe **el día** en que llega, no la hora, y el aviso es «media hora después de cuando suele llegar». Es un campo opcional en la ficha del proveedor; si no se rellena, el aviso sale a las 12:00. Le llega a quien lo mandó y a quien recibe la mercancía, si está de turno.

**6 · ¿Te vale esta lista de lo que suena en el móvil de fábrica?** Recomiendo **sí**. Solo lo que pide hacer algo ya: **entras en 5 minutos**, **lo que caduca** (la víspera a las 18:00 a quien esté de turno, y a primera hora), **el pedido que no ha llegado**, **te piden ayuda con un pedido**, **tu horario se ha publicado o ha cambiado** y **han corregido tu fichaje**. Lo demás (informes, carta nueva, notas del Tablón, pedidos empezados…) se queda en la campana, y cada uno lo enciende si quiere. Y, como dice la 0017, **lo que suena en el móvil ya no va también por correo**; los informes siguen por correo.

## Lo que cuesta

**Nada.** Ni ahora ni al crecer:

| Qué                                       | Cuánto                                                                                                                                             |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mandar avisos al móvil                    | **0 €**. Los servicios que los entregan (los de Google, Apple y Mozilla) son gratis y no piden cuenta. Las claves VAPID las generamos nosotros     |
| Cuenta de desarrollador de Apple o Google | **No hace falta.** Esas (99 $ al año y 25 $ una vez) son para publicar en las tiendas, y Estook no va a las tiendas                                |
| Supabase                                  | Dentro del plan gratuito: una tabla pequeña (un móvil por fila) y mirar cada minuto dentro de la base. La API solo se llama si hay algo que mandar |
| Correo (Resend)                           | **Baja**: lo que suene en el móvil deja de salir por correo                                                                                        |
| El trocito que se queda en el móvil       | Unos KB. No se usa ninguna librería de fuera: se hace a mano, pequeño y rápido                                                                     |

**Lo único que hace falta de Richi** son **dos secretos en Supabase** para I2 (`VAPID_CLAVE_PUBLICA` y `VAPID_CLAVE_PRIVADA`), que se generan con un comando en su ordenador y **no pasan por el chat**. Los pasos, en [`pasos-antes-de-m8.md`](pasos-antes-de-m8.md) cuando toque.

## Lo que hay que saber del iPhone

1. **Los avisos solo llegan con Estook en la pantalla de inicio**, y con **iOS 16.4 o posterior** (un iPhone 8 o más nuevo). Es una regla de Apple. En la Unión Europea funciona: Apple lo quiso quitar en 2024 y lo devolvió.
2. **Apple no deja poner un botón «Instalar».** Se hace desde Safari (o Chrome): **Compartir → Añadir a pantalla de inicio**. La app lo enseña con un dibujo.
3. **La primera vez hay que entrar otra vez.** La Estook instalada es como otro navegador: no se lleva la sesión de Safari.
4. **El permiso de avisos se pide una sola vez.** Si alguien dice «No permitir», la app ya no puede volver a preguntar: se cambia en **Ajustes del iPhone → Notificaciones → Estook**. Por eso se pide en el momento justo, y la app lo explica si está apagado.
5. **Sin conexión, el iPhone no manda nada por detrás**: lo pendiente sale **al abrir Estook con señal**. Por eso la app dice cuánto tiene sin mandar.
6. **«No molestar» y los modos de concentración del iPhone mandan** por encima de nuestras horas de silencio.
7. **Apple corta los avisos a la app que manda avisos invisibles.** No es problema: los de Estook siempre se ven.

**Y una cosa para la mudanza** (de GitHub Pages a Cloudflare): los avisos y lo instalado van atados a la dirección **`estook.com/app/`**. Mientras no cambie, la mudanza no se nota en los móviles. Si cambiara, cada uno tendría que instalar Estook de nuevo.

## Lo que lleva cada entrega

| **I1 · En el móvil y sin conexión**                                                             | **I2 · Los avisos al móvil**                                                            |
| ----------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| El _service worker_: Estook abre sin señal, y se pone al día sola al publicar una versión nueva | El permiso, en el momento justo, y «Recibir en este móvil» en Ajustes                   |
| Instalar: el botón en Android y los dos toques en iPhone                                        | La columna **Móvil** en Ajustes → Avisos, y las horas de silencio                       |
| Fichar sin conexión, con la hora del servidor y «hecho sin conexión»                            | Que nada suene fuera de turno                                                           |
| Apuntar mermas sin conexión                                                                     | Los tres avisos nuevos: lo que caduca, entras en 5 minutos, el pedido que no ha llegado |
| «2 sin mandar» arriba, y qué pasa al cerrar sesión con cosas pendientes                         | El número en el icono, y el correo que deja de salir cuando ya suena en el móvil        |
| Según la pregunta 2, mirar lo último sin señal; según la 3, el aparato del local sin wifi       | Según la pregunta 5, «suele llegar hacia las…» en el proveedor                          |

## Lo que no entra en I

El chat y que lo que cambia se vea al segundo (C) · hacer pedidos, inventarios o recibir mercancía sin conexión · publicar Estook en el App Store o en Google Play · los avisos del APPCC (M16b), que usarán esta misma pieza.

## Cómo se comprobará que I está terminado

- En un Android, Estook se instala con un botón; en un iPhone, con los dos toques que enseña la app.
- Con el móvil en modo avión se ficha y se apunta una merma; arriba pone «2 sin mandar»; al volver la señal se mandan solas, **una vez cada una**, y el fichaje lleva la hora del servidor y «hecho sin conexión».
- Un móvil con la hora cambiada a mano no cambia la hora del fichaje.
- Con Estook cerrada, «entras en 5 minutos» suena en un Android y en un iPhone instalado, y no suena a quien no tiene turno.
- Lo que suena en el móvil no llega también por correo.
- Las pruebas con fechas pasan la semana entera (`pnpm prueba:semana`).
