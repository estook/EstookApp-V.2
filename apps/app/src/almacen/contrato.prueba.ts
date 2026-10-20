import { describe, expect, it } from 'vitest';
import { delEnvase, elEnvase } from './contrato.ts';

/**
 * El envase con su artículo, para «Precio de la garrafa de 5 l» (20-oct): se partía el
 * nombre por la letra «s» en vez de por los espacios, y salía «el garrafa».
 */
describe('elEnvase', () => {
  it('cada envase con el suyo', () => {
    expect(elEnvase('Garrafa de 5 l', 'l')).toBe('la garrafa de 5 l');
    expect(elEnvase('Caja de 5 bandejas de 200 g', 'ud')).toBe('la caja de 5 bandejas de 200 g');
    expect(elEnvase('Saco de 25 kg', 'kg')).toBe('el saco de 25 kg');
    expect(elEnvase('Barril de 50 l', 'l')).toBe('el barril de 50 l');
    expect(elEnvase(null, 'kg')).toBe('el kilo');
  });

  it('y «de» o «del» delante', () => {
    expect(delEnvase('Garrafa de 5 l', 'l')).toBe('de la garrafa de 5 l');
    expect(delEnvase('Saco de 25 kg', 'kg')).toBe('del saco de 25 kg');
    expect(delEnvase(null, 'g')).toBe('del kilo');
  });
});
