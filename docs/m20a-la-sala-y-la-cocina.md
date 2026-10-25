# M20A · Estook TPV entero: cómo se construye

> **Estado (24-oct):** M20A · 1 · 1 (#130) y M20A · 1 · 2 (#131) **en producción**: la base y la API
> de la sala y la cocina, y unas primeras pantallas en `estook.com/tpv/`. **Richi las rechazó** el
> mismo día —un comandero dentro de Estook, no un TPV— y decidió **Estook TPV entero**
> ([0107](decisiones/0107-estook-tpv-el-tpv-entero.md)). **Qué hace cada pantalla** está en el
> [Anexo, capítulo 11](maestros/Estook-Anexo-TPV-y-Facturacion.md); aquí, **cómo se construye, en qué
> orden y cuándo se da cada entrega por buena**. **T1 · La puerta, en producción** (24-oct, #133,
> [0108](decisiones/0108-t1-la-puerta.md), migración 0083), y después **el PIN y la contraseña**
> ([0109](decisiones/0109-el-pin-y-la-contrasena.md)), lo que vio Richi al probarla. **T2 · La sala,
> construida** ([0110](decisiones/0110-t2-la-sala.md), migración 0085), en su pull request (#135).
> **T3 · Los productos va en dos**: **T3 · 1 · La botonera, construida**
> ([0111](decisiones/0111-t3-1-la-botonera.md), migración 0086), en su pull request (#136); **lo siguiente,
> T3 · 2 · Lo de cada producto.**

## Cómo se trabaja cada entrega, para que no haya nada inventado

1. **Antes de escribir código**, se relee el capítulo 11 del Anexo y los apartados que cita la
   entrega. **Si falta algo para construir, se para y se pregunta a Richi en lenguaje llano**; no se
   decide al vuelo. Lo que sí se decide al construir (un nombre interno, una consulta) se apunta en
   «Lo que decidí al construirlo» de esa entrega, como siempre.
2. **Cada entrega sale de `main`, en su rama, con su pull request**, y Richi la prueba en IKATZ
   antes de la siguiente. Si se queda grande, se parte en dos y se dice aquí.
3. **Las maquetas mandan sobre el aspecto**
   ([Estook TPV · el TPV completo](https://claude.ai/artifact/EUZuQhUJSg13As8qeUWk5X)): una pantalla
   que no está dibujada se dibuja y se enseña antes de construirla.
4. **Se da por buena** cuando pasa su «Terminado cuando», las pruebas de siempre en verde, y la
   prueba de la plantilla (Plan, regla 14).

## Las entregas

| Entrega                                            | Qué deja (y dónde está escrito)                                                                                                                                                                                                                                                                                                                                                                                                 | Lo que sale de Estook                                                          |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| **T1 · La puerta**                                 | **Vincular** (el primero con el correo, los demás con el código de 6 cifras o su QR, desvincular y el latido, 11.3) · **las cinco funciones** y el comandero personal · **solo el PIN** y el turno del operador · **el bloqueo** (11.4) · **la aprobación con el PIN de un encargado** (3.4) · **el inicio** con las baldosas que ya funcionan (11.5) · **el tema oscuro** (11.12) · Ajustes del TPV › Aparatos y PIN y bloqueo | «Abrir la sala» de Servicio › En marcha, y «El aparato para fichar» de Ajustes |
| **T2 · La sala**                                   | **El editor del plano en el TPV**, a ojo, con formas, giro, barra, paredes, salas y plantillas (11.9) · **el plano con sus dueños**, Todas · Mías y los estados (11.8), «Quedármela» · **pedir con los pases en pestañas** (11.10), con una página por sección de la carta hasta T3 · **el comandero en el móvil**                                                                                                              | «Tu sala» de Ajustes › Tu local                                                |
| **T3 · Los productos**                             | **La botonera** con sus tres caminos, «¿Quién lo prepara?» y «¿En qué pase sale?» (11.11) · **las opciones y los extras** (10.3) · **«Monta tus bebidas»**, varias raciones, las copas que se hacen solas y los cafés hechos (0106, 21 a 23) · `es_bebida` pasa a la botonera y se quita                                                                                                                                        | El interruptor «Es de bebidas» de la Carta                                     |
| **T4 · La cocina y la barra**                      | **La pantalla de cocina** (3.2): En marcha · Delivery · Fuera, tachar, «Esperando la marcha», NUEVO, ANULADO, CAMBIO y VUELVE, con su sonido · **la pantalla de barra**, con lo que prepara la barra                                                                                                                                                                                                                            | —                                                                              |
| **T5 · Estook Link** (M19a y M20A · 2)             | **Imprimir** la comanda y la cuenta, **el cajón**, y sala y cocina **sin internet** (capítulo 6, 3.6) · Ajustes del TPV › Impresoras y cajón                                                                                                                                                                                                                                                                                    | —                                                                              |
| **T6 · La facturación** (M20B)                     | **VeriFactu con Verifacti**, entero (capítulo 4), con el asesor                                                                                                                                                                                                                                                                                                                                                                 | —                                                                              |
| **T7 · Cobrar, la caja y las ventas** (M20C y M20) | **Cobrar** (10.5), **la caja** (11.6), **las ventas de hoy** (11.7), venta rápida y para llevar, y **el motor que resta del almacén** lo vendido (M20)                                                                                                                                                                                                                                                                          | —                                                                              |
| **Después, local a local**                         | El datáfono conectado (10.7), los pedidos de reparto (10.8, M29) y Revo conectado (M18)                                                                                                                                                                                                                                                                                                                                         | —                                                                              |

**Por qué en este orden.** Sin la puerta no hay TPV: todo lo demás necesita saber qué aparato es y
quién lo usa. La sala y los productos van antes que la cocina porque son lo que Richi ve primero y lo
que rechazó; la cocina ya tiene su base y su API desde 1 · 1. Link va antes del cobro porque el cajón
y el ticket salen por la impresora. **Y nadie cobra con Estook TPV hasta que T6 esté entera** (Anexo,
capítulo 9): vender un programa de facturación que no cumple ya está prohibido desde el 29-jul-2025.

### T1 · La puerta, terminado cuando

- **En IKATZ**: Richi vincula **la caja** (un ordenador o una tablet) entrando con su correo, y su
  sesión ya no está al acabar; desde ella saca un código y vincula **un móvil como comandero
  personal** de un camarero y **una tablet como comandero compartido**.
- Pasan las pruebas de 11.15 de **vincular, el código, desvincular, el comandero que no abre el
  cajón, el comandero personal, el bloqueo y dónde cae cada uno**.
- **Estook TPV no se abre con la sesión de Estook** en ningún aparato, y «Abrir la sala» ya no está.
- **El PIN nuevo nunca es fácil** (todas las cifras iguales o una escalera). **Es de 6 cifras**, el
  de siempre (Richi, 24-oct, [0108](decisiones/0108-t1-la-puerta.md)).
- **Lo de la base**: `terminal.funcion` con las cinco, de quién es y su cajón; `codigo_para_vincular`;
  `turno_del_operador` (Anexo 7.1). Una migración, con su `.revertir.sql`.

### T1 · La puerta, entregada (24-oct-2026)

**Lo que hay** ([0108](decisiones/0108-t1-la-puerta.md), migración 0083): vincular la caja con el
correo (y su sesión se cierra) y los demás con el código de 6 cifras o su QR; caja, comandero para
todos, comandero personal y fichar (cocina y barra, con T4); el PIN y el turno del operador, «No has
fichado» y «solo entra quien ha fichado»; el bloqueo y «Bloquear»; quitar lo ya mandado aprobado por
un encargado con su PIN; el inicio con Mesas, Fichar, Agotados y Ajustes del TPV; solo oscuro; y
Ajustes del TPV › Aparatos (añadir, qué es y cómo se llama, desvincular) y › PIN y bloqueo. La API,
en **109 consultas y 261 comandos**.

**Las pruebas**: `la-puerta.prueba.ts` (contra la base: las de 11.15 que son de T1, y cambiar lo que es
un aparato), `la-sala-y-la-cocina.prueba.ts` (pasada a aparatos), `aparatos.prueba.ts`,
`despachador.prueba.ts` (las dos puertas, tasadas), `secretos.prueba.ts` y `contraste.prueba.ts`; y
las de pantalla `la-puerta.spec.ts`, `la-sala.spec.ts`, `la-jornada.spec.ts`,
`personas-y-fichajes.spec.ts` y `la-app-instalable.spec.ts`.

**Lo que decidí al construirlo**: los catorce de la [0108](decisiones/0108-t1-la-puerta.md), sección
4 —como que el código no «muere a los 5 fallos» (lo frena el tope por dirección), que recargar
bloquea, que la sala solo se abre desde un aparato vinculado, o que el aparato para fichar solo
cambia de nombre—.

### T2 · La sala, terminado cuando

- **En IKATZ**: Richi dibuja su salón y su terraza **sin escribir un número**, desde una plantilla, con
  la barra y una pared, y gira una mesa; lo ve al momento en el móvil.
- Pasan las pruebas de 11.15 de **las mesas, el plano y los pases en pestañas**, y las de 10.13 de
  abrir una mesa, añadir un plato y mandar.
- **Una comanda de cuatro platos en diez toques o menos**, desde el plano (10.3), medida.
- **«Tu sala» ya no está en Estook**, y lo que se dibujó allí está en el editor del TPV, igual.
- **Lo de la base**: `mesa` con su tipo y su giro (Anexo 7.2), y lo que ya había, migrado tal cual.

### T2 · La sala, entregada (24-oct-2026)

**Lo que hay** ([0110](decisiones/0110-t2-la-sala.md), migración 0085): **el editor de la sala en
Estook TPV**, a ojo, con las seis mesas y lo que no se abre, el número siguiente y el tamaño por las
plazas, estirar, girar, imán y guías, duplicar, elegir varias, deshacer y rehacer, salas en
pestañas y tres plantillas; **el plano del servicio** con Todas · Mías, las iniciales de cada
camarero, su estado con color, icono y texto, y «ha fichado la salida»; **«Quedármela»**; y **pedir
con los pases en pestañas**, con una página por sección. «Tu sala» ya no está en Estook.

**Las pruebas**: `plano.prueba.ts` (el dominio), `geometria.prueba.ts` (mover, estirar y girar),
`losPases.prueba.ts`, `la-sala-dibujada.prueba.ts` (contra la base: las de 11.15 de las mesas y el
plano) y `la-sala.spec.ts` (dibujar en el TPV, pedir con las pestañas y **cuatro platos en diez
toques, contados**).

**Lo que decidí al construirlo**: los quince de la [0110](decisiones/0110-t2-la-sala.md), sección 2.

### T3 · Los productos, en dos (25-oct)

T3 se quedaba grande (la regla 2 de arriba), y se parte en dos ([0111](decisiones/0111-t3-1-la-botonera.md),
punto 1): **T3 · 1, la botonera**, que decide qué se vende en el TPV y a dónde va; y **T3 · 2, lo de
cada producto**, que se monta encima.

### T3 · 1 · La botonera, terminado cuando

- **En IKATZ**: Richi abre Ajustes del TPV › Productos y ve su carta ya puesta («Traer toda la
  carta», lo que hizo la migración); cambia «¿Quién lo prepara?» de una página y de un botón (el pan,
  de «Nadie»), crea un producto desde cero y lo ve en la carta de Estook, «sin escandallo»; y pide con
  «Lo más pedido».
- Pasan las pruebas de 11.15 de **productos y de «¿Quién lo prepara?»**.
- **Lo que estaba «de bebidas» va a la barra sin que nadie toque nada**, y «Es de bebidas» ya no está
  en Estook.
- **Lo de la base**: `pagina_del_tpv`, `boton_del_tpv` y lo de `local` (Anexo 7.2); `es_bebida` pasa a
  ellas y se quita.

### T3 · 1 · La botonera, entregada (25-oct-2026)

**Lo que hay** ([0111](decisiones/0111-t3-1-la-botonera.md), migración 0086): **Ajustes del TPV ›
Productos** con los tres caminos, las páginas con sus dos preguntas propuestas por el nombre, su
color y su orden, los botones con lo suyo, «Nuevos en la carta», «Lo nuevo entra solo» y «Nuevo
producto»; y **al pedir**, la botonera por páginas con «Lo más pedido» la primera, cada botón a quien
lo prepara. «Es de bebidas» ya no está en Estook.

**Las pruebas**: `botonera.prueba.ts` (el dominio), `losPases.prueba.ts`, `la-botonera.prueba.ts`
(contra la base: las de 11.15 de productos y de «¿Quién lo prepara?», lo nuevo que entra solo aunque
lo ponga un jefe de cocina, y la migración de lo que estaba «de bebidas») y `la-botonera.spec.ts`
(montarla en el TPV y pedir con ella).

**Lo que decidí al construirlo**: los quince de la [0111](decisiones/0111-t3-1-la-botonera.md),
sección 2.

### El pan, el agua y los cafés (25-oct-2026)

Lo vio Richi al probar T3 · 1, y va antes de T3 · 2 ([0112](decisiones/0112-el-pan-y-el-cafe.md),
migración 0087): **«Pan y agua»** la primera página y **«Cafés»** la última, y **«Pan para 4»** en la
mesa. Las pruebas, en `la-botonera.prueba.ts` y `la-botonera.spec.ts`.

### T3 · 2 · Lo de cada producto, terminado cuando

- **En IKATZ**: Richi monta sus bebidas con «Monta tus bebidas» y vende un Havana 7 con Coca-Cola; pone
  un extra de queso a una hamburguesa y lo ve descontar queso; vende jamón a peso; cambia un precio
  desde el TPV y lo ve en la carta de Estook.
- Pasan las pruebas de 10.12 de **las opciones obligatorias, los grupos con su escandallo y el producto
  a peso**.
- **Lo de la base**: los grupos de opciones con su mínimo, su máximo, su precio por canal y su
  escandallo (Anexo 7.2 y 10.3).

### T4 a T7

Su «Terminado cuando» es el del Plan para cada módulo (M20A, M19a, M20B y M20C) con las pruebas de
3.7, 6.8, el capítulo 8, 10.12 y 11.15 que les tocan. Se escribe aquí entero **antes de empezar cada
una**, con lo que se haya aprendido en las anteriores.

## Lo que ya está hecho (M20A · 1 · 1 y 1 · 2)

Lo de abajo es lo que se construyó antes de la 0107 y está en producción. **El servidor se queda**: las
mesas, las cuentas, los pases, mandar, marchar, tachar, «Fuera» y la carta de la sala no cambian.
**Las pantallas de 1 · 2 se rehacen** en T1 a T3, y lo que puso en Estook sale (la tabla de arriba).

## 1 · 1 · La mesa y la comanda, por dentro

**Lo que se guarda** (Anexo, capítulo 7, con la 0106):

- **`zona_de_sala`** y **`mesa`**: el plano del local (nombre, plazas y dónde está).
- **`cuenta`**: la mesa abierta (o barra, o para llevar), sus personas, **su camarero**, «por pases» o
  «todo junto», su nota para cocina, cuándo se abrió, y si se cerró o se anuló, con su motivo.
- **`pase`**: el 1.º y el 2.º de cada cuenta, con cuándo se mandó, **cuándo se marchó y quién** (siempre
  la sala) y cuándo salió todo.
- **`linea_de_cuenta`**: cada plato, con su cantidad, **el precio de la carta congelado**, su nota, su
  pase, si es del menú, y **cuándo salió y quién lo tachó**; y si se quitó, quién, cuándo y por qué.
  **Se le añaden líneas; nunca se sobrescriben** (Anexo 3.6): un quitar es una marca con motivo, no un
  borrado.
- **Lo que ha pasado**: cada paso queda en la auditoría de siempre, con quién y desde dónde.

**Lo que se puede hacer** (cada cosa, una operación de la API con su permiso):

| Operación                               | Quién (Roles 1.12)                                                                                                          | Lo que no deja                                                  |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| **Dibujar el plano**: zonas y mesas     | Quien toca los ajustes del local (Ajustes › Sala)                                                                           | Archivar una mesa abierta, o dos mesas con el mismo nombre      |
| Abrir una mesa, pedir, cambiar una nota | Sala                                                                                                                        | Pedir en una mesa cerrada o anulada, o un plato agotado         |
| **Mandar a cocina**                     | Sala                                                                                                                        | Mandar dos veces lo mismo: cada línea nace con su identificador |
| **Marchar el 2.º**                      | Sala; **nunca la cocina**                                                                                                   | Marchar un pase ya marchado                                     |
| **Tachar y destachar** un plato         | Cocina (y quien lleva el local)                                                                                             | Tachar lo que no se ha mandado                                  |
| «Todo fuera» y «Recuperar»              | Cocina                                                                                                                      |                                                                 |
| **Quitar un plato**                     | Sala; ya en cocina, con motivo, y el camarero lo pide y lo aprueba un jefe (la aprobación con PIN llega con los terminales) | Quitar sin motivo lo que ya está en cocina                      |
| Cambiar de mesa, juntar mesas           | Sala                                                                                                                        | Juntar con una mesa de otro local                               |
| **Pasar a otro camarero**               | El camarero, las suyas; jefe de sala y gerente, cualquiera                                                                  |                                                                 |
| Anular la mesa                          | Jefe de sala y gerente, con motivo                                                                                          |                                                                 |

**Lo que se lee**: el plano (cada mesa con su estado: libre, comiendo, «toca marchar», pide la cuenta…),
una mesa con su cuenta, y **la cocina** (En marcha, Delivery y Fuera) **sin un solo importe**, tampoco
en la respuesta.

**El aviso al segundo**: lo que cambia una mesa toca a quien la tiene abierta y a la cocina, con el
mismo toque del chat (0073). Si el toque no llega, la pantalla pregunta cada pocos segundos.

## La regla 14 y la prueba de la plantilla, de M20A · 1

| Pregunta                            | Respuesta                                                                                                                                                              |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ¿Qué datos usa?                     | La carta y sus precios por canal (M9 · 1), el menú del día (M10 · 2), los agotados (M10 · 1), los alérgenos (M9 · 2), las personas y sus roles (M1), la jornada (M16a) |
| ¿Quién más se entera?               | La cocina y la sala, al segundo. Los agotados, en la carta. Nadie más hasta cobrar (M20C)                                                                              |
| ¿Qué automatiza Fogón?              | Nada. Todo son reglas en código, sin gastar créditos (Anexo 3.2)                                                                                                       |
| ¿Qué aprueba una persona?           | Quitar un plato que ya está en cocina, y anular la mesa                                                                                                                |
| Permisos                            | Roles 1.12, en la base y no en la pantalla                                                                                                                             |
| ¿Sin internet?                      | En 1 · 1 a 1 · 4, no: va por internet. Sin internet, con Estook Link (M19a)                                                                                            |
| ¿Dos veces?                         | Cada línea y cada mesa nacen con su identificador: mandar dos veces no pide dos platos                                                                                 |
| Auditoría                           | Abrir, mandar, marchar, tachar, quitar, cambiar, juntar, pasar y anular, con quién y cuándo                                                                            |
| 16 · ¿Trabajo nuevo?                | No: sustituye a la libreta y al grito a cocina. Quien lleva el local dibuja su plano una vez                                                                           |
| 17 · ¿Duplica algo?                 | No: la carta, los precios y los menús son los de Estook; el TPV no configura nada                                                                                      |
| 18 · ¿Bloquea el servicio?          | No: nada impide pedir ni mandar. Lo único que pide un jefe es quitar lo que ya está en cocina                                                                          |
| 19 · ¿Fácil?                        | El botón grande dice siempre lo siguiente; una comanda de cuatro platos en diez toques                                                                                 |
| 20 · ¿Avisa solo cuando hace falta? | A la sala, cuando ha salido todo un pase; a la cocina, lo nuevo, lo anulado y la marcha                                                                                |
| 21 · ¿Con datos a medias?           | Sin plano, se pide en barra o para llevar; un plato sin foto sale con su nombre                                                                                        |
| 22 · ¿Señala a alguien?             | No: lo que ha pasado dice quién, como cualquier historial, y nada más                                                                                                  |

## 1 · 1, entregada (23-oct-2026)

**La base**: la migración 0081 (cinco tablas, tres permisos y las reglas que la base vuelve a mirar
aunque alguien se salte la API: marchar es de la sala, tachar de la cocina, lo mandado no se
reescribe y quitarlo pide motivo y un jefe). **La API**: 3 consultas (`el_plano`, `la_mesa`,
`la_cocina`) y 23 comandos (el plano, la sala y la cocina), que la dejan en **105 consultas y 253
comandos**. **El dominio** (`packages/dominio/src/sala.ts`): qué pase sale al mandar, cuándo toca
marchar, qué dice el botón grande y dónde está la mesa en la cocina, en una sola función para la
sala y la cocina.

**La prueba** (`base-de-datos/pruebas/la-sala-y-la-cocina.prueba.ts`) juega la mesa 6 entera: Rosa
dibuja el plano; Sara abre para cuatro, pide primero las bebidas y luego dos de carta y dos menús;
sale el 1.º y el 2.º espera; Marcos lo ve sin un euro, tacha y a Sara le toca marchar; NUEVO,
CAMBIO, ANULADO y VUELVE; «Fuera», «Recuperar» y «Todo fuera»; los postres salen solos; pasar la
mesa, cambiarla, juntarla y liberarla; anular; «todo junto» y la barra. Y Luis, de otro negocio,
no ve nada.

### Lo que decidí al construirlo

1. **El plano entra en 1 · 1** (seis operaciones), aunque su pantalla sea de 1 · 2: sin mesas no se
   abre ninguna, y la API no se podía probar entera.
2. **Una mesa recién abierta dice «Pedir»**, no «Cobrar», y sale en el plano como «sin pedir».
3. **Una mesa anulada no desaparece de la cocina**: pasa a «Fuera» marcada ANULADA, con su motivo,
   para que nadie siga haciéndola sin saber por qué se fue.
4. **Quitar el último plato que faltaba de un pase da el pase por salido**, igual que tacharlo.
5. **Lo agotado no se pide**: la pantalla lo enseñará apagado, y la API lo vuelve a mirar.
6. **Liberar la mesa no quita nada de la cocina**: lo que quede sigue en «En marcha» hasta tacharlo.
7. **Quitar lo que ya está en cocina** lo hace directamente quien tiene «Quitar de cocina» (un
   jefe). Que el camarero lo pida y el jefe lo apruebe con su PIN llega con los terminales (1 · 2).
8. **El plato de un menú se cobra por su suplemento** del último día montado; la línea del menú no
   va a cocina, van sus platos.
9. **«Recuperar» devuelve lo último que se tachó** del último pase que salió: es lo que se dio por
   salido sin querer.
10. **Pasar mesas**: el camarero, las suyas; quien tiene «Quitar de cocina», cualquiera; y solo a
    quien toma nota en el local.

## 1 · 2, entregada (23-oct-2026)

**Estook TPV ya tiene su puerta**, `apps/tpv` (`estook.com/tpv/`): el plano con cada mesa y cómo
va, el aviso «Mesa 6 · ha salido todo el 1.º» con su «Marchar el 2.º», abrir la mesa (cuántos son y
por pases o todo junto), **Bebidas · Carta · Menú del día**, la nota de cada plato, lo que se hace
con lo ya mandado (cambiar la nota, devolver, quitar con motivo) y las opciones de la mesa (cambiar
de mesa, juntar, pasar a otro camarero, nota para cocina, personas, sacadlo todo, liberar y
anular). En la tablet, la cuenta a la izquierda; en el móvil, lo que se pide ocupa la pantalla.

**En Estook**: Ajustes › Tu local › **Tu sala** (las zonas y las mesas, arrastrándolas), el
interruptor **«Es de bebidas»** en cada sección de la Carta, y **«Abrir la sala»** en Servicio ›
En marcha para quien toma nota.

**La base y la API**: la migración 0082 (`es_bebida` en las secciones de la carta y del menú),
`la_carta_de_la_sala` (la carta por secciones y los menús de hoy con el pase de cada sección),
`el_plano_del_local` (para dibujarlo con el permiso de Ajustes) y quién toma nota en `el_plano`.
La API queda en **107 consultas y 253 comandos**.

**Las pruebas**: la mesa 6 suma la carta de la sala, las bebidas que van solas a la barra, lo del
menú que no está hoy y el 2.º que no sale solo (35 contra la base); el dominio (33), el plano dibujado (3), la lógica de
la comanda (10); y `la-sala.spec.ts`, de Ajustes › Tu sala a mandar desde Estook TPV, en escritorio
y en móvil.

### Lo que decidí al construirlo

1. **Estook TPV entra con la sesión de Estook**: los dos viven en `estook.com` y comparten el token.
   La tablet compartida del local, con el PIN de cada uno (los terminales, Anexo 3.4), llega con
   la cocina, que es donde hace más falta.
2. **«Es de bebidas» se adelanta de 1 · 4**: sin ella, la pestaña Bebidas no sabe qué enseñar ni
   la caña a dónde va. Lo que ya había se marcó por su nombre (Bebidas, Vinos, Cafés, Copas…), y
   una sección nueva con esos nombres nace marcada.
3. **El destino lo decide la API**, por la sección: la pantalla no puede mandar una caña a cocina.
4. **Lo que se pide se queda en la tablet hasta «Mandar»**: cada toque no espera a la red, y si
   se recarga no se pierde. Al salir de la mesa con algo sin mandar, se pregunta.
5. **Un pase que ya esperaba no sale solo al añadirle algo** (un fallo que salió probándolo: el
   1.º había salido de cocina, se pidió otro principal y el 2.º salía en marcha). Ahora solo sale
   solo un pase nuevo, como los postres; el que espera lo marcha el camarero.
6. **«Va en el»**: lo de comida va en el 1.º en una mesa sin nada y, si no, en el último pase con
   algo; se cambia con un toque. Una mesa recién abierta empieza en Bebidas.
7. **El plato de un menú tiene que estar en el menú de hoy**, el de la jornada (la cena que acaba a
   la una es del día de antes), y lo que solo está en el menú no se pide suelto.
8. **Los menús se reparten en orden** (el primer menú lleva el primero de cada sección) y **el
   postre del menú se elige al final**, dentro de su menú.
9. **Al segundo, con el toque del chat**; si no llega, la pantalla pregunta cada 8 segundos, y si
   llega, una vez por minuto por si acaso.
10. **«Marchar ya»** junto a cada pase que espera: el aviso llega cuando la cocina ha sacado todo
    lo de antes, pero marcha el camarero cuando quiera, que es quien ve la mesa.
11. **Liberar la mesa** dice «ya han pagado en el TPV de siempre» hasta M20C. **Cobrar, imprimir,
    dividir, venta rápida, las alergias de la mesa, «pide la cuenta» y «lo que ha pasado»**
    llegan con lo suyo (M19a, M20C), no se enseñan apagados.

### La auditoría de después (23-oct)

Richi pidió revisarla entera antes de fusionar. Los dos rojos de GitHub no eran del código: la
tanda 4 de pantallas se quedó 15 minutos bajando los navegadores, y «Construcción y
presupuestos» junta las cuatro. Lo que sí salió, ya arreglado y probado:

- **La nota de la mesa se borraba** al guardarla desde el plano: empezaba en blanco (lección
  217). Y desde el plano no salía «Sacadlo todo». La mesa del plano trae ahora su nota, si va
  por pases y quién la lleva.
- **Una mesa que se cierra en otro aparato** (liberada, anulada o juntada) lo dice, enseña lo
  que no se llegó a mandar y vuelve al plano, en vez de dejar pedir y fallar al mandar.
- **«Marchar ya» pregunta** si lo de antes aún no ha salido entero: marchar no tiene vuelta
  atrás. Cuando ya toca, lo hace el botón grande y «Marchar ya» no sale.
- **Lo ya mandado**: un menú solo se quita; lo que ya salió abre en «Devolver», sin nota; la
  nota de una bebida es «para la barra»; y quien no es jefe sabe antes de escribir que lo
  quita un jefe.
- **«Mandar ahora»** al salir con algo sin mandar lleva al plano; **liberar** avisa si hay
  platos sin mandar; **pasar a otro camarero** elige por la persona, no por el nombre; el
  aviso de arriba dice el pase que ha salido de verdad («todo el 1.º»).
- **En el móvil**: «Menú» en vez de «Menú del día 16,50» en tres líneas, el buscador en su
  línea, los platos a una columna y sin cortar el nombre.
- **En Ajustes › Tu sala**, quitar una zona o una mesa pide un segundo toque.
- **La escucha al segundo**, una sola para toda la sala: entrar y salir de una mesa no vuelve
  a conectar. Y el nombre de arriba lleva de vuelta a Estook.
