import { describe, expect, it } from 'vitest';
import type { LaMesa } from '../datos/tipos.ts';
import {
  anadirAlMenu,
  anadirMenus,
  anadirPlato,
  cambiarLinea,
  comoPedido,
  loQueVale,
  quitarLinea,
  type Borrador,
} from './comanda.ts';
import { elPaseDeFabrica, losGruposDeLaCuenta, losPasesQueSeEligen } from './laCuenta.ts';

const croquetas = { id: 'p-croquetas', nombre: 'Croquetas', precioCentimos: 900 };
const cana = { id: 'p-cana', nombre: 'Caña', precioCentimos: 250 };
const menu = { id: 'm-dia', nombre: 'Menú del día', precioCentimos: 1350 };

describe('la comanda que se va tomando', () => {
  it('dos toques en el mismo plato son «2 Croquetas», no dos líneas', () => {
    let b: Borrador = [];
    b = anadirPlato(b, croquetas, { destino: 'cocina', pase: 1 });
    b = anadirPlato(b, croquetas, { destino: 'cocina', pase: 1 });
    expect(b).toHaveLength(1);
    expect(b[0]?.cantidad).toBe(2);
    expect(loQueVale(b)).toBe(1800);
  });

  it('en otro pase, o con nota, es otra línea', () => {
    let b: Borrador = anadirPlato([], croquetas, { destino: 'cocina', pase: 1 });
    b = anadirPlato(b, croquetas, { destino: 'cocina', pase: 2 });
    expect(b).toHaveLength(2);
    b = cambiarLinea(b, b[0]?.id ?? '', { nota: 'sin jamón' });
    b = anadirPlato(b, croquetas, { destino: 'cocina', pase: 1 });
    expect(b).toHaveLength(3);
  });

  it('lo de la barra no tiene pase', () => {
    const b = anadirPlato([], cana, { destino: 'barra', pase: 2 });
    expect(b[0]?.pase).toBeNull();
    expect(cambiarLinea(b, b[0]?.id ?? '', { pase: 3 })[0]?.pase).toBeNull();
  });

  it('con cero se quita, y la nota vacía es sin nota', () => {
    const b = anadirPlato([], croquetas, { destino: 'cocina', pase: 1 });
    const id = b[0]?.id ?? '';
    expect(cambiarLinea(b, id, { nota: '   ' })[0]?.nota).toBeNull();
    expect(cambiarLinea(b, id, { cantidad: 0 })).toEqual([]);
  });

  it('dos menús: cada uno con su primero y su segundo, y el suplemento en el suyo', () => {
    const b = anadirMenus([], menu, 2, [
      {
        seccion: { pase: 1, esBebida: false },
        platos: [
          { platoId: 'lentejas', nombre: 'Lentejas', suplementoCentimos: 0, cuantos: 1 },
          { platoId: 'ensalada', nombre: 'Ensalada', suplementoCentimos: 0, cuantos: 1 },
        ],
      },
      {
        seccion: { pase: 2, esBebida: false },
        platos: [
          { platoId: 'merluza', nombre: 'Merluza', suplementoCentimos: 0, cuantos: 1 },
          { platoId: 'entrecot', nombre: 'Entrecot', suplementoCentimos: 400, cuantos: 1 },
        ],
      },
      {
        seccion: { pase: null, esBebida: true },
        platos: [{ platoId: 'vino', nombre: 'Copa de vino', suplementoCentimos: 0, cuantos: 2 }],
      },
    ]);
    const menus = b.filter((l) => l.menuId !== null);
    expect(menus).toHaveLength(2);
    const deCadaUno = menus.map((m) => b.filter((l) => l.parteDe === m.id).map((l) => l.nombre));
    expect(deCadaUno).toEqual([
      ['Lentejas', 'Merluza', 'Copa de vino'],
      ['Ensalada', 'Entrecot', 'Copa de vino'],
    ]);
    expect(b.find((l) => l.nombre === 'Copa de vino')).toMatchObject({
      destino: 'barra',
      pase: null,
    });
    expect(loQueVale(b)).toBe(1350 * 2 + 400);
    // Quitar un menú se lleva lo suyo.
    expect(quitarLinea(b, menus[0]?.id ?? '')).toHaveLength(4);
  });

  it('el postre del menú que ya está en la mesa va dentro de su menú', () => {
    const b = anadirAlMenu(
      [],
      'linea-del-menu',
      { platoId: 'flan', nombre: 'Flan', suplementoCentimos: 0 },
      {
        pase: 3,
        esBebida: false,
      },
    );
    expect(b[0]).toMatchObject({ parteDe: 'linea-del-menu', pase: 3, destino: 'cocina' });
  });

  it('se pide sin decir el destino: lo pone la API por la sección', () => {
    const b = anadirPlato([], croquetas, { destino: 'cocina', pase: 2 });
    const [pedido] = comoPedido(cambiarLinea(b, b[0]?.id ?? '', { nota: 'poco hechas' }));
    expect(pedido).toEqual({ id: b[0]?.id, plato_id: 'p-croquetas', pase: 2, nota: 'poco hechas' });
  });
});

function unaMesa(parte: Partial<LaMesa>): LaMesa {
  return {
    cuentaId: 'c',
    titulo: 'Mesa 6',
    tipo: 'mesa',
    mesaId: 'm',
    personas: 4,
    camarero: 'Sara',
    porPases: true,
    notaParaCocina: null,
    conPrisa: false,
    cocinaLlamaEn: null,
    abierta: true,
    minutos: 30,
    totalCentimos: 0,
    platos: [],
    pases: [],
    loSiguiente: { que: 'cobrar' },
    ...parte,
  };
}

const plato = (parte: Partial<LaMesa['platos'][number]>): LaMesa['platos'][number] => ({
  id: crypto.randomUUID(),
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
  ...parte,
});

describe('cómo se lee la cuenta', () => {
  it('bebidas, menús, el 1.º y el 2.º con cómo van, y lo nuevo abajo', () => {
    const mesa = unaMesa({
      platos: [
        plato({ nombre: 'Caña', destino: 'barra', pase: null, estado: 'en_la_barra' }),
        plato({ nombre: 'Croquetas', pase: 1, estado: 'salio' }),
        plato({ nombre: 'Entrecot', pase: 2, estado: 'en_espera' }),
        plato({ nombre: 'Pollo', pase: 2, estado: 'quitado', motivoDeQuitar: 'no lo pidieron' }),
      ],
      pases: [
        { numero: 1, marchadoEn: '2026-10-20T12:00:00Z', haSalido: true },
        { numero: 2, marchadoEn: null, haSalido: false },
      ],
    });
    const borrador = anadirPlato(
      [],
      { id: 't', nombre: 'Tarta', precioCentimos: 600 },
      {
        destino: 'cocina',
        pase: 3,
      },
    );
    const grupos = losGruposDeLaCuenta(mesa, borrador);
    expect(grupos.map((g) => g.titulo)).toEqual([
      'Bebidas',
      '1.º · ha salido todo',
      '2.º · en espera',
      'Nuevo · sin mandar',
    ]);
    expect(grupos[2]?.lineas.find((l) => l.nombre === 'Pollo')?.quitada).toBe('no lo pidieron');
    expect(grupos[3]?.lineas[0]).toMatchObject({ nombre: 'Tarta', nueva: true, pase: 3 });
  });

  it('el pase de fábrica: el 1.º en una mesa sin nada, y si no, el último con algo', () => {
    expect(elPaseDeFabrica(unaMesa({}), [])).toBe(1);
    const mesa = unaMesa({ platos: [plato({ pase: 1 }), plato({ pase: 2 })] });
    expect(elPaseDeFabrica(mesa, [])).toBe(2);
    expect(losPasesQueSeEligen(mesa, [])).toEqual([1, 2, 3]);
    expect(losPasesQueSeEligen(unaMesa({ platos: [plato({ pase: 3 })] }), [])).toEqual([
      1, 2, 3, 4,
    ]);
  });
});
