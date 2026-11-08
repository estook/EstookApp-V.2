/**
 * El local en Google · los topes (M7, entrega 5 · decisiones 0030 y 0040).
 *
 * «La API que cuesta dinero, la de Places, hay que acotarla bien.» Richi puso la
 * cifra: **cuarenta al mes por local**. Aquí vive, con lo que cuenta cada cosa,
 * porque la usan el servidor —que corta— y Ajustes —que dice cuántas quedan—.
 *
 * ── Qué se cuenta, y por qué dos contadores ──────────────────────────────────
 *
 * Buscar el local es escribir su nombre y ver sugerencias: **cada letra es una
 * petición**. Google las agrupa en una sesión que se cobra al elegir un resultado
 * y pedir su ficha, así que lo que cuesta dinero de verdad son **las fichas**. Las
 * búsquedas llevan su propio tope, más alto, para que un error —una pantalla que
 * buscara sin parar— no se convierta en una factura.
 */

export const TOPES_DE_GOOGLE = {
  /** Fichas pedidas a Google al mes por local: elegir el local o actualizarlo. */
  fichasAlMes: 40,
  /** Peticiones de búsqueda al mes por local. Diez búsquedas por ficha. */
  busquedasAlMes: 400,
} as const;

export type UsoDeGoogle = 'busqueda' | 'ficha';

/** El tope de cada cosa. */
export function topeDeGoogle(que: UsoDeGoogle): number {
  return que === 'ficha' ? TOPES_DE_GOOGLE.fichasAlMes : TOPES_DE_GOOGLE.busquedasAlMes;
}

/** Cuántas quedan este mes, nunca menos de cero. */
export function quedanDeGoogle(que: UsoDeGoogle, usadas: number): number {
  return Math.max(0, topeDeGoogle(que) - usadas);
}

/**
 * El mes de una fecha operativa, como su día uno: `2026-09-16` → `2026-09-01`.
 *
 * El contador es mensual como la factura de Google, y se guarda por el día uno
 * para que una fila sea un mes sin tener que partir fechas en la consulta.
 */
export function mesDe(fecha: string): string {
  return `${fecha.slice(0, 7)}-01`;
}

/** Lo mínimo que hay que escribir para buscar: con menos, salen mil sitios. */
export const LETRAS_PARA_BUSCAR = 3;

// ── La dirección y la hora de corte, desde la ficha (la pausa del 8-nov, 0142) ─

/**
 * Un trozo de la dirección, como lo da Google (`addressComponents` de Places, con
 * `longText`, `shortText` y `types`). Solo lo que se lee.
 */
export interface ParteDeLaDireccion {
  readonly texto: string;
  readonly tipos: readonly string[];
}

export interface DireccionPartida {
  readonly direccion: string | null;
  readonly codigoPostal: string | null;
  readonly poblacion: string | null;
  readonly provincia: string | null;
}

/**
 * La dirección de Google en las casillas de Estook: «Calle Estafeta, 21», «31001»,
 * «Pamplona» y «Navarra». En España la provincia es el `administrative_area_level_2`;
 * en las comunidades de una sola provincia Google a veces solo da la comunidad
 * (`level_1`), y entonces se usa esa. Lo que no llega se deja vacío: no se adivina.
 */
export function partirLaDireccion(partes: readonly ParteDeLaDireccion[]): DireccionPartida {
  const de = (tipo: string) => partes.find((p) => p.tipos.includes(tipo))?.texto ?? null;
  const calle = de('route');
  const numero = de('street_number');
  const codigoPostal = de('postal_code');
  return {
    direccion: calle === null ? null : numero === null ? calle : `${calle}, ${numero}`,
    codigoPostal: codigoPostal !== null && /^[0-9]{5}$/.test(codigoPostal) ? codigoPostal : null,
    poblacion: de('locality') ?? de('postal_town') ?? de('administrative_area_level_3'),
    provincia: de('administrative_area_level_2') ?? de('administrative_area_level_1'),
  };
}

/** Un tramo del horario de Google: el día (0 es domingo), la hora y el minuto. */
export interface TramoDelHorario {
  readonly abre: { readonly dia: number; readonly hora: number; readonly minuto: number };
  /** Nulo si abre las 24 horas. */
  readonly cierra: { readonly dia: number; readonly hora: number; readonly minuto: number } | null;
}

/** La de fábrica: a las cinco ya no queda un bar abierto, y el reparto de la mañana no ha empezado. */
export const HORA_DE_CORTE_DE_FABRICA = '05:00';

/**
 * La hora a la que acaba el día del local, sin preguntarla (Richi, 8-nov: «al crear cuenta te
 * pregunta por la hora de cierre, tampoco tiene mucho sentido»).
 *
 * **Las cinco de la mañana**, como hacen los TPV (Toast corta a las cuatro): lo que se vende a la
 * 1:30 del sábado cuenta en el viernes. Solo si Google dice que el local cierra **de madrugada,
 * a las cinco o más tarde** (una discoteca), se corta una hora después de su último cierre. Un
 * local que abre las 24 horas, o sin horario, se queda en las cinco.
 */
export function horaDeCorteDelHorario(tramos: readonly TramoDelHorario[] | null): string {
  if (tramos === null) return HORA_DE_CORTE_DE_FABRICA;
  let masTarde = -1;
  for (const t of tramos) {
    if (t.cierra === null) continue;
    // Cierra de madrugada: otro día que el que abrió, o el mismo día antes de la hora de abrir.
    const deMadrugada =
      t.cierra.dia !== t.abre.dia ||
      t.cierra.hora * 60 + t.cierra.minuto <= t.abre.hora * 60 + t.abre.minuto;
    if (!deMadrugada) continue;
    const minutos = t.cierra.hora * 60 + t.cierra.minuto;
    // Solo las madrugadas de verdad: un cierre a las 13:00 del día siguiente no es una noche.
    if (minutos <= 12 * 60) masTarde = Math.max(masTarde, minutos);
  }
  if (masTarde < 5 * 60) return HORA_DE_CORTE_DE_FABRICA;
  const corte = Math.min(Math.ceil(masTarde / 60) + 1, 11);
  return `${String(corte).padStart(2, '0')}:00`;
}
