import type { UnidadDeUso } from '@estook/dominio';
import type { Contexto } from './contrato.ts';
import { comoLista } from './listas.ts';

/**
 * **Los grupos de opciones, leídos** (T3 · 2, decisión 0113): los del local, con sus opciones
 * y a qué platos van. Los leen el TPV al pedir (`la_carta_de_la_sala`), `pedir`, que vuelve a
 * mirar lo elegido, y Productos, donde se montan.
 */

export interface OpcionLeida {
  readonly id: string;
  readonly nombre: string;
  readonly precioCentimos: number;
  /** Lo que gasta del almacén: añade un producto en su cantidad, y quita un ingrediente. */
  readonly anade: {
    readonly productoId: string;
    readonly cantidad: number;
    readonly unidad: UnidadDeUso;
  } | null;
  readonly quita: string | null;
}

export interface GrupoLeido {
  readonly id: string;
  readonly nombre: string;
  readonly minimo: number;
  readonly maximo: number;
  readonly opciones: readonly OpcionLeida[];
  /** Los platos que lo preguntan. */
  readonly platoIds: readonly string[];
}

export async function losGruposDelLocal(
  contexto: Contexto,
  localId: string,
): Promise<readonly GrupoLeido[]> {
  const [grupos, opciones, platos] = await Promise.all([
    contexto.sql<{ id: string; nombre: string; minimo: number; maximo: number }[]>`
      select id::text as id, nombre, minimo, maximo from estook.grupo_de_opciones
       where local_id = ${localId}::uuid
       order by nombre
    `,
    contexto.sql<
      {
        id: string;
        grupo_id: string;
        nombre: string;
        precio_centimos: number;
        anade_producto_id: string | null;
        anade_cantidad: string | null;
        anade_unidad: UnidadDeUso | null;
        quita_producto_id: string | null;
      }[]
    >`
      select id::text as id, grupo_id::text as grupo_id, nombre, precio_centimos,
             anade_producto_id::text as anade_producto_id, anade_cantidad::text as anade_cantidad,
             anade_unidad, quita_producto_id::text as quita_producto_id
        from estook.opcion_de_grupo
       where local_id = ${localId}::uuid
       order by orden, nombre
    `,
    contexto.sql<{ grupo_id: string; plato_id: string }[]>`
      select grupo_id::text as grupo_id, plato_id::text as plato_id from estook.grupo_del_plato
       where local_id = ${localId}::uuid
       order by orden
    `,
  ]);
  return grupos.map((g) => ({
    id: g.id,
    nombre: g.nombre,
    minimo: g.minimo,
    maximo: g.maximo,
    opciones: opciones
      .filter((o) => o.grupo_id === g.id)
      .map((o) => ({
        id: o.id,
        nombre: o.nombre,
        precioCentimos: o.precio_centimos,
        anade:
          o.anade_producto_id === null || o.anade_cantidad === null || o.anade_unidad === null
            ? null
            : {
                productoId: o.anade_producto_id,
                cantidad: Number(o.anade_cantidad),
                unidad: o.anade_unidad,
              },
        quita: o.quita_producto_id,
      })),
    platoIds: platos.filter((p) => p.grupo_id === g.id).map((p) => p.plato_id),
  }));
}

/** Los grupos que pregunta cada plato, en su orden. */
export async function losGruposDeLosPlatos(
  contexto: Contexto,
  localId: string,
  platoIds: readonly string[] | null = null,
): Promise<ReadonlyMap<string, readonly GrupoLeido[]>> {
  const [grupos, orden] = await Promise.all([
    losGruposDelLocal(contexto, localId),
    contexto.sql<{ grupo_id: string; plato_id: string }[]>`
      select grupo_id::text as grupo_id, plato_id::text as plato_id from estook.grupo_del_plato
       where local_id = ${localId}::uuid
         and (${platoIds === null}::boolean
              or plato_id = any (${comoLista(platoIds ?? [])}::text::uuid[]))
       order by plato_id, orden
    `,
  ]);
  const porId = new Map(grupos.map((g) => [g.id, g]));
  const delPlato = new Map<string, GrupoLeido[]>();
  for (const f of orden) {
    const grupo = porId.get(f.grupo_id);
    if (grupo === undefined) continue;
    delPlato.set(f.plato_id, [...(delPlato.get(f.plato_id) ?? []), grupo]);
  }
  return delPlato;
}
