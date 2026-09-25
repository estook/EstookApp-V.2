import { useState } from 'react';
import { IconoAjustes } from '@estook/iconos';
import { Tarjeta, clases, type TamanoDeWidget } from '@estook/ui';
import { ElegirAtajos } from '../acciones/ElegirAtajos.tsx';
import { usarHacer } from '../ganchos/usarHacer.ts';
import { usarMisAtajos } from '../ganchos/usarMisAtajos.ts';

/**
 * El widget de accesos rápidos · «Accesos rápidos · los botones que cada uno
 * quiera» (Manifiesto 6, tabla de widgets).
 *
 * ── Lo que pedía la pausa, con estas palabras ────────────────────────────────
 *
 * «Que un cuadrado tenga varias acciones rápidas —hacer horario con IA, o horario
 * normal, editar carta, análisis— y que sean editables.» Eso es esto: un widget con
 * cuatro u ocho botones que salen del catálogo de acciones, y que cada persona
 * elige.
 *
 * ── Y por qué solo salen las que funcionan ───────────────────────────────────
 *
 * El catálogo de acciones **solo tiene acciones que hacen algo hoy**. Las que hará
 * Fogón —dictar una merma, montar un horario, analizar la carta— no están ahí:
 * están en la ventana de Fogón, contadas como lo que llega. Poner aquí un botón
 * «Hacer el horario con IA» que abriera un cartel sería exactamente el fallo que
 * este proyecto lleva persiguiendo desde M4, y en el sitio donde más se pulsa.
 *
 * ── Y desde la entrega O, los mismos que el botón «+» ─────────────────────────
 *
 * La lista vive en `usarMisAtajos`: se cambia aquí o en el «+» y vale en los dos.
 * Sin elegir nada, los del puesto de cada uno (`ACCIONES_DEL_PUESTO`).
 *
 * ── Dónde se guarda la elección ──────────────────────────────────────────────
 *
 * En este aparato, y **esto sí**: es la única cosa del Panel que se guarda en el
 * navegador, y tiene su razón. La composición del Panel va al servidor porque «para
 * siempre tiene que ser para siempre en todos los aparatos» (0024); qué cuatro
 * botones tienes a mano es lo contrario de eso: en el móvil de la cocina quieres
 * «apuntar lo que ha llegado» y en el ordenador de la oficina quieres «ver el
 * libro». Si algún día se demuestra que no, se sube con la lista de widgets, que ya
 * tiene su tabla.
 */
export function AccesosRapidos({
  tamano,
  editando,
}: {
  readonly tamano: TamanoDeWidget;
  readonly editando: boolean;
}) {
  const mios = usarMisAtajos();
  const hacer = usarHacer();
  const [eligiendo, setEligiendo] = useState(false);
  const acciones = mios.atajos;

  const cuantas = tamano === 'grande' ? 8 : 4;

  return (
    <div className="h-full [&>section]:h-full [&>section]:flex [&>section]:flex-col">
      <Tarjeta
        titulo="Acciones rápidas"
        accion={
          <button
            type="button"
            onClick={() => {
              setEligiendo(true);
            }}
            aria-label="Elegir qué acciones rápidas quieres"
            className="grid size-toque place-items-center rounded-medio text-texto-suave hover:text-texto"
          >
            <IconoAjustes size={16} />
          </button>
        }
      >
        <div className={clases('grid gap-e2', tamano === 'grande' ? 'grid-cols-2' : 'grid-cols-2')}>
          {acciones.slice(0, cuantas).map((accion) => (
            <button
              key={accion.id}
              type="button"
              disabled={editando}
              onClick={() => {
                hacer(accion);
              }}
              className={clases(
                'flex min-h-[68px] flex-col items-start justify-between gap-e1 rounded-medio',
                'border border-borde bg-fondo p-e2 text-left',
                'hover:border-borde-fuerte hover:bg-superficie',
              )}
            >
              <accion.icono size={18} />
              <span className="text-secundario font-medium leading-tight">{accion.nombre}</span>
            </button>
          ))}
        </div>

        {acciones.length === 0 && (
          <p className="text-secundario text-texto-suave">
            No has elegido ninguna. Pulsa la rueda de arriba para poner las que uses.
          </p>
        )}
      </Tarjeta>

      <ElegirAtajos
        abierta={eligiendo}
        alCerrar={() => {
          setEligiendo(false);
        }}
        puedo={mios.puedo}
        elegidas={mios.elegidos}
        alCambiar={mios.guardar}
        alVolverALosDeMiPuesto={mios.volverALosDeMiPuesto}
      />
    </div>
  );
}
