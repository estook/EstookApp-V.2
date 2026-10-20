import { describe, expect, it } from 'vitest';
import { juntarLoContado, seCuentaEnCajas } from './contratoDelInventario.ts';

/**
 * Escanear pregunta cuántos hay (repaso del 9-oct, punto 1): lo escrito se suma a lo
 * que se llevaba, o lo sustituye.
 */
describe('juntarLoContado', () => {
  it('lo primero que se cuenta es lo escrito, sin más', () => {
    expect(juntarLoContado(undefined, { hay: '240' }, true)).toEqual({ hay: '240' });
  });

  it('la misma leche en otra estantería se suma, con coma o con punto', () => {
    expect(juntarLoContado({ hay: '240' }, { hay: '10,5' }, true)).toEqual({ hay: '250.5' });
  });

  it('sustituir deja solo lo nuevo', () => {
    expect(juntarLoContado({ hay: '240' }, { hay: '248' }, false)).toEqual({ hay: '248' });
  });

  it('en cajas y sueltas se suma casilla a casilla, y lo que se deja en blanco no borra', () => {
    expect(juntarLoContado({ formatos: '3', sueltas: '4' }, { formatos: '2' }, true)).toEqual({
      formatos: '5',
      sueltas: '4',
    });
  });

  it('sin sumar, una casilla en blanco queda vacía', () => {
    expect(juntarLoContado({ formatos: '3', sueltas: '4' }, { formatos: '2' }, false)).toEqual({
      formatos: '2',
    });
  });

  it('no arrastra decimales de coma flotante', () => {
    expect(juntarLoContado({ hay: '0.1' }, { hay: '0.2' }, true)).toEqual({ hay: '0.3' });
  });

  it('lo que no es un número no suma', () => {
    expect(juntarLoContado({ hay: '5' }, { hay: 'abc' }, true)).toEqual({ hay: '5' });
  });
});

/**
 * En cajas y sueltas, solo lo que se cuenta por unidades (20-oct): el 17-oct se escribió
 * la cerveza en litros en la casilla «Barril» y el chuletón en kilos en «Caja».
 */
describe('seCuentaEnCajas', () => {
  const caja = { formato: 'Caja de 24 latas', factor: 24, pesoVariable: false, unidadDeUso: 'ud' };

  it('las latas en caja de 24, en cajas y sueltas', () => {
    expect(seCuentaEnCajas(caja)).toBe(true);
  });

  it('el chuletón en caja de 28 kg y el barril de 50 l, en una casilla', () => {
    expect(
      seCuentaEnCajas({ ...caja, formato: 'Caja de 28 kg', factor: 28, unidadDeUso: 'kg' }),
    ).toBe(false);
    expect(
      seCuentaEnCajas({ ...caja, formato: 'Barril de 50 l', factor: 50, unidadDeUso: 'l' }),
    ).toBe(false);
    expect(
      seCuentaEnCajas({ ...caja, formato: 'Caja de 5 kg', factor: 5000, unidadDeUso: 'g' }),
    ).toBe(false);
  });

  it('sin caja, o a peso variable, tampoco', () => {
    expect(seCuentaEnCajas({ ...caja, formato: null })).toBe(false);
    expect(seCuentaEnCajas({ ...caja, pesoVariable: true })).toBe(false);
  });
});
