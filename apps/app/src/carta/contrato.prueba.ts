import { describe, expect, it } from 'vitest';
import { canalesConPrecio, queCambio, type UnCanal } from './contrato.ts';

/** El historial del plato en cristiano (0086), y qué canales llevan precio propio. */
const seccion = (id: string | null) => (id === 's1' ? 'Entrantes' : 'Sin sección');

describe('el historial del plato, dicho en cristiano', () => {
  it('cada precio con su antes y su después, y el canal por su nombre', () => {
    expect(
      queCambio(
        {
          cuando: '2026-10-15T10:00:00Z',
          quien: 'Rosa',
          que: 'cambiar',
          antes: { precio: 950, precio_uber_eats: null },
          despues: { precio: 990, precio_uber_eats: 1250 },
        },
        seccion,
      ),
    ).toEqual(['Precio de sala: 9,50 € → 9,90 €', 'Uber Eats: igual que sala → 12,50 €']);
  });

  it('crear, archivar y recuperar se dicen en una línea', () => {
    for (const [que, frase] of [
      ['crear', 'Lo añadió a la carta'],
      ['archivar', 'Lo archivó'],
      ['recuperar', 'Lo recuperó'],
    ] as const) {
      expect(
        queCambio({ cuando: '', quien: null, que, antes: null, despues: null }, seccion),
      ).toEqual([frase]);
    }
  });

  it('la sección, por su nombre', () => {
    expect(
      queCambio(
        {
          cuando: '',
          quien: 'Rosa',
          que: 'cambiar',
          antes: { seccion: null },
          despues: { seccion: 's1' },
        },
        seccion,
      ),
    ).toEqual(['Sección: Sin sección → Entrantes']);
  });
});

describe('lo nuevo de la carta en el historial (0087)', () => {
  const linea = (antes: Record<string, unknown>, despues: Record<string, unknown>) =>
    queCambio({ cuando: '', quien: 'Rosa', que: 'cambiar', antes, despues }, () => '');

  it('se dice en cristiano, y nunca «Cambió picante»', () => {
    expect(linea({ picante: 0 }, { picante: 2 })).toEqual(['Picante: 2 de 3']);
    expect(linea({ unidades: null }, { unidades: 8 })).toEqual(['Ración: 8 ud']);
    expect(linea({ alergenos: [] }, { alergenos: ['gluten', 'sesamo'] })).toEqual([
      'Alérgenos: Cereales con gluten, Granos de sésamo',
    ]);
    expect(linea({ distintivos: [] }, { distintivos: ['vegano'] })).toEqual(['Vegano']);
    expect(linea({ vinculo: null }, { vinculo: 'Chuletón' })).toEqual(['Lo vinculó a Chuletón']);
  });
});

describe('los canales que llevan precio propio', () => {
  it('los activos, sin Sala', () => {
    const canal = (c: string, activo: boolean): UnCanal => ({
      canal: c as UnCanal['canal'],
      nombre: c,
      tipo: 'plataforma',
      disponible: true,
      activo,
      comisionPorcentaje: null,
      envaseCentimos: null,
      comisionHabitual: null,
    });
    expect(
      canalesConPrecio([canal('sala', true), canal('uber_eats', true), canal('glovo', false)]).map(
        (c) => c.canal,
      ),
    ).toEqual(['uber_eats']);
  });
});
