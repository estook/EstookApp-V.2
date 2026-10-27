import type { PapelCompuesto } from '@estook/dominio';

/**
 * **El puente entre Estook TPV y la caja para Windows** (T5 · 1, decisión 0119).
 *
 * Dentro del programa, la web es la de siempre y no toca nada del sistema. El programa le deja
 * **solo esto**, con nombre, en `window.estookCaja`: saber que está dentro, decirle de qué caja
 * es para que imprima su cola, buscar impresoras en la red del local, imprimir una prueba en
 * una que aún no está dada de alta, y arrancar con Windows. Nada más pasa por aquí: lo demás va
 * por la API, como en cualquier aparato.
 */

/** Una impresora que contestó en la red del local. */
export interface ImpresoraEncontrada {
  /** «192.168.1.50:9100»: la guarda la API para la caja, y la pantalla no la enseña. */
  readonly direccion: string;
  /** Lo que dijo de sí misma, si lo dijo («Epson TM-T20III»). */
  readonly modelo: string | null;
  /** Si ya está dada de alta en el local (la caja lo sabe por su cola). */
  readonly yaDadaDeAlta: string | null;
}

export interface LoQueNecesitaLaCaja {
  /** La dirección de la API, la misma que usa la web. */
  readonly api: string;
  readonly llave: string;
  /** Para oír el toque al segundo (Supabase Realtime), con la clave pública. */
  readonly supabase: { readonly direccion: string; readonly clavePublica: string };
}

export interface ComoSalio {
  readonly salio: boolean;
  /** En cristiano: «No responde», «Sin papel». */
  readonly porque: string | null;
}

export interface ComoVaLaCaja {
  /** Si está recogiendo su cola. */
  readonly conectada: boolean;
  /** Lo que le falta por mandar a sus impresoras. */
  readonly porSalir: number;
  /** Si el PC va por cable al router (0119: el centro del local, por cable). */
  readonly porCable: boolean | null;
}

export interface PuenteDeLaCaja {
  /** La versión del programa, para Ajustes › Aparatos. */
  readonly version: string;
  /** Desde que se sabe la llave: el programa empieza a imprimir la cola de esta caja. */
  conectar(datos: LoQueNecesitaLaCaja): void;
  /** Al desvincular: deja de imprimir y olvida la llave. */
  desconectar(): void;
  buscarImpresoras(): Promise<readonly ImpresoraEncontrada[]>;
  /** Directo, sin pasar por la cola: para la que se está dando de alta. */
  imprimirDirecto(direccion: string, anchoMm: 58 | 80, papel: PapelCompuesto): Promise<ComoSalio>;
  comoVa(): Promise<ComoVaLaCaja>;
  arrancaConWindows(): Promise<boolean>;
  ponerArrancaConWindows(si: boolean): Promise<void>;
}

/** El nombre con el que el programa lo deja en la ventana. */
export const NOMBRE_DEL_PUENTE = 'estookCaja';

/** Lo que hay en la ventana, si está dentro de la caja para Windows. */
export function elPuenteDeLaCaja(ventana: unknown): PuenteDeLaCaja | null {
  if (typeof ventana !== 'object' || ventana === null) return null;
  const puente = (ventana as Record<string, unknown>)[NOMBRE_DEL_PUENTE];
  if (typeof puente !== 'object' || puente === null) return null;
  const p = puente as Partial<PuenteDeLaCaja>;
  return typeof p.conectar === 'function' && typeof p.buscarImpresoras === 'function'
    ? (puente as PuenteDeLaCaja)
    : null;
}

/**
 * **Dónde se descarga** (0119): las publicaciones del repositorio mientras sea público; con la
 * mudanza, del alojamiento nuevo. El nombre del instalador no cambia de una versión a otra.
 */
export const DONDE_SE_DESCARGA =
  'https://github.com/estook/EstookApp-V.2/releases/latest/download/Estook-TPV-caja-para-Windows.exe';
