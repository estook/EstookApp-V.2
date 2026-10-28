import { centimos, enEuros, esAlergeno, NOMBRE_CORTO_DEL_ALERGENO } from '@estook/dominio';

/** «12,50»: en la sala no hace falta el símbolo, se sabe que son euros. */
export function euros(cantidad: number): string {
  return enEuros(centimos(cantidad));
}

/** «12,50 €», para los totales. */
export function eurosConSimbolo(cantidad: number): string {
  return `${euros(cantidad)} €`;
}

/** «34 min», «1 h 05 min»: cuánto llevan sentados. */
export function cuantoLlevan(minutos: number): string {
  if (minutos < 60) return `${minutos} min`;
  const horas = Math.floor(minutos / 60);
  return `${horas} h ${String(minutos % 60).padStart(2, '0')} min`;
}

/**
 * «1 comensal», «4 comensales» (Richi, 28-oct): es la palabra de la sala, la que dice el
 * camarero, y no «personas» ni «¿cuántos sois?».
 */
export function comensales(cuantos: number | null): string | null {
  if (cuantos === null) return null;
  return cuantos === 1 ? '1 comensal' : `${cuantos} comensales`;
}

/** «21:33»: la hora del local en el aparato, para el ✓ de lo que salió (0117). */
export function laHora(cuando: string): string {
  return new Date(cuando).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

/** El nombre de servicio de un alérgeno: «Gluten», «Frutos secos» (0117). */
export function elAlergeno(codigo: string): string {
  return esAlergeno(codigo) ? NOMBRE_CORTO_DEL_ALERGENO[codigo] : codigo;
}

/** «Gluten y lácteos»: los alérgenos de una alergia o de un plato, para leerlos. */
export function losNombres(alergenos: readonly string[]): string {
  const nombres = alergenos.map(elAlergeno);
  if (nombres.length <= 1) return nombres.join('');
  return `${nombres.slice(0, -1).join(', ')} y ${nombres.at(-1) ?? ''}`;
}

/** Los siguientes `cuantos` cuartos de hora, empezando en el primero a 15 minutos o más. */
export function losCuartosDeAhora(ahora: Date, cuantos: number): Date[] {
  const primero = new Date(ahora.getTime() + 15 * 60_000);
  primero.setSeconds(0, 0);
  const resto = primero.getMinutes() % 15;
  if (resto !== 0) primero.setMinutes(primero.getMinutes() + 15 - resto);
  return Array.from({ length: cuantos }, (_, i) => new Date(primero.getTime() + i * 15 * 60_000));
}

/** «21:30» de hoy; si ya ha pasado, de mañana. Nulo si no es una hora. */
export function laHoraDeHoy(texto: string, ahora: Date): Date | null {
  const partes = /^(\d{2}):(\d{2})$/.exec(texto);
  if (partes === null) return null;
  const cuando = new Date(ahora);
  cuando.setHours(Number(partes[1]), Number(partes[2]), 0, 0);
  if (cuando.getTime() <= ahora.getTime()) cuando.setDate(cuando.getDate() + 1);
  return cuando;
}
