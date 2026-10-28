import { describe, expect, it } from 'vitest';
import {
  comensales,
  cuantoLlevan,
  elAlergeno,
  euros,
  laHoraDeHoy,
  losCuartosDeAhora,
  losNombres,
} from './texto.ts';

describe('lo que se lee en la sala', () => {
  it('los euros sin símbolo, los minutos y los comensales', () => {
    expect(euros(12050)).toBe('120,50');
    expect(cuantoLlevan(34)).toBe('34 min');
    expect(cuantoLlevan(65)).toBe('1 h 05 min');
    expect(comensales(1)).toBe('1 comensal');
    expect(comensales(4)).toBe('4 comensales');
    expect(comensales(null)).toBeNull();
  });
});

describe('los alérgenos, como se dicen en el servicio (0117)', () => {
  it('con su nombre corto, y juntos con «y»', () => {
    expect(elAlergeno('frutos_de_cascara')).toBe('Frutos secos');
    expect(losNombres(['gluten'])).toBe('Gluten');
    expect(losNombres(['gluten', 'lacteos', 'huevos'])).toBe('Gluten, Lácteos y Huevo');
    expect(losNombres([])).toBe('');
  });
});

describe('la hora de lo de llevar programado (0121)', () => {
  const hhmm = (d: Date) =>
    `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

  it('los cuartos empiezan a 15 minutos o más, en punto de cuarto', () => {
    const ahora = new Date(2026, 9, 28, 20, 52, 30);
    expect(losCuartosDeAhora(ahora, 3).map(hhmm)).toEqual(['21:15', '21:30', '21:45']);
    expect(losCuartosDeAhora(new Date(2026, 9, 28, 20, 45), 1).map(hhmm)).toEqual(['21:00']);
  });

  it('una hora que ya ha pasado es de mañana', () => {
    const ahora = new Date(2026, 9, 28, 23, 50);
    expect(laHoraDeHoy('23:55', ahora)?.getDate()).toBe(28);
    expect(laHoraDeHoy('00:30', ahora)?.getDate()).toBe(29);
    expect(laHoraDeHoy('no', ahora)).toBeNull();
  });
});
