import { describe, expect, it } from 'vitest';
import { centimos } from './dinero.ts';
import {
  comoSeLeeElPeso,
  conUnToqueBasta,
  cuantasSeEligen,
  elPrecioAPeso,
  elPrecioConLasOpciones,
  loQueFaltaPorElegir,
  type GrupoParaElegir,
} from './opciones.ts';

const guarnicion: GrupoParaElegir = {
  id: 'g',
  nombre: 'Guarnición',
  minimo: 1,
  maximo: 1,
  opciones: [
    { id: 'patatas', precioCentimos: 0 },
    { id: 'ensalada', precioCentimos: 0 },
  ],
};
const extras: GrupoParaElegir = {
  id: 'e',
  nombre: 'Extras',
  minimo: 0,
  maximo: 3,
  opciones: [
    { id: 'queso', precioCentimos: 100 },
    { id: 'bacon', precioCentimos: 150 },
    { id: 'sin-gluten', precioCentimos: 50 },
    { id: 'huevo', precioCentimos: 120 },
  ],
};

describe('las opciones de un plato (T3 · 2)', () => {
  it('no se pide sin contestar lo obligatorio, ni con más de lo que cabe', () => {
    expect(loQueFaltaPorElegir([guarnicion, extras], [])).toEqual({
      grupo: 'Guarnición',
      porque: 'falta',
    });
    expect(loQueFaltaPorElegir([guarnicion, extras], ['patatas'])).toBeNull();
    expect(loQueFaltaPorElegir([guarnicion, extras], ['patatas', 'ensalada'])).toEqual({
      grupo: 'Guarnición',
      porque: 'sobra',
    });
    expect(
      loQueFaltaPorElegir(
        [guarnicion, extras],
        ['patatas', 'queso', 'bacon', 'sin-gluten', 'huevo'],
      ),
    ).toEqual({ grupo: 'Extras', porque: 'sobra' });
    expect(loQueFaltaPorElegir([guarnicion], ['patatas', 'queso'])).toEqual({
      grupo: '',
      porque: 'no_es_suya',
    });
  });

  it('el precio suma lo de cada opción', () => {
    expect(elPrecioConLasOpciones(centimos(1250), [{ precioCentimos: 100 }])).toBe(1350);
    // Una sustitución que sale más barata, resta.
    expect(elPrecioConLasOpciones(centimos(1250), [{ precioCentimos: -50 }])).toBe(1200);
  });

  it('se dice cuántas se eligen', () => {
    expect(cuantasSeEligen(guarnicion)).toBe('obligatoria, una');
    expect(cuantasSeEligen(extras)).toBe('opcional, hasta 3');
    expect(cuantasSeEligen({ minimo: 2, maximo: 2 })).toBe('obligatorias, 2');
    expect(cuantasSeEligen({ minimo: 1, maximo: 3 })).toBe('obligatorias, de una a 3');
    expect(cuantasSeEligen({ minimo: 0, maximo: 1 })).toBe('opcional, una');
  });

  it('con un solo grupo obligatorio de una, basta un toque (el «¿Con qué?» de una copa)', () => {
    expect(conUnToqueBasta([guarnicion])).toBe(true);
    expect(conUnToqueBasta([guarnicion, extras])).toBe(false);
    expect(conUnToqueBasta([extras])).toBe(false);
    expect(conUnToqueBasta([])).toBe(false);
  });

  it('a peso: el precio del kilo por lo que pesa, al céntimo', () => {
    expect(elPrecioAPeso(centimos(12000), 120)).toBe(1440);
    expect(elPrecioAPeso(centimos(3990), 333)).toBe(1329);
    expect(comoSeLeeElPeso(120)).toBe('120 g');
    expect(comoSeLeeElPeso(1250)).toBe('1,25 kg');
  });
});
