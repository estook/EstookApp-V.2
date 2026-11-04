import { describe, expect, it } from 'vitest';
import {
  comoEsElNif,
  comoVaLaFacturacion,
  foralDelCodigoPostal,
  laAutorizacionDe,
  laParada,
  leerElResultado,
  normalizarNif,
  prefijoValido,
  primerNumero,
  provinciaDelCodigoPostal,
  seriesPropuestas,
  siglasDelLocal,
  type LoQueSeSabeDeLaFacturacion,
} from './facturacion.ts';

describe('el NIF (T6 · 1, 0126)', () => {
  it('se escribe como lo escribe la gente', () => {
    expect(normalizarNif(' b-75.777.847 ')).toBe('B75777847');
  });

  it('un DNI con su letra es de una persona, y con otra letra no vale', () => {
    expect(comoEsElNif('12345678Z')).toMatchObject({
      valido: true,
      tipo: 'dni',
      persona: 'fisica',
    });
    expect(comoEsElNif('12345678A')).toMatchObject({ valido: false });
  });

  it('un NIE cuenta la X como 0, la Y como 1 y la Z como 2', () => {
    expect(comoEsElNif('X1234567L')).toMatchObject({
      valido: true,
      tipo: 'nie',
      persona: 'fisica',
    });
    expect(comoEsElNif('Y1234567X')).toMatchObject({ valido: true, tipo: 'nie' });
    expect(comoEsElNif('Z1234567R')).toMatchObject({ valido: true, tipo: 'nie' });
    expect(comoEsElNif('X1234567A')).toMatchObject({ valido: false });
  });

  it('un CIF es de una sociedad, con su control en número o en letra según la forma', () => {
    // La empresa de pruebas de Verifacti (Bilbabit SL), pública en su documentación.
    expect(comoEsElNif('B75777847')).toMatchObject({
      valido: true,
      tipo: 'cif',
      persona: 'juridica',
    });
    expect(comoEsElNif('B75777848')).toMatchObject({ valido: false });
    // Una S (organismo) lleva letra: el mismo número con cifra no vale.
    expect(comoEsElNif('S7577784G')).toMatchObject({ valido: true });
    expect(comoEsElNif('S75777847')).toMatchObject({ valido: false });
  });

  it('lo que no tiene forma de NIF lo dice, sin preguntar a Hacienda', () => {
    expect(comoEsElNif('1234')).toMatchObject({ valido: false });
    expect(comoEsElNif('I1234567A')).toMatchObject({ valido: false });
  });

  it('lee lo que contesta Hacienda', () => {
    expect(leerElResultado('IDENTIFICADO')).toBe('identificado');
    expect(leerElResultado('NO IDENTIFICADO-SIMILAR')).toBe('parecido');
    expect(leerElResultado('IDENTIFICADO-BAJA')).toBe('de_baja');
    expect(leerElResultado('IDENTIFICADO-REVOCADO')).toBe('revocado');
    expect(leerElResultado('NO IDENTIFICADO')).toBe('no_identificado');
    expect(leerElResultado('cualquier otra cosa')).toBe('no_identificado');
  });
});

describe('dónde está y cuándo se para (Anexo 1.4)', () => {
  it('la provincia sale del código postal', () => {
    expect(provinciaDelCodigoPostal('48170')).toBe('Bizkaia');
    expect(provinciaDelCodigoPostal('28040')).toBe('Madrid');
    expect(provinciaDelCodigoPostal('38001')).toBe('Santa Cruz de Tenerife');
    expect(provinciaDelCodigoPostal('99000')).toBeNull();
    expect(provinciaDelCodigoPostal('4817')).toBeNull();
  });

  it('las cuatro haciendas forales, por su código postal', () => {
    expect(foralDelCodigoPostal('01001')).toBe('alava');
    expect(foralDelCodigoPostal('20001')).toBe('gipuzkoa');
    expect(foralDelCodigoPostal('48992')).toBe('bizkaia');
    expect(foralDelCodigoPostal('31001')).toBe('navarra');
    expect(foralDelCodigoPostal('28040')).toBeNull();
  });

  it('el País Vasco es un «todavía no», Navarra y el SII no dependen de Estook', () => {
    const base = { territorio: 'peninsula_y_baleares' as const, enSii: false };
    expect(laParada({ ...base, foral: 'bizkaia' })).toMatchObject({
      motivo: 'pais_vasco',
      todaviaNo: true,
    });
    expect(laParada({ ...base, foral: 'navarra' })).toMatchObject({
      motivo: 'navarra',
      todaviaNo: false,
    });
    expect(laParada({ ...base, enSii: true, foral: null })).toMatchObject({ motivo: 'sii' });
    expect(laParada({ ...base, foral: null })).toBeNull();
  });

  it('Canarias sigue, con IGIC; Ceuta y Melilla, todavía no', () => {
    expect(laParada({ territorio: 'canarias', enSii: false, foral: null })).toBeNull();
    expect(laParada({ territorio: 'ceuta', enSii: false, foral: null })).toMatchObject({
      motivo: 'ceuta_o_melilla',
      todaviaNo: true,
    });
    expect(laParada({ territorio: 'melilla', enSii: false, foral: null })).not.toBeNull();
  });
});

describe('las series (Anexo 4.4)', () => {
  it('se proponen con las siglas del local', () => {
    expect(siglasDelLocal('Ikatz')).toBe('IKA');
    expect(siglasDelLocal('El Fogón de Ana')).toBe('FA');
    expect(siglasDelLocal('Bar Pepe Centro')).toBe('BPC');
    expect(seriesPropuestas('Ikatz')).toEqual({
      ticket: 'T-IKA',
      factura: 'F-IKA',
      rectificativa: 'R-IKA',
    });
  });

  it('el prefijo no pasa de 20 y la serie con su número nunca de los 60 de Hacienda', () => {
    expect(prefijoValido('T-IKA')).toBe(true);
    expect(prefijoValido('T--IKA')).toBe(false);
    expect(prefijoValido('-T')).toBe(false);
    expect(prefijoValido('t-ika')).toBe(false);
    expect(prefijoValido('A'.repeat(21))).toBe(false);
    expect(primerNumero('A'.repeat(20), 2026).length).toBeLessThanOrEqual(60);
    expect(primerNumero('T-IKA', 2026)).toBe('T-IKA-2026-000001');
  });
});

describe('en qué paso va el alta', () => {
  const empresa = {
    comprobada: true,
    enSii: false,
    foral: false,
    enVerifacti: true,
    autorizacion: 'correcta',
    dePruebas: false,
  } as const;
  const lista: LoQueSeSabeDeLaFacturacion = {
    territorio: 'peninsula_y_baleares',
    empresa,
    seriesPuestas: 3,
    otroProgramaContestado: true,
  };

  it('lista, con todo hecho', () => {
    expect(comoVaLaFacturacion(lista)).toEqual({ estado: 'lista' });
  });

  it('cada paso, si falta lo suyo', () => {
    expect(comoVaLaFacturacion({ ...lista, empresa: null })).toMatchObject({ paso: 1 });
    expect(comoVaLaFacturacion({ ...lista, empresa: { ...empresa, enSii: null } })).toMatchObject({
      paso: 2,
    });
    expect(comoVaLaFacturacion({ ...lista, seriesPuestas: 2 })).toMatchObject({ paso: 3 });
    expect(comoVaLaFacturacion({ ...lista, otroProgramaContestado: false })).toMatchObject({
      paso: 3,
    });
    expect(
      comoVaLaFacturacion({ ...lista, empresa: { ...empresa, enVerifacti: false } }),
    ).toMatchObject({ paso: 4 });
    expect(
      comoVaLaFacturacion({ ...lista, empresa: { ...empresa, autorizacion: 'pendiente' } }),
    ).toMatchObject({ paso: 5, falta: expect.stringContaining('esperando') as unknown });
  });

  it('se para en el paso 2 con su motivo, y no sigue', () => {
    expect(
      comoVaLaFacturacion({ ...lista, empresa: { ...empresa, foral: 'bizkaia' } }),
    ).toMatchObject({ estado: 'parada', paso: 2, parada: { motivo: 'pais_vasco' } });
  });

  it('la empresa de pruebas no pregunta lo foral, pero un local de Ceuta sigue parado', () => {
    const pruebas = { ...empresa, dePruebas: true, enSii: null, foral: null };
    expect(comoVaLaFacturacion({ ...lista, empresa: pruebas })).toEqual({ estado: 'lista' });
    expect(comoVaLaFacturacion({ ...lista, territorio: 'ceuta', empresa: pruebas })).toMatchObject({
      estado: 'parada',
    });
  });

  it('lee los seis estados de la autorización', () => {
    expect(laAutorizacionDe('Correcto')).toBe('correcta');
    expect(laAutorizacionDe('Pendiente')).toBe('pendiente');
    expect(laAutorizacionDe('Rechazado')).toBe('rechazada');
    expect(laAutorizacionDe('Caducado')).toBe('caducada');
    expect(laAutorizacionDe('Cancelado')).toBe('cancelada');
    expect(laAutorizacionDe('Inexistente')).toBe('sin_empezar');
  });
});
