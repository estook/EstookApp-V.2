import { describe, expect, it } from 'vitest';
import { desplegar, type EventoGuardado } from './calendario.ts';
import { fechaOperativa } from './tiempo.ts';

/**
 * El Calendario (M7 publica, M14 pinta).
 *
 * El 11 de septiembre de 2026 es viernes; el 15, martes.
 */
const VIERNES = fechaOperativa('2026-09-11');
const MARTES = fechaOperativa('2026-09-15');

function evento(parte: Partial<EventoGuardado>): EventoGuardado {
  return {
    id: 'e',
    capa: 'entrega',
    dia: VIERNES,
    hastaEl: null,
    desde: null,
    hasta: null,
    seRepite: null,
    titulo: 'Algo',
    detalle: null,
    ir: null,
    grupo: null,
    hecho: false,
    ...parte,
  };
}

describe('desplegar lo que hay entre dos días', () => {
  it('lo que se repite sale cada día que toca, y solo esos', () => {
    const makro = evento({ id: 'makro', titulo: 'Reparte Makro', seRepite: [2, 5] });
    const salen = desplegar([makro], VIERNES, fechaOperativa('2026-09-18'));
    expect(salen.map((o) => o.fecha)).toEqual(['2026-09-11', '2026-09-15', '2026-09-18']);
    expect(salen.every((o) => o.repetido)).toBe(true);
  });

  it('y no antes de su primer día', () => {
    const desdeElMartes = evento({ seRepite: [2, 5], dia: MARTES });
    expect(desplegar([desdeElMartes], VIERNES, MARTES).map((o) => o.fecha)).toEqual([MARTES]);
  });

  it('lo concreto tapa a lo que se repite del mismo grupo, ese día', () => {
    // El martes llega el pedido 23 de Makro: no hace falta decir además que reparte.
    const reparto = evento({
      id: 'r',
      titulo: 'Reparte Makro',
      seRepite: [2, 5],
      grupo: 'proveedor:makro',
    });
    const pedido = evento({
      id: 'p',
      titulo: 'Llega el pedido 23 de Makro',
      dia: MARTES,
      grupo: 'proveedor:makro',
    });
    const salen = desplegar([reparto, pedido], VIERNES, fechaOperativa('2026-09-18'));
    expect(salen.map((o) => `${o.fecha} ${o.titulo}`)).toEqual([
      '2026-09-11 Reparte Makro',
      '2026-09-15 Llega el pedido 23 de Makro',
      '2026-09-18 Reparte Makro',
    ]);
  });

  it('pero no tapa a otro proveedor', () => {
    const paco = evento({
      id: 'r',
      titulo: 'Reparte Paco',
      seRepite: [2],
      grupo: 'proveedor:paco',
    });
    const pedido = evento({
      id: 'p',
      titulo: 'Pedido de Makro',
      dia: MARTES,
      grupo: 'proveedor:makro',
    });
    expect(desplegar([paco, pedido], MARTES, MARTES)).toHaveLength(2);
  });

  it('un evento de varios días sale en cada uno, recortado al rango', () => {
    const vacaciones = evento({
      capa: 'aviso',
      dia: VIERNES,
      hastaEl: fechaOperativa('2026-09-20'),
    });
    expect(
      desplegar([vacaciones], MARTES, fechaOperativa('2026-09-16')).map((o) => o.fecha),
    ).toEqual(['2026-09-15', '2026-09-16']);
  });

  it('ordena por día, lo del día entero antes que lo que tiene hora, y por capa', () => {
    const aviso = evento({
      id: 'a',
      capa: 'aviso',
      titulo: 'Inspección',
      dia: MARTES,
      desde: '10:00',
    });
    const caduca = evento({ id: 'c', capa: 'caducidad', titulo: 'Caduca la burrata', dia: MARTES });
    const llega = evento({ id: 'l', capa: 'entrega', titulo: 'Llega Makro', dia: MARTES });
    expect(desplegar([aviso, caduca, llega], MARTES, MARTES).map((o) => o.titulo)).toEqual([
      'Llega Makro',
      'Caduca la burrata',
      'Inspección',
    ]);
  });

  it('lo que se repite nunca sale hecho, aunque la fila lo esté', () => {
    const reparto = evento({ seRepite: [5], hecho: true });
    expect(desplegar([reparto], VIERNES, VIERNES)[0]?.hecho).toBe(false);
  });

  it('un rango al revés no devuelve nada', () => {
    expect(desplegar([evento({})], MARTES, VIERNES)).toEqual([]);
  });
});
