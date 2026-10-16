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
  readonly tieneFicha: boolean;
  readonly vinculadoA: string | null;
  readonly alergenos: readonly Alergeno[];
  readonly picante: number;
  readonly coste?: {
    readonly costeCentimos: number | null;
    readonly faltanPrecios: number;
    readonly foodCost: number | null;
    readonly semaforo: Semaforo;
    readonly pierdeEn: readonly string[];
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
    readonly notas: string | null;
    readonly minutos: number | null;
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
 * Lo que se vende por unidades tal como se guarda: el chuletón, la lata, la botella
 * (repaso del 16-oct, A · decisión 0087). **Solo lo que va en unidades**: lo que llega
 * entero y se corta (el lomo de 20 kg) se desgrana con sus gramos.
 */
export function losQueSeVendenTalCual(lo: LoQuePuedeLlevar | undefined, buscado: string) {
  const texto = sinAcentos(buscado.trim().toLocaleLowerCase('es'));
  return (lo?.productos ?? [])
    .filter((p) => p.unidad === 'ud')
    .filter((p) => texto === '' || sinAcentos(p.nombre.toLocaleLowerCase('es')).includes(texto));
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
