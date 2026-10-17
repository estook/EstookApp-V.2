# Cómo detecta Estook lo que se escapa, y cuándo avisa

> **Estado: diseño, sin construir.** Se construye con **M20**, cuando Estook TPV dé las ventas
> plato a plato ([0092](decisiones/0092-las-respuestas-de-m9-3.md)). Lo pidió Richi el 17-oct-2026
> con la respuesta 3C de M9 · 3: **sin porcentajes inventados, sin falsas alarmas, contando con que
> al principio no hay datos para aprender**, y **sin complicar Estook** ([0093](decisiones/0093-como-detecta-estook-lo-que-se-escapa.md)).
> Al final, dos preguntas.

---

## En una página

**Lo que se mira.** Por cada producto, entre dos inventarios: **lo que se gastó de verdad**
(había + entró − queda) frente a **lo que se debía gastar** según lo vendido y sus escandallos,
**quitando lo que ya se sabe por qué salió** (mermas apuntadas, consumo del personal). Lo que queda
es **lo que se escapa**.

**Cuándo avisa.** Solo cuando pasan **los cuatro filtros**, en este orden:

| Filtro                      | La pregunta                                                           | Si no lo pasa                                                |
| --------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------ |
| **1 · Datos fiables**       | ¿Están las ventas de todos los días, los escandallos y los albaranes? | Se enseña, no avisa, y dice **qué falta** para poder vigilar |
| **2 · Lo normal**           | ¿Sabe ya Estook cómo se comporta este producto en tu cocina?          | «Aprendiendo (2 de 3)»: se enseña, no avisa                  |
| **3 · No es lo de siempre** | ¿Se sale claramente de lo normal, o se sale un poco pero se repite?   | Es lo de siempre: no avisa                                   |
| **4 · Cuesta dinero**       | ¿Es de lo que más vale («lo caro» de «Toca contar»)?                  | Sale en el resumen del mes, sin aviso                        |

**Y un quinto caso, aparte: la fuga constante.** Si un producto pierde **siempre** —no un mes
raro, sino todos—, «lo normal» de ese producto ya es perder. Eso no es un aviso: es **una
pregunta, una sola vez**: «El pulpo pierde unos 2 kg al mes. ¿Rinde menos de lo puesto, o se sirve
de más?». Es la calibración, en sencillo (más abajo).

**Lo que no cambia para nadie:** la plantilla **no hace nada nuevo**. Todo sale de lo que ya se hace
—vender en el TPV, contar cuando toca, apuntar mermas, recibir albaranes—. **Nada se bloquea.**
**Nunca señala a nadie.** Y lo ve solo quien cierra inventarios y ve precios.

---

## 1 · Datos fiables: si falta algo, no se avisa

La primera causa de falsas alarmas no es la cocina: son **los datos a medias**
([meez](https://www.getmeez.com/blog/actual-vs-theoretical-food-costs),
[Apicbase](https://get.apicbase.com/food-cost-variance/)). Si un plato se vendió sin escandallo,
Estook cree que se gastó menos de lo que se gastó, y «falta» algo que no falta.

Un producto, en un periodo, es **fiable** si se cumplen las seis:

| Lo que hace falta                                          | De dónde sale                         | Lo hace ya…                     |
| ---------------------------------------------------------- | ------------------------------------- | ------------------------------- |
| **Las ventas plato a plato de todos los días** del periodo | Estook TPV (o la caja con sus platos) | El TPV, solo; sin TPV, a mano   |
| **Todo lo vendido con escandallo** (o vinculado)           | Escandallos                           | Quien lleva la cocina, una vez  |
| **El producto contado al empezar y al acabar**             | Dos inventarios cerrados              | Quien cuenta, con «Toca contar» |
| **Los albaranes del periodo, recibidos**                   | Compras                               | Quien recibe                    |
| **Su precio**                                              | El libro (precio medio)               | Solo, con cada albarán          |
| **Que el periodo no se marcó como «error al contar»**      | «Ya sé por qué» (abajo)               | Quien lo mira, si quiere        |

Si falta alguna, **la diferencia se enseña igual**, en gris y con la frase de lo que falta:
«Para vigilar esto, faltan los escandallos de _Pulpo especial_ y _Croquetas del día_». Con
**«Desgranar»** al lado. Así el aviso que no sale **se convierte en una tarea útil**, no en un
silencio.

**«Todo lo vendido con escandallo» es exigente a propósito** (pregunta 1): un aviso con recetas
incompletas es justo la falsa alarma que se quiere evitar. Lo que se vende tal cual vale como
escandallo (está vinculado), y el artículo libre del TPV no cuenta.

## 2 · Lo normal de cada producto, y el arranque sin datos

**Ninguna cocina cuadra al 100 %**: se pesa a ojo, se cuenta con prisa, una merluza rinde más que
otra. Lo que importa es **si este mes es distinto de lo de siempre en tu cocina**, no de un
porcentaje del sector, que varía del 1,5 al 5 % según el tipo de local y por eso no sirve como
umbral ([meez](https://www.getmeez.com/blog/actual-vs-theoretical-food-costs)).

- **Lo que se aprende de cada producto**: su diferencia típica (la **mediana** de sus últimos
  periodos fiables) y **cuánto suele moverse** (la «desviación absoluta mediana»). Las dos aguantan
  un mal recuento suelto sin descolocarse, que es por lo que se usan
  ([Iglewicz y Hoaglin](https://metricgate.com/docs/robust-z-score-modified/)).
- **Se aprende con los últimos ocho periodos fiables** como mucho: unos dos meses de lo caro, que
  se cuenta cada semana. Así se adapta si cambia el cocinero o la temporada.
- **Hasta tener tres periodos fiables, «Aprendiendo (1 de 3)»**: se ve, no avisa.

**El arranque, semana a semana** (lo caro se cuenta cada semana; lo demás, cada mes):

| Cuándo        | Qué pasa                                                                                               |
| ------------- | ------------------------------------------------------------------------------------------------------ |
| Semana 0      | Empieza Estook TPV y se cierra el primer inventario. No hay nada que comparar                          |
| Semana 1      | Segundo inventario: **la primera diferencia**, a la vista y ordenada por euros. «Aprendiendo (1 de 3)» |
| Semanas 2 y 3 | Se sigue viendo y aprendiendo. **Ningún aviso**                                                        |
| Semana 4      | **El primer aviso posible**, si algo se sale de lo normal                                              |
| Cada mes      | El resumen: **lo que más dinero se ha ido**, aunque nada haya avisado                                  |

**Mientras aprende, no está ciego**: desde la semana 1 se ve lo que más dinero se va, ordenado por
euros. Lo que no hace es **llamar la atención** sin saber si es normal. Un mes malo de verdad se ve
en la lista; lo que no hay es una campana sonando por una cosa que quizá es lo de siempre.

## 3 · No es lo de siempre: dos reglas clásicas

Son las de los **gráficos de control** de la industria desde hace setenta años (las reglas de
[Western Electric](https://en.wikipedia.org/wiki/Western_Electric_rules)), no un número elegido a
ojo:

- **Un salto claro**: un periodo **muy** lejos de lo normal (3,5 veces lo que suele moverse, la
  regla de Iglewicz y Hoaglin). Avisa a la primera.
- **Algo que se repite**: **dos de los tres últimos periodos** bastante lejos (2 veces lo que suele
  moverse) **y del mismo lado** (los dos faltan, o los dos sobran). Avisa al segundo.

**Cuántas falsas alarmas da, honestamente.** Con datos que se portan «como siempre», las dos reglas
juntas saltan por azar en torno a **3 de cada 1.000 periodos** de un producto. Con unos 20 productos
caros contados cada semana, eso es **una falsa alarma cada tres meses o más**, y el filtro 1 quita
más. **Pero esa cuenta supone datos de libro**, y los de una cocina no lo son: por eso, **antes de
encenderlo, se mide** (abajo).

## 4 · Que cueste dinero

**Ordenar por euros, no por porcentaje**: «un 15 % en perejil es ruido; un 4 % en salmón cuesta
miles» ([Apicbase](https://get.apicbase.com/food-cost-variance/)).

- **Solo avisa lo caro**: los productos que suman el 80 % de lo que se gasta. **Es la misma lista
  de «Toca contar»** (M8), que ya existe: no se inventa otra raya, y lo caro es justo lo que se
  cuenta cada semana, así que es lo que antes aprende.
- **Lo demás** sale en el resumen del mes, ordenado por euros, sin campana.

## 5 · La fuga constante, y la calibración en sencillo

Si un producto **pierde siempre**, «lo normal» aprende a perder y las reglas de arriba dejan de
saltar. Por eso se mira aparte: **¿su diferencia típica está claramente lejos de cero?** (con una
prueba estadística estándar sobre la mediana; los detalles, al final).

Si lo está, y es de lo caro, Estook **pregunta una vez**, en una tarjeta de Consumo (no en la
campana):

> **El pulpo pierde unos 2 kg al mes (64 €).** ¿Por qué crees que es?
> **[ Rinde menos de lo puesto ]** **[ Se sirve de más ]** **[ No lo sé ]**

- **«Rinde menos»** solo sale si el producto tiene aprovechamiento (se limpia, se cuece). Propone
  el número: «En tus últimos inventarios rinde un 62 %, no el 70 %. ¿Lo cambio?». **Un toque**, y
  el coste de los platos pasa a ser el de verdad (con la confirmación que ya pide la Auditoría de
  flujos, 2.2).
- **«Se sirve de más»**: **la receta no se toca nunca**. Queda la fuga a la vista en el resumen,
  con lo que cuesta al mes, hasta que deje de pasar.
- **«No lo sé»**: no vuelve a preguntar hasta dentro de un mes.

**Sin ajustes, sin perillas, sin un número que escribir.** Es lo que Richi pidió: la función, sin
complicar Estook.

## 6 · Cómo avisa

- **A quién**: a quien cierra inventarios y ve precios. **De fábrica, solo en la campana** (como el
  aviso de M8, 0079).
- **Cuándo**: **como mucho uno por inventario cerrado**, con todos los productos juntos. Nunca uno
  por producto, nunca de noche.
- **Cómo**: «Para mirar», **no una alarma roja**. Una línea por producto, **lo que cuesta y qué
  mirar**: «Pulpo: faltan 2 kg (64 €). Lo normal en tu cocina es ±0,5 kg. Mira las raciones, la
  merma sin apuntar o el aprovechamiento». El porqué largo, plegado en una «i».
- **«Ya sé por qué»**, opcional, con cuatro motivos: **error al contar** (ese periodo deja de contar
  para aprender), **un evento o invitación**, **merma sin apuntar**, **otra cosa**. Nadie está
  obligado a contestar.
- **Nunca dice quién**: quién contó o recibió está en el libro, no en el aviso (como ya hace M8).

## 7 · Antes de encenderlo, se mide

Con el TPV funcionando, **un mes en silencio**: Estook calcula todo y **no avisa a nadie**. Después se
mira con Richi **cuántos avisos habría dado** y si eran de verdad. Si salen de más o de menos, se
ajusta con esos datos, por escrito, en una decisión. **Es la regla de siempre: primero se mide.**

## 8 · Lo que cambia de lo que ya hay

- **M8 usa dos números fijos** para lo que se vende tal cual: por debajo del **2 %** «cuadra»
  (`LO_QUE_CUADRA`) y **avisa desde el 3 %** ([0079](decisiones/0079-lo-gastado-y-la-desviacion.md)).
  **Siguen hasta M20** —hoy no hay ventas suficientes para aprender nada— y **con M20 se sustituyen
  por esto**, en el mismo sitio (`packages/dominio/src/desviacion.ts`). Un cálculo, un solo sitio.
- **«Aprendiendo hasta el tercer inventario»**, que ya estaba en el Plan, se queda: es el filtro 2.

---

## La auditoría de la sencillez

Richi, 17-oct: «no quiero complicar la app, quiero que sea **un compañero de control** de la cocina,
la sala y los empleados; no quiero que sea restrictivo y que la odien».

### Lo que le pide esto a cada uno

| Quién                    | Lo que ya hace                     | Lo que añade esto                                              |
| ------------------------ | ---------------------------------- | -------------------------------------------------------------- |
| **Camarero**             | Tiquear en el TPV                  | **Nada**                                                       |
| **Cocinero**             | Recibir la comanda, apuntar mermas | **Nada**                                                       |
| **Quien cuenta**         | Contar lo que dice «Toca contar»   | **Nada**                                                       |
| **Quien recibe**         | Recibir los albaranes              | **Nada**                                                       |
| **Jefe de cocina**       | Escandallar los platos             | **Completar los que falten**, si quiere que se vigilen         |
| **Quien lleva el local** | Mirar el Panel                     | **Leer un aviso de vez en cuando**; «Ya sé por qué», si quiere |

### Lo que se ha quitado o escondido para que no pese

- **Ni un ajuste**: no hay umbrales que configurar ni nada que aprender a manejar.
- **Ni un bloqueo**: un aviso nunca para una venta, un pedido ni un inventario.
- **La calibración es una pregunta de tres botones**, una vez, y solo si hay una fuga de verdad.
- **En M9 · 3**, por lo mismo: la tanda sale plegada («¿Es una receta de olla?») y de fábrica todo es
  1 ración; escalar tocando un ingrediente no se ve hasta que tocas una cantidad; y la receta de
  Estook solo se ofrece si tu plato se llama como una de las diez.

### La prueba de la plantilla, para todo lo que venga (pregunta 2)

Antes de construir cualquier cosa, seis preguntas. Si alguna sale mal, se rehace el diseño:

1. **¿Le pide trabajo nuevo a alguien de la plantilla?** Si sí, ¿quién, cuánto, y compensa?
2. **¿Bloquea algo?** Nada que se use en servicio puede pararse por Estook.
3. **¿Se entiende sin formación?** Como mucho una «i».
4. **¿Avisa solo cuando hay algo que hacer**, y dice qué?
5. **¿Funciona con datos a medias?** Dice lo que falta, no se rompe ni miente.
6. **¿Señala a alguien?** Nunca.

---

## Para quien lo programe

- **La diferencia relativa** de un producto en un periodo: `r = (gastado − teórico − explicado) / teórico`,
  en su unidad de uso. Si el teórico es menor que lo que mueve un recuento (el producto casi no se
  vendió), ese periodo no cuenta.
- **Lo normal**: `centro = mediana(r)` y `escala = 1,4826 · DAM(r)` de los últimos 8 periodos fiables
  (mínimo 3). Si la DAM sale 0 (periodos idénticos), se usa la desviación media absoluta · 1,2533.
- **La puntuación**: `z = (r − centro) / escala`.
  - **Salto claro**: `|z| > 3,5`.
  - **Se repite**: dos de los tres últimos con `z > 2` (o `z < −2`), del mismo lado.
- **Fuga constante**: con 4 periodos fiables o más, `|centro| > 2 · 1,253 · escala / √n` (la mediana
  está a más de dos errores típicos de cero), y el producto es de lo caro.
- **Lo caro**: `PARTE_DEL_VALOR_QUE_SE_CUENTA_CADA_SEMANA` de `packages/dominio/src/inventario.ts`, la
  misma lista de «Toca contar».
- **Con M20, el libro ya descuenta lo vendido**: la diferencia del recuento al cerrar un inventario
  **es** lo que se escapa (con el signo cambiado). Se calcula en el dominio, una vez, y lo usan el
  aviso, el resumen y la pantalla de Consumo.
- **Cada constante, con su porqué en el código y en esta página**, y revisable con lo medido en el
  mes en silencio (sección 7).

---

## Las dos preguntas

### 1 · ¿Te vale así?

**De qué va.** Los cuatro filtros y la fuga constante de arriba. La decisión más exigente es la del
filtro 1: **Estook solo vigila cuando todo lo que se vende tiene escandallo**. Ejemplo: si el jueves
sacas unas «Croquetas del día» sin escandallo, ese periodo no avisa, y te dice «falta el escandallo
de Croquetas del día».

- **A** · Así, entero.
- **B** · Más suelto: avisar aunque falte algún escandallo, diciendo cuáles faltan. Avisa antes, pero
  puede dar falsas alarmas (Estook cree que se gastó menos de lo que se gastó).

**Recomiendo A.** Una falsa alarma quita la confianza en todas las demás. **Lo que decides: A o B.**

### 2 · La prueba de la plantilla, ¿al Plan?

**De qué va.** Las seis preguntas de «La prueba de la plantilla». Hoy el Plan tiene las preguntas de
la regla 14 (qué datos usa, quién se entera, qué aprueba una persona…), pero **ninguna pregunta
por el trabajo que le cae a la plantilla ni por si algo bloquea**.

- **A** · Sí: se añaden a la regla 14 del Plan, y cada plan nuevo las contesta.
- **B** · No hace falta.

**Recomiendo A.** Es lo que evita que Estook se vaya complicando sin que nadie lo decida. **Lo que
decides: A o B.**
