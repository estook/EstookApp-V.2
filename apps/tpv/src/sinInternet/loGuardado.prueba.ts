import { describe, expect, it } from 'vitest';
import type { ElPlano, MesaDelPlano } from '../datos/tipos.ts';
import type { CosaPorSubir } from './laCola.ts';
import {
  elPlanoConLoGuardado,
  laMesaGuardada,
  lineasGuardadas,
  marchadoSinInternet,
} from './loGuardado.ts';

/**
 * Lo guardado sin internet, en la sala (T5 · 2 · 1): la mesa abierta sin internet sale ocupada
 * y se puede abrir; lo pedido, aparte; lo marchado no se vuelve a ofrecer. Y nada se inventa
 * de lo que diría la cocina.
 */

const LUCIA = { id: 'lucia', nombre: 'Lucía' };
const AHORA = 10 * 60_000;

function mesaLibre(id: string, nombre: string): MesaDelPlano {
  return {
    id,
    nombre,
    plazas: 4,
    forma: 'cuadrada',
    x: 0,
    y: 0,
    ancho: 80,
    fondo: 80,
    estirada: false,
    giro: 0,
    estado: 'libre',
    cuenta: null,
  };
}

const PLANO: ElPlano = {
  zonas: [{ id: 'salon', nombre: 'Salón', orden: 1, mesas: [mesaLibre('m4', '4')], cosas: [] }],
  puedeDibujar: false,
  sinMesa: [],
  tocaMarchar: [{ cuentaId: 'c9', titulo: 'Mesa 9', pase: 2, salioEl: 1 }],
  camareros: [],
};

function guardada(nombre: string, entrada: unknown, extra: Partial<CosaPorSubir> = {}) {
  return {
    id: `${nombre}-${String(Math.random())}`,
    nombre,
    entrada,
    hechoEn: 4 * 60_000,
    quien: LUCIA,
    con: { turno: 'T' },
    que: nombre,
    ...extra,
  } satisfies CosaPorSubir;
}

const ABRIR_LA_4 = guardada(
  'abrir_mesa',
  { cuenta_id: 'c4', mesa_id: 'm4', personas: 3, por_pases: true },
  { cuentaId: 'c4' },
);
const PEDIR_EN_LA_4 = guardada(
  'pedir',
  { cuenta_id: 'c4', platos: [] },
  {
    cuentaId: 'c4',
    lineas: [
      { nombre: 'Croquetas', cantidad: 2, precioCentimos: 450 },
      { nombre: 'Ensalada', cantidad: 1, precioCentimos: 900 },
    ],
  },
);

describe('lo guardado sin internet, en la sala', () => {
  it('sin nada guardado, el plano es el de Estook, tal cual', () => {
    expect(elPlanoConLoGuardado(PLANO, [], AHORA)).toBe(PLANO);
  });

  it('la mesa abierta sin internet sale ocupada, de quien la abrió, con lo pedido en su total', () => {
    const plano = elPlanoConLoGuardado(PLANO, [ABRIR_LA_4, PEDIR_EN_LA_4], AHORA);
    const la4 = plano.zonas[0]?.mesas[0];
    expect(la4?.estado).toBe('por_mandar');
    expect(la4?.cuenta).toMatchObject({
      cuentaId: 'c4',
      titulo: 'Mesa 4',
      personas: 3,
      camarero: 'Lucía',
      esMia: true,
      minutos: 6,
      totalCentimos: 1800,
      loSiguiente: { que: 'mandar' },
    });
  });

  it('en barra o para llevar, va con las de sin mesa', () => {
    const barra = guardada('abrir_mesa', { cuenta_id: 'cb', tipo: 'barra', nombre: 'Iker' });
    const llevar = guardada('abrir_mesa', { cuenta_id: 'cl', tipo: 'para_llevar' });
    const plano = elPlanoConLoGuardado(PLANO, [barra, llevar], AHORA);
    expect(plano.sinMesa.map((c) => [c.titulo, c.porPases])).toEqual([
      ['Barra · Iker', true],
      ['Para llevar', false],
    ]);
  });

  it('lo que ya falló al subir no se pinta como abierto', () => {
    const fallida = { ...ABRIR_LA_4, fallo: 'La mesa ya estaba ocupada.' };
    expect(elPlanoConLoGuardado(PLANO, [fallida], AHORA).zonas[0]?.mesas[0]?.cuenta).toBeNull();
  });

  it('lo marchado sin internet no se vuelve a ofrecer', () => {
    const marchada = guardada('marchar', { cuenta_id: 'c9', pase: 2 }, { cuentaId: 'c9' });
    expect(marchadoSinInternet('c9', 2, [marchada])).toBe(true);
    expect(marchadoSinInternet('c9', 3, [marchada])).toBe(false);
    expect(elPlanoConLoGuardado(PLANO, [marchada], AHORA).tocaMarchar).toEqual([]);
  });

  it('se entra en la mesa abierta sin internet; lo pedido va aparte y no se inventa la cocina', () => {
    const mesa = laMesaGuardada('c4', [ABRIR_LA_4, PEDIR_EN_LA_4], PLANO, AHORA);
    expect(mesa).toMatchObject({
      cuentaId: 'c4',
      titulo: 'Mesa 4',
      mesaId: 'm4',
      abierta: true,
      platos: [],
      pases: [],
      totalCentimos: 0,
      loSiguiente: { que: 'pedir' },
    });
    expect(lineasGuardadas('c4', [ABRIR_LA_4, PEDIR_EN_LA_4])).toHaveLength(2);
    expect(laMesaGuardada('otra', [ABRIR_LA_4], PLANO, AHORA)).toBeUndefined();
  });
});
