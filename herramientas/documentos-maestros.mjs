#!/usr/bin/env node
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { join, basename } from 'node:path';
import { chromium } from '@playwright/test';
import { marked } from 'marked';

/**
 * Los documentos maestros, de Markdown a PDF.
 *
 *     pnpm maestros            todos
 *     pnpm maestros manifiesto solo ese
 *
 * ── Por que existe ──────────────────────────────────────────────────────────
 *
 * Los cuatro documentos maestros vivian **solo como PDF en un escritorio**. Sin
 * fuente, sin historial y sin forma de ver que cambio entre dos versiones: para
 * corregir una linea habia que rehacer el documento entero a mano.
 *
 * Ahora la fuente es el Markdown de `docs/maestros/`, que entra por pull request
 * como cualquier otro cambio, y el PDF es lo que sale. Es la misma regla que el
 * resto del producto: los documentos son salidas, nunca entradas.
 *
 * El estilo sale de la marca de verdad —charcoal, naranja, Montserrat
 * autoalojada— asi que los documentos se parecen a la aplicacion, y cambiarlo se
 * hace en un sitio.
 */

const RAIZ = new URL('../', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const FUENTE = join(RAIZ, 'docs/maestros');
const DESTINO = join(RAIZ, 'docs/maestros/pdf');

/** Montserrat, incrustada. Un PDF que depende de una fuente instalada no es un PDF. */
function fuenteIncrustada(fichero, rango) {
  const datos = readFileSync(join(RAIZ, 'packages/ui/fuentes', fichero)).toString('base64');
  return `@font-face{font-family:Montserrat;font-style:normal;font-weight:400 700;font-display:block;src:url(data:font/woff2;base64,${datos}) format('woff2');unicode-range:${rango};}`;
}

const TIPOGRAFIA =
  fuenteIncrustada(
    'montserrat-latin.woff2',
    'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD',
  ) +
  fuenteIncrustada(
    'montserrat-latin-ext.woff2',
    'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF',
  );

const ESTILO = readFileSync(join(FUENTE, 'estilo.css'), 'utf8');

/**
 * La portada y el pie salen de la cabecera del propio Markdown, para que el
 * documento se describa a si mismo y no haya una lista aparte que mantener.
 */
function partir(texto) {
  const m = /^---\n([\s\S]*?)\n---\n/.exec(texto);
  if (!m) throw new Error('falta la cabecera del documento');
  const datos = {};
  for (const linea of m[1].split('\n')) {
    const i = linea.indexOf(':');
    if (i > 0) datos[linea.slice(0, i).trim()] = linea.slice(i + 1).trim();
  }
  return { datos, cuerpo: texto.slice(m[0].length) };
}

async function generar(navegador, fichero) {
  const { datos, cuerpo } = partir(readFileSync(join(FUENTE, fichero), 'utf8'));
  const nombre = basename(fichero, '.md');

  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8">
<title>${datos.titulo}</title>
<style>${TIPOGRAFIA}${ESTILO}</style></head><body>
<section class="portada">
  <div class="marca">ESTOOK</div>
  <h1 class="portada-titulo">${datos.titulo}</h1>
  <p class="portada-tipo">${datos.tipo}</p>
  <p class="portada-fecha">${datos.fecha}</p>
  <p class="portada-nota">${datos.nota ?? ''}</p>
</section>
<main>${marked.parse(cuerpo)}</main>
</body></html>`;

  // Con --html se deja tambien el HTML al lado, que es lo unico que se puede
  // abrir en un navegador para repasar el diseno sin adivinar.
  if (process.argv.includes('--html')) writeFileSync(join(DESTINO, nombre + '.html'), html);

  const pagina = await navegador.newPage();
  await pagina.setContent(html, { waitUntil: 'load' });
  await pagina.emulateMedia({ media: 'print' });

  const salida = join(DESTINO, `${nombre}.pdf`);
  await pagina.pdf({
    path: salida,
    format: 'A4',
    printBackground: true,
    margin: { top: '18mm', bottom: '18mm', left: '16mm', right: '16mm' },
    displayHeaderFooter: true,
    headerTemplate: '<span></span>',
    footerTemplate: `<div style="width:100%;font:8pt Montserrat,sans-serif;color:#8A9497;padding:0 16mm;display:flex;justify-content:space-between">
      <span>Estook · ${datos.titulo}</span><span class="pageNumber"></span></div>`,
  });
  await pagina.close();

  const paginas = 0;
  console.log(
    `  ${nombre.padEnd(34)} ${salida.replace(RAIZ, '')}${paginas ? ` · ${paginas} p.` : ''}`,
  );
  return salida;
}

mkdirSync(DESTINO, { recursive: true });

const soloEste = process.argv[2];
const ficheros = readdirSync(FUENTE)
  .filter((f) => f.endsWith('.md'))
  .filter((f) => !soloEste || f.includes(soloEste))
  .sort();

if (ficheros.length === 0) {
  console.error(`  No hay documentos que generar${soloEste ? ` con «${soloEste}»` : ''}.`);
  process.exit(1);
}

const navegador = await chromium.launch();
console.log(`\nDocumentos maestros · ${ficheros.length}\n`);
for (const f of ficheros) await generar(navegador, f);
await navegador.close();
console.log('');
