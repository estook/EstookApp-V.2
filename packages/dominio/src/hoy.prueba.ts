import { describe, expect, it } from 'vitest';
import { loDeHoy, ordenarLoDeHoy, type CosaDeHoy } from './hoy.ts';

/**
 * Lo de hoy (entrega O, 0047): cinco escalones, y dentro de cada uno manda el
 * dinero en juego.
 */

describe('el orden de lo de hoy', () => {
  const cosa = (id: string, escalon: CosaDeHoy['escalon'], centimos: number | null): CosaDeHoy => ({
    id,
    escalon,
    titulo: id,
    detalle: null,
    centimos,
    app: null,
    tono: 'info',
    accion: null,
  });

  it('por escalón, y dentro del escalón primero lo que más dinero pone en juego', () => {
    const ordenadas = ordenarLoDeHoy([
      cosa('mañana', 5, null),
      cosa('pedido barato', 1, 1_000),
      cosa('para hoy', 4, null),
      cosa('pedido caro', 1, 50_000),
      cosa('caja', 1, null),
    ]);
    expect(ordenadas.map((c) => c.id)).toEqual([
      'pedido caro',
      'pedido barato',
      'caja',
      'para hoy',
      'mañana',
    ]);
  });

  it('sin nada que atender, nada: un día tranquilo no se rellena', () => {
    expect(loDeHoy({})).toEqual([]);
  });

  it('cada cosa dice qué pasa y lleva su botón', () => {
    const cosas = loDeHoy({
      pedidosQueNoHanLlegado: [
        { pedidoId: 'p1', proveedor: 'Frutas Pepe', llegaCuando: 'ayer', centimos: 12_000 },
      ],
      lotes: { pasados: [], hoy: ['pulpo', 'merluza', 'gambas', 'bacalao'], manana: ['nata'] },
      miTurno: { que: 'entra', aLas: '16:00', enMinutos: 20 },
      bajoMinimo: 3,
    });
    expect(cosas.map((c) => c.escalon)).toEqual([1, 2, 3, 4, 5]);
    expect(cosas[0]?.titulo).toBe('El pedido de Frutas Pepe debía llegar ayer');
    expect(cosas[0]?.detalle).toContain('120,00 €');
    expect(cosas[1]?.titulo).toBe('4 lotes caducan hoy');
    expect(cosas[1]?.detalle).toContain('pulpo, merluza y 2 más');
    expect(cosas[2]?.accion?.texto).toBe('Fichar');
    expect(cosas.every((c) => c.accion !== null)).toBe(true);
  });

  it('un turno que empieza tarde no pide fichar todavía, y uno pasado lo dice en rojo', () => {
    const pronto = loDeHoy({ miTurno: { que: 'entra', aLas: '20:00', enMinutos: 300 } });
    expect(pronto[0]?.accion).toBeNull();
    const tarde = loDeHoy({ miTurno: { que: 'entra', aLas: '10:00', enMinutos: -15 } });
    expect(tarde[0]).toMatchObject({ titulo: 'Entrabas a las 10:00', tono: 'mal' });
  });

  it('la salida olvidada va arriba del todo', () => {
    const cosas = loDeHoy({
      bajoMinimo: 1,
      miTurno: { que: 'olvidada', horas: 14 },
    });
    expect(cosas[0]?.id).toBe('salida-olvidada');
    expect(cosas[0]?.titulo).toBe('Llevas 14 horas dentro');
  });

  it('lo congelado avisa por lo que lleva en el congelador, no por su caducidad (25-sep)', () => {
    const cosas = loDeHoy({
      congelados: { pasados: ['Bacon'], pronto: ['Gambas', 'Pulpo'] },
    });
    expect(cosas.map((c) => c.id)).toEqual(['congelados-pasados', 'congelados-pronto']);
    expect(cosas[0]?.titulo).toBe('Bacon lleva demasiado tiempo congelado');
    expect(cosas[1]?.titulo).toBe('2 congelados cumplen su tiempo esta semana');
    expect(cosas[1]?.accion?.ir).toBe('/almacen/productos/congelados');
  });

  it('una nota del tablón con hora es de lo que tiene hora hoy (25-sep)', () => {
    const cosas = loDeHoy({
      bajoMinimo: 2,
      notasConHora: [
        { notaId: 'n1', hora: '17:00', texto: 'Reserva de 20 personas', autor: 'Ricardo' },
      ],
    });
    expect(cosas[0]).toMatchObject({
      id: 'nota:n1',
      escalon: 3,
      titulo: '17:00 · Reserva de 20 personas',
      detalle: 'En el tablón · de Ricardo',
      accion: { texto: 'Verla', ir: '/?nota=n1' },
    });
  });
});
