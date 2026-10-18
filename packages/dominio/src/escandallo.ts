import { centimos, type Centimos } from './dinero.ts';
import { sinIva } from './iva.ts';
import { comisionDe, type CanalDeVenta } from './canales.ts';
import { comoVaFrenteAlObjetivo, type Semaforo } from './objetivos.ts';
import { cuadra } from './desviacion.ts';
import type { UnidadDeUso } from './referencia.ts';
import { parecido, sinAcentos } from './parecido.ts';

/**
 * El escandallo (M9 · 2, decisiones 0086 y 0087).
 *
 * **Nada escrito a mano** (Plan, M9): de la receta y del Almacén sale lo que cuesta
 * cada línea, cada elaboración y cada plato, y de ahí el food cost, el precio
 * recomendado y **lo que deja en cada canal**. Es cálculo puro: lo usan la API y las
 * pruebas, y da lo mismo en los dos sitios (regla 6).
 *
 * ── Las unidades ─────────────────────────────────────────────────────────────
 *
 * La receta se escribe como se cocina —280 g de lomo— y el producto puede llevarse en
 * kilos. Se convierte dentro de su familia (gramos y kilos; mililitros y litros;
 * unidades) y **nunca entre familias**: 100 g de leche no son 100 ml, y adivinarlo
 * sería dar un coste falso.
 *
 * ── El dinero ────────────────────────────────────────────────────────────────
 *
 * El coste de una unidad de uso viene en **milésimas de céntimo** (`coste.ts`): 0,0039
 * €/g no cabe en céntimos. Aquí se suma en milésimas sin redondear y **se redondea una
 * sola vez, al final**, como manda el motor de coste.
 */

// ── Las unidades ─────────────────────────────────────────────────────────────

type Familia = 'masa' | 'volumen' | 'unidad';

const FAMILIA: Readonly<Record<UnidadDeUso, Familia>> = {
  g: 'masa',
  kg: 'masa',
  ml: 'volumen',
  l: 'volumen',
  ud: 'unidad',
};

const EN_LA_PEQUENA: Readonly<Record<UnidadDeUso, number>> = {
  g: 1,
  kg: 1000,
  ml: 1,
  l: 1000,
  ud: 1,
};

export function sonCompatibles(a: UnidadDeUso, b: UnidadDeUso): boolean {
  return FAMILIA[a] === FAMILIA[b];
}

/** Las unidades en que se puede escribir algo que se lleva en `unidad`: g y kg, ml y l, ud. */
export function unidadesQueSirven(unidad: UnidadDeUso): readonly UnidadDeUso[] {
  if (FAMILIA[unidad] === 'masa') return ['g', 'kg'];
  if (FAMILIA[unidad] === 'volumen') return ['ml', 'l'];
  return ['ud'];
}

/** La unidad en que se escribe de entrada: la pequeña (280 g, no 0,28 kg). */
export function unidadParaEscribir(unidad: UnidadDeUso): UnidadDeUso {
  return unidadesQueSirven(unidad)[0] ?? unidad;
}

/** De una unidad a otra de la misma familia. Entre familias, `null`. */
export function convertir(cantidad: number, de: UnidadDeUso, a: UnidadDeUso): number | null {
  if (!sonCompatibles(de, a)) return null;
  return (cantidad * EN_LA_PEQUENA[de]) / EN_LA_PEQUENA[a];
}

/** «280 g», «1,5 kg», «2 ud». Con coma y sin ceros de más. */
export function comoSeLeeLaCantidad(cantidad: number, unidad: UnidadDeUso): string {
  // De mil gramos o mililitros para arriba, en kilos o litros (Richi, 16-oct).
  const [valor, enQue] =
    (unidad === 'g' || unidad === 'ml') && cantidad >= 1000
      ? [cantidad / 1000, unidad === 'g' ? 'kg' : 'l']
      : [cantidad, unidad];
  const numero = Number(valor.toFixed(valor >= 100 ? 0 : valor >= 10 ? 1 : 2));
  return `${String(numero).replace('.', ',')} ${enQue}`;
}

// ── Lo que el motor necesita saber ───────────────────────────────────────────

export interface ProductoDelEscandallo {
  readonly id: string;
  readonly nombre: string;
  readonly unidad: UnidadDeUso;
  /**
   * Lo que cuesta una unidad de uso, **ya con su aprovechamiento**, en milésimas de
   * céntimo (el precio medio del Almacén, o el de hoy si entró sin coste). Nulo si
   * no tiene ningún precio.
   */
  readonly costeMilesimas: number | null;
  readonly alergenos: readonly string[];
}

export interface LineaDelEscandallo {
  readonly productoId: string | null;
  readonly elaboracionId: string | null;
  readonly cantidad: number;
  readonly unidad: UnidadDeUso;
}

export interface ElaboracionDelEscandallo {
  readonly id: string;
  readonly nombre: string;
  readonly rindeCantidad: number;
  readonly rindeUnidad: UnidadDeUso;
  readonly lineas: readonly LineaDelEscandallo[];
}

export interface LibroDeRecetas {
  readonly productos: ReadonlyMap<string, ProductoDelEscandallo>;
  readonly elaboraciones: ReadonlyMap<string, ElaboracionDelEscandallo>;
}

// ── Lo que cuesta ────────────────────────────────────────────────────────────

export interface CosteDeUnaLinea {
  /** En milésimas de céntimo, sin redondear. Nulo si falta algún precio por debajo. */
  readonly milesimas: number | null;
  /** Cuántos ingredientes sin precio hay en esta línea (los de dentro de una elaboración, también). */
  readonly faltan: number;
  /** La cantidad en la unidad del producto o de lo que rinde la elaboración. */
  readonly enSuUnidad: number | null;
}

export interface CosteDeUnaReceta {
  /** Sin redondear. Nulo si falta algún precio: **no se da un coste falso** (Plan, M9). */
  readonly milesimas: number | null;
  readonly faltanPrecios: number;
  readonly lineas: readonly CosteDeUnaLinea[];
}

const PROFUNDIDAD_MAXIMA = 12;

function costeDeLasLineas(
  lineas: readonly LineaDelEscandallo[],
  libro: LibroDeRecetas,
  camino: readonly string[],
): CosteDeUnaReceta {
  let total: number | null = 0;
  let faltan = 0;
  const deCadaUna: CosteDeUnaLinea[] = [];
  for (const linea of lineas) {
    const una = costeDeUnaLinea(linea, libro, camino);
    faltan += una.faltan;
    total = total === null || una.milesimas === null ? null : total + una.milesimas;
    deCadaUna.push(una);
  }
  return { milesimas: total, faltanPrecios: faltan, lineas: deCadaUna };
}

function costeDeUnaLinea(
  linea: LineaDelEscandallo,
  libro: LibroDeRecetas,
  camino: readonly string[],
): CosteDeUnaLinea {
  if (linea.productoId !== null) {
    const producto = libro.productos.get(linea.productoId);
    const enSuUnidad =
      producto === undefined ? null : convertir(linea.cantidad, linea.unidad, producto.unidad);
    if (producto === undefined || enSuUnidad === null || producto.costeMilesimas === null) {
      return { milesimas: null, faltan: 1, enSuUnidad };
    }
    return { milesimas: producto.costeMilesimas * enSuUnidad, faltan: 0, enSuUnidad };
  }
  const id = linea.elaboracionId ?? '';
  const porUnidad = costePorUnidadDeLaElaboracion(id, libro, camino);
  const elaboracion = libro.elaboraciones.get(id);
  const enSuUnidad =
    elaboracion === undefined
      ? null
      : convertir(linea.cantidad, linea.unidad, elaboracion.rindeUnidad);
  if (porUnidad.milesimas === null || enSuUnidad === null) {
    return { milesimas: null, faltan: Math.max(porUnidad.faltan, 1), enSuUnidad };
  }
  return { milesimas: porUnidad.milesimas * enSuUnidad, faltan: 0, enSuUnidad };
}

/** Lo que cuesta una receta entera (la de un plato es una ración). */
export function costeDeLaReceta(
  lineas: readonly LineaDelEscandallo[],
  libro: LibroDeRecetas,
): CosteDeUnaReceta {
  return costeDeLasLineas(lineas, libro, []);
}

/**
 * Lo que cuesta una unidad de lo que rinde una elaboración: si la salsa entera cuesta
 * 6 € y rinde 2 l, el litro sale a 3 €. Una que se llevara a sí misma por el camino
 * no tiene coste (no se deja guardar: `seLlevaASiMisma`).
 */
export function costePorUnidadDeLaElaboracion(
  id: string,
  libro: LibroDeRecetas,
  camino: readonly string[] = [],
): { readonly milesimas: number | null; readonly faltan: number } {
  const elaboracion = libro.elaboraciones.get(id);
  if (elaboracion === undefined || camino.includes(id) || camino.length >= PROFUNDIDAD_MAXIMA) {
    return { milesimas: null, faltan: 1 };
  }
  const receta = costeDeLasLineas(elaboracion.lineas, libro, [...camino, id]);
  if (receta.milesimas === null) return { milesimas: null, faltan: receta.faltanPrecios };
  return { milesimas: receta.milesimas / elaboracion.rindeCantidad, faltan: 0 };
}

/** De milésimas de céntimo a dinero: aquí, y solo aquí, se redondea. */
export function aCentimos(milesimas: number): Centimos {
  return centimos(Math.round(milesimas / 1000));
}

/** Lo que cuesta una unidad, en milésimas enteras: lo que pide `comoPrecioPorUnidad`. */
export function enMilesimasEnteras(milesimas: number): number {
  return Math.round(milesimas);
}

/** La media de unos porcentajes, con un decimal: el food cost de la carta. */
export function mediaEnPuntos(puntos: readonly number[]): number | null {
  if (puntos.length === 0) return null;
  return Math.round((puntos.reduce((a, b) => a + b, 0) / puntos.length) * 10) / 10;
}

/** La parte de cada línea en el coste, en puntos: «la carne es el 62 %». */
export function parteDelCoste(linea: number | null, total: number | null): number | null {
  if (linea === null || total === null || total <= 0) return null;
  return Math.round((linea / total) * 1000) / 10;
}

// ── Los alérgenos ────────────────────────────────────────────────────────────

/**
 * Los alérgenos de una receta: **la suma** de los de sus ingredientes, también los
 * que llegan dentro de una elaboración (Plan, M9).
 */
export function alergenosDeLaReceta(
  lineas: readonly LineaDelEscandallo[],
  libro: LibroDeRecetas,
  camino: readonly string[] = [],
): ReadonlySet<string> {
  const todos = new Set<string>();
  for (const linea of lineas) {
    if (linea.productoId !== null) {
      for (const a of libro.productos.get(linea.productoId)?.alergenos ?? []) todos.add(a);
      continue;
    }
    const id = linea.elaboracionId ?? '';
    const elaboracion = libro.elaboraciones.get(id);
    if (elaboracion === undefined || camino.includes(id) || camino.length >= PROFUNDIDAD_MAXIMA) {
      continue;
    }
    for (const a of alergenosDeLaReceta(elaboracion.lineas, libro, [...camino, id])) todos.add(a);
  }
  return todos;
}

// ── Que una elaboración no se lleve a sí misma ───────────────────────────────

/**
 * Si guardar estas líneas en la elaboración `id` haría que se llevara a sí misma,
 * directa o por el camino (la salsa lleva el fondo, y el fondo, la salsa). Plan, M9:
 * «elaboraciones anidables, sin que una pueda llevarse a sí misma».
 */
export function seLlevaASiMisma(
  id: string,
  lineas: readonly LineaDelEscandallo[],
  libro: LibroDeRecetas,
): boolean {
  const porVisitar = lineas.flatMap((l) => (l.elaboracionId === null ? [] : [l.elaboracionId]));
  const vistas = new Set<string>();
  while (porVisitar.length > 0) {
    const una = porVisitar.pop() as string;
    if (una === id) return true;
    if (vistas.has(una)) continue;
    vistas.add(una);
    for (const l of libro.elaboraciones.get(una)?.lineas ?? []) {
      if (l.elaboracionId !== null) porVisitar.push(l.elaboracionId);
    }
  }
  return false;
}

// ── Lo repetido se suma ──────────────────────────────────────────────────────

export interface LineaQueSeEscribe extends LineaDelEscandallo {
  readonly nota: string | null;
}

/**
 * «Si el mismo producto entra dos veces en una ficha, se suman y se avisa; no se
 * duplica la línea» (Plan, M9). Se suma en la unidad de la primera; si las dos no
 * se pueden sumar (gramos y unidades del mismo producto), se quedan las dos.
 */
export function juntarLoRepetido(lineas: readonly LineaQueSeEscribe[]): {
  readonly lineas: readonly LineaQueSeEscribe[];
  readonly sumadas: readonly string[];
} {
  const juntas: LineaQueSeEscribe[] = [];
  const sumadas: string[] = [];
  for (const linea of lineas) {
    const clave = linea.productoId ?? linea.elaboracionId;
    const indice = juntas.findIndex(
      (j) =>
        (j.productoId ?? j.elaboracionId) === clave &&
        (j.productoId === null) === (linea.productoId === null) &&
        sonCompatibles(j.unidad, linea.unidad),
    );
    const ya = indice >= 0 ? juntas[indice] : undefined;
    if (ya === undefined) {
      juntas.push(linea);
      continue;
    }
    const masCantidad = convertir(linea.cantidad, linea.unidad, ya.unidad) ?? 0;
    juntas[indice] = { ...ya, cantidad: Number((ya.cantidad + masCantidad).toFixed(4)) };
    if (clave !== null) sumadas.push(clave);
  }
  return { lineas: juntas, sumadas };
}

// ── El escandallo de un plato ────────────────────────────────────────────────

export interface CanalParaElMargen {
  readonly canal: CanalDeVenta;
  readonly nombre: string;
  /** Con IVA: el suyo, o el de sala si no tiene. */
  readonly precioCentimos: number | null;
  readonly igualQueSala: boolean;
  readonly comisionPorcentaje: number | null;
  readonly envaseCentimos: number | null;
}

export interface MargenEnUnCanal {
  readonly canal: CanalDeVenta;
  readonly nombre: string;
  readonly precioCentimos: number | null;
  readonly igualQueSala: boolean;
  /** Lo que se lleva la plataforma (comisión y envase), en céntimos. */
  readonly seLlevaCentimos: number;
  /** Precio sin IVA − comisión − envase − coste. Nulo sin precio o sin coste. */
  readonly margenCentimos: number | null;
  /** El margen sobre el precio sin IVA, en puntos. */
  readonly margenPuntos: number | null;
  readonly pierde: boolean;
}

export interface EscandalloDelPlato {
  readonly costeCentimos: number | null;
  readonly faltanPrecios: number;
  readonly precioSinIvaCentimos: number | null;
  /** Coste ÷ precio de sala sin IVA, en puntos (28,4 es el 28,4 %). */
  readonly foodCost: number | null;
  readonly semaforo: Semaforo;
  /** El que deja el food cost en el objetivo, con IVA, redondeado a 0,10 € hacia arriba. */
  readonly precioRecomendadoCentimos: number | null;
  readonly canales: readonly MargenEnUnCanal[];
}

/** Redondea hacia arriba a los diez céntimos: 12,43 € → 12,50 €. */
export function aDiezCentimosHaciaArriba(centimosExactos: number): number {
  return Math.ceil(Math.round(centimosExactos * 100) / 100 / 10) * 10;
}

export function escandalloDelPlato(datos: {
  readonly costeMilesimas: number | null;
  readonly faltanPrecios: number;
  readonly precioSalaCentimos: number | null;
  /** El tipo de IVA de la restauración del local (0,10), o nulo si no se sabe. */
  readonly iva: number | null;
  /** El objetivo de food cost del local, en fracción (0,30), o nulo. */
  readonly objetivo: number | null;
  readonly canales: readonly CanalParaElMargen[];
}): EscandalloDelPlato {
  const coste = datos.costeMilesimas === null ? null : aCentimos(datos.costeMilesimas);
  const sinElIva = (precio: number | null) =>
    precio === null || datos.iva === null ? null : sinIva(centimos(precio), datos.iva);

  const precioSinIva = sinElIva(datos.precioSalaCentimos);
  const foodCost =
    coste === null || precioSinIva === null || precioSinIva <= 0
      ? null
      : Math.round((coste / precioSinIva) * 1000) / 10;

  const precioRecomendado =
    coste === null || datos.objetivo === null || datos.objetivo <= 0 || datos.iva === null
      ? null
      : aDiezCentimosHaciaArriba((coste / datos.objetivo) * (1 + datos.iva));

  const canales = datos.canales.map((canal): MargenEnUnCanal => {
    const seLleva =
      canal.precioCentimos === null
        ? 0
        : comisionDe(canal.precioCentimos, canal.comisionPorcentaje) + (canal.envaseCentimos ?? 0);
    const base = sinElIva(canal.precioCentimos);
    const margen = base === null || coste === null ? null : base - seLleva - coste;
    return {
      canal: canal.canal,
      nombre: canal.nombre,
      precioCentimos: canal.precioCentimos,
      igualQueSala: canal.igualQueSala,
      seLlevaCentimos: seLleva,
      margenCentimos: margen,
      margenPuntos:
        margen === null || base === null || base <= 0
          ? null
          : Math.round((margen / base) * 1000) / 10,
      pierde: margen !== null && margen < 0,
    };
  });

  return {
    costeCentimos: coste,
    faltanPrecios: datos.faltanPrecios,
    precioSinIvaCentimos: precioSinIva,
    foodCost,
    semaforo: comoVaFrenteAlObjetivo('materia_prima', foodCost, datos.objetivo),
    precioRecomendadoCentimos: precioRecomendado,
    canales,
  };
}

// ── Qué cambió de una receta a otra ──────────────────────────────────────────

export interface LineaQueSeLee {
  readonly id: string;
  readonly nombre: string;
  readonly cantidad: number;
  readonly unidad: UnidadDeUso;
  readonly nota: string | null;
}

export interface RecetaQueSeLee {
  readonly nombre: string;
  readonly rinde: { readonly cantidad: number; readonly unidad: UnidadDeUso } | null;
  /**
   * De un plato: cuántas raciones salen tal como está escrita (una tanda, 0092). Vacío o
   * ausente es una ración: lo guardado antes de M9 · 3 no lo lleva.
   */
  readonly raciones?: number | null;
  readonly lineas: readonly LineaQueSeLee[];
  readonly pasos: readonly string[];
  readonly notas: string | null;
  readonly minutos: number | null;
}

/**
 * Lo que cambió, una línea por cosa: «Carne picada: 180 → 200 g», «Añadió Pepinillo
 * (20 g)». Es lo que dice el historial en vez de enseñar dos versiones (0086).
 */
export function queCambioEnLaReceta(antes: RecetaQueSeLee | null, ahora: RecetaQueSeLee): string[] {
  if (antes === null) {
    return ahora.lineas.length === 0 && ahora.pasos.length === 0
      ? ['La empezó']
      : [
          `La escribió: ${String(ahora.lineas.length)} ${ahora.lineas.length === 1 ? 'ingrediente' : 'ingredientes'}`,
        ];
  }
  const cambios: string[] = [];
  if (antes.nombre !== ahora.nombre) cambios.push(`Nombre: «${antes.nombre}» → «${ahora.nombre}»`);
  if (
    antes.rinde !== null &&
    ahora.rinde !== null &&
    (antes.rinde.cantidad !== ahora.rinde.cantidad || antes.rinde.unidad !== ahora.rinde.unidad)
  ) {
    cambios.push(
      `Rinde: ${comoSeLeeLaCantidad(antes.rinde.cantidad, antes.rinde.unidad)} → ${comoSeLeeLaCantidad(ahora.rinde.cantidad, ahora.rinde.unidad)}`,
    );
  }
  const racionesAntes = antes.raciones ?? 1;
  const racionesAhora = ahora.raciones ?? 1;
  if (racionesAntes !== racionesAhora) {
    cambios.push(
      `Para: ${comoSeLeenLasRaciones(racionesAntes)} → ${comoSeLeenLasRaciones(racionesAhora)}`,
    );
  }
  const deAntes = new Map(antes.lineas.map((l) => [l.id, l]));
  const deAhora = new Map(ahora.lineas.map((l) => [l.id, l]));
  for (const l of ahora.lineas) {
    const era = deAntes.get(l.id);
    if (era === undefined) {
      cambios.push(`Añadió ${l.nombre} (${comoSeLeeLaCantidad(l.cantidad, l.unidad)})`);
    } else if (era.cantidad !== l.cantidad || era.unidad !== l.unidad) {
      cambios.push(
        `${l.nombre}: ${comoSeLeeLaCantidad(era.cantidad, era.unidad)} → ${comoSeLeeLaCantidad(l.cantidad, l.unidad)}`,
      );
    }
  }
  for (const l of antes.lineas) {
    if (!deAhora.has(l.id)) cambios.push(`Quitó ${l.nombre}`);
  }
  if (antes.pasos.join('\n') !== ahora.pasos.join('\n')) cambios.push('Cambió los pasos');
  if ((antes.notas ?? '') !== (ahora.notas ?? '')) cambios.push('Cambió las notas');
  if (antes.minutos !== ahora.minutos) {
    cambios.push(
      `Tiempo: ${antes.minutos === null ? 'sin poner' : `${String(antes.minutos)} min`} → ${ahora.minutos === null ? 'sin poner' : `${String(ahora.minutos)} min`}`,
    );
  }
  return cambios;
}

// ── La desviación de los platos (se enseña con Estook TPV, 0086 · 3B) ─────────

export interface VendidoConSuReceta {
  /** Lo que llevaba **ese día** (Manifiesto 13: nunca se recalcula el pasado). */
  readonly lineas: readonly LineaDelEscandallo[];
  /** Las raciones vendidas. */
  readonly raciones: number;
  /**
   * Para cuántas raciones estaba escrita la receta ese día (una tanda, 0092). Sin ella,
   * una: vender una ración de un puchero escrito para 25 gasta la veinticincoava parte.
   */
  readonly racionesDeLaReceta?: number | null;
}

/**
 * Lo que se debía gastar de cada producto según lo vendido y su receta, en la unidad
 * del producto: 80 hamburguesas × 180 g son 14,4 kg de carne. Lo de dentro de una
 * elaboración se reparte por lo que rinde.
 */
export function loQueDebiaGastarse(
  vendidos: readonly VendidoConSuReceta[],
  libro: LibroDeRecetas,
): ReadonlyMap<string, number> {
  const debia = new Map<string, number>();
  const bajar = (
    lineas: readonly LineaDelEscandallo[],
    veces: number,
    camino: readonly string[],
  ) => {
    for (const linea of lineas) {
      if (linea.productoId !== null) {
        const producto = libro.productos.get(linea.productoId);
        const cuanto =
          producto === undefined ? null : convertir(linea.cantidad, linea.unidad, producto.unidad);
        if (cuanto === null) continue;
        debia.set(linea.productoId, (debia.get(linea.productoId) ?? 0) + cuanto * veces);
        continue;
      }
      const id = linea.elaboracionId ?? '';
      const elaboracion = libro.elaboraciones.get(id);
      if (elaboracion === undefined || camino.includes(id) || camino.length >= PROFUNDIDAD_MAXIMA) {
        continue;
      }
      const cuanto = convertir(linea.cantidad, linea.unidad, elaboracion.rindeUnidad);
      if (cuanto === null) continue;
      bajar(elaboracion.lineas, (veces * cuanto) / elaboracion.rindeCantidad, [...camino, id]);
    }
  };
  for (const vendido of vendidos) {
    bajar(vendido.lineas, vendido.raciones / Math.max(vendido.racionesDeLaReceta ?? 1, 1), []);
  }
  return new Map([...debia].map(([id, cuanto]) => [id, Number(cuanto.toFixed(4))]));
}

export interface DesviacionDeUnProducto {
  readonly productoId: string;
  /** Lo que se debía gastar según los platos vendidos. */
  readonly debia: number;
  readonly gastado: number;
  /** Gastado − lo que se debía − lo que se sabe por qué salió (mermas y otras salidas). */
  readonly desviacion: number;
  readonly cuadra: boolean;
}

/** La desviación producto a producto: lo gastado de verdad frente a lo que decían las fichas. */
export function desviacionDeLosPlatos(
  debia: ReadonlyMap<string, number>,
  gastados: readonly {
    readonly productoId: string;
    readonly gastado: number;
    /** Mermas y salidas que no son ventas: se sabe por qué salieron. */
    readonly explicado: number;
  }[],
): DesviacionDeUnProducto[] {
  return gastados
    .filter((g) => debia.has(g.productoId))
    .map((g) => {
      const loQueDebia = debia.get(g.productoId) ?? 0;
      const desviacion = Number((g.gastado - loQueDebia - g.explicado).toFixed(4));
      return {
        productoId: g.productoId,
        debia: loQueDebia,
        gastado: g.gastado,
        desviacion,
        cuadra: cuadra(desviacion, g.gastado),
      };
    });
}

/**
 * Si la desviación de los platos se enseña. **Todavía no** (0086, pregunta 3, B):
 * «hasta que no tengamos TPV no sabemos cuánta cantidad tiene cada plato». Con la caja
 * plato a plato de Estook TPV (M20) se enciende aquí, y la pantalla la enseña sola.
 */
export const DESVIACION_DE_LOS_PLATOS_A_LA_VISTA = false;

// ── M9 · 3 · la tanda y escalar (0092 y 0093) ─────────────────────────────────

/** «1 ración», «una tanda de 25 raciones». */
export function comoSeLeenLasRaciones(raciones: number): string {
  return raciones <= 1 ? '1 ración' : `una tanda de ${String(raciones)} raciones`;
}

/**
 * Lo que cuesta **una** ración de una receta escrita para `raciones` (una olla que sale
 * para 25): el escandallo dice siempre lo de una ración (0092). Sin precio, nulo.
 */
export function porRacion(
  milesimas: number | null,
  raciones: number | null | undefined,
): number | null {
  if (milesimas === null) return null;
  return milesimas / Math.max(raciones ?? 1, 1);
}

/**
 * Raciones para escribir o imprimir: enteras y nunca menos de una («PDF para 12»), o con
 * un decimal si vienen de escalar por un ingrediente («para 12,4»).
 */
export function racionesRedondeadas(raciones: number, decimales: 0 | 1 = 0): number {
  const veces = decimales === 1 ? 10 : 1;
  return Math.max(Math.round(raciones * veces) / veces, decimales === 1 ? 0.1 : 1);
}

/**
 * Cuánto se multiplica la receta para hacer `quiero` raciones, si está escrita para
 * `escrita`: para 40 croquetas de una receta de 40, 1; para 10, 0,25.
 */
export function factorParaRaciones(quiero: number, escrita: number | null | undefined): number {
  return quiero / Math.max(escrita ?? 1, 1);
}

/**
 * Cuánto se multiplica la receta para gastar `tengo` de un ingrediente que lleva
 * `lleva` (como meez: «tengo 3 kg de carrillera»). Nulo si las dos no son de la misma
 * familia o si no hay nada que repartir.
 */
export function factorParaUnIngrediente(
  lleva: { readonly cantidad: number; readonly unidad: UnidadDeUso },
  tengo: { readonly cantidad: number; readonly unidad: UnidadDeUso },
): number | null {
  const enLaSuya = convertir(tengo.cantidad, tengo.unidad, lleva.unidad);
  if (enLaSuya === null || lleva.cantidad <= 0 || enLaSuya <= 0) return null;
  return enLaSuya / lleva.cantidad;
}

/**
 * Una cantidad escalada, lista para leer: lo que va en unidades, **a la media unidad**
 * (7,5 huevos se entienden; 7,38 no), y lo demás como siempre, en kilos desde mil
 * gramos (`comoSeLeeLaCantidad`). El tiempo no se escala: no pasa por aquí.
 */
export function comoSeLeeEscalada(cantidad: number, unidad: UnidadDeUso, factor: number): string {
  const escalada = cantidad * factor;
  if (unidad === 'ud') {
    return comoSeLeeLaCantidad(Math.max(Math.round(escalada * 2) / 2, 0.5), unidad);
  }
  return comoSeLeeLaCantidad(escalada, unidad);
}

/**
 * El coste **aproximado** de un plato que todavía no tiene escandallo: su precio sin IVA
 * por tu objetivo de coste (0095). Un plato de 12 € (10,91 sin IVA) con objetivo del 30 %
 * «costará ~3,27 €». Se enseña marcado «aprox.» y **no entra en ningún cálculo**.
 */
export function costeAproximado(
  precioSinIvaCentimos: number | null,
  objetivo: number | null,
): Centimos | null {
  if (precioSinIvaCentimos === null || objetivo === null || objetivo <= 0) return null;
  return centimos(Math.round(precioSinIvaCentimos * objetivo));
}

// ── M9 · 3 · qué ha cambiado y la raya (0092, 1B) ────────────────────────────

/** Lo que cruza un plato de un día a otro: pasar del objetivo o perder dinero en un canal. */
export interface RayaQueCruza {
  readonly que: 'objetivo' | 'canal';
  /** El canal donde empieza a perder; nulo si es el objetivo. */
  readonly canal: CanalDeVenta | null;
}

/**
 * Las rayas que un plato **cruza hacia lo malo** entre dos escandallos: estaba dentro
 * del objetivo y ahora pasa de él; o en un canal no perdía y ahora pierde. Lo que ya
 * estaba mal no se repite, lo que no se sabía (sin precio) no cuenta, y volver a lo
 * bueno no va a la campana (0092): así sale una vez por plato y por raya.
 */
export function rayasQueCruza(
  antes: Pick<EscandalloDelPlato, 'foodCost' | 'canales'> | null,
  ahora: Pick<EscandalloDelPlato, 'foodCost' | 'canales'>,
  objetivo: number | null,
): RayaQueCruza[] {
  const rayas: RayaQueCruza[] = [];
  if (antes === null) return rayas;
  if (objetivo !== null && objetivo > 0) {
    const raya = objetivo * 100;
    if (
      antes.foodCost !== null &&
      antes.foodCost <= raya &&
      ahora.foodCost !== null &&
      ahora.foodCost > raya
    ) {
      rayas.push({ que: 'objetivo', canal: null });
    }
  }
  const perdia = new Set(antes.canales.filter((c) => c.pierde).map((c) => c.canal));
  const sabia = new Set(antes.canales.filter((c) => c.margenCentimos !== null).map((c) => c.canal));
  for (const c of ahora.canales) {
    if (c.pierde && sabia.has(c.canal) && !perdia.has(c.canal)) {
      rayas.push({ que: 'canal', canal: c.canal });
    }
  }
  return rayas;
}

/** Lo que movió el coste de una ración un ingrediente entre dos fechas, en milésimas. */
export interface LoQueMovioUnIngrediente {
  readonly id: string;
  readonly nombre: string;
  readonly milesimas: number;
}

/**
 * El ingrediente que más ha movido el coste de una ración **por su precio**: con la
 * receta de hoy, lo que cuesta cada línea hoy menos lo que costaba entonces. Si lo que
 * movió el coste fue la receta, no es ningún ingrediente: nulo, y lo dice quien llama.
 * Por debajo de un céntimo, nada.
 */
export function elQueMasLoMovio(
  lineas: readonly (LineaDelEscandallo & { readonly nombre: string })[],
  hoy: LibroDeRecetas,
  entonces: LibroDeRecetas,
  raciones: number | null | undefined,
): LoQueMovioUnIngrediente | null {
  let elMayor: LoQueMovioUnIngrediente | null = null;
  for (const linea of lineas) {
    const ahora = costeDeLaReceta([linea], hoy).milesimas;
    const antes = costeDeLaReceta([linea], entonces).milesimas;
    if (ahora === null || antes === null) continue;
    const movio = (ahora - antes) / Math.max(raciones ?? 1, 1);
    if (elMayor === null || Math.abs(movio) > Math.abs(elMayor.milesimas)) {
      elMayor = {
        id: linea.productoId ?? linea.elaboracionId ?? '',
        nombre: linea.nombre,
        milesimas: movio,
      };
    }
  }
  return elMayor !== null && Math.abs(elMayor.milesimas) >= 1000 ? elMayor : null;
}

// ── M9 · 3 · la receta de Estook (0092, 2B) ──────────────────────────────────

const PALABRAS_QUE_NO_DICEN_NADA: ReadonlySet<string> = new Set([
  'de',
  'del',
  'la',
  'el',
  'las',
  'los',
  'a',
  'al',
  'con',
  'y',
  'en',
]);

/** Las palabras que dicen algo de un nombre de plato: sin artículos y en singular. */
function lasPalabrasDelPlato(nombre: string): ReadonlySet<string> {
  return new Set(
    sinAcentos(nombre)
      .replace(/[^\p{L}\p{N}]+/gu, ' ')
      .trim()
      .split(' ')
      .filter((p) => p !== '' && !PALABRAS_QUE_NO_DICEN_NADA.has(p))
      .map((p) => (p.length > 3 && p.endsWith('s') ? p.slice(0, -1) : p)),
  );
}

/**
 * La receta de Estook que se llama como el plato: todas las palabras de uno están en el
 * otro. «Tortilla» o «Tortilla de patatas» → la tortilla de Estook; «Croquetas de
 * boletus» no es «Croquetas de jamón». Solo **se ofrece**: copiarla es cosa de quien
 * escribe (0092, 2B).
 */
export function laRecetaQueSeParece<T extends { readonly nombre: string }>(
  plato: string,
  recetas: readonly T[],
): T | null {
  const delPlato = lasPalabrasDelPlato(plato);
  if (delPlato.size === 0) return null;
  const todasEn = (a: ReadonlySet<string>, b: ReadonlySet<string>) => [...a].every((p) => b.has(p));
  for (const receta of recetas) {
    const deLaReceta = lasPalabrasDelPlato(receta.nombre);
    if (deLaReceta.size === 0) continue;
    if (todasEn(delPlato, deLaReceta) || todasEn(deLaReceta, delPlato)) return receta;
  }
  return null;
}

/**
 * El parecido mínimo para **proponer** un producto tuyo para un ingrediente de la receta
 * de Estook: el umbral con que el buscador de Estook encuentra con media palabra
 * (`estook.buscar`, 0,18 de pg_trgm).
 */
export const PARECIDO_PARA_PROPONER = 0.18;

/**
 * El producto tuyo que más se parece a un ingrediente de la receta de Estook, para
 * proponerlo: «Huevo» → «Huevos camperos». Lo confirma quien escribe. Por debajo del
 * umbral, ninguno: mejor preguntar que proponer mal.
 */
export function elProductoQueSeParece<T extends { readonly nombre: string }>(
  ingrediente: string,
  productos: readonly T[],
): T | null {
  let mejor: { producto: T; cuanto: number } | null = null;
  for (const producto of productos) {
    const cuanto = parecido(ingrediente, producto.nombre);
    if (mejor === null || cuanto > mejor.cuanto) mejor = { producto, cuanto };
  }
  return mejor !== null && mejor.cuanto >= PARECIDO_PARA_PROPONER ? mejor.producto : null;
}
