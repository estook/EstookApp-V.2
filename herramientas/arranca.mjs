#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { copyFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

/**
 * El unico comando de M0.
 *
 *   pnpm arranca
 *
 * Se clona el repositorio, se ejecuta esto, y queda todo funcionando con las dos
 * semillas puestas. Ese es literalmente el criterio de aceptacion del modulo.
 *
 * Pasos: comprobar Node, preparar `.env.local`, instalar, migrar, sembrar y
 * levantar las cuatro aplicaciones.
 */
const RAIZ = fileURLToPath(new URL('../', import.meta.url));
const MINIMO_NODE = 22;

function paso(numero, titulo) {
  console.log(`\n[${numero}/5] ${titulo}`);
}

function ejecutar(comando, argumentos, { permitirFallo = false } = {}) {
  const resultado = spawnSync(comando, argumentos, {
    cwd: RAIZ,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (resultado.status !== 0 && !permitirFallo) {
    console.error(`\n  Ha fallado: ${comando} ${argumentos.join(' ')}`);
    process.exit(resultado.status ?? 1);
  }
  return resultado.status === 0;
}

console.log('ESTOOK · arranque del entorno de desarrollo');

// 1 · Node
paso(1, 'Comprobando Node');
const mayor = Number(process.versions.node.split('.')[0]);
if (mayor < MINIMO_NODE) {
  console.error(
    [
      `  Node ${process.versions.node} es demasiado antiguo. Hace falta Node ${MINIMO_NODE} o mas.`,
      '  Que se puede hacer: instala la version LTS desde https://nodejs.org, o con',
      '  `winget install OpenJS.NodeJS.LTS` en Windows.',
    ].join('\n'),
  );
  process.exit(1);
}
console.log(`  Node ${process.versions.node}`);

// 2 · Variables de entorno
paso(2, 'Preparando .env.local');
if (existsSync(join(RAIZ, '.env.local'))) {
  console.log('  ya existia, no se toca');
} else {
  await copyFile(join(RAIZ, '.env.example'), join(RAIZ, '.env.local'));
  console.log('  creado a partir de .env.example');
  console.log('  Rellena DATABASE_URL antes de seguir: las claves nunca se suben al repositorio.');
}

// 3 · Dependencias
paso(3, 'Instalando dependencias');
ejecutar('pnpm', ['install']);

// 4 · Base de datos
// Las herramientas leen `.env.local` por su cuenta con --env-file-if-exists, asi
// que no se comprueba aqui si hay conexion: se intenta, y si no la hay, ellas lo
// dicen bien. Un fallo aqui no impide levantar las aplicaciones.
paso(4, 'Migrando y sembrando');
const argumentosDeEntorno = ['--env-file-if-exists=.env.local'];
const migrado = ejecutar(
  'node',
  [...argumentosDeEntorno, 'base-de-datos/herramientas/migrar.mjs'],
  { permitirFallo: true },
);
const sembrado =
  migrado &&
  ejecutar('node', [...argumentosDeEntorno, 'base-de-datos/herramientas/sembrar.mjs'], {
    permitirFallo: true,
  });

if (!sembrado) {
  console.log('\n  La base de datos se ha quedado sin preparar, pero las aplicaciones arrancan.');
  console.log('  Cuando tengas DATABASE_URL en .env.local: `pnpm bd:migrar && pnpm bd:sembrar`.');
}

// 5 · Las cuatro aplicaciones
paso(5, 'Levantando las cuatro aplicaciones');
console.log('  web http://localhost:5173');
console.log('  app http://localhost:5174');
console.log('  carta http://localhost:5175');
console.log('  admin http://localhost:5176\n');
ejecutar('pnpm', ['dev']);
