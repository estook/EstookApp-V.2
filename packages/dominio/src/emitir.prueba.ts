import { describe, expect, it } from 'vitest';
import {
  comoQuedaLaAnulacion,
  elEstadoConSuDuplicado,
  laDevolucion,
  lasLineasDeLaSenal,
  lasLineasQueQuedan,
  loQueQuedaDeCadaLinea,
  loQueValeUnaParte,
  porQueNoCabeLaSenal,
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
  sePuedeEntregar,
  porQueNoSeCanjea,
} from './emitir.ts';
import {
  elJustificanteEnPapel,
  elTicketEnPapel,
  esPapelCompuesto,
  laCajaEnPapel,
} from './impresion.ts';
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

  it('con «Pide tu factura» (0144), su QR va después del tributario, más pequeño y con el código', () => {
    const conLaFactura = elTicketEnPapel({
      empresa,
      numero: 'T-IKA-2026-000038',
      cuando: '06/11/2026 14:32',
      donde: 'Mesa 12',
      lineas: [{ cantidad: 1, nombre: 'Caña', importeCentimos: 220 }],
      impuestos: [{ nombre: 'IVA 10 %', baseCentimos: 200, cuotaCentimos: 20 }],
      totalCentimos: 220,
      qr: 'https://prewww2.aeat.es/wlpl/TIKE-CONT/ValidarQR?nif=B12345678',
      pruebas: false,
      copia: false,
      pideTuFactura: {
        direccion: 'https://estook.com/factura/7KQ2-M9XP-4TRD',
        codigo: '7KQ2-M9XP-4TRD',
      },
    });
    const qrs = conLaFactura.piezas.filter((p) => p.tipo === 'qr');
    expect(qrs.map((q) => q.contenido)).toEqual([
      'https://prewww2.aeat.es/wlpl/TIKE-CONT/ValidarQR?nif=B12345678',
      'https://estook.com/factura/7KQ2-M9XP-4TRD',
    ]);
    // El de la factura, más pequeño que el tributario: el de Hacienda es el que manda.
    const lados = qrs.map((q) => q.milimetros);
    expect(lados[1]).toBeLessThan(lados[0] ?? 0);
    const textos = conLaFactura.piezas.map((p) => (p.tipo === 'texto' ? p.texto : ''));
    expect(textos).toContain('Código 7KQ2-M9XP-4TRD');
    expect(textos).not.toContain('¿Quieres factura? Pídela en la barra.');
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

  it('las bases de las líneas suman la del desglose, también al céntimo (0138)', () => {
    // Una a una suman 2,73 de 3 × 0,91; el impuesto sobre el grupo da 2,72 de base... o al revés:
    // sea cual sea, en la factura no pueden salir dos sumas distintas.
    const casos: LineaVendida[][] = [
      [linea('A', 1, 100), linea('B', 1, 100), linea('C', 1, 100)],
      [linea('A', 1, 105), linea('B', 1, 105), linea('C', 1, 105), linea('D', 1, 105)],
      [linea('A', 5, 750), linea('B', 3, 450), linea('C', 1, 19), linea('D', 1, 19)],
      [linea('A', 1, 121, 0.21), linea('B', 1, 133, 0.21), linea('C', 1, 110), linea('D', 1, 17)],
      Array.from({ length: 40 }, (_, i) => linea(`Plato ${String(i)}`, 1, 95 + i)),
    ];
    for (const lineas of casos) {
      const facturadas = lineasDeLaFactura(lineas);
      const d = elDesglose(lineas);
      expect(facturadas.reduce((s, l) => s + l.base, 0)).toBe(d.base);
      for (const g of d.lineas) {
        const suyas = facturadas.filter((_, i) => lineas[i]?.tipo === g.tipo);
        expect(suyas.reduce((s, l) => s + l.base, 0)).toBe(g.base);
      }
    }
  });

  it('una factura sin líneas no rompe nada', () => {
    expect(lineasDeLaFactura([])).toEqual([]);
  });

  it('lo que Hacienda no tiene no se entrega; lo demás, sí (0138)', () => {
    expect(sePuedeEntregar('rechazado')).toBe(false);
    expect(sePuedeEntregar('rechazado_por_datos')).toBe(false);
    expect(sePuedeEntregar('anulado')).toBe(false);
    for (const estado of ['pendiente', 'correcto', 'aceptado_con_errores', 'fuera_sii'] as const) {
      expect(sePuedeEntregar(estado)).toBe(true);
    }
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

describe('devolver (T6 · 2 · 2 · 2, 0140)', () => {
  const LINEAS = [
    { nombre: 'Croquetas', cantidad: 2, importe: 1800, regimen: 'iva' as const, tipo: 0.1 },
    { nombre: 'Merluza', cantidad: 1, importe: 1950, regimen: 'iva' as const, tipo: 0.1 },
  ];
  const nada = loQueQuedaDeCadaLinea(LINEAS, []);

  it('una de dos raciones: lo devuelto, en negativo, y queda lo demás', () => {
    const d = laDevolucion(nada, { que: 'partes', partes: [{ linea: 0, cantidad: 1 }] });
    if ('porque' in d) throw new Error(d.porque);
    expect(d.total).toBe(900);
    expect(d.lineas[0]).toMatchObject({ nombre: 'Croquetas', cantidad: 1, importe: -900 });
    const queda = loQueQuedaDeCadaLinea(LINEAS, d.apuntes);
    expect(queda[0]).toMatchObject({ cantidad: 1, importe: 900 });
  });

  it('el precio que no se divide: la última ración recoge lo que queda, sin perder un céntimo', () => {
    const tres = [
      { nombre: 'Menú', cantidad: 3, importe: 1000, regimen: 'iva' as const, tipo: 0.1 },
    ];
    const una = loQueQuedaDeCadaLinea(tres, []);
    const primera = una[0];
    if (primera === undefined) throw new Error('sin línea');
    expect(loQueValeUnaParte(primera, 1)).toBe(333);
    const segunda = loQueQuedaDeCadaLinea(tres, [{ linea: 0, cantidad: 1, importe: 333 }])[0];
    if (segunda === undefined) throw new Error('sin línea');
    expect(loQueValeUnaParte(segunda, 2)).toBe(667);
  });

  it('se cobró de más: dinero de una línea, sin devolver la ración', () => {
    const d = laDevolucion(nada, { que: 'de_mas', linea: 1, importe: 250 });
    if ('porque' in d) throw new Error(d.porque);
    expect(d.apuntes).toEqual([{ linea: 1, cantidad: 0, importe: 250 }]);
    expect(d.lineas[0]).toMatchObject({
      nombre: 'Merluza (se cobró de más)',
      cantidad: 1,
      importe: -250,
    });
    expect(loQueQuedaDeCadaLinea(LINEAS, d.apuntes)[1]).toMatchObject({
      cantidad: 1,
      importe: 1700,
    });
    expect(laDevolucion(nada, { que: 'de_mas', linea: 1, importe: 1951 })).toHaveProperty('porque');
  });

  it('lo ya devuelto no se vuelve a devolver', () => {
    const queda = loQueQuedaDeCadaLinea(LINEAS, [{ linea: 1, cantidad: 1, importe: 1950 }]);
    expect(
      laDevolucion(queda, { que: 'partes', partes: [{ linea: 1, cantidad: 1 }] }),
    ).toHaveProperty('porque');
    const todo = laDevolucion(queda, { que: 'todo' });
    if ('porque' in todo) throw new Error(todo.porque);
    expect(todo.total).toBe(1800);
  });

  it('con una señal descontada, una parte no pasa de lo que queda y «Todo» la deshace', () => {
    const conSenal = loQueQuedaDeCadaLinea(
      [
        { nombre: 'Comida', cantidad: 1, importe: 30_000, regimen: 'iva' as const, tipo: 0.1 },
        {
          nombre: 'Señal ya facturada',
          cantidad: 1,
          importe: -10_000,
          regimen: 'iva' as const,
          tipo: 0.1,
        },
      ],
      [],
    );
    expect(
      laDevolucion(conSenal, { que: 'partes', partes: [{ linea: 0, cantidad: 1 }] }),
    ).toHaveProperty('porque');
    const todo = laDevolucion(conSenal, { que: 'todo' });
    if ('porque' in todo) throw new Error(todo.porque);
    expect(todo.total).toBe(20_000);
    expect(todo.lineas.map((l) => l.importe)).toEqual([-30_000, 10_000]);
  });

  it('una corrección recoge lo que queda y deja fuera lo devuelto entero', () => {
    const queda = loQueQuedaDeCadaLinea(LINEAS, [{ linea: 1, cantidad: 1, importe: 1950 }]);
    expect(lasLineasQueQuedan(queda).map((l) => l.nombre)).toEqual(['Croquetas']);
  });
});

describe('lo que va a Verifacti de una rectificativa (0140)', () => {
  const BASE = {
    serie: 'R-IKA-2026-',
    numero: 1,
    fechaOperacion: '2026-11-06' as FechaOperativa,
    descripcion: 'Devolución',
    desglose: elDesglose([
      { nombre: 'Merluza', cantidad: 1, importe: -1950, regimen: 'iva', tipo: 0.1 },
    ]),
  };
  const ENVIO = { fechaExpedicion: '2026-11-06' as FechaOperativa, incidencia: false };
  const FACTURA = {
    serie: 'T-IKA-2026-',
    numero: 35,
    fechaExpedicion: '2026-11-02' as FechaOperativa,
  };

  it('por diferencias (R5): en negativo, sin destinatario ni importe_rectificativa', () => {
    const c = elCuerpoParaVerifacti(
      { ...BASE, tipo: 'R5', rectifica: { tipo: 'I', facturas: [FACTURA] } },
      ENVIO,
    );
    expect(c.tipo_rectificativa).toBe('I');
    expect(c.importe_total).toBe('-19.50');
    expect(c.lineas[0]?.base_imponible).toBe('-17.73');
    expect(c.lineas[0]?.cuota_repercutida).toBe('-1.77');
    expect(c.importe_rectificativa).toBeUndefined();
    expect(c.nif).toBeUndefined();
    expect(c.facturas_rectificadas).toEqual([
      { serie: 'T-IKA-2026-', numero: '000035', fecha_expedicion: '02-11-2026' },
    ]);
  });

  it('por sustitución (R4): con lo que había antes', () => {
    const c = elCuerpoParaVerifacti(
      {
        ...BASE,
        tipo: 'R4',
        rectifica: { tipo: 'S', facturas: [FACTURA], importe: { base: 10_000, cuota: 1_000 } },
      },
      ENVIO,
    );
    expect(c.tipo_rectificativa).toBe('S');
    expect(c.importe_rectificativa).toEqual({
      base_rectificada: '100.00',
      cuota_rectificada: '10.00',
    });
  });
});

describe('anular y lo duplicado (0140)', () => {
  it('lo que dice Hacienda de una anulación: si no sale, el documento sigue valiendo', () => {
    expect(comoQuedaLaAnulacion('Anulado')).toBe('anulada');
    expect(comoQuedaLaAnulacion('Pendiente')).toBe('sigue');
    expect(comoQuedaLaAnulacion('Error servidor AEAT')).toBe('sigue');
    expect(comoQuedaLaAnulacion('Factura inexistente')).toBe('no_salio');
    expect(comoQuedaLaAnulacion('No registrado')).toBe('no_salio');
    // Lo que no se conoce se vuelve a mirar: no se da por anulado ni por fallido.
    expect(comoQuedaLaAnulacion('Algo nuevo')).toBe('sigue');
  });

  it('«Duplicado» se lee con cómo lo tiene Hacienda: uno anulado no se da por correcto', () => {
    expect(elEstadoConSuDuplicado('Duplicado', 'Anulada')).toBe('Anulado');
    expect(elEstadoConSuDuplicado('Duplicado', 'AceptadaConErrores')).toBe('Aceptado con errores');
    expect(elEstadoConSuDuplicado('Duplicado', 'Correcta')).toBe('Correcto');
    expect(elEstadoConSuDuplicado('Duplicado', null)).toBe('Duplicado');
    expect(elEstadoConSuDuplicado('Duplicado', 'Lo que sea')).toBe('Duplicado');
    expect(elEstadoConSuDuplicado('Correcto', 'Anulada')).toBe('Correcto');
  });
});

describe('la señal (0140)', () => {
  const senal = loQueQuedaDeCadaLinea(
    [{ nombre: 'Señal', cantidad: 1, importe: 30_000, regimen: 'iva' as const, tipo: 0.1 }],
    [],
  );

  it('la final la resta en su mismo tipo', () => {
    expect(lasLineasDeLaSenal(senal)).toEqual([
      { nombre: 'Señal ya facturada', cantidad: 1, importe: -30_000, regimen: 'iva', tipo: 0.1 },
    ]);
  });

  it('no cabe si es mayor que lo que se factura a ese tipo, aunque el total salga bien', () => {
    const comida = { nombre: 'Comida', cantidad: 1, regimen: 'iva' as const };
    const lasDeLaSenal = lasLineasDeLaSenal(senal);
    expect(
      porQueNoCabeLaSenal([{ ...comida, importe: 100_000, tipo: 0.1 }, ...lasDeLaSenal]),
    ).toBeNull();
    expect(
      porQueNoCabeLaSenal([{ ...comida, importe: 30_000, tipo: 0.1 }, ...lasDeLaSenal]),
    ).toBeNull();
    expect(
      porQueNoCabeLaSenal([{ ...comida, importe: 20_000, tipo: 0.1 }, ...lasDeLaSenal]),
    ).toContain('10 %');
    expect(
      porQueNoCabeLaSenal([{ ...comida, importe: 100_000, tipo: 0.21 }, ...lasDeLaSenal]),
    ).toContain('10 %');
  });
});

describe('el papel de la caja (0144)', () => {
  const base = {
    local: 'IKATZ',
    caja: 'Caja 1',
    cuando: '09/11/2026 23:48',
    abrio: 'Marcos, 12:02',
    fondo: 15000,
    efectivo: 61240,
    tarjeta: 128460,
    bizum: 0,
    cheque: 0,
    movimientos: [{ que: 'Sacar · Un proveedor', importe: -3500 }],
    deberiaHaber: 72740,
    tickets: 41,
    cajonSinVenta: 2,
    copia: false,
  };

  it('el Z dice lo que debería haber, lo contado, lo que falta y lo que se retira', () => {
    const z = laCajaEnPapel({
      ...base,
      que: 'Z',
      cerro: 'Marcos, 23:48',
      contado: 72240,
      diferencia: -500,
      datafono: 128460,
      paraManana: 15000,
    });
    const filas = z.piezas.map((p) =>
      p.tipo === 'dos_columnas'
        ? `${p.izquierda}=${p.derecha}`
        : p.tipo === 'texto'
          ? p.texto
          : p.tipo,
    );
    expect(filas).toContain('Debería haber=727,40');
    expect(filas).toContain('Contado=722,40');
    expect(filas).toContain('Faltan=5,00');
    expect(filas).toContain('Se retira=572,40');
    expect(filas).toContain('No es un documento fiscal');
    expect(filas.at(-1)).toBe('cortar');
  });

  it('el X no dice lo contado ni la diferencia', () => {
    const x = laCajaEnPapel({
      ...base,
      que: 'X',
      cerro: null,
      contado: null,
      diferencia: null,
      datafono: null,
      paraManana: null,
    });
    const izquierdas = x.piezas.flatMap((p) => (p.tipo === 'dos_columnas' ? [p.izquierda] : []));
    expect(izquierdas).not.toContain('Contado');
    expect(izquierdas).not.toContain('Faltan');
    expect(izquierdas).toContain('Debería haber');
  });
});
