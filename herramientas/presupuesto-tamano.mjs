#!/usr/bin/env node
import { gzipSync } from 'node:zlib';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Presupuesto de tamano (Parte B7 del Plan).
 *
 * "Paquete inicial de la app: 250 KB comprimido." **Es una referencia, no un
 * limite.** Desde la Evolucion 1.0, el tamano se mide y se informa, pero no
 * bloquea: lo que el usuario nota es el tiempo, no los kilobytes, y un paquete
 * de 400 KB que abre en 180 ms es mejor producto que uno de 240 que abre en 600.
 *
 * Lo que si sigue bloqueando es el presupuesto de VELOCIDAD, y la regla de que
 * ninguna dependencia entra sin justificarse por escrito. Que el tamano no mande
 * no significa que se instale cualquier cosa.
 *
 * Se mide lo que el navegador tiene que descargar de verdad antes de pintar: el
 * script de entrada, todo lo que lleva `modulepreload`, las hojas de estilo y
 * **las fuentes que esas hojas piden**. Lo que se carga despues, bajo demanda, no
 * cuenta: en M3 eso es Recharts, que vive detras de un `lazy` y solo baja la
 * primera vez que aparece una grafica.
 *
 * ── Sobre las fuentes ────────────────────────────────────────────────────────
 *
 * Desde M3 se cuentan, porque Montserrat va autoalojada (B2) y es peso real. Se
 * cuentan **todas** las caras declaradas, que es pesimista: cada una lleva su
 * `unicode-range`, asi que una pantalla en castellano solo baja `latin` y nunca
 * `latin-ext`. Si cabe contandolas todas, cabe seguro.
 *
 * Un modulo que no cumple su presupuesto no esta terminado, asi que esto corre en
 * integracion continua y bloquea la fusion.
 */
const RAIZ = fileURLToPath(new URL('../', import.meta.url));
/** La referencia de B7. Se informa al pasarla; no se falla. */
const REFERENCIA_KB = 250;
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

/** Un fallo de verdad: no se puede medir. Eso si para la integracion continua. */
let hayFallo = false;
/** Solo se pasa de la referencia. Se dice y se sigue. */
let hayAviso = false;

console.log(`Tamano del paquete inicial · referencia ${REFERENCIA_KB} KB por aplicacion`);
console.log('Se mide y se informa. Lo que bloquea es el presupuesto de velocidad.\n');

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
  let deFuentes = 0;

  for (const referencia of referenciasDe(html)) {
    const relativa = referencia.replace(/^.*\/assets\//, 'assets/');
    const fichero = join(dist, relativa);
    if (!existsSync(fichero)) continue;

    const contenido = await readFile(fichero);
    total += gzipSync(contenido).length;

    // Las fuentes que pide la hoja de estilos. WOFF2 ya viene comprimido, asi
    // que se cuenta tal cual: volver a comprimirlo no lo encoge y mentiria a
    // favor.
    if (!fichero.endsWith('.css')) continue;
    for (const [, ruta] of contenido.toString('utf8').matchAll(/url\(([^)]+\.woff2)\)/g)) {
      const fuente = join(dist, ruta.replace(/^.*\/assets\//, 'assets/').replace(/["']/g, ''));
      if (!existsSync(fuente)) continue;
      const peso = (await readFile(fuente)).length;
      total += peso;
      deFuentes += peso;
    }
  }

  const kb = total / 1024;
  const dentro = kb <= REFERENCIA_KB;
  if (!dentro) hayAviso = true;

  const detalle =
    deFuentes > 0 ? `  · de los cuales ${(deFuentes / 1024).toFixed(1)} KB de tipografia` : '';

  console.log(
    `  ${dentro ? 'OK  ' : 'AVISO'} ${aplicacion.padEnd(6)} ${kb.toFixed(1).padStart(7)} KB` +
      (dentro ? detalle : `  · ${(kb - REFERENCIA_KB).toFixed(1)} KB por encima de la referencia`),
  );
}

// No poder medir SI es un fallo: significa que nadie sabe cuanto pesa.
if (hayFallo) {
  console.error(
    [
      '',
      'Que ha pasado: al menos una aplicacion no se ha podido medir.',
      'Que se puede hacer: ejecutar `pnpm build` y volver a intentarlo.',
    ].join('\n'),
  );
  process.exit(1);
}

// Pasarse de la referencia NO lo es. Se dice, con lo que hay que mirar, y se sigue.
if (hayAviso) {
  console.log(
    [
      '',
      '  Alguna aplicacion esta por encima de la referencia de B7.',
      '  No es un fallo: desde la Evolucion 1.0 el tamano se vigila, no manda.',
      '',
      '  Lo que si conviene mirar: que dependencia ha entrado en el paquete inicial,',
      '  si puede cargarse bajo demanda, y sobre todo si el presupuesto de VELOCIDAD',
      '  sigue cumpliendose. Ese es el que decide.',
    ].join('\n'),
  );
} else {
  console.log('\n  todas las aplicaciones dentro de la referencia');
}
