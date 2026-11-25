import { diasEnLetra, type SaldoDeVacaciones } from '@estook/dominio';

/** Cómo se leen las cosas de la ficha del trabajador (la Ampliación 3, 0153). */

/** «12 mar 2024». */
export function fechaCorta(fecha: string): string {
  return new Date(`${fecha}T12:00:00Z`).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/** «12 de 30 disponibles», lo que se ve sin abrir «Vacaciones y solicitudes». */
export function resumenDeLasVacaciones(saldo: SaldoDeVacaciones | null): string {
  if (saldo === null) return 'Faltan los días al año';
  return `${diasEnLetra(saldo.disponibles)} de ${diasEnLetra(saldo.delAno + saldo.pendientes)} disponibles`;
}
