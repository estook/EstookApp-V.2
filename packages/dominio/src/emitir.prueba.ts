import { describe, expect, it } from 'vitest';
import {
  elCuerpoParaVerifacti,
  elDesglose,
  elEstadoDelDocumento,
  elNumeroEntero,
  fechaParaVerifacti,
  importeParaVerifacti,
  loQueDiceEnLlano,
  porQueNoSeEmite,
  tipoParaVerifacti,
  type LineaVendida,
  elPlazoDeLaFactura,
  juntarLasLineas,
  lineasDeLaFactura,
  porQueNoSeCanjea,
} from './emitir.ts';
import { elJustificanteEnPapel, elTicketEnPapel, esPapelCompuesto } from './impresion.ts';
import type { FechaOperativa } from './tiempo.ts';

/**
 * Emitir (T6 · 2 · 1, decisión 0136): lo que no depende de la red. Las pruebas del capítulo 8
 * del Anexo que se pueden mirar sin base, con su número.
 */

const cana: LineaVendida = { nombre: 'Caña', cantidad: 2, importe: 440, regimen: 'iva', tipo: 0.1 };
const vino: LineaVendida = {
  nombre: 'Vino',
  cantidad: 1,
  importe: 350,
  regimen: 'iva',
  tipo: 0.21,
};

describe('el desglose (Anexo 8, prueba 10)', () => {
  it('un ticket con dos tipos de IVA son dos líneas, y la suma cuadra al céntimo', () => {
    const d = elDesglose([cana, vino, { ...cana, nombre: 'Croquetas', importe: 905 }]);
    expect(d.lineas.map((l) => l.tipo)).toEqual([0.1, 0.21]);
    expect(d.total).toBe(440 + 350 + 905);
    for (const l of d.lineas) expect(l.base + l.cuota).toBe(l.total);
    expect(d.base + d.cuota).toBe(d.total);
  });
});

describe('lo que se mira antes de numerar', () => {
  it('nada que cobrar, otro impuesto, más de doce tipos o un ticket de más de 3.000 €', () => {
    expect(porQueNoSeEmite('F2', [], 'iva')).toBe('sin_lineas');
    // Prueba 22: un local canario no emite con IVA, ni uno peninsular con IGIC.
    expect(porQueNoSeEmite('F2', [cana], 'igic')).toBe('otro_impuesto');
    expect(porQueNoSeEmite('F2', [{ ...cana, regimen: 'igic', tipo: 0.07 }], 'iva')).toBe(
      'otro_impuesto',
    );
    expect(porQueNoSeEmite('F2', [{ ...cana, regimen: 'igic', tipo: 0.07 }], 'igic')).toBeNull();
    const trece = Array.from({ length: 13 }, (_, i) => ({ ...cana, tipo: (i + 1) / 100 }));
    expect(porQueNoSeEmite('F2', trece, 'iva')).toBe('demasiadas_lineas');
    expect(porQueNoSeEmite('F2', [{ ...cana, importe: 300_001 }], 'iva')).toBe('pasa_del_limite');
    expect(porQueNoSeEmite('F2', [{ ...cana, importe: 300_000 }], 'iva')).toBeNull();
  });
});

describe('lo que se le manda a Verifacti (su OpenAPI, 6-nov)', () => {
  const doc = {
    tipo: 'F2' as const,
    serie: 'T-IKA-2026-',
    numero: 37,
    fechaOperacion: '2026-11-06' as FechaOperativa,
    descripcion: 'Ticket de prueba',
    desglose: elDesglose([cana, vino]),
  };

  it('fechas, importes y tipos con su forma', () => {
    expect(fechaParaVerifacti('2026-11-06' as FechaOperativa)).toBe('06-11-2026');
    expect(importeParaVerifacti(4750)).toBe('47.50');
    expect(importeParaVerifacti(-500)).toBe('-5.00');
    expect(importeParaVerifacti(7)).toBe('0.07');
    expect(tipoParaVerifacti(0.1)).toBe('10');
    expect(tipoParaVerifacti(0.075)).toBe('7.5');
    expect(elNumeroEntero('T-IKA-2026-', 37)).toBe('T-IKA-2026-000037');
  });

  it('un ticket el mismo día: sin fecha de operación ni incidencia, y el IVA sin decirlo', () => {
    const cuerpo = elCuerpoParaVerifacti(doc, {
      fechaExpedicion: '2026-11-06' as FechaOperativa,
      incidencia: false,
    });
    expect(cuerpo).toEqual({
      serie: 'T-IKA-2026-',
      numero: '000037',
      fecha_expedicion: '06-11-2026',
      tipo_factura: 'F2',
      descripcion: 'Ticket de prueba',
      lineas: [
        { base_imponible: '4.00', tipo_impositivo: '10', cuota_repercutida: '0.40' },
        { base_imponible: '2.89', tipo_impositivo: '21', cuota_repercutida: '0.61' },
      ],
      importe_total: '7.90',
    });
  });

  it('mandado al día siguiente, al volver la conexión: las dos fechas y la incidencia (4.11)', () => {
    const cuerpo = elCuerpoParaVerifacti(doc, {
      fechaExpedicion: '2026-11-07' as FechaOperativa,
      incidencia: true,
    });
    expect(cuerpo.fecha_expedicion).toBe('07-11-2026');
    expect(cuerpo.fecha_operacion).toBe('06-11-2026');
    expect(cuerpo.incidencia).toBe('S');
  });

  it('con IGIC, el impuesto dicho (03)', () => {
    const igic = elCuerpoParaVerifacti(
      { ...doc, desglose: elDesglose([{ ...cana, regimen: 'igic', tipo: 0.07 }]) },
      { fechaExpedicion: '2026-11-06' as FechaOperativa, incidencia: false },
    );
    expect(igic.lineas[0]?.impuesto).toBe('03');
  });
});

describe('cómo está, por lo que se le ha ido añadiendo (Anexo 7.6)', () => {
  it('preparado, enviando, pendiente, correcto', () => {
    expect(elEstadoDelDocumento([])).toBe('preparado');
    expect(elEstadoDelDocumento([{ que: 'envio', en: '1', resultado: 'sin_respuesta' }])).toBe(
      'enviando',
    );
    expect(
      elEstadoDelDocumento([
        { que: 'envio', en: '1', resultado: 'aceptado' },
        { que: 'registro', en: '2', estado: 'Pendiente' },
      ]),
    ).toBe('pendiente');
    expect(
      elEstadoDelDocumento([
        { que: 'registro', en: '3', estado: 'Correcto' },
        { que: 'envio', en: '1', resultado: 'aceptado' },
      ]),
    ).toBe('correcto');
  });

  it('un reintento que llega tarde no deshace lo que dijo Hacienda; un duplicado es él mismo', () => {
    expect(
      elEstadoDelDocumento([
        { que: 'registro', en: '2', estado: 'Correcto' },
        { que: 'envio', en: '3', resultado: 'aceptado' },
      ]),
    ).toBe('correcto');
    expect(elEstadoDelDocumento([{ que: 'registro', en: '2', estado: 'Duplicado' }])).toBe(
      'correcto',
    );
    expect(elEstadoDelDocumento([{ que: 'registro', en: '2', estado: 'Incorrecto' }])).toBe(
      'rechazado',
    );
  });

  it('lo que falla se dice en llano, y el original no se toca', () => {
    const dice = loQueDiceEnLlano('rechazado', 'El NIF no está identificado');
    expect(dice?.que).toContain('El NIF no está identificado');
    expect(dice?.hacer).toContain('su número queda usado');
    expect(loQueDiceEnLlano('correcto', null)).toBeNull();
  });
});

describe('el papel (Anexo 4.7)', () => {
  const empresa = {
    local: 'IKATZ',
    nombre: 'Ikatz Restauración, S.L.',
    nif: 'B12345678',
    domicilio: 'Calle Mayor 12, 48001 Bilbao',
  };
  const ticket = elTicketEnPapel({
    empresa,
    numero: 'T-IKA-2026-000037',
    cuando: '06/11/2026 14:31',
    donde: null,
    lineas: [{ cantidad: 2, nombre: 'Caña', importeCentimos: 440 }],
    impuestos: [{ nombre: 'IVA 10 %', baseCentimos: 400, cuotaCentimos: 40 }],
    totalCentimos: 440,
    qr: 'https://prewww2.aeat.es/wlpl/TIKE-CONT/ValidarQR?nif=B12345678',
    pruebas: true,
    copia: false,
  });

  it('el QR tributario primero, con «QR tributario:» encima y «VERI*FACTU» debajo', () => {
    const tipos = ticket.piezas.map((p) => p.tipo);
    const qr = tipos.indexOf('qr');
    expect(qr).toBeGreaterThan(0);
    // Antes del QR, solo la marca de pruebas y «QR tributario:».
    expect(
      ticket.piezas.slice(0, qr).map((p) => (p.tipo === 'texto' ? p.texto.trim() : p.tipo)),
    ).toEqual(['PRUEBA · SIN VALIDEZ', 'QR tributario:']);
    const debajo = ticket.piezas[qr + 1];
    expect(debajo?.tipo === 'texto' ? debajo.texto : '').toBe('VERI*FACTU');
    const elQr = ticket.piezas[qr];
    expect(elQr?.tipo === 'qr' ? elQr.milimetros : 0).toBeGreaterThanOrEqual(30);
  });

  it('con QR, la versión 2 del papel; las de siempre, la 1', () => {
    expect(ticket.version).toBe(2);
    expect(esPapelCompuesto(ticket)).toBe(true);
    const justificante = elJustificanteEnPapel({
      empresa,
      cuando: '06/11/2026 14:31',
      donde: null,
      lineas: [],
      totalCentimos: 0,
      codigo: 'J-7Q4K',
      pruebas: false,
    });
    expect(justificante.version).toBe(1);
    // El justificante no lleva QR ni número de serie fiscal, y dice que no es una factura.
    expect(justificante.piezas.some((p) => p.tipo === 'qr')).toBe(false);
    expect(
      justificante.piezas.some((p) => p.tipo === 'texto' && p.texto.includes('NO ES UNA FACTURA')),
    ).toBe(true);
  });
});

describe('la factura (T6 · 2 · 2 · 1, 0137)', () => {
  const linea = (nombre: string, cantidad: number, importe: number, tipo = 0.1): LineaVendida => ({
    nombre,
    cantidad,
    importe,
    regimen: 'iva',
    tipo,
  });

  it('cada línea lleva su precio sin impuesto (RD 1619/2012, art. 6.1.f)', () => {
    expect(lineasDeLaFactura([linea('Menú de grupo', 30, 105_000)])[0]).toEqual({
      nombre: 'Menú de grupo',
      cantidad: 30,
      precioSinImpuesto: '31,8183',
      tipo: '10 %',
      base: 95_455,
    });
    expect(lineasDeLaFactura([linea('Alquiler', 1, 15_000, 0.21)])[0]?.precioSinImpuesto).toBe(
      '123,97',
    );
  });

  it('los platos iguales se juntan y el total no cambia; los distintos, no', () => {
    const juntas = juntarLasLineas([
      linea('Café', 1, 150),
      linea('Café', 2, 300),
      linea('Café', 1, 170),
      linea('Café', 1, 150, 0.21),
    ]);
    expect(juntas.map((l) => [l.cantidad, l.importe])).toEqual([
      [3, 450],
      [1, 170],
      [1, 150],
    ]);
  });

  it('el plazo: a una empresa, antes del 16 del mes siguiente; a un particular, sin aviso', () => {
    const hoy = '2026-11-06' as FechaOperativa;
    expect(elPlazoDeLaFactura('2026-11-02' as FechaOperativa, hoy, 'empresa')).toBeNull();
    expect(elPlazoDeLaFactura('2026-10-14' as FechaOperativa, hoy, 'particular')).toBeNull();
    expect(elPlazoDeLaFactura('2026-10-14' as FechaOperativa, hoy, 'empresa')).toEqual({
      hasta: '2026-11-15',
      pasado: false,
    });
    expect(elPlazoDeLaFactura('2026-09-14' as FechaOperativa, hoy, 'empresa')?.pasado).toBe(true);
    expect(
      elPlazoDeLaFactura('2026-12-20' as FechaOperativa, '2027-01-10' as FechaOperativa, 'empresa'),
    ).toEqual({ hasta: '2027-01-15', pasado: false });
  });

  it('qué ticket se puede juntar en una factura, y qué no', () => {
    expect(porQueNoSeCanjea('F2', 'pendiente', false)).toBeNull();
    expect(porQueNoSeCanjea('F2', 'correcto', false)).toBeNull();
    expect(porQueNoSeCanjea('F2', 'fuera_sii', false)).toBeNull();
    expect(porQueNoSeCanjea('F2', 'correcto', true)).toBe('ya_tiene_factura');
    expect(porQueNoSeCanjea('F2', 'enviando', false)).toBe('sin_registrar');
    expect(porQueNoSeCanjea('F2', 'rechazado', false)).toBe('no_vale');
    expect(porQueNoSeCanjea('F1', 'correcto', false)).toBe('no_es_un_ticket');
  });

  it('el cuerpo: con NIF, o con su id_otro si es de fuera, y lo que sustituye', () => {
    const base = {
      tipo: 'F3' as const,
      serie: 'F-IKA-2026-',
      numero: 5,
      fechaOperacion: '2026-11-06' as FechaOperativa,
      descripcion: 'Factura de un ticket',
      desglose: elDesglose([linea('Café', 1, 150)]),
    };
    const envio = { fechaExpedicion: '2026-11-06' as FechaOperativa, incidencia: false };
    const conNif = elCuerpoParaVerifacti(
      {
        ...base,
        destinatario: {
          clase: 'empresa',
          nombre: 'EJEMPLO NORTE SL',
          identificador: 'B84935048',
          id_tipo: null,
          codigo_pais: null,
          domicilio: 'No va a Verifacti',
        },
        sustituidas: [
          { serie: 'T-IKA-2026-', numero: 37, fechaExpedicion: '2026-11-02' as FechaOperativa },
        ],
      },
      envio,
    );
    expect(conNif.nif).toBe('B84935048');
    expect(conNif.nombre).toBe('EJEMPLO NORTE SL');
    expect(conNif.facturas_sustituidas).toEqual([
      { serie: 'T-IKA-2026-', numero: '000037', fecha_expedicion: '02-11-2026' },
    ]);
    expect(JSON.stringify(conNif)).not.toContain('No va a Verifacti');
    const deFuera = elCuerpoParaVerifacti(
      {
        ...base,
        tipo: 'F1',
        destinatario: {
          clase: 'de_fuera',
          nombre: 'Ana Müller',
          identificador: 'C01X00T47',
          id_tipo: '03',
          codigo_pais: 'DE',
          domicilio: 'Hauptstr. 1, Berlín',
        },
      },
      envio,
    );
    expect(deFuera.nif).toBeUndefined();
    expect(deFuera.id_otro).toEqual({ codigo_pais: 'DE', id_type: '03', id: 'C01X00T47' });
  });
});
