import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { abrirConexion } from './conexion.mjs';
import { CLAVE_DE_EJEMPLO, sembrarAcceso } from '../semillas/acceso.ts';

/**
 * Carga las semillas: el local independiente, la cadena de seis locales en dos
 * areas, las personas, y —desde M4— con que entran. Todas idempotentes, asi que
 * esto se puede ejecutar siempre que haga falta sin miedo a duplicar.
 *
 *   pnpm bd:sembrar
 *
 * La ultima no es un `.sql` y no puede serlo: derivar una contrasena se hace en el
 * servidor, no en la base de datos (decision 0010). Y **se niega a correr en
 * produccion**, porque pone una clave que esta escrita en el repositorio.
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

  process.stdout.write('  sembrando acceso.ts ... ');
  const acceso = await sembrarAcceso(async (consulta, parametros) => ({
    rows: await sql.unsafe(consulta, parametros),
  }));
  process.stdout.write('hecho\n');

  const [resumen] = await sql`
    select
      (select count(*) from estook.organizacion) as organizaciones,
      (select count(*) from estook.area)         as areas,
      (select count(*) from estook.local)        as locales
  `;

  console.log(
    `  ${resumen.organizaciones} organizacion(es) · ${resumen.areas} area(s) · ${resumen.locales} local(es)`,
  );

  // Los PIN se ensenan aqui **y solo aqui**: lo que se guarda es su huella, asi
  // que si no se apuntan ahora, se regeneran. Es lo mismo que pasa al invitar a
  // alguien de verdad, y a proposito: la herramienta no puede hacer nada que la
  // aplicacion no pueda.
  console.log(`\n  Con que entran las personas de ejemplo (entorno de desarrollo):`);
  console.log(`  contrasena, las siete: «${CLAVE_DE_EJEMPLO}»`);
  console.log(`  y su PIN, por local:`);
  for (const { correo, local, pin } of acceso.pines) {
    console.log(`    ${pin}  ${correo.split('@')[0]?.padEnd(10)} en ${local}`);
  }
} catch (fallo) {
  console.error(`  fallo: ${fallo instanceof Error ? fallo.message : String(fallo)}`);
  process.exitCode = 1;
} finally {
  await sql.end();
}
