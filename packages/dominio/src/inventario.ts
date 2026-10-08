import { DIAS_DE_COBERTURA_OBJETIVO } from './almacen.ts';
import { MARGEN_DE_SEGURIDAD } from './compras.ts';
import { cantidad } from './coste.ts';
import { conUnidad, plural } from './textos.ts';
import { diasEntre, type FechaOperativa } from './tiempo.ts';

/**
 * M8 · contar el almacén (decisión 0078, primera entrega).
 *
 * Las cuentas del inventario viven aquí y en ningún otro sitio, por la regla de
 * siempre: lo que toca contar, de qué lote sale lo que sale y cuánto es el mínimo
 * son tres cuentas que leen la pantalla, la API y el reloj de los lunes, y si cada
 * uno las hiciera a su manera, «Toca contar» y el aviso del lunes dirían cosas
 * distintas.
 */

// ── Contar a menudo lo que vale mucho ────────────────────────────────────────

/**
 * Lo que se cuenta cada semana: los productos que suman el 80 % del valor de lo que
 * se gasta. El resto, una vez al mes (Manifiesto 12, inventario cíclico).
 *
 * Es la regla de los inventarios de verdad (el «ABC»): unos pocos productos son casi
 * todo el dinero, y son los que se escapan. Contar la cámara entera cada semana no lo
 * hace nadie; contar una vez al mes deja ver tarde lo que falta.
 */
export const PARTE_DEL_VALOR_QUE_SE_CUENTA_CADA_SEMANA = 0.8;
export const DIAS_PARA_VOLVER_A_CONTAR_LO_CARO = 7;
export const DIAS_PARA_VOLVER_A_CONTAR_LO_DEMAS = 30;

export interface ProductoQueSeCuenta {
  readonly id: string;
  /**
   * Lo que pesa en el dinero: lo que se ha gastado de él en las últimas cuatro
   * semanas, valorado, y si no se ha gastado nada, lo que vale lo que hay. En
   * cualquier unidad, siempre la misma para todos: solo se comparan entre sí.
   */
  readonly peso: number;
  /** La última vez que se contó, cerrado. Nulo: nunca. */
  readonly contadoEl: FechaOperativa | null;
}

export type PorQueTocaContar = 'lo_caro' | 'lo_demas';

export interface LoQueTocaContar {
  readonly id: string;
  readonly porque: PorQueTocaContar;
  readonly contadoEl: FechaOperativa | null;
}

/**
 * Lo que toca contar hoy: lo caro que lleva una semana sin contarse, y lo demás
 * que lleva un mes. Lo caro primero, y dentro de cada grupo, lo que más pesa.
 *
 * **Lo que nunca se ha contado, toca.** Un local que empieza tiene todo pendiente, y
 * es verdad: el primer inventario es el que más falta hace.
 */
export function queTocaContar(
  productos: readonly ProductoQueSeCuenta[],
  hoy: FechaOperativa,
): readonly LoQueTocaContar[] {
  const ordenados = [...productos].sort((a, b) => b.peso - a.peso || a.id.localeCompare(b.id));
  const total = ordenados.reduce((suma, p) => suma + Math.max(p.peso, 0), 0);

  // Los caros: los primeros hasta llegar al 80 % del peso. El que cruza la raya
  // entra: es el que la cruza porque pesa.
  const caros = new Set<string>();
  if (total > 0) {
    let llevo = 0;
    for (const producto of ordenados) {
      if (producto.peso <= 0 || llevo >= total * PARTE_DEL_VALOR_QUE_SE_CUENTA_CADA_SEMANA) break;
      caros.add(producto.id);
      llevo += producto.peso;
    }
  }

  const tocan: LoQueTocaContar[] = [];
  for (const producto of ordenados) {
    const esCaro = caros.has(producto.id);
    const cadaCuanto = esCaro
      ? DIAS_PARA_VOLVER_A_CONTAR_LO_CARO
      : DIAS_PARA_VOLVER_A_CONTAR_LO_DEMAS;
    const toca = producto.contadoEl === null || diasEntre(producto.contadoEl, hoy) >= cadaCuanto;
    if (toca) {
      tocan.push({
        id: producto.id,
        porque: esCaro ? 'lo_caro' : 'lo_demas',
        contadoEl: producto.contadoEl,
      });
    }
  }

  return [
    ...tocan.filter((t) => t.porque === 'lo_caro'),
    ...tocan.filter((t) => t.porque === 'lo_demas'),
  ];
}

/** «12 esta semana y 30 este mes», para «Toca contar» y el aviso del lunes. */
export function cuantoTocaContar(tocan: readonly LoQueTocaContar[]): string {
  const caros = tocan.filter((t) => t.porque === 'lo_caro').length;
  const demas = tocan.length - caros;
  if (tocan.length === 0) return 'Nada que contar: está todo al día.';
  const nunca = tocan.every((t) => t.contadoEl === null) ? 'Sin contar todavía: ' : '';
  if (demas === 0) return `${nunca}${plural(caros, 'producto', 'productos')} de los que más valen.`;
  if (caros === 0) return `${nunca}${plural(demas, 'producto', 'productos')}.`;
  return `${nunca}${plural(caros, 'producto', 'productos')} de los que más valen, y ${String(demas)} más.`;
}

// ── Contar como está en la estantería ────────────────────────────────────────

/**
 * Lo contado en cajas y sueltas, en la unidad de uso: «2 cajas de 6 y 3 sueltas»
 * son 15 ud. Nulo si no hay nada escrito en ninguna de las dos.
 *
 * Es lo que hacen los programas de inventario serios (2A): se cuenta como está en la
 * estantería, y la cuenta la hace el programa.
 */
export function loContadoEnUnidades(
  formatos: number | null,
  sueltas: number | null,
  factor: number,
): number | null {
  if (formatos === null && sueltas === null) return null;
  const porCaja = factor > 0 ? factor : 1;
  return Number(((formatos ?? 0) * porCaja + (sueltas ?? 0)).toFixed(4));
}

/**
 * La diferencia de un producto contado: lo que hay menos lo que decía el libro **al
 * contarlo**. Es lo que se apunta al cerrar, encima de lo que haya entonces: así lo
 * que entró o salió entre contar y cerrar sigue contando (2A). Nulo si cuadraba.
 */
export function diferenciaDeLoContado(hay: number, decia: number): number | null {
  const diferencia = Number((hay - decia).toFixed(4));
  return diferencia === 0 ? null : diferencia;
}

// ── Los lotes se gastan solos: primero el que antes caduca ───────────────────

export interface LoteQueSeGasta {
  readonly id: string;
  readonly queda: number;
  readonly caducaEl: FechaOperativa | null;
  readonly recibidoEl: FechaOperativa;
  /** Lo congelado va después de lo fresco: está en otro sitio y aguanta más. */
  readonly congeladoEl: FechaOperativa | null;
}

export interface GastoDeUnLote {
  readonly loteId: string;
  readonly cuanto: number;
  /** Si con esto se acaba: entonces se retira solo y deja de avisar. */
  readonly loAcaba: boolean;
}

/**
 * De qué lotes sale lo que sale, por FEFO: «primero lo que antes caduca» (Auditoría,
 * hallazgo 2). Lo fresco antes que lo congelado; dentro de cada uno, por caducidad
 * —lo que no la tiene, al final— y a igual fecha, lo que llegó antes.
 *
 * **Lo que sale de más no se inventa un lote**: si los lotes suman menos de lo que
 * sale, se gastan enteros y el resto sale del género sin lote.
 */
export function repartirPorFefo(
  lotes: readonly LoteQueSeGasta[],
  cuanto: number,
): readonly GastoDeUnLote[] {
  if (cuanto <= 0) return [];
  const ordenados = [...lotes]
    .filter((l) => l.queda > 0)
    .sort(
      (a, b) =>
        Number(a.congeladoEl !== null) - Number(b.congeladoEl !== null) ||
        (a.caducaEl ?? '9999-12-31').localeCompare(b.caducaEl ?? '9999-12-31') ||
        a.recibidoEl.localeCompare(b.recibidoEl) ||
        a.id.localeCompare(b.id),
    );

  const gastos: GastoDeUnLote[] = [];
  let falta = cuanto;
  for (const lote of ordenados) {
    if (falta <= 0) break;
    const sale = Math.min(lote.queda, falta);
    const deVerdad = Number(sale.toFixed(4));
    if (deVerdad <= 0) continue;
    gastos.push({
      loteId: lote.id,
      cuanto: deVerdad,
      loAcaba: Number((lote.queda - sale).toFixed(4)) <= 0,
    });
    falta = Number((falta - sale).toFixed(4));
  }
  return gastos;
}

// ── El mínimo, calculado ─────────────────────────────────────────────────────

/**
 * El mayor hueco entre dos repartos seguidos, en días: con reparto martes y viernes,
 * del viernes al martes van cuatro. Nulo sin días de reparto.
 */
export function mayorHuecoEntreRepartos(dias: readonly number[]): number | null {
  const ordenados = [...new Set(dias.filter((d) => d >= 1 && d <= 7))].sort((a, b) => a - b);
  if (ordenados.length === 0) return null;
  if (ordenados.length === 1) return 7;
  let mayor = 0;
  for (let i = 0; i < ordenados.length; i++) {
    const este = ordenados[i] ?? 0;
    const siguiente =
      i === ordenados.length - 1 ? (ordenados[0] ?? 0) + 7 : (ordenados[i + 1] ?? 0);
    mayor = Math.max(mayor, siguiente - este);
  }
  return mayor;
}

export interface MinimoCalculado {
  readonly minimo: number;
  readonly porque: string;
}

/** Redondeado hacia arriba, a lo que se cuenta de verdad: unidades enteras, kilos con dos decimales. */
function haciaArriba(valor: number, unidad: string): number {
  const paso = unidad === 'ud' || unidad === 'g' || unidad === 'ml' ? 1 : 0.01;
  return Number((Math.ceil(Number((valor / paso).toFixed(6))) * paso).toFixed(4));
}

/**
 * El mínimo que propone Estook (3A): lo que se gasta al día × el mayor hueco entre dos
 * repartos de su proveedor, **+ 20 %** (Manifiesto 12). Sin días de reparto, para
 * cinco días, como el pedido sugerido. Nulo si todavía no se sabe a qué ritmo se gasta.
 */
export function minimoCalculado(
  consumoPorDia: number | null,
  diasDeReparto: readonly number[] | null,
  unidad: string,
): MinimoCalculado | null {
  if (consumoPorDia === null || consumoPorDia <= 0) return null;
  const hueco = mayorHuecoEntreRepartos(diasDeReparto ?? []);
  const dias = hueco ?? DIAS_DE_COBERTURA_OBJETIVO;
  const minimo = haciaArriba(consumoPorDia * dias * (1 + MARGEN_DE_SEGURIDAD), unidad);
  const gasto = conUnidad(cantidad(Number(consumoPorDia.toFixed(3))), unidad);
  return {
    minimo,
    porque:
      hueco === null
        ? `Gastas ${gasto} al día: para unos ${String(dias)} días, con un 20 % de margen. Con los días de reparto del proveedor lo calcularía hasta su siguiente reparto.`
        : `Gastas ${gasto} al día y entre dos repartos pueden pasar ${plural(dias, 'día', 'días')}: con un 20 % de margen.`,
  };
}

/**
 * Si vale la pena proponerlo: no hay mínimo, o el calculado se separa más de un 10 %
 * del que hay. Proponer 14,4 donde hay 14 es ruido.
 */
export function valeLaPenaProponer(actual: number | null, calculado: number): boolean {
  if (actual === null) return true;
  const mayor = Math.max(Math.abs(actual), Math.abs(calculado));
  if (mayor === 0) return false;
  return Math.abs(calculado - actual) / mayor > 0.1;
}

// ── Lo que se dice de un inventario ──────────────────────────────────────────

export const ESTADOS_DEL_INVENTARIO = ['contado', 'cerrado', 'descartado'] as const;
export type EstadoDelInventario = (typeof ESTADOS_DEL_INVENTARIO)[number];

export const NOMBRE_DEL_ESTADO_DEL_INVENTARIO: Readonly<Record<EstadoDelInventario, string>> = {
  contado: 'Por cerrar',
  cerrado: 'Cerrado',
  descartado: 'Descartado',
};
