import { enDinero } from './lo-que-se-vende.ts';

/**
 * **La caja** (R3 · 1, decisión 0144; Anexo 5.5, 10.5, 10.6 y 11.6): lo que se decide sin red. Lo que
 * debería haber en el cajón, cómo cuadra, las partes iguales, el cambio y si un cobro se puede hacer.
 * Todo en céntimos, como el resto de Estook.
 */

// ── Billetes y monedas ─────────────────────────────────────────────────────────────

/** Los billetes de euro, de mayor a menor, en céntimos. */
export const BILLETES = [50000, 20000, 10000, 5000, 2000, 1000, 500] as const;
/** Las monedas de euro, de mayor a menor, en céntimos. */
export const MONEDAS = [200, 100, 50, 20, 10, 5, 2, 1] as const;
export const DENOMINACIONES: readonly number[] = [...BILLETES, ...MONEDAS];

/** Lo contado billete a billete: `{ "5000": 2, "200": 5 }` (cuántos de cada uno). */
export type ElRecuento = Readonly<Record<string, number>>;

/** Hasta cuántos de un mismo billete o moneda: un cajón no tiene diez mil. */
export const CUANTOS_COMO_MUCHO = 9999;

/** «500 €», «2 €», «50 c». */
export function nombreDeLaDenominacion(centimos: number): string {
  return centimos >= 100 ? `${String(centimos / 100)} €` : `${String(centimos)} c`;
}

/** Si lo que llega es un recuento que se puede guardar: solo billetes y monedas de euro, enteros. */
export function esLoContado(valor: unknown): valor is ElRecuento {
  if (typeof valor !== 'object' || valor === null || Array.isArray(valor)) return false;
  return Object.entries(valor).every(
    ([d, n]) =>
      DENOMINACIONES.includes(Number(d)) &&
      String(Number(d)) === d &&
      typeof n === 'number' &&
      Number.isInteger(n) &&
      n >= 0 &&
      n <= CUANTOS_COMO_MUCHO,
  );
}

/** Lo que suma lo contado. */
export function elTotalContado(contado: ElRecuento): number {
  return Object.entries(contado).reduce((suma, [d, n]) => suma + Number(d) * n, 0);
}

/** Lo contado sin los ceros: lo que se guarda. */
export function sinLosCeros(contado: ElRecuento): ElRecuento {
  return Object.fromEntries(Object.entries(contado).filter(([, n]) => n > 0));
}

// ── Lo que debería haber y cómo cuadra ─────────────────────────────────────────────

export interface LoQueMueveElCajon {
  readonly fondo: number;
  readonly efectivo: number;
  readonly metido: number;
  readonly sacado: number;
  /** Lo devuelto en efectivo desde la caja. */
  readonly devuelto: number;
}

/**
 * **Lo que debería haber en el cajón** (0144): el fondo + lo cobrado en efectivo + lo metido − lo
 * sacado − lo devuelto. Los cheques y Bizum van aparte: no son efectivo.
 */
export function loQueDeberiaHaber(c: LoQueMueveElCajon): number {
  return c.fondo + c.efectivo + c.metido - c.sacado - c.devuelto;
}

/** Desde cuánto una diferencia sale en rojo, y no en ámbar: la misma cifra que el aviso (E3). */
export const UMBRAL_DEL_DESCUADRE = 1000;

export type ComoCuadra = 'cuadra' | 'poco' | 'mucho';

/** «Cuadra» en verde; hasta 10 € en ámbar; más, en rojo (0144). */
export function comoCuadra(diferencia: number): ComoCuadra {
  if (diferencia === 0) return 'cuadra';
  return Math.abs(diferencia) > UMBRAL_DEL_DESCUADRE ? 'mucho' : 'poco';
}

/** «Cuadra», «Faltan 5,00 €» o «Sobran 2,30 €». */
export function laDiferenciaEnTexto(diferencia: number): string {
  if (diferencia === 0) return 'Cuadra';
  return `${diferencia < 0 ? 'Faltan' : 'Sobran'} ${enDinero(Math.abs(diferencia))}`;
}

export const MOTIVOS_DE_LA_DIFERENCIA = [
  'error_al_dar_el_cambio',
  'propina_sin_apuntar',
  'no_se_sabe',
] as const;
export type MotivoDeLaDiferencia = (typeof MOTIVOS_DE_LA_DIFERENCIA)[number];

export const NOMBRE_DEL_MOTIVO_DE_LA_DIFERENCIA: Readonly<Record<MotivoDeLaDiferencia, string>> = {
  error_al_dar_el_cambio: 'Error al dar el cambio',
  propina_sin_apuntar: 'Propina sin apuntar',
  no_se_sabe: 'No se sabe',
};

// ── Abrir y cerrar ─────────────────────────────────────────────────────────────────

/**
 * **Lo que se propone al abrir** (Anexo 11.6): lo que se dejó en el cajón la última vez. El primer
 * día no hay nada que proponer: se pregunta con cuánto se empieza.
 */
export function loQueSeProponeAlAbrir(loDeLaUltimaVez: number | null): number | null {
  return loDeLaUltimaVez;
}

/**
 * **Lo que se propone dejar para mañana**: el fondo de siempre o, sin él, lo de la última vez; nunca
 * más de lo que hay. El primer día, sin nada de eso, todo lo contado.
 */
export function loQueSeProponeParaManana(a: {
  readonly fondoDeSiempre: number | null;
  readonly loDeLaUltimaVez: number | null;
  readonly contado: number;
}): number {
  const propuesto = a.fondoDeSiempre ?? a.loDeLaUltimaVez ?? a.contado;
  return Math.max(0, Math.min(propuesto, a.contado));
}

// ── Cobrar ─────────────────────────────────────────────────────────────────────────

export const FORMAS_DE_PAGO = ['efectivo', 'tarjeta', 'bizum', 'cheque'] as const;
export type FormaDePago = (typeof FORMAS_DE_PAGO)[number];

export const NOMBRE_DE_LA_FORMA_DE_PAGO: Readonly<Record<FormaDePago, string>> = {
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta',
  bizum: 'Bizum',
  cheque: 'Cheque',
};

/** Las que abren el cajón al cobrar: el dinero y los cheques en papel van dentro. */
export function abreElCajon(forma: FormaDePago): boolean {
  return forma === 'efectivo' || forma === 'cheque';
}

/** Un pago tal como llega del aparato. */
export interface UnPago {
  readonly forma: FormaDePago;
  readonly importe: number;
  /** Solo en efectivo: lo que dio el cliente. */
  readonly entregado?: number | null | undefined;
}

/**
 * **Las partes iguales** (Anexo 10.5): los céntimos que no se reparten van a las primeras, así que
 * la suma es siempre el total. 48,50 € entre 4: 12,13 + 12,13 + 12,12 + 12,12.
 */
export function lasPartesIguales(total: number, partes: number): number[] {
  const base = Math.floor(total / partes);
  const sobran = total - base * partes;
  return Array.from({ length: partes }, (_, i) => base + (i < sobran ? 1 : 0));
}

/** Lo que vale la parte `parte` (de 1 a `de`) de un total. */
export function laParte(total: number, parte: number, de: number): number {
  return lasPartesIguales(total, de)[parte - 1] ?? 0;
}

/** El cambio de un cobro: lo que sobra de lo entregado en efectivo. */
export function elCambio(pagos: readonly UnPago[]): number {
  return pagos.reduce(
    (cambio, p) =>
      cambio + (p.forma === 'efectivo' && p.entregado != null ? p.entregado - p.importe : 0),
    0,
  );
}

export type PorQueNoSeCobra =
  | 'sin_pagos'
  | 'forma_repetida'
  | 'forma_apagada'
  | 'no_suma'
  | 'entregado_corto'
  | 'entregado_sin_efectivo'
  | 'mas_de_lo_que_queda'
  | 'ticket_demasiado_grande';

export const POR_QUE_NO_SE_COBRA: Readonly<Record<PorQueNoSeCobra, string>> = {
  sin_pagos: 'Elige cómo paga.',
  forma_repetida: 'Cada forma de pago, una vez: si mezcla, son dos distintas.',
  forma_apagada: 'Esa forma de pago no está encendida en Ajustes del TPV › La caja.',
  no_suma: 'Lo que pagan no suma lo que se cobra.',
  entregado_corto: 'Te ha dado menos de lo que paga en efectivo.',
  entregado_sin_efectivo: 'Lo que te da solo se apunta en efectivo.',
  mas_de_lo_que_queda: 'Es más de lo que queda por cobrar en esta cuenta.',
  ticket_demasiado_grande:
    'Un ticket no pasa de 3.000 €: divide la cuenta o haz una factura con los datos del cliente.',
};

/** Un ticket no pasa de 3.000 € (RD 1619/2012, art. 4.2.e; Anexo 4.6). */
export const TOPE_DE_UN_TICKET = 300000;

/**
 * **Si un cobro se puede hacer**, antes de numerar nada: los pagos suman lo que se cobra, cada forma
 * una vez y encendida, lo entregado cubre el efectivo, y no se cobra más de lo que queda.
 */
export function porQueNoSeCobra(a: {
  readonly importe: number;
  readonly queda: number;
  readonly pagos: readonly UnPago[];
  readonly encendidas: readonly FormaDePago[];
}): PorQueNoSeCobra | null {
  if (a.pagos.length === 0) return 'sin_pagos';
  const formas = a.pagos.map((p) => p.forma);
  if (new Set(formas).size !== formas.length) return 'forma_repetida';
  if (formas.some((f) => !a.encendidas.includes(f))) return 'forma_apagada';
  for (const p of a.pagos) {
    if (p.entregado != null && p.forma !== 'efectivo') return 'entregado_sin_efectivo';
    if (p.entregado != null && p.entregado < p.importe) return 'entregado_corto';
  }
  if (a.pagos.some((p) => !Number.isInteger(p.importe) || p.importe <= 0)) return 'no_suma';
  if (a.pagos.reduce((s, p) => s + p.importe, 0) !== a.importe) return 'no_suma';
  if (a.importe > a.queda) return 'mas_de_lo_que_queda';
  if (a.importe > TOPE_DE_UN_TICKET) return 'ticket_demasiado_grande';
  return null;
}

/** Las formas que se pueden usar en un local: efectivo y tarjeta siempre; Bizum y cheque si se encienden. */
export function lasFormasEncendidas(a: {
  readonly bizum: boolean;
  readonly cheque: boolean;
}): FormaDePago[] {
  return [
    'efectivo',
    'tarjeta',
    ...(a.bizum ? (['bizum'] as const) : []),
    ...(a.cheque ? (['cheque'] as const) : []),
  ];
}

/**
 * **La línea del ticket de una parte igual** (0144): lo que pide la factura simplificada es el tipo de
 * servicio (RD 1619/2012, art. 7), no los platos de otro. «Servicio de restauración · Mesa 12 · parte
 * 1 de 4».
 */
export function laLineaDeUnaParte(donde: string, parte: number, de: number): string {
  return `Servicio de restauración · ${donde} · parte ${String(parte)} de ${String(de)}`;
}

// ── Abrir el cajón ─────────────────────────────────────────────────────────────────

export const PARA_QUE_SE_ABRE = ['cambio', 'sacar', 'meter'] as const;
export type ParaQueSeAbre = (typeof PARA_QUE_SE_ABRE)[number];

/** Para qué se saca y para qué se mete (Anexo 11.6, Richi, 28-oct); «Otro» se escribe. */
export const MOTIVOS_PARA_SACAR = [
  'Compras',
  'Un proveedor',
  'Propinas',
  'Al banco',
  'Otro',
] as const;
export const MOTIVOS_PARA_METER = ['Cambio del banco', 'Otro'] as const;
