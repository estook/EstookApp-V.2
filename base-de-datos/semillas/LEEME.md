# Semillas

Tres, y se cargan en orden alfabetico con `pnpm bd:sembrar`:

| Semilla             | Que monta                                               | Para que sirve                                                  |
| ------------------- | ------------------------------------------------------- | --------------------------------------------------------------- |
| `cadena.sql`        | Grupo Costa · 6 locales en 2 areas                      | Obliga a que todo nazca pensando en varios locales              |
| `independiente.sql` | Bar Centro · 1 organizacion, 1 local, sin areas         | El caso mas comun. Comprueba que no se ensena la palabra «area» |
| `personas.sql`      | 7 personas, sus membresias, un recorte y unas politicas | El caso de aceptacion de M1                                     |

## Quien es quien

**Bar Centro**, el bar independiente:

| Persona | Rol      | Que ve              |
| ------- | -------- | ------------------- |
| Rosa    | gerente  | todo su local       |
| Marcos  | cocinero | ningun importe      |
| Sara    | camarero | su turno y poco mas |

**Grupo Costa**, la cadena:

| Persona  | Rol            | Alcance      | Cuantos locales ve  |
| -------- | -------------- | ------------ | ------------------- |
| Elena    | direccion      | organizacion | los 6               |
| Ignacio  | area_manager   | Zona Norte   | **exactamente 3**   |
| Luis     | jefe_de_cocina | Bar Puerto   | 1                   |
| Asesoria | gestoria       | organizacion | los 6, solo lectura |

Ignacio es el criterio de terminado de M1, sembrado: «un area manager ve
exactamente sus tres locales».

Ademas hay un recorte de ejemplo: a Luis se le quita `accion.cerrar_recuento` en
el Bar Puerto, porque alli lo cierra el gerente.

## Reglas

- Todo lo sembrado lleva `es_ejemplo = true`. Ese campo es el que, en M5, permite
  borrar los datos de ejemplo con un solo boton sin tocar nada real.
- Las tres son idempotentes: ejecutarlas dos veces no duplica nada, y hay una
  prueba que lo comprueba.
- Los correos son `@ejemplo.estook.com`, que no existe. Nunca datos de nadie real.
