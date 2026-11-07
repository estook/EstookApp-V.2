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
 * T6 · 2 · 2 · 1 · Las facturas y quién hace qué (decisión 0137, migración 0107), contra Postgres
 * de verdad y con el Verifacti de mentira. Las pruebas del capítulo 8 del Anexo que le tocan:
 *
 *   · 2    desde el admin no se modifica un documento, ni llamando a la API a pelo
 *   · 6    dos NIF a la vez: no se mezclan las series ni las claves
 *   · 11   canje F3: importe igual al ticket, ticket marcado, segundo canje bloqueado, original intacto
 *   · 20   los dos cambios de hora del año: la fecha y el año de la serie, los del local
 */

let base: BaseDePrueba;
let api: ApiDePrueba;
const verifacti = verifactiDeMentira();
const correo = correoEnMemoria();
let ahora = new Date('2026-11-06T13:31:00Z');
let pablo: string;
let casaLola: string;
let admin: string;

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
  estado: string;
  total: number;
  chapa: { texto: string };
  historia: { hora: string; que: string }[];
  factura: { id: string; numero: string } | null;
  sustituye: { id: string; numero: string }[];
  porCobrar: string | null;
  porQueNoSeCanjea: string | null;
  seEntrega: boolean;
  papel: {
    piezas: { tipo: string; texto?: string; izquierda?: string; contenido?: string }[];
  } | null;
  puede: { todo: boolean; deUnTicket: boolean; aMano: boolean };
}

const EMPRESA = {
  clase: 'empresa',
  nombre: 'Ejemplo Norte',
  identificador: 'B84935048',
  domicilio: 'Pol. Ugaldeguren 4, Zamudio',
} as const;

const unTicket = async (): Promise<Hecho> =>
  losDatos(await api.ejecutar(pablo, 'imprimir_un_ticket_de_prueba', {}));

const elDocumento = async (id: string, quien = pablo) =>
  losDatos<UnDocumento>(await api.consultar(quien, 'un_documento', { documento_id: id }));

const elCuerpo = (numero: string) =>
  verifacti.registros.find((r) => r.numero === numero.slice(-6) && numero.startsWith(r.serie))
    ?.cuerpo as Record<string, unknown> | undefined;

beforeAll(async () => {
  base = await levantarBase();
  api = montarLaApi(base.bd, { facturacion: verifacti, correo, ahora: () => ahora });
  casaLola = await base.localPorCodigo('casa-lola');
  await comoDuena(
    `insert into estook.suscripcion (organizacion_id, estado, de_la_casa)
     select organizacion_id, 'activa', true from estook.local where id = $1
     on conflict (organizacion_id) do update set de_la_casa = true`,
    [casaLola],
  );
  const entrada = losDatos<{ token: string }>(
    await api.ejecutar(null, 'entrar_en_admin', {
      correo: ADMIN_DE_EJEMPLO,
      contrasena: CLAVE_DE_EJEMPLO,
    }),
  );
  admin = entrada.token;
  losDatos(
    await api.ejecutar(admin, 'superar_doble_factor', {
      codigo: await codigoEn(SECRETO_DEL_ADMIN_DE_EJEMPLO, ahora),
    }),
  );
  losDatos(await api.ejecutar(admin, 'admin_poner_la_empresa_de_pruebas', { local_id: casaLola }));
  pablo = await api.entrar('pablo@ejemplo.estook.com');
  losDatos(
    await api.ejecutar(pablo, 'poner_las_series', {
      ticket: 'T-CL',
      factura: 'F-CL',
      rectificativa: 'R-CL',
      otro_programa: false,
    }),
  );
}, 120_000);

afterAll(async () => {
  await base.cerrar();
});

describe('el canje (prueba 11)', () => {
  it('sale F3 con el importe del ticket, y el ticket no cambia y queda canjeado', async () => {
    const ticket = await unTicket();
    const antes = await comoDuena(`select * from facturacion.documento where id = $1`, [
      ticket.documentoId,
    ]);
    const hecha = losDatos<Hecho>(
      await api.ejecutar(pablo, 'hacer_factura_de_tickets', {
        ticket_ids: [ticket.documentoId],
        cliente: EMPRESA,
      }),
    );
    expect(hecha.numero).toMatch(/^F-CL-2026-/);
    const factura = await elDocumento(hecha.documentoId);
    expect(factura.tipo).toBe('F3');
    expect(factura.total).toBe(270);
    expect(factura.sustituye.map((t) => t.id)).toEqual([ticket.documentoId]);
    // A Hacienda va con el destinatario y el ticket que sustituye, con su fecha de registro.
    const cuerpo = elCuerpo(hecha.numero);
    expect(cuerpo?.['nif']).toBe('B84935048');
    expect(cuerpo?.['nombre']).toBe('EJEMPLO NORTE SL');
    expect(cuerpo?.['facturas_sustituidas']).toEqual([
      { serie: 'T-CL-2026-', numero: ticket.numero.slice(-6), fecha_expedicion: '06-11-2026' },
    ]);
    // El ticket, intacto: igual fila a fila, y solo con la marca que se lee de lo añadido.
    expect(
      await comoDuena(`select * from facturacion.documento where id = $1`, [ticket.documentoId]),
    ).toEqual(antes);
    const elTicket = await elDocumento(ticket.documentoId);
    expect(elTicket.chapa.texto).toBe('Canjeado');
    expect(elTicket.factura?.id).toBe(hecha.documentoId);
  });

  it('un ticket no se canjea dos veces, tampoco a la vez desde dos aparatos', async () => {
    const ticket = await unTicket();
    const hacer = () =>
      api.ejecutar(pablo, 'hacer_factura_de_tickets', {
        ticket_ids: [ticket.documentoId],
        cliente: EMPRESA,
      });
    const a = await Promise.all([hacer(), hacer()]);
    expect(a.filter((r) => r.estado === 'ok').length).toBe(1);
    const segundo = elFallo(await hacer());
    expect(segundo).toBe('faltan_datos');
    const [{ cuantas }] = (await comoDuena<{ cuantas: string }>(
      `select count(*)::text as cuantas from facturacion.canje where ticket_id = $1`,
      [ticket.documentoId],
    )) as [{ cuantas: string }];
    expect(cuantas).toBe('1');
  });

  it('varios tickets en una: suma exacta, y los platos iguales en una línea', async () => {
    const a = await unTicket();
    const b = await unTicket();
    const hecha = losDatos<Hecho>(
      await api.ejecutar(pablo, 'hacer_factura_de_tickets', {
        ticket_ids: [a.documentoId, b.documentoId],
        cliente: EMPRESA,
      }),
    );
    const factura = await elDocumento(hecha.documentoId);
    expect(factura.total).toBe(540);
    expect(factura.sustituye).toHaveLength(2);
    const [fila] = await comoDuena<{ lineas: { nombre: string; cantidad: number }[] }>(
      `select lineas from facturacion.documento where id = $1`,
      [hecha.documentoId],
    );
    expect(fila?.lineas.map((l) => [l.nombre, l.cantidad])).toEqual([
      ['Café solo', 2],
      ['Agua', 2],
    ]);
  });

  it('el papel lleva lo que pide la ley: el precio sin impuesto, para quién y el QR primero', async () => {
    const ticket = await unTicket();
    const hecha = losDatos<Hecho>(
      await api.ejecutar(pablo, 'hacer_factura_de_tickets', {
        ticket_ids: [ticket.documentoId],
        cliente: EMPRESA,
      }),
    );
    const { papel } = await elDocumento(hecha.documentoId);
    const piezas = papel?.piezas ?? [];
    const primero = piezas.findIndex((p) => p.tipo === 'qr');
    expect(primero).toBeGreaterThanOrEqual(0);
    expect(primero).toBeLessThan(piezas.findIndex((p) => p.texto?.startsWith('Factura ')));
    expect(piezas.some((p) => p.izquierda?.includes('1,36 sin imp. · 10 %'))).toBe(true);
    expect(piezas.some((p) => p.texto === 'Pol. Ugaldeguren 4, Zamudio')).toBe(true);
    expect(piezas.some((p) => p.texto === `Sustituye a ${ticket.numero}`)).toBe(true);
  });
});

describe('la factura a mano', () => {
  const unaLinea = { nombre: 'Alquiler del comedor', cantidad: 1, importe: 15_000, tipo: 0.21 };

  it('sale F1, por cobrar con su vencimiento, y luego se marca cobrada', async () => {
    const hecha = losDatos<Hecho>(
      await api.ejecutar(pablo, 'hacer_factura_a_mano', {
        cliente: EMPRESA,
        lineas: [unaLinea],
        cobrada: false,
        vencimiento: '2026-12-15',
        correo: 'admin@ejemplo.es',
      }),
    );
    const factura = await elDocumento(hecha.documentoId);
    expect(factura.tipo).toBe('F1');
    expect(factura.porCobrar).toBe('2026-12-15');
    losDatos(await api.ejecutar(pablo, 'marcar_cobrada', { documento_id: hecha.documentoId }));
    expect((await elDocumento(hecha.documentoId)).porCobrar).toBeNull();
    // El cliente se guarda para la vez siguiente, con su correo.
    const clientes = losDatos<{ identificador: string; correo: string | null }[]>(
      await api.consultar(pablo, 'los_clientes_de_factura', {}),
    );
    expect(clientes.find((c) => c.identificador === 'B84935048')?.correo).toBe('admin@ejemplo.es');
  });

  it('un impuesto que el local no tiene, o una fecha futura, no se numeran', async () => {
    const antes = verifacti.registros.length;
    const otroTipo = elFallo(
      await api.ejecutar(pablo, 'hacer_factura_a_mano', {
        cliente: EMPRESA,
        lineas: [{ ...unaLinea, tipo: 0.33 }],
        cobrada: true,
      }),
    );
    expect(otroTipo).toBe('faltan_datos');
    const manana = elFallo(
      await api.ejecutar(pablo, 'hacer_factura_a_mano', {
        cliente: EMPRESA,
        lineas: [unaLinea],
        fecha_operacion: '2026-11-07',
        cobrada: true,
      }),
    );
    expect(manana).toBe('faltan_datos');
    expect(verifacti.registros.length).toBe(antes);
  });

  it('un NIF que Hacienda no conoce se dice antes de gastar un número', async () => {
    const [{ cuantos: antes }] = (await comoDuena<{ cuantos: string }>(
      `select count(*)::text as cuantos from facturacion.documento`,
    )) as [{ cuantos: string }];
    const no = elFallo(
      await api.ejecutar(pablo, 'hacer_factura_a_mano', {
        cliente: { ...EMPRESA, identificador: 'B00000000' },
        lineas: [unaLinea],
        cobrada: true,
      }),
    );
    expect(no).toBe('nif_no_vale');
    const [{ cuantos: despues }] = (await comoDuena<{ cuantos: string }>(
      `select count(*)::text as cuantos from facturacion.documento`,
    )) as [{ cuantos: string }];
    expect(despues).toBe(antes);
  });

  it('alguien de fuera va con su id_otro; un IVA fuera del censo no pasa', async () => {
    const hecha = losDatos<Hecho>(
      await api.ejecutar(pablo, 'hacer_factura_a_mano', {
        cliente: {
          clase: 'de_fuera',
          nombre: 'Beispiel GmbH',
          identificador: 'DE123456789',
          id_tipo: '02',
          codigo_pais: 'DE',
          domicilio: 'Hauptstr. 1, Berlín',
        },
        lineas: [unaLinea],
        cobrada: true,
      }),
    );
    const cuerpo = elCuerpo(hecha.numero);
    expect(cuerpo?.['id_otro']).toEqual({ codigo_pais: 'DE', id_type: '02', id: 'DE123456789' });
    expect(cuerpo?.['nif']).toBeUndefined();
    const no = elFallo(
      await api.ejecutar(pablo, 'hacer_factura_a_mano', {
        cliente: {
          clase: 'de_fuera',
          nombre: 'Otra GmbH',
          identificador: 'DE999999999',
          id_tipo: '02',
          codigo_pais: 'DE',
          domicilio: 'Hauptstr. 2, Berlín',
        },
        lineas: [unaLinea],
        cobrada: true,
      }),
    );
    expect(no).toBe('nif_no_vale');
  });
});

describe('quién hace qué (0137)', () => {
  const unaLinea = { nombre: 'Comida', cantidad: 1, importe: 1_000, tipo: 0.1 };

  let rosa: string;
  let sara: string;

  // Bar Centro: Rosa, gerente que lleva la facturación, y Sara, su camarera.
  beforeAll(async () => {
    const barCentro = await base.localPorCodigo('bar-centro');
    await comoDuena(
      `insert into estook.suscripcion (organizacion_id, estado, de_la_casa)
       select organizacion_id, 'activa', true from estook.local where id = $1
       on conflict (organizacion_id) do update set de_la_casa = true`,
      [barCentro],
    );
    losDatos(
      await api.ejecutar(admin, 'admin_poner_la_empresa_de_pruebas', { local_id: barCentro }),
    );
    rosa = await api.entrar('rosa@ejemplo.estook.com');
    losDatos(
      await api.ejecutar(rosa, 'poner_las_series', {
        ticket: 'T-BC',
        factura: 'F-BC',
        rectificativa: 'R-BC',
        otro_programa: false,
      }),
    );
    sara = await api.entrar('sara@ejemplo.estook.com');
  });

  const unTicketDeRosa = async (): Promise<Hecho> =>
    losDatos(await api.ejecutar(rosa, 'imprimir_un_ticket_de_prueba', {}));

  it('el camarero hace la factura de un ticket, y no la de a mano ni lo fiscal', async () => {
    const ticket = await unTicketDeRosa();
    const hecha = losDatos<Hecho>(
      await api.ejecutar(sara, 'hacer_factura_de_tickets', {
        ticket_ids: [ticket.documentoId],
        cliente: EMPRESA,
      }),
    );
    expect(hecha.numero).toMatch(/^F-BC/);
    expect(
      elFallo(
        await api.ejecutar(sara, 'hacer_factura_a_mano', {
          cliente: EMPRESA,
          lineas: [unaLinea],
          cobrada: true,
        }),
      ),
    ).toBe('sin_permiso');
    expect(elFallo(await api.consultar(sara, 'los_clientes_de_factura', {}))).toBe('sin_permiso');
    expect(elFallo(await api.consultar(sara, 'mi_facturacion', {}))).toBe('sin_permiso');
    expect(elFallo(await api.consultar(sara, 'quien_hace_que', {}))).toBe('solo_la_direccion');
  });

  it('el camarero ve hoy y ayer, y lo viejo solo por su número exacto', async () => {
    const viejo = await unTicketDeRosa();
    const original = ahora;
    ahora = new Date('2026-11-09T13:00:00Z');
    try {
      const hoy = losDatos<{ documentos: { id: string }[]; puede: { todo: boolean } }>(
        await api.consultar(sara, 'tickets_y_facturas', {}),
      );
      expect(hoy.puede.todo).toBe(false);
      expect(hoy.documentos.some((d) => d.id === viejo.documentoId)).toBe(false);
      expect(
        elFallo(
          await api.consultar(sara, 'tickets_y_facturas', {
            desde: '2026-11-01',
            hasta: '2026-11-09',
          }),
        ),
      ).toBe('sin_permiso');
      // Un trozo del número o un cliente no le dicen nada; el número entero, sí.
      const trozo = losDatos<{ documentos: unknown[] }>(
        await api.consultar(sara, 'tickets_y_facturas', { buscar: 'Ejemplo' }),
      );
      expect(trozo.documentos).toHaveLength(0);
      const exacto = losDatos<{ documentos: { id: string }[] }>(
        await api.consultar(sara, 'tickets_y_facturas', { buscar: viejo.numero }),
      );
      expect(exacto.documentos.map((d) => d.id)).toEqual([viejo.documentoId]);
      // Y el gerente, con todo el historial y el cliente.
      const gerente = losDatos<{ documentos: unknown[]; puede: { todo: boolean } }>(
        await api.consultar(rosa, 'tickets_y_facturas', {
          desde: '2026-11-01',
          hasta: '2026-11-09',
        }),
      );
      expect(gerente.puede.todo).toBe(true);
      expect(gerente.documentos.length).toBeGreaterThan(0);
    } finally {
      ahora = original;
    }
  });

  it('la dirección cambia a una persona con un interruptor, y queda en la auditoría', async () => {
    const elena = await api.entrar('elena@ejemplo.estook.com');
    losDatos(
      await api.ejecutar(elena, 'cambiar_de_contexto', {
        local_id: await base.localPorCodigo('bar-faro'),
      }),
    );
    const personas = losDatos<
      {
        personaId: string;
        nombre: string;
        rol: string;
        siempre: boolean;
        aMano: boolean;
        cambiados: string[];
      }[]
    >(await api.consultar(elena, 'quien_hace_que', {}));
    const alguien = personas.find((p) => !p.siempre && p.rol !== 'gestoria');
    expect(alguien).toBeDefined();
    const loTenia = alguien?.aMano === true;
    losDatos(
      await api.ejecutar(elena, 'dar_un_permiso', {
        persona_id: alguien?.personaId,
        permiso: 'accion.factura_a_mano',
        tiene: !loTenia,
      }),
    );
    const despues = losDatos<typeof personas>(await api.consultar(elena, 'quien_hace_que', {}));
    const cambiada = despues.find((p) => p.personaId === alguien?.personaId);
    expect(cambiada?.aMano).toBe(!loTenia);
    expect(cambiada?.cambiados).toEqual(['accion.factura_a_mano']);
    const [apunte] = await comoDuena<{ accion: string }>(
      `select accion from estook.auditoria where entidad = 'quien_hace_que' and entidad_id = $1`,
      [alguien?.personaId],
    );
    expect(apunte?.accion).toBe(loTenia ? 'quitar' : 'dar');
    // Devolverlo a lo de fábrica no deja excepción.
    losDatos(
      await api.ejecutar(elena, 'dar_un_permiso', {
        persona_id: alguien?.personaId,
        permiso: 'accion.factura_a_mano',
        tiene: loTenia,
      }),
    );
    const otraVez = losDatos<typeof personas>(await api.consultar(elena, 'quien_hace_que', {}));
    expect(otraVez.find((p) => p.personaId === alguien?.personaId)?.cambiados).toEqual([]);
  });

  it('un gerente no se da permisos a sí mismo, ni por la función ni por la tabla', async () => {
    expect(
      elFallo(
        await api.ejecutar(pablo, 'dar_un_permiso', {
          persona_id: crypto.randomUUID(),
          permiso: 'accion.factura_a_mano',
          tiene: true,
        }),
      ),
    ).toBe('solo_la_direccion');
  });
});

describe('dos NIF a la vez (prueba 6)', () => {
  it('no se mezclan las series ni las claves', async () => {
    const otro = await base.localPorCodigo('bar-faro');
    losDatos(await api.ejecutar(admin, 'admin_poner_la_empresa_de_pruebas', { local_id: otro }));
    // Bar Faro tiene otra empresa, con el NIF que Hacienda conoce: así hay dos NIF emitiendo.
    await comoDuena(
      `update estook.empresa set nif = 'B12345674', nombre = 'IKATZ RESTAURACION SL'
        where id = (select empresa_id from estook.local where id = $1)`,
      [otro],
    );
    const elena = await api.entrar('elena@ejemplo.estook.com');
    losDatos(await api.ejecutar(elena, 'cambiar_de_contexto', { local_id: otro }));
    losDatos(
      await api.ejecutar(elena, 'poner_las_series', {
        ticket: 'T-BF',
        factura: 'F-BF',
        rectificativa: 'R-BF',
        otro_programa: false,
      }),
    );
    const antes = verifacti.registros.length;
    const hechos = await Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        api.ejecutar(i % 2 === 0 ? pablo : elena, 'imprimir_un_ticket_de_prueba', {}),
      ),
    );
    const numeros = hechos.map((r) => losDatos<Hecho>(r).numero);
    const nuevos = verifacti.registros.slice(antes);
    expect(nuevos).toHaveLength(10);
    for (const r of nuevos) {
      // Cada NIF, con su serie: nunca una de Casa Lola en el NIF de Bar Faro.
      expect(r.serie.startsWith(r.nif === 'B12345674' ? 'T-BF' : 'T-CL')).toBe(true);
    }
    expect(numeros.filter((n) => n.startsWith('T-BF'))).toHaveLength(5);
    expect(new Set(numeros).size).toBe(10);
    const correlativos = (prefijo: string) =>
      numeros
        .filter((n) => n.startsWith(prefijo))
        .map((n) => Number(n.slice(-6)))
        .sort((a, b) => a - b);
    const bf = correlativos('T-BF');
    expect(bf).toEqual(bf.map((_, i) => (bf[0] ?? 0) + i));
    const cl = correlativos('T-CL');
    expect(cl).toEqual(cl.map((_, i) => (cl[0] ?? 0) + i));
  });
});

describe('desde el admin no se toca un documento (prueba 2)', () => {
  it('ninguna llamada de la API con la sesión del admin cambia lo emitido', async () => {
    const ticket = await unTicket();
    const antes = await comoDuena(`select * from facturacion.documento where id = $1`, [
      ticket.documentoId,
    ]);
    for (const [comando, entrada] of [
      ['hacer_factura_de_tickets', { ticket_ids: [ticket.documentoId], cliente: EMPRESA }],
      ['marcar_cobrada', { documento_id: ticket.documentoId }],
      ['reimprimir_el_documento', { documento_id: ticket.documentoId }],
      ['mandar_el_documento', { documento_id: ticket.documentoId, para: 'x@ejemplo.es' }],
    ] as const) {
      const r = await api.ejecutar(admin, comando, entrada);
      expect(r.estado, comando).not.toBe('ok');
    }
    expect(
      await comoDuena(`select * from facturacion.documento where id = $1`, [ticket.documentoId]),
    ).toEqual(antes);
    const [{ canjes }] = (await comoDuena<{ canjes: string }>(
      `select count(*)::text as canjes from facturacion.canje where ticket_id = $1`,
      [ticket.documentoId],
    )) as [{ canjes: string }];
    expect(canjes).toBe('0');
  });
});

describe('los cambios de hora (prueba 20)', () => {
  const emitidoEn = async (instante: string) => {
    const original = ahora;
    ahora = new Date(instante);
    try {
      const hecho = await unTicket();
      const [fila] = await comoDuena<{ fecha: string; hora: string }>(
        `select to_char(fecha_operacion, 'YYYY-MM-DD') as fecha,
                to_char(preparado_en at time zone 'Europe/Madrid', 'HH24:MI') as hora
           from facturacion.documento where id = $1`,
        [hecho.documentoId],
      );
      return { ...fila, doc: await elDocumento(hecho.documentoId), numero: hecho.numero };
    } finally {
      ahora = original;
    }
  };

  it('en octubre, la hora que se repite: las dos 02:30 son del mismo día', async () => {
    // 25-oct-2026: de 03:00 CEST se vuelve a 02:00 CET. 00:30 UTC y 01:30 UTC son las dos 02:30.
    const primera = await emitidoEn('2026-10-25T00:30:00Z');
    const segunda = await emitidoEn('2026-10-25T01:30:00Z');
    expect(primera.fecha).toBe('2026-10-25');
    expect(segunda.fecha).toBe('2026-10-25');
    expect(primera.hora).toBe('02:30');
    expect(segunda.hora).toBe('02:30');
  });

  it('en marzo, la hora que no existe: de las 01:59 se salta a las 03:00', async () => {
    // 28-mar-2027: de 02:00 CET se pasa a 03:00 CEST.
    const antes = await emitidoEn('2027-03-28T00:59:00Z');
    const despues = await emitidoEn('2027-03-28T01:00:00Z');
    expect(antes.hora).toBe('01:59');
    expect(despues.hora).toBe('03:00');
    expect(despues.fecha).toBe('2027-03-28');
  });

  it('el año de la serie es el de cuando se hace, en la hora del local', async () => {
    // 22:59 UTC del 31-dic son las 23:59 en Madrid; a las 23:00 UTC ya es año nuevo.
    const nochevieja = await emitidoEn('2026-12-31T22:59:00Z');
    const anoNuevo = await emitidoEn('2026-12-31T23:00:00Z');
    expect(nochevieja.numero).toMatch(/^T-CL-2026-/);
    expect(anoNuevo.numero).toMatch(/^T-CL-2027-/);
    expect(anoNuevo.fecha).toBe('2027-01-01');
  });

  it('una factura de enero por una comida de diciembre va en la serie de enero', async () => {
    const original = ahora;
    ahora = new Date('2027-01-10T12:00:00Z');
    try {
      const hecha = losDatos<Hecho>(
        await api.ejecutar(pablo, 'hacer_factura_a_mano', {
          cliente: EMPRESA,
          lineas: [{ nombre: 'Comida', cantidad: 1, importe: 1_000, tipo: 0.1 }],
          fecha_operacion: '2026-12-20',
          cobrada: true,
        }),
      );
      expect(hecha.numero).toMatch(/^F-CL-2027-/);
      expect(elCuerpo(hecha.numero)?.['fecha_operacion']).toBe('20-12-2026');
    } finally {
      ahora = original;
    }
  });
});

describe('lo que Hacienda no tiene no canjea nada (0138)', { timeout: 30_000 }, () => {
  it('una factura rechazada por los datos deja el ticket libre para hacerla bien', async () => {
    const ticket = await unTicket();
    verifacti.emitirAsi('rechazar');
    const mala = losDatos<Hecho>(
      await api.ejecutar(pablo, 'hacer_factura_de_tickets', {
        ticket_ids: [ticket.documentoId],
        cliente: EMPRESA,
      }),
    );
    verifacti.emitirAsi('normal');
    expect((await elDocumento(mala.documentoId)).estado).toBe('rechazado_por_datos');
    const libre = await elDocumento(ticket.documentoId);
    expect(libre.factura).toBeNull();
    expect(libre.chapa.texto).not.toBe('Canjeado');
    expect(libre.porQueNoSeCanjea).toBeNull();
    const buena = losDatos<Hecho>(
      await api.ejecutar(pablo, 'hacer_factura_de_tickets', {
        ticket_ids: [ticket.documentoId],
        cliente: EMPRESA,
      }),
    );
    expect((await elDocumento(ticket.documentoId)).factura?.id).toBe(buena.documentoId);
    // Y ya con la buena, no se puede una tercera.
    expect(
      elFallo(
        await api.ejecutar(pablo, 'hacer_factura_de_tickets', {
          ticket_ids: [ticket.documentoId],
          cliente: EMPRESA,
        }),
      ),
    ).toBe('faltan_datos');
  });

  it('una que rechaza Hacienda, igual; y no se imprime ni se manda', async () => {
    const ticket = await unTicket();
    const hecha = losDatos<Hecho>(
      await api.ejecutar(pablo, 'hacer_factura_de_tickets', {
        ticket_ids: [ticket.documentoId],
        cliente: EMPRESA,
      }),
    );
    expect((await elDocumento(ticket.documentoId)).chapa.texto).toBe('Canjeado');
    await comoDuena(
      `insert into facturacion.registro (documento_id, en, uuid, estado, por)
       values ($1, $2, 'un-uuid', 'Incorrecto', 'aviso')`,
      [hecha.documentoId, new Date(ahora.getTime() + 1000).toISOString()],
    );
    const rechazada = await elDocumento(hecha.documentoId);
    expect(rechazada.estado).toBe('rechazado');
    expect(rechazada.seEntrega).toBe(false);
    expect(rechazada.papel).not.toBeNull();
    expect((await elDocumento(ticket.documentoId)).factura).toBeNull();
    expect(
      elFallo(
        await api.ejecutar(pablo, 'reimprimir_el_documento', { documento_id: hecha.documentoId }),
      ),
    ).toBe('faltan_datos');
    const mandada = await api.ejecutar(pablo, 'mandar_el_documento', {
      documento_id: hecha.documentoId,
      para: 'cliente@ejemplo.es',
    });
    expect(elFallo(mandada)).toBe('faltan_datos');
    expect(JSON.stringify(mandada)).toContain('Hacienda no lo tiene');
    expect(correo.mandados).toHaveLength(0);
  });

  it('una factura no sustituye un ticket de otro entorno: ni uno de pruebas con una de verdad', async () => {
    // La empresa de pruebas no puede pasar a real: se mira al revés, que para la base es lo mismo.
    const ticket = await unTicket();
    const [otro] = await comoDuena<{ id: string }>(
      `insert into facturacion.documento (
         empresa_id, local_id, serie_id, entorno, modalidad, tipo, serie, numero, fecha_operacion,
         descripcion, lineas, desglose, base, cuota, total, empresa_copia, origen, preparado_en
       )
       select empresa_id, local_id, serie_id, 'real', modalidad, tipo, 'T-DE-VERDAD-', 1,
              fecha_operacion, descripcion, lineas, desglose, base, cuota, total, empresa_copia,
              'cobro', preparado_en
         from facturacion.documento where id = $1
       returning id`,
      [ticket.documentoId],
    );
    await comoDuena(
      `insert into facturacion.registro (documento_id, en, uuid, estado, por)
       values ($1, $2, 'uuid-de-verdad', 'Correcto', 'consulta')`,
      [otro?.id, ahora.toISOString()],
    );
    const antes = verifacti.registros.length;
    expect(
      elFallo(
        await api.ejecutar(pablo, 'hacer_factura_de_tickets', {
          ticket_ids: [otro?.id],
          cliente: EMPRESA,
        }),
      ),
    ).toBe('faltan_datos');
    expect(verifacti.registros.length).toBe(antes);
    const [{ canjes }] = (await comoDuena<{ canjes: string }>(
      `select count(*)::text as canjes from facturacion.canje where ticket_id = $1`,
      [otro?.id],
    )) as [{ canjes: string }];
    expect(canjes).toBe('0');
  });
});

describe('las cuentas de la lista (0138)', { timeout: 30_000 }, () => {
  interface Lista {
    documentos: { id: string }[];
    cuantos: number;
    total: number;
    correctos: number;
  }
  const laLista = async (parametros: Record<string, string>) =>
    losDatos<Lista>(await api.consultar(pablo, 'tickets_y_facturas', parametros));

  const unDia = async <T>(instante: string, hacer: () => Promise<T>): Promise<T> => {
    const original = ahora;
    ahora = new Date(instante);
    try {
      return await hacer();
    } finally {
      ahora = original;
    }
  };

  it('un ticket canjeado y su factura son una sola venta; solos, cada uno suma', async () => {
    await unDia('2026-11-25T12:00:00Z', async () => {
      const ticket = await unTicket();
      losDatos<Hecho>(
        await api.ejecutar(pablo, 'hacer_factura_de_tickets', {
          ticket_ids: [ticket.documentoId],
          cliente: EMPRESA,
        }),
      );
      const todos = await laLista({});
      expect(todos.cuantos).toBe(2);
      expect(todos.total).toBe(270);
      expect((await laLista({ que: 'tickets' })).total).toBe(270);
      expect((await laLista({ que: 'facturas' })).total).toBe(270);
    });
  });

  it('una factura rechazada no suma, y su ticket sí', async () => {
    await unDia('2026-11-26T12:00:00Z', async () => {
      const ticket = await unTicket();
      verifacti.emitirAsi('rechazar');
      losDatos<Hecho>(
        await api.ejecutar(pablo, 'hacer_factura_de_tickets', {
          ticket_ids: [ticket.documentoId],
          cliente: EMPRESA,
        }),
      );
      verifacti.emitirAsi('normal');
      const todos = await laLista({});
      expect(todos.cuantos).toBe(2);
      expect(todos.total).toBe(270);
    });
  });

  it('«Con algo pendiente» no deja fuera nada, y lo que está bien no sale', async () => {
    await unDia('2026-11-27T12:00:00Z', async () => {
      const pendiente = await unTicket();
      const bien = await unTicket();
      await comoDuena(
        `insert into facturacion.registro (documento_id, en, uuid, estado, por)
         values ($1, '2026-11-27T12:01:00Z', 'otro-uuid', 'Correcto', 'aviso')`,
        [bien.documentoId],
      );
      const lista = await laLista({ que: 'pendiente' });
      expect(lista.documentos.map((d) => d.id)).toEqual([pendiente.documentoId]);
      expect((await laLista({})).correctos).toBe(1);
    });
  });

  it('con más de quinientos, las cifras son de todos aunque la lista enseñe los últimos', async () => {
    const ticket = await unDia('2026-11-28T12:00:00Z', unTicket);
    await comoDuena(
      `insert into facturacion.documento (
         empresa_id, local_id, serie_id, entorno, modalidad, tipo, serie, numero, fecha_operacion,
         descripcion, lineas, desglose, base, cuota, total, empresa_copia, origen, preparado_en
       )
       select empresa_id, local_id, serie_id, entorno, 'fuera_sii', tipo, 'T-MUCHOS-', n, fecha_operacion,
              descripcion, lineas, desglose, base, cuota, total, empresa_copia, origen,
              '2026-11-29T12:00:00Z'::timestamptz + (n || ' seconds')::interval
         from facturacion.documento, generate_series(1, 505) n
        where id = $1`,
      [ticket.documentoId],
    );
    const lista = await laLista({ desde: '2026-11-29', hasta: '2026-11-29' });
    expect(lista.documentos).toHaveLength(500);
    expect(lista.cuantos).toBe(505);
    expect(lista.total).toBe(505 * 270);
    expect(lista.correctos).toBe(505);
  });

  it('una fecha que no existe no llega a la base', async () => {
    const r = await api.consultar(pablo, 'tickets_y_facturas', {
      desde: '2026-02-31',
      hasta: '2026-03-01',
    });
    expect(elFallo(r)).toBe('faltan_datos');
  });
});

describe('lo que se manda otro día (Anexo 4.11; 0138)', { timeout: 30_000 }, () => {
  it('se pregunta con la fecha de la operación, y el papel lleva la fecha que tiene Hacienda', async () => {
    const original = ahora;
    ahora = new Date('2026-12-02T12:00:00Z');
    try {
      await comoDuena(
        `update plataforma.reloj set huella = encode(sha256(convert_to($1, 'UTF8')), 'hex')`,
        ['el-secreto-del-reloj-de-las-facturas'],
      );
      verifacti.emitirAsi('caido');
      const hecha = losDatos<Hecho>(
        await api.ejecutar(pablo, 'hacer_factura_a_mano', {
          cliente: EMPRESA,
          lineas: [{ nombre: 'Comida', cantidad: 1, importe: 1_000, tipo: 0.1 }],
          fecha_operacion: '2026-11-30',
          cobrada: true,
        }),
      );
      verifacti.emitirAsi('normal');
      ahora = new Date('2026-12-03T12:00:00Z');
      await api.despachador.repasarDocumentos(
        { tokenDeSesion: null, correlacionId: crypto.randomUUID() },
        'el-secreto-del-reloj-de-las-facturas',
      );
      expect(
        verifacti.llamadas.some(
          (l) => l.includes(hecha.numero.slice(-6)) && l.includes('operación 30-11-2026'),
        ),
      ).toBe(true);
      const { estado, papel } = await elDocumento(hecha.documentoId);
      expect(estado).toBe('pendiente');
      expect(elCuerpo(hecha.numero)?.['fecha_expedicion']).toBe('03-12-2026');
      const texto = JSON.stringify(papel);
      expect(texto).toContain('03/12/2026');
      expect(texto).toContain('30/11/2026');
      expect(texto).not.toContain('02/12/2026');
    } finally {
      ahora = original;
    }
  });
});

describe('la historia, por su momento', () => {
  it('lo de pasada la medianoche sale después, con su día', async () => {
    const original = ahora;
    ahora = new Date('2026-11-20T22:59:50Z'); // 23:59:50 en Madrid
    try {
      const hecho = await unTicket();
      await comoDuena(
        `insert into facturacion.copia_mandada (documento_id, para, en)
         values ($1, 'x@ejemplo.es', '2026-11-20T23:10:00Z')`,
        [hecho.documentoId],
      );
      const { historia } = await elDocumento(hecho.documentoId);
      const ultimo = historia.at(-1);
      expect(ultimo?.que).toBe('Mandada por correo a x@ejemplo.es');
      expect(ultimo?.hora).toBe('21/11 00:10:00');
    } finally {
      ahora = original;
    }
  });
});
