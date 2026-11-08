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
