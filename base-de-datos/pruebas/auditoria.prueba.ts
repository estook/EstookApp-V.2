import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { levantarBase, type BaseDePrueba } from './entorno.ts';

/**
 * M1 · la auditoria solo sabe anadir.
 *
 * Regla critica del modulo, literal: «la auditoria rechaza UPDATE por permisos de
 * base de datos». Asi que se comprueban las dos barreras: la de permisos, que es
 * la que pide el Plan, y la del guardian, que cubre al dueno de la tabla.
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
  if (!rows[0]) throw new Error(`No existe la organizacion ${codigo}`);
  return rows[0].id;
}

describe('permisos de la tabla', () => {
  it('estook_api puede leer y anadir', async () => {
    const { rows } = await base.bd.query<{ leer: boolean; anadir: boolean }>(`
      select has_table_privilege('estook_api', 'estook.auditoria', 'SELECT') as leer,
             has_table_privilege('estook_api', 'estook.auditoria', 'INSERT') as anadir
    `);
    expect(rows[0]).toEqual({ leer: true, anadir: true });
  });

  it('estook_api NO puede modificar ni borrar', async () => {
    const { rows } = await base.bd.query<{ modificar: boolean; borrar: boolean }>(`
      select has_table_privilege('estook_api', 'estook.auditoria', 'UPDATE') as modificar,
             has_table_privilege('estook_api', 'estook.auditoria', 'DELETE') as borrar
    `);
    expect(rows[0]).toEqual({ modificar: false, borrar: false });
  });

  it('en el resto de tablas si puede escribir', async () => {
    const { rows } = await base.bd.query<{ modificar: boolean }>(`
      select has_table_privilege('estook_api', 'estook.membresia', 'UPDATE') as modificar
    `);
    expect(rows[0]?.modificar).toBe(true);
  });

  it('el catalogo de roles y permisos es de solo lectura para la API', async () => {
    const { rows } = await base.bd.query<{ leer: boolean; escribir: boolean }>(`
      select has_table_privilege('estook_api', 'estook.rol', 'SELECT') as leer,
             has_table_privilege('estook_api', 'estook.rol', 'UPDATE') as escribir
    `);
    expect(rows[0]).toEqual({ leer: true, escribir: false });
  });
});

describe('el guardian', () => {
  it('deja anotar', async () => {
    const organizacion = await organizacionDe('bar-centro');
    const { rows } = await base.bd.query<{ id: string }>(
      `select estook.anotar($1, 'crear', 'producto', 'prueba-1') as id`,
      [organizacion],
    );
    expect(rows[0]?.id).toBeDefined();
  });

  it('no deja modificar, ni siquiera al dueno de la tabla', async () => {
    await expect(
      base.bd.exec(
        `update estook.auditoria set motivo = 'lo cambio' where entidad_id = 'prueba-1'`,
      ),
    ).rejects.toThrow(/solo se anade/i);
  });

  it('no deja borrar', async () => {
    await expect(
      base.bd.exec(`delete from estook.auditoria where entidad_id = 'prueba-1'`),
    ).rejects.toThrow(/solo se anade/i);
  });

  it('la linea sigue ahi despues de los dos intentos', async () => {
    const { rows } = await base.bd.query<{ cuantas: number }>(
      `select count(*)::int as cuantas from estook.auditoria where entidad_id = 'prueba-1'`,
    );
    expect(rows[0]?.cuantas).toBe(1);
  });
});

describe('que se guarda en cada linea', () => {
  it('recoge la persona y la correlacion de la conexion', async () => {
    const rosa = await base.personaPorCorreo('rosa@ejemplo.estook.com');
    const organizacion = await organizacionDe('bar-centro');
    const correlacion = '6bfc3001-8a63-4985-917d-85cf8055af2a';

    await base.bd.exec(`set estook.persona_id = '${rosa}'`);
    await base.bd.exec(`set estook.correlacion_id = '${correlacion}'`);
    await base.bd.query(
      `select estook.anotar($1, 'modificar', 'producto', 'prueba-2', null, '{"precio": 100}'::jsonb, '{"precio": 120}'::jsonb, 'Subida de proveedor')`,
      [organizacion],
    );
    await base.bd.exec(`set estook.persona_id = ''`);
    await base.bd.exec(`set estook.correlacion_id = ''`);

    const { rows } = await base.bd.query<{
      persona_id: string;
      correlacion_id: string;
      antes: { precio: number };
      despues: { precio: number };
      motivo: string;
    }>(
      `select persona_id, correlacion_id, antes, despues, motivo
         from estook.auditoria where entidad_id = 'prueba-2'`,
    );

    expect(rows[0]?.persona_id).toBe(rosa);
    expect(rows[0]?.correlacion_id).toBe(correlacion);
    expect(rows[0]?.antes.precio).toBe(100);
    expect(rows[0]?.despues.precio).toBe(120);
    expect(rows[0]?.motivo).toBe('Subida de proveedor');
  });

  it('una linea sin organizacion es de la plataforma, no de un cliente', async () => {
    // Desde M2 la organizacion puede ir vacia, y significa «esto no es de nadie
    // en concreto»: un cambio en las reglas fiscales, por ejemplo. Las politicas
    // de seguridad no ensenan esas lineas a ningun cliente.
    await base.bd.exec(
      `insert into estook.auditoria (organizacion_id, accion, entidad, entidad_id)
       values (null, 'crear', 'regla_fiscal', 'de-plataforma')`,
    );
    const { rows } = await base.bd.query<{ cuantas: number }>(
      `select count(*)::int as cuantas from estook.auditoria where entidad_id = 'de-plataforma'`,
    );
    expect(rows[0]?.cuantas).toBe(1);
  });

  it('pero la accion y la entidad siguen sin poder ir vacias', async () => {
    await expect(
      base.bd.exec(`insert into estook.auditoria (accion, entidad) values ('   ', 'producto')`),
    ).rejects.toThrow();
  });
});

describe('quien lee la auditoria', () => {
  it('solo se lee la de la propia organizacion', async () => {
    const organizacionAjena = await organizacionDe('grupo-costa');
    await base.bd.query(`select estook.anotar($1, 'crear', 'producto', 'de-la-cadena')`, [
      organizacionAjena,
    ]);

    const rosa = await base.personaPorCorreo('rosa@ejemplo.estook.com');
    const entidades = await base.comoPersona(rosa, async () => {
      const { rows } = await base.bd.query<{ entidad_id: string }>(
        'select entidad_id from estook.auditoria order by entidad_id',
      );
      return rows.map((f) => f.entidad_id);
    });

    expect(entidades).not.toContain('de-la-cadena');
    expect(entidades).toContain('prueba-1');
  });
});
