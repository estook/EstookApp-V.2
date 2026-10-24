import {
  LO_MAS_PEQUENO,
  PASO_DEL_IMAN,
  alIman,
  dentroDelPlano,
  elGiroConIman,
  lasGuias,
  type Caja,
  type Guia,
} from '@estook/dominio';

/**
 * **Mover, estirar y girar con el dedo** en el editor de la sala (T2, Anexo 11.9): de los
 * píxeles de la pantalla a las unidades del plano (1000 × 1000, que se pinta 16:10), con
 * el imán y las guías. Sin pantalla, para poder probarlo sin un navegador.
 */

export interface Lienzo {
  /** Lo que mide el plano en la pantalla, en píxeles. */
  readonly ancho: number;
  readonly alto: number;
}

export interface Colocacion extends Caja {
  readonly giro: number;
}

/** Píxeles a unidades del plano, en cada eje. */
export function aUnidades(lienzo: Lienzo, dx: number, dy: number): { du: number; dv: number } {
  return { du: (dx * 1000) / lienzo.ancho, dv: (dy * 1000) / lienzo.alto };
}

/**
 * **Mover**: lo arrastrado se pega a la rejilla y, si es una sola cosa, a las guías de las
 * demás. Nunca se sale del plano.
 */
export function moverHasta(
  lienzo: Lienzo,
  desde: Colocacion,
  dx: number,
  dy: number,
  lasDemas: readonly Caja[] | null,
): { readonly caja: Colocacion; readonly guias: readonly Guia[] } {
  const { du, dv } = aUnidades(lienzo, dx, dy);
  const dondeVa = { ...desde, x: desde.x + du, y: desde.y + dv };
  if (lasDemas === null) {
    return {
      caja: {
        ...desde,
        ...dentroDelPlano({ ...dondeVa, x: alIman(dondeVa.x), y: alIman(dondeVa.y) }),
      },
      guias: [],
    };
  }
  // Primero las guías, donde está el dedo; el imán, solo en el eje que no tiene guía.
  const guiado = lasGuias(dondeVa, lasDemas);
  const conGuiaEnX = guiado.guias.some((g) => g.eje === 'x');
  const conGuiaEnY = guiado.guias.some((g) => g.eje === 'y');
  const dentro = dentroDelPlano({
    ...dondeVa,
    x: conGuiaEnX ? guiado.x : alIman(dondeVa.x),
    y: conGuiaEnY ? guiado.y : alIman(dondeVa.y),
  });
  return { caja: { ...desde, ...dentro }, guias: guiado.guias };
}

export type Esquina = 'no' | 'ne' | 'so' | 'se';

/**
 * **Estirar desde una esquina**: la de enfrente se queda quieta. Con la cosa girada, el
 * dedo se lee en sus propios ejes, para que tirar «hacia fuera» la agrande siempre.
 */
export function estirarHasta(
  lienzo: Lienzo,
  desde: Colocacion,
  esquina: Esquina,
  dx: number,
  dy: number,
): Colocacion {
  const radianes = (-desde.giro * Math.PI) / 180;
  const ldx = dx * Math.cos(radianes) - dy * Math.sin(radianes);
  const ldy = dx * Math.sin(radianes) + dy * Math.cos(radianes);
  const { du, dv } = aUnidades(lienzo, ldx, ldy);
  const derecha = esquina === 'ne' || esquina === 'se';
  const abajo = esquina === 'so' || esquina === 'se';
  let { x, y, ancho, fondo } = desde;
  if (derecha) ancho = alIman(desde.ancho + du);
  else {
    ancho = alIman(desde.ancho - du);
    x = desde.x + desde.ancho - Math.max(ancho, LO_MAS_PEQUENO);
  }
  if (abajo) fondo = alIman(desde.fondo + dv);
  else {
    fondo = alIman(desde.fondo - dv);
    y = desde.y + desde.fondo - Math.max(fondo, LO_MAS_PEQUENO);
  }
  return {
    ...desde,
    ...dentroDelPlano({
      x,
      y,
      ancho: Math.max(ancho, LO_MAS_PEQUENO),
      fondo: Math.max(fondo, LO_MAS_PEQUENO),
    }),
  };
}

/**
 * **Girar con el asa de arriba**: el ángulo del dedo alrededor del centro, que se queda
 * solo en 0°, 45° y 90° si pasa cerca.
 */
export function girarHasta(
  lienzo: Lienzo,
  desde: Colocacion,
  /** Dónde está el dedo, en píxeles dentro del plano. */
  px: number,
  py: number,
): Colocacion {
  const cx = ((desde.x + desde.ancho / 2) * lienzo.ancho) / 1000;
  const cy = ((desde.y + desde.fondo / 2) * lienzo.alto) / 1000;
  const grados = (Math.atan2(py - cy, px - cx) * 180) / Math.PI + 90;
  return { ...desde, giro: elGiroConIman(grados) };
}

/** Lo de al lado, para duplicar: a la derecha si cabe; si no, debajo. */
export function alLado(caja: Caja): { x: number; y: number } {
  const hueco = PASO_DEL_IMAN * 2;
  if (caja.x + caja.ancho * 2 + hueco <= 1000) return { x: caja.x + caja.ancho + hueco, y: caja.y };
  const abajo = dentroDelPlano({ ...caja, y: caja.y + caja.fondo + hueco });
  return { x: abajo.x, y: abajo.y };
}

/** Lo que ocupan juntas varias cosas elegidas: para moverlas a la vez sin salirse. */
export function moverVariasHasta(
  lienzo: Lienzo,
  desde: readonly Colocacion[],
  dx: number,
  dy: number,
): readonly Colocacion[] {
  const { du, dv } = aUnidades(lienzo, dx, dy);
  // Que ninguna se salga: se limita el paso al que deja dentro a todas.
  const minX = Math.min(...desde.map((c) => c.x));
  const minY = Math.min(...desde.map((c) => c.y));
  const maxX = Math.max(...desde.map((c) => c.x + c.ancho));
  const maxY = Math.max(...desde.map((c) => c.y + c.fondo));
  const pasoX = Math.min(Math.max(alIman(du), -minX), 1000 - maxX);
  const pasoY = Math.min(Math.max(alIman(dv), -minY), 1000 - maxY);
  return desde.map((c) => ({ ...c, x: c.x + pasoX, y: c.y + pasoY }));
}
