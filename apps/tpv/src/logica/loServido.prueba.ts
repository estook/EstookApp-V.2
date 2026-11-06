import { describe, expect, it } from 'vitest';
import type { LaCartaDeLaSala, LaMesa, PlatoDeLaCuenta, PlatoDeLaSala } from '../datos/tipos.ts';
import { lasOpcionesParaCambiar } from './cambiarElPlato.ts';
import type { LineaALaVista } from './laCuenta.ts';
import { losGruposParaServir, loQueDiceElBoton } from './loServido.ts';

const plato = (id: string, cambios: Partial<PlatoDeLaCuenta> = {}): PlatoDeLaCuenta => ({
  id,
  platoId: `p-${id}`,
  menuId: null,
  parteDe: null,
  nombre: id,
  cantidad: 1,
  precioCentimos: 900,
  destino: 'cocina',
  pase: 1,
  nota: null,
  estado: 'en_marcha',
  salioEn: null,
  motivoDeQuitar: null,
  vuelve: null,
  ...cambios,
});

function mesa(platos: PlatoDeLaCuenta[], cambios: Partial<LaMesa> = {}): LaMesa {
  return {
    cuentaId: 'c',
    titulo: 'Mesa 5',
    tipo: 'mesa',
    mesaId: 'm5',
    personas: 2,
    camarero: 'Lucía',
    porPases: true,
    notaParaCocina: null,
    paraLas: null,
    conPrisa: false,
    cocinaLlamaEn: null,
    alergias: [],
    abierta: true,
    minutos: 30,
    totalCentimos: 0,
    platos,
    pases: [],
    loSiguiente: { que: 'cobrar' },
    marcanServido: { cocina: true, barra: true },
    ...cambios,
  };
}

describe('la hoja «Servido» (0132)', () => {
  it('las bebidas y cada pase: en cocina, ya servido o esperando a marchar', () => {
    const grupos = losGruposParaServir(
      mesa([
        plato('Caña', { destino: 'barra', pase: null, estado: 'en_la_barra' }),
        plato('Croquetas', { estado: 'salio', servidoEnSala: true }),
        plato('Ensalada', { estado: 'salio' }),
        plato('Entrecot', { pase: 2 }),
        plato('Bravas', { pase: 2, estado: 'salio' }),
        plato('Tarta', { pase: 4, estado: 'en_espera' }),
        plato('Pan', { destino: 'ninguno', pase: null, estado: 'salio' }),
        plato('Quitado', { estado: 'quitado' }),
      ]),
    );
    expect(grupos.map((g) => g.titulo)).toEqual([
      'Bebidas',
      '1.º · ya servido',
      '2.º · en cocina',
      'postre · espera a marchar',
    ]);
    expect(grupos[1]?.platos.map((p) => [p.nombre, p.como, p.deLaSala])).toEqual([
      ['Croquetas', 'servido', true],
      ['Ensalada', 'servido', false],
    ]);
  });

  it('solo lo que la sala puede marcar aquí: sin la barra, sin bebidas', () => {
    const grupos = losGruposParaServir(
      mesa([plato('Caña', { destino: 'barra', pase: null, estado: 'en_la_barra' })], {
        marcanServido: { cocina: true, barra: false },
      }),
    );
    expect(grupos).toEqual([]);
  });

  it('el botón dice lo que va a hacer', () => {
    expect(loQueDiceElBoton(0, 0)).toBeNull();
    expect(loQueDiceElBoton(1, 0)).toBe('Marcar 1 servido');
    expect(loQueDiceElBoton(3, 0)).toBe('Marcar 3 servidos');
    expect(loQueDiceElBoton(0, 2)).toBe('Quitar 2 de servido');
    expect(loQueDiceElBoton(2, 1)).toBe('Guardar');
  });
});

describe('por qué se cambia un plato (0132)', () => {
  const deLaSala = (id: string, nombre: string, precio: number): PlatoDeLaSala =>
    ({ id, nombre, precioCentimos: precio, agotado: false }) as PlatoDeLaSala;
  const carta = {
    hoy: '2026-11-06',
    montada: true,
    loMasPedido: [],
    paginas: [
      {
        id: 'e',
        nombre: 'Entrantes',
        platos: [deLaSala('cro', 'Croquetas', 900), deLaSala('bra', 'Bravas', 650)],
      },
      { id: 'p', nombre: 'Principales', platos: [deLaSala('ent', 'Entrecot', 2200)] },
      { id: 'm', nombre: 'Lo más pedido', platos: [deLaSala('bra', 'Bravas', 650)] },
    ],
    menus: [
      {
        id: 'menu',
        nombre: 'Menú del día',
        precioCentimos: 1350,
        secciones: [
          {
            id: 's2',
            nombre: 'Segundos',
            platos: [
              { platoId: 'pol', nombre: 'Pollo asado', suplementoCentimos: 0, agotado: false },
              { platoId: 'ent', nombre: 'Entrecot', suplementoCentimos: 400, agotado: false },
            ],
          },
        ],
      },
    ],
  } as unknown as LaCartaDeLaSala;
  const linea = (cambios: Partial<LineaALaVista>) =>
    ({ platoId: 'cro', menuDelPlato: null, ...cambios }) as LineaALaVista;

  it('de la carta: primero los de su página, y en el buscador toda la carta, sin repetir', () => {
    const { cercanos, todos } = lasOpcionesParaCambiar(carta, linea({}));
    expect(cercanos.map((p) => p.nombre)).toEqual(['Bravas']);
    expect(todos.map((p) => p.nombre)).toEqual(['Bravas', 'Entrecot']);
  });

  it('de un menú: solo los de su sección de hoy, con su suplemento', () => {
    const { cercanos } = lasOpcionesParaCambiar(
      carta,
      linea({ platoId: 'pol', menuDelPlato: 'menu' }),
    );
    expect(cercanos.map((p) => [p.nombre, p.precioCentimos])).toEqual([['Entrecot', 400]]);
  });
});
