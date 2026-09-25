import { useId, useState, useSyncExternalStore } from 'react';
import { useNavigate } from 'react-router-dom';
import { NOMBRE_DEL_ESCALON, plural, type CosaDeHoy } from '@estook/dominio';
import { clases, usarEsEscritorio } from '@estook/ui';
import { IconoFlechaAbajo, IconoReloj } from '@estook/iconos';
import { usarLoDeHoy } from '../ganchos/usarLoDeHoy.ts';
import { usarSesion } from '../sesion/Sesion.tsx';

/**
 * Lo de hoy · la zona de atención del Panel, arriba y sin poder quitarse (entrega O,
 * mejora 8 · decisión 0047).
 *
 * «Un Hoy que junte caducidades, pedidos, turnos y caja.» No es un sitio nuevo: es
 * la zona de atención que ya describía Roles 1.2, **ordenada por el servidor** en
 * cinco escalones —lo que ya ha pasado, lo que cuesta dinero hoy, lo que tiene hora,
 * lo que hay que hacer, y mañana si hay que prepararlo—. Cada cosa lleva su botón.
 *
 * ── Poco, y lo que importa ───────────────────────────────────────────────────
 *
 * Se ven las cuatro primeras; el resto, con «Ver otras». Y **«Luego»** (el reloj)
 * aparta una cosa tres horas en este aparato: lo que se pospone vuelve, como pide el
 * plan, en vez de quedar escondido para siempre. Lo resuelto se va solo, porque la
 * lista la rehace el servidor cada vez.
 *
 * ── Plegado, y sin nada no está (Richi, 25-sep) ──────────────────────────────
 *
 * «Ocupa mucho espacio: más pequeño, sin tantos huecos, que se pueda desplegar y
 * que si no hay avisos no aparezca.» En su móvil, tres avisos se comían la pantalla
 * entera antes del primer widget. Ahora, en el móvil, sale plegado: una cabecera con
 * cuántas cosas hay y un punto de color por cada una, y debajo **solo la más
 * urgente**. Se abre tocando la cabecera, y se recuerda en el aparato.
 */
const CUANTAS_A_LA_VISTA = 4;
const LUEGO_MS = 3 * 60 * 60 * 1000;

const oyentes = new Set<() => void>();
function suscribirse(avisar: () => void): () => void {
  oyentes.add(avisar);
  return () => {
    oyentes.delete(avisar);
  };
}

function claveDe(personaId: string): string {
  return `estook.luego.${personaId}`;
}

function leerEnCrudo(personaId: string): string | null {
  try {
    return window.localStorage.getItem(claveDe(personaId));
  } catch {
    return null;
  }
}

function hastaCuando(crudo: string | null): Readonly<Record<string, number>> {
  if (crudo === null) return {};
  try {
    const leido: unknown = JSON.parse(crudo);
    return typeof leido === 'object' && leido !== null ? (leido as Record<string, number>) : {};
  } catch {
    return {};
  }
}

function apartar(personaId: string, id: string, ahora: number): void {
  const antes = hastaCuando(leerEnCrudo(personaId));
  // Lo que ya volvió se limpia al escribir: la lista no crece para siempre.
  const vivos = Object.fromEntries(Object.entries(antes).filter(([, hasta]) => hasta > ahora));
  try {
    window.localStorage.setItem(
      claveDe(personaId),
      JSON.stringify({ ...vivos, [id]: ahora + LUEGO_MS }),
    );
  } catch {
    // Sin almacenamiento no se puede apartar: se queda a la vista, que es lo seguro.
  }
  for (const avisar of oyentes) avisar();
}

const TONO_DEL_PUNTO: Readonly<Record<CosaDeHoy['tono'], string>> = {
  mal: 'bg-mal',
  atencion: 'bg-atencion',
  info: 'bg-info',
};

/**
 * Plegado o abierto, **por aparato**, y solo si la persona lo ha tocado: sin tocar,
 * en el móvil sale plegado —una línea con lo más urgente— y en una pantalla
 * grande, abierto, que ahí sobra sitio.
 */
const CLAVE_ABIERTO = 'estook.hoy.abierto';

function leerAbierto(): boolean | null {
  try {
    const valor = window.localStorage.getItem(CLAVE_ABIERTO);
    return valor === null ? null : valor === 'si';
  } catch {
    return null;
  }
}

function guardarAbierto(abierto: boolean): void {
  try {
    window.localStorage.setItem(CLAVE_ABIERTO, abierto ? 'si' : 'no');
  } catch {
    // Sin almacenamiento se abre y se pliega igual; solo no se recuerda.
  }
}

export function LoDeHoy() {
  const { yo } = usarSesion();
  const consulta = usarLoDeHoy();
  const enEscritorio = usarEsEscritorio();
  const [todas, setTodas] = useState(false);
  const [elegido, setElegido] = useState<boolean | null>(leerAbierto);
  const quien = yo?.personaId ?? '';
  const crudo = useSyncExternalStore(suscribirse, () => leerEnCrudo(quien));
  const idDeLaLista = useId();

  const cosas = consulta.data?.cosas;
  // Mientras carga o si no se ha podido leer, nada: el Panel no se llena de un
  // «cargando» ni de un error arriba del todo. Los widgets de debajo dicen lo suyo.
  if (cosas === undefined) return null;

  const ahora = Date.now();
  const apartadas = hastaCuando(crudo);
  const aLaVista = cosas.filter((cosa) => (apartadas[cosa.id] ?? 0) <= ahora);

  // Sin nada que atender, **nada**: ni la tarjeta ni un «nada urgente». Richi, 25-sep:
  // «si no hay avisos, que no aparezca». El Panel empieza por lo suyo.
  if (aLaVista.length === 0) return null;

  const plegable = aLaVista.length > 1;
  const abierto = !plegable || (elegido ?? enEscritorio);
  const lasQueSeVen = !abierto
    ? aLaVista.slice(0, 1)
    : todas
      ? aLaVista
      : aLaVista.slice(0, CUANTAS_A_LA_VISTA);
  const masAbajo = aLaVista.length - lasQueSeVen.length;

  return (
    <section
      aria-label="Hoy"
      className="overflow-hidden rounded-mayor border border-borde bg-superficie [box-shadow:var(--sombra-tarjeta)]"
    >
      {/*
        La cabecera entera abre y pliega: es el blanco más grande que hay, y es lo que
        se toca en una lista de avisos del iPhone o de Linear. Plegado dice cuántas
        cosas hay y enseña la primera, que es la más urgente (la ordena el servidor).
      */}
      {plegable ? (
        // El botón dentro del título, como el acordeón de WAI-ARIA: un título no
        // puede ir dentro de un botón.
        <h2 className="text-cuerpo font-semibold">
          <button
            type="button"
            aria-expanded={abierto}
            aria-controls={idDeLaLista}
            onClick={() => {
              guardarAbierto(!abierto);
              setElegido(!abierto);
            }}
            className="flex min-h-toque w-full items-center gap-e2 px-e4 pt-e1 text-left"
          >
            Hoy
            <span className="rounded-redondo bg-fondo px-e2 py-[1px] text-etiqueta font-semibold text-texto-suave">
              <span className="sr-only">, </span>
              {plural(aLaVista.length, 'cosa', 'cosas')}
            </span>
            <PuntosDeHoy cosas={aLaVista} />
            <span
              aria-hidden
              className={clases(
                'ml-auto grid size-8 place-items-center rounded-redondo text-texto-suave transition-transform duration-[--rapido]',
                abierto && 'rotate-180',
              )}
            >
              <IconoFlechaAbajo size={18} />
            </span>
          </button>
        </h2>
      ) : (
        <h2 className="px-e4 pt-e3 text-cuerpo font-semibold">Hoy</h2>
      )}

      <ul id={idDeLaLista} className="flex flex-col divide-y divide-borde px-e4 pb-e1">
        {lasQueSeVen.map((cosa) => (
          <FilaDeHoy key={cosa.id} cosa={cosa} quien={quien} />
        ))}
      </ul>

      {abierto && masAbajo > 0 && (
        <button
          type="button"
          onClick={() => {
            setTodas(true);
          }}
          className="min-h-toque w-full border-t border-borde px-e4 text-left text-secundario font-medium text-texto-suave hover:text-texto"
        >
          {`Ver ${plural(masAbajo, 'otra', 'otras')}`}
        </button>
      )}
    </section>
  );
}

/** Un punto por cosa, del color de su tono: lo que hay plegado se adivina sin abrir. */
function PuntosDeHoy({ cosas }: { readonly cosas: readonly CosaDeHoy[] }) {
  return (
    <span aria-hidden className="flex items-center gap-[3px]">
      {cosas.slice(0, 5).map((cosa) => (
        <span
          key={cosa.id}
          className={clases('size-[7px] rounded-redondo', TONO_DEL_PUNTO[cosa.tono])}
        />
      ))}
    </span>
  );
}

/**
 * Una cosa de hoy, en poco sitio: el punto, lo que pasa en una o dos líneas, el
 * detalle en una, y a la derecha su botón en píldora y «Luego» como un reloj —el
 * «posponer» de Gmail o de Recordatorios—. Cada blanco sigue midiendo 44 px; lo
 * que se ve es más pequeño.
 */
function FilaDeHoy({ cosa, quien }: { readonly cosa: CosaDeHoy; readonly quien: string }) {
  const navegar = useNavigate();
  return (
    <li className="flex items-center gap-e3 py-e2">
      <span
        aria-hidden
        className={clases('size-[8px] shrink-0 rounded-redondo', TONO_DEL_PUNTO[cosa.tono])}
      />
      <span className="min-w-0 flex-1">
        <span className="sr-only">{NOMBRE_DEL_ESCALON[cosa.escalon]}: </span>
        <span className="line-clamp-2 text-secundario font-medium leading-snug">{cosa.titulo}</span>
        {cosa.detalle !== null && (
          <span className="block truncate text-etiqueta text-texto-suave">{cosa.detalle}</span>
        )}
      </span>
      <span className="-mr-e2 flex shrink-0 items-center">
        {cosa.accion !== null && (
          <button
            type="button"
            onClick={() => {
              if (cosa.accion !== null) navegar(cosa.accion.ir);
            }}
            className="group inline-flex min-h-toque items-center px-e1"
          >
            <span className="whitespace-nowrap rounded-redondo bg-fondo px-e3 py-[6px] text-secundario font-semibold text-texto group-hover:bg-borde/60">
              {cosa.accion.texto}
            </span>
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            apartar(quien, cosa.id, Date.now());
          }}
          aria-label={`Recordarme «${cosa.titulo}» dentro de tres horas`}
          title="Luego (dentro de tres horas)"
          className="grid size-toque place-items-center rounded-redondo text-texto-tenue hover:text-texto"
        >
          <IconoReloj size={18} />
        </button>
      </span>
    </li>
  );
}
