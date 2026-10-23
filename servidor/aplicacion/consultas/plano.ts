import { z } from 'zod';
import { consulta } from '../contrato.ts';
import { elLocalDelServicio } from '../sala.ts';

/**
 * El plano del local para dibujarlo (M20A · 1 · 2, decisión 0106): sus zonas y sus mesas,
 * sin las cuentas. Lo lee Ajustes › Sala con el permiso de los ajustes, porque quien
 * dibuja el plano (el dueño, quien administra la cuenta) no tiene por qué tomar nota.
 * Lo que pasa en cada mesa lo lee la sala con `el_plano`.
 */

export interface SalidaElPlanoDelLocal {
  readonly puedeEditar: boolean;
  readonly zonas: readonly {
    readonly id: string;
    readonly nombre: string;
    readonly orden: number;
    readonly mesas: readonly {
      readonly id: string;
      readonly nombre: string;
      readonly plazas: number;
      readonly forma: 'cuadrada' | 'redonda' | 'alargada';
      readonly x: number;
      readonly y: number;
      /** Abierta ahora: no se archiva ni se le cambia el nombre en pleno servicio. */
      readonly abierta: boolean;
    }[];
  }[];
}

export const elPlanoDelLocal = consulta<Record<string, never>, SalidaElPlanoDelLocal>({
  nombre: 'el_plano_del_local',
  entrada: z.object({}).strict(),
  exige: 'app.ajustes',

  async ejecutar(contexto) {
    const localId = elLocalDelServicio(contexto);
    const [zonas, mesas, puede] = await Promise.all([
      contexto.sql<{ id: string; nombre: string; orden: number }[]>`
        select id::text as id, nombre, orden from estook.zona_de_sala
         where local_id = ${localId}::uuid and archivada_en is null
         order by orden, nombre
      `,
      contexto.sql<
        {
          id: string;
          zona_id: string;
          nombre: string;
          plazas: number;
          forma: 'cuadrada' | 'redonda' | 'alargada';
          x: number;
          y: number;
          abierta: boolean;
        }[]
      >`
        select m.id::text as id, m.zona_id::text as zona_id, m.nombre, m.plazas, m.forma, m.x, m.y,
               exists (
                 select 1 from estook.cuenta c
                  where c.mesa_id = m.id and c.liberada_en is null and c.anulada_en is null
               ) as abierta
          from estook.mesa m
         where m.local_id = ${localId}::uuid and m.archivada_en is null
         order by m.nombre
      `,
      contexto.sql<{ puede: boolean }[]>`
        select estook.puede_editar('app.ajustes', ${localId}::uuid) as puede
      `,
    ]);
    return {
      puedeEditar: puede[0]?.puede === true,
      zonas: zonas.map((z) => ({
        id: z.id,
        nombre: z.nombre,
        orden: z.orden,
        mesas: mesas
          .filter((m) => m.zona_id === z.id)
          .map((m) => ({
            id: m.id,
            nombre: m.nombre,
            plazas: m.plazas,
            forma: m.forma,
            x: m.x,
            y: m.y,
            abierta: m.abierta,
          })),
      })),
    };
  },
});
