/**
 * Ponerle sus categorias a los locales que se quedaron sin ellas.
 *
 *   pnpm bd:reparar-categorias            dice cuales estan mal, y no toca nada
 *   pnpm bd:reparar-categorias --arreglar las arregla
 *
 * ── Por que existe ───────────────────────────────────────────────────────────
 *
 * «Nunca vacio: vienen de serie» (Auditoria, parte 3). Un local con tipo y sin
 * categorias es un local roto: entras en Inventario, abres el desplegable de
 * «Categoria» y no hay nada, justo donde la aplicacion promete que siempre lo
 * hay.
 *
 * Lo caza `bd:comprobar-api`, local a local. Esto es lo que lo arregla.
 *
 * ── Y por que hacia falta una herramienta y no un apano ──────────────────────
 *
 * Aparecio uno en la base de verdad: un local al que se le respondio el tipo y
 * no se le sembraron las categorias. La reaccion de M6 escucha los dos momentos
 * en que un local puede saber de que tipo es —al crearlo y al responder el paso
 * 2 del alta— y los dos estan probados contra la API de verdad.
 *
 * Aun asi paso. Y mientras no se sepa por que, lo que no puede pasar es que la
 * unica salida sea escribir SQL a mano en produccion: eso no se hace a las once
 * de la noche y con prisa.
 *
 * Es idempotente, como la propia funcion que llama: pasarlo dos veces no duplica
 * nada, y pasarlo con todo bien no toca nada.
 */
import { abrirConexion } from './conexion.mjs';

const ARREGLAR = process.argv.includes('--arreglar');

const sql = abrirConexion();

try {
  const rotos = await sql`
    select l.id, l.codigo, l.nombre, l.tipo::text as tipo, o.nombre as organizacion,
           (select count(*)::int from estook.categoria_de_partida cp where cp.tipo = l.tipo)
             as le_tocan
      from estook.local l
      join estook.organizacion o on o.id = l.organizacion_id
     where l.tipo is not null
       and not exists (
         select 1 from estook.categoria_de_producto c where c.local_id = l.id
       )
     order by o.nombre, l.nombre
  `;

  console.log(`\n  Categorias de serie · ${sql.donde}\n`);

  if (rotos.length === 0) {
    console.log('  Ningun local con tipo se ha quedado sin sus categorias.\n');
    process.exit(0);
  }

  console.log(`  ${rotos.length} local(es) con tipo y sin una sola categoria:\n`);
  for (const l of rotos) {
    console.log(`    ${l.organizacion} · ${l.nombre}  (${l.tipo})  le tocan ${l.le_tocan}`);
  }
  console.log();

  if (!ARREGLAR) {
    console.log(
      [
        '  No se ha tocado nada. Para arreglarlos:',
        '',
        '      .\\estook.cmd bd:reparar-categorias --arreglar',
        '',
        '  Solo anade las que faltan: no duplica, no pisa nombres y no devuelve',
        '  ninguna que alguien hubiera desactivado a proposito.',
        '',
      ].join('\n'),
    );
    process.exit(1);
  }

  let puestas = 0;
  for (const l of rotos) {
    // La misma funcion que usa la aplicacion. Aqui no hay identidad declarada,
    // asi que se salta la comprobacion de «ese local es tuyo»: no hay nadie
    // preguntando, se esta arreglando la base. Es el mismo caso que la migracion.
    const [fila] = await sql`select estook.sembrar_categorias(${l.id}::uuid) as cuantas`;
    const cuantas = fila?.cuantas ?? 0;
    puestas += cuantas;
    console.log(`    ${l.nombre.padEnd(28)} ${cuantas} categoria(s)`);
  }

  console.log(`\n  Listo. ${puestas} categoria(s) puestas.\n`);
} catch (fallo) {
  console.error(`\n  fallo: ${fallo instanceof Error ? fallo.message : String(fallo)}\n`);
  process.exitCode = 1;
} finally {
  await sql.end();
}
