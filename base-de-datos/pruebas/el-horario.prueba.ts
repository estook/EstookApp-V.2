import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { pdfDeMentira } from '../../servidor/infraestructura/pdf.ts';
import { levantarBase, type BaseDePrueba } from './entorno.ts';
import { elFallo, losDatos, montarLaApi, type ApiDePrueba } from './despachador.ts';

/**
 * H2 · El horario de la semana (decisiones 0066, 0068 y 0069), por la API de verdad.
 *
 *   · se monta en borrador, y **el equipo no lo ve hasta publicar**
 *   · turnos partidos, de noche, ausencias que ocupan el día, y tramos que no se pisan
 *   · los avisos al montarlo, las horas de contrato sin los sueldos, y el coste solo
 *     para quien lo puede ver
 *   · al publicar, **a cada uno lo suyo**; al volver a publicar, **solo al afectado**
 *   · copiar la semana anterior y rellenar con el de siempre
 *   · en PDF, y «entras en cinco minutos» mirando lo publicado
 *
 * La API ve siempre el miércoles 7 de octubre de 2026 a mediodía: la semana de
 * «ahora» es la del lunes 5.
 */
let base: BaseDePrueba;
let api: ApiDePrueba;
const motor = pdfDeMentira();

const ROSA = 'rosa@ejemplo.estook.com'; // gerente de Bar Centro
const MARCOS = 'marcos@ejemplo.estook.com'; // cocinero de Bar Centro
const SARA = 'sara@ejemplo.estook.com'; // camarera de Bar Centro
const LUIS = 'luis@ejemplo.estook.com'; // jefe de cocina de Bar Puerto

const LUNES = '2026-10-05';
const SIGUIENTE = '2026-10-12';

let rosa: string;
let sara: string;
let marcosId: string;
let saraId: string;

beforeAll(async () => {
  base = await levantarBase();
  api = montarLaApi(base.bd, {
    pdf: motor,
    ahora: () => new Date('2026-10-07T10:00:00Z'),
  });
  rosa = await api.entrar(ROSA);
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

async function comoDuena<T>(consulta: string, parametros: unknown[] = []): Promise<T[]> {
  const { rows } = await base.bd.query<T>(consulta, parametros);
  return rows;
}

async function tramo(
  token: string,
  persona: string,
  dia: string,
  entra: string,
  sale: string,
  extra: Record<string, unknown> = {},
) {
  return api.ejecutar(token, 'poner_tramo', {
    lunes: dia >= SIGUIENTE ? SIGUIENTE : LUNES,
    persona_id: persona,
    dia,
    tipo: 'trabajo',
    entra,
    sale,
    ...extra,
  });
}

interface Borrador {
  estado: string;
  personas: {
    personaId: string;
    minutos: number;
    horasDeContrato: number | null;
    costeCentimos?: number | null;
  }[];
  turnos: { id: string; personaId: string; dia: string; tipo: string; minutos: number }[];
  avisos: { personaId: string; que: string; nivel: string }[];
  cambiosSinPublicar: { personaId: string; dias: string[] }[];
  puedeVerCostes: boolean;
  coste?: { totalCentimos: number; sinSueldo: number; ventasPrevistasCentimos: number | null };
}

async function elBorrador(token: string, lunes = LUNES): Promise<Borrador> {
  return losDatos<Borrador>(await api.consultar(token, 'el_horario_en_borrador', { lunes }));
}

describe('se monta en borrador', () => {
  it('la gerente pone un turno partido, uno de noche y un día libre', async () => {
    losDatos(await tramo(rosa, marcosId, '2026-10-06', '12:00', '16:00'));
    losDatos(await tramo(rosa, marcosId, '2026-10-06', '20:00', '23:30'));
    losDatos(await tramo(rosa, saraId, '2026-10-09', '19:00', '02:00', { descanso_minutos: 30 }));
    losDatos(
      await api.ejecutar(rosa, 'poner_tramo', {
        lunes: LUNES,
        persona_id: saraId,
        dia: '2026-10-10',
        tipo: 'libre',
      }),
    );

    const borrador = await elBorrador(rosa);
    expect(borrador.estado).toBe('borrador');
    expect(borrador.turnos).toHaveLength(4);
    // El de noche cruza la medianoche y resta su descanso: 7 h − 30 min.
    const deNoche = borrador.turnos.find((t) => t.personaId === saraId && t.tipo === 'trabajo');
    expect(deNoche?.minutos).toBe(390);
    expect(borrador.personas.find((p) => p.personaId === marcosId)?.minutos).toBe(450);
  });

  it('una ausencia ocupa el día: poner vacaciones quita lo que hubiera', async () => {
    losDatos(await tramo(rosa, saraId, '2026-10-11', '10:00', '14:00'));
    losDatos(
      await api.ejecutar(rosa, 'poner_tramo', {
        lunes: LUNES,
        persona_id: saraId,
        dia: '2026-10-11',
        tipo: 'vacaciones',
      }),
    );
    const delDia = (await elBorrador(rosa)).turnos.filter(
      (t) => t.personaId === saraId && t.dia === '2026-10-11',
    );
    expect(delDia.map((t) => t.tipo)).toEqual(['vacaciones']);
  });

  it('un tramo que se pisa con otro suyo no se deja, y lo dice', async () => {
    const pisa = await tramo(rosa, marcosId, '2026-10-06', '15:00', '18:00');
    expect(elFallo(pisa)).toBe('faltan_datos');
    // Tampoco con el de la noche de antes: el viernes de Sara acaba a las 02:00 del sábado.
    const deMadrugada = await tramo(rosa, saraId, '2026-10-10', '01:00', '05:00');
    expect(elFallo(deMadrugada)).toBe('faltan_datos');
  });

  it('un día fuera de la semana, o alguien que no ficha aquí, no', async () => {
    expect(elFallo(await tramo(rosa, marcosId, '2026-10-04', '10:00', '12:00'))).toBe(
      'faltan_datos',
    );
    const [otra] = await comoDuena<{ id: string }>(
      "select id from estook.persona where correo = 'luis@ejemplo.estook.com'",
    );
    expect(elFallo(await tramo(rosa, otra?.id ?? '', '2026-10-06', '10:00', '12:00'))).toBe(
      'faltan_datos',
    );
  });

  it('el equipo no ve el borrador: ni la consulta ni la tabla', async () => {
    expect(elFallo(await api.consultar(sara, 'el_horario_en_borrador', { lunes: LUNES }))).toBe(
      'sin_permiso',
    );
    const loQueVe = losDatos<{ publicado: boolean; turnos: unknown[] }>(
      await api.consultar(sara, 'el_horario', { lunes: LUNES }),
    );
    expect(loQueVe.publicado).toBe(false);
    expect(loQueVe.turnos).toEqual([]);
    expect(elFallo(await tramo(sara, saraId, '2026-10-07', '10:00', '12:00'))).toBe('sin_permiso');
  });
});

describe('lo que se mira antes de publicar', () => {
  it('los avisos: doce horas entre jornadas, en rojo', async () => {
    // Marcos cierra el martes a las 23:30 y entra el miércoles a las 08:00.
    losDatos(await tramo(rosa, marcosId, '2026-10-07', '08:00', '12:00'));
    const avisos = (await elBorrador(rosa)).avisos.filter((a) => a.personaId === marcosId);
    expect(avisos).toContainEqual(
      expect.objectContaining({ que: 'descanso_entre_jornadas', nivel: 'rojo' }),
    );
  });

  it('con sueldo puesto, la gerente ve lo que cuesta; y quien no lo tiene, se cuenta', async () => {
    losDatos(
      await api.ejecutar(rosa, 'poner_retribucion', {
        persona_id: marcosId,
        forma: 'por_hora',
        importe_centimos: 1200,
        horas_semanales: 30,
      }),
    );
    // Puesto el jueves de esa semana: cuenta para la semana entera, como en el
    // Resumen, que usa el de su final. Con el del lunes salía a 0 € (30-sep).
    await comoDuena("update estook.retribucion set desde = '2026-10-08' where persona_id = $1", [
      marcosId,
    ]);
    const borrador = await elBorrador(rosa);
    expect(borrador.puedeVerCostes).toBe(true);
    // Marcos: 7 h 30 min del martes y 4 h del miércoles, a 12 € la hora.
    expect(borrador.personas.find((p) => p.personaId === marcosId)?.costeCentimos).toBe(13_800);
    expect(borrador.personas.find((p) => p.personaId === marcosId)?.horasDeContrato).toBe(30);
    expect(borrador.coste?.sinSueldo).toBe(1);
    // Sin cajas de las semanas de antes, las ventas todavía no se saben.
    expect(borrador.coste?.ventasPrevistasCentimos).toBeNull();
  });

  it('un jefe de cocina monta el horario con horas, y no le llega ni un euro', async () => {
    const luis = await api.entrar(LUIS);
    const borrador = await elBorrador(luis);
    expect(borrador.puedeVerCostes).toBe(false);
    expect(borrador).not.toHaveProperty('coste');
    for (const p of borrador.personas) expect(p).not.toHaveProperty('costeCentimos');
  });
});

describe('publicar', () => {
  it('la primera vez, a cada uno lo suyo, en la campana', async () => {
    const hecho = losDatos<{ primeraVez: boolean; avisados: number }>(
      await api.ejecutar(rosa, 'publicar_el_horario', { lunes: LUNES }),
    );
    expect(hecho.primeraVez).toBe(true);
    expect(hecho.avisados).toBe(2);

    const avisos = await comoDuena<{ persona_id: string; titulo: string; detalle: string }>(
      "select persona_id, titulo, detalle from estook.aviso where tipo = 'horario.publicado'",
    );
    const suyo = avisos.find((a) => a.persona_id === saraId);
    expect(suyo?.titulo).toBe('Tu horario de la semana del 5 al 11 de octubre');
    expect(suyo?.detalle).toBe(
      'Viernes 19:00–02:00 (30 min de descanso), sábado libre, domingo vacaciones.',
    );
  });

  it('publicado, lo ve todo el equipo: el de todos, sin euros', async () => {
    const loQueVe = losDatos<{
      publicado: boolean;
      turnos: { personaId: string }[];
      personas: Record<string, unknown>[];
    }>(await api.consultar(sara, 'el_horario', { lunes: LUNES }));
    expect(loQueVe.publicado).toBe(true);
    expect(new Set(loQueVe.turnos.map((t) => t.personaId))).toEqual(new Set([marcosId, saraId]));
    expect(JSON.stringify(loQueVe)).not.toMatch(/[Cc]oste|[Cc]entimos/);
  });

  it('cambiar el borrador no se ve hasta volver a publicar, y entonces solo al afectado', async () => {
    const borrador = await elBorrador(rosa);
    const elDeMarcos = borrador.turnos.find(
      (t) => t.personaId === marcosId && t.dia === '2026-10-07',
    );
    losDatos(
      await tramo(rosa, marcosId, '2026-10-07', '12:00', '16:00', { turno_id: elDeMarcos?.id }),
    );

    const conCambios = await elBorrador(rosa);
    expect(conCambios.estado).toBe('con_cambios');
    expect(conCambios.cambiosSinPublicar).toEqual([
      { personaId: marcosId, nombre: 'Marcos V.', dias: ['miércoles: 08:00–12:00 → 12:00–16:00'] },
    ]);
    // El equipo sigue viendo lo de antes.
    const loQueVe = losDatos<{ turnos: { personaId: string; dia: string; entra: string }[] }>(
      await api.consultar(sara, 'el_horario', { lunes: LUNES }),
    );
    expect(
      loQueVe.turnos.find((t) => t.personaId === marcosId && t.dia === '2026-10-07')?.entra,
    ).toBe('08:00');

    const hecho = losDatos<{ primeraVez: boolean; avisados: number }>(
      await api.ejecutar(rosa, 'publicar_el_horario', { lunes: LUNES }),
    );
    expect(hecho).toEqual({ primeraVez: false, avisados: 1 });
    const cambiados = await comoDuena<{ persona_id: string; detalle: string }>(
      "select persona_id, detalle from estook.aviso where tipo = 'horario.cambiado'",
    );
    expect(cambiados).toEqual([
      { persona_id: marcosId, detalle: '1 día cambia. Miércoles: 08:00–12:00 → 12:00–16:00.' },
    ]);
    expect((await elBorrador(rosa)).estado).toBe('publicada');
  });

  it('«entras en cinco minutos» mira lo publicado: el miércoles de Marcos, a las 12:00', async () => {
    const marcos = await api.entrar(MARCOS);
    const suyo = losDatos<{ horario: { dia: number; entra: string }[] }>(
      await api.consultar(marcos, 'mi_fichaje', {}),
    );
    expect(suyo.horario).toEqual([
      { dia: 2, entra: '12:00', sale: '16:00' },
      { dia: 2, entra: '20:00', sale: '23:30' },
      { dia: 3, entra: '12:00', sale: '16:00' },
    ]);
  });

  it('en PDF: el de la pared y el de cada uno, con lo publicado', async () => {
    const pared = losDatos<{ nombre: string; base64: string }>(
      await api.consultar(sara, 'el_horario_en_pdf', { lunes: LUNES, de: 'todos' }),
    );
    expect(pared.nombre).toBe('horario-2026-10-05.pdf');
    const pagina = motor.hechos.at(-1);
    expect(pagina?.opciones.apaisado).toBe(true);
    expect(pagina?.html).toContain('Horario de la semana');
    expect(pagina?.html).toContain('Marcos V.');
    expect(pagina?.html).toContain('Vacaciones');

    losDatos(await api.consultar(sara, 'el_horario_en_pdf', { lunes: LUNES, de: 'mio' }));
    const mio = motor.hechos.at(-1)?.html ?? '';
    expect(mio).toContain('Mi horario');
    expect(mio).not.toContain('Marcos');
  });

  it('una semana sin publicar no sale en papel', async () => {
    expect(
      elFallo(await api.consultar(sara, 'el_horario_en_pdf', { lunes: SIGUIENTE, de: 'todos' })),
    ).toBe('faltan_datos');
  });
});

describe('para no empezar de cero', () => {
  it('copiar la semana anterior pone lo mismo siete días después', async () => {
    const copiado = losDatos<{ puestos: number }>(
      await api.ejecutar(rosa, 'copiar_la_semana_anterior', { lunes: SIGUIENTE }),
    );
    expect(copiado.puestos).toBe((await elBorrador(rosa)).turnos.length);
    const siguiente = await elBorrador(rosa, SIGUIENTE);
    expect(siguiente.turnos.map((t) => t.dia)).toContain('2026-10-13');
  });

  it('una semana con cosas no se pisa sin confirmarlo', async () => {
    expect(
      elFallo(await api.ejecutar(rosa, 'copiar_la_semana_anterior', { lunes: SIGUIENTE })),
    ).toBe('faltan_datos');
  });

  it('rellenar con el de siempre usa el horario habitual de cada uno', async () => {
    const [centro] = await comoDuena<{ id: string }>(
      "select id from estook.local where codigo = 'bar-centro'",
    );
    await comoDuena(
      `insert into estook.horario_habitual (local_id, persona_id, dia_de_la_semana, entra, sale, desde)
       values ($1, $2, 1, '09:00', '15:00', '2026-01-01'), ($1, $2, 2, '09:00', '15:00', '2026-01-01')`,
      [centro?.id, saraId],
    );
    const puestos = losDatos<{ puestos: number }>(
      await api.ejecutar(rosa, 'rellenar_con_el_de_siempre', {
        lunes: SIGUIENTE,
        reemplazar: true,
      }),
    );
    expect(puestos.puestos).toBe(2);
    const siguiente = await elBorrador(rosa, SIGUIENTE);
    expect(
      siguiente.turnos.map((t) => `${t.dia} ${t.personaId === saraId ? 'Sara' : '?'}`),
    ).toEqual(['2026-10-12 Sara', '2026-10-13 Sara']);
  });

  it('quitar un tramo lo quita del borrador', async () => {
    const [primero] = (await elBorrador(rosa, SIGUIENTE)).turnos;
    expect(
      losDatos<{ quitado: boolean }>(
        await api.ejecutar(rosa, 'quitar_tramo', { turno_id: primero?.id }),
      ).quitado,
    ).toBe(true);
    expect((await elBorrador(rosa, SIGUIENTE)).turnos).toHaveLength(1);
  });
});
