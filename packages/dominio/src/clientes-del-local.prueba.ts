import { describe, expect, it } from 'vitest';
import {
  elGastoMedioPorPersona,
  esHabitual,
  laAlergiaEnLetra,
  lasEtiquetasDelCliente,
  sinVenirMarca,
} from './clientes-del-local.ts';

describe('Los clientes del local (la Ampliación 5 · 3)', () => {
  it('habitual es más de cinco visitas en medio año (Richi, 26-nov)', () => {
    expect(esHabitual(5)).toBe(false);
    expect(esHabitual(6)).toBe(true);
  });

  it('con dos veces sin venir, sale marcado', () => {
    expect(sinVenirMarca(1)).toBe(false);
    expect(sinVenirMarca(2)).toBe(true);
  });

  it('el gluten dice también «celíaco»', () => {
    expect(laAlergiaEnLetra('gluten')).toBe('Gluten · celíaco');
    expect(laAlergiaEnLetra('frutos_de_cascara')).toBe('Frutos secos');
  });

  it('las etiquetas van con la alergia primero y lo bueno al final', () => {
    expect(
      lasEtiquetasDelCliente({
        vip: true,
        habitual: true,
        alergenos: ['frutos_de_cascara'],
        vecesSinVenir: 2,
      }).map((e) => e.texto),
    ).toEqual(['Frutos secos', '2 sin venir', 'VIP', 'Habitual']);
    expect(
      lasEtiquetasDelCliente({ vip: false, habitual: false, alergenos: [], vecesSinVenir: 1 }),
    ).toEqual([]);
  });

  it('el gasto medio es por persona, y sin mesas cobradas no hay', () => {
    expect(elGastoMedioPorPersona([])).toBeNull();
    expect(
      elGastoMedioPorPersona([
        { centimos: 8000, personas: 2 },
        { centimos: 15000, personas: 4 },
      ]),
    ).toBe(3833);
    expect(elGastoMedioPorPersona([{ centimos: 0, personas: 2 }])).toBeNull();
  });
});
