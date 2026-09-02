import { CODIGOS_DE_PASO, numeroDelPaso, type PasoDelAlta } from '@estook/dominio';
import { FalloDeAplicacion, type Contexto } from './contrato.ts';

/**
 * Lo que comparten los pasos del alta (M5).
 *
 * Vive aparte por la regla 6. Cada paso guarda cosas distintas —el tipo de local,
 * la direccion, los objetivos— pero **avanzar es siempre lo mismo**, y si cada
 * comando lo hiciera a su manera acabaria habiendo ocho formas de contar por
 * donde va un alta.
 */

/**
 * El local sobre el que se esta haciendo el alta.
 *
 * **Sale de la sesion, no de lo que mande el cliente**, igual que todo lo demas
 * desde M4. Un identificador en la peticion seria pedirle al servidor a que local
 * mirar, que es el error tipico que M1 avisa de no cometer.
 */
export function elLocalDeLaSesion(contexto: Contexto): string {
  const localId = contexto.sesion?.localId;
  if (!localId) {
    throw new FalloDeAplicacion('faltan_datos', {
      porque: 'Hay que estar dentro de un local para darlo de alta. Elige uno primero.',
    });
  }
  return localId;
}

/** La organizacion de la sesion, para la auditoria y los eventos. */
export function laOrganizacionDeLaSesion(contexto: Contexto): string {
  const organizacionId = contexto.sesion?.organizacionId;
  if (!organizacionId) throw new FalloDeAplicacion('sin_sesion');
  return organizacionId;
}

/**
 * Marca un paso como respondido.
 *
 * Dos cosas, y las dos importan:
 *
 * 1. **El paso solo sube, nunca baja.** Volver atras a corregir la direccion no
 *    puede devolver el alta al paso cuatro y hacer que quien ya habia terminado
 *    tenga que repetirlo todo. Se guarda por donde se ha llegado, no donde se
 *    esta mirando.
 * 2. **Responder un paso lo quita de los saltados.** Quien se salto la marca y
 *    despues sube su logo ya no la tiene pendiente, y la barra de progreso tiene
 *    que enterarse sin que nadie se acuerde de borrarlo a mano.
 */
export async function respondido(
  contexto: Contexto,
  localId: string,
  paso: PasoDelAlta,
): Promise<void> {
  const siguiente = numeroDelPaso(paso) + 1;

  await contexto.sql`
    update estook.local
       set onboarding_paso = greatest(onboarding_paso, ${siguiente}),
           onboarding_saltados = array_remove(onboarding_saltados, ${paso})
     where id = ${localId}
       and not onboarding_terminado
  `;
}

/**
 * Lee el estado del alta de un local.
 *
 * Se pide con las politicas aplicando, asi que de un local que no se ve no
 * vuelve nada: no hay que comprobar de quien es.
 */
export interface EstadoDelAlta {
  readonly paso: number;
  readonly saltados: readonly PasoDelAlta[];
  readonly terminado: boolean;
}

export async function estadoDelAlta(
  contexto: Contexto,
  localId: string,
): Promise<EstadoDelAlta | null> {
  const filas = await contexto.sql<
    { onboarding_paso: number; onboarding_saltados: string[]; onboarding_terminado: boolean }[]
  >`
    select onboarding_paso, onboarding_saltados, onboarding_terminado
      from estook.local where id = ${localId}
  `;

  const fila = filas[0];
  if (!fila) return null;

  return {
    paso: fila.onboarding_paso,
    // Un codigo que ya no existe —porque se renombro un paso— se ignora en vez
    // de romper la pantalla. Lo que no esta en el catalogo, no cuenta.
    saltados: fila.onboarding_saltados.filter((c): c is PasoDelAlta =>
      (CODIGOS_DE_PASO as readonly string[]).includes(c),
    ),
    terminado: fila.onboarding_terminado,
  };
}
