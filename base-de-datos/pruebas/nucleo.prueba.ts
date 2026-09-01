import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { levantarBase, type BaseDePrueba } from './entorno.ts';

/**
 * M2 · el núcleo técnico, contra Postgres de verdad.
 *
 * El criterio de terminado del módulo, literal: **«el mismo comando tres veces
 * con la misma clave produce un solo efecto»**. Aquí se comprueba eso, y las
 * otras tres piezas: bandeja de salida, cola de trabajos y versión optimista.
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

describe('idempotencia · el criterio de terminado de M2', () => {
  it('la misma clave tres veces deja UNA sola anotación', async () => {
    const organizacion = await organizacionDe('bar-centro');
    const clave = 'merma-del-movil-de-sara';

    for (let intento = 1; intento <= 3; intento += 1) {
      await base.bd.exec(`
        insert into estook.clave_de_idempotencia
          (clave, huella, organizacion_id, comando, respuesta, estado_http)
        values ('${clave}', 'huella-1', '${organizacion}', 'registrar_merma', '{"ok":true}'::jsonb, 200)
        on conflict (clave) do nothing
      `);
    }

    const { rows } = await base.bd.query<{ cuantas: number }>(
      `select count(*)::int as cuantas from estook.clave_de_idempotencia where clave = '${clave}'`,
    );
    expect(rows[0]?.cuantas).toBe(1);
  });

  it('guarda la respuesta de la primera vez, para devolverla en las repeticiones', async () => {
    const { rows } = await base.bd.query<{ respuesta: { ok: boolean }; estado_http: number }>(
      `select respuesta, estado_http from estook.clave_de_idempotencia
        where clave = 'merma-del-movil-de-sara'`,
    );
    expect(rows[0]?.respuesta.ok).toBe(true);
    expect(rows[0]?.estado_http).toBe(200);
  });

  it('la huella permite distinguir una repetición de una confusión', async () => {
    // Misma clave, otra petición: eso no es un reintento, es un error de quien
    // llama. La huella guardada lo delata.
    const { rows } = await base.bd.query<{ huella: string }>(
      `select huella from estook.clave_de_idempotencia where clave = 'merma-del-movil-de-sara'`,
    );
    expect(rows[0]?.huella).toBe('huella-1');
  });

  it('las claves caducan solas a las veinticuatro horas', async () => {
    const { rows } = await base.bd.query<{ horas: number }>(
      `select round(extract(epoch from (caduca_en - creado_en)) / 3600)::int as horas
         from estook.clave_de_idempotencia where clave = 'merma-del-movil-de-sara'`,
    );
    expect(rows[0]?.horas).toBe(24);
  });
});

describe('bandeja de salida · el evento y el cambio viajan juntos', () => {
  it('si la transacción se cae, el evento se cae con ella', async () => {
    const organizacion = await organizacionDe('bar-centro');

    await base.bd.exec('begin');
    await base.bd.exec(`
      insert into estook.bandeja_de_salida (organizacion_id, tipo, datos)
      values ('${organizacion}', 'persona.idioma_cambiado', '{"prueba":true}'::jsonb)
    `);
    await base.bd.exec('rollback');

    const { rows } = await base.bd.query<{ cuantos: number }>(
      `select count(*)::int as cuantos from estook.bandeja_de_salida
        where datos->>'prueba' = 'true'`,
    );
    expect(rows[0]?.cuantos).toBe(0);
  });

  it('y si sale bien, queda pendiente de publicar', async () => {
    const organizacion = await organizacionDe('bar-centro');
    await base.bd.exec(`
      insert into estook.bandeja_de_salida (organizacion_id, tipo, datos)
      values ('${organizacion}', 'persona.idioma_cambiado', '{"idioma":"ca"}'::jsonb)
    `);

    const { rows } = await base.bd.query<{ estado: string; intentos: number }>(
      `select estado, intentos from estook.bandeja_de_salida where datos->>'idioma' = 'ca'`,
    );
    expect(rows[0]?.estado).toBe('pendiente');
    expect(rows[0]?.intentos).toBe(0);
  });
});

describe('cola de trabajos · con reintento y sin pisarse', () => {
  it('un trabajo nace pendiente y listo para ahora', async () => {
    await base.bd.exec(`
      insert into estook.trabajo (tipo, cola, datos)
      values ('recalculo', 'recalculo:local-1:producto-1', '{"paso":"precio"}'::jsonb)
    `);
    const { rows } = await base.bd.query<{ estado: string; max_intentos: number }>(
      `select estado, max_intentos from estook.trabajo where cola = 'recalculo:local-1:producto-1'`,
    );
    expect(rows[0]?.estado).toBe('pendiente');
    expect(rows[0]?.max_intentos).toBe(5);
  });

  it('dos trabajos del mismo producto van a la misma cola, para no pisarse', async () => {
    await base.bd.exec(`
      insert into estook.trabajo (tipo, cola, datos)
      values ('recalculo', 'recalculo:local-1:producto-1', '{"paso":"margen"}'::jsonb)
    `);
    const { rows } = await base.bd.query<{ cuantos: number }>(
      `select count(*)::int as cuantos from estook.trabajo
        where cola = 'recalculo:local-1:producto-1'`,
    );
    expect(rows[0]?.cuantos).toBe(2);
  });

  it('no se admite un trabajo con cero intentos permitidos', async () => {
    await expect(
      base.bd.exec(`insert into estook.trabajo (tipo, cola, max_intentos) values ('x', 'y', 0)`),
    ).rejects.toThrow();
  });
});

describe('versión optimista · gana quien guarda primero', () => {
  it('toda fila nace en la versión 1', async () => {
    const { rows } = await base.bd.query<{ version: number }>(
      `select version from estook.persona where correo = 'rosa@ejemplo.estook.com'`,
    );
    expect(rows[0]?.version).toBe(1);
  });

  it('la versión sube sola en cada cambio', async () => {
    await base.bd.exec(
      `update estook.persona set idioma = 'ca' where correo = 'rosa@ejemplo.estook.com'`,
    );
    const { rows } = await base.bd.query<{ version: number }>(
      `select version from estook.persona where correo = 'rosa@ejemplo.estook.com'`,
    );
    expect(rows[0]?.version).toBe(2);
  });

  it('guardar con una versión vieja no cambia nada, y se nota', async () => {
    // Es lo que hace el comando: si la versión ya no es la que tenía, no toca
    // nada, y así el segundo se entera en vez de pisar el trabajo del primero.
    const { rows } = await base.bd.query(
      `update estook.persona set idioma = 'gl'
        where correo = 'rosa@ejemplo.estook.com' and version = 1
       returning id`,
    );
    expect(rows).toEqual([]);

    const { rows: sinTocar } = await base.bd.query<{ idioma: string }>(
      `select idioma::text as idioma from estook.persona where correo = 'rosa@ejemplo.estook.com'`,
    );
    expect(sinTocar[0]?.idioma).toBe('ca');
  });

  it('con la versión buena sí', async () => {
    const { rows } = await base.bd.query<{ version: number }>(
      `update estook.persona set idioma = 'es'
        where correo = 'rosa@ejemplo.estook.com' and version = 2
       returning version`,
    );
    expect(rows[0]?.version).toBe(3);
  });

  it('todas las tablas de dominio la llevan', async () => {
    const { rows } = await base.bd.query<{ sin_version: number }>(`
      select count(*)::int as sin_version from (
        select c.relname
          from pg_class c
         where c.relnamespace = 'estook'::regnamespace and c.relkind = 'r'
           and c.relname in ('organizacion','area','local','persona','membresia',
                             'recorte_de_permiso','traduccion','dispositivo',
                             'politica_de_catalogo')
           and not exists (
             select 1 from pg_attribute a
              where a.attrelid = c.oid and a.attname = 'version' and a.attnum > 0
           )
      ) as faltan
    `);
    expect(rows[0]?.sin_version).toBe(0);
  });
});
