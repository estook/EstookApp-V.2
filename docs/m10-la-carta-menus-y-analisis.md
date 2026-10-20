# M10 · La carta, los menús y el análisis

> **Estado: M10 · 1 construida el 20-oct-2026** en la rama `m10-la-carta-que-trabaja` (migración
> 0078, decisión [0102](decisiones/0102-m10-1-la-carta-que-trabaja.md)); en producción cuando Richi
> fusione, migre y despliegue. **M10 · 2 espera las cinco respuestas de Richi** de abajo. Es el
> último módulo antes de Estook TPV ([0061](decisiones/0061-el-orden-y-la-infraestructura.md)): **la
> carta es lo que se va a picar en el TPV**.

## Lo que ya estaba hecho

M9 · 1 se adelantó media M10 ([0086](decisiones/0086-las-respuestas-de-m9.md)): las secciones, los
platos con su foto, los canales con su comisión (Uber Eats) y **el precio de cada plato en cada
canal**. Lo que queda de M10, según el Plan: agotados, el precio al cierre de caja, leer la carta
subida, el equilibrio de la carta, los menús, el menú del día, el análisis de lo que deja cada plato,
el orden como se imprime y la comparación con la zona.

## M10 · 1 · La carta que trabaja (construida)

Lo que **ya estaba decidido por escrito**, pieza a pieza, y por eso se ha construido sin preguntar:

| Pieza                          | Dónde estaba decidido                                                                                                        | Lo que hace                                                                                                                                                                                                                 |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1 · Agotados**               | Auditoría de Flujos 2.4 · Roles 1.12 · Manifiesto cap. 14                                                                    | Dos toques desde el móvil: el plato sale «Agotado» en la carta, avisa al equipo en el chat y **vuelve solo al empezar la jornada siguiente** (o cuando alguien lo quita). No toca el stock. Lo pueden marcar sala y cocina  |
| **2 · El precio en el cierre** | Plan, M10: «y le da el precio al cierre de caja»                                                                             | Al apuntar un plato en el cierre, el importe sale **del precio de sala de la carta**; lo de la última vez queda para lo que no está en la carta                                                                             |
| **3 · Leer tu carta**          | Plan, M10, y [0049](decisiones/0049-almacen-inventario-congelado-tablon-y-carta.md): «4 platos nuevos, 2 precios distintos…» | Subes el PDF de tu carta (o fotos) y Estook propone: **platos nuevos, precios distintos y los que ya no están**. Nada cambia hasta que dices que sí. Un PDF con texto se lee sin IA; una foto o un PDF escaneado, con Fogón |
| **4 · El equilibrio**          | Manifiesto cap. 14, «El equilibrio de la carta» · Plan, M10                                                                  | En Carta › Análisis: cuántos platos por sección, el salto de precios y si falta la franja media, **con los principios de Omnes**, los que usan las escuelas de hostelería                                                   |

### 1 · Agotados

**En la cocina.** A las 22:00 se acaba el pulpo. Hoy alguien grita «¡no hay pulpo!» y siempre hay
un camarero que no lo oye y lo vende. Con Estook, quien lo ve lo marca en el móvil en dos toques, y
al momento: sale «Agotado» en la carta del equipo, llega un aviso al chat de todo el equipo y, al
día siguiente, el pulpo vuelve solo.

- **Quién**: camarero, jefe de sala, cocinero, jefe de cocina y quien lleva el local (Roles, 1.12:
  «cocinero y jefe de cocina son los primeros en saberlo»). Ya tenían el permiso desde M1.
- **Dónde**: en Carta › Carta, la vista **Agotados**; en la ficha de cada plato; y en el «+» de
  abajo, **para la cocina, que no tiene la app Carta**.
- **Hasta cuándo**: de fábrica, **hasta el final de la jornada** (con la hora de corte del local).
  «**Sin fecha**» lo deja agotado hasta que alguien lo quite (el plato de temporada que ya no llega).
- **El aviso**: una tarjeta en «Todo el equipo» con el plato, que se pone al día sola («Agotado» o
  «Ya hay»). Suena en el móvil **solo de quien está fichado** en ese momento: a quien libra no le
  despierta un pulpo.
- **No es merma ni stock** (Auditoría de Flujos, punto 7): un plato puede estar agotado con la
  cámara llena (se ha roto el horno).
- **El recordatorio del TPV**: si el local cierra la caja con un TPV o tiene Uber Eats activo, al
  marcarlo dice «Quítalo también de tu TPV y de Uber Eats»: Estook todavía no está conectado a ellos.

**Lo que todavía no hace, y cuándo:** quitarlo de la carta pública del QR (M12, que enseña la carta
de Estook), del menú del día (M10 · 2) y del TPV y Uber Eats (Estook TPV y Estook Link).

### 2 · El precio en el cierre

Al cerrar la caja a mano y apuntar «Croquetas, 12», el importe ya sale puesto con el precio de sala
de la carta (12 × 9,50 €). Lo que no está en la carta (el «fuera de carta» de hoy) sigue con el
precio de la última vez que se apuntó. Lo que vendió el almacén también sale con el de la carta.

### 3 · Leer tu carta

Carta › **Leer tu carta**: eliges el PDF o haces fotos, y Estook te enseña:

> **4 platos nuevos · 2 precios distintos · 1 que ya no está** · ¿Actualizo tu carta?

Cada línea con su casilla. **Los nuevos y los precios, marcados; los que ya no están, sin marcar**:
puede que Estook no los haya leído bien, y quitar un plato de la carta lo decides tú (se archiva y
se recupera). Las secciones de la carta en papel se crean si no existen.

- **Un PDF con texto** (el de la imprenta o el de Canva) se lee en el móvil, **sin IA y gratis**.
- **Una foto o un PDF escaneado** lo lee Fogón: **3 créditos por página**, hasta 4 páginas.
- Se empareja por el nombre exacto (sin mayúsculas ni acentos): «Croquetas de jamón» y «Croquetas
  caseras» son dos platos. Así, una carta con dos precios cambiados propone **exactamente esos dos**.

### 4 · El equilibrio de la carta

**De dónde salen las reglas.** De los **principios de Omnes**, de los años 60, que se enseñan en las
escuelas de hostelería ([Koust](https://koust.net/en/les-principes-d-omnes/),
[Qamarero](https://qamarero.com/blog/principios-de-omnes-fijacion-de-precios-para-menus/)). Se miran
**por sección**, porque el cliente compara entrantes con entrantes:

| Lo que se mira          | La regla                                                                                          | Un ejemplo                                                                   |
| ----------------------- | ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| **El salto de precios** | El más caro no pasa de **2,5 veces** el más barato (de **3** con más de 9 platos)                 | Entrantes de 6 a 22 €: 3,7 veces. El cliente no sabe dónde se mueve el local |
| **La franja media**     | Partido el rango en tres, **la franja del medio tiene al menos tantos platos como las otras dos** | 10 baratos, 3 medios, 3 caros: el cliente va al barato y el ticket medio cae |
| **El tamaño**           | **De 6 a 12 platos por sección**; más, cuesta comprar y ejecutar bien                             | Una sección de 25 platos: el Manifiesto pide que Estook lo diga              |

Con menos de 3 platos con precio en una sección, no se juzga. **Lo que no se mira todavía:** el
ingrediente que comparten muchos platos y lo de temporada (necesitan que la carta esté desgranada
entera), y la relación calidad-precio de Omnes, que necesita lo vendido plato a plato (M10 · 2).

---

## M10 · 2 · Las preguntas para Richi

Cinco piezas del Plan que **no están decididas** y cambian lo que se construye. Cada una dice de
dónde sale, qué es en la cocina y qué recomiendo.

### Pregunta 1 · El análisis de lo que deja cada plato: ¿ahora, o con el TPV?

**De dónde sale.** Plan, M10: «análisis de rentabilidad por canal (estrella, caballo, puzzle,
perro)», y el Manifiesto, cap. 14.

**Qué es.** Cada plato se pone en un cuadro con dos preguntas: **¿se vende mucho?** y **¿deja mucho
dinero?** Una **estrella** se vende y deja (dale sitio en la carta); un **caballo** se vende y deja
poco (sube el precio o baja el coste); un **puzzle** deja mucho y no sale (empújalo, que lo
recomiende la sala); un **perro** ni se vende ni deja (candidato a quitar). Lo que deja, Estook ya
lo sabe por el escandallo. **Lo que no sabe es cuánto se vende de cada plato.**

**Lo que hay hoy.** Las ventas plato a plato solo llegan si al cerrar la caja se apuntan los platos.
En IKATZ, **1 de 21 cierres** los trae. Y por canal (sala o Uber Eats) no llegan nunca.

**Ejemplo.** Tus croquetas dejan 6 €; si en el cierre no apuntas cuántas se vendieron, Estook no
puede decir si son estrella o puzzle.

- **A · Con el TPV** (como decidiste con la desviación de los platos, 0092): se construye cuando
  Estook TPV dé las ventas de cada plato y de cada canal, solas. Hasta entonces, nada.
- **B · Ya, con los cierres**: sale con los platos apuntados en el cierre de caja, solo en sala, y
  pide apuntarlos cada noche (trabajo nuevo para quien cierra).

**Recomiendo A**: sin ventas de verdad, el cuadro mentiría, y B pide trabajo cada noche.
**Lo que decides: A o B.**

### Pregunta 2 · Los menús: ¿qué menús haces?

**De dónde sale.** Manifiesto cap. 14: «menús y fórmulas con reparto del precio entre componentes
para el margen», y el «menú del día con sus bloques, suplementos y programación».

**Qué es.** Un menú es un precio cerrado para varios platos a elegir: **menú del día, 13,50 €**:
primero a elegir entre tres, segundo entre tres, postre o café, pan y bebida. El «reparto» sirve para
saber **cuánto deja el menú** según lo que elija cada cliente: si todos piden el entrecot de segundo,
el menú puede perder dinero.

**Lo que hay hoy.** Nada: los platos sueltos y su precio.

**Lo que haría.** Carta › **Menús**: crear un menú con su precio y sus bloques («Primeros», «Segundos»,
«Postre»), elegir los platos de cada bloque (con suplemento si lo lleva: «entrecot +4 €») y los días
que se sirve. Y Estook dice **lo que deja en el peor y en el mejor caso**, con los escandallos.

- **A · Menú del día y menús cerrados** (degustación, de grupo) con lo de arriba.
- **B · Solo el menú del día.**
- **C · Ninguno ahora**: IKATZ no hace menús, y se deja para cuando un cliente lo pida.

**Recomiendo A** si en IKATZ o en los locales a los que vas a vender hay menú del día: es lo más
común en España entre semana. **Lo que decides: A, B o C, y si IKATZ hace menú.**

### Pregunta 3 · El menú del día propuesto por Fogón

**De dónde sale.** Manifiesto: «Fogón lo propone cruzando lo que caduca, lo que hay, lo que no se ha
repetido en dos semanas y el margen objetivo».

**Qué es.** El lunes, Fogón te propone el menú de la semana: «Tienes 6 kg de carrillera que caduca el
jueves: lentejas el martes y carrillera el miércoles». Tú lo cambias y lo publicas. **Solo tiene
sentido si la respuesta a la 2 es A o B.** Cuesta créditos de Fogón (5 por propuesta, como dice el
Manifiesto).

- **A · Sí**, con la pregunta 2.
- **B · Después**, cuando los menús lleven un tiempo funcionando.

**Recomiendo B**: primero que el menú se use a mano unas semanas; Fogón propone mejor con historia.
**Lo que decides: A o B.**

### Pregunta 4 · El orden de la carta como se imprime (destacados y columnas)

**De dónde sale.** Plan, M10: «el orden de la carta como se imprime (destacados, columnas)».

**Qué es.** Marcar platos como **destacados** («Sugerencia del chef») y decir cómo va la carta en
papel (a una o a dos columnas). **Lo que ya hay:** las secciones y los platos se ordenan con las
flechas.

**Por qué pregunto.** Lo impreso es de **M11** (las plantillas de carta en PDF), y el QR, de **M12**.
Hacer los destacados ahora, sin nada que los enseñe, es trabajo que no se ve.

- **A · Con M11 y M12**, donde se ven: el destacado sale en la carta impresa y en la del QR.
- **B · Ya**, el destacado con su estrella en la carta del equipo.

**Recomiendo A.** **Lo que decides: A o B.**

### Pregunta 5 · Comparar con los de tu zona

**De dónde sale.** Plan, M10: «comparación con la zona»; Manifiesto: «qué cobran los de al lado por
el menú y por los platos que también tienes tú».

**Qué es.** «Tus bravas a 7 € están 1,50 € por encima de la media de tu calle».

**Lo que hay que saber.** Google no da precios de platos (solo «€€» del local). Para tenerlos hay dos
caminos: **con los locales de Estook** de la zona (anónimo y en medias; hoy hay cinco organizaciones,
no da) o **leyendo las cartas públicas** de los de alrededor (con permiso legal por revisar: es
información de otros negocios).

- **A · Cuando haya clientes suficientes en una zona** (por ejemplo, diez locales en la ciudad), con
  los datos anónimos de Estook.
- **B · Quitarlo del plan.**

**Recomiendo A**, y que el contrato de alta lo diga desde ya (que los precios de la carta cuentan,
sin nombre, para las medias de la zona). **Lo que decides: A o B.**

---

## La regla 14 y la prueba de la plantilla, de M10 · 1

| Pregunta                            | Respuesta                                                                                                                   |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| ¿Qué datos usa?                     | Los platos y sus precios (M9 · 1), la jornada del local, el cierre de caja, el PDF o las fotos de la carta                  |
| ¿Quién más se entera?               | El equipo, por el chat, de un agotado. Nadie más                                                                            |
| ¿Qué automatiza Fogón?              | Leer una foto o un PDF escaneado. **Propone; una persona confirma**                                                         |
| ¿Qué aprueba una persona?           | Cada cambio de la carta leída, con su casilla                                                                               |
| Permisos                            | Agotar: `accion.marcar_agotado` (sala y cocina). Leer y cambiar la carta: Carta para editar. El análisis: quien ve la Carta |
| ¿Sin internet?                      | No: un agotado tiene que llegar a los demás al momento                                                                      |
| ¿Dos veces?                         | Agotar lo agotado lo deja igual (no avisa dos veces); crear un plato que ya está dice «ya estaba»                           |
| Auditoría                           | Marcar y quitar agotados, y cada cambio de la carta leída, en el historial del plato                                        |
| 16 · ¿Trabajo nuevo?                | No: marcar un agotado sustituye al grito, y leer la carta ahorra pasarla a mano                                             |
| 17 · ¿Duplica algo?                 | No: la carta leída usa los mismos platos; el aviso del agotado es uno, en un canal                                          |
| 18 · ¿Bloquea el servicio?          | No: agotado no impide nada (el TPV todavía no es de Estook)                                                                 |
| 19 · ¿Fácil?                        | Dos toques para agotar; una pantalla con casillas para la carta leída                                                       |
| 20 · ¿Avisa solo cuando hace falta? | El agotado, solo a quien está trabajando. El equilibrio no avisa: está en Análisis cuando se mira                           |
| 21 · ¿Con datos a medias?           | El equilibrio dice qué sección no juzga y por qué; la carta leída dice lo que no ha entendido                               |
| 22 · ¿Señala a alguien?             | No: el agotado dice quién lo marcó, como cualquier mensaje del chat, y nada más                                             |
