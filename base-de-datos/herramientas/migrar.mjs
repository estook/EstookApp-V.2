import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { abrirConexion } from './conexion.mjs';

/**
 * Migraciones numeradas y reversibles (regla 2 del Plan).
 *
 * - Se aplican en orden de numero, una transaccion cada una.
 * - Se anota la huella del fichero. Si una migracion ya aplicada cambia, se para:
 *   editar el pasado es lo que rompe los entornos de los demas.
 * - `--revertir` deshace la ultima aplicada con su fichero `.revertir.sql`.
 *
 *   node base-de-datos/herramientas/migrar.mjs
 *   node base-de-datos/herramientas/migrar.mjs --revertir
 */
const CARPETA = fileURLToPath(new URL('../migraciones/', import.meta.url));

async function listarMigraciones() {
  const ficheros = await readdir(CARPETA);
  return ficheros
    .filter((f) => f.endsWith('.sql') && !f.endsWith('.revertir.sql'))
    .map((fichero) => {
      const coincide = /^(\d{4})_(.+)\.sql$/.exec(fichero);
      if (!coincide) {
        throw new Error(
          `La migracion "${fichero}" no sigue el formato NNNN_nombre.sql. Renombrala.`,
        );
      }
      return { numero: Number(coincide[1]), nombre: coincide[2], fichero };
    })
    .sort((a, b) => a.numero - b.numero);
}

function huellaDe(contenido) {
  return createHash('sha256').update(contenido, 'utf8').digest('hex').slice(0, 16);
}

async function prepararControl(sql) {
  await sql.unsafe(`
    create schema if not exists estook;
    create table if not exists estook.migracion (
      numero       integer     primary key,
      nombre       text        not null,
      huella       text        not null,
      aplicada_en  timestamptz not null default now()
    );
    -- Sin ninguna politica: solo la clave de servicio la ve. Es el fallo seguro.
    alter table estook.migracion enable row level security;
  `);
}

async function aplicar(sql) {
  const migraciones = await listarMigraciones();
  const aplicadas = new Map(
    (await sql`select numero, nombre, huella from estook.migracion`).map((f) => [f.numero, f]),
  );

  let nuevas = 0;

  for (const migracion of migraciones) {
    const contenido = await readFile(join(CARPETA, migracion.fichero), 'utf8');
    const huella = huellaDe(contenido);
    const ya = aplicadas.get(migracion.numero);

    if (ya) {
      if (ya.huella !== huella) {
        console.error(
          [
            `La migracion ${migracion.fichero} ya estaba aplicada y ha cambiado.`,
            '',
            'Que ha pasado: se ha editado una migracion que ya corrio en algun entorno.',
            'Que se puede hacer: dejala como estaba y escribe una migracion nueva encima.',
            'Las migraciones son compatibles hacia atras; el pasado no se reescribe (regla 2).',
          ].join('\n'),
        );
        process.exit(1);
      }
      continue;
    }

    process.stdout.write(`  aplicando ${migracion.fichero} ... `);
    await sql.begin(async (tx) => {
      await tx.unsafe(contenido);
      await tx`
        insert into estook.migracion (numero, nombre, huella)
        values (${migracion.numero}, ${migracion.nombre}, ${huella})
      `;
    });
    process.stdout.write('hecho\n');
    nuevas += 1;
  }

  console.log(
    nuevas === 0
      ? '  la base de datos ya estaba al dia'
      : `  ${nuevas} migracion(es) aplicadas · ${migraciones.length} en total`,
  );
}

/** Deshace de la ultima a la primera, hasta que no queda ninguna. */
async function revertirTodo(sql) {
  let quedan = true;
  while (quedan) {
    quedan = await revertirUltima(sql);
  }
}

async function revertirUltima(sql) {
  const [ultima] = await sql`
    select numero, nombre from estook.migracion order by numero desc limit 1
  `;

  if (!ultima) {
    console.log('  no queda ninguna migracion aplicada');
    return false;
  }

  const fichero = `${String(ultima.numero).padStart(4, '0')}_${ultima.nombre}.revertir.sql`;
  const contenido = await readFile(join(CARPETA, fichero), 'utf8').catch(() => null);

  if (contenido === null) {
    console.error(
      `Falta ${fichero}. Toda migracion lleva su reversion al lado (regla 2). No se revierte a ciegas.`,
    );
    process.exit(1);
  }

  process.stdout.write(`  revirtiendo ${fichero} ... `);
  await sql.begin(async (tx) => {
    await tx.unsafe(contenido);
    await tx`delete from estook.migracion where numero = ${ultima.numero}`;
  });
  process.stdout.write('hecho\n');
  return true;
}

const sql = abrirConexion();
try {
  await prepararControl(sql);
  if (process.argv.includes('--revertir')) {
    if (process.argv.includes('--todo')) await revertirTodo(sql);
    else await revertirUltima(sql);
  } else await aplicar(sql);
} catch (fallo) {
  console.error(`  fallo: ${fallo instanceof Error ? fallo.message : String(fallo)}`);
  process.exitCode = 1;
} finally {
  await sql.end();
}
