import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { movilDeMentira } from '../../servidor/infraestructura/movil.ts';
import { alSegundoDeMentira } from '../../servidor/infraestructura/al-segundo.ts';
import { levantarBase, type BaseDePrueba } from './entorno.ts';
import { elFallo, losDatos, montarLaApi, type ApiDePrueba } from './despachador.ts';

/**
 * C1 · el chat del equipo (decisiones 0071 y 0073 · migración 0056).
 *
 * Lo que no puede fallar, contra la base de verdad y con la sesión de cada uno:
 *
 *   · **Quién ve cada canal**: el del equipo, todo el local; Cocina, la cocina y quien
 *     lleva el local; Sala, la sala y quien lleva el local.
 *   · **Los privados, solo quien está dentro**: ni el gerente, ni preguntando por su
 *     identificador, ni en el buscador (Manifiesto 23, Roles 1.7).
 *   · **La gestoría no ve el chat** (Roles 1.8).
 *   · Corregir lo propio quince minutos; borrar de verdad; retirar, quien lleva el
 *     local, y nunca en un privado.
 *   · Al escribir: el toque al segundo para quien ve el canal, y el móvil a quien tiene
 *     móvil, en su hora, nunca a quien escribe.
 */

let base: BaseDePrueba;
let api: ApiDePrueba;
const movil = movilDeMentira();
const alSegundo = alSegundoDeMentira();

/** Las 10:00 en Madrid de un lunes: a quien no tiene horario le puede sonar. */
let ahora = new Date('2026-10-05T08:00:00Z');

const ROSA = 'rosa@ejemplo.estook.com'; // gerente de Bar Centro
const MARCOS = 'marcos@ejemplo.estook.com'; // cocinero de Bar Centro
const SARA = 'sara@ejemplo.estook.com'; // camarera de Bar Centro
const ASESORIA = 'asesoria@ejemplo.estook.com'; // gestoría de Grupo Costa

let rosa: string;
let marcos: string;
let sara: string;

interface CanalEnLista {
  id: string;
  tipo: string;
  nombre: string;
  sinLeer: number;
  teNombran: boolean;
}

async function susCanales(token: string): Promise<CanalEnLista[]> {
  return losDatos<{ canales: CanalEnLista[] }>(await api.consultar(token, 'mis_canales', {}))
    .canales;
}

async function elDe(token: string, tipo: string): Promise<string> {
  const canal = (await susCanales(token)).find((c) => c.tipo === tipo);
  if (canal === undefined) throw new Error(`no ve el canal ${tipo}`);
  return canal.id;
}

interface MensajeVisto {
  id: string;
  texto: string | null;
  borrado: boolean;
  retirado: boolean;
  editado: boolean;
  meNombran: boolean;
  reacciones: { emoji: string; cuantos: number; mia: boolean }[];
  estado: { como: string } | null;
}

async function losMensajes(token: string, canalId: string): Promise<MensajeVisto[]> {
  return losDatos<{ mensajes: MensajeVisto[] }>(
    await api.consultar(token, 'un_canal', { canal_id: canalId }),
  ).mensajes;
}

async function escribir(token: string, canalId: string, texto: string): Promise<string> {
  return losDatos<{ mensajeId: string }>(
    await api.ejecutar(token, 'escribir_en_el_chat', { canal_id: canalId, texto }),
  ).mensajeId;
}

async function suPersona(correo: string): Promise<string> {
  const { rows } = await base.bd.query<{ id: string }>(
    'select id::text as id from estook.persona where correo = $1',
    [correo],
  );
  const id = rows[0]?.id;
  if (id === undefined) throw new Error(`no existe ${correo}`);
  return id;
}

beforeAll(async () => {
  base = await levantarBase();
  api = montarLaApi(base.bd, { movil, alSegundo, ahora: () => ahora });
  rosa = await api.entrar(ROSA);
  marcos = await api.entrar(MARCOS);
  sara = await api.entrar(SARA);
}, 120_000);

afterAll(async () => {
  await base.cerrar();
});

/** «Cocina», que desde C2 la crea el gerente con quien quiere dentro (0075). */
let cocina: string;

describe('los canales', () => {
  it('de fábrica solo sale «Todo el equipo», una sola vez (0075)', async () => {
    const tema = losDatos<{ tema: string }>(await api.ejecutar(rosa, 'abrir_el_chat', {})).tema;
    expect(tema.length).toBeGreaterThanOrEqual(48);
    // Abrirlo otra vez no duplica nada, y el tema es el mismo.
    expect(losDatos<{ tema: string }>(await api.ejecutar(rosa, 'abrir_el_chat', {})).tema).toBe(
      tema,
    );
    losDatos(await api.ejecutar(marcos, 'abrir_el_chat', {}));
    losDatos(await api.ejecutar(sara, 'abrir_el_chat', {}));

    const deRosa = await susCanales(rosa);
    expect(deRosa.map((c) => c.nombre)).toEqual(['Todo el equipo']);
  });

  it('el gerente crea «Cocina» con Marcos dentro, y la sala no la ve', async () => {
    const idDeMarcos = await suPersona(MARCOS);
    cocina = losDatos<{ canalId: string }>(
      await api.ejecutar(rosa, 'crear_canal', { nombre: 'Cocina', personas: [idDeMarcos] }),
    ).canalId;
    expect((await susCanales(marcos)).map((c) => c.nombre)).toEqual(['Todo el equipo', 'Cocina']);
    expect((await susCanales(sara)).map((c) => c.tipo)).toEqual(['equipo']);
  });

  it('y lo de Cocina no se lee desde la sala, ni preguntando por el canal', async () => {
    expect(elFallo(await api.consultar(sara, 'un_canal', { canal_id: cocina }))).toBe('no_existe');
    expect(
      elFallo(await api.ejecutar(sara, 'escribir_en_el_chat', { canal_id: cocina, texto: 'Hola' })),
    ).toBe('no_existe');
  });
});

describe('escribir', () => {
  it('nombrar a alguien se cuenta, y quien escribe no tiene nada sin leer', async () => {
    alSegundo.toques.length = 0;
    await escribir(marcos, cocina, '@Rosa se ha acabado el pulpo');

    const deRosa = (await susCanales(rosa)).find((c) => c.id === cocina);
    expect(deRosa).toMatchObject({ sinLeer: 1, teNombran: true });
    expect((await susCanales(marcos)).find((c) => c.id === cocina)?.sinLeer).toBe(0);
    const [mensaje] = await losMensajes(rosa, cocina);
    expect(mensaje?.meNombran).toBe(true);
  });

  it('el toque al segundo va a quien ve el canal, y nunca lleva el mensaje', async () => {
    const temas = await base.bd.query<{ persona: string; tema: string }>(
      `select p.correo as persona, t.tema from estook.tema_al_segundo t
         join estook.persona p on p.id = t.persona_id`,
    );
    const deSara = temas.rows.find((t) => t.persona === SARA)?.tema;
    const deRosa = temas.rows.find((t) => t.persona === ROSA)?.tema;
    const tocados = alSegundo.toques.map((t) => t.tema);
    expect(tocados).toContain(deRosa);
    // Sara no ve Cocina: a ella no le llega ni el toque.
    expect(tocados).not.toContain(deSara);
    expect(Object.keys(alSegundo.toques[0] ?? {}).sort()).toEqual(['canalId', 'tema']);
  });

  it('leer el canal lo deja a cero, y a quien escribió le sale leído', async () => {
    const [mensaje] = await losMensajes(rosa, cocina);
    losDatos(
      await api.ejecutar(rosa, 'leer_el_canal', { canal_id: cocina, hasta: mensaje?.id ?? '0' }),
    );
    expect((await susCanales(rosa)).find((c) => c.id === cocina)?.sinLeer).toBe(0);
    const [suyo] = await losMensajes(marcos, cocina);
    expect(suyo?.estado).toEqual({ como: 'leido', todos: true });
  });

  it('las reacciones se ponen y se quitan con el mismo toque', async () => {
    const [mensaje] = await losMensajes(rosa, cocina);
    const id = mensaje?.id ?? '0';
    losDatos(await api.ejecutar(rosa, 'reaccionar', { mensaje_id: id, emoji: '👍' }));
    expect((await losMensajes(marcos, cocina))[0]?.reacciones).toEqual([
      expect.objectContaining({ emoji: '👍', cuantos: 1, mia: false }),
    ]);
    losDatos(await api.ejecutar(rosa, 'reaccionar', { mensaje_id: id, emoji: '👍' }));
    expect((await losMensajes(marcos, cocina))[0]?.reacciones).toEqual([]);
    expect(elFallo(await api.ejecutar(rosa, 'reaccionar', { mensaje_id: id, emoji: '💩' }))).toBe(
      'faltan_datos',
    );
  });
});

describe('corregir, borrar y retirar', () => {
  it('lo propio se corrige quince minutos, y sale editado', async () => {
    const equipo = await elDe(sara, 'equipo');
    const id = await escribir(sara, equipo, '¿Alguien me cambia el sabado?');
    expect(
      elFallo(await api.ejecutar(marcos, 'corregir_mensaje', { mensaje_id: id, texto: 'No' })),
    ).toBe('sin_permiso');
    losDatos(
      await api.ejecutar(sara, 'corregir_mensaje', {
        mensaje_id: id,
        texto: '¿Alguien me cambia el sábado?',
      }),
    );
    const visto = (await losMensajes(rosa, equipo)).find((m) => m.id === id);
    expect(visto).toMatchObject({ texto: '¿Alguien me cambia el sábado?', editado: true });

    ahora = new Date(ahora.getTime() + 16 * 60_000);
    expect(
      elFallo(await api.ejecutar(sara, 'corregir_mensaje', { mensaje_id: id, texto: 'Otra' })),
    ).toBe('faltan_datos');
  });

  it('borrar es de verdad: el texto no se guarda escondido', async () => {
    const equipo = await elDe(sara, 'equipo');
    const id = await escribir(sara, equipo, 'Esto no tenía que ir aquí');
    losDatos(await api.ejecutar(sara, 'borrar_mensaje', { mensaje_id: id }));
    const { rows } = await base.bd.query<{ texto: string | null }>(
      'select texto from estook.mensaje where id = $1',
      [id],
    );
    expect(rows[0]?.texto).toBeNull();
    expect((await losMensajes(rosa, equipo)).find((m) => m.id === id)).toMatchObject({
      borrado: true,
      texto: null,
    });
  });

  it('quien lleva el local retira de un canal, con su porqué; la camarera no', async () => {
    const equipo = await elDe(marcos, 'equipo');
    const id = await escribir(marcos, equipo, 'Algo que no tocaba');
    expect(
      elFallo(
        await api.ejecutar(sara, 'retirar_mensaje', { mensaje_id: id, motivo: 'No me gusta' }),
      ),
    ).toBe('sin_permiso');
    losDatos(
      await api.ejecutar(rosa, 'retirar_mensaje', { mensaje_id: id, motivo: 'No tocaba aquí' }),
    );
    expect((await losMensajes(sara, equipo)).find((m) => m.id === id)).toMatchObject({
      borrado: true,
      retirado: true,
    });
  });
});

describe('los privados', () => {
  let privado: string;

  it('los abre cualquiera, y con la misma persona sale el mismo', async () => {
    const idDeMarcos = await suPersona(MARCOS);
    const abierto = losDatos<{ canalId: string; nuevo: boolean }>(
      await api.ejecutar(sara, 'abrir_privado', { personas: [idDeMarcos] }),
    );
    expect(abierto.nuevo).toBe(true);
    privado = abierto.canalId;
    const otraVez = losDatos<{ canalId: string; nuevo: boolean }>(
      await api.ejecutar(sara, 'abrir_privado', { personas: [idDeMarcos] }),
    );
    expect(otraVez).toEqual({ canalId: privado, nuevo: false });
    await escribir(sara, privado, 'Te cambio el turno del domingo por el lunes');
  });

  it('se llama como la otra persona', async () => {
    expect((await susCanales(sara)).find((c) => c.id === privado)?.nombre).toBe('Marcos');
    expect((await susCanales(marcos)).find((c) => c.id === privado)?.nombre).toBe('Sara');
  });

  it('el gerente no lo ve: ni en la lista, ni por su identificador, ni en el buscador', async () => {
    expect((await susCanales(rosa)).some((c) => c.id === privado)).toBe(false);
    expect(elFallo(await api.consultar(rosa, 'un_canal', { canal_id: privado }))).toBe('no_existe');
    const deRosa = losDatos<{ encontrados: unknown[] }>(
      await api.consultar(rosa, 'buscar_en_el_chat', { texto: 'turno del domingo' }),
    );
    expect(deRosa.encontrados).toEqual([]);
    const deMarcos = losDatos<{ encontrados: { canalId: string }[] }>(
      await api.consultar(marcos, 'buscar_en_el_chat', { texto: 'turno del DOMINGO' }),
    );
    expect(deMarcos.encontrados.map((e) => e.canalId)).toEqual([privado]);
  });

  it('y en un privado no retira nadie más que quien lo escribió', async () => {
    const [mensaje] = await losMensajes(sara, privado);
    expect(
      elFallo(
        await api.ejecutar(rosa, 'retirar_mensaje', {
          mensaje_id: mensaje?.id ?? '0',
          motivo: 'Por si acaso',
        }),
      ),
    ).not.toBe('no ha fallado (ok)');
    expect((await losMensajes(sara, privado))[0]?.borrado).toBe(false);
  });

  it('un privado no se silencia: si te escriben a ti, te suena', async () => {
    expect(
      elFallo(
        await api.ejecutar(marcos, 'silenciar_canal', { canal_id: privado, silenciado: true }),
      ),
    ).toBe('faltan_datos');
  });

  it('solo se habla con gente del local', async () => {
    const deOtraCasa = await suPersona('pablo@ejemplo.estook.com');
    expect(elFallo(await api.ejecutar(sara, 'abrir_privado', { personas: [deOtraCasa] }))).toBe(
      'faltan_datos',
    );
  });
});

describe('los canales que crea quien lleva el local', () => {
  it('el gerente los crea con quien quiere; la camarera no puede', async () => {
    const idDeSara = await suPersona(SARA);
    expect(
      elFallo(await api.ejecutar(sara, 'crear_canal', { nombre: 'Barra', personas: [idDeSara] })),
    ).toBe('sin_permiso');
    const { canalId } = losDatos<{ canalId: string }>(
      await api.ejecutar(rosa, 'crear_canal', { nombre: 'Barra', personas: [idDeSara] }),
    );
    expect((await susCanales(sara)).find((c) => c.id === canalId)?.nombre).toBe('Barra');
    // Marcos no está dentro: no lo ve.
    expect((await susCanales(marcos)).some((c) => c.id === canalId)).toBe(false);
  });
});

describe('la gestoría', () => {
  it('no ve el chat', async () => {
    const asesoria = await api.entrar(ASESORIA);
    // Ve seis locales: entra en uno, como haría en la app.
    const { rows } = await base.bd.query<{ organizacion_id: string; id: string }>(
      `select l.organizacion_id::text as organizacion_id, l.id::text as id
         from estook.local l join estook.organizacion o on o.id = l.organizacion_id
        where o.codigo = 'grupo-costa' order by l.codigo limit 1`,
    );
    losDatos(
      await api.ejecutar(asesoria, 'cambiar_de_contexto', {
        organizacion_id: rows[0]?.organizacion_id,
        local_id: rows[0]?.id,
      }),
    );
    losDatos(await api.ejecutar(asesoria, 'abrir_el_chat', {}));
    expect(await susCanales(asesoria)).toEqual([]);
  });
});

describe('el móvil', () => {
  it('le suena a quien tiene móvil, no a quien escribe, y leer quita lo que esperaba', async () => {
    ahora = new Date('2026-10-05T08:30:00Z'); // 10:30 en Madrid
    losDatos(
      await api.ejecutar(marcos, 'poner_este_movil', {
        direccion: 'https://fcm.googleapis.com/fcm/send/el-de-marcos-en-el-chat',
        p256dh: `B${'A'.repeat(86)}`,
        auth: 'A'.repeat(22),
        aparato: 'Android · Chrome',
      }),
    );
    losDatos(
      await api.ejecutar(marcos, 'guardar_cuando_suena', {
        modo: 'fuera_del_silencio',
        desde: '23:00',
        hasta: '08:00',
      }),
    );
    const antes = movil.mandados.length;
    await escribir(rosa, cocina, 'Mañana viene el pescado a las nueve');

    const mandado = movil.mandados.at(-1);
    expect(movil.mandados.length).toBe(antes + 1);
    expect(mandado?.carga).toMatchObject({
      titulo: 'Cocina',
      detalle: 'Rosa: Mañana viene el pescado a las nueve',
      ir: `/chat/${cocina}`,
    });
    // Ya ha sonado: no queda nada esperando.
    const { rows } = await base.bd.query<{ cuantos: number }>(
      'select count(*)::int as cuantos from estook.chat_al_movil',
    );
    expect(rows[0]?.cuantos).toBe(0);
  });

  it('silenciado, no suena; salvo que le nombren', async () => {
    losDatos(await api.ejecutar(marcos, 'silenciar_canal', { canal_id: cocina, silenciado: true }));
    const antes = movil.mandados.length;
    await escribir(rosa, cocina, 'Recordad limpiar la plancha');
    expect(movil.mandados.length).toBe(antes);
    await escribir(rosa, cocina, '@Marcos ¿me confirmas el pedido?');
    expect(movil.mandados.length).toBe(antes + 1);
  });

  it('en sus horas de silencio espera, y no se pierde', async () => {
    ahora = new Date('2026-10-05T22:00:00Z'); // medianoche en Madrid
    const equipo = await elDe(rosa, 'equipo');
    const antes = movil.mandados.length;
    await escribir(rosa, equipo, 'Mañana abrimos una hora antes');
    expect(movil.mandados.length).toBe(antes);
    const { rows } = await base.bd.query<{ cuantos: number }>(
      'select count(*)::int as cuantos from estook.chat_al_movil',
    );
    expect(rows[0]?.cuantos).toBe(1);
  });

  // Lección 147: con la sesión de quien lee, el borrado no veía la fila y no quitaba
  // nada. A Richi le iba a sonar a las 8:00 lo que había leído a medianoche.
  it('leer el canal quita lo que esperaba: no suena lo ya leído', async () => {
    const equipo = await elDe(marcos, 'equipo');
    const ultimo = (await losMensajes(marcos, equipo)).at(-1);
    losDatos(await api.ejecutar(marcos, 'leer_el_canal', { canal_id: equipo, hasta: ultimo?.id }));
    const { rows } = await base.bd.query<{ cuantos: number }>(
      'select count(*)::int as cuantos from estook.chat_al_movil',
    );
    expect(rows[0]?.cuantos).toBe(0);
  });

  // Lección 148: lo que no podía sonar en doce horas se tiraba sin sonar nunca. Espera a
  // que pueda (aquí, a las 14:00 del día siguiente, dieciocho horas después).
  it('si su silencio es largo, espera a que acabe y no se tira', async () => {
    losDatos(
      await api.ejecutar(marcos, 'guardar_cuando_suena', {
        modo: 'fuera_del_silencio',
        desde: '20:00',
        hasta: '14:00',
      }),
    );
    ahora = new Date('2026-10-05T18:30:00Z'); // 20:30 en Madrid
    const equipo = await elDe(rosa, 'equipo');
    const antes = movil.mandados.length;
    await escribir(rosa, equipo, 'Mañana hay inventario a las cuatro');
    expect(movil.mandados.length).toBe(antes);
    const { rows } = await base.bd.query<{ cuantos: number; movil_desde: string }>(
      `select count(*)::int as cuantos, max(movil_desde)::text as movil_desde
         from estook.chat_al_movil`,
    );
    expect(rows[0]?.cuantos).toBe(1);
    expect(new Date(rows[0]?.movil_desde ?? '').toISOString()).toBe('2026-10-06T12:00:00.000Z');
  });
});
