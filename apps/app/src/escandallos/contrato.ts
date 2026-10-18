import { enPuntos, type Alergeno, type CanalDeVenta, type UnidadDeUso } from '@estook/dominio';
import { sinAcentos } from '@estook/ui';

/**
 * Lo que devuelve el servidor de Escandallos (M9 · 2, decisión 0087): las mismas formas
 * que `servidor/aplicacion/consultas/escandallos.ts`.
 *
 * Los campos de dinero son **opcionales a propósito**: a quien no tiene
 * `dato.coste_de_plato` el servidor no los manda, y la pantalla pinta lo que llega.
 */

export type Semaforo = 'verde' | 'ambar' | 'rojo' | 'sin_dato';

export interface PlatoEnLaLista {
  readonly id: string;
  readonly nombre: string;
  readonly seccionId: string | null;
  readonly miniatura: string | null;
  /** Si tiene su escandallo: lo que lleva (0087 lo llamaba «ficha»). */
  readonly tieneFicha: boolean;
  /** Si tiene su ficha técnica, los pasos (0090). Una API de antes no lo manda. */
  readonly tieneFichaTecnica?: boolean;
  readonly pasos?: number;
  readonly vinculadoA: string | null;
  readonly alergenos: readonly Alergeno[];
  readonly picante: number;
  readonly coste?: {
    readonly costeCentimos: number | null;
    readonly faltanPrecios: number;
    readonly foodCost: number | null;
    readonly semaforo: Semaforo;
    readonly pierdeEn: readonly string[];
    /** Sin escandallo: precio sin IVA × tu objetivo, **aproximado** (0095). */
    readonly costeAproxCentimos?: number | null;
  };
}

export interface ElaboracionEnLaLista {
  readonly id: string;
  readonly nombre: string;
  readonly rinde: string;
  readonly ingredientes: number;
  readonly usadaEn: number;
  readonly activo: boolean;
  readonly alergenos: readonly Alergeno[];
  readonly costePorUnidad?: string | null;
}

export interface MisFichas {
  readonly puedeEditar: boolean;
  readonly conImportes: boolean;
  readonly objetivo?: number | null;
  readonly secciones: readonly { readonly id: string; readonly nombre: string }[];
  readonly platos: readonly PlatoEnLaLista[];
  readonly elaboraciones: readonly ElaboracionEnLaLista[];
  readonly cifras: {
    readonly platos: number;
    readonly sinFicha: number;
    readonly conFichaTecnica?: number;
    readonly bajoObjetivo?: number;
    readonly pierden?: number;
    readonly foodCostMedio?: number | null;
  };
}

export interface LineaDeLaFicha {
  readonly id: string;
  readonly tipo: 'producto' | 'elaboracion';
  readonly refId: string;
  readonly nombre: string;
  readonly cantidad: number;
  readonly unidad: UnidadDeUso;
  readonly suUnidad: UnidadDeUso;
  readonly nota: string | null;
  readonly alergenos: readonly Alergeno[];
  readonly costeCentimos?: number | null;
  readonly parte?: number | null;
  readonly costePorUnidad?: string | null;
}

export interface LineaGuardada {
  readonly tipo: 'producto' | 'elaboracion';
  readonly id: string;
  readonly nombre: string;
  readonly cantidad: number;
  readonly unidad: UnidadDeUso;
  readonly nota: string | null;
}

export interface CambioDeLaReceta {
  readonly id: string;
  readonly version: number;
  readonly cuando: string;
  readonly quien: string | null;
  readonly cambios: readonly string[];
  readonly receta: {
    readonly nombre: string;
    readonly rinde: { readonly cantidad: number; readonly unidad: UnidadDeUso } | null;
    readonly lineas: readonly LineaGuardada[];
    readonly pasos: readonly string[];
    readonly notas: string | null;
    readonly minutos: number | null;
  };
}

export interface MargenDeLaFicha {
  readonly canal: CanalDeVenta;
  readonly nombre: string;
  readonly precioCentimos: number | null;
  readonly igualQueSala: boolean;
  readonly seLlevaCentimos: number;
  readonly margenCentimos: number | null;
  readonly margenPuntos: number | null;
  readonly pierde: boolean;
}

export interface EscandalloDeLaFicha {
  readonly costeCentimos: number | null;
  readonly faltanPrecios: number;
  readonly precioCentimos: number | null;
  readonly precioSinIvaCentimos: number | null;
  readonly iva: number | null;
  readonly foodCost: number | null;
  readonly objetivo: number | null;
  readonly semaforo: Semaforo;
  readonly precioRecomendadoCentimos: number | null;
  readonly canales: readonly MargenDeLaFicha[];
}

export interface UnaFicha {
  readonly tipo: 'plato' | 'elaboracion';
  readonly id: string;
  readonly nombre: string;
  readonly activo: boolean;
  readonly foto: string | null;
  readonly miniatura: string | null;
  readonly seccion: string | null;
  readonly descripcion: string | null;
  readonly rinde: { readonly cantidad: number; readonly unidad: UnidadDeUso } | null;
  readonly usadaEn: readonly {
    readonly tipo: 'plato' | 'elaboracion';
    readonly id: string;
    readonly nombre: string;
  }[];
  readonly unidadesPorRacion: number | null;
  readonly picante: number;
  readonly distintivos: readonly string[];
  readonly vinculadoA: string | null;
  readonly receta: {
    readonly version: number;
    readonly lineas: readonly LineaDeLaFicha[];
    readonly pasos: readonly string[];
    /** La foto de cada paso, firmada, o nula (0090). Una API de antes no la manda. */
    readonly fotosDeLosPasos?: readonly (string | null)[];
    readonly notas: string | null;
    readonly minutos: number | null;
    /** Para cuántas raciones está escrita (una tanda, 0092). Una API de antes no lo manda. */
    readonly raciones?: number;
  };
  readonly alergenos: readonly Alergeno[];
  readonly alergenosDeLaCarta: readonly Alergeno[];
  readonly puedeEditar: boolean;
  readonly puedeAbrirLaCarta: boolean;
  readonly escandallo?: EscandalloDeLaFicha;
  readonly historial: readonly CambioDeLaReceta[];
}

export interface LoQuePuedeLlevar {
  readonly productos: readonly {
    readonly id: string;
    readonly nombre: string;
    readonly unidad: UnidadDeUso;
    readonly categoria: string | null;
    readonly alergenos: readonly string[];
  }[];
  readonly elaboraciones: readonly {
    readonly id: string;
    readonly nombre: string;
    readonly unidad: UnidadDeUso;
  }[];
}

/** Lo que se abre: un plato o una elaboración, en la dirección (`?ficha=plato.<id>`). */
export interface QueFicha {
  readonly tipo: 'plato' | 'elaboracion';
  readonly id: string;
}

export function comoSeAbre(ficha: QueFicha): string {
  return `${ficha.tipo}.${ficha.id}`;
}

export function queFichaEs(abierta: string | null): QueFicha | null {
  if (abierta === null) return null;
  const [tipo, id] = abierta.split('.');
  if ((tipo !== 'plato' && tipo !== 'elaboracion') || id === undefined || id === '') return null;
  return { tipo, id };
}

/** El tono de una etiqueta según el semáforo del food cost. */
export function tonoDelSemaforo(semaforo: Semaforo): 'bien' | 'atencion' | 'mal' | 'neutro' {
  if (semaforo === 'verde') return 'bien';
  if (semaforo === 'ambar') return 'atencion';
  if (semaforo === 'rojo') return 'mal';
  return 'neutro';
}

/** «28,4 %», y «28 %» si es entero: como el semáforo de los objetivos. */
export function comoPorcentaje(puntos: number): string {
  return enPuntos(puntos);
}

/** «1,5» o «1.5» → 1,5. Nulo si no es un número mayor que cero. */
export function leerCantidad(texto: string): number | null {
  const limpio = texto.trim().replace(',', '.');
  if (limpio === '' || !/^\d*\.?\d+$/.test(limpio)) return null;
  const numero = Number(limpio);
  return Number.isFinite(numero) && numero > 0 ? numero : null;
}

/**
 * Lo del Almacén que se puede vender tal cual (repaso del 16-oct, A · decisión 0087):
 * **todo**. Lo que va por unidades (la lata, la botella) es una unidad; lo que va en
 * gramos o mililitros (el entrecot, la dorada entera, el helado) pide cuánto lleva la
 * ración. Hasta la lección 190 solo salían las unidades, y en el Almacén de verdad casi
 * nada se lleva así: Richi no encontraba lo suyo.
 */
export function losDelAlmacen(lo: LoQuePuedeLlevar | undefined, buscado: string) {
  const texto = sinAcentos(buscado.trim().toLocaleLowerCase('es'));
  return (lo?.productos ?? []).filter(
    (p) => texto === '' || sinAcentos(p.nombre.toLocaleLowerCase('es')).includes(texto),
  );
}

export const NOMBRE_DE_LA_UNIDAD: Readonly<Record<UnidadDeUso, string>> = {
  g: 'gramos',
  kg: 'kilos',
  ml: 'mililitros',
  l: 'litros',
  ud: 'unidades',
};

/** Lo que se escribe de la ración de un producto que no va por unidades. */
export interface RacionQueSeEscribe {
  readonly cantidad: string;
  readonly unidad: UnidadDeUso;
}

/** Lo que viaja al vincular: nada si va por unidades; si no, la ración leída, o `null` si falta. */
export function laRacionQueViaja(
  unidadDelProducto: UnidadDeUso,
  racion: RacionQueSeEscribe,
): { readonly cantidad: number; readonly unidad: UnidadDeUso } | null | 'por_unidades' {
  if (unidadDelProducto === 'ud') return 'por_unidades';
  const cantidad = leerCantidad(racion.cantidad);
  return cantidad === null ? null : { cantidad, unidad: racion.unidad };
}

const CUANDO = new Intl.DateTimeFormat('es-ES', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

export function comoSeLeeElCuando(iso: string): string {
  return CUANDO.format(new Date(iso));
}

/** Las recetas de Estook (catálogo de referencia), para empezar desde una (M9 · 3, 0092). */
export interface RecetasDeReferencia {
  readonly recetas: readonly {
    readonly id: string;
    readonly nombre: string;
    readonly raciones: number;
    readonly lineas: readonly {
      readonly producto: string;
      readonly cantidad: number;
      readonly unidad: UnidadDeUso;
    }[];
  }[];
}

/** Qué ha cambiado en el coste de cada plato (M9 · 3, 0092 · 1B). */
export interface QueHaCambiado {
  readonly dias: number;
  readonly desde: string;
  readonly objetivo: number | null;
  readonly platos: readonly {
    readonly id: string;
    readonly nombre: string;
    readonly antesCentimos: number;
    readonly ahoraCentimos: number;
    readonly diferenciaCentimos: number;
    readonly foodCostAntes: number | null;
    readonly foodCostAhora: number | null;
    readonly porQue: { readonly nombre: string; readonly centimos: number } | null;
    readonly cambioLaReceta: boolean;
    readonly cruza: readonly { readonly que: 'objetivo' | 'canal'; readonly texto: string }[];
  }[];
}
