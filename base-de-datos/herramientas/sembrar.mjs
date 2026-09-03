import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { abrirConexion } from './conexion.mjs';
import { CLAVE_DE_EJEMPLO, ErrorDeSiembraRemota, sembrarAcceso } from '../semillas/acceso.ts';

/**
 * Carga las semillas: el local independiente, la cadena de seis locales en dos
 * areas, las personas, y —desde M4— con que entran. Todas idempotentes, asi que
 * esto se puede ejecutar siempre que haga falta sin miedo a duplicar.
 *
 *   pnpm bd:sembrar
 *
 * La ultima no es un `.sql` y no puede serlo: derivar una contrasena se hace en el
 * servidor, no en la base de datos (decision 0010).
 *
 * ── Contra una base remota se siembra a medias, y es lo correcto (M5) ────────
 *
 * Los `.sql` se aplican en cualquier sitio: crean organizaciones, locales y
 * personas de ejemplo, y ninguno pone una clave. La cuarta semilla **no**: pone
 * una contrasena que esta escrita en el repositorio, y eso solo puede pasar en
 * una base que no salga de tu maquina.
 *
 * Antes esto se decidia con la variable `ENTORNO`, y por eso acabaron ocho
 * cuentas con clave publica en la base de produccion: la variable decia
 * `desarrollo` y `DATABASE_URL` apuntaba a Supabase. Ahora lo decide la direccion
 * a la que se conecta, que es lo unico que no puede mentir.
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
  let acceso = null;
  try {
    acceso = await sembrarAcceso(
      async (consulta, parametros) => ({ rows: await sql.unsafe(consulta, parametros) }),
      { donde: sql.donde },
    );
    process.stdout.write('hecho\n');
  } catch (fallo) {
    if (!(fallo instanceof ErrorDeSiembraRemota)) throw fallo;
    process.stdout.write('saltada\n\n');
    console.log(`  ${fallo.message.split('\n').join('\n  ')}\n`);
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

  // Los PIN se ensenan aqui **y solo aqui**: lo que se guarda es su huella, asi
  // que si no se apuntan ahora, se regeneran. Es lo mismo que pasa al invitar a
  // alguien de verdad, y a proposito: la herramienta no puede hacer nada que la
  // aplicacion no pueda.
  if (acceso !== null) {
    console.log(`\n  Con que entran las personas de ejemplo (base de tu maquina):`);
    console.log(`  contrasena, las ocho: «${CLAVE_DE_EJEMPLO}»`);
    console.log(`  y su PIN, por local:`);
    for (const { correo, local, pin } of acceso.pines) {
      console.log(`    ${pin}  ${correo.split('@')[0]?.padEnd(10)} en ${local}`);
    }
  }
} catch (fallo) {
  console.error(`  fallo: ${fallo instanceof Error ? fallo.message : String(fallo)}`);
  process.exitCode = 1;
} finally {
  await sql.end();
}
