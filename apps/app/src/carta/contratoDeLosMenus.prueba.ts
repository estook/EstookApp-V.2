import { describe, expect, it } from 'vitest';
import {
  comoEstasEnLetra,
  elDiaEnLetra,
  elDiaQueSeAbre,
  elMenuEnTexto,
  laWebDe,
  loQueDejaEnLetra,
  loQueIncluye,
  type UnDiaDelMenu,
  type UnMenu,
} from './contratoDeLosMenus.ts';

function unDia(fecha: string, cambios: Partial<UnDiaDelMenu> = {}): UnDiaDelMenu {
  return {
    fecha,
    esHoy: false,
    yaPaso: false,
    montado: true,
    repiteDe: null,
    platos: {},
    ...cambios,
  };
}

const plato = (nombre: string, suplementoCentimos = 0) => ({
  platoId: nombre,
  nombre,
  suplementoCentimos,
  soloDelMenu: false,
  agotado: false,
  tieneEscandallo: true,
});

const MENU: UnMenu = {
  id: 'm',
  nombre: 'Menú del día',
  clase: 'del_dia',
  precioCentimos: 1350,
  entraPan: true,
  entraCafe: true,
  diasQueSeSirve: [1, 2, 3, 4, 5],
  pan: null,
  cafe: null,
  version: 1,
  secciones: [
    { id: 'p', nombre: 'Primeros', esPostre: false, incluida: true },
    { id: 's', nombre: 'Segundos', esPostre: false, incluida: true },
    { id: 'o', nombre: 'Postre', esPostre: true, incluida: true },
    { id: 'b', nombre: 'Bebida', esPostre: false, incluida: true },
  ],
  dias: [
    unDia('2026-10-19', { yaPaso: true }),
    unDia('2026-10-20', { esHoy: true }),
    unDia('2026-10-21'),
  ],
};

describe('el menú en la pantalla', () => {
  it('el día en letra, como en la pizarra', () => {
    expect(elDiaEnLetra('2026-10-20')).toBe('Martes 20 de octubre');
    expect(elDiaEnLetra('2026-10-25')).toBe('Domingo 25 de octubre');
  });

  it('se abre por hoy; si hoy no se sirve, por el siguiente', () => {
    expect(elDiaQueSeAbre(MENU)).toBe('2026-10-20');
    const sinHoy = { ...MENU, dias: MENU.dias.map((d) => ({ ...d, esHoy: false })) };
    expect(elDiaQueSeAbre(sinHoy)).toBe('2026-10-20');
    expect(elDiaQueSeAbre({ ...MENU, dias: [] })).toBeNull();
  });

  it('para WhatsApp: el título en negrita, «postre o café», el suplemento y el precio', () => {
    const martes = unDia('2026-10-20', {
      platos: {
        p: [plato('Lentejas'), plato('Ensalada mixta')],
        s: [plato('Pollo asado'), plato('Entrecot', 400)],
        o: [plato('Flan')],
        b: [plato('Agua')],
      },
    });
    expect(elMenuEnTexto(MENU, martes)).toBe(
      [
        '*Menú del día · Martes 20 de octubre*',
        'Primeros: Lentejas · Ensalada mixta',
        'Segundos: Pollo asado · Entrecot (+4,00 €)',
        'Postre o café: Flan',
        'Bebida: Agua',
        'Pan incluido',
        '13,50 € · IVA incluido',
      ].join('\n'),
    );
  });

  it('el café sin postre va aparte, con el pan', () => {
    const sinPostre = unDia('2026-10-20', { platos: { p: [plato('Sopa')] } });
    expect(loQueIncluye(MENU, sinPostre)).toBe('Pan y café incluidos');
    expect(loQueIncluye({ ...MENU, entraPan: false, entraCafe: false }, sinPostre)).toBeNull();
  });
});

describe('lo que deja, en letra', () => {
  it('lo peor y lo mejor, y quién lo hunde', () => {
    const dice = loQueDejaEnLetra({
      estado: 'listo',
      peor: { dejaCentimos: 761, costeCentimos: 830, foodCost: 0.5, elige: [] },
      mejor: { dejaCentimos: 887, costeCentimos: 340, foodCost: 0.3, elige: [] },
      loHunde: 'Entrecot',
      sinCoste: [],
    });
    expect(dice.titulo).toBe('Te deja de 7,61 € a 8,87 € por menú');
    expect(dice.detalle).toBe('Lo menos (si todos piden entrecot).');
    expect(dice.tono).toBe('bien');
  });

  it('si puede perder dinero, lo dice primero', () => {
    const dice = loQueDejaEnLetra({
      estado: 'listo',
      peor: { dejaCentimos: -120, costeCentimos: 1000, foodCost: 1.1, elige: [] },
      mejor: { dejaCentimos: 300, costeCentimos: 500, foodCost: 0.6, elige: [] },
      loHunde: 'Entrecot',
      sinCoste: [],
    });
    expect(dice.titulo).toBe('Puede perder 1,20 € por menú (si todos piden entrecot)');
    expect(dice.tono).toBe('mal');
  });

  it('sin escandallos, qué falta desgranar', () => {
    expect(loQueDejaEnLetra({ estado: 'faltan_costes', faltan: ['Lentejas', 'Flan'] })).toEqual({
      titulo: 'Para saber lo que te deja, falta desgranar',
      detalle: 'Lentejas, Flan',
      tono: 'atencion',
    });
  });
});

describe('tu zona, en letra', () => {
  it('por encima, en la media y por debajo', () => {
    const base = { cuantos: 3, mediaCentimos: 550, desdeCentimos: 500, hastaCentimos: 600 };
    expect(comoEstasEnLetra({ ...base, diferenciaCentimos: 150, como: 'por_encima' })).toBe(
      '1,50 € por encima de tu zona',
    );
    expect(comoEstasEnLetra({ ...base, diferenciaCentimos: -80, como: 'por_debajo' })).toBe(
      '0,80 € por debajo de tu zona',
    );
    expect(comoEstasEnLetra({ ...base, diferenciaCentimos: 10, como: 'en_la_media' })).toBe(
      'En la media de tu zona',
    );
  });

  it('de dónde sale cada precio: su web, sin «www.»', () => {
    expect(laWebDe('https://www.barpepe.es/carta')).toBe('barpepe.es');
    expect(laWebDe('no es un enlace')).toBe('no es un enlace');
  });
});
