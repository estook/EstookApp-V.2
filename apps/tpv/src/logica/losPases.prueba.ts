import { describe, expect, it } from 'vitest';
import type { LaMesa, PlatoDeLaCuenta } from '../datos/tipos.ts';
import {
  comoVaElPase,
  elNumeroDelPase,
  laPestanaDeFabrica,
  laPestanaDeLaPagina,
} from './losPases.ts';

/** Las pestañas de los pases encima de la cuenta (T2, Anexo 11.10 y 11.15). */
function unaMesa(platos: Partial<PlatoDeLaCuenta>[], pases: LaMesa['pases'] = []): LaMesa {
  return {
    cuentaId: 'c',
    titulo: 'Mesa 6',
    tipo: 'mesa',
    mesaId: 'm',
    personas: 2,
    camarero: 'Sara',
    porPases: true,
    notaParaCocina: null,
    abierta: true,
    minutos: 10,
    totalCentimos: 0,
    platos: platos.map((p, i) => ({
      id: `l${String(i)}`,
      platoId: 'p',
      menuId: null,
      parteDe: null,
      nombre: 'Plato',
      cantidad: 1,
      precioCentimos: 1000,
      destino: 'cocina',
      pase: 1,
      nota: null,
      estado: 'en_marcha',
      salioEn: null,
      motivoDeQuitar: null,
      vuelve: null,
      ...p,
    })),
    pases,
    loSiguiente: { que: 'pedir' },
  };
}

describe('los pases en pestañas', () => {
  it('al abrir una página se marca la pestaña de su «¿En qué pase sale?» (T3)', () => {
    expect(laPestanaDeLaPagina('2')).toBe(2);
    expect(laPestanaDeLaPagina('1')).toBe(1);
    expect(laPestanaDeLaPagina('3')).toBe(3);
    expect(laPestanaDeLaPagina('postre')).toBe('postre');
    expect(laPestanaDeLaPagina('bebidas')).toBe('bebidas');
  });

  it('Bebidas no es un pase, y el postre va detrás del 3.º', () => {
    expect(elNumeroDelPase('bebidas')).toBeNull();
    expect(elNumeroDelPase(2)).toBe(2);
    expect(elNumeroDelPase('postre')).toBe(4);
  });

  it('una mesa sin nada empieza en Bebidas; con el 1.º fuera, en el 2.º', () => {
    expect(laPestanaDeFabrica(unaMesa([]))).toBe('bebidas');
    const conElPrimeroFuera = unaMesa(
      [{ pase: 1, estado: 'salio' }],
      [{ numero: 1, marchadoEn: 'ya', haSalido: true }],
    );
    expect(laPestanaDeFabrica(conElPrimeroFuera)).toBe(2);
  });

  it('cada pestaña dice cómo va su pase', () => {
    const mesa = unaMesa(
      [{ pase: 1 }, { pase: 2, estado: 'en_espera' }],
      [
        { numero: 1, marchadoEn: 'ya', haSalido: true },
        { numero: 2, marchadoEn: null, haSalido: false },
      ],
    );
    expect(comoVaElPase(mesa, 1)).toBe('salio');
    expect(comoVaElPase(mesa, 2)).toBe('en_espera');
    expect(comoVaElPase(mesa, 3)).toBeNull();
  });
});
