import { z } from 'zod';
import { comando, FalloDeAplicacion } from '../contrato.ts';

/**
 * Cerrar una sesion concreta, o todas las demas (M4).
 *
 * «Ajustes → Mi acceso → **mis dispositivos**» (Manifiesto 23). El caso de verdad
 * es este: se pierde el movil, o se sale de casa de alguien sin cerrar sesion.
 *
 * Y el segundo caso, el que importa a quien lleva el local: cerrar la sesion de
 * otra persona. Eso lo permite la politica `sesion_escritura` de la 0018 a quien
 * puede quitar accesos en su local, no a cualquiera.
 */
export const entradaCerrarSesion = z
  .object({
    /** Una en concreto, o... */
    sesion_id: z.string().uuid().optional(),
    /** ...todas las demas, que es lo que se pulsa cuando se pierde el movil. */
    todas_las_demas: z.literal(true).optional(),
  })
  .strict()
  .refine((e) => (e.sesion_id === undefined) !== (e.todas_las_demas === undefined), {
    message: 'O una sesion concreta, o todas las demas.',
  });

export type EntradaCerrarSesion = z.infer<typeof entradaCerrarSesion>;

export const cerrarSesion = comando<EntradaCerrarSesion, { readonly cerradas: number }>({
  nombre: 'cerrar_sesion',
  entrada: entradaCerrarSesion,

  async ejecutar({ sql, sesion }, entrada) {
    if (sesion === null) throw new FalloDeAplicacion('sin_sesion');

    if (entrada.todas_las_demas === true) {
      // La de ahora **no**: quien pulsa «cerrar las demas» no quiere quedarse
      // fuera del aparato que tiene en la mano.
      const cerradas = await sql<{ id: string }[]>`
        update estook.sesion
           set cerrada_en = now(), cerrada_por = ${sesion.personaId}
         where persona_id = ${sesion.personaId}
           and cerrada_en is null
           and id <> ${sesion.id}
        returning id
      `;
      return { cerradas: cerradas.length };
    }

    // El refinamiento de arriba ya garantiza que hay una de las dos; los tipos
    // no lo saben, asi que se comprueba y se dice por que no puede pasar.
    if (entrada.sesion_id === undefined) throw new FalloDeAplicacion('faltan_datos');

    // Una concreta. Puede ser propia o de otra persona; quien decide si se puede
    // es la politica de la 0018, no este codigo. Si no deja, no cambia nada y se
    // devuelve cero: la misma respuesta que si esa sesion no existiera.
    const cerradas = await sql<{ id: string }[]>`
      update estook.sesion
         set cerrada_en = now(), cerrada_por = ${sesion.personaId}
       where id = ${entrada.sesion_id} and cerrada_en is null
      returning id
    `;

    return { cerradas: cerradas.length };
  },
});
