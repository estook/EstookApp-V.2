# 0040 · El local se busca en Google, con el tope contado antes de llamar

**Fecha:** 16 de septiembre de 2026
**Estado:** decidido y construido en M7 (migración `0036`, rama `m7-el-local-en-google`)
**Construye:** la parte de Places de la [0030](0030-el-local-se-situa-con-google.md)
**Deja para cuando haya acceso:** Business Profile y el reloj diario

## Lo que dijo Richi

> «Ahora preguntas dónde está el local, pero eso se verá cuando se conecte el
> local con Google Business y Places. Y servirá para fichar, ubicar el restaurante
> y ubicar al trabajador con GPS; también las reseñas.»
>
> Y el 10 de septiembre: «La API que cuesta dinero, la de Places, hay que acotarla
> bien»: **40 al mes por local**.

## Lo que se decide

### Uno · Se construye ya, apagado hasta que haya clave

Todo lo de Places está hecho y probado **con un Google de mentira**, y en
producción se enciende **el día que se ponga la clave** `GOOGLE_MAPS_KEY` en los
secretos de Supabase. Sin ella, Ajustes dice «Google todavía no está conectado» y
no enseña un buscador que no puede buscar (0022). No hace falta desplegar otra vez
para encenderlo.

### Dos · Dónde se usa

En **Ajustes → Tu local en Google**: se escribe el nombre, salen hasta cinco sitios,
se toca el tuyo y se guarda su ficha. Se guarda, con su fecha:

| Qué                                             | Para qué                                              |
| ----------------------------------------------- | ----------------------------------------------------- |
| El identificador de Google                      | Volver a pedir la ficha sin buscar; las reseñas (M23) |
| Nombre, dirección, teléfono, web, enlace a Maps | Documentos, carta digital, la ficha del local         |
| Valoración y número de reseñas                  | El Panel y Negocio                                    |
| Horario, una línea por día                      | Proponer la hora de corte y los turnos (M14)          |
| Latitud y longitud                              | **El centro del radio de fichaje**, si se quiere      |

La dirección y el teléfono escritos a mano en el alta **no se pisan**: se rellenan
solo si estaban vacíos.

**En el alta, no todavía.** La 0030 lo quería también en el paso 4, y se deja
fuera a propósito: un alta que depende de un servicio de fuera que puede no estar
conectado es un alta que se atasca. Cuando la clave esté puesta y probada en el
local de Richi, se añade al paso 4 con la misma tarjeta.

### Tres · La ubicación de a mano manda

Se guarda **de dónde sale** la posición del fichaje (`posicion_de`: `a_mano` o
`google`):

- Al elegir el local, «Medir los fichajes desde su ubicación de Google» sale
  **encendido** si no había posición, y **apagado** si se marcó a mano desde el
  local: dentro de un centro comercial, el punto de Google cae en el aparcamiento.
- Marcarla a mano después la deja en `a_mano`.
- Traer la ficha otra vez **solo mueve la posición si ya venía de Google**.

### Cuatro · El tope, contado antes de llamar

| Qué                          | Tope al mes por local | Por qué ese número                                    |
| ---------------------------- | --------------------- | ----------------------------------------------------- |
| **Fichas** (lo que se cobra) | **40**                | El de Richi                                           |
| **Búsquedas** (cada letra)   | **400**               | Diez por ficha: que un fallo no se vuelva una factura |

- **Se cuenta primero y se llama después**, en una sola orden que solo suma si queda
  sitio. Dos pestañas a la vez no se pasan del tope entre las dos, y cuando se
  acaba **Google no llega a enterarse**: hay una prueba que lo cuenta.
- Si Google falla, la transacción se deshace y esa no cuenta: Google no cobra lo
  que falla.
- **Se escribe tres letras antes de buscar**, y se espera a que se deje de escribir.
- **Las letras y la ficha van en una sesión** (`sessionToken`): Google cobra la
  sesión como una ficha, no cada letra.
- **Se piden solo los campos que se guardan** (la máscara de campos es el precio).
  Valoración, teléfono, web y horario son del escalón caro de Google, y se piden
  porque la 0030 los usa.
- **Abrir Ajustes no llama a Google nunca**: lee lo guardado.
- **Traer la ficha otra vez, como mucho una vez cada 24 horas**, y es un botón.
- Lo gastado se ve en la tarjeta: «Este mes: 3 de 40 fichas y 12 de 400 búsquedas».

**Lo que sigue siendo tuyo en Google Cloud**, porque es lo único que corta del lado
de Google: la cuota diaria de la API y el aviso de presupuesto
([`pasos-para-cerrar-m7.md`](../pasos-para-cerrar-m7.md), paso 6).

## Lo que queda para después, y por qué

**Business Profile (las reseñas enteras y responderlas).** No funciona con una
clave: **el dueño de la ficha autoriza con su cuenta de Google** (OAuth), y Google
**tiene que aprobar el acceso** del proyecto antes de dar cuota. Construir el flujo
sin la aprobación sería escribir contra una API que no se puede probar. Cuando
Google lo apruebe, entra con su propia decisión. Hasta entonces, la valoración y el
número de reseñas de Places ya están guardados.

**El reloj que actualiza la ficha cada noche.** Es `pg_cron` llamando a la API
([0016](0016-el-reloj-es-pg-cron-llamando-a-la-api.md)), que no existe todavía y
necesita su propio secreto para que nadie de fuera pueda dispararlo. Mientras, el
botón hace lo mismo con el mismo límite de una vez al día.

## Lo que se descartó

**Llamar a Google desde el navegador**, con la clave restringida por dominio. Es lo
que hacen los ejemplos de Google y es gratis de montar, pero la clave queda a la
vista, no hay contador por local y no se puede cortar: justo lo contrario de lo que
se pidió.

**Un tope en euros.** Google cambia sus precios y sus escalones, y un contador en
euros tendría que copiarlos. Se cuentan peticiones, que no cambian, y los euros los
vigila el aviso de presupuesto de Google.
