#!/usr/bin/env node
import { gzipSync } from 'node:zlib';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Presupuesto de tamano (Parte B7 del Plan).
 *
 * "Paquete inicial de la app: menos de 250 KB comprimido."
 *
 * Se mide lo que el navegador tiene que descargar de verdad antes de pintar: el
 * script de entrada, todo lo que lleva `modulepreload` y las hojas de estilo. Lo
 * que se carga despues, bajo demanda, no cuenta.
 *
 * Un modulo que no cumple su presupuesto no esta terminado, asi que esto corre en
 * integracion continua y bloquea la fusion.
 */
const RAIZ = fileURLToPath(new URL('../', import.meta.url));
const LIMITE_KB = 250;
const APLICACIONES = ['web', 'app', 'carta', 'admin'];

function referenciasDe(html) {
  const referencias = new Set();
  const patrones = [
    /<script[^>]+type="module"[^>]+src="([^"]+)"/g,
    /<link[^>]+rel="modulepreload"[^>]+href="([^"]+)"/g,
    /<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"/g,
  ];
  for (const patron of patrones) {
    for (const [, ruta] of html.matchAll(patron)) referencias.add(ruta);
  }
  return [...referencias];
}

let hayFallo = false;
console.log(`Presupuesto de tamano · limite ${LIMITE_KB} KB comprimido por aplicacion\n`);

for (const aplicacion of APLICACIONES) {
  const dist = join(RAIZ, 'apps', aplicacion, 'dist');
  const indice = join(dist, 'index.html');

  if (!existsSync(indice)) {
    console.error(`  ${aplicacion.padEnd(6)} sin construir. Ejecuta \`pnpm build\` antes.`);
    hayFallo = true;
    continue;
  }

  const html = await readFile(indice, 'utf8');
  let total = gzipSync(Buffer.from(html)).length;

  for (const referencia of referenciasDe(html)) {
    const relativa = referencia.replace(/^.*\/assets\//, 'assets/');
    const fichero = join(dist, relativa);
    if (!existsSync(fichero)) continue;
    total += gzipSync(await readFile(fichero)).length;
  }

  const kb = total / 1024;
  const cumple = kb <= LIMITE_KB;
  if (!cumple) hayFallo = true;

  console.log(
    `  ${cumple ? 'OK  ' : 'MAL '} ${aplicacion.padEnd(6)} ${kb.toFixed(1).padStart(7)} KB` +
      (cumple ? '' : `  · se pasa ${(kb - LIMITE_KB).toFixed(1)} KB del presupuesto`),
  );
}

if (hayFallo) {
  console.error(
    [
      '',
      'Que ha pasado: al menos una aplicacion se pasa del presupuesto de B7.',
      'Que se puede hacer: mirar que dependencia ha entrado en el paquete inicial y',
      'cargarla bajo demanda, o justificar por escrito por que hace falta.',
    ].join('\n'),
  );
  process.exit(1);
}

console.log('\n  todas las aplicaciones dentro del presupuesto');
