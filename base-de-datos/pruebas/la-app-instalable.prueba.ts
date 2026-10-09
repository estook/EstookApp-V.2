import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { correoEnMemoria } from '../../servidor/infraestructura/correo.ts';
import { movilDeMentira } from '../../servidor/infraestructura/movil.ts';
import { levantarBase, type BaseDePrueba } from './entorno.ts';
import { elFallo, losDatos, montarLaApi, type ApiDePrueba } from './despachador.ts';

/**
 * I · La app instalable (decisión 0070), por la API de verdad.
 *
 *   · **Lo hecho sin conexión**: la hora la cuenta el servidor con lo que dice el móvil
 *     que ha pasado; queda marcado, y con más de doce horas se revisa.
 *   · **El fichaje que falta**, apuntado a mano por quien lleva el equipo.
 *   · **El aparato del local sin wifi**: el PIN cifrado, que vale una vez, y lo que no
 *     se puede apuntar le llega a quien lleva el equipo.
 *   · **Los avisos al móvil**: solo cuando puede sonar, lo que esperaba en uno, el
 *     correo de repuesto, «entras en cinco minutos», el pedido que no llega y lo que
 *     caduca.
 *
 * Todo en Bar Centro (Madrid, corta a las 03:00), que aquí deja de ser un ejemplo para
 * que el reloj lo mire. El martes 6 de octubre de 2026, en verano: Madrid es UTC+2.
 */
let base: BaseDePrueba;
let api: ApiDePrueba;
const correo = correoEnMemoria();
const movil = movilDeMentira();

const ROSA = 'rosa@ejemplo.estook.com'; // gerente de Bar Centro
const MARCOS = 'marcos@ejemplo.estook.com'; // cocinero
const SARA = 'sara@ejemplo.estook.com'; // camarera
const SECRETO = 'el-secreto-del-reloj-de-i';

/** La hora que ve la API. Cada prueba la pone donde le hace falta. */
let ahora = new Date('2026-10-06T08:00:00Z');

let rosa: string;
let marcos: string;
let sara: string;
let centro: string;
let organizacion: string;
let marcosId: string;
let saraId: string;

const MINUTO = 60_000;
const HORA = 60 * MINUTO;

async function comoDuena<T>(consulta: string, parametros: unknown[] = []): Promise<T[]> {
  const { rows } = await base.bd.query<T>(consulta, parametros);
  return rows;
}

interface Aviso {
  tipo: string;
  titulo: string;
  detalle: string | null;
  ir: string | null;
}

async function susAvisos(token: string, tipo: string): Promise<Aviso[]> {
  return losDatos<{ avisos: Aviso[] }>(await api.consultar(token, 'mis_avisos')).avisos.filter(
    (a) => a.tipo === tipo,
  );
}

const quien = () => ({ tokenDeSesion: null, correlacionId: crypto.randomUUID() });

beforeAll(async () => {
  base = await levantarBase();
  api = montarLaApi(base.bd, { correo, movil, ahora: () => ahora });

  await comoDuena(`update estook.organizacion set es_ejemplo = false where codigo = 'bar-centro'`);
  await comoDuena(`update estook.local set es_ejemplo = false where codigo = 'bar-centro'`);
  await comoDuena(
    `update plataforma.reloj set huella = encode(sha256(convert_to($1, 'UTF8')), 'hex')`,
    [SECRETO],
  );
  centro = await base.localPorCodigo('bar-centro');
  const [org] = await comoDuena<{ organizacion_id: string }>(
    'select organizacion_id from estook.local where id = $1',
    [centro],
  );
  organizacion = org?.organizacion_id ?? '';

  rosa = await api.entrar(ROSA);
  marcos = await api.entrar(MARCOS);
  sara = await api.entrar(SARA);
  const personas = await comoDuena<{ id: string; correo: string }>(
    'select id, correo from estook.persona where correo = any ($1)',
    [[MARCOS, SARA]],
  );
  marcosId = personas.find((p) => p.correo === MARCOS)?.id ?? '';
  saraId = personas.find((p) => p.correo === SARA)?.id ?? '';
}, 120_000);

afterAll(async () => {
  await base.cerrar();
});

// ── Lo hecho sin conexión ────────────────────────────────────────────────────

let fichajeDeSara = '';

describe('lo hecho sin conexión (mejora 15)', () => {
  it('fichar sin señal: la hora la cuenta el servidor con lo que ha pasado, y queda marcado', async () => {
    ahora = new Date('2026-10-06T08:00:00Z');
    const clave = crypto.randomUUID();
    losDatos(
      await api.ejecutar(marcos, 'fichar_entrada', { sin_donde: 'sin_senal' }, clave, {
        hechoHaceMs: 25 * MINUTO,
      }),
    );
    const [fichaje] = await comoDuena<{
      entro_en: Date;
      entro_sin_conexion: boolean;
      por_revisar: boolean;
      fecha: string;
    }>(
      `select entro_en, entro_sin_conexion, por_revisar,
              to_char(fecha_operativa, 'YYYY-MM-DD') as fecha
         from estook.fichaje where persona_id = $1 and salio_en is null`,
      [marcosId],
    );
    expect(new Date(fichaje?.entro_en ?? 0).toISOString()).toBe('2026-10-06T07:35:00.000Z');
    expect(fichaje?.entro_sin_conexion).toBe(true);
    expect(fichaje?.por_revisar).toBe(false);
    expect(fichaje?.fecha).toBe('2026-10-06');

    // El móvil lo vuelve a mandar (no supo si llegó): con la misma clave no se hace
    // dos veces, aunque ahora diga que hace más.
    const otraVez = await api.ejecutar(
      marcos,
      'fichar_entrada',
      { sin_donde: 'sin_senal' },
      clave,
      {
        hechoHaceMs: 31 * MINUTO,
      },
    );
    expect(otraVez.estado).toBe('repetida');
    const abiertos = await comoDuena<{ n: number }>(
      'select count(*)::int as n from estook.fichaje where persona_id = $1',
      [marcosId],
    );
    expect(abiertos[0]?.n).toBe(1);
  });

  it('la salida sin señal, igual; y nunca antes de la entrada', async () => {
    losDatos(
      await api.ejecutar(marcos, 'fichar_salida', { sin_donde: 'sin_senal' }, undefined, {
        hechoHaceMs: 5 * MINUTO,
      }),
    );
    const [fichaje] = await comoDuena<{ salio_en: Date; salio_sin_conexion: boolean }>(
      `select salio_en, salio_sin_conexion from estook.fichaje where persona_id = $1`,
      [marcosId],
    );
    expect(new Date(fichaje?.salio_en ?? 0).toISOString()).toBe('2026-10-06T07:55:00.000Z');
    expect(fichaje?.salio_sin_conexion).toBe(true);
  });

  it('con más de doce horas sin señal, lo revisa quien lleva el equipo', async () => {
    losDatos(
      await api.ejecutar(sara, 'fichar_entrada', { sin_donde: 'sin_senal' }, undefined, {
        hechoHaceMs: 13 * HORA,
      }),
    );
    losDatos(await api.ejecutar(sara, 'fichar_salida', { sin_donde: 'sin_senal' }));
    const [fichaje] = await comoDuena<{ id: string; por_revisar: boolean; fecha: string }>(
      `select id::text as id, por_revisar, to_char(fecha_operativa, 'YYYY-MM-DD') as fecha
         from estook.fichaje where persona_id = $1`,
      [saraId],
    );
    fichajeDeSara = fichaje?.id ?? '';
    expect(fichaje?.por_revisar).toBe(true);
    // Las 21:00 del lunes en Madrid: la jornada del lunes.
    expect(fichaje?.fecha).toBe('2026-10-05');

    const hoy = losDatos<{ porRevisar: { fichajeId: string; nombre: string }[] }>(
      await api.consultar(rosa, 'fichajes_de_hoy'),
    );
    expect(hoy.porRevisar.map((f) => f.fichajeId)).toEqual([fichajeDeSara]);

    // Una camarera no revisa nada.
    expect(
      elFallo(await api.ejecutar(sara, 'dar_por_bueno_el_fichaje', { fichaje_id: fichajeDeSara })),
    ).toBe('sin_permiso');
    losDatos(await api.ejecutar(rosa, 'dar_por_bueno_el_fichaje', { fichaje_id: fichajeDeSara }));
    expect(
      losDatos<{ porRevisar: unknown[] }>(await api.consultar(rosa, 'fichajes_de_hoy')).porRevisar,
    ).toEqual([]);
    expect(
      elFallo(await api.ejecutar(rosa, 'dar_por_bueno_el_fichaje', { fichaje_id: fichajeDeSara })),
    ).toBe('ya_hecho');
  });

  it('de hace más de una semana no se acepta, y lo que no es fichar ni mermas, tampoco', async () => {
    expect(
      elFallo(
        await api.ejecutar(marcos, 'fichar_entrada', { sin_donde: 'sin_senal' }, undefined, {
          hechoHaceMs: 8 * 24 * HORA,
        }),
      ),
    ).toBe('hecho_hace_demasiado');
    expect(
      elFallo(
        await api.ejecutar(rosa, 'escribir_en_el_tablon', { texto: 'Ayer' }, undefined, {
          hechoHaceMs: HORA,
        }),
      ),
    ).toBe('faltan_datos');
  });

  it('una merma sin señal va a la jornada de cuando se tiró, no a la de cuando se mandó', async () => {
    const proveedor = losDatos<{ proveedorId: string }>(
      await api.ejecutar(rosa, 'crear_proveedor', { nombre: 'Proveedor de I' }),
    ).proveedorId;
    ahora = new Date('2026-10-05T10:00:00Z');
    const leche = losDatos<{ productoId: string }>(
      await api.ejecutar(rosa, 'crear_producto', {
        nombre: 'Leche de I',
        unidad_de_uso: 'l',
        factor: 1,
        proveedor_id: proveedor,
        precio_centimos: 100,
        cantidad_inicial: 10,
      }),
    ).productoId;
    // Mandada a las 10:00 del martes, tirada a las 02:00 (antes del corte de las 03:00).
    ahora = new Date('2026-10-06T08:00:00Z');
    losDatos(
      await api.ejecutar(
        marcos,
        'apuntar_merma',
        { producto_id: leche, cuanto: 1, motivo: 'caducado' },
        undefined,
        { hechoHaceMs: 8 * HORA },
      ),
    );
    const [movimiento] = await comoDuena<{ fecha: string }>(
      `select to_char(fecha_operativa, 'YYYY-MM-DD') as fecha from estook.movimiento_de_stock
        where producto_id = $1 and tipo = 'merma'`,
      [leche],
    );
    expect(movimiento?.fecha).toBe('2026-10-05');
  });
});

// ── El fichaje que falta ─────────────────────────────────────────────────────

describe('el fichaje que falta, apuntado a mano', () => {
  it('lo apunta quien lleva el equipo, con su motivo, y al trabajador le llega', async () => {
    const hecho = losDatos<{ minutos: number }>(
      await api.ejecutar(rosa, 'apuntar_fichaje_que_falta', {
        persona_id: saraId,
        entro_en: '2026-10-04T08:00:00Z',
        salio_en: '2026-10-04T12:00:00Z',
        motivo: 'Fichó en la tablet sin conexión con otro PIN',
      }),
    );
    expect(hecho.minutos).toBe(240);

    const avisos = await susAvisos(sara, 'fichaje.corregido');
    expect(avisos[0]?.titulo).toBe('Rosa ha apuntado un fichaje tuyo del domingo 4 de octubre');

    const lista = losDatos<{ fichajes: { aMano: { quien: string; motivo: string } | null }[] }>(
      await api.consultar(rosa, 'fichajes_de_una_persona', { persona_id: saraId }),
    );
    expect(lista.fichajes.some((f) => f.aMano?.quien === 'Rosa')).toBe(true);
  });

  it('ni encima de otro suyo, ni en el futuro, ni por quien no lleva el equipo', async () => {
    const encima = await api.ejecutar(rosa, 'apuntar_fichaje_que_falta', {
      persona_id: saraId,
      entro_en: '2026-10-04T10:00:00Z',
      salio_en: '2026-10-04T13:00:00Z',
      motivo: 'Otra vez',
    });
    expect(elFallo(encima)).toBe('faltan_datos');
    const futuro = await api.ejecutar(rosa, 'apuntar_fichaje_que_falta', {
      persona_id: saraId,
      entro_en: '2026-10-09T10:00:00Z',
      salio_en: null,
      motivo: 'Mañana',
    });
    expect(elFallo(futuro)).toBe('faltan_datos');
    const cocinero = await api.ejecutar(marcos, 'apuntar_fichaje_que_falta', {
      persona_id: saraId,
      entro_en: '2026-10-03T10:00:00Z',
      salio_en: '2026-10-03T12:00:00Z',
      motivo: 'Por ella',
    });
    expect(elFallo(cocinero)).toBe('sin_permiso');
  });
});

// ── El aparato del local, sin wifi ───────────────────────────────────────────

function aB64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64url');
}

async function cifrar(publica: string, pin: string, numero: string): Promise<string> {
  const llave = await crypto.subtle.importKey(
    'spki',
    new Uint8Array(Buffer.from(publica, 'base64url')),
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['encrypt'],
  );
  const cifrado = await crypto.subtle.encrypt(
    { name: 'RSA-OAEP' },
    llave,
    new TextEncoder().encode(JSON.stringify({ pin, n: numero })),
  );
  return aB64(new Uint8Array(cifrado));
}

const unNumero = () => Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString('hex');

describe('el aparato del local, sin wifi', () => {
  let llave = '';
  let publica = '';
  let omar = { personaId: '', pin: '' };

  it('se prepara una vez: la pública para el aparato, la privada solo en Estook', async () => {
    llave = losDatos<{ llave: string }>(
      await api.ejecutar(rosa, 'poner_aparato_para_fichar', { nombre: 'Tablet de la barra' }),
    ).llave;
    const nuevo = losDatos<{ personaId: string; pin: string }>(
      await api.ejecutar(rosa, 'invitar_persona', {
        nombre: 'Omar',
        rol: 'cocinero',
        local_id: centro,
        organizacion_id: organizacion,
      }),
    );
    omar = nuevo;

    expect(
      losDatos<{ clavePublica: string | null }>(
        await api.consultar(null, 'el_aparato_para_fichar', { llave }),
      ).clavePublica,
    ).toBeNull();
    publica = losDatos<{ clavePublica: string }>(
      await api.ejecutar(null, 'preparar_el_aparato_sin_conexion', { llave }),
    ).clavePublica;
    expect(publica.length).toBeGreaterThan(300);
    // Otra vez, la misma: no se cambia la llave de un aparato que ya tiene PIN guardados.
    expect(
      losDatos<{ clavePublica: string }>(
        await api.ejecutar(null, 'preparar_el_aparato_sin_conexion', { llave }),
      ).clavePublica,
    ).toBe(publica);

    // Y la privada no la ve nadie que no sea el sistema: ni la API como persona.
    await base.bd.exec('begin');
    await base.bd.exec('set local role estook_api');
    const { rows } = await base.bd.query<{ n: number }>(
      'select count(*)::int as n from estook.clave_del_terminal',
    );
    await base.bd.exec('rollback');
    expect(rows[0]?.n).toBe(0);
  });

  it('lo tecleado sin wifi se apunta al volver, con la hora del servidor, y vale una vez', async () => {
    ahora = new Date('2026-10-06T09:00:00Z');
    const cifrado = await cifrar(publica, omar.pin, unNumero());
    const hecho = losDatos<{ apuntado: boolean }>(
      await api.ejecutar(
        null,
        'fichar_aqui',
        { llave, pin_cifrado: cifrado, que: 'entrada' },
        undefined,
        {
          hechoHaceMs: 10 * MINUTO,
        },
      ),
    );
    expect(hecho).toEqual({ apuntado: true });
    const [fichaje] = await comoDuena<{ entro_en: Date; sin: boolean; aparato: boolean }>(
      `select entro_en, entro_sin_conexion as sin, terminal_id is not null as aparato
         from estook.fichaje where persona_id = $1`,
      [omar.personaId],
    );
    expect(new Date(fichaje?.entro_en ?? 0).toISOString()).toBe('2026-10-06T08:50:00.000Z');
    expect(fichaje?.sin).toBe(true);
    expect(fichaje?.aparato).toBe(true);

    // El mismo cifrado otra vez (se perdió la respuesta): no hace nada más.
    expect(
      losDatos(
        await api.ejecutar(
          null,
          'fichar_aqui',
          { llave, pin_cifrado: cifrado, que: 'entrada' },
          undefined,
          {
            hechoHaceMs: 11 * MINUTO,
          },
        ),
      ),
    ).toEqual({ apuntado: true });
    const cuantos = await comoDuena<{ n: number }>(
      'select count(*)::int as n from estook.fichaje where persona_id = $1',
      [omar.personaId],
    );
    expect(cuantos[0]?.n).toBe(1);
  });

  it('lo que no se puede apuntar no se pierde en silencio: le llega a quien lleva el equipo', async () => {
    const malo = losDatos<{ apuntado: boolean; porque?: string }>(
      await api.ejecutar(
        null,
        'fichar_aqui',
        { llave, pin_cifrado: await cifrar(publica, '000000', unNumero()), que: 'entrada' },
        undefined,
        { hechoHaceMs: 3 * MINUTO },
      ),
    );
    expect(malo).toEqual({ apuntado: false, porque: 'pin' });
    const yaDentro = losDatos<{ apuntado: boolean; porque?: string }>(
      await api.ejecutar(
        null,
        'fichar_aqui',
        { llave, pin_cifrado: await cifrar(publica, omar.pin, unNumero()), que: 'entrada' },
        undefined,
        { hechoHaceMs: 2 * MINUTO },
      ),
    );
    expect(yaDentro).toEqual({ apuntado: false, porque: 'ya_estaba' });

    const avisos = await susAvisos(rosa, 'fichaje.sin_apuntar');
    expect(avisos.map((a) => a.detalle)).toEqual(
      expect.arrayContaining([
        'Una entrada en Tablet de la barra, el martes 6 a las 10:57: el PIN no era de nadie del local. Pregunta quién fue y apúntaselo en su ficha.',
        'Una entrada de Omar en Tablet de la barra, el martes 6 a las 10:58: esa persona ya estaba fichada. Mira la ficha de Omar por si hay que corregir algo.',
      ]),
    );
  });

  it('un PIN cifrado sin decir cuánto hace, o que no es de este aparato, no vale', async () => {
    const cifrado = await cifrar(publica, omar.pin, unNumero());
    expect(
      elFallo(
        await api.ejecutar(null, 'fichar_aqui', { llave, pin_cifrado: cifrado, que: 'salida' }),
      ),
    ).toBe('faltan_datos');
    expect(
      elFallo(
        await api.ejecutar(
          null,
          'fichar_aqui',
          { llave, pin_cifrado: 'A'.repeat(342), que: 'salida' },
          undefined,
          { hechoHaceMs: MINUTO },
        ),
      ),
    ).toBe('pin_desconocido');
  });
});

// ── Los avisos al móvil ──────────────────────────────────────────────────────

const SU_MOVIL = {
  direccion: 'https://fcm.googleapis.com/fcm/send/el-de-sara',
  p256dh: `B${'A'.repeat(86)}`,
  auth: 'A'.repeat(22),
  aparato: 'Android · Chrome',
};

describe('los avisos al móvil', () => {
  it('sin las claves VAPID no hay móvil: se dice, no se rompe', async () => {
    const sinMovil = montarLaApi(base.bd, { ahora: () => ahora });
    expect(
      losDatos<{ encendido: boolean }>(await sinMovil.consultar(sara, 'mi_movil')).encendido,
    ).toBe(false);
    expect(elFallo(await sinMovil.ejecutar(sara, 'poner_este_movil', SU_MOVIL))).toBe(
      'movil_sin_encender',
    );
  });

  it('solo se guardan direcciones de los servicios de avisos, y cada uno ve los suyos', async () => {
    expect(
      elFallo(
        await api.ejecutar(sara, 'poner_este_movil', {
          ...SU_MOVIL,
          direccion: 'https://169.254.169.254/latest/meta-data',
        }),
      ),
    ).toBe('faltan_datos');
    losDatos(await api.ejecutar(sara, 'poner_este_movil', SU_MOVIL));
    const suyo = losDatos<{ moviles: { aparato: string }[]; clavePublica: string }>(
      await api.consultar(sara, 'mi_movil'),
    );
    expect(suyo.moviles.map((m) => m.aparato)).toEqual(['Android · Chrome']);
    expect(suyo.clavePublica).toBe(movil.clavePublica);
    expect(
      losDatos<{ moviles: unknown[] }>(await api.consultar(marcos, 'mi_movil')).moviles,
    ).toEqual([]);
  });

  it('lo que suena en el móvil no sale también por correo', async () => {
    ahora = new Date('2026-10-06T08:00:00Z'); // 10:00 en Madrid
    losDatos(
      await api.ejecutar(sara, 'guardar_cuando_suena', {
        modo: 'fuera_del_silencio',
        desde: '23:00',
        hasta: '08:00',
      }),
    );
    const antes = movil.mandados.length;
    const correosAntes = correo.mandados.length;
    losDatos(
      await api.ejecutar(rosa, 'corregir_fichaje', {
        fichaje_id: fichajeDeSara,
        salio_en: '2026-10-06T06:00:00Z',
        motivo: 'Se fue a las ocho',
      }),
    );
    const mandado = movil.mandados.at(-1);
    expect(movil.mandados.length).toBe(antes + 1);
    expect(mandado?.carga.titulo).toMatch(/^Rosa ha corregido tu fichaje del lunes 5 de octubre$/);
    expect(mandado?.carga.ir).toBe('/mis-fichajes');
    expect(mandado?.suscripcion.direccion).toBe(SU_MOVIL.direccion);
    // El fichaje corregido va por correo de fábrica, pero ha sonado en el móvil.
    expect(correo.mandados.slice(correosAntes).some((c) => c.para === SARA)).toBe(false);
  });

  it('si el móvil ya no existe, se olvida y el aviso sale por correo', async () => {
    movil.contestar('ya_no_existe');
    const correosAntes = correo.mandados.length;
    losDatos(
      await api.ejecutar(rosa, 'corregir_fichaje', {
        fichaje_id: fichajeDeSara,
        salio_en: '2026-10-06T06:30:00Z',
        motivo: 'A las ocho y media',
      }),
    );
    movil.contestar('entregado');
    expect(losDatos<{ moviles: unknown[] }>(await api.consultar(sara, 'mi_movil')).moviles).toEqual(
      [],
    );
    expect(correo.mandados.slice(correosAntes).some((c) => c.para === SARA)).toBe(true);
  });

  it('en sus horas de silencio espera, y lo que esperaba sale en uno solo', async () => {
    losDatos(await api.ejecutar(sara, 'poner_este_movil', SU_MOVIL));
    losDatos(
      await api.ejecutar(sara, 'guardar_cuando_suena', {
        modo: 'fuera_del_silencio',
        desde: '09:00',
        hasta: '12:00',
      }),
    );
    // Y quiere también las notas del Tablón en el móvil.
    losDatos(
      await api.ejecutar(sara, 'guardar_mis_avisos', {
        tipo: 'tablon.nota',
        en_la_app: true,
        por_correo: false,
        al_movil: true,
      }),
    );
    ahora = new Date('2026-10-06T08:00:00Z'); // 10:00: en silencio
    const antes = movil.mandados.length;
    losDatos(
      await api.ejecutar(rosa, 'corregir_fichaje', {
        fichaje_id: fichajeDeSara,
        salio_en: '2026-10-06T06:15:00Z',
        motivo: 'A las ocho y cuarto',
      }),
    );
    losDatos(await api.ejecutar(rosa, 'escribir_en_el_tablon', { texto: 'Hoy hay inventario' }));
    expect(movil.mandados.length).toBe(antes);
    const [esperan] = await comoDuena<{ n: number; desde: Date }>(
      `select count(*)::int as n, min(movil_desde) as desde from estook.aviso
        where persona_id = $1 and movil = 'pendiente'`,
      [saraId],
    );
    expect(esperan?.n).toBe(2);
    // Hasta las 12:00 de Madrid.
    expect(new Date(esperan?.desde ?? 0).toISOString()).toBe('2026-10-06T10:00:00.000Z');

    // A las 12:00, el latido del minuto los manda: uno solo, que lleva a la campana.
    ahora = new Date('2026-10-06T10:00:30Z');
    const hecho = await api.despachador.alMovil(quien(), SECRETO);
    expect(hecho?.mandados).toBe(2);
    const resumen = movil.mandados.at(-1);
    expect(movil.mandados.length).toBe(antes + 1);
    expect(resumen?.carga.titulo).toBe('Tienes 2 avisos');
    expect(resumen?.carga.ir).toBe('/?hacer=avisos');
  });

  it('el latido del móvil no lo provoca quien no tiene el secreto', async () => {
    expect(await api.despachador.alMovil(quien(), 'otro')).toBeNull();
    expect(await api.despachador.alMovil(quien(), null)).toBeNull();
  });

  it('«entras en cinco minutos»: lo apunta el reloj y suena justo antes, si no ha fichado', async () => {
    losDatos(
      await api.ejecutar(marcos, 'poner_este_movil', {
        ...SU_MOVIL,
        direccion: 'https://fcm.googleapis.com/fcm/send/el-de-marcos',
      }),
    );
    // El tramo publicado en Horarios: desde el 9-oct es el único horario (0081).
    await comoDuena(
      `with s as (
         insert into estook.semana_de_horario (organizacion_id, local_id, lunes, publicada_en, veces_publicada)
         select l.organizacion_id, l.id, '2026-10-05', now(), 1 from estook.local l where l.id = $1
         on conflict (local_id, lunes) do update
            set publicada_en = coalesce(estook.semana_de_horario.publicada_en, now()),
                veces_publicada = greatest(estook.semana_de_horario.veces_publicada, 1)
         returning id
       )
       insert into estook.turno_publicado (semana_id, local_id, persona_id, dia, tipo, entra, sale)
       select s.id, $1, $2, '2026-10-06', 'trabajo', '12:00', '16:00' from s`,
      [centro, marcosId],
    );
    // A las 11:30 de Madrid late el reloj de cada hora y lo apunta para las 11:55.
    ahora = new Date('2026-10-06T09:30:00Z');
    const latido = await api.despachador.latir(quien(), SECRETO);
    expect(latido?.programados).toBeGreaterThanOrEqual(1);
    const [programado] = await comoDuena<{ cuando: Date }>(
      `select cuando from estook.al_movil_programado where tipo = 'turno.entras' and persona_id = $1`,
      [marcosId],
    );
    expect(new Date(programado?.cuando ?? 0).toISOString()).toBe('2026-10-06T09:55:00.000Z');

    ahora = new Date('2026-10-06T09:55:10Z');
    const antes = movil.mandados.length;
    await api.despachador.alMovil(quien(), SECRETO);
    const suyo = movil.mandados
      .slice(antes)
      .find((m) => m.suscripcion.direccion.endsWith('el-de-marcos'));
    expect(suyo?.carga.titulo).toBe('Entras en 5 minutos');
    expect(suyo?.carga.detalle).toBe('A las 12:00 en Bar Centro. Tócalo para fichar.');
    expect(suyo?.carga.ir).toBe('/?hacer=fichar');
    expect(suyo?.opciones.urgente).toBe(true);

    // Al fichar la entrada, el aviso se da por visto.
    losDatos(await api.ejecutar(marcos, 'fichar_entrada', { sin_donde: 'sin_senal' }));
    const [aviso] = await comoDuena<{ leido: boolean }>(
      `select leido_en is not null as leido from estook.aviso where persona_id = $1 and tipo = 'turno.entras'`,
      [marcosId],
    );
    expect(aviso?.leido).toBe(true);
    losDatos(await api.ejecutar(marcos, 'fichar_salida', { sin_donde: 'sin_senal' }));
  });

  it('el pedido que no ha llegado avisa media hora después de cuando suele llegar, si sigue sin llegar', async () => {
    const proveedor = losDatos<{ proveedorId: string }>(
      await api.ejecutar(rosa, 'crear_proveedor', {
        nombre: 'Pescados de I',
        suele_llegar_a: '09:00',
      }),
    ).proveedorId;
    const ficha = losDatos<{ proveedor: { sueleLlegarA: string | null } }>(
      await api.consultar(rosa, 'un_proveedor', { proveedor_id: proveedor }),
    );
    expect(ficha.proveedor.sueleLlegarA).toBe('09:00');

    const [llega, llego] = await comoDuena<{ id: string }>(
      `insert into estook.pedido_de_compra (local_id, proveedor_id, numero, estado, llega_el, enviado_en, recibido_en)
       values ($1, $2, 901, 'enviado', '2026-10-06', now(), null),
              ($1, $2, 902, 'recibido', '2026-10-06', now(), now())
       returning id`,
      [centro, proveedor],
    );
    // A las 09:00 de Madrid late el reloj: apunta las 09:30.
    ahora = new Date('2026-10-06T07:00:00Z');
    await api.despachador.latir(quien(), SECRETO);
    const programados = await comoDuena<{ clave: string }>(
      `select clave from estook.al_movil_programado where tipo = 'pedido.no_llega'`,
    );
    expect(programados.map((p) => p.clave)).toEqual([llega?.id]);
    expect(llego).toBeDefined();

    ahora = new Date('2026-10-06T07:30:20Z');
    await api.despachador.alMovil(quien(), SECRETO);
    const avisos = await susAvisos(rosa, 'pedido.no_llega');
    expect(avisos[0]?.titulo).toBe('El pedido 901 a Pescados de I no ha llegado');
  });

  it('lo que caduca mañana avisa la víspera a las 18:00', async () => {
    const [producto] = await comoDuena<{ id: string }>(
      `select id from estook.producto where nombre = 'Leche de I'`,
    );
    await comoDuena(
      `insert into estook.lote (local_id, producto_id, caduca_el, recibido_el)
       values ($1, $2, '2026-10-07', '2026-10-01')`,
      [centro, producto?.id],
    );
    ahora = new Date('2026-10-06T15:30:00Z'); // 17:30 en Madrid
    await api.despachador.latir(quien(), SECRETO);
    ahora = new Date('2026-10-06T16:00:15Z'); // 18:00
    await api.despachador.alMovil(quien(), SECRETO);
    const avisos = await susAvisos(rosa, 'lote.caduca');
    expect(avisos[0]?.titulo).toBe('Mañana caduca un lote');
    expect(avisos[0]?.detalle).toBe('Leche de I. Gástalo primero.');
  });
});
