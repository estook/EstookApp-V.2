import { describe, expect, it } from 'vitest';
import { desdeEuros } from './dinero.ts';
import { equilibrioDeLaCarta, equilibrioDeUnaSeccion, saltoQueSeAdmite } from './equilibrio.ts';

const conPrecios = (nombre: string, euros: readonly (number | null)[]) => ({
  nombre,
  platos: euros.map((e, i) => ({
    nombre: `${nombre} ${String(i + 1)}`,
    precioCentimos: e === null ? null : desdeEuros(e),
  })),
});

describe('el equilibrio de una sección (Omnes)', () => {
  it('una sección equilibrada no dice nada', () => {
    // De 8 a 16 €: 2 veces. Franjas de 2,67 €: 8 | 10,67 | 13,33 | 16.
    const visto = equilibrioDeUnaSeccion(conPrecios('Principales', [8, 11, 12, 13, 16]));
    expect(visto.juzgada).toBe(true);
    expect(visto.salto).toBe(2);
    expect(visto.franjas).toEqual({ baja: 1, media: 3, alta: 1 });
    expect(visto.avisos).toEqual([]);
  });

  it('el salto de precios: hasta 2,5 veces con 9 platos o menos, y 3 con más', () => {
    expect(saltoQueSeAdmite(9)).toBe(2.5);
    expect(saltoQueSeAdmite(10)).toBe(3);
    const visto = equilibrioDeUnaSeccion(conPrecios('Entrantes', [6, 12, 13, 14, 22]));
    expect(visto.salto).toBe(3.7);
    expect(visto.avisos[0]).toContain('3,7 veces');
    expect(visto.avisos[0]).toContain('2,5 veces');
  });

  it('una carta descompensada sembrada a propósito: casi todo barato', () => {
    // Plan, M10, «Terminado cuando»: el informe detecta una carta descompensada.
    const visto = equilibrioDeUnaSeccion(
      conPrecios('Raciones', [7, 7.5, 7.5, 8, 8, 8.5, 9, 9, 15, 17, 17.5]),
    );
    expect(visto.franjas).toEqual({ baja: 8, media: 0, alta: 3 });
    expect(visto.avisos.some((a) => a.includes('casi todo es barato'))).toBe(true);
  });

  it('con menos de tres precios no se juzga, pero lo largo se dice igual', () => {
    expect(equilibrioDeUnaSeccion(conPrecios('Postres', [5, 9])).juzgada).toBe(false);
    const larga = equilibrioDeUnaSeccion(conPrecios('Tapas', Array(14).fill(null) as null[]));
    expect(larga.juzgada).toBe(false);
    expect(larga.avisos[0]).toContain('14 platos');
  });

  it('todos al mismo precio están en la franja media', () => {
    const visto = equilibrioDeUnaSeccion(conPrecios('Cafés', [1.5, 1.5, 1.5]));
    expect(visto.franjas).toEqual({ baja: 0, media: 3, alta: 0 });
    expect(visto.avisos).toEqual([]);
  });
});

describe('el equilibrio de la carta', () => {
  it('cuenta lo que hay que mirar y salta las secciones vacías', () => {
    const visto = equilibrioDeLaCarta([
      conPrecios('Vacía', []),
      conPrecios('Bien', [8, 11, 12, 13, 16]),
      conPrecios('Mal', [6, 12, 13, 14, 22]),
    ]);
    expect(visto.secciones.map((s) => s.nombre)).toEqual(['Bien', 'Mal']);
    expect(visto.juzgadas).toBe(2);
    expect(visto.conAlgoQueMirar).toBe(1);
  });
});
