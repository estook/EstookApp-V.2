/**
 * La API de verdad, contra un Postgres efimero, para las pruebas de extremo a extremo.
 *
 *   pnpm api:pruebas
 *
 * ── Por que hace falta esto ──────────────────────────────────────────────────
 *
 * Hasta M3 las pruebas de extremo a extremo no necesitaban servidor: la
 * aplicacion se pintaba con un perfil de muestra elegido a mano. M4 tira ese
 * andamio, asi que **sin API no hay forma de entrar**, y sin entrar no se puede
 * comprobar ni una de las cosas que M3 dejo probadas.
 *
 * Las tres opciones eran: pedir Docker (que no todas las maquinas tienen, y una
 * prueba que solo corre en una maquina acaba sin correr en ninguna), apuntar a
 * Supabase (que dejaria las pruebas dependiendo de la red y escribiendo en la
 * base de datos de verdad), o esta: **la API entera, tal cual, contra PGlite**.
 *
 * Es la misma decision que ya se tomo para las pruebas de base de datos. Y lo
 * importante: **no es una imitacion de la API**. Es `crearApi(crearDespachador(…))`
 * con los mismos comandos, las mismas politicas de seguridad y las mismas
 * puertas. Lo unico distinto es donde vive el Postgres.
 *
 * ── El adaptador, que es lo unico raro de aqui ───────────────────────────────
 *
 * `servidor/infraestructura/postgres.ts` habla con `postgres.js`, que usa
 * plantillas etiquetadas: `` sql`select ... ${valor}` ``. PGlite habla con texto y
 * parametros numerados. El adaptador de abajo traduce lo uno en lo otro, y es
 * pequeno a proposito: si creciera, dejaria de estar probando lo mismo.
 *
 * ── Y por que vive aqui, al lado de `comprobar-api.mjs` ──────────────────────
 *
 * Porque `.npmrc` dice `node-linker=isolated`: «sin alzado de dependencias, una
 * app solo puede importar lo que declara». PGlite lo declara `base-de-datos`, asi
 * que este fichero tiene que estar aqui para poder importarlo. Hono y Zod los
 * declara `servidor`, y se resuelven dentro de sus propios ficheros.
 */
import { createServer } from 'node:http';
import { PGlite } from '@electric-sql/pglite';
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { crearApi } from '../../servidor/api/index.ts';
import { crearDespachador } from '../../servidor/aplicacion/index.ts';
import { anotar, recordar } from '../../servidor/infraestructura/idempotencia.ts';
import { huellaDeToken } from '../../servidor/dominio/secretos.ts';
import { sembrarAcceso } from '../semillas/acceso.ts';

const RAIZ = fileURLToPath(new URL('../', import.meta.url));
const PUERTO = Number(process.env['PUERTO_API_DE_PRUEBAS'] ?? 5177);

// El mismo control que crea `migrar.mjs` antes de aplicar nada.
const CONTROL = `
  create schema if not exists estook;
  create table if not exists estook.migracion (
    numero integer primary key, nombre text not null,
    huella text not null, aplicada_en timestamptz not null default now()
  );
  alter table estook.migracion enable row level security;
`;

async function ficheros(carpeta, filtro) {
  const nombres = (await readdir(join(RAIZ, carpeta))).filter(filtro).sort();
  return Promise.all(nombres.map((n) => readFile(join(RAIZ, carpeta, n), 'utf8')));
}

const bd = new PGlite({ extensions: { pg_trgm } });
await bd.exec(CONTROL);
for (const sql of await ficheros(
  'migraciones',
  (f) => f.endsWith('.sql') && !f.endsWith('.revertir.sql'),
)) {
  await bd.exec(sql);
}
for (const sql of await ficheros('semillas', (f) => f.endsWith('.sql'))) await bd.exec(sql);

const acceso = await sembrarAcceso(
  async (consulta, parametros) => ({ rows: (await bd.query(consulta, parametros)).rows }),
  { entorno: 'pruebas' },
);

/**
 * De una plantilla etiquetada a texto con parametros numerados.
 *
 * `` sql`select * from x where id = ${a} and b = ${c}` `` se convierte en
 * `select * from x where id = $1 and b = $2` con `[a, c]`.
 *
 * `postgres.js` tiene mas cosas —fragmentos anidados, `sql(objeto)` para
 * insertar— y aqui **no se soportan a proposito**: no las usa ningun comando de
 * M4, y soportarlas seria reimplementar la libreria en vez de probar la API. Si
 * algun dia hicieran falta, esto fallaria a las claras y no en silencio.
 */
function adaptador(pglite) {
  const sql = async (trozos, ...valores) => {
    if (!Array.isArray(trozos)) {
      throw new Error('La API de pruebas solo entiende `sql` como plantilla etiquetada.');
    }
    const texto = trozos.reduce((junto, trozo, i) => junto + `$${i}` + trozo);
    const { rows } = await pglite.query(texto, valores);
    return rows;
  };
  return sql;
}

/**
 * Las peticiones, de una en una.
 *
 * **PGlite es una sola conexion**, y Postgres no anida transacciones: si dos
 * peticiones se solapan, la segunda hace `begin` dentro de la primera y las dos
 * acaban compartiendo el `set local estook.persona_id`. Es decir, una peticion de
 * Rosa contestada con la identidad de Nuria.
 *
 * Lo encontro una prueba de extremo a extremo, y de la peor manera posible: en
 * serie funcionaba todo, y en paralelo la camarera veia «tu cuenta no esta
 * asociada a ningun negocio». Contra Supabase esto no pasa —hay un agrupador con
 * muchas conexiones— asi que es una limitacion de las pruebas y no del producto,
 * pero **habia que arreglarla aqui o las pruebas mentirian**.
 *
 * Una cola de promesas basta: cada peticion espera a la anterior.
 */
let laCola = Promise.resolve();

function deUnaEnUna(hacer) {
  const mio = laCola.then(hacer, hacer);
  // La cola no se rompe si una peticion falla: la siguiente entra igual.
  laCola = mio.then(
    () => undefined,
    () => undefined,
  );
  return mio;
}

const puertos = {
  enTransaccion(quien, hacer) {
    return deUnaEnUna(() => unaTransaccion(quien, hacer));
  },

  async recordar(contexto, clave, comando, entrada) {
    const recuerdo = await recordar(contexto.sql, clave, comando, entrada);
    return recuerdo.estado === 'repetida'
      ? { estado: 'repetida', respuesta: recuerdo.respuesta }
      : { estado: recuerdo.estado };
  },

  async anotar(contexto, clave, comando, entrada, respuesta) {
    const organizaciones = await contexto.sql`
      select organizacion_id from estook.organizaciones_visibles() limit 1
    `;
    const laOrganizacion = organizaciones[0]?.organizacion_id;
    if (!laOrganizacion) return;
    await anotar(
      contexto.sql,
      clave,
      comando,
      entrada,
      laOrganizacion,
      contexto.personaId,
      respuesta,
      200,
    );
  },
};

/**
 * Una transaccion, con el orden de la decision 0005 y el de `postgres.ts`:
 * disfraz, sesion, identidad. Cambiarlo aqui haria que las pruebas comprobaran
 * otra cosa distinta de lo que hace la API de verdad.
 */
async function unaTransaccion(quien, hacer) {
  await bd.exec('begin');
  try {
    await bd.exec('set local role estook_api');

    let sesion = null;
    if (quien.tokenDeSesion !== null) {
      const { rows } = await bd.query('select * from estook.sesion_activa($1)', [
        await huellaDeToken(quien.tokenDeSesion),
      ]);
      const fila = rows[0];
      if (fila) {
        sesion = {
          id: fila.sesion_id,
          personaId: fila.persona_id,
          organizacionId: fila.organizacion_id,
          localId: fila.local_id,
          dobleFactorSuperado: fila.doble_factor_superado,
          debeCambiarClave: fila.debe_cambiar_clave,
        };
      }
    }

    await bd.query("select set_config('estook.persona_id', $1, true)", [sesion?.personaId ?? '']);
    await bd.query("select set_config('estook.correlacion_id', $1, true)", [quien.correlacionId]);

    const salida = await hacer({
      sql: adaptador(bd),
      personaId: sesion?.personaId ?? null,
      sesion,
      correlacionId: quien.correlacionId,
      ahora: new Date(Date.now()),
    });

    await bd.exec('commit');
    return salida;
  } catch (fallo) {
    await bd.exec('rollback');
    throw fallo;
  }
}

const api = crearApi(crearDespachador(puertos));

const servidor = createServer((peticion, respuesta) => {
  const cuerpo = [];
  peticion.on('data', (trozo) => cuerpo.push(trozo));
  peticion.on('end', () => {
    const url = `http://localhost:${PUERTO}${peticion.url ?? '/'}`;
    const entrada = new Request(url, {
      method: peticion.method,
      headers: peticion.headers,
      ...(peticion.method === 'GET' || peticion.method === 'HEAD'
        ? {}
        : { body: Buffer.concat(cuerpo) }),
    });

    api
      .fetch(entrada)
      .then(async (salida) => {
        respuesta.writeHead(salida.status, Object.fromEntries(salida.headers));
        respuesta.end(Buffer.from(await salida.arrayBuffer()));
      })
      .catch((fallo) => {
        respuesta.writeHead(500, { 'content-type': 'application/json' });
        respuesta.end(
          JSON.stringify({ error: { codigo: 'fallo_nuestro', quePasa: String(fallo) } }),
        );
      });
  });
});

servidor.listen(PUERTO, () => {
  console.log(`API de pruebas en http://localhost:${PUERTO}`);
  console.log(`  contrasena de las personas de ejemplo: «estook en desarrollo»`);
  for (const { correo, local, pin } of acceso.pines) {
    console.log(`  PIN ${pin}  ${correo.split('@')[0]} en ${local}`);
  }
});
