import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { masDias, type FechaOperativa } from '@estook/dominio';
import { levantarBase, type BaseDePrueba } from './entorno.ts';
import { elFallo, losDatos, montarLaApi, type ApiDePrueba } from './despachador.ts';

/**
 * Las cifras de cada app · V, punto 2 (0040).
 *
 * «Flechas y gráficas también en Inventario, Servicio y Equipo.» Seis cifras
 * nuevas, y **ninguna puede decir un número distinto del de la pantalla de la que
 * sale**: si «Valor de la cámara» dijera una cosa y «Hoy» otra, o las horas del
 * equipo no cuadraran con el Resumen, nadie se creería ninguna de las dos. Es lo
 * que se prueba aquí, contra la base y por la API, como lo pide la pantalla:
 *
 *   · el valor de la cámara y el bajo mínimo de hoy son los de Inventario · Hoy
 *   · lo que se apunta hoy no cambia lo que había ayer
 *   · las horas y el coste del equipo son los del Resumen de Equipo
 *   · un retraso es pasar del margen del local, y el Resumen cuenta los mismos
 *   · sin horario puesto no hay retrasos «cero»: no se sabe
 *   · el margen lo cambia quien lleva el local, y nadie más
 *   · cada uno ve lo suyo
 */
let base: BaseDePrueba;
let api: ApiDePrueba;

const ROSA = 'rosa@ejemplo.estook.com'; // gerente de Bar Centro: lo ve todo
const MARCOS = 'marcos@ejemplo.estook.com'; // cocinero de Bar Centro
const LUIS = 'luis@ejemplo.estook.com'; // jefe de cocina de Bar Centro

let rosa: string;
let marcos: string;
let luis: string;
let centro: string;
let marcosId: string;

interface Indicador {
  jornada: string;
  serie: { fecha: string; valor: number | null }[];
  total: number | null;
  anterior: number | null;
  diasConDato: number;
}

beforeAll(async () => {
  base = await levantarBase();
  api = montarLaApi(base.bd);
  rosa = await api.entrar(ROSA);
  marcos = await api.entrar(MARCOS);
  luis = await api.entrar(LUIS);
  centro = await base.localPorCodigo('bar-centro');
  marcosId = await base.personaPorCorreo(MARCOS);
}, 120_000);

afterAll(async () => {
  await base.cerrar();
});

async function comoDuena<T>(consulta: string, parametros: unknown[] = []): Promise<T[]> {
  const { rows } = await base.bd.query<T>(consulta, parametros);
  return rows;
}

async function indicador(token: string, cual: string, dias = '7'): Promise<Indicador> {
  return losDatos<Indicador>(await api.consultar(token, 'un_indicador', { indicador: cual, dias }));
}

/** Un turno cerrado de Marcos en Bar Centro, a la hora del local ese día. */
async function unTurno(fecha: string, entra: string, horas: number) {
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
    [centro, marcosId, fecha, entra, horas],
  );
}

// ── Inventario ───────────────────────────────────────────────────────────────

describe('la cámara, como la cuenta «Hoy»', () => {
  let productoId: string;

  beforeAll(async () => {
    productoId = losDatos<{ productoId: string }>(
      await api.ejecutar(rosa, 'crear_producto', {
        nombre: 'Lubina de las cifras',
        unidad_de_uso: 'kg',
        zona: 'cocina',
        precio_centimos: 1_500,
        minimo: 10,
      }),
    ).productoId;
  });

  it('lo que entró sin coste vale su precio de hoy, **en las dos pantallas**', async () => {
    // Las 500 burratas de M6: dadas de alta sin precio, con su género, y con el
    // precio puesto después. Su medio es cero, y contarlas a cero es decir que no
    // valen nada. «Hoy» las cuenta a su precio de hoy, y la foto tiene que hacer
    // lo mismo o las dos cifras se separan justo en el caso que ya costó un fallo.
    const burrataId = losDatos<{ productoId: string }>(
      await api.ejecutar(rosa, 'crear_producto', {
        nombre: 'Burrata de las cifras',
        unidad_de_uso: 'ud',
        zona: 'cocina',
        cantidad_inicial: 10,
      }),
    ).productoId;
    const antes = await indicador(rosa, 'valor-camara');
    losDatos(
      await api.ejecutar(rosa, 'poner_precio', { producto_id: burrataId, precio_centimos: 250 }),
    );
    const despues = await indicador(rosa, 'valor-camara');
    expect((despues.total ?? 0) - (antes.total ?? 0)).toBe(2_500);
    const hoy = losDatos<{ valorTotalCentimos: number }>(
      await api.consultar(rosa, 'inventario_hoy', {}),
    );
    expect(despues.total).toBe(hoy.valorTotalCentimos);
  });

  it('**el valor de hoy es el mismo que calcula Inventario · Hoy**', async () => {
    const hoy = losDatos<{ valorTotalCentimos: number }>(
      await api.consultar(rosa, 'inventario_hoy', {}),
    );
    const valor = await indicador(rosa, 'valor-camara');
    expect(valor.total).toBe(hoy.valorTotalCentimos);
    expect(valor.serie.at(-1)?.valor).toBe(hoy.valorTotalCentimos);
  });

  it('**y el bajo mínimo de hoy es la lista de atención** de Inventario · Hoy', async () => {
    const hoy = losDatos<{ atencion: unknown[] }>(await api.consultar(rosa, 'inventario_hoy', {}));
    const bajo = await indicador(rosa, 'bajo-minimo');
    expect(bajo.total).toBe(hoy.atencion.length);
    // La lubina recién dada de alta, sin nada, está en los dos.
    expect(bajo.total).toBeGreaterThan(0);
  });

  it('lo que entra hoy sube el valor de hoy, y no toca el de ayer', async () => {
    const antes = await indicador(rosa, 'valor-camara');
    losDatos(
      await api.ejecutar(rosa, 'apuntar_entrada', {
        producto_id: productoId,
        cuanto: 4,
        como: 'unidades_de_uso',
        precio_centimos: 1_500,
      }),
    );
    const despues = await indicador(rosa, 'valor-camara');
    expect((despues.total ?? 0) - (antes.total ?? 0)).toBe(6_000);
    // Ayer es ayer: una foto no se reescribe con lo de hoy.
    expect(despues.serie.at(-2)?.valor).toBe(antes.serie.at(-2)?.valor);
  });

  it('es una foto: el periodo es lo del último día, no la suma de siete', async () => {
    const valor = await indicador(rosa, 'valor-camara');
    expect(valor.total).toBe(valor.serie.at(-1)?.valor);
    // Y el anterior, lo que había al acabar el periodo de antes.
    expect(valor.anterior).not.toBeNull();
    expect(valor.diasConDato).toBe(7);
  });

  it('un cocinero ve cuántos están bajo mínimo, y no ve lo que vale la cámara', async () => {
    const bajo = await api.consultar(marcos, 'un_indicador', {
      indicador: 'bajo-minimo',
      dias: '7',
    });
    expect(bajo.estado).toBe('ok');
    const valor = await api.consultar(marcos, 'un_indicador', {
      indicador: 'valor-camara',
      dias: '7',
    });
    expect(elFallo(valor)).toBe('sin_permiso');
  });
});

// ── Servicio ─────────────────────────────────────────────────────────────────

describe('las cajas cerradas', () => {
  it('cuentan días, y un día con caja cuenta una vez', async () => {
    const antes = await indicador(rosa, 'cierres');
    const hoy = antes.jornada as FechaOperativa;
    for (const fecha of [masDias(hoy, -1), masDias(hoy, -2)]) {
      losDatos(
        await api.ejecutar(rosa, 'cerrar_la_caja', { fecha, total_centimos: 50_000, tickets: 20 }),
      );
    }
    const despues = await indicador(rosa, 'cierres');
    expect((despues.total ?? 0) - (antes.total ?? 0)).toBe(2);
    expect(despues.serie.at(-2)?.valor).toBe(1);
    // Un día sin caja es un día sin caja: cero, no «no se sabe».
    expect(despues.serie.every((d) => d.valor !== null)).toBe(true);
  });
});

// ── Equipo ───────────────────────────────────────────────────────────────────

describe('las horas y el coste, como el Resumen', () => {
  beforeAll(async () => {
    const { jornada } = await indicador(rosa, 'horas-equipo', '30');
    const hoy = jornada as FechaOperativa;
    await unTurno(masDias(hoy, -3), '10:00', 6);
    await unTurno(masDias(hoy, -12), '09:30', 7);
    // Uno del periodo de antes, que no puede colarse en este.
    await unTurno(masDias(hoy, -40), '10:00', 5);

    const [local] = await comoDuena<{ organizacion_id: string }>(
      `select organizacion_id::text as organizacion_id from estook.local where id = $1`,
      [centro],
    );
    await comoDuena(
      `insert into estook.retribucion (
         organizacion_id, persona_id, forma, importe_centimos, horas_semanales, puesto, desde
       )
       values ($1, $2, 'por_hora', 1_250, 40, 'Cocinero', $3::date)`,
      [local?.organizacion_id, marcosId, masDias(hoy, -90)],
    );
  });

  it('**las horas del equipo son las del Resumen**, los mismos treinta días', async () => {
    const resumen = losDatos<{ minutosTotales: number }>(
      await api.consultar(rosa, 'resumen_del_equipo', { periodo: '30' }),
    );
    const horas = await indicador(rosa, 'horas-equipo', '30');
    expect(horas.total).toBe(resumen.minutosTotales);
    expect(horas.total).toBeGreaterThanOrEqual(13 * 60);
  });

  it('**y el coste de personal, el del Resumen**, con el salario de cada uno', async () => {
    const resumen = losDatos<{ costeTotalCentimos: number }>(
      await api.consultar(rosa, 'resumen_del_equipo', { periodo: '30' }),
    );
    const coste = await indicador(rosa, 'coste-personal', '30');
    expect(coste.total).toBe(resumen.costeTotalCentimos);
    // Trece horas a 12,50 €, por lo menos: el salario ha entrado en la cuenta.
    expect(coste.total).toBeGreaterThanOrEqual(13 * 1_250);
  });

  it('un jefe de cocina ve las horas de los suyos, y no lo que cuestan', async () => {
    const horas = await api.consultar(luis, 'un_indicador', {
      indicador: 'horas-equipo',
      dias: '7',
    });
    expect(horas.estado).toBe('ok');
    const coste = await api.consultar(luis, 'un_indicador', {
      indicador: 'coste-personal',
      dias: '7',
    });
    expect(elFallo(coste)).toBe('sin_permiso');
  });

  it('un cocinero no tiene Equipo: ni las horas de los demás', async () => {
    const horas = await api.consultar(marcos, 'un_indicador', {
      indicador: 'horas-equipo',
      dias: '7',
    });
    expect(elFallo(horas)).toBe('sin_permiso');
  });
});

describe('los retrasos (0040)', () => {
  let hoy: FechaOperativa;

  beforeAll(async () => {
    hoy = (await indicador(rosa, 'retrasos')).jornada as FechaOperativa;
  });

  it('sin horario de siempre puesto, **no hay retrasos «cero»: no se sabe**', async () => {
    const retrasos = await indicador(rosa, 'retrasos');
    expect(retrasos.total).toBeNull();
    expect(retrasos.serie.every((d) => d.valor === null)).toBe(true);
  });

  it('pasar del margen es retraso; llegar dentro de él, no', async () => {
    // Entra a las 11:00 dos días de esta semana: uno ficha a las 11:12 y otro a
    // las 11:03. Con cinco minutos de margen, uno tarde.
    const tarde = masDias(hoy, -4);
    const aTiempo = masDias(hoy, -5);
    for (const fecha of [tarde, aTiempo]) {
      await comoDuena(
        `insert into estook.horario_habitual (local_id, persona_id, dia_de_la_semana, entra, sale, desde)
         values ($1, $2, extract(isodow from $3::date)::int, '11:00', '16:00', $3::date - 60)`,
        [centro, marcosId, fecha],
      );
    }
    await unTurno(tarde, '11:12', 5);
    await unTurno(aTiempo, '11:03', 5);

    const retrasos = await indicador(rosa, 'retrasos');
    expect(retrasos.total).toBe(1);
    const delDia = new Map(retrasos.serie.map((d) => [d.fecha, d.valor]));
    expect(delDia.get(tarde)).toBe(1);
    expect(delDia.get(aTiempo)).toBe(0);
  });

  it('**el Resumen cuenta los mismos**, persona a persona', async () => {
    const resumen = losDatos<{
      filas: { personaId: string; retrasos: number | null }[];
      margenDeRetraso: number;
    }>(await api.consultar(rosa, 'resumen_del_equipo', { periodo: 'semana' }));
    const semana = await indicador(rosa, 'retrasos', '7');
    expect(resumen.margenDeRetraso).toBe(5);

    // El Resumen «de la semana» empieza el lunes y la cifra cuenta siete días:
    // se compara con los treinta, que caben enteros en los dos.
    const mes = losDatos<{ filas: { personaId: string; retrasos: number | null }[] }>(
      await api.consultar(rosa, 'resumen_del_equipo', { periodo: '30' }),
    );
    const treinta = await indicador(rosa, 'retrasos', '30');
    const suma = mes.filas.reduce((total, f) => total + (f.retrasos ?? 0), 0);
    expect(suma).toBe(treinta.total);
    expect(mes.filas.find((f) => f.personaId === marcosId)?.retrasos).toBe(1);
    expect(semana.total).toBe(1);
  });

  it('subir el margen a quince deja de contarlo, también hacia atrás', async () => {
    losDatos(await api.ejecutar(rosa, 'guardar_margen_de_retraso', { minutos: 15 }));
    expect((await indicador(rosa, 'retrasos')).total).toBe(0);
    losDatos(await api.ejecutar(rosa, 'guardar_margen_de_retraso', { minutos: 5 }));
    expect((await indicador(rosa, 'retrasos')).total).toBe(1);
  });

  it('el margen lo cambia quien lleva el local, **y un cocinero no**', async () => {
    const intento = await api.ejecutar(marcos, 'guardar_margen_de_retraso', { minutos: 30 });
    expect(elFallo(intento)).toBe('sin_permiso');
    const [local] = await comoDuena<{ margen: number }>(
      `select margen_de_retraso_minutos as margen from estook.local where id = $1`,
      [centro],
    );
    expect(local?.margen).toBe(5);
  });

  it('y la base no acepta un margen sin sentido', async () => {
    const intento = await api.ejecutar(rosa, 'guardar_margen_de_retraso', { minutos: 90 });
    expect(intento.estado).toBe('fallo');
    await expect(
      comoDuena(`update estook.local set margen_de_retraso_minutos = -1 where id = $1`, [centro]),
    ).rejects.toThrow(/local_margen_de_retraso_con_sentido/);
  });

  it('se lee donde se lee el fichaje, para Ajustes', async () => {
    const miFichaje = losDatos<{ margenDeRetrasoMinutos: number }>(
      await api.consultar(rosa, 'mi_fichaje', {}),
    );
    expect(miFichaje.margenDeRetrasoMinutos).toBe(5);
  });
});
