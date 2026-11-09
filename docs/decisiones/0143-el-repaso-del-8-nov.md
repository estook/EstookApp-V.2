# 0143 · El repaso del 8-nov: pulir antes de seguir

**Fecha:** 8 de noviembre de 2026
**Estado:** aprobada por Richi el 8-nov con su maqueta («por mí está todo ok, mucho mejor, más intuitivo, más app
moderna»); **en tres entregas (R1 a R3)**, cada una con su pull request **a `main`**.
**Sigue:** la [0142](0142-la-pausa-del-8-nov.md) (la pausa del 8-nov), la [0133](0133-r3-ajustes-y-secciones.md) (icono y color de cada
sección del TPV) y la [0105](0105-m16a-la-jornada.md) (la jornada).
**Maqueta:** [el repaso del 8-nov](../maquetas/el-repaso-del-8-nov.html), aprobada el 8-nov.

Tras ver la pausa del 8-nov en producción, Richi paró: «no vamos a avanzar hasta que esto quede perfecto». Pidió el
Google del TPV, la caja con su arqueo, un TPV más moderno (fotos, colores, tema claro), Carta, Escandallos y Menús
rehechos, el Panel sin huecos, objetivos por semana o mes y textos sin redundancias. Y una norma: **lo más sencillo e
intuitivo siempre gana**.

## 1 · Lo que se encontró

1. **«Continuar con Google» no salía al vincular el TPV.** `Vincular.tsx` pedía `como_se_entra` como comando y es una
   consulta: la API contestaba «Eso ya no está» y el botón se quedaba escondido. Ninguna prueba lo miraba. Arreglado,
   y `la-puerta.spec.ts` lo comprueba.
2. **La caja y el arqueo no estaban hechos** porque la 0142 los dejó para T7, con el cobro: Estook TPV todavía no dice
   si se cobra en efectivo o con tarjeta, y sin eso no hay «lo que debería haber en el cajón».
3. **El TPV sí pinta la foto del plato, pero como una franja de 56 px** a la izquierda del botón: no se ve. La maqueta
   decía al principio que no la pintaba; era un error de la IA, corregido.
4. **Las secciones de la carta y las páginas del TPV son dos listas** (`seccion_de_carta` y `pagina_del_tpv`): por eso
   el color y el icono del TPV no salen en Estook.
5. **Ajustes del TPV no tiene salida**: ni cambiar de persona ni desvincular el aparato desde ahí.

## 2 · Las tres entregas

| Entrega                                        | Qué lleva                                                                                                                                                                                                                                             |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **R1 · El TPV y el Panel**                     | Google al vincular. **Tema claro, oscuro o automático** en Estook TPV. **Botones con la foto arriba**, o el icono de su sección sobre su color. Ajustes del TPV más grandes y con **«Tu sesión»**. El Panel sin huecos (Equipo ahora, Caduca). Textos |
| **R2 · Carta, Escandallos, Menús y objetivos** | **Una sola lista de secciones** con su color y su icono para Estook y el TPV. Carta con «+ Plato» y «⋯». Escandallos de peor a mejor. Menús por semana. **Objetivos en € por semana o por mes**. Fuera el «+» flotante donde ya hay botón principal   |
| **R3 · La caja (lo primero de T7)**            | Abrir contando el cajón, cobrar en efectivo, tarjeta o dividido, sacar y meter dinero, cerrar a ciegas y el arqueo. En Estook con Pro, **Cierres de caja** solo para ver; ese día se quita el cierre a mano                                           |

## 3 · Lo que no se olvida

- **Cada caja, su arqueo**; el día se cierra cuando lo están todas. **El fondo de siempre** se pone una vez, y al
  cerrar Estook dice cuánto retirar. **Un cierre no se edita**: se reabre con motivo, como hoy. **Sin Pro**, el cierre a
  mano sigue.
- **El tema del TPV es de cada aparato** (la caja de la barra al sol, la tablet de la cocina a oscuras).
- **«Cambiar de persona»** devuelve el aparato al PIN; **«Desvincular este aparato»** lo saca del local, pide
  confirmar y solo lo ve quien puede vincular aparatos.

## 4 · Lo que contestó Richi el 9-nov, antes de R2

1. **El botón flotante se queda donde está** (ya se aparta al bajar), pero **lleva el dibujo de Fogón** y no un «+»,
   que «parece para agregar cosas»; se abre en **una ventana pequeña encima del botón, como un chat**, y **sin «Tus
   atajos»**, que eran «demasiado». «Adaptar las pantallas a ese botón no tiene ningún sentido». Corrige la fila del
   «+» de la sección 2: el botón no se quita de ninguna pantalla.
2. **Los objetivos en € por hora se borran y se empieza de cero** con los de € por semana o por mes.
3. **R2 va en dos entregas**: **R2 · 1** (la carta, sus secciones y el botón de Fogón) y **R2 · 2** (Escandallos,
   Menús y objetivos), cada una con su pull request a `main`.

## 5 · R2 · 1 · La carta y sus secciones, construido (#184, en producción el 9-nov, migración 0114)

- **El color y el icono de una sección son uno solo** (0114): viven en `seccion_de_carta`; la página del TPV que
  vino de una sección lee los suyos, y cambiarlos en el TPV cambia la sección. Lo que el local ya había elegido en el
  TPV pasa a su sección al migrar.
- **Estook › Carta**: arriba «+ Plato» y «⋯» (Importar tu carta, Nueva sección, Desde el almacén); un atajo a cada
  sección; cada sección con su icono en su color; cada plato con su foto o, sin foto, el icono de su sección; y a quien
  ve costes, su food cost debajo del precio. La hoja de la sección elige color e icono con **el mismo selector que el
  TPV**, que ahora vive en `@estook/ui`.
- **El botón de Fogón**, como se contestó en la sección 4. Los atajos se cambian en la tarjeta «Atajos» del Panel.
- **Cabeceras**: el nombre de la app encima del título solo si es otro («Carta / Carta» no dice nada), y **sin
  pestañas cuando solo hay una**.

### Lo que decidió la IA al construirlo

1. **Solo el color y el icono son de los dos**; el nombre y el orden siguen siendo de cada uno, porque en el TPV los
   nombres son cortos (30 letras) y el orden de la botonera no tiene por qué ser el de la carta.
2. **Cambiar el color en el TPV pide poder editar la carta**: lo tienen gerente, area manager y dirección, que son
   quienes tienen los Ajustes del TPV. Si alguien no lo tuviera, el TPV dice «sin permiso» en vez de no hacer nada.
3. **«Desde el almacén»** sale en «⋯» y dentro de «Añadir platos» («¿Lo vendes tal cual?»), no arriba: vincular un
   plato ya existente sigue en su ficha, junto a desgranar.
4. **El plato sin foto lleva el icono de su sección tintado**, no macizo: diez baldosas macizas seguidas pesaban
   demasiado en la lista. En el TPV siguen macizas, que es donde se buscan de un vistazo.
5. **La Carta aguanta una API de antes**: entre fusionar y desplegar la API, las secciones se ven con lo que propone su
   nombre.

## 6 · R2 · 2 · Escandallos, Menús y objetivos, construido (#185, fusionada el 9-nov, migración 0115)

- **Los objetivos, en € a la semana o al mes** (0115): una cifra y su periodo para todos, y una distinta para quien
  haga falta. Los de € por hora se borran al migrar (Richi, 9-nov). Si se mira otro periodo, la meta se reparte por
  días (4.000 € al mes son 933,33 € en una semana de noviembre), y **cada barra dice si va por delante o por detrás de
  lo que toca a estas alturas** (`laMetaDelPeriodo` y `laMetaHastaHoy`, en el dominio y con sus pruebas).
- **Escandallos**, a quien ve costes: arriba **el food cost medio en su anillo**, con el objetivo y cuántos pasan o
  están sin hacer; debajo, **los platos de peor a mejor**, cada uno con su anillo del color del semáforo, lo que
  cuesta, y su foto o el icono de su sección. Sin costes, por secciones como antes.
- **Menús**: el precio y «Descargar» en una línea; cada día con **un punto que dice si tiene menú**; «Copiar la semana
  pasada» y «Otro menú» en «⋯»; «Añadir plato» ligero.
- **El botón de Fogón**, rehecho tras verlo Richi en el móvil (dos aros y Fogón descentrado y cortado): el dibujo se
  recorta por dentro de su aro y el aro lo pone el botón, uno solo; la misma cara en la ventana.

### Lo que decidió la IA al construirlo

1. **El periodo es uno para todo el local**: el de todos y los distintos se guardan con el mismo. Con dos periodos
   mezclados, la lista de Empleados no se podría comparar.
2. **Sin cifra puesta no se guarda**: no hay un objetivo de fábrica que nadie ha elegido (antes salían 45 €/h).
3. **«Por delante» o «por detrás» con lo que toca a estas alturas**, y no con la meta entera: a mitad de mes, la mitad
   de la meta ya es ir bien. Verde o ámbar, sin rojo: un camarero no está «mal» el día 3.
4. **El detalle de un escandallo no se ha rehecho**: ya tenía lo de la maqueta (coste, food cost con su objetivo,
   precio recomendado, lo que deja en cada canal y la barra de cada ingrediente).
