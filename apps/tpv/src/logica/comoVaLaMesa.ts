import type { CuentaEnElPlano, EstadoDeLaMesa } from '../datos/tipos.ts';
import { elPase } from './laCuenta.ts';

/**
 * **Lo que dice cada mesa en el plano** (la pausa del 5-nov, 0131), sin pintar nada: «Esperando
 * 12'», «Comiendo», «¿Cuenta? 31'». Lo usan la mesa del plano, lo de la barra y «Para cobrar».
 *
 * En la casilla del móvil la palabra y los minutos van en líneas distintas (`laPalabra` y
 * `losMinutos`): en un tercio de pantalla no caben juntos sin cortarse.
 */

/** «12'», «1 h 05'»: corto, que en una casilla de tres en fila no cabe «minutos». */
export function minutosCortos(minutos: number): string {
  if (minutos < 60) return `${String(minutos)}'`;
  return `${String(Math.floor(minutos / 60))} h ${String(minutos % 60).padStart(2, '0')}'`;
}

/** La palabra de cómo va: «Esperando», «Marchar 2.º», «Comiendo». */
export function laPalabra(estado: EstadoDeLaMesa, cuenta: CuentaEnElPlano): string {
  switch (estado) {
    case 'libre':
      return 'Libre';
    case 'toca_marchar':
      return cuenta.loSiguiente.que === 'marchar'
        ? `Marchar ${elPase(cuenta.loSiguiente.pase)}`
        : 'Marchar';
    case 'por_mandar':
      return 'Sin mandar';
    case 'sin_pedir':
      return 'Sin pedir';
    case 'esperando':
      return 'Esperando';
    case 'para_cobrar':
      return '¿Cuenta?';
    case 'comiendo':
      return cuenta.conComida === false ? 'Bebiendo' : 'Comiendo';
  }
}

/**
 * Los minutos de lo que dice, si los tiene: sin pedir, desde que se sentaron; esperando,
 * desde que la cocina lo recibió; para cobrar, desde lo último. Nulo en lo demás.
 */
export function losMinutos(estado: EstadoDeLaMesa, cuenta: CuentaEnElPlano): number | null {
  // Una API de antes no dice los minutos del estado: sin pedir, los de sentados, que son esos.
  if (estado === 'sin_pedir') return cuenta.minutosEnElEstado ?? cuenta.minutos;
  if (estado === 'esperando' || estado === 'para_cobrar') return cuenta.minutosEnElEstado ?? null;
  return null;
}

/** Lo que dice una cuenta, entero: «Esperando 12'». Para quien no ve, y donde cabe. */
export function loQueDice(estado: EstadoDeLaMesa, cuenta: CuentaEnElPlano): string {
  const minutos = losMinutos(estado, cuenta);
  const palabra = laPalabra(estado, cuenta);
  return minutos === null ? palabra : `${palabra} ${minutosCortos(minutos)}`;
}

/** **Más de seis horas abierta** (el rediseño, 0148; Richi, 18-nov: «con estar abierta más de 5-6
 * horas ya avisaría»): se quedó sin cobrar o sin cerrar. */
export const HORAS_PARA_AVISAR = 6;

/** Si la cuenta lleva abierta más de seis horas, desde que se sentaron. */
export function llevaDemasiado(cuenta: Pick<CuentaEnElPlano, 'minutos'> | null): boolean {
  return cuenta !== null && cuenta.minutos >= HORAS_PARA_AVISAR * 60;
}
