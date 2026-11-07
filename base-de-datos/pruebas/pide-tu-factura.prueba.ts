import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { elCodigoEscrito, elCodigoParaEnsenar } from '../../packages/dominio/src/index.ts';
import { codigoEn } from '../../servidor/dominio/doble-factor.ts';
import { verifactiDeMentira } from '../../servidor/facturacion/verifacti-de-mentira.ts';
import { correoEnMemoria } from '../../servidor/infraestructura/correo.ts';
import { pdfDeMentira } from '../../servidor/infraestructura/pdf.ts';
import {
  ADMIN_DE_EJEMPLO,
  CLAVE_DE_EJEMPLO,
  SECRETO_DEL_ADMIN_DE_EJEMPLO,
} from '../semillas/acceso.ts';
import { levantarBase, type BaseDePrueba } from './entorno.ts';
import { elFallo, losDatos, montarLaApi, type ApiDePrueba } from './despachador.ts';

/**
 * T6 · 2 · 3 · Pide tu factura (decisión 0141, migración 0111), contra Postgres de verdad y con el
 * Verifacti de mentira. **Todo sin sesión**: lo único que abre la puerta es el código del ticket.
 *
 *   · la factura se hace, es una F3 con el importe del ticket y le llega al correo cuando Hacienda la tiene
 *   · no enseña nada a quien no debe: ni el correo, ni el NIF, ni el domicilio de nadie
 *   · cada ticket, una vez; volver a mandarla, al mismo correo y con su límite
 *   · lo que Hacienda rechaza le llega a quien la pidió, y lo que se corrige, también
 *   · el código del justificante recoge el ticket (Anexo 4.11)
 */

const SECRETO_DEL_RELOJ = 'el-secreto-del-reloj-de-pide-tu-factura';
const UN_MINUTO = 60_000;

let base: BaseDePrueba;
let api: ApiDePrueba;
const verifacti = verifactiDeMentira();
const pdf = pdfDeMentira();
const mandados = correoEnMemoria();
let correoRoto = false;
let ahora = new Date('2026-11-07T13:31:00Z');
let rosa: string;
let barCentro: string;

const comoDuena = async <T>(texto: string, valores: unknown[] = []) =>
  (await base.bd.query<T>(texto, valores)).rows;

interface Hecho {
  documentoId: string;
  numero: string;
}

interface LoQueEnsena {
  dice: string;
  local: string;
  numero: string;
  total: number;
  fecha: string;
  pruebas: boolean;
  seDescarga: boolean;
  conCorreo: boolean;
  rechazada: boolean;
}

interface UnDocumento {
  id: string;
  numero: string;
  tipo: string;
  total: number;
  estado: string;
  pedidaPorElCliente: boolean;
  codigoParaPedirla: string | null;
  correoDelClienteNoSalio: boolean;
  historia: { que: string; detalle: string | null }[];
  factura: { id: string; numero: string } | null;
  corregidaPor: { id: string; numero: string } | null;
  loQueFalla: { numero: string } | null;
  destinatario: { nombre: string; identificador: string; domicilio: string } | null;
}

const EMPRESA = {
  clase: 'empresa',
  nombre: '',
  identificador: 'B84935048',
  domicilio: 'Pol. Ugaldeguren 4, Zamudio',
} as const;
const CORREO = 'admin@ejemplo.es';

const elDocumento = async (id: string) =>
  losDatos<UnDocumento>(await api.consultar(rosa, 'un_documento', { documento_id: id }));

const elRegistroDe = (numero: string) => {
  const r = verifacti.registros.find(
    (x) => x.numero === numero.slice(-6) && numero.startsWith(x.serie) && x.operacion === 'Alta',
  );
  if (r === undefined) throw new Error(`Verifacti no tiene ${numero}`);
  return r;
};

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

const unTicketSinContestar = async (): Promise<Hecho & { codigo: string }> => {
  const ticket = losDatos<Hecho>(await api.ejecutar(rosa, 'imprimir_un_ticket_de_prueba', {}));
  const { codigoParaPedirla } = await elDocumento(ticket.documentoId);
  if (codigoParaPedirla === null) throw new Error('Sin código');
  return { ...ticket, codigo: codigoParaPedirla };
};

const unTicket = async () => {
  const ticket = await unTicketSinContestar();
  await correcto(ticket.numero);
  return ticket;
};

const abrir = (codigo: string) => api.ejecutar(null, 'abrir_pide_tu_factura', { codigo });
const queEnsena = async (codigo: string) => losDatos<LoQueEnsena>(await abrir(codigo));
const pedir = (codigo: string, cliente: unknown = EMPRESA, correo = CORREO) =>
  api.ejecutar(null, 'pedir_mi_factura', { codigo, cliente, correo });

const laFacturaDe = async (ticketId: string) => {
  const { factura } = await elDocumento(ticketId);
  if (factura === null) throw new Error('Sin factura');
  return factura;
};

const lasQueSeMandaronA = (para: string) => mandados.mandados.filter((c) => c.para === para);

beforeAll(async () => {
  base = await levantarBase();
  api = montarLaApi(base.bd, {
    facturacion: verifacti,
    pdf,
    correo: {
      mandar(correo) {
        if (correoRoto) return Promise.reject(new Error('El correo no contesta'));
        return mandados.mandar(correo);
      },
    },
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

describe('el código de cada ticket', { timeout: 30_000 }, () => {
  it('cada ticket nace con el suyo, y solo los tickets', async () => {
    const ticket = await unTicketSinContestar();
    expect(ticket.codigo).toMatch(/^[0-9A-HJKMNP-TV-Z]{12}$/);
    const otro = await unTicketSinContestar();
    expect(otro.codigo).not.toBe(ticket.codigo);
    const [sinCodigo] = await comoDuena<{ cuantos: number }>(
      `select count(*)::int as cuantos from facturacion.documento d
        where d.tipo = 'F2'
          and not exists (select 1 from facturacion.codigo_de_ticket c where c.documento_id = d.id)`,
    );
    expect(sinCodigo?.cuantos).toBe(0);
  });

  it('se puede escribir como venga en el papel', async () => {
    const ticket = await unTicketSinContestar();
    const copiado = elCodigoParaEnsenar(ticket.codigo).toLowerCase();
    expect(elCodigoEscrito(copiado)).toBe(ticket.codigo);
    expect((await queEnsena(copiado)).numero).toBe(ticket.numero);
  });

  it('el que no es de nadie no existe, y eso gasta un intento de esa dirección', async () => {
    const quien = () => ({
      tokenDeSesion: null,
      correlacionId: crypto.randomUUID(),
      desde: '203.0.113.7',
    });
    const probar = (codigo: string) =>
      api.despachador.ejecutar(quien(), 'abrir_pide_tu_factura', { codigo }, crypto.randomUUID());

    expect(elFallo(await abrir('NOEXISTE1234'))).toBe('no_existe');
    expect(elFallo(await abrir('una-cosa-que-no-es'))).toBe('no_existe');
    const bueno = await unTicket();
    for (let i = 0; i < 30; i += 1) {
      const r = await probar('0000000000AA');
      expect(r.estado).toBe('fallo');
    }
    // Sin intentos, tampoco uno bueno: no se puede distinguir cuál existe.
    const pasado = await probar(bueno.codigo);
    expect(pasado).toMatchObject({ estado: 'fallo', codigo: 'demasiados_intentos' });
    // Otra dirección sigue igual, y a la hora vuelve a poder: esa dirección ya no se guarda.
    expect((await queEnsena(bueno.codigo)).dice).toBe('puede');
    ahora = new Date(ahora.getTime() + 61 * UN_MINUTO);
    expect((await probar(bueno.codigo)).estado).toBe('ok');
    await abrir('0000000000AB');
    const guardadas = await comoDuena<{ cuantos: number }>(
      `select count(*)::int as cuantos from facturacion.intento_de_la_pagina
        where en < $1::timestamptz - interval '1 hour'`,
      [ahora.toISOString()],
    );
    expect(guardadas[0]?.cuantos).toBe(0);
  });
});

describe('pedir la factura', { timeout: 30_000 }, () => {
  it('solo cuando Hacienda tiene el ticket; hasta entonces, la página espera', async () => {
    const ticket = await unTicketSinContestar();
    expect((await queEnsena(ticket.codigo)).dice).toBe('todavia');
    expect(elFallo(await pedir(ticket.codigo))).toBe('faltan_datos');
    await correcto(ticket.numero);
    expect(await queEnsena(ticket.codigo)).toMatchObject({
      dice: 'puede',
      numero: ticket.numero,
      local: expect.any(String) as string,
      total: 270,
      fecha: expect.stringMatching(/^\d+-[a-z]{3}-2026$/) as string,
      pruebas: true,
      seDescarga: true,
      rechazada: false,
    });
  });

  it('sale una F3 con el importe del ticket, y el correo llega cuando Hacienda la tiene', async () => {
    const ticket = await unTicket();
    const antes = lasQueSeMandaronA(CORREO).length;
    expect(losDatos(await pedir(ticket.codigo))).toEqual({ correo: CORREO });

    const factura = await laFacturaDe(ticket.documentoId);
    const hecha = await elDocumento(factura.id);
    expect(hecha.tipo).toBe('F3');
    expect(hecha.total).toBe(270);
    expect(hecha.pedidaPorElCliente).toBe(true);
    // El nombre es el que tiene Hacienda, no uno que se escriba.
    expect(hecha.destinatario?.nombre).toBe('EJEMPLO NORTE SL');
    expect(hecha.historia[0]?.que).toBe('La pidió el cliente desde su móvil');

    // Hacienda no ha contestado: todavía no se manda, aunque pase el reloj.
    await repasar();
    expect(lasQueSeMandaronA(CORREO).length).toBe(antes);

    await correcto(factura.numero);
    const llegaron = lasQueSeMandaronA(CORREO);
    expect(llegaron.length).toBe(antes + 1);
    expect(llegaron.at(-1)?.adjuntos?.[0]?.nombre).toBe(`${factura.numero}.pdf`);
    const despues = await elDocumento(factura.id);
    expect(despues.historia.map((p) => p.que)).toContain(`Mandada por correo a ${CORREO}`);

    // Y el reloj ya no lo vuelve a mandar.
    await repasar();
    expect(lasQueSeMandaronA(CORREO).length).toBe(antes + 1);
    const cola = await comoDuena(
      `select 1 from facturacion.correo_por_mandar where factura_id = $1`,
      [factura.id],
    );
    expect(cola).toHaveLength(0);
  });

  it('un autónomo o un particular, con su nombre; y uno de fuera, con su pasaporte', async () => {
    const delMovil = await unTicket();
    const dijo = losDatos<{ vale: boolean; dice: string | null }>(
      await api.ejecutar(null, 'comprobar_en_pide_tu_factura', {
        codigo: delMovil.codigo,
        clase: 'particular',
        identificador: '12345678Z',
      }),
    );
    // Sin nombre, Hacienda no puede mirar a una persona: no es un error, es que falta.
    expect(dijo).toMatchObject({ vale: true, dice: null });

    const deFuera = await unTicket();
    losDatos(
      await pedir(
        deFuera.codigo,
        {
          clase: 'de_fuera',
          nombre: 'Marie Exemple',
          identificador: '24AB12345',
          id_tipo: '03',
          codigo_pais: 'FR',
          domicilio: '8 rue de la Paix, Bayonne',
        },
        'marie@ejemplo.fr',
      ),
    );
    const factura = await elDocumento((await laFacturaDe(deFuera.documentoId)).id);
    expect(factura.destinatario).toMatchObject({
      nombre: 'Marie Exemple',
      identificador: '24AB12345',
    });
  });

  it('un NIF que Hacienda no conoce no hace factura, y el intento queda contado', async () => {
    const ticket = await unTicket();
    const mal = { ...EMPRESA, identificador: 'B00000000' };
    const antes = verifacti.registros.length;
    expect(elFallo(await pedir(ticket.codigo, mal))).toBe('nif_no_vale');
    expect(verifacti.registros.length).toBe(antes);
    expect((await elDocumento(ticket.documentoId)).factura).toBeNull();

    const [contados] = await comoDuena<{ cuantos: number }>(
      `select count(*)::int as cuantos from facturacion.intento_de_la_pagina
        where clase = 'comprobar' and ticket_id = $1`,
      [ticket.documentoId],
    );
    expect(contados?.cuantos).toBe(1);
  });

  it('no se puede preguntar a Hacienda sin límite por NIF ajenos', async () => {
    const ticket = await unTicket();
    const preguntar = () =>
      api.ejecutar(null, 'comprobar_en_pide_tu_factura', {
        codigo: ticket.codigo,
        clase: 'empresa',
        identificador: 'B84935048',
      });
    for (let i = 0; i < 10; i += 1) losDatos(await preguntar());
    expect(elFallo(await preguntar())).toBe('demasiados_intentos');
    expect(elFallo(await pedir(ticket.codigo))).toBe('demasiados_intentos');
    // A la hora, vuelve a poder.
    ahora = new Date(ahora.getTime() + 61 * UN_MINUTO);
    losDatos(await preguntar());
  });
});

describe('cada ticket, una vez, y sin enseñar nada', { timeout: 30_000 }, () => {
  it('después solo dice que ya tiene factura: ni su correo, ni su NIF, ni su domicilio', async () => {
    const ticket = await unTicket();
    losDatos(await pedir(ticket.codigo));
    const ensena = await queEnsena(ticket.codigo);
    expect(ensena).toMatchObject({ dice: 'ya_tiene', conCorreo: true, seDescarga: false });
    const todo = JSON.stringify(ensena);
    expect(todo).not.toContain(CORREO);
    expect(todo).not.toContain(EMPRESA.identificador);
    expect(todo).not.toContain('Ugaldeguren');
    expect(todo).not.toContain('EJEMPLO NORTE');
  });

  it('una segunda vez no hace otra factura', async () => {
    const ticket = await unTicket();
    losDatos(await pedir(ticket.codigo));
    const antes = verifacti.registros.length;
    expect(elFallo(await pedir(ticket.codigo, EMPRESA, 'otro@ejemplo.es'))).toBe('faltan_datos');
    expect(verifacti.registros.length).toBe(antes);
    expect(lasQueSeMandaronA('otro@ejemplo.es')).toHaveLength(0);
  });

  it('se manda otra vez al mismo correo, nunca a uno nuevo, y con su límite', async () => {
    const para = 'reenviar@ejemplo.es';
    const ticket = await unTicket();
    losDatos(await pedir(ticket.codigo, EMPRESA, para));
    const factura = await laFacturaDe(ticket.documentoId);
    await correcto(factura.numero);
    expect(lasQueSeMandaronA(para)).toHaveLength(1);

    // La entrada no admite otro correo.
    expect(
      elFallo(
        await api.ejecutar(null, 'mandar_otra_vez_mi_factura', {
          codigo: ticket.codigo,
          para: 'otro@ejemplo.es',
        }),
      ),
    ).toBe('faltan_datos');

    for (let i = 0; i < 3; i += 1) {
      losDatos(await api.ejecutar(null, 'mandar_otra_vez_mi_factura', { codigo: ticket.codigo }));
      await repasar();
    }
    expect(lasQueSeMandaronA(para)).toHaveLength(4);
    expect(
      elFallo(await api.ejecutar(null, 'mandar_otra_vez_mi_factura', { codigo: ticket.codigo })),
    ).toBe('demasiados_intentos');
  });

  it('la que hizo el equipo sin mandarla a nadie: no hay a dónde', async () => {
    const ticket = await unTicket();
    losDatos(
      await api.ejecutar(rosa, 'hacer_factura_de_tickets', {
        ticket_ids: [ticket.documentoId],
        cliente: EMPRESA,
      }),
    );
    expect(await queEnsena(ticket.codigo)).toMatchObject({ dice: 'ya_tiene', conCorreo: false });
    expect(
      elFallo(await api.ejecutar(null, 'mandar_otra_vez_mi_factura', { codigo: ticket.codigo })),
    ).toBe('faltan_datos');
  });

  it('sin el código no se ve nada: las tablas no se leen sin ser el sistema', async () => {
    const ticket = await unTicket();
    losDatos(await pedir(ticket.codigo));
    await base.bd.exec('begin');
    try {
      await base.bd.exec('set local role estook_api');
      await base.bd.query("select set_config('estook.persona_id', '', true)");
      for (const tabla of [
        'codigo_de_ticket',
        'pedida',
        'correo_por_mandar',
        'intento_de_la_pagina',
      ]) {
        const { rows } = await base.bd.query(`select * from facturacion.${tabla}`);
        expect(rows).toHaveLength(0);
      }
      await expect(
        base.bd.query(`select facturacion.apuntar_un_intento('codigo', null, null, now())`),
      ).rejects.toThrow('sin_permiso');
    } finally {
      await base.bd.exec('rollback');
    }
  });
});

describe('cuando no se puede', { timeout: 30_000 }, () => {
  it('si el local la apaga: lo dice, no se hace, y el ticket se sigue pudiendo descargar', async () => {
    const ticket = await unTicket();
    losDatos(await api.ejecutar(rosa, 'poner_pide_tu_factura', { encendido: false }));
    try {
      expect(await queEnsena(ticket.codigo)).toMatchObject({ dice: 'apagada', seDescarga: true });
      expect(elFallo(await pedir(ticket.codigo))).toBe('faltan_datos');
      expect((await elDocumento(ticket.documentoId)).codigoParaPedirla).toBeNull();
      const pdfDelTicket = losDatos<{ nombre: string; base64: string }>(
        await api.ejecutar(null, 'descargar_mi_ticket', { codigo: ticket.codigo }),
      );
      expect(pdfDelTicket.nombre).toBe(`${ticket.numero}.pdf`);
    } finally {
      losDatos(await api.ejecutar(rosa, 'poner_pide_tu_factura', { encendido: true }));
    }
  });

  it('lo anulado o lo devuelto no se factura, ni se descarga', async () => {
    const anulado = await unTicket();
    losDatos(
      await api.ejecutar(rosa, 'anular_el_documento', {
        documento_id: anulado.documentoId,
        motivo: 'Salió repetido al probar',
      }),
    );
    expect(await queEnsena(anulado.codigo)).toMatchObject({
      dice: 'no_se_puede',
      seDescarga: false,
    });
    expect((await elDocumento(anulado.documentoId)).codigoParaPedirla).toBeNull();

    const devuelto = await unTicket();
    losDatos(
      await api.ejecutar(rosa, 'devolver_el_documento', {
        documento_id: devuelto.documentoId,
        que: 'partes',
        partes: [{ linea: 0, cantidad: 1 }],
        motivo: 'mal_hecho',
      }),
    );
    expect((await queEnsena(devuelto.codigo)).dice).toBe('no_se_puede');
    expect(elFallo(await pedir(devuelto.codigo))).toBe('faltan_datos');
    expect(
      elFallo(await api.ejecutar(null, 'descargar_mi_ticket', { codigo: devuelto.codigo })),
    ).toBe('faltan_datos');
  });
});

describe('lo que Hacienda rechaza', { timeout: 30_000 }, () => {
  const rechazar = async (numero: string) => {
    verifacti.decirHacienda(elRegistroDe(numero).uuid, 'Incorrecto', '1100', 'El NIF no cuadra');
    await repasar();
  };

  it('se le dice a quien la pidió, y el ticket queda libre para volver a pedirla', async () => {
    const para = 'rechazo@ejemplo.es';
    const ticket = await unTicket();
    losDatos(await pedir(ticket.codigo, EMPRESA, para));
    const primera = await laFacturaDe(ticket.documentoId);
    await rechazar(primera.numero);

    const aviso = lasQueSeMandaronA(para);
    expect(aviso).toHaveLength(1);
    expect(aviso[0]?.adjuntos ?? []).toHaveLength(0);
    expect(aviso[0]?.texto).toContain(
      `https://estook.com/factura/${elCodigoParaEnsenar(ticket.codigo)}`,
    );
    expect(aviso[0]?.texto).not.toContain('Ugaldeguren');
    expect(await queEnsena(ticket.codigo)).toMatchObject({ dice: 'puede', rechazada: true });
    expect((await elDocumento(primera.id)).loQueFalla).not.toBeNull();

    // Lo repite él: la nueva corrige a la rechazada, que deja de salir arriba.
    losDatos(await pedir(ticket.codigo, EMPRESA, para));
    const segunda = await laFacturaDe(ticket.documentoId);
    expect(segunda.id).not.toBe(primera.id);
    const rechazada = await elDocumento(primera.id);
    expect(rechazada.loQueFalla).toBeNull();
    expect(rechazada.corregidaPor?.id).toBe(segunda.id);

    await correcto(segunda.numero);
    expect(lasQueSeMandaronA(para)).toHaveLength(2);
    expect(lasQueSeMandaronA(para)[1]?.adjuntos?.[0]?.nombre).toBe(`${segunda.numero}.pdf`);
  });

  it('si la corrige el equipo, le llega la corregida al mismo correo', async () => {
    const para = 'corrige@ejemplo.es';
    const ticket = await unTicket();
    losDatos(await pedir(ticket.codigo, EMPRESA, para));
    const primera = await laFacturaDe(ticket.documentoId);
    await rechazar(primera.numero);
    const nueva = losDatos<Hecho>(
      await api.ejecutar(rosa, 'corregir_lo_rechazado', { documento_id: primera.id }),
    );
    const corregida = await elDocumento(nueva.documentoId);
    expect(corregida.pedidaPorElCliente).toBe(true);
    expect((await queEnsena(ticket.codigo)).dice).toBe('ya_tiene');

    await correcto(nueva.numero);
    const llegaron = lasQueSeMandaronA(para);
    expect(llegaron.at(-1)?.adjuntos?.[0]?.nombre).toBe(`${nueva.numero}.pdf`);
  });
});

describe('el correo que no sale', { timeout: 30_000 }, () => {
  it('se reintenta, se deja de intentar y lo dice Tickets y facturas hasta que se manda', async () => {
    const para = 'roto@ejemplo.es';
    const ticket = await unTicket();
    losDatos(await pedir(ticket.codigo, EMPRESA, para));
    const factura = await laFacturaDe(ticket.documentoId);
    correoRoto = true;
    try {
      verifacti.decirHacienda(elRegistroDe(factura.numero).uuid, 'Correcto');
      // Cinco esperas (1, 5, 15, 60 y 240 minutos) y el último intento.
      for (let i = 0; i < 7; i += 1) {
        await repasar();
        ahora = new Date(ahora.getTime() + 241 * UN_MINUTO);
      }
    } finally {
      correoRoto = false;
    }
    expect((await elDocumento(factura.id)).correoDelClienteNoSalio).toBe(true);
    // Ya no se intenta sola.
    await repasar();
    expect(lasQueSeMandaronA(para)).toHaveLength(0);

    // Volverla a pedir la vuelve a poner en la cola.
    losDatos(await api.ejecutar(null, 'mandar_otra_vez_mi_factura', { codigo: ticket.codigo }));
    expect((await elDocumento(factura.id)).correoDelClienteNoSalio).toBe(false);
    await repasar();
    expect(lasQueSeMandaronA(para)).toHaveLength(1);
  });
});

describe('recoger el ticket con el justificante (Anexo 4.11)', { timeout: 30_000 }, () => {
  it('con su código, en cuanto se emite', async () => {
    verifacti.emitirAsi('caido');
    let justificante: string;
    let numero: string;
    try {
      const ticket = losDatos<Hecho>(await api.ejecutar(rosa, 'imprimir_un_ticket_de_prueba', {}));
      numero = ticket.numero;
      const [fila] = await comoDuena<{ codigo: string }>(
        `select codigo from facturacion.justificante where documento_id = $1`,
        [ticket.documentoId],
      );
      justificante = fila?.codigo ?? '';
      expect(justificante).toMatch(/^J-[0-9A-F]{10}$/);
      expect((await queEnsena(justificante)).dice).toBe('todavia');
      expect((await queEnsena(justificante.toLowerCase().replace('-', ''))).numero).toBe(numero);
      expect(
        elFallo(await api.ejecutar(null, 'descargar_mi_ticket', { codigo: justificante })),
      ).toBe('faltan_datos');
    } finally {
      verifacti.emitirAsi('normal');
    }
    await repasar();
    await correcto(numero);
    expect(await queEnsena(justificante)).toMatchObject({ dice: 'puede', seDescarga: true });
    const elPdf = losDatos<{ nombre: string }>(
      await api.ejecutar(null, 'descargar_mi_ticket', { codigo: justificante }),
    );
    expect(elPdf.nombre).toBe(`${numero}.pdf`);
  });
});

describe('lo que se escribe en la base', { timeout: 30_000 }, () => {
  it('una factura pedida solo la prepara el sistema: con sesión no se puede pasar por una', async () => {
    const ticket = await unTicket();
    await base.bd.exec('begin');
    try {
      await base.bd.exec('set local role estook_api');
      await base.bd.query("select set_config('estook.persona_id', '', true)");
      await expect(
        base.bd.query(
          `select * from facturacion.preparar_el_documento(
             $1::uuid, 'F3', '2026-11-07'::date, 'Una', '[]'::jsonb, '[]'::jsonb, 0, 0, 0, null,
             'pedida', null, now()
           )`,
          [barCentro],
        ),
      ).rejects.toThrow('sin_permiso');
    } finally {
      await base.bd.exec('rollback');
    }
    await base.bd.exec('begin');
    try {
      await base.bd.exec('set local role estook_api');
      await expect(
        base.bd.query(`select facturacion.apuntar_lo_pedido($1::uuid, $1::uuid, 'a@b.es', now())`, [
          ticket.documentoId,
        ]),
      ).rejects.toThrow('sin_permiso');
    } finally {
      await base.bd.exec('rollback');
    }
  });

  it('el reloj de los documentos mira también los correos', async () => {
    const { readFile } = await import('node:fs/promises');
    const migracion = await readFile(
      new URL('../migraciones/0111_pide_tu_factura.sql', import.meta.url),
      'utf8',
    );
    expect(migracion).toMatch(
      /select 1 from facturacion\.correo_por_mandar c where c\.siguiente_en <= now\(\)/,
    );
    expect(migracion).toMatch(/select 1 from facturacion\.por_repasar p/);
  });
});
