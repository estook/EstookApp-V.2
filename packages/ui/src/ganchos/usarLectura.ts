import { useCallback, useEffect, useRef, useState } from 'react';
import type { ErrorDeLaApi } from '../componentes/Aviso.tsx';

/**
 * Lo que necesitan estas pantallas de la API. Se escribe aquí para no depender del cliente: Estook
 * y Estook TPV pasan cada uno el suyo, con su sesión.
 */
export type RespuestaDeLaApi<T> =
  { readonly ok: true; readonly datos: T } | { readonly ok: false; readonly error: ErrorDeLaApi };

export interface ClienteDeFacturas {
  consultar<T>(nombre: string, parametros?: Record<string, string>): Promise<RespuestaDeLaApi<T>>;
  ejecutar<T>(nombre: string, entrada: unknown): Promise<RespuestaDeLaApi<T>>;
}

/**
 * Leer algo de la API, y volver a leerlo. Si cambia lo que se pide mientras llega la respuesta, la
 * respuesta vieja no pisa la nueva. Cada `cadaMs` vuelve a mirar sin enseñar el «cargando»: lo que
 * está «Enviando» cambia solo.
 */
export function usarLectura<T>(
  leer: () => Promise<RespuestaDeLaApi<T>>,
  clave: string,
  cadaMs?: number,
): {
  readonly datos: T | undefined;
  readonly error: ErrorDeLaApi | null;
  readonly cargando: boolean;
  readonly otraVez: () => Promise<void>;
} {
  const [datos, setDatos] = useState<T | undefined>(undefined);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);
  const [cargando, setCargando] = useState(true);
  const lector = useRef(leer);
  lector.current = leer;
  const ultima = useRef(0);

  const otraVez = useCallback(async () => {
    ultima.current += 1;
    const esta = ultima.current;
    const r = await lector.current();
    if (esta !== ultima.current) return;
    setCargando(false);
    if (r.ok) {
      setDatos(r.datos);
      setError(null);
    } else {
      setError(r.error);
    }
  }, []);

  useEffect(() => {
    setCargando(true);
    void otraVez();
    if (cadaMs === undefined) return undefined;
    const reloj = window.setInterval(() => {
      void otraVez();
    }, cadaMs);
    return () => {
      window.clearInterval(reloj);
    };
  }, [clave, cadaMs, otraVez]);

  return { datos, error, cargando, otraVez };
}

/** Lo escrito, cuando se deja de escribir: una búsqueda por palabra, no una por tecla. */
export function usarConPausa(valor: string, ms = 300): string {
  const [conPausa, setConPausa] = useState(valor);
  useEffect(() => {
    const reloj = window.setTimeout(() => {
      setConPausa(valor);
    }, ms);
    return () => {
      window.clearTimeout(reloj);
    };
  }, [valor, ms]);
  return conPausa;
}
