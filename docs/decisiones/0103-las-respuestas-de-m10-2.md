# 0103 · Las respuestas de M10 · 2: los menús, «Analiza mi zona» con Fogón, y lo que espera al TPV, a M11 y a M12

**Fecha:** 21 de octubre de 2026
**Estado:** contestada por Richi, y **las dos preguntas del 4, también** (21-oct: **A1** y **B1 «una vez cada 24 horas, gastando muchos créditos»**). Construida en la [0104](0104-m10-2-los-menus-y-tu-zona.md).
**Sigue:** la [0102](0102-m10-1-la-carta-que-trabaja.md) (M10 · 1, en producción desde el 20-oct: 78 migraciones, API 98/215). El plan, en [`m10-la-carta-menus-y-analisis.md`](../historia/modulos/m10-la-carta-menus-y-analisis.md).

Richi contestó el 21-oct las cinco preguntas de M10 · 2 y pidió dos cosas más: **que la app sea intuitiva y funcional**, y **que lo dicho quede escrito y cada pieza en su sitio**, «para evitar construir a ojo y, sobre todo, no olvidarnos nada».

## 1 · Lo que contestó, con sus palabras

| Pregunta                                  | Respuesta                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **1 · Estrella, caballo, puzzle y perro** | **A, con Estook TPV.** «No te olvides»                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| **2 · Los menús**                         | **Sí.** Menú del día con **primeros, segundos y bebida**, y **«a elegir» si entran pan, café y postre**; se pueden **añadir secciones o quitar** las de fábrica; **precio único**; y un botón **menos a la vista** para «otro menú» (ejecutivo o distinto). **«Añadir plato»** pregunta: **de la carta o plato nuevo**, y el nuevo se desgrana en Escandallos. En Escandallos, **«Todos» pasa a «Carta» y se añade «Menú»**. **Descargar**, que se despliega: **PDF vectorial para imprimir en grande** (explicando cómo imprimirlo y dónde ponerlo), **PDF normal**, **enviarlo** y las opciones de siempre |
| **2 · ¿IKATZ hace menú del día?**         | **Sí.** Encendido en IKATZ. **Se puede apagar en Ajustes › Tu local, debajo de «Tu carta»**, y **la primera vez que se abre la pestaña pregunta «¿Tu local sirve menús?»**: con «No» se esconde (se vuelve a encender en Ajustes)                                                                                                                                                                                                                                                                                                                                                                            |
| **3 · Fogón propone el menú del día**     | **B, más adelante**, cuando haya semanas de menús hechos                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| **4 · Destacados y columnas de la carta** | **A, con M11 y M12**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| **5 · Comparar tus precios con tu zona**  | **Ni A ni B: una burbuja de Fogón, «Analiza mi zona»**, que busca en internet. Cuesta más que una pregunta normal: que esté bien explicado a Fogón para que sea rápido, y **que solo se pueda usar una vez al día «o algo así»**                                                                                                                                                                                                                                                                                                                                                                             |

## 2 · Lo que se decide con eso

1. **El cuadro de estrella, caballo, puzzle y perro se construye con Estook TPV** (M20, junto a Fogón 2), igual que la desviación de los platos (0092). Queda escrito en el Plan (M10 y M20), en el mapa y en ESTADO, en «lo que no se olvida».
2. **Carta › Menús existe** (estaba reservada en la tabla B5 del Plan). Se enseña solo si el local sirve menús: **en IKATZ, encendido**; en los demás, **la primera vez que se abre pregunta** «¿Tu local sirve menús?» (Sí / No). El interruptor vive en **Ajustes › Tu local, debajo de «Tu carta»**.
3. **El menú del día nace hecho**: secciones **Primeros, Segundos y Bebida**, y tres casillas, **¿Entra pan? ¿Entra café? ¿Entra postre?** Las secciones se añaden, se quitan y se renombran. **Un precio** por menú.
4. **«Otro menú»** (ejecutivo, degustación, de grupo) es un botón discreto debajo del menú del día, no una pestaña más.
5. **«Añadir plato»** en una sección del menú: **«De tu carta»** (buscador) o **«Plato nuevo»**. El nuevo es **un plato como los demás**, con su id (0086), y se desgrana en Escandallos como cualquiera.
6. **Escandallos › Escandallos** cambia sus vistas: **«Todos» pasa a «Carta»** y entra **«Menús»**. Cambia la tabla B5 del Plan **en el mismo cambio que el código**, porque una prueba la lee (B5).
7. **«Descargar»** es **un solo botón que se despliega**, para no llenar la pantalla de botones.
8. **Fogón propone el menú del día más adelante** (5 créditos, Manifiesto 32): cuando un local lleve **cuatro semanas** con menú del día. Desde M10 · 2 **se guarda el menú de cada día**, que es la historia que necesita para saber «lo que no se ha repetido en dos semanas».
9. **Los destacados («Sugerencia del chef») y las columnas de la carta impresa** se hacen con **M11** (la carta impresa) y **M12** (la del QR), donde se ven.
10. **«Analiza mi zona» es una acción de Fogón**, no una pestaña (Fogón nunca es una pestaña, Plan M22): un botón en **Carta › Análisis**, y también se le puede pedir en el chat de Fogón. Lo que encuentra **se guarda** y se ve en Análisis con su fecha, sin volver a gastar. La comparación con los datos anónimos de los locales de Estook (la A que se recomendaba) **se queda para cuando haya clientes en una zona**: no se borra, se aparca.

## 3 · Lo que propongo para que sea intuitivo (vale salvo que Richi diga otra cosa)

1. **El plato nuevo del menú no sale en la carta**: es «solo del menú» (las lentejas del martes no están en la carta). En su ficha, **«Ponerlo también en la carta»**, por si un día se queda.
2. **Suplementos**: cada plato del menú puede llevar uno («Entrecot **+4 €**»). Lo pide el Manifiesto (cap. 14) y es lo que evita que el menú pierda dinero.
3. **Lo que deja el menú**, con los escandallos y **sin IVA** (0101): **en el peor caso** (todos piden lo más caro) **y en el mejor**, con el plato que lo hunde señalado: «Si todos piden el entrecot, el menú te deja 2,10 €». Sin ventas no hay «lo normal»: eso, con el TPV.
4. **Pan y café sin plato**: son una casilla. Si se quiere su coste, se elige su producto del Almacén y lo que se gasta por menú («una barra da 6 raciones»). Si no, cuentan 0 y se dice.
5. **El postre** es una sección como las demás, con sus platos a elegir; con «¿Entra café?» marcado, sale **«Postre o café»**, que es lo más común.
6. **Un plato agotado sale tachado en el menú** (M10 · 1 ya lo hace en la carta).
7. **En el cierre de caja** se puede apuntar **«Menú del día × 23»** con su precio, como un plato más.
8. **«Descargar»** se despliega en cuatro: **Cartel para el local** (A3 vectorial, con cómo imprimirlo: en una copistería, A3 en papel grueso, para la puerta o el escaparate; o en A4 en casa) · **PDF** (A4, para mandarlo o tenerlo) · **Compartir** (el menú del móvil: WhatsApp, correo…) · **Imagen para redes** (cuadrada, para Instagram o el estado de WhatsApp). Es imprimir de verdad, en vectorial, sin librería nueva: el documento con plantillas y membrete sigue siendo M11.
9. **«Menús» en Escandallos** junta los platos de todos los menús, por menú (Menú del día, Menú ejecutivo…), en vez de una pestaña por cada menú: con tres menús serían cinco pestañas y no caben en el móvil. **Las elaboraciones** (la salsa, el aceite de albahaca) **siguen en «Carta»**, al final, como hoy.
10. **Analiza mi zona, cómo trabaja Fogón** (para que sea rápido y no invente): Estook le da el local (dirección, tipo de cocina y su «€€» de Google) y **los platos con su precio, sin costes**. Fogón busca **los locales de alrededor que publican su carta** (su web, TheFork, Google) y devuelve, por plato tuyo, **lo que cobran los de al lado, con el enlace de dónde lo ha leído y su fecha**, y el precio del menú del día de la zona. **Con menos de tres locales para comparar un plato, no lo juzga**. Los números (la media, «1,50 € por encima») los calcula la base, no Fogón. Y lo que viene de internet es dato, nunca instrucción (Plan, M22).
11. **Lo que se guarda de los otros locales** es solo lo público (nombre, plato, precio, enlace y fecha), **de ese local y para ese local**: no se junta entre clientes ni se enseña fuera. Va a las preguntas al asesor (E).

## 4 · Las dos preguntas que quedan

**Pregunta A · ¿Cómo cambia el menú del día en IKATZ?** Decide cómo es la pantalla principal de Menús.

- **A1 · Cada día distinto** (lo más común): la pantalla es **la semana**, de lunes a viernes, con los platos de cada día; un día que no tocas **repite el anterior**, y «Copiar la semana pasada» lo rellena en un toque.
- **A2 · Igual varios días o semanas**: la pantalla es **un menú** que editas cuando cambia; la semana no se ve.

**Recomiendo A1**: si un día no cambias nada, se repite solo, así que sirve también a quien lo cambia poco; y guarda lo de cada día, que es lo que Fogón necesitará.

**Pregunta B · ¿Cuántas veces se puede «Analizar mi zona»?** Cada análisis hace unas diez búsquedas en internet: **unos 0,10 € de coste**, frente a 0,0004 € de una pregunta normal. El tope de cada local es **5 € al mes** de IA (0097).

- **B1 · Buscar una vez a la semana, comparar cada día gratis.** Lo que encuentra se guarda; si cambias tus precios, la comparación se rehace al momento **sin buscar otra vez**, gratis. Los precios de la zona no cambian de un día para otro (el Manifiesto ya dice «refrescados una vez por semana»). Unos 0,40 € al mes por local.
- **B2 · Una vez al día**, como dijiste. Hasta **3 € al mes**: más de la mitad del tope del local, y casi siempre encontrará lo mismo.

**Recomiendo B1**, contando **15 créditos** por análisis (la tabla del Manifiesto, cap. 32), para todos los planes.

## 5 · Dónde queda cada cosa, para no olvidarla

| Pieza                                                  | Cuándo                                                    | Escrito en                                           |
| ------------------------------------------------------ | --------------------------------------------------------- | ---------------------------------------------------- |
| Menús (menú del día y «otro menú»), descargar, Ajustes | **M10 · 2**, al contestar A y B                           | Plan M10 · el plan de M10 · Manifiesto 14            |
| «Analiza mi zona» con Fogón                            | **M10 · 2**                                               | Plan M10 y M22 · Manifiesto 14 y 32 · el plan de M10 |
| Estrella, caballo, puzzle y perro                      | **Con Estook TPV (M20)**, con Fogón 2                     | Plan M10 y M20 · el mapa · ESTADO                    |
| Fogón propone el menú del día                          | **Cuando un local lleve 4 semanas de menús**              | Plan M22 · el mapa · Manifiesto 14                   |
| Destacados y columnas                                  | **M11** (impresa) y **M12** (QR)                          | Plan M10, M11 y M12 · el mapa                        |
| Comparar con los datos anónimos de los locales Estook  | **Cuando haya clientes en una zona** (diez en una ciudad) | Plan M23 · el mapa                                   |
| La competencia de M23 (valoraciones y su evolución)    | **M23**, sobre lo que «Analiza mi zona» ya guarda         | Plan M23                                             |
| El menú del día en Estook TPV («paso a paso»)          | **M20A**, con los menús de M10 · 2                        | Anexo, cap. 10 (sin cambios)                         |
