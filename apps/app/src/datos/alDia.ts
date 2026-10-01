/**
 * Lo que se pone al día solo, sin tocar nada (30-sep, Richi: «¿la info se actualiza
 * sola o hay que hacerlo a mano?»).
 *
 * Tres escalones, de más barato a más caro:
 *
 *   1. **Lo que haces tú se ve al momento**, en tu aparato: cada cambio vuelve a
 *      preguntar lo que toca. Eso ya era así.
 *   2. **Al volver a la app** —desbloquear el móvil, cambiar de pestaña— se vuelve a
 *      preguntar lo que tenga más de un minuto (`Aplicacion.tsx`). Antes no.
 *   3. **Lo que cambia por otros mientras miras** se pregunta cada minuto, y solo con
 *      la app a la vista: la campana (que ya lo hacía), el Tablón, «Lo de hoy» y
 *      quién ha fichado. Con el móvil en el bolsillo no se pregunta nada.
 *
 * **Al segundo, no**: eso pide que el servidor avise en vez de que la app pregunte,
 * y llega con el chat (entrega C), que es donde un minuto sí es mucho. Preguntarlo
 * todo cada pocos segundos gastaría batería y servidor para mover casi nada.
 */
export const CADA_MINUTO = 60_000;

/** Para las consultas de lo que cambian otros: el Tablón, «Lo de hoy», quién ha fichado. */
export const AL_DIA = {
  refetchInterval: CADA_MINUTO,
  refetchOnWindowFocus: true,
} as const;
