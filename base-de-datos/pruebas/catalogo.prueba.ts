import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  ROLES,
  ALCANCE_DEL_ROL,
  IDIOMAS,
  POLITICAS_MAESTRAS,
  TIPOS_MAESTROS,
} from '@estook/dominio';
import { PERMISOS, NIVELES } from '@estook/permisos';
import { levantarBase, type BaseDePrueba } from './entorno.ts';

/**
 * El vocabulario esta escrito dos veces: en SQL, que es donde manda, y en
 * TypeScript, que es lo que usan las cuatro aplicaciones y el servidor.
 *
 * Esta prueba existe para que no se separen nunca. Si alguien anade un permiso en
 * la base de datos y se olvida del paquete, o al reves, aqui salta.
 *
 * Los NIVELES si viven en los dos sitios porque son tres palabras que no cambian;
 * la MATRIZ de que trae cada rol vive solo en la base de datos, que es su unico
 * dueno (regla 6).
 */
let base: BaseDePrueba;

beforeAll(async () => {
  base = await levantarBase();
}, 60_000);

afterAll(async () => {
  await base.cerrar();
});

async function codigos(consulta: string): Promise<string[]> {
  const { rows } = await base.bd.query<{ codigo: string }>(consulta);
  return rows.map((f) => f.codigo).sort();
}

describe('el vocabulario cuadra entre la base de datos y TypeScript', () => {
  it('los doce roles', async () => {
    expect(await codigos('select codigo from estook.rol')).toEqual([...ROLES].sort());
  });

  it('y cada uno se concede en el mismo alcance', async () => {
    const { rows } = await base.bd.query<{ codigo: string; alcance: string }>(
      'select codigo, alcance from estook.rol order by codigo',
    );
    for (const fila of rows) {
      expect(ALCANCE_DEL_ROL[fila.codigo as (typeof ROLES)[number]], fila.codigo).toBe(
        fila.alcance,
      );
    }
  });

  it('el catalogo de permisos', async () => {
    expect(await codigos('select codigo from estook.permiso')).toEqual([...PERMISOS].sort());
  });

  it('los tres niveles', async () => {
    expect(
      await codigos(`select unnest(enum_range(null::estook.nivel_de_permiso))::text as codigo`),
    ).toEqual([...NIVELES].sort());
  });

  it('los cinco idiomas', async () => {
    expect(await codigos(`select unnest(enum_range(null::estook.idioma))::text as codigo`)).toEqual(
      [...IDIOMAS].sort(),
    );
  });

  it('las tres politicas del catalogo maestro', async () => {
    expect(
      await codigos(`select unnest(enum_range(null::estook.politica_maestra))::text as codigo`),
    ).toEqual([...POLITICAS_MAESTRAS].sort());
  });

  it('los seis tipos de elemento maestro', async () => {
    expect(
      await codigos(`select unnest(enum_range(null::estook.tipo_maestro))::text as codigo`),
    ).toEqual([...TIPOS_MAESTROS].sort());
  });
});
