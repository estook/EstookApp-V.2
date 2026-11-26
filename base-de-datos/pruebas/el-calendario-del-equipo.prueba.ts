import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { movilDeMentira } from '../../servidor/infraestructura/movil.ts';
import { levantarBase, type BaseDePrueba } from './entorno.ts';
import { elFallo, losDatos, montarLaApi, type ApiDePrueba } from './despachador.ts';

/**
 * La Ampliación 4 · 3 · El calendario del equipo (decisión 0153, sección 5; migración 0131).
 *
 *   · el gerente y los jefes ponen recordatorios para todos, sala o cocina; la camarera, no
 *   · cada uno ve los que le tocan: lo de cocina no lo ve la sala (lo filtra la base)
 *   · moverlo a otro día dura lo mismo; quitarlo lo quita
 *   · avisa a su hora, cada día, solo a quien le toca; y si se mueve, el día de antes ya no avisa
 *   · las notas de cada uno no las ve nadie más, tampoco el gerente; y avisan a su hora
 */
let base: BaseDePrueba;
let api: ApiDePrueba;
let ahora = new Date('2026-12-01T07:30:00Z'); // martes 1 de diciembre, 8:30 en Madrid

const SECRETO = 'el-secreto-del-reloj-de-la-4-3';
const quien = () => ({ tokenDeSesion: null, correlacionId: crypto.randomUUID() });

const ROSA = 'rosa@ejemplo.estook.com'; // gerente de Bar Centro
const MARCOS = 'marcos@ejemplo.estook.com'; // cocinero
const SARA = 'sara@ejemplo.estook.com'; // camarera

let rosa: string;
let marcos: string;
let sara: string;
let laLimpieza: string;

async function comoDuena<T>(consulta: string, parametros: unknown[] = []): Promise<T[]> {
  const { rows } = await base.bd.query<T>(consulta, parametros);
  return rows;
}

async function susAvisos(token: string, tipo: string) {
  return losDatos<{ avisos: { tipo: string; titulo: string; detalle: string | null }[] }>(
    await api.consultar(token, 'mis_avisos'),
  ).avisos.filter((a) => a.tipo === tipo);
}

async function loQueVe(token: string) {
  return losDatos<{
    puedePoner: boolean;
    recordatorios: {
      id: string;
      titulo: string;
      para: string;
      dia: string;
      hastaEl: string | null;
    }[];
  }>(
    await api.consultar(token, 'el_calendario_del_equipo', {
      desde: '2026-12-01',
      hasta: '2026-12-31',
    }),
  );
}

beforeAll(async () => {
  base = await levantarBase();
  api = montarLaApi(base.bd, { movil: movilDeMentira(), ahora: () => ahora });
  // Que el reloj mire Bar Centro: los ejemplos no tienen avisos programados.
  await comoDuena(`update estook.organizacion set es_ejemplo = false where codigo = 'bar-centro'`);
  await comoDuena(`update estook.local set es_ejemplo = false where codigo = 'bar-centro'`);
  await comoDuena(
    `update plataforma.reloj set huella = encode(sha256(convert_to($1, 'UTF8')), 'hex')`,
    [SECRETO],
  );
  rosa = await api.entrar(ROSA);
  marcos = await api.entrar(MARCOS);
  sara = await api.entrar(SARA);
}, 120_000);

afterAll(async () => {
  await base.cerrar();
});

describe('los recordatorios del equipo', () => {
  it('la camarera no pone recordatorios; el gerente sí, para la cocina, de dos días', async () => {
    const entrada = {
      titulo: 'Limpieza a fondo',
      tipo: 'limpieza',
      para: 'cocina',
      dia: '2026-12-01',
      hasta_el: '2026-12-02',
      avisa_a: '09:00',
    };
    expect(elFallo(await api.ejecutar(sara, 'poner_recordatorio', entrada))).toBe('sin_permiso');
    laLimpieza = losDatos<{ id: string }>(
      await api.ejecutar(rosa, 'poner_recordatorio', entrada),
    ).id;
    expect(
      elFallo(
        await api.ejecutar(rosa, 'poner_recordatorio', {
          ...entrada,
          dia: '2026-11-20',
          hasta_el: undefined,
        }),
      ),
    ).toBe('faltan_datos');
  });

  it('lo de cocina lo ve la cocina y quien lleva el local, no la sala', async () => {
    const deRosa = await loQueVe(rosa);
    expect(deRosa.puedePoner).toBe(true);
    expect(deRosa.recordatorios.map((r) => r.titulo)).toEqual(['Limpieza a fondo']);
    expect(deRosa.recordatorios[0]).toMatchObject({ para: 'cocina', hastaEl: '2026-12-02' });
    const deMarcos = await loQueVe(marcos);
    expect(deMarcos.puedePoner).toBe(false);
    expect(deMarcos.recordatorios.map((r) => r.titulo)).toEqual(['Limpieza a fondo']);
    expect((await loQueVe(sara)).recordatorios).toEqual([]);
  });

  it('avisa a su hora, cada día, solo a quien le toca', async () => {
    // Se puso a las 8:30 con aviso a las 9:00: se apuntó ya, sin esperar al latido.
    const apuntados = await comoDuena<{ clave: string }>(
      `select clave from estook.al_movil_programado where tipo = 'calendario.recordatorio'`,
    );
    expect(apuntados.map((a) => a.clave)).toEqual([`${laLimpieza}:2026-12-01`]);

    ahora = new Date('2026-12-01T08:01:00Z');
    await api.despachador.alMovil(quien(), SECRETO);
    const deMarcos = await susAvisos(marcos, 'calendario.recordatorio');
    expect(deMarcos).toEqual([
      expect.objectContaining({
        titulo: 'Hoy: Limpieza a fondo',
        detalle: 'Todo el día · día 1 de 2 · solo cocina',
      }),
    ]);
    expect(await susAvisos(sara, 'calendario.recordatorio')).toEqual([]);
  });

  it('moverlo a otro día dura lo mismo, y el día de antes ya no avisa', async () => {
    // Lo del día 2 queda apuntado; al moverlo, ese día ya no es suyo.
    await comoDuena(
      `insert into estook.al_movil_programado (local_id, persona_id, tipo, clave, cuando)
       select local_id, null, 'calendario.recordatorio', id::text || ':2026-12-02',
              '2026-12-02T08:00:00Z'::timestamptz
         from estook.evento_de_calendario where id = $1`,
      [laLimpieza],
    );
    const movido = losDatos<{ dia: string; hastaEl: string | null }>(
      await api.ejecutar(rosa, 'mover_recordatorio', { id: laLimpieza, dia: '2026-12-14' }),
    );
    expect(movido).toEqual({ dia: '2026-12-14', hastaEl: '2026-12-15' });
    expect(
      elFallo(
        await api.ejecutar(marcos, 'mover_recordatorio', { id: laLimpieza, dia: '2026-12-20' }),
      ),
    ).toBe('sin_permiso');

    ahora = new Date('2026-12-02T08:01:00Z');
    await api.despachador.alMovil(quien(), SECRETO);
    expect(await susAvisos(marcos, 'calendario.recordatorio')).toHaveLength(1);
  });

  it('quitarlo lo quita', async () => {
    losDatos(await api.ejecutar(rosa, 'quitar_recordatorio', { id: laLimpieza }));
    expect((await loQueVe(rosa)).recordatorios).toEqual([]);
    expect(elFallo(await api.ejecutar(rosa, 'quitar_recordatorio', { id: laLimpieza }))).toBe(
      'no_existe',
    );
  });
});

describe('las notas de cada uno', () => {
  let laNota: string;

  it('se apuntan con aviso, y no las ve nadie más, tampoco el gerente', async () => {
    ahora = new Date('2026-12-03T10:30:00Z'); // 11:30 en Madrid
    laNota = losDatos<{ id: string }>(
      await api.ejecutar(sara, 'poner_mi_nota', {
        texto: 'Recoger el uniforme nuevo',
        dia: '2026-12-03',
        avisa_a: '12:00',
      }),
    ).id;
    const suyas = losDatos<{ notas: { texto: string; avisaA: string | null }[] }>(
      await api.consultar(sara, 'mis_notas', {}),
    );
    expect(suyas.notas).toEqual([
      expect.objectContaining({ texto: 'Recoger el uniforme nuevo', avisaA: '12:00' }),
    ]);
    const deRosa = losDatos<{ notas: unknown[] }>(await api.consultar(rosa, 'mis_notas', {}));
    expect(deRosa.notas).toEqual([]);
    expect(elFallo(await api.ejecutar(rosa, 'quitar_mi_nota', { id: laNota }))).toBe('no_existe');
  });

  it('avisa a su hora, solo a quien la apuntó', async () => {
    ahora = new Date('2026-12-03T11:01:00Z');
    await api.despachador.alMovil(quien(), SECRETO);
    expect(await susAvisos(sara, 'calendario.nota')).toEqual([
      expect.objectContaining({ titulo: 'Tu nota: Recoger el uniforme nuevo' }),
    ]);
    expect(await susAvisos(rosa, 'calendario.nota')).toEqual([]);
  });

  it('en Personal sale también lo del equipo que le toca', async () => {
    losDatos(
      await api.ejecutar(rosa, 'poner_recordatorio', {
        titulo: 'Formación de alérgenos',
        tipo: 'formacion',
        para: 'todos',
        dia: '2026-12-10',
        desde: '16:00',
      }),
    );
    const suyas = losDatos<{ delEquipo: { titulo: string }[] }>(
      await api.consultar(sara, 'mis_notas', {}),
    );
    expect(suyas.delEquipo.map((r) => r.titulo)).toEqual(['Formación de alérgenos']);
  });
});
