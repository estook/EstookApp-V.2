import { centimos } from './dinero.ts';
import { sinIva } from './iva.ts';
import { diaDeLaSemana, masDias, type FechaOperativa } from './tiempo.ts';

/**
 * Los menús (M10 · 2, decisiones 0103 y 0104).
 *
 * El menú del día a 13,50 €: un primero a elegir, un segundo, bebida, pan y postre o
 * café. Aquí viven las tres reglas que no dependen de la base:
 *
 *   · **Qué vale un día** que nadie ha tocado: lo del último día montado antes (A1,
 *     «un día que no tocas repite el anterior»). Así no se copia nada cada noche.
 *   · **La semana** que se enseña: los días que se sirve el menú, de lunes en adelante.
 *   · **Lo que deja**, sin IVA (0101): en el peor caso —cada cliente elige lo que más
 *     cuesta— y en el mejor, con el plato que lo hunde. Sin ventas no hay «lo normal»:
 *     eso, con Estook TPV.
 */

/** Las secciones con las que nace el menú del día (0103): Primeros, Segundos y Bebida, y el postre apagado. */
export const SECCIONES_DEL_MENU_DEL_DIA = [
  { nombre: 'Primeros', esPostre: false, incluida: true },
  { nombre: 'Segundos', esPostre: false, incluida: true },
  { nombre: 'Postre', esPostre: true, incluida: false },
  { nombre: 'Bebida', esPostre: false, incluida: true },
] as const;

/** De lunes a viernes: los días de fábrica del menú del día. */
export const DIAS_DEL_MENU_DEL_DIA: readonly number[] = [1, 2, 3, 4, 5];

/** «L», «M», «X»… del 1 (lunes) al 7 (domingo), como se escriben en una pizarra. */
export const INICIAL_DEL_DIA: Readonly<Record<number, string>> = {
  1: 'L',
  2: 'M',
  3: 'X',
  4: 'J',
  5: 'V',
  6: 'S',
  7: 'D',
};

/** «lunes», «martes»… del 1 al 7. */
export const NOMBRE_DEL_DIA: Readonly<Record<number, string>> = {
  1: 'lunes',
  2: 'martes',
  3: 'miércoles',
  4: 'jueves',
  5: 'viernes',
  6: 'sábado',
  7: 'domingo',
};

/**
 * El día montado que vale para una fecha: el último montado hasta ella, incluida. Nulo
 * si todavía no se ha montado ninguno antes.
 */
export function elDiaQueVale(
  montados: readonly FechaOperativa[],
  fecha: FechaOperativa,
): FechaOperativa | null {
  let vale: FechaOperativa | null = null;
  for (const dia of montados) {
    if (dia <= fecha && (vale === null || dia > vale)) vale = dia;
  }
  return vale;
}

/** Los días de la semana que empieza ese lunes en los que se sirve el menú, en orden. */
export function losDiasQueSeSirve(lunes: FechaOperativa, dias: readonly number[]): FechaOperativa[] {
  const sirve = new Set(dias);
  return [0, 1, 2, 3, 4, 5, 6]
    .map((d) => masDias(lunes, d))
    .filter((fecha) => sirve.has(diaDeLaSemana(fecha)));
}

// ── Lo que deja ──────────────────────────────────────────────────────────────

export interface OpcionDelMenu {
  readonly nombre: string;
  /** Lo que cuesta una ración, en milésimas de céntimo. Nulo si no tiene escandallo. */
  readonly costeMilesimas: number | null;
  /** Lo que se cobra de más por elegirlo, con IVA. */
  readonly suplementoCentimos: number;
}

export interface SeccionParaLaCuenta {
  readonly nombre: string;
  readonly esPostre: boolean;
  readonly incluida: boolean;
  readonly opciones: readonly OpcionDelMenu[];
}

/** El pan o el café: entra, y lo que cuesta una ración si se ha dicho su producto. */
export interface LoQueEntraSinPlato {
  readonly entra: boolean;
  /** Nulo: no se ha elegido su producto, o no tiene precio. Cuenta 0 y se dice. */
  readonly costeMilesimas: number | null;
}

export interface MenuParaLaCuenta {
  /** Con IVA, el de la pizarra. */
  readonly precioCentimos: number | null;
  /** El tipo de la restauración del local (10 %); nulo donde no se sabe. */
  readonly iva: number | null;
  readonly pan: LoQueEntraSinPlato;
  readonly cafe: LoQueEntraSinPlato;
  readonly secciones: readonly SeccionParaLaCuenta[];
}

export interface UnCaso {
  /** Lo que queda para el local: lo cobrado sin IVA menos lo que cuesta. */
  readonly dejaCentimos: number;
  readonly costeCentimos: number;
  /** Lo que cuesta frente a lo cobrado sin IVA, de 0 a 1. */
  readonly foodCost: number;
  /** Lo que eligió el cliente en cada sección, en orden. */
  readonly elige: readonly string[];
}

export type LoQueDejaElMenu =
  | { readonly estado: 'sin_precio' }
  | { readonly estado: 'sin_platos' }
  /** Hay platos sin escandallo: sin su coste, la cuenta mentiría. */
  | { readonly estado: 'faltan_costes'; readonly faltan: readonly string[] }
  | {
      readonly estado: 'listo';
      readonly peor: UnCaso;
      readonly mejor: UnCaso;
      /** El plato que más cuesta en el peor caso, si hay alguno que lo haga distinto del mejor. */
      readonly loHunde: string | null;
      /** El pan o el café que cuentan 0 € porque no se ha dicho su producto. */
      readonly sinCoste: readonly ('pan' | 'cafe')[];
    };

/** El nombre del café cuando va como opción del postre. */
export const CAFE_COMO_OPCION = 'Café';

/**
 * Las opciones de cada sección que cuenta: las incluidas, con algo dentro. Con café y
 * postre, **«Postre o café»**: el café es una opción más del postre. Con café y sin
 * postre, el café va siempre, aparte.
 */
function lasSeccionesQueCuentan(menu: MenuParaLaCuenta): {
  secciones: SeccionParaLaCuenta[];
  cafeAparte: boolean;
} {
  const conPlatos = menu.secciones.filter((s) => s.incluida && s.opciones.length > 0);
  const postre = conPlatos.find((s) => s.esPostre);
  if (!menu.cafe.entra) return { secciones: conPlatos, cafeAparte: false };
  if (postre === undefined) return { secciones: conPlatos, cafeAparte: true };
  const cafe: OpcionDelMenu = {
    nombre: CAFE_COMO_OPCION,
    costeMilesimas: menu.cafe.costeMilesimas ?? 0,
    suplementoCentimos: 0,
  };
  return {
    secciones: conPlatos.map((s) => (s === postre ? { ...s, opciones: [...s.opciones, cafe] } : s)),
    cafeAparte: false,
  };
}

/** Lo que una opción le quita al menú: su coste, menos lo que trae de suplemento sin IVA. */
function loQueResta(opcion: OpcionDelMenu, iva: number): number {
  const suplemento = sinIva(centimos(opcion.suplementoCentimos), iva) * 1000;
  return (opcion.costeMilesimas ?? 0) - suplemento;
}

function elCaso(
  elegidas: readonly OpcionDelMenu[],
  fijoMilesimas: number,
  precioSinIva: number,
  iva: number,
): UnCaso {
  const costeMilesimas = fijoMilesimas + elegidas.reduce((s, o) => s + (o.costeMilesimas ?? 0), 0);
  const cobrado =
    precioSinIva + elegidas.reduce((s, o) => s + sinIva(centimos(o.suplementoCentimos), iva), 0);
  const costeCentimos = Math.round(costeMilesimas / 1000);
  return {
    dejaCentimos: cobrado - costeCentimos,
    costeCentimos,
    foodCost: cobrado > 0 ? costeCentimos / cobrado : 0,
    elige: elegidas.map((o) => o.nombre),
  };
}

/**
 * Lo que deja el menú en el peor caso (cada cliente elige lo que más le resta) y en el
 * mejor. **Con un plato sin escandallo no se calcula**: se dice cuál falta (plantilla,
 * 21: con datos a medias no se juzga).
 */
export function loQueDejaElMenu(menu: MenuParaLaCuenta): LoQueDejaElMenu {
  if (menu.precioCentimos === null || menu.precioCentimos <= 0 || menu.iva === null) {
    return { estado: 'sin_precio' };
  }
  const { secciones, cafeAparte } = lasSeccionesQueCuentan(menu);
  if (secciones.length === 0) return { estado: 'sin_platos' };

  const faltan = [
    ...new Set(
      secciones.flatMap((s) =>
        s.opciones.filter((o) => o.costeMilesimas === null).map((o) => o.nombre),
      ),
    ),
  ];
  if (faltan.length > 0) return { estado: 'faltan_costes', faltan };

  const iva = menu.iva;
  const sinCoste: ('pan' | 'cafe')[] = [];
  let fijo = 0;
  if (menu.pan.entra) {
    if (menu.pan.costeMilesimas === null) sinCoste.push('pan');
    fijo += menu.pan.costeMilesimas ?? 0;
  }
  if (menu.cafe.entra && menu.cafe.costeMilesimas === null) sinCoste.push('cafe');
  if (cafeAparte) fijo += menu.cafe.costeMilesimas ?? 0;

  const peores = secciones.map((s) =>
    s.opciones.reduce((a, b) => (loQueResta(b, iva) > loQueResta(a, iva) ? b : a)),
  );
  const mejores = secciones.map((s) =>
    s.opciones.reduce((a, b) => (loQueResta(b, iva) < loQueResta(a, iva) ? b : a)),
  );
  const precioSinIva = sinIva(centimos(menu.precioCentimos), iva);

  // El que lo hunde: de lo que cambia del mejor al peor caso, lo que más resta de más.
  let loHunde: string | null = null;
  let mayor = 0;
  peores.forEach((peor, i) => {
    const mejor = mejores[i];
    if (mejor === undefined || peor === mejor) return;
    const diferencia = loQueResta(peor, iva) - loQueResta(mejor, iva);
    if (diferencia > mayor) {
      mayor = diferencia;
      loHunde = peor.nombre;
    }
  });

  return {
    estado: 'listo',
    peor: elCaso(peores, fijo, precioSinIva, iva),
    mejor: elCaso(mejores, fijo, precioSinIva, iva),
    loHunde,
    sinCoste,
  };
}

/** Lo que cuesta una ración de pan o de café: el coste de su unidad entre las raciones que da. */
export function costePorRacion(costeDeLaUnidadMilesimas: number | null, raciones: number | null): number | null {
  if (costeDeLaUnidadMilesimas === null || raciones === null || raciones <= 0) return null;
  return Math.round(costeDeLaUnidadMilesimas / raciones);
}

/**
 * Cómo se llama la sección del postre en la pizarra: «Postre o café» si entra el café,
 * y su nombre si no.
 */
export function comoSeLlamaLaSeccion(nombre: string, esPostre: boolean, entraCafe: boolean): string {
  return esPostre && entraCafe ? `${nombre} o café` : nombre;
}
