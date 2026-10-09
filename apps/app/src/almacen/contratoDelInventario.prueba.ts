import { describe, expect, it } from 'vitest';
import { juntarLoContado } from './contratoDelInventario.ts';

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
