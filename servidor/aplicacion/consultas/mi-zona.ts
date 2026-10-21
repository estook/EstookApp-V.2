import { z } from 'zod';
import {
  CREDITOS_DE_FOGON,
  compararConLaZona,
  cuandoSePuedeOtraVez,
  type ComoEstasEnLaZona,
} from '@estook/dominio';
import { consulta, type Contexto } from '../contrato.ts';
import { loQuePuede } from '../lo-que-puede.ts';
import { elLocalDeLaCarta } from './mi-carta.ts';

/**
 * Carta › Análisis › Tu zona (M10 · 2, decisiones 0103 y 0104): lo último que encontró
 * Fogón al buscar en internet, guardado, y **la comparación rehecha con tus precios de
 * hoy**: si cambias las bravas, se ve al momento, sin buscar otra vez.
 *
 * Las medias las calcula Estook (`compararConLaZona`), y con menos de tres precios no se
 * juzga. Cada precio lleva **de dónde lo ha leído**: el enlace y el local.
 */

export interface UnPrecioDeLaZona {
  readonly donde: string;
  readonly plato: string | null;
  readonly precioCentimos: number;
  readonly enlace: string;
  readonly leidoEl: string | null;
}

export interface TuPlatoEnLaZona {
  /** Nulo: el menú del día. */
  readonly platoId: string | null;
  readonly nombre: string;
  readonly miPrecioCentimos: number | null;
  /** Nulo si hay menos de tres precios para comparar. */
  readonly comparado: ComoEstasEnLaZona | null;
  readonly precios: readonly UnPrecioDeLaZona[];
}

export interface MiZona {
  readonly puedeAnalizar: boolean;
  readonly creditos: number;
  /** Cuándo se puede volver a analizar; nulo si ya se puede (una vez cada 24 h). */
  readonly otraVezDesde: string | null;
  readonly analisis: {
    readonly hechoEn: string;
    readonly resumen: string | null;
    readonly locales: readonly { readonly nombre: string; readonly enlace: string }[];
    /** Por encima de la zona, primero; después, en la media y por debajo; lo que no se juzga, al final. */
    readonly platos: readonly TuPlatoEnLaZona[];
  } | null;
}

const ORDEN: Readonly<Record<string, number>> = { por_encima: 0, por_debajo: 1, en_la_media: 2 };

/** Lo último que encontró Fogón en la zona de este local, comparado con los precios de hoy. */
export async function laZonaDelLocal(
  contexto: Contexto,
  localId: string,
): Promise<MiZona['analisis']> {
  const ultimos = await contexto.sql<
    { id: string; hecho_en: string; resumen: string | null; locales: { nombre: string; enlace: string }[] }[]
  >`
    select id, to_char(hecho_en at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as hecho_en,
           resumen, locales
      from estook.analisis_de_zona
     where local_id = ${localId}::uuid
     order by hecho_en desc
     limit 1
  `;
  const ultimo = ultimos[0];
  if (ultimo === undefined) return null;

  const [precios, menuDelDia] = await Promise.all([
    contexto.sql<
      {
        plato_id: string | null;
        nombre: string | null;
        mi_precio: number | null;
        donde: string;
        plato_de_alli: string | null;
        precio_centimos: number;
        enlace: string;
        leido_el: string | null;
      }[]
    >`
      select z.plato_id, p.nombre, p.precio_centimos as mi_precio, z.donde, z.plato_de_alli,
             z.precio_centimos, z.enlace, to_char(z.leido_el, 'YYYY-MM-DD') as leido_el
        from estook.precio_de_la_zona z
        left join estook.plato p on p.id = z.plato_id and p.activo
       where z.analisis_id = ${ultimo.id}::uuid
         and (z.es_menu_del_dia or p.id is not null)
       order by z.precio_centimos
    `,
    contexto.sql<{ nombre: string; precio: number | null }[]>`
      select nombre, precio_centimos as precio from estook.menu
       where local_id = ${localId}::uuid and clase = 'del_dia' and activo
    `,
  ]);

  const porPlato = new Map<string, TuPlatoEnLaZona & { precios: UnPrecioDeLaZona[] }>();
  for (const f of precios) {
    const clave = f.plato_id ?? 'menu';
    const tuyo = porPlato.get(clave) ?? {
      platoId: f.plato_id,
      nombre: f.plato_id === null ? (menuDelDia[0]?.nombre ?? 'Menú del día') : (f.nombre ?? ''),
      miPrecioCentimos: f.plato_id === null ? (menuDelDia[0]?.precio ?? null) : f.mi_precio,
      comparado: null,
      precios: [],
    };
    tuyo.precios.push({
      donde: f.donde,
      plato: f.plato_de_alli,
      precioCentimos: f.precio_centimos,
      enlace: f.enlace,
      leidoEl: f.leido_el,
    });
    porPlato.set(clave, tuyo);
  }
  const platos = [...porPlato.values()]
    .map((p) => ({
      ...p,
      comparado: compararConLaZona(
        p.miPrecioCentimos,
        p.precios.map((x) => x.precioCentimos),
      ),
    }))
    .sort(
      (a, b) =>
        (a.comparado === null ? 9 : (ORDEN[a.comparado.como] ?? 9)) -
          (b.comparado === null ? 9 : (ORDEN[b.comparado.como] ?? 9)) ||
        a.nombre.localeCompare(b.nombre, 'es'),
    );

  return {
    hechoEn: ultimo.hecho_en,
    resumen: ultimo.resumen,
    locales: ultimo.locales,
    platos,
  };
}

/** Cuándo se pudo analizar por última vez este local. */
export async function elUltimoAnalisis(contexto: Contexto, localId: string): Promise<Date | null> {
  const filas = await contexto.sql<{ hecho_en: string }[]>`
    select hecho_en::text as hecho_en from estook.analisis_de_zona
     where local_id = ${localId}::uuid
     order by hecho_en desc
     limit 1
  `;
  const fila = filas[0];
  return fila === undefined ? null : new Date(fila.hecho_en);
}

export async function miZonaDelLocal(contexto: Contexto, localId: string): Promise<MiZona> {
  const [puede, ultimo, analisis] = await Promise.all([
    loQuePuede(contexto, localId, ['app.carta']),
    elUltimoAnalisis(contexto, localId),
    laZonaDelLocal(contexto, localId),
  ]);
  const otraVez = cuandoSePuedeOtraVez(ultimo, contexto.ahora);
  return {
    puedeAnalizar: puede.editar('app.carta'),
    creditos: CREDITOS_DE_FOGON.analizar_zona,
    otraVezDesde: otraVez === null ? null : otraVez.toISOString(),
    analisis,
  };
}

export const miZona = consulta<Record<string, never>, MiZona>({
  nombre: 'mi_zona',
  entrada: z.object({}).strict(),
  exige: 'app.carta',

  async ejecutar(contexto) {
    return miZonaDelLocal(contexto, elLocalDeLaCarta(contexto));
  },
});
