import { z } from 'zod';
import { AVISO_AL_GASTAR } from '@estook/dominio';
import { consulta } from '../contrato.ts';
import {
  POR_QUE_ESTA_APAGADO,
  comoEstaFogon,
  loGastadoEnElLocal,
  loQueQueda,
  type LoQueQueda,
} from '../fogon.ts';
import { loQuePuede } from '../lo-que-puede.ts';

/**
 * Fogón y yo: si habla aquí, lo que puedo pedirle y lo que le queda (0097).
 *
 * La pide la ventana de Fogón al abrirse y los botones «con Fogón» para saber si se
 * enseñan. **No llama al modelo ni gasta nada**: lee los interruptores y lo apuntado.
 */
export type FogonYYo =
  | {
      readonly habla: true;
      readonly queda: LoQueQueda;
      /** Al 80 % de los del mes, se avisa (Manifiesto, «Cuando se acaban»). */
      readonly casiSinCreditos: boolean;
      /** Si puede rellenar escandallos y escribir pasos (quien edita Escandallos). */
      readonly puedeRellenar: boolean;
    }
  | { readonly habla: false; readonly porque: string };

export const fogonYYo = consulta<Record<string, never>, FogonYYo>({
  nombre: 'fogon_y_yo',
  entrada: z.object({}).strict(),

  async ejecutar(contexto) {
    const como = await comoEstaFogon(contexto);
    if (!como.habla) return { habla: false, porque: POR_QUE_ESTA_APAGADO[como.porque] };
    const localId = contexto.sesion?.localId ?? '';
    const puede = await loQuePuede(contexto, localId, ['app.fogon', 'app.escandallos']);
    if (!puede.ver('app.fogon')) {
      return { habla: false, porque: 'Fogón no está en tu puesto.' };
    }
    const gastado = await loGastadoEnElLocal(contexto, localId);
    const queda = loQueQueda(gastado, como.creditosDelMes);
    return {
      habla: true,
      queda,
      casiSinCreditos: gastado.creditosMes >= como.creditosDelMes * AVISO_AL_GASTAR,
      puedeRellenar: puede.editar('app.escandallos'),
    };
  },
});
