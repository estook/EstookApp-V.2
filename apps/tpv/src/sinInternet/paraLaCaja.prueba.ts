import { describe, expect, it } from 'vitest';
import { esLoQueSePasaPorLaCaja, laComandaPorLaCaja } from '@estook/dominio';
import type { LaMesa, PlatoDeLaCuenta } from '../datos/tipos.ts';
import type { LineaNueva } from '../logica/comanda.ts';
import type { CosaPorSubir } from './laCola.ts';
import { laMarchaParaLaCaja, loMandadoParaLaCaja } from './paraLaCaja.ts';

/**
 * **Lo que el comandero le pasa a la caja de centro** (T5 · 2 · 2, 0123): con las mismas reglas
 * que Estook, el papel de la caja dice lo mismo que diría con internet: el 1.º sale, el 2.º
 * espera a que la sala lo marche, y lo de la barra va a la barra.
 */

const DONDE = { hora: '21:38', aparato: 'Móvil de Lucía' };

const MESA: LaMesa = {
  cuentaId: '11111111-1111-4111-8111-111111111111',
  titulo: 'Mesa 4',
  tipo: 'mesa',
  mesaId: 'm4',
  personas: 2,
  camarero: 'Lucía',
  porPases: true,
  notaParaCocina: 'Sin prisa',
  conPrisa: false,
  cocinaLlamaEn: null,
  alergias: ['gluten'],
  abierta: true,
  minutos: 3,
  totalCentimos: 0,
  platos: [],
  pases: [],
  loSiguiente: { que: 'pedir' },
};

function linea(
  id: string,
  nombre: string,
  destino: LineaNueva['destino'],
  pase: number | null,
): LineaNueva {
  return {
    id,
    platoId: `plato-${id}`,
    menuId: null,
    parteDe: null,
    nombre,
    cantidad: 1,
    precioCentimos: 900,
    destino,
    pase,
    nota: null,
  };
}

function enLaCuenta(id: string, pase: number, estado: PlatoDeLaCuenta['estado']): PlatoDeLaCuenta {
  return {
    id,
    platoId: `plato-${id}`,
    menuId: null,
    parteDe: null,
    nombre: `Plato ${id}`,
    cantidad: 1,
    precioCentimos: 900,
    destino: 'cocina',
    pase,
    nota: null,
    estado,
    salioEn: null,
    motivoDeQuitar: null,
    vuelve: null,
  };
}

describe('lo mandado, para la caja', () => {
  it('el 1.º sale ya, el 2.º espera, y la caña va a la barra', () => {
    const lo = loMandadoParaLaCaja(
      'clave-1',
      MESA,
      [
        linea('a', 'Croquetas', 'cocina', 1),
        linea('b', 'Chuletón', 'cocina', 2),
        linea('c', 'Caña', 'barra', null),
        linea('d', 'Pan', 'ninguno', null),
      ],
      [],
      DONDE,
      (platoId) => (platoId === 'plato-a' ? ['gluten', 'huevo'] : []),
    );
    expect(lo).not.toBeNull();
    if (lo?.que !== 'nueva') throw new Error('Tenía que ser lo nuevo');
    expect(esLoQueSePasaPorLaCaja(lo)).toBe(true);
    expect(lo.id).toBe('clave-1');
    expect(lo.platos.map((p) => p.nombre)).toEqual(['Croquetas', 'Chuletón', 'Caña']);
    expect(lo.esperan).toEqual([2]);

    const cocina = laComandaPorLaCaja(lo, 'cocina');
    expect(cocina?.pases.map((p) => [p.numero, p.espera])).toEqual([
      [1, false],
      [2, true],
    ]);
    expect(cocina?.pases[0]?.lineas[0]?.alergenos).toEqual(['gluten', 'huevo']);
    expect(cocina?.notaDeLaMesa).toBe('Sin prisa');
    expect(laComandaPorLaCaja(lo, 'barra')?.pases[0]?.lineas.map((l) => l.nombre)).toEqual([
      'Caña',
    ]);
  });

  it('sin pases, todo sale a la vez', () => {
    const lo = loMandadoParaLaCaja(
      'clave-2',
      { ...MESA, porPases: false },
      [linea('a', 'Croquetas', 'cocina', 1), linea('b', 'Chuletón', 'cocina', 2)],
      [],
      DONDE,
    );
    expect(lo?.que === 'nueva' ? lo.esperan : null).toEqual([]);
  });

  it('con el 1.º aún en la cocina, lo nuevo del 2.º espera; lo que va solo a la sala no pasa', () => {
    const conElPrimero = {
      ...MESA,
      platos: [enLaCuenta('x', 1, 'en_marcha')],
      pases: [{ numero: 1, marchadoEn: '2026-10-31T20:00:00Z', haSalido: false }],
    };
    const lo = loMandadoParaLaCaja(
      'clave-3',
      conElPrimero,
      [linea('b', 'Chuletón', 'cocina', 2)],
      [],
      DONDE,
    );
    expect(lo?.que === 'nueva' ? lo.esperan : null).toEqual([2]);
    expect(
      loMandadoParaLaCaja('clave-4', MESA, [linea('d', 'Pan', 'ninguno', null)], [], DONDE),
    ).toBeNull();
  });

  it('la marcha lleva lo que falta por salir de ese pase, también lo mandado antes por la caja', () => {
    const antes = loMandadoParaLaCaja(
      'clave-5',
      MESA,
      [linea('a', 'Croquetas', 'cocina', 1), linea('b', 'Chuletón', 'cocina', 2)],
      [],
      DONDE,
    );
    const cola: CosaPorSubir[] = [
      {
        id: 'clave-5',
        nombre: 'mandar_a_cocina',
        entrada: { cuenta_id: MESA.cuentaId },
        hechoEn: 0,
        quien: { id: 'lucia', nombre: 'Lucía' },
        con: { turno: 't' },
        que: 'Mesa 4 · mandar a cocina',
        cuentaId: MESA.cuentaId,
        ...(antes === null ? {} : { paraLaCaja: antes }),
        enLaCaja: true,
      },
    ];
    const marcha = laMarchaParaLaCaja('clave-6', MESA, 2, cola, DONDE);
    expect(esLoQueSePasaPorLaCaja(marcha)).toBe(true);
    expect(marcha.platos.map((p) => p.nombre)).toEqual(['Chuletón']);
    expect(laComandaPorLaCaja(marcha, 'cocina')?.que).toBe('marcha');

    // Y mandar otra vez sabe que el 2.º ya esperaba: lo nuevo del 2.º también espera.
    const otra = loMandadoParaLaCaja(
      'clave-7',
      MESA,
      [linea('e', 'Lubina', 'cocina', 2)],
      cola,
      DONDE,
    );
    expect(otra?.que === 'nueva' ? otra.esperan : null).toEqual([2]);
  });
});
