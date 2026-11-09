# El relevo de R3 · 1 · La caja (9-nov, noche)

> Para la cuenta que entre. La anterior se quedó sin uso a mitad de R3 · 1. **No se ha fusionado nada**: todo está en
> la rama `el-repaso-del-8-nov-r3-1`, subida, con su pull request abierto a `main`. Se borra este fichero en el mismo
> pull request cuando todo lo de abajo esté hecho.

## Qué es y qué decidió Richi

- La decisión: [0144](decisiones/0144-r3-la-caja.md). La maqueta aprobada (versión 3): [r3-la-caja.html](maquetas/r3-la-caja.html).
- Sus respuestas del 9-nov, todas dentro de la 0144: «Abrir caja / Cerrar caja» (cerrar la última del día es cerrar
  el día); «Está correcto», nunca «Es eso»; «Recuento obligatorio al abrir» y «También camareros» en Ajustes; en
  pruebas no se marca nada; no hay asesor (la ley la investiga la IA con fuentes oficiales); T6 · 3 no se adelanta;
  R3 en dos entregas; extras E1 a E8 en R3 (E1 y E4 en R3 · 1; E2, E3, E5, E6, E7 y E8 en R3 · 2), E9 después.

## Lo que está hecho (en la rama)

| Pieza          | Dónde                                                                                                                                                                                                                      |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| La base        | `base-de-datos/migraciones/0116_la_caja.sql` y su `.revertir.sql`: permisos `accion.llevar_la_caja` y `accion.cobrar`, ajustes de la caja, `turno_de_caja`, `cobro`, `cobro_de_linea`, `pago`, `movimiento_de_caja`        |
| El dominio     | `packages/dominio/src/caja.ts` (con su prueba) y el papel del X y del Z y el QR de «Pide tu factura» en `impresion.ts`                                                                                                     |
| La API         | `servidor/aplicacion/caja.ts`, `comandos/caja.ts` (8 comandos) y `consultas/caja.ts` (4 consultas); el ticket del cobro se imprime solo en `emitir.ts`; `la_mesa` dice lo cobrado; el aparato dice si su caja está abierta |
| Estook TPV     | `apps/tpv/src/caja/` (abrir, cobrar, cajón, «Cómo va», cerrar), `ganchos/usarLaCaja.ts`, el botón en el PIN (`puerta/ElPin.tsx`) y arriba (`inicio/LaBarraDeArriba.tsx`), «Cobrar» en la mesa, Ajustes › La caja           |
| Estook         | `apps/app/src/servicio/CierresDeCaja.tsx`: con Pro, «Cierre» pasa a «Cierres de caja», solo para ver                                                                                                                       |
| Las pruebas    | `base-de-datos/pruebas/la-caja.prueba.ts` (15, contra la base, en verde)                                                                                                                                                   |
| Los documentos | Anexo 11.6, Roles 1.12, CAMBIOS, LEEME (0144), el plan de Estook TPV (T7), historia, lo decidido por la IA, lección 266, ESTADO y [los pasos de Richi](pasos-de-r3-1-la-caja.md)                                           |

## Lo que falta, en este orden

1. **`base-de-datos/pruebas/nadie-toca-lo-de-otro-negocio.prueba.ts` falla** con `column "organizacion_id" does not
exist`, sin localizar todavía. Esa prueba siembra Bar Centro, lanza todos los comandos del catálogo con ids
   inventados, recorre todas las tablas de `estook` y mira que desde otra organización no se lee ni toca nada.
   Empezar por lo nuevo: los comandos y consultas de `servidor/aplicacion/comandos/caja.ts` y `consultas/caja.ts`, y
   las tablas de la 0116. Repetirla sola: `pnpm exec vitest run base-de-datos/pruebas/nadie-toca-lo-de-otro-negocio.prueba.ts`.
2. **Repetir `pnpm verifica` entero** (la última vuelta: 4 en rojo; ya arreglados ESTADO y `almacen.prueba.ts`).
3. **Ver las pantallas en el navegador** (no se han visto todavía): Estook TPV › Abrir caja, Cobrar (efectivo,
   tarjeta, dividir), Abrir el cajón, Cómo va, Cerrar caja, Ajustes › La caja; Estook › Servicio › Jornada › Cierres de
   caja; a 390 px y en claro y oscuro. Pasar `pnpm prueba:e2e:completa` (las fotos nuevas las sube GitHub solo).
4. **Devolver un ticket pagado en efectivo, desde la caja, saca el dinero del cajón**: decidido en la 0144 y **sin
   construir**. El tipo `devolucion` de `movimiento_de_caja` ya existe; falta usarlo en el comando de devolver
   (`servidor/aplicacion/comandos/corregir-documentos.ts`) cuando se hace en una caja con su caja abierta.
5. **El [mapa](MAPA-de-modulos.md)** (R3 · 1 hecha, R3 · 2 y lo que queda de T7) y **la sección 7 de la
   [0143](decisiones/0143-el-repaso-del-8-nov.md)** («R3 · 1, construida»), sin tocar.
6. **GitHub en verde** en el pull request, y a Richi sus pasos ([pasos-de-r3-1-la-caja.md](pasos-de-r3-1-la-caja.md)):
   fusionar, `.\estook.cmd bd:migrar` (116) y «Desplegar la API» (132 consultas y 366 comandos).
7. Después, **R3 · 2** (E2, E3, E5, E6, E7 y E8, ya dibujados en la maqueta), y luego lo que queda de T7 (cobrar sin
   internet, ventas de hoy, venta rápida, el almacén) antes de T6 · 3.

## Lo que hay que saber para no equivocarse

- **En la caja hay una persona dentro**: en las pruebas, cada uno teclea su PIN cuando le toca (`enLaCaja(correo)`).
- **Vincular un aparato cierra la sesión de Estook** en ese navegador: en las pruebas se vuelve a entrar.
- **Lo que la API hace como el sistema, la base tiene que dejárselo leer** (lección 266): al cajón y a la reapertura
  del día se les añadieron políticas para el sistema en la 0116.
- **En la consola, nada de comillas invertidas dentro de `node -e "…"`**: Bash las ejecuta y se come el texto. Para
  documentos, la herramienta de editar.
