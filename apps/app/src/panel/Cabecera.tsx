import { Logo, clases } from '@estook/ui';
import { usarSesion } from '../sesion/Sesion.tsx';

/**
 * La cabecera del Panel · quién eres y dónde estás, con la cara del local.
 *
 * ── El fallo que arregla, que se ve en una foto y no en una prueba ───────────
 *
 * Lo que había eran dos líneas de texto suelto —«BAR CENTRO» en gris pequeño y
 * «Hola, Rosa» debajo— encima de una pantalla blanca. Mirado en el TPV de una
 * cocina, la aplicación entera parecía **una hoja de papel con texto flotando**:
 * sin bloques, sin color y sin nada que dijera de quién es esto.
 *
 * Y la marca del local ya existía desde M5 —su logo y su color, subidos en el
 * alta— y no se veía en ninguna parte salvo en una esquina de la barra de móvil.
 * Se había pedido el logo a la gente y luego no se enseñaba.
 *
 * ── Por qué el color va aquí aunque el interruptor esté apagado ──────────────
 *
 * Porque son dos cosas distintas. «Usar mi color en toda la aplicación» decide si
 * los **botones y los controles** dejan de ser naranjas; esto es la cabecera del
 * local, que es donde el color de un local se pone en cualquier aplicación del
 * mundo, y para eso se pidió en el alta: «se aplican a la app y a todos los
 * documentos» (Manifiesto 8).
 *
 * ── Y por qué el nombre no va sobre el color ─────────────────────────────────
 *
 * Porque un color de marca puede ser cualquiera, y escribir encima de cualquiera
 * es como se acaba con texto que no se lee. El color va en una **banda** y en el
 * cuadro del logo; el texto va sobre la superficie de siempre, con el contraste
 * de siempre. Es la misma idea que `color.ts`: se pinta con el color, no se
 * escribe sobre él.
 */
export function CabeceraDelPanel() {
  const { yo } = usarSesion();

  const local = yo?.local ?? null;
  const donde = local?.nombre ?? yo?.organizacion?.nombre ?? '';
  const color = local?.colorDeMarca ?? null;

  return (
    <header className="overflow-hidden rounded-grande border border-borde bg-superficie shadow-s1">
      {/* La banda de color. Sin texto encima, a propósito. */}
      <div
        aria-hidden
        className={clases('h-[6px] w-full', color === null && 'bg-naranja')}
        {...(color === null ? {} : { style: { background: color } })}
      />

      <div className="flex flex-wrap items-center gap-e3 px-e4 py-e3">
        <span
          aria-hidden
          className="grid size-[44px] shrink-0 place-items-center overflow-hidden rounded-medio border border-borde bg-fondo"
        >
          {local?.logo == null ? (
            <Logo alto={16} />
          ) : (
            <img src={local.logo} alt="" className="max-h-[34px] max-w-[34px] object-contain" />
          )}
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-etiqueta uppercase tracking-wide text-texto-suave">{donde}</p>
          <h1 className="truncate text-pantalla font-semibold">
            Hola, {yo?.nombre.split(' ')[0] ?? ''}
          </h1>
        </div>
      </div>
    </header>
  );
}
