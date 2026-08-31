import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { abrirConexion } from './conexion.mjs';

/**
 * Carga las dos semillas de M0: el local independiente y la cadena de seis locales
 * en dos areas. Las dos son idempotentes, asi que esto se puede ejecutar siempre
 * que haga falta sin miedo a duplicar.
 *
 *   node base-de-datos/herramientas/sembrar.mjs
 */
const CARPETA = fileURLToPath(new URL('../semillas/', import.meta.url));

const sql = abrirConexion();

try {
  const ficheros = (await readdir(CARPETA)).filter((f) => f.endsWith('.sql')).sort();

  for (const fichero of ficheros) {
    process.stdout.write(`  sembrando ${fichero} ... `);
    const contenido = await readFile(join(CARPETA, fichero), 'utf8');
    await sql.begin((tx) => tx.unsafe(contenido));
    process.stdout.write('hecho\n');
  }

  const [resumen] = await sql`
    select
      (select count(*) from estook.organizacion) as organizaciones,
      (select count(*) from estook.area)         as areas,
      (select count(*) from estook.local)        as locales
  `;

  console.log(
    `  ${resumen.organizaciones} organizacion(es) · ${resumen.areas} area(s) · ${resumen.locales} local(es)`,
  );
} catch (fallo) {
  console.error(`  fallo: ${fallo instanceof Error ? fallo.message : String(fallo)}`);
  process.exitCode = 1;
} finally {
  await sql.end();
}
