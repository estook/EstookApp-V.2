import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { levantarBase, type BaseDePrueba } from './entorno.ts';

/**
 * 0136 · El teléfono y la dirección del local, los suyos (Richi, 27-nov). La ficha de Google de IKATZ estaba
 * unida a un Burger King y la web le decía «llama al 628 74 94 14». Lo que escribe el local manda; lo de
 * Google, solo si el local no lo ha puesto.
 */
let base: BaseDePrueba;

beforeAll(async () => {
  base = await levantarBase();
}, 60_000);

afterAll(async () => {
  await base.cerrar();
});

async function laCarta(): Promise<{ telefono: string | null; direccion: string | null }> {
  const { rows } = await base.bd.query<{ telefono: string | null; direccion: string | null }>(
    "select telefono, direccion from estook.la_carta_publica('bar-centro')",
  );
  return rows[0] ?? { telefono: null, direccion: null };
}

describe('el teléfono y la dirección del local, los suyos (0136)', () => {
  it('con los del local y los de Google, mandan los del local', async () => {
    await base.bd.query(
      `update estook.local
          set direccion_de_la_carta = 'bar-centro', activo = true,
              telefono = '672296226', direccion = 'Calle Mayor 1', poblacion = 'Madrid',
              google_telefono = '628 74 94 14', google_direccion = 'C. Marie Curie, 16, Las Rozas'
        where codigo = 'bar-centro'`,
    );
    expect(await laCarta()).toEqual({ telefono: '672296226', direccion: 'Calle Mayor 1, Madrid' });
  });

  it('sin los del local, los de Google', async () => {
    await base.bd.query(
      `update estook.local set telefono = null, direccion = null, poblacion = null
        where codigo = 'bar-centro'`,
    );
    expect(await laCarta()).toEqual({
      telefono: '628 74 94 14',
      direccion: 'C. Marie Curie, 16, Las Rozas',
    });
  });
});
