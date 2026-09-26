import { useState } from 'react';
import { AVISAR_ANTES_DE_ENTRAR, TURNO_SOSPECHOSO_DESDE, minutosHasta } from '@estook/dominio';
import { IconoAnadir, IconoAdelante, IconoEntrar, IconoSalir } from '@estook/iconos';
import { Boton, Hoja, IconoDeFogon, PanelLateral, clases, usarEsEscritorio } from '@estook/ui';
import { comoSeLeeLaHora, comoSeLeenMinutos } from '../equipo/contrato.ts';
import { usarContextoDeFogon } from '../ganchos/usarContextoDeFogon.ts';
import { usarFichar } from '../ganchos/usarFichar.ts';
import { usarHacer } from '../ganchos/usarHacer.ts';
import { usarMisAtajos } from '../ganchos/usarMisAtajos.ts';
import { usarSeEscondeAlBajar } from '../ganchos/usarSeEscondeAlBajar.ts';
import { ElegirAtajos } from './ElegirAtajos.tsx';

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
 *   3  Tus atajos, los mismos que las acciones rápidas del Panel: por defecto los
 *      de tu puesto, y cada uno se pone los suyos
 */
export function BotonDeHacer({ alPulsar }: { readonly alPulsar: () => void }) {
  // En el móvil se aparta al bajar y vuelve al subir (Richi, 25-sep).
  const escondido = usarSeEscondeAlBajar();
  return (
    <button
      type="button"
      onClick={alPulsar}
      aria-label="Qué quieres hacer"
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
      <IconoAnadir size={28} />
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
  const enEscritorio = usarEsEscritorio();
  const Ventana = enEscritorio ? PanelLateral : Hoja;
  const contexto = usarContextoDeFogon();
  const mios = usarMisAtajos();
  const hacer = usarHacer();
  const [eligiendo, setEligiendo] = useState(false);

  // Fichar va aparte y arriba: si estuviera también en la rejilla, saldría dos veces.
  const atajos = mios.atajos.filter((accion) => accion.id !== 'fichar');

  return (
    <>
      <Ventana abierta={abierta} alCerrar={alCerrar} titulo="Qué quieres hacer">
        {/*
          Solo mientras está abierta. La hoja es un `<dialog>` que al cerrarse se
          esconde pero no se quita, y lo de dentro —el fichaje, dónde estás— quedaba
          repetido y oculto en cada pantalla, pidiendo lo suyo al servidor sin que
          nadie lo mirara.
        */}
        {abierta && (
          <div className="flex flex-col gap-e4">
            {/* ── Fogón, en su banner ── */}
            <button
              type="button"
              onClick={() => {
                alCerrar();
                alAbrirFogon();
              }}
              className={clases(
                'flex min-h-toque-cocina items-center gap-e3 rounded-grande p-e4 text-left',
                // Lo destacado va en texto sobre superficie invertida: en los dos temas
                // se lee, y es lo único oscuro de la hoja (0045).
                'bg-texto text-superficie shadow-s2 hover:opacity-95',
              )}
            >
              <span className="grid size-[44px] shrink-0 place-items-center rounded-redondo bg-superficie text-naranja">
                <IconoDeFogon size={28} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-cuerpo font-semibold">Pregúntale a Fogón</span>
                <span className="block text-secundario opacity-80">
                  Sabe que estás en {contexto.donde}
                </span>
              </span>
              <IconoAdelante size={20} />
            </button>

            <FicharAqui />

            {/* ── Tus atajos ── */}
            <section aria-label="Tus atajos" className="flex flex-col gap-e2">
              <div className="flex items-center justify-between gap-e2">
                <p className="text-secundario font-medium text-texto-suave">Tus atajos</p>
                <Boton
                  tono="texto"
                  onClick={() => {
                    setEligiendo(true);
                  }}
                >
                  Cambiarlos
                </Boton>
              </div>
              {atajos.length === 0 ? (
                <p className="text-secundario text-texto-suave">
                  No tienes ninguno. Pulsa «Cambiarlos» y pon los que uses.
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-e2">
                  {atajos.slice(0, 8).map((accion) => (
                    <button
                      key={accion.id}
                      type="button"
                      onClick={() => {
                        alCerrar();
                        hacer(accion);
                      }}
                      className={clases(
                        'flex min-h-[76px] flex-col items-start justify-between gap-e2 rounded-grande',
                        'border border-borde bg-superficie p-e3 text-left shadow-s1',
                        'hover:border-borde-fuerte',
                      )}
                    >
                      <span className="grid size-[32px] place-items-center rounded-medio bg-fondo text-texto">
                        <accion.icono size={18} />
                      </span>
                      <span className="text-secundario font-semibold leading-tight">
                        {accion.nombre}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </Ventana>

      <ElegirAtajos
        abierta={eligiendo}
        alCerrar={() => {
          setEligiendo(false);
        }}
        puedo={mios.puedo.filter((accion) => accion.id !== 'fichar')}
        elegidas={mios.elegidos}
        alCambiar={mios.guardar}
        alVolverALosDeMiPuesto={mios.volverALosDeMiPuesto}
      />
    </>
  );
}

/**
 * Fichar, dentro de la hoja. **Solo sale si se puede fichar**, y dice lo justo:
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
        <p aria-live="polite" className="text-secundario text-bien">
          {fichar.acabaDe.entro ? 'Entrada apuntada' : 'Salida apuntada'}
          {fichar.acabaDe.metros === null ? '' : `, a ${fichar.acabaDe.metros} m del local`}.
        </p>
      )}
    </section>
  );
}
