import { z } from 'zod';
import {
  CAFES_DE_SERIE,
  aCentimos,
  costeDeLaReceta,
  elNombreDeLaRacion,
  elProductoDelCafe,
  laPaginaDeLaBebida,
  lasRacionesQueSeProponen,
  queEsLaBebida,
  sirveParaLasCopas,
  sinAcentos,
  type UnidadDeUso,
} from '@estook/dominio';
import { consulta, type Contexto } from '../contrato.ts';
import { elLibroDelLocal, elVinculado } from '../escandallos.ts';
import { elLocalDelServicio } from '../sala.ts';

/**
 * **«Monta tus bebidas», para montarlas** (T3 · 2 · 2, decisión 0114; maquetas 1 a 3): lo que
 * hay en el almacén como bebida, con cómo se propone venderlo, lo que cuesta cada ración y si ya
 * está en el TPV; las botellas para las copas, con lo que cuesta la dosis; los refrescos del
 * «¿Con qué?»; y los cafés de serie, con su coste (de verdad, o aproximado si falta algo).
 */

export interface RacionParaMontar {
  /** El nombre de su botón: «Caña», «Rioja crianza · copa», «Coca-Cola». */
  readonly nombre: string;
  readonly racion: string;
  readonly cantidad: number;
  readonly unidad: UnidadDeUso;
  readonly puesta: boolean;
  /** Lo que cuesta, del almacén; nulo si el producto aún no tiene precio. */
  readonly costeCentimos: number | null;
  /** Ya hay un plato que se vende así: no se repite. */
  readonly yaEsta: boolean;
}

export interface SalidaLasBebidasParaMontar {
  readonly dosis: { readonly copaMl: number; readonly copaDeVinoMl: number };
  readonly bebidas: readonly {
    readonly productoId: string;
    readonly nombre: string;
    readonly pagina: string;
    readonly raciones: readonly RacionParaMontar[];
  }[];
  readonly botellas: readonly {
    readonly productoId: string;
    readonly nombre: string;
    readonly costeDeLaDosisCentimos: number | null;
    readonly yaEsCopa: boolean;
  }[];
  /** Lo demás del almacén que se mide en ml: por si una botella no se reconoce por su nombre. */
  readonly otrasBotellas: readonly { readonly productoId: string; readonly nombre: string }[];
  readonly conQue: readonly { readonly productoId: string; readonly nombre: string }[];
  readonly cafes: readonly {
    readonly clave: string;
    readonly nombre: string;
    readonly puesto: boolean;
    readonly costeCentimos: number | null;
    /** El coste es el aproximado: falta en el almacén lo que dice `falta`. */
    readonly aproximado: boolean;
    readonly falta: readonly string[];
    readonly yaEsta: boolean;
  }[];
  /** Montarlas escribe en la carta y en Escandallos: hacen falta los dos permisos. */
  readonly puedeMontarlas: boolean;
}

export async function puedeMontarLasBebidas(contexto: Contexto, localId: string): Promise<boolean> {
  const filas = await contexto.sql<{ puede: boolean }[]>`
    select estook.puede_editar('app.carta', ${localId}::uuid)
       and estook.puede_editar('app.escandallos', ${localId}::uuid) as puede
  `;
  return filas[0]?.puede === true;
}

const NOMBRE_DE_LO_QUE_LLEVA: Readonly<Record<string, string>> = {
  cafe: 'café',
  descafeinado: 'café descafeinado',
  leche: 'leche',
  cacao: 'cacao',
  te: 'té',
  manzanilla: 'manzanilla',
  poleo: 'poleo',
};

export const lasBebidasParaMontar = consulta<Record<string, never>, SalidaLasBebidasParaMontar>({
  nombre: 'las_bebidas_para_montar',
  entrada: z.object({}).strict(),
  exige: 'accion.ajustes_del_tpv',
  enElTpv: 'solo',
  enLosAparatos: ['caja'],

  async ejecutar(contexto) {
    const localId = elLocalDelServicio(contexto);
    const [libro, local, platos, puede] = await Promise.all([
      elLibroDelLocal(contexto, localId, true),
      contexto.sql<{ copa: number; vino: number }[]>`
        select dosis_de_la_copa_ml as copa, copa_de_vino_ml as vino
          from estook.local where id = ${localId}::uuid
      `,
      contexto.sql<{ id: string; nombre: string }[]>`
        select id::text as id, nombre from estook.plato
         where local_id = ${localId}::uuid and activo
      `,
      puedeMontarLasBebidas(contexto, localId),
    ]);
    const dosis = { copaMl: local[0]?.copa ?? 50, copaDeVinoMl: local[0]?.vino ?? 150 };
    const productos = [...libro.productos.values()].filter((p) => p.activo);
    // Lo que ya se vende «tal cual» de cada producto: el producto y la cantidad.
    const vinculos = platos.flatMap((p) => {
      const v = elVinculado(libro.recetaDelPlato.get(p.id));
      return v === null ? [] : [v];
    });
    const yaSeVende = (productoId: string, cantidad: number, unidad: UnidadDeUso) =>
      vinculos.some(
        (v) => v.productoId === productoId && v.cantidad === cantidad && v.unidad === unidad,
      );
    const cuesta = (productoId: string, cantidad: number, unidad: UnidadDeUso) => {
      const coste = costeDeLaReceta(
        [{ productoId, elaboracionId: null, cantidad, unidad }],
        libro.libro,
      );
      return coste.milesimas === null ? null : aCentimos(coste.milesimas);
    };

    const bebidas = productos
      .filter((p) => queEsLaBebida(p) === 'bebida')
      .map((p) => {
        const raciones = lasRacionesQueSeProponen(p, dosis.copaDeVinoMl);
        return {
          productoId: p.id,
          nombre: p.nombre,
          pagina: laPaginaDeLaBebida(p),
          raciones: raciones.map((r) => ({
            nombre: elNombreDeLaRacion(p.nombre, r, raciones.length),
            racion: r.nombre,
            cantidad: r.cantidad,
            unidad: r.unidad,
            puesta: r.puesta,
            costeCentimos: cuesta(p.id, r.cantidad, r.unidad),
            yaEsta: yaSeVende(p.id, r.cantidad, r.unidad),
          })),
        };
      })
      .sort(
        (a, b) => a.pagina.localeCompare(b.pagina, 'es') || a.nombre.localeCompare(b.nombre, 'es'),
      );

    const botellas = productos
      .filter((p) => queEsLaBebida(p) === 'botella_para_copas')
      .map((p) => ({
        productoId: p.id,
        nombre: p.nombre,
        costeDeLaDosisCentimos: cuesta(p.id, dosis.copaMl, 'ml'),
        yaEsCopa: vinculos.some((v) => v.productoId === p.id),
      }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));

    const deLasBotellas = new Set(botellas.map((b) => b.productoId));
    const otrasBotellas = productos
      .filter(
        (p) =>
          !deLasBotellas.has(p.id) &&
          queEsLaBebida(p) === 'bebida' &&
          (p.unidad === 'ml' || p.unidad === 'l'),
      )
      .map((p) => ({ productoId: p.id, nombre: p.nombre }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));

    const conQue = productos
      .filter(sirveParaLasCopas)
      .map((p) => ({ productoId: p.id, nombre: p.nombre }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));

    const nombres = new Set(platos.map((p) => sinAcentos(p.nombre)));
    const cafes = CAFES_DE_SERIE.map((c) => {
      const lineas = c.lleva.map((l) => ({ ...l, producto: elProductoDelCafe(l.que, productos) }));
      const falta = lineas
        .filter((l) => l.producto === null)
        .map((l) => NOMBRE_DE_LO_QUE_LLEVA[l.que] ?? l.que);
      const real =
        falta.length === 0
          ? costeDeLaReceta(
              lineas.map((l) => ({
                productoId: l.producto?.id ?? null,
                elaboracionId: null,
                cantidad: l.cantidad,
                unidad: l.unidad,
              })),
              libro.libro,
            ).milesimas
          : null;
      return {
        clave: c.clave,
        nombre: c.nombre,
        puesto: c.puesto,
        costeCentimos: real === null ? c.aproximadoCentimos : aCentimos(real),
        aproximado: real === null,
        falta,
        yaEsta: nombres.has(sinAcentos(c.nombre)),
      };
    });

    return { dosis, bebidas, botellas, otrasBotellas, conQue, cafes, puedeMontarlas: puede };
  },
});
