import { describe, expect, it } from 'vitest';
import {
  direccionParaPedirLaFactura,
  elCodigoEscrito,
  elCodigoParaEnsenar,
  fechaDelTicket,
  laFacturaDeLaDireccion,
  queDiceLaPagina,
  seDescargaElTicket,
} from './pide-tu-factura.ts';

describe('el código', () => {
  it('se perdona lo que se confunde al copiarlo de un papel', () => {
    expect(elCodigoEscrito('7KQ2-M9XP-4TRD')).toBe('7KQ2M9XP4TRD');
    expect(elCodigoEscrito(' 7kq2 m9xp 4trd ')).toBe('7KQ2M9XP4TRD');
    expect(elCodigoEscrito('O0IL-M9XP-4TRD')).toBe('0011M9XP4TRD');
  });

  it('el del justificante conserva su forma', () => {
    expect(elCodigoEscrito('J-4F7A19C2E0')).toBe('J-4F7A19C2E0');
    expect(elCodigoEscrito('j4f7a19c2e0')).toBe('J-4F7A19C2E0');
  });

  it('lo que no puede ser un código, no lo es', () => {
    expect(elCodigoEscrito('')).toBeNull();
    expect(elCodigoEscrito('corto')).toBeNull();
    expect(elCodigoEscrito('7KQ2M9XP4TRDX')).toBeNull();
    // La U no está en el alfabeto.
    expect(elCodigoEscrito('UUUUUUUUUUUU')).toBeNull();
    expect(elCodigoEscrito('../../admin')).toBeNull();
  });

  it('se enseña de cuatro en cuatro, y la dirección es siempre la de producción', () => {
    expect(elCodigoParaEnsenar('7KQ2M9XP4TRD')).toBe('7KQ2-M9XP-4TRD');
    expect(elCodigoParaEnsenar('J-4F7A19C2E0')).toBe('J-4F7A19C2E0');
    expect(direccionParaPedirLaFactura('7KQ2M9XP4TRD')).toBe(
      'https://estook.com/factura/7KQ2-M9XP-4TRD',
    );
  });
});

describe('la dirección de la barra', () => {
  it('reconoce la página, con y sin código', () => {
    expect(laFacturaDeLaDireccion('/factura')).toEqual({ codigo: null });
    expect(laFacturaDeLaDireccion('/factura/')).toEqual({ codigo: null });
    expect(laFacturaDeLaDireccion('/factura/7KQ2-M9XP-4TRD')).toEqual({
      codigo: '7KQ2-M9XP-4TRD',
    });
    expect(laFacturaDeLaDireccion('/factura/7KQ2-M9XP-4TRD/')).toEqual({
      codigo: '7KQ2-M9XP-4TRD',
    });
  });

  it('una carta u otra dirección no son esta página', () => {
    expect(laFacturaDeLaDireccion('/carta/ikatz')).toBeNull();
    expect(laFacturaDeLaDireccion('/facturas')).toBeNull();
    expect(laFacturaDeLaDireccion('/factura/a/b')).toBeNull();
    expect(laFacturaDeLaDireccion('/')).toBeNull();
  });

  it('un % suelto no tira la página', () => {
    expect(laFacturaDeLaDireccion('/factura/%E0%A4%A')).toEqual({ codigo: '%E0%A4%A' });
  });
});

describe('qué enseña la página', () => {
  const base = {
    estado: 'correcto',
    tieneFactura: false,
    tieneDevolucion: false,
    anulando: false,
    encendida: true,
  } as const;

  it('con el ticket en Hacienda, el formulario', () => {
    expect(queDiceLaPagina(base)).toBe('puede');
    expect(queDiceLaPagina({ ...base, estado: 'aceptado_con_errores' })).toBe('puede');
    expect(queDiceLaPagina({ ...base, estado: 'fuera_sii' })).toBe('puede');
  });

  it('mientras Hacienda no ha contestado, espera: «En Hacienda» aún puede acabar rechazado', () => {
    for (const estado of ['preparado', 'enviando', 'pendiente'] as const) {
      expect(queDiceLaPagina({ ...base, estado })).toBe('todavia');
    }
  });

  it('lo que ya tiene factura lo dice aunque el local la haya apagado después', () => {
    expect(queDiceLaPagina({ ...base, tieneFactura: true })).toBe('ya_tiene');
    expect(queDiceLaPagina({ ...base, tieneFactura: true, encendida: false })).toBe('ya_tiene');
  });

  it('lo que no vale, antes que apagada', () => {
    for (const cambio of [
      { tieneDevolucion: true },
      { anulando: true },
      { estado: 'anulado' },
      { estado: 'rechazado' },
      { estado: 'rechazado_por_datos' },
    ] as const) {
      expect(queDiceLaPagina({ ...base, ...cambio, encendida: false })).toBe('no_se_puede');
    }
  });

  it('apagada', () => {
    expect(queDiceLaPagina({ ...base, encendida: false })).toBe('apagada');
    expect(queDiceLaPagina({ ...base, estado: 'pendiente', encendida: false })).toBe('apagada');
  });
});

describe('qué se puede descargar', () => {
  it('el ticket, también si la factura está apagada, porque no lleva datos de nadie', () => {
    expect(seDescargaElTicket('puede', 'correcto')).toBe(true);
    expect(seDescargaElTicket('apagada', 'correcto')).toBe(true);
  });

  it('no lo que Hacienda no ha aceptado, ni lo que ya no vale', () => {
    expect(seDescargaElTicket('apagada', 'pendiente')).toBe(false);
    expect(seDescargaElTicket('todavia', 'pendiente')).toBe(false);
    expect(seDescargaElTicket('no_se_puede', 'anulado')).toBe(false);
    expect(seDescargaElTicket('ya_tiene', 'correcto')).toBe(false);
  });
});

describe('la fecha del ticket', () => {
  it('como la maqueta', () => {
    expect(fechaDelTicket('2026-11-02')).toBe('2-nov-2026');
    expect(fechaDelTicket('2027-01-31')).toBe('31-ene-2027');
  });
});
