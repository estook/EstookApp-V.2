/**
 * Crear cuenta, la oferta de prueba y los planes (0042).
 *
 * Hasta la 0042 no había registro abierto: las cuentas se creaban con un comando
 * (`bd:cuenta-de-verdad` y `bd:mi-negocio`). Richi lo abrió el 16 de septiembre de
 * 2026: desde la web, con correo y un código, o con Google; y quien crea su cuenta
 * **paga al empezar**, salvo cuando está encendida la oferta de prueba, que se
 * enciende y se apaga desde el admin.
 *
 * Aquí viven los números y las reglas que comparten el servidor, la app y la web.
 * Un número, un dueño (regla 6).
 */

// ── El código que llega por correo ───────────────────────────────────────────

/** Cuánto vale el código antes de caducar. */
export const MINUTOS_DEL_CODIGO_DE_REGISTRO = 30;

/** Fallos antes de tirar el código: seis cifras con cinco intentos no se adivinan. */
export const INTENTOS_DEL_CODIGO_DE_REGISTRO = 5;

/** Lo que hay que esperar para pedir otro código al mismo correo. */
export const SEGUNDOS_ENTRE_CODIGOS = 60;

/**
 * Cuántas cuentas se pueden empezar desde la misma dirección en una hora.
 *
 * Un restaurante no crea diez cuentas en una hora; quien lo hace está llenando la
 * base de basura o mandando correos a gente que no los ha pedido desde nuestro
 * dominio, que es lo que hace que el correo de Estook acabe en spam para todos.
 */
export const CUENTAS_POR_DIRECCION_A_LA_HORA = 10;

/**
 * Seis cifras al azar, con `crypto.getRandomValues`.
 *
 * Sin sesgo: se descartan los números que no caben enteros en el millón, porque
 * `n % 1_000_000` sobre un número de 32 bits haría algunos códigos más probables
 * que otros. Es poco, y es gratis hacerlo bien.
 */
export function codigoDeRegistro(): string {
  const tope = Math.floor(0x1_0000_0000 / 1_000_000) * 1_000_000;
  const azar = new Uint32Array(1);
  for (;;) {
    crypto.getRandomValues(azar);
    const numero = azar[0] ?? 0;
    if (numero < tope) return String(numero % 1_000_000).padStart(6, '0');
  }
}

/** Si un texto tiene forma de código de registro. */
export function esCodigoDeRegistro(texto: string): boolean {
  return /^\d{6}$/.test(texto);
}

// ── La oferta de prueba ──────────────────────────────────────────────────────

/** Los días de prueba cuando se enciende la oferta sin decir cuántos. */
export const DIAS_DE_OFERTA_POR_DEFECTO = 12;
export const DIAS_DE_OFERTA_MINIMOS = 1;
export const DIAS_DE_OFERTA_MAXIMOS = 90;

export interface OfertaDePrueba {
  readonly activa: boolean;
  readonly dias: number;
}

// ── Los planes ───────────────────────────────────────────────────────────────

export type CodigoDePlan = 'esencial' | 'pro' | 'cadena' | 'pausa';

export interface Plan {
  readonly codigo: CodigoDePlan;
  readonly nombre: string;
  /** En una frase, para quién es. */
  readonly paraQuien: string;
  /** Céntimos por local y mes, **con el IVA incluido** (Richi, 16-sep-2026). */
  readonly alMesPorLocal: number;
  /** Céntimos por local y año, con el IVA incluido. Nulo si no hay pago anual. */
  readonly alAnoPorLocal: number | null;
  readonly localesDesde: number;
  /** Nulo: sin tope. */
  readonly localesHasta: number | null;
  /** Lo que se cuenta en la pantalla de elegir plan. */
  readonly loQueLleva: readonly string[];
}

/**
 * Los planes del Manifiesto (32), con el IVA incluido.
 *
 * **Los precios de verdad los cobra Stripe** (entrega 2): estos son los que se
 * enseñan, y una prueba comprueba que el anual sea diez meses. Si un día cambian,
 * se cambian aquí y en Stripe a la vez, con su decisión.
 */
export const PLANES: readonly Plan[] = [
  {
    codigo: 'esencial',
    nombre: 'Esencial',
    paraQuien: 'Para controlar tu cocina sin cambiar nada más.',
    alMesPorLocal: 4_900,
    alAnoPorLocal: 49_000,
    localesDesde: 1,
    localesHasta: null,
    loQueLleva: [
      'Las ocho apps completas',
      'Carta digital con QR',
      'Documentos sin límite',
      'Acceso para tu gestoría',
      'Ventas y catálogo por fichero',
    ],
  },
  {
    codigo: 'pro',
    nombre: 'Pro',
    paraQuien: 'Para el local que factura de verdad y quiere que Estook trabaje solo.',
    alMesPorLocal: 7_900,
    alAnoPorLocal: 79_000,
    localesDesde: 1,
    localesHasta: null,
    loQueLleva: [
      'Todo lo de Esencial',
      'Conexión automática con tu TPV',
      'Canales de reparto conectados',
      'Reseñas con respuesta propuesta',
      'Soporte prioritario y puesta en marcha',
    ],
  },
  {
    codigo: 'cadena',
    nombre: 'Cadena',
    paraQuien: 'Todo lo de Pro para grupos de 2 a 10 locales.',
    alMesPorLocal: 6_900,
    alAnoPorLocal: 69_000,
    localesDesde: 2,
    localesHasta: 10,
    loQueLleva: [
      'Todo lo de Pro en cada local',
      'Panel de cadena y gestión por excepción',
      'Catálogo maestro',
      'Áreas y area managers sin límite',
      'Una sola factura con desglose por local',
    ],
  },
  {
    codigo: 'pausa',
    nombre: 'Pausa',
    paraQuien: 'Para cierres de temporada o reformas: tus datos, guardados.',
    alMesPorLocal: 1_200,
    alAnoPorLocal: null,
    localesDesde: 1,
    localesHasta: null,
    loQueLleva: ['Solo lectura', 'Datos conservados y exportables'],
  },
];

export function planPorCodigo(codigo: string): Plan | undefined {
  return PLANES.find((p) => p.codigo === codigo);
}

// ── Google ───────────────────────────────────────────────────────────────────

/**
 * A dónde puede volver Google después de entrar (0042).
 *
 * Google solo vuelve a las direcciones apuntadas en el cliente de OAuth, y aquí
 * se repite la lista para que la API **no canjee un código** que diga venir de
 * otro sitio. Las de `localhost` son las de desarrollo y las pruebas: Google no
 * entrega códigos a una dirección que no esté apuntada en su consola, así que en
 * producción no abren nada.
 */
export const VUELTAS_DE_GOOGLE = [
  'https://estook.com/app/',
  'https://www.estook.com/app/',
  'http://localhost:5174/',
] as const;

export type VueltaDeGoogle = (typeof VUELTAS_DE_GOOGLE)[number];
