import { z } from 'zod';
import { comando } from '../contrato.ts';
import { elLocalDeLaSesion } from '../alta.ts';
import { recomendarElPlato } from '../recomendados.ts';

/**
 * **Recomendar un plato desde la Carta** (0120; el rediseño, entrega 3). Richi, 21-nov: «Desde
 * Carta, el gerente podría marcar cualquier producto con una opción "Recomendar para venta"». Lo
 * marca quien edita la Carta (el gerente y los jefes) y sale en «Recomendados» del TPV y en «Para
 * recomendar» del Panel de la sala. Ocho como mucho.
 */
const entradaRecomendarPlato = z
  .object({
    plato_id: z.string().uuid(),
    recomendado: z.boolean(),
  })
  .strict();

export const recomendarPlato = comando<
  z.infer<typeof entradaRecomendarPlato>,
  { platoId: string; recomendado: boolean }
>({
  nombre: 'recomendar_plato',
  entrada: entradaRecomendarPlato,
  exige: 'app.carta',

  async ejecutar(contexto, entrada) {
    const localId = elLocalDeLaSesion(contexto);
    await recomendarElPlato(contexto, localId, entrada.plato_id, entrada.recomendado);
    return { platoId: entrada.plato_id, recomendado: entrada.recomendado };
  },
});
