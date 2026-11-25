import { describe, expect, it } from 'vitest';
import {
  cuantoLleva,
  diaDelAno,
  diasEnLetra,
  dniEscondido,
  elSaldoDeVacaciones,
  esUnDniValido,
} from './ficha.ts';

describe('el saldo de vacaciones (0153, sección 4: lo calcula Estook, nunca la IA)', () => {
  it('el 24 de noviembre es el día 328 del año, y el 31 de diciembre de un bisiesto el 366', () => {
    expect(diaDelAno('2026-11-24')).toBe(328);
    expect(diaDelAno('2026-01-01')).toBe(1);
    expect(diaDelAno('2028-12-31')).toBe(366);
  });

  it('cuadra como la maqueta: 30 al año − 16 disfrutados − 2 aprobados = 12, y 26,96 devengados', () => {
    const saldo = elSaldoDeVacaciones({
      alAno: 30,
      incorporacion: '2024-03-12',
      hoy: '2026-11-24',
      pendientes: 0,
      disfrutadas: 16,
      aprobadas: 2,
    });
    expect(saldo).toEqual({
      alAno: 30,
      delAno: 30,
      proporcional: false,
      devengadas: 26.96,
      pendientes: 0,
      disfrutadas: 16,
      aprobadas: 2,
      disponibles: 12,
    });
  });

  it('si entró este año, las del año son proporcionales desde el día que entró', () => {
    // Del 1 de julio al 31 de diciembre de 2026: 184 días de 365.
    const saldo = elSaldoDeVacaciones({
      alAno: 30,
      incorporacion: '2026-07-01',
      hoy: '2026-07-31',
      pendientes: 0,
      disfrutadas: 0,
      aprobadas: 0,
    });
    expect(saldo?.proporcional).toBe(true);
    expect(saldo?.delAno).toBe(15.12);
    // Del 1 al 31 de julio: 31 días.
    expect(saldo?.devengadas).toBe(2.55);
    expect(saldo?.disponibles).toBe(15.12);
  });

  it('los días pendientes de años anteriores se suman a los disponibles', () => {
    const saldo = elSaldoDeVacaciones({
      alAno: 30,
      incorporacion: null,
      hoy: '2026-01-15',
      pendientes: 4,
      disfrutadas: 0,
      aprobadas: 0,
    });
    expect(saldo?.disponibles).toBe(34);
  });

  it('quien empieza el año que viene no tiene vacaciones este año', () => {
    const saldo = elSaldoDeVacaciones({
      alAno: 30,
      incorporacion: '2027-01-10',
      hoy: '2026-12-20',
      pendientes: 0,
      disfrutadas: 0,
      aprobadas: 0,
    });
    expect(saldo?.delAno).toBe(0);
    expect(saldo?.devengadas).toBe(0);
  });

  it('sin los días del contrato no hay saldo: no se enseña un cero que parezca un dato', () => {
    expect(
      elSaldoDeVacaciones({
        alAno: null,
        incorporacion: '2024-03-12',
        hoy: '2026-11-24',
        pendientes: 0,
        disfrutadas: 0,
        aprobadas: 0,
      }),
    ).toBeNull();
  });

  it('los días se leen con coma y sin ceros de más', () => {
    expect(diasEnLetra(26.96)).toBe('26,96');
    expect(diasEnLetra(12)).toBe('12');
    expect(diasEnLetra(2.5)).toBe('2,5');
  });
});

describe('lo demás de la ficha', () => {
  it('cuánto lleva en la empresa, con meses enteros', () => {
    expect(cuantoLleva('2024-03-12', '2026-11-24')).toBe('2 años y 8 meses');
    expect(cuantoLleva('2026-06-30', '2026-11-24')).toBe('4 meses');
    expect(cuantoLleva('2025-11-24', '2026-11-24')).toBe('1 año');
    expect(cuantoLleva('2026-11-20', '2026-11-24')).toBe('Menos de un mes');
    expect(cuantoLleva('2026-12-01', '2026-11-24')).toBe('Todavía no ha empezado');
  });

  it('el DNI escondido deja ver lo justo para reconocerlo', () => {
    expect(dniEscondido('12345482K')).toBe('•••• 482 K');
    expect(dniEscondido('X-1234567-L')).toBe('•••• 567 L');
  });

  it('un DNI o un NIE vale si su letra es la que toca', () => {
    expect(esUnDniValido('12345678Z')).toBe(true);
    expect(esUnDniValido('12345678A')).toBe(false);
    expect(esUnDniValido('X1234567L')).toBe(true);
    expect(esUnDniValido('Y1234567X')).toBe(true);
    expect(esUnDniValido('1234')).toBe(false);
  });
});
