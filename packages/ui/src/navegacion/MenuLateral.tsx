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
 * cada destino**. En una pastilla solo cabe una palabra; aqui cabe la palabra y
 * la pregunta debajo.
 *
 * ── Lo que llega despues, en su sitio y no en la barra ───────────────────────
 *
 * Los destinos que todavia no existen **no ocupan posicion en la barra de
 * abajo**, y esa es la regla que arregla las pestanas muertas. Pero tienen que
 * poder verse en algun sitio, porque saber que Pedidos llega con M7 es
 * informacion util. Su sitio es este, al final del menu, apagados y con su
 * modulo: se leen, no se pulsan.
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
      className="hidden w-[15rem] shrink-0 flex-col gap-e1 lg:flex no-imprimir"
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
          <p className="mt-e3 px-e2 text-etiqueta uppercase tracking-wide text-texto-tenue">
            Llega después
          </p>
          {queLlegan.map((destino) => (
            <div
              key={destino.id}
              className="flex items-start gap-e2 rounded-medio px-e2 py-e2 text-texto-tenue"
            >
              <span className="mt-[2px] shrink-0">
                <destino.icono size={18} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-e1">
                  <span className="text-cuerpo">{destino.nombre}</span>
                  <span className="text-etiqueta uppercase tracking-wide">{destino.modulo}</span>
                </span>
                <span className="block text-secundario">{destino.queContesta}</span>
              </span>
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
      aria-current={activo ? 'page' : undefined}
      className={clases(
        'flex w-full items-start gap-e2 rounded-medio px-e2 py-e2 text-left',
        'transition-colors duration-[--rapido]',
        activo ? 'bg-superficie shadow-s1' : 'hover:bg-superficie',
      )}
    >
      {/* El acento solo en el icono del activo: «el acento se usa con moderacion»
          (B3). El fondo y el texto no cambian de color entre apps. */}
      <span className="mt-[2px] shrink-0" style={activo ? { color: acento } : undefined}>
        <Icono size={18} />
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={clases(
            'block text-cuerpo font-medium',
            activo ? 'text-texto' : 'text-texto-suave',
          )}
        >
          {destino.nombre}
        </span>
        <span className="block text-secundario text-texto-tenue">{destino.queContesta}</span>
      </span>
    </button>
  );
}
