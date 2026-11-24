# La auditoría del 25-nov · Las siete entregas desde S1

> Dentro de la Ampliación 1 ([0153](../decisiones/0153-la-ampliacion.md), sección 7). El Plan (E5) pide una
> cada cuatro entregas de código; desde S1 (18-nov) iban siete: el rediseño (#192 a #195), M20 · 1 y fuera el
> aprovechamiento (#196), M20 · 2 (#197) y R3 · 2 · 1 · La caja, segunda parte (#198).

## Qué se miró

De [la lista](LEEME.md): **1 · los negocios, separados**; **2 · los roles y los permisos**; **3 · cada
operación del servidor, con su puerta**; **4 · los límites de cada plan**; **6 · los datos de los empleados**
(lo que toca la caja); y en calidad, **unitarias, de integración y de permisos**, con `pnpm prueba` entero.

## Cómo

- **La base:** las tablas, las políticas y las funciones con privilegio que trajeron las migraciones 0119 a
  0124, una a una.
- **El servidor:** las nueve operaciones nuevas desde S1 (`entregar_la_caja`, `repartir_las_propinas`,
  `como_va_hoy`, `los_vendidos_por_producto`, `vendidos_sin_escandallo`, `los_recomendados`, `el_menu_de_hoy`,
  `recomendar_plato` y lo de retirar), con lo que exigen, dónde se pueden llamar y lo que miran por dentro.
- **Las pruebas que atacan:** `nadie-toca-lo-de-otro-negocio`, `los-permisos-de-la-api`, `permisos` y la de
  S1 (cada operación nueva, decidida para Esencial), en verde.
- **Y lo que vio Richi en el servicio**, que es auditoría de verdad: los fallos 1 y 2 de la 0153.

## Qué salió, de más grave a menos

1. **La venta rápida podía cobrarse a 0 €** (fallo 1 de Richi). Un plato con un id que ya era de otra cuenta
   se saltaba en silencio. **Arreglado** en el servidor (lo dice, `ya_hecho`) y en el TPV (se sigue el mismo
   cobro). Prueba en `la-sala-y-la-cocina.prueba.ts`, vista fallar sin el arreglo.
2. **La mesa salía «Bebiendo» sin servir** (fallo 2 de Richi): lo de la barra no contaba. **Arreglado**, con la
   migración 0125 (la base dejaba marcar lo de la barra solo con la opción encendida). Pruebas en
   `sala.prueba.ts`, `la-sala-y-la-cocina.prueba.ts` y `la-barra-y-la-alergia.prueba.ts`.
3. **La cola de lo vendido la podía escribir y vaciar cualquiera del local** (0121, `for all`). Por la API no se
   llega más que desde el cobro, pero lo decide la base: si alguien la vaciara, lo vendido no bajaría del
   almacén. **Arreglado** en la 0125 (solo el sistema la escribe; el local la ve) y en el servidor (la toca
   como el sistema). Prueba en `lo-vendido-baja.prueba.ts`, vista fallar sin la política.

**Sin hallazgos** en lo demás: las tablas nuevas (`linea_bajada`, `reparto_de_propinas`) tienen su seguridad
por filas y solo se añaden; `fichados_del_dia` devuelve el nombre y el rol y solo a quien ve la caja;
`entregar_la_caja` y `repartir_las_propinas` exigen tomar nota para entrar, pero por dentro piden poder llevar
la caja (y la base, en `reparto_alta`); las consultas nuevas piden su permiso (`dato.ventas`,
`app.escandallos`, `app.panel`, `app.carta`).

## Qué queda

- **`el_menu_de_hoy` sale** con el widget del menú del día (fallo 6): una operación menos que vigilar.
- La siguiente auditoría del Plan, **la 3, después de la Ampliación 4**: los datos de los empleados (contratos,
  nóminas, vacaciones y notas personales), antes de darlas por buenas.
