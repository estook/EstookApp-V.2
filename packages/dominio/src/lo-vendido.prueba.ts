import { describe, expect, it } from 'vitest';
import {
  aCuatroDecimales,
  elFoodCost,
  loQueBajaUnPlato,
  loQueVuelve,
  loVendidoPorProducto,
  type LibroQueBaja,
  type LineaCobrada,
  type PlatoCobrado,
} from './lo-vendido.ts';

/**
 * Lo que resta un plato vendido (M20 · 1, 0149). Cada número de aquí está hecho a mano: si una
 * cuenta cambia, que lo diga una prueba y no un recuento a fin de mes.
 */
const libro: LibroQueBaja = {
  productos: new Map([
    ['carne', { id: 'carne', unidad: 'kg' }],
    ['pan', { id: 'pan', unidad: 'ud' }],
    ['cebolla', { id: 'cebolla', unidad: 'kg' }],
    ['atun', { id: 'atun', unidad: 'kg' }],
    ['barril', { id: 'barril', unidad: 'l' }],
    ['tonica', { id: 'tonica', unidad: 'ud' }],
    ['ginebra', { id: 'ginebra', unidad: 'ml' }],
    ['jamon', { id: 'jamon', unidad: 'kg' }],
    ['tomate', { id: 'tomate', unidad: 'kg' }],
    ['aceite', { id: 'aceite', unidad: 'l' }],
    ['lentejas', { id: 'lentejas', unidad: 'kg' }],
    // Bandejas de 200 g: la receta la pide en gramos.
    ['albahaca', { id: 'albahaca', unidad: 'ud', contenido: { cantidad: 200, unidad: 'g' } }],
    // Por cajas, sin decir cuánto trae cada una: los gramos no se pueden pasar.
    ['setas', { id: 'setas', unidad: 'ud' }],
  ]),
  elaboraciones: new Map([
    [
      'sofrito',
      {
        id: 'sofrito',
        nombre: 'Sofrito',
        rindeCantidad: 2,
        rindeUnidad: 'l',
        lineas: [
          { productoId: 'tomate', elaboracionId: null, cantidad: 3, unidad: 'kg' },
          { productoId: 'aceite', elaboracionId: null, cantidad: 0.5, unidad: 'l' },
        ],
      },
    ],
  ]),
};

const hamburguesa: PlatoCobrado['receta'] = {
  raciones: 1,
  lineas: [
    { productoId: 'carne', elaboracionId: null, cantidad: 180, unidad: 'g' },
    { productoId: 'pan', elaboracionId: null, cantidad: 1, unidad: 'ud' },
    { productoId: 'cebolla', elaboracionId: null, cantidad: 40, unidad: 'g' },
  ],
};

function vendido(cosas: Partial<PlatoCobrado>): PlatoCobrado {
  return { cantidad: 1, receta: null, aPeso: false, pesoGramos: null, opciones: [], ...cosas };
}

describe('lo que resta un plato vendido', () => {
  it('dos hamburguesas restan dos veces su receta, ni un gramo más', () => {
    const r = loQueBajaUnPlato(vendido({ cantidad: 2, receta: hamburguesa }), libro);
    expect(r.sinEscandallo).toBe(false);
    expect(r.faltan).toBe(0);
    expect(r.porProducto.get('carne')).toBe(0.36);
    expect(r.porProducto.get('pan')).toBe(2);
    // 40 g × 2: lo que pide el escandallo, sin aprovechamiento (0150).
    expect(r.porProducto.get('cebolla')).toBe(0.08);
  });

  it('«sin cebolla» no resta la cebolla', () => {
    const r = loQueBajaUnPlato(
      vendido({ receta: hamburguesa, opciones: [{ anade: null, quita: 'cebolla' }] }),
      libro,
    );
    expect(r.porProducto.has('cebolla')).toBe(false);
    expect(r.porProducto.get('carne')).toBe(0.18);
  });

  it('100 g de atún en el escandallo son 100 g de atún del almacén (0150)', () => {
    const r = loQueBajaUnPlato(
      vendido({
        receta: {
          raciones: 1,
          lineas: [{ productoId: 'atun', elaboracionId: null, cantidad: 100, unidad: 'g' }],
        },
      }),
      libro,
    );
    expect(r.porProducto.get('atun')).toBe(0.1);
  });

  it('la copa resta su dosis y la tónica que se eligió, una por cada copa', () => {
    const r = loQueBajaUnPlato(
      vendido({
        cantidad: 2,
        receta: {
          raciones: 1,
          lineas: [{ productoId: 'ginebra', elaboracionId: null, cantidad: 50, unidad: 'ml' }],
        },
        opciones: [{ anade: { productoId: 'tonica', cantidad: 1, unidad: 'ud' }, quita: null }],
      }),
      libro,
    );
    expect(r.porProducto.get('ginebra')).toBe(100);
    expect(r.porProducto.get('tonica')).toBe(2);
  });

  it('dos cañas de 200 ml restan 0,4 l del barril', () => {
    const r = loQueBajaUnPlato(
      vendido({
        cantidad: 2,
        receta: {
          raciones: 1,
          lineas: [{ productoId: 'barril', elaboracionId: null, cantidad: 200, unidad: 'ml' }],
        },
      }),
      libro,
    );
    expect(r.porProducto.get('barril')).toBe(0.4);
  });

  it('150 g de jamón a peso restan 0,15 de su escandallo de un kilo', () => {
    const r = loQueBajaUnPlato(
      vendido({
        aPeso: true,
        pesoGramos: 150,
        receta: {
          raciones: 1,
          lineas: [{ productoId: 'jamon', elaboracionId: null, cantidad: 1, unidad: 'kg' }],
        },
      }),
      libro,
    );
    expect(r.porProducto.get('jamon')).toBe(0.15);
  });

  it('una ración de un puchero escrito para 25 resta la veinticincoava parte', () => {
    const r = loQueBajaUnPlato(
      vendido({
        receta: {
          raciones: 25,
          lineas: [{ productoId: 'lentejas', elaboracionId: null, cantidad: 2.5, unidad: 'kg' }],
        },
      }),
      libro,
    );
    expect(r.porProducto.get('lentejas')).toBe(0.1);
  });

  it('lo de dentro de una elaboración se reparte por lo que rinde', () => {
    // 100 ml de un sofrito que rinde 2 l: la veinteava parte de 3 kg de tomate y 0,5 l de aceite.
    const r = loQueBajaUnPlato(
      vendido({
        receta: {
          raciones: 1,
          lineas: [{ productoId: null, elaboracionId: 'sofrito', cantidad: 100, unidad: 'ml' }],
        },
      }),
      libro,
    );
    expect(r.porProducto.get('tomate')).toBe(0.15);
    expect(r.porProducto.get('aceite')).toBe(0.025);
  });

  it('20 g de albahaca en bandejas de 200 g son una décima de bandeja', () => {
    const r = loQueBajaUnPlato(
      vendido({
        receta: {
          raciones: 1,
          lineas: [{ productoId: 'albahaca', elaboracionId: null, cantidad: 20, unidad: 'g' }],
        },
      }),
      libro,
    );
    expect(r.porProducto.get('albahaca')).toBe(0.1);
  });

  it('lo que no se puede pasar a su unidad no se resta, y se cuenta', () => {
    const r = loQueBajaUnPlato(
      vendido({
        receta: {
          raciones: 1,
          lineas: [
            { productoId: 'setas', elaboracionId: null, cantidad: 300, unidad: 'g' },
            { productoId: 'pan', elaboracionId: null, cantidad: 1, unidad: 'ud' },
            { productoId: 'ya-no-esta', elaboracionId: null, cantidad: 1, unidad: 'ud' },
          ],
        },
      }),
      libro,
    );
    expect(r.faltan).toBe(2);
    expect(r.porProducto.has('setas')).toBe(false);
    expect(r.porProducto.get('pan')).toBe(1);
  });

  it('un plato sin escandallo no resta lo suyo, y lo dice', () => {
    const r = loQueBajaUnPlato(vendido({ cantidad: 3 }), libro);
    expect(r.sinEscandallo).toBe(true);
    expect(r.porProducto.size).toBe(0);
    expect(r.faltan).toBe(0);
  });

  it('sin escandallo, lo que añade una opción sí sale', () => {
    const r = loQueBajaUnPlato(
      vendido({
        opciones: [{ anade: { productoId: 'tonica', cantidad: 1, unidad: 'ud' }, quita: null }],
      }),
      libro,
    );
    expect(r.sinEscandallo).toBe(true);
    expect(r.porProducto.get('tonica')).toBe(1);
  });

  it('cuatro decimales, como el libro', () => {
    expect(aCuatroDecimales(0.123456)).toBe(0.1235);
    // Tres raciones de una tanda de 7: 1 kg × 3 / 7 = 0,428571…
    const r = loQueBajaUnPlato(
      vendido({
        cantidad: 3,
        receta: {
          raciones: 7,
          lineas: [{ productoId: 'carne', elaboracionId: null, cantidad: 1, unidad: 'kg' }],
        },
      }),
      libro,
    );
    expect(r.porProducto.get('carne')).toBe(0.4286);
  });
});

describe('lo que vuelve con «Se cobró de más»', () => {
  it('dos de tres cañas vuelven dos tercios de lo que restaron', () => {
    expect(loQueVuelve(0.6, 2, 3)).toBe(0.4);
  });
  it('nunca vuelve más de lo que salió', () => {
    expect(loQueVuelve(0.6, 5, 3)).toBe(0.6);
    expect(loQueVuelve(0.6, 0, 3)).toBe(0);
    expect(loQueVuelve(0.6, 1, 0)).toBe(0);
  });
});

describe('lo vendido, plato a plato (Por producto)', () => {
  const linea = (cosas: Partial<LineaCobrada> & { lineaId: string }): LineaCobrada => ({
    platoId: null,
    menuId: null,
    menuDe: null,
    nombre: 'Plato',
    seccion: null,
    cantidad: 1,
    importeCentimos: 0,
    estado: 'bajada',
    costeMilesimas: 0,
    ...cosas,
  });

  it('junta por plato, pasa a sin IVA una vez y el total es la suma de las filas', () => {
    const r = loVendidoPorProducto(
      [
        // Dos mesas con croquetas: 2 × 8,80 € y 1 × 8,80 €, con IVA del 10 %.
        linea({
          lineaId: 'a',
          platoId: 'croq',
          nombre: 'Croquetas',
          seccion: 'Tapas',
          cantidad: 2,
          importeCentimos: 1760,
          costeMilesimas: 420_000,
        }),
        linea({
          lineaId: 'b',
          platoId: 'croq',
          nombre: 'Croquetas',
          seccion: 'Tapas',
          cantidad: 1,
          importeCentimos: 880,
          costeMilesimas: 210_000,
        }),
        linea({
          lineaId: 'c',
          platoId: 'cana',
          nombre: 'Caña',
          seccion: 'Bebidas',
          cantidad: 3,
          importeCentimos: 750,
          costeMilesimas: 135_000,
        }),
      ],
      0.1,
    );
    const croquetas = r.productos.find((p) => p.id === 'croq');
    // 26,40 € con IVA son 24,00 € sin IVA; costaron 6,30 €: un 26,3 %.
    expect(croquetas).toMatchObject({ uds: 3, ventas: 2400, coste: 630, foodCost: 26.3 });
    // 7,50 € con IVA son 6,82 € sin IVA (6,818…); costaron 1,35 €: un 19,8 %.
    expect(r.productos.find((p) => p.id === 'cana')).toMatchObject({
      uds: 3,
      ventas: 682,
      coste: 135,
      foodCost: 19.8,
    });
    expect(r.ventas).toBe(2400 + 682);
    expect(r.coste).toBe(630 + 135);
    expect(r.foodCost).toBe(elFoodCost(765, 3082));
    expect(r.productos[0]?.id).toBe('croq');
  });

  it('un menú es una fila, con lo que costaron sus platos y su suplemento', () => {
    const r = loVendidoPorProducto(
      [
        linea({
          lineaId: 'm',
          menuId: 'menu-dia',
          nombre: 'Menú del día',
          estado: 'sin_plato',
          costeMilesimas: null,
          importeCentimos: 1400,
        }),
        linea({
          lineaId: 'p1',
          platoId: 'lentejas',
          menuDe: 'm',
          nombre: 'Lentejas',
          seccion: 'Primeros',
          costeMilesimas: 90_000,
        }),
        linea({
          lineaId: 'p2',
          platoId: 'secreto',
          menuDe: 'm',
          nombre: 'Secreto',
          seccion: 'Segundos',
          importeCentimos: 220,
          costeMilesimas: 230_000,
        }),
      ],
      0.1,
    );
    expect(r.productos).toHaveLength(1);
    // 14,00 € + 2,20 € de suplemento = 16,20 € con IVA, 14,73 € sin IVA; costaron 0,90 + 2,30 €.
    expect(r.productos[0]).toMatchObject({
      id: 'menu:menu-dia',
      nombre: 'Menú del día',
      seccion: 'Menús',
      uds: 1,
      ventas: 1473,
      coste: 320,
      foodCost: 21.7,
    });
  });

  it('sin escandallo no hay coste, y no entra en el food cost', () => {
    const r = loVendidoPorProducto(
      [
        linea({ lineaId: 'a', platoId: 'croq', importeCentimos: 1100, costeMilesimas: 250_000 }),
        linea({
          lineaId: 'b',
          platoId: 'pulpo',
          nombre: 'Pulpo',
          estado: 'sin_escandallo',
          costeMilesimas: null,
          importeCentimos: 1650,
        }),
      ],
      0.1,
    );
    const pulpo = r.productos.find((p) => p.id === 'pulpo');
    expect(pulpo).toMatchObject({ ventas: 1500, coste: null, foodCost: null, sinEscandallo: true });
    expect(r.sinEscandallo).toBe(1);
    expect(r.ventas).toBe(1000 + 1500);
    // Solo con las croquetas: 2,50 € de 10,00 €.
    expect(r.ventasConCoste).toBe(1000);
    expect(r.foodCost).toBe(25);
  });

  it('lo restado sin precio tampoco da un coste falso', () => {
    const r = loVendidoPorProducto(
      [linea({ lineaId: 'a', platoId: 'x', importeCentimos: 550, costeMilesimas: null })],
      0.1,
    );
    expect(r.productos[0]?.coste).toBeNull();
    expect(r.foodCost).toBeNull();
  });

  it('un artículo libre cuenta en dinero, sin coste', () => {
    const r = loVendidoPorProducto(
      [
        linea({
          lineaId: 'a',
          nombre: 'Varios',
          estado: 'sin_plato',
          costeMilesimas: null,
          importeCentimos: 330,
        }),
      ],
      0.1,
    );
    expect(r.productos[0]).toMatchObject({ id: 'libre:Varios', ventas: 300, coste: null });
  });

  it('el food cost, con un decimal', () => {
    expect(elFoodCost(1396, 4812)).toBe(29);
    expect(elFoodCost(1, 3)).toBe(33.3);
    expect(elFoodCost(5, 0)).toBeNull();
  });
});
