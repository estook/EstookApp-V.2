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
  /**
   * El acento de la app, si la tarjeta es de una. Pinta el icono de la cabecera,
   * o un punto al lado del título si la tarjeta no lleva icono.
   */
  readonly acento?: string;
  /** El icono de la cabecera, en su pastilla del color del acento. */
  readonly icono?: ReactNode;
  /** Un número al lado del título: cuántas cosas hay dentro. */
  readonly cuantos?: number;
  /** A la derecha del titulo: un boton, un selector de periodo. */
  readonly accion?: ReactNode;
  /** Debajo del todo, en gris: de donde sale el dato y de cuando es. */
  readonly origen?: string;
  readonly children: ReactNode;
  /** Sin relleno, para una tabla o una lista que llega hasta el borde. */
  readonly pegado?: boolean;
}

/*
  ── El aspecto, desde la entrega V (0045) ─────────────────────────────────────

  «Las tarjetitas son muy feas. Parece una aplicación de los 2000.» Lo que las
  hacía viejas no era un color: eran cuatro cosas a la vez, y se cambian las cuatro.

    · **Un borde duro y una sombra de un píxel.** Ahora el borde es más suave y la
      sombra tiene dos capas —una pegada, otra lejana y difusa—, que es lo que hace
      que una tarjeta se lea como algo que está encima y no como un recuadro.
    · **Esquinas de 16 px en todo.** Pasan a 24, las de un widget del iPhone.
    · **La línea de color de tres píxeles arriba.** Es lo más «web de 2005» que
      había. El acento sigue diciendo de qué app es, pero en el **icono de la
      cabecera**, dentro de una pastilla de su color, o en un punto al lado del
      título. «El acento se usa con moderación» (B3) se sigue cumpliendo: un icono.
    · **El pie en mayúsculas y espaciado** («SOBRE 10 PRODUCTOS · AHORA MISMO»).
      Unas mayúsculas grises en cada tarjeta gritan poco pero gritan todas. El pie
      sigue ahí —una cifra sin origen no vale—, en minúscula y en el gris tenue.
*/
export function Tarjeta({
  titulo,
  acento,
  icono,
  cuantos,
  accion,
  origen,
  children,
  pegado = false,
}: TarjetaProps) {
  const conCabecera = titulo !== undefined || accion !== undefined;
  return (
    <section
      className={clases(
        // `@container`: la tarjeta se adapta a **su** ancho, no al de la pantalla.
        // Un widget pequeño del Panel en un monitor es tan estrecho como uno en un
        // móvil, y es ahí donde el título partía en tres líneas.
        '@container relative overflow-hidden rounded-mayor border border-borde bg-superficie',
        '[box-shadow:var(--sombra-tarjeta)]',
      )}
    >
      {conCabecera && (
        <header className="flex min-h-toque items-center justify-between gap-e2 px-e4 pt-e4 pb-e2 @min-[22rem]:px-e5">
          {titulo !== undefined && (
            <div className="flex min-w-0 items-center gap-e2">
              {icono !== undefined ? (
                <span
                  aria-hidden
                  // En una tarjeta estrecha el icono cede su sitio al título.
                  className="grid size-8 shrink-0 place-items-center rounded-medio @max-[16rem]:hidden"
                  style={{
                    color: acento ?? 'var(--color-texto-suave)',
                    background: `color-mix(in srgb, ${acento ?? 'var(--color-texto-suave)'} 14%, transparent)`,
                  }}
                >
                  {icono}
                </span>
              ) : (
                acento !== undefined && (
                  <span
                    aria-hidden
                    className="size-2 shrink-0 rounded-redondo"
                    style={{ background: acento }}
                  />
                )
              )}
              <h2 className="min-w-0 text-seccion font-semibold leading-tight tracking-[-0.01em]">
                {titulo}
              </h2>
              {cuantos !== undefined && cuantos > 0 && (
                <span className="shrink-0 rounded-redondo bg-fondo px-e2 py-[1px] text-etiqueta font-semibold text-texto-suave">
                  {cuantos}
                </span>
              )}
            </div>
          )}
          {accion}
        </header>
      )}

      <div
        className={clases(
          pegado ? '' : 'px-e4 pb-e4 @min-[22rem]:px-e5',
          !conCabecera && !pegado && 'pt-e4',
        )}
      >
        {children}
      </div>

      {origen !== undefined && (
        <footer className="px-e4 pb-e4 pt-e1 text-etiqueta text-texto-tenue @min-[22rem]:px-e5">
          {origen}
        </footer>
      )}
    </section>
  );
}

/**
 * El enlace de la cabecera de una tarjeta: «Ver ›».
 *
 * **En pantalla dice «Ver» y nada más**, en todas las tarjetas: «Ver pedidos» y
 * «Ver a detalle» al lado del título eran los que lo partían en dos líneas, y la
 * tarjeta ya dice de qué es. Quien no ve la pantalla oye el nombre entero
 * (`etiqueta`), que empieza por lo que se ve, como pide WCAG 2.5.3.
 */
export function EnlaceDeTarjeta({
  etiqueta,
  onClick,
}: {
  /** Lo que oye un lector de pantalla: «Ver pedidos». Empieza por «Ver». */
  readonly etiqueta: string;
  readonly onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={etiqueta}
      className={clases(
        '-mr-e2 inline-flex min-h-toque shrink-0 items-center gap-e1 whitespace-nowrap rounded-redondo px-e3',
        'text-secundario font-medium text-texto-suave hover:bg-fondo hover:text-texto',
      )}
    >
      Ver
      <span aria-hidden className="text-cuerpo text-texto-tenue">
        ›
      </span>
    </button>
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
  /*
    ── El punto, cuando la etiqueta dice un estado ───────────────────────────

    «Las píldoras las veo súper básicas.» Y lo eran: texto de 11 px dentro de un
    borde. Un punto del color del estado las hace reconocibles **antes de
    leerlas**, que es como se mira una lista de trescientas filas: se busca el
    rojo, no se lee «En negativo» treinta veces.

    No es color en lugar de texto —eso lo prohíbe B8 y con razón—: es color
    **además** del texto, que sigue entero. Y no sale en `neutro`, porque un punto
    gris no distingue nada de nada; ni cuando hay icono, que ya hace ese trabajo.
  */
  const conPunto = tono !== 'neutro' && icono === undefined;

  return (
    <span
      className={clases(
        'inline-flex items-center gap-e1 px-e2 py-[2px] rounded-redondo border',
        'text-etiqueta font-medium whitespace-nowrap',
        TONOS[tono],
      )}
    >
      {icono}
      {conPunto && (
        <span aria-hidden className="size-[6px] shrink-0 rounded-redondo bg-current opacity-70" />
      )}
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
