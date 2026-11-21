import { alCentimo } from './lo-que-se-vende.ts';

/**
 * Las cuentas del Panel (el rediseño, entrega 3 · decisión 0148).
 *
 * Lo que Richi contestó el 21-nov:
 *
 *   · **El objetivo de hoy** sale del semanal, **repartido según lo que vende cada día de la
 *     semana**: un sábado no vende lo mismo que un lunes. Con poco historial, a partes iguales
 *     entre los días que abre.
 *   · **Dónde deberías ir**: la rayita de la barra de la semana. Lo de los días pasados y la parte
 *     de hoy que a esta hora se suele llevar vendida.
 *   · **La previsión al cierre**, con **la curva de ese mismo día de la semana**, no con una regla
 *     de tres: las 15:00 de un miércoles no son la mitad del día. Solo con historial y cuando ya
 *     se ha vendido algo, para no decir disparates a las 12:05.
 *
 * Todo es puro: el servidor lee los números y aquí se hacen las cuentas, con sus pruebas.
 */

/** Cuántas semanas atrás se miran para repartir el objetivo y para la curva del día. */
export const SEMANAS_DE_HISTORIAL = 8;

/** Con menos semanas que estas con ventas, el reparto es a partes iguales y no hay previsión. */
export const SEMANAS_PARA_FIARSE = 3;

/** Lo que ya tiene que estar vendido de un día normal para atreverse con la previsión. */
export const FRACCION_PARA_PREVER = 0.1;

/** 1 es el lunes y 7 el domingo, como en el resto de Estook. */
export type DiaDeLaSemana = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface VentaDelDia {
  /** `AAAA-MM-DD`, la jornada del local. */
  readonly fecha: string;
  readonly diaDeLaSemana: DiaDeLaSemana;
  /** Con IVA, en céntimos. */
  readonly ventas: number;
}

export interface PesosDeLaSemana {
  /** Lo que pesa cada día de la semana, de lunes a domingo. Suman 1. */
  readonly pesos: readonly number[];
  /** `historial` si salen de lo vendido; `igual` si se reparte a partes iguales. */
  readonly reparto: 'historial' | 'igual';
}

/**
 * Lo que pesa cada día de la semana: la media de lo vendido ese día entre la suma de las siete
 * medias. Con menos de tres semanas con ventas no se fía: a partes iguales entre los días que han
 * vendido algo (o los siete, si no ha vendido nunca).
 */
export function losPesosDeLaSemana(dias: readonly VentaDelDia[]): PesosDeLaSemana {
  const conVenta = dias.filter((d) => d.ventas > 0);
  const semanas = new Set(conVenta.map((d) => elLunesDe(d.fecha))).size;
  const abre = [1, 2, 3, 4, 5, 6, 7].map((dia) => conVenta.some((d) => d.diaDeLaSemana === dia));
  if (semanas < SEMANAS_PARA_FIARSE) {
    const cuantos = abre.filter(Boolean).length;
    if (cuantos === 0) return { pesos: Array.from({ length: 7 }, () => 1 / 7), reparto: 'igual' };
    return { pesos: abre.map((si) => (si ? 1 / cuantos : 0)), reparto: 'igual' };
  }
  const medias = [1, 2, 3, 4, 5, 6, 7].map((dia) => {
    const deEseDia = conVenta.filter((d) => d.diaDeLaSemana === dia);
    if (deEseDia.length === 0) return 0;
    return deEseDia.reduce((s, d) => s + d.ventas, 0) / deEseDia.length;
  });
  const total = medias.reduce((s, m) => s + m, 0);
  return { pesos: medias.map((m) => m / total), reparto: 'historial' };
}

/** El objetivo de un día de la semana, en céntimos, del semanal y sus pesos. */
export function elObjetivoDelDia(
  semanal: number,
  pesos: PesosDeLaSemana,
  dia: DiaDeLaSemana,
): number {
  return alCentimo(semanal * (pesos.pesos[dia - 1] ?? 0));
}

/** Una hora del día y lo que se suele vender en ella, de media, ese día de la semana. */
export interface HoraDeLaCurva {
  /** 0 a 23, en la hora del local. */
  readonly hora: number;
  /** Con IVA, en céntimos. */
  readonly media: number;
}

/**
 * La parte de un día normal que a esta hora ya suele estar vendida, de 0 a 1.
 *
 * Las horas enteras de antes cuentan enteras y la de ahora, por los minutos que lleva. Nulo sin
 * curva: no se sabe.
 */
export function laParteDelDiaQueSueleIrVendida(
  curva: readonly HoraDeLaCurva[],
  hora: number,
  minuto: number,
): number | null {
  const total = curva.reduce((s, h) => s + h.media, 0);
  if (total <= 0) return null;
  const llevado = curva.reduce((s, h) => {
    if (h.hora < hora) return s + h.media;
    if (h.hora === hora) return s + (h.media * minuto) / 60;
    return s;
  }, 0);
  return Math.min(1, llevado / total);
}

/**
 * Lo que se venderá hoy si sigue al ritmo de un día normal: lo vendido entre la parte que a esta
 * hora se suele llevar. Nulo sin historial bastante, o si todavía no ha pasado ni el 10 % del día
 * (a las 12:05 cualquier previsión es un disparate). Nunca menos de lo ya vendido.
 */
export function laPrevisionDelCierre(
  vendido: number,
  parteDelDia: number | null,
  semanasDeCurva: number,
): number | null {
  if (parteDelDia === null || semanasDeCurva < SEMANAS_PARA_FIARSE) return null;
  if (parteDelDia < FRACCION_PARA_PREVER || vendido <= 0) return null;
  return Math.max(vendido, alCentimo(vendido / parteDelDia));
}

/**
 * Dónde debería ir la semana a estas alturas: el objetivo de los días ya pasados, enteros, y el de
 * hoy por la parte que a esta hora se suele llevar. Sin curva, hoy cuenta a medias de lo que pesa
 * en el reloj del día (de las 0 a las 24): mejor una rayita aproximada que ninguna.
 */
export function dondeDeberiasIr(
  semanal: number,
  pesos: PesosDeLaSemana,
  hoy: DiaDeLaSemana,
  parteDelDia: number | null,
  hora: number,
  minuto: number,
): number {
  let hasta = 0;
  for (let dia = 1; dia < hoy; dia += 1) hasta += pesos.pesos[dia - 1] ?? 0;
  const parte = parteDelDia ?? Math.min(1, (hora * 60 + minuto) / (24 * 60));
  hasta += (pesos.pesos[hoy - 1] ?? 0) * parte;
  return alCentimo(semanal * hasta);
}

/** El lunes de la semana de una fecha `AAAA-MM-DD`. */
export function elLunesDe(fecha: string): string {
  const dia = new Date(`${fecha}T12:00:00Z`);
  const desdeElLunes = (dia.getUTCDay() + 6) % 7;
  dia.setUTCDate(dia.getUTCDate() - desdeElLunes);
  return dia.toISOString().slice(0, 10);
}

// ── Ventas según canal ───────────────────────────────────────────────────────

/**
 * Los canales de «Ventas según canal» (nunca «Por dónde entra», Richi, 18-nov), en su orden. Salen
 * del tipo de cada cuenta de Estook TPV: la mesa, la barra y la venta rápida «Aquí», lo de llevar
 * y el reparto. **Uber Eats** entra en `reparto` cuando se conecte (M29).
 */
export const CANALES_DEL_PANEL = ['sala', 'barra', 'para_llevar', 'reparto'] as const;

export type CanalDeVentaDelPanel = (typeof CANALES_DEL_PANEL)[number];

export const NOMBRE_DEL_CANAL_DE_VENTA: Readonly<Record<CanalDeVentaDelPanel, string>> = {
  sala: 'Sala',
  barra: 'Barra y rápida',
  para_llevar: 'Para llevar',
  reparto: 'Reparto',
};

/** El canal de una cuenta, por su tipo (`estook.cuenta.tipo`). */
export function elCanalDeLaCuenta(tipo: string): CanalDeVentaDelPanel {
  if (tipo === 'mesa') return 'sala';
  if (tipo === 'barra') return 'barra';
  if (tipo === 'para_llevar') return 'para_llevar';
  return 'reparto';
}

// ── Para recomendar ──────────────────────────────────────────────────────────

/**
 * Cuántos platos puede recomendar un local a la vez (Richi, 21-nov): si todo está recomendado,
 * nada lo está. Lo que se recomienda sale en el TPV, en «Recomendados», y en el Panel de la sala.
 */
export const TOPE_DE_RECOMENDADOS = 8;
