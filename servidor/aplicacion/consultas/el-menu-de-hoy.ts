import { z } from 'zod';
import { fechaOperativa } from '@estook/dominio';
import { consulta } from '../contrato.ts';
import { comoLista } from '../listas.ts';
import { elLocalDeLaSesion } from '../alta.ts';
import { laJornadaDeHoy } from '../sala.ts';
import { firmarLasFotos, laFirmada } from '../fotos-firmadas.ts';
import { lasSeccionesDeLosMenus, losMenusDelLocal, losPlatosDelDia } from '../menus.ts';

/**
 * **El menú del día de hoy**, para el Panel de cada puesto (el rediseño, entrega 3 · 0148).
 *
 * La maqueta aprobada lo pone en el Panel de la cocina y de la sala, **con la foto de cada plato**.
 * `mis_menus` es la pantalla de Carta › Menús, con todo lo de montarlos, y pide la Carta; la
 * cocina no la tiene, y lo que necesita es solo esto: qué hay hoy. Los menús y los platos los puede
 * leer todo el local (la base, `menu_lectura` y `plato_lectura`), y es lo mismo que enseña la
 * carta pública. Sin costes.
 *
 * Lo agotado va marcado, para tacharlo. La jornada, no el calendario: la cena que acaba a la una
 * es del menú del día de antes.
 */
export interface ElMenuDeHoy {
  /** Si el local sirve menús (Ajustes); falso: «tu local no sirve menús». */
  readonly sirveMenus: boolean;
  /** El menú del día de hoy, si se sirve y está montado; nulo si no. */
  readonly menu: {
    readonly id: string;
    readonly nombre: string;
    readonly precioCentimos: number | null;
    readonly secciones: readonly {
      readonly id: string;
      readonly nombre: string;
      readonly platos: readonly {
        readonly platoId: string;
        readonly nombre: string;
        readonly suplementoCentimos: number;
        readonly agotado: boolean;
        readonly foto: string | null;
      }[];
    }[];
  } | null;
}

export const elMenuDeHoy = consulta<Record<string, never>, ElMenuDeHoy>({
  nombre: 'el_menu_de_hoy',
  entrada: z.object({}).strict(),
  exige: 'app.panel',

  async ejecutar(contexto) {
    const localId = elLocalDeLaSesion(contexto);
    const hoy = fechaOperativa(await laJornadaDeHoy(contexto, localId));
    const [sirve, menus] = await Promise.all([
      contexto.sql<{ sirve: boolean | null }[]>`
        select sirve_menus as sirve from estook.local where id = ${localId}::uuid
      `,
      losMenusDelLocal(contexto, localId),
    ]);
    const sirveMenus = sirve[0]?.sirve === true;
    const hoyEs = ((new Date(`${hoy}T12:00:00Z`).getUTCDay() + 6) % 7) + 1;
    const delDia = menus.find((m) => m.clase === 'del_dia' && m.diasQueSeSirve.includes(hoyEs));
    if (!sirveMenus || delDia === undefined) return { sirveMenus, menu: null };

    const [secciones, platos] = await Promise.all([
      lasSeccionesDeLosMenus(contexto, [delDia.id]),
      losPlatosDelDia(contexto, delDia.id, hoy),
    ]);
    if (platos.length === 0) return { sirveMenus, menu: null };

    const ids = [...new Set(platos.map((p) => p.platoId))];
    const [deLaCarta, agotados] = await Promise.all([
      contexto.sql<{ id: string; clave: string | null }[]>`
        select id::text as id, coalesce(miniatura_clave, foto_clave) as clave
          from estook.plato
         where local_id = ${localId}::uuid and id = any(${comoLista(ids)}::text::uuid[])
      `,
      contexto.sql<{ plato_id: string }[]>`
        select plato_id::text as plato_id from estook.plato_agotado
         where local_id = ${localId}::uuid
           and hasta > ${contexto.ahora.toISOString()}::timestamptz
      `,
    ]);
    const claveDe = new Map(deLaCarta.map((f) => [f.id, f.clave]));
    const firmadas = await firmarLasFotos(contexto, [...claveDe.values()]);
    const agotado = new Set(agotados.map((a) => a.plato_id));

    return {
      sirveMenus,
      menu: {
        id: delDia.id,
        nombre: delDia.nombre,
        precioCentimos: delDia.precioCentimos,
        secciones: secciones
          .filter((s) => s.incluida)
          .map((s) => ({
            id: s.id,
            nombre: s.nombre,
            platos: platos
              .filter((p) => p.seccionId === s.id)
              .map((p) => ({
                platoId: p.platoId,
                nombre: p.nombre,
                suplementoCentimos: p.suplementoCentimos,
                agotado: agotado.has(p.platoId),
                foto: laFirmada(firmadas, claveDe.get(p.platoId)),
              })),
          }))
          .filter((s) => s.platos.length > 0),
      },
    };
  },
});
