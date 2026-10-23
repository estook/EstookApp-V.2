import { centimos, enEuros } from '@estook/dominio';

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

/** «1 persona», «4 personas». */
export function personas(cuantas: number | null): string | null {
  if (cuantas === null) return null;
  return cuantas === 1 ? '1 persona' : `${cuantas} personas`;
}
