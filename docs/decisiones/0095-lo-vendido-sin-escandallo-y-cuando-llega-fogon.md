# 0095 · Lo vendido sin escandallo, y cuándo llega Fogón

**Fecha:** 18 de octubre de 2026
**Estado:** decidida entera. La 1, el 18-oct; **la 2, el 18-oct por la tarde**: «como prefieras y como sea más óptimo» → **Fogón en dos mitades**, como se propuso. Cambia el orden de la [0061](0061-el-orden-y-la-infraestructura.md): **Fogón 1 va antes de M10**.
**Sigue:** [0094](0094-la-prueba-de-la-plantilla.md) y contesta las dos preguntas de [`fogon-en-cada-sitio.md`](../fogon-en-cada-sitio.md).

## 1 · El coste de un plato mientras no tiene escandallo

Richi: **es un caso extraordinario** —los platos deberían tener siempre su escandallo—, pero así hay «varias paredes de seguridad»:

1. **Con la primera venta de un plato sin escandallo**, Estook enseña **dos cifras, las dos marcadas «aproximado»**: la de la app (precio sin IVA × tu objetivo de coste, gratis) y **la de Fogón, calculada una sola vez** con lo que sabe del plato. Ninguna de las dos entra en nada real (food cost, desviación, avisos).
2. Al lado, **«Crear escandallo»**, que **hace la persona a mano**, porque es lo más preciso.
3. **Y en Escandallos › desgranar un plato, «Rellenar con Fogón»**, con un aviso claro: **«La IA no es precisa: revísalo y ajústalo antes de guardar»**. Se recomienda usarlo para empezar y luego repasarlo.
4. **El camarero no ve nada**: todo va a la app, a quien lleva Escandallos.

Lo que necesita Fogón (las cifras de Fogón y «Rellenar con Fogón») llega con Fogón. **Lo que no necesita IA llega con M9 · 3** (construido el 18-oct): la línea «sin escandallo» en la ficha del plato de la Carta, y el coste aproximado de la app («~3,30 € aprox.») en la fila de cada plato sin escandallo de Escandallos.

## 2 · Cuándo llega Fogón

Richi: **B**, y «si es necesario y lo ves más viable, adelanta todo el módulo de Fogón… primero tener la app sólida y después ponernos con el TPV».

**Lo que propuso la IA, y Richi aceptó** («como prefieras y como sea más óptimo», 18-oct): **Fogón en dos mitades**, porque una parte de Fogón vive de las ventas plato a plato, que solo da Estook TPV:

| Mitad                    | Qué lleva                                                                                                                                                                                                                                                                                                                                                     | Cuándo                                    |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| **Fogón 1 · La base**    | Lo que funciona **con los datos que ya hay**: la llamada al modelo en el servidor, el tope de gasto, los créditos y su medida; preguntar a Fogón en cualquier pantalla; «Rellenar con Fogón» y los pasos de la ficha; albaranes, mermas y el cierre **por foto**; la merma por voz; revisar los datos; borradores de pedido y de cuadrante; responder reseñas | **Justo después de M9 · 3**, antes de M10 |
| **Fogón 2 · Con ventas** | Lo que necesita ventas plato a plato: el análisis del cierre, «¿cuánto preparo mañana?», las propuestas de precio por lo que se vende, la estimación de lo vendido sin escandallo y la desviación explicada                                                                                                                                                   | **Con Estook TPV** (M20)                  |

**Por qué así y no todo junto:** adelantar Fogón entero haría construir la mitad que habla de ventas **sin ventas que mirar**, y se probaría a ciegas. Fogón 1 deja la app «sólida y con IA» antes del TPV, que es lo que pide Richi, y Fogón 2 llega cuando tiene de qué hablar.

**Lo que hace falta de Richi para Fogón 1:** una **clave de la API de Anthropic** puesta como secreto (nunca por el chat) y decidir el tope de gasto del primer mes. Se le pedirá, paso a paso, al empezar. **Antes de construir**, Fogón 1 lleva su plan con sus preguntas, como cada módulo (regla 14 y la prueba de la plantilla).
