import { z } from 'zod';
import { consulta, FalloDeAplicacion } from '../contrato.ts';
import type { Local } from './mis-locales.ts';

/**
 * Un local concreto, por su identificador (M2).
 *
 * **Aqui se salda la deuda que M1 dejo abierta.** Su criterio de terminado decia
 * «toda consulta cruzada entre organizaciones devuelve vacio **y 403**». El vacio
 * lo ponen las politicas de M1; el 403 no existia porque no habia API.
 *
 * Y ojo con como se hace: **no se comprueba a quien pertenece el local**. Se
 * pregunta, y si las politicas de M1 no lo devuelven, es que no se puede ver. Asi
 * la respuesta es la misma para «no existe» y para «no es tuyo», que es lo que
 * hay que hacer: si dijeramos «existe pero no es tuyo», cualquiera podria ir
 * probando identificadores para averiguar que locales tiene la competencia.
 */
export const unLocal = consulta<{ id: string }, Local>({
  nombre: 'un_local',
  entrada: z.object({ id: z.string().uuid() }).strict(),

  async ejecutar({ sql, personaId }, { id }) {
    if (!personaId) throw new FalloDeAplicacion('sin_sesion');

    const filas = await sql<
      {
        id: string;
        codigo: string;
        nombre: string;
        organizacion: string;
        area: string | null;
        territorio: string;
        regimen: string;
      }[]
    >`
      select l.id, l.codigo, l.nombre,
             o.nombre as organizacion,
             a.nombre as area,
             l.territorio::text as territorio,
             l.regimen::text as regimen
        from estook.local l
        join estook.organizacion o on o.id = l.organizacion_id
        left join estook.area a on a.id = l.area_id
       where l.id = ${id}
         and l.id in (select local_id from estook.locales_visibles())
    `;

    const local = filas[0];
    if (!local) throw new FalloDeAplicacion('local_ajeno');

    return { ...local };
  },
});
