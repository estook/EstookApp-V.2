# M10 · La carta, los menús y el análisis

> **Estado: M10 · 1, en producción** desde el 20-oct-2026 (#125, migración 0078, decisión
> [0102](decisiones/0102-m10-1-la-carta-que-trabaja.md)). **M10 · 2, construida el 22-oct** en la
> rama `m10-2-los-menus` (migración 0079, decisión [0104](decisiones/0104-m10-2-los-menus-y-tu-zona.md)):
> los menús y «Analiza mi zona»; en producción cuando Richi fusione, migre y despliegue. Es el
> último módulo antes de Estook TPV ([0061](decisiones/0061-el-orden-y-la-infraestructura.md)): **la
> carta es lo que se va a picar en el TPV**.

## Lo que ya estaba hecho

M9 · 1 se adelantó media M10 ([0086](decisiones/0086-las-respuestas-de-m9.md)): las secciones, los
platos con su foto, los canales con su comisión (Uber Eats) y **el precio de cada plato en cada
canal**. Lo que queda de M10, según el Plan: agotados, el precio al cierre de caja, leer la carta
subida, el equilibrio de la carta, los menús, el menú del día, el análisis de lo que deja cada plato,
el orden como se imprime y la comparación con la zona.

## M10 · 1 · La carta que trabaja (en producción)

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
de Estook) y del TPV y Uber Eats (Estook TPV y Estook Link).

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
entera), y la relación calidad-precio de Omnes, que necesita lo vendido plato a plato (con Estook TPV).

---

## M10 · 2 · Los menús y «Analiza mi zona»

**Contestado por Richi el 21-oct** ([0103](decisiones/0103-las-respuestas-de-m10-2.md), con sus palabras) y
**construido el 22-oct** ([0104](decisiones/0104-m10-2-los-menus-y-tu-zona.md), con lo que decidí al
construirlo). Lo que no entra, y cuándo llega, en la última tabla: **nada se pierde por el camino**.

### 1 · Los menús

**En la cocina.** El menú del día a 13,50 €: un primero a elegir entre tres, un segundo entre tres,
bebida, pan y postre o café. Hoy se escribe en la pizarra, y nadie sabe si con el entrecot de segundo
el menú pierde dinero. Con Estook se monta en el móvil, se imprime o se manda, y dice lo que deja.

| Dónde                         | Qué hace                                                                                                                                                                                                                    |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Carta › Menús**             | El **menú del día**, hecho de fábrica: **Primeros, Segundos y Bebida**, y tres casillas, **¿Entra pan? ¿Entra café? ¿Entra postre?** Las secciones se añaden, se quitan y se renombran. **Un precio**                       |
| **«Añadir plato»**            | Pregunta **«De tu carta»** (buscador) o **«Plato nuevo»**. El nuevo es un plato como los demás, **solo del menú** (no sale en la carta), y se desgrana en Escandallos. Cada plato, con su **suplemento** si lo lleva (+4 €) |
| **Lo que deja**               | Con los escandallos y **sin IVA**: en el **peor caso** y en el **mejor**, con el plato que lo hunde señalado («Si todos piden el entrecot, te deja 2,10 €»). Pan y café, con su producto del Almacén si se quiere su coste  |
| **«Otro menú»**               | Un botón discreto debajo del menú del día: ejecutivo, degustación, de grupo. Cada uno con sus secciones y su precio                                                                                                         |
| **«Descargar»**               | Un botón que se despliega: **Cartel para el local** (A3 vectorial, con cómo imprimirlo y dónde ponerlo) · **PDF** (A4) · **Compartir** (WhatsApp, correo…) · **Imagen para redes** (cuadrada)                               |
| **¿Tu local sirve menús?**    | En IKATZ, **encendido**. En los demás, la primera vez que se abre Menús lo pregunta: con «No» la pestaña se esconde. Se cambia en **Ajustes › Tu local, debajo de «Tu carta»**                                              |
| **Escandallos › Escandallos** | Las vistas pasan a **Carta · Menús · Bajo objetivo** («Todos» se llama «Carta»; las elaboraciones siguen en ella, al final). «Menús» junta los platos de todos los menús, por menú                                          |
| **Agotados y el cierre**      | Un plato agotado sale **tachado** en el menú; en el cierre de caja se apunta **«Menú del día × 23»** con su precio, como un plato más                                                                                       |
| **El Panel de la sala**       | El widget **«Menú del día»**: el de hoy, su precio, los suplementos y lo agotado tachado, para contestar en la mesa sin abrir nada                                                                                          |

**Cada día, el suyo** (A1): la pantalla es la semana; un día que no se toca **repite el último
montado** y lo dice; cambiar uno no mueve los demás; lo que ya pasó no se toca; y «Copiar la semana
pasada» rellena solo los días vacíos. **Se guarda el menú de cada día** desde el primero: es la
historia que Fogón necesitará para proponerlo (más adelante) y la que leerá Estook TPV para venderlo
«paso a paso» (Anexo, cap. 10).

### 2 · «Analiza mi zona», con Fogón

**En la cocina.** «Tus bravas a 7 € están 1,50 € por encima de lo que cobran los de tu calle; tu
menú a 13,50 €, en la media (de 12 a 15 €).» Hoy eso se sabe dando una vuelta por el barrio.

- **Dónde**: un botón **«Analiza mi zona»** en **Carta › Análisis › Tu zona**; Fogón lo ofrece entre
  sus acciones y, si se le pregunta, dice dónde está. Lo que encuentra se guarda y se ve **con su
  fecha**, sin volver a gastar; y antes de pulsar dice si falta algo (Fogón apagado, la dirección del
  local o los precios).
- **Cómo trabaja, para que sea rápido**: Estook le da el local (dirección, tipo de cocina y su «€€»
  de Google) y **los platos con su precio, sin costes**. Fogón busca en internet los locales de
  alrededor que publican su carta y devuelve, por plato, lo que cobran **con el enlace y la fecha** de
  dónde lo ha leído, y el precio del menú del día de la zona.
- **Sin inventar**: con menos de tres locales para comparar un plato, no lo juzga; las medias y «1,50 €
  por encima» las calcula la base, no Fogón; y lo que viene de internet es dato, nunca instrucción.
- **Lo que cuesta**: como mucho 8 búsquedas, **unos 0,08-0,10 €** por análisis (cada búsqueda, 1
  céntimo de dólar, comprobado en la documentación de Anthropic el 21-oct, más la lectura). **Una vez
  cada 24 horas y 25 créditos** (B1 de Richi: «gastando muchos créditos y solo 1 al día»), dentro del
  tope de 5 € al mes. La búsqueda es la herramienta básica de Anthropic; si Haiku 5.5 no la admitiera,
  se pide una vez a Sonnet 5.5, sin tocar nada (0104).
- **Lo que se guarda de los otros**: solo lo público (nombre, plato, precio, enlace y fecha), de ese
  local y para ese local. Va a las preguntas al asesor.

### 3 · Las dos preguntas, contestadas el 21-oct

- **A · ¿Cómo cambia el menú del día en IKATZ?** **A1: cada día distinto.** La pantalla es la semana,
  y un día que no se toca repite el anterior.
- **B · ¿Cuántas veces se puede «Analizar mi zona»?** **«B1, gastando muchos créditos y solo 1 al día
  cada 24 horas»**: una vez cada 24 horas, 25 créditos; la comparación con tus precios de hoy se
  rehace sola, sin buscar otra vez.

### 4 · Lo que no entra en M10 · 2, y cuándo llega

| Pieza                                                          | Cuándo                                                    | Por qué                                                                                        |
| -------------------------------------------------------------- | --------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| **Estrella, caballo, puzzle y perro** (lo que deja cada plato) | **Con Estook TPV (M20)**, con Fogón 2                     | Necesita lo vendido de cada plato: hoy, 1 de cada 21 cierres de IKATZ lo trae. «No te olvides» |
| **Fogón propone el menú del día** (5 créditos)                 | Cuando un local lleve **cuatro semanas** con menú del día | Propone mejor con historia, y M10 · 2 la empieza a guardar                                     |
| **Destacados («Sugerencia del chef») y columnas**              | **M11** (la carta impresa) y **M12** (la del QR)          | Es donde se ven                                                                                |
| **La comparación con los locales de Estook**, sin nombres      | Cuando haya clientes en una zona (diez en una ciudad)     | Hoy hay cinco negocios: no da para una media                                                   |
| **La competencia de M23** (valoraciones y su evolución)        | **M23**                                                   | Sobre lo que «Analiza mi zona» ya guarda                                                       |
| **El menú del día en el TPV** («paso a paso»)                  | **M20A**                                                  | El Anexo (cap. 10) ya lo pide; leerá los menús de M10 · 2                                      |
| **El ingrediente compartido y lo de temporada** (equilibrio)   | Cuando la carta esté desgranada entera                    | Escrito en M10 · 1, punto 4                                                                    |

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

## La regla 14 y la prueba de la plantilla, de M10 · 2

| Pregunta                            | Respuesta                                                                                                                                           |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| ¿Qué datos usa?                     | Los platos y sus escandallos (M9), los precios de la carta, el Almacén para el pan y el café, la dirección del local y lo que Fogón lee en internet |
| ¿Quién más se entera?               | El equipo ve el menú de hoy (Panel de la sala y Carta). Lo que deja, solo quien ve el coste de los platos                                           |
| ¿Qué automatiza Fogón?              | Buscar lo que cobran los de alrededor. **Propone; nadie cambia un precio por él**                                                                   |
| ¿Qué aprueba una persona?           | Todo: el menú, su precio y cualquier cambio de la carta                                                                                             |
| Permisos                            | Montar y descargar: Carta para editar. Verlo: quien ve la Carta. Lo que deja: `dato.coste_de_plato`. Analizar la zona: Carta para editar            |
| ¿Sin internet?                      | No: el menú es del local y lo leen varios a la vez                                                                                                  |
| ¿Dos veces?                         | Poner un plato que ya está lo deja igual; copiar la semana no pisa lo montado; analizar la zona dos veces en 24 horas no llega a Fogón              |
| Auditoría                           | Cada cambio del menú (precio, secciones, platos, días copiados), en su historial; el plato nuevo y su paso a la carta, en el del plato              |
| 16 · ¿Trabajo nuevo?                | No: sustituye a la pizarra, y el cartel y el texto para WhatsApp salen solos                                                                        |
| 17 · ¿Duplica algo?                 | No: los platos son los de la carta (el nuevo es un plato más) y su coste, el de su escandallo                                                       |
| 18 · ¿Bloquea el servicio?          | No: nada impide vender; lo que ya pasó no se toca, pero no se pide nada para seguir                                                                 |
| 19 · ¿Fácil?                        | La semana a la vista, un toque para poner un plato de la carta, el precio grande y «Descargar» en un botón                                          |
| 20 · ¿Avisa solo cuando hace falta? | No avisa: lo que deja está en el menú cuando se mira, y la zona, en Análisis                                                                        |
| 21 · ¿Con datos a medias?           | Sin escandallo no da una cifra de lo que deja: dice cuál falta. Con menos de tres precios de la zona, no compara                                    |
| 22 · ¿Señala a alguien?             | No: el menú no lleva nombres, y la zona solo locales con sus precios públicos                                                                       |
