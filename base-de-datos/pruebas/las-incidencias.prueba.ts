import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { masDias, type FechaOperativa } from '@estook/dominio';
import { levantarBase, type BaseDePrueba } from './entorno.ts';
import { elFallo, losDatos, montarLaApi, type ApiDePrueba } from './despachador.ts';

/**
 * Un solo horario y las incidencias del equipo · el repaso del 9-oct (0081).
 *
 * «Hay dos horarios, el de la ficha y el de Horarios: que la app haga caso al de
 * Horarios.» «Si un trabajador no ficha y no está justificado, no hay sitio donde lo
 * muestre.» Y en «Para mirar», «4 fichajes que revisar» sin poder llegar a ninguno.
 * Se prueba contra la base, por la API, como lo pide la pantalla:
 *
 *   · un tramo publicado que acaba sin fichar es una falta; uno que no ha acabado, no
 *   · llegar cuatro horas tarde es un retraso (antes no contaba ni como nada)
 *   · el horario de siempre ya no cuenta, aunque siga escrito en la base
 *   · justificar quita la falta de todas las cuentas, y quitarla la devuelve
 *   · la cifra «Incidencias» y la lista dicen lo mismo, y el Resumen también
 *   · «sin cerrar» es olvidarse de salir, no estar trabajando ahora
 *   · quién puede ver, justificar y a quién: nunca a uno mismo, nunca sin Equipo
 */
let base: BaseDePrueba;
let api: ApiDePrueba;

const ROSA = 'rosa@ejemplo.estook.com'; // gerente de Bar Centro
const MARCOS = 'marcos@ejemplo.estook.com'; // cocinero de Bar Centro
const SARA = 'sara@ejemplo.estook.com'; // camarera de Bar Centro

let rosa: string;
let marcos: string;
let centro: string;
let rosaId: string;
let marcosId: string;
let saraId: string;
let hoy: FechaOperativa;

interface Incidencia {
  id: string;
  tipo: string;
  personaId: string;
  fecha: string;
  cuando: string;
  entra: string | null;
  sale: string | null;
  minutosTarde: number | null;
  justificacion: { motivo: string; nota: string | null; puestaPor: string | null } | null;
}

interface LasIncidencias {
  incidencias: Incidencia[];
  sinJustificar: number;
  hayHorarioPublicado: boolean;
  puedeJustificar: boolean;
}

interface Indicador {
  jornada: string;
  serie: { fecha: string; valor: number | null }[];
  total: number | null;
}

beforeAll(async () => {
  base = await levantarBase();
  api = montarLaApi(base.bd);
  rosa = await api.entrar(ROSA);
  marcos = await api.entrar(MARCOS);
  await api.entrar(SARA);
  centro = await base.localPorCodigo('bar-centro');
  rosaId = await base.personaPorCorreo(ROSA);
  marcosId = await base.personaPorCorreo(MARCOS);
  saraId = await base.personaPorCorreo(SARA);
  hoy = losDatos<Indicador>(
    await api.consultar(rosa, 'un_indicador', { indicador: 'incidencias', dias: '7' }),
  ).jornada as FechaOperativa;
}, 120_000);

afterAll(async () => {
  await base.cerrar();
});

async function comoDuena<T>(consulta: string, parametros: unknown[] = []): Promise<T[]> {
  const { rows } = await base.bd.query<T>(consulta, parametros);
  return rows;
}

/** Un tramo publicado en Horarios, en su semana publicada. */
async function unTramoPublicado(persona: string, dia: string, entra: string, sale: string) {
  await comoDuena(
    `with s as (
       insert into estook.semana_de_horario (organizacion_id, local_id, lunes, publicada_en, veces_publicada)
       select l.organizacion_id, l.id, $3::date - (extract(isodow from $3::date)::int - 1), now(), 1
         from estook.local l where l.id = $1
       on conflict (local_id, lunes) do update
          set publicada_en = coalesce(estook.semana_de_horario.publicada_en, now()),
              veces_publicada = greatest(estook.semana_de_horario.veces_publicada, 1)
       returning id
     )
     insert into estook.turno_publicado (semana_id, local_id, persona_id, dia, tipo, entra, sale)
     select s.id, $1, $2, $3::date, 'trabajo', $4::time, $5::time from s`,
    [centro, persona, dia, entra, sale],
  );
}

/** Un fichaje cerrado, a la hora del local ese día. */
async function unFichaje(persona: string, fecha: string, entra: string, horas: number) {
  await comoDuena(
    `insert into estook.fichaje (
       local_id, persona_id, fecha_operativa, entro_en, salio_en,
       entro_latitud, entro_longitud, salio_latitud, salio_longitud
     )
     select l.id, $2, $3::date,
            ($3::date + $4::time) at time zone l.zona_horaria,
            (($3::date + $4::time) at time zone l.zona_horaria) + make_interval(hours => $5),
            43.3, -1.98, 43.3, -1.98
       from estook.local l where l.id = $1`,
    [centro, persona, fecha, entra, horas],
  );
}

async function lasIncidencias(token: string, extra: Record<string, string> = {}) {
  return losDatos<LasIncidencias>(
    await api.consultar(token, 'las_incidencias', { periodo: '30', ...extra }),
  );
}

async function laCifra(dias = '7'): Promise<Indicador> {
  return losDatos<Indicador>(
    await api.consultar(rosa, 'un_indicador', { indicador: 'incidencias', dias }),
  );
}

describe('sin horario publicado', () => {
  it('no hay faltas que contar, y se dice', async () => {
    const lo = await lasIncidencias(rosa);
    expect(lo.hayHorarioPublicado).toBe(false);
    expect(lo.incidencias.filter((i) => i.tipo === 'falta' || i.tipo === 'retraso')).toEqual([]);
    expect(lo.puedeJustificar).toBe(true);
  });

  it('el horario de siempre ya no cuenta, aunque siga escrito en la base (0081)', async () => {
    const dia = masDias(hoy, -3);
    await comoDuena(
      `insert into estook.horario_habitual (local_id, persona_id, dia_de_la_semana, entra, sale, desde)
       values ($1, $2, extract(isodow from $3::date)::int, '09:00', '13:00', $3::date - 30)`,
      [centro, saraId, dia],
    );
    const lo = await lasIncidencias(rosa);
    expect(lo.incidencias.some((i) => i.personaId === saraId)).toBe(false);
    const retrasos = losDatos<Indicador>(
      await api.consultar(rosa, 'un_indicador', { indicador: 'retrasos', dias: '7' }),
    );
    expect(retrasos.total).toBeNull();
  });
});

describe('las faltas y los retrasos, del horario publicado', () => {
  let faltaDia: string;
  let tardeDia: string;

  beforeAll(async () => {
    faltaDia = masDias(hoy, -2);
    tardeDia = masDias(hoy, -4);
    // Una falta: tenía de 10 a 14 y no fichó.
    await unTramoPublicado(marcosId, faltaDia, '10:00', '14:00');
    // Un retraso de cuatro horas: de 10 a 18, llegó a las 14:00.
    await unTramoPublicado(marcosId, tardeDia, '10:00', '18:00');
    await unFichaje(marcosId, tardeDia, '14:00', 4);
    // Mañana: no ha acabado, no es falta.
    await unTramoPublicado(marcosId, masDias(hoy, 1), '10:00', '14:00');
  });

  it('un tramo que acabó sin fichar es una falta, con su tramo', async () => {
    const lo = await lasIncidencias(rosa);
    expect(lo.hayHorarioPublicado).toBe(true);
    const falta = lo.incidencias.find((i) => i.tipo === 'falta' && i.fecha === faltaDia);
    expect(falta).toMatchObject({ personaId: marcosId, entra: '10:00', sale: '14:00' });
    expect(falta?.justificacion).toBeNull();
  });

  it('lo que todavía no ha pasado no es una falta', async () => {
    const lo = await lasIncidencias(rosa);
    expect(lo.incidencias.some((i) => i.fecha > hoy)).toBe(false);
  });

  it('llegar cuatro horas tarde es un retraso, y no una falta: estuvo', async () => {
    const lo = await lasIncidencias(rosa);
    const delDia = lo.incidencias.filter((i) => i.fecha === tardeDia);
    expect(delDia.map((i) => i.tipo)).toEqual(['retraso']);
    expect(delDia[0]?.minutosTarde).toBe(240);
  });

  it('la cifra «Incidencias» cuenta la falta y no el retraso, que tiene la suya', async () => {
    const cifra = await laCifra();
    const delDia = new Map(cifra.serie.map((d) => [d.fecha, d.valor]));
    expect(delDia.get(faltaDia)).toBe(1);
    expect(delDia.get(tardeDia)).toBe(0);
    expect(cifra.total).toBe(1);
  });

  it('la ficha de la persona trae las suyas, y no las de nadie más', async () => {
    const suyas = await lasIncidencias(rosa, { persona_id: marcosId });
    expect(suyas.incidencias.length).toBeGreaterThanOrEqual(2);
    expect(suyas.incidencias.every((i) => i.personaId === marcosId)).toBe(true);
    const cuatro = await lasIncidencias(rosa, { persona_id: marcosId, limite: '1' });
    expect(cuatro.incidencias).toHaveLength(1);
    // La más nueva primero: la falta de hace dos días, antes que el retraso de hace cuatro.
    expect(cuatro.incidencias[0]?.fecha).toBe(faltaDia);
    // El total sin justificar es de todas, aunque la lista venga acotada.
    expect(cuatro.sinJustificar).toBe(suyas.sinJustificar);
  });

  it('la ficha ya no trae un horario de siempre', async () => {
    const ficha = losDatos<Record<string, unknown>>(
      await api.consultar(rosa, 'una_persona', { persona_id: marcosId }),
    );
    expect(ficha).not.toHaveProperty('horario');
  });
});

describe('justificar', () => {
  let falta: Incidencia;
  let retraso: Incidencia;

  beforeAll(async () => {
    const lo = await lasIncidencias(rosa);
    const f = lo.incidencias.find((i) => i.tipo === 'falta' && i.personaId === marcosId);
    const r = lo.incidencias.find((i) => i.tipo === 'retraso' && i.personaId === marcosId);
    if (f === undefined || r === undefined) throw new Error('faltan las incidencias de Marcos');
    falta = f;
    retraso = r;
  });

  it('«Otro motivo» sin decir cuál no se acepta', async () => {
    expect(
      elFallo(
        await api.ejecutar(rosa, 'justificar_incidencia', {
          persona_id: marcosId,
          tipo: 'falta',
          empieza: falta.cuando,
          motivo: 'otro',
        }),
      ),
    ).toBe('faltan_datos');
  });

  it('un tramo que no está publicado no se justifica', async () => {
    expect(
      elFallo(
        await api.ejecutar(rosa, 'justificar_incidencia', {
          persona_id: marcosId,
          tipo: 'falta',
          empieza: '2020-01-01T09:00:00Z',
          motivo: 'enfermedad',
        }),
      ),
    ).toBe('no_existe');
  });

  it('el cocinero no justifica, ni lo suyo ni lo de nadie, ni ve las de los demás', async () => {
    expect(
      elFallo(
        await api.ejecutar(marcos, 'justificar_incidencia', {
          persona_id: marcosId,
          tipo: 'falta',
          empieza: falta.cuando,
          motivo: 'enfermedad',
        }),
      ),
    ).toBe('sin_permiso');
    expect(elFallo(await api.consultar(marcos, 'las_incidencias', {}))).toBe('sin_permiso');
  });

  it('nadie se justifica a sí mismo, aunque lleve el equipo', async () => {
    const dia = masDias(hoy, -6);
    await unTramoPublicado(rosaId, dia, '08:00', '12:00');
    const suya = (await lasIncidencias(rosa)).incidencias.find(
      (i) => i.personaId === rosaId && i.tipo === 'falta',
    );
    expect(suya).toBeDefined();
    expect(
      elFallo(
        await api.ejecutar(rosa, 'justificar_incidencia', {
          persona_id: rosaId,
          tipo: 'falta',
          empieza: suya?.cuando,
          motivo: 'enfermedad',
        }),
      ),
    ).toBe('sin_permiso');
  });

  it('justificada, la falta deja de contar en la lista y en la cifra, y se ve con quién', async () => {
    const antes = await lasIncidencias(rosa);
    const cifraAntes = await laCifra();
    losDatos(
      await api.ejecutar(rosa, 'justificar_incidencia', {
        persona_id: marcosId,
        tipo: 'falta',
        empieza: falta.cuando,
        motivo: 'enfermedad',
        nota: 'Con fiebre',
      }),
    );
    const despues = await lasIncidencias(rosa);
    expect(despues.sinJustificar).toBe(antes.sinJustificar - 1);
    const ella = despues.incidencias.find((i) => i.id === falta.id);
    expect(ella?.justificacion).toMatchObject({
      motivo: 'enfermedad',
      nota: 'Con fiebre',
      puestaPor: 'Rosa',
    });
    expect((await laCifra()).total).toBe((cifraAntes.total ?? 0) - 1);
    // Y no se justifica dos veces.
    expect(
      elFallo(
        await api.ejecutar(rosa, 'justificar_incidencia', {
          persona_id: marcosId,
          tipo: 'falta',
          empieza: falta.cuando,
          motivo: 'permiso',
        }),
      ),
    ).toBe('ya_hecho');
  });

  it('justificado, el retraso deja de contar en la cifra de Retrasos y en el Resumen', async () => {
    const resumenAntes = losDatos<{ filas: { personaId: string; retrasos: number | null }[] }>(
      await api.consultar(rosa, 'resumen_del_equipo', { periodo: '30' }),
    );
    const suyosAntes = resumenAntes.filas.find((f) => f.personaId === marcosId)?.retrasos ?? 0;
    losDatos(
      await api.ejecutar(rosa, 'justificar_incidencia', {
        persona_id: marcosId,
        tipo: 'retraso',
        empieza: retraso.cuando,
        motivo: 'avisado',
      }),
    );
    const resumen = losDatos<{ filas: { personaId: string; retrasos: number | null }[] }>(
      await api.consultar(rosa, 'resumen_del_equipo', { periodo: '30' }),
    );
    expect(resumen.filas.find((f) => f.personaId === marcosId)?.retrasos).toBe(suyosAntes - 1);
    const cifra = losDatos<Indicador>(
      await api.consultar(rosa, 'un_indicador', { indicador: 'retrasos', dias: '30' }),
    );
    const suma = resumen.filas.reduce((total, f) => total + (f.retrasos ?? 0), 0);
    expect(cifra.total).toBe(suma);
  });

  it('el propio trabajador ve su justificación, y quitarla la vuelve a contar', async () => {
    const [suya] = await base.bd
      .query<{ motivo: string }>(
        `select motivo::text as motivo from estook.justificacion where persona_id = $1 and tipo = 'falta'`,
        [marcosId],
      )
      .then((r) => r.rows);
    expect(suya?.motivo).toBe('enfermedad');

    losDatos(
      await api.ejecutar(rosa, 'quitar_justificacion', {
        persona_id: marcosId,
        tipo: 'falta',
        empieza: falta.cuando,
      }),
    );
    const lo = await lasIncidencias(rosa);
    expect(lo.incidencias.find((i) => i.id === falta.id)?.justificacion).toBeNull();
    expect(
      elFallo(
        await api.ejecutar(rosa, 'quitar_justificacion', {
          persona_id: marcosId,
          tipo: 'falta',
          empieza: falta.cuando,
        }),
      ),
    ).toBe('no_existe');
  });

  it('justificar y quitar queda en la auditoría, con quién', async () => {
    const lineas = await comoDuena<{ accion: string }>(
      `select accion from estook.auditoria where entidad = 'justificacion' order by id`,
    );
    expect(lineas.map((l) => l.accion)).toEqual(['crear', 'crear', 'borrar']);
  });
});

describe('los fichajes raros', () => {
  it('«sin cerrar» es olvidarse de salir hace más de doce horas, no estar trabajando', async () => {
    // Sara entró hace una hora y sigue: trabajando. Marcos entró hace catorce y no salió.
    await comoDuena(
      `insert into estook.fichaje (local_id, persona_id, fecha_operativa, entro_en, entro_latitud, entro_longitud)
       values ($1, $2, $3::date, now() - interval '1 hour', 43.3, -1.98),
              ($1, $4, $3::date - 1, now() - interval '14 hours', 43.3, -1.98)`,
      [centro, saraId, hoy, marcosId],
    );
    const lo = await lasIncidencias(rosa);
    const sinCerrar = lo.incidencias.filter((i) => i.tipo === 'sin_cerrar');
    expect(sinCerrar.map((i) => i.personaId)).toEqual([marcosId]);

    // Y el Resumen cuenta lo mismo: la columna «A revisar».
    const resumen = losDatos<{ filas: { personaId: string; sinCerrar: number }[] }>(
      await api.consultar(rosa, 'resumen_del_equipo', { periodo: '30' }),
    );
    expect(resumen.filas.find((f) => f.personaId === saraId)?.sinCerrar).toBe(0);
    expect(resumen.filas.find((f) => f.personaId === marcosId)?.sinCerrar).toBe(1);
  });

  it('un fichaje raro no se justifica: se corrige', async () => {
    const lo = await lasIncidencias(rosa);
    const raro = lo.incidencias.find((i) => i.tipo === 'sin_cerrar');
    expect(
      elFallo(
        await api.ejecutar(rosa, 'justificar_incidencia', {
          persona_id: marcosId,
          tipo: 'sin_cerrar',
          empieza: raro?.cuando,
          motivo: 'otro',
          nota: 'Se olvidó',
        }),
      ),
    ).toBe('faltan_datos');
  });
});
