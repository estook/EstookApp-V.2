# 0111 · T3 · 1 · La botonera: qué se vende en Estook TPV, quién lo prepara y en qué pase sale

**Fecha:** 25 de octubre de 2026
**Estado:** construida, en su pull request (`t3-la-botonera`), con la migración 0086.
**Sigue:** la [0107](0107-estook-tpv-el-tpv-entero.md) (respuesta 6: «Es de bebidas» no se entiende)
y el Anexo, capítulo 11 (11.10 y 11.11) y 7.2. El plan,
[`m20a-la-sala-y-la-cocina.md`](../m20a-la-sala-y-la-cocina.md), «T3 · 1 · La botonera, terminado
cuando». Las maquetas «Productos: cómo empezar» y «Productos: la botonera».
**Sustituye:** de la 0106 y la 0082, «Es de bebidas» en las secciones de la carta, y la carta por
secciones en el TPV.
**Cambia:** el plan (T3 se parte en dos), el Anexo 7.2, el mapa y ESTADO.

## 1 · Qué deja T3 · 1

- **Ajustes del TPV › Productos**, en la caja y en la tablet, con el permiso de los Ajustes del TPV:
  - **Al empezar, tres caminos**: «Traer toda la carta» (una página por sección, y lo nuevo entra
    solo), «Elegir lo que se vende aquí» (la carta con casillas y «Todos» en cada sección) y «Empezar
    de cero».
  - **Las páginas**, cada una con **«¿Quién lo prepara?»** (Cocina · Barra · Nadie) y **«¿En qué
    pase sale?»** (Bebidas · 1.º · 2.º · 3.º · Postre), **propuestas por su nombre** con la tabla de
    11.11, su color y su orden.
  - **Los botones**: «+ De la carta», su color, **lo suyo si cambia lo de su página** (el pan, en
    Entrantes, de «Nadie»), fijarlo en «Lo más pedido», moverlo de página, ordenarlo y quitarlo.
  - **«Nuevos en la carta · N»**, con «Añadir» de un toque, y el interruptor **«Lo nuevo de la carta
    entra solo»**.
  - **«Nuevo producto»**: nombre, precio, página y quién lo prepara; **nace también en la carta de
    Estook**, en la sección que se llama como su página, **sin escandallo**.
- **Al pedir**, la botonera por páginas, con **«Lo más pedido» la primera**, el color de cada botón y
  su página; **cada botón va a quien lo prepara**, y al abrir una página se marca sola la pestaña de
  su pase.
- **Sale de Estook** el interruptor «Es de bebidas» de la Carta.

**La base** (migración 0086, con su `.revertir.sql`): `pagina_del_tpv` y `boton_del_tpv` (Anexo 7.2),
en `local` cómo se montó y si lo nuevo entra solo, la función `lo_que_propone_el_nombre` (la tabla de
11.11) y el disparador que mete lo nuevo de la carta en su página. **Cada local que ya tenía carta
queda con «Traer toda la carta»**, y **lo que estaba «de bebidas» pasa a Barra y Bebidas** sin que
nadie toque nada; después, `seccion_de_carta.es_bebida` se quita.

**La API**: `la_botonera` y doce órdenes (`montar_la_botonera`, `traer_de_la_carta`,
`lo_nuevo_entra_solo`, `crear_pagina_del_tpv`, `cambiar_pagina_del_tpv`,
`ordenar_las_paginas_del_tpv`, `quitar_pagina_del_tpv`, `poner_botones`, `cambiar_boton_del_tpv`,
`ordenar_los_botones`, `quitar_boton_del_tpv` y `nuevo_producto_del_tpv`), todas solo en el TPV, en
la caja o el comandero, nunca en el móvil de nadie. `la_carta_de_la_sala` trae las páginas y «Lo más
pedido». La tabla de lo que se propone vive en `@estook/dominio` (`botonera.ts`) y en la base, y una
prueba mira que digan lo mismo.

## 2 · Lo que decidí al construirlo

1. **T3 se parte en dos** (el plan, regla 2: «si se queda grande, se parte en dos y se dice aquí»).
   **T3 · 1, la botonera**; **T3 · 2, lo de cada producto**: las opciones y los extras con su
   escandallo, «Monta tus bebidas», el producto a peso, cambiar el precio desde el TPV y los
   agotados desde Productos. La 1 es lo que decide qué se vende y a dónde va; la 2 se monta encima.
2. **Un local que no ha montado su botonera vende su carta entera**, una página por sección, con lo
   que propone el nombre de cada una. El primer día no hay que hacer nada; Productos enseña los tres
   caminos la primera vez.
3. **Con la botonera montada, lo que no tiene botón no se vende en el TPV**: el servidor no lo deja
   pedir, y lo dice («añádelo en Ajustes del TPV › Productos»).
4. **Lo nuevo de la carta entra solo con un disparador de la base**, con su privilegio: lo pone quien
   toca la carta (un jefe de cocina, sin los Ajustes del TPV) y por cualquier camino (la Carta, leer
   la carta con Fogón). Sin el privilegio, ese jefe de cocina ni siquiera podría crear un plato; lo
   vigila una prueba. **Si un plato cambia de sección, su botón se va a la página de la nueva.**
5. **Un plato sin sección no entra solo**: sale en «Nuevos en la carta» y se pone con «+ De la
   carta» en la página que se quiera.
6. **«Nadie» va a ninguna parte**: la línea sale al mandar, sin pantalla ni impresora, como ya iba la
   línea de un menú. **Al mandar se dice**: «Mandado: a cocina 1, a la barra 1 y 1 tal cual»; sin
   eso, mandar solo el pan decía «nada nuevo».
7. **Lo de la barra y lo de «Nadie» no van por pases**, como en T2: salen al mandar. Mandar una
   bebida «con el postre» llega con T4, cuando la barra tenga su pantalla.
8. **Con «Bebidas» marcada, lo de la cocina va al pase de su página**: si se pide unas croquetas
   desde «Lo más pedido» o el buscador, van al 1.º, no al pase de fábrica.
9. **«Lo más pedido»**: lo fijado primero, y después los doce más vendidos **a esta hora, una antes o
   una después**, en las cuatro últimas semanas, sin lo de dentro de un menú ni lo quitado. Abrirla
   no cambia la pestaña marcada: tiene de todo.
10. **Los colores son nueve, los del sistema de diseño** (naranja, verde, azul, ámbar, rojo, rosa,
    morado, turquesa y arena), y el botón lo lleva **en una franja a la izquierda**: el nombre y el
    precio se leen igual en todos.
11. **«Nuevo producto» no pregunta el IVA**: el plato todavía no lo guarda, y todo lo de la carta va
    con el de la actividad (el 10 % de la hostelería). El IVA de cada plato llega con el cobro (T7 ·
    M20C). Crear un producto **pide también poder cambiar la carta**, porque nace en ella.
12. **Se ordena arrastrando y también con «Antes» y «Después»** en la hoja de cada página o botón:
    el teclado y el lector de pantalla no arrastran.
13. **Quitar un botón o una página borra la fila**: es cómo se ve el TPV, no un dato del negocio. El
    plato sigue en la carta y en su historial.
14. **Lo que cambia en la botonera llega a los demás aparatos en dos minutos como mucho** (la carta
    de la sala se relee cada dos), no al segundo: releer la carta en cada toque de una mesa costaría
    mucho para algo que se cambia poco. En el aparato donde se cambia, al momento.
15. **Crear una página o un producto sin haber montado la botonera la deja «desde cero»**.

## 3 · Lo que no entra en T3 · 1

- **Las opciones y los extras, «Monta tus bebidas», el producto a peso, cambiar el precio desde el
  TPV y los agotados desde Productos**: T3 · 2.
- **«Otra ronda», el artículo libre y el resto de «Más»**: con las entregas que las traen (10.3).
- **La barra con su pantalla o su impresora**: T4; hasta entonces, lo de la barra lo ve el camarero
  en la cuenta, como en T2.
