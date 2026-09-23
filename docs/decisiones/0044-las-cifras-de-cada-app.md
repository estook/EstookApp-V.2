# 0044 · Las cifras de cada app: la misma tarjeta, las mismas cuentas, y cuándo es llegar tarde

**Fecha:** 23 de septiembre de 2026
**Estado:** en producción desde el 23 de septiembre de 2026 (#64, migración `0040` aplicada). **En Inventario, «Cómo va» pasó arriba del todo el mismo día**: lo decidió Richi y está en la [0045](0045-el-aspecto-y-el-orden.md), apartado «Seis»
**Amplía:** [0039](0039-el-panel-se-monta-como-un-movil.md) (los indicadores del Panel)
**Migración:** `0040_cuando_es_llegar_tarde`

## De dónde sale

La mejora 2 de [`mejoras-antes-de-m8.md`](../mejoras-antes-de-m8.md): «flechas y
gráficas pequeñas también en Inventario, Servicio y Equipo». El plan ya decía cómo
—«no se copia la tarjeta: se usa la misma»— y dejaba tres preguntas de producto sin
contestar. Richi las contestó el 23 de septiembre de 2026:

| Pregunta                                  | Lo que decidió                                                                                                                                                   |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ¿Dónde van las cifras dentro de cada app? | **En la primera pantalla**, debajo de lo urgente: Inventario · Hoy, Servicio · Cierre y Equipo · Hoy. El punto 3 —cada app abre con su resumen— se apoya en esto |
| ¿Las elige cada persona?                  | **No: siempre las mismas por app**, y cada uno ve las que su rol le deja. Para elegir y colocar las suyas está el Panel                                          |
| ¿Desde cuándo es llegar tarde?            | **Cinco minutos de fábrica, y cada local lo cambia** en Ajustes                                                                                                  |

## Lo que se decide

### Uno · Una sola tarjeta, en `@estook/ui`

`TarjetaDeIndicador` pasa de la aplicación a `@estook/ui` y la usan el Panel y las
tres apps. Solo pinta: los datos llegan hechos de `un_indicador`. Lo que queda en la
aplicación es leerla —con el permiso de quien pregunta— y adónde lleva cada una
(`ganchos/usarElIndicador.ts`). El selector «7 días · 30 días» también pasa a
`@estook/ui` (`ElegirPeriodo`), y el periodo elegido se recuerda en el aparato.

### Dos · Seis cifras más, con la forma de las seis de antes

| App        | Cifras                                             | Las nuevas                                   |
| ---------- | -------------------------------------------------- | -------------------------------------------- |
| Inventario | Valor de la cámara · Merma · Compras · Bajo mínimo | `valor-camara`, `bajo-minimo`                |
| Servicio   | Ventas · Ticket medio · Food cost · Cajas cerradas | `cierres`                                    |
| Equipo     | Horas del equipo · Coste de personal · Retrasos    | `horas-equipo`, `coste-personal`, `retrasos` |

Están en `LAS_CIFRAS_DE` (dominio) y, como las demás, se pueden poner también en
el Panel. Lo que pide cada una está en `LO_QUE_PIDE_EL_INDICADOR`, y el servidor lo
vuelve a comprobar.

### Tres · Ninguna se cuenta por su cuenta

Una cifra con flecha que no cuadra con la pantalla de la que sale es peor que
ninguna. Por eso:

- **El valor de la cámara y el bajo mínimo son una foto de cada día**, no una suma:
  lo que hay no se acumula, se tiene. El periodo vale lo del último día y se compara
  con lo del último día del periodo anterior. Se reconstruye del libro —`lasFotosDeLaCamara`,
  en el dominio— con **las mismas reglas que Inventario · Hoy**: coste medio, lo que
  entró sin coste a su precio de hoy, lo negativo no resta, y el bajo mínimo es la
  lista de atención. Y lo que hay un día es **la última línea del libro por orden de
  apunte**, como la vista `existencias`, no por fecha.
- **Las horas y el coste del equipo se cuentan como el Resumen de Equipo**: la misma
  gente, el total de cada persona redondeado una vez, y la retribución vigente al
  final del periodo.
- **Los retrasos los cuenta una sola pieza** (`lasEntradasDelHorario`) que usan la
  cifra y el Resumen, que gana su columna de retrasos persona a persona.

Cada una tiene su prueba contra la base que compara con la pantalla de origen
(`las-cifras-de-cada-app.prueba.ts`). La de la cámara se vio fallar con el cálculo
roto (regla 27): sin el producto que entra sin coste, la prueba no cazaba el fallo, y
por eso lleva uno.

### Cuatro · Qué es un retraso

- La hora de entrada es la del **horario de siempre** (`horario_habitual`, 0027) de
  esa persona en ese local, vigente ese día y del día de la semana **de la jornada**.
- El fichaje que le corresponde es **el más cercano** a esa hora en las tres horas de
  alrededor. Así una jornada partida casa cada entrada con su fichaje, y volver del
  descanso no cuenta como llegar tarde al turno de la mañana.
- **Es retraso pasar del margen, no llegar a él** (`llegoTarde`): con cinco minutos,
  las 9:05 es a tiempo y las 9:06, tarde. En minutos enteros, como se lee un reloj.
- **Una entrada sin fichaje no es un retraso: es una ausencia**, y eso es de
  Horarios (entrega H), con el cuadrante.
- **Sin horario puesto no hay retrasos «cero»: no se sabe.** Un equipo sin horarios
  saldría perfecto, que es lo contrario de lo que se sabe.
- El margen vive en `local.margen_de_retraso_minutos` (0040), de 0 a 60, y lo cambia
  quien lleva el local (`app.ajustes` y la política `local_edicion`). **Cambiarlo
  vuelve a contar también los días de antes**: un retraso no se apunta, se cuenta
  al mirar.

## Lo que no se hace, y por qué

- **Guardar una foto diaria de la cámara.** Sería un segundo dueño de lo que ya
  guarda el libro, y el día que alguien corrigiera un movimiento de hace una semana,
  las dos dirían cosas distintas.
- **Guardar los mínimos con su historia.** Hoy se guardan como están. Los días de
  antes se cuentan con los mínimos de hoy, y lo dice el origen de la cifra, al pie de
  la tarjeta en el Panel.
- **Las ausencias.** Necesitan saber quién tenía que venir, y eso es el cuadrante (H).

## Lo que se encontró de paso

**Nada refrescaba las cifras con flecha al cambiar algo.** La caché guarda cada
lectura un minuto, y ni cerrar la caja, ni apuntar una merma, ni fichar avisaban a
`un_indicador`. En el Panel se notaba poco; con la fila en la misma pantalla que la
acción se habría notado enseguida. Ahora cada sitio que ya refrescaba «Hoy», el
Resumen o los cierres refresca también las cifras.
