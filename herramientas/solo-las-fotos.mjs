/**
 * ¿Lo único en rojo son las fotos? (9-nov)
 *
 *   node herramientas/solo-las-fotos.mjs <carpeta> <trozos>
 *
 * Lo usa `integracion.yml`, en «Las fotos nuevas». La carpeta tiene un
 * `resultados.json` de Playwright por cada trozo de las pruebas de pantalla.
 *
 * ── Para qué ─────────────────────────────────────────────────────────────────
 *
 * Cuando una pantalla cambia a propósito, la foto de referencia de `capturas.spec.ts`
 * deja de coincidir y la vuelta sale en rojo. Hasta el 9-nov había que bajarlas a mano
 * (`pnpm capturas:traer`), subirlas y esperar otra vuelta entera: pasó en casi cada pull
 * request (Richi: «¿por qué siempre fallan las pantallas?»). Ahora, **si lo único que ha
 * fallado son fotos**, la integración continua las pone en su sitio ella sola.
 *
 * Por eso esto es estricto. Dice que sí solo si:
 *   · están los resultados de **todos** los trozos (un trozo que se cayó antes de probar
 *     no deja resultados, y eso es un rojo de verdad);
 *   · no hay errores fuera de las pruebas (la API de pruebas que no arranca, por ejemplo);
 *   · cada prueba en rojo es de `capturas.spec.ts`, y **cada uno de sus errores, en cada
 *     intento**, es una foto que no coincide.
 * Cualquier otra cosa en rojo —una prueba de otra pantalla, una espera que se acaba,
 * un texto que no está— y dice que no: la vuelta se queda en rojo, como siempre.
 *
 * Escribe `solo_fotos=true|false` en `$GITHUB_OUTPUT` y lo cuenta en el resumen.
 */
import { appendFileSync, existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const [carpeta, trozosTexto] = process.argv.slice(2);
const trozos = Number(trozosTexto);
if (carpeta === undefined || !Number.isInteger(trozos) || trozos < 1) {
  console.error('Uso: node herramientas/solo-las-fotos.mjs <carpeta> <trozos>');
  process.exit(2);
}

const FOTOS = 'capturas.spec.ts';
// La que no coincide, o la que no existía todavía (una pantalla nueva en las fotos).
const FOTO_QUE_NO_COINCIDE = /toHaveScreenshot\(|A snapshot doesn't exist at /;
// eslint-disable-next-line no-control-regex -- los colores de la terminal empiezan por ESC
const SIN_COLOR = /\u001b\[[0-9;]*m/g;

/** Cada `resultados.json` de la carpeta, uno por trozo (cada artefacto en la suya). */
function losResultados() {
  if (!existsSync(carpeta)) return [];
  const hallados = [];
  for (const nombre of readdirSync(carpeta)) {
    const ruta = join(carpeta, nombre);
    if (statSync(ruta).isDirectory()) {
      const dentro = join(ruta, 'resultados.json');
      if (existsSync(dentro)) hallados.push(dentro);
    } else if (nombre === 'resultados.json') hallados.push(ruta);
  }
  return hallados;
}

/** Las pruebas en rojo de verdad (las que fallan y pasan al repetirse no cuentan). */
function lasEnRojo(suite, fuera) {
  for (const spec of suite.specs ?? [])
    for (const prueba of spec.tests ?? [])
      if (prueba.status === 'unexpected')
        fuera.push({
          fichero: spec.file ?? suite.file ?? '',
          titulo: spec.title ?? '',
          proyecto: prueba.projectName ?? '',
          // Sin los colores de la terminal, que Playwright mete a veces en medio del nombre.
          errores: (prueba.results ?? [])
            .flatMap((r) => r.errors ?? [])
            .map((e) => String(e.message ?? '').replace(SIN_COLOR, '')),
        });
  for (const hija of suite.suites ?? []) lasEnRojo(hija, fuera);
  return fuera;
}

function decir(solo, motivo, lineas = []) {
  console.log(`${solo ? 'Solo fotos' : 'No solo fotos'}: ${motivo}`);
  for (const linea of lineas) console.log(`  ${linea}`);
  if (process.env['GITHUB_OUTPUT'])
    appendFileSync(process.env['GITHUB_OUTPUT'], `solo_fotos=${solo}\n`);
  if (process.env['GITHUB_STEP_SUMMARY'])
    appendFileSync(
      process.env['GITHUB_STEP_SUMMARY'],
      [
        `### ${solo ? 'Lo único en rojo son fotos' : 'Hay algo más que fotos en rojo'}`,
        '',
        motivo,
        '',
        ...lineas.map((l) => `- ${l}`),
        '',
      ].join('\n'),
    );
  process.exit(0);
}

const ficheros = losResultados();
if (ficheros.length !== trozos)
  decir(
    false,
    `Hay resultados de ${ficheros.length} trozos de ${trozos}: alguno se cayó antes de probar.`,
  );

const enRojo = [];
for (const fichero of ficheros) {
  const informe = JSON.parse(readFileSync(fichero, 'utf8'));
  if ((informe.errors ?? []).length > 0)
    decir(
      false,
      'Hay errores fuera de las pruebas.',
      informe.errors.map((e) => String(e.message ?? '').split('\n')[0]),
    );
  for (const suite of informe.suites ?? []) lasEnRojo(suite, enRojo);
}

if (enRojo.length === 0) decir(false, 'No hay ninguna prueba en rojo: lo que falló es otra cosa.');

const otras = enRojo.filter(
  (p) =>
    !p.fichero.endsWith(FOTOS) ||
    p.errores.length === 0 ||
    p.errores.some((mensaje) => !FOTO_QUE_NO_COINCIDE.test(mensaje)),
);
if (otras.length > 0)
  decir(
    false,
    `${otras.length} de ${enRojo.length} pruebas en rojo no son fotos que no coinciden.`,
    otras.map((p) => `[${p.proyecto}] ${p.fichero} · ${p.titulo}`),
  );

decir(
  true,
  `Las ${enRojo.length} pruebas en rojo son fotos que no coinciden.`,
  enRojo.map((p) => `[${p.proyecto}] ${p.titulo}`),
);
