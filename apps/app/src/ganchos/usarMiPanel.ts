import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  PANEL_DE_FABRICA,
  loQueSePuedePintar,
  usarEsEscritorio,
  widgetPorId,
  type TamanoDeWidget,
  type WidgetPuesto,
} from '@estook/ui';
import type { PermisoDeApp } from '@estook/permisos';
import { puedeVer } from '@estook/permisos';
import { usarSesion } from '../sesion/Sesion.tsx';

/**
 * El Panel de esta persona en este aparato: cargarlo, tocarlo y guardarlo.
 *
 * ── Por qué se guarda con retraso y no en cada gesto ─────────────────────────
 *
 * Arrastrar un widget de una esquina a otra son **veinte reordenaciones**, porque
 * el orden cambia cada vez que el dedo pasa por encima de otro. Guardar cada una
 * serían veinte comandos, veinte filas de idempotencia y veinte subidas de
 * versión, para acabar en el mismo sitio.
 *
 * Así que la pantalla se mueve al momento y el servidor se entera **ochocientos
 * milisegundos después de la última vez que se toca algo**. Es la única parte de
 * Estook que escribe así, y se puede porque lo que se guarda no es un dato del
 * negocio: si se pierde el último gesto por cerrar la aplicación en ese instante,
 * lo que pasa es que un widget se queda donde estaba.
 *
 * ── Y por qué la versión se lleva en una referencia ──────────────────────────
 *
 * Porque cada guardado devuelve una versión nueva, y el siguiente la necesita. Si
 * viviera en el estado de React, dos guardados seguidos mandarían la misma y el
 * segundo se llevaría un «lo cambió otra persona» contra sí mismo.
 */
export interface MiPanel {
  readonly puestos: readonly WidgetPuesto[];
  readonly cargando: boolean;
  readonly guardando: boolean;
  /** Si el servidor dice que otro aparato lo cambió mientras tanto. */
  readonly loCambioOtroAparato: boolean;
  readonly reordenar: (puestos: readonly WidgetPuesto[]) => void;
  readonly anadir: (id: string) => void;
  readonly quitar: (id: string) => void;
  readonly cambiarTamano: (id: string, tamano: TamanoDeWidget) => void;
  /** Vuelve al Panel de fábrica del rol. */
  readonly volverAlDeFabrica: () => void;
  readonly recargar: () => void;
}

const ESPERA_ANTES_DE_GUARDAR = 800;

export function usarMiPanel(): MiPanel {
  const { cliente, permisos } = usarSesion();
  const esEscritorio = usarEsEscritorio();
  const aparato = esEscritorio ? 'escritorio' : 'movil';

  const tienePermiso = useCallback(
    (permiso: PermisoDeApp) => puedeVer(permisos, permiso),
    [permisos],
  );

  const consulta = useQuery({
    queryKey: ['mi_panel', aparato],
    queryFn: async (): Promise<{ widgets: WidgetPuesto[] | null; version: number }> => {
      const respuesta = await cliente.consultar<{
        widgets: readonly { id: string; tamano: string }[] | null;
        version: number;
      }>('mi_panel', { aparato });
      if (!respuesta.ok) throw new Error(respuesta.error.codigo);
      return {
        widgets:
          respuesta.datos.widgets === null
            ? null
            : respuesta.datos.widgets.map((p) => ({
                id: p.id,
                tamano: p.tamano as TamanoDeWidget,
              })),
        version: respuesta.datos.version,
      };
    },
  });

  const [puestos, setPuestos] = useState<readonly WidgetPuesto[] | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [loCambioOtroAparato, setLoCambioOtroAparato] = useState(false);
  const version = useRef(0);
  const reloj = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Lo que dice el servidor manda **la primera vez, y en cada recarga**. Después
  // manda lo que se está tocando: si no, cada refresco de la caché devolvería los
  // widgets a donde estaban antes del último arrastre.
  useEffect(() => {
    const datos = consulta.data;
    if (datos === undefined) return;
    version.current = datos.version;
    // Nulo quiere decir «nunca lo ha tocado», que es distinto de «lo ha vaciado»:
    // lo primero se rellena con el de fábrica, lo segundo se respeta vacío.
    const deFabrica = datos.widgets ?? PANEL_DE_FABRICA;
    setPuestos(loQueSePuedePintar(deFabrica, tienePermiso));
  }, [consulta.data, tienePermiso]);

  const guardar = useCallback(
    (nuevos: readonly WidgetPuesto[]) => {
      if (reloj.current !== null) clearTimeout(reloj.current);
      reloj.current = setTimeout(() => {
        void (async () => {
          setGuardando(true);
          const respuesta = await cliente.ejecutar<{ version: number }>('guardar_mi_panel', {
            aparato,
            widgets: nuevos.map((p) => ({ id: p.id, tamano: p.tamano })),
            version: version.current,
          });
          setGuardando(false);

          if (respuesta.ok) {
            version.current = respuesta.datos.version;
            setLoCambioOtroAparato(false);
            return;
          }
          // «Lo cambió otra persona» aquí quiere decir «lo cambiaste tú en el
          // otro aparato». Se dice, y no se pisa nada: lo que hay en el servidor
          // se queda como está hasta que se recargue a propósito.
          if (respuesta.error.codigo === 'lo_cambio_otra_persona') setLoCambioOtroAparato(true);
        })();
      }, ESPERA_ANTES_DE_GUARDAR);
    },
    [cliente, aparato],
  );

  // Al desmontar, lo que estuviera esperando no se pierde en silencio: se cancela
  // el reloj para no escribir después de irse, que es lo que provoca el aviso de
  // React sobre estado en un componente desmontado.
  useEffect(
    () => () => {
      if (reloj.current !== null) clearTimeout(reloj.current);
    },
    [],
  );

  const cambiar = useCallback(
    (nuevos: readonly WidgetPuesto[]) => {
      setPuestos(nuevos);
      guardar(nuevos);
    },
    [guardar],
  );

  const anadir = useCallback(
    (id: string) => {
      const widget = widgetPorId(id);
      if (widget === undefined) return;
      const tamano = widget.tamanos[0] ?? 'ancho';
      cambiar([...(puestos ?? []), { id, tamano }]);
    },
    [puestos, cambiar],
  );

  const quitar = useCallback(
    (id: string) => {
      cambiar((puestos ?? []).filter((p) => p.id !== id));
    },
    [puestos, cambiar],
  );

  const cambiarTamano = useCallback(
    (id: string, tamano: TamanoDeWidget) => {
      cambiar((puestos ?? []).map((p) => (p.id === id ? { id: p.id, tamano } : p)));
    },
    [puestos, cambiar],
  );

  const volverAlDeFabrica = useCallback(() => {
    cambiar(loQueSePuedePintar(PANEL_DE_FABRICA, tienePermiso));
  }, [cambiar, tienePermiso]);

  const recargar = useCallback(() => {
    setLoCambioOtroAparato(false);
    void consulta.refetch();
  }, [consulta]);

  return {
    puestos: puestos ?? [],
    cargando: consulta.isPending && puestos === null,
    guardando,
    loCambioOtroAparato,
    reordenar: cambiar,
    anadir,
    quitar,
    cambiarTamano,
    volverAlDeFabrica,
    recargar,
  };
}
