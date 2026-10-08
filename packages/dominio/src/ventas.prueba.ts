import { describe, expect, it } from 'vitest';
import { estaEnLaPestana } from './clientes.ts';
import type { FechaOperativa } from './tiempo.ts';
import {
  elCorreoDeLaSemana,
  elLunes,
  elTableroDeVentas,
  laCuotaSinIva,
  losTramos,
  type ApunteDeDinero,
  type ClienteDeVentas,
  type FotoDeVentas,
  type LoQueHayParaLasVentas,
} from './ventas.ts';

const f = (dia: string) => dia as FechaOperativa;

/** Un cliente que paga Pro al mes (99 € con IVA), de alta el 1 de septiembre. */
function cliente(id: string, cambios: Partial<ClienteDeVentas> = {}): ClienteDeVentas {
  return {
    id,
    nombre: `Bar ${id}`,
    alta: f('2026-09-01'),
    como: 'al_dia',
    enPausa: false,
    actividad: 'activo',
    cancelaAlAcabar: false,
    diasSinEntrar: 0,
    esEjemplo: false,
    deLaCasa: false,
    modo: 'prueba',
    cuotaAlMes: 9_900,
    origen: 'directo',
    vendedor: null,
    eligioPlan: true,
    ...cambios,
  };
}

function foto(id: string, dia: string, cambios: Partial<FotoDeVentas> = {}): FotoDeVentas {
  return {
    organizacionId: id,
    dia: f(dia),
    como: 'al_dia',
    enPausa: false,
    cuotaAlMes: 9_900,
    deLaCasa: false,
    modo: 'prueba',
    ...cambios,
  };
}

function hay(cambios: Partial<LoQueHayParaLasVentas> = {}): LoQueHayParaLasVentas {
  return {
    periodo: 'mes',
    hoy: f('2026-10-08'),
    modo: 'prueba',
    clientes: [],
    fotos: [],
    dinero: [],
    visitas: [],
    ...cambios,
  };
}

describe('el periodo', () => {
  it('7 días: los siete hasta hoy, frente a los siete de antes', () => {
    expect(losTramos('7', f('2026-10-08'))).toEqual({
      este: { desde: '2026-10-02', hasta: '2026-10-08' },
      antes: { desde: '2026-09-25', hasta: '2026-10-01' },
    });
  });

  it('el mes se compara con el mismo trozo del mes pasado, no con el mes entero', () => {
    expect(losTramos('mes', f('2026-10-08'))).toEqual({
      este: { desde: '2026-10-01', hasta: '2026-10-08' },
      antes: { desde: '2026-09-01', hasta: '2026-09-08' },
    });
  });

  it('si el anterior es más corto, acaba en su último día (31 de marzo)', () => {
    expect(losTramos('mes', f('2027-03-31')).antes).toEqual({
      desde: '2027-02-01',
      hasta: '2027-02-28',
    });
  });

  it('el trimestre y el año, desde su primer día', () => {
    expect(losTramos('trimestre', f('2026-11-15'))).toEqual({
      este: { desde: '2026-10-01', hasta: '2026-11-15' },
      antes: { desde: '2026-07-01', hasta: '2026-08-15' },
    });
    expect(losTramos('ano', f('2028-02-29')).antes).toEqual({
      desde: '2027-01-01',
      hasta: '2027-02-28',
    });
  });

  it('el lunes de una semana', () => {
    expect(elLunes(f('2026-10-08'))).toBe('2026-10-05');
    expect(elLunes(f('2026-10-05'))).toBe('2026-10-05');
    expect(elLunes(f('2026-10-11'))).toBe('2026-10-05');
  });
});

describe('el dinero, sin IVA (1A)', () => {
  it('99 € con IVA son 81,82 € de Estook; 79 €, 65,29 €', () => {
    expect(laCuotaSinIva(9_900)).toBe(8_182);
    expect(laCuotaSinIva(7_900)).toBe(6_529);
  });

  it('la cuota al mes se da sin IVA, y con él al lado', () => {
    const t = elTableroDeVentas(hay({ clientes: [cliente('a'), cliente('b')] }));
    expect(t.dinero.cuotaAlMes.ahora).toBe(laCuotaSinIva(19_800));
    expect(t.dinero.cuotaAlMes.conIva).toBe(19_800);
  });
});

describe('quién cuenta', () => {
  const base = [cliente('a'), cliente('b', { como: 'prueba', cuotaAlMes: null })];

  it('un cliente de ejemplo no cambia ninguna cifra', () => {
    const sin = elTableroDeVentas(hay({ clientes: base }));
    const con = elTableroDeVentas(
      hay({ clientes: [...base, cliente('ejemplo', { esEjemplo: true, alta: f('2026-10-02') })] }),
    );
    expect(con).toEqual(sin);
  });

  it('IKATZ, de la casa, no cuenta en nada: sale aparte', () => {
    const t = elTableroDeVentas(
      hay({ clientes: [...base, cliente('ikatz', { deLaCasa: true, alta: f('2026-10-02') })] }),
    );
    expect(t.clientes.pagando.ahora).toBe(1);
    expect(t.clientes.altas.ahora).toBe(0);
    expect(t.clientes.deLaCasa).toBe(1);
  });

  it('lo de otro modo de Stripe no cuenta: lo de prueba se va solo el día del real', () => {
    const t = elTableroDeVentas(hay({ modo: 'real', clientes: base }));
    expect(t.clientes.pagando.ahora).toBe(0);
    expect(t.dinero.cuotaAlMes.ahora).toBe(0);
  });

  it('el plan Pausa paga: está en Pagando y su cuota cuenta', () => {
    const pausa = cliente('p', { como: 'solo_lectura', enPausa: true, cuotaAlMes: 1_200 });
    const t = elTableroDeVentas(hay({ clientes: [pausa] }));
    expect(t.clientes.pagando.ahora).toBe(1);
    expect(t.clientes.enPausa).toBe(1);
    expect(t.clientes.sinPagar).toBe(0);
    expect(t.dinero.cuotaAlMes.conIva).toBe(1_200);
  });

  it('«Pagando» es la misma cuenta que la pestaña de Clientes', () => {
    const todos = [
      cliente('a'),
      cliente('b', { como: 'impago' }),
      cliente('c', { como: 'solo_lectura', enPausa: true }),
      cliente('d', { como: 'sin_pagar', cuotaAlMes: null }),
    ];
    const t = elTableroDeVentas(hay({ clientes: todos }));
    expect(t.clientes.pagando.ahora).toBe(
      todos.filter((c) => estaEnLaPestana('pagando', c)).length,
    );
    // El cobro fallido no está en Pagando, pero su cuota todavía cuenta.
    expect(t.dinero.cuotaAlMes.conIva).toBe(9_900 * 3);
  });
});

describe('las bajas, de las fotos de cada día', () => {
  it('pagaba un día y al siguiente ya no: una baja, con la cuota que se llevó', () => {
    const t = elTableroDeVentas(
      hay({
        clientes: [cliente('a', { como: 'sin_pagar', cuotaAlMes: null })],
        fotos: [
          foto('a', '2026-10-02'),
          foto('a', '2026-10-03', { como: 'sin_pagar', cuotaAlMes: null }),
        ],
      }),
    );
    expect(t.clientes.bajas.ahora).toBe(1);
    expect(t.dinero.perdida.cuota).toBe(laCuotaSinIva(9_900));
  });

  it('pasar de pagar a prueba, o de un cobro fallido a pagar, no es una baja', () => {
    const t = elTableroDeVentas(
      hay({
        fotos: [
          foto('a', '2026-10-02'),
          foto('a', '2026-10-03', { como: 'prueba' }),
          foto('b', '2026-10-02', { como: 'impago' }),
          foto('b', '2026-10-03'),
        ],
      }),
    );
    expect(t.clientes.bajas.ahora).toBe(0);
  });

  it('sin fotos con la cuenta no se sabe: nulo, no cero', () => {
    const t = elTableroDeVentas(hay({ clientes: [cliente('a')] }));
    expect(t.clientes.bajas.ahora).toBeNull();
    expect(t.fotosDesde).toBeNull();
    expect(t.clientes.pagando.antes).toBeNull();
  });

  it('la pérdida, en tanto por ciento solo con diez o más pagando al empezar', () => {
    const diez = Array.from({ length: 10 }, (_, i) => `c${String(i)}`);
    const fotos = [
      ...diez.map((id) => foto(id, '2026-09-30')),
      ...diez.map((id, i) =>
        foto(id, '2026-10-05', i === 0 ? { como: 'sin_pagar', cuotaAlMes: null } : {}),
      ),
    ];
    const t = elTableroDeVentas(hay({ fotos }));
    expect(t.dinero.perdida).toMatchObject({ bajas: 1, pagaban: 10, porcentaje: 10 });

    const cuatro = elTableroDeVentas(
      hay({ fotos: fotos.filter((x) => ['c0', 'c1', 'c2', 'c3'].includes(x.organizacionId)) }),
    );
    expect(cuatro.dinero.perdida).toMatchObject({ bajas: 1, pagaban: 4, porcentaje: null });
  });
});

describe('lo cobrado (2A)', () => {
  const cobro = (
    dia: string,
    importe: number,
    modo: 'prueba' | 'real' = 'prueba',
  ): ApunteDeDinero => ({
    organizacionId: 'a',
    dia: f(dia),
    importe,
    sinIva: laCuotaSinIva(Math.abs(importe)) * Math.sign(importe),
    modo,
  });

  it('suma lo cobrado del periodo y resta lo devuelto; lo del anterior, aparte', () => {
    const t = elTableroDeVentas(
      hay({
        dinero: [
          cobro('2026-10-02', 9_900),
          cobro('2026-10-04', -4_950),
          cobro('2026-09-03', 7_900),
          cobro('2026-10-03', 9_900, 'real'),
        ],
      }),
    );
    expect(t.dinero.cobrado.conIva).toBe(4_950);
    expect(t.dinero.cobrado.ahora).toBe(laCuotaSinIva(9_900) - laCuotaSinIva(4_950));
    expect(t.dinero.cobrado.antes).toBe(laCuotaSinIva(7_900));
  });

  it('la conversión: de las altas del periodo, las que han llegado a pagar', () => {
    const t = elTableroDeVentas(
      hay({
        clientes: [
          cliente('a', { alta: f('2026-10-02'), como: 'prueba', cuotaAlMes: null }),
          cliente('b', { alta: f('2026-10-03'), como: 'sin_pagar', eligioPlan: false }),
          cliente('c', { alta: f('2026-10-04') }),
        ],
        dinero: [cobro('2026-10-02', 9_900)],
      }),
    );
    expect(t.clientes.conversion).toEqual({ cuentas: 3, pagan: 2 });
    expect(t.embudo).toMatchObject({ cuentas: 3, eligieronPlan: 2, pagan: 2 });
  });
});

describe('las gráficas', () => {
  it('la cuota de cada mes: lo nuevo, lo ampliado y lo perdido', () => {
    const t = elTableroDeVentas(
      hay({
        fotos: [
          foto('a', '2026-09-30'),
          foto('b', '2026-09-30', { cuotaAlMes: 4_900 }),
          foto('a', '2026-10-08', { como: 'sin_pagar', cuotaAlMes: null }),
          foto('b', '2026-10-08', { cuotaAlMes: 9_900 }),
          foto('c', '2026-10-08'),
        ],
      }),
    );
    const octubre = t.series.meses.find((m) => m.mes === '2026-10');
    expect(octubre).toEqual({
      mes: '2026-10',
      cuota: laCuotaSinIva(19_800),
      nueva: laCuotaSinIva(9_900),
      ampliada: laCuotaSinIva(5_000),
      perdida: laCuotaSinIva(9_900),
      reducida: 0,
    });
  });

  it('las doce semanas de altas y bajas, la última la de hoy', () => {
    const t = elTableroDeVentas(hay({ clientes: [cliente('a', { alta: f('2026-10-06') })] }));
    expect(t.series.semanas).toHaveLength(12);
    expect(t.series.semanas.at(-1)).toEqual({ lunes: '2026-10-05', altas: 1, bajas: 0 });
  });

  it('cuántos siguen, por mes de alta', () => {
    const t = elTableroDeVentas(
      hay({
        clientes: [
          cliente('a'),
          cliente('b', { como: 'sin_pagar', cuotaAlMes: null }),
          cliente('c', { alta: f('2026-10-02'), como: 'prueba', cuotaAlMes: null }),
        ],
      }),
    );
    expect(t.series.cohortes).toEqual([
      { mes: '2026-09', altas: 2, siguen: 1 },
      { mes: '2026-10', altas: 1, siguen: 1 },
    ]);
  });

  it('un vendedor sale con sus visitas aunque no haya traído a nadie (3B)', () => {
    const t = elTableroDeVentas(
      hay({
        clientes: [cliente('a', { vendedor: { id: 'juan', nombre: 'Juan' } })],
        visitas: [
          { vendedorId: 'pedro', vendedor: 'Pedro', dia: f('2026-10-03'), visitas: 40 },
          { vendedorId: 'juan', vendedor: 'Juan', dia: f('2026-09-03'), visitas: 5 },
        ],
      }),
    );
    expect(t.vendedores).toEqual([
      {
        id: 'juan',
        nombre: 'Juan',
        traidos: 1,
        pagan: 1,
        cuotaAlMes: laCuotaSinIva(9_900),
        visitas: 5,
      },
      { id: 'pedro', nombre: 'Pedro', traidos: 0, pagan: 0, cuotaAlMes: 0, visitas: 40 },
    ]);
    // En el embudo, solo las del periodo.
    expect(t.embudo.visitas).toBe(40);
  });
});

describe('quién se está yendo, y el correo del lunes (4A)', () => {
  const t = elTableroDeVentas(
    hay({
      periodo: '7',
      clientes: [
        cliente('a', { actividad: 'dormido', diasSinEntrar: 16, nombre: 'Bar Pepe' }),
        cliente('b', { como: 'impago', nombre: 'Casa Luis' }),
        cliente('c'),
      ],
    }),
  );

  it('primero el cobro fallido, luego quien pidió cancelar, luego los dormidos', () => {
    expect(t.seVanQuienes).toEqual([
      { id: 'b', nombre: 'Casa Luis', porque: 'Tiene un cobro fallido' },
      { id: 'a', nombre: 'Bar Pepe', porque: '16 días sin entrar' },
    ]);
  });

  it('el correo dice lo esencial y avisa del modo prueba', () => {
    const correo = elCorreoDeLaSemana(t);
    expect(correo.asunto).toBe('Estook, la semana: 2 pagando · 245,45 € al mes');
    expect(correo.cifras.map((c) => c.nombre)).toEqual([
      'Pagando',
      'Entra al mes, sin IVA',
      'Altas',
      'Bajas',
      'Cobrado, sin IVA',
    ]);
    expect(correo.frases[0]).toBe(
      'Se están yendo: Casa Luis (tiene un cobro fallido), Bar Pepe (16 días sin entrar).',
    );
    expect(correo.frases).toContain(
      'Stripe está en modo prueba: nada de esto es dinero de verdad.',
    );
  });
});
