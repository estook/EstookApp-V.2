import { describe, expect, it } from 'vitest';
import {
  CUENTAS_PARA_APRENDER,
  DURACIONES_DE_FABRICA,
  abreEseDia,
  cabeEnElCuarto,
  elCodigoDeLaReserva,
  hastaCuandoConfirmar,
  laReservaDeLaDireccion,
  cuantoDura,
  elCuartoDe,
  esUnServicio,
  laMejorMesa,
  lasDuracionesReales,
  lasHorasDelServicio,
  lasMesasEnLetra,
  losDiasQueAbre,
  telefonoLimpio,
} from './reservas.ts';

/** La Ampliación 5 · 1 · El motor de las reservas (0153, sección 6). */

const MESAS = [
  { id: 'm1', nombre: '1', plazas: 2 },
  { id: 'm2', nombre: '2', plazas: 2 },
  { id: 'm5', nombre: '5', plazas: 4 },
  { id: 'm7', nombre: '7', plazas: 4 },
  { id: 'm8', nombre: '8', plazas: 2 },
];
const HORA = 3_600_000;

describe('cuánto dura una mesa', () => {
  it('de fábrica, según los que son', () => {
    expect(cuantoDura(2, DURACIONES_DE_FABRICA)).toBe(90);
    expect(cuantoDura(3, DURACIONES_DE_FABRICA)).toBe(105);
    expect(cuantoDura(6, DURACIONES_DE_FABRICA)).toBe(120);
    expect(cuantoDura(12, DURACIONES_DE_FABRICA)).toBe(150);
  });

  it('con cuentas de sobra, lo que duran de verdad; si no, la del local', () => {
    const dePareja = Array.from({ length: CUENTAS_PARA_APRENDER }, (_, i) => ({
      comensales: 2,
      minutos: 70 + i,
    }));
    const pocasDeCuatro = [{ comensales: 4, minutos: 200 }];
    const lo = lasDuracionesReales([...dePareja, ...pocasDeCuatro], [90, 105, 120, 150]);
    // La mediana de 70 a 81 es 75,5: al cuarto de hora, 75.
    expect(lo.duraciones).toEqual([75, 105, 120, 150]);
    expect(lo.aprendidas).toEqual([true, false, false, false]);
  });
});

describe('las horas', () => {
  it('cada cuarto de hora, la última incluida', () => {
    expect(lasHorasDelServicio({ nombre: 'Cena', desde: '20:00', hasta: '21:00' })).toEqual([
      '20:00',
      '20:15',
      '20:30',
      '20:45',
      '21:00',
    ]);
    expect(elCuartoDe('21:10')).toBe('21:00');
  });

  it('un servicio vale con nombre y en cuartos de hora, y desde antes que hasta', () => {
    expect(esUnServicio({ nombre: 'Cena', desde: '20:00', hasta: '22:30' })).toBe(true);
    expect(esUnServicio({ nombre: 'Cena', desde: '20:10', hasta: '22:30' })).toBe(false);
    expect(esUnServicio({ nombre: 'Cena', desde: '23:00', hasta: '22:30' })).toBe(false);
    expect(esUnServicio({ nombre: '', desde: '20:00', hasta: '22:30' })).toBe(false);
  });

  it('los días que abre: sin decirlo, todos; cerrado lunes, el lunes no hay', () => {
    const cena = { nombre: 'Cena', desde: '20:00', hasta: '22:30' };
    const sinLunes = { ...cena, dias: [0, 2, 3, 4, 5, 6] };
    expect(esUnServicio(sinLunes)).toBe(true);
    expect(esUnServicio({ ...cena, dias: [] })).toBe(false);
    expect(esUnServicio({ ...cena, dias: [1, 1] })).toBe(false);
    expect(esUnServicio({ ...cena, dias: [7] })).toBe(false);
    // El 30-nov-2026 es lunes y el 1-dic, martes.
    expect(abreEseDia(cena, '2026-11-30')).toBe(true);
    expect(abreEseDia(sinLunes, '2026-11-30')).toBe(false);
    expect(abreEseDia(sinLunes, '2026-12-01')).toBe(true);
    // Comida de martes a domingo y cena solo el fin de semana: abre de martes a domingo.
    expect(
      losDiasQueAbre([
        { ...cena, nombre: 'Comida', dias: [0, 2, 3, 4, 5, 6] },
        { ...cena, dias: [5, 6] },
      ]),
    ).toEqual([0, 2, 3, 4, 5, 6]);
    expect(losDiasQueAbre([cena])).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });
});

describe('la mesa que pone Estook', () => {
  const tramo = { desde: 20 * HORA, hasta: 21.5 * HORA };

  it('la que deja menos sillas vacías', () => {
    expect(
      laMejorMesa({ mesas: MESAS, juntables: [], ocupados: [], comensales: 2, ...tramo })?.map(
        (m) => m.nombre,
      ),
    ).toEqual(['1']);
    expect(
      laMejorMesa({ mesas: MESAS, juntables: [], ocupados: [], comensales: 3, ...tramo })?.map(
        (m) => m.nombre,
      ),
    ).toEqual(['5']);
  });

  it('salta las ocupadas en el tramo, y no las que acaban antes', () => {
    const ocupados = [
      { mesaId: 'm1', desde: 19 * HORA, hasta: 20.5 * HORA },
      { mesaId: 'm2', desde: 18 * HORA, hasta: 20 * HORA },
    ];
    expect(
      laMejorMesa({ mesas: MESAS, juntables: [], ocupados, comensales: 2, ...tramo })?.map(
        (m) => m.nombre,
      ),
    ).toEqual(['2']);
  });

  it('para seis, dos que se juntan, solo si el local las marcó', () => {
    expect(
      laMejorMesa({ mesas: MESAS, juntables: [], ocupados: [], comensales: 6, ...tramo }),
    ).toBeNull();
    const juntables = [
      ['m8', 'm7'],
      ['m5', 'm7'],
    ] as const;
    // 7 + 8 son 6 sillas; 5 + 7, 8: se elige la que deja menos vacías.
    expect(
      laMejorMesa({ mesas: MESAS, juntables, ocupados: [], comensales: 6, ...tramo })?.map(
        (m) => m.nombre,
      ),
    ).toEqual(['7', '8']);
  });
});

describe('lo demás', () => {
  it('el tope por cuarto de hora', () => {
    expect(cabeEnElCuarto(null, 40, 6)).toBe(true);
    expect(cabeEnElCuarto(10, 6, 4)).toBe(true);
    expect(cabeEnElCuarto(10, 8, 4)).toBe(false);
  });

  it('las mesas y el teléfono, como se dicen y se guardan', () => {
    expect(lasMesasEnLetra(['8', '7'])).toBe('7 + 8');
    expect(telefonoLimpio('600 12 34 56')).toBe('600123456');
    expect(telefonoLimpio('+34 600-123-456')).toBe('+34600123456');
  });
});

describe('la web de reservas (5 · 2)', () => {
  it('la dirección de reservar, y nada más', () => {
    expect(laReservaDeLaDireccion('/reservar/IKATZ')).toEqual({ direccion: 'ikatz' });
    expect(laReservaDeLaDireccion('/reservar/bar-centro/')).toEqual({ direccion: 'bar-centro' });
    expect(laReservaDeLaDireccion('/reservar/')).toBeNull();
    expect(laReservaDeLaDireccion('/carta/ikatz')).toBeNull();
  });

  it('el código, siempre de 4 cifras', () => {
    expect(elCodigoDeLaReserva(0)).toBe('0000');
    expect(elCodigoDeLaReserva(0.4821)).toBe('4821');
    expect(elCodigoDeLaReserva(0.99999)).toBe('9999');
  });

  it('se confirma hasta X minutos antes de la hora, no desde que se reserva', () => {
    const a_las_2115 = new Date('2026-11-28T20:15:00Z');
    expect(hastaCuandoConfirmar(a_las_2115, 30).toISOString()).toBe('2026-11-28T19:45:00.000Z');
  });
});
