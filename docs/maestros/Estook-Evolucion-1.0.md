---
titulo: Evolución de producto 1.0
tipo: Documento de dirección
fecha: Septiembre de 2026
nota: De aplicación de gestión a sistema operativo del restaurante. Qué cambia, qué no se toca, qué dice el mercado y en qué orden se construye. Se lee antes que los otros cuatro.
---

# Para qué existe este documento

Estook tiene cuatro documentos maestros escritos y una arquitectura construida hasta M4. **Este documento no los sustituye ni los contradice.** Dice hacia dónde evoluciona el producto y cómo se integra esa evolución en lo que ya está.

Se escribe aparte, y no repartido por los otros cuatro, por una razón práctica: quien construya Estook —que será en su mayor parte una IA— necesita poder leer **en un solo sitio** qué ha cambiado de dirección, sin tener que deducirlo comparando versiones de cuatro documentos de sesenta páginas.

## Cómo se leen los cinco documentos

| Documento                  | Qué responde                       | Cuándo se lee                 |
| -------------------------- | ---------------------------------- | ----------------------------- |
| **Evolución 1.0** (este)   | Hacia dónde va y en qué orden      | Primero, siempre              |
| **Manifiesto**             | Qué es el producto y cuánto cuesta | Antes de diseñar una pantalla |
| **Plan de desarrollo**     | Cómo se construye y con qué reglas | Antes de escribir código      |
| **Roles y administración** | Qué ve exactamente cada persona    | Antes de tocar permisos       |
| **Auditoría de flujos**    | Qué desencadena cada cambio        | Antes de cerrar un módulo     |

Regla de precedencia, para cuando dos documentos parezcan decir cosas distintas: **manda el más específico**. Si este documento dice «el Panel prioriza alertas» y el Manifiesto describe el catálogo de widgets, no hay contradicción: el catálogo sigue, y encima se prioriza. Si de verdad hay contradicción, se para y se pregunta (regla 13).

---

# 1 · La única regla que cambia de golpe

## El presupuesto de 250 KB deja de ser una norma

Hasta ahora, B7 del Plan decía: «paquete inicial de la app, menos de 250 KB comprimido», y «un módulo que no cumple su presupuesto no está terminado».

**Eso deja de ser una norma y pasa a ser una medida.**

El tamaño se sigue midiendo en cada cambio con `pnpm tamano`, se sigue vigilando y se sigue optimizando. Lo que ya no ocurre es que un número condicione el producto: si una pantalla necesita una librería que la hace mejor, entra, siempre que haya una razón técnica escrita y el rendimiento siga siendo correcto.

Lo que **no** cambia, y sigue siendo norma dura, es el presupuesto de **velocidad**:

| Acción                       | Objetivo | Sigue siendo norma           |
| ---------------------------- | -------- | ---------------------------- |
| Abrir una app desde la rueda | 200 ms   | Sí                           |
| Panel con un año de datos    | 1 s      | Sí                           |
| Ficha técnica                | 300 ms   | Sí                           |
| Buscador universal           | 150 ms   | Sí                           |
| Carta digital en 4G          | 1 s      | Sí                           |
| Paquete inicial de la app    | 250 KB   | **No. Se mide y se informa** |

La diferencia importa: lo que el usuario nota es el tiempo, no los kilobytes. Un paquete de 400 KB que abre en 180 ms es mejor producto que uno de 240 KB que abre en 600 ms.

> **Cómo se aplica.** `pnpm tamano` deja de devolver error cuando se pasa del presupuesto: informa, dice cuánto y en qué app, y sigue. La integración continua no se bloquea por tamaño. Sí se bloquea, como siempre, por tipos, lint, dependencias, pruebas y velocidad.

Y sigue en pie la regla de dependencias: **ninguna dependencia nueva sin justificarla por escrito**. Que el tamaño ya no mande no significa que se instale cualquier cosa.

---

# 2 · El nuevo concepto

Estook deja de describirse como «la aplicación de gestión de tu restaurante» y pasa a ser **el sistema operativo del restaurante**: gestión, datos conectados, automatización e inteligencia de negocio.

```
                        ESTOOK
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
     PERSONAS          OPERACIONES         NEGOCIO
        │                  │                  │
     Equipo             Inventario         Gastos
     Horarios           Escandallos        Ventas
     Fichajes           Carta              Analitica
     Vacaciones         Servicio           Rentabilidad
                        Documentos
                           │
                           ▼
                       FOGON IA
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
           ANALIZA      PREDICE      PROPONE
              │            │            │
              └────────────┼────────────┘
                           ▼
                      AUTOMATIZA
                           │
                           ▼
                     API / DATOS
                           │
              TPV · ERP · DELIVERY · etc.
```

**Lo que no cambia:** Estook no es un TPV y no lo va a ser. El TPV cobra. Estook controla todo lo que ocurre alrededor del cobro. Esa frontera es la que hace posible que un TPV se integre con nosotros en vez de vernos como competencia, y el mercado ya demuestra que es la frontera correcta (capítulo 3).

**Lo que sí cambia** es la ambición de lo que hay dentro de esa frontera. Antes: ocho apps que hacen bien su trabajo. Ahora: ocho apps conectadas de tal forma que **cada dato nuevo hace más inteligente al resto del sistema**.

## El efecto en cadena, que es el producto

```
Proveedor sube el precio del aceite
        ↓
Inventario detecta el coste nuevo
        ↓
Escandallos recalcula los platos afectados
        ↓
Carta recalcula su rentabilidad
        ↓
Negocio detecta la caida de margen
        ↓
Fogon analiza el impacto
        ↓
Panel genera la alerta
        ↓
Fogon recomienda la accion
        ↓
El gerente decide
        ↓
Estook registra el cambio
```

Esto **ya está diseñado** en la Auditoría de flujos, parte 2. Lo que la evolución añade no es la cascada: es que la cascada termine en una alerta accionable y en una recomendación, en vez de terminar en un número que alguien tiene que ir a mirar.

> No queremos más funcionalidades aisladas. Queremos que cada dato nuevo haga más inteligente al resto de Estook.

---

# 3 · Lo que dice el mercado

Investigado en septiembre de 2026. Importa porque decide precio, posicionamiento y qué hay que construir antes.

## Hay dos categorías, y no somos la que parece

La confusión típica es meter a Estook en el saco de los TPV. No lo es, y los precios lo demuestran:

**Categoría 1 · TPV** — cobran, imprimen comandas, gestionan mesas.

| Producto   | Precio al mes                           | Nota                         |
| ---------- | --------------------------------------- | ---------------------------- |
| Glop       | desde 20 € (o pago único 130-290 €)     | Windows, base de datos local |
| Ágora      | 32-40 € + módulos                       | Windows con nube opcional    |
| Camarero10 | desde 39,90 €                           | Nube                         |
| Last.app   | 45-160 € (Starter / Growth / Unlimited) | Nube, 250+ integraciones     |
| Revo XEF   | 50-70 €                                 | iPad y nube                  |
| Foodeo     | 35-80 €                                 | Cuatro planes                |
| Square     | gratis + 1,15 % por transacción         | Comisión en vez de cuota     |

**Categoría 2 · Gestión de cocina y back-office** — inventario, escandallos, coste real. **Aquí es donde está Estook.**

| Producto            | Precio al mes                                | Nota                                                 |
| ------------------- | -------------------------------------------- | ---------------------------------------------------- |
| **Estook Esencial** | **49 € / local**                             | Publicado                                            |
| **Estook Pro**      | **79 € / local**                             | Publicado                                            |
| Gstock              | **no publica precio**                        | Cuatro versiones: Zero, One, Premium, Premium+Ventas |
| MarketMan           | 199-239 $ / local                            | Entrada por el plan Operator                         |
| Apicbase            | **no publica precio** · ~160-249 € estimados | Enfocado a grupos y cocinas centrales                |
| Mapal / Easilys     | a medida                                     | Colectividades y compra centralizada                 |

## Los cinco hallazgos que cambian decisiones

**1 · Los dos competidores directos esconden el precio.** Gstock manda a «solicitar acceso y tarifas»; Apicbase tampoco publica. Para un bar de veinte mesas, pedir presupuesto es una barrera que muchos no cruzan.

_Qué hacemos:_ precio público, en la web, con la calculadora delante. Es una ventaja real y **cuesta cero construirla**.

**2 · Somos entre tres y cinco veces más baratos que el comparable internacional.** MarketMan cobra unos 220 € por local; Apicbase, en ese entorno. Estook Pro son 79 €.

_Qué hacemos:_ no bajar el precio. Nuestro coste por local es de unos 4 €, así que a 49 y 79 € el margen ya es del 90 %. Lo que hay que hacer es **decir el precio del comparable en la comparativa**, porque nos favorece.

**3 · Last.app se integra con Apicbase y con Gstock.** No compite con ellos: los enchufa. Un TPV moderno quiere un back-office conectado, no construirlo.

_Qué hacemos:_ dos cosas. Ser integrables como ellos —eso es la API pública, y sube de prioridad— y **dejar de ver a los TPV como rivales en la web pública**. La frase «no cambias de TPV» pasa de ser una objeción resuelta a ser el argumento principal.

**4 · La IA de la competencia se queda en previsión de demanda.** Apicbase predice qué pedir cruzando ventas, stock y plazos de proveedor. Es útil, y es todo. Nadie explica _por qué_ un margen ha caído, ni cruza las quejas de las reseñas con el cuadrante, ni encadena una subida de precio hasta la alerta.

_Qué hacemos:_ ahí está Fogón, y ahí está el producto. La previsión de pedido la tenemos que tener porque es la mesa de juego (capítulo 7); lo que nos separa es la cadena completa y la explicación.

**5 · El moat de Last.app son 250 integraciones.** En su categoría, quien se conecta con todo gana.

_Qué hacemos:_ asumir que en la nuestra pasa lo mismo, y que las integraciones son producto y no un apaño. Por eso suben en el orden de implementación.

## Dónde queda Estook

| Producto            | Precio                | Qué es                                                     |
| ------------------- | --------------------- | ---------------------------------------------------------- |
| Yurest · Cuiner     | desde 40 €            | TPV o personal, alcance corto                              |
| **Estook Esencial** | **49 €**              | Gestión completa con IA                                    |
| ia.rest             | 59 €/local            | TPV con IA                                                 |
| **Estook Pro**      | **79 €**              | Todo automatizado con IA potente                           |
| Gstock ONE          | ~82 € (no publicado)  | El comparable directo, sin carta, calendario ni auditorías |
| Gstock Premium      | ~124 € (no publicado) | Informes y analítica de proveedores                        |
| MarketMan           | ~220 €/local          | Internacional                                              |
| Apicbase            | ~160-249 €            | Internacional, para grupos                                 |

La posición no cambia respecto al Manifiesto, y la investigación la confirma: **no somos los más baratos, somos los que hacen más**, y encima somos los únicos que dicen lo que cuestan.

---

# 4 · Las ocho apps: la pregunta de cada una

Las ocho apps se mantienen, y el Panel sigue siendo el centro de entrada. Lo que se añade es que **cada app tiene que responder a una pregunta concreta** y su pantalla de inicio se ordena por esa pregunta.

| App             | Su pregunta                                                                             |
| --------------- | --------------------------------------------------------------------------------------- |
| **Inventario**  | ¿Qué tenemos? ¿Qué nos cuesta? ¿Dónde lo compramos? ¿Qué se está acabando? ¿Qué caduca? |
| **Escandallos** | ¿Cuánto cuesta de verdad cada plato? ¿Qué margen deja? ¿Qué ha cambiado?                |
| **Carta**       | ¿Qué vendemos? ¿A qué precio? ¿En qué canal? ¿Qué funciona? ¿Qué pierde dinero?         |
| **Calendario**  | ¿Qué pasa hoy? ¿Quién trabaja? ¿Qué tareas, entregas, limpiezas o eventos hay?          |
| **Equipo**      | ¿Quién trabaja? ¿Cuándo? ¿Cuántas horas? ¿Cuánto cuesta? ¿Qué tiene que hacer?          |
| **Servicio**    | ¿Qué está pasando hoy? Ventas, APPCC, mermas, jornada, cierres, consumo                 |
| **Negocio**     | ¿Cómo va el restaurante? ¿Dónde se pierde dinero? ¿Qué funciona? ¿Qué debería cambiar?  |
| **Cuaderno**    | ¿Qué ha ocurrido? ¿Qué hay que revisar? ¿Qué debe saber el turno siguiente?             |

Sigue en pie la regla del Manifiesto: **cada app se siente una app**, con su icono, su acento, su navegación, su buscador, su historial y sus pendientes.

---

# 5 · El Panel, de tablero a centro de control

El Panel deja de ser un tablero de información y pasa a ser un centro de control. La diferencia cabe en una pregunta: no «¿cómo va todo?», sino **«¿qué necesita mi atención ahora?»**.

```
ESTOOK

Buenos dias, Carlos.

HOY
  Ventas previstas        2.840 €
  Personal previsto       1.120 €
  Food cost previsto       28,4 %

⚠ 3 cosas necesitan atencion

  ● Pollo
    Stock critico. Prevision: se agota el viernes a las 20:30.

  ● Carta
    2 platos han caido por debajo del margen objetivo.

  ● Equipo
    Carlos tiene 3 h 20 m mas planificadas que su objetivo semanal.

  [ Ver todo ]
```

## Lo que esto cambia y lo que no

**No cambia:** el catálogo de widgets del Manifiesto sigue entero, se siguen arrastrando y colocando, se sigue guardando por persona y por dispositivo, y se sigue pudiendo fijar cualquier cosa desde cualquier app.

**Sí cambia el orden.** Por encima de los widgets hay ahora una zona fija de atención, que no se puede quitar y que se ordena sola por prioridad. Debajo, el Panel de cada uno.

**Y cambia la regla de composición:** cada rol arranca con lo suyo, que ya estaba definido, pero la zona de atención también es distinta por rol. Un cocinero no ve «margen bajo objetivo»: ve «tres fichas nuevas y dos cosas que caducan». El detalle, en el documento de Roles.

Sigue en pie, sin excepción, la regla que más importa: **cada número lleva debajo de dónde sale y de qué periodo es.**

---

# 6 · Estook Pulse

Un concepto transversal, que vive en el Panel y en Negocio: **la salud del restaurante en un número, con su explicación**.

```
ESTOOK PULSE

SALUD DEL NEGOCIO

████████░░  82 / 100

  Ventas          ↑ 12 %
  Food cost       ↓  3 %
  Personal        →  1 %
  Margen          ↑  5 %

PROBLEMAS
  ⚠ Pollo bajo minimo
  ⚠ Aceite +12 %
  ⚠ Martes -23 % en ventas

OPORTUNIDADES
  · Reducir personal el martes de 22:00 a 00:00
  · Revisar el precio de 2 platos
  · Cambiar de proveedor de aceite
```

## La regla que hace que Pulse no sea humo

> **Nunca se enseña un número solo.** El sistema siempre explica por qué una métrica está en verde, en amarillo o en rojo, y qué la mueve.

Un indicador de salud que no se puede desmontar en sus componentes es un adorno. Pulse tiene que poder abrirse y decir: 82 sale de estos cinco componentes con estos pesos, y el que te está bajando la nota es este.

Esto tiene precedente en el propio producto: el indicador de **salud de los datos** ya se definió así en la Auditoría de flujos (hallazgo 12), con cinco componentes, sus pesos y «se enseña siempre qué falta para subirlo, no solo la nota». Pulse se construye con la misma disciplina, y **son dos indicadores distintos que no se mezclan**:

|              | Salud de los datos                             | Estook Pulse                      |
| ------------ | ---------------------------------------------- | --------------------------------- |
| Qué mide     | Si Estook tiene lo que necesita para funcionar | Cómo va el negocio                |
| Para quién   | Todos, sobre todo al arrancar                  | Gerencia, dirección, area manager |
| Si sale bajo | Falta configurar cosas                         | Hay un problema en el restaurante |

---

# 7 · Las capacidades nuevas de cada app

Lo que la evolución añade dentro de cada aplicación. Todo respeta la arquitectura existente: las flechas siguen yendo en un solo sentido y nadie crea una segunda fuente de verdad.

## Inventario predictivo

Inventario deja de ser una lista de cantidades. Añade consumo medio, velocidad de consumo, días restantes, previsión de agotamiento, caducidades, precio histórico, evolución del proveedor, sugerencia de pedido y comparación entre proveedores.

```
POLLO

  Actual              4,2 kg
  Consumo diario      3,1 kg
  Prevision           se agota el viernes a las 20:30

  PEDIDO RECOMENDADO
  35 kg

  Motivo: mantener unos 5 dias de cobertura.
```

**Lo que no se toca:** el stock sigue siendo un libro de movimientos, Inventario sigue siendo la única fuente de verdad del género, y el stock mínimo calculado ya estaba decidido (hallazgo 1 de la Auditoría). Lo nuevo es la **previsión con fecha y hora**, y que la sugerencia de pedido diga su motivo.

## Escandallos con margen explicado

Cada plato enseña PVP, coste, food cost, margen, margen en euros, objetivo y desviación. Y Fogón explica los cambios:

```
ACEITE  +12 %

  Afecta a          7 platos
  Bajo objetivo     2 platos
  Impacto maximo    -3,8 puntos de margen
```

**Lo que no se toca:** el sistema de dependencias y el orden de recálculo de la Auditoría (hallazgo 9). Nunca se modifican ventas históricas. Nunca se recalcula el pasado con precios de hoy.

## Carta inteligente

La Carta sigue leyendo de Escandallos y **nunca** se convierte en fuente paralela. Añade rendimiento por plato, margen, food cost, ventas, popularidad, tendencia, rentabilidad, precio recomendado y equilibrio de carta.

```
POPULARIDAD
     ↑
     │  ⭐ ESTRELLA          🔥 POPULAR
     │
     │
─────┼───────────────────────────────→ RENTABILIDAD
     │
     │  ⚠ REVISAR            💰 RENTABLE
     │
```

Fogón clasifica: estrellas, rentables, populares, a revisar y candidatos a retirar. **Nunca retira ni modifica nada por su cuenta.**

Esto extiende la clasificación estrella-caballo-puzzle-perro que ya estaba en M10, no la sustituye.

## Horarios inteligentes

Calendario y Equipo ganan un botón: **generar horario con Fogón**. Se le pide «hazme el horario de la semana que viene» y usa, cuando existan: disponibilidad, contratos, horas objetivo, vacaciones, ausencias, turnos anteriores, ventas históricas, previsión de ventas, eventos, necesidades mínimas de cada puesto y coste laboral.

```
HORARIO PROPUESTO

  Coste estimado         1.184 €
  vs semana anterior      -6,3 %

  COBERTURA
    Cocina                  98 %
    Sala                   100 %

  ⚠ El miercoles falta 1 camarero entre 20:00 y 22:00

  [ Editar ]  [ Aceptar horario ]
```

> **Nunca se publica automáticamente.** El cuadrante propuesto nace en borrador, y publicar es un acto de una persona. Es la regla 10 del Manifiesto aplicada al caso donde más tienta saltársela.

## Documentos inteligentes

Los documentos siguen siendo **salidas** del sistema. Lo que se añade es la entrada por lectura: cuando alguien sube un documento, Fogón lo lee y propone.

```
Subir: contrato_proveedor.pdf

  Fogon extrae
    Proveedor          ·  Fecha de inicio
    Fecha de fin       ·  Condiciones
    Precios            ·  Renovacion

  Y genera aviso: «El contrato vence en 27 dias.»
```

Igual con los albaranes, que ya estaban previstos. La regla no cambia: **Fogón propone la lectura, una persona confirma, y la operación real la ejecuta el dominio.**

---

# 8 · Fogón, de asistente a cerebro

Fogón deja de ser una caja de «pregunta lo que quieras» y pasa a estar presente en todas las apps **trabajando con el contexto de la pantalla en la que estás**.

| Dónde       | Qué dice                                                                   |
| ----------- | -------------------------------------------------------------------------- |
| Inventario  | «El aceite ha subido un 12 %. Afecta a 7 platos y 2 quedan bajo objetivo.» |
| Escandallos | «El coste de esta receta ha subido un 8,2 % desde junio.»                  |
| Carta       | «Este plato vende mucho y tiene uno de los peores márgenes de la carta.»   |
| Equipo      | «El cuadrante actual cuesta un 6,8 % más que la semana pasada.»            |
| Negocio     | «El problema de este mes no son las ventas: es el coste de materia prima.» |

## Lo que Fogón puede hacer

Analizar · resumir · comparar · detectar anomalías · predecir · recomendar · rellenar · generar documentos · proponer acciones · preparar horarios · leer albaranes · analizar cierres · analizar cartas · explicar datos.

## Lo que sigue sin poder hacer, palabra por palabra

Estas reglas **no se relajan** con la evolución. Al contrario: cuanto más hace Fogón, más importan.

1. **Propone y rellena. Una persona aprueba y guarda.** Fogón nunca ejecuta una operación crítica por su cuenta.
2. **Ve exactamente lo que ve quien pregunta.** Un cocinero preguntando por márgenes recibe una negativa. Fogón no puede revelar nada que la persona no pudiera consultar por sí misma.
3. **No calcula.** Los números salen de consultas a la base de datos. Fogón los explica.
4. **Las reglas van en código.** «Bajo mínimo», «caduca en tres días», «plato bajo objetivo», «turno sin cubrir» son condiciones, no opiniones, y no gastan un solo crédito.
5. **No inventa una cifra.** Si el dato no está, lo dice.
6. **El texto que viene de fuera es dato, jamás instrucción.** Reseñas, webs de proveedores, albaranes, notas: ninguno puede cambiar su comportamiento.

Y sigue en pie toda la economía de la parte 19 del Manifiesto: contexto cacheado, cada tarea a su modelo, lo pesado de noche, respuestas frecuentes guardadas, imágenes reducidas, y pedir el dato concreto en vez de la tabla entera.

---

# 9 · El centro de alertas

Un sistema transversal, con una regla que lo distingue de cualquier lista de notificaciones: **una alerta que no se puede accionar no es una alerta, es ruido**.

```
🔔 7

  ● Stock critico
  ● Contrato proximo a vencer
  ● Margen bajo objetivo
  ● APPCC pendiente
  ○ Horario publicado
  ○ Sincronizacion con el TPV completada
```

Cada alerta lleva, sin excepción:

1. **Qué ocurre**
2. **Por qué ocurre**
3. **Qué impacto tiene**
4. **Qué acción se recomienda**
5. **Un botón para actuar**

Fogón prioriza. Y sigue vigente el hallazgo 10 de la Auditoría, que es lo que impide que esto se convierta en ruido: _un aviso cerrado no vuelve hasta que el dato que lo originó cambie; con «ahora no» vuelve en siete días; y nunca hay más de un aviso vivo por causa y producto._

Esto se apoya en el motor de notificaciones de M25 con sus tres niveles, no lo sustituye.

---

# 10 · El chat, conectado al contexto

El chat del equipo se mantiene donde estaba, en la cabecera. Lo que gana es que lo que se escribe pueda convertirse en algo.

Un jefe de cocina escribe «se ha terminado el pulpo». Estook puede ofrecer convertirlo en una incidencia, en un agotado, en un aviso a sala o en una tarea.

> **Con acción explícita, siempre.** Nada de efectos secundarios ocultos: escribir un mensaje no marca un plato como agotado. Se ofrece, y alguien pulsa.

---

# 11 · Integraciones como producto

La filosofía de conexión no cambia: API oficial cuando existe, Estook Enlace para Windows, importación manual como último recurso, con sincronización, idempotencia y estado de conexión a la vista.

Lo que se añade es una **sección propia de Integraciones**, con estados honestos.

```
🔌 INTEGRACIONES

TPV
  ● Agora        Conectado · ultima sincronizacion hace 4 min
  ○ Glop         Conectar
  ○ Last.app     Conectar
  ○ Revo         Conectar

CONTABILIDAD          DELIVERY           PAGOS      OTROS
  Holded                Glovo              Stripe     Google
  Sage                  Uber Eats
  Contasol              Just Eat
```

> **No se enseña una integración que no existe como conectable real.** Tres estados y ninguno miente: **disponible**, **próximamente**, **manual**.

## 11.1 · Uber Eats

Investigado en septiembre de 2026 sobre la documentación oficial. Lo que sigue es lo que la API **ofrece de verdad**, no lo que sería cómodo suponer.

**Cómo se entra.** APIs REST con JSON, autenticadas por OAuth 2.0 con credenciales de cliente que se emiten desde el portal de desarrollador de Uber. Hace falta cuenta de desarrollador, empezar en entorno de pruebas, firmar un acuerdo de licencia y de confidencialidad, y **obtener aprobación de un responsable de Uber Eats**. No es una API abierta: se solicita.

**Los eventos que llegan.** Uber avisa por webhook, y cada petición lleva una cabecera `X-Uber-Signature` que hay que verificar antes de hacer nada con ella.

| Evento                              | Qué significa                              |
| ----------------------------------- | ------------------------------------------ |
| `orders.notification`               | Hay un pedido nuevo                        |
| `orders.release`                    | Ha cambiado el estado de un pedido         |
| `order.fulfillment_issues.resolved` | El cliente ha aceptado un cambio propuesto |

**El detalle que decide la arquitectura.** Al recibir el webhook hay que devolver un `200` con cuerpo vacío para acusar recibo, y **después llamar explícitamente a aceptar o rechazar el pedido en menos de 11 minutos y medio**. Pasado ese tiempo, Uber lo cancela solo.

Eso significa que **el webhook no puede hacer el trabajo**: acusa recibo, encola, y otro proceso trae el pedido completo y responde. Encaja exactamente con la bandeja de salida y la cola de trabajos que ya existen en M2.

**Los endpoints que se usan.**

| Endpoint                                        | Para qué                 |
| ----------------------------------------------- | ------------------------ |
| `GET /eats/order/{order_id}`                    | Traer el pedido completo |
| `POST /eats/orders/{order_id}/accept_pos_order` | Aceptar                  |
| `POST /eats/orders/{order_id}/deny_pos_order`   | Rechazar                 |
| `POST /eats/orders/{order_id}/cancel`           | Cancelar                 |
| `PATCH /eats/orders/{order_id}/cart`            | Corregir el carrito      |

**La arquitectura:**

```
UBER EATS
    ↓  webhook firmado
ESTOOK · verificar firma, acusar recibo 200, encolar
    ↓
TRABAJO · traer el pedido completo por API
    ↓
ADAPTADOR · transformar al modelo interno de pedidos
    ↓
POSTGRESQL
    ↓
Ventas · Inventario · Escandallos · Carta · Analitica · Fogon
```

**Las reglas, que son las de siempre:**

- Los pedidos se transforman **al modelo interno de Estook**. No se crea una estructura paralela: sería una segunda fuente de verdad.
- Idempotencia por identificador de pedido, porque un webhook se reintenta.
- Auditoría, registro de eventos, reintentos y recuperación tras pérdida de conexión.
- Estook puede aceptar, rechazar, cancelar o marcar como preparado **desde su interfaz**, siempre que la API lo permita.
- **Esto no convierte a Estook en un TPV.** Uber Eats es un canal externo; Estook agrega y analiza.

**Y el modelo común**, porque Uber Eats no va a ser el único:

```
Uber Eats ─────┐
               │
Glovo ─────────┤
               ├──→ ADAPTADORES ──→ ESTOOK
Just Eat ──────┤
               │
TPV ───────────┘
```

Cada proveedor tiene su adaptador; todos transforman a los modelos internos.

> **Regla dura para cualquier integración.** No se implementa un endpoint, un permiso, un dato ni una capacidad basándose en suposiciones. Primero se lee la documentación oficial vigente, y solo se usa lo que de verdad está disponible para la integración aprobada.

---

# 12 · La API pública

La API interna ya existe y sigue siendo la separación entre el frontend y el dominio. A medio plazo se prepara una **API pública**.

```
                    ESTOOK API
                         │
       ┌─────────────────┼─────────────────┐
       ▼                 ▼                 ▼
     TPV                ERP             FOGON
       │                 │                 │
       └─────────────────┼─────────────────┘
                         ▼
                    DATOS ESTOOK
```

Para TPV, ERP, contabilidad, herramientas externas, integraciones, desarrolladores, agentes de IA y plataformas de reparto. Y Fogón usa herramientas internas por el mismo camino, de forma controlada.

El hallazgo 3 del mercado sube esto de prioridad: si el TPV líder de España se integra con Apicbase y con Gstock, **quiere integrarse con nosotros**, y para eso hace falta que haya dónde.

---

# 13 · Cadenas y auditorías

## Area manager

**No se toca la arquitectura.** Organización → área → local → persona, y el comportamiento del area manager sigue como está escrito en el documento de Roles.

Lo que se potencia es la **gestión por excepción**, que ya estaba, para que sea lo primero y no una sección más:

```
ZONA NORTE · 4 locales

  Ventas       ↑ 6 %
  Food cost    ↓ 1 %
  Margen       ↑ 2 %

⚠ NECESITAN ATENCION

  PUERTO    Food cost 36,4 % · +5 puntos sobre la media
  PLAYA     APPCC pendiente

  CENTRO    Todo en objetivo
```

Primero lo que se sale. Después se entra al local y se tiene la experiencia completa del gerente.

## Auditorías como motor operativo

El sistema de visitas y auditorías se mantiene entero. Lo que se potencia es su conexión con el resto: una auditoría debe **detectar sola** APPCC incompleto, inventario atrasado, desviación elevada, fichajes anómalos, formación pendiente, documentación incompleta, problemas de stock y tareas sin cerrar.

Y convertir cada problema en **tarea + responsable + fecha**, que es el bucle que ya define el documento de Roles y que es lo que hace que una auditoría sirva para algo.

---

# 14 · Interfaz

## De dónde se copia y de dónde no

De los buenos SaaS verticales, Last.app incluido, se adopta: navegación muy clara, agrupación por flujos de trabajo, menos ruido, funciones contextuales, acciones principales visibles, interfaces distintas según el rol, enseñar solo los módulos disponibles, priorización de tareas y estados muy claros.

> **No se copia diseño, código, textos ni identidad.** Se adoptan patrones, que es otra cosa.

El sistema de diseño de Estook no cambia: charcoal `#111C1F`, naranja `#FF7A00`, fondo `#FAFAF8`, superficie `#FFFFFF`, Montserrat, Lucide, espaciado en múltiplos de 4 y componentes reutilizables.

## El principio que ordena todo lo demás

La aplicación no pregunta **«¿qué tabla quieres modificar?»**. Pregunta **«¿qué quieres hacer?»**.

| Nunca                           | Siempre                      |
| ------------------------------- | ---------------------------- |
| Editar movimiento de inventario | Ajustar lo que hay en cámara |
| Crear entidad turno             | Crear horario                |
| Crear registro de APPCC         | Completar el control de hoy  |

Cero jerga técnica. Ya estaba en el Manifiesto (principio 14) y se mantiene sin cambios.

---

# 15 · Lo que no se toca

Esta lista es tan importante como todo lo anterior. **Ninguna de estas reglas se relaja con la evolución.**

- API separada del frontend
- Lógica de negocio en el dominio
- PostgreSQL
- Seguridad y permisos en el servidor
- Seguridad por filas en todas las tablas
- El stock es un libro de movimientos
- Dinero en céntimos enteros
- Operaciones idempotentes
- Histórico y borrado suave: nada se borra
- Migraciones numeradas y reversibles
- Auditoría de todo lo que toca dinero, permisos o registros legales
- Fecha operativa decidida por el servidor
- Pruebas en las tres capas
- PWA que funciona con red intermitente

Y la pila técnica —React, TypeScript, Hono, PostgreSQL sobre Supabase, TanStack Query, PWA, workers y GitHub Actions— **no se sustituye salvo necesidad demostrable y escrita**.

---

# 16 · En qué orden se construye

No se construye todo de golpe. Este es el orden, y **cada prioridad dice sobre qué módulo del Plan cae**, para que no haya que inventarse dónde va cada cosa.

| #   | Qué                                                                                             | Dónde vive                        | Depende de |
| --- | ----------------------------------------------------------------------------------------------- | --------------------------------- | ---------- |
| 1   | **Rediseño del Panel**: alertas, tareas, métricas, estado del negocio, acciones rápidas y Fogón | M3 ampliado + Panel de M21        | —          |
| 2   | **Fogón transversal** en las ocho apps                                                          | M22                               | 1          |
| 3   | **Inventario predictivo**                                                                       | M6 y M8 ampliados                 | —          |
| 4   | **Escandallos con análisis de margen**                                                          | M9 ampliado                       | 3          |
| 5   | **Carta inteligente**                                                                           | M10 ampliado                      | 4          |
| 6   | **Horarios inteligentes**                                                                       | M14 y M13 ampliados               | 2          |
| 7   | **Estook Pulse**                                                                                | M21                               | 3, 4, 5    |
| 8   | **Sistema de integraciones**: TPV, Uber Eats, Glovo, Just Eat, contabilidad, ERP, pagos         | M18-M20 ampliados, y módulo nuevo | —          |
| 9   | **API pública**                                                                                 | Módulo nuevo                      | 8          |
| 10  | **Cadenas, auditorías y automatización avanzadas**                                              | M24 ampliado                      | 7          |

**Lo que esto significa para el trabajo actual.** M5 (onboarding) sigue siendo el módulo siguiente y **no cambia de sitio**: la evolución no reordena los cimientos. Lo que cambia es que a partir de M6 cada módulo se construye ya con su capa inteligente dentro, en vez de construirlo plano y volver después.

> **Ninguna integración se da por disponible hasta verificar sus requisitos y capacidades reales.** Es la lección del capítulo 11.1 y aplica a las diez.

---

# 17 · Antes de construir cualquier cosa

Esta es la lista que hay que poder responder **antes** de escribir la primera línea. Si falta una respuesta, no se implementa todavía: se pregunta.

## Siempre

1. ¿Qué datos usa?
2. ¿De dónde vienen?
3. ¿Qué otras partes de Estook deberían enterarse cuando cambien?
4. ¿Qué puede automatizar Fogón?
5. ¿Qué tiene que aprobar una persona?
6. ¿Qué permisos tiene cada rol sobre esto?
7. ¿Qué pasa si falla internet?
8. ¿Qué pasa si la operación se ejecuta dos veces?
9. ¿Qué queda registrado en auditoría?

## Y si interviene un servicio externo

10. ¿Qué capacidades ofrece **realmente**?
11. ¿Qué permisos y qué aprobación requiere?
12. ¿Qué datos devuelve?
13. ¿Qué webhooks o eventos proporciona?
14. ¿Qué límites y condiciones tiene?
15. ¿Cómo se autentica y cómo se renueva la conexión?

## Y el orden de trabajo, que no cambia

Leer ESTADO.md → leer los documentos maestros → identificar el módulo afectado → identificar dependencias → revisar el modelo de datos → revisar el contrato de la API → diseñar → implementar → escribir pruebas → probar permisos llamando a la API a pelo → probar en un móvil real → actualizar ESTADO.md.

> Nunca un cambio visual que rompa una regla de dominio. Nunca lógica duplicada. Nunca una segunda fuente de verdad. Nunca una dependencia nueva sin justificarla.

---

# 18 · Cómo sabremos que ha salido bien

El usuario no debe sentir que Estook es «otro programa de gestión». Debe poder decir:

> «Estook sabe cómo está funcionando mi restaurante.»

Y el recorrido que lo hace posible:

```
DATOS  →  INFORMACION  →  ANALISIS  →  PREDICCION  →  RECOMENDACION  →  ACCION
```

La ventaja competitiva no es ninguna función suelta: es que **todas las piezas están conectadas**. Ningún competidor investigado en el capítulo 3 tiene eso, y ninguno lo tiene porque es lo más difícil de construir y lo más fácil de imitar mal.
