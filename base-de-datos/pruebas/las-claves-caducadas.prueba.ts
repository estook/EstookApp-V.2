import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { levantarBase, type BaseDePrueba } from './entorno.ts';
import { losDatos, montarLaApi } from './despachador.ts';

/**
 * Las claves de idempotencia caducadas se tiran solas (23-sep-2026).
 *
 * Las tenía que tirar un trabajo nocturno, y el reloj de los procesos de fondo todavía
 * no existe: la auditoría de producción encontró 440 sin borrar. Ahora las tira
 * `anotar` al apuntar una nueva, y solo las de la misma organización.
 */
let base: BaseDePrueba;

beforeAll(async () => {
  base = await levantarBase();
}, 60_000);

afterAll(async () => {
  await base.cerrar();
});

async function organizacionDe(codigo: string): Promise<string> {
  const { rows } = await base.bd.query<{ id: string }>(
    'select id from estook.organizacion where codigo = $1',
    [codigo],
  );
  if (!rows[0]) throw new Error(`No existe ${codigo}`);
  return rows[0].id;
}

describe('las claves caducadas', () => {
  it('se tiran al apuntar otra, y solo las de esa organización', async () => {
    const centro = await organizacionDe('bar-centro');
    const costa = await organizacionDe('grupo-costa');
    for (const [clave, organizacion] of [
      ['caducada-del-centro', centro],
      ['caducada-de-la-costa', costa],
      ['viva-del-centro', centro],
    ] as const) {
      const caduca = clave.startsWith('viva')
        ? "now() + interval '2 hours'"
        : "now() - interval '2 days'";
      await base.bd.exec(`
        insert into estook.clave_de_idempotencia
          (clave, huella, organizacion_id, comando, respuesta, estado_http, creado_en, caduca_en)
        values ('${clave}', 'h', '${organizacion}', 'crear_categoria', '{}'::jsonb, 200,
                now() - interval '3 days', ${caduca})
      `);
    }

    const api = montarLaApi(base.bd);
    const rosa = await api.entrar('rosa@ejemplo.estook.com');
    losDatos(
      await api.ejecutar(rosa, 'crear_categoria', { nombre: 'Encurtidos' }, 'categoria-de-rosa'),
    );

    const { rows } = await base.bd.query<{ clave: string }>(
      `select clave from estook.clave_de_idempotencia order by clave`,
    );
    // La caducada del Bar Centro, fuera; la viva, dentro; la de otro negocio, intacta
    // —no es suya—; y la nueva, apuntada.
    expect(rows.map((f) => f.clave)).toEqual([
      'caducada-de-la-costa',
      'categoria-de-rosa',
      'viva-del-centro',
    ]);
  });
});
