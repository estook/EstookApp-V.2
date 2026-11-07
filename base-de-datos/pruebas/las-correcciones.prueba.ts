import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { codigoEn } from '../../servidor/dominio/doble-factor.ts';
import { verifactiDeMentira } from '../../servidor/facturacion/verifacti-de-mentira.ts';
import { correoEnMemoria } from '../../servidor/infraestructura/correo.ts';
import {
  ADMIN_DE_EJEMPLO,
  CLAVE_DE_EJEMPLO,
  SECRETO_DEL_ADMIN_DE_EJEMPLO,
} from '../semillas/acceso.ts';
import { levantarBase, type BaseDePrueba } from './entorno.ts';
import { elFallo, losDatos, montarLaApi, type ApiDePrueba } from './despachador.ts';

/**
 * T6 · 2 · 2 · 2 · Las correcciones (decisión 0140, migración 0110), contra Postgres de verdad y con
 * el Verifacti de mentira. Lo emitido no se toca: **se corrige con otro documento**.
 *
 *   · 12   la devolución de un ticket: R5, en su serie, por diferencias y sin destinatario
 *   · 13   anular, solo para quien puede y con su motivo
 *
 * Y lo que salió al diseñarlo: una anulación que Hacienda no acepta no convierte en rechazada a la
 * factura; el reloj vuelve a mirar lo que se está anulando; lo devuelto no se devuelve dos veces.
 */

const SECRETO_DEL_RELOJ = 'el-secreto-del-reloj-de-las-correcciones';
const UN_MINUTO = 60_000;

let base: BaseDePrueba;
let api: ApiDePrueba;
const verifacti = verifactiDeMentira();
let ahora = new Date('2026-11-06T13:31:00Z');
let rosa: string;
let sara: string;
let barCentro: string;

const comoDuena = async <T>(texto: string, valores: unknown[] = []) =>
  (await base.bd.query<T>(texto, valores)).rows;

interface Hecho {
  documentoId: string;
  numero: string;
}

interface UnDocumento {
  id: string;
  numero: string;
  tipo: string;
  que: string;
  estado: string;
  total: number;
  chapa: { texto: string };
  historia: { hora: string; que: string; detalle: string | null }[];
  factura: { id: string; numero: string } | null;
  porQueNoSeCanjea: string | null;
  seEntrega: boolean;
  lineas: { indice: number; nombre: string; cantidad: number; importe: number }[];
  queda: number;
  rectifica: { id: string; numero: string } | null;
  corregidaPor: { id: string; numero: string } | null;
  porCobrar: string | null;
  anulado: { quien: string | null; motivo: string } | null;
  anulacionQueNoSalio: { dice: string | null } | null;
  loQueFalla: { numero: string } | null;
  descuenta: { id: string; numero: string; importe: number }[];
  descontadaEn: { id: string; numero: string } | null;
  esSenal: boolean;
  destinatario: { nombre: string; identificador: string; domicilio: string } | null;
  papel: { piezas: { tipo: string; texto?: string; derecha?: string }[] } | null;
  sePuede: {
    devolver: boolean;
    corregirDatos: boolean;
    anular: boolean;
    corregirLoRechazado: boolean;
  };
}

const EMPRESA = {
  clase: 'empresa',
  nombre: 'Ejemplo Norte',
  identificador: 'B84935048',
  domicilio: 'Pol. Ugaldeguren 4, Zamudio',
} as const;

const unTicket = async (): Promise<Hecho> =>
  losDatos(await api.ejecutar(rosa, 'imprimir_un_ticket_de_prueba', {}));

const elDocumento = async (id: string, quien = rosa) =>
  losDatos<UnDocumento>(await api.consultar(quien, 'un_documento', { documento_id: id }));

const unaFactura = async (importe = 11_000): Promise<Hecho> =>
  losDatos(
    await api.ejecutar(rosa, 'hacer_factura_a_mano', {
      cliente: EMPRESA,
      lineas: [{ nombre: 'Menú de grupo', cantidad: 2, importe, tipo: 0.1 }],
      cobrada: true,
    }),
  );

const elRegistroDe = (numero: string, operacion = 'Alta') => {
  const r = verifacti.registros.find(
    (x) => x.numero === numero.slice(-6) && numero.startsWith(x.serie) && x.operacion === operacion,
  );
  if (r === undefined) throw new Error(`Verifacti no tiene ${operacion} de ${numero}`);
  return r;
};

const elCuerpo = (numero: string, operacion = 'Alta') =>
  elRegistroDe(numero, operacion).cuerpo as Record<string, unknown>;

/** Lo que dice Hacienda de un documento, y que el reloj lo lea. */
const repasar = async () => {
  ahora = new Date(ahora.getTime() + 2.5 * UN_MINUTO);
  await api.despachador.repasarDocumentos(
    { tokenDeSesion: null, correlacionId: crypto.randomUUID() },
    SECRETO_DEL_RELOJ,
  );
};

const correcto = async (numero: string) => {
  verifacti.decirHacienda(elRegistroDe(numero).uuid, 'Correcto');
  await repasar();
};

const anular = (documentoId: string, quien = rosa, motivo = 'Salió repetido al probar') =>
  api.ejecutar(quien, 'anular_el_documento', { documento_id: documentoId, motivo });

beforeAll(async () => {
  base = await levantarBase();
  api = montarLaApi(base.bd, {
    facturacion: verifacti,
    correo: correoEnMemoria(),
    ahora: () => ahora,
  });
  barCentro = await base.localPorCodigo('bar-centro');
  await comoDuena(
    `insert into estook.suscripcion (organizacion_id, estado, de_la_casa)
     select organizacion_id, 'activa', true from estook.local where id = $1
     on conflict (organizacion_id) do update set de_la_casa = true`,
    [barCentro],
  );
  const entrada = losDatos<{ token: string }>(
    await api.ejecutar(null, 'entrar_en_admin', {
      correo: ADMIN_DE_EJEMPLO,
      contrasena: CLAVE_DE_EJEMPLO,
    }),
  );
  losDatos(
    await api.ejecutar(entrada.token, 'superar_doble_factor', {
      codigo: await codigoEn(SECRETO_DEL_ADMIN_DE_EJEMPLO, ahora),
    }),
  );
  losDatos(
    await api.ejecutar(entrada.token, 'admin_poner_la_empresa_de_pruebas', { local_id: barCentro }),
  );
  rosa = await api.entrar('rosa@ejemplo.estook.com');
  sara = await api.entrar('sara@ejemplo.estook.com');
  losDatos(
    await api.ejecutar(rosa, 'poner_las_series', {
      ticket: 'T-BC',
      factura: 'F-BC',
      rectificativa: 'R-BC',
      otro_programa: false,
    }),
  );
  await comoDuena(
    `update plataforma.reloj set huella = encode(sha256(convert_to($1, 'UTF8')), 'hex')`,
    [SECRETO_DEL_RELOJ],
  );
}, 120_000);

afterAll(async () => {
  await base.cerrar();
});

describe('devolver un ticket (prueba 12)', { timeout: 30_000 }, () => {
  it('sale R5, en su serie, por diferencias y sin destinatario', async () => {
    const ticket = await unTicket();
    const hecha = losDatos<Hecho>(
      await api.ejecutar(rosa, 'devolver_el_documento', {
        documento_id: ticket.documentoId,
        que: 'partes',
        partes: [{ linea: 0, cantidad: 1 }],
        motivo: 'mal_hecho',
      }),
    );
    expect(hecha.numero).toMatch(/^R-BC-2026-/);
    const cuerpo = elCuerpo(hecha.numero);
    expect(cuerpo['tipo_factura']).toBe('R5');
    expect(cuerpo['tipo_rectificativa']).toBe('I');
    expect(cuerpo['importe_rectificativa']).toBeUndefined();
    expect(cuerpo['importe_total']).toBe('-1.50');
    expect(cuerpo['facturas_rectificadas']).toEqual([
      { serie: 'T-BC-2026-', numero: ticket.numero.slice(-6), fecha_expedicion: '06-11-2026' },
    ]);
    // R5 no admite destinatario (Verifacti, `destinatario_no_aplica`).
    expect(cuerpo['nif']).toBeUndefined();
    expect(cuerpo['nombre']).toBeUndefined();

    const devolucion = await elDocumento(hecha.documentoId);
    expect(devolucion.tipo).toBe('R5');
    expect(devolucion.total).toBe(-150);
    expect(devolucion.rectifica?.id).toBe(ticket.documentoId);
    const textos = devolucion.papel?.piezas.map((p) => p.texto ?? '') ?? [];
    expect(textos).toContain('Factura rectificativa (devolución)');
    expect(textos).toContain(`Rectifica: ${ticket.numero}`);
    expect(textos).toContain('Motivo: Mal hecho');
    expect(textos).not.toContain('¿Quieres factura? Pídela en la barra.');
  });

  it('el ticket no cambia, dice lo que queda y ya no se canjea', async () => {
    const ticket = await unTicket();
    const antes = await comoDuena(`select * from facturacion.documento where id = $1`, [
      ticket.documentoId,
    ]);
    losDatos(
      await api.ejecutar(rosa, 'devolver_el_documento', {
        documento_id: ticket.documentoId,
        que: 'partes',
        partes: [{ linea: 1, cantidad: 1 }],
        motivo: 'no_lo_quiso',
      }),
    );
    expect(
      await comoDuena(`select * from facturacion.documento where id = $1`, [ticket.documentoId]),
    ).toEqual(antes);
    const elTicket = await elDocumento(ticket.documentoId);
    expect(elTicket.chapa.texto).toBe('Devuelto en parte');
    expect(elTicket.queda).toBe(150);
    expect(elTicket.lineas[1]?.importe).toBe(0);
    expect(elTicket.porQueNoSeCanjea).toBe('tiene una devolución');
    expect(
      elFallo(
        await api.ejecutar(rosa, 'hacer_factura_de_tickets', {
          ticket_ids: [ticket.documentoId],
          cliente: EMPRESA,
        }),
      ),
    ).toBe('faltan_datos');
  });

  it('lo devuelto no se devuelve dos veces, tampoco a la vez desde dos aparatos', async () => {
    const ticket = await unTicket();
    const devolver = () =>
      api.ejecutar(rosa, 'devolver_el_documento', {
        documento_id: ticket.documentoId,
        que: 'todo',
        motivo: 'otro',
        detalle: 'Se equivocó de mesa',
      });
    const a = await Promise.all([devolver(), devolver()]);
    expect(a.filter((r) => r.estado === 'ok').length).toBe(1);
    expect(elFallo(await devolver())).toBe('faltan_datos');
    const elTicket = await elDocumento(ticket.documentoId);
    expect(elTicket.queda).toBe(0);
    expect(elTicket.chapa.texto).toBe('Devuelto');
    expect(elTicket.sePuede.devolver).toBe(false);
  });

  it('un ticket con factura se devuelve sobre su factura', async () => {
    const ticket = await unTicket();
    losDatos(
      await api.ejecutar(rosa, 'hacer_factura_de_tickets', {
        ticket_ids: [ticket.documentoId],
        cliente: EMPRESA,
      }),
    );
    const elTicket = await elDocumento(ticket.documentoId);
    expect(elTicket.sePuede.devolver).toBe(false);
    expect(elTicket.sePuede.anular).toBe(false);
    expect(
      elFallo(
        await api.ejecutar(rosa, 'devolver_el_documento', {
          documento_id: ticket.documentoId,
          que: 'todo',
          motivo: 'mal_hecho',
        }),
      ),
    ).toBe('faltan_datos');
  });

  it('el motivo «Otro» pide escribirlo', async () => {
    const ticket = await unTicket();
    expect(
      elFallo(
        await api.ejecutar(rosa, 'devolver_el_documento', {
          documento_id: ticket.documentoId,
          que: 'todo',
          motivo: 'otro',
        }),
      ),
    ).toBe('faltan_datos');
  });
});

describe('devolver una factura (R1)', { timeout: 30_000 }, () => {
  it('una de dos raciones: la siguiente se devuelve exacta, sin céntimos de más', async () => {
    const factura = await unaFactura(1_001);
    const devolverUna = async () =>
      elDocumento(
        losDatos<Hecho>(
          await api.ejecutar(rosa, 'devolver_el_documento', {
            documento_id: factura.documentoId,
            que: 'partes',
            partes: [{ linea: 0, cantidad: 1 }],
            motivo: 'mal_hecho',
          }),
        ).documentoId,
      );
    const una = await devolverUna();
    expect(una.tipo).toBe('R1');
    const otra = await devolverUna();
    expect(una.total + otra.total).toBe(-1_001);
    // R1 lleva a su cliente (Verifacti, `destinatario_requerido`) y va por diferencias.
    const cuerpo = elCuerpo(una.numero);
    expect(cuerpo['tipo_factura']).toBe('R1');
    expect(cuerpo['tipo_rectificativa']).toBe('I');
    expect(cuerpo['nif']).toBe('B84935048');
    const original = await elDocumento(factura.documentoId);
    expect(original.queda).toBe(0);
    expect(original.chapa.texto).toBe('Devuelta');
  });

  it('se cobró de más: devuelve dinero y la ración sigue ahí', async () => {
    const factura = await unaFactura(4_000);
    const hecha = losDatos<Hecho>(
      await api.ejecutar(rosa, 'devolver_el_documento', {
        documento_id: factura.documentoId,
        que: 'de_mas',
        linea: 0,
        importe: 250,
        motivo: 'de_mas',
      }),
    );
    const r = await elDocumento(hecha.documentoId);
    expect(r.total).toBe(-250);
    const original = await elDocumento(factura.documentoId);
    expect(original.lineas[0]?.cantidad).toBe(2);
    expect(original.lineas[0]?.importe).toBe(3_750);
    // No se puede sacar más de lo que queda de esa línea.
    expect(
      elFallo(
        await api.ejecutar(rosa, 'devolver_el_documento', {
          documento_id: factura.documentoId,
          que: 'de_mas',
          linea: 0,
          importe: 3_751,
          motivo: 'de_mas',
        }),
      ),
    ).toBe('faltan_datos');
  });

  it('la lista no cuenta dos veces: lo devuelto resta, y el filtro las saca', async () => {
    ahora = new Date('2026-11-09T10:00:00Z');
    const factura = await unaFactura(2_000);
    losDatos(
      await api.ejecutar(rosa, 'devolver_el_documento', {
        documento_id: factura.documentoId,
        que: 'partes',
        partes: [{ linea: 0, cantidad: 1 }],
        motivo: 'mal_hecho',
      }),
    );
    const lista = losDatos<{ total: number; documentos: { tipo: string }[] }>(
      await api.consultar(rosa, 'tickets_y_facturas'),
    );
    expect(lista.total).toBe(1_000);
    const devoluciones = losDatos<{ documentos: { tipo: string }[] }>(
      await api.consultar(rosa, 'tickets_y_facturas', { que: 'devoluciones' }),
    );
    expect(devoluciones.documentos.map((d) => d.tipo)).toEqual(['R1']);
  });
});

describe('corregir los datos del cliente (R4)', { timeout: 30_000 }, () => {
  it('R4 por sustitución: lo de antes va a Hacienda y la anterior queda «Corregida»', async () => {
    const factura = await unaFactura(11_000);
    const antes = await comoDuena(`select * from facturacion.documento where id = $1`, [
      factura.documentoId,
    ]);
    const hecha = losDatos<Hecho>(
      await api.ejecutar(rosa, 'corregir_los_datos', {
        documento_id: factura.documentoId,
        cliente: { ...EMPRESA, domicilio: 'Polígono Ugaldeguren III, 4, 48170 Zamudio' },
      }),
    );
    const cuerpo = elCuerpo(hecha.numero);
    expect(cuerpo['tipo_factura']).toBe('R4');
    expect(cuerpo['tipo_rectificativa']).toBe('S');
    expect(cuerpo['importe_rectificativa']).toEqual({
      base_rectificada: '100.00',
      cuota_rectificada: '10.00',
    });
    expect(cuerpo['importe_total']).toBe('110.00');
    const nueva = await elDocumento(hecha.documentoId);
    expect(nueva.que).toBe('Corrección de datos');
    expect(nueva.destinatario?.domicilio).toBe('Polígono Ugaldeguren III, 4, 48170 Zamudio');
    expect(nueva.rectifica?.id).toBe(factura.documentoId);

    const original = await elDocumento(factura.documentoId);
    expect(original.chapa.texto).toBe('Corregida');
    expect(original.corregidaPor?.id).toBe(hecha.documentoId);
    expect(original.sePuede.devolver).toBe(false);
    expect(original.sePuede.corregirDatos).toBe(false);
    expect(
      await comoDuena(`select * from facturacion.documento where id = $1`, [factura.documentoId]),
    ).toEqual(antes);
    // Y lo corregido se puede seguir devolviendo: es la que está en vigor.
    expect(nueva.sePuede.devolver).toBe(true);
    expect(nueva.sePuede.corregirDatos).toBe(true);
  });

  it('lo por cobrar lo cobra la corrección: la anterior ya no sale por cobrar', async () => {
    const factura = losDatos<Hecho>(
      await api.ejecutar(rosa, 'hacer_factura_a_mano', {
        cliente: EMPRESA,
        lineas: [{ nombre: 'Comida', cantidad: 1, importe: 5_000, tipo: 0.1 }],
        cobrada: false,
        vencimiento: '2026-12-15',
      }),
    );
    expect((await elDocumento(factura.documentoId)).porCobrar).toBe('2026-12-15');
    const nueva = losDatos<Hecho>(
      await api.ejecutar(rosa, 'corregir_los_datos', {
        documento_id: factura.documentoId,
        cliente: { ...EMPRESA, domicilio: 'Otra calle 5, Bilbao' },
      }),
    );
    expect((await elDocumento(factura.documentoId)).porCobrar).toBeNull();
    expect((await elDocumento(nueva.documentoId)).porCobrar).toBe('2026-12-15');
    const lista = losDatos<{ documentos: { id: string }[] }>(
      await api.consultar(rosa, 'tickets_y_facturas', { que: 'por_cobrar' }),
    );
    const ids = lista.documentos.map((d) => d.id);
    expect(ids).toContain(nueva.documentoId);
    expect(ids).not.toContain(factura.documentoId);
  });

  it('sin cambiar nada no gasta un número, y dos veces no se corrige lo mismo', async () => {
    const factura = await unaFactura();
    expect(
      elFallo(
        await api.ejecutar(rosa, 'corregir_los_datos', {
          documento_id: factura.documentoId,
          cliente: { ...EMPRESA, nombre: 'EJEMPLO NORTE SL' },
        }),
      ),
    ).toBe('faltan_datos');
    losDatos(
      await api.ejecutar(rosa, 'corregir_los_datos', {
        documento_id: factura.documentoId,
        cliente: { ...EMPRESA, domicilio: 'Otra calle 5, Bilbao' },
      }),
    );
    expect(
      elFallo(
        await api.ejecutar(rosa, 'corregir_los_datos', {
          documento_id: factura.documentoId,
          cliente: { ...EMPRESA, domicilio: 'Tercera calle 5, Bilbao' },
        }),
      ),
    ).toBe('faltan_datos');
  });

  it('con una devolución encima, recoge lo que queda y dice que rectifica las dos', async () => {
    const factura = await unaFactura(11_000);
    const devolucion = losDatos<Hecho>(
      await api.ejecutar(rosa, 'devolver_el_documento', {
        documento_id: factura.documentoId,
        que: 'partes',
        partes: [{ linea: 0, cantidad: 1 }],
        motivo: 'mal_hecho',
      }),
    );
    const hecha = losDatos<Hecho>(
      await api.ejecutar(rosa, 'corregir_los_datos', {
        documento_id: factura.documentoId,
        cliente: { ...EMPRESA, domicilio: 'Otra calle 5, Bilbao' },
      }),
    );
    const cuerpo = elCuerpo(hecha.numero);
    expect(cuerpo['importe_total']).toBe('55.00');
    // Lo que tiene Hacienda de esa factura: 110 de la original y −55 de la devolución.
    expect(cuerpo['importe_rectificativa']).toEqual({
      base_rectificada: '50.00',
      cuota_rectificada: '5.00',
    });
    expect((cuerpo['facturas_rectificadas'] as { numero: string }[]).map((f) => f.numero)).toEqual([
      factura.numero.slice(-6),
      devolucion.numero.slice(-6),
    ]);
  });
});

describe('anular (prueba 13)', { timeout: 30_000 }, () => {
  it('solo quien puede y con su motivo', async () => {
    const ticket = await unTicket();
    await correcto(ticket.numero);
    expect(elFallo(await anular(ticket.documentoId, sara))).toBe('sin_permiso');
    expect(elFallo(await anular(ticket.documentoId, rosa, ''))).toBe('faltan_datos');
    expect((await elDocumento(ticket.documentoId, sara)).sePuede.anular).toBe(false);
    expect((await elDocumento(ticket.documentoId)).sePuede.anular).toBe(true);
  });

  it('hasta que Hacienda dice «Anulado», sigue valiendo; después, no se entrega y queda quién', async () => {
    const ticket = await unTicket();
    await correcto(ticket.numero);
    losDatos(await anular(ticket.documentoId));
    // A Hacienda, su serie, su número y la fecha que tiene; por una clave propia.
    const cuerpo = elCuerpo(ticket.numero, 'Anulación');
    expect(Object.keys(cuerpo).sort()).toEqual(['fecha_expedicion', 'numero', 'serie']);
    expect(cuerpo['serie']).toBe('T-BC-2026-');
    expect(cuerpo['numero']).toBe(ticket.numero.slice(-6));
    expect(cuerpo['fecha_expedicion']).toMatch(/^\d{2}-\d{2}-2026$/);
    const anulando = await elDocumento(ticket.documentoId);
    expect(anulando.chapa.texto).toBe('Anulando');
    expect(anulando.estado).toBe('correcto');
    expect(anulando.sePuede.devolver).toBe(false);
    // Vuelve a la cola: el reloj tiene que preguntar (memoria de la 0138).
    expect(
      (
        await comoDuena(`select 1 from facturacion.por_repasar where documento_id = $1`, [
          ticket.documentoId,
        ])
      ).length,
    ).toBe(1);

    verifacti.decirHacienda(elRegistroDe(ticket.numero, 'Anulación').uuid, 'Anulado');
    await repasar();
    const anulado = await elDocumento(ticket.documentoId);
    expect(anulado.estado).toBe('anulado');
    expect(anulado.chapa.texto).toBe('Anulado');
    expect(anulado.seEntrega).toBe(false);
    expect(anulado.anulado?.motivo).toBe('Salió repetido al probar');
    expect(anulado.anulado?.quien).toBeTruthy();
    expect(anulado.sePuede).toEqual({
      devolver: false,
      corregirDatos: false,
      anular: false,
      corregirLoRechazado: false,
    });
    expect(
      (
        await comoDuena(`select 1 from facturacion.por_repasar where documento_id = $1`, [
          ticket.documentoId,
        ])
      ).length,
    ).toBe(0);
    // Y no suma en la lista, ni se puede canjear.
    expect(anulado.porQueNoSeCanjea).toBe('Hacienda no lo tiene');
  });

  it('si Hacienda no la acepta, el documento sigue valiendo, no sale como rechazado y se avisa', async () => {
    const ticket = await unTicket();
    await correcto(ticket.numero);
    losDatos(await anular(ticket.documentoId));
    verifacti.decirHacienda(
      elRegistroDe(ticket.numero, 'Anulación').uuid,
      'Factura inexistente',
      '3001',
      'No existe la factura',
    );
    await repasar();
    const sigue = await elDocumento(ticket.documentoId);
    expect(sigue.estado).toBe('correcto');
    expect(sigue.chapa.texto).toBe('Correcto');
    expect(sigue.seEntrega).toBe(true);
    expect(sigue.anulacionQueNoSalio?.dice).toBe('No existe la factura');
    // Se puede volver a intentar, y no se queda en la cola para siempre.
    expect(sigue.sePuede.anular).toBe(true);
    expect(
      (
        await comoDuena(`select 1 from facturacion.por_repasar where documento_id = $1`, [
          ticket.documentoId,
        ])
      ).length,
    ).toBe(0);
    const [{ cuantos }] = (await comoDuena<{ cuantos: string }>(
      `select count(*)::text as cuantos from estook.aviso
        where tipo = 'documento.rechazado' and titulo like '%anulación%' and titulo like $1`,
      [`%${ticket.numero}%`],
    )) as [{ cuantos: string }];
    expect(Number(cuantos)).toBeGreaterThan(0);
  });

  it('con Verifacti caído se reintenta con la misma clave, y no se pierde', async () => {
    const ticket = await unTicket();
    await correcto(ticket.numero);
    verifacti.emitirAsi('perder_respuesta');
    losDatos(await anular(ticket.documentoId));
    verifacti.emitirAsi('normal');
    expect((await elDocumento(ticket.documentoId)).chapa.texto).toBe('Anulando');
    await repasar();
    // Las dos llamadas, con la misma clave: Verifacti repite su respuesta y no registra otra.
    const claves = verifacti.llamadas.filter((l) => l.startsWith('anular ')).slice(-2);
    expect(claves).toHaveLength(2);
    expect(claves[0]).toBe(claves[1]);
    // Una sola anulación en Hacienda, aunque se haya mandado dos veces.
    expect(
      verifacti.registros.filter(
        (r) => r.operacion === 'Anulación' && r.numero === ticket.numero.slice(-6),
      ),
    ).toHaveLength(1);
  });

  it('no se anula lo que Hacienda aún no ha contestado, lo que tiene encima otro documento, ni una señal', async () => {
    const pendiente = await unTicket();
    expect(elFallo(await anular(pendiente.documentoId))).toBe('faltan_datos');

    const devuelto = await unTicket();
    await correcto(devuelto.numero);
    losDatos(
      await api.ejecutar(rosa, 'devolver_el_documento', {
        documento_id: devuelto.documentoId,
        que: 'todo',
        motivo: 'mal_hecho',
      }),
    );
    expect(elFallo(await anular(devuelto.documentoId))).toBe('faltan_datos');

    const senal = losDatos<Hecho>(
      await api.ejecutar(rosa, 'hacer_factura_de_senal', {
        cliente: EMPRESA,
        para_que: 'Señal de la comida del 14-nov',
        importe: 30_000,
        tipo: 0.1,
      }),
    );
    await correcto(senal.numero);
    expect(elFallo(await anular(senal.documentoId))).toBe('faltan_datos');
    expect((await elDocumento(senal.documentoId)).sePuede.anular).toBe(false);
  });

  it('anular la factura de un ticket deja el ticket libre', async () => {
    const ticket = await unTicket();
    const factura = losDatos<Hecho>(
      await api.ejecutar(rosa, 'hacer_factura_de_tickets', {
        ticket_ids: [ticket.documentoId],
        cliente: EMPRESA,
      }),
    );
    await correcto(factura.numero);
    losDatos(await anular(factura.documentoId));
    verifacti.decirHacienda(elRegistroDe(factura.numero, 'Anulación').uuid, 'Anulado');
    await repasar();
    const elTicket = await elDocumento(ticket.documentoId);
    expect(elTicket.factura).toBeNull();
    expect(elTicket.porQueNoSeCanjea).toBeNull();
  });
});

describe('la señal', { timeout: 30_000 }, () => {
  const OTRO = { ...EMPRESA, identificador: 'B12345674', nombre: 'IKATZ RESTAURACION SL' };

  const laSenal = async (importe = 30_000, cliente: typeof EMPRESA | typeof OTRO = EMPRESA) =>
    losDatos<Hecho>(
      await api.ejecutar(rosa, 'hacer_factura_de_senal', {
        cliente,
        para_que: 'Señal de la comida del 14-nov',
        importe,
        tipo: 0.1,
      }),
    );

  const lasDe = async (identificador: string) =>
    losDatos<{ id: string; numero: string; importe: number; lineas: { importe: number }[] }[]>(
      await api.consultar(rosa, 'las_senales_del_cliente', { identificador }),
    );

  const lasQueHay = async () => {
    // Lo de las pruebas de antes no estorba: cada una mira las suyas.
    return (await lasDe(OTRO.identificador)).map((s) => s.id);
  };

  it('se factura cobrada, como «Señal», y se ofrece solo a ese cliente', async () => {
    const senal = await laSenal(30_000, OTRO);
    const doc = await elDocumento(senal.documentoId);
    expect(doc.que).toBe('Señal');
    expect(doc.esSenal).toBe(true);
    expect(elCuerpo(senal.numero)['tipo_factura']).toBe('F1');
    expect(await lasQueHay()).toContain(senal.documentoId);
    const deOtro = await lasDe(EMPRESA.identificador);
    expect(deOtro.map((s) => s.id)).not.toContain(senal.documentoId);
  });

  it('la final la descuenta en su mismo IVA, una sola vez y sale «Descontada»', async () => {
    const senal = await laSenal(30_000);
    const final = losDatos<Hecho>(
      await api.ejecutar(rosa, 'hacer_factura_a_mano', {
        cliente: EMPRESA,
        lineas: [{ nombre: 'Menú de grupo', cantidad: 30, importe: 105_000, tipo: 0.1 }],
        cobrada: false,
        vencimiento: '2026-12-15',
        senales: [senal.documentoId],
      }),
    );
    const doc = await elDocumento(final.documentoId);
    expect(doc.total).toBe(75_000);
    expect(doc.descuenta.map((s) => s.id)).toEqual([senal.documentoId]);
    expect(elCuerpo(final.numero)['importe_total']).toBe('750.00');
    expect(doc.papel?.piezas.map((p) => p.texto ?? '')).toContain(
      `Descuenta la señal ${senal.numero}`,
    );

    const laOriginal = await elDocumento(senal.documentoId);
    expect(laOriginal.chapa.texto).toBe('Descontada');
    expect(laOriginal.descontadaEn?.id).toBe(final.documentoId);
    expect(laOriginal.sePuede.devolver).toBe(false);
    expect(laOriginal.sePuede.corregirDatos).toBe(false);
    expect((await lasDe(EMPRESA.identificador)).map((s) => s.id)).not.toContain(senal.documentoId);
    // Una señal, una sola vez.
    expect(
      elFallo(
        await api.ejecutar(rosa, 'hacer_factura_a_mano', {
          cliente: EMPRESA,
          lineas: [{ nombre: 'Otra comida', cantidad: 1, importe: 100_000, tipo: 0.1 }],
          cobrada: true,
          senales: [senal.documentoId],
        }),
      ),
    ).toBe('faltan_datos');
  });

  it('solo del mismo cliente, y si es mayor que la comida lo dice antes de emitir', async () => {
    const senal = await laSenal(30_000);
    const antes = await comoDuena<{ n: number }>(
      `select count(*)::int as n from facturacion.documento`,
    );
    expect(
      elFallo(
        await api.ejecutar(rosa, 'hacer_factura_a_mano', {
          cliente: OTRO,
          lineas: [{ nombre: 'Comida', cantidad: 1, importe: 100_000, tipo: 0.1 }],
          cobrada: true,
          senales: [senal.documentoId],
        }),
      ),
    ).toBe('faltan_datos');
    expect(
      elFallo(
        await api.ejecutar(rosa, 'hacer_factura_a_mano', {
          cliente: EMPRESA,
          lineas: [{ nombre: 'Comida', cantidad: 1, importe: 20_000, tipo: 0.1 }],
          cobrada: true,
          senales: [senal.documentoId],
        }),
      ),
    ).toBe('faltan_datos');
    // Otro tipo tampoco tapa el hueco: una comida al 21 % no paga una señal al 10 %.
    expect(
      elFallo(
        await api.ejecutar(rosa, 'hacer_factura_a_mano', {
          cliente: EMPRESA,
          lineas: [{ nombre: 'Alquiler', cantidad: 1, importe: 100_000, tipo: 0.21 }],
          cobrada: true,
          senales: [senal.documentoId],
        }),
      ),
    ).toBe('faltan_datos');
    // Lo que no se puede emitir no gasta un número.
    const despues = await comoDuena<{ n: number }>(
      `select count(*)::int as n from facturacion.documento`,
    );
    expect(despues[0]?.n).toBe(antes[0]?.n);
  });

  it('si la final se devuelve entera, la señal queda libre otra vez', async () => {
    const senal = await laSenal(10_000);
    const final = losDatos<Hecho>(
      await api.ejecutar(rosa, 'hacer_factura_a_mano', {
        cliente: EMPRESA,
        lineas: [{ nombre: 'Comida', cantidad: 1, importe: 30_000, tipo: 0.1 }],
        cobrada: true,
        senales: [senal.documentoId],
      }),
    );
    // Una parte no puede pasar de lo que queda: 200 €, no 300.
    expect(
      elFallo(
        await api.ejecutar(rosa, 'devolver_el_documento', {
          documento_id: final.documentoId,
          que: 'partes',
          partes: [{ linea: 0, cantidad: 1 }],
          motivo: 'mal_hecho',
        }),
      ),
    ).toBe('faltan_datos');
    const r = losDatos<Hecho>(
      await api.ejecutar(rosa, 'devolver_el_documento', {
        documento_id: final.documentoId,
        que: 'todo',
        motivo: 'mal_hecho',
      }),
    );
    expect((await elDocumento(r.documentoId)).total).toBe(-20_000);
    expect((await elDocumento(senal.documentoId)).descontadaEn).toBeNull();
    expect((await lasDe(EMPRESA.identificador)).map((s) => s.id)).toContain(senal.documentoId);
  });
});

describe('lo que rechaza Hacienda se corrige con otro documento', { timeout: 30_000 }, () => {
  it('otro número, deja de salir arriba, y el original se queda', async () => {
    const ticket = await unTicket();
    const factura = losDatos<Hecho>(
      await api.ejecutar(rosa, 'hacer_factura_de_tickets', {
        ticket_ids: [ticket.documentoId],
        cliente: EMPRESA,
      }),
    );
    verifacti.decirHacienda(elRegistroDe(factura.numero).uuid, 'Incorrecto', '1100', 'Dato mal');
    await repasar();
    const rechazada = await elDocumento(factura.documentoId);
    expect(rechazada.estado).toBe('rechazado');
    expect(rechazada.sePuede.corregirLoRechazado).toBe(true);
    expect(rechazada.sePuede.devolver).toBe(false);
    expect(rechazada.sePuede.anular).toBe(false);
    expect(rechazada.loQueFalla?.numero).toBe(factura.numero);

    const nueva = losDatos<Hecho>(
      await api.ejecutar(rosa, 'corregir_lo_rechazado', {
        documento_id: factura.documentoId,
        cliente: { ...EMPRESA, domicilio: 'Otra calle 5, Bilbao' },
      }),
    );
    expect(nueva.numero).not.toBe(factura.numero);
    const doc = await elDocumento(nueva.documentoId);
    expect(doc.tipo).toBe('F3');
    expect(doc.destinatario?.domicilio).toBe('Otra calle 5, Bilbao');
    // Los tickets que sustituía pasan al nuevo.
    expect((await elDocumento(ticket.documentoId)).factura?.id).toBe(nueva.documentoId);
    const despues = await elDocumento(factura.documentoId);
    expect(despues.chapa.texto).toBe('Corregida');
    expect(despues.loQueFalla).toBeNull();
    expect(despues.sePuede.corregirLoRechazado).toBe(false);
    // Una sola vez.
    expect(
      elFallo(
        await api.ejecutar(rosa, 'corregir_lo_rechazado', {
          documento_id: factura.documentoId,
        }),
      ),
    ).toBe('faltan_datos');
    // Y lo que está bien no se rehace.
    expect(
      elFallo(
        await api.ejecutar(rosa, 'corregir_lo_rechazado', {
          documento_id: nueva.documentoId,
        }),
      ),
    ).toBe('faltan_datos');
  });

  it('una devolución rechazada no cuenta: lo devuelto vuelve a quedar, y se rehace', async () => {
    const ticket = await unTicket();
    const r = losDatos<Hecho>(
      await api.ejecutar(rosa, 'devolver_el_documento', {
        documento_id: ticket.documentoId,
        que: 'todo',
        motivo: 'mal_hecho',
      }),
    );
    verifacti.decirHacienda(elRegistroDe(r.numero).uuid, 'Incorrecto', '1100', 'Dato mal');
    await repasar();
    expect((await elDocumento(ticket.documentoId)).queda).toBe(270);
    const otra = losDatos<Hecho>(
      await api.ejecutar(rosa, 'corregir_lo_rechazado', { documento_id: r.documentoId }),
    );
    expect((await elDocumento(otra.documentoId)).rectifica?.id).toBe(ticket.documentoId);
    expect((await elDocumento(ticket.documentoId)).queda).toBe(0);
  });
});

describe('quién hace qué', { timeout: 30_000 }, () => {
  it('de fábrica: devolver el gerente, el area manager y la dirección; corregir y anular, el gerente y la dirección', async () => {
    const filas = await comoDuena<{ rol: string; permiso: string }>(
      `select rol, permiso from estook.permiso_de_rol
        where permiso in ('accion.devolver', 'accion.corregir_datos', 'accion.anular')
        order by permiso, rol`,
    );
    const de = (permiso: string) => filas.filter((f) => f.permiso === permiso).map((f) => f.rol);
    expect(de('accion.devolver')).toEqual([
      'administrador_de_cuenta',
      'area_manager',
      'direccion',
      'gerente',
    ]);
    expect(de('accion.corregir_datos')).toEqual(['direccion', 'gerente']);
    expect(de('accion.anular')).toEqual(['direccion', 'gerente']);
  });

  it('el camarero no ve los botones, y la API se lo dice aunque llame a pelo', async () => {
    const ticket = await unTicket();
    await correcto(ticket.numero);
    const suyo = await elDocumento(ticket.documentoId, sara);
    expect(suyo.sePuede).toEqual({
      devolver: false,
      corregirDatos: false,
      anular: false,
      corregirLoRechazado: false,
    });
    expect(
      elFallo(
        await api.ejecutar(sara, 'devolver_el_documento', {
          documento_id: ticket.documentoId,
          que: 'todo',
          motivo: 'mal_hecho',
        }),
      ),
    ).toBe('sin_permiso');
    expect(
      elFallo(
        await api.ejecutar(sara, 'hacer_factura_de_senal', {
          cliente: EMPRESA,
          para_que: 'Señal',
          importe: 100,
          tipo: 0.1,
        }),
      ),
    ).toBe('sin_permiso');
  });

  it('la dirección se lo da a una persona con un interruptor', async () => {
    const elena = await api.entrar('elena@ejemplo.estook.com');
    losDatos(
      await api.ejecutar(elena, 'cambiar_de_contexto', {
        local_id: await base.localPorCodigo('bar-faro'),
      }),
    );
    const personas = losDatos<
      { personaId: string; rol: string; siempre: boolean; devolver: boolean; cambiados: string[] }[]
    >(await api.consultar(elena, 'quien_hace_que', {}));
    const alguien = personas.find((p) => !p.siempre && p.rol !== 'gestoria');
    expect(alguien).toBeDefined();
    const loTenia = alguien?.devolver === true;
    losDatos(
      await api.ejecutar(elena, 'dar_un_permiso', {
        persona_id: alguien?.personaId,
        permiso: 'accion.devolver',
        tiene: !loTenia,
      }),
    );
    const despues = losDatos<typeof personas>(await api.consultar(elena, 'quien_hace_que', {}));
    const cambiada = despues.find((p) => p.personaId === alguien?.personaId);
    expect(cambiada?.devolver).toBe(!loTenia);
    expect(cambiada?.cambiados).toContain('accion.devolver');
    // Un gerente no se los da a sí mismo: solo la dirección (0137).
    expect(
      elFallo(
        await api.ejecutar(rosa, 'dar_un_permiso', {
          persona_id: alguien?.personaId,
          permiso: 'accion.anular',
          tiene: true,
        }),
      ),
    ).toBe('solo_la_direccion');
  });

  it('lo emitido sigue sin poderse tocar: ni rectificaciones ni anulaciones', async () => {
    const ticket = await unTicket();
    await correcto(ticket.numero);
    const r = losDatos<Hecho>(
      await api.ejecutar(rosa, 'devolver_el_documento', {
        documento_id: ticket.documentoId,
        que: 'todo',
        motivo: 'mal_hecho',
      }),
    );
    await expect(
      comoDuena(
        `update facturacion.rectificacion set motivo = 'otro' where rectificativa_id = $1`,
        [r.documentoId],
      ),
    ).rejects.toThrow(/solo se inserta/);
    const [permisos] = await comoDuena<{ puede: boolean }>(
      `select bool_or(has_table_privilege('estook_api', 'facturacion.' || t, p)) as puede
         from unnest(array['rectificacion', 'descuento_de_senal', 'anulacion', 'paso_de_anulacion', 'rehecho']) t,
              unnest(array['insert', 'update', 'delete', 'truncate']) p`,
    );
    expect(permisos?.puede).toBe(false);
  });
});
