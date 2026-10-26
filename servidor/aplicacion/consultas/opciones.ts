import { z } from 'zod';
import { unidadesDelProducto, type UnidadDeUso } from '@estook/dominio';
import { consulta } from '../contrato.ts';
import { losProductosDeLasFichas } from '../escandallos.ts';
import { losGruposDelLocal } from '../opciones.ts';
import { elLocalDelServicio } from '../sala.ts';

/**
 * **Los grupos de opciones, para montarlos** (T3 · 2, decisión 0113): Ajustes del TPV ›
 * Productos, en la hoja de cada botón. Cada grupo con sus opciones, lo que gasta cada una
 * (con su nombre) y los platos que lo preguntan; y lo que hay en el almacén, para elegir qué
 * añade o qué quita una opción.
 */

export interface OpcionParaMontar {
  readonly id: string;
  readonly nombre: string;
  readonly precioCentimos: number;
  readonly anade: {
    readonly productoId: string;
    readonly nombre: string;
    readonly cantidad: number;
    readonly unidad: UnidadDeUso;
  } | null;
  readonly quita: { readonly productoId: string; readonly nombre: string } | null;
}

export interface GrupoParaMontar {
  readonly id: string;
  readonly nombre: string;
  readonly minimo: number;
  readonly maximo: number;
  readonly opciones: readonly OpcionParaMontar[];
  readonly platos: readonly { readonly id: string; readonly nombre: string }[];
}

export interface SalidaLosGruposDeOpciones {
  readonly grupos: readonly GrupoParaMontar[];
  /** Lo del almacén, con las unidades en que se puede escribir cada uno. */
  readonly productos: readonly {
    readonly id: string;
    readonly nombre: string;
    readonly unidades: readonly UnidadDeUso[];
  }[];
}

export const losGruposDeOpciones = consulta<Record<string, never>, SalidaLosGruposDeOpciones>({
  nombre: 'los_grupos_de_opciones',
  entrada: z.object({}).strict(),
  exige: 'accion.ajustes_del_tpv',
  enElTpv: 'solo',
  enLosAparatos: ['caja'],

  async ejecutar(contexto) {
    const localId = elLocalDelServicio(contexto);
    const [grupos, productos, platos] = await Promise.all([
      losGruposDelLocal(contexto, localId),
      losProductosDeLasFichas(contexto, localId, false),
      contexto.sql<{ id: string; nombre: string }[]>`
        select id::text as id, nombre from estook.plato where local_id = ${localId}::uuid
      `,
    ]);
    const nombreDelProducto = new Map(productos.map((p) => [p.id, p.nombre]));
    const nombreDelPlato = new Map(platos.map((p) => [p.id, p.nombre]));
    return {
      grupos: grupos.map((g) => ({
        id: g.id,
        nombre: g.nombre,
        minimo: g.minimo,
        maximo: g.maximo,
        opciones: g.opciones.map((o) => ({
          id: o.id,
          nombre: o.nombre,
          precioCentimos: o.precioCentimos,
          anade:
            o.anade === null
              ? null
              : { ...o.anade, nombre: nombreDelProducto.get(o.anade.productoId) ?? 'Producto' },
          quita:
            o.quita === null
              ? null
              : { productoId: o.quita, nombre: nombreDelProducto.get(o.quita) ?? 'Producto' },
        })),
        platos: g.platoIds.map((id) => ({ id, nombre: nombreDelPlato.get(id) ?? 'Plato' })),
      })),
      productos: productos
        .filter((p) => p.activo)
        .map((p) => ({ id: p.id, nombre: p.nombre, unidades: unidadesDelProducto(p) }))
        .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
    };
  },
});
