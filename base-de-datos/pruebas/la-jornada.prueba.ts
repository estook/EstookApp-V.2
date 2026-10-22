import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { levantarBase, type BaseDePrueba } from './entorno.ts';
import { elFallo, losDatos, montarLaApi, type ApiDePrueba } from './despachador.ts';

/**
 * M16a · La jornada (decisión 0105, migración 0080), contra una base de verdad y como
 * cada persona:
 *
 *   · **el día se abre solo**: sin cierre está abierto, sin que nadie pulse nada
 *   · **un día cerrado no se toca**: ni otra vez `cerrar_la_caja` ni, por debajo, la base
 *   · **se reabre con un motivo**, lo reabre quien puede cerrar (Richi, 22-oct), queda a
 *     la vista y en la auditoría, y al volver a cerrar corrige sin duplicar
 *   · la camarera ve cómo está el día **sin un euro**, y no lo reabre
 *   · **la noche del cambio de hora**: el sábado 24 de octubre dura 25 horas, y lo de
 *     las 04:30 del domingo es suyo
 */
let base: BaseDePrueba;
let api: ApiDePrueba;

/** Martes 6-oct-2026 a las 23:30 en Madrid: se está cerrando el día. */
let ahora = new Date('2026-10-06T21:30:00Z');
const MARTES = '2026-10-06';
const LUNES = '2026-10-05';

const ROSA = 'rosa@ejemplo.estook.com'; // gerente de Bar Centro: cierra la caja
const SARA = 'sara@ejemplo.estook.com'; // camarera: Servicio sin las ventas
const LUIS = 'luis@ejemplo.estook.com'; // jefe de cocina de Bar Puerto, otra organización

let rosa: string;
let sara: string;
let luis: string;

interface ElCierre {
  readonly cierre: { readonly cierreId: string; readonly totalCentimos: number } | null;
  readonly lineas: readonly { readonly concepto: string }[];
  readonly jornada: {
    readonly estado: string;
    readonly esHoy: boolean;
    readonly reaperturas: readonly { motivo: string; quien: string | null }[];
    readonly siguenDentro: number | null;
  };
}

interface LaJornada {
  readonly fecha: string;
  readonly minutos: number;
  readonly quedan: number;
  readonly estado: string;
  readonly cerradaPor: string | null;
  readonly puedeCerrar: boolean;
  readonly empiezaEn: string;
  readonly terminaEn: string;
}

async function comoDuena<T>(consulta: string, parametros: unknown[] = []): Promise<T[]> {
  const { rows } = await base.bd.query<T>(consulta, parametros);
  return rows;
}

const elCierre = async (fecha: string) =>
  losDatos<ElCierre>(await api.consultar(rosa, 'un_cierre', { fecha }));

beforeAll(async () => {
  base = await levantarBase();
  api = montarLaApi(base.bd, { ahora: () => ahora });
  // Bar Centro corta a las 03:00 en la semilla; aquí, a las 05:00, la de casi todos.
  await comoDuena(`update estook.local set hora_de_corte = '05:00' where codigo = 'bar-centro'`);
  rosa = await api.entrar(ROSA);
  sara = await api.entrar(SARA);
  luis = await api.entrar(LUIS);
}, 120_000);

afterAll(async () => {
  await base.cerrar();
});

describe('el día se abre solo y se cierra una vez', () => {
  it('sin cierre, el día está abierto: nadie lo ha tenido que abrir', async () => {
    const hoy = losDatos<LaJornada>(await api.consultar(rosa, 'la_jornada'));
    expect(hoy.fecha).toBe(MARTES);
    expect(hoy.estado).toBe('abierta');
    expect(hoy.minutos).toBe(24 * 60);
    // De las 05:00 del martes a las 05:00 del miércoles; son las 23:30.
    expect(hoy.quedan).toBe(5 * 60 + 30);
    expect(hoy.puedeCerrar).toBe(true);
    expect((await elCierre(MARTES)).jornada.estado).toBe('abierta');
  });

  it('cerrar la caja cierra el día, a nombre de quien la cierra', async () => {
    losDatos(
      await api.ejecutar(rosa, 'cerrar_la_caja', {
        fecha: MARTES,
        total_centimos: 142_100,
        tarjeta_centimos: 42_100,
        lineas: [{ concepto: 'Croquetas', unidades: 12 }],
      }),
    );
    const cierre = await elCierre(MARTES);
    expect(cierre.jornada.estado).toBe('cerrada');
    expect(cierre.jornada.esHoy).toBe(true);
    expect(cierre.jornada.reaperturas).toEqual([]);

    const hoy = losDatos<LaJornada>(await api.consultar(rosa, 'la_jornada'));
    expect(hoy.estado).toBe('cerrada');
    expect(hoy.cerradaPor).toMatch(/Rosa/);
  });

  it('volver a cerrarlo sin reabrir no lo cambia', async () => {
    const otra = await api.ejecutar(rosa, 'cerrar_la_caja', {
      fecha: MARTES,
      total_centimos: 1,
    });
    expect(elFallo(otra)).toBe('jornada_cerrada');
    expect((await elCierre(MARTES)).cierre?.totalCentimos).toBe(142_100);
  });

  it('y la base tampoco deja tocarlo por debajo: ni sus cifras ni sus platos', async () => {
    const [cierre] = await comoDuena<{ id: string }>(
      `select c.id from estook.cierre_de_caja c join estook.local l on l.id = c.local_id
        where l.codigo = 'bar-centro' and c.fecha_operativa = $1::date`,
      [MARTES],
    );
    await expect(
      comoDuena('update estook.cierre_de_caja set total_centimos = 1 where id = $1', [cierre?.id]),
    ).rejects.toThrow(/jornada_cerrada/);
    // Pasar a «reabierta» sin escribir por qué, tampoco.
    await expect(
      comoDuena(`update estook.cierre_de_caja set estado = 'reabierta' where id = $1`, [
        cierre?.id,
      ]),
    ).rejects.toThrow(/jornada_cerrada/);
    await expect(
      comoDuena(
        `insert into estook.linea_de_cierre (cierre_id, concepto, concepto_normalizado, unidades)
         values ($1, 'Bravas', '', 3)`,
        [cierre?.id],
      ),
    ).rejects.toThrow(/jornada_cerrada/);
    await expect(
      comoDuena('delete from estook.linea_de_cierre where cierre_id = $1', [cierre?.id]),
    ).rejects.toThrow(/jornada_cerrada/);
  });
});

describe('reabrir, con su motivo', () => {
  it('sin motivo no se reabre', async () => {
    const sin = await api.ejecutar(rosa, 'reabrir_la_jornada', { fecha: MARTES, motivo: ' ' });
    expect(elFallo(sin)).toBe('faltan_datos');
    expect((await elCierre(MARTES)).jornada.estado).toBe('cerrada');
  });

  it('un día sin cerrar no se reabre: se cierra', async () => {
    const lunes = await api.ejecutar(rosa, 'reabrir_la_jornada', {
      fecha: LUNES,
      motivo: 'Por probar',
    });
    expect(elFallo(lunes)).toBe('jornada_abierta');
  });

  it('la camarera ve cómo está el día, sin un euro, y no lo reabre', async () => {
    const suya = await api.consultar(sara, 'la_jornada');
    const hoy = losDatos<LaJornada>(suya);
    expect(hoy.estado).toBe('cerrada');
    expect(hoy.puedeCerrar).toBe(false);
    expect(JSON.stringify(suya)).not.toMatch(/142100|centimos/i);

    const reabre = await api.ejecutar(sara, 'reabrir_la_jornada', {
      fecha: MARTES,
      motivo: 'Me he equivocado',
    });
    expect(elFallo(reabre)).toBe('sin_permiso');
  });

  it('desde otro negocio no se reabre: allí ese día no tiene cierre', async () => {
    const ajena = await api.ejecutar(luis, 'reabrir_la_jornada', {
      fecha: MARTES,
      motivo: 'Desde Bar Puerto',
    });
    expect(['jornada_abierta', 'sin_permiso']).toContain(elFallo(ajena));
    expect((await elCierre(MARTES)).jornada.estado).toBe('cerrada');
  });

  it('quien cierra lo reabre, y el motivo queda a la vista y en la auditoría', async () => {
    const motivo = 'Me equivoqué con la tarjeta: eran 412, no 421';
    const hecho = losDatos<{ yaEstabaReabierta: boolean }>(
      await api.ejecutar(rosa, 'reabrir_la_jornada', { fecha: MARTES, motivo }),
    );
    expect(hecho.yaEstabaReabierta).toBe(false);

    const cierre = await elCierre(MARTES);
    expect(cierre.jornada.estado).toBe('reabierta');
    expect(cierre.jornada.reaperturas).toHaveLength(1);
    expect(cierre.jornada.reaperturas[0]?.motivo).toBe(motivo);
    expect(cierre.jornada.reaperturas[0]?.quien).toMatch(/Rosa/);
    // Reabrir no cambia ninguna cifra.
    expect(cierre.cierre?.totalCentimos).toBe(142_100);

    const auditado = await comoDuena<{ motivo: string }>(
      `select motivo from estook.auditoria
        where entidad = 'cierre_de_caja' and entidad_id = $1 and motivo = $2`,
      [cierre.cierre?.cierreId, motivo],
    );
    expect(auditado).toHaveLength(1);

    const evento = await comoDuena<{ tipo: string }>(
      `select tipo from estook.bandeja_de_salida where tipo = 'jornada.reabierta'`,
    );
    expect(evento.length).toBeGreaterThanOrEqual(1);
  });

  it('reabrir dos veces no apunta dos reaperturas', async () => {
    const otra = losDatos<{ yaEstabaReabierta: boolean }>(
      await api.ejecutar(rosa, 'reabrir_la_jornada', { fecha: MARTES, motivo: 'Otra vez' }),
    );
    expect(otra.yaEstabaReabierta).toBe(true);
    expect((await elCierre(MARTES)).jornada.reaperturas).toHaveLength(1);
  });

  it('al cerrarlo otra vez corrige, no duplica, y queda cerrado', async () => {
    const corregido = losDatos<{ seHaCorregido: boolean }>(
      await api.ejecutar(rosa, 'cerrar_la_caja', {
        fecha: MARTES,
        total_centimos: 141_200,
        tarjeta_centimos: 41_200,
        lineas: [
          { concepto: 'Croquetas', unidades: 12 },
          { concepto: 'Bravas', unidades: 4 },
        ],
      }),
    );
    expect(corregido.seHaCorregido).toBe(true);

    const cierre = await elCierre(MARTES);
    expect(cierre.jornada.estado).toBe('cerrada');
    expect(cierre.cierre?.totalCentimos).toBe(141_200);
    expect(cierre.lineas).toHaveLength(2);
    expect(cierre.jornada.reaperturas).toHaveLength(1);

    const [cuantos] = await comoDuena<{ n: number }>(
      `select count(*)::int as n from estook.cierre_de_caja c join estook.local l on l.id = c.local_id
        where l.codigo = 'bar-centro' and c.fecha_operativa = $1::date`,
      [MARTES],
    );
    expect(cuantos?.n).toBe(1);
  });

  it('borrar un local se lleva sus días cerrados sin tropezar con la regla', async () => {
    // La cascada (y quitar los ejemplos) borra los platos de un día cerrado: no es tocarlo.
    const [cierre] = await comoDuena<{ id: string }>(
      `select c.id from estook.cierre_de_caja c join estook.local l on l.id = c.local_id
        where l.codigo = 'bar-centro' and c.fecha_operativa = $1::date`,
      [MARTES],
    );
    await comoDuena('begin');
    try {
      await comoDuena('delete from estook.cierre_de_caja where id = $1', [cierre?.id]);
      const [quedan] = await comoDuena<{ n: number }>(
        'select count(*)::int as n from estook.linea_de_cierre where cierre_id = $1',
        [cierre?.id],
      );
      expect(quedan?.n).toBe(0);
    } finally {
      await comoDuena('rollback');
    }
  });
});

describe('la noche del cambio de hora', () => {
  it('el sábado 24 de octubre dura 25 horas, y las 04:30 del domingo son suyas', async () => {
    // Domingo 25 a las 04:30 de invierno (03:30 UTC): ya se ha atrasado la hora.
    ahora = new Date('2026-10-25T03:30:00Z');
    const sabado = losDatos<LaJornada>(await api.consultar(rosa, 'la_jornada'));
    expect(sabado.fecha).toBe('2026-10-24');
    expect(sabado.minutos).toBe(25 * 60);
    expect(sabado.quedan).toBe(30);
    expect(sabado.empiezaEn).toBe('2026-10-24T03:00:00.000Z');
    expect(sabado.terminaEn).toBe('2026-10-25T04:00:00.000Z');

    // Y cerrar ahora, sin decir el día, cierra el sábado.
    const hecho = losDatos<{ fecha: string }>(
      await api.ejecutar(rosa, 'cerrar_la_caja', { total_centimos: 296_000 }),
    );
    expect(hecho.fecha).toBe('2026-10-24');
  });

  it('a las 05:00 de invierno empieza el domingo, abierto', async () => {
    ahora = new Date('2026-10-25T04:00:00Z');
    const domingo = losDatos<LaJornada>(await api.consultar(rosa, 'la_jornada'));
    expect(domingo.fecha).toBe('2026-10-25');
    expect(domingo.minutos).toBe(24 * 60);
    expect(domingo.estado).toBe('abierta');
  });
});
