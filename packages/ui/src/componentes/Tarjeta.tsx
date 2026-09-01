import type { ReactNode } from 'react';
import { clases } from '../clases.ts';

/**
 * La tarjeta y la etiqueta · Parte B4 del Plan.
 *
 * La tarjeta es el contenedor de casi todo: un widget del Panel, una ficha, un
 * bloque de ajustes. Lleva su titulo, su accion de cabecera y, si hace falta, su
 * pie con el origen del dato.
 *
 * «Las cifras llevan su origen y su periodo» (E1). Por eso el pie no es
 * decorativo: es donde va «TPV · ayer» o «recuento del 3 de marzo». Una cifra sin
 * origen es una cifra en la que no se puede confiar.
 */
export interface TarjetaProps {
  readonly titulo?: string;
  /** El acento de la app, si la tarjeta es de una. Pinta la linea de arriba. */
  readonly acento?: string;
  /** A la derecha del titulo: un boton, un selector de periodo. */
  readonly accion?: ReactNode;
  /** Debajo del todo, en gris: de donde sale el dato y de cuando es. */
  readonly origen?: string;
  readonly children: ReactNode;
  /** Sin relleno, para una tabla o una lista que llega hasta el borde. */
  readonly pegado?: boolean;
}

export function Tarjeta({
  titulo,
  acento,
  accion,
  origen,
  children,
  pegado = false,
}: TarjetaProps) {
  return (
    <section
      className={clases(
        'relative overflow-hidden bg-superficie border border-borde rounded-grande shadow-s1',
      )}
    >
      {acento !== undefined && (
        // «El acento se usa con moderacion: [...] la linea superior de su
        // cabecera» (B3). Tres pixeles, y nada mas de color en toda la tarjeta.
        <div aria-hidden className="h-[3px] w-full" style={{ background: acento }} />
      )}

      {(titulo !== undefined || accion !== undefined) && (
        <header className="flex items-center justify-between gap-e3 px-e4 pt-e4 pb-e2">
          {titulo !== undefined && <h2 className="text-seccion font-semibold">{titulo}</h2>}
          {accion}
        </header>
      )}

      <div
        className={clases(pegado ? '' : 'px-e4 pb-e4', titulo === undefined && !pegado && 'pt-e4')}
      >
        {children}
      </div>

      {origen !== undefined && (
        <footer className="px-e4 pb-e3 pt-e1 text-etiqueta text-texto-suave uppercase tracking-wide">
          {origen}
        </footer>
      )}
    </section>
  );
}

/**
 * La etiqueta: un estado, una categoria, un contador.
 *
 * «Los colores de estado **nunca van solos**: siempre con icono o con texto,
 * porque hay gente que no distingue rojo de verde» (B1). Aqui el texto ya va
 * dentro, asi que la regla se cumple sola. Si ademas se pasa un icono, mejor.
 */
export type TonoDeEtiqueta = 'neutro' | 'bien' | 'atencion' | 'mal' | 'info' | 'marca';

/**
 * El color va en el texto, el borde, el icono y el fondo.
 *
 * En 11 px eso solo se puede si el color llega a 4,5:1 sobre su propio fondo
 * suave, y los cuatro llegan desde que se oscurecieron en M3. Lo comprueba
 * `contraste.prueba.ts`: si alguien aclara uno, la prueba falla antes de que se
 * publique una etiqueta ilegible.
 *
 * El naranja de marca es la excepcion y va en `--texto`: es el color de la
 * accion, no de un estado, y no se toca (2,5:1 sobre su fondo suave).
 */
const TONOS: Record<TonoDeEtiqueta, string> = {
  neutro: 'bg-fondo text-texto-suave border-borde [&>svg]:text-texto-suave',
  bien: 'bg-bien-suave text-bien border-bien/40 [&>svg]:text-bien',
  atencion: 'bg-atencion-suave text-atencion border-atencion/40 [&>svg]:text-atencion',
  mal: 'bg-mal-suave text-mal border-mal/40 [&>svg]:text-mal',
  info: 'bg-info-suave text-info border-info/40 [&>svg]:text-info',
  marca: 'bg-naranja-suave text-texto border-naranja/40 [&>svg]:text-naranja',
};

export interface EtiquetaProps {
  readonly tono?: TonoDeEtiqueta;
  readonly icono?: ReactNode;
  readonly children: ReactNode;
}

export function Etiqueta({ tono = 'neutro', icono, children }: EtiquetaProps) {
  return (
    <span
      className={clases(
        'inline-flex items-center gap-e1 px-e2 py-[2px] rounded-redondo border',
        'text-etiqueta font-medium whitespace-nowrap',
        TONOS[tono],
      )}
    >
      {icono}
      {children}
    </span>
  );
}

/**
 * El avatar.
 *
 * Sin foto, las iniciales. Nunca una silueta gris: dos iniciales identifican a
 * alguien de un vistazo y una silueta no.
 *
 * El color sale del nombre, no al azar, para que la misma persona salga siempre
 * del mismo color. Son los acentos de las apps, que ya estan elegidos para
 * distinguirse entre si.
 *
 * El acento va en el **aro** y no en el relleno: con relleno, las iniciales en
 * blanco dan 3,5:1 sobre el acento de Inventario y 4,1 sobre el de Servicio, por
 * debajo del 4,5:1 que pide B8. Con el aro, las iniciales van en charcoal sobre
 * blanco (16:1) y el color sigue identificando a la persona igual de bien.
 */
const COLORES = [
  'var(--color-app-inventario)',
  'var(--color-app-escandallos)',
  'var(--color-app-carta)',
  'var(--color-app-calendario)',
  'var(--color-app-equipo)',
  'var(--color-app-servicio)',
  'var(--color-app-negocio)',
  'var(--color-app-cuaderno)',
] as const;

export function inicialesDe(nombre: string): string {
  const trozos = nombre.trim().split(/\s+/).filter(Boolean);
  const primera = trozos[0]?.[0] ?? '?';
  const segunda = trozos.length > 1 ? (trozos[trozos.length - 1]?.[0] ?? '') : '';
  return `${primera}${segunda}`.toUpperCase();
}

export function colorDe(nombre: string): string {
  let suma = 0;
  for (const letra of nombre) suma = (suma + letra.charCodeAt(0)) % 1024;
  return COLORES[suma % COLORES.length] ?? COLORES[0];
}

export interface AvatarProps {
  readonly nombre: string;
  readonly tamano?: number;
}

export function Avatar({ nombre, tamano = 32 }: AvatarProps) {
  return (
    <span
      // El nombre entero, para quien no ve las iniciales.
      role="img"
      aria-label={nombre}
      className="inline-flex shrink-0 items-center justify-center rounded-redondo bg-superficie text-texto font-semibold"
      style={{
        width: tamano,
        height: tamano,
        boxShadow: `inset 0 0 0 2px ${colorDe(nombre)}`,
        fontSize: Math.trunc(tamano * 0.4),
      }}
    >
      <span aria-hidden>{inicialesDe(nombre)}</span>
    </span>
  );
}
