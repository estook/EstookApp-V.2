import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { elEstadoDeVerifacti, faltaAlgo } from '@estook/dominio';
import { codigoEn } from '../../servidor/dominio/doble-factor.ts';
import { verifactiDeMentira } from '../../servidor/facturacion/verifacti-de-mentira.ts';
import { laFirmaDelAviso } from '../../servidor/aplicacion/emitir.ts';
import { ponerElAvisadorDeFallos } from '../../servidor/infraestructura/fallos.ts';
import {
  ADMIN_DE_EJEMPLO,
  CLAVE_DE_EJEMPLO,
  SECRETO_DEL_ADMIN_DE_EJEMPLO,
} from '../semillas/acceso.ts';
import { levantarBase, type BaseDePrueba } from './entorno.ts';
import { elFallo, losDatos, montarLaApi, type ApiDePrueba } from './despachador.ts';

/**
 * T6 · 2 · 1 · El motor y el ticket (decisión 0136, migración 0106), contra Postgres de verdad y
 * con el Verifacti de mentira. Las pruebas del capítulo 8 del Anexo que le tocan, con su número:
 *
 *   · 1 y 9   lo fiscal no se cambia, ni se borra, ni se vacía, con ningún rol
 *   · 3       las claves de Verifacti no salen en ninguna respuesta
 *   · 4       muchos a la vez: numeración correlativa, sin huecos ni duplicados
 *   · 5       un rechazo por los datos no llega a Hacienda, y su número queda usado (A4)
 *   · 7       Verifacti registra y la respuesta se pierde: al repetir, un solo registro
 *   · 8       lo que se quedó «enviando» lo termina el reloj
 *   · 14      Verifacti caído: el justificante con su código, y se emite al volver, en orden
 *   · 15      lo que rechaza Hacienda sale arriba, en llano, y el original no se toca
 *   · 16      el mismo aviso dos veces no cambia nada
 *   · 17      lo que sigue pendiente se pregunta solo: en cada latido hasta los cinco minutos, y
 *             después cada cinco y cada hora
 *   · 19      a las 02:30, la fecha es la del día real, no la de la jornada
 *
 * **Y el reloj de los documentos** (0138): las de arriba llaman a lo que llama `pg_cron`. Que
 * `pg_cron` lo llame de verdad lo miran su migración, `api.prueba.ts` y `bd:comprobar-api`.
 */

let base: BaseDePrueba;
let api: ApiDePrueba;
const verifacti = verifactiDeMentira();
let ahora = new Date('2026-11-06T13:31:00Z');
let pablo: string;
let casaLola: string;
const SECRETO_DEL_RELOJ = 'el-secreto-del-reloj-de-emitir';
const SECRETO_DE_LOS_AVISOS = 'el-secreto-de-los-avisos-de-verifacti';
const UN_MINUTO = 60_000;

const comoDuena = async <T>(texto: string, valores: unknown[] = []) =>
  (await base.bd.query<T>(texto, valores)).rows;

interface UnDocumento {
  id: string;
  numero: string;
  estado: string;
  chapa: { texto: string };
  justificante: string | null;
  historia: { que: string; detalle: string | null }[];
  papel: { version: number; piezas: { tipo: string; texto?: string; contenido?: string }[] } | null;
  url: string | null;
  loQueFalla: { que: string; hacer: string } | null;
}

interface Lista {
  documentos: { id: string; numero: string; estado: string; chapa: { texto: string } }[];
  loQueFalla: { id: string; que: string; hacer: string }[];
  tardan: number;
  cuantos: number;
  enPruebas: boolean;
}

async function unTicket(): Promise<{ documentoId: string; numero: string }> {
  return losDatos(await api.ejecutar(pablo, 'imprimir_un_ticket_de_prueba', {}));
}

const elDocumento = async (id: string) =>
  losDatos<UnDocumento>(await api.consultar(pablo, 'un_documento', { documento_id: id }));

const laLista = async () => losDatos<Lista>(await api.consultar(pablo, 'tickets_y_facturas'));

const losPapeles = async () =>
  comoDuena<{ tipo: string; papel: { version: number } }>(
    `select tipo, papel from estook.trabajo_de_impresion where local_id = $1 order by creado_en`,
    [casaLola],
  );

const quienLlama = () => ({ tokenDeSesion: null, correlacionId: crypto.randomUUID() });

/** Lo que llama `pg_cron` el minuto en que hay algo en la cola (0138). */
async function elReloj(): Promise<void> {
  await api.despachador.repasarDocumentos(quienLlama(), SECRETO_DEL_RELOJ);
}

const enLaCola = async (id: string) =>
  (await comoDuena(`select 1 from facturacion.por_repasar where documento_id = $1`, [id])).length >
  0;

beforeAll(async () => {
  process.env['VERIFACTI_SECRETO_DE_LOS_AVISOS'] = SECRETO_DE_LOS_AVISOS;
  base = await levantarBase();
  api = montarLaApi(base.bd, { facturacion: verifacti, ahora: () => ahora });
  casaLola = await base.localPorCodigo('casa-lola');

  // Casa Lola, de la casa, con la empresa de pruebas de Verifacti y sus series (0125).
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
  losDatos(
    await api.ejecutar(entrada.token, 'superar_doble_factor', {
      codigo: await codigoEn(SECRETO_DEL_ADMIN_DE_EJEMPLO, ahora),
    }),
  );
  losDatos(
    await api.ejecutar(entrada.token, 'admin_poner_la_empresa_de_pruebas', { local_id: casaLola }),
  );
  pablo = await api.entrar('pablo@ejemplo.estook.com');
  losDatos(
    await api.ejecutar(pablo, 'poner_las_series', {
      ticket: 'T-CL',
      factura: 'F-CL',
      rectificativa: 'R-CL',
      otro_programa: false,
    }),
  );

  // Su caja, con la impresora que imprime los tickets.
  const [caja] = await comoDuena<{ id: string }>(
    `insert into estook.terminal (local_id, nombre, funcion, huella)
     values ($1, 'Caja de Casa Lola', 'comandero', repeat('c', 64)) returning id`,
    [casaLola],
  );
  await comoDuena(
    `insert into estook.impresora (local_id, terminal_id, nombre, direccion, imprime)
     values ($1, $2, 'Caja', '192.168.1.50:9100', array['caja'])`,
    [casaLola, caja?.id],
  );
  await comoDuena(
    `update plataforma.reloj set huella = encode(sha256(convert_to($1, 'UTF8')), 'hex')`,
    [SECRETO_DEL_RELOJ],
  );
}, 120_000);

afterAll(async () => {
  delete process.env['VERIFACTI_SECRETO_DE_LOS_AVISOS'];
  await base.cerrar();
});

describe('el ticket de prueba', () => {
  it('sale con su número, registrado en Verifacti, y por la impresora de la caja con su QR', async () => {
    const hecho = await unTicket();
    expect(hecho.numero).toBe('T-CL-2026-000001');
    const doc = await elDocumento(hecho.documentoId);
    expect(doc.estado).toBe('pendiente');
    expect(doc.url).toContain('ValidarQR');
    expect(doc.historia.map((h) => h.que)).toEqual([
      'Preparado con su número',
      'Mandado a Verifacti',
      'Registrado, con su QR',
    ]);
    // El papel: versión con QR, «PRUEBA · SIN VALIDEZ» y la dirección de cotejo dentro.
    const [papel] = await losPapeles();
    expect(papel?.tipo).toBe('ticket');
    expect(papel?.papel.version).toBe(2);
    expect(JSON.stringify(papel?.papel)).toContain('PRUEBA · SIN VALIDEZ');
    expect(JSON.stringify(papel?.papel)).toContain('ValidarQR');
    // Lo que se le mandó a Verifacti: un ticket, con el IVA del local y la fecha de hoy.
    const registro = verifacti.registros.at(-1);
    expect(registro?.cuerpo).toMatchObject({
      serie: 'T-CL-2026-',
      numero: '000001',
      fecha_expedicion: '06-11-2026',
      tipo_factura: 'F2',
      lineas: [{ base_imponible: '2.45', tipo_impositivo: '10', cuota_repercutida: '0.25' }],
      importe_total: '2.70',
    });
  });

  it('quien no lleva la facturación no pide el de prueba; la cocina, además, no ve lo emitido', async () => {
    const sara = await api.entrar('sara@ejemplo.estook.com');
    expect(elFallo(await api.ejecutar(sara, 'imprimir_un_ticket_de_prueba', {}))).toBe(
      'sin_permiso',
    );
    const marcos = await api.entrar('marcos@ejemplo.estook.com');
    expect(elFallo(await api.consultar(marcos, 'tickets_y_facturas'))).toBe('sin_permiso');
  });

  it('las claves de Verifacti no salen en ninguna respuesta (prueba 3)', async () => {
    const lista = JSON.stringify(await laLista());
    const uno = JSON.stringify(await elDocumento((await laLista()).documentos[0]?.id ?? ''));
    for (const texto of [lista, uno]) {
      expect(texto).not.toMatch(/vf_(test|prod)_|vfn_/);
    }
  });
});

describe('lo fiscal solo se inserta (pruebas 1 y 9)', () => {
  it('ni cambiar, ni borrar, ni vaciar, ni como dueña', async () => {
    for (const tabla of ['documento', 'envio', 'registro']) {
      const columna = tabla === 'documento' ? 'descripcion' : 'en';
      await expect(
        comoDuena(`update facturacion.${tabla} set ${columna} = ${columna}`),
      ).rejects.toThrow(/solo se inserta/);
      await expect(comoDuena(`delete from facturacion.${tabla}`)).rejects.toThrow(
        /solo se inserta/,
      );
    }
    await expect(comoDuena('truncate facturacion.documento cascade')).rejects.toThrow(
      /solo se inserta/,
    );
  });

  it('y la API no tiene ni un permiso para escribir en ellas', async () => {
    const [permisos] = await comoDuena<{ puede: boolean }>(
      `select bool_or(has_table_privilege('estook_api', 'facturacion.' || t, p)) as puede
         from unnest(array['documento', 'envio', 'registro', 'aviso_recibido', 'justificante']) t,
              unnest(array['insert', 'update', 'delete', 'truncate']) p`,
    );
    expect(permisos?.puede).toBe(false);
  });
});

describe('la numeración (prueba 4)', () => {
  it('muchos a la vez: correlativos, sin huecos ni duplicados', async () => {
    const hechos = await Promise.all(Array.from({ length: 12 }, () => unTicket()));
    const numeros = hechos.map((h) => Number(h.numero.slice(-6))).sort((a, b) => a - b);
    expect(numeros).toEqual(Array.from({ length: 12 }, (_, i) => i + 2));
  });
});

describe('cuando algo falla', () => {
  it('un rechazo por los datos no llega a Hacienda y sale arriba; su número queda usado (5)', async () => {
    verifacti.emitirAsi('rechazar');
    const papelesAntes = (await losPapeles()).length;
    const malo = await unTicket();
    verifacti.emitirAsi('normal');
    const doc = await elDocumento(malo.documentoId);
    expect(doc.estado).toBe('rechazado_por_datos');
    expect(doc.loQueFalla?.que).toContain('El campo descripcion es obligatorio');
    expect(doc.loQueFalla?.hacer).toContain('su número queda usado');
    // No se imprime nada de un documento que no se ha emitido.
    expect((await losPapeles()).length).toBe(papelesAntes);
    const siguiente = await unTicket();
    expect(Number(siguiente.numero.slice(-6))).toBe(Number(malo.numero.slice(-6)) + 1);
    expect((await laLista()).loQueFalla.map((f) => f.id)).toContain(malo.documentoId);
  });

  it('Verifacti registra y la respuesta se pierde: al repetir, un solo registro (7)', async () => {
    verifacti.emitirAsi('perder_respuesta');
    const hecho = await unTicket();
    verifacti.emitirAsi('normal');
    expect((await elDocumento(hecho.documentoId)).estado).toBe('enviando');
    ahora = new Date(ahora.getTime() + 2.5 * UN_MINUTO);
    await elReloj();
    const doc = await elDocumento(hecho.documentoId);
    expect(doc.estado).toBe('pendiente');
    expect(verifacti.registros.filter((r) => r.numero === hecho.numero.slice(-6))).toHaveLength(1);
  });

  it('Verifacti caído: el justificante con su código, y al volver se emite (8 y 14)', async () => {
    verifacti.emitirAsi('caido');
    const hecho = await unTicket();
    const doc = await elDocumento(hecho.documentoId);
    expect(doc.justificante).toMatch(/^J-[0-9A-F]{10}$/);
    expect(doc.chapa.texto).toBe('Se emite al volver');
    const ultimo = (await losPapeles()).at(-1);
    expect(ultimo?.tipo).toBe('justificante');
    expect(JSON.stringify(ultimo?.papel)).toContain('NO ES UNA FACTURA');
    expect(JSON.stringify(ultimo?.papel)).not.toContain('"qr"');

    // Sigue caído: el reloj lo intenta y lo deja como estaba.
    ahora = new Date(ahora.getTime() + 3 * UN_MINUTO);
    await elReloj();
    expect((await elDocumento(hecho.documentoId)).estado).toBe('enviando');

    // Vuelve: el reloj lo emite en su siguiente intento (el minuto 10), con la misma clave y el
    // mismo día. Lo que no llega se reintenta cada vez menos: cada intento queda apuntado.
    verifacti.emitirAsi('normal');
    ahora = new Date(ahora.getTime() + 7 * UN_MINUTO);
    await elReloj();
    expect((await elDocumento(hecho.documentoId)).estado).toBe('pendiente');
  });

  it('al día siguiente: pregunta a Hacienda, y si no lo tiene, sale con la incidencia (4.11)', async () => {
    verifacti.emitirAsi('caido');
    const hecho = await unTicket();
    verifacti.emitirAsi('normal');
    ahora = new Date(ahora.getTime() + 24 * 60 * UN_MINUTO);
    await elReloj();
    const registro = verifacti.registros.find((r) => r.numero === hecho.numero.slice(-6));
    expect(registro?.cuerpo).toMatchObject({
      fecha_expedicion: '07-11-2026',
      fecha_operacion: '06-11-2026',
      incidencia: 'S',
    });
    expect(verifacti.llamadas.some((l) => l.startsWith('buscar test T-CL-2026-'))).toBe(true);
    const doc = await elDocumento(hecho.documentoId);
    expect(doc.historia.map((h) => h.detalle)).toContain(
      'Con la incidencia: se mandó al volver la conexión',
    );
  });

  it('lo que rechaza Hacienda sale arriba, en llano, y el original no se toca (15)', async () => {
    const hecho = await unTicket();
    const registro = verifacti.registros.find((r) => r.numero === hecho.numero.slice(-6));
    verifacti.decirHacienda(
      registro?.uuid ?? '',
      'Incorrecto',
      '1100',
      'El NIF no está identificado',
    );
    ahora = new Date(ahora.getTime() + 2.5 * UN_MINUTO);
    await elReloj();
    const doc = await elDocumento(hecho.documentoId);
    expect(doc.estado).toBe('rechazado');
    expect(doc.loQueFalla?.que).toContain('El NIF no está identificado');
    expect((await laLista()).loQueFalla.map((f) => f.id)).toContain(hecho.documentoId);
  });
});

describe('los avisos de Verifacti (4.10)', () => {
  it('sin la firma, no toca nada; con ella, una vez (16)', async () => {
    const hecho = await unTicket();
    const registro = verifacti.registros.find((r) => r.numero === hecho.numero.slice(-6));
    const cuerpo = JSON.stringify([
      { uuid: registro?.uuid, estado: 'Correcto', operacion: 'Alta', serie: 'T-CL-2026-' },
    ]);
    const quien = { tokenDeSesion: null, correlacionId: crypto.randomUUID() };
    expect(
      (await api.despachador.avisoDeVerifacti(quien, cuerpo, 'firma-de-mentira', 'aviso-1'))
        .firmaValida,
    ).toBe(false);
    const firma = await laFirmaDelAviso(cuerpo, SECRETO_DE_LOS_AVISOS);
    expect(await api.despachador.avisoDeVerifacti(quien, cuerpo, firma, 'aviso-1')).toEqual({
      firmaValida: true,
      apuntados: 1,
    });
    expect(await api.despachador.avisoDeVerifacti(quien, cuerpo, firma, 'aviso-1')).toEqual({
      firmaValida: true,
      apuntados: 0,
    });
    expect((await elDocumento(hecho.documentoId)).estado).toBe('correcto');
  });

  it('lo que lleva una hora pendiente se pregunta solo (17)', async () => {
    const hecho = await unTicket();
    const registro = verifacti.registros.find((r) => r.numero === hecho.numero.slice(-6));
    // A los dos minutos, la primera pregunta: todavía pendiente.
    const preparado = ahora.getTime();
    ahora = new Date(preparado + 2.5 * UN_MINUTO);
    await elReloj();
    expect((await elDocumento(hecho.documentoId)).estado).toBe('pendiente');
    // Hacienda contesta en el minuto 3, sin aviso de por medio: lo que vio Richi el 6-nov. Antes se
    // quedaba una hora en «En Hacienda»; ahora se sabe al latido siguiente.
    verifacti.decirHacienda(registro?.uuid ?? '', 'Correcto');
    ahora = new Date(preparado + 3.5 * UN_MINUTO);
    await elReloj();
    expect((await elDocumento(hecho.documentoId)).estado).toBe('correcto');
  });
});

describe('el reloj de los documentos (0138)', { timeout: 30_000 }, () => {
  it('pg_cron lo llama por su camino y mira la cola: no depende de lo que haya para el móvil', () => {
    // Lo que falló en IKATZ: el repaso colgaba de un latido que solo sonaba con avisos pendientes,
    // y estas pruebas llamaban a la función por dentro. Esto mira lo que programa la migración.
    const migracion = readFileSync(
      new URL('../migraciones/0108_el_reloj_de_los_documentos.sql', import.meta.url),
      'utf8',
    );
    expect(migracion).toContain("'estook-documentos'");
    expect(migracion).toContain("'/tareas/latir', '/tareas/documentos'");
    expect(migracion).toMatch(/where exists \(\s*select 1 from facturacion\.por_repasar/);
  });

  it('la cola se mantiene sola: entra al prepararse y sale con lo definitivo', async () => {
    const bien = await unTicket();
    expect(await enLaCola(bien.documentoId)).toBe(true);
    const registro = verifacti.registros.find((r) => r.numero === bien.numero.slice(-6));
    verifacti.decirHacienda(registro?.uuid ?? '', 'Correcto');
    ahora = new Date(ahora.getTime() + 2.5 * UN_MINUTO);
    await elReloj();
    expect(await enLaCola(bien.documentoId)).toBe(false);

    verifacti.emitirAsi('rechazar');
    const malo = await unTicket();
    verifacti.emitirAsi('normal');
    expect(await enLaCola(malo.documentoId)).toBe(false);
  });

  it('cada estado de Verifacti se lee igual aquí y en la base (su especificación, 7-nov)', async () => {
    for (const estado of [
      'Pendiente',
      'Correcto',
      'Aceptado con errores',
      'Incorrecto',
      'Duplicado',
      'Anulado',
      'Factura inexistente',
      'No registrado',
      'Error servidor AEAT',
      'Uno que todavía no existe',
    ]) {
      const [fila] = await comoDuena<{ final: boolean }>(
        `select facturacion.es_estado_final($1) as final`,
        [estado],
      );
      expect(fila?.final, estado).toBe(!faltaAlgo(elEstadoDeVerifacti(estado)));
    }
  });

  it('un estado que no se conoce sigue en la cola: se vuelve a preguntar', async () => {
    const hecho = await unTicket();
    const registro = verifacti.registros.find((r) => r.numero === hecho.numero.slice(-6));
    verifacti.decirHacienda(registro?.uuid ?? '', 'Uno que todavía no existe');
    ahora = new Date(ahora.getTime() + 2.5 * UN_MINUTO);
    await elReloj();
    expect(await enLaCola(hecho.documentoId)).toBe(true);
    verifacti.decirHacienda(registro?.uuid ?? '', 'Correcto');
    ahora = new Date(ahora.getTime() + 2.5 * UN_MINUTO);
    await elReloj();
    expect(await enLaCola(hecho.documentoId)).toBe(false);
  });

  it('sin el secreto no hace nada, y el móvil ya no repasa nada', async () => {
    const hecho = await unTicket();
    const registro = verifacti.registros.find((r) => r.numero === hecho.numero.slice(-6));
    verifacti.decirHacienda(registro?.uuid ?? '', 'Correcto');
    ahora = new Date(ahora.getTime() + 2.5 * UN_MINUTO);
    expect(await api.despachador.repasarDocumentos(quienLlama(), 'otro')).toBeNull();
    expect(await api.despachador.repasarDocumentos(quienLlama(), null)).toBeNull();
    await api.despachador.alMovil(quienLlama(), SECRETO_DEL_RELOJ);
    expect((await elDocumento(hecho.documentoId)).estado).toBe('pendiente');
    await elReloj();
    expect((await elDocumento(hecho.documentoId)).estado).toBe('correcto');
  });

  it('se piden los avisos de Verifacti para el NIF que emite, una vez', async () => {
    const pedidos = verifacti.llamadas.filter((l) => l.startsWith('escuchar test'));
    expect(pedidos).toHaveLength(1);
    await elReloj();
    expect(verifacti.llamadas.filter((l) => l.startsWith('escuchar test'))).toHaveLength(1);
  });

  it('si algo lleva más de dos horas sin terminar, el latido de cada hora lo dice', async () => {
    const dichos: string[] = [];
    ponerElAvisadorDeFallos({
      avisar: (_fallo, datos) => {
        dichos.push(datos.mensaje);
        return Promise.resolve();
      },
    });
    try {
      await unTicket();
      ahora = new Date(ahora.getTime() + 3 * 60 * UN_MINUTO);
      await api.despachador.latir(quienLlama(), SECRETO_DEL_RELOJ);
      expect(dichos).toContain(
        'hay documentos fiscales sin terminar: mira el reloj de los documentos',
      );
    } finally {
      ponerElAvisadorDeFallos(null);
    }
  });

  it('lo que lleva más de un día sin contestar se dice una sola vez, y en su documento', async () => {
    const hecho = await unTicket();
    const otro = await unTicket();
    const antes = (await laLista()).tardan;
    ahora = new Date(ahora.getTime() + 25 * 60 * UN_MINUTO);
    const lista = await laLista();
    expect(lista.tardan).toBeGreaterThanOrEqual(antes + 2);
    // Ni uno por documento: con Verifacti caído un día serían todos los tickets.
    expect(lista.loQueFalla.map((f) => f.id)).not.toContain(hecho.documentoId);
    expect(lista.loQueFalla.map((f) => f.id)).not.toContain(otro.documentoId);
    const dicho = (await elDocumento(hecho.documentoId)).loQueFalla;
    expect(dicho?.que).toContain('más de un día sin contestar');
    expect(dicho?.hacer).toContain('sigue preguntando');
  });
});

describe('el reloj (prueba 19)', () => {
  it('a las 02:30 la fecha del documento es la del día real', async () => {
    ahora = new Date('2026-11-09T01:30:00Z'); // 02:30 en Madrid, en invierno
    const hecho = await unTicket();
    const [doc] = await comoDuena<{ fecha: string }>(
      `select to_char(fecha_operacion, 'YYYY-MM-DD') as fecha from facturacion.documento where id = $1`,
      [hecho.documentoId],
    );
    expect(doc?.fecha).toBe('2026-11-09');
    const registro = verifacti.registros.find((r) => r.numero === hecho.numero.slice(-6));
    expect(registro?.fecha).toBe('09-11-2026');
  });
});

describe('la lista de Tickets y facturas', () => {
  it('lo de hoy, con su chapa, lo que falla arriba, y en pruebas', async () => {
    const lista = await laLista();
    expect(lista.enPruebas).toBe(true);
    expect(lista.cuantos).toBe(lista.documentos.length);
    expect(lista.documentos.every((d) => d.chapa.texto !== '')).toBe(true);
  });
});
