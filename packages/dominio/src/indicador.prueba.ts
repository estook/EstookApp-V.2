import { describe, expect, it } from 'vitest';
import {
  COMO_ES_EL_INDICADOR,
  INDICADORES,
  LAS_CIFRAS_DE,
  PERIODOS_DEL_INDICADOR,
  comoCambia,
  idDelIndicador,
  leerIdDelIndicador,
  lasFotosDeLaCamara,
  nombreDelIndicador,
  type ProductoDeLaFoto,
} from './indicador.ts';

describe('los indicadores del Panel', () => {
  it('cada uno dice cómo es, de dónde sale y si subir es bueno', () => {
    for (const indicador of INDICADORES) {
      const como = COMO_ES_EL_INDICADOR[indicador];
      expect(como.nombre.length, indicador).toBeGreaterThan(0);
      expect(como.deDonde.length, indicador).toBeGreaterThan(0);
    }
  });

  it('el identificador va y vuelve con lo elegido', () => {
    for (const indicador of INDICADORES) {
      for (const dias of PERIODOS_DEL_INDICADOR) {
        const id = idDelIndicador(indicador, dias);
        // Tiene que caber en el formato que guarda el Panel desde la 0025.
        expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
        expect(id.length).toBeLessThanOrEqual(60);
        expect(leerIdDelIndicador(id)).toEqual({ indicador, dias });
      }
    }
  });

  it('un identificador que no es de un indicador no se lee como uno', () => {
    expect(leerIdDelIndicador('caducidades')).toBeNull();
    expect(leerIdDelIndicador('indicador-ventas-14')).toBeNull();
    expect(leerIdDelIndicador('indicador-inventado-7')).toBeNull();
  });

  it('el nombre lleva el periodo', () => {
    expect(nombreDelIndicador('ventas', 7)).toBe('Ventas · 7 días');
  });
});

describe('cómo ha cambiado', () => {
  it('las ventas que suben son buena noticia', () => {
    expect(comoCambia('ventas', 1120, 1000)).toEqual({
      sube: true,
      cuanto: 12,
      en: 'por_ciento',
      bueno: true,
    });
  });

  it('la merma que sube es mala noticia', () => {
    expect(comoCambia('merma', 150, 100)?.bueno).toBe(false);
    expect(comoCambia('merma', 50, 100)?.bueno).toBe(true);
  });

  it('un porcentaje cambia en puntos, no en por ciento de un por ciento', () => {
    // Del 30 % al 33 % son 3 puntos. «Un 10 % más» no lo entiende nadie.
    expect(comoCambia('food-cost', 33, 30)).toEqual({
      sube: true,
      cuanto: 3,
      en: 'puntos',
      bueno: false,
    });
  });

  it('de nada a algo no es un infinito por ciento: no hay flecha', () => {
    expect(comoCambia('ventas', 4000, 0)).toBeNull();
  });

  it('sin uno de los dos, no hay flecha', () => {
    expect(comoCambia('ventas', null, 100)).toBeNull();
    expect(comoCambia('ventas', 100, null)).toBeNull();
  });

  it('igual es igual, sin color', () => {
    expect(comoCambia('ventas', 100, 100)).toEqual({
      sube: null,
      cuanto: 0,
      en: 'por_ciento',
      bueno: null,
    });
  });

  it('lo neutro sube o baja, pero no es ni bueno ni malo', () => {
    expect(comoCambia('compras', 200, 100)?.bueno).toBeNull();
    expect(comoCambia('mis-horas', 200, 100)?.sube).toBe(true);
  });
});

describe('lo que se cuenta cambia en unidades', () => {
  it('de dos retrasos a tres es uno más, no un 50 %', () => {
    expect(comoCambia('retrasos', 3, 2)).toEqual({
      sube: true,
      cuanto: 1,
      en: 'unidades',
      bueno: false,
    });
  });

  it('y de nada a algo sí tiene flecha: son dos más', () => {
    expect(comoCambia('bajo-minimo', 2, 0)).toEqual({
      sube: true,
      cuanto: 2,
      en: 'unidades',
      bueno: false,
    });
  });

  it('cerrar más días es buena noticia', () => {
    expect(comoCambia('cierres', 7, 5)?.bueno).toBe(true);
  });
});

describe('las cifras de cada app', () => {
  it('son indicadores que existen, sin repetir, de tres a cuatro por app', () => {
    for (const [app, cifras] of Object.entries(LAS_CIFRAS_DE)) {
      expect(new Set(cifras).size, app).toBe(cifras.length);
      expect(cifras.length, app).toBeGreaterThanOrEqual(3);
      expect(cifras.length, app).toBeLessThanOrEqual(4);
      for (const cifra of cifras) expect(INDICADORES, app).toContain(cifra);
    }
  });

  it('lo que es una existencia se mira como una foto, no se suma', () => {
    expect(COMO_ES_EL_INDICADOR['valor-camara'].periodo).toBe('foto');
    expect(COMO_ES_EL_INDICADOR['bajo-minimo'].periodo).toBe('foto');
  });
});

describe('la foto de la cámara, día a día', () => {
  const DIAS = ['2026-09-01', '2026-09-02', '2026-09-03'];

  function producto(cambios: Partial<ProductoDeLaFoto> = {}): ProductoDeLaFoto {
    return {
      desde: '2026-08-01',
      minimo: null,
      precioDeHoy: null,
      cuentaEnElMinimo: true,
      antes: null,
      delDia: new Map(),
      ...cambios,
    };
  }

  it('lo que había antes sigue ahí los días sin movimientos', () => {
    // 2 kg a 5 €/kg (500.000 milésimas de céntimo): 10 €, los tres días.
    const fotos = lasFotosDeLaCamara(
      [producto({ antes: { orden: 1, cantidad: 2, costeMedio: 500_000 } })],
      DIAS,
    );
    expect(fotos.map((f) => f.valor)).toEqual([1000, 1000, 1000]);
  });

  it('cada día vale lo que dejó su última línea del libro', () => {
    const fotos = lasFotosDeLaCamara(
      [
        producto({
          antes: { orden: 1, cantidad: 2, costeMedio: 500_000 },
          delDia: new Map([['2026-09-02', { orden: 7, cantidad: 3, costeMedio: 600_000 }]]),
        }),
      ],
      DIAS,
    );
    expect(fotos.map((f) => f.valor)).toEqual([1000, 1800, 1800]);
  });

  it('**manda el orden del libro, no la fecha**: lo apuntado después con fecha de antes', () => {
    // La línea 9 se apuntó después de la 7 pero con fecha del día 1. El día 2, lo
    // que hay es lo que dejó la 9, como en la vista `existencias`.
    const fotos = lasFotosDeLaCamara(
      [
        producto({
          delDia: new Map([
            ['2026-09-01', { orden: 9, cantidad: 1, costeMedio: 500_000 }],
            ['2026-09-02', { orden: 7, cantidad: 4, costeMedio: 500_000 }],
          ]),
        }),
      ],
      DIAS,
    );
    expect(fotos.map((f) => f.valor)).toEqual([500, 500, 500]);
  });

  it('lo que entró sin coste cuenta a su precio de hoy, y lo negativo no resta', () => {
    const fotos = lasFotosDeLaCamara(
      [
        producto({ precioDeHoy: 200_000, antes: { orden: 1, cantidad: 5, costeMedio: 0 } }),
        producto({ antes: { orden: 2, cantidad: -3, costeMedio: 400_000 } }),
      ],
      ['2026-09-01'],
    );
    expect(fotos[0]?.valor).toBe(1000);
  });

  it('bajo mínimo es lo de la lista de atención: por debajo, agotado o en negativo', () => {
    const fotos = lasFotosDeLaCamara(
      [
        producto({ minimo: 5, antes: { orden: 1, cantidad: 3, costeMedio: 0 } }), // bajo
        producto({ minimo: 5, antes: { orden: 2, cantidad: 8, costeMedio: 0 } }), // bien
        producto({ minimo: null, antes: { orden: 3, cantidad: 0, costeMedio: 0 } }), // agotado
        producto({ minimo: null, antes: { orden: 4, cantidad: 2, costeMedio: 0 } }), // sin mínimo
        producto({ minimo: 5, antes: { orden: 5, cantidad: -1, costeMedio: 0 } }), // negativo
      ],
      ['2026-09-01'],
    );
    expect(fotos[0]?.bajoMinimo).toBe(3);
  });

  it('un producto no cuenta como agotado los días en los que no existía', () => {
    const fotos = lasFotosDeLaCamara(
      [
        producto({
          desde: '2026-09-02',
          minimo: 5,
          delDia: new Map([['2026-09-03', { orden: 1, cantidad: 10, costeMedio: 0 }]]),
        }),
      ],
      DIAS,
    );
    // El día 1 no existía; el 2 existía sin nada; el 3 ya tenía de sobra.
    expect(fotos.map((f) => f.bajoMinimo)).toEqual([0, 1, 0]);
  });

  it('lo de una zona que no se ve vale, pero no cuenta en el mínimo', () => {
    const fotos = lasFotosDeLaCamara(
      [
        producto({
          cuentaEnElMinimo: false,
          minimo: 5,
          antes: { orden: 1, cantidad: 1, costeMedio: 100_000 },
        }),
      ],
      ['2026-09-01'],
    );
    expect(fotos[0]).toEqual({ fecha: '2026-09-01', valor: 100, bajoMinimo: 0 });
  });

  it('los decimales del libro no se pierden por el camino', () => {
    // 0,3 kg a 1,50 €/kg: 45 céntimos. En coma flotante sale 44,999… y se redondea mal.
    const fotos = lasFotosDeLaCamara(
      [producto({ antes: { orden: 1, cantidad: 0.3, costeMedio: 150_000 } })],
      ['2026-09-01'],
    );
    expect(fotos[0]?.valor).toBe(45);
  });
});
