import { useEffect, useRef } from 'react';
import { AVISAR_ANTES_DE_ENTRAR, TURNO_SOSPECHOSO_DESDE, minutosHasta } from '@estook/dominio';
import { IconoAdelante, IconoCerrar, IconoEntrar, IconoSalir } from '@estook/iconos';
import { Boton, IconoDeFogon, clases } from '@estook/ui';
import { comoSeLeeLaHora, comoSeLeenMinutos } from '../equipo/contrato.ts';
import { usarContextoDeFogon } from '../ganchos/usarContextoDeFogon.ts';
import { loQueDiceElFichaje, usarFichar } from '../ganchos/usarFichar.ts';
import { usarSeEscondeAlBajar } from '../ganchos/usarSeEscondeAlBajar.ts';

/**
 * El botón «+» · lo que más se hace, a un toque desde cualquier pantalla
 * (entrega O, mejora 6 · decisión 0047).
 *
 * ── Por qué un botón y no una barra más ──────────────────────────────────────
 *
 * Se pidió «una barra fija abajo con lo que más se hace: merma, fichar y recibir».
 * La barra de abajo ya existe y es la de navegar; una segunda encima serían dos
 * barras, un cuarto de pantalla en un móvil pequeño. Richi eligió **un solo botón
 * redondo**, abajo a la derecha, donde llega el pulgar, que abre lo que haces.
 *
 * ── Y Fogón, dentro y destacado ──────────────────────────────────────────────
 *
 * Donde estaba la burbuja de Fogón está ahora el «+»: dos botones flotantes en un
 * móvil son demasiados, y Fogón todavía no habla (M22). Pero no se esconde: va
 * **arriba del todo de la hoja, en su propio banner**, con dónde estás, que es lo
 * que Richi pidió. En escritorio, además, \`Ctrl+J\` lo abre directo.
 *
 * ── Lo que hay dentro ────────────────────────────────────────────────────────
 *
 *   1  Fogón, en su banner
 *   2  Fichar, **cuando se puede**: la salida si estás dentro, y la entrada
 *      resaltada si tu turno empieza en nada o ya ha empezado
 *
 * ── Desde el repaso del 8-nov (0143) ─────────────────────────────────────────
 *
 * Richi: el «+» «parece para agregar cosas», la hoja «tapa casi toda la pantalla» y los
 * atajos eran «demasiado». Así que **lleva el dibujo de Fogón** y no un «+», se abre en **una
 * ventana pequeña encima del botón, como un chat**, y **sin «Tus atajos»**, que siguen en la
 * tarjeta «Atajos» del Panel. Sigue donde estaba y se sigue apartando al bajar.
 */
export function BotonDeHacer({ alPulsar }: { readonly alPulsar: () => void }) {
  // En el móvil se aparta al bajar y vuelve al subir (Richi, 25-sep).
  const escondido = usarSeEscondeAlBajar();
  return (
    <button
      type="button"
      onClick={alPulsar}
      aria-label="Qué quieres hacer"
      data-recorrido="hacer"
      data-escondido={escondido || undefined}
      className={clases(
        'fixed right-e3 z-30 grid size-[56px] place-items-center no-imprimir lg:right-e5',
        // El icono en charcoal y no en blanco: blanco sobre naranja da 2,6:1 (B8).
        'rounded-redondo bg-naranja text-sobre-naranja shadow-s3',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-naranja',
        // Con el desfase del visor, y fuera con el teclado, como la barra (repaso del 25-sep).
        'bottom-[calc(var(--alto-barra-movil)+env(safe-area-inset-bottom)+var(--spacing-e3)-var(--desfase-abajo,0px))] lg:bottom-e5',
        'max-lg:[[data-teclado]_&]:hidden',
        'transition-[translate,opacity] duration-[--normal] ease-curva',
        // Baja detrás de la barra de navegación y se apaga. Con el teclado, si recibe
        // el foco, vuelve: nada se queda fuera de alcance por estar escondido.
        escondido &&
          'max-lg:pointer-events-none max-lg:translate-y-[calc(100%+var(--spacing-e5))] max-lg:opacity-0 focus-visible:translate-y-0 focus-visible:opacity-100',
      )}
    >
      <span className="grid size-[40px] place-items-center rounded-redondo bg-superficie">
        <IconoDeFogon size={30} />
      </span>
    </button>
  );
}

export function HojaDeHacer({
  abierta,
  alCerrar,
  alAbrirFogon,
}: {
  readonly abierta: boolean;
  readonly alCerrar: () => void;
  readonly alAbrirFogon: () => void;
}) {
  const contexto = usarContextoDeFogon();
  const ventana = useRef<HTMLDivElement>(null);

  // `alCerrar` llega nuevo en cada pintado: por una referencia, para que el foco no salte a
  // la ventana cada vez que algo de dentro cambia (fichar, por ejemplo).
  const cerrar = useRef(alCerrar);
  cerrar.current = alCerrar;

  // Escape cierra, y el foco entra en la ventana al abrirla (y no se queda detrás).
  useEffect(() => {
    if (!abierta) return;
    ventana.current?.focus();
    const alPulsar = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') cerrar.current();
    };
    window.addEventListener('keydown', alPulsar);
    return () => {
      window.removeEventListener('keydown', alPulsar);
    };
  }, [abierta]);

  // Solo mientras está abierta: lo de dentro —el fichaje, dónde estás— no pide nada al
  // servidor mientras nadie lo mira.
  if (!abierta) return null;

  return (
    <>
      {/* Tocar fuera la cierra, como un chat. */}
      <button
        type="button"
        aria-label="Cerrar"
        tabIndex={-1}
        onClick={alCerrar}
        className="fixed inset-0 z-40 cursor-default bg-transparent no-imprimir"
      />
      <div
        ref={ventana}
        role="dialog"
        aria-label="Qué quieres hacer"
        tabIndex={-1}
        className={clases(
          // **Una ventana pequeña, encima del botón** (0143): no tapa la pantalla.
          'fixed right-e3 z-50 flex w-[min(22rem,calc(100vw-2*var(--spacing-e3)))] flex-col gap-e3 no-imprimir lg:right-e5',
          'bottom-[calc(var(--alto-barra-movil)+env(safe-area-inset-bottom)+var(--spacing-e3)+64px-var(--desfase-abajo,0px))] lg:bottom-[calc(var(--spacing-e5)+64px)]',
          'max-h-[min(32rem,70dvh)] overflow-y-auto rounded-mayor border border-borde bg-superficie p-e3 shadow-s3 outline-none',
        )}
      >
        <div className="flex items-center justify-between gap-e2 pl-e1">
          <p className="text-cuerpo font-semibold">¿Qué hacemos?</p>
          <button
            type="button"
            aria-label="Cerrar"
            onClick={alCerrar}
            className="grid size-toque place-items-center rounded-medio text-texto-suave hover:bg-fondo"
          >
            <IconoCerrar size={18} />
          </button>
        </div>
        {/* ── Fogón, en su banner ── */}
        <button
          type="button"
          onClick={() => {
            alCerrar();
            alAbrirFogon();
          }}
          className={clases(
            'flex min-h-toque-cocina items-center gap-e3 rounded-grande p-e3 text-left',
            // Lo destacado va en texto sobre superficie invertida: en los dos temas se lee (0045).
            'bg-texto text-superficie hover:opacity-95',
          )}
        >
          <span className="grid size-[40px] shrink-0 place-items-center rounded-redondo bg-superficie">
            <IconoDeFogon size={26} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-cuerpo font-semibold">Pregúntale a Fogón</span>
            <span className="block truncate text-secundario opacity-80">
              Sabe que estás en {contexto.donde}
            </span>
          </span>
          <IconoAdelante size={20} />
        </button>

        <FicharAqui />
      </div>
    </>
  );
}

/**
 * Fichar, dentro de la ventana. **Solo sale si se puede fichar**, y dice lo justo:
 * dentro, cuánto llevas y el botón de salir; fuera, el de entrar, resaltado cuando
 * tu turno empieza en nada o ya ha empezado —como Homebase y 7shifts, que ponen el
 * reloj lo primero cuando toca—.
 */
function FicharAqui() {
  const fichar = usarFichar();
  const mio = fichar.mio;
  if (fichar.cargando || mio === undefined || !mio.puedoFichar) return null;

  const abierto = mio.abierto;
  const dentro = abierto !== null;
  const tramo = mio.horario.find((t) => t.dia === mio.diaDeLaSemana);
  const faltan = tramo === undefined ? null : minutosHasta(mio.horaDelLocal, tramo.entra);
  const tocaEntrar =
    !dentro &&
    mio.minutosDeHoy === 0 &&
    faltan !== null &&
    faltan <= AVISAR_ANTES_DE_ENTRAR &&
    faltan > -240;
  const olvidada = abierto !== null && abierto.minutos >= TURNO_SOSPECHOSO_DESDE;

  const frase = dentro
    ? `Dentro desde las ${comoSeLeeLaHora(abierto.entroEn)} · ${comoSeLeenMinutos(abierto.minutos)}`
    : tramo === undefined
      ? mio.minutosDeHoy > 0
        ? `Hoy llevas ${comoSeLeenMinutos(mio.minutosDeHoy)}`
        : 'No has fichado hoy'
      : faltan !== null && faltan < 0
        ? `Entrabas a las ${tramo.entra}`
        : `Hoy entras a las ${tramo.entra}`;

  return (
    <section
      aria-label="Fichar"
      className={clases(
        'flex flex-col gap-e2 rounded-grande border p-e3',
        tocaEntrar || olvidada ? 'border-naranja bg-naranja-suave' : 'border-borde bg-superficie',
      )}
    >
      <p className="text-secundario text-texto-suave">{frase}</p>
      <Boton
        tono={dentro ? 'secundario' : 'principal'}
        ancho
        icono={dentro ? <IconoSalir size={18} /> : <IconoEntrar size={18} />}
        cargando={fichar.fichando}
        textoCargando={fichar.paso === 'buscando_ubicacion' ? 'Buscando dónde estás' : 'Apuntando'}
        onClick={dentro ? fichar.salir : fichar.entrar}
      >
        {dentro ? 'Fichar la salida' : 'Fichar la entrada'}
      </Boton>
      {fichar.error !== null && <p className="text-secundario text-mal">{fichar.error.quePasa}</p>}
      {fichar.acabaDe !== null && fichar.error === null && (
        <p
          aria-live="polite"
          className={clases(
            'text-secundario',
            loQueDiceElFichaje(fichar.acabaDe).guardado ? 'text-atencion' : 'text-bien',
          )}
        >
          {loQueDiceElFichaje(fichar.acabaDe).texto}
        </p>
      )}
    </section>
  );
}
