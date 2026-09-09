import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconoAjustes } from '@estook/iconos';
import { Boton, Hoja, Tarjeta, clases, type TamanoDeWidget } from '@estook/ui';
import { usarSesion } from '../sesion/Sesion.tsx';
import {
  ACCIONES_DE_FABRICA,
  accionPorId,
  accionesQuePuedo,
  type Accion,
} from '../acciones/catalogo.tsx';
import { usarElEsqueleto } from '../ganchos/usarElEsqueleto.tsx';

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
/**
 * Una clave **por persona**, no una para el aparato.
 *
 * Es un aparato de cocina: lo usan cuatro. Con una sola clave, el segundo que
 * entraba se encontraba las acciones que eligió el primero, y al tocar una se las
 * quitaba. No es un agujero de seguridad —solo salen las acciones que el permiso
 * de quien mira deja salir— pero es la personalización de otra persona en tu
 * pantalla, y encima sin forma de recuperarla al volver.
 *
 * Con la persona en la clave, cada uno se encuentra las suyas en ese aparato, que
 * es lo que dice la cabecera de este fichero que se quería.
 */
function dondeSeGuarda(personaId: string): string {
  return `estook.accesos-rapidos.${personaId}`;
}

function leerLoGuardado(personaId: string): readonly string[] | null {
  try {
    const guardado = window.localStorage.getItem(dondeSeGuarda(personaId));
    if (guardado === null) return null;
    const lista: unknown = JSON.parse(guardado);
    if (!Array.isArray(lista)) return null;
    return lista.filter((id): id is string => typeof id === 'string');
  } catch {
    // Un navegador con el almacenamiento cerrado, o un JSON de una versión vieja.
    // Se cae al de fábrica, que es lo correcto: nunca una pantalla en blanco.
    return null;
  }
}

export function AccesosRapidos({
  tamano,
  editando,
}: {
  readonly tamano: TamanoDeWidget;
  readonly editando: boolean;
}) {
  const navegar = useNavigate();
  const { permisos, yo } = usarSesion();
  const esqueleto = usarElEsqueleto();
  const quien = yo?.personaId ?? '';

  const puedo = accionesQuePuedo(permisos);
  const [elegidas, setElegidas] = useState<readonly string[]>(() => {
    const guardado = leerLoGuardado(quien);
    return guardado ?? ACCIONES_DE_FABRICA;
  });
  const [eligiendo, setEligiendo] = useState(false);

  // Lo guardado puede nombrar una acción que ya no existe, o una para la que esta
  // persona ha perdido el permiso desde la última vez.
  const acciones = elegidas
    .map((id) => accionPorId(id))
    .filter((accion): accion is Accion => accion !== undefined && puedo.includes(accion));

  const guardar = useCallback(
    (nuevas: readonly string[]) => {
      setElegidas(nuevas);
      try {
        window.localStorage.setItem(dondeSeGuarda(quien), JSON.stringify(nuevas));
      } catch {
        // Sin almacenamiento se queda para esta sesión, y no se avisa: no es un
        // fallo que le importe a nadie.
      }
    },
    [quien],
  );

  const hacer = useCallback(
    (accion: Accion) => {
      if (accion.abre === 'buscador') {
        esqueleto.abrirElBuscador();
        return;
      }
      if (accion.abre === 'fogon') {
        esqueleto.abrirFogon();
        return;
      }
      navegar(accion.ir);
    },
    [navegar, esqueleto],
  );

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

      <Elegir
        abierta={eligiendo}
        alCerrar={() => {
          setEligiendo(false);
        }}
        puedo={puedo}
        elegidas={elegidas}
        alCambiar={guardar}
      />
    </div>
  );
}

/**
 * Elegir qué acciones quieres a mano.
 *
 * Se marcan y se desmarcan, y el orden es el del catálogo: no se arrastran. Un
 * arrastre dentro de una hoja, dentro de un widget que ya se arrastra en el Panel,
 * son dos arrastres anidados y ninguno de los dos se entendería.
 */
function Elegir({
  abierta,
  alCerrar,
  puedo,
  elegidas,
  alCambiar,
}: {
  readonly abierta: boolean;
  readonly alCerrar: () => void;
  readonly puedo: readonly Accion[];
  readonly elegidas: readonly string[];
  readonly alCambiar: (nuevas: readonly string[]) => void;
}) {
  const [enCurso, setEnCurso] = useState<readonly string[]>(elegidas);

  // Al abrirse se parte de lo que hay puesto, y no de lo que hubiera la última vez
  // que se abrió.
  useEffect(() => {
    if (abierta) setEnCurso(elegidas);
  }, [abierta, elegidas]);

  return (
    <Hoja
      abierta={abierta}
      alCerrar={alCerrar}
      titulo="Tus acciones rápidas"
      pie={
        <div className="flex flex-wrap gap-e2">
          <Boton tono="texto" onClick={alCerrar}>
            Dejarlo
          </Boton>
          <Boton
            tono="principal"
            onClick={() => {
              alCambiar(enCurso);
              alCerrar();
            }}
          >
            Guardar
          </Boton>
        </div>
      }
    >
      <div className="flex flex-col gap-e3">
        <p className="text-secundario text-texto-suave">
          Elige las que uses de verdad. Se guardan <strong>en este aparato</strong>: en el móvil de
          la cocina y en el ordenador de la oficina no se usan las mismas.
        </p>

        <ul className="flex flex-col gap-e1">
          {puedo.map((accion) => {
            const puesta = enCurso.includes(accion.id);
            return (
              <li key={accion.id}>
                <label
                  className={clases(
                    'flex min-h-toque cursor-pointer items-start gap-e3 rounded-medio p-e2',
                    puesta ? 'bg-naranja-suave' : 'hover:bg-fondo',
                  )}
                >
                  <input
                    type="checkbox"
                    checked={puesta}
                    onChange={() => {
                      setEnCurso(
                        puesta ? enCurso.filter((id) => id !== accion.id) : [...enCurso, accion.id],
                      );
                    }}
                    className="mt-[3px] size-[18px] shrink-0 accent-naranja"
                  />
                  <span className="mt-[2px] shrink-0 text-texto-suave">
                    <accion.icono size={18} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-cuerpo font-medium">{accion.nombre}</span>
                    <span className="block text-secundario text-texto-suave">{accion.queHace}</span>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      </div>
    </Hoja>
  );
}
