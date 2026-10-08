import { describe, expect, it } from 'vitest';
import {
  cuantoTocaContar,
  diferenciaDeLoContado,
  loContadoEnUnidades,
  mayorHuecoEntreRepartos,
  minimoCalculado,
  queTocaContar,
  repartirPorFefo,
  valeLaPenaProponer,
  type LoteQueSeGasta,
} from './inventario.ts';
import type { FechaOperativa } from './tiempo.ts';

const HOY = '2026-10-12' as FechaOperativa;
const fecha = (texto: string) => texto as FechaOperativa;

describe('lo que toca contar (inventario cíclico, Manifiesto 12)', () => {
  // Diez productos: el primero pesa 50, el segundo 20, el tercero 10 y los demás 3
  // cada uno (suman 101). El 80 % son 80,8: entran los tres primeros y el cuarto,
  // que es el que cruza la raya.
  const productos = [
    { id: 'a', peso: 50, contadoEl: null },
    { id: 'b', peso: 20, contadoEl: null },
    { id: 'c', peso: 10, contadoEl: null },
    ...['d', 'e', 'f', 'g', 'h', 'i', 'j'].map((id) => ({ id, peso: 3, contadoEl: null })),
  ];

  it('lo que nunca se ha contado toca, lo caro primero', () => {
    const tocan = queTocaContar(productos, HOY);
    expect(tocan).toHaveLength(10);
    expect(tocan.slice(0, 4).map((t) => [t.id, t.porque])).toEqual([
      ['a', 'lo_caro'],
      ['b', 'lo_caro'],
      ['c', 'lo_caro'],
      ['d', 'lo_caro'],
    ]);
    expect(tocan[4]?.porque).toBe('lo_demas');
  });

  it('lo caro vuelve a tocar a la semana; lo demás, al mes', () => {
    const contados = productos.map((p) => ({ ...p, contadoEl: fecha('2026-10-06') }));
    // Seis días: no toca nada.
    expect(queTocaContar(contados, HOY)).toEqual([]);
    // Siete días: lo caro, sí; lo demás, no.
    const semana = queTocaContar(contados, fecha('2026-10-13'));
    expect(semana.map((t) => t.id)).toEqual(['a', 'b', 'c', 'd']);
    // Treinta días: todo.
    expect(queTocaContar(contados, fecha('2026-11-05'))).toHaveLength(10);
  });

  it('sin nada gastado ni valorado, todo es «lo demás», al mes', () => {
    const sinPeso = [
      { id: 'x', peso: 0, contadoEl: fecha('2026-10-01') },
      { id: 'y', peso: 0, contadoEl: null },
    ];
    expect(queTocaContar(sinPeso, HOY)).toEqual([{ id: 'y', porque: 'lo_demas', contadoEl: null }]);
  });

  it('y lo dice en una frase', () => {
    expect(cuantoTocaContar([])).toBe('Nada que contar: está todo al día.');
    expect(cuantoTocaContar(queTocaContar(productos, HOY))).toBe(
      'Sin contar todavía: 4 productos de los que más valen, y 6 más.',
    );
    const contados = productos.map((p) => ({ ...p, contadoEl: fecha('2026-09-01') }));
    expect(cuantoTocaContar(queTocaContar(contados, HOY))).toBe(
      '4 productos de los que más valen, y 6 más.',
    );
  });
});

describe('contar como está en la estantería (2A)', () => {
  it('dos cajas de seis y tres sueltas son quince', () => {
    expect(loContadoEnUnidades(2, 3, 6)).toBe(15);
  });
  it('solo cajas, o solo sueltas', () => {
    expect(loContadoEnUnidades(2, null, 5000)).toBe(10000);
    expect(loContadoEnUnidades(null, 750, 5000)).toBe(750);
  });
  it('sin nada escrito no es cero: es que no se ha contado', () => {
    expect(loContadoEnUnidades(null, null, 6)).toBeNull();
  });
  it('sin factor, una caja es una unidad', () => {
    expect(loContadoEnUnidades(3, 1, 0)).toBe(4);
  });
});

describe('la diferencia de lo contado (2A)', () => {
  it('es lo que hay menos lo que decía el libro al contarlo', () => {
    expect(diferenciaDeLoContado(38, 43)).toBe(-5);
    expect(diferenciaDeLoContado(12.5, 10)).toBe(2.5);
  });
  it('si cuadra no hay diferencia, ni con los decimales de la coma flotante', () => {
    expect(diferenciaDeLoContado(0.3, 0.1 + 0.2)).toBeNull();
  });
});

describe('los lotes se gastan solos: primero el que antes caduca (FEFO)', () => {
  const lotes: LoteQueSeGasta[] = [
    {
      id: 'tarde',
      queda: 6,
      caducaEl: fecha('2026-10-20'),
      recibidoEl: fecha('2026-10-01'),
      congeladoEl: null,
    },
    {
      id: 'pronto',
      queda: 4,
      caducaEl: fecha('2026-10-14'),
      recibidoEl: fecha('2026-10-05'),
      congeladoEl: null,
    },
    {
      id: 'sin-fecha',
      queda: 5,
      caducaEl: null,
      recibidoEl: fecha('2026-09-01'),
      congeladoEl: null,
    },
    {
      id: 'congelado',
      queda: 10,
      caducaEl: fecha('2026-09-01'),
      recibidoEl: fecha('2026-08-01'),
      congeladoEl: fecha('2026-08-02'),
    },
  ];

  it('sale del que antes caduca, no del que antes llegó', () => {
    expect(repartirPorFefo(lotes, 3)).toEqual([{ loteId: 'pronto', cuanto: 3, loAcaba: false }]);
  });

  it('cuando se acaba uno, sigue con el siguiente, y dice cuál se acabó', () => {
    expect(repartirPorFefo(lotes, 7)).toEqual([
      { loteId: 'pronto', cuanto: 4, loAcaba: true },
      { loteId: 'tarde', cuanto: 3, loAcaba: false },
    ]);
  });

  it('lo que no tiene fecha va después, y lo congelado lo último', () => {
    expect(repartirPorFefo(lotes, 18).map((g) => g.loteId)).toEqual([
      'pronto',
      'tarde',
      'sin-fecha',
      'congelado',
    ]);
  });

  it('si sale más de lo que suman los lotes, se gastan enteros y no se inventa nada', () => {
    const gastos = repartirPorFefo(lotes, 100);
    expect(gastos.reduce((s, g) => s + g.cuanto, 0)).toBe(25);
    expect(gastos.every((g) => g.loAcaba)).toBe(true);
  });

  it('nada que sale, nada que gastar; y un lote vacío no cuenta', () => {
    expect(repartirPorFefo(lotes, 0)).toEqual([]);
    expect(
      repartirPorFefo(
        [
          {
            id: 'vacio',
            queda: 0,
            caducaEl: null,
            recibidoEl: fecha('2026-10-01'),
            congeladoEl: null,
          },
        ],
        1,
      ),
    ).toEqual([]);
  });

  it('sin decimales sueltos de la coma flotante', () => {
    const decimales: LoteQueSeGasta[] = [
      {
        id: 'uno',
        queda: 0.3,
        caducaEl: fecha('2026-10-13'),
        recibidoEl: fecha('2026-10-01'),
        congeladoEl: null,
      },
      {
        id: 'dos',
        queda: 1,
        caducaEl: fecha('2026-10-14'),
        recibidoEl: fecha('2026-10-01'),
        congeladoEl: null,
      },
    ];
    expect(repartirPorFefo(decimales, 0.1 + 0.2 + 0.1)).toEqual([
      { loteId: 'uno', cuanto: 0.3, loAcaba: true },
      { loteId: 'dos', cuanto: 0.1, loAcaba: false },
    ]);
  });
});

describe('el mínimo calculado (3A)', () => {
  it('el mayor hueco entre dos repartos', () => {
    // Martes y viernes: del martes al viernes 3, del viernes al martes 4.
    expect(mayorHuecoEntreRepartos([2, 5])).toBe(4);
    expect(mayorHuecoEntreRepartos([1, 2, 3, 4, 5, 6, 7])).toBe(1);
    expect(mayorHuecoEntreRepartos([3])).toBe(7);
    expect(mayorHuecoEntreRepartos([])).toBeNull();
    expect(mayorHuecoEntreRepartos([5, 2, 5, 9])).toBe(4);
  });

  it('el tomate del plan: 3 kg al día, martes y viernes, son 14,4 kg', () => {
    const calculado = minimoCalculado(3, [2, 5], 'kg');
    expect(calculado?.minimo).toBe(14.4);
    expect(calculado?.porque).toBe(
      'Gastas 3 kg al día y entre dos repartos pueden pasar 4 días: con un 20 % de margen.',
    );
  });

  it('sin días de reparto, para cinco días, y lo dice', () => {
    const calculado = minimoCalculado(2, null, 'kg');
    expect(calculado?.minimo).toBe(12);
    expect(calculado?.porque).toContain('Con los días de reparto del proveedor');
  });

  it('las unidades y los gramos, enteros hacia arriba', () => {
    expect(minimoCalculado(1.1, [1], 'ud')?.minimo).toBe(10); // 1,1 × 7 × 1,2 = 9,24
    expect(minimoCalculado(333.3, [1, 4], 'g')?.minimo).toBe(1600); // × 4 × 1,2 = 1599,84
  });

  it('sin saber a qué ritmo se gasta, no se propone nada', () => {
    expect(minimoCalculado(null, [2, 5], 'kg')).toBeNull();
    expect(minimoCalculado(0, [2, 5], 'kg')).toBeNull();
  });

  it('se propone si no hay mínimo o si se separa más de un 10 %', () => {
    expect(valeLaPenaProponer(null, 14.4)).toBe(true);
    expect(valeLaPenaProponer(5, 14.4)).toBe(true);
    expect(valeLaPenaProponer(14, 14.4)).toBe(false);
    expect(valeLaPenaProponer(0, 0)).toBe(false);
  });
});
