import { describe, expect, it } from 'vitest';
import { elEnlaceDelCorreo } from './enlaceDelCorreo.ts';

/** Los enlaces del correo (A2 y 0109), leídos de la dirección. */
describe('el enlace del correo', () => {
  it('reconoce confirmar y parar, con el token tal cual', () => {
    expect(elEnlaceDelCorreo('#/correo?confirmar=abc%2Bd')).toEqual({
      que: 'confirmar',
      token: 'abc+d',
    });
    expect(elEnlaceDelCorreo('#/correo?parar=xyz')).toEqual({ que: 'parar', token: 'xyz' });
  });
  it('y los de recuperar el acceso: la contraseña y el PIN (0109)', () => {
    expect(elEnlaceDelCorreo('#/correo?contrasena=abc')).toEqual({
      que: 'contrasena',
      token: 'abc',
    });
    expect(elEnlaceDelCorreo('#/correo?pin=x%2Fy')).toEqual({ que: 'pin', token: 'x/y' });
  });
  it('lo demás no es un enlace del correo', () => {
    expect(elEnlaceDelCorreo('#/almacen/resumen')).toBeNull();
    expect(elEnlaceDelCorreo('#/correo?confirmar=')).toBeNull();
    expect(elEnlaceDelCorreo('#/correo?otro=1')).toBeNull();
    expect(elEnlaceDelCorreo('')).toBeNull();
  });
});
