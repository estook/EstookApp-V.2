# 0152 · R3 · 2 · 1 · La caja, segunda parte

**Fecha:** 23 de noviembre de 2026
**Estado:** la maqueta de R3 ([r3-la-caja.html](../maquetas/r3-la-caja.html)), aprobada el 9-nov, **corregida
el 23-nov con el rediseño y aprobada por Richi** («Aprobada, empieza»), con las dos entregas. **En producción**
(#198, fusionada el 23-nov): migración **0124** y API con **139 consultas y 373 comandos** (dos comandos nuevos),
leídas el 23-nov.
**Sigue:** la [0144](0144-r3-la-caja.md) (R3, y sus extras E2, E3 y E5 a E8), la [0145](0145-cobrar-en-la-mesa-y-negocio-ventas.md)
(el comandero cobra y deja el efectivo en la caja) y la [0148](0148-el-rediseno.md) (todos cobran, los avisos en
una sola pieza, Ajustes en Tú · El local · El dinero).
**Cambia:** el Anexo (5.1 y 11.6), [lo investigado](../legal/lo-investigado.md) (A9), el plan de Estook TPV
(T7), el mapa, Roles (1.12) y ESTADO.

## 1 · Lo que contestó Richi el 23-nov

- **La maqueta corregida, aprobada**, y **R3 · 2 en dos entregas**: **R3 · 2 · 1 · La caja** (esta: retirar, el
  aviso del descuadre, las propinas, escribir el total y entregar la caja) y **R3 · 2 · 2 · Los descuentos**
  (cambian lo que se manda a Hacienda, los permisos y los tres sitios donde se cobra: mejor probarlo solo).
- **Las propinas se reparten entre todos los que han fichado ese día, sala y cocina**, todos marcados y se
  quita a alguien con un toque. Es lo que enseñaba la maqueta aprobada y lo que se le recomendó.

## 2 · Lo que cambió en la maqueta, y por qué

El rediseño (0148) y cobrar en la mesa (0145) llegaron después del 9-nov. En la pestaña «R3 · 2 · corregida»:

1. **Los avisos, en su sitio nuevo**: arriba a la derecha y en la campana; el de retirar, solo a quien lleva la caja.
2. **«Retirar» ya rellenado**, con un motivo nuevo, **«A la caja fuerte»**, y lo que se propone sacar.
3. **El descuento donde se cobra** (la caja, la venta rápida y el comandero), para R3 · 2 · 2.
4. **«Quédate el cambio» también al cobrar en la caja el efectivo que dejó un camarero.**
5. **«Entregar la caja», dibujada en tres pasos**, sin «a otro encargado»: con «También camareros» puede no serlo.
6. **Escribir el total en los tres recuentos**: al abrir, al entregar y al cerrar.
7. **Las propinas, con nombres**, y en Estook **cada mano de la caja** con su diferencia.
8. **Sin datáfono.** La primera versión de la corrección dibujaba el paso del datáfono y la tarjeta frente al
   datáfono, de la maqueta del 9-nov. **Desde el 11-nov la tarjeta no se cuenta** (0145, Richi): se quitó de
   la maqueta y no se construye. Lo vio la IA al construir, no Richi.

## 3 · Cómo funciona

- **«Retirar» (E2).** `la_caja` dice, solo a quien puede llevar la caja y con la caja de hoy, si lo que debería
  haber pasa de la cifra del local (`retirar_desde`, 800 € de fábrica) y cuánto se propone sacar: lo que pasa del
  fondo de siempre (o del de la caja), **en billetes de 50 €**. El aviso es uno más de los del TPV, ámbar; su
  clave cuenta lo ya sacado, así que si se retira y vuelve a pasar, sale otra vez.
- **El descuadre (E3).** Al cerrar o al entregar con más diferencia que `avisar_desde` (10 € de fábrica), un
  aviso `caja.descuadre` a quien tiene `accion.ajustes_del_tpv` y `dato.ventas` (gerente, area manager y
  dirección), **en la campana y al móvil**, uno por caja. Nunca a quien cerró. Lleva a ese día en Cierres de caja.
- **La propina (E5).** `cobrar` acepta `propina`: sale del cambio del efectivo, solo en un aparato con cajón y con
  «Quédate el cambio» encendido. Se apunta como un movimiento `propina` atado a su cobro (uno por cobro), **fuera
  del ticket**. Suma en lo que debería haber; el X y el Z la dicen en una línea; al cerrar se congela en la caja.
- **El reparto (E5).** `cerrar_caja` devuelve las propinas del día de ese cajón (las suyas y las de las cajas
  que se le entregaron) y, si el local reparte, quién ha fichado ese día. `repartir_las_propinas` las divide a
  partes iguales (los céntimos que sobran, a los primeros), **una vez por caja**, y se guarda en
  `reparto_de_propinas`, que solo se añade. Sale en el Z y en Cierres de caja.
- **Escribir el total (E6).** `abrir_caja`, `entregar_la_caja` y `cerrar_caja` aceptan `contado_total` si el
  local tiene `contar_escribiendo`; si no, billete a billete. Una forma o la otra, nunca las dos.
- **Entregar la caja (E7).** `entregar_la_caja` cierra la caja de quien la deja con su arqueo y `entregada_a`,
  **sin cerrar el día**, y abre la de quien la recibe con lo contado como fondo y `recibida_de`. Quien la recibe
  teclea su PIN y tiene que poder llevar la caja (o tomar nota, con «También camareros»); no puede ser quien
  está. La caja de ayer no se entrega: se cierra. Repetir con el mismo toque no entrega dos veces.

## 4 · El modelo (migración 0124)

- `ajustes_del_tpv`: `contar_escribiendo`, `propina_al_cobrar`, `repartir_propinas`, `retirar_desde` y
  `avisar_desde`.
- `movimiento_de_caja`: el tipo `propina` y su `cobro_id`; la política de alta, con la propina para quien cobra.
- `turno_de_caja`: `propinas`, `entregada_a` y `recibida_de` (única).
- `reparto_de_propinas`, que solo se añade; y `fichados_del_dia`, una función con privilegio que da solo el
  nombre y el rol de quien ha fichado ese día, a quien ve la caja (lección 278).
- El aviso `caja.descuadre` en las dos listas de tipos.

## 5 · Lo que decidió la IA al construirlo

1. **Lo que se propone retirar, en billetes de 50 € por encima del fondo de siempre**: lo de menos se queda
   para dar cambio. La maqueta lo enseñaba y nadie lo había escrito.
2. **«Recibida de» es quien la entregó**, no quien la abrió: en una cadena de tres manos, la tercera la recibe
   de la segunda.
3. **Una caja entregada sigue siendo una caja** en la lista de Cierres de caja: la entregada no cuenta.
4. **El aviso del descuadre también al dueño**: con un local, el gerente suele ser él.
5. **Los ajustes nuevos son opcionales en la API**: un TPV de antes que los guarda sin ellos no los apaga.

## 6 · Lo que no entra (y dónde va)

- **Los descuentos al cobrar (E8)**, en R3 · 2 · 2, con su maqueta ya corregida.
- **La bolsa del camarero (E9)**, con Estook TPV para Android (M20D).
- **Leer en la sede de Hacienda** el texto de las consultas de la propina (A9): hasta entonces, interpretación con apoyo.
