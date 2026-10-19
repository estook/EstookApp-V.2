import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { modeloDeMentira } from '../../servidor/ia/modelo.ts';
import { levantarBase, type BaseDePrueba } from './entorno.ts';
import { elFallo, losDatos, montarLaApi, type ApiDePrueba } from './despachador.ts';

/**
 * Fogón 1 · 2 y 1 · 3 (decisión 0098), con un modelo de mentira que no gasta y guarda lo
 * que le piden.
 *
 *   · **sabe quién pregunta**, y solo eso: su nombre de pila y su puesto
 *   · lee la merma dicha y por foto; una foto que no es una foto, no pasa
 *   · cada cosa la pide quien puede hacerla en la pantalla de siempre
 *   · el horario: al modelo **no le llega ni un nombre**, y se pone en el borrador solo
 *     en una semana vacía
 *   · revisar los datos: las reglas, gratis; y **la revisión de noche**, la madrugada del
 *     lunes, una vez por semana, con su aviso
 */
let base: BaseDePrueba;
let api: ApiDePrueba;
const modelo = modeloDeMentira();

const ROSA = 'rosa@ejemplo.estook.com'; // gerente de Bar Centro
const MARCOS = 'marcos@ejemplo.estook.com'; // cocinero
const SARA = 'sara@ejemplo.estook.com'; // camarera
const SECRETO = 'el-secreto-del-reloj-de-fogon';

let rosa: string;
let marcos: string;
let sara: string;
let organizacion: string;

/** Los primeros bytes de un JPEG, y relleno: lo que mira el servidor para fiarse. */
const UN_JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(200, 1)]);
/** Los de un PNG, diciendo que es JPEG: no pasa. */
const UN_PNG = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.alloc(200, 1),
]);

async function comoDuena<T>(consulta: string, parametros: unknown[] = []): Promise<T[]> {
  const { rows } = await base.bd.query<T>(consulta, parametros);
  return rows;
}

function laUltimaPedida() {
  const pedida = modelo.pedidas.at(-1);
  if (pedida === undefined) throw new Error('No se ha pedido nada al modelo');
  return pedida;
}

/** La API a una hora dada: para el reloj. */
function apiEl(instante: string): ApiDePrueba {
  return montarLaApi(base.bd, { fogon: modelo, ahora: () => new Date(instante) });
}

async function latirEl(instante: string) {
  return apiEl(instante).despachador.latir(
    { tokenDeSesion: null, correlacionId: crypto.randomUUID() },
    SECRETO,
  );
}

beforeAll(async () => {
  base = await levantarBase();
  api = montarLaApi(base.bd, { fogon: modelo });

  // Bar Centro deja de ser un ejemplo: el reloj no mira los ejemplos.
  await comoDuena(`update estook.organizacion set es_ejemplo = false where codigo = 'bar-centro'`);
  await comoDuena(`update estook.local set es_ejemplo = false where codigo = 'bar-centro'`);
  await comoDuena(
    `update plataforma.reloj set huella = encode(sha256(convert_to($1, 'UTF8')), 'hex')`,
    [SECRETO],
  );
  const centro = await base.localPorCodigo('bar-centro');
  const [org] = await comoDuena<{ organizacion_id: string }>(
    'select organizacion_id from estook.local where id = $1',
    [centro],
  );
  organizacion = org?.organizacion_id ?? '';
  await comoDuena('update plataforma.fogon set encendido = true where unica');
  await comoDuena(
    `insert into plataforma.fogon_del_cliente (organizacion_id, encendido) values ($1, true)
     on conflict (organizacion_id) do update set encendido = true`,
    [organizacion],
  );

  rosa = await api.entrar(ROSA);
  marcos = await api.entrar(MARCOS);
  sara = await api.entrar(SARA);
  // Los productos del ejemplo no cuentan para la merma: uno de verdad.
  await api.ejecutar(rosa, 'crear_producto', {
    nombre: 'Vino de la casa',
    unidad_de_uso: 'ud',
    precio_centimos: 500,
  });
  await api.ejecutar(rosa, 'crear_platos', {
    seccion_id: null,
    platos: [{ nombre: 'Pulpo de la revisión', precio_centimos: 1800 }],
  });
}, 120_000);

afterAll(async () => {
  await base.cerrar();
});

describe('sabe quién pregunta', () => {
  it('su nombre de pila y su puesto, y nada de nadie más', async () => {
    await api.ejecutar(marcos, 'preguntar_a_fogon', { pregunta: '¿Qué hago hoy?', donde: '' });
    const resumen = laUltimaPedida().resumen;
    expect(resumen).toMatch(/Te pregunta Marcos \(su puesto en este local: /);
    expect(resumen).not.toMatch(/Rosa|Sara/);
  });
});

describe('lee la merma', () => {
  it('dicha: con tus productos, y sin foto', async () => {
    const leidas = losDatos<{
      mermas: { producto: { nombre: string } | null; motivo: string }[];
    }>(await api.ejecutar(sara, 'leer_la_merma_con_fogon', { dicho: 'se han roto dos botellas' }));
    expect(leidas.mermas[0]?.producto?.nombre).toBe('Vino de la casa');
    expect(leidas.mermas[0]?.motivo).toBe('roto');
    expect(laUltimaPedida().foto).toBeUndefined();
  });

  it('por foto: la foto llega al modelo', async () => {
    await api.ejecutar(sara, 'leer_la_merma_con_fogon', {
      foto: { tipo: 'image/jpeg', base64: UN_JPEG.toString('base64') },
    });
    expect(laUltimaPedida().foto?.tipo).toBe('image/jpeg');
  });

  it('una foto que no es lo que dice, no pasa y no se le enseña a nadie', async () => {
    const antes = modelo.pedidas.length;
    const fallo = await api.ejecutar(sara, 'leer_la_merma_con_fogon', {
      foto: { tipo: 'image/jpeg', base64: UN_PNG.toString('base64') },
    });
    expect(elFallo(fallo)).toBe('faltan_datos');
    expect(modelo.pedidas).toHaveLength(antes);
  });
});

describe('cada cosa, quien puede hacerla', () => {
  it('la camarera no lee el Z ni revisa los datos', async () => {
    const foto = { tipo: 'image/jpeg', base64: UN_JPEG.toString('base64') };
    expect(elFallo(await api.ejecutar(sara, 'leer_el_cierre_con_fogon', { foto }))).toBe(
      'sin_permiso',
    );
    expect(elFallo(await api.ejecutar(sara, 'revisar_mis_datos_con_fogon', {}))).toBe(
      'sin_permiso',
    );
  });

  it('la gerente lee el Z, en céntimos', async () => {
    const z = losDatos<{ totalCentimos: number; tarjetaCentimos: number }>(
      await api.ejecutar(rosa, 'leer_el_cierre_con_fogon', {
        foto: { tipo: 'image/jpeg', base64: UN_JPEG.toString('base64') },
      }),
    );
    expect(z.totalCentimos).toBe(123_450);
    expect(z.tarjetaCentimos).toBe(83_450);
  });
});

describe('el horario', () => {
  const LUNES = '2031-03-03';

  it('al modelo le llegan códigos, nunca nombres', async () => {
    const cuadrante = losDatos<{ tramos: { personaId: string; dia: string }[] }>(
      await api.ejecutar(rosa, 'hacer_el_cuadrante_con_fogon', {
        lunes: LUNES,
        dias_fuertes: ['2031-03-07', '2031-03-08'],
        en_los_fuertes: [],
        turnos: 'Mediodía 12:00 a 16:00',
      }),
    );
    expect(cuadrante.tramos.length).toBeGreaterThan(0);
    const lo = laUltimaPedida().mensajes.at(-1)?.texto ?? '';
    expect(lo).toMatch(/^P1 · /m);
    expect(lo).not.toMatch(/Marcos|Sara|Rosa/);
  });

  it('se pone en el borrador de una semana vacía, y no encima de lo puesto', async () => {
    const cuadrante = losDatos<{
      tramos: { personaId: string; dia: string; entra: string; sale: string }[];
    }>(
      await api.ejecutar(rosa, 'hacer_el_cuadrante_con_fogon', {
        lunes: LUNES,
        dias_fuertes: [],
        en_los_fuertes: [],
        turnos: '',
      }),
    );
    const tramos = cuadrante.tramos.map((t) => ({
      persona_id: t.personaId,
      dia: t.dia,
      entra: t.entra,
      sale: t.sale,
      descanso_minutos: 0,
    }));
    const puesto = losDatos<{ puestos: number; noCaben: number }>(
      await api.ejecutar(rosa, 'poner_el_cuadrante_de_fogon', { lunes: LUNES, tramos }),
    );
    expect(puesto.puestos).toBe(tramos.length);
    expect(puesto.noCaben).toBe(0);
    expect(
      elFallo(await api.ejecutar(rosa, 'poner_el_cuadrante_de_fogon', { lunes: LUNES, tramos })),
    ).toBe('faltan_datos');
  });
});

describe('revisar los datos', () => {
  it('a mano: el plato sin escandallo sale, y se guarda', async () => {
    const revision = losDatos<{ hallazgos: { que: string; texto: string }[] }>(
      await api.ejecutar(rosa, 'revisar_mis_datos_con_fogon', {}),
    );
    expect(revision.hallazgos.some((h) => h.texto.includes('Pulpo de la revisión'))).toBe(true);
    const guardada = losDatos<{ revision: { deNoche: boolean } | null }>(
      await api.consultar(rosa, 'la_revision_de_fogon'),
    );
    expect(guardada.revision?.deNoche).toBe(false);
  });

  it('de noche: el lunes de madrugada, una vez, con su aviso', async () => {
    // El lunes 3 de marzo de 2031 a las 3 de Madrid (las 2 en UTC, en invierno).
    await latirEl('2031-03-03T02:00:00Z');
    const deNoche = await comoDuena<{ hallazgos: unknown[] }>(
      `select hallazgos from estook.revision_de_fogon
        where organizacion_id = $1 and de_noche and semana = '2031-03-03'`,
      [organizacion],
    );
    expect(deNoche).toHaveLength(1);
    const avisos = await comoDuena<{ tipo: string }>(
      `select tipo from estook.aviso where tipo = 'fogon.revision' and organizacion_id = $1`,
      [organizacion],
    );
    expect(avisos.length).toBeGreaterThan(0);

    // Otra hora de la misma noche: no se repite.
    await latirEl('2031-03-03T04:00:00Z');
    const otraVez = await comoDuena<{ id: string }>(
      `select id from estook.revision_de_fogon
        where organizacion_id = $1 and de_noche and semana = '2031-03-03'`,
      [organizacion],
    );
    expect(otraVez).toHaveLength(1);
  });

  it('otro día de la semana, no hace nada', async () => {
    await latirEl('2031-03-11T02:00:00Z'); // martes
    const delMartes = await comoDuena<{ id: string }>(
      `select id from estook.revision_de_fogon
        where organizacion_id = $1 and de_noche and semana = '2031-03-10'`,
      [organizacion],
    );
    expect(delMartes).toHaveLength(0);
  });
});
