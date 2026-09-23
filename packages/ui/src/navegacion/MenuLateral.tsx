import type { App, Destino } from '../apps.ts';
import { destinosConstruidos, destinosQueLlegan } from '../apps.ts';
import { clases } from '../clases.ts';

/**
 * El menu lateral de una app, en escritorio · Parte B5 del Plan.
 *
 * ── Lo que B5 mandaba desde M3 y no se habia construido ──────────────────────
 *
 * «Dentro de cada app, un **menu lateral propio** con sus vistas, y la ficha
 * abriendose en panel derecho sin tapar la lista.» Lo que habia en su lugar era
 * una fila de pastillas debajo de la cabecera, igual en las ocho apps. Con una
 * fila de pastillas, en un ordenador de 1.400 px se gastan 40 px de alto y se
 * dejan 1.300 px de ancho vacios a la izquierda, que es donde cualquier
 * herramienta profesional pone la navegacion de la seccion.
 *
 * Y ademas no cabia la informacion que hace que un menu sirva: **que contesta
 * cada destino**. Hasta la entrega V iba debajo de cada nombre; ahora sale al
 * pasar el raton (abajo, por que).
 *
 * ── Lo que llega despues, en su sitio y no en la barra ───────────────────────
 *
 * Los destinos que todavia no existen **no ocupan posicion en la barra de
 * abajo**, y esa es la regla que arregla las pestanas muertas. Pero tienen que
 * poder verse en algun sitio, porque saber que Pedidos llega con M7 es
 * informacion util. Su sitio es este, al final del menu, apagados y con su
 * modulo: se leen, no se pulsan.
 *
 * ── Y la pregunta, solo en el que estás (entrega V, 0045) ────────────────────
 *
 * «Hay mucho texto en la aplicación.» Cuatro destinos con su pregunta debajo son
 * ocho líneas para decir cuatro palabras, y la pregunta del que estás ya sale
 * debajo del título de la pantalla. Así que el menú dice **el nombre**, y la
 * pregunta de los demás sale al pasar el ratón por encima.
 */
export interface MenuLateralProps {
  readonly app: App;
  readonly destinoActivo: string;
  readonly alIrADestino: (destino: Destino) => void;
}

export function MenuLateral({ app, destinoActivo, alIrADestino }: MenuLateralProps) {
  const construidos = destinosConstruidos(app);
  const queLlegan = destinosQueLlegan(app);

  return (
    <nav
      aria-label={`Dentro de ${app.nombre}`}
      className="hidden w-[13rem] shrink-0 flex-col gap-e1 lg:flex no-imprimir"
    >
      {construidos.map((destino) => (
        <Posicion
          key={destino.id}
          destino={destino}
          acento={app.acento}
          activo={destino.id === destinoActivo}
          alPulsar={() => {
            alIrADestino(destino);
          }}
        />
      ))}

      {queLlegan.length > 0 && (
        <>
          <p className="mt-e4 px-e3 text-etiqueta font-medium text-texto-tenue">Llega después</p>
          {queLlegan.map((destino) => (
            <div
              key={destino.id}
              title={destino.queContesta}
              className="flex items-center gap-e3 rounded-grande px-e3 py-e2 text-texto-tenue"
            >
              <span className="grid size-8 shrink-0 place-items-center">
                <destino.icono size={18} />
              </span>
              <span className="min-w-0 flex-1 text-secundario">{destino.nombre}</span>
              <span className="shrink-0 text-etiqueta">{destino.modulo}</span>
            </div>
          ))}
        </>
      )}
    </nav>
  );
}

function Posicion({
  destino,
  acento,
  activo,
  alPulsar,
}: {
  readonly destino: Destino;
  readonly acento: string;
  readonly activo: boolean;
  readonly alPulsar: () => void;
}) {
  const Icono = destino.icono;

  return (
    <button
      type="button"
      onClick={alPulsar}
      title={activo ? undefined : destino.queContesta}
      aria-current={activo ? 'page' : undefined}
      className={clases(
        'flex min-h-toque w-full items-center gap-e3 rounded-grande px-e3 py-e2 text-left',
        'transition-colors duration-[--rapido]',
        activo ? 'bg-superficie [box-shadow:var(--sombra-tarjeta)]' : 'hover:bg-superficie/60',
      )}
    >
      {/* El acento solo en el icono del activo: «el acento se usa con moderacion»
          (B3). El fondo y el texto no cambian de color entre apps. */}
      <span
        className="grid size-8 shrink-0 place-items-center rounded-medio"
        style={
          activo
            ? { color: acento, background: `color-mix(in srgb, ${acento} 14%, transparent)` }
            : undefined
        }
      >
        <Icono size={18} />
      </span>
      <span
        className={clases(
          'min-w-0 flex-1 text-cuerpo font-medium',
          activo ? 'text-texto' : 'text-texto-suave',
        )}
      >
        {destino.nombre}
      </span>
    </button>
  );
}
