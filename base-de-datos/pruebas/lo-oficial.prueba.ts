import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { correoEnMemoria } from '../../servidor/infraestructura/correo.ts';
import { movilDeMentira } from '../../servidor/infraestructura/movil.ts';
import { levantarBase, type BaseDePrueba } from './entorno.ts';
import { elFallo, losDatos, montarLaApi, type ApiDePrueba } from './despachador.ts';

/**
 * C2 · Lo oficial (decisión 0075 · migración 0057), por la API de verdad.
 *
 *   · **Los canales los crean el gerente y los jefes**; se renombran y se borran (se
 *     archivan), y «Todo el equipo» no se toca.
 *   · **Hasta tres fijados por canal**, de quien lleva el equipo, nunca en un privado.
 *   · **«Confirmar que lo he leído»**: quién falta, que no se corrige ni se borra, y el
 *     recordatorio una vez, al empezar el siguiente día de quien falta.
 *   · **Las tarjetas**, con lo que quien las manda puede ver.
 *   · **El aviso del horario**, solo de una semana publicada y sin sonar en el móvil.
 *   · **El correo del chat** a quien no tiene móvil: privados y menciones, uno al día.
 *
 * Bar Centro (Madrid), martes 6 de octubre de 2026 a las 10:00: UTC+2.
 */

let base: BaseDePrueba;
let api: ApiDePrueba;
const correo = correoEnMemoria();
const movil = movilDeMentira();

const ROSA = 'rosa@ejemplo.estook.com'; // gerente de Bar Centro
const MARCOS = 'marcos@ejemplo.estook.com'; // cocinero de Bar Centro
const SARA = 'sara@ejemplo.estook.com'; // camarera de Bar Centro
const LUIS = 'luis@ejemplo.estook.com'; // jefe de cocina de Bar Puerto
const SECRETO = 'el-secreto-del-reloj-de-c2';

let ahora = new Date('2026-10-06T08:00:00Z');

let rosa: string;
let marcos: string;
let sara: string;
let luis: string;
let equipo: string;
let marcosId: string;
let saraId: string;
let centro: string;

const quien = () => ({ tokenDeSesion: null, correlacionId: crypto.randomUUID() });

async function comoDuena<T>(consulta: string, parametros: unknown[] = []): Promise<T[]> {
  const { rows } = await base.bd.query<T>(consulta, parametros);
  return rows;
}

interface CanalEnLista {
  id: string;
  tipo: string;
  nombre: string;
  ultimo: { vista: string } | null;
}

async function susCanales(token: string): Promise<CanalEnLista[]> {
  return losDatos<{ canales: CanalEnLista[] }>(await api.consultar(token, 'mis_canales', {}))
    .canales;
}

interface MensajeVisto {
  id: string;
  texto: string | null;
  fijado: boolean;
  sePuedeBorrar: boolean;
  tarjeta: Record<string, unknown> | null;
  confirmar: {
    cuantos: number;
    de: number;
    mio: 'falta' | 'hecho' | null;
    faltan: string[] | null;
  } | null;
}

interface CanalVisto {
  canal: { puedeFijar: boolean; puedeGestionar: boolean };
  fijados: { id: string }[];
  mensajes: MensajeVisto[];
}

async function elCanal(token: string, canalId: string): Promise<CanalVisto> {
  return losDatos<CanalVisto>(await api.consultar(token, 'un_canal', { canal_id: canalId }));
}

async function unMensaje(token: string, canalId: string, id: string): Promise<MensajeVisto> {
  const visto = (await elCanal(token, canalId)).mensajes.find((m) => m.id === id);
  if (visto === undefined) throw new Error(`no se ve el mensaje ${id}`);
  return visto;
}

async function escribir(token: string, entrada: Record<string, unknown>): Promise<string> {
  return losDatos<{ mensajeId: string }>(await api.ejecutar(token, 'escribir_en_el_chat', entrada))
    .mensajeId;
}

beforeAll(async () => {
  base = await levantarBase();
  api = montarLaApi(base.bd, { correo, movil, ahora: () => ahora });
  // Que el reloj mire Bar Centro: los ejemplos no tienen turnos ni avisos programados.
  await comoDuena(`update estook.organizacion set es_ejemplo = false where codigo = 'bar-centro'`);
  await comoDuena(`update estook.local set es_ejemplo = false where codigo = 'bar-centro'`);
  await comoDuena(
    `update plataforma.reloj set huella = encode(sha256(convert_to($1, 'UTF8')), 'hex')`,
    [SECRETO],
  );
  centro = await base.localPorCodigo('bar-centro');
  rosa = await api.entrar(ROSA);
  marcos = await api.entrar(MARCOS);
  sara = await api.entrar(SARA);
  luis = await api.entrar(LUIS);
  for (const token of [rosa, marcos, sara, luis]) {
    losDatos(await api.ejecutar(token, 'abrir_el_chat', {}));
  }
  // Los dos, sin horario que mande: el día empieza al acabar su silencio, a las 08:00.
  for (const token of [marcos, sara]) {
    losDatos(
      await api.ejecutar(token, 'guardar_cuando_suena', {
        modo: 'fuera_del_silencio',
        desde: '23:00',
        hasta: '08:00',
      }),
    );
  }
  const personas = await comoDuena<{ id: string; correo: string }>(
    'select id::text as id, correo from estook.persona where correo = any ($1)',
    [[MARCOS, SARA]],
  );
  marcosId = personas.find((p) => p.correo === MARCOS)?.id ?? '';
  saraId = personas.find((p) => p.correo === SARA)?.id ?? '';
  equipo = (await susCanales(rosa)).find((c) => c.tipo === 'equipo')?.id ?? '';
}, 120_000);

afterAll(async () => {
  await base.cerrar();
});

describe('los canales', () => {
  it('los crean el gerente y los jefes; un cocinero, no', async () => {
    expect(
      elFallo(await api.ejecutar(marcos, 'crear_canal', { nombre: 'Mío', personas: [] })),
    ).toBe('sin_permiso');
    const { canalId } = losDatos<{ canalId: string }>(
      await api.ejecutar(luis, 'crear_canal', { nombre: 'Pase', personas: [] }),
    );
    expect((await susCanales(luis)).find((c) => c.id === canalId)?.nombre).toBe('Pase');
    expect(
      losDatos<{ puedeCrearCanales: boolean }>(await api.consultar(sara, 'mis_canales', {}))
        .puedeCrearCanales,
    ).toBe(false);
  });

  it('se renombran y se borran: quien lo creó o el gerente; «Todo el equipo», nunca', async () => {
    const { canalId } = losDatos<{ canalId: string }>(
      await api.ejecutar(rosa, 'crear_canal', { nombre: 'Barra', personas: [marcosId] }),
    );
    expect((await elCanal(marcos, canalId)).canal.puedeGestionar).toBe(false);
    expect(
      elFallo(await api.ejecutar(marcos, 'renombrar_canal', { canal_id: canalId, nombre: 'X' })),
    ).toBe('sin_permiso');
    losDatos(
      await api.ejecutar(rosa, 'renombrar_canal', { canal_id: canalId, nombre: 'Barra y terraza' }),
    );
    expect((await susCanales(marcos)).find((c) => c.id === canalId)?.nombre).toBe(
      'Barra y terraza',
    );

    expect(
      elFallo(await api.ejecutar(rosa, 'renombrar_canal', { canal_id: equipo, nombre: 'Todos' })),
    ).toBe('faltan_datos');
    expect(elFallo(await api.ejecutar(rosa, 'borrar_canal', { canal_id: equipo }))).toBe(
      'faltan_datos',
    );

    expect(elFallo(await api.ejecutar(marcos, 'borrar_canal', { canal_id: canalId }))).toBe(
      'sin_permiso',
    );
    losDatos(await api.ejecutar(rosa, 'borrar_canal', { canal_id: canalId }));
    expect((await susCanales(marcos)).some((c) => c.id === canalId)).toBe(false);
    expect(elFallo(await api.consultar(marcos, 'un_canal', { canal_id: canalId }))).toBe(
      'no_existe',
    );
    // Archivado, no borrado: lo que se dijo se queda.
    const [fila] = await comoDuena<{ archivado: boolean }>(
      'select archivado_en is not null as archivado from estook.canal where id = $1',
      [canalId],
    );
    expect(fila?.archivado).toBe(true);
  });
});

describe('los fijados', () => {
  it('hasta tres por canal, de quien lleva el equipo, y quitarlo no lo borra', async () => {
    const ids: string[] = [];
    for (const texto of ['Uno', 'Dos', 'Tres', 'Cuatro']) {
      ids.push(await escribir(sara, { canal_id: equipo, texto: `${texto} para fijar` }));
    }
    const [uno = '', dos = '', tres = '', cuatro = ''] = ids;
    expect(
      elFallo(await api.ejecutar(sara, 'fijar_mensaje', { mensaje_id: uno, fijado: true })),
    ).toBe('sin_permiso');
    for (const id of [uno, dos, tres]) {
      losDatos(await api.ejecutar(rosa, 'fijar_mensaje', { mensaje_id: id, fijado: true }));
    }
    expect(
      elFallo(await api.ejecutar(rosa, 'fijar_mensaje', { mensaje_id: cuatro, fijado: true })),
    ).toBe('faltan_datos');

    const visto = await elCanal(sara, equipo);
    expect(visto.fijados.map((f) => f.id)).toEqual([uno, dos, tres]);
    expect(visto.canal.puedeFijar).toBe(false);
    expect((await elCanal(rosa, equipo)).canal.puedeFijar).toBe(true);

    losDatos(await api.ejecutar(rosa, 'fijar_mensaje', { mensaje_id: uno, fijado: false }));
    expect((await elCanal(sara, equipo)).fijados.map((f) => f.id)).toEqual([dos, tres]);
    expect((await unMensaje(sara, equipo, uno)).texto).toBe('Uno para fijar');
  });

  it('en un privado no se fija nada', async () => {
    const { canalId } = losDatos<{ canalId: string }>(
      await api.ejecutar(rosa, 'abrir_privado', { personas: [saraId] }),
    );
    const id = await escribir(rosa, { canal_id: canalId, texto: '¿Puedes venir antes?' });
    expect(
      elFallo(await api.ejecutar(rosa, 'fijar_mensaje', { mensaje_id: id, fijado: true })),
    ).toBe('faltan_datos');
    expect(
      elFallo(
        await api.ejecutar(rosa, 'escribir_en_el_chat', {
          canal_id: canalId,
          texto: 'Confírmalo',
          pide_confirmar: true,
        }),
      ),
    ).toBe('faltan_datos');
  });
});

describe('confirmar que lo he leído', () => {
  let pedido: string;

  it('lo pide quien lleva el equipo, y quien lo pidió ve quién falta', async () => {
    expect(
      elFallo(
        await api.ejecutar(sara, 'escribir_en_el_chat', {
          canal_id: equipo,
          texto: 'Confirmad',
          pide_confirmar: true,
        }),
      ),
    ).toBe('sin_permiso');
    pedido = await escribir(rosa, {
      canal_id: equipo,
      texto: 'El lunes no hay pescado',
      pide_confirmar: true,
    });

    const deSara = await unMensaje(sara, equipo, pedido);
    expect(deSara.confirmar).toMatchObject({ cuantos: 0, mio: 'falta', faltan: null });
    const deRosa = await unMensaje(rosa, equipo, pedido);
    expect(deRosa.confirmar?.mio).toBeNull();
    expect(deRosa.confirmar?.faltan).toEqual(expect.arrayContaining(['Marcos', 'Sara']));
    expect(deRosa.sePuedeBorrar).toBe(false);
  });

  it('no se corrige ni se borra: se manda otro', async () => {
    expect(
      elFallo(await api.ejecutar(rosa, 'corregir_mensaje', { mensaje_id: pedido, texto: 'Otro' })),
    ).toBe('faltan_datos');
    expect(elFallo(await api.ejecutar(rosa, 'borrar_mensaje', { mensaje_id: pedido }))).toBe(
      'faltan_datos',
    );
  });

  it('se confirma una vez y no se deshace; a quien no se lo pide, no', async () => {
    losDatos(await api.ejecutar(sara, 'confirmar_mensaje', { mensaje_id: pedido }));
    losDatos(await api.ejecutar(sara, 'confirmar_mensaje', { mensaje_id: pedido }));
    expect((await unMensaje(sara, equipo, pedido)).confirmar?.mio).toBe('hecho');
    const deRosa = await unMensaje(rosa, equipo, pedido);
    expect(deRosa.confirmar?.cuantos).toBe(1);
    expect(deRosa.confirmar?.faltan).not.toContain('Sara');
    expect(elFallo(await api.ejecutar(rosa, 'confirmar_mensaje', { mensaje_id: pedido }))).toBe(
      'faltan_datos',
    );
  });

  it('a quien falta se le recuerda una vez, al empezar su día, y confirmar lo quita', async () => {
    const [programado] = await comoDuena<{ cuando: string }>(
      `select to_char(cuando at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as cuando
         from estook.al_movil_programado where tipo = 'chat.confirmar' and clave = $1`,
      [`${pedido}:${marcosId}`],
    );
    // Lo pidió el martes a las 10:00; su día empieza el miércoles a las 08:00 de Madrid.
    expect(programado?.cuando).toBe('2026-10-07T06:00:00Z');
    // A Sara, que ya confirmó, se le apuntó igual, pero al llegar su hora no se avisa.

    ahora = new Date('2026-10-07T06:01:00Z');
    await api.despachador.alMovil(quien(), SECRETO);
    const avisos = losDatos<{ avisos: { tipo: string; titulo: string; ir: string | null }[] }>(
      await api.consultar(marcos, 'mis_avisos'),
    ).avisos.filter((a) => a.tipo === 'chat.confirmar');
    expect(avisos).toEqual([
      expect.objectContaining({
        titulo: 'Te falta confirmar un mensaje de Rosa en Todo el equipo',
        ir: `/chat/${equipo}`,
      }),
    ]);
    const deSara = losDatos<{ avisos: { tipo: string }[] }>(
      await api.consultar(sara, 'mis_avisos'),
    ).avisos.filter((a) => a.tipo === 'chat.confirmar');
    expect(deSara).toEqual([]);

    losDatos(await api.ejecutar(marcos, 'confirmar_mensaje', { mensaje_id: pedido }));
    const despues = losDatos<{ avisos: { tipo: string }[] }>(
      await api.consultar(marcos, 'mis_avisos'),
    ).avisos.filter((a) => a.tipo === 'chat.confirmar');
    expect(despues).toEqual([]);
    ahora = new Date('2026-10-06T08:00:00Z');
  });
});

describe('las tarjetas', () => {
  it('un producto del local, como tarjeta; uno de otro local, no', async () => {
    const [producto] = await comoDuena<{ id: string; nombre: string }>(
      `insert into estook.producto (local_id, nombre) values ($1, 'Pulpo de la tarjeta')
       returning id::text as id, nombre`,
      [centro],
    );
    const [otro] = await comoDuena<{ id: string }>(
      `select id::text as id from estook.local where codigo = 'bar-puerto'`,
    );
    const [deOtro] = await comoDuena<{ id: string }>(
      `insert into estook.producto (local_id, nombre) values ($1, 'Pulpo de otro local')
       returning id::text as id`,
      [otro?.id],
    );
    const id = await escribir(rosa, {
      canal_id: equipo,
      tarjeta: { tipo: 'producto', id: producto?.id },
    });
    const visto = await unMensaje(rosa, equipo, id);
    expect(visto.tarjeta).toMatchObject({
      tipo: 'producto',
      id: producto?.id,
      producto: { nombre: producto?.nombre },
    });
    const lista = (await susCanales(rosa)).find((c) => c.id === equipo);
    expect(lista?.ultimo?.vista).toBe('Un producto');

    expect(
      elFallo(
        await api.ejecutar(rosa, 'escribir_en_el_chat', {
          canal_id: equipo,
          tarjeta: { tipo: 'producto', id: deOtro?.id },
        }),
      ),
    ).toBe('no_existe');
  });
});

describe('el horario, avisado en el chat', () => {
  const SIGUIENTE = '2026-10-12';

  it('solo de una semana publicada, y suena a quien no le ha llegado su horario (repaso del 10-oct)', async () => {
    expect(elFallo(await api.ejecutar(rosa, 'avisar_del_horario', { lunes: SIGUIENTE }))).toBe(
      'faltan_datos',
    );
    losDatos(
      await api.ejecutar(rosa, 'poner_tramo', {
        lunes: SIGUIENTE,
        persona_id: marcosId,
        dia: SIGUIENTE,
        tipo: 'trabajo',
        entra: '10:00',
        sale: '16:00',
      }),
    );
    losDatos(await api.ejecutar(rosa, 'publicar_el_horario', { lunes: SIGUIENTE }));
    expect(elFallo(await api.ejecutar(sara, 'avisar_del_horario', { lunes: SIGUIENTE }))).toBe(
      'sin_permiso',
    );
    const { mensajeId } = losDatos<{ mensajeId: string }>(
      await api.ejecutar(rosa, 'avisar_del_horario', { lunes: SIGUIENTE }),
    );
    expect((await unMensaje(marcos, equipo, mensajeId)).tarjeta).toEqual({
      tipo: 'horario',
      lunes: SIGUIENTE,
    });
    // «Le doy a sí, avisar, y nada»: ahora suena. A Sara, que no tiene turno esa semana
    // y no había recibido nada; a Marcos no, que ya tiene lo suyo.
    const esperando = await comoDuena<{ persona_id: string; le_mencionan: boolean }>(
      'select persona_id::text as persona_id, le_mencionan from estook.chat_al_movil where ultimo_id = $1',
      [mensajeId],
    );
    const aQuien = esperando.map((e) => e.persona_id);
    expect(aQuien).toContain(saraId);
    expect(aQuien).not.toContain(marcosId);
    // Y no dice «te nombran», que no es verdad.
    expect(esperando.every((e) => !e.le_mencionan)).toBe(true);
  });
});

describe('el correo del chat', () => {
  it('a quien no tiene móvil le llegan sus privados, sin el texto, uno al día', async () => {
    ahora = new Date('2026-10-06T09:00:00Z'); // 11:00 en Madrid
    await comoDuena('delete from estook.movil_suscrito where persona_id = $1', [saraId]);
    // Lo de las pruebas de antes (el privado de Rosa ya le mandó uno hoy), fuera.
    await comoDuena('delete from estook.correo_del_chat where persona_id = $1', [saraId]);
    await comoDuena('delete from estook.chat_al_movil where persona_id = $1', [saraId]);
    const antes = correo.mandados.length;
    const { canalId } = losDatos<{ canalId: string }>(
      await api.ejecutar(marcos, 'abrir_privado', { personas: [saraId] }),
    );
    await escribir(marcos, { canal_id: canalId, texto: 'Te dejo la llave en la barra' });

    const nuevos = correo.mandados.slice(antes).filter((c) => c.para === SARA);
    expect(nuevos.map((c) => c.asunto)).toEqual(['Tienes un mensaje sin leer en el chat']);
    expect(nuevos[0]?.texto).toContain('Marcos: 1');
    expect(nuevos[0]?.texto).not.toContain('llave');

    // Otro el mismo día: espera al día siguiente, no sale otro correo.
    await escribir(marcos, { canal_id: canalId, texto: 'Y cierra la cámara' });
    expect(correo.mandados.slice(antes).filter((c) => c.para === SARA)).toHaveLength(1);

    // Lo de «Todo el equipo» que no la nombra no va al correo.
    await escribir(marcos, { canal_id: equipo, texto: 'Buenos días' });
    const [deEquipo] = await comoDuena<{ cuantos: number }>(
      'select count(*)::int as cuantos from estook.chat_al_movil where persona_id = $1 and canal_id = $2',
      [saraId, equipo],
    );
    expect(deEquipo?.cuantos).toBe(0);

    // Leerlo en el chat lo quita antes de que salga.
    const [ultimo] = (await elCanal(sara, canalId)).mensajes.slice(-1);
    losDatos(
      await api.ejecutar(sara, 'leer_el_canal', { canal_id: canalId, hasta: ultimo?.id ?? '0' }),
    );
    const [queda] = await comoDuena<{ cuantos: number }>(
      'select count(*)::int as cuantos from estook.chat_al_movil where persona_id = $1',
      [saraId],
    );
    expect(queda?.cuantos).toBe(0);
  });
});
