import { describe, expect, it } from 'vitest';
import { direccionDeLaCarta, laCartaDeLaDireccion } from './carta.ts';

describe('la dirección de la carta (0047)', () => {
  it('la del QR es siempre la de estook.com, y sin almohadilla', () => {
    expect(direccionDeLaCarta('ikatz')).toBe('https://estook.com/carta/ikatz');
  });

  it('se lee de la barra del navegador, con o sin barra al final', () => {
    expect(laCartaDeLaDireccion('/carta/ikatz')).toBe('ikatz');
    expect(laCartaDeLaDireccion('/carta/Burger-King-Food-Truck/')).toBe('burger-king-food-truck');
  });

  it('lo que no es una carta no se lee como una', () => {
    expect(laCartaDeLaDireccion('/carta/')).toBeNull();
    expect(laCartaDeLaDireccion('/app/')).toBeNull();
    expect(laCartaDeLaDireccion('/carta/ikatz/otra-cosa')).toBeNull();
    expect(laCartaDeLaDireccion('/carta/-mal')).toBeNull();
  });
});
