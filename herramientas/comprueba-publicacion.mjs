#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Comprueba que lo construido apunta a donde se va a publicar.
 *
 * Existe por un fallo real: la primera publicacion salio en blanco porque el HTML
 * pedia los ficheros en `/assets/...` cuando estaban en `/EstookApp-V.2/assets/...`.
 * No fallaba nada, no habia error en ninguna consola de construccion: simplemente
 * la pagina no pintaba. Un fallo asi no se puede quedar sin vigilar.
 *
 * Se ejecuta despues de `pnpm build`, y compara cada `index.html` con la raiz que
 * dice `VITE_BASE`.
 */
const RAIZ = fileURLToPath(new URL('../', import.meta.url));

/** web va en la raiz; las otras tres, cada una en su subcarpeta. */
const APLICACIONES = [
  { nombre: 'web', subruta: '' },
  { nombre: 'app', subruta: 'app/' },
  { nombre: 'carta', subruta: 'carta/' },
  { nombre: 'admin', subruta: 'admin/' },
];

const declarada = process.env['VITE_BASE'] ?? '/';
const base = declarada.endsWith('/') ? declarada : `${declarada}/`;

console.log(`Comprobacion de publicacion · raiz esperada "${base}"\n`);

let hayFallo = false;

for (const { nombre, subruta } of APLICACIONES) {
  const indice = join(RAIZ, 'apps', nombre, 'dist', 'index.html');

  if (!existsSync(indice)) {
    console.error(`  MAL  ${nombre.padEnd(6)} sin construir. Ejecuta \`pnpm build\` antes.`);
    hayFallo = true;
    continue;
  }

  const html = await readFile(indice, 'utf8');
  const esperada = `${base}${subruta}assets/`;

  const referencias = [...html.matchAll(/(?:src|href)="([^"]*\/assets\/[^"]+)"/g)].map(
    ([, ruta]) => ruta,
  );

  if (referencias.length === 0) {
    console.error(`  MAL  ${nombre.padEnd(6)} su index.html no referencia ningun fichero`);
    hayFallo = true;
    continue;
  }

  const descolgadas = referencias.filter((ruta) => !ruta.startsWith(esperada));

  if (descolgadas.length > 0) {
    console.error(`  MAL  ${nombre.padEnd(6)} apunta fuera de donde se publica`);
    console.error(`       esperaba  ${esperada}...`);
    for (const ruta of descolgadas) console.error(`       encontrado ${ruta}`);
    hayFallo = true;
    continue;
  }

  console.log(`  OK   ${nombre.padEnd(6)} ${esperada}...  (${referencias.length} ficheros)`);
}

if (hayFallo) {
  console.error(
    [
      '',
      'Que ha pasado: lo construido apunta a una direccion distinta de donde se',
      'publica. Publicado asi, la pagina saldria en blanco.',
      'Que se puede hacer: revisar VITE_BASE. Vale "/EstookApp-V.2/" mientras la',
      'direccion sea estook.github.io/EstookApp-V.2/, y "/" con dominio propio.',
      'Esta escrito en docs/decisiones/0001-publicacion-en-github-pages.md',
    ].join('\n'),
  );
  process.exit(1);
}

console.log('\n  las cuatro aplicaciones apuntan a donde se publican');
