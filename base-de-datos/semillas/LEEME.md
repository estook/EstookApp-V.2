# Semillas

Dos, y las dos se cargan con `pnpm bd:sembrar`:

| Semilla             | Que monta                                       | Para que sirve                                                  |
| ------------------- | ----------------------------------------------- | --------------------------------------------------------------- |
| `independiente.sql` | Bar Centro · 1 organizacion, 1 local, sin areas | El caso mas comun. Comprueba que la aplicacion no ensena "area" |
| `cadena.sql`        | Grupo Costa · 6 locales en 2 areas              | Obliga a que todo nazca pensando en varios locales, desde M1    |

Las dos marcan todo con `es_ejemplo = true`. Ese campo es el que, en M5, permite
borrar los datos de ejemplo con un solo boton sin tocar nada real.

Las dos son idempotentes: ejecutarlas dos veces no duplica nada.
