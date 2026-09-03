import { z } from 'zod';
import { comando, FalloDeAplicacion, type Contexto } from '../contrato.ts';

/**
 * Salir (M4, con la demostración de M5 dentro).
 *
 * Cierra **esta** sesion y ninguna mas. Quien sale del ordenador del despacho no
 * quiere que se le cierre el movil.
 *
 * Se puede llamar con la sesion a medias —esperando el segundo factor—, con la
 * contrasena por cambiar y **desde una demostracion**. Es lo minimo decente:
 * siempre se puede salir.
 */

/**
 * Cerrar la sesion que se está usando. **El único sitio donde se decide cómo.**
 *
 * Hay dos formas de irse y no son la misma, así que la diferencia vive aquí y no
 * repartida por los comandos (regla 6):
 *
 *   · Una sesion normal **se cierra**: la fila se queda con su hora de apertura
 *     y su hora de cierre, que es lo que hace útil «Mis dispositivos». Nada se
 *     borra (principio 6).
 *   · Una visita de demostracion **se borra**. Lo que se prometió fue «se entra y
 *     se sale sin dejar rastro», y una fila cerrada es un rastro.
 *
 * ── El fallo que esto arregla ────────────────────────────────────────────────
 *
 * `salir` no admitía demostraciones, y el botón «Salir» de la aplicación llama a
 * `salir`. Una visita que se iba recibía un 403, la pantalla se olvidaba del
 * token igualmente —y menos mal— pero **la sesión seguía viva en el servidor**
 * hasta caducar. El token que se acababa de «cerrar» seguía abriendo `quien_soy`.
 *
 * La ficha de M5 pide «modo demostración con **salida limpia**», y no lo era.
 * Existía `salir_de_la_demostracion`, que sí lo hacía bien, y no lo llamaba
 * nadie: es la forma más cara de tener razón.
 */
export async function cerrarLaSesion(contexto: Contexto): Promise<void> {
  const { sql, sesion } = contexto;
  if (sesion === null) throw new FalloDeAplicacion('sin_sesion');

  if (sesion.esDemostracion) {
    await sql`select estook.cerrar_demostracion(${sesion.id}::uuid)`;
    return;
  }

  await sql`
    update estook.sesion
       set cerrada_en = now()
     where id = ${sesion.id} and cerrada_en is null
  `;
}

export const salir = comando<Record<string, never>, { readonly cerrada: boolean }>({
  nombre: 'salir',
  entrada: z.object({}).strict(),
  aunSinDobleFactor: true,
  aunConClavePorCambiar: true,
  // Una visita tiene que poder irse. Es lo único que escribe, y lo que escribe
  // es su propia desaparición.
  enDemostracion: true,

  async ejecutar(contexto) {
    await cerrarLaSesion(contexto);
    return { cerrada: true };
  },
});
