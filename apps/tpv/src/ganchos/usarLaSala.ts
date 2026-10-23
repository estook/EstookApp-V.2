import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { escucharAlSegundo, haySegundo } from '@estook/cliente-api/al-segundo';
import { usarSesion } from '../sesion/Sesion.tsx';
import type { ElPlano, LaCartaDeLaSala, LaMesa } from '../datos/tipos.ts';

/**
 * Lo que la sala lee de la API y cómo se mantiene al día (0106).
 *
 * **Al segundo**: lo que cambia una mesa (la cocina tacha el último del 1.º, otro
 * camarero pide) llega como un toque por Supabase Realtime, y la pantalla vuelve a
 * preguntar. Sin el toque —sin red buena, sin Supabase en esta construcción— pregunta
 * cada pocos segundos. Con él, una vez por minuto por si acaso: una tablet preguntando
 * cada cinco segundos todo el servicio gastaría medio plan de Supabase al mes.
 */

const DONDE = {
  direccion: (import.meta.env['VITE_SUPABASE_URL'] as string | undefined) ?? '',
  clavePublica: (import.meta.env['VITE_SUPABASE_ANON_KEY'] as string | undefined) ?? '',
};

const CADA_POCO = 8_000;
const POR_SI_ACASO = 60_000;

/** Lo que manda el servidor en el toque de la sala: `servicio:<local>`. */
function esDelServicio(canal: string): boolean {
  return canal.startsWith('servicio:');
}

/**
 * Escucha los toques de la sala mientras Estook TPV está abierto. Dice si llegan. Se
 * llama **una vez**, arriba (`ConElSegundo`): cada pantalla lo lee con `usarAlSegundo`,
 * y entrar y salir de una mesa no vuelve a conectar.
 */
export function usarEscucharAlSegundo(): boolean {
  const { cliente } = usarSesion();
  const cache = useQueryClient();
  const [conectado, setConectado] = useState(false);

  useEffect(() => {
    if (!haySegundo(DONDE)) return undefined;
    let escucha: { parar(): void } | null = null;
    const estado = { parado: false };
    void (async () => {
      // El tema es el del chat: uno por persona, secreto, y ya existe (0073).
      const respuesta = await cliente.ejecutar<{ tema: string }>('abrir_el_chat', {});
      if (!respuesta.ok || estado.parado) return;
      escucha = escucharAlSegundo(
        DONDE,
        respuesta.datos.tema,
        (canal) => {
          if (!esDelServicio(canal)) return;
          void cache.invalidateQueries({ queryKey: ['sala'] });
        },
        setConectado,
      );
    })();
    return () => {
      estado.parado = true;
      escucha?.parar();
    };
  }, [cliente, cache]);

  return conectado;
}

export const ContextoAlSegundo = createContext(false);

/** Si los toques llegan, para preguntar menos (`cadaCuanto`). */
export function usarAlSegundo(): boolean {
  return useContext(ContextoAlSegundo);
}

function cadaCuanto(conectado: boolean): number {
  return conectado ? POR_SI_ACASO : CADA_POCO;
}

async function leer<T>(
  cliente: ReturnType<typeof usarSesion>['cliente'],
  nombre: string,
  parametros: Record<string, string> = {},
): Promise<T> {
  const respuesta = await cliente.consultar<T>(nombre, parametros);
  if (!respuesta.ok) throw new FalloDeLaSala(respuesta.error);
  return respuesta.datos;
}

/** El fallo de la API, con lo que hay que decirle a la persona. */
export class FalloDeLaSala extends Error {
  constructor(readonly error: ErrorDeLaApi) {
    super(error.codigo);
  }
}

export function usarElPlano(conectado: boolean) {
  const { cliente } = usarSesion();
  return useQuery({
    queryKey: ['sala', 'el_plano'],
    queryFn: () => leer<ElPlano>(cliente, 'el_plano'),
    refetchInterval: cadaCuanto(conectado),
  });
}

export function usarLaMesa(cuentaId: string, conectado: boolean) {
  const { cliente } = usarSesion();
  return useQuery({
    queryKey: ['sala', 'la_mesa', cuentaId],
    queryFn: () => leer<LaMesa>(cliente, 'la_mesa', { cuenta_id: cuentaId }),
    refetchInterval: cadaCuanto(conectado),
  });
}

/** La carta cambia poco: cada dos minutos, para que un agotado se apague solo. */
export function usarLaCarta() {
  const { cliente } = usarSesion();
  return useQuery({
    queryKey: ['carta_de_la_sala'],
    queryFn: () => leer<LaCartaDeLaSala>(cliente, 'la_carta_de_la_sala'),
    staleTime: 60_000,
    refetchInterval: 120_000,
  });
}

export type Resultado<T> =
  | { readonly ok: true; readonly datos: T }
  | {
      readonly ok: false;
      readonly error: ErrorDeLaApi;
    };

/**
 * Los comandos de la sala. Cada uno, al acabar bien, vuelve a leer la sala: lo que se
 * ve después es lo que dice la API, no lo que la pantalla supone.
 */
export function usarAcciones() {
  const { cliente } = usarSesion();
  const cache = useQueryClient();
  return useCallback(
    async <T>(nombre: string, entrada: unknown, clave?: string): Promise<Resultado<T>> => {
      const respuesta = await cliente.ejecutar<T>(
        nombre,
        entrada,
        clave === undefined ? {} : { claveDeIdempotencia: clave },
      );
      if (respuesta.ok) await cache.invalidateQueries({ queryKey: ['sala'] });
      return respuesta.ok
        ? { ok: true, datos: respuesta.datos }
        : { ok: false, error: respuesta.error };
    },
    [cliente, cache],
  );
}
