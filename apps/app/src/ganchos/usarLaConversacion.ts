import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { CREDITOS_DE_FOGON } from '@estook/dominio';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { usarSesion } from '../sesion/Sesion.tsx';
import { dondeEstas, type LoQueQueda, type RespuestaDeFogon } from '../fogon/contrato.ts';

/**
 * La conversación con Fogón (19-oct), compartida entre los mensajes (el cuerpo de la
 * ventana) y la caja de escribir (su pie): `fogon/HablarConFogon.tsx` las pinta.
 *
 * Vive en la pantalla y no en la base (0023): al cambiar de local, se va. Las dos
 * últimas idas y vueltas viajan con la pregunta para que Fogón siga el hilo.
 */

export interface Mensaje {
  readonly rol: 'user' | 'assistant';
  readonly texto: string;
  /** Un mensaje de Fogón que es un fallo: no viaja en el hilo. */
  readonly fallo?: true;
}

/** Cuántos mensajes de antes viajan con la pregunta: las dos últimas idas y vueltas. */
const DEL_HILO = 4;

/** El motivo de un fallo, en una frase: el «porqué» del servidor, o lo que pasa. */
function elPorque(error: ErrorDeLaApi): string {
  const porque = error.detalle?.['porque'];
  return typeof porque === 'string' && porque.trim() !== '' ? porque : error.quePasa;
}

export interface LaConversacion {
  readonly mensajes: readonly Mensaje[];
  readonly preguntando: boolean;
  readonly queda: LoQueQueda | null;
  readonly sinCreditos: boolean;
  preguntar(pregunta: string): Promise<void>;
}

/** La conversación entera, para que el cuerpo y el pie de la ventana la compartan. */
export function usarLaConversacion(quedaAlAbrir: LoQueQueda | null): LaConversacion {
  const { cliente, yo } = usarSesion();
  const { pathname } = useLocation();
  const cache = useQueryClient();
  const [mensajes, setMensajes] = useState<readonly Mensaje[]>([]);
  const [preguntando, setPreguntando] = useState(false);
  const [queda, setQueda] = useState(quedaAlAbrir);

  // Una conversación es de una persona y un local (0023, regla dos): al cambiar, se va.
  const localId = yo?.local?.id ?? null;
  useEffect(() => {
    setMensajes([]);
  }, [localId]);

  useEffect(() => {
    if (quedaAlAbrir !== null) setQueda(quedaAlAbrir);
  }, [quedaAlAbrir]);

  const gasta = CREDITOS_DE_FOGON.preguntar;
  const sinCreditos = queda !== null && (queda.hoy < gasta || queda.mes < gasta);

  async function preguntar(pregunta: string) {
    const escrita = pregunta.trim();
    if (escrita.length < 2 || preguntando || sinCreditos) return;
    setPreguntando(true);
    const antes = mensajes
      .filter((m) => m.fallo !== true)
      .slice(-DEL_HILO)
      .map(({ rol, texto }) => ({ rol, texto }));
    setMensajes((m) => [...m, { rol: 'user', texto: escrita }]);
    const respuesta = await cliente.ejecutar<RespuestaDeFogon>('preguntar_a_fogon', {
      pregunta: escrita,
      donde: dondeEstas(pathname),
      antes,
    });
    setPreguntando(false);
    if (!respuesta.ok) {
      const texto = elPorque(respuesta.error);
      setMensajes((m) => [...m, { rol: 'assistant', texto, fallo: true }]);
      return;
    }
    setMensajes((m) => [...m, { rol: 'assistant', texto: respuesta.datos.respuesta }]);
    setQueda(respuesta.datos.queda);
    void cache.invalidateQueries({ queryKey: ['fogon_y_yo'] });
  }

  return { mensajes, preguntando, queda, sinCreditos, preguntar };
}
