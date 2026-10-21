import { describe, expect, it } from 'vitest';
import {
  comoSeLlamaLaSeccion,
  costePorRacion,
  elDiaQueVale,
  losDiasQueSeSirve,
  loQueDejaElMenu,
  type MenuParaLaCuenta,
  type OpcionDelMenu,
} from './menus.ts';
import { fechaOperativa } from './tiempo.ts';

const f = fechaOperativa;

/** Una opción con su coste en céntimos (se guarda en milésimas). */
function plato(nombre: string, costeCentimos: number | null, suplementoCentimos = 0): OpcionDelMenu {
  return {
    nombre,
    costeMilesimas: costeCentimos === null ? null : costeCentimos * 1000,
    suplementoCentimos,
  };
}

/** El menú del día de 13,50 € con IVA al 10 %: dos primeros, dos segundos y bebida. */
function elMenu(cambios: Partial<MenuParaLaCuenta> = {}): MenuParaLaCuenta {
  return {
    precioCentimos: 1350,
    iva: 0.1,
    pan: { entra: true, costeMilesimas: 15_000 },
    cafe: { entra: false, costeMilesimas: null },
    secciones: [
      {
        nombre: 'Primeros',
        esPostre: false,
        incluida: true,
        opciones: [plato('Lentejas', 90), plato('Ensalada mixta', 140)],
      },
      {
        nombre: 'Segundos',
        esPostre: false,
        incluida: true,
        opciones: [plato('Pollo asado', 210), plato('Entrecot', 650, 400)],
      },
      {
        nombre: 'Postre',
        esPostre: true,
        incluida: false,
        opciones: [plato('Flan', 40)],
      },
      { nombre: 'Bebida', esPostre: false, incluida: true, opciones: [plato('Agua', 25)] },
    ],
    ...cambios,
  };
}

describe('qué vale un día que nadie ha tocado', () => {
  it('repite el último montado antes, y el suyo si lo tiene', () => {
    const montados = [f('2026-10-19'), f('2026-10-21')];
    expect(elDiaQueVale(montados, f('2026-10-19'))).toBe('2026-10-19');
    expect(elDiaQueVale(montados, f('2026-10-20'))).toBe('2026-10-19');
    expect(elDiaQueVale(montados, f('2026-10-21'))).toBe('2026-10-21');
    expect(elDiaQueVale(montados, f('2026-10-30'))).toBe('2026-10-21');
  });

  it('antes del primero no vale ninguno', () => {
    expect(elDiaQueVale([f('2026-10-19')], f('2026-10-18'))).toBeNull();
    expect(elDiaQueVale([], f('2026-10-18'))).toBeNull();
  });
});

describe('la semana que se enseña', () => {
  it('de lunes a viernes, si es lo que se sirve', () => {
    expect(losDiasQueSeSirve(f('2026-10-19'), [1, 2, 3, 4, 5])).toEqual([
      '2026-10-19',
      '2026-10-20',
      '2026-10-21',
      '2026-10-22',
      '2026-10-23',
    ]);
  });

  it('con el sábado, y en orden aunque se guarden desordenados', () => {
    expect(losDiasQueSeSirve(f('2026-10-19'), [6, 2])).toEqual(['2026-10-20', '2026-10-24']);
  });
});

describe('lo que deja el menú', () => {
  it('en el peor caso y en el mejor, sin IVA, con el entrecot que lo hunde', () => {
    const cuenta = loQueDejaElMenu(elMenu());
    expect(cuenta.estado).toBe('listo');
    if (cuenta.estado !== 'listo') return;
    // 13,50 € con IVA son 12,27 € sin él. Peor: ensalada 1,40 + entrecot 6,50 − (4 € de
    // suplemento sin IVA, 3,64) + agua 0,25 + pan 0,15 = 8,30 de coste; cobrado
    // 12,27 + 3,64 = 15,91. Deja 7,61.
    expect(cuenta.peor.costeCentimos).toBe(830);
    expect(cuenta.peor.dejaCentimos).toBe(1591 - 830);
    expect(cuenta.peor.elige).toEqual(['Ensalada mixta', 'Entrecot', 'Agua']);
    // Mejor: lentejas 0,90 + pollo 2,10 + agua + pan = 3,40; deja 8,87.
    expect(cuenta.mejor.costeCentimos).toBe(340);
    expect(cuenta.mejor.dejaCentimos).toBe(1227 - 340);
    expect(cuenta.loHunde).toBe('Entrecot');
    expect(cuenta.sinCoste).toEqual([]);
  });

  it('sin suplemento, el entrecot es lo peor y el menú puede perder dinero', () => {
    const cuenta = loQueDejaElMenu(
      elMenu({
        precioCentimos: 1000,
        secciones: [
          {
            nombre: 'Segundos',
            esPostre: false,
            incluida: true,
            opciones: [plato('Pollo asado', 210), plato('Entrecot', 1100)],
          },
        ],
      }),
    );
    if (cuenta.estado !== 'listo') throw new Error(cuenta.estado);
    expect(cuenta.peor.dejaCentimos).toBeLessThan(0);
    expect(cuenta.loHunde).toBe('Entrecot');
  });

  it('con un plato sin escandallo no se calcula, y dice cuál falta', () => {
    const conLentejasSinCoste = elMenu();
    const cuenta = loQueDejaElMenu({
      ...conLentejasSinCoste,
      secciones: conLentejasSinCoste.secciones.map((s) =>
        s.nombre === 'Primeros' ? { ...s, opciones: [plato('Lentejas', null), plato('Sopa', 50)] } : s,
      ),
    });
    expect(cuenta).toEqual({ estado: 'faltan_costes', faltan: ['Lentejas'] });
  });

  it('un plato de una sección apagada no cuenta, aunque no tenga coste', () => {
    const menu = elMenu();
    const cuenta = loQueDejaElMenu({
      ...menu,
      secciones: menu.secciones.map((s) =>
        s.esPostre ? { ...s, opciones: [plato('Tarta sin escandallo', null)] } : s,
      ),
    });
    expect(cuenta.estado).toBe('listo');
  });

  it('sin precio o sin platos lo dice, en vez de dar un cero', () => {
    expect(loQueDejaElMenu(elMenu({ precioCentimos: null }))).toEqual({ estado: 'sin_precio' });
    expect(loQueDejaElMenu(elMenu({ iva: null }))).toEqual({ estado: 'sin_precio' });
    expect(
      loQueDejaElMenu(elMenu({ secciones: elMenu().secciones.map((s) => ({ ...s, opciones: [] })) })),
    ).toEqual({ estado: 'sin_platos' });
  });

  it('con postre y café, «postre o café»: el café es una opción más del postre', () => {
    const menu = elMenu({ cafe: { entra: true, costeMilesimas: 12_000 } });
    const cuenta = loQueDejaElMenu({
      ...menu,
      secciones: menu.secciones.map((s) => (s.esPostre ? { ...s, incluida: true } : s)),
    });
    if (cuenta.estado !== 'listo') throw new Error(cuenta.estado);
    // El flan (0,40) es lo peor del postre y el café (0,12) lo mejor.
    expect(cuenta.peor.elige).toContain('Flan');
    expect(cuenta.mejor.elige).toContain('Café');
  });

  it('con café y sin postre, el café va siempre', () => {
    const conCafe = loQueDejaElMenu(elMenu({ cafe: { entra: true, costeMilesimas: 12_000 } }));
    const sinCafe = loQueDejaElMenu(elMenu());
    if (conCafe.estado !== 'listo' || sinCafe.estado !== 'listo') throw new Error('no listo');
    expect(conCafe.mejor.costeCentimos - sinCafe.mejor.costeCentimos).toBe(12);
  });

  it('el pan y el café sin producto cuentan 0, y se dice', () => {
    const cuenta = loQueDejaElMenu(
      elMenu({
        pan: { entra: true, costeMilesimas: null },
        cafe: { entra: true, costeMilesimas: null },
      }),
    );
    if (cuenta.estado !== 'listo') throw new Error(cuenta.estado);
    expect(cuenta.sinCoste).toEqual(['pan', 'cafe']);
  });
});

describe('el pan y el café', () => {
  it('una barra de 1,20 € que da 6 raciones son 0,20 € por menú', () => {
    expect(costePorRacion(120_000, 6)).toBe(20_000);
    expect(costePorRacion(null, 6)).toBeNull();
    expect(costePorRacion(120_000, null)).toBeNull();
  });

  it('el postre se llama «postre o café» cuando entra el café', () => {
    expect(comoSeLlamaLaSeccion('Postre', true, true)).toBe('Postre o café');
    expect(comoSeLlamaLaSeccion('Postre', true, false)).toBe('Postre');
    expect(comoSeLlamaLaSeccion('Bebida', false, true)).toBe('Bebida');
  });
});
