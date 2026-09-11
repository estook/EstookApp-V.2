import { describe, expect, it } from 'vitest';
import { centimos } from './dinero.ts';
import { comoSeDiceElTipo, conIva, ivaDeCompraPorDefecto, sinIva } from './iva.ts';

describe('el IVA de lo que se compra', () => {
  it('quita y pone el impuesto al céntimo', () => {
    expect(sinIva(centimos(1100), 0.1)).toBe(1000);
    expect(conIva(centimos(1000), 0.1)).toBe(1100);
    // 3,50 € con el 4 % son 3,37 € sin él (3,3654 redondeado una vez).
    expect(sinIva(centimos(350), 0.04)).toBe(337);
    expect(conIva(centimos(1000), 0.21)).toBe(1210);
  });

  it('ida y vuelta no se aleja más de un céntimo', () => {
    for (const precio of [99, 350, 1299, 4250, 10_000]) {
      for (const tipo of [0.04, 0.1, 0.21]) {
        const vuelta = conIva(sinIva(centimos(precio), tipo), tipo);
        expect(Math.abs(vuelta - precio)).toBeLessThanOrEqual(1);
      }
    }
  });

  it('el tipo por defecto sale de la categoría, y solo en la península y Baleares', () => {
    expect(ivaDeCompraPorDefecto('alimento', 'peninsula_y_baleares')).toBe(0.1);
    expect(ivaDeCompraPorDefecto('bebida_alcoholica', 'peninsula_y_baleares')).toBe(0.21);
    expect(ivaDeCompraPorDefecto('bebida_refrescante_azucarada', 'peninsula_y_baleares')).toBe(
      0.21,
    );
    // En Canarias es IGIC: no se supone nada.
    expect(ivaDeCompraPorDefecto('alimento', 'canarias')).toBeNull();
  });

  it('se dice como se dice', () => {
    expect(comoSeDiceElTipo(0.1)).toBe('10 %');
    expect(comoSeDiceElTipo(0.04)).toBe('4 %');
    expect(comoSeDiceElTipo(0.21)).toBe('21 %');
  });

  it('un tipo imposible no se acepta', () => {
    expect(() => sinIva(centimos(100), -0.1)).toThrow();
  });
});
