import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { levantarBase, type BaseDePrueba } from './entorno.ts';

/**
 * M1 · aceptacion.
 *
 * «Toda consulta cruzada entre organizaciones devuelve vacio; y un area manager
 * ve exactamente sus tres locales.»
 *
 * Se prueba llamando a la base de datos a pelo, con `set role estook_api`, que es
 * como se conecta la API. No se prueba nada desde ninguna pantalla: la regla 4
 * dice justamente eso.
 */
let base: BaseDePrueba;

beforeAll(async () => {
  base = await levantarBase();
}, 60_000);

afterAll(async () => {
  await base.cerrar();
});

async function localesVisiblesDe(correo: string): Promise<string[]> {
  const persona = await base.personaPorCorreo(correo);
  const { rows } = await base.bd.query<{ codigo: string }>(
    `select l.codigo
       from estook.locales_visibles($1) v
       join estook.local l on l.id = v.local_id
      order by l.codigo`,
    [persona],
  );
  return rows.map((f) => f.codigo);
}

describe('locales_visibles', () => {
  it('la propietaria de la cadena ve sus seis locales', async () => {
    expect(await localesVisiblesDe('elena@ejemplo.estook.com')).toEqual([
      'bar-darsena',
      'bar-faro',
      'bar-muelle',
      'bar-playa',
      'bar-puerto',
      'bar-ribera',
    ]);
  });

  it('el area manager ve exactamente sus tres locales, ni uno mas', async () => {
    const suyos = await localesVisiblesDe('ignacio@ejemplo.estook.com');
    expect(suyos).toEqual(['bar-faro', 'bar-playa', 'bar-puerto']);
    expect(suyos).toHaveLength(3);
  });

  it('el jefe de cocina de un local ve ese local y ninguno mas', async () => {
    expect(await localesVisiblesDe('luis@ejemplo.estook.com')).toEqual(['bar-puerto']);
  });

  it('el local independiente no ve nada de la cadena', async () => {
    expect(await localesVisiblesDe('rosa@ejemplo.estook.com')).toEqual(['bar-centro']);
    expect(await localesVisiblesDe('sara@ejemplo.estook.com')).toEqual(['bar-centro']);
  });

  it('una membresia que ya caduco no da acceso', async () => {
    const sara = await base.personaPorCorreo('sara@ejemplo.estook.com');
    await base.bd.exec(
      `update estook.membresia
          set desde = current_date - 30, hasta = current_date - 1
        where persona_id = '${sara}'`,
    );
    expect(await localesVisiblesDe('sara@ejemplo.estook.com')).toEqual([]);
    await base.bd.exec(
      `update estook.membresia
          set desde = current_date, hasta = null
        where persona_id = '${sara}'`,
    );
    expect(await localesVisiblesDe('sara@ejemplo.estook.com')).toEqual(['bar-centro']);
  });

  it('una membresia que todavia no empieza tampoco', async () => {
    const sara = await base.personaPorCorreo('sara@ejemplo.estook.com');
    await base.bd.exec(
      `update estook.membresia set desde = current_date + 7 where persona_id = '${sara}'`,
    );
    expect(await localesVisiblesDe('sara@ejemplo.estook.com')).toEqual([]);
    await base.bd.exec(
      `update estook.membresia set desde = current_date where persona_id = '${sara}'`,
    );
  });

  it('un local archivado desaparece de la vista de todos', async () => {
    await base.bd.exec(`update estook.local set activo = false where codigo = 'bar-faro'`);
    expect(await localesVisiblesDe('ignacio@ejemplo.estook.com')).toEqual([
      'bar-playa',
      'bar-puerto',
    ]);
    await base.bd.exec(`update estook.local set activo = true where codigo = 'bar-faro'`);
  });
});

describe('aislamiento entre organizaciones', () => {
  it('la gerente del bar independiente no ve ni un local de la cadena', async () => {
    const rosa = await base.personaPorCorreo('rosa@ejemplo.estook.com');
    const codigos = await base.comoPersona(rosa, async () => {
      const { rows } = await base.bd.query<{ codigo: string }>(
        'select codigo from estook.local order by codigo',
      );
      return rows.map((f) => f.codigo);
    });
    expect(codigos).toEqual(['bar-centro']);
  });

  it('y tampoco ve la organizacion de la cadena', async () => {
    const rosa = await base.personaPorCorreo('rosa@ejemplo.estook.com');
    const codigos = await base.comoPersona(rosa, async () => {
      const { rows } = await base.bd.query<{ codigo: string }>(
        'select codigo from estook.organizacion order by codigo',
      );
      return rows.map((f) => f.codigo);
    });
    expect(codigos).toEqual(['bar-centro']);
  });

  it('el area manager solo ve sus tres locales por la via normal de consulta', async () => {
    const ignacio = await base.personaPorCorreo('ignacio@ejemplo.estook.com');
    const codigos = await base.comoPersona(ignacio, async () => {
      const { rows } = await base.bd.query<{ codigo: string }>(
        'select codigo from estook.local order by codigo',
      );
      return rows.map((f) => f.codigo);
    });
    expect(codigos).toEqual(['bar-faro', 'bar-playa', 'bar-puerto']);
  });

  it('pedir un local ajeno por su identificador tambien devuelve vacio', async () => {
    const rosa = await base.personaPorCorreo('rosa@ejemplo.estook.com');
    const ajeno = await base.localPorCodigo('bar-puerto');
    const filas = await base.comoPersona(rosa, async () => {
      const { rows } = await base.bd.query('select id from estook.local where id = $1', [ajeno]);
      return rows;
    });
    expect(filas).toEqual([]);
  });

  it('sin decir quien pregunta no se ve absolutamente nada', async () => {
    const nada = await base.comoPersona(null, async () => {
      const locales = await base.bd.query('select id from estook.local');
      const organizaciones = await base.bd.query('select id from estook.organizacion');
      const personas = await base.bd.query('select id from estook.persona');
      const membresias = await base.bd.query('select id from estook.membresia');
      return [
        locales.rows.length,
        organizaciones.rows.length,
        personas.rows.length,
        membresias.rows.length,
      ];
    });
    expect(nada).toEqual([0, 0, 0, 0]);
  });

  it('las personas de otra organizacion no se ven', async () => {
    const rosa = await base.personaPorCorreo('rosa@ejemplo.estook.com');
    const correos = await base.comoPersona(rosa, async () => {
      const { rows } = await base.bd.query<{ correo: string }>(
        'select correo from estook.persona order by correo',
      );
      return rows.map((f) => f.correo);
    });
    expect(correos).toEqual([
      'marcos@ejemplo.estook.com',
      'rosa@ejemplo.estook.com',
      'sara@ejemplo.estook.com',
    ]);
  });

  it('los doce roles y el catalogo de permisos si los lee todo el mundo', async () => {
    const sara = await base.personaPorCorreo('sara@ejemplo.estook.com');
    const cuentas = await base.comoPersona(sara, async () => {
      const roles = await base.bd.query('select codigo from estook.rol');
      const permisos = await base.bd.query('select codigo from estook.permiso');
      return [roles.rows.length, permisos.rows.length];
    });
    expect(cuentas[0]).toBe(12);
    expect(cuentas[1]).toBeGreaterThan(20);
  });
});

describe('coherencia del modelo', () => {
  it('un rol de local no se puede conceder con alcance de organizacion', async () => {
    const sara = await base.personaPorCorreo('sara@ejemplo.estook.com');
    await expect(
      base.bd.exec(`
        insert into estook.membresia (persona_id, organizacion_id, alcance, rol)
        select '${sara}', o.id, 'organizacion', 'cocinero'
        from estook.organizacion o where o.codigo = 'bar-centro'
      `),
    ).rejects.toThrow(/se concede con alcance/i);
  });

  it('no se puede colar un area de otra organizacion en una membresia', async () => {
    const sara = await base.personaPorCorreo('sara@ejemplo.estook.com');
    await expect(
      base.bd.exec(`
        insert into estook.membresia (persona_id, organizacion_id, area_id, alcance, rol)
        select '${sara}', o.id, a.id, 'area', 'area_manager'
        from estook.organizacion o, estook.area a
        where o.codigo = 'bar-centro' and a.codigo = 'zona-norte'
      `),
    ).rejects.toThrow(/no pertenece a la organizacion/i);
  });

  it('el mismo correo no se puede dar de alta dos veces', async () => {
    await expect(
      base.bd.exec(
        `insert into estook.persona (correo, nombre) values ('rosa@ejemplo.estook.com', 'Otra Rosa')`,
      ),
    ).rejects.toThrow();
  });
});
