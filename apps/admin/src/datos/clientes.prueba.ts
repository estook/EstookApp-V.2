import { describe, expect, it } from 'vitest';
import {
  cuandoEntro,
  cuantoLlevaDeCliente,
  elContrato,
  enStripe,
  loUltimo,
  type ClienteEnLista,
} from './clientes.ts';

/** Lo que el admin lee de un cliente, dicho como se dice (A2). */

const UNO: ClienteEnLista = {
  organizacionId: '00000000-0000-0000-0000-000000000001',
  codigo: 'bar-pepe',
  nombre: 'Bar Pepe',
  esEjemplo: false,
  alta: '2026-09-01',
  diasDeCliente: 25,
  como: 'al_dia',
  diasQuedan: null,
  estado: 'activa',
  plan: 'esencial',
  intervalo: 'mes',
  locales: 1,
  cuota: 3900,
  cuotaAlMes: 3900,
  ultimoAcceso: null,
  diasSinEntrar: 3,
  actividad: 'activo',
  tipo: 'independiente',
  correos: [],
  cancelaAlAcabar: false,
  deLaCasa: false,
  pruebaHasta: null,
  periodoHasta: null,
  impagoDesde: null,
  tarjeta: null,
  conStripe: true,
  stripe: { cliente: 'cus_123', prueba: true },
};

describe('el contrato, en una etiqueta', () => {
  it('de la casa manda sobre todo lo demás', () => {
    expect(elContrato({ ...UNO, deLaCasa: true }).texto).toBe('De la casa');
  });
  it('quien paga y ha pedido irse lo dice', () => {
    expect(elContrato({ ...UNO, cancelaAlAcabar: true })).toEqual({
      texto: 'Se va al acabar',
      tono: 'atencion',
    });
  });
  it('la prueba dice los días que le quedan', () => {
    expect(elContrato({ ...UNO, como: 'prueba', diasQuedan: 4 }).texto).toBe('Prueba · 4 d');
  });
});

describe('los textos', () => {
  it('cuándo entró', () => {
    expect([null, 0, 1, 9].map(cuandoEntro)).toEqual(['Nunca', 'Hoy', 'Ayer', 'hace 9 días']);
  });
  it('cuánto lleva de cliente', () => {
    expect([0, 1, 40].map(cuantoLlevaDeCliente)).toEqual([
      'de alta hoy',
      '1 día de cliente',
      '40 días de cliente',
    ]);
  });
  it('lo último, sin códigos de dentro', () => {
    expect(loUltimo('crear_cuenta', 'organizacion')).toBe('Creó su organización');
    expect(loUltimo('cambiar', 'producto')).toBe('Cambió productos');
    expect(loUltimo('borrar', 'nota_del_tablon')).toBe('Quitó el Tablón');
    expect(loUltimo('crear', 'sesion')).toBe('Entró en Estook');
    expect(loUltimo('cambiar', 'algo_nuevo')).toBe('Cambió algo nuevo');
  });
});

describe('abrir en Stripe', () => {
  it('va al modo de prueba o al real, según el cliente', () => {
    expect(enStripe({ cliente: 'cus_1', prueba: true })).toBe(
      'https://dashboard.stripe.com/test/customers/cus_1',
    );
    expect(enStripe({ cliente: 'cus_1', prueba: false })).toBe(
      'https://dashboard.stripe.com/customers/cus_1',
    );
  });
});
