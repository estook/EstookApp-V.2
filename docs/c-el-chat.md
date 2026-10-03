# C · El chat · el plan

**Escrito el 2 de octubre de 2026**, con I · La app instalable en producción y comprobada. Dice qué es C, qué estaba decidido, lo que decido yo, lo que cuesta, lo que no entra y **seis preguntas de sí o no** para Richi. **Richi contestó el 3-oct: sí a las seis** ([0071](decisiones/0071-las-respuestas-de-c.md)).

De dónde sale: el capítulo 23 del [Manifiesto](maestros/Estook-Manifiesto.md), lo que pidió Richi el 30-sep ([0066](decisiones/0066-sin-asesor-por-ahora-verifacti-y-el-chat.md)), el adelanto a después de I ([0067](decisiones/0067-pro-a-99-el-chat-adelantado-y-el-plan-de-h.md)) y lo que I dejó para aquí ([0070](decisiones/0070-la-app-instalable.md)).

## Qué es C, en llano

**Un chat como los que ya usa todo el mundo, pero del local y oficial.** Lo que se habla del trabajo deja de ir por grupos de WhatsApp sueltos: queda en Estook, ordenado por local, con quién lo ha leído, y suena en el móvil solo cuando cada uno quiere.

| Pieza              | Qué es                                                                                                   |
| ------------------ | -------------------------------------------------------------------------------------------------------- |
| **Dónde se habla** | «Todo el equipo», un canal por área (cocina, sala) y los privados, de dos o de un grupo pequeño          |
| **Qué se manda**   | Texto, fotos, documentos y notas de voz; y **tarjetas** (un horario, un pedido) que se abren en su sitio |
| **Lo de hoy**      | Entregado y leído, responder a un mensaje, reacciones, menciones, buscador                               |
| **Lo oficial**     | **Fijados arriba** y **«Confirmar que lo he leído»** en lo importante, con quién falta                   |
| **Al segundo**     | El mensaje aparece en cuanto se manda, sin recargar                                                      |
| **En el móvil**    | Suena con los avisos de I, y **nunca fuera de tu turno** si no lo quieres                                |

Arriba, al lado de la campana, un icono nuevo con el número de los sin leer.

## Lo que ya está decidido, y no se vuelve a preguntar

| Qué                                                                                                                   | Dónde se decidió                                                                             |
| --------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| **Es la forma oficial de hablar del trabajo**, y por eso queda registrado                                             | Manifiesto 23 y [0066](decisiones/0066-sin-asesor-por-ahora-verifacti-y-el-chat.md)          |
| Va **justo después de I**: un chat que no suena no sirve                                                              | [0067](decisiones/0067-pro-a-99-el-chat-adelantado-y-el-plan-de-h.md)                        |
| El equipo, un canal por área y los privados                                                                           | Manifiesto 23                                                                                |
| Texto, fotos, documentos, notas de voz y tarjetas **con los permisos de quien la recibe** (a un cocinero, sin costes) | Manifiesto 23 y Plan (M23)                                                                   |
| Entregado y leído, responder, reacciones, menciones que avisan al móvil, fijados, buscador                            | Manifiesto 23                                                                                |
| **«Confirmar que lo he leído»** en lo importante, con quién ha confirmado y quién falta                               | Manifiesto 23 y Richi (0066)                                                                 |
| **Silencio fuera del turno**: es ley (derecho a la desconexión, LOPDGDD art. 88). El mensaje espera                   | [0066](decisiones/0066-sin-asesor-por-ahora-verifacti-y-el-chat.md) y los avisos de I (0070) |
| **Nadie lee los privados de otros**: ni el gerente, ni el dueño, ni el equipo de Estook                               | Manifiesto 23 y [Roles](maestros/Estook-Roles-y-Administracion.md) (1.7 y 4.8)               |
| La gestoría no ve el chat                                                                                             | Roles (1.8)                                                                                  |
| **Quien se va, sale solo**: deja de leer y de escribir, y lo que dijo se queda                                        | Manifiesto 23 y [Auditoría de flujos](maestros/Estook-Auditoria-de-Flujos.md)                |
| Los ficheros, **con enlace firmado y que caduca**, como el resto                                                      | Manifiesto 23 y el almacén de ficheros (M5)                                                  |
| **Nada de efectos ocultos**: escribir «se acabó el pulpo» no marca nada como agotado                                  | Manifiesto 23                                                                                |
| **Gerente y jefes mandan el horario al chat**, con la tarjeta que H2 ya dejó hecha, que abre el horario de verdad     | Richi, respuesta 5 de [`h-horarios.md`](h-horarios.md) (0068)                                |
| **Lo que cambia al segundo**, que I dejó para aquí (`apps/app/src/datos/alDia.ts`)                                    | [0070](decisiones/0070-la-app-instalable.md)                                                 |

## Lo que decido yo, para que lo sepas

Si alguna no te cuadra, dímelo y se cambia.

1. **Los canales son de cada local.** Quien trabaja en dos locales ve los de los dos, con el selector de local de siempre. Un canal de toda la cadena llega con M24.
2. **Quién ve cada canal sale de su rol**: «Cocina», cocineros y jefes de cocina; «Sala», camareros y jefes de sala. **El gerente, dirección y el area manager ven todos los canales de sus locales**, y no les suena lo que no les nombra salvo que lo enciendan.
3. **Un privado lo abre cualquiera** con cualquiera de su local, de dos o de un grupo pequeño (hasta doce). Dirección y el area manager, con cualquiera de sus locales.
4. **La persona sin correo no tiene chat**: entra solo en el aparato del local (0057), y el aparato no es de nadie, así que tampoco lo tiene. Si un día da su correo, entra.
5. **Al segundo, sin pagar nada y sin que el mensaje viaje por fuera.** Cuando alguien escribe, Supabase manda a cada móvil abierto un toque, **«hay algo nuevo en Cocina», sin el mensaje dentro**; la app lo pide a Estook con su sesión, como todo lo demás. Así, aunque alguien escuchase ese toque, no leería nada. Si el toque no llega, la app pregunta cada 30 segundos con el chat abierto. Con la app cerrada, el móvil se entera por el aviso de I.
6. **Al segundo, el chat y la campana.** El Tablón, «Lo de hoy» y quién ha fichado siguen al minuto: ahí un minuto no se nota, y así no se gasta.
7. **Cuándo suena, lo de I**: «solo en mi turno» o «siempre, menos en mis horas de silencio». Lo que llega en silencio espera, y al acabar sale **uno solo** («Tienes 5 mensajes»). En Ajustes → Avisos, el chat gana sus filas: **privados y menciones suenan de fábrica; los canales, también, pero se pueden silenciar uno a uno**.
8. **El chat no va por correo**, nunca: sería llenar el buzón. Lo que no se ha visto espera en el chat, con su número en el icono de Estook. Y **no entra en la campana**, que es lo que ha pasado en el local (0052); el chat tiene su propio icono.
9. **Leído es leído de verdad**: con el chat abierto y el mensaje en pantalla, no al llegar al móvil. **Entregado** es que su app lo ha recibido.
10. **Lo tuyo se puede corregir y borrar.** Corregir, en los primeros 15 minutos, y sale «editado». Borrar, siempre: queda «Se eliminó este mensaje» y **el texto se borra de verdad**, no se guarda escondido. Lo que pidió «Confirmar que lo he leído» no se borra ni se corrige: se manda otro.
11. **El gerente puede retirar un mensaje de un canal** (algo ofensivo, un dato que no tocaba), y queda «Retirado por quien lleva el local», en la auditoría. En un privado, nunca.
12. **Para que quepa en lo gratis**: las fotos se reducen en el móvil antes de subir (como hace WhatsApp), los documentos hasta 20 MB y las notas de voz hasta 3 minutos.
13. **Las notas de voz se graban con lo que trae el móvil**, sin librerías. Android y el iPhone graban en formatos distintos: se prueba que cada uno oye las del otro antes de entregar.
14. **El buscador busca en lo que tú puedes ver**, en el servidor, con y sin acentos, como el de productos. Nunca enseña un privado ajeno.
15. **Las tarjetas que entran**: el horario (la de H2), un pedido y un producto, que es lo que ya existe. «Compartir» gana «Al chat», al lado de lo que ya abre el móvil (WhatsApp, correo). La ficha técnica y el plato llegan con sus módulos (escandallos y carta); la tarjeta queda preparada.
16. **Cuánto se guarda**: mientras exista el local. Los plazos de borrado de [`conservacion-de-datos.md`](legal/conservacion-de-datos.md) los aplica M27, como todo.

## Lo que cuesta · cero

**Nada más al mes**, hoy ni con la mudanza. Todo cabe en lo que ya se paga o en lo gratuito, mirado en [supabase.com/pricing](https://supabase.com/pricing) y en [sus límites](https://supabase.com/docs/guides/realtime/limits) el 2-oct:

- **Al segundo** (Supabase Realtime): gratis hasta **200 móviles abiertos a la vez** y 2 millones de toques al mes; con Pro, 500 y 5 millones. Solo cuenta la app **abierta y a la vista**. A ojo, un local de 15 personas gasta unos 30.000 toques al mes.
- **Fotos, documentos y voz**: gratis hasta **1 GB**, compartido con los logos y las fotos de producto; con Pro, 100 GB. A ojo, con las fotos reducidas, unos 50 MB al mes por local con mucho uso.
- **Los avisos al móvil**: gratis, con las claves propias de I.

**Cuándo empezaría a costar**: con más de **500 móviles abiertos a la vez** (unos 10 $ al mes por cada mil más), o con muchos locales mandando fotos; con Pro, cada GB de más son 2 céntimos. Lejos.

**La traducción sí costaría** por cada mensaje traducido, y es la pregunta 2.

**Y de Richi no hace falta nada**: la dirección y la clave pública de Supabase ya están en GitHub (Variables), mirado el 2-oct. Una migración y un despliegue, como siempre.

## Lo que no entra

- **El chat conectado de Fogón** («¿lo convierto en incidencia?»): es M23 y necesita a Fogón.
- **La traducción**, si Richi dice sí a la pregunta 2.
- **Llamadas y videollamadas.**
- **Un canal de toda la cadena** (M24) y **hablar con el proveedor** por el chat.
- **Las tarjetas de ficha técnica y de plato**, hasta que existan.
- **Exportar una conversación** y el borrado por plazos (M27).

## Las seis preguntas

> **Contestadas el 3-oct: sí a las seis** ([0071](decisiones/0071-las-respuestas-de-c.md)). En la 5, la casilla viene marcada **y se puede desmarcar**.

Cada una con mi recomendación y por qué. **Basta con contestar «sí» o «no»** a cada número.

### 1 · ¿Lo hacemos en dos entregas?

**C1 · Hablar**: canales, privados, texto, fotos, documentos, notas de voz, responder, reacciones, menciones, leído, al segundo, el móvil y el buscador. **C2 · Lo oficial**: fijados, «Confirmar que lo he leído», las tarjetas y mandar el horario al chat.

**Recomiendo que sí.** El chat es el doble de grande que I. Con C1 el equipo ya puede dejar el WhatsApp del local, y lo que veáis al usarlo una semana mejora C2. Cada entrega es una migración y un despliegue.

### 2 · ¿Dejamos la traducción para cuando llegue Fogón (M22)?

Es que quien escribe en rumano se lea en castellano debajo, y al revés.

**Recomiendo que sí.** Cuesta dinero por cada mensaje traducido, y el servicio que mejor lo hace (DeepL) acaba de cambiar sus planes y precios. Con Fogón ya habrá un modelo pagado y medido que traduce, y sale más barato que pagar otro servicio solo para esto. Mientras, el chat se queda en **cero euros**.

### 3 · ¿Los canales «Todo el equipo», «Cocina» y «Sala» se crean solos, y el gerente puede crear más?

Por ejemplo «Barra» o «Encargados», eligiendo quién entra.

**Recomiendo que sí.** El primer día ya está montado sin tocar nada, y cada local añade lo suyo. Hoy no hay rol de barra, así que «Barra» lo crea quien lo necesite.

### 4 · ¿En «Todo el equipo» escribe todo el mundo?

La otra opción es que sea un tablón donde solo escriben los encargados.

**Recomiendo que sí, que escriban todos.** Es el sitio natural para «¿alguien me cambia el sábado?». Lo oficial se distingue de otra forma: **fijar** un mensaje y pedir **«Confirmar que lo he leído»** solo lo pueden hacer quien lleva el equipo (gerente, jefes, dirección).

### 5 · Al publicar el horario, ¿que venga marcada la casilla «Mandarlo a Todo el equipo», pidiendo «Confirmar que lo he visto»?

Que lo manden gerente y jefes ya lo dijiste en H; esto es solo si viene marcada de fábrica. Se puede desmarcar.

**Recomiendo que sí.** Así nadie se olvida de mandarlo, y ves de un vistazo quién no se ha enterado del horario nuevo. El aviso personal («tu horario está publicado») y el correo con el PDF siguen como cada uno los tenga en Ajustes → Avisos; el móvil no suena dos veces por lo mismo.

### 6 · ¿«Leído» se ve siempre, sin que nadie pueda ocultarlo?

En WhatsApp se puede apagar; aquí la idea es que no.

**Recomiendo que sí.** En un chat de trabajo es lo que da valor: saber que el turno de mañana se ha enterado. Y no choca con la desconexión: fuera de su turno a nadie le suena, y leer o no es cosa suya; el que manda solo ve si lo ha leído, no le obliga a contestar.

## Cómo se comprobará que C está terminado

- Un camarero y un cocinero hablan por privado y **el gerente no lo ve**, ni en la pantalla ni preguntando a la API.
- Un mensaje en «Cocina» aparece **en menos de dos segundos** en otro móvil con el chat abierto, y suena en uno cerrado **solo si está en su turno** (o fuera de sus horas de silencio).
- Una nota de voz grabada en Android se oye en un iPhone, y al revés.
- Quien pierde el acceso deja de ver el chat al momento, y sus mensajes siguen.
- Una tarjeta de pedido abierta por un cocinero no enseña lo que él no puede ver.
- Todo en la batería de pantalla y en `pnpm prueba:semana` (el silencio depende de la hora), y **mirado en el móvil**.
