# 0026 · La merma tiene motivo y partida, y la apunta quien la rompe

**Fecha:** 10 de septiembre de 2026
**Estado:** decidido y construido en M6½ · migración `0028`

## Lo que se pidió

Un widget para apuntar una merma rápido, en pleno servicio —producto, peso y por
qué: caducado, fallo de receta, comida del personal…—; en Inventario › Hoy, la
merma del día con los días de antes y un «ver a detalle» con la lista entera, sus
precios, un buscador y una exportación por fechas; y que la foto se pueda usar
cuando llegue la inteligencia.

## Lo que había

El tipo de movimiento `merma` existía desde la `0023` y el permiso
`accion.registrar_merma` desde M1, y lo tenían camarero, cocinero, jefe de sala y
jefe de cocina. **No había forma de apuntar ninguna.** Lo que se hacía era una
salida con el motivo escrito a mano, y un texto libre no se suma.

## Uno · Un motivo de una lista cerrada, y su partida

Ocho motivos: ha caducado, estaba malo, se ha caído o roto, ha salido mal, comida
del personal, invitación a un cliente, prueba o cata, y otra cosa —que obliga a
escribir qué pasó—.

Y cada motivo cae en una **partida**, porque «la comida del personal no es merma,
ni las invitaciones: van con motivo propio y como partida aparte, o el food cost
miente» (Manifiesto 28):

| Partida                 | Motivos                               | Qué es            |
| ----------------------- | ------------------------------------- | ----------------- |
| **Pérdida**             | caducado, malo, roto, mal hecho, otra | sube el food cost |
| **Gasto de personal**   | comida del personal                   | coste de personal |
| **Atención al cliente** | invitación, prueba o cata             | gasto comercial   |

La partida la calcula la base (`estook.partida_de_la_merma`) **y** el dominio
(`partidaDe`), y una prueba comprueba que dicen lo mismo para los ocho. La base
exige que toda merma lleve motivo y que nada que no sea merma lo lleve.

## Dos · La apunta quien la rompe

El camarero es quien rompe la copa. La política del libro deja apuntar con
Inventario **o** con el permiso de merma, y en el segundo caso **solo mermas**: una
camarera no puede meter una entrada de género.

Y lo que ve al apuntarla es **lo justo para elegir**: nombre, unidad y cuánto
queda. Ni un precio. El valor de lo perdido solo viaja a quien puede ver precios.

### El fallo que encontró la prueba de la camarera

Todas las pruebas de base de datos pasaban y a la camarera le salía «ese producto
no está». Para que dos apuntes a la vez no se pisen el saldo, el servidor
bloqueaba la fila del producto con `select … for update`, **y en Postgres bloquear
una fila exige poder editarla**. Una camarera no puede editar productos, que es
exactamente lo que tiene que pasar.

Se cambió por un candado de transacción con el nombre del producto
(`pg_advisory_xact_lock`), que no mira permisos. Todos los que apuntan pasan por
el mismo sitio, así que todos siguen esperando en el mismo candado.

## Tres · Dónde se apunta y dónde se mira

- **Se apunta** desde el widget «Merma de hoy», desde la acción rápida, desde el
  − de cada producto y desde Mermas. Tres toques: qué, cuánto, por qué.
- **Se mira** en Inventario › Hoy —la de hoy y una tira con los catorce días de
  antes— y en **Inventario › Movimientos › Mermas**: el periodo, los totales por
  partida, qué productos y qué motivos se llevan más, cada una con quién y cuándo,
  y un buscador.
- **Se exporta** a CSV para la gestoría o una hoja de cálculo, y se imprime —o se
  guarda en PDF desde el navegador— sin barras ni botones. **El parte con el logo
  del local es M11**: la regla 7 dice que un PDF lo compone el servidor, con la
  marca y la paginación de verdad.

## Lo que no se ha hecho, y dónde va

- **La foto**: el botón de cámara está puesto, apagado, y dice que llega con Fogón
  en **M22**, que lee el producto y el peso y propone; una persona confirma.
- **Por voz**: M22.
- **El recuento, la desviación y la calibración**: **M8**, que ahora tiene de dónde
  leer la merma sin adivinarla.
