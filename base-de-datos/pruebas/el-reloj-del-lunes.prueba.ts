import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { modeloDeMentira } from '../../servidor/ia/modelo.ts';
import { levantarBase, type BaseDePrueba } from './entorno.ts';
import { montarLaApi } from './despachador.ts';
import { elSqlDePglite } from '../herramientas/el-sql-de-pglite.mjs';

/**
 * **El reloj del lunes** (26-oct; lección 225, migración 0091). La madrugada del 26-oct
 * el reloj dio un 500 en cada latido desde la 01:07 (hasta las 06:07, la última hora
 * en que revisa), por dos cosas a la vez:
 *
 *   · la revisión de noche de Fogón **no veía la que ya había hecho** (el reloj no lee
 *     las revisiones), y a la hora siguiente volvía a los mismos locales y chocaba
 *   · y ese choque, que el reloj daba por apartado con un `savepoint` escrito a mano,
 *     **tumbaba el latido entero**: `postgres.js` tira la transacción por cualquier
 *     consulta que falla, aunque se recoja
 *
 * Las pruebas no lo veían porque su `sql` no se portaba como `postgres.js`. Ahora sí.
 */
let base: BaseDePrueba;
const modelo = modeloDeMentira();
const SECRETO = 'el-secreto-del-reloj-del-lunes';

async function comoDuena<T>(consulta: string, parametros: unknown[] = []): Promise<T[]> {
  const { rows } = await base.bd.query<T>(consulta, parametros);
  return rows;
}

function latirEl(instante: string) {
  return montarLaApi(base.bd, { fogon: modelo, ahora: () => new Date(instante) }).despachador.latir(
    { tokenDeSesion: null, correlacionId: crypto.randomUUID() },
    SECRETO,
  );
}

beforeAll(async () => {
  base = await levantarBase();
  // Todos los locales de la semilla, de verdad y con Fogón: más de dos, para que la
  // revisión de noche tenga que seguir a la hora siguiente.
  await comoDuena('update estook.organizacion set es_ejemplo = false');
  await comoDuena('update estook.local set es_ejemplo = false');
  await comoDuena(
    `update plataforma.reloj set huella = encode(sha256(convert_to($1, 'UTF8')), 'hex')`,
    [SECRETO],
  );
  await comoDuena('update plataforma.fogon set encendido = true where unica');
  await comoDuena(
    `insert into plataforma.fogon_del_cliente (organizacion_id, encendido)
     select id, true from estook.organizacion
     on conflict (organizacion_id) do update set encendido = true`,
  );
}, 120_000);

afterAll(async () => {
  await base.cerrar();
});

describe('el sql de las pruebas, como el de postgres.js', () => {
  it('una consulta que falla tira la transacción, aunque se recoja; en un punto de guardado, no', async () => {
    await base.bd.exec('begin');
    const fuera = elSqlDePglite(base.bd);
    const sql = fuera.sql as (t: TemplateStringsArray, ...v: unknown[]) => Promise<unknown[]>;
    await sql`select 1`.catch(() => null);
    await sql`select * from no_existe_esta_tabla`.catch(() => null);
    expect(fuera.sinRecoger()).not.toBeNull();
    await base.bd.exec('rollback');

    await base.bd.exec('begin');
    const conPunto = elSqlDePglite(base.bd);
    const savepoint = (
      conPunto.sql as { savepoint: (h: (s: typeof sql) => Promise<unknown>) => Promise<unknown> }
    ).savepoint;
    await savepoint(async (dentro) => dentro`select * from no_existe_esta_tabla`).catch(() => null);
    expect(conPunto.sinRecoger()).toBeNull();
    // Y la transacción sigue viva después.
    expect(await (conPunto.sql as typeof sql)`select 1 as uno`).toEqual([{ uno: 1 }]);
    await base.bd.exec('rollback');
  });
});

describe('la madrugada del lunes 26 de octubre de 2026', () => {
  // 00:07, 01:07, 02:07 y 03:07 de Madrid (en invierno desde el 25-oct).
  const latidos = [
    '2026-10-25T23:07:00Z',
    '2026-10-26T00:07:00Z',
    '2026-10-26T01:07:00Z',
    '2026-10-26T02:07:00Z',
  ];

  it('cada latido sale y queda apuntado, y cada hora revisa dos locales nuevos', async () => {
    const locales = await comoDuena<{ n: number }>(
      'select count(*)::int as n from estook.local where activo',
    );
    const cuantos = locales[0]?.n ?? 0;
    expect(cuantos).toBeGreaterThan(2);

    for (const [i, instante] of latidos.entries()) {
      await expect(latirEl(instante)).resolves.not.toBeNull();
      const [reloj] = await comoDuena<{ latido: string }>(
        'select ultimo_latido::text as latido from plataforma.reloj where unica',
      );
      expect(reloj?.latido).toBeDefined();
      const revisados = await comoDuena<{ n: number; distintos: number }>(
        `select count(*)::int as n, count(distinct local_id)::int as distintos
           from estook.revision_de_fogon where de_noche and semana = '2026-10-26'`,
      );
      // Dos por latido, hasta que no quedan; y ninguno dos veces.
      expect(revisados[0]?.n).toBe(Math.min(2 * (i + 1), cuantos));
      expect(revisados[0]?.distintos).toBe(revisados[0]?.n);
    }
  });
});
