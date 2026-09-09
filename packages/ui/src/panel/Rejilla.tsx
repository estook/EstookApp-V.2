import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { IconoAnadir, IconoCerrar, IconoHecho, IconoMenu, IconoRejilla } from '@estook/iconos';
import { clases } from '../clases.ts';
import { CUANTO_OCUPA, type TamanoDeWidget, type WidgetPuesto } from './catalogo.ts';

/**
 * La rejilla del Panel · Manifiesto 6, «el Panel de cada uno».
 *
 * «Una rejilla de widgets que cada uno coloca a su gusto, **arrastrando**.»
 *
 * ── Dos columnas en movil, y esa es la mitad del arreglo ─────────────────────
 *
 * El Panel de antes era `md:grid-cols-2 xl:grid-cols-3`, es decir: **una columna
 * en un telefono**. Seis tarjetas de ancho completo son seis pantallas de scroll
 * para leer cuatro cifras, y Estook se usa de pie con el telefono en la mano.
 *
 * Ahora son **dos columnas en movil** y cuatro en escritorio, con tres tamanos.
 * Lo que cabe en un vistazo pasa de una tarjeta a cuatro.
 *
 * ── El arrastre, sin libreria ────────────────────────────────────────────────
 *
 * La decision 0007 dice que no se instala una libreria de movimiento «hasta que
 * haga falta», y aqui **no hace falta**, por dos razones concretas:
 *
 *   · Lo que se mueve es el **orden de una lista**, no una posicion libre en un
 *     lienzo. Con `elementFromPoint` se sabe sobre que widget esta el dedo, y con
 *     eso el orden nuevo sale de una permutacion: no hay fisica que simular.
 *   · Y el movimiento que hace falta ya esta escrito en B6: «widget que se
 *     arrastra: levanta 4 px con sombra s3, 120 ms». Eso son dos clases de CSS.
 *
 * Se usan eventos de puntero y no de raton o de tacto: son los mismos para dedo,
 * raton y lapiz, y con `setPointerCapture` el arrastre no se pierde al salirse del
 * widget.
 *
 * ── Y con teclado, que no es un extra ────────────────────────────────────────
 *
 * «Toda la app manejable con teclado» (B8). Un arrastre solo con el dedo deja el
 * Panel sin configurar a quien no puede arrastrar, asi que en modo de edicion cada
 * widget lleva sus dos botones de mover, y hacen exactamente lo mismo que el
 * arrastre. Con «reducir movimiento» puesto, el arrastre sigue funcionando y lo que
 * se apaga es el levantar y la transicion.
 */
export interface RejillaProps {
  readonly puestos: readonly WidgetPuesto[];
  /** Como se pinta cada uno. La rejilla no sabe que hay dentro. */
  readonly pintar: (puesto: WidgetPuesto) => ReactNode;
  readonly editando: boolean;
  readonly alEditar: (editando: boolean) => void;
  readonly alReordenar: (puestos: readonly WidgetPuesto[]) => void;
  /**
   * Al soltar el widget que se estaba arrastrando.
   *
   * El arrastre es lo unico del Panel que se guarda con retraso —son veinte
   * reordenaciones por gesto— y esto es lo que dice cuando el gesto ha acabado,
   * para no tener que esperar los ochocientos milisegundos con el dedo ya fuera.
   */
  readonly alSoltar?: () => void;
  readonly alQuitar: (id: string) => void;
  readonly alCambiarTamano: (id: string, tamano: TamanoDeWidget) => void;
  /** Que tamanos admite cada widget, para no ofrecer uno que no cabe. */
  readonly tamanosDe: (id: string) => readonly TamanoDeWidget[];
  readonly nombreDe: (id: string) => string;
  readonly alAnadir: () => void;
  /** Si hay algo que guardar y no se ha guardado todavia. */
  readonly guardando?: boolean;
}

/** Las clases de cada tamano: dos columnas en movil, cuatro en escritorio. */
const CLASES_DEL_TAMANO: Readonly<Record<TamanoDeWidget, string>> = {
  chico: 'col-span-1 row-span-1',
  ancho: 'col-span-2 row-span-1',
  // Doble alto, y por eso las filas de la rejilla llevan una altura minima fija:
  // sin ella, «doble alto» no significa nada.
  grande: 'col-span-2 row-span-2',
};

const COMO_SE_LLAMA_EL_TAMANO: Readonly<Record<TamanoDeWidget, string>> = {
  chico: 'Pequeño',
  ancho: 'Ancho',
  grande: 'Grande',
};

export function Rejilla({
  puestos,
  pintar,
  editando,
  alEditar,
  alReordenar,
  alSoltar,
  alQuitar,
  alCambiarTamano,
  tamanosDe,
  nombreDe,
  alAnadir,
  guardando = false,
}: RejillaProps) {
  const caja = useRef<HTMLDivElement>(null);
  /** Cual se esta arrastrando, para levantarlo y para no soltarlo sobre si mismo. */
  const [arrastrando, setArrastrando] = useState<string | null>(null);

  const mover = useCallback(
    (desde: number, hasta: number) => {
      if (desde === hasta || hasta < 0 || hasta >= puestos.length) return;
      const copia = [...puestos];
      const [sacado] = copia.splice(desde, 1);
      if (sacado === undefined) return;
      copia.splice(hasta, 0, sacado);
      alReordenar(copia);
    },
    [puestos, alReordenar],
  );

  /**
   * El arrastre.
   *
   * Se mira **que widget hay debajo del dedo** con `elementFromPoint`, y si es
   * otro, se intercambia. No se calcula ninguna caja a mano: preguntarle al
   * navegador que hay en un punto es lo mismo que hace un dedo, y funciona igual
   * con la rejilla de dos columnas y con la de cuatro.
   */
  const alArrastrar = useCallback(
    (evento: React.PointerEvent, id: string) => {
      if (!editando) return;
      evento.preventDefault();
      const boton = evento.currentTarget as HTMLElement;
      boton.setPointerCapture(evento.pointerId);
      setArrastrando(id);

      const alMover = (movimiento: PointerEvent) => {
        const debajo = document
          .elementFromPoint(movimiento.clientX, movimiento.clientY)
          ?.closest('[data-widget]');
        const sobre = debajo?.getAttribute('data-widget');
        if (sobre === null || sobre === undefined || sobre === id) return;

        const desde = puestos.findIndex((p) => p.id === id);
        const hasta = puestos.findIndex((p) => p.id === sobre);
        if (desde !== -1 && hasta !== -1) mover(desde, hasta);
      };

      const alTerminar = () => {
        setArrastrando(null);
        alSoltar?.();
        boton.removeEventListener('pointermove', alMover);
        boton.removeEventListener('pointerup', alTerminar);
        boton.removeEventListener('pointercancel', alTerminar);
      };

      boton.addEventListener('pointermove', alMover);
      boton.addEventListener('pointerup', alTerminar);
      boton.addEventListener('pointercancel', alTerminar);
    },
    [editando, puestos, mover, alSoltar],
  );

  // Salir del modo de edicion con `Esc`, que es lo que hace todo lo demas en
  // Estook: «Esc cierra hoja o panel» (B5), y esto es lo mismo.
  useEffect(() => {
    if (!editando) return;
    const alEscapar = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') alEditar(false);
    };
    document.addEventListener('keydown', alEscapar);
    return () => {
      document.removeEventListener('keydown', alEscapar);
    };
  }, [editando, alEditar]);

  return (
    <div className="flex flex-col gap-e3">
      <div className="flex flex-wrap items-center justify-between gap-e2">
        <p className="text-etiqueta uppercase tracking-wide text-texto-suave">
          {editando ? 'Móntalo a tu gusto' : 'Tu panel'}
          {guardando && <span className="ml-e2 normal-case tracking-normal">guardando…</span>}
        </p>

        <div className="flex items-center gap-e2">
          {editando && (
            <button
              type="button"
              onClick={alAnadir}
              className="inline-flex min-h-toque items-center gap-e1 rounded-medio border border-borde-fuerte bg-superficie px-e3 text-secundario font-medium hover:bg-fondo"
            >
              <IconoAnadir size={16} />
              Añadir
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              alEditar(!editando);
            }}
            className={clases(
              'inline-flex min-h-toque items-center gap-e1 rounded-medio px-e3 text-secundario font-medium',
              editando
                ? 'bg-charcoal text-superficie'
                : 'border border-borde-fuerte bg-superficie hover:bg-fondo',
            )}
          >
            {editando ? <IconoHecho size={16} /> : <IconoRejilla size={16} />}
            {editando ? 'Listo' : 'Editar'}
          </button>
        </div>
      </div>

      {/*
        Dos columnas en movil y cuatro en escritorio. `auto-rows` con altura
        minima es lo que hace que «grande» sea de verdad el doble de alto; sin
        ella, `row-span-2` sobre filas de altura automatica no cambia nada.
      */}
      <div
        ref={caja}
        className="grid grid-cols-2 gap-e3 [grid-auto-rows:minmax(9.5rem,auto)] lg:grid-cols-4"
      >
        {puestos.map((puesto, indice) => {
          const tamanos = tamanosDe(puesto.id);
          const nombre = nombreDe(puesto.id);

          return (
            <div
              key={puesto.id}
              data-widget={puesto.id}
              className={clases(
                CLASES_DEL_TAMANO[puesto.tamano],
                'relative min-w-0',
                // «Widget que se arrastra: levanta 4 px con sombra s3, 120 ms» (B6).
                'transition-transform duration-[--rapido] motion-reduce:transition-none',
                arrastrando === puesto.id && '-translate-y-[4px] shadow-s3',
                editando && arrastrando !== puesto.id && 'opacity-95',
              )}
            >
              {pintar(puesto)}

              {editando && (
                <ControlesDeEdicion
                  nombre={nombre}
                  tamano={puesto.tamano}
                  tamanos={tamanos}
                  arrastrandose={arrastrando === puesto.id}
                  puedeSubir={indice > 0}
                  puedeBajar={indice < puestos.length - 1}
                  alArrastrar={(evento) => {
                    alArrastrar(evento, puesto.id);
                  }}
                  alSubir={() => {
                    mover(indice, indice - 1);
                  }}
                  alBajar={() => {
                    mover(indice, indice + 1);
                  }}
                  alQuitar={() => {
                    alQuitar(puesto.id);
                  }}
                  alCambiarTamano={(tamano) => {
                    alCambiarTamano(puesto.id, tamano);
                  }}
                />
              )}
            </div>
          );
        })}

        {/* El hueco de anadir, dentro de la rejilla y no en un menu escondido: en
            modo de edicion es donde se busca. */}
        {editando && (
          <button
            type="button"
            onClick={alAnadir}
            className={clases(
              'col-span-1 row-span-1 flex flex-col items-center justify-center gap-e1',
              'rounded-grande border-2 border-dashed border-borde-fuerte text-texto-suave',
              'hover:border-naranja hover:text-texto',
            )}
          >
            <IconoAnadir size={24} />
            <span className="text-secundario font-medium">Añadir</span>
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Los controles de un widget en modo de edicion.
 *
 * Van **encima** del widget y no dentro, para que el widget no tenga que saber
 * nada de esto: se pinta igual editando y sin editar, y lo que cambia es lo que se
 * le pone por delante. Un widget que tuviera que dibujar su propia ✕ seria
 * dieciseis sitios donde poner esa ✕.
 */
function ControlesDeEdicion({
  nombre,
  tamano,
  tamanos,
  arrastrandose,
  puedeSubir,
  puedeBajar,
  alArrastrar,
  alSubir,
  alBajar,
  alQuitar,
  alCambiarTamano,
}: {
  readonly nombre: string;
  readonly tamano: TamanoDeWidget;
  readonly tamanos: readonly TamanoDeWidget[];
  readonly arrastrandose: boolean;
  readonly puedeSubir: boolean;
  readonly puedeBajar: boolean;
  readonly alArrastrar: (evento: React.PointerEvent) => void;
  readonly alSubir: () => void;
  readonly alBajar: () => void;
  readonly alQuitar: () => void;
  readonly alCambiarTamano: (tamano: TamanoDeWidget) => void;
}) {
  return (
    <>
      {/* La capa que impide pulsar dentro del widget mientras se edita. Sin ella,
          arrastrar sobre un botón del widget lo activaría al soltar. */}
      <div aria-hidden className="absolute inset-0 rounded-grande bg-superficie/40" />

      <button
        type="button"
        aria-label={`Mover ${nombre}`}
        onPointerDown={alArrastrar}
        className={clases(
          'absolute left-e2 top-e2 grid size-[32px] place-items-center rounded-medio',
          'border border-borde-fuerte bg-superficie text-texto-suave shadow-s1',
          arrastrandose ? 'cursor-grabbing' : 'cursor-grab',
          'touch-none',
        )}
      >
        <IconoMenu size={16} />
      </button>

      <button
        type="button"
        aria-label={`Quitar ${nombre} del panel`}
        onClick={alQuitar}
        className="absolute right-e2 top-e2 grid size-[32px] place-items-center rounded-medio border border-borde-fuerte bg-superficie text-mal shadow-s1"
      >
        <IconoCerrar size={16} />
      </button>

      <div className="absolute inset-x-e2 bottom-e2 flex flex-wrap items-center justify-center gap-e1">
        {/* El tamano, si admite mas de uno. Con uno solo no se ofrece: un control
            de una opcion es un control que no hace nada. */}
        {tamanos.length > 1 &&
          tamanos.map((cual) => (
            <button
              key={cual}
              type="button"
              aria-pressed={cual === tamano}
              onClick={() => {
                alCambiarTamano(cual);
              }}
              className={clases(
                'min-h-[28px] rounded-chico px-e2 text-etiqueta font-semibold uppercase tracking-wide',
                cual === tamano
                  ? 'bg-charcoal text-superficie'
                  : 'border border-borde-fuerte bg-superficie text-texto-suave',
              )}
            >
              {COMO_SE_LLAMA_EL_TAMANO[cual]}
            </button>
          ))}

        {/* Y mover con teclado, que hace lo mismo que arrastrar. */}
        <span className="flex gap-e1">
          <button
            type="button"
            aria-label={`Mover ${nombre} antes`}
            disabled={!puedeSubir}
            onClick={alSubir}
            className="grid size-[28px] place-items-center rounded-chico border border-borde-fuerte bg-superficie text-texto-suave disabled:opacity-40"
          >
            ←
          </button>
          <button
            type="button"
            aria-label={`Mover ${nombre} después`}
            disabled={!puedeBajar}
            onClick={alBajar}
            className="grid size-[28px] place-items-center rounded-chico border border-borde-fuerte bg-superficie text-texto-suave disabled:opacity-40"
          >
            →
          </button>
        </span>
      </div>

      <p className="sr-only">
        {nombre}, {COMO_SE_LLAMA_EL_TAMANO[tamano]}. {CUANTO_OCUPA[tamano].columnas} de ancho.
      </p>
    </>
  );
}
