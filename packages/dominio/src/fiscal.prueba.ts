import { describe, expect, it } from 'vitest';
import { desdeEuros } from './dinero.ts';
import { fechaOperativa } from './tiempo.ts';
import {
  copiaFiscalDe,
  desglosar,
  resolver,
  type ContextoFiscal,
  type ReglaFiscal,
} from './fiscal.ts';

/** Una regla mínima a la que se le cambia solo lo que interesa en cada prueba. */
function regla(cambios: Partial<ReglaFiscal> & Pick<ReglaFiscal, 'id' | 'tipo'>): ReglaFiscal {
  return {
    version: 1,
    territorio: 'peninsula_y_baleares',
    regimen: 'iva',
    naturaleza: null,
    modoDeConsumo: null,
    categoriaFiscal: null,
    actividad: null,
    epigrafeIae: null,
    vigenteDesde: fechaOperativa('2020-01-01'),
    vigenteHasta: null,
    referenciaLegal: 'de prueba',
    fuenteUrl: null,
    activa: true,
    ...cambios,
  };
}

function contexto(cambios: Partial<ContextoFiscal> = {}): ContextoFiscal {
  return {
    territorio: 'peninsula_y_baleares',
    regimen: 'iva',
    naturaleza: 'prestacion_de_servicios',
    modoDeConsumo: 'en_el_local',
    categoriaFiscal: 'alimento',
    actividad: null,
    epigrafeIae: null,
    fechaDeDevengo: fechaOperativa('2026-09-01'),
    ...cambios,
  };
}

describe('la misma cerveza, dos impuestos', () => {
  const reglas = [
    regla({ id: 'servicio', naturaleza: 'prestacion_de_servicios', tipo: 0.1 }),
    regla({
      id: 'alcohol-como-bien',
      naturaleza: 'entrega_de_bienes',
      categoriaFiscal: 'bebida_alcoholica',
      tipo: 0.21,
    }),
    regla({
      id: 'alimento-como-bien',
      naturaleza: 'entrega_de_bienes',
      categoriaFiscal: 'alimento',
      tipo: 0.1,
    }),
  ];

  it('servida en barra es un servicio de restauracion', () => {
    const salida = resolver(
      reglas,
      contexto({ naturaleza: 'prestacion_de_servicios', categoriaFiscal: 'bebida_alcoholica' }),
    );
    expect(salida.estado).toBe('resuelto');
    if (salida.estado === 'resuelto') expect(salida.regla.tipo).toBe(0.1);
  });

  it('vendida en caja para llevar de una tienda es una entrega de bienes', () => {
    const salida = resolver(
      reglas,
      contexto({
        naturaleza: 'entrega_de_bienes',
        modoDeConsumo: 'para_llevar',
        categoriaFiscal: 'bebida_alcoholica',
      }),
    );
    expect(salida.estado).toBe('resuelto');
    if (salida.estado === 'resuelto') expect(salida.regla.tipo).toBe(0.21);
  });

  it('«para llevar» por si solo no decide nada: lo decide la naturaleza', () => {
    // Mismo modo de consumo, distinta naturaleza, distinto tipo.
    const comoServicio = resolver(
      reglas,
      contexto({
        naturaleza: 'prestacion_de_servicios',
        modoDeConsumo: 'para_llevar',
        categoriaFiscal: 'bebida_alcoholica',
      }),
    );
    const comoBien = resolver(
      reglas,
      contexto({
        naturaleza: 'entrega_de_bienes',
        modoDeConsumo: 'para_llevar',
        categoriaFiscal: 'bebida_alcoholica',
      }),
    );
    expect(comoServicio.estado === 'resuelto' && comoServicio.regla.tipo).toBe(0.1);
    expect(comoBien.estado === 'resuelto' && comoBien.regla.tipo).toBe(0.21);
  });
});

describe('gana la regla mas especifica', () => {
  it('una regla con categoria gana a una general', () => {
    const reglas = [
      regla({ id: 'general', naturaleza: 'entrega_de_bienes', tipo: 0.1 }),
      regla({
        id: 'concreta',
        naturaleza: 'entrega_de_bienes',
        categoriaFiscal: 'bebida_alcoholica',
        tipo: 0.21,
      }),
    ];
    const salida = resolver(
      reglas,
      contexto({ naturaleza: 'entrega_de_bienes', categoriaFiscal: 'bebida_alcoholica' }),
    );
    expect(salida.estado === 'resuelto' && salida.regla.id).toBe('concreta');
  });

  it('el epigrafe IAE afina todavia mas', () => {
    const reglas = [
      regla({
        id: 'por-actividad',
        territorio: 'ceuta',
        regimen: 'ipsi',
        actividad: 'demas_cafes_y_bares',
        tipo: 0.02,
      }),
      regla({
        id: 'por-epigrafe',
        territorio: 'ceuta',
        regimen: 'ipsi',
        actividad: 'demas_cafes_y_bares',
        epigrafeIae: '673.2',
        tipo: 0.02,
      }),
    ];
    const salida = resolver(
      reglas,
      contexto({
        territorio: 'ceuta',
        regimen: 'ipsi',
        actividad: 'demas_cafes_y_bares',
        epigrafeIae: '673.2',
      }),
    );
    expect(salida.estado === 'resuelto' && salida.regla.id).toBe('por-epigrafe');
  });
});

describe('lo que NO hace: elegir al azar', () => {
  it('dos reglas igual de especificas dan ambiguedad, no una eleccion', () => {
    const reglas = [
      regla({ id: 'una', naturaleza: 'prestacion_de_servicios', tipo: 0.1 }),
      regla({ id: 'otra', naturaleza: 'prestacion_de_servicios', tipo: 0.21 }),
    ];
    const salida = resolver(reglas, contexto());
    expect(salida.estado).toBe('ambiguo');
    if (salida.estado === 'ambiguo') {
      expect(salida.candidatas.map((c) => c.id).sort()).toEqual(['otra', 'una']);
    }
  });

  it('sin regla aplicable no se supone un cero', () => {
    const salida = resolver([], contexto());
    expect(salida.estado).toBe('sin_regla');
  });

  it('una regla desactivada no cuenta', () => {
    const salida = resolver([regla({ id: 'apagada', tipo: 0.1, activa: false })], contexto());
    expect(salida.estado).toBe('sin_regla');
  });

  it('las reglas de otro territorio no se cuelan', () => {
    const salida = resolver(
      [regla({ id: 'canaria', territorio: 'canarias', regimen: 'igic', tipo: 0.07 })],
      contexto(),
    );
    expect(salida.estado).toBe('sin_regla');
  });
});

describe('el pasado no se recalcula', () => {
  const antes = regla({
    id: 'antes',
    tipo: 0.1,
    vigenteDesde: fechaOperativa('2026-01-01'),
    vigenteHasta: fechaOperativa('2026-09-30'),
  });
  const despues = regla({
    id: 'despues',
    tipo: 0.11,
    vigenteDesde: fechaOperativa('2026-10-01'),
    vigenteHasta: null,
  });

  it('una venta de septiembre sigue con la regla de septiembre', () => {
    const salida = resolver(
      [antes, despues],
      contexto({ fechaDeDevengo: fechaOperativa('2026-09-15') }),
    );
    expect(salida.estado === 'resuelto' && salida.regla.id).toBe('antes');
    expect(salida.estado === 'resuelto' && salida.regla.tipo).toBe(0.1);
  });

  it('una de octubre usa la nueva', () => {
    const salida = resolver(
      [antes, despues],
      contexto({ fechaDeDevengo: fechaOperativa('2026-10-01') }),
    );
    expect(salida.estado === 'resuelto' && salida.regla.id).toBe('despues');
  });

  it('el ultimo dia de vigencia todavia cuenta', () => {
    const salida = resolver(
      [antes, despues],
      contexto({ fechaDeDevengo: fechaOperativa('2026-09-30') }),
    );
    expect(salida.estado === 'resuelto' && salida.regla.id).toBe('antes');
  });

  it('antes de que existiera ninguna regla, no hay regla', () => {
    const salida = resolver(
      [antes, despues],
      contexto({ fechaDeDevengo: fechaOperativa('2025-12-31') }),
    );
    expect(salida.estado).toBe('sin_regla');
  });
});

describe('la copia que se guarda en la venta', () => {
  it('lleva lo suficiente para reconstruirla sin la tabla de reglas', () => {
    const laRegla = regla({
      id: 'iva-restauracion',
      version: 3,
      tipo: 0.1,
      referenciaLegal: 'Ley 37/1992, art. 91.Uno.2.2',
    });
    const copia = copiaFiscalDe(laRegla, contexto());
    expect(copia).toEqual({
      reglaId: 'iva-restauracion',
      reglaVersion: 3,
      regimen: 'iva',
      tipo: 0.1,
      vigenteDesde: '2020-01-01',
      referenciaLegal: 'Ley 37/1992, art. 91.Uno.2.2',
      fechaDeDevengo: '2026-09-01',
    });
  });
});

describe('desglose · impuesto aparte', () => {
  it('el ejemplo de Richi: tres lineas al 10 %', () => {
    // 10,01 + 7,03 + 4,02 = 21,06 de base; 10 % son 2,106 -> 2,11
    const salida = desglosar(
      [
        { importe: desdeEuros(10.01), regimen: 'iva', tipo: 0.1 },
        { importe: desdeEuros(7.03), regimen: 'iva', tipo: 0.1 },
        { importe: desdeEuros(4.02), regimen: 'iva', tipo: 0.1 },
      ],
      'impuesto_aparte',
    );
    expect(salida.grupos).toHaveLength(1);
    expect(salida.base).toBe(2106);
    expect(salida.cuota).toBe(211);
    expect(salida.total).toBe(2317);
  });

  it('sobre la base total, no linea a linea: la diferencia es real', () => {
    // Tres lineas de 0,05 al 21 %. Linea a linea: 3 x 0,01 = 0,03.
    // Sobre el total: 0,15 x 0,21 = 0,0315 -> 0,03. Aqui coinciden...
    // pero con 0,07: linea a linea 3 x 0,01 = 0,03; sobre el total 0,21 x 0,21 = 0,04.
    const salida = desglosar(
      [
        { importe: desdeEuros(0.07), regimen: 'iva', tipo: 0.21 },
        { importe: desdeEuros(0.07), regimen: 'iva', tipo: 0.21 },
        { importe: desdeEuros(0.07), regimen: 'iva', tipo: 0.21 },
      ],
      'impuesto_aparte',
    );
    expect(salida.cuota).toBe(4); // y no 3, que es lo que daria linea a linea
  });

  it('no mezcla tipos distintos', () => {
    const salida = desglosar(
      [
        { importe: desdeEuros(10), regimen: 'iva', tipo: 0.1 },
        { importe: desdeEuros(10), regimen: 'iva', tipo: 0.21 },
      ],
      'impuesto_aparte',
    );
    expect(salida.grupos).toHaveLength(2);
    expect(salida.grupos.map((g) => g.cuota)).toEqual([100, 210]);
    expect(salida.cuota).toBe(310);
  });
});

describe('desglose · impuesto incluido, que es como funciona una carta', () => {
  it('el ejemplo del propio Richi: 14,50 al 10 %', () => {
    const salida = desglosar(
      [{ importe: desdeEuros(14.5), regimen: 'iva', tipo: 0.1 }],
      'impuesto_incluido',
    );
    // 14,50 / 1,10 = 13,1818 -> 13,18 de base; la cuota es lo que falta.
    expect(salida.base).toBe(1318);
    expect(salida.cuota).toBe(132);
    expect(salida.total).toBe(1450);
  });

  it('base mas cuota es SIEMPRE lo que paga el cliente, al centimo', () => {
    for (const euros of [0.01, 1.6, 7.03, 14.5, 21.06, 99.99, 1234.56]) {
      for (const tipo of [0.01, 0.02, 0.04, 0.07, 0.1, 0.21]) {
        const salida = desglosar(
          [{ importe: desdeEuros(euros), regimen: 'iva', tipo }],
          'impuesto_incluido',
        );
        expect(salida.base + salida.cuota, `${euros} al ${tipo}`).toBe(salida.total);
        expect(salida.total).toBe(desdeEuros(euros));
      }
    }
  });

  it('un ticket con dos tipos cuadra al centimo', () => {
    // Menu 12,00 al 10 % y una botella de vino para llevar 18,00 al 21 %.
    const salida = desglosar(
      [
        { importe: desdeEuros(12), regimen: 'iva', tipo: 0.1 },
        { importe: desdeEuros(18), regimen: 'iva', tipo: 0.21 },
      ],
      'impuesto_incluido',
    );
    expect(salida.total).toBe(3000);
    expect(salida.base + salida.cuota).toBe(3000);
  });

  it('agrupa varias lineas del mismo tipo antes de calcular', () => {
    const juntas = desglosar(
      [
        { importe: desdeEuros(10.01), regimen: 'iva', tipo: 0.1 },
        { importe: desdeEuros(7.03), regimen: 'iva', tipo: 0.1 },
        { importe: desdeEuros(4.02), regimen: 'iva', tipo: 0.1 },
      ],
      'impuesto_incluido',
    );
    const deUnaVez = desglosar(
      [{ importe: desdeEuros(21.06), regimen: 'iva', tipo: 0.1 }],
      'impuesto_incluido',
    );
    expect(juntas.base).toBe(deUnaVez.base);
    expect(juntas.cuota).toBe(deUnaVez.cuota);
  });
});

describe('los cuatro territorios conviven', () => {
  it('un cierre con IVA, IGIC e IPSI se desglosa por separado', () => {
    const salida = desglosar(
      [
        { importe: desdeEuros(100), regimen: 'iva', tipo: 0.1 },
        { importe: desdeEuros(100), regimen: 'igic', tipo: 0.07 },
        { importe: desdeEuros(100), regimen: 'ipsi', tipo: 0.01 },
        { importe: desdeEuros(100), regimen: 'ipsi', tipo: 0.02 },
      ],
      'impuesto_aparte',
    );
    expect(salida.grupos).toHaveLength(4);
    expect(salida.grupos.map((g) => `${g.regimen} ${g.tipo}`)).toEqual([
      'igic 0.07',
      'ipsi 0.01',
      'ipsi 0.02',
      'iva 0.1',
    ]);
    expect(salida.cuota).toBe(1000 + 700 + 100 + 200);
  });

  it('el orden de los grupos es estable, pase lo que pase con las lineas', () => {
    const uno = desglosar(
      [
        { importe: desdeEuros(1), regimen: 'iva', tipo: 0.21 },
        { importe: desdeEuros(1), regimen: 'iva', tipo: 0.1 },
      ],
      'impuesto_aparte',
    );
    const otro = desglosar(
      [
        { importe: desdeEuros(1), regimen: 'iva', tipo: 0.1 },
        { importe: desdeEuros(1), regimen: 'iva', tipo: 0.21 },
      ],
      'impuesto_aparte',
    );
    expect(uno.grupos.map((g) => g.tipo)).toEqual(otro.grupos.map((g) => g.tipo));
  });

  it('rechaza un tipo imposible', () => {
    expect(() =>
      desglosar([{ importe: desdeEuros(1), regimen: 'iva', tipo: -1 }], 'impuesto_aparte'),
    ).toThrow(/no es un tipo impositivo/i);
  });
});
