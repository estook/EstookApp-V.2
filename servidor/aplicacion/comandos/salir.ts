import { z } from 'zod';
import { comando, FalloDeAplicacion } from '../contrato.ts';

/**
 * Salir (M4).
 *
 * Cierra **esta** sesion y ninguna mas. Quien sale del ordenador del despacho no
 * quiere que se le cierre el movil.
 *
 * Se puede llamar con la sesion a medias —esperando el segundo factor— y con la
 * contrasena por cambiar. Es lo minimo decente: siempre se puede salir.
 */
export const salir = comando<Record<string, never>, { readonly cerrada: boolean }>({
  nombre: 'salir',
  entrada: z.object({}).strict(),
  aunSinDobleFactor: true,
  aunConClavePorCambiar: true,

  async ejecutar({ sql, sesion }) {
    if (sesion === null) throw new FalloDeAplicacion('sin_sesion');

    // No se borra la fila: queda cuando se abrio y cuando se cerro, que es lo
    // que hace util «Mis dispositivos». Nada se borra (principio 6).
    await sql`
      update estook.sesion
         set cerrada_en = now()
       where id = ${sesion.id} and cerrada_en is null
    `;

    return { cerrada: true };
  },
});
