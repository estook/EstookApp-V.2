/**
 * El alta de un local · los ocho pasos (M5).
 *
 * «Una conversación corta, una pregunta por pantalla, con botones grandes y la
 *  opción de saltar cualquier cosa» (Manifiesto 8).
 *
 * ── Por qué los pasos viven aquí y no en la pantalla ─────────────────────────
 *
 * Porque los usan tres sitios: la pantalla, para pintar; el servidor, para saber
 * qué se puede guardar en cada paso; y la barra de progreso, para decir qué se
 * gana con cada uno. Tres sitios con su propia lista acabarían discrepando, y el
 * día que se añada un paso habría que acordarse de tres (regla 6).
 *
 * La base de datos guarda **por qué número va** (`local.onboarding_paso`, de 0 a
 * 8) y **cuáles se saltó** (`local.onboarding_saltados`, por su código). El
 * número está ahí desde la migración 0018, que lo dejó puesto esperando a M5.
 *
 * ── Y por qué se puede saltar todo ───────────────────────────────────────────
 *
 * Porque el alta compite con «ya lo miro luego», y luego no llega nunca. Un alta
 * que no deja pasar de la pantalla dos es un alta que se abandona en la pantalla
 * dos. Lo que se salta queda apuntado y vuelve a ofrecerse desde el Panel, con
 * lo que se gana al hacerlo dicho en una frase.
 */

/** Los ocho, en orden. El índice + 1 es el número que guarda la base de datos. */
export const PASOS_DEL_ALTA = [
  {
    codigo: 'quien_eres',
    titulo: '¿Cómo te llamas?',
    /** Lo que se gana al responderlo. Es lo que enseña la barra de progreso. */
    paraQue:
      'Ese correo es el que recibe lo importante, y el que te devuelve la cuenta si la pierdes.',
  },
  {
    codigo: 'tipo_de_local',
    titulo: '¿Qué tipo de local tienes?',
    paraQue: 'Con esto ya sé qué objetivos proponerte y cómo agrupar tus productos.',
  },
  {
    codigo: 'cuantos_locales',
    titulo: '¿Cuántos locales llevas?',
    paraQue: 'Con dos o más, se crea la empresa primero y el segundo local se duplica del primero.',
  },
  {
    codigo: 'donde_esta',
    titulo: '¿Dónde está tu restaurante?',
    paraQue:
      'Sale en tus documentos, y la hora de cierre decide a qué día pertenece una venta de madrugada.',
  },
  {
    codigo: 'marca',
    titulo: 'Sube tu logo y elige tu color',
    paraQue: 'Se aplican a la aplicación y a todos los documentos que genera.',
  },
  {
    codigo: 'fiscal_y_objetivos',
    titulo: 'Impuestos y objetivos',
    paraQue:
      'Los objetivos son los que ponen en verde o en rojo los semáforos de toda la aplicación.',
  },
  {
    codigo: 'equipo',
    titulo: 'Invita a tu equipo',
    paraQue: 'Cada persona entra con su PIN, y lo que hace queda con su nombre.',
  },
  {
    codigo: 'paseo',
    titulo: 'Cinco pantallas y a trabajar',
    paraQue: 'El Panel, la rueda, los documentos, el chat y Fogón. Dos minutos.',
  },
] as const;

export type PasoDelAlta = (typeof PASOS_DEL_ALTA)[number]['codigo'];

export const CODIGOS_DE_PASO = PASOS_DEL_ALTA.map((p) => p.codigo) as readonly PasoDelAlta[];

export const CUANTOS_PASOS = PASOS_DEL_ALTA.length;

export function esPasoDelAlta(valor: unknown): valor is PasoDelAlta {
  return typeof valor === 'string' && (CODIGOS_DE_PASO as readonly string[]).includes(valor);
}

/** El paso que toca cuando la base de datos dice que va por el número `n`. */
export function pasoNumero(n: number): (typeof PASOS_DEL_ALTA)[number] | undefined {
  return PASOS_DEL_ALTA[n];
}

/** Qué número le corresponde a un paso. El primero es el 0. */
export function numeroDelPaso(codigo: PasoDelAlta): number {
  return CODIGOS_DE_PASO.indexOf(codigo);
}

// ── Los tipos de local ───────────────────────────────────────────────────────

export const TIPOS_DE_LOCAL = [
  'bar_de_tapas',
  'restaurante_de_carta',
  'cafeteria',
  'obrador',
  'food_truck',
  'otro',
] as const;

export type TipoDeLocal = (typeof TIPOS_DE_LOCAL)[number];

export const NOMBRE_DEL_TIPO: Readonly<Record<TipoDeLocal, string>> = {
  bar_de_tapas: 'Bar de tapas',
  restaurante_de_carta: 'Restaurante de carta',
  cafeteria: 'Cafetería',
  obrador: 'Obrador',
  food_truck: 'Food truck',
  otro: 'Otro',
};

export function esTipoDeLocal(valor: unknown): valor is TipoDeLocal {
  return typeof valor === 'string' && (TIPOS_DE_LOCAL as readonly string[]).includes(valor);
}

// ── Los objetivos ────────────────────────────────────────────────────────────

export const CLAVES_DE_OBJETIVO = ['materia_prima', 'personal', 'margen'] as const;

export type ClaveDeObjetivo = (typeof CLAVES_DE_OBJETIVO)[number];

export const NOMBRE_DEL_OBJETIVO: Readonly<Record<ClaveDeObjetivo, string>> = {
  materia_prima: 'Materia prima',
  personal: 'Personal',
  margen: 'Margen',
};

/**
 * Qué significa cada uno, en una frase.
 *
 * No es decoración: «este es el dato más silencioso y más influyente del
 * sistema. Un objetivo mal puesto tiñe de rojo o de verde una aplicación
 * entera» (Auditoría 1.2). Quien no entiende qué está poniendo, lo pone mal.
 */
export const QUE_ES_EL_OBJETIVO: Readonly<Record<ClaveDeObjetivo, string>> = {
  materia_prima: 'De cada 100 € que facturas, cuántos se van en género.',
  personal: 'De cada 100 € que facturas, cuántos se van en sueldos.',
  margen: 'Lo que te queda de cada plato antes de contar los gastos del local.',
};

export function esClaveDeObjetivo(valor: unknown): valor is ClaveDeObjetivo {
  return typeof valor === 'string' && (CLAVES_DE_OBJETIVO as readonly string[]).includes(valor);
}

// ── La barra de progreso, que cuenta valor y no tareas ───────────────────────

/**
 * «**Barra de progreso con valor, no con tareas:** con lo que llevas ya calculo
 *  el margen de 6 platos; con 4 más te digo cuál te está costando dinero»
 * (Manifiesto 8).
 *
 * La diferencia es todo: «3 de 8 pasos» dice cuánto trabajo te queda, que es
 * justamente lo que desanima. «Ya sé qué impuesto lleva cada cosa; con dos
 * respuestas más te pongo los semáforos» dice qué te llevas.
 *
 * Cálculo puro y con su prueba al lado: es una decisión de producto, no una
 * consulta, y se puede equivocar en los casos raros —todo saltado, todo hecho—
 * que son los que nadie prueba a mano.
 */
export interface ComoVaElAlta {
  readonly paso: number;
  readonly saltados: readonly PasoDelAlta[];
  readonly terminado: boolean;
}

export interface Progreso {
  /** De 0 a 1. Cuenta lo respondido, y lo saltado **no cuenta como hecho**. */
  readonly fraccion: number;
  readonly respondidos: number;
  readonly deCuantos: number;
  /** Qué se ha ganado ya, en una frase. Vacío mientras no se ha ganado nada. */
  readonly loQueYaTienes: string | null;
  /** Qué falta y para qué sirve. Nulo cuando no falta nada. */
  readonly loQueTeFalta: string | null;
  /** Los pasos que quedan por responder, saltados incluidos. */
  readonly pendientes: readonly PasoDelAlta[];
}

export function comoVa(estado: ComoVaElAlta): Progreso {
  const saltados = new Set<string>(estado.saltados);

  // Un paso está respondido si se ha pasado por él **y no se saltó**. Contar un
  // salto como hecho sería mentir en la única cifra que se enseña.
  const hechos = CODIGOS_DE_PASO.filter((codigo, i) => i < estado.paso && !saltados.has(codigo));
  const pendientes = CODIGOS_DE_PASO.filter(
    (codigo, i) => i >= estado.paso || saltados.has(codigo),
  );

  const fraccion = hechos.length / CUANTOS_PASOS;

  return {
    fraccion,
    respondidos: hechos.length,
    deCuantos: CUANTOS_PASOS,
    loQueYaTienes: loQueYaTienes(hechos),
    loQueTeFalta: estado.terminado && pendientes.length === 0 ? null : loQueTeFalta(pendientes),
    pendientes,
  };
}

/**
 * Lo ganado, dicho de lo más valioso a lo menos.
 *
 * El orden no es el de los pasos: es el de lo que más cambia la aplicación. A
 * quien ha puesto los objetivos le importa más eso que haber subido un logo,
 * aunque el logo fuera antes.
 */
function loQueYaTienes(hechos: readonly PasoDelAlta[]): string | null {
  const tiene = new Set<string>(hechos);

  if (tiene.has('fiscal_y_objetivos')) {
    return 'Ya sé qué impuesto lleva cada cosa y cuándo ponerte algo en rojo.';
  }
  if (tiene.has('tipo_de_local')) {
    return 'Ya sé qué objetivos proponerte y cómo agrupar tus productos.';
  }
  if (tiene.has('donde_esta')) {
    return 'Ya sé a qué día pertenece una venta de madrugada.';
  }
  if (tiene.size > 0) {
    return 'Ya tengo lo básico de tu local.';
  }
  return null;
}

/** Lo que falta, dicho por lo que se gana al hacerlo y no por lo que cuesta. */
function loQueTeFalta(pendientes: readonly PasoDelAlta[]): string | null {
  const siguiente = PASOS_DEL_ALTA.find((paso) => pendientes.includes(paso.codigo));
  return siguiente ? siguiente.paraQue : null;
}
