import { describe, expect, it } from 'vitest';
import { HORA_DE_CORTE_DE_FABRICA, horaDeCorteDelHorario, partirLaDireccion } from './google.ts';

describe('partir la dirección de Google (0142)', () => {
  it('pone cada trozo en su casilla', () => {
    expect(
      partirLaDireccion([
        { texto: '21', tipos: ['street_number'] },
        { texto: 'Calle Estafeta', tipos: ['route'] },
        { texto: 'Pamplona', tipos: ['locality', 'political'] },
        { texto: 'Navarra', tipos: ['administrative_area_level_2', 'political'] },
        { texto: 'Comunidad Foral de Navarra', tipos: ['administrative_area_level_1'] },
        { texto: '31001', tipos: ['postal_code'] },
      ]),
    ).toEqual({
      direccion: 'Calle Estafeta, 21',
      codigoPostal: '31001',
      poblacion: 'Pamplona',
      provincia: 'Navarra',
    });
  });

  it('sin número, la calle sola; sin provincia, la comunidad; lo que no llega, vacío', () => {
    expect(
      partirLaDireccion([
        { texto: 'Plaza Mayor', tipos: ['route'] },
        { texto: 'Madrid', tipos: ['administrative_area_level_1'] },
        { texto: '2800', tipos: ['postal_code'] },
      ]),
    ).toEqual({
      direccion: 'Plaza Mayor',
      codigoPostal: null,
      poblacion: null,
      provincia: 'Madrid',
    });
    expect(partirLaDireccion([])).toEqual({
      direccion: null,
      codigoPostal: null,
      poblacion: null,
      provincia: null,
    });
  });
});

describe('la hora de corte, sin preguntarla (0142)', () => {
  const tramo = (dia: number, abre: number, cierraDia: number, cierra: number) => ({
    abre: { dia, hora: abre, minuto: 0 },
    cierra: { dia: cierraDia, hora: cierra, minuto: 0 },
  });

  it('las cinco, de fábrica: sin horario, cerrando antes de medianoche o a la 1:30', () => {
    expect(horaDeCorteDelHorario(null)).toBe(HORA_DE_CORTE_DE_FABRICA);
    expect(horaDeCorteDelHorario([tramo(1, 13, 1, 16), tramo(1, 20, 1, 23)])).toBe('05:00');
    expect(
      horaDeCorteDelHorario([
        { abre: { dia: 5, hora: 20, minuto: 0 }, cierra: { dia: 6, hora: 1, minuto: 30 } },
      ]),
    ).toBe('05:00');
  });

  it('una noche que acaba a las seis corta a las siete', () => {
    expect(horaDeCorteDelHorario([tramo(6, 23, 0, 6), tramo(5, 23, 6, 4)])).toBe('07:00');
  });

  it('abierto las 24 horas, o un turno que acaba al mediodía siguiente, no mueven nada', () => {
    expect(horaDeCorteDelHorario([{ abre: { dia: 0, hora: 0, minuto: 0 }, cierra: null }])).toBe(
      '05:00',
    );
    expect(horaDeCorteDelHorario([tramo(1, 22, 2, 14)])).toBe('05:00');
  });
});
