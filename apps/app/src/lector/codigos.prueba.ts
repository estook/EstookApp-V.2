import { describe, expect, it } from 'vitest';
import { esDeTienda, esDeUnLector, limpiarElCodigo } from './codigos.ts';

describe('los códigos de barras', () => {
  it('se limpian de espacios, y lo que no es un código no pasa', () => {
    expect(limpiarElCodigo(' 8410 2970 1224 2 ')).toBe('8410297012242');
    expect(limpiarElCodigo('ab')).toBeNull();
    expect(limpiarElCodigo('no es; un código')).toBeNull();
  });

  it('un EAN-13 con su dígito de control bien es de tienda, y con uno mal no', () => {
    expect(esDeTienda('4006381333931')).toBe(true);
    expect(esDeTienda('4006381333932')).toBe(false);
    // EAN-8 y UPC-A.
    expect(esDeTienda('96385074')).toBe(true);
    expect(esDeTienda('036000291452')).toBe(true);
    // Un código interno de distribuidor no se pregunta fuera.
    expect(esDeTienda('CAJA-0042')).toBe(false);
  });

  it('un lector de mano teclea seis o más seguidas y muy deprisa; una persona, no', () => {
    const lector = [0, 12, 25, 37, 50, 62, 75, 88].map((en) => ({ en }));
    expect(esDeUnLector(lector)).toBe(true);
    const persona = [0, 140, 260, 390, 500, 640].map((en) => ({ en }));
    expect(esDeUnLector(persona)).toBe(false);
    expect(esDeUnLector(lector.slice(0, 4))).toBe(false);
  });
});
