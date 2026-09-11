import { describe, expect, it } from 'vitest';
import { centimos } from './dinero.ts';
import {
  comoSeCompraDe,
  enPlural,
  loQueSale,
  precioDelFormato,
  presentacionDe,
} from './presentacion.ts';

describe('cómo se compra un producto', () => {
  it('queso azul: paquetes de 250 g, seis por caja, a 3,50 € cada uno', () => {
    const p = presentacionDe({
      modo: 'unidades',
      unidad: 'ud',
      porBulto: 6,
      envase: 'Paquete',
      contenido: { cantidad: 250, unidad: 'g' },
    });
    expect(p.unidadDeUso).toBe('ud');
    expect(p.factor).toBe(6);
    expect(p.formato).toBe('Caja de 6 paquetes de 250 g');
    expect(p.resumen).toBe('Caja de 6 paquetes de 250 g · 1,5 kg en total');
    expect(p.precioDelFormato).toBe('la caja');
    expect(p.precioDeLaUnidad).toBe('cada paquete');

    const caja = precioDelFormato(centimos(350), p);
    expect(caja).toBe(2100);
    const sale = loQueSale(caja, p);
    expect(sale.porUnidad).toBe(350);
    // 21,00 € por 1,5 kg: 14,00 € el kilo.
    expect(sale.porKiloOLitro).toEqual({ centimos: 1400, unidad: 'kg' });
  });

  it('un paquete suelto de 250 g se llama así, y se cuenta de uno en uno', () => {
    const p = presentacionDe({
      modo: 'unidades',
      unidad: 'ud',
      porBulto: 1,
      envase: 'Paquete',
      contenido: { cantidad: 250, unidad: 'g' },
    });
    expect(p.formato).toBe('Paquete de 250 g');
    expect(p.factor).toBe(1);
    expect(p.precioDelFormato).toBe('cada paquete');
    expect(p.precioDeLaUnidad).toBeNull();
  });

  it('huevos sueltos: sin formato que nombrar', () => {
    const p = presentacionDe({
      modo: 'unidades',
      unidad: 'ud',
      porBulto: 1,
      envase: 'Unidad',
      contenido: null,
    });
    expect(p.formato).toBeNull();
    expect(p.resumen).toBe('Por unidades sueltas');
  });

  it('fruta suelta, a tanto el kilo', () => {
    const p = presentacionDe({
      modo: 'peso',
      unidad: 'kg',
      porBulto: null,
      envase: 'Caja',
      contenido: null,
    });
    expect(p).toMatchObject({
      unidadDeUso: 'kg',
      factor: 1,
      formato: null,
      precioDelFormato: 'el kg',
    });
  });

  it('tomate en cajas de 5 kg, a 2,40 € el kilo', () => {
    const p = presentacionDe({
      modo: 'peso',
      unidad: 'kg',
      porBulto: 5,
      envase: 'Caja',
      contenido: null,
    });
    expect(p.formato).toBe('Caja de 5 kg');
    expect(p.factor).toBe(5);
    expect(precioDelFormato(centimos(240), p)).toBe(1200);
    expect(loQueSale(centimos(1200), p).porUnidad).toBe(240);
  });

  it('aceite en garrafas de 5 l', () => {
    const p = presentacionDe({
      modo: 'volumen',
      unidad: 'l',
      porBulto: 5,
      envase: 'Garrafa',
      contenido: null,
    });
    expect(p.formato).toBe('Garrafa de 5 l');
    expect(p.precioDelFormato).toBe('cada garrafa');
  });

  it('un producto de antes en gramos sigue en gramos, y el bulto se dice en kilos', () => {
    const p = presentacionDe({
      modo: 'peso',
      unidad: 'g',
      porBulto: 3,
      envase: 'Caja',
      contenido: null,
    });
    expect(p.unidadDeUso).toBe('g');
    expect(p.factor).toBe(3000);
    expect(p.formato).toBe('Caja de 3 kg');
    // A 4,00 € el kilo, la caja de 3 kg son 12,00 €.
    expect(precioDelFormato(centimos(400), p)).toBe(1200);
  });

  it('y se lee al revés desde lo guardado', () => {
    expect(
      comoSeCompraDe({
        unidadDeUso: 'ud',
        factor: 6,
        formato: 'Caja de 6 paquetes de 250 g',
        contenidoPorUnidad: 250,
        unidadDelContenido: 'g',
      }),
    ).toEqual({
      modo: 'unidades',
      unidad: 'ud',
      porBulto: 6,
      envase: 'Paquete',
      contenido: { cantidad: 250, unidad: 'g' },
    });
    expect(
      comoSeCompraDe({
        unidadDeUso: 'kg',
        factor: 5,
        formato: 'Caja de 5 kg',
        contenidoPorUnidad: null,
        unidadDelContenido: null,
      }),
    ).toMatchObject({ modo: 'peso', porBulto: 5, envase: 'Caja' });
    expect(
      comoSeCompraDe({
        unidadDeUso: 'ml',
        factor: 8000,
        formato: 'Envase de 8000 ml',
        contenidoPorUnidad: null,
        unidadDelContenido: null,
      }),
    ).toMatchObject({ modo: 'volumen', unidad: 'ml', porBulto: 8 });
  });

  it('el plural en español', () => {
    expect(enPlural('Paquete')).toBe('paquetes');
    expect(enPlural('Unidad')).toBe('unidades');
    expect(enPlural('Lata')).toBe('latas');
  });
});
