import { describe, expect, it } from 'vitest';
import type { CuentaEnElPlano } from '../datos/tipos.ts';
import { losAvisosDeAhora, losQueSalen } from './losAvisos.ts';

function cuenta(titulo: string, cambios: Partial<CuentaEnElPlano> = {}): CuentaEnElPlano {
  return {
    cuentaId: `c-${titulo}`,
    titulo,
    tipo: 'mesa',
    personas: 2,
    camarero: 'Laura',
    camareroId: 'p-laura',
    iniciales: 'LA',
    esMia: false,
    minutos: 30,
    totalCentimos: 2340,
    porPases: true,
    notaParaCocina: null,
    conPrisa: false,
    cocinaLlamaEn: null,
    loSiguiente: { que: 'pedir' },
    suCamareroSeHaIdo: false,
    ...cambios,
  };
}

const NADA = { impresoras: [], enLaCaja: false, esEncargado: false } as const;

describe('los avisos del TPV (0148, entrega 2 · 2)', () => {
  it('la cocina llama: primero a mí, con «Ya voy»; una llamada nueva es otro aviso', () => {
    const avisos = losAvisosDeAhora({
      ...NADA,
      cuentas: [
        cuenta('Mesa 2', { cocinaLlamaEn: '2026-11-18T20:00:00Z' }),
        cuenta('Mesa 4', { cocinaLlamaEn: '2026-11-18T20:01:00Z', esMia: true }),
        cuenta('Mesa 6'),
      ],
    });
    expect(avisos.map((a) => [a.titulo, a.detalle, a.mio])).toEqual([
      ['Cocina llama · Mesa 4', 'Te llaman a ti', true],
      ['Cocina llama · Mesa 2', 'Llaman a Laura', false],
    ]);
    expect(avisos[0]?.boton).toEqual({
      texto: 'Ya voy',
      hace: { tipo: 'ya_voy', cuentaId: 'c-Mesa 4' },
    });
    const otraVez = losAvisosDeAhora({
      ...NADA,
      cuentas: [cuenta('Mesa 4', { cocinaLlamaEn: '2026-11-18T20:09:00Z', esMia: true })],
    });
    expect(otraVez[0]?.id).not.toBe(avisos[0]?.id);
  });

  it('el efectivo por cobrar, solo en la caja, y se cobra desde el aviso', () => {
    const conEfectivo = cuenta('Mesa 4', {
      pendientes: [
        {
          id: 'p1',
          que: 'toda',
          lineas: [],
          parte: null,
          de: null,
          importe: 2340,
          enEfectivo: 2340,
          yaPagado: [],
          por: 'Laura',
        } as unknown as NonNullable<CuentaEnElPlano['pendientes']>[number],
      ],
    });
    expect(losAvisosDeAhora({ ...NADA, cuentas: [conEfectivo] })).toEqual([]);
    const [aviso] = losAvisosDeAhora({ ...NADA, enLaCaja: true, cuentas: [conEfectivo] });
    expect(aviso?.titulo).toMatch(/^Efectivo por cobrar · 23,40/);
    expect(aviso?.detalle).toBe('Mesa 4 · lo ha dejado Laura');
    expect(aviso?.boton?.hace).toEqual({ tipo: 'ir', donde: 'cobro/p1' });
  });

  it('la impresora, en todos; «Ver» solo en la caja', () => {
    const impresoras = [{ impresora: 'Cocina', que: 'sin_papel', sinSalir: 0 }] as const;
    const fuera = losAvisosDeAhora({ ...NADA, cuentas: [], impresoras });
    expect(fuera.map((a) => [a.titulo, a.boton])).toEqual([['Sin papel · Cocina', null]]);
    const enLaCaja = losAvisosDeAhora({ ...NADA, enLaCaja: true, cuentas: [], impresoras });
    expect(enLaCaja[0]?.boton?.texto).toBe('Ver');
  });

  it('la mesa de más de 6 horas, solo al encargado', () => {
    const vieja = cuenta('Mesa 9', { minutos: 6 * 60 + 5 });
    expect(losAvisosDeAhora({ ...NADA, cuentas: [vieja] })).toEqual([]);
    const [aviso] = losAvisosDeAhora({ ...NADA, esEncargado: true, cuentas: [vieja] });
    expect(aviso?.clase).toBe('seis_horas');
    expect(aviso?.boton?.hace).toEqual({ tipo: 'ir', donde: 'mesa/c-Mesa 9' });
  });

  it('arriba, como mucho tres y sin los quitados; el resto, en la campana', () => {
    const avisos = losAvisosDeAhora({
      ...NADA,
      cuentas: ['1', '2', '3', '4'].map((n) =>
        cuenta(`Mesa ${n}`, { cocinaLlamaEn: '2026-11-18T20:00:00Z' }),
      ),
    });
    expect(avisos).toHaveLength(4);
    expect(losQueSalen(avisos, new Set())).toHaveLength(3);
    const sinLaPrimera = losQueSalen(avisos, new Set([avisos[0]?.id ?? '']));
    expect(sinLaPrimera.map((a) => a.titulo)).toEqual([
      'Cocina llama · Mesa 2',
      'Cocina llama · Mesa 3',
      'Cocina llama · Mesa 4',
    ]);
  });
});
