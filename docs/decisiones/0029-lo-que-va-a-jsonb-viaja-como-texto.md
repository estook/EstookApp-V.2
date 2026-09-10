# 0029 · Lo que va a una columna JSON viaja como texto

**Fecha:** 10 de septiembre de 2026
**Estado:** decidido y construido · migración `0030`

## Lo que se vio

Richi, mirándolo en el TPV: al contestar «¿cómo entran tus ventas?» en el Panel,
salía «Se nos ha roto algo por dentro… Lo que has colocado se ve, pero todavía no
está guardado». Mirando la base de verdad: **no había ni un Panel guardado en
producción**. Nunca se había guardado ninguno.

## Lo que pasaba

La API de producción habla con Postgres con `postgres.js`. Cuando un parámetro va
a una columna `jsonb`, postgres.js **lo convierte él a JSON**. Y el código ya le
pasaba el texto hecho con `JSON.stringify`, así que se codificaba dos veces: lo
que se guardaba no era la lista de widgets, sino **un texto con la lista dentro**.

- En el Panel, una restricción comprueba que haya como mucho veinticuatro widgets
  mirando dentro de la lista. Dentro de un texto no hay lista, así que Postgres
  contestaba «cannot get array length of a scalar» y el guardado fallaba entero.
- En todo lo demás se guardaba el texto sin error: 210 filas de la auditoría, 52
  eventos de la bandeja, 158 respuestas de la memoria de idempotencia y 2 líneas
  del libro de movimientos, todas envueltas.

**Ninguna prueba lo veía**, y no por descuido: las pruebas corren con PGlite, que
pasa el texto tal cual y lo guarda bien. Es la lección E4 del Plan —«una prueba
que corre en un sitio no prueba el otro»— con nombre y apellidos.

## Lo que se decide

1. **Todo lo que va a `jsonb` se escribe `${…}::text::jsonb`.** El parámetro viaja
   como texto en los dos conductores, y la conversión la hace Postgres, que es la
   misma en los dos. Son 53 sitios en 25 ficheros.
2. **Una prueba lo vigila** (`servidor/aplicacion/json-a-la-base.prueba.ts`): lee
   el código del servidor y no deja pasar un `}::jsonb` sin el `::text`. Se
   comprueba leyendo y no ejecutando, a propósito: lo que falla es el conductor de
   producción, que en las pruebas no está.
3. **La `0030` arregla lo guardado donde se puede**: la bandeja de eventos —que
   vaciará el reloj de M8— y la memoria de idempotencia —que devuelve la respuesta
   de la primera vez cuando alguien reintenta—.
4. **La auditoría y el libro no se reescriben.** Son de solo añadir, y esa garantía
   vale más que el formato de doscientas filas. Para leerlas está
   `estook.json_de_verdad(jsonb)`, que devuelve el objeto venga como venga. La
   auditoría consultable de M21 tiene que usarla.
5. **`bd:comprobar-api` lo mira en la base de verdad**: tras aplicar la `0030`, ni
   un Panel, ni un evento, ni una respuesta envueltos. Si sale alguno después de
   desplegar, es que la API desplegada va por detrás.

## Cómo se comprobó

Contra la base de producción, dentro de una transacción que se deshace al final:
el mismo `insert` del Panel con `::jsonb` fallaba con el error de arriba, y con
`::text::jsonb` guardaba una lista. No quedó nada escrito.
