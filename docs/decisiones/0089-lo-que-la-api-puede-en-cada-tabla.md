# 0089 · Lo que la API puede hacer en cada tabla, y ni un permiso más

**Fecha:** 16 de octubre de 2026
**Estado:** construido en la rama `los-permisos-de-la-api`, en su pull request. Va **después** del arreglo de M9 · 2 ([0088](0088-todo-el-almacen-y-el-historial-que-solo-crece.md)). Hay que fusionar y migrar (la `0071`); **la API no se despliega**.
**Sigue:** lo que la [0088](0088-todo-el-almacen-y-el-historial-que-solo-crece.md) dejó «para aparte».

## Lo que pasaba

La 0006 dejó puesto que **toda tabla nueva** de `estook` naciera con leer, añadir, cambiar y borrar para la API, y **un `grant` más corto no quita nada: suma** (lección 189). La 0070 lo arregló en las fichas. Mirado en todas: **54 tablas** tenían más de lo que su migración escribió. Cuarenta con un `grant` corto (un fichaje, una reacción o el aviso leído se podían borrar o cambiar) y catorce que **nunca dijeron nada** y vivían del defecto (el producto, los lotes, el recuento…).

La seguridad por filas lo paraba. Esto es **la segunda barrera**, no una urgencia.

## Lo que queda

1. **Una prueba** (`los-permisos-de-la-api`) lee las migraciones en orden, como Postgres, y compara lo que cada tabla **quiso** con lo que la API **tiene**. Sin la 0071 da 54 tablas mal; con ella, ninguna.
2. **La 0071** quita todo y da justo lo escrito, tabla a tabla. A las catorce que no decían nada, **lo que el servidor hace con ellas**, mirado una a una (también `on conflict do update` y `for update`, que piden cambiar).
3. **Lo que no se escribe no se da**: una tabla nueva nace **sin nada** para la API, como ya pasaba en `plataforma`. Su migración tiene que decirlo, y si no, la prueba se pone en rojo.
4. **`bd:comprobar-api`** mira lo mismo contra producción, con las migraciones que la base tiene puestas.

## Lo que decidí al construirlo

1. **Sin nada, y no «solo leer»**, de fábrica. Si una tabla nueva olvidara a la vez su `grant` y su seguridad por filas, «solo leer» dejaría a la API leerla entera, de todos los locales. Sin nada, falla a la primera prueba.
2. **El producto se puede borrar**: «Quitar los ejemplos» se lleva el de mentira, y lo hace con los permisos de quien pulsa (0020, sin privilegio a propósito). Lo cazó la batería entera.
3. **Apuntar un ejemplo en una tabla que la API no puede borrar se para al apuntar**, como ya se paraba una tabla que no existe; si no, el botón fallaría entero el día que alguien lo pulse. Y la 0071 se para sola si en producción quedara alguno así.
4. **La lista vive en un sitio** (`base-de-datos/herramientas/los-permisos-de-la-api.mjs`), y la leen la prueba y la herramienta (lección 185).

## Lo que no se hace, y por qué

- **Las secuencias** siguen con su defecto (usarlas): no cambian datos de nadie.
- **Las funciones**: ya las cerró la 0043.
