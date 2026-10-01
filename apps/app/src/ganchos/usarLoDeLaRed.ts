import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { usarSesion } from '../sesion/Sesion.tsx';
import { CLAVE_DE_LA_CAMPANA, CLAVE_DE_MIS_AVISOS } from './usarLosAvisos.ts';
import { mandarLoPendiente } from '../sinConexion/cola.ts';
import { ponerAlDiaEsteMovil, ponerElNumeroDelIcono } from '../sinConexion/avisosAlMovil.ts';
import { alLlegarUnAviso } from '../sinConexion/trabajador.ts';
import { hayRed } from '../sinConexion/red.ts';
import { usarHayRed, usarLoPendiente } from './usarLaRed.ts';

/**
 * Lo de la red que va por detrás (I · 0070): mandar lo hecho sin señal en cuanto
 * vuelve, tener al día los avisos de este móvil, y la campana y el número del icono
 * cuando llega un aviso con la app abierta. Una vez, en el esqueleto.
 */
/** Cada cuánto se reintenta mandar lo pendiente, mientras lo haya. */
const REINTENTAR_MS = 30_000;

/** Lo que va por detrás: mandar lo pendiente y el móvil al día. Una vez, en el esqueleto. */
export function usarLoDeLaRed(): void {
  const { cliente, yo } = usarSesion();
  const cache = useQueryClient();
  const conRed = usarHayRed();
  const de = yo?.personaId ?? null;
  const { pendientes } = usarLoPendiente(de);
  const hayPendientes = pendientes.length > 0;

  // Mandar lo pendiente: al entrar, al volver la señal y, mientras haya, cada poco.
  useEffect(() => {
    if (de === null || !conRed) return;
    const mandar = async () => {
      const salidos = await mandarLoPendiente(cliente, de);
      // Lo que ha llegado cambia lo de hoy: fichajes, mermas, lo que hay.
      if (salidos > 0) await cache.invalidateQueries();
    };
    void mandar();
    if (!hayPendientes) return;
    const cada = setInterval(() => {
      if (hayRed()) void mandar();
    }, REINTENTAR_MS);
    return () => {
      clearInterval(cada);
    };
  }, [cliente, cache, de, conRed, hayPendientes]);

  // Los avisos del móvil, al día: si este móvil ya dijo que sí, que Estook lo tenga.
  const miMovil = useQuery({
    queryKey: ['mi_movil'],
    enabled: de !== null && yo?.esDemostracion !== true,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const respuesta = await cliente.consultar<{
        encendido: boolean;
        clavePublica: string | null;
      }>('mi_movil', {});
      if (!respuesta.ok) throw new Error(respuesta.error.codigo);
      return respuesta.datos;
    },
  });
  const clave = miMovil.data?.encendido === true ? miMovil.data.clavePublica : null;
  useEffect(() => {
    if (clave === null) return;
    void ponerAlDiaEsteMovil(cliente, clave).catch(() => undefined);
  }, [cliente, clave]);

  // Un aviso que llega con la app abierta pone la campana al día al momento.
  useEffect(
    () =>
      alLlegarUnAviso(() => {
        void cache.invalidateQueries({ queryKey: CLAVE_DE_LA_CAMPANA });
        void cache.invalidateQueries({ queryKey: CLAVE_DE_MIS_AVISOS });
      }),
    [cache],
  );
}

/** El número del icono de Estook, igual que el de la campana. */
export function usarElNumeroDelIcono(sinLeer: number): void {
  useEffect(() => {
    ponerElNumeroDelIcono(sinLeer);
  }, [sinLeer]);
}
