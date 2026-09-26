import { describe, expect, it } from 'vitest';
import { elEnlaceDelCorreo } from './enlaceDelCorreo.ts';

/** Los dos enlaces del cambio de correo (A2), leídos de la dirección. */
describe('el enlace del correo', () => {
  it('reconoce confirmar y parar, con el token tal cual', () => {
    expect(elEnlaceDelCorreo('#/correo?confirmar=abc%2Bd')).toEqual({
      que: 'confirmar',
      token: 'abc+d',
    });
    expect(elEnlaceDelCorreo('#/correo?parar=xyz')).toEqual({ que: 'parar', token: 'xyz' });
  });
  it('lo demás no es un enlace del correo', () => {
    expect(elEnlaceDelCorreo('#/almacen/resumen')).toBeNull();
    expect(elEnlaceDelCorreo('#/correo?confirmar=')).toBeNull();
    expect(elEnlaceDelCorreo('#/correo?otro=1')).toBeNull();
    expect(elEnlaceDelCorreo('')).toBeNull();
  });
});
