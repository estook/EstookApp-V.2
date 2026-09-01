import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { levantarBase, type BaseDePrueba } from './entorno.ts';

/**
 * M2 · las reglas fiscales, contra Postgres de verdad.
 *
 * Lo que se comprueba aqui no es el calculo (eso son las pruebas del motor en
 * packages/dominio), sino las dos garantias que impone la base de datos:
 * que una regla usada no se puede reescribir, y que nada se toca en silencio.
 */
let base: BaseDePrueba;

beforeAll(async () => {
  base = await levantarBase();
}, 60_000);

afterAll(async () => {
  await base.cerrar();
});

async function tipoDe(codigo: string): Promise<string | undefined> {
  const { rows } = await base.bd.query<{ tipo: string }>(
    'select tipo from estook.regla_fiscal where codigo = $1',
    [codigo],
  );
  return rows[0]?.tipo;
}

describe('las reglas sembradas', () => {
  it('estan las de los cuatro territorios', async () => {
    const { rows } = await base.bd.query<{ territorio: string; cuantas: number }>(`
      select territorio, count(*)::int as cuantas
        from estook.regla_fiscal group by territorio order by territorio
    `);
    // Ordenados como estan declarados, no alfabeticamente: en Postgres un enum
    // ordena por el orden en que se escribio, y eso lo hace estable.
    expect(rows.map((f) => f.territorio)).toEqual([
      'peninsula_y_baleares',
      'canarias',
      'ceuta',
      'melilla',
    ]);
  });

  it('todas llevan su referencia legal', async () => {
    const { rows } = await base.bd.query<{ sin_respaldo: number }>(`
      select count(*)::int as sin_respaldo from estook.regla_fiscal
       where referencia_legal is null or length(btrim(referencia_legal)) = 0
    `);
    expect(rows[0]?.sin_respaldo).toBe(0);
  });

  it('el mismo botellin tributa distinto segun la operacion', async () => {
    expect(await tipoDe('iva-restauracion')).toBe('0.1000');
    expect(await tipoDe('iva-alcohol-entregado')).toBe('0.2100');
  });

  it('Melilla distingue por categoria de restaurante', async () => {
    expect(await tipoDe('ipsi-melilla-un-tenedor')).toBe('0.0100');
    expect(await tipoDe('ipsi-melilla-dos-o-mas-tenedores')).toBe('0.0200');
    expect(await tipoDe('ipsi-melilla-categoria-especial')).toBe('0.0200');
    expect(await tipoDe('ipsi-melilla-servicios')).toBe('0.0400');
  });

  it('Canarias no tiene ni una regla de IVA', async () => {
    const { rows } = await base.bd.query<{ cuantas: number }>(`
      select count(*)::int as cuantas from estook.regla_fiscal
       where territorio = 'canarias' and regimen <> 'igic'
    `);
    expect(rows[0]?.cuantas).toBe(0);
  });

  it('los huecos conocidos siguen siendo huecos, no ceros inventados', async () => {
    // Canarias, Ceuta y Melilla no tienen reglas de entrega de bienes todavia.
    const { rows } = await base.bd.query<{ cuantas: number }>(`
      select count(*)::int as cuantas from estook.regla_fiscal
       where territorio <> 'peninsula_y_baleares' and naturaleza = 'entrega_de_bienes'
    `);
    expect(rows[0]?.cuantas).toBe(0);
  });
});

describe('una regla usada no se reescribe', () => {
  it('no se puede cambiar el tipo', async () => {
    await expect(
      base.bd.exec(`update estook.regla_fiscal set tipo = 0.15 where codigo = 'iva-restauracion'`),
    ).rejects.toThrow(/no se reescribe/i);
  });

  it('ni el territorio, ni la categoria, ni nada que decida el resultado', async () => {
    await expect(
      base.bd.exec(
        `update estook.regla_fiscal set categoria_fiscal = 'alimento' where codigo = 'iva-restauracion'`,
      ),
    ).rejects.toThrow(/no se reescribe/i);
  });

  it('no se puede borrar', async () => {
    await expect(
      base.bd.exec(`delete from estook.regla_fiscal where codigo = 'iva-restauracion'`),
    ).rejects.toThrow(/no se borra/i);
  });

  it('no se puede cerrar la vigencia en el pasado', async () => {
    await expect(
      base.bd.exec(
        `update estook.regla_fiscal set vigente_hasta = current_date - 30 where codigo = 'iva-restauracion'`,
      ),
    ).rejects.toThrow(/solo se cierra a partir de hoy/i);
  });

  it('pero si se puede cerrar hacia delante, que es como cambia una ley', async () => {
    await base.bd.exec(
      `update estook.regla_fiscal set vigente_hasta = current_date + 30 where codigo = 'iva-otros-entregado'`,
    );
    const { rows } = await base.bd.query<{ vigente_hasta: string | null }>(
      `select vigente_hasta from estook.regla_fiscal where codigo = 'iva-otros-entregado'`,
    );
    expect(rows[0]?.vigente_hasta).not.toBeNull();
  });

  it('y se puede desactivar', async () => {
    await base.bd.exec(
      `update estook.regla_fiscal set activa = false where codigo = 'iva-otros-entregado'`,
    );
    const { rows } = await base.bd.query<{ activa: boolean }>(
      `select activa from estook.regla_fiscal where codigo = 'iva-otros-entregado'`,
    );
    expect(rows[0]?.activa).toBe(false);
  });

  it('cambiar un tipo es crear una version nueva, y las dos conviven', async () => {
    await base.bd.exec(`
      insert into estook.regla_fiscal
        (codigo, version, territorio, regimen, naturaleza, tipo, vigente_desde, referencia_legal)
      values
        ('iva-restauracion', 2, 'peninsula_y_baleares', 'iva', 'prestacion_de_servicios',
         0.1100, current_date + 1, 'Supuesto cambio de ley, de prueba')
    `);
    const { rows } = await base.bd.query<{ version: number; tipo: string }>(
      `select version, tipo from estook.regla_fiscal where codigo = 'iva-restauracion' order by version`,
    );
    expect(rows).toHaveLength(2);
    expect(rows[0]?.tipo).toBe('0.1000');
    expect(rows[1]?.tipo).toBe('0.1100');
  });
});

describe('nada se toca en silencio', () => {
  it('cada regla sembrada dejo su linea de auditoria', async () => {
    const { rows } = await base.bd.query<{ cuantas: number }>(`
      select count(*)::int as cuantas from estook.auditoria
       where entidad = 'regla_fiscal' and accion = 'crear'
    `);
    expect(rows[0]?.cuantas).toBeGreaterThanOrEqual(17);
  });

  it('cerrar una vigencia y desactivar quedan anotados con su nombre', async () => {
    const { rows } = await base.bd.query<{ accion: string }>(`
      select distinct accion from estook.auditoria
       where entidad = 'regla_fiscal' and accion <> 'crear' order by accion
    `);
    expect(rows.map((f) => f.accion)).toEqual(['cerrar_vigencia', 'desactivar']);
  });

  it('la auditoria guarda el antes y el despues', async () => {
    const { rows } = await base.bd.query<{
      antes: { activa: boolean };
      despues: { activa: boolean };
    }>(`
      select antes, despues from estook.auditoria
       where entidad = 'regla_fiscal' and accion = 'desactivar' limit 1
    `);
    expect(rows[0]?.antes.activa).toBe(true);
    expect(rows[0]?.despues.activa).toBe(false);
  });

  it('y esas lineas de auditoria tampoco se pueden tocar', async () => {
    await expect(
      base.bd.exec(`delete from estook.auditoria where entidad = 'regla_fiscal'`),
    ).rejects.toThrow(/solo se anade/i);
  });
});

describe('el local y su ficha fiscal', () => {
  it('un local nace en peninsula, con IVA y precios con impuesto incluido', async () => {
    const { rows } = await base.bd.query<{
      territorio: string;
      regimen: string;
      modo_de_precio: string;
    }>(`select territorio, regimen, modo_de_precio from estook.local where codigo = 'bar-centro'`);
    expect(rows[0]).toEqual({
      territorio: 'peninsula_y_baleares',
      regimen: 'iva',
      modo_de_precio: 'impuesto_incluido',
    });
  });

  it('no se puede dejar un local canario con IVA', async () => {
    await expect(
      base.bd.exec(`update estook.local set territorio = 'canarias' where codigo = 'bar-centro'`),
    ).rejects.toThrow();
  });

  it('cambiando los dos a la vez si', async () => {
    await base.bd.exec(
      `update estook.local set territorio = 'canarias', regimen = 'igic' where codigo = 'bar-playa'`,
    );
    const { rows } = await base.bd.query<{ regimen: string }>(
      `select regimen from estook.local where codigo = 'bar-playa'`,
    );
    expect(rows[0]?.regimen).toBe('igic');
  });
});
