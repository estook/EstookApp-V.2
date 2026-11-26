import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { levantarBase, type BaseDePrueba } from './entorno.ts';
import { elFallo, losDatos, montarLaApi, type ApiDePrueba } from './despachador.ts';

/**
 * La Ampliación 4 · 2 · Las vacaciones (decisión 0153, sección 5; migración 0129).
 *
 *   · se piden con el saldo de la ficha, y **no se pueden pedir más días de los que hay**
 *   · quien gestiona las de su gente aprueba, propone otras fechas o rechaza con motivo; y se las pone
 *   · la persona acepta las fechas propuestas, o retira las que pidió
 *   · a cada uno le llega su aviso, y a nadie más
 *   · aprobadas, salen en Turnos y restan del saldo de la ficha; Fogón no pone a nadie de vacaciones
 *   · un cocinero no ve las vacaciones de la camarera
 *   · en laborables no cuentan los días que suele librar: de su horario publicado o, si no, los que
 *     dice (Richi, 26-nov; migración 0130), y cada petición guarda con cuáles se contó
 */
let base: BaseDePrueba;
let api: ApiDePrueba;

const ROSA = 'rosa@ejemplo.estook.com'; // gerente de Bar Centro
const MARCOS = 'marcos@ejemplo.estook.com'; // cocinero
const SARA = 'sara@ejemplo.estook.com'; // camarera

let rosa: string;
let sara: string;
let marcos: string;
let saraId: string;
let marcosId: string;
let laDeSara: string;

async function comoDuena<T>(consulta: string, parametros: unknown[] = []): Promise<T[]> {
  const { rows } = await base.bd.query<T>(consulta, parametros);
  return rows;
}

async function idDe(correo: string): Promise<string> {
  const [fila] = await comoDuena<{ id: string }>(
    'select id::text as id from estook.persona where correo = $1',
    [correo],
  );
  return fila?.id ?? '';
}

function unaFicha(vacacionesAlAno: number, en: 'naturales' | 'laborables' = 'naturales') {
  return {
    origen: 'a_mano',
    laboral: {
      incorporacion: '2024-03-12',
      contrato: 'indefinido',
      jornada: 'completa',
      horas_semanales: 40,
      categoria: null,
      convenio: null,
      vacaciones_al_ano: vacacionesAlAno,
      vacaciones_en: en,
      pendientes_anteriores: 0,
    },
  };
}

async function susAvisos(personaId: string, tipo: string) {
  return comoDuena<{ titulo: string; ir: string }>(
    'select titulo, ir from estook.aviso where persona_id = $1 and tipo = $2 order by creado_en',
    [personaId, tipo],
  );
}

beforeAll(async () => {
  base = await levantarBase();
  api = montarLaApi(base.bd, { ahora: () => new Date('2026-11-25T10:00:00Z') });
  rosa = await api.entrar(ROSA);
  sara = await api.entrar(SARA);
  marcos = await api.entrar(MARCOS);
  saraId = await idDe(SARA);
  marcosId = await idDe(MARCOS);
}, 120_000);

afterAll(async () => {
  await base.cerrar();
});

describe('pedirlas', () => {
  it('sin los días en la ficha no se pueden pedir', async () => {
    const fallo = await api.ejecutar(sara, 'pedir_vacaciones', {
      desde: '2026-12-14',
      hasta: '2026-12-20',
    });
    expect(elFallo(fallo)).toBe('faltan_datos');
  });

  it('con la ficha, se piden, y le llega a quien las gestiona (no al cocinero)', async () => {
    losDatos(
      await api.ejecutar(rosa, 'guardar_la_ficha_del_trabajador', {
        persona_id: saraId,
        ...unaFicha(30),
      }),
    );
    const pedida = losDatos<{ solicitudId: string; estado: string; dias: number }>(
      await api.ejecutar(sara, 'pedir_vacaciones', {
        desde: '2026-12-14',
        hasta: '2026-12-20',
        nota: 'Boda de mi hermana',
      }),
    );
    laDeSara = pedida.solicitudId;
    expect(pedida).toMatchObject({ estado: 'pedida', dias: 7 });

    const rosaId = await idDe(ROSA);
    const [aviso] = await susAvisos(rosaId, 'vacaciones.pedidas');
    expect(aviso?.titulo).toBe('Sara pide vacaciones del 14 al 20 de diciembre');
    expect(aviso?.ir).toBe('/calendario/calendario/propuestas');
    expect(await susAvisos(marcosId, 'vacaciones.pedidas')).toHaveLength(0);

    const mias = losDatos<{ sePuedenPedir: number; pedidas: number }>(
      await api.consultar(sara, 'mis_vacaciones', {}),
    );
    expect(mias.pedidas).toBe(7);
    expect(mias.sePuedenPedir).toBe(23);
  });

  it('no deja pedir más días de los que quedan, ni pisar otras, ni el pasado', async () => {
    expect(
      elFallo(
        await api.ejecutar(sara, 'pedir_vacaciones', { desde: '2026-12-01', hasta: '2026-12-31' }),
      ),
    ).toBe('faltan_datos');
    expect(
      elFallo(
        await api.ejecutar(sara, 'pedir_vacaciones', { desde: '2026-12-18', hasta: '2026-12-22' }),
      ),
    ).toBe('faltan_datos');
    expect(
      elFallo(
        await api.ejecutar(sara, 'pedir_vacaciones', { desde: '2026-11-01', hasta: '2026-11-03' }),
      ),
    ).toBe('faltan_datos');
  });
});

describe('contestarlas', () => {
  it('la camarera no contesta las suyas, y el cocinero no ve las de nadie', async () => {
    expect(
      elFallo(
        await api.ejecutar(sara, 'responder_vacaciones', {
          solicitud_id: laDeSara,
          respuesta: 'aprobar',
        }),
      ),
    ).toBe('sin_permiso');
    expect(elFallo(await api.consultar(marcos, 'las_vacaciones_del_equipo', {}))).toBe(
      'sin_permiso',
    );
    const deMarcos = losDatos<{ solicitudes: unknown[] }>(
      await api.consultar(marcos, 'mis_vacaciones', {}),
    );
    expect(deMarcos.solicitudes).toHaveLength(0);
  });

  it('en Propuestas: con poco margen, y cuántos quedan en su zona', async () => {
    const lo = losDatos<{
      pendientes: {
        id: string;
        conPocoMargen: boolean;
        zona: string;
        quedan: { quedan: number } | null;
      }[];
    }>(await api.consultar(rosa, 'las_vacaciones_del_equipo', {}));
    const suya = lo.pendientes.find((p) => p.id === laDeSara);
    expect(suya?.conPocoMargen).toBe(true);
    expect(suya?.zona).toBe('sala');
    expect(suya?.quedan).not.toBeNull();
  });

  it('rechazar pide motivo; proponer otras fechas le llega, y ella las acepta', async () => {
    expect(
      elFallo(
        await api.ejecutar(rosa, 'responder_vacaciones', {
          solicitud_id: laDeSara,
          respuesta: 'rechazar',
        }),
      ),
    ).toBe('faltan_datos');

    const propuesta = losDatos<{ estado: string }>(
      await api.ejecutar(rosa, 'responder_vacaciones', {
        solicitud_id: laDeSara,
        respuesta: 'proponer',
        desde: '2027-01-11',
        hasta: '2027-01-17',
        motivo: 'En diciembre estamos a tope',
      }),
    );
    expect(propuesta.estado).toBe('contrapropuesta');
    const [aviso] = await susAvisos(saraId, 'vacaciones.respondidas');
    expect(aviso?.titulo).toBe('Rosa te propone otras fechas para tus vacaciones');

    const aceptada = losDatos<{ estado: string }>(
      await api.ejecutar(sara, 'contestar_la_propuesta', {
        solicitud_id: laDeSara,
        respuesta: 'aceptar',
      }),
    );
    expect(aceptada.estado).toBe('aprobada');
    const [fila] = await comoDuena<{ desde: string; estado: string }>(
      `select to_char(desde, 'YYYY-MM-DD') as desde, estado from estook.solicitud_de_vacaciones where id = $1`,
      [laDeSara],
    );
    expect(fila).toEqual({ desde: '2027-01-11', estado: 'aprobada' });
  });

  it('aprobadas, salen en Turnos', async () => {
    const borrador = losDatos<{ turnos: { personaId: string; tipo: string; dia: string }[] }>(
      await api.consultar(rosa, 'el_horario_en_borrador', { lunes: '2027-01-11' }),
    );
    const suyas = borrador.turnos.filter((t) => t.personaId === saraId && t.tipo === 'vacaciones');
    expect(suyas).toHaveLength(7);
  });

  it('Fogón no le pone turno un día de vacaciones', async () => {
    const puesto = losDatos<{ puestos: number; noCaben: number }>(
      await api.ejecutar(rosa, 'poner_el_cuadrante_de_fogon', {
        lunes: '2027-01-11',
        tramos: [
          {
            persona_id: saraId,
            dia: '2027-01-12',
            entra: '12:00',
            sale: '16:00',
            descanso_minutos: 0,
          },
        ],
      }),
    );
    expect(puesto).toEqual({ puestos: 0, noCaben: 1 });
  });

  it('las de este año restan del saldo de la ficha', async () => {
    const otra = losDatos<{ solicitudId: string }>(
      await api.ejecutar(sara, 'pedir_vacaciones', { desde: '2026-12-21', hasta: '2026-12-23' }),
    );
    losDatos(
      await api.ejecutar(rosa, 'responder_vacaciones', {
        solicitud_id: otra.solicitudId,
        respuesta: 'aprobar',
      }),
    );
    const ficha = losDatos<{
      ficha: { vacaciones: { aprobadas: number; disponibles: number } | null };
    }>(await api.consultar(rosa, 'una_persona', { persona_id: saraId })).ficha;
    expect(ficha.vacaciones?.aprobadas).toBe(3);
    expect(ficha.vacaciones?.disponibles).toBe(27);
  });
});

describe('ponérselas y retirarlas', () => {
  it('quien gestiona se las pone a su gente: quedan aprobadas y le llega', async () => {
    losDatos(
      await api.ejecutar(rosa, 'guardar_la_ficha_del_trabajador', {
        persona_id: marcosId,
        ...unaFicha(30),
      }),
    );
    const puestas = losDatos<{ estado: string }>(
      await api.ejecutar(rosa, 'pedir_vacaciones', {
        persona_id: marcosId,
        desde: '2026-12-07',
        hasta: '2026-12-09',
      }),
    );
    expect(puestas.estado).toBe('aprobada');
    const [aviso] = await susAvisos(marcosId, 'vacaciones.respondidas');
    expect(aviso?.titulo).toBe('Rosa te ha puesto vacaciones del 7 al 9 de diciembre');
  });

  it('un cocinero no le pone vacaciones a nadie', async () => {
    expect(
      elFallo(
        await api.ejecutar(marcos, 'pedir_vacaciones', {
          persona_id: saraId,
          desde: '2027-02-01',
          hasta: '2027-02-02',
        }),
      ),
    ).toBe('sin_permiso');
  });

  it('se retiran las propias sin contestar, y nada más', async () => {
    const pedida = losDatos<{ solicitudId: string }>(
      await api.ejecutar(sara, 'pedir_vacaciones', { desde: '2027-03-02', hasta: '2027-03-03' }),
    );
    expect(
      elFallo(
        await api.ejecutar(marcos, 'retirar_vacaciones', { solicitud_id: pedida.solicitudId }),
      ),
    ).toBe('no_existe');
    const retirada = losDatos<{ estado: string }>(
      await api.ejecutar(sara, 'retirar_vacaciones', { solicitud_id: pedida.solicitudId }),
    );
    expect(retirada.estado).toBe('retirada');
    expect(
      elFallo(await api.ejecutar(sara, 'retirar_vacaciones', { solicitud_id: laDeSara })),
    ).toBe('ya_hecho');
  });
});

describe('en laborables, sin los días que libra (Richi, 26-nov; 0130)', () => {
  async function laFila(id: string) {
    const [fila] = await comoDuena<{ dias: string; libra: string | null; libra_de: string | null }>(
      `select dias::text as dias, array_to_string(libra, ',') as libra, libra_de
         from estook.solicitud_de_vacaciones where id = $1`,
      [id],
    );
    return fila;
  }

  it('sin horario publicado, se le pregunta qué días libra; y con ellos, no cuentan', async () => {
    losDatos(
      await api.ejecutar(rosa, 'guardar_la_ficha_del_trabajador', {
        persona_id: marcosId,
        ...unaFicha(30, 'laborables'),
      }),
    );
    const suyas = losDatos<{ vacacionesEn: string; libra: unknown }>(
      await api.consultar(marcos, 'mis_vacaciones', {}),
    );
    expect(suyas).toMatchObject({ vacacionesEn: 'laborables', libra: null });
    expect(
      elFallo(
        await api.ejecutar(marcos, 'pedir_vacaciones', {
          desde: '2026-12-14',
          hasta: '2026-12-20',
        }),
      ),
    ).toBe('faltan_datos');

    // Libra lunes y martes: del lunes 14 al domingo 20 son 5 días, no 6 (quitar el domingo).
    const pedida = losDatos<{ solicitudId: string; dias: number }>(
      await api.ejecutar(marcos, 'pedir_vacaciones', {
        desde: '2026-12-14',
        hasta: '2026-12-20',
        libra: [2, 1],
      }),
    );
    expect(pedida.dias).toBe(5);
    expect(await laFila(pedida.solicitudId)).toEqual({
      dias: '5.0',
      libra: '1,2',
      libra_de: 'escrito',
    });

    // Lo que dijo se recuerda la próxima vez.
    const otraVez = losDatos<{ libra: { dias: number[]; de: string } | null }>(
      await api.consultar(marcos, 'mis_vacaciones', {}),
    );
    expect(otraVez.libra).toEqual({ dias: [1, 2], de: 'escrito' });
  });

  it('con horario publicado, lo saca de ahí: quien libra domingo y lunes, no cuenta esos días', async () => {
    const [donde] = await comoDuena<{ local_id: string; organizacion_id: string }>(
      `select local_id::text as local_id, organizacion_id::text as organizacion_id
         from estook.solicitud_de_vacaciones where persona_id = $1 limit 1`,
      [marcosId],
    );
    // Tres semanas publicadas: trabaja de martes a sábado.
    for (const lunes of ['2026-11-02', '2026-11-09', '2026-11-16']) {
      const [semana] = await comoDuena<{ id: string }>(
        `insert into estook.semana_de_horario (organizacion_id, local_id, lunes, publicada_en, veces_publicada)
         values ($1, $2, $3::date, now(), 1) returning id::text as id`,
        [donde?.organizacion_id, donde?.local_id, lunes],
      );
      for (let d = 1; d <= 5; d += 1) {
        await comoDuena(
          `insert into estook.turno_publicado (semana_id, local_id, persona_id, dia, tipo, entra, sale)
           values ($1, $2, $3, $4::date + $5::int, 'trabajo', '12:00', '20:00')`,
          [semana?.id, donde?.local_id, marcosId, lunes, d],
        );
      }
    }

    const suyas = losDatos<{ libra: { dias: number[]; de: string } | null }>(
      await api.consultar(marcos, 'mis_vacaciones', {}),
    );
    expect(suyas.libra).toEqual({ dias: [1, 7], de: 'horario' });

    // Del lunes 1 al domingo 7 de febrero: 5 días.
    const pedida = losDatos<{ solicitudId: string; dias: number }>(
      await api.ejecutar(marcos, 'pedir_vacaciones', { desde: '2027-02-01', hasta: '2027-02-07' }),
    );
    expect(pedida.dias).toBe(5);
    expect(await laFila(pedida.solicitudId)).toEqual({
      dias: '5.0',
      libra: '1,7',
      libra_de: 'horario',
    });

    // Quien se las pone ve lo mismo en Propuestas, y la petición dice sin qué días se contó.
    const lo = losDatos<{
      equipo: { personaId: string; vacacionesEn: string; libra: { dias: number[] } | null }[];
      pendientes: { id: string; libra: number[] | null; libraDe: string | null }[];
    }>(await api.consultar(rosa, 'las_vacaciones_del_equipo', {}));
    expect(lo.equipo.find((p) => p.personaId === marcosId)).toMatchObject({
      vacacionesEn: 'laborables',
      libra: { dias: [1, 7] },
    });
    expect(lo.pendientes.find((p) => p.id === pedida.solicitudId)).toMatchObject({
      libra: [1, 7],
      libraDe: 'horario',
    });
  });

  it('las ya aprobadas se quedan como se contaron, aunque cambie su ficha', async () => {
    // Las del 7 al 9 de diciembre se le pusieron en naturales: siguen siendo 3 días.
    const ficha = losDatos<{
      ficha: { vacaciones: { aprobadas: number } | null };
    }>(await api.consultar(rosa, 'una_persona', { persona_id: marcosId })).ficha;
    expect(ficha.vacaciones?.aprobadas).toBe(3);
  });
});
