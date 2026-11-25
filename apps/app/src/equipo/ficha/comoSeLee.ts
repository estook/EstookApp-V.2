import { diasEnLetra, mesEnLetra, type SaldoDeVacaciones } from '@estook/dominio';

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

/** «Octubre 2026», como en la maqueta (las nóminas, 0153). */
export function mesConMayuscula(mes: string): string {
  const letra = mesEnLetra(mes).replace(' de ', ' ');
  return letra.charAt(0).toUpperCase() + letra.slice(1);
}

/** Los últimos meses, del más nuevo al más viejo, para elegir de qué mes es una nómina. */
export function losUltimosMeses(desde: string, cuantos: number): readonly string[] {
  const meses: string[] = [];
  let ano = Number(desde.slice(0, 4));
  let mes = Number(desde.slice(5, 7));
  for (let i = 0; i < cuantos; i++) {
    meses.push(`${String(ano)}-${String(mes).padStart(2, '0')}`);
    mes -= 1;
    if (mes === 0) {
      mes = 12;
      ano -= 1;
    }
  }
  return meses;
}

/** «2026-11» de hoy, en la hora de quien mira: solo para proponer. */
export function esteMes(): string {
  const hoy = new Date(Date.now());
  return `${String(hoy.getFullYear())}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
}
