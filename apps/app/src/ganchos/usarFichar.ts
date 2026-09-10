import { useCallback, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { usarSesion } from '../sesion/Sesion.tsx';
import type { MiFichaje } from '../equipo/contrato.ts';

/**
 * Fichar, con la ubicación (M6½).
 *
 * ── La ubicación se pide siempre, y nunca bloquea ───────────────────────────
 *
 * «Añadir en fichar obligatorio pedir obtener ubicación para fichar.» Se pide
 * **siempre**, antes de mandar nada, y eso es la parte obligatoria.
 *
 * Y si el aparato no la da, **se ficha igual** y se apunta por qué no la había. Un
 * teléfono con el GPS apagado, un sótano sin señal o un permiso denegado hace seis
 * meses en otro navegador no pueden dejar a nadie sin poder entrar a su turno: eso
 * es lo que «nunca se bloquea a nadie por cuadrar» significa cuando lo que está en
 * juego es el registro horario de una persona.
 *
 * Rechazarlo, además, sale peor: lo que consigue es que la gente fiche desde el
 * ordenador de la oficina cuando el móvil no va, y entonces el dato es peor que no
 * tenerlo. Un dato que falta y se dice es un dato; un botón que no responde es un
 * problema.
 *
 * ── Los tres motivos, y por qué son tres y no un texto ──────────────────────
 *
 * Porque la pregunta que se hace después es «¿a cuánta gente le está fallando
 * esto?», y eso no se contesta con frases sueltas. El navegador distingue los tres
 * casos y se guardan tal cual:
 *
 *   `la_nego`              alguien dijo que no al permiso
 *   `sin_senal`            el aparato no ha conseguido situarse
 *   `no_la_da_el_aparato`  este navegador no tiene geolocalización
 *
 * ── Y por qué hay un tope de espera ────────────────────────────────────────
 *
 * Porque el GPS de un móvil dentro de una cocina puede tardar **medio minuto** o
 * no llegar nunca, y ese medio minuto lo pasa una persona mirando un botón que no
 * hace nada con el turno ya empezado. Ocho segundos y se ficha con lo que haya.
 */

/** Lo que se manda al servidor: la posición, o el motivo por el que no la hay. */
export type DondeEstoy =
  | { readonly donde: { latitud: number; longitud: number; precision?: number } }
  | { readonly sin_donde: 'la_nego' | 'sin_senal' | 'no_la_da_el_aparato' };

/** Cuánto se espera al GPS antes de fichar sin él. */
const ESPERA_AL_GPS = 8_000;

/**
 * Preguntar al navegador dónde está.
 *
 * **No lanza nunca.** Cualquier fallo es un motivo, porque el resultado de esta
 * función se usa para fichar y fichar no puede fallar por esto.
 */
export async function preguntarDondeEstoy(): Promise<DondeEstoy> {
  if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
    return { sin_donde: 'no_la_da_el_aparato' };
  }

  return new Promise<DondeEstoy>((resolver) => {
    let contestado = false;
    const contestar = (respuesta: DondeEstoy) => {
      if (contestado) return;
      contestado = true;
      resolver(respuesta);
    };

    // El reloj propio, además del `timeout` de la API: en algunos navegadores el
    // suyo no salta si el permiso se queda esperando una respuesta que nadie da.
    const reloj = setTimeout(() => {
      contestar({ sin_donde: 'sin_senal' });
    }, ESPERA_AL_GPS + 500);

    navigator.geolocation.getCurrentPosition(
      (posicion) => {
        clearTimeout(reloj);
        contestar({
          donde: {
            latitud: posicion.coords.latitude,
            longitud: posicion.coords.longitude,
            // `accuracy` puede venir como `NaN` en aparatos raros, y entonces no
            // se manda: un número que no es un número no dice nada.
            ...(Number.isFinite(posicion.coords.accuracy)
              ? { precision: Math.trunc(posicion.coords.accuracy) }
              : {}),
          },
        });
      },
      (fallo) => {
        clearTimeout(reloj);
        // 1 es PERMISSION_DENIED. Los otros dos —posición no disponible y tiempo
        // agotado— son lo mismo desde el punto de vista de quien ficha: no hay
        // señal.
        contestar({ sin_donde: fallo.code === 1 ? 'la_nego' : 'sin_senal' });
      },
      { enableHighAccuracy: true, timeout: ESPERA_AL_GPS, maximumAge: 30_000 },
    );
  });
}

export interface Fichar {
  readonly mio: MiFichaje | undefined;
  readonly cargando: boolean;
  /** Mientras se busca la ubicación y se manda. Es lo que dura el botón apagado. */
  readonly fichando: boolean;
  /** Qué está pasando, para decirlo en el botón: «Buscando dónde estás…». */
  readonly paso: 'quieto' | 'buscando_ubicacion' | 'apuntando';
  readonly error: ErrorDeLaApi | null;
  /** El último fichaje, para poder decir «fichado a las 09:12, en el local». */
  readonly acabaDe: { readonly entro: boolean; readonly metros: number | null } | null;
  readonly entrar: () => void;
  readonly salir: () => void;
  readonly olvidarElAviso: () => void;
}

export function usarFichar(): Fichar {
  const { cliente } = usarSesion();
  const cache = useQueryClient();
  const [paso, setPaso] = useState<Fichar['paso']>('quieto');
  const [error, setError] = useState<ErrorDeLaApi | null>(null);
  const [acabaDe, setAcabaDe] = useState<Fichar['acabaDe']>(null);

  const consulta = useQuery({
    queryKey: ['mi_fichaje'],
    queryFn: async (): Promise<MiFichaje> => {
      const respuesta = await cliente.consultar<MiFichaje>('mi_fichaje');
      if (!respuesta.ok) throw new Error(respuesta.error.codigo);
      return respuesta.datos;
    },
    // Un minuto: es lo que tarda en cambiar el «llevas 3 h 12 min» a los 13. Más
    // corto sería una peticion por minuto para mover un número, y más largo
    // dejaría el contador parado mientras alguien lo mira.
    staleTime: 60_000,
  });

  const fichar = useCallback(
    async (que: 'fichar_entrada' | 'fichar_salida') => {
      setError(null);
      setPaso('buscando_ubicacion');
      const donde = await preguntarDondeEstoy();

      setPaso('apuntando');
      const respuesta = await cliente.ejecutar<{
        metros: number | null;
        enElLocal: boolean | null;
      }>(que, donde);
      setPaso('quieto');

      if (!respuesta.ok) {
        setError(respuesta.error);
        return;
      }

      setAcabaDe({ entro: que === 'fichar_entrada', metros: respuesta.datos.metros });
      // Lo que cambia con un fichaje: lo mío, quién está trabajando y el resumen
      // del equipo. Las tres se piden desde sitios distintos, así que se invalidan
      // aquí y no en cada pantalla.
      await cache.invalidateQueries({ queryKey: ['mi_fichaje'] });
      await cache.invalidateQueries({ queryKey: ['fichajes_de_hoy'] });
      await cache.invalidateQueries({ queryKey: ['resumen_del_equipo'] });
      await cache.invalidateQueries({ queryKey: ['una_persona'] });
    },
    [cliente, cache],
  );

  return {
    mio: consulta.data,
    cargando: consulta.isPending,
    fichando: paso !== 'quieto',
    paso,
    error,
    acabaDe,
    entrar: () => {
      void fichar('fichar_entrada');
    },
    salir: () => {
      void fichar('fichar_salida');
    },
    olvidarElAviso: () => {
      setAcabaDe(null);
    },
  };
}
