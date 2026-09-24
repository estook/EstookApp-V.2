/**
 * Traer las capturas nuevas de la integración continua (entrega V, punto 5).
 *
 *   pnpm capturas:traer              la última vuelta de esta rama
 *   pnpm capturas:traer 1234567890   una vuelta concreta
 *
 * ── Para qué ─────────────────────────────────────────────────────────────────
 *
 * Las capturas que se comparan se hacen **en Linux**, en la integración continua:
 * en Windows la letra se pinta distinta y no coincidirían nunca. Así que cuando
 * una pantalla cambia a propósito, la captura buena no se puede hacer aquí: la
 * hace GitHub. La vuelta sale en rojo y deja las nuevas en el artefacto
 * `capturas-nuevas`, con el nombre que tendrían en su sitio.
 *
 * Esto las baja a `pruebas/e2e/capturas/linux/`. **Después hay que mirarlas**
 * —son lo que la prueba dará por bueno a partir de ahora— y, si son lo que se
 * quería, subirlas con el cambio. Una captura que se trae sin mirar convierte la
 * prueba en un álbum.
 *
 * Necesita `gh` con sesión abierta (`gh auth status`).
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const RAIZ = fileURLToPath(new URL('../', import.meta.url));
const DESTINO = fileURLToPath(new URL('../pruebas/e2e/capturas/', import.meta.url));

function correr(programa, argumentos) {
  return execFileSync(programa, argumentos, { cwd: RAIZ, encoding: 'utf8' }).trim();
}

/** Cada captura de Linux con la hora en que se escribió, para ver cuáles llegan. */
function lasQueHay() {
  const carpeta = `${DESTINO}linux`;
  if (!existsSync(carpeta)) return new Map();
  return new Map(
    readdirSync(carpeta).map((nombre) => [nombre, statSync(`${carpeta}/${nombre}`).mtimeMs]),
  );
}

let vuelta = process.argv[2];
if (vuelta === undefined) {
  const rama = correr('git', ['rev-parse', '--abbrev-ref', 'HEAD']);
  vuelta = correr('gh', [
    'run',
    'list',
    '--branch',
    rama,
    '--workflow',
    'integracion.yml',
    '--limit',
    '1',
    '--json',
    'databaseId',
    '--jq',
    '.[0].databaseId',
  ]);
  if (vuelta === '') {
    console.error(`\n  La rama ${rama} no tiene ninguna vuelta de la integración continua.\n`);
    process.exit(1);
  }
}

console.log(`\n  Bajando las capturas nuevas de la vuelta ${vuelta}…`);
const antes = lasQueHay();

try {
  correr('gh', ['run', 'download', vuelta, '--name', 'capturas-nuevas', '--dir', DESTINO]);
} catch {
  console.log(
    [
      '',
      '  Esa vuelta no dejó capturas nuevas. O todas coincidían, o no llegó a hacerlas',
      '  (se paró antes, o todavía está corriendo). Mira la vuelta en GitHub.',
      '',
    ].join('\n'),
  );
  process.exit(1);
}

const despues = lasQueHay();
const nuevas = [...despues.keys()].filter((nombre) => antes.get(nombre) !== despues.get(nombre));

console.log(`\n  ${nuevas.length} en pruebas/e2e/capturas/linux/:\n`);
for (const nombre of nuevas.sort()) console.log(`    ${nombre}`);
console.log('\n  Míralas antes de subirlas: son lo que la prueba dará por bueno desde ahora.\n');
