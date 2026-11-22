import {
  aCentimos,
  convertir,
  enLaUnidadDelProducto,
  parteDelCoste,
  type ElaboracionDelEscandallo,
  type LineaDelEscandallo,
  type UnidadDelProducto,
} from './escandallo.ts';
import { sinElIva } from './lo-que-se-vende.ts';
import type { UnidadDeUso } from './referencia.ts';

/**
 * **Lo que resta del almacén un plato vendido** (M20 · 1, decisión 0149).
 *
 * Al cobrar una mesa en Estook TPV, cada plato resta lo que lleva su escandallo, sin que nadie
 * apunte nada. Aquí, sin base ni red, está la cuenta entera; el servidor solo lee, pregunta y apunta
 * (regla 6). Lo que entra en la cuenta:
 *
 *   · **La receta del plato**, de una ración o de una tanda (0092): vender una ración de un puchero
 *     escrito para 25 resta la veinticincoava parte.
 *   · **Lo de dentro de una elaboración**, por lo que rinde: 50 g de una salsa que rinde 2 l restan
 *     la cuarentava parte de lo que lleva.
 *   · **El aprovechamiento** (0099): la receta pide gramos limpios y la cámara guarda kilos en bruto.
 *     280 g de atún limpio, con un 70 % aprovechable, son 400 g que salen de la cámara.
 *   · **Lo elegido al pedirlo** (T3 · 2): «sin cebolla» no resta la cebolla de la receta; el «¿Con
 *     qué?» de la copa resta la tónica; cambiar el pan por uno sin gluten hace las dos cosas.
 *   · **Lo vendido a peso**: el escandallo de un plato a peso es el de un kilo, porque su precio es el
 *     del kilo; 150 g de jamón restan 0,15 de su receta.
 *
 * **Un plato sin escandallo no resta nada** y se dice (0095): cuenta en dinero, y en Escandallos sale
 * para crearlo. **Lo que no se puede pasar a la unidad del producto** (300 g de algo que se cuenta por
 * cajas sin decir cuánto trae) tampoco: se resta lo que se sabe y se cuenta lo que falta.
 */

/** Lo que hace falta de un producto para restarlo: su unidad y lo que se aprovecha de él. */
export interface ProductoQueBaja extends UnidadDelProducto {
  readonly id: string;
  /** Lo aprovechable, de 0 a 1 (0,7 es un 70 %). Fuera de rango, se toma entero. */
  readonly rendimiento: number;
}

export interface LibroQueBaja {
  readonly productos: ReadonlyMap<string, ProductoQueBaja>;
  readonly elaboraciones: ReadonlyMap<string, ElaboracionDelEscandallo>;
}

/** Lo que una opción elegida al pedir añade o quita (congelado en la línea al pedirlo). */
export interface OpcionQueBaja {
  readonly anade: {
    readonly productoId: string;
    readonly cantidad: number;
    readonly unidad: UnidadDeUso;
  } | null;
  readonly quita: string | null;
}

export interface PlatoCobrado {
  /** Las unidades de la línea de la cuenta: «2 croquetas». */
  readonly cantidad: number;
  /** Su escandallo hoy. Nulo, o sin líneas: no tiene. */
  readonly receta: {
    readonly lineas: readonly LineaDelEscandallo[];
    /** Para cuántas raciones está escrita: 1, o una tanda. */
    readonly raciones: number | null;
  } | null;
  readonly aPeso: boolean;
  /** Lo que pesó, si se vende a peso. */
  readonly pesoGramos: number | null;
  readonly opciones: readonly OpcionQueBaja[];
}

export interface LoQueBaja {
  /** Cuánto sale de cada producto, en su unidad de uso, en positivo y con cuatro decimales. */
  readonly porProducto: ReadonlyMap<string, number>;
  /** Ingredientes que no se han podido restar: un producto o una elaboración que ya no está, o una unidad que no se convierte. */
  readonly faltan: number;
  /** No tiene escandallo: cuenta en dinero y no resta lo suyo (lo de sus opciones, sí). */
  readonly sinEscandallo: boolean;
}

/** Como el libro: cuatro decimales, que es lo que guarda `movimiento_de_stock.cantidad`. */
export function aCuatroDecimales(n: number): number {
  return Number(n.toFixed(4));
}

const PROFUNDIDAD_MAXIMA = 12;

function loAprovechable(producto: ProductoQueBaja): number {
  const r = producto.rendimiento;
  return Number.isFinite(r) && r > 0 && r <= 1 ? r : 1;
}

/** Lo que resta un plato vendido, con todo lo de arriba. */
export function loQueBajaUnPlato(plato: PlatoCobrado, libro: LibroQueBaja): LoQueBaja {
  const porProducto = new Map<string, number>();
  let faltan = 0;

  const sumar = (productoId: string, cuanto: number) => {
    porProducto.set(productoId, (porProducto.get(productoId) ?? 0) + cuanto);
  };

  /** Un producto en una cantidad de receta (limpia), a lo que sale de la cámara (en bruto). */
  const unProducto = (productoId: string, cantidad: number, unidad: UnidadDeUso, veces: number) => {
    const producto = libro.productos.get(productoId);
    const enSuUnidad =
      producto === undefined ? null : enLaUnidadDelProducto(cantidad, unidad, producto);
    if (producto === undefined || enSuUnidad === null) {
      faltan += 1;
      return;
    }
    sumar(productoId, (enSuUnidad * veces) / loAprovechable(producto));
  };

  const bajar = (
    lineas: readonly LineaDelEscandallo[],
    veces: number,
    camino: readonly string[],
  ) => {
    for (const linea of lineas) {
      if (linea.productoId !== null) {
        unProducto(linea.productoId, linea.cantidad, linea.unidad, veces);
        continue;
      }
      const id = linea.elaboracionId ?? '';
      const elaboracion = libro.elaboraciones.get(id);
      if (elaboracion === undefined || camino.includes(id) || camino.length >= PROFUNDIDAD_MAXIMA) {
        faltan += 1;
        continue;
      }
      const cuanto = convertir(linea.cantidad, linea.unidad, elaboracion.rindeUnidad);
      if (cuanto === null || !(elaboracion.rindeCantidad > 0)) {
        faltan += 1;
        continue;
      }
      bajar(elaboracion.lineas, (veces * cuanto) / elaboracion.rindeCantidad, [...camino, id]);
    }
  };

  const unidades = Math.max(plato.cantidad, 0);
  const lineas = plato.receta?.lineas ?? [];
  const sinEscandallo = lineas.length === 0;

  if (!sinEscandallo) {
    // «Sin cebolla»: la cebolla de la receta del plato no sale. Solo la de la receta del plato:
    // lo que va dentro de una salsa ya está hecho cuando se pide.
    const quitados = new Set(plato.opciones.flatMap((o) => (o.quita === null ? [] : [o.quita])));
    const lasQueQuedan = lineas.filter((l) => l.productoId === null || !quitados.has(l.productoId));
    const delPeso =
      plato.aPeso && plato.pesoGramos !== null && plato.pesoGramos > 0
        ? plato.pesoGramos / 1000
        : 1;
    const raciones = Math.max(plato.receta?.raciones ?? 1, 1);
    bajar(lasQueQuedan, (unidades * delPeso) / raciones, []);
  }

  // Lo que añade una opción, una vez por cada unidad pedida: dos copas, dos tónicas.
  for (const opcion of plato.opciones) {
    if (opcion.anade === null) continue;
    unProducto(opcion.anade.productoId, opcion.anade.cantidad, opcion.anade.unidad, unidades);
  }

  const redondeado = new Map<string, number>();
  for (const [id, cuanto] of porProducto) {
    const r = aCuatroDecimales(cuanto);
    if (r > 0) redondeado.set(id, r);
  }
  return { porProducto: redondeado, faltan, sinEscandallo };
}

/**
 * **Lo que vuelve de una devolución por «Se cobró de más»** (0149): de lo que restó cada plato, la
 * parte devuelta. Dos de tres cañas devueltas son dos tercios de lo que restaron las tres.
 */
export function loQueVuelve(restado: number, devueltas: number, dePlatos: number): number {
  if (!(dePlatos > 0) || !(devueltas > 0)) return 0;
  return aCuatroDecimales(restado * Math.min(devueltas / dePlatos, 1));
}

/** El motivo de devolución con el que el género vuelve al almacén: el único que no llegó a salir. */
export const VUELVE_AL_ALMACEN_CON = 'de_mas' as const;

// ═══ Lo vendido, plato a plato (Negocio › Ventas › Por producto) ═══════════════════

/** Un plato cobrado, como lo guardó `linea_bajada`. */
export interface LineaCobrada {
  readonly lineaId: string;
  readonly platoId: string | null;
  readonly menuId: string | null;
  /** La línea del menú, si es un plato elegido dentro de un menú. */
  readonly menuDe: string | null;
  readonly nombre: string;
  readonly seccion: string | null;
  readonly cantidad: number;
  /** Lo cobrado, con IVA, en céntimos. */
  readonly importeCentimos: number;
  readonly estado: 'bajada' | 'sin_escandallo' | 'sin_plato';
  /** Lo que costó lo que salió, en milésimas de céntimo. Nulo si no se sabe. */
  readonly costeMilesimas: number | null;
}

export interface ProductoVendido {
  /** El plato, `menu:<id>` o `libre:<nombre>`. */
  readonly id: string;
  readonly nombre: string;
  readonly seccion: string | null;
  readonly uds: number;
  /** Sin IVA, en céntimos. */
  readonly ventas: number;
  /** Lo que costó lo que salió, en céntimos. Nulo si falta algo (sin escandallo, sin precio). */
  readonly coste: number | null;
  /** El coste sobre lo vendido sin IVA, con un decimal. */
  readonly foodCost: number | null;
  readonly sinEscandallo: boolean;
}

export interface LoVendidoPorProducto {
  readonly productos: readonly ProductoVendido[];
  /** La suma de las ventas de cada fila: la tabla suma exactamente esto. */
  readonly ventas: number;
  /** La suma del coste de las filas que lo saben. */
  readonly coste: number;
  /** Lo vendido de esas mismas filas: el food cost se calcula solo con ellas. */
  readonly ventasConCoste: number;
  readonly foodCost: number | null;
  /** Platos (distintos) vendidos sin escandallo. */
  readonly sinEscandallo: number;
}

/**
 * El coste sobre lo vendido, en puntos y con un decimal: 29,0 %. Es la misma cuenta que «la carne es
 * el 62 %» de Escandallos (`parteDelCoste`): un solo sitio redondea.
 */
export function elFoodCost(coste: number, ventas: number): number | null {
  return parteDelCoste(coste, ventas);
}

/**
 * **Lo cobrado, junto por plato** (0149). Un menú es una fila, con lo que cuestan los platos que se
 * eligieron dentro y lo que cobraron de suplemento; el plato de dentro no sale aparte (ya lo cuenta su
 * menú). Lo que no se sabe lo que costó —sin escandallo, sin precio, un artículo libre— va sin coste y
 * no entra en el food cost: **no se da un coste falso** (Plan, M9).
 *
 * Las ventas de cada fila se pasan a sin IVA una vez, sobre su total, y el total es **la suma de las
 * filas**: la tabla y su total cuadran al céntimo.
 */
export function loVendidoPorProducto(
  lineas: readonly LineaCobrada[],
  iva: number | null,
): LoVendidoPorProducto {
  const deLaLinea = new Map(lineas.map((l) => [l.lineaId, l]));
  const clave = (l: LineaCobrada): string => {
    if (l.menuDe !== null) {
      const menu = deLaLinea.get(l.menuDe);
      if (menu !== undefined && menu.menuDe === null) return clave(menu);
    }
    if (l.platoId !== null) return l.platoId;
    if (l.menuId !== null) return `menu:${l.menuId}`;
    return `libre:${l.nombre}`;
  };
  const juntos = new Map<
    string,
    {
      nombre: string;
      seccion: string | null;
      uds: number;
      conIva: number;
      milesimas: number;
      completo: boolean;
      sinEscandallo: boolean;
    }
  >();
  for (const l of lineas) {
    const id = clave(l);
    const fila = juntos.get(id) ?? {
      nombre: l.nombre,
      seccion: l.menuId !== null && l.platoId === null ? 'Menús' : l.seccion,
      uds: 0,
      conIva: 0,
      milesimas: 0,
      completo: true,
      sinEscandallo: false,
    };
    const dentroDeOtro = l.menuDe !== null && id !== (l.platoId ?? '');
    if (!dentroDeOtro) {
      fila.uds += l.cantidad;
      // La fila se llama como su línea principal, y va en su sección, no en la de un plato de dentro.
      if (l.menuDe === null) {
        fila.nombre = l.nombre;
        fila.seccion = l.menuId !== null && l.platoId === null ? 'Menús' : l.seccion;
      }
    }
    fila.conIva += l.importeCentimos;
    if (l.estado === 'bajada') {
      if (l.costeMilesimas === null) fila.completo = false;
      else fila.milesimas += l.costeMilesimas;
    } else if (l.estado === 'sin_escandallo') {
      fila.completo = false;
      fila.sinEscandallo = true;
    } else if (l.menuId === null) {
      // Un artículo libre: no se sabe qué lleva.
      fila.completo = false;
    }
    juntos.set(id, fila);
  }

  const productos: ProductoVendido[] = [...juntos.entries()].map(([id, f]) => {
    const ventas = sinElIva(f.conIva, iva);
    const coste = f.completo ? Number(aCentimos(f.milesimas)) : null;
    return {
      id,
      nombre: f.nombre,
      seccion: f.seccion,
      uds: f.uds,
      ventas,
      coste,
      foodCost: coste === null ? null : elFoodCost(coste, ventas),
      sinEscandallo: f.sinEscandallo,
    };
  });
  productos.sort(
    (a, b) => b.ventas - a.ventas || b.uds - a.uds || a.nombre.localeCompare(b.nombre),
  );

  const conCoste = productos.filter((p) => p.coste !== null);
  const coste = conCoste.reduce((s, p) => s + (p.coste ?? 0), 0);
  const ventasConCoste = conCoste.reduce((s, p) => s + p.ventas, 0);
  return {
    productos,
    ventas: productos.reduce((s, p) => s + p.ventas, 0),
    coste,
    ventasConCoste,
    foodCost: elFoodCost(coste, ventasConCoste),
    sinEscandallo: productos.filter((p) => p.sinEscandallo).length,
  };
}
