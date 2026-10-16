import { describe, expect, it } from 'vitest';
import {
  aCentimos,
  aDiezCentimosHaciaArriba,
  alergenosDeLaReceta,
  comoSeLeeLaCantidad,
  convertir,
  costeDeLaReceta,
  costePorUnidadDeLaElaboracion,
  desviacionDeLosPlatos,
  escandalloDelPlato,
  juntarLoRepetido,
  loQueDebiaGastarse,
  parteDelCoste,
  queCambioEnLaReceta,
  seLlevaASiMisma,
  unidadesQueSirven,
  type ElaboracionDelEscandallo,
  type LibroDeRecetas,
  type LineaDelEscandallo,
  type ProductoDelEscandallo,
  type RecetaQueSeLee,
} from './escandallo.ts';
import { costePorUnidadDeUso } from './coste.ts';
import { centimos } from './dinero.ts';

/**
 * El escandallo (M9 · 2, 0087), con las cuentas hechas a mano: si el motor y la
 * calculadora no dan lo mismo, el que se equivoca es el motor.
 */

// 10 kg de carne a 60 € de los que quedan 8 kg útiles: 7,50 €/kg reales (Plan, M9).
const CARNE: ProductoDelEscandallo = {
  id: 'carne',
  nombre: 'Carne picada',
  unidad: 'kg',
  costeMilesimas: costePorUnidadDeUso(centimos(6000), { factor: 10, rendimiento: 0.8 }),
  alergenos: [],
};
// Pan de hamburguesa: 0,40 € la unidad.
const PAN: ProductoDelEscandallo = {
  id: 'pan',
  nombre: 'Pan brioche',
  unidad: 'ud',
  costeMilesimas: 40_000,
  alergenos: ['gluten', 'huevos'],
};
// Mayonesa a 4 € el litro.
const MAYONESA: ProductoDelEscandallo = {
  id: 'mayonesa',
  nombre: 'Mayonesa',
  unidad: 'l',
  costeMilesimas: 400_000,
  alergenos: ['huevos'],
};
const PEPINILLO: ProductoDelEscandallo = {
  id: 'pepinillo',
  nombre: 'Pepinillo',
  unidad: 'g',
  costeMilesimas: null,
  alergenos: ['mostaza'],
};

const linea = (
  de: { productoId?: string; elaboracionId?: string },
  cantidad: number,
  unidad: LineaDelEscandallo['unidad'],
): LineaDelEscandallo => ({
  productoId: de.productoId ?? null,
  elaboracionId: de.elaboracionId ?? null,
  cantidad,
  unidad,
});

// La salsa de la casa: 1 l de mayonesa rinde 1,25 l de salsa con el pepinillo.
const SALSA: ElaboracionDelEscandallo = {
  id: 'salsa',
  nombre: 'Salsa de la casa',
  rindeCantidad: 1.25,
  rindeUnidad: 'l',
  lineas: [linea({ productoId: 'mayonesa' }, 1, 'l')],
};

function libro(
  productos: readonly ProductoDelEscandallo[],
  elaboraciones: readonly ElaboracionDelEscandallo[] = [],
): LibroDeRecetas {
  return {
    productos: new Map(productos.map((p) => [p.id, p])),
    elaboraciones: new Map(elaboraciones.map((e) => [e.id, e])),
  };
}

const EL_LIBRO = libro([CARNE, PAN, MAYONESA, PEPINILLO], [SALSA]);

describe('las unidades', () => {
  it('se convierten dentro de su familia, y nunca entre familias', () => {
    expect(convertir(280, 'g', 'kg')).toBeCloseTo(0.28);
    expect(convertir(1.5, 'l', 'ml')).toBe(1500);
    expect(convertir(100, 'g', 'ml')).toBeNull();
    expect(convertir(2, 'ud', 'g')).toBeNull();
    expect(unidadesQueSirven('kg')).toEqual(['g', 'kg']);
    expect(unidadesQueSirven('ud')).toEqual(['ud']);
  });

  it('se leen como se dicen', () => {
    expect(comoSeLeeLaCantidad(180, 'g')).toBe('180 g');
    expect(comoSeLeeLaCantidad(1.5, 'kg')).toBe('1,5 kg');
    expect(comoSeLeeLaCantidad(0.125, 'l')).toBe('0,13 l');
  });
});

describe('lo que cuesta', () => {
  it('180 g de carne con su aprovechamiento son 1,35 €, como a mano', () => {
    const receta = costeDeLaReceta([linea({ productoId: 'carne' }, 180, 'g')], EL_LIBRO);
    // 7,50 €/kg × 0,18 kg = 1,35 €.
    expect(aCentimos(receta.milesimas ?? 0)).toBe(135);
    expect(receta.faltanPrecios).toBe(0);
  });

  it('una elaboración cuesta lo que lleva entre lo que rinde', () => {
    // 4 € de mayonesa / 1,25 l = 3,20 €/l.
    expect(costePorUnidadDeLaElaboracion('salsa', EL_LIBRO).milesimas).toBe(320_000);
    // 30 ml de salsa en la hamburguesa: 0,096 €.
    const receta = costeDeLaReceta(
      [
        linea({ productoId: 'carne' }, 180, 'g'),
        linea({ productoId: 'pan' }, 1, 'ud'),
        linea({ elaboracionId: 'salsa' }, 30, 'ml'),
      ],
      EL_LIBRO,
    );
    // 1,35 + 0,40 + 0,096 = 1,846 → se redondea una vez, al final: 1,85 €.
    expect(aCentimos(receta.milesimas ?? 0)).toBe(185);
  });

  it('sin el precio de un ingrediente no se da un coste falso, y se cuenta lo que falta', () => {
    const receta = costeDeLaReceta(
      [linea({ productoId: 'carne' }, 180, 'g'), linea({ productoId: 'pepinillo' }, 20, 'g')],
      EL_LIBRO,
    );
    expect(receta.milesimas).toBeNull();
    expect(receta.faltanPrecios).toBe(1);
  });

  it('lo que falta dentro de una elaboración también se cuenta', () => {
    const conPepinillo = libro(
      [CARNE, PAN, MAYONESA, PEPINILLO],
      [{ ...SALSA, lineas: [...SALSA.lineas, linea({ productoId: 'pepinillo' }, 50, 'g')] }],
    );
    const receta = costeDeLaReceta([linea({ elaboracionId: 'salsa' }, 30, 'ml')], conPepinillo);
    expect(receta.milesimas).toBeNull();
    expect(receta.faltanPrecios).toBe(1);
  });

  it('una unidad que no casa con la del producto no cuesta nada inventado', () => {
    const receta = costeDeLaReceta([linea({ productoId: 'mayonesa' }, 30, 'g')], EL_LIBRO);
    expect(receta.milesimas).toBeNull();
  });

  it('la parte de cada línea, en puntos', () => {
    expect(parteDelCoste(135_000, 185_000)).toBe(73);
    expect(parteDelCoste(null, 185_000)).toBeNull();
  });
});

describe('los alérgenos', () => {
  it('son la suma de los de sus ingredientes, también los de dentro de una elaboración', () => {
    const conPepinillo = libro(
      [CARNE, PAN, MAYONESA, PEPINILLO],
      [{ ...SALSA, lineas: [...SALSA.lineas, linea({ productoId: 'pepinillo' }, 50, 'g')] }],
    );
    const alergenos = alergenosDeLaReceta(
      [linea({ productoId: 'pan' }, 1, 'ud'), linea({ elaboracionId: 'salsa' }, 30, 'ml')],
      conPepinillo,
    );
    expect([...alergenos].sort()).toEqual(['gluten', 'huevos', 'mostaza']);
  });
});

describe('una elaboración no se lleva a sí misma', () => {
  const FONDO: ElaboracionDelEscandallo = {
    id: 'fondo',
    nombre: 'Fondo oscuro',
    rindeCantidad: 3,
    rindeUnidad: 'l',
    lineas: [linea({ elaboracionId: 'salsa' }, 200, 'ml')],
  };
  const conFondo = libro([MAYONESA], [SALSA, FONDO]);

  it('ni directa', () => {
    expect(seLlevaASiMisma('salsa', [linea({ elaboracionId: 'salsa' }, 1, 'l')], conFondo)).toBe(
      true,
    );
  });

  it('ni por el camino: la salsa lleva el fondo, y el fondo, la salsa', () => {
    expect(seLlevaASiMisma('salsa', [linea({ elaboracionId: 'fondo' }, 1, 'l')], conFondo)).toBe(
      true,
    );
  });

  it('y anidar sin vuelta sí se puede', () => {
    expect(seLlevaASiMisma('fondo', [linea({ elaboracionId: 'salsa' }, 1, 'l')], conFondo)).toBe(
      false,
    );
  });

  it('y si alguna se colara, no da un coste ni se queda dando vueltas', () => {
    const enCirculo = libro(
      [MAYONESA],
      [
        { ...SALSA, lineas: [linea({ elaboracionId: 'fondo' }, 1, 'l')] },
        { ...FONDO, lineas: [linea({ elaboracionId: 'salsa' }, 1, 'l')] },
      ],
    );
    expect(costePorUnidadDeLaElaboracion('salsa', enCirculo).milesimas).toBeNull();
  });
});

describe('lo repetido se suma', () => {
  it('el mismo producto dos veces es una línea, y se avisa', () => {
    const { lineas, sumadas } = juntarLoRepetido([
      { ...linea({ productoId: 'carne' }, 150, 'g'), nota: null },
      { ...linea({ productoId: 'pan' }, 1, 'ud'), nota: null },
      { ...linea({ productoId: 'carne' }, 0.05, 'kg'), nota: null },
    ]);
    expect(lineas).toHaveLength(2);
    expect(lineas[0]?.cantidad).toBe(200);
    expect(sumadas).toEqual(['carne']);
  });
});

describe('el escandallo de un plato', () => {
  const CANALES = [
    {
      canal: 'sala' as const,
      nombre: 'Sala',
      precioCentimos: 1450,
      igualQueSala: true,
      comisionPorcentaje: null,
      envaseCentimos: null,
    },
    {
      canal: 'uber_eats' as const,
      nombre: 'Uber Eats',
      precioCentimos: 1450,
      igualQueSala: true,
      comisionPorcentaje: 30,
      envaseCentimos: 40,
    },
  ];

  it('la hamburguesa del plan: 3,42 € a 14,50 € es un 26 % y deja 9,76 € en sala', () => {
    const escandallo = escandalloDelPlato({
      costeMilesimas: 342_000,
      faltanPrecios: 0,
      precioSalaCentimos: 1450,
      iva: 0.1,
      objetivo: 0.3,
      canales: CANALES,
    });
    // 14,50 / 1,10 = 13,18 €; 3,42 / 13,18 = 25,9 %.
    expect(escandallo.precioSinIvaCentimos).toBe(1318);
    expect(escandallo.foodCost).toBe(25.9);
    expect(escandallo.semaforo).toBe('verde');
    expect(escandallo.canales[0]?.margenCentimos).toBe(976);
    // Uber Eats se lleva el 30 % del precio con IVA (4,35 €) y el envase (0,40 €).
    expect(escandallo.canales[1]?.seLlevaCentimos).toBe(475);
    expect(escandallo.canales[1]?.margenCentimos).toBe(1318 - 475 - 342);
    // El que deja el 30 %: 3,42 / 0,30 × 1,10 = 12,54 € → 12,60 €.
    expect(escandallo.precioRecomendadoCentimos).toBe(1260);
  });

  it('un canal donde se pierde dinero lo dice', () => {
    const escandallo = escandalloDelPlato({
      costeMilesimas: 600_000,
      faltanPrecios: 0,
      precioSalaCentimos: 1000,
      iva: 0.1,
      objetivo: 0.3,
      canales: CANALES.map((c) => ({ ...c, precioCentimos: 1000 })),
    });
    // 9,09 − 3,00 − 0,40 − 6,00 = −0,31 €.
    expect(escandallo.canales[1]?.margenCentimos).toBe(-31);
    expect(escandallo.canales[1]?.pierde).toBe(true);
    expect(escandallo.canales[0]?.pierde).toBe(false);
    expect(escandallo.semaforo).toBe('rojo');
  });

  it('sin coste, ni food cost ni margen: nada inventado', () => {
    const escandallo = escandalloDelPlato({
      costeMilesimas: null,
      faltanPrecios: 2,
      precioSalaCentimos: 1450,
      iva: 0.1,
      objetivo: 0.3,
      canales: CANALES,
    });
    expect(escandallo.costeCentimos).toBeNull();
    expect(escandallo.foodCost).toBeNull();
    expect(escandallo.semaforo).toBe('sin_dato');
    expect(escandallo.canales.every((c) => c.margenCentimos === null && !c.pierde)).toBe(true);
  });

  it('hasta tres puntos por encima del objetivo es ámbar', () => {
    const ambar = escandalloDelPlato({
      costeMilesimas: 400_000,
      faltanPrecios: 0,
      precioSalaCentimos: 1400,
      iva: 0.1,
      objetivo: 0.3,
      canales: [],
    });
    // 4,00 / 12,73 = 31,4 %.
    expect(ambar.foodCost).toBe(31.4);
    expect(ambar.semaforo).toBe('ambar');
  });

  it('el precio recomendado se redondea a los diez céntimos hacia arriba', () => {
    expect(aDiezCentimosHaciaArriba(1243)).toBe(1250);
    expect(aDiezCentimosHaciaArriba(1250)).toBe(1250);
    expect(aDiezCentimosHaciaArriba(1250.0000001)).toBe(1250);
  });
});

describe('qué cambió', () => {
  const ANTES: RecetaQueSeLee = {
    nombre: 'Hamburguesa',
    rinde: null,
    lineas: [
      { id: 'carne', nombre: 'Carne picada', cantidad: 180, unidad: 'g', nota: null },
      { id: 'pepinillo', nombre: 'Pepinillo', cantidad: 20, unidad: 'g', nota: null },
    ],
    pasos: ['Marcar la carne'],
    notas: null,
    minutos: 10,
  };

  it('se dice en una línea cada cosa', () => {
    expect(
      queCambioEnLaReceta(ANTES, {
        ...ANTES,
        lineas: [
          { id: 'carne', nombre: 'Carne picada', cantidad: 200, unidad: 'g', nota: null },
          { id: 'pan', nombre: 'Pan brioche', cantidad: 1, unidad: 'ud', nota: null },
        ],
        pasos: ['Marcar la carne', 'Montar'],
        minutos: 12,
      }),
    ).toEqual([
      'Carne picada: 180 g → 200 g',
      'Añadió Pan brioche (1 ud)',
      'Quitó Pepinillo',
      'Cambió los pasos',
      'Tiempo: 10 min → 12 min',
    ]);
  });

  it('la primera vez, cuántos ingredientes', () => {
    expect(queCambioEnLaReceta(null, ANTES)).toEqual(['La escribió: 2 ingredientes']);
  });
});

describe('la desviación de los platos (construida, a la vista con el TPV)', () => {
  it('80 hamburguesas × 180 g son 14,4 kg; y la salsa se reparte por lo que rinde', () => {
    const debia = loQueDebiaGastarse(
      [
        {
          raciones: 80,
          lineas: [
            linea({ productoId: 'carne' }, 180, 'g'),
            linea({ elaboracionId: 'salsa' }, 25, 'ml'),
          ],
        },
      ],
      EL_LIBRO,
    );
    expect(debia.get('carne')).toBe(14.4);
    // 80 × 25 ml = 2 l de salsa = 1,6 l de mayonesa (rinde 1,25 l por litro).
    expect(debia.get('mayonesa')).toBe(1.6);
  });

  it('lo gastado de más se ve producto a producto, y lo que cuadra no asusta', () => {
    const desviacion = desviacionDeLosPlatos(
      new Map([
        ['carne', 14.4],
        ['mayonesa', 1.6],
      ]),
      [
        { productoId: 'carne', gastado: 16, explicado: 0.4 },
        { productoId: 'mayonesa', gastado: 1.62, explicado: 0 },
        { productoId: 'pan', gastado: 90, explicado: 0 },
      ],
    );
    expect(desviacion.map((d) => [d.productoId, d.desviacion, d.cuadra])).toEqual([
      ['carne', 1.2, false],
      ['mayonesa', 0.02, true],
    ]);
  });
});
