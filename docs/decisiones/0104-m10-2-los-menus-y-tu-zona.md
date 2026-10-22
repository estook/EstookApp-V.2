# 0104 · M10 · 2 · Los menús y «Analiza mi zona»

**Fecha:** 22 de octubre de 2026
**Estado:** construida en la rama `m10-2-los-menus` (migración **0079**). Cambia la API y la app.
**Sigue:** la [0103](0103-las-respuestas-de-m10-2.md) (las respuestas de Richi) y la
[0102](0102-m10-1-la-carta-que-trabaja.md) (M10 · 1). El plan, en
[`m10-la-carta-menus-y-analisis.md`](../m10-la-carta-menus-y-analisis.md).

Richi contestó el 21-oct las dos preguntas que quedaban: **A1** —el menú del día cambia cada
día: la pantalla es la semana y un día sin tocar repite el anterior— y **B1 con «gastando
muchos créditos y solo 1 al día cada 24 horas»**: «Analiza mi zona» se puede una vez cada 24
horas y gasta 25 créditos. Y pidió «que quede impecable: si ves mejoras, hazlas; si ves mejor
experiencia de usuario, aplícala».

## 1 · Lo que se ha hecho

| Pieza                            | Lo hecho                                                                                                                                                                                                                                                                                              |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **¿Tu local sirve menús?**       | La primera vez que se abre Carta › Menús se pregunta; con «No», la pestaña se esconde (también de la barra y del menú) y se enciende en **Ajustes › Tu local, debajo de «Tu carta»**. IKATZ, encendido por la migración, con su menú del día ya montado                                               |
| **El menú del día, por semanas** | Las flechas de semana, un botón por día (hoy marcado) y, en cada sección, sus platos. **Un día sin tocar repite el último montado** y lo dice («Repite el lunes»); cambiar uno no mueve los demás; **lo que ya pasó no se toca**. «Copiar la semana pasada» rellena **solo los días vacíos**          |
| **Secciones y lo que entra**     | De fábrica, Primeros, Segundos y Bebida; «¿Entra pan? ¿café? ¿postre?» en Ajustes («Postre o café» si entran los dos); las secciones se renombran, se mueven, se quitan y se añaden; los días que se sirve; **un precio**                                                                             |
| **Añadir plato**                 | **De tu carta** (un toque, con buscador) o **Plato nuevo**, que nace **solo en el menú**: no sale en la carta, se desgrana en Escandallos y, si se escribe en la carta o se pulsa «Ponerlo también en la carta», pasa a ella. Cada plato, con su **suplemento** («+4,00 €»)                           |
| **Lo que deja**                  | A quien ve costes: **de lo peor a lo mejor** por menú, sin IVA, con el plato que lo hunde; si puede perder, lo dice primero. Sin escandallos, **cuáles faltan** y un botón a Escandallos › Menús. El pan y el café, con su producto del Almacén y las raciones que da                                 |
| **Otro menú**                    | Un botón discreto debajo («Otro menú»): ejecutivo, de grupo, degustación… Un solo día, sin semana; se quita en sus Ajustes. El del día no se quita: se apaga                                                                                                                                          |
| **Descargar**                    | Un botón que abre las cuatro opciones: **el cartel en A3** (vectorial, sin cabecera ni pie, con el nombre o el logo del local y cómo imprimirlo), **el PDF en A4**, **mandarlo por WhatsApp** (texto con negritas) y **una imagen cuadrada para redes**                                               |
| **Escandallos › Menús**          | «Todos» pasa a «Carta»; «Menús» junta los platos de los menús, por menú, **con y sin escandallo**, para desgranarlos. Los enlaces viejos (`…/todos?ficha=…`) llevan a «Carta» con lo que abrían                                                                                                       |
| **El Panel de la sala**          | Widget **«Menú del día»**: el de hoy, su precio, los suplementos y lo agotado tachado. De fábrica en el Panel de la sala (Manifiesto: «Camarero: mi turno, menú del día, agotados…»), sugerido a jefes y gerentes                                                                                     |
| **El cierre de caja**            | «Menú del día × 23» sale con su precio, como un plato de la carta                                                                                                                                                                                                                                     |
| **Analiza mi zona**              | Carta › Análisis › **Tu zona**: Fogón busca en internet (como mucho 8 búsquedas) lo que cobran los de alrededor por tus platos y el menú del día, con **el enlace y la fecha** de cada precio; las medias las calcula la base; con menos de tres, no se juzga. **Una vez cada 24 horas, 25 créditos** |

Las operaciones nuevas: **consultas** `mis_menus`, `el_menu_en_pdf` y `mi_zona`; **comandos**
`sirve_menus`, `crear_menu`, `cambiar_menu`, `archivar_menu`, `poner_seccion_de_menu`,
`cambiar_seccion_de_menu`, `quitar_seccion_de_menu`, `ordenar_secciones_de_menu`,
`poner_plato_en_el_menu`, `cambiar_plato_del_menu`, `quitar_plato_del_menu`,
`copiar_la_semana_pasada`, `poner_en_la_carta` y `analizar_mi_zona`. La API pasa a **101
consultas y 229 comandos**. La 0079 trae seis tablas (`menu`, `seccion_de_menu`, `dia_de_menu`,
`plato_de_menu`, `analisis_de_zona`, `precio_de_la_zona`), `plato.en_la_carta`,
`local.sirve_menus` y lo que apunta Fogón al buscar (`busquedas_en_internet`).

## 2 · Lo que decidí al construirlo

1. **Un día sin tocar no se copia: se lee el último montado.** Así no hace falta que nada copie
   el menú cada noche, y lo que se sirvió cada día queda escrito para cuando Fogón lo proponga.
   Al tocar un día, se monta con lo que valía y se cambia encima.
2. **Lo que ya pasó no se toca** ni se quita una sección con platos de días pasados (se apaga o
   se vacía): es la historia del menú.
3. **«Copiar la semana pasada» no pisa nada**: solo rellena los días de la semana que todavía no
   se han montado, y dice cuántos.
4. **Lo que deja, en el peor y en el mejor caso, y nada más.** Sin ventas no hay «lo normal»;
   con un plato sin escandallo **no se da una cifra**: se dice cuál falta (plantilla, 21).
5. **El pan y el café son una casilla, no un plato**; su coste, si se quiere, sale de un producto
   del Almacén entre las raciones que da («una barra da 6»). Sin decirlo, cuentan 0 € y se avisa.
6. **El plato nuevo del menú es un plato**, con su id (0086): con `en_la_carta` en falso no sale
   ni en la carta, ni en su equilibrio, ni en «leer tu carta», ni en la revisión de Fogón de
   «platos sin precio».
7. **«Otro menú» no tiene semana**: el ejecutivo o el de grupo se montan una vez y valen hasta que
   se cambian.
8. **Los PDF los hace el servidor** (regla 7); **la imagen para redes, el móvil**, con un lienzo y
   sin librería: no es un PDF y no lleva un dato que no esté ya en la pantalla.
9. **En la sala, sin ruido**: «Solo del menú» lo ve quien monta el menú, y las secciones vacías
   no salen a quien solo mira.
10. **El widget del Panel enseña el suplemento**: es lo que el camarero tiene que decir en la mesa.
11. **La búsqueda en internet usa la herramienta básica de Anthropic** (`web_search_20250305`,
    sin el filtrado que solo tienen Opus y Sonnet), con la ubicación del local y como mucho 8
    búsquedas. **Si Haiku 5.5 no la admite, se pide una vez a Sonnet 5.5** (unos céntimos más):
    no hay que tocar nada. Se cambia con el secreto opcional `AI_MODELO_ZONA`.
12. **Un enlace que Fogón no ha visto al buscar no se guarda**: un precio con un enlace inventado
    se descarta. Y solo se guarda el plato que es tuyo por su nombre exacto, o el menú del día.
13. **«Tu zona» dice antes de pulsar lo que falta** —Fogón apagado, la dirección del local o los
    precios de la carta—, con un enlace a donde se arregla: no se gasta un toque para enterarse.
14. **El cartel no lleva cabecera ni pie de documento**: «Hecho el…» y «Página 1 de 1» no pintan
    nada en una puerta. Lleva el logo del local, o su nombre en su color.
15. **Una mejora de paso**: «Tu carta y su QR» llevaba letras rotas desde el 8-oct, también en el
    cartel del QR que se imprime («Escanea con la cÃ¡mara del mÃ³vil»). Arreglado, y `pnpm
textos` vigila ahora las letras rotas (lección 216).

## 3 · Lo que no entra, y cuándo llega

Lo de la tabla de la [0103](0103-las-respuestas-de-m10-2.md), apartado 5: estrella, caballo,
puzzle y perro con Estook TPV (M20); la propuesta del menú del día de Fogón, con cuatro semanas
de menús; los destacados y las columnas con M11 y M12; la comparación con los locales de Estook,
cuando haya clientes en una zona; y el menú del día «paso a paso» en el TPV (M20A), que leerá
estas tablas.
