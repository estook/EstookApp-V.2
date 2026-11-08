/**
 * Lo que se vende y cómo funciona el local (la pausa del 8-nov, 0142): las reglas puras de
 * Servicio › Jornadas › Información, Negocio › Informes y Servicio › Empleados.
 *
 * ── «Tu carta en cuatro» ─────────────────────────────────────────────────────
 *
 * La ingeniería de menú de Kasavana y Smith (1982), la que usan las cadenas: cada plato según lo
 * que se vende y lo que deja por ración, frente a la carta entera.
 *
 *   · **Popular** si vende al menos el 70 % de lo que le tocaría a partes iguales (con 10 platos,
 *     el 7 % de las raciones). El 70 % es el del método, no uno puesto a ojo.
 *   · **Deja mucho** si su margen por ración llega a la media ponderada de la carta (lo que dejan
 *     todos entre las raciones vendidas).
 *
 * Estrella: popular y deja mucho. Caballo: popular y deja poco. Puzzle: deja mucho y se vende poco.
 * Perro: ni lo uno ni lo otro. **Sin escandallo, el plato no se clasifica**: no se adivina lo que
 * deja (Plan, M9). Y con menos de cuatro platos con margen no hay carta que comparar.
 */

export const CUADRANTES = ['estrella', 'caballo', 'puzzle', 'perro'] as const;
export type Cuadrante = (typeof CUADRANTES)[number];

/** El 70 % del método de Kasavana y Smith. */
export const PARTE_PARA_SER_POPULAR = 0.7;

/** Con menos de estos platos con margen, comparar no dice nada. */
export const PLATOS_PARA_CLASIFICAR = 4;

export interface PlatoParaClasificar {
  readonly id: string;
  readonly uds: number;
  /** Lo que deja una ración, en céntimos, sin IVA. Nulo sin escandallo. */
  readonly margenPorUnidad: number | null;
}

export interface LaCartaEnCuatro {
  /** De cada plato con margen, su cuadrante. Los que no tienen margen no están. */
  readonly deCadaPlato: ReadonlyMap<string, Cuadrante>;
  /** Las raciones a partir de las que un plato es popular. */
  readonly corteDeUnidades: number;
  /** El margen por ración a partir del que un plato deja mucho, en céntimos. */
  readonly corteDeMargen: number;
}

export function laCartaEnCuatro(platos: readonly PlatoParaClasificar[]): LaCartaEnCuatro | null {
  const conMargen = platos.filter(
    (p): p is PlatoParaClasificar & { margenPorUnidad: number } =>
      p.margenPorUnidad !== null && p.uds > 0,
  );
  if (conMargen.length < PLATOS_PARA_CLASIFICAR) return null;
  const uds = conMargen.reduce((s, p) => s + p.uds, 0);
  const corteDeUnidades = (uds / conMargen.length) * PARTE_PARA_SER_POPULAR;
  const corteDeMargen = conMargen.reduce((s, p) => s + p.margenPorUnidad * p.uds, 0) / uds;
  const deCadaPlato = new Map<string, Cuadrante>();
  for (const p of conMargen) {
    const popular = p.uds >= corteDeUnidades;
    const dejaMucho = p.margenPorUnidad >= corteDeMargen;
    deCadaPlato.set(
      p.id,
      popular ? (dejaMucho ? 'estrella' : 'caballo') : dejaMucho ? 'puzzle' : 'perro',
    );
  }
  return { deCadaPlato, corteDeUnidades, corteDeMargen };
}

export const QUE_ES_CADA_CUADRANTE: Readonly<
  Record<Cuadrante, { readonly nombre: string; readonly queHacer: string }>
> = {
  estrella: {
    nombre: 'Estrellas',
    queHacer: 'Se venden mucho y dejan mucho. No los toques.',
  },
  caballo: {
    nombre: 'Caballos',
    queHacer: 'Se venden mucho y dejan poco. Sube un poco el precio o abarata el escandallo.',
  },
  puzzle: {
    nombre: 'Puzzles',
    queHacer:
      'Dejan mucho y salen poco. Que la sala los recomiende y dales mejor sitio en la carta.',
  },
  perro: {
    nombre: 'Perros',
    queHacer: 'Ni se venden ni dejan. Cámbialos o quítalos.',
  },
};

// ── La cocina ────────────────────────────────────────────────────────────────

/**
 * Un plato sale **tarde** si tarda más de 20 minutos desde que se marcha hasta que la cocina lo
 * tacha: lo habitual en un restaurante de servicio de mesa (0142). De fábrica, y sin ajuste.
 */
export const MINUTOS_PARA_IR_TARDE = 20;

/**
 * Los minutos que tardó un plato: desde que se mandó (o se marchó su pase, si fue después) hasta
 * que se tachó. Nulo si no se tachó en pantalla: con la cocina en papel no hay hora de salida.
 */
export function minutosDeCocina(
  mandadaEn: string | null,
  marchadoEn: string | null,
  salioEn: string | null,
): number | null {
  if (mandadaEn === null || salioEn === null) return null;
  const empieza = Math.max(Date.parse(mandadaEn), marchadoEn === null ? 0 : Date.parse(marchadoEn));
  const minutos = (Date.parse(salioEn) - empieza) / 60_000;
  // Un tachado antes de marchar, o de hace más de tres horas, no es un tiempo de cocina.
  if (minutos < 0 || minutos > 180) return null;
  return minutos;
}

// ── Los objetivos de cada uno (P3) ──────────────────────────────────────────

/**
 * Lo que debería vender alguien en un periodo, con el objetivo en € por hora y sus horas
 * (Richi, 8-nov: «no es lo mismo que alguien de 20 h venda 500 a la semana que alguien de 40»).
 */
export function loQueDeberiaVender(centimosPorHora: number, minutos: number): number {
  return Math.round((centimosPorHora * minutos) / 60);
}

// ── Los periodos de Información e Informes ───────────────────────────────────

export const PERIODOS_DEL_SERVICIO = ['dia', 'semana', 'mes'] as const;
export type PeriodoDelServicio = (typeof PERIODOS_DEL_SERVICIO)[number];

export function esPeriodoDelServicio(valor: unknown): valor is PeriodoDelServicio {
  return typeof valor === 'string' && (PERIODOS_DEL_SERVICIO as readonly string[]).includes(valor);
}

export interface UnPeriodoDelServicio {
  readonly desde: string;
  readonly hasta: string;
  /** Con lo que se compara: el mismo día de la semana anterior, la semana o el mes de antes. */
  readonly antesDesde: string;
  /** Si el periodo no ha acabado, lo de antes se corta en el mismo punto: se compara lo comparable. */
  readonly antesHasta: string;
  readonly anteriorDel: string;
  /** Nulo si el siguiente todavía no ha empezado. */
  readonly siguienteDel: string | null;
}

function comoFecha(fecha: string): number {
  const [a, m, d] = fecha.split('-').map(Number) as [number, number, number];
  return Date.UTC(a, m - 1, d);
}

function aFecha(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

function sumarDias(fecha: string, dias: number): string {
  return aFecha(comoFecha(fecha) + dias * 86_400_000);
}

function diasEntre(desde: string, hasta: string): number {
  return Math.round((comoFecha(hasta) - comoFecha(desde)) / 86_400_000);
}

function primeroDelMes(fecha: string, meses = 0): string {
  const [a, m] = fecha.split('-').map(Number) as [number, number];
  return aFecha(Date.UTC(a, m - 1 + meses, 1));
}

/**
 * El día, la semana (de lunes a domingo) o el mes de una fecha, y con qué se compara. Las fechas
 * son jornadas del local y llegan del servidor (regla 10): aquí no se mira ningún reloj.
 */
export function elPeriodoDelServicio(
  tipo: PeriodoDelServicio,
  del: string | null,
  hoy: string,
): UnPeriodoDelServicio {
  const referencia = del === null || del > hoy ? hoy : del;
  let desde: string;
  let hasta: string;
  let antesDesde: string;
  let antesHastaEntero: string;
  if (tipo === 'dia') {
    desde = referencia;
    hasta = referencia;
    antesDesde = sumarDias(referencia, -7);
    antesHastaEntero = antesDesde;
  } else if (tipo === 'semana') {
    const dow = (new Date(comoFecha(referencia)).getUTCDay() + 6) % 7;
    desde = sumarDias(referencia, -dow);
    hasta = sumarDias(desde, 6);
    antesDesde = sumarDias(desde, -7);
    antesHastaEntero = sumarDias(hasta, -7);
  } else {
    desde = primeroDelMes(referencia);
    hasta = sumarDias(primeroDelMes(referencia, 1), -1);
    antesDesde = primeroDelMes(referencia, -1);
    antesHastaEntero = sumarDias(desde, -1);
  }
  // A medias: lo de antes, hasta el mismo punto.
  const transcurridos = hoy >= desde && hoy <= hasta ? diasEntre(desde, hoy) : null;
  const antesHasta =
    transcurridos === null
      ? antesHastaEntero
      : ([sumarDias(antesDesde, transcurridos), antesHastaEntero].sort()[0] ?? antesHastaEntero);
  const siguiente = sumarDias(hasta, 1);
  return {
    desde,
    hasta,
    antesDesde,
    antesHasta,
    anteriorDel: tipo === 'dia' ? sumarDias(desde, -1) : antesDesde,
    siguienteDel: siguiente > hoy ? null : siguiente,
  };
}

// ── Cómo se dicen las cifras ─────────────────────────────────────────────────

/**
 * Un importe que puede llegar con decimales (una media, un eje de gráfica) dicho en euros: aquí se
 * redondea al céntimo, y solo aquí (regla 9).
 */
export function enDinero(centimosConDecimales: number): string {
  return `${(Math.round(centimosConDecimales) / 100).toLocaleString('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    useGrouping: 'always',
  })} €`;
}

/** Cuánto cambia algo frente a antes, en %, con un decimal. Nulo sin nada con qué comparar. */
export function cuantoCambia(ahora: number | null, antes: number | null): number | null {
  if (ahora === null || antes === null || antes === 0) return null;
  return Math.round(((ahora - antes) / antes) * 1000) / 10;
}

/** Lo vendido sin IVA, con el tipo del local (el de restauración, 0,10 si no se sabe), al céntimo. */
export function sinElIva(conIva: number, tipo: number | null): number {
  return Math.round(conIva / (1 + (tipo ?? 0.1)));
}

/** Un importe partido (un ticket medio, lo que deja una ración), al céntimo. */
export function alCentimo(centimosConDecimales: number): number {
  return Math.round(centimosConDecimales);
}

/** La media de unos minutos, con un decimal. Nula sin ninguno. */
export function mediaConUnDecimal(valores: readonly number[]): number | null {
  if (valores.length === 0) return null;
  return Math.round((valores.reduce((s, v) => s + v, 0) / valores.length) * 10) / 10;
}
