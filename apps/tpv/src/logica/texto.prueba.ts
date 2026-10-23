import { describe, expect, it } from 'vitest';
import { cuantoLlevan, euros, personas } from './texto.ts';

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
