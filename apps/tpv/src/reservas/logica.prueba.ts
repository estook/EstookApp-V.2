import { describe, expect, it } from 'vitest';
import type { UnaReserva } from '../datos/tipos.ts';
import {
  abrirlaPisaLaReserva,
  cuantoFalta,
  laReservaDeLaMesa,
  losAvisosDeLasReservas,
  susMesas,
} from './logica.ts';

/** Las reservas en la sala (la Ampliación 5 · 1, 0153): qué marca el plano y qué avisa. */

const A_LAS_21 = Date.parse('2026-12-01T20:00:00Z'); // 21:00 en Madrid
const MINUTO = 60_000;

function reserva(cambios: Partial<UnaReserva> = {}): UnaReserva {
  return {
    id: 'r1',
    dia: '2026-12-01',
    hora: '21:00',
    empieza: new Date(A_LAS_21).toISOString(),
    acaba: new Date(A_LAS_21 + 90 * MINUTO).toISOString(),
    comensales: 2,
    nombre: 'Jon Etxabe',
    telefono: '600123456',
    nota: null,
    origen: 'tpv',
    estado: 'reservada',
    mesas: [{ id: 'm2', nombre: '2' }],
    cuentaId: null,
    creadaEn: new Date(A_LAS_21 - 300 * MINUTO).toISOString(),
    esMia: true,
    ...cambios,
  };
}

describe('el plano', () => {
  it('la mesa lleva la reserva que la espera, y deja de llevarla pasado el retraso', () => {
    const r = reserva();
    expect(laReservaDeLaMesa([r], 'm2', A_LAS_21 - 20 * MINUTO, 15)?.id).toBe('r1');
    expect(laReservaDeLaMesa([r], 'm1', A_LAS_21 - 20 * MINUTO, 15)).toBeNull();
    expect(laReservaDeLaMesa([r], 'm2', A_LAS_21 + 16 * MINUTO, 15)).toBeNull();
    expect(laReservaDeLaMesa([reserva({ estado: 'sentada' })], 'm2', A_LAS_21, 15)).toBeNull();
  });

  it('abrirla a las 20:40 avisa; a mediodía, no', () => {
    expect(abrirlaPisaLaReserva(reserva(), A_LAS_21 - 20 * MINUTO)).toBe(true);
    expect(abrirlaPisaLaReserva(reserva(), A_LAS_21 - 8 * 60 * MINUTO)).toBe(false);
    expect(cuantoFalta(reserva(), A_LAS_21 - 20 * MINUTO)).toBe('Faltan 20 minutos');
    expect(cuantoFalta(reserva(), A_LAS_21 + 12 * MINUTO)).toBe('Llevan 12 minutos de retraso');
    expect(
      susMesas(
        reserva({
          mesas: [
            { id: 'b', nombre: '8' },
            { id: 'a', nombre: '7' },
          ],
        }),
      ),
    ).toBe('7 + 8');
  });
});

describe('los avisos', () => {
  it('llegan en 10 minutos, llevan retraso, y la nueva de otro', () => {
    expect(
      losAvisosDeLasReservas([reserva()], A_LAS_21 - 8 * MINUTO, 15).map((a) => a.que),
    ).toEqual(['llegan']);
    expect(
      losAvisosDeLasReservas([reserva()], A_LAS_21 + 15 * MINUTO, 15).map((a) => a.que),
    ).toEqual(['retraso']);
    const deLaWeb = reserva({
      esMia: false,
      origen: 'web',
      creadaEn: new Date(A_LAS_21 - 125 * MINUTO).toISOString(),
    });
    expect(
      losAvisosDeLasReservas([deLaWeb], A_LAS_21 - 120 * MINUTO, 15).map((a) => a.que),
    ).toEqual(['nueva']);
    expect(losAvisosDeLasReservas([reserva()], A_LAS_21 - 120 * MINUTO, 15)).toEqual([]);
  });
});
