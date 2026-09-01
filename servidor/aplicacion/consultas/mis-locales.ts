import { z } from 'zod';
import { consulta, FalloDeAplicacion } from '../contrato.ts';

/**
 * Los locales que alcanza quien pregunta (M2).
 *
 * Lee de `locales_visibles`, la funcion de M1. **No recibe ningun identificador
 * de local**: fiarse del que manda el cliente es el error tipico que M1 avisa de
 * no cometer. Quien pregunta se sabe por la conexion (decision 0005).
 */
export interface Local {
  readonly id: string;
  readonly codigo: string;
  readonly nombre: string;
  readonly organizacion: string;
  readonly area: string | null;
  readonly territorio: string;
  readonly regimen: string;
}

export const misLocales = consulta<Record<string, never>, Local[]>({
  nombre: 'mis_locales',
  entrada: z.object({}).strict(),

  async ejecutar({ sql, personaId }) {
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
       where l.id in (select local_id from estook.locales_visibles())
       order by o.nombre, a.nombre nulls first, l.nombre
    `;

    return filas.map((f) => ({ ...f }));
  },
});
