import { useSyncExternalStore } from 'react';
import { usarSesion } from '../sesion/Sesion.tsx';
import { usarLoDeHoy } from './usarLoDeHoy.ts';
import { hastaCuando, leerEnCrudo, suscribirse } from '../panel/LoDeHoy.tsx';

/**
 * Cuántas cosas de hoy hay a la vista (sin las apartadas con «Luego»): el número del botón «Hoy»
 * de la cabecera del Panel (el rediseño, entrega 3 · 0148).
 */
export function usarCuantasCosasHoy(): number {
  const { yo } = usarSesion();
  const consulta = usarLoDeHoy();
  const quien = yo?.personaId ?? '';
  const crudo = useSyncExternalStore(suscribirse, () => leerEnCrudo(quien));
  const cosas = consulta.data?.cosas ?? [];
  const ahora = Date.now();
  const apartadas = hastaCuando(crudo);
  return cosas.filter((cosa) => (apartadas[cosa.id] ?? 0) <= ahora).length;
}
