import { describe, expect, it } from 'vitest';
import { cuantoLlevan, elAlergeno, euros, losNombres, personas } from './texto.ts';

describe('lo que se lee en la sala', () => {
  it('los euros sin símbolo, los minutos y las personas', () => {
    expect(euros(12050)).toBe('120,50');
    expect(cuantoLlevan(34)).toBe('34 min');
    expect(cuantoLlevan(65)).toBe('1 h 05 min');
    expect(personas(1)).toBe('1 persona');
    expect(personas(4)).toBe('4 personas');
    expect(personas(null)).toBeNull();
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
