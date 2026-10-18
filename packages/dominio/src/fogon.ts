/**
 * Fogón · lo que gasta y hasta dónde (Fogón 1 · 1, decisión 0097).
 *
 * Richi, 18-oct: «un local en IA no debe superar los 5 euros en consumo, y tirando por
 * lo alto… hay que poner límites diarios, si no se nos va de las manos». **Todos los
 * números de gasto viven aquí, una sola vez**: el servidor corta con ellos y la app
 * enseña lo que queda con ellos.
 *
 * Dos frenos, y no se mezclan:
 *
 *   · **Los créditos**, que es lo que ve el local: los de su plan (Manifiesto 32), y
 *     una décima parte al día, para que un día raro no se coma el mes.
 *   · **Los euros**, que es lo que paga Estook, por dentro: lo que de verdad ha costado
 *     cada llamada. Es la red de seguridad: si mañana cambia el modelo o su precio,
 *     corta antes de pasarse de los 5 € al mes.
 */

/** Lo que se le puede pedir a Fogón en la 1 · 1, y lo que gasta cada cosa. */
export const CREDITOS_DE_FOGON = {
  preguntar: 1,
  rellenar_escandallo: 2,
  escribir_pasos: 2,
} as const;

export type QueSeLePide = keyof typeof CREDITOS_DE_FOGON;

/** Los créditos del mes de cada plan (Manifiesto 32). Pausa no tiene Fogón. */
export const CREDITOS_AL_MES = {
  esencial: 300,
  pro: 1500,
  cadena: 1500,
  pausa: 0,
} as const;

export type PlanConFogon = keyof typeof CREDITOS_AL_MES;

/** Al día, una décima parte de los del mes. */
export const PARTE_DEL_MES_AL_DIA = 10;

/** El freno en euros, por local: lo que paga Estook. En millonésimas de euro. */
export const TOPE_EN_EUROS = {
  /** 5 € al mes: lo que dijo Richi, «tirando por lo alto». */
  mes: 5_000_000,
  /** 25 céntimos al día. */
  dia: 250_000,
} as const;

/** Al 80 % de los créditos del mes se avisa (Manifiesto, «Cuando se acaban»). */
export const AVISO_AL_GASTAR = 0.8;

/**
 * Los créditos que da un plan. Sin plan (la prueba de quien acaba de entrar) o de la
 * casa, los de Pro: es lo que se está probando.
 */
export function creditosDelPlan(plan: string | null, deLaCasa: boolean): number {
  if (deLaCasa || plan === null) return CREDITOS_AL_MES.pro;
  return plan in CREDITOS_AL_MES ? CREDITOS_AL_MES[plan as PlanConFogon] : CREDITOS_AL_MES.pro;
}

export interface LoGastado {
  readonly creditosHoy: number;
  readonly creditosMes: number;
  readonly microEurosHoy: number;
  readonly microEurosMes: number;
}

export type PorQueNoHabla =
  'sin_creditos_hoy' | 'sin_creditos_mes' | 'tope_de_euros_hoy' | 'tope_de_euros_mes';

/**
 * Si caben los créditos de lo que se pide, o por qué no. Se mira **antes** de llamar
 * al modelo: lo que no cabe no se gasta.
 */
export function cabeEnLosTopes(
  gastado: LoGastado,
  creditosDelMes: number,
  pide: number,
): PorQueNoHabla | null {
  const alDia = Math.floor(creditosDelMes / PARTE_DEL_MES_AL_DIA);
  if (gastado.creditosMes + pide > creditosDelMes) return 'sin_creditos_mes';
  if (gastado.creditosHoy + pide > alDia) return 'sin_creditos_hoy';
  if (gastado.microEurosMes >= TOPE_EN_EUROS.mes) return 'tope_de_euros_mes';
  if (gastado.microEurosHoy >= TOPE_EN_EUROS.dia) return 'tope_de_euros_hoy';
  return null;
}

/** Lo que se le dice a la persona cuando no cabe. Corto y con cuándo vuelve. */
export const POR_QUE_NO_HABLA: Readonly<Record<PorQueNoHabla, string>> = {
  sin_creditos_hoy: 'Hoy ya se han gastado los créditos de Fogón de este local. Mañana vuelve.',
  sin_creditos_mes:
    'Este mes ya se han gastado los créditos de Fogón de este local. El día 1 vuelven.',
  tope_de_euros_hoy: 'Fogón ha llegado a su tope de hoy en este local. Mañana vuelve.',
  tope_de_euros_mes: 'Fogón ha llegado a su tope del mes en este local. El día 1 vuelve.',
};

/**
 * El precio de cada modelo, en dólares por millón de tokens. COMPROBADO el 18-oct-2026
 * en la documentación de Anthropic: lo cacheado que se lee cuesta una décima parte y lo
 * que se escribe en caché, 1,25 veces. Un modelo que no está aquí se cobra como el más
 * caro de la lista, para que el freno en euros no se quede corto.
 */
export const PRECIO_DE_LOS_MODELOS: Readonly<
  Record<string, { entrada: number; cacheLeida: number; cacheEscrita: number; salida: number }>
> = {
  'claude-haiku-5-5': { entrada: 0.1, cacheLeida: 0.01, cacheEscrita: 0.125, salida: 0.5 },
  'claude-sonnet-5-5': { entrada: 2, cacheLeida: 0.2, cacheEscrita: 2.5, salida: 10 },
  'claude-opus-5-5': { entrada: 4, cacheLeida: 0.2, cacheEscrita: 5, salida: 20 },
};

/** SUPUESTO, el mismo de `coste-por-local.mjs`: un dólar, en euros. */
export const EUROS_POR_DOLAR = 0.9;

export interface TokensDeUnaLlamada {
  readonly entrada: number;
  readonly cacheLeidos: number;
  readonly cacheEscritos: number;
  readonly salida: number;
}

/** Lo que ha costado una llamada, en millonésimas de euro, redondeado hacia arriba. */
export function costeEnMicroEuros(modelo: string, tokens: TokensDeUnaLlamada): number {
  const precio = PRECIO_DE_LOS_MODELOS[modelo] ?? PRECIO_DE_LOS_MODELOS['claude-opus-5-5'];
  if (precio === undefined) return 0;
  // Dólares por millón de tokens × tokens = millonésimas de dólar.
  const microDolares =
    precio.entrada * tokens.entrada +
    precio.cacheLeida * tokens.cacheLeidos +
    precio.cacheEscrita * tokens.cacheEscritos +
    precio.salida * tokens.salida;
  return Math.ceil(microDolares * EUROS_POR_DOLAR);
}

/** De millonésimas de euro a céntimos enteros, hacia arriba: lo gastado no se queda corto. */
export function centimosDeMicroEuros(microEuros: number): number {
  return Math.ceil(microEuros / 10_000);
}

/** El modelo de Fogón 1: el más barato (0097, respuesta 1). Lo cambia el secreto del servidor. */
export const MODELO_DE_FOGON = 'claude-haiku-5-5';

/** Lo más que puede escribir una persona al preguntar o al pedir un borrador. */
export const LETRAS_PARA_FOGON = 600;
