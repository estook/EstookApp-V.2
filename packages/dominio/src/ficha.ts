/**
 * La ficha del trabajador (la Ampliación 3, decisión 0153, sección 4; Plan, M13).
 *
 * Lo que aquí se calcula **lo calcula Estook y nunca la IA**: Fogón lee del contrato
 * cuántos días de vacaciones hay al año, y de ahí en adelante son cuentas. Richi, el
 * 24-nov: «lo que sea legal según su contrato y como se suele hacer». Lo habitual en
 * España (Estatuto de los Trabajadores, art. 38, y los convenios de hostelería):
 *
 *   · **Las del año** son los días que dice su contrato o su convenio. Si entró este año,
 *     **proporcionales** a lo que le queda de año desde que entró.
 *   · **Las devengadas a hoy** se enseñan aparte: es lo que cuenta si se va antes de
 *     acabar el año (la liquidación).
 *   · **Las disponibles** = las del año + las pendientes de años anteriores (las pone el
 *     gerente) − las disfrutadas − las aprobadas por disfrutar.
 *
 * Las fechas llegan como «AAAA-MM-DD» y se cuentan en UTC a mediodía: un día es un día,
 * sin horarios de verano por medio.
 */

/** Los tipos de contrato, con lo que se lee en la pantalla. */
export const TIPOS_DE_CONTRATO = {
  indefinido: 'Indefinido',
  temporal: 'Temporal',
  fijo_discontinuo: 'Fijo discontinuo',
  practicas: 'En prácticas',
  formacion: 'De formación',
  otro: 'Otro',
} as const;

export type TipoDeContrato = keyof typeof TIPOS_DE_CONTRATO;

export function esTipoDeContrato(texto: string): texto is TipoDeContrato {
  return Object.hasOwn(TIPOS_DE_CONTRATO, texto);
}

export type Jornada = 'completa' | 'parcial';
export type VacacionesEn = 'naturales' | 'laborables';

/** De qué es cada cosa que Fogón saca del contrato: la página donde la vio, o nada. */
export type PaginaDeDonde = number | null;

const UN_DIA_MS = 86_400_000;

function aMediodia(fecha: string): number {
  return Date.parse(`${fecha}T12:00:00Z`);
}

function esBisiesto(ano: number): boolean {
  return (ano % 4 === 0 && ano % 100 !== 0) || ano % 400 === 0;
}

/** Los días que tiene un año: 365 o 366. */
export function diasDelAno(ano: number): number {
  return esBisiesto(ano) ? 366 : 365;
}

/** El número de día del año: el 1 de enero es el 1; el 24 de noviembre de 2026, el 328. */
export function diaDelAno(fecha: string): number {
  const ano = Number(fecha.slice(0, 4));
  return (aMediodia(fecha) - aMediodia(`${String(ano)}-01-01`)) / UN_DIA_MS + 1;
}

/** Dos decimales, que es como se enseñan los días («26,96»). No es dinero. */
function aDosDecimales(n: number): number {
  return Number(n.toFixed(2));
}

export interface SaldoDeVacaciones {
  /** Lo que dice el contrato o el convenio, al año. */
  readonly alAno: number;
  /** Las de este año: las del contrato, o proporcionales si entró este año. */
  readonly delAno: number;
  /** Si `delAno` es proporcional porque entró este año. */
  readonly proporcional: boolean;
  /** Las ganadas hasta hoy: lo que cuenta si se va antes de acabar el año. */
  readonly devengadas: number;
  readonly pendientes: number;
  readonly disfrutadas: number;
  readonly aprobadas: number;
  readonly disponibles: number;
}

/**
 * El saldo de vacaciones de una persona, hoy.
 *
 * Con `alAno` nulo (la ficha no lo dice todavía) no hay saldo: se devuelve nulo y la
 * pantalla dice que falta, en vez de enseñar un cero que parece un dato.
 */
export function elSaldoDeVacaciones(entrada: {
  readonly alAno: number | null;
  readonly incorporacion: string | null;
  readonly hoy: string;
  readonly pendientes: number;
  readonly disfrutadas: number;
  readonly aprobadas: number;
}): SaldoDeVacaciones | null {
  if (entrada.alAno === null) return null;
  const ano = Number(entrada.hoy.slice(0, 4));
  const dias = diasDelAno(ano);
  const hoy = diaDelAno(entrada.hoy);

  // Desde qué día del año cuenta: el 1, o el de su incorporación si fue este año.
  let desde = 1;
  if (entrada.incorporacion !== null) {
    const anoDeEntrada = Number(entrada.incorporacion.slice(0, 4));
    if (anoDeEntrada === ano) desde = diaDelAno(entrada.incorporacion);
    // Entra el año que viene: este año no tiene ninguna.
    if (anoDeEntrada > ano) desde = dias + 1;
  }

  const delAno = (entrada.alAno * (dias - desde + 1)) / dias;
  const devengadas = hoy < desde ? 0 : (entrada.alAno * (hoy - desde + 1)) / dias;
  const disponibles = delAno + entrada.pendientes - entrada.disfrutadas - entrada.aprobadas;

  return {
    alAno: entrada.alAno,
    delAno: aDosDecimales(delAno),
    proporcional: desde > 1,
    devengadas: aDosDecimales(devengadas),
    pendientes: entrada.pendientes,
    disfrutadas: entrada.disfrutadas,
    aprobadas: entrada.aprobadas,
    disponibles: aDosDecimales(disponibles),
  };
}

/** «26,96», «12», «2,5»: los días como se leen, con coma y sin ceros de más. */
export function diasEnLetra(dias: number): string {
  return dias.toLocaleString('es-ES', { maximumFractionDigits: 2 });
}

/**
 * Cuánto lleva en la empresa: «2 años y 8 meses», «5 meses», «Empieza el 1 dic».
 * Con meses enteros: el 12-mar al 24-nov son 8 meses (el 9.º no se ha cumplido).
 */
export function cuantoLleva(incorporacion: string, hoy: string): string {
  if (incorporacion > hoy) return 'Todavía no ha empezado';
  const [a1, m1, d1] = incorporacion.split('-').map(Number) as [number, number, number];
  const [a2, m2, d2] = hoy.split('-').map(Number) as [number, number, number];
  let meses = (a2 - a1) * 12 + (m2 - m1);
  if (d2 < d1) meses -= 1;
  const anos = Math.floor(meses / 12);
  const resto = meses % 12;
  const enAnos = anos === 1 ? '1 año' : `${String(anos)} años`;
  const enMeses = resto === 1 ? '1 mes' : `${String(resto)} meses`;
  if (anos === 0 && resto === 0) return 'Menos de un mes';
  if (anos === 0) return enMeses;
  if (resto === 0) return enAnos;
  return `${enAnos} y ${enMeses}`;
}

/**
 * El DNI o NIE, escondido como se enseña en una lista: «•••• 482 K». Entero solo
 * dentro de «Información personal», a quien puede verlo.
 */
export function dniEscondido(dni: string): string {
  const limpio = dni.replace(/[\s.-]/g, '').toUpperCase();
  if (limpio.length < 4) return '••••';
  return `•••• ${limpio.slice(-4, -1)} ${limpio.slice(-1)}`;
}

/** Un DNI (8 cifras y letra) o un NIE (X, Y o Z, 7 cifras y letra), con su letra bien. */
export function esUnDniValido(dni: string): boolean {
  const limpio = dni.replace(/[\s.-]/g, '').toUpperCase();
  const m = /^([XYZ]?)(\d{7,8})([A-Z])$/.exec(limpio);
  if (m === null) return false;
  const [, prefijo = '', cifras = '', letra = ''] = m;
  if (prefijo === '' && cifras.length !== 8) return false;
  if (prefijo !== '' && cifras.length !== 7) return false;
  // En un NIE, la X vale 0, la Y 1 y la Z 2, delante de sus siete cifras.
  const numero = Number(prefijo === '' ? cifras : `${String('XYZ'.indexOf(prefijo))}${cifras}`);
  return 'TRWAGMYFPDXBNJZSQVHLCKE'[numero % 23] === letra;
}

// ── Las nóminas (la Ampliación 3 · 2) ────────────────────────────────────────

const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
] as const;

/** «2026-11» o «2026-11-01» → «noviembre de 2026». */
export function mesEnLetra(mes: string): string {
  const ano = mes.slice(0, 4);
  const numero = Number(mes.slice(5, 7));
  return `${MESES[numero - 1] ?? mes} de ${ano}`;
}

/** El mes de antes de un día, «AAAA-MM»: la gestoría manda las nóminas del mes que acaba. */
export function elMesPasado(hoy: string): string {
  const ano = Number(hoy.slice(0, 4));
  const mes = Number(hoy.slice(5, 7));
  return mes === 1 ? `${String(ano - 1)}-12` : `${String(ano)}-${String(mes - 1).padStart(2, '0')}`;
}

/** Si un texto es un mes «AAAA-MM» de verdad. */
export function esUnMes(texto: string): boolean {
  const m = /^(\d{4})-(\d{2})$/.exec(texto);
  if (m === null) return false;
  const numero = Number(m[2]);
  return numero >= 1 && numero <= 12 && Number(m[1]) >= 2000;
}

/** El DNI tal como se compara: sin espacios, puntos ni guiones, y en mayúsculas. */
export function dniLimpio(dni: string): string {
  return dni.replace(/[\s.-]/g, '').toUpperCase();
}
