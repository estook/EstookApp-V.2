/**
 * **El plano de la sala, dibujado a ojo en Estook TPV** (T2 · La sala, Anexo 11.9).
 *
 * Nadie mide sus mesas (respuesta 7 de la 0107): se ponen como se ven. Así que aquí no
 * hay ni un centímetro. Todo vive en **el espacio del plano**, 1000 por 1000 en los dos
 * ejes, que se pinta apaisado, 16:10 (como desde la 1 · 2): una unidad de ancho mide en
 * la pantalla lo que 1,6 de fondo. Las mismas funciones las usan la caja, la tablet y el
 * móvil, y la API, para que una mesa no salga en otro sitio del que se puso.
 *
 * Lo que hace que dibujar cueste poco:
 *
 *   · **la mesa crece sola con sus plazas** (`tamanoDeLaMesa`): lo normal es no tocar nada
 *   · **imán**: lo que se mueve se pega a una rejilla que no se ve (`alIman`), y el giro se
 *     queda solo en 0°, 45° y 90° si se pasa cerca (`elGiroConIman`)
 *   · **guías** al alinearse con otra cosa (`lasGuias`)
 *   · **el número siguiente** para la mesa nueva (`elNombreDeLaSiguiente`)
 *   · **plantillas** del tipo de local para empezar (`PLANTILLAS_DE_SALA`)
 */

/** El plano se pinta así de apaisado: ancho entre alto. */
export const PROPORCION_DEL_PLANO = 16 / 10;

/** Lo que mide el plano en sus unidades, en los dos ejes. */
export const LADO_DEL_PLANO = 1000;

// ── Lo que hay en la paleta (Anexo 11.9) ─────────────────────────────────────

/** Lo que se abre: es una mesa, y tiene cuenta. */
export const FORMAS_DE_MESA = [
  'cuadrada',
  'redonda',
  'rectangular',
  'ovalada',
  'alargada',
  'taburete',
] as const;
export type FormaDeMesa = (typeof FORMAS_DE_MESA)[number];

/** Lo que no se abre: es la sala. */
export const COSAS_DE_LA_SALA = ['barra', 'pared', 'columna', 'puerta', 'planta', 'texto'] as const;
export type CosaDeLaSala = (typeof COSAS_DE_LA_SALA)[number];

export const NOMBRE_DE_LA_FORMA: Readonly<Record<FormaDeMesa, string>> = {
  cuadrada: 'Cuadrada',
  redonda: 'Redonda',
  rectangular: 'Rectangular',
  ovalada: 'Ovalada',
  alargada: 'Alargada',
  taburete: 'Taburete',
};

export const NOMBRE_DE_LA_COSA: Readonly<Record<CosaDeLaSala, string>> = {
  barra: 'Barra',
  pared: 'Pared',
  columna: 'Columna',
  puerta: 'Puerta',
  planta: 'Planta',
  texto: 'Texto',
};

/** Las plazas que se ofrecen con un toque; con − y + se llega a cualquiera. */
export const PLAZAS_DE_UN_TOQUE = [2, 4, 6, 8, 10, 12] as const;

export interface Tamano {
  /** De izquierda a derecha, en unidades del plano. */
  readonly ancho: number;
  /** De arriba abajo, en unidades del plano. */
  readonly fondo: number;
}

/** Lo que mide en la pantalla un lado de `lado` unidades de ancho, puesto de fondo. */
function deFondo(lado: number): number {
  return Math.round(lado * PROPORCION_DEL_PLANO);
}

function entre(minimo: number, valor: number, maximo: number): number {
  return Math.min(Math.max(valor, minimo), maximo);
}

/**
 * **El tamaño razonable de una mesa, por sus plazas** (Anexo 11.9): una de 6 nace más
 * grande que una de 2. Las cuadradas y redondas crecen por igual; las rectangulares, las
 * ovaladas y las de banco, a lo largo; el taburete es de uno.
 */
export function tamanoDeLaMesa(forma: FormaDeMesa, plazas: number): Tamano {
  const p = entre(1, Math.round(plazas), 50);
  switch (forma) {
    case 'cuadrada':
    case 'redonda': {
      const lado = entre(80, 60 + 15 * p, 220);
      return { ancho: lado, fondo: deFondo(lado) };
    }
    case 'rectangular':
    case 'ovalada':
      return { ancho: entre(140, 40 + 28 * p, 600), fondo: deFondo(95) };
    case 'alargada':
      return { ancho: entre(160, 40 + 32 * p, 700), fondo: deFondo(80) };
    case 'taburete':
      return { ancho: 50, fondo: deFondo(50) };
  }
}

/** El tamaño de cada cosa de la sala al ponerla: se estira desde sus esquinas. */
export function tamanoDeLaCosa(cosa: CosaDeLaSala): Tamano {
  switch (cosa) {
    case 'barra':
      return { ancho: 420, fondo: deFondo(70) };
    case 'pared':
      return { ancho: 320, fondo: deFondo(14) };
    case 'columna':
      return { ancho: 40, fondo: deFondo(40) };
    case 'puerta':
      return { ancho: 100, fondo: deFondo(20) };
    case 'planta':
      return { ancho: 50, fondo: deFondo(50) };
    case 'texto':
      return { ancho: 220, fondo: deFondo(45) };
  }
}

/** Lo más pequeño que se puede estirar algo: que siga viéndose y tocándose. */
export const LO_MAS_PEQUENO = 14;

// ── Imán y giro ──────────────────────────────────────────────────────────────

/** La rejilla que no se ve: lo que se mueve se pega a ella. */
export const PASO_DEL_IMAN = 10;

export function alIman(valor: number, paso = PASO_DEL_IMAN): number {
  return Math.round(valor / paso) * paso;
}

/** Los giros que se quedan solos, si se pasa cerca (Anexo 11.9: 0°, 45° y 90°, y sus vueltas). */
const GIROS_CON_IMAN = [0, 45, 90, 135, 180, 225, 270, 315, 360] as const;
const CERCA_DEL_GIRO = 6;

/** El giro entre 0 y 359, quedándose solo en los de arriba si está a menos de 6°. */
export function elGiroConIman(grados: number): number {
  const vuelta = ((Math.round(grados) % 360) + 360) % 360;
  for (const giro of GIROS_CON_IMAN) {
    if (Math.abs(vuelta - giro) <= CERCA_DEL_GIRO) return giro % 360;
  }
  return vuelta;
}

// ── Que quepa en el plano ────────────────────────────────────────────────────

export interface Caja {
  /** La esquina de arriba a la izquierda, sin girar. */
  readonly x: number;
  readonly y: number;
  readonly ancho: number;
  readonly fondo: number;
}

/** Que lo puesto quepa entero en el plano: lo dejado en la esquina no se sale. */
export function dentroDelPlano(caja: Caja): Caja {
  const ancho = entre(LO_MAS_PEQUENO, Math.round(caja.ancho), LADO_DEL_PLANO);
  const fondo = entre(LO_MAS_PEQUENO, Math.round(caja.fondo), LADO_DEL_PLANO);
  return {
    x: entre(0, Math.round(caja.x), LADO_DEL_PLANO - ancho),
    y: entre(0, Math.round(caja.y), LADO_DEL_PLANO - fondo),
    ancho,
    fondo,
  };
}

/** Dónde se pinta, en tanto por ciento del plano: para `left`, `top`, `width` y `height`. */
export function enTantoPorCiento(caja: Caja): {
  readonly izquierda: number;
  readonly arriba: number;
  readonly ancho: number;
  readonly alto: number;
} {
  const dentro = dentroDelPlano(caja);
  return {
    izquierda: dentro.x / 10,
    arriba: dentro.y / 10,
    ancho: dentro.ancho / 10,
    alto: dentro.fondo / 10,
  };
}

/**
 * Un sitio libre para algo nuevo: la primera casilla de una rejilla en la que no pise a
 * nada. Así lo que se añade con un toque sale a la vista, y luego se arrastra.
 */
export function unSitioLibre(tamano: Tamano, lo: readonly Caja[]): { x: number; y: number } {
  const pisa = (x: number, y: number) =>
    lo.some(
      (o) =>
        x < o.x + o.ancho && x + tamano.ancho > o.x && y < o.y + o.fondo && y + tamano.fondo > o.y,
    );
  for (let y = 40; y + tamano.fondo <= LADO_DEL_PLANO; y += 60) {
    for (let x = 40; x + tamano.ancho <= LADO_DEL_PLANO; x += 40) {
      if (!pisa(x, y)) return { x, y };
    }
  }
  const dentro = dentroDelPlano({ x: 40, y: 40, ...tamano });
  return { x: dentro.x, y: dentro.y };
}

// ── Las guías ────────────────────────────────────────────────────────────────

/** Una línea de guía: vertical en `x`, u horizontal en `y`, en unidades del plano. */
export type Guia =
  { readonly eje: 'x'; readonly en: number } | { readonly eje: 'y'; readonly en: number };

const CERCA_DE_LA_GUIA = 8;

/**
 * **Las guías al alinearse** (Anexo 11.9): si el borde o el centro de lo que se mueve
 * pasa cerca del de otra cosa, se pega a él y sale la línea. Así las mesas quedan rectas
 * y en fila sin intentarlo.
 */
export function lasGuias(
  moviendo: Caja,
  lasDemas: readonly Caja[],
): { readonly x: number; readonly y: number; readonly guias: readonly Guia[] } {
  const enX = (c: Caja) => [c.x, c.x + c.ancho / 2, c.x + c.ancho];
  const enY = (c: Caja) => [c.y, c.y + c.fondo / 2, c.y + c.fondo];
  let x = moviendo.x;
  let y = moviendo.y;
  let mejorX: { distancia: number; desplazar: number; en: number } | null = null;
  let mejorY: { distancia: number; desplazar: number; en: number } | null = null;

  for (const otra of lasDemas) {
    enX(moviendo).forEach((mio) => {
      for (const suyo of enX(otra)) {
        const distancia = Math.abs(mio - suyo);
        if (distancia <= CERCA_DE_LA_GUIA && (mejorX === null || distancia < mejorX.distancia)) {
          mejorX = { distancia, desplazar: suyo - mio, en: suyo };
        }
      }
    });
    enY(moviendo).forEach((mio) => {
      for (const suyo of enY(otra)) {
        const distancia = Math.abs(mio - suyo);
        if (distancia <= CERCA_DE_LA_GUIA && (mejorY === null || distancia < mejorY.distancia)) {
          mejorY = { distancia, desplazar: suyo - mio, en: suyo };
        }
      }
    });
  }

  const guias: Guia[] = [];
  const conX = mejorX as { desplazar: number; en: number } | null;
  const conY = mejorY as { desplazar: number; en: number } | null;
  if (conX !== null) {
    x += conX.desplazar;
    guias.push({ eje: 'x', en: conX.en });
  }
  if (conY !== null) {
    y += conY.desplazar;
    guias.push({ eje: 'y', en: conY.en });
  }
  return { x, y, guias };
}

// ── El nombre de la mesa nueva ───────────────────────────────────────────────

/**
 * **La mesa nueva nace con el número siguiente** (Anexo 11.9): si la última es la 12, es
 * la 13. Cuenta las de todas las salas, que en un local la 6 es una sola. Si ninguna se
 * llama con un número, sigue desde cuántas hay.
 */
export function elNombreDeLaSiguiente(nombres: readonly string[]): string {
  const ocupados = new Set(nombres.map((n) => n.trim().toLowerCase()));
  const numeros = nombres
    .map((n) => /^\s*(\d{1,4})\s*$/.exec(n)?.[1])
    .filter((n): n is string => n !== undefined)
    .map(Number);
  let siguiente = (numeros.length > 0 ? Math.max(...numeros) : nombres.length) + 1;
  while (ocupados.has(String(siguiente))) siguiente += 1;
  return String(siguiente);
}

// ── Las plantillas (Anexo 11.9) ──────────────────────────────────────────────

export interface CosaDeLaPlantilla {
  readonly que: FormaDeMesa | CosaDeLaSala;
  readonly x: number;
  readonly y: number;
  readonly plazas?: number;
  readonly ancho?: number;
  readonly fondo?: number;
  readonly giro?: number;
  readonly texto?: string;
}

export interface PlantillaDeSala {
  readonly clave: string;
  readonly nombre: string;
  readonly frase: string;
  /** El nombre de la sala que crea. */
  readonly sala: string;
  readonly cosas: readonly CosaDeLaPlantilla[];
}

export function esUnaMesa(que: FormaDeMesa | CosaDeLaSala): que is FormaDeMesa {
  return (FORMAS_DE_MESA as readonly string[]).includes(que);
}

/** Seis mesas en dos filas, de `x0` en adelante. */
function filas(
  forma: FormaDeMesa,
  plazas: number,
  columnas: number,
  filasDeMesas: number,
  x0: number,
  y0: number,
  pasoX: number,
  pasoY: number,
): CosaDeLaPlantilla[] {
  const mesas: CosaDeLaPlantilla[] = [];
  for (let fila = 0; fila < filasDeMesas; fila++) {
    for (let columna = 0; columna < columnas; columna++) {
      mesas.push({ que: forma, plazas, x: x0 + columna * pasoX, y: y0 + fila * pasoY });
    }
  }
  return mesas;
}

export const PLANTILLAS_DE_SALA: readonly PlantillaDeSala[] = [
  {
    clave: 'bar',
    nombre: 'Bar con barra y 6 mesas',
    frase: 'La barra con cuatro taburetes, y seis mesas de cuatro.',
    sala: 'Salón',
    cosas: [
      { que: 'barra', x: 60, y: 60, ancho: 460 },
      ...[0, 1, 2, 3].map((i) => ({ que: 'taburete' as const, x: 90 + i * 100, y: 200 })),
      ...filas('cuadrada', 4, 3, 2, 600, 80, 130, 300),
      { que: 'puerta', x: 420, y: 950 },
    ],
  },
  {
    clave: 'restaurante',
    nombre: 'Restaurante de 12 mesas',
    frase: 'Tres filas de cuatro mesas, de dos y de cuatro.',
    sala: 'Salón',
    cosas: [
      ...filas('cuadrada', 2, 4, 1, 80, 70, 230, 0),
      ...filas('cuadrada', 4, 4, 1, 80, 380, 230, 0),
      ...filas('redonda', 4, 4, 1, 80, 690, 230, 0),
      { que: 'puerta', x: 450, y: 960 },
    ],
  },
  {
    clave: 'terraza',
    nombre: 'Terraza de 8',
    frase: 'Ocho mesas redondas de dos y de cuatro, en dos filas.',
    sala: 'Terraza',
    cosas: [
      ...filas('redonda', 2, 4, 1, 80, 120, 230, 0),
      ...filas('redonda', 4, 4, 1, 80, 560, 230, 0),
      ...[0, 1, 2].map((i) => ({ que: 'planta' as const, x: 200 + i * 230, y: 420 })),
    ],
  },
];

/**
 * Lo que pone una plantilla, ya con el tamaño, el sitio dentro del plano y el nombre de
 * cada mesa, siguiendo a las que ya hay en el local.
 */
export function loQuePoneLaPlantilla(
  plantilla: PlantillaDeSala,
  nombresQueHay: readonly string[],
): readonly {
  readonly que: FormaDeMesa | CosaDeLaSala;
  readonly nombre: string | null;
  readonly plazas: number | null;
  readonly caja: Caja;
  readonly giro: number;
  readonly texto: string | null;
}[] {
  const nombres = [...nombresQueHay];
  return plantilla.cosas.map((cosa) => {
    const esMesa = esUnaMesa(cosa.que);
    const plazas = esMesa ? (cosa.plazas ?? (cosa.que === 'taburete' ? 1 : 4)) : null;
    const propio = esUnaMesa(cosa.que)
      ? tamanoDeLaMesa(cosa.que, plazas ?? 1)
      : tamanoDeLaCosa(cosa.que);
    const caja = dentroDelPlano({
      x: cosa.x,
      y: cosa.y,
      ancho: cosa.ancho ?? propio.ancho,
      fondo: cosa.fondo ?? propio.fondo,
    });
    let nombre: string | null = null;
    if (esMesa) {
      nombre = elNombreDeLaSiguiente(nombres);
      nombres.push(nombre);
    }
    return { que: cosa.que, nombre, plazas, caja, giro: cosa.giro ?? 0, texto: cosa.texto ?? null };
  });
}
