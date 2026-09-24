import { useState, useSyncExternalStore } from 'react';
import { useNavigate } from 'react-router-dom';
import { NOMBRE_DEL_ESCALON, type CosaDeHoy } from '@estook/dominio';
import { Boton, Tarjeta, clases } from '@estook/ui';
import { IconoBien } from '@estook/iconos';
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
 * Se ven las cuatro primeras; el resto, con «Ver todo». Y **«Luego»** aparta una
 * cosa tres horas en este aparato: lo que se pospone vuelve, como pide el plan, en
 * vez de quedar escondido para siempre. Lo resuelto se va solo, porque la lista la
 * rehace el servidor cada vez.
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

export function LoDeHoy() {
  const { yo } = usarSesion();
  const consulta = usarLoDeHoy();
  const navegar = useNavigate();
  const [todas, setTodas] = useState(false);
  const quien = yo?.personaId ?? '';
  const crudo = useSyncExternalStore(suscribirse, () => leerEnCrudo(quien));

  const cosas = consulta.data?.cosas;
  // Mientras carga o si no se ha podido leer, nada: el Panel no se llena de un
  // «cargando» ni de un error arriba del todo. Los widgets de debajo dicen lo suyo.
  if (cosas === undefined) return null;

  const ahora = Date.now();
  const apartadas = hastaCuando(crudo);
  const aLaVista = cosas.filter((cosa) => (apartadas[cosa.id] ?? 0) <= ahora);

  if (aLaVista.length === 0) {
    return (
      <p className="flex items-center gap-e2 text-secundario text-texto-suave">
        <span className="text-bien">
          <IconoBien size={16} />
        </span>
        Nada urgente por hoy.
      </p>
    );
  }

  const lasQueSeVen = todas ? aLaVista : aLaVista.slice(0, CUANTAS_A_LA_VISTA);

  return (
    <Tarjeta titulo="Hoy">
      <ul className="flex flex-col divide-y divide-borde">
        {lasQueSeVen.map((cosa) => (
          <li key={cosa.id} className="flex items-center gap-e3 py-e2">
            <span
              aria-hidden
              className={clases('size-[10px] shrink-0 rounded-redondo', TONO_DEL_PUNTO[cosa.tono])}
            />
            <span className="min-w-0 flex-1">
              <span className="sr-only">{NOMBRE_DEL_ESCALON[cosa.escalon]}: </span>
              <span className="block font-medium">{cosa.titulo}</span>
              {cosa.detalle !== null && (
                <span className="block text-secundario text-texto-suave">{cosa.detalle}</span>
              )}
            </span>
            <span className="flex shrink-0 flex-col items-end gap-e1 sm:flex-row sm:items-center">
              {cosa.accion !== null && (
                <Boton
                  tono="secundario"
                  onClick={() => {
                    if (cosa.accion !== null) navegar(cosa.accion.ir);
                  }}
                >
                  {cosa.accion.texto}
                </Boton>
              )}
              <button
                type="button"
                onClick={() => {
                  apartar(quien, cosa.id, Date.now());
                }}
                aria-label={`Recordarme «${cosa.titulo}» dentro de tres horas`}
                className="min-h-toque px-e2 text-secundario text-texto-suave hover:text-texto"
              >
                Luego
              </button>
            </span>
          </li>
        ))}
      </ul>
      {aLaVista.length > CUANTAS_A_LA_VISTA && (
        <div className="mt-e2">
          <Boton
            tono="texto"
            onClick={() => {
              setTodas(!todas);
            }}
          >
            {todas ? 'Ver menos' : `Ver todo (${String(aLaVista.length)})`}
          </Boton>
        </div>
      )}
    </Tarjeta>
  );
}
