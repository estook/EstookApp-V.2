import { describe, expect, it } from 'vitest';
import type { PlatoDeLaCuenta } from '../datos/tipos.ts';
import { comoLineasNuevas, loQueSeRepite, loUltimoPedido } from './repetirPedido.ts';

function plato(nombre: string, mandadaEn: string | null, cambios: Partial<PlatoDeLaCuenta> = {}) {
  return {
    id: `l-${nombre}-${String(mandadaEn)}`,
    platoId: `p-${nombre}`,
    menuId: null,
    parteDe: null,
    nombre,
    cantidad: 2,
    precioCentimos: 220,
    destino: 'barra',
    pase: null,
    nota: null,
    estado: mandadaEn === null ? 'sin_mandar' : 'en_la_barra',
    salioEn: null,
    motivoDeQuitar: null,
    vuelve: null,
    opciones: [],
    pesoGramos: null,
    alergenos: [],
    servidoEnSala: false,
    cambioDe: null,
    mandadaEn,
    ...cambios,
  } satisfies PlatoDeLaCuenta;
}

const PRIMERA = '2026-11-18T13:00:00.000Z';
const SEGUNDA = '2026-11-18T13:40:00.000Z';

describe('repetir pedido (0148)', () => {
  it('repite lo último que se mandó a la vez, y no lo de antes ni lo sin mandar', () => {
    const platos = [
      plato('Croquetas', PRIMERA, { destino: 'cocina' }),
      plato('Caña', SEGUNDA),
      plato('Agua', SEGUNDA, { cantidad: 1 }),
      plato('Tarta', null),
    ];
    expect(loUltimoPedido(platos).map((p) => p.nombre)).toEqual(['Caña', 'Agua']);
    expect(loQueSeRepite(loUltimoPedido(platos))).toBe('2 Caña · 1 Agua');
  });

  it('no repite lo quitado, los menús, lo elegido ni lo pesado', () => {
    const platos = [
      plato('Caña', SEGUNDA),
      plato('Vino', SEGUNDA, { estado: 'quitado' }),
      plato('Menú', SEGUNDA, { menuId: 'm1' }),
      plato('Hamburguesa', SEGUNDA, { opciones: ['Patatas'] }),
      plato('Jamón', SEGUNDA, { pesoGramos: 120 }),
    ];
    expect(loUltimoPedido(platos).map((p) => p.nombre)).toEqual(['Caña']);
  });

  it('sin nada mandado, o con una API que no dice cuándo, no hay nada que repetir', () => {
    expect(loUltimoPedido([plato('Caña', null)])).toEqual([]);
    const sinCuando = Object.fromEntries(
      Object.entries(plato('Caña', PRIMERA)).filter(([clave]) => clave !== 'mandadaEn'),
    ) as unknown as PlatoDeLaCuenta;
    expect(loUltimoPedido([sinCuando])).toEqual([]);
  });

  it('lo repetido entra como nuevo: id nuevo, sin pase y sin la nota de entonces', () => {
    const [linea] = comoLineasNuevas(
      [plato('Caña', SEGUNDA, { pase: 2, nota: 'sin hielo' })],
      () => 'nuevo',
    );
    expect(linea).toEqual({
      id: 'nuevo',
      platoId: 'p-Caña',
      menuId: null,
      parteDe: null,
      nombre: 'Caña',
      cantidad: 2,
      precioCentimos: 220,
      destino: 'barra',
      pase: null,
      nota: null,
    });
  });
});
