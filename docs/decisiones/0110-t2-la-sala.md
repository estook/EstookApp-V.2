# 0110 · T2 · La sala: el plano se dibuja en Estook TPV, a ojo; todas las mesas para todos; y se pide con los pases en pestañas

**Fecha:** 24 de octubre de 2026
**Estado:** construida, en su pull request (`t2-la-sala`), con la migración 0085.
**Sigue:** la [0107](0107-estook-tpv-el-tpv-entero.md) (puntos 12, 13 y 14) y el Anexo, capítulo 11
(11.8, 11.9 y 11.10). El plan, [`m20a-la-sala-y-la-cocina.md`](../m20a-la-sala-y-la-cocina.md),
«T2 · La sala, terminado cuando». Las maquetas 8, 9, 10, 12 y 13.
**Sustituye:** de la 0106 y de M20A · 1 · 2, que el plano se dibuje en Estook › Ajustes › Tu sala
(sale de Estook), y que el camarero solo pase sus mesas (cualquiera se queda o pasa cualquiera, como
ya decidió la 0107).
**Cambia:** Roles 1.12 (la sala la dibuja quien tiene los Ajustes del TPV), el plan, el mapa y
ESTADO.

## 1 · Qué deja T2

- **El editor de la sala, en Estook TPV** (Ajustes del TPV › La sala, o el lápiz de arriba del plano),
  en la caja y en la tablet: la paleta con las seis mesas (cuadrada, redonda, rectangular, ovalada,
  alargada y taburete) y lo que no se abre (barra, pared, columna, puerta, planta y texto); se
  arrastra o se toca; **la mesa nueva nace con el número siguiente y su tamaño según sus plazas**;
  se estira desde las esquinas y se gira con el asa, que se queda en 0°, 45° y 90°; **imán y guías**;
  duplicar, elegir varias, deshacer y rehacer; las salas en pestañas, con «+ Sala», su nombre y su
  orden; y **tres plantillas** («Bar con barra y 6 mesas», «Restaurante de 12 mesas», «Terraza de
  8»). **Se guarda solo, al soltar.** Ni un número de centímetros.
- **El plano del servicio**: las salas en pestañas, **Todas · Mías** (que el aparato recuerda; el
  móvil de un camarero empieza en «Mías»), cada mesa con su forma y su giro, **su estado con color,
  icono y texto**, sus comensales, su total, **las iniciales de su camarero**, y «Ana ha fichado la
  salida» si su camarero se ha ido. En el móvil, **una cuadrícula de tres en fila**.
- **«Quedármela»** en las opciones de la mesa: cualquier camarero se queda o pasa cualquier mesa,
  con su rastro.
- **Pedir con los pases en pestañas** encima de la cuenta: **Bebidas · 1.º · 2.º · 3.º · Postre**,
  cada una con cómo va (✓, en marcha, en espera). Lo que se toca va al pase marcado, y **al cambiar
  de página se marca solo el de esa página**. La carta, **una página por sección** hasta T3.
- **Sale de Estook**: Ajustes › Tu local › «Tu sala».

**La base** (migración 0085, con su `.revertir.sql`): `mesa` gana sus seis formas, su tamaño a ojo
(`ancho` y `fondo` en unidades del plano, nulos = el de sus plazas) y su giro; `elemento_de_sala`, lo
que no se abre; las políticas del plano pasan de `app.ajustes` a `accion.ajustes_del_tpv`; y
`han_fichado_la_salida`, para el aviso de las mesas de quien se ha ido.

**La API**: las órdenes del plano pasan al TPV (`enElTpv: 'solo'`, en la caja y el comandero, nunca
en el móvil de nadie, con los Ajustes del TPV), y seis nuevas: `ordenar_las_salas`,
`crear_cosa_de_la_sala`, `cambiar_cosa_de_la_sala`, `quitar_cosa_de_la_sala`,
`colocar_en_el_plano` (lo soltado, de una vez) y `empezar_con_una_plantilla`. `el_plano` trae lo
dibujado y `puedeDibujar`; `el_plano_del_local` es la lectura del editor. La lógica del plano vive en
`@estook/dominio` (`plano.ts`), la misma para el TPV y la API.

## 2 · Lo que decidí al construirlo

1. **El tamaño de cada forma por sus plazas** (`tamanoDeLaMesa`): las cuadradas y redondas crecen por
   igual; las rectangulares, las ovaladas y las de banco, a lo largo; el taburete es de uno. Cambiar
   las plazas o la forma **la devuelve a su tamaño**, aunque se hubiera estirado.
2. **El imán es una rejilla de 10 unidades del plano**, y las guías ganan al imán: si el borde o el
   centro de lo que se mueve pasa a menos de 8 del de otra cosa, se pega a ella.
3. **Mover varias** las mueve juntas sin que ninguna se salga; las guías, solo con una.
4. **Deshacer y rehacer** guardan las órdenes contrarias (mover lo devuelve a su sitio; poner, lo
   quita; quitar, lo vuelve a poner), hasta cincuenta pasos, y se pierden al salir del editor.
5. **Las salas se ordenan con «Antes» y «Después»** en su panel, en vez de arrastrar la pestaña:
   arrastrar una pestaña pequeña con el dedo se confunde con desplazarlas.
6. **Una plantilla crea una sala nueva** («Terraza», o «Terraza 2» si ya hay una), con sus mesas
   numeradas detrás de las que ya hay; no toca las salas que hay.
7. **En el móvil no se dibuja**, ni en el personal ni en una pantalla pequeña: «Edita la sala en una
   tablet o en la caja».
8. **El pase de cada página, por su nombre, hasta T3** (Entrantes → 1.º, Principales → 2.º, Postres
   → Postre; las de bebidas, Bebidas): T3 trae «¿En qué pase sale?» por página. Si el nombre no dice
   nada, no se cambia la pestaña.
9. **El postre es el pase 4 por dentro**, y en la sala se llama «postre» («Marchar el postre»).
10. **Una mesa recién abierta empieza en Bebidas**, la pestaña y su página (como en 1 · 2).
11. **El filtro «Mías» se recuerda en el aparato** (en su navegador), y el móvil personal empieza en
    «Mías».
12. **«Ha fichado la salida»** sale en la mesa de quien ficha hoy y ya ha fichado la salida; quien no
    ficha nunca no sale como ido.
13. **La pestaña marcada va en blanco, no en naranja**: un solo botón naranja por pantalla (Anexo
    11.12), y ese es «Mandar».
14. **Lo que no se abre vive en su propia tabla** (`elemento_de_sala`), y no en `mesa` como decía el
    Anexo 7.2: no tiene plazas ni cuenta, así que una cuenta nunca puede caer en una pared. Cambiado
    en el Anexo.
15. **Un local sin sala dibujada** abre el plano en la pestaña «Sala», con «Dibujar la sala», si
    quien entra puede dibujarla; si no, en «Barra y llevar», donde ya se puede pedir.

## 3 · Lo que no entra en T2

- **La botonera** (qué se vende y en qué botón, «Lo más pedido», las opciones obligatorias): T3.
- **«Pide la cuenta»** como estado de la mesa, imprimir y cobrar: T5 y T7.
- **Las reservas** («reservada 14:30» de la maqueta 8): no están en ningún módulo todavía.
