import { describe, expect, it } from 'vitest';
import {
  SIN_CONEXION_COMO_MUCHO_MS,
  cuandoPuedeSonar,
  cuandoSeRecuerda,
  estaEnSilencio,
  laHoraDeLoHecho,
  resumenParaElMovil,
  seAceptaLoHecho,
  seRevisaElFichaje,
  suModo,
  type ComoLeSuena,
} from './movil.ts';
import { fechaOperativa, instanteEnElLocal } from './tiempo.ts';

const MADRID = 'Europe/Madrid';
/** Una hora del martes 6 de octubre de 2026 en Madrid (verano: UTC+2). */
const martes = (hora: string) => instanteEnElLocal(fechaOperativa('2026-10-06'), hora, MADRID);
const miercoles = (hora: string) => instanteEnElLocal(fechaOperativa('2026-10-07'), hora, MADRID);

const conTurno: ComoLeSuena = {
  modo: 'en_mi_turno',
  silencioDesde: '23:00',
  silencioHasta: '08:00',
  zonaHoraria: MADRID,
  turnos: [
    { empieza: martes('12:00'), acaba: martes('16:00') },
    { empieza: martes('20:00'), acaba: miercoles('00:30') },
  ],
  fichadoAhora: false,
};

describe('la hora en el local, al revés', () => {
  it('las 08:00 del martes en Madrid son las 06:00 en hora universal (verano)', () => {
    expect(martes('08:00').toISOString()).toBe('2026-10-06T06:00:00.000Z');
  });

  it('y en invierno, una hora menos de diferencia', () => {
    expect(instanteEnElLocal(fechaOperativa('2026-11-03'), '08:00', MADRID).toISOString()).toBe(
      '2026-11-03T07:00:00.000Z',
    );
  });

  it('en Canarias, una hora menos que en Madrid', () => {
    expect(
      instanteEnElLocal(fechaOperativa('2026-10-06'), '08:00', 'Atlantic/Canary').toISOString(),
    ).toBe('2026-10-06T07:00:00.000Z');
  });
});

describe('cuándo puede sonar el móvil', () => {
  it('de fábrica: en tu turno si tienes horario, fuera del silencio si no (un area manager)', () => {
    expect(suModo(null, true)).toBe('en_mi_turno');
    expect(suModo(null, false)).toBe('fuera_del_silencio');
    // Lo que elige cada uno manda.
    expect(suModo('fuera_del_silencio', true)).toBe('fuera_del_silencio');
  });

  it('en tu turno suena, y fuera espera a cinco minutos antes del siguiente', () => {
    expect(cuandoPuedeSonar(martes('13:00'), conTurno)).toEqual(martes('13:00'));
    // A las 17:00 ha salido: espera a las 19:55, cuando le suena «entras en cinco minutos».
    expect(cuandoPuedeSonar(martes('17:00'), conTurno)).toEqual(martes('19:55'));
    // Cinco minutos antes de entrar ya puede sonar.
    expect(cuandoPuedeSonar(martes('11:56'), conTurno)).toEqual(martes('11:56'));
  });

  it('el turno de noche sigue pasada la medianoche', () => {
    expect(cuandoPuedeSonar(miercoles('00:15'), conTurno)).toEqual(miercoles('00:15'));
  });

  it('fichado suena siempre, aunque no tenga turno puesto a esa hora', () => {
    expect(cuandoPuedeSonar(martes('17:00'), { ...conTurno, fichadoAhora: true })).toEqual(
      martes('17:00'),
    );
  });

  it('sin turnos en una semana no se espera: se queda en la campana', () => {
    expect(cuandoPuedeSonar(martes('17:00'), { ...conTurno, turnos: [] })).toBeNull();
  });

  it('fuera del silencio: de noche espera a las 08:00, cruzando la medianoche', () => {
    const area: ComoLeSuena = { ...conTurno, modo: 'fuera_del_silencio', turnos: [] };
    expect(cuandoPuedeSonar(martes('22:59'), area)).toEqual(martes('22:59'));
    expect(cuandoPuedeSonar(martes('23:00'), area)).toEqual(miercoles('08:00'));
    expect(cuandoPuedeSonar(miercoles('03:00'), area)).toEqual(miercoles('08:00'));
    expect(cuandoPuedeSonar(miercoles('08:00'), area)).toEqual(miercoles('08:00'));
  });

  it('un silencio dentro del mismo día (la siesta) y uno vacío', () => {
    expect(estaEnSilencio(martes('15:00'), '14:30', '16:30', MADRID)).toBe(true);
    expect(estaEnSilencio(martes('17:00'), '14:30', '16:30', MADRID)).toBe(false);
    // Desde y hasta iguales: no hay silencio.
    expect(estaEnSilencio(martes('03:00'), '00:00', '00:00', MADRID)).toBe(false);
  });
});

describe('lo hecho sin conexión', () => {
  const ahora = new Date('2026-10-06T10:00:00.000Z');

  it('la hora es la del servidor menos lo que ha pasado, nunca la del móvil', () => {
    expect(laHoraDeLoHecho(ahora, 25 * 60_000).toISOString()).toBe('2026-10-06T09:35:00.000Z');
    // Un móvil que diga que pasó «dentro de un rato» no adelanta nada.
    expect(laHoraDeLoHecho(ahora, -5000).toISOString()).toBe('2026-10-06T10:00:00.000Z');
  });

  it('se acepta hasta una semana, y pasadas doce horas se revisa', () => {
    expect(seAceptaLoHecho(0)).toBe(true);
    expect(seAceptaLoHecho(SIN_CONEXION_COMO_MUCHO_MS)).toBe(true);
    expect(seAceptaLoHecho(SIN_CONEXION_COMO_MUCHO_MS + 1)).toBe(false);
    expect(seAceptaLoHecho(-1)).toBe(false);
    expect(seAceptaLoHecho(Number.NaN)).toBe(false);
    expect(seRevisaElFichaje(12 * 3_600_000)).toBe(false);
    expect(seRevisaElFichaje(12 * 3_600_000 + 1)).toBe(true);
  });
});

describe('lo que dice el móvil cuando se juntan varios', () => {
  it('uno solo dice cuántos y nombra los dos primeros', () => {
    expect(
      resumenParaElMovil(['Hoy caducan 2 lotes', 'Te cambian el horario', 'Hay carta nueva']),
    ).toEqual({
      titulo: 'Tienes 3 avisos',
      detalle: 'Hoy caducan 2 lotes · Te cambian el horario · y 1 más',
    });
    expect(resumenParaElMovil(['A', 'B'])).toEqual({ titulo: 'Tienes 2 avisos', detalle: 'A · B' });
  });
});

describe('cuándo se recuerda confirmar (C2 · 0075)', () => {
  it('con turno: al empezar el primer turno que empieza después de mandarlo', () => {
    // Mandado a las 10:00: el siguiente turno empieza a las 12:00.
    expect(cuandoSeRecuerda(martes('10:00'), conTurno)?.toISOString()).toBe(
      martes('12:00').toISOString(),
    );
    // Mandado en mitad del turno de las 12:00: ya lo tuvo delante, el de las 20:00.
    expect(cuandoSeRecuerda(martes('13:00'), conTurno)?.toISOString()).toBe(
      martes('20:00').toISOString(),
    );
    // Sin más turnos en la semana, no se recuerda.
    expect(cuandoSeRecuerda(miercoles('01:00'), conTurno)).toBeNull();
  });

  it('sin horario: cuando acaba su próximo silencio, que es cuando empieza su día', () => {
    const sinHorario: ComoLeSuena = { ...conTurno, modo: 'fuera_del_silencio', turnos: [] };
    expect(cuandoSeRecuerda(martes('10:00'), sinHorario)?.toISOString()).toBe(
      miercoles('08:00').toISOString(),
    );
    // Mandado de madrugada, en su silencio: esa misma mañana.
    expect(cuandoSeRecuerda(miercoles('02:00'), sinHorario)?.toISOString()).toBe(
      miercoles('08:00').toISOString(),
    );
    // Sin silencio: al día siguiente a la misma hora.
    const sinSilencio: ComoLeSuena = {
      ...sinHorario,
      silencioDesde: '00:00',
      silencioHasta: '00:00',
    };
    expect(cuandoSeRecuerda(martes('10:00'), sinSilencio)?.toISOString()).toBe(
      miercoles('10:00').toISOString(),
    );
  });
});
