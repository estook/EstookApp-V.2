import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';

/**
 * Un Postgres de verdad, efimero y sin instalar nada.
 *
 * El Plan pide «Postgres efimero» en la capa de pruebas (A3). Con Docker no vale:
 * no todas las maquinas lo tienen, y una prueba que solo corre en la maquina de
 * uno acaba sin correr en ninguna. PGlite es Postgres compilado a WebAssembly, asi
 * que las mismas pruebas corren igual en un portatil y en la integracion continua.
 *
 * Ademas, en integracion continua las migraciones se aplican tambien contra un
 * Postgres 17 de verdad (trabajo «Migraciones reversibles»), asi que no hay una
 * sola via de comprobacion.
 */
const RAIZ = fileURLToPath(new URL('../', import.meta.url));

/** Lo que hace `migrar.mjs` antes de aplicar nada. */
const CONTROL = `
  create schema if not exists estook;
  create table if not exists estook.migracion (
    numero       integer     primary key,
    nombre       text        not null,
    huella       text        not null,
    aplicada_en  timestamptz not null default now()
  );
  alter table estook.migracion enable row level security;
`;

async function ficherosOrdenados(carpeta: string, filtro: (f: string) => boolean) {
  const nombres = (await readdir(join(RAIZ, carpeta))).filter(filtro).sort();
  return Promise.all(
    nombres.map(async (nombre) => ({
      nombre,
      sql: await readFile(join(RAIZ, carpeta, nombre), 'utf8'),
    })),
  );
}

export const migraciones = () =>
  ficherosOrdenados('migraciones', (f) => f.endsWith('.sql') && !f.endsWith('.revertir.sql'));

export const reversiones = () =>
  ficherosOrdenados('migraciones', (f) => f.endsWith('.revertir.sql'));

export const semillas = () => ficherosOrdenados('semillas', (f) => f.endsWith('.sql'));

export interface BaseDePrueba {
  readonly bd: PGlite;
  /** Ejecuta como la API, es decir con las politicas de seguridad aplicando. */
  comoPersona<T>(personaId: string | null, consulta: () => Promise<T>): Promise<T>;
  /** El identificador de una persona por su correo. Se lee como duena, sin politicas. */
  personaPorCorreo(correo: string): Promise<string>;
  localPorCodigo(codigo: string): Promise<string>;
  cerrar(): Promise<void>;
}

/** Levanta una base con todas las migraciones y las tres semillas puestas. */
export async function levantarBase(): Promise<BaseDePrueba> {
  const bd = new PGlite();

  await bd.exec(CONTROL);
  for (const { sql } of await migraciones()) await bd.exec(sql);
  for (const { sql } of await semillas()) await bd.exec(sql);

  async function unId(consulta: string, parametro: string): Promise<string> {
    const { rows } = await bd.query<{ id: string }>(consulta, [parametro]);
    const fila = rows[0];
    if (!fila) throw new Error(`No existe: ${parametro}`);
    return fila.id;
  }

  return {
    bd,

    async comoPersona(personaId, consulta) {
      // `set role` deja de ser el dueno, que es lo unico que hace que las
      // politicas de seguridad se apliquen de verdad. Sin esto no probamos nada.
      await bd.exec('set role estook_api');
      await bd.exec(
        personaId ? `set estook.persona_id = '${personaId}'` : `set estook.persona_id = ''`,
      );
      try {
        return await consulta();
      } finally {
        await bd.exec('reset role');
        await bd.exec(`set estook.persona_id = ''`);
      }
    },

    personaPorCorreo: (correo) => unId('select id from estook.persona where correo = $1', correo),

    localPorCodigo: (codigo) => unId('select id from estook.local where codigo = $1', codigo),

    cerrar: () => bd.close(),
  };
}
