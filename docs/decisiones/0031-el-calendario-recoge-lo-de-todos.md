# 0031 · El Calendario recoge lo que pasa en todos los módulos, y cada aviso dice quién lo ve

**Fecha:** 10 de septiembre de 2026
**Estado:** decidido · el modelo y las entregas, en M7; las pantallas, en M14

## Lo que se preguntó, y lo que contestó Richi

La pregunta venía de M6½: **¿los días de reparto son eventos de calendario?** Las
caducidades de M6 lo son, los repartos de M7 también, y el Calendario es M14. Si
M14 nace sin saber que otros módulos quieren escribir en él, hay que rehacerlo.

Richi: «Sí, también, para que lo sepa la gente. Incluso que puedan elegir qué roles
ven algún aviso en el calendario. Es un calendario avanzado: todo lo que sea
necesario, que quede bien sin pasarse, con sentido y buen diseño.»

## Lo que se decide

### Uno · Un solo sitio para todo lo que tiene fecha

Una tabla, `estook.evento_de_calendario`, con lo justo para pintar cualquier cosa:

| Qué           | Para qué                                                                     |
| ------------- | ---------------------------------------------------------------------------- |
| La capa       | entrega · caducidad · turno · APPCC · mantenimiento · aviso                  |
| El origen     | el módulo y la fila de donde sale, para no duplicarlo y seguirle los cambios |
| El local      | como todo: cada uno ve los de sus locales                                    |
| Cuándo        | empieza y acaba, o el día entero                                             |
| Qué dice      | un título corto y, si hace falta, una línea más                              |
| Quién lo ve   | los roles que lo ven; vacío es «todos los que tienen Calendario»             |
| Quién lo puso | en los avisos que publica una persona                                        |

### Dos · Los módulos publican; el Calendario pinta

El Calendario no va a buscar nada a Inventario ni a Compras. **Cada módulo escribe
lo suyo** en la misma transacción, con una reacción
([0014](0014-las-reacciones-entre-modulos.md)), y si su origen cambia o se borra, su
evento cambia o se va con él:

| Módulo  | Qué publica                                                                            |
| ------- | -------------------------------------------------------------------------------------- |
| **M7**  | Las entregas: los días de reparto de cada proveedor y los pedidos con fecha de llegada |
| **M6**  | Las caducidades de los lotes, con una migración que pone las que ya hay                |
| **M14** | Los turnos del cuadrante publicado                                                     |
| **M16** | El APPCC que toca cada día                                                             |
| **M17** | Las revisiones y los vencimientos de los equipos                                       |

### Tres · Los avisos de una persona, con quién los ve

Quien puede editar el Calendario publica un aviso —«Inspección de Sanidad el
jueves», «Cena de equipo el 20», «Mañana se cierra a las 17:00»— y **elige qué
roles lo ven**: toda la plantilla, solo la cocina, solo la sala. **Lo filtra la base
de datos**, como las horas de cada uno ([0025](0025-fichar-pide-donde-y-no-bloquea.md)),
no la pantalla. El aviso lleva escrito quién lo puso, y quien lo ve sabe que es para
él.

### Cuatro · Bien hecho, sin pasarse

- **Cada capa con el color de su app** y su filtro: se enciende y se apaga lo que se
  quiera ver. Ni un color inventado.
- **«Solo lo mío»**: mis turnos, lo que me han publicado a mí, lo de mi partida.
- **Hoy y mañana en el Panel**, que es donde se mira cada mañana.
- **Nada que no se pueda tocar**: un evento de una entrega lleva a su pedido; uno de
  una caducidad, a su producto.
- Lo que no entra: calendarios de terceros dentro de Estook, invitaciones con
  respuesta, recordatorios por evento a gusto de cada uno. Si hacen falta, se deciden
  cuando se vean.

## Qué se construye y cuándo

- **M7:** la tabla y su seguridad por roles; las entregas y las caducidades como
  eventos; y **el widget del Panel «Lo que viene»**, con hoy y mañana, para que la
  gente lo sepa desde el primer día.
- **M14:** las pantallas —mes, semana, día, turnos y tareas—, los avisos con roles,
  las capas y sus filtros, «solo lo mío», las recurrencias y la suscripción desde el
  móvil. **M14 no rehace nada**: pinta lo que ya se publica.

## Cómo quedó en M7 (11 de septiembre)

- **La tabla**, en la migración `0032`: capa, origen y fila de origen —únicos juntos,
  para que publicar dos veces no duplique—, día, hasta cuándo, horas, **los días de
  la semana que se repite**, título, detalle, a dónde lleva, grupo, roles y si ya
  está hecho. Y la migración puso como eventos **las caducidades de los lotes que ya
  había**.
- **Quién ve qué, en la base**: una entrega o una caducidad, quien ve Inventario; un
  aviso, quien tiene Calendario y alguno de sus roles —o quien lo puso, o quien
  edita el Calendario—. `estook.mis_roles_en(local)` dice los roles de cada uno. Un
  aviso que nombra un rol que no existe no se guarda.
- **Lo publican las reacciones**, nunca los comandos: los repartos de cada proveedor
  como un evento que se repite los días que reparte; cada pedido mandado, el día
  que llega —y tachado el día que llegó—; cada lote con fecha, el día que caduca.
  **Un pedido concreto tapa el reparto de ese día**: si el martes llega el pedido 23
  de Makro, no sale además «Reparte Makro».
- **Se despliega en el dominio** (`desplegar`), que convierte lo que se repite en
  días concretos. M14 lo usará igual para pintar un mes.
- **El widget «Lo que viene»**, con hoy y mañana, y la consulta `lo_que_viene`, que
  ya sabe pedir hasta 31 días. Cada línea lleva a su pedido, a su proveedor o a su
  producto.
