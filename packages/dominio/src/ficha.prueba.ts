import { describe, expect, it } from 'vitest';
import {
  cuantoLleva,
  diaDelAno,
  diasDeLaSemanaEnLetra,
  diasDeVacaciones,
  diasEnLetra,
  dniEscondido,
  elSaldoDeVacaciones,
  esUnDniValido,
  loDeUnAno,
  losDiasQueSueleLibrar,
  type DiaDelHorario,
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

describe('los días de vacaciones que cuentan (Richi, 26-nov: naturales todo; laborables, sin sus descansos)', () => {
  it('los días que libra, como se leen', () => {
    expect(diasDeLaSemanaEnLetra([2, 1])).toBe('lunes y martes');
    expect(diasDeLaSemanaEnLetra([1, 2, 7])).toBe('lunes, martes y domingo');
    expect(diasDeLaSemanaEnLetra([3])).toBe('miércoles');
  });

  it('en naturales cuenta todo, también el día libre que cae dentro', () => {
    // Del lunes 30 de noviembre al domingo 13 de diciembre: dos semanas.
    expect(diasDeVacaciones('2026-11-30', '2026-12-13', null)).toBe(14);
  });

  it('en laborables no cuentan los días que esa persona suele librar, sean los que sean', () => {
    // Laura libra lunes y martes: dos semanas son 10 días, no 12 (lo que contaba quitar el domingo).
    expect(diasDeVacaciones('2026-11-30', '2026-12-13', [1, 2])).toBe(10);
    // Quien libra el domingo y el lunes, igual de días, distintos.
    expect(diasDeVacaciones('2026-11-30', '2026-12-13', [7, 1])).toBe(10);
    // Unas fechas que son solo sus días libres no cuentan nada.
    expect(diasDeVacaciones('2026-11-30', '2026-12-01', [1, 2])).toBe(0);
  });

  it('lo ya disfrutado y lo que queda, con los días que libraba al pedirlas', () => {
    expect(loDeUnAno('2026-11-30', '2026-12-13', 2026, '2026-12-07', [1, 2])).toEqual({
      disfrutadas: 5,
      porDisfrutar: 5,
    });
  });
});

describe('qué días suele librar alguien, sacado de su horario publicado', () => {
  /** Semanas desde el lunes dado en las que trabaja los días de `trabaja` (1 = lunes). */
  function semanas(lunes: readonly string[], trabaja: readonly number[][]): DiaDelHorario[] {
    const dias: DiaDelHorario[] = [];
    lunes.forEach((l, i) => {
      for (let d = 1; d <= 7; d += 1) {
        const dia = new Date(Date.parse(`${l}T12:00:00Z`) + (d - 1) * 86_400_000)
          .toISOString()
          .slice(0, 10);
        dias.push({ dia, tipo: (trabaja[i] ?? []).includes(d) ? 'trabajo' : 'libre' });
      }
    });
    return dias;
  }
  const tres = ['2026-11-02', '2026-11-09', '2026-11-16'];

  it('quien trabaja de miércoles a domingo, libra lunes y martes', () => {
    const horario = semanas(tres, [
      [3, 4, 5, 6, 7],
      [3, 4, 5, 6, 7],
      [3, 4, 5, 6, 7],
    ]);
    expect(losDiasQueSueleLibrar(horario)).toEqual([1, 2]);
  });

  it('una semana distinta no cambia la costumbre', () => {
    const horario = semanas(tres, [
      [3, 4, 5, 6, 7],
      [1, 4, 5, 6, 7],
      [3, 4, 5, 6, 7],
    ]);
    expect(losDiasQueSueleLibrar(horario)).toEqual([1, 2]);
  });

  it('si los descansos cambian cada semana, no hay costumbre: se le pregunta', () => {
    const horario = semanas(tres, [
      [3, 4, 5, 6, 7],
      [1, 2, 5, 6, 7],
      [1, 2, 3, 4, 7],
    ]);
    expect(losDiasQueSueleLibrar(horario)).toBeNull();
  });

  it('con una sola semana no se sabe, y la semana con vacaciones no cuenta', () => {
    expect(losDiasQueSueleLibrar(semanas(['2026-11-02'], [[3, 4, 5, 6, 7]]))).toBeNull();
    const conVacaciones = semanas(tres, [[3, 4, 5, 6, 7], [3, 4, 5, 6, 7], []]).map((d) =>
      d.dia >= '2026-11-16' ? { ...d, tipo: 'vacaciones' as const } : d,
    );
    expect(losDiasQueSueleLibrar(conVacaciones)).toEqual([1, 2]);
    expect(
      losDiasQueSueleLibrar(
        semanas(tres, [[3, 4, 5, 6, 7], [], []]).map((d) =>
          d.dia >= '2026-11-09' ? { ...d, tipo: 'vacaciones' as const } : d,
        ),
      ),
    ).toBeNull();
  });
});
