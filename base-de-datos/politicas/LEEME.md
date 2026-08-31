# Politicas de seguridad

Las politicas viven en las migraciones, que es donde tienen version y reversion
(`0008_politicas_de_seguridad.sql`). Esta carpeta guarda el mapa legible: quien ve
que, en una tabla.

## De donde cuelga todo

Todo se escribe contra dos funciones, **nunca** contra un identificador que mande
el cliente:

- `estook.locales_visibles()` — los locales que alcanza quien pregunta.
- `estook.organizaciones_visibles()` — sus organizaciones.

Quien pregunta se declara al abrir la conexion:

```sql
set local estook.persona_id = '...';
```

Si nadie lo declara, `persona_actual()` devuelve vacio y **no se ve nada**. Es el
fallo seguro, y hay una prueba que lo comprueba.

## Por que son SECURITY DEFINER

`locales_visibles`, `organizaciones_visibles`, `personas_visibles` y las dos de
nivel de permiso se ejecutan con los privilegios del dueno. Sin eso, la politica
de `membresia` llamaria a una funcion que consulta `membresia`, que volveria a
aplicar la politica: recursion infinita y desbordamiento de pila. Paso de verdad
al escribir M1, y por eso esta anotado aqui.

## El mapa

| Tabla                              | Se lee si...                                        | Se escribe si...                                  |
| ---------------------------------- | --------------------------------------------------- | ------------------------------------------------- |
| `organizacion`                     | tienes una membresia vigente en ella                | `app.ajustes` en ver y editar                     |
| `area`                             | ves su organizacion                                 | `accion.gestionar_locales`                        |
| `local`                            | **esta en tus `locales_visibles`**                  | `accion.gestionar_locales`                        |
| `persona`                          | eres tu, o comparte organizacion contigo            | solo te editas a ti                               |
| `membresia`                        | es tuya, o es de una organizacion que ves           | `accion.invitar_personas`                         |
| `recorte_de_permiso`               | su local esta en tus `locales_visibles`             | `accion.invitar_personas` en ese local            |
| `auditoria`                        | es de tu organizacion, y su local lo ves            | anadir siempre; **modificar y borrar, nunca**     |
| `traduccion`                       | es de una organizacion que ves                      | igual                                             |
| `dispositivo`                      | es tuyo, o esta en un local donde gestionas accesos | igual, pero en ver y editar                       |
| `politica_de_catalogo`             | es de una organizacion que ves                      | `accion.catalogo_maestro`                         |
| `rol`, `permiso`, `permiso_de_rol` | siempre: son datos de referencia                    | nunca desde la aplicacion; solo con una migracion |

## Lo que NO protegen las politicas

Las politicas deciden **que filas** se ven. **Que campos** de esas filas se envian
lo decide la API con la matriz de permisos: un cocinero ve la fila de un producto,
pero no recibe el campo de coste. Eso es M2.

Dicho de otro modo: aqui esta el aislamiento entre locales y organizaciones. El
recorte fino por rol vive un piso mas arriba, y tambien en el servidor.

## Sobre `force row level security`

A proposito **no** esta puesto. Forzarla la aplicaria tambien al dueno de las
tablas, que es quien ejecuta migraciones y semillas, y se quedaria sin poder
sembrar. No hace falta: la API se conecta como `estook_api`, que no es el dueno y
a quien las politicas si le aplican. Las pruebas hacen `set role estook_api` por
esa misma razon.
