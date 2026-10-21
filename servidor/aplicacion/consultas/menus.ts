import { z } from 'zod';
import {
  loQueDejaElMenu,
  type FechaOperativa,
  type LoQueDejaElMenu,
} from '@estook/dominio';
import { consulta, type Contexto } from '../contrato.ts';
import { losAgotadosDelLocal } from '../agotados.ts';
import { elLibroDelLocal, loDeLaCuenta, type ElLibro } from '../escandallos.ts';
import { loQuePuede } from '../lo-que-puede.ts';
import {
  elCosteDeLoQueEntra,
  elCosteDelPlato,
  elLunes,
  hoyEnElLocal,
  lasSeccionesDeLosMenus,
  laSemana,
  losMenusDelLocal,
  type MenuLeido,
  type SeccionLeida,
  type UnDiaLeido,
} from '../menus.ts';
import { elLocalDeLaCarta } from './mi-carta.ts';

/**
 * Carta › Menús (M10 · 2, decisiones 0103 y 0104): los menús del local y su semana.
 *
 * El menú del día se ve **por semanas** (A1: «cada día distinto»), de lunes a viernes si
 * es lo que se sirve; un día que nadie ha montado repite el anterior, y se dice. Los
 * demás menús (el ejecutivo, el de grupo) no cambian por días: un solo día, hoy.
 *
 * Lo lee quien tiene Carta (el camarero tiene que saber qué hay de menú); **lo que deja
 * cada día, solo quien ve el coste de los platos** (`dato.coste_de_plato`), como en
 * Escandallos. Y si el local todavía no ha dicho si sirve menús, se dice, para
 * preguntarlo (0103).
 */

export interface UnPlatoDelMenu {
  readonly platoId: string;
  readonly nombre: string;
  readonly suplementoCentimos: number;
  /** Si nació en el menú y no sale en la carta (las lentejas del martes). */
  readonly soloDelMenu: boolean;
  readonly agotado: boolean;
  /** Si está desgranado en Escandallos: sin eso no se sabe lo que deja. */
  readonly tieneEscandallo: boolean;
}

export interface UnaSeccionDelMenu {
  readonly id: string;
  readonly nombre: string;
  readonly esPostre: boolean;
  readonly incluida: boolean;
}

export interface UnDiaDelMenu {
  readonly fecha: string;
  readonly esHoy: boolean;
  readonly yaPaso: boolean;
  /** Si se ha montado ese mismo día; si no, repite el de `repiteDe`. */
  readonly montado: boolean;
  readonly repiteDe: string | null;
  /** Los platos de cada sección, por su id. */
  readonly platos: Readonly<Record<string, readonly UnPlatoDelMenu[]>>;
  /** Solo a quien ve el coste de los platos. */
  readonly loQueDeja?: LoQueDejaElMenu;
}

export interface LoQueEntra {
  readonly productoId: string;
  readonly nombre: string;
  readonly raciones: number | null;
}

export interface UnMenu {
  readonly id: string;
  readonly nombre: string;
  readonly clase: 'del_dia' | 'otro';
  readonly precioCentimos: number | null;
  readonly entraPan: boolean;
  readonly entraCafe: boolean;
  readonly diasQueSeSirve: readonly number[];
  /** El producto del pan y del café, si se ha dicho, para contar lo que cuestan. */
  readonly pan: LoQueEntra | null;
  readonly cafe: LoQueEntra | null;
  readonly version: number;
  readonly secciones: readonly UnaSeccionDelMenu[];
  readonly dias: readonly UnDiaDelMenu[];
}

export interface MisMenus {
  /** Nulo: el local todavía no ha dicho si sirve menús, y se pregunta. */
  readonly sirveMenus: boolean | null;
  readonly puedeEditar: boolean;
  readonly verCostes: boolean;
  readonly hoy: string;
  readonly lunes: string;
  readonly menus: readonly UnMenu[];
}

async function sirveMenus(contexto: Contexto, localId: string): Promise<boolean | null> {
  const filas = await contexto.sql<{ sirve: boolean | null }[]>`
    select sirve_menus as sirve from estook.local where id = ${localId}::uuid
  `;
  return filas[0]?.sirve ?? null;
}

/** El nombre de un producto del Almacén, para el pan o el café. */
function loQueEntra(
  libro: ElLibro | null,
  nombres: ReadonlyMap<string, string>,
  productoId: string | null,
  raciones: number | null,
): LoQueEntra | null {
  if (productoId === null) return null;
  return {
    productoId,
    nombre: libro?.productos.get(productoId)?.nombre ?? nombres.get(productoId) ?? 'Producto',
    raciones,
  };
}

function elDia(
  menu: MenuLeido,
  secciones: readonly SeccionLeida[],
  dia: UnDiaLeido,
  hoy: FechaOperativa,
  agotados: ReadonlySet<string>,
  libro: ElLibro | null,
  /** Con lo que pide la cuenta a quien ve costes; nulo, sin euros. */
  cuenta: { iva: number | null } | null,
): UnDiaDelMenu {
  const platos: Record<string, UnPlatoDelMenu[]> = {};
  for (const p of dia.platos) {
    const lista = platos[p.seccionId] ?? [];
    lista.push({
      platoId: p.platoId,
      nombre: p.nombre,
      suplementoCentimos: p.suplementoCentimos,
      soloDelMenu: !p.enLaCarta,
      agotado: agotados.has(p.platoId),
      tieneEscandallo: (libro?.recetaDelPlato.get(p.platoId)?.lineas.length ?? 0) > 0,
    });
    platos[p.seccionId] = lista;
  }
  const base = {
    fecha: dia.fecha,
    esHoy: dia.fecha === hoy,
    yaPaso: dia.fecha < hoy,
    montado: dia.vale === dia.fecha,
    repiteDe: dia.vale === dia.fecha ? null : dia.vale,
    platos,
  };
  if (libro === null || cuenta === null) return base;
  return {
    ...base,
    loQueDeja: loQueDejaElMenu({
      precioCentimos: menu.precioCentimos,
      iva: cuenta.iva,
      pan: {
        entra: menu.entraPan,
        costeMilesimas: elCosteDeLoQueEntra(libro, menu.panProductoId, menu.panRaciones),
      },
      cafe: {
        entra: menu.entraCafe,
        costeMilesimas: elCosteDeLoQueEntra(libro, menu.cafeProductoId, menu.cafeRaciones),
      },
      secciones: secciones.map((s) => ({
        nombre: s.nombre,
        esPostre: s.esPostre,
        incluida: s.incluida,
        opciones: (platos[s.id] ?? []).map((p) => ({
          nombre: p.nombre,
          costeMilesimas: elCosteDelPlato(libro, p.platoId),
          suplementoCentimos: p.suplementoCentimos,
        })),
      })),
    }),
  };
}

export const misMenus = consulta<{ lunes?: string | undefined }, MisMenus>({
  nombre: 'mis_menus',
  entrada: z
    .object({ lunes: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() })
    .strict(),
  exige: 'app.carta',

  async ejecutar(contexto, entrada) {
    const localId = elLocalDeLaCarta(contexto);
    const [puede, sirve, hoy] = await Promise.all([
      loQuePuede(contexto, localId, ['app.carta', 'dato.coste_de_plato']),
      sirveMenus(contexto, localId),
      hoyEnElLocal(contexto, localId),
    ]);
    const lunes = elLunes(entrada.lunes, hoy);
    const verCostes = puede.ver('dato.coste_de_plato');
    const menus = await losMenusDelLocal(contexto, localId);

    const [secciones, agotados, libro, cuenta, nombres] = await Promise.all([
      lasSeccionesDeLosMenus(
        contexto,
        menus.map((m) => m.id),
      ),
      losAgotadosDelLocal(contexto, localId),
      menus.length === 0 ? null : elLibroDelLocal(contexto, localId, verCostes),
      verCostes && menus.length > 0 ? loDeLaCuenta(contexto, localId) : null,
      // Los nombres del pan y del café, aunque no se vean sus costes.
      contexto.sql<{ id: string; nombre: string }[]>`
        select p.id, p.nombre from estook.producto p
         where p.local_id = ${localId}::uuid
           and p.id in (select pan_producto_id from estook.menu where local_id = ${localId}::uuid
                        union select cafe_producto_id from estook.menu where local_id = ${localId}::uuid)
      `,
    ]);
    const losNombres = new Map(nombres.map((n) => [n.id, n.nombre]));
    const agotadosAhora = new Set(agotados.keys());

    const conSuSemana = await Promise.all(
      menus.map(async (menu): Promise<UnMenu> => {
        const susSecciones = secciones.filter((s) => s.menuId === menu.id);
        const semana = await laSemana(contexto, menu, lunes, hoy);
        return {
          id: menu.id,
          nombre: menu.nombre,
          clase: menu.clase,
          precioCentimos: menu.precioCentimos,
          entraPan: menu.entraPan,
          entraCafe: menu.entraCafe,
          diasQueSeSirve: menu.diasQueSeSirve,
          pan: loQueEntra(libro, losNombres, menu.panProductoId, menu.panRaciones),
          cafe: loQueEntra(libro, losNombres, menu.cafeProductoId, menu.cafeRaciones),
          version: menu.version,
          secciones: susSecciones.map((s) => ({
            id: s.id,
            nombre: s.nombre,
            esPostre: s.esPostre,
            incluida: s.incluida,
          })),
          dias: semana.map((dia) =>
            elDia(
              menu,
              susSecciones,
              dia,
              hoy,
              agotadosAhora,
              libro,
              verCostes ? cuenta : null,
            ),
          ),
        };
      }),
    );

    return {
      sirveMenus: sirve,
      puedeEditar: puede.editar('app.carta'),
      verCostes,
      hoy,
      lunes,
      menus: conSuSemana,
    };
  },
});
