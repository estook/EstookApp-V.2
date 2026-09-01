import { describe, expect, it } from 'vitest';
import {
  CORTE_POR_DEFECTO,
  diasEntre,
  estaVigente,
  fechaEnElLocal,
  fechaOperativa,
  horaDeCorte,
  jornadaDe,
  masDias,
} from './tiempo.ts';

const MADRID = 'Europe/Madrid';
const CANARIAS = 'Atlantic/Canary';

/** Un instante concreto, escrito en hora universal para que no haya dudas. */
const enUtc = (texto: string) => new Date(`${texto}Z`);

describe('la jornada de un instante', () => {
  it('a media tarde es el dia que parece', () => {
    // 18:00 en Madrid, en verano (UTC+2).
    expect(jornadaDe(enUtc('2026-07-15T16:00:00'), MADRID)).toBe('2026-07-15');
  });

  it('las copas de las dos de la manana son de la jornada de ayer', () => {
    // Sabado 02:30 en Madrid. Con corte a las 05:00, es la jornada del viernes.
    expect(jornadaDe(enUtc('2026-07-18T00:30:00'), MADRID)).toBe('2026-07-17');
  });

  it('justo en la hora de corte ya cuenta como el dia nuevo', () => {
    // 05:00 clavadas en Madrid, verano.
    expect(jornadaDe(enUtc('2026-07-18T03:00:00'), MADRID)).toBe('2026-07-18');
  });

  it('un minuto antes del corte todavia es ayer', () => {
    expect(jornadaDe(enUtc('2026-07-18T02:59:00'), MADRID)).toBe('2026-07-17');
  });

  it('respeta la hora de corte que ponga cada local', () => {
    const instante = enUtc('2026-07-18T01:00:00'); // 03:00 en Madrid
    expect(jornadaDe(instante, MADRID, horaDeCorte('02:00'))).toBe('2026-07-18');
    expect(jornadaDe(instante, MADRID, horaDeCorte('06:00'))).toBe('2026-07-17');
  });

  it('un local sin corte declarado corta a las cinco', () => {
    expect(CORTE_POR_DEFECTO).toBe('05:00');
  });

  it('cambia de mes y de ano sin liarse', () => {
    // 01:00 del 1 de enero en Madrid (invierno, UTC+1) es la jornada del 31.
    expect(jornadaDe(enUtc('2027-01-01T00:00:00'), MADRID)).toBe('2026-12-31');
  });
});

describe('la zona horaria del local', () => {
  it('Canarias va una hora por detras de la peninsula', () => {
    // 00:30 UTC: en Madrid son las 02:30 (jornada de ayer), en Canarias 01:30.
    const instante = enUtc('2026-07-18T00:30:00');
    expect(jornadaDe(instante, MADRID)).toBe('2026-07-17');
    expect(fechaEnElLocal(instante, MADRID)).toBe('2026-07-18');
    expect(fechaEnElLocal(instante, CANARIAS)).toBe('2026-07-18');
  });

  it('a las 23:30 de Canarias en Madrid ya es el dia siguiente', () => {
    // 22:30 UTC en julio: Madrid 00:30 del 19, Canarias 23:30 del 18.
    const instante = enUtc('2026-07-18T22:30:00');
    expect(fechaEnElLocal(instante, MADRID)).toBe('2026-07-19');
    expect(fechaEnElLocal(instante, CANARIAS)).toBe('2026-07-18');
  });

  it('avisa si la zona horaria no existe', () => {
    expect(() => jornadaDe(enUtc('2026-07-15T16:00:00'), 'Europa/Cuenca')).toThrow(
      /no es una zona horaria/i,
    );
  });
});

describe('el cambio de hora', () => {
  it('la noche en que se adelanta el reloj no pierde la jornada', () => {
    // Ultimo domingo de marzo de 2026: a las 02:00 se pasa a las 03:00.
    // 01:30 UTC son las 03:30 en Madrid, ya con el reloj adelantado.
    expect(jornadaDe(enUtc('2026-03-29T01:30:00'), MADRID)).toBe('2026-03-28');
    // Y a las 05:30 locales ya es la jornada nueva.
    expect(jornadaDe(enUtc('2026-03-29T03:30:00'), MADRID)).toBe('2026-03-29');
  });

  it('la noche en que se atrasa tampoco duplica el dia', () => {
    // Ultimo domingo de octubre de 2026: a las 03:00 se vuelve a las 02:00.
    // 00:30 UTC son las 02:30 locales (todavia en horario de verano).
    expect(jornadaDe(enUtc('2026-10-25T00:30:00'), MADRID)).toBe('2026-10-24');
    // 01:30 UTC son las 02:30 locales otra vez (ya en horario de invierno).
    expect(jornadaDe(enUtc('2026-10-25T01:30:00'), MADRID)).toBe('2026-10-24');
    // Y a las 06:00 locales, jornada nueva.
    expect(jornadaDe(enUtc('2026-10-25T05:00:00'), MADRID)).toBe('2026-10-25');
  });
});

describe('cuentas con fechas', () => {
  it('suma y resta dias, cruzando meses', () => {
    expect(masDias(fechaOperativa('2026-01-31'), 1)).toBe('2026-02-01');
    expect(masDias(fechaOperativa('2026-03-01'), -1)).toBe('2026-02-28');
    expect(masDias(fechaOperativa('2028-03-01'), -1)).toBe('2028-02-29');
  });

  it('cuenta los dias entre dos fechas', () => {
    expect(diasEntre(fechaOperativa('2026-01-01'), fechaOperativa('2026-01-31'))).toBe(30);
    expect(diasEntre(fechaOperativa('2026-01-31'), fechaOperativa('2026-01-01'))).toBe(-30);
  });

  it('dice si algo esta vigente, con fin o sin el', () => {
    const desde = fechaOperativa('2026-01-01');
    const hasta = fechaOperativa('2026-06-30');
    expect(estaVigente(fechaOperativa('2026-03-15'), desde, hasta)).toBe(true);
    expect(estaVigente(fechaOperativa('2026-07-01'), desde, hasta)).toBe(false);
    expect(estaVigente(fechaOperativa('2025-12-31'), desde, hasta)).toBe(false);
    expect(estaVigente(fechaOperativa('2030-01-01'), desde, null)).toBe(true);
  });

  it('rechaza lo que no es una fecha ni una hora', () => {
    expect(() => fechaOperativa('1 de enero')).toThrow(/no es una fecha/i);
    expect(() => horaDeCorte('25:00')).toThrow(/no es una hora de corte/i);
  });
});
