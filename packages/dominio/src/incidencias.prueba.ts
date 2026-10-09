import { describe, expect, it } from 'vitest';
import {
  cuantasPorGrupo,
  cuantoTarde,
  cuentaEnLaCifra,
  grupoDeLaIncidencia,
  laJustificacionPideNota,
  loQuePaso,
  seJustifica,
  TIPOS_DE_INCIDENCIA,
} from './incidencias.ts';

describe('las incidencias del equipo (0081)', () => {
  it('cada tipo cae en un grupo de la pantalla', () => {
    expect(TIPOS_DE_INCIDENCIA.map(grupoDeLaIncidencia)).toEqual([
      'faltas',
      'retrasos',
      'fichajes',
      'fichajes',
      'fichajes',
      'fichajes',
    ]);
  });

  it('se justifica no venir y llegar tarde; un fichaje raro se corrige', () => {
    expect(TIPOS_DE_INCIDENCIA.filter(seJustifica)).toEqual(['falta', 'retraso']);
  });

  it('«otro motivo» pide decir cuál', () => {
    expect(laJustificacionPideNota('otro')).toBe(true);
    expect(laJustificacionPideNota('enfermedad')).toBe(false);
  });

  it('dice qué pasó en una línea, sin repetir la etiqueta', () => {
    expect(loQuePaso({ tipo: 'falta', entra: '10:00', sale: '16:00' })).toBe(
      'Turno de 10:00 a 16:00, sin fichar',
    );
    expect(loQuePaso({ tipo: 'retraso', minutosTarde: 12, entra: '10:00' })).toBe(
      '12 min tarde · entraba a las 10:00',
    );
    expect(loQuePaso({ tipo: 'sin_cerrar', fichoA: '09:58' })).toBe(
      'Entró a las 09:58 y no fichó la salida',
    );
    expect(loQuePaso({ tipo: 'lejos', metros: 1250 })).toBe('A 1,3 km del local');
    expect(loQuePaso({ tipo: 'lejos', metros: 850 })).toBe('A 850 m del local');
  });

  it('lo tarde se dice en horas a partir de una', () => {
    expect(cuantoTarde(6)).toBe('6 min');
    expect(cuantoTarde(60)).toBe('1 h');
    expect(cuantoTarde(65)).toBe('1 h 5 min');
  });

  it('lo justificado no cuenta en ningún sitio', () => {
    const cuentas = cuantasPorGrupo([
      { tipo: 'falta', justificada: false },
      { tipo: 'falta', justificada: true },
      { tipo: 'retraso', justificada: false },
      { tipo: 'lejos', justificada: false },
      { tipo: 'sin_cerrar', justificada: false },
    ]);
    expect(cuentas).toEqual({ todas: 4, faltas: 1, retrasos: 1, fichajes: 2 });
  });

  it('la cifra «Incidencias» no cuenta los retrasos, que tienen la suya', () => {
    expect(cuentaEnLaCifra('falta', false)).toBe(true);
    expect(cuentaEnLaCifra('falta', true)).toBe(false);
    expect(cuentaEnLaCifra('retraso', false)).toBe(false);
    expect(cuentaEnLaCifra('lejos', false)).toBe(true);
  });
});
