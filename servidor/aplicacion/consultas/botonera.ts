import { z } from 'zod';
import type {
  CaminoDeLaBotonera,
  ColorDeLaBotonera,
  PaseDeLaBotonera,
  QuienLoPrepara,
} from '@estook/dominio';
import { laBotoneraGuardada } from '../botonera.ts';
import { consulta } from '../contrato.ts';
import { elLocalDelServicio } from '../sala.ts';
import { losPlatos, puedeEditarLaCarta } from './mi-carta.ts';
import { losGruposDeLosPlatos } from '../opciones.ts';

/**
 * **La botonera, para montarla** (T3, decisión 0111; Anexo 11.11): Ajustes del TPV ›
 * Productos. Cómo se montó, sus páginas con sus botones, **los «Nuevos en la carta»** (lo
 * que está en la carta y aún no en el TPV) y la carta entera, para «Elegir» y «+ De la
 * carta».
 */

export interface PlatoParaLaBotonera {
  readonly id: string;
  readonly nombre: string;
  readonly precioCentimos: number | null;
  readonly miniatura: string | null;
  readonly agotado: boolean;
}

export interface BotonDeLaBotonera extends PlatoParaLaBotonera {
  readonly botonId: string;
  readonly platoId: string;
  readonly color: ColorDeLaBotonera | null;
  /** Nulos: los de su página. */
  readonly quienLoPrepara: QuienLoPrepara | null;
  readonly pase: PaseDeLaBotonera | null;
  readonly fijado: boolean;
  /** Los grupos de opciones de su plato, en orden (T3 · 2). */
  readonly grupoIds: readonly string[];
  /** Su plato se vende a peso. */
  readonly aPeso: boolean;
}

export interface PaginaDeLaBotonera {
  readonly id: string;
  readonly nombre: string;
  readonly color: ColorDeLaBotonera | null;
  readonly quienLoPrepara: QuienLoPrepara;
  readonly pase: PaseDeLaBotonera;
  readonly deLaSeccion: string | null;
  /** «Pan y agua» o «Cafés» (0112). */
  readonly deSiempre: 'pan' | 'cafes' | null;
  readonly botones: readonly BotonDeLaBotonera[];
}

export interface SalidaLaBotonera {
  readonly camino: CaminoDeLaBotonera | null;
  readonly entraSolo: boolean;
  readonly paginas: readonly PaginaDeLaBotonera[];
  /** En la carta y todavía no en el TPV, con su sección. */
  readonly nuevosEnLaCarta: readonly (PlatoParaLaBotonera & { readonly seccion: string | null })[];
  /** La carta entera, sección a sección: para «Elegir» y para «+ De la carta». */
  readonly carta: readonly {
    readonly id: string | null;
    readonly nombre: string;
    readonly platos: readonly PlatoParaLaBotonera[];
  }[];
  /** Si quien está puede crear productos: se ponen también en la carta de Estook. */
  readonly puedeCrearProductos: boolean;
}

export const laBotonera = consulta<Record<string, never>, SalidaLaBotonera>({
  nombre: 'la_botonera',
  entrada: z.object({}).strict(),
  exige: 'accion.ajustes_del_tpv',
  enElTpv: 'solo',
  enLosAparatos: ['caja'],

  async ejecutar(contexto) {
    const localId = elLocalDelServicio(contexto);
    const [botonera, platos, secciones, puedeCrear, grupos, aPeso] = await Promise.all([
      laBotoneraGuardada(contexto, localId),
      losPlatos(contexto, localId),
      contexto.sql<{ id: string; nombre: string }[]>`
        select id::text as id, nombre from estook.seccion_de_carta
         where local_id = ${localId}::uuid
         order by orden, nombre
      `,
      puedeEditarLaCarta(contexto, localId),
      losGruposDeLosPlatos(contexto, localId),
      contexto.sql<{ id: string }[]>`
        select id::text as id from estook.plato where local_id = ${localId}::uuid and a_peso
      `,
    ]);
    const aPesoIds = new Set(aPeso.map((f) => f.id));
    const deLaCarta = platos.filter((p) => p.activo && p.enLaCarta);
    const comoParaLaBotonera = (p: (typeof platos)[number]): PlatoParaLaBotonera => ({
      id: p.id,
      nombre: p.nombre,
      precioCentimos: p.precioCentimos,
      miniatura: p.miniatura,
      agotado: p.agotado !== null,
    });
    const porId = new Map(deLaCarta.map((p) => [p.id, p]));
    const conBoton = new Set(botonera.botones.map((b) => b.platoId));
    const nombreDeLaSeccion = new Map(secciones.map((s) => [s.id, s.nombre]));

    const carta = [
      ...secciones.map((s) => ({
        id: s.id,
        nombre: s.nombre,
        platos: deLaCarta.filter((p) => p.seccionId === s.id).map(comoParaLaBotonera),
      })),
      {
        id: null,
        nombre: 'Sin sección',
        platos: deLaCarta.filter((p) => p.seccionId === null).map(comoParaLaBotonera),
      },
    ].filter((s) => s.platos.length > 0);

    return {
      camino: botonera.camino,
      entraSolo: botonera.entraSolo,
      paginas: botonera.paginas.map((g) => ({
        id: g.id,
        nombre: g.nombre,
        color: g.color,
        quienLoPrepara: g.quienLoPrepara,
        pase: g.pase,
        deLaSeccion: g.seccionId === null ? null : (nombreDeLaSeccion.get(g.seccionId) ?? null),
        deSiempre: g.deSiempre,
        botones: botonera.botones
          .filter((b) => b.paginaId === g.id)
          .flatMap((b) => {
            const plato = porId.get(b.platoId);
            if (plato === undefined) return [];
            return [
              {
                ...comoParaLaBotonera(plato),
                botonId: b.id,
                platoId: plato.id,
                color: b.color,
                quienLoPrepara: b.quienLoPrepara,
                pase: b.pase,
                fijado: b.fijado,
                grupoIds: (grupos.get(plato.id) ?? []).map((g) => g.id),
                aPeso: aPesoIds.has(plato.id),
              },
            ];
          }),
      })),
      // Sin montar, no hay nuevos: todavía no se ha elegido nada.
      nuevosEnLaCarta:
        botonera.camino === null
          ? []
          : deLaCarta
              .filter((p) => !conBoton.has(p.id))
              .map((p) => ({
                ...comoParaLaBotonera(p),
                seccion: p.seccionId === null ? null : (nombreDeLaSeccion.get(p.seccionId) ?? null),
              })),
      carta,
      puedeCrearProductos: puedeCrear,
    };
  },
});
