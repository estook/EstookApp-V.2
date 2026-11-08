import { describe, expect, it } from 'vitest';
import {
  elPeriodoDelServicio,
  laCartaEnCuatro,
  loQueDeberiaVender,
  minutosDeCocina,
} from './lo-que-se-vende.ts';

describe('tu carta en cuatro (0142)', () => {
  it('clasifica como Kasavana y Smith: 70 % de lo que toca, y el margen medio ponderado', () => {
    const carta = laCartaEnCuatro([
      { id: 'croquetas', uds: 98, margenPorUnidad: 654 },
      { id: 'chuleton', uds: 20, margenPorUnidad: 2277 },
      { id: 'hamburguesa', uds: 79, margenPorUnidad: 898 },
      { id: 'coulant', uds: 13, margenPorUnidad: 355 },
      { id: 'sin-escandallo', uds: 50, margenPorUnidad: null },
    ]);
    expect(carta).not.toBeNull();
    // 210 raciones entre 4 platos con margen: popular desde 36,75.
    expect(carta?.corteDeUnidades).toBeCloseTo(36.75, 2);
    expect(carta?.deCadaPlato.get('croquetas')).toBe('caballo');
    expect(carta?.deCadaPlato.get('hamburguesa')).toBe('estrella');
    expect(carta?.deCadaPlato.get('chuleton')).toBe('puzzle');
    expect(carta?.deCadaPlato.get('coulant')).toBe('perro');
    // Sin escandallo no se clasifica.
    expect(carta?.deCadaPlato.has('sin-escandallo')).toBe(false);
  });

  it('con menos de cuatro platos con margen no hay carta que comparar', () => {
    expect(
      laCartaEnCuatro([
        { id: 'a', uds: 10, margenPorUnidad: 100 },
        { id: 'b', uds: 10, margenPorUnidad: 200 },
        { id: 'c', uds: 10, margenPorUnidad: null },
      ]),
    ).toBeNull();
  });
});

describe('los minutos de la cocina', () => {
  it('desde que se manda, o se marcha el pase si es después, hasta que se tacha', () => {
    expect(minutosDeCocina('2026-11-07T20:00:00Z', null, '2026-11-07T20:14:00Z')).toBe(14);
    expect(
      minutosDeCocina('2026-11-07T20:00:00Z', '2026-11-07T20:30:00Z', '2026-11-07T20:42:00Z'),
    ).toBe(12);
  });

  it('sin tachar en pantalla, o con un tiempo imposible, no hay tiempo', () => {
    expect(minutosDeCocina('2026-11-07T20:00:00Z', null, null)).toBeNull();
    expect(minutosDeCocina('2026-11-07T20:00:00Z', null, '2026-11-08T02:00:00Z')).toBeNull();
  });
});

describe('lo que debería vender cada uno', () => {
  it('el objetivo por hora por sus horas', () => {
    // 45 €/h en 38 h: 1.710 €.
    expect(loQueDeberiaVender(4500, 38 * 60)).toBe(171_000);
  });
});

describe('los periodos de Información e Informes', () => {
  it('un día se compara con el mismo día de la semana anterior', () => {
    expect(elPeriodoDelServicio('dia', null, '2026-11-08')).toEqual({
      desde: '2026-11-08',
      hasta: '2026-11-08',
      antesDesde: '2026-11-01',
      antesHasta: '2026-11-01',
      anteriorDel: '2026-11-07',
      siguienteDel: null,
    });
  });

  it('la semana va de lunes a domingo, y a medias se compara hasta el mismo día', () => {
    // El jueves 5: del lunes 2 al domingo 8, frente al lunes 26 de octubre hasta el jueves 29.
    expect(elPeriodoDelServicio('semana', null, '2026-11-05')).toMatchObject({
      desde: '2026-11-02',
      hasta: '2026-11-08',
      antesDesde: '2026-10-26',
      antesHasta: '2026-10-29',
      siguienteDel: null,
    });
    // Una semana entera de antes, entera.
    expect(elPeriodoDelServicio('semana', '2026-10-28', '2026-11-05')).toMatchObject({
      desde: '2026-10-26',
      hasta: '2026-11-01',
      antesHasta: '2026-10-25',
      siguienteDel: '2026-11-02',
    });
  });

  it('el mes, con el de antes cortado si este no ha acabado y nunca más allá de su final', () => {
    expect(elPeriodoDelServicio('mes', null, '2026-03-31')).toMatchObject({
      desde: '2026-03-01',
      hasta: '2026-03-31',
      antesDesde: '2026-02-01',
      antesHasta: '2026-02-28',
    });
    expect(elPeriodoDelServicio('mes', null, '2026-11-08')).toMatchObject({
      antesDesde: '2026-10-01',
      antesHasta: '2026-10-08',
    });
  });
});
