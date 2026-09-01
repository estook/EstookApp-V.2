import { clases } from '../clases.ts';

/**
 * La marca · el logo y Fogón.
 *
 * ── De dónde salen las imágenes ──────────────────────────────────────────────
 *
 * De `public/marca/` de cada aplicación, no de un `import`. Es a propósito:
 * empaquetadas irían dentro del JavaScript inicial y contarían para el
 * presupuesto de B7, cuando lo que son es **dos sellos que se pintan después de
 * que la pantalla ya esté**. Como imagen suelta, el navegador las pide en
 * paralelo y no retrasan nada.
 *
 * Las reparte `herramientas/reducir-marca.mjs`, que además las deja al tamaño en
 * el que se ven: el logo pasa de 468 KB a 23, y Fogón de 1,2 MB a 13. Es el mismo
 * dibujo con menos píxeles, no una versión distinta.
 *
 * ── Y por qué son PNG ────────────────────────────────────────────────────────
 *
 * Porque son los originales que hay. El logotipo lleva una tipografía propia y
 * Fogón es una ilustración: ninguno de los dos se puede vectorizar a ojo sin
 * cambiar la marca. Cuando aparezcan los vectoriales se sustituyen aquí y ya
 * está. Está contado en `packages/ui/marca/LEEME.md`.
 */
const BASE = (import.meta as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? '/';

export const IMAGENES_DE_MARCA = {
  logo: `${BASE}marca/estook-logo.png`,
  fogon: `${BASE}marca/fogon.png`,
  simbolo: `${BASE}marca/favicon.svg`,
} as const;

export interface LogoProps {
  /** El alto en píxeles. El ancho lo pone la proporción. */
  readonly alto?: number;
  readonly className?: string;
}

export function Logo({ alto = 26, className }: LogoProps) {
  return (
    <img
      src={IMAGENES_DE_MARCA.logo}
      // El nombre y el claim ya están en la imagen; para quien no la ve, aquí.
      alt="Estook · tu cocina, bajo control"
      height={alto}
      style={{ height: alto }}
      className={clases('w-auto', className)}
      // La marca está arriba del todo: se pide con prioridad y sin esperar a que
      // aparezca en pantalla, porque ya lo está.
      loading="eager"
      decoding="async"
      draggable={false}
    />
  );
}

export interface IconoDeFogonProps {
  readonly size?: number;
  /** Qué dice, para quien no lo ve. Sin esto es decoración. */
  readonly titulo?: string;
}

/**
 * El símbolo de Fogón.
 *
 * No es un icono de Lucide: es la mascota, y tiene su propio dibujo. B3 asigna a
 * Fogón el icono `flame` para **los sectores y las listas**, donde todo va con el
 * mismo trazo; aquí, en la cabecera, va la mascota, que es lo que la hace
 * reconocible.
 */
export function IconoDeFogon({ size = 22, titulo }: IconoDeFogonProps) {
  return (
    <img
      src={IMAGENES_DE_MARCA.fogon}
      width={size}
      height={size}
      style={{ width: size, height: size }}
      className="rounded-chico"
      decoding="async"
      draggable={false}
      {...(titulo === undefined ? { alt: '', 'aria-hidden': true } : { alt: titulo })}
    />
  );
}
