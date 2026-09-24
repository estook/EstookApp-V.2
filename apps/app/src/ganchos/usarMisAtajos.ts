import { useCallback, useMemo, useSyncExternalStore } from 'react';
import { puedeVer, type Permiso } from '@estook/permisos';
import { elPuestoDe } from '@estook/ui';
import {
  ACCIONES_DEL_PUESTO,
  accionPorId,
  accionesQuePuedo,
  type Accion,
} from '../acciones/catalogo.tsx';
import { usarSesion } from '../sesion/Sesion.tsx';

/**
 * Los atajos de cada persona: los del botón «+» y los del widget de acciones
 * rápidas, **la misma lista** (entrega O, mejora 6 · 0047).
 *
 * Eran dos cosas que respondían a lo mismo —«qué hago yo a menudo»— y se habrían
 * separado en cuanto alguien cambiara una. Ahora se cambia en cualquiera de los dos
 * sitios y vale en los dos, a la vez: por eso es un almacén con avisos y no un
 * `useState` en cada uno.
 *
 * ── Dónde se guarda, y por qué ahí ──────────────────────────────────────────
 *
 * En este aparato y **por persona**, con la misma clave que usaban las acciones
 * rápidas desde M6½, para que nadie pierda lo que ya tenía elegido. Lo que tienes a
 * mano en el móvil de la cocina no es lo del ordenador de la oficina, y un aparato
 * de cocina lo usan cuatro: cada uno se encuentra los suyos.
 *
 * Sin elegir nada, **los de su puesto** (`ACCIONES_DEL_PUESTO`), que es lo que le
 * falta a un cocinero el primer día.
 */
const oyentes = new Set<() => void>();

function dondeSeGuarda(personaId: string): string {
  return `estook.accesos-rapidos.${personaId}`;
}

function suscribirse(avisar: () => void): () => void {
  oyentes.add(avisar);
  // Y los cambios de otra pestaña del mismo navegador, que llegan por aquí.
  window.addEventListener('storage', avisar);
  return () => {
    oyentes.delete(avisar);
    window.removeEventListener('storage', avisar);
  };
}

/** El texto guardado tal cual: un texto es estable, una lista nueva en cada lectura no. */
function leerEnCrudo(personaId: string): string | null {
  try {
    return window.localStorage.getItem(dondeSeGuarda(personaId));
  } catch {
    return null;
  }
}

function comoLista(crudo: string | null): readonly string[] | null {
  if (crudo === null) return null;
  try {
    const lista: unknown = JSON.parse(crudo);
    if (!Array.isArray(lista)) return null;
    return lista.filter((id): id is string => typeof id === 'string');
  } catch {
    // Un JSON de una versión vieja: se cae a los de su puesto, nunca a una lista vacía.
    return null;
  }
}

export interface MisAtajos {
  /** Los elegidos que se pueden hacer, en su orden. */
  readonly atajos: readonly Accion[];
  /** Los identificadores elegidos, para el editor. */
  readonly elegidos: readonly string[];
  /** Todo lo que esta persona puede hacer, para elegir. */
  readonly puedo: readonly Accion[];
  readonly guardar: (nuevos: readonly string[]) => void;
  readonly volverALosDeMiPuesto: () => void;
}

export function usarMisAtajos(): MisAtajos {
  const { permisos, yo } = usarSesion();
  const quien = yo?.personaId ?? '';

  const crudo = useSyncExternalStore(suscribirse, () => leerEnCrudo(quien));

  const puedo = useMemo(() => accionesQuePuedo(permisos), [permisos]);
  const deMiPuesto = useMemo(
    () => ACCIONES_DEL_PUESTO[elPuestoDe((permiso: Permiso) => puedeVer(permisos, permiso))],
    [permisos],
  );
  const elegidos = useMemo(() => comoLista(crudo) ?? deMiPuesto, [crudo, deMiPuesto]);

  // Lo guardado puede nombrar una acción que ya no existe, o una para la que se ha
  // perdido el permiso desde la última vez: no sale.
  const atajos = useMemo(
    () =>
      elegidos
        .map((id) => accionPorId(id))
        .filter((accion): accion is Accion => accion !== undefined && puedo.includes(accion)),
    [elegidos, puedo],
  );

  const escribir = useCallback(
    (valor: string | null) => {
      try {
        if (valor === null) window.localStorage.removeItem(dondeSeGuarda(quien));
        else window.localStorage.setItem(dondeSeGuarda(quien), valor);
      } catch {
        // Sin almacenamiento, se queda como estaba: no es un fallo que importe.
      }
      for (const avisar of oyentes) avisar();
    },
    [quien],
  );

  return {
    atajos,
    elegidos,
    puedo,
    guardar: (nuevos) => {
      escribir(JSON.stringify(nuevos));
    },
    volverALosDeMiPuesto: () => {
      escribir(null);
    },
  };
}
