import {
  NOMBRE_DEL_DIA,
  comoSeLlamaLaSeccion,
  diaDeLaSemana,
  fechaEnLetra,
  fechaOperativa,
  type LoQueDejaElMenu,
} from '@estook/dominio';
import { comoDinero } from '../almacen/contrato.ts';

/**
 * Lo que devuelve el servidor de los menús (M10 · 2, decisiones 0103 y 0104): `mis_menus`
 * y `mi_zona`. Las mismas formas que `servidor/aplicacion/consultas/menus.ts` y
 * `mi-zona.ts`. Y las frases que salen de ellos, aquí, con su prueba.
 */

export interface UnPlatoDelMenu {
  readonly platoId: string;
  readonly nombre: string;
  readonly suplementoCentimos: number;
  readonly soloDelMenu: boolean;
  readonly agotado: boolean;
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
  readonly montado: boolean;
  readonly repiteDe: string | null;
  readonly platos: Readonly<Record<string, readonly UnPlatoDelMenu[]>>;
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
  readonly pan: LoQueEntra | null;
  readonly cafe: LoQueEntra | null;
  readonly version: number;
  readonly secciones: readonly UnaSeccionDelMenu[];
  readonly dias: readonly UnDiaDelMenu[];
}

export interface MisMenus {
  readonly sirveMenus: boolean | null;
  readonly puedeEditar: boolean;
  readonly verCostes: boolean;
  readonly hoy: string;
  readonly lunes: string;
  readonly menus: readonly UnMenu[];
}

/** «Martes 20 de octubre». */
export function elDiaEnLetra(fecha: string): string {
  const f = fechaOperativa(fecha);
  const letra = `${NOMBRE_DEL_DIA[diaDeLaSemana(f)] ?? ''} ${fechaEnLetra(f).replace(/ de \d{4}$/, '')}`;
  return letra.charAt(0).toLocaleUpperCase('es') + letra.slice(1);
}

/** El día que se abre: hoy si se sirve, si no el siguiente de la semana, y si no el primero. */
export function elDiaQueSeAbre(menu: UnMenu): string | null {
  const hoy = menu.dias.find((d) => d.esHoy);
  if (hoy !== undefined) return hoy.fecha;
  const siguiente = menu.dias.find((d) => !d.yaPaso);
  return (siguiente ?? menu.dias[0])?.fecha ?? null;
}

/** Las secciones que salen ese día: las incluidas, con su nombre de pizarra («Postre o café»). */
export function lasSeccionesQueSalen(
  menu: UnMenu,
): readonly (UnaSeccionDelMenu & { readonly comoSeLlama: string })[] {
  return menu.secciones
    .filter((s) => s.incluida)
    .map((s) => ({
      ...s,
      comoSeLlama: comoSeLlamaLaSeccion(s.nombre, s.esPostre, menu.entraCafe),
    }));
}

/** «+4,00 €», o nada. */
export function elSuplemento(centimos: number): string | null {
  return centimos > 0 ? `+${comoDinero(centimos)}` : null;
}

/**
 * Lo que deja el menú ese día, en dos frases cortas (poco texto): la de arriba, lo peor;
 * la de abajo, lo mejor y lo que lo hunde. O por qué no se sabe.
 */
export function loQueDejaEnLetra(deja: LoQueDejaElMenu): {
  readonly titulo: string;
  readonly detalle: string | null;
  readonly tono: 'bien' | 'atencion' | 'mal' | 'info';
} {
  switch (deja.estado) {
    case 'sin_precio':
      return { titulo: 'Ponle precio para saber lo que te deja', detalle: null, tono: 'info' };
    case 'sin_platos':
      return { titulo: 'Añade platos para saber lo que te deja', detalle: null, tono: 'info' };
    case 'faltan_costes':
      return {
        titulo: 'Para saber lo que te deja, falta desgranar',
        detalle: deja.faltan.join(', '),
        tono: 'atencion',
      };
    case 'listo': {
      const peor = deja.peor.dejaCentimos;
      const hunde =
        deja.loHunde === null ? '' : ` (si todos piden ${deja.loHunde.toLocaleLowerCase('es')})`;
      return {
        titulo:
          peor < 0
            ? `Puede perder ${comoDinero(-peor)} por menú${hunde}`
            : `Te deja de ${comoDinero(peor)} a ${comoDinero(deja.mejor.dejaCentimos)} por menú`,
        detalle:
          peor < 0
            ? `En el mejor caso, ${comoDinero(deja.mejor.dejaCentimos)}.`
            : deja.loHunde === null
              ? null
              : `Lo menos${hunde}.`,
        tono: peor < 0 ? 'mal' : 'bien',
      };
    }
  }
}

/** Lo que entra aparte, dicho en corto: «Pan incluido», «Pan y café incluidos». */
export function loQueIncluye(menu: UnMenu, dia: UnDiaDelMenu): string | null {
  const conPostre = menu.secciones.some(
    (s) => s.esPostre && s.incluida && (dia.platos[s.id]?.length ?? 0) > 0,
  );
  const cafeAparte = menu.entraCafe && !conPostre;
  if (menu.entraPan && cafeAparte) return 'Pan y café incluidos';
  if (menu.entraPan) return 'Pan incluido';
  if (cafeAparte) return 'Café incluido';
  return null;
}

/**
 * El menú de un día como texto para mandar por WhatsApp (0103: «enviarlo»). Con las
 * negritas de WhatsApp en el título, y sin un coste.
 */
export function elMenuEnTexto(menu: UnMenu, dia: UnDiaDelMenu): string {
  const titulo =
    menu.clase === 'del_dia' ? `${menu.nombre} · ${elDiaEnLetra(dia.fecha)}` : menu.nombre;
  const lineas = lasSeccionesQueSalen(menu).flatMap((s) => {
    const platos = dia.platos[s.id] ?? [];
    if (platos.length === 0) return [];
    const nombres = platos.map((p) => {
      const suplemento = elSuplemento(p.suplementoCentimos);
      return suplemento === null ? p.nombre : `${p.nombre} (${suplemento})`;
    });
    return [`${s.comoSeLlama}: ${nombres.join(' · ')}`];
  });
  const incluye = loQueIncluye(menu, dia);
  return [
    `*${titulo}*`,
    ...lineas,
    ...(incluye === null ? [] : [incluye]),
    menu.precioCentimos === null
      ? 'IVA incluido'
      : `${comoDinero(menu.precioCentimos)} · IVA incluido`,
  ].join('\n');
}

// ── Tu zona ───────────────────────────────────────────────────────────────────

export interface UnPrecioDeLaZona {
  readonly donde: string;
  readonly plato: string | null;
  readonly precioCentimos: number;
  readonly enlace: string;
  readonly leidoEl: string | null;
}

export interface ComoEstasEnLaZona {
  readonly cuantos: number;
  readonly mediaCentimos: number;
  readonly desdeCentimos: number;
  readonly hastaCentimos: number;
  readonly diferenciaCentimos: number;
  readonly como: 'por_encima' | 'en_la_media' | 'por_debajo';
}

export interface TuPlatoEnLaZona {
  readonly platoId: string | null;
  readonly nombre: string;
  readonly miPrecioCentimos: number | null;
  readonly comparado: ComoEstasEnLaZona | null;
  readonly precios: readonly UnPrecioDeLaZona[];
}

export interface MiZona {
  readonly puedeAnalizar: boolean;
  readonly creditos: number;
  readonly otraVezDesde: string | null;
  /** Por qué no se puede todavía, y dónde arreglarlo. Una API de antes no lo manda. */
  readonly noSePuede?: { readonly porque: string; readonly ir: string | null } | null;
  readonly analisis: {
    readonly hechoEn: string;
    readonly resumen: string | null;
    readonly locales: readonly { readonly nombre: string; readonly enlace: string }[];
    readonly platos: readonly TuPlatoEnLaZona[];
  } | null;
}

/** «1,50 € por encima de tu zona», «En la media de tu zona», «0,80 € por debajo…». */
export function comoEstasEnLetra(comparado: ComoEstasEnLaZona): string {
  if (comparado.como === 'en_la_media') return 'En la media de tu zona';
  const diferencia = comoDinero(Math.abs(comparado.diferenciaCentimos));
  return comparado.como === 'por_encima'
    ? `${diferencia} por encima de tu zona`
    : `${diferencia} por debajo de tu zona`;
}

/** La web de un enlace, para decir de dónde sale un precio: «barpepe.es». */
export function laWebDe(enlace: string): string {
  try {
    return new URL(enlace).hostname.replace(/^www\./, '');
  } catch {
    return enlace;
  }
}
