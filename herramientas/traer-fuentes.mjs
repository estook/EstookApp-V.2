#!/usr/bin/env node
import { mkdir, writeFile, readdir, stat, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Traer Montserrat y dejarla autoalojada (Parte B2 del Plan).
 *
 * «Montserrat, descargada de Google Fonts (licencia SIL Open Font),
 * **autoalojada** en `packages/ui/fuentes/` en formato WOFF2 con los pesos 400,
 * 500, 600 y 700. Nada de cargarla desde un servidor ajeno: es mas lento y mete
 * un tercero donde no hace falta.»
 *
 * Se ejecuta una sola vez y los ficheros se suben al repositorio. Esto no corre
 * en la construccion: si corriera, la construccion dependeria de que Google este
 * en pie, que es justo lo que se queria evitar.
 *
 *   node herramientas/traer-fuentes.mjs
 *
 * ── Los cuatro pesos son un solo fichero ─────────────────────────────────────
 *
 * Montserrat es **fuente variable**. Al pedir los cuatro pesos por separado,
 * Google devuelve cuatro `@font-face` distintos... apuntando al mismo fichero.
 * Se comprobo: los cuatro venian con el mismo md5. Guardar cuatro copias
 * identicas serian 300 KB tirados.
 *
 * Asi que se guarda **un fichero por subconjunto**, con el eje de peso entero, y
 * la hoja lo declara con `font-weight: 400 700`. El navegador interpola los
 * cuatro pesos del Plan a partir de el.
 *
 * ── Y solo dos subconjuntos ──────────────────────────────────────────────────
 *
 * `latin` y `latin-ext`. Con eso se escriben los cinco idiomas de la interfaz
 * (espanol, catalan, gallego, euskera e ingles): el catalan necesita la ela
 * geminada, que vive en `latin-ext`. Cirilico y vietnamita serian tres ficheros
 * mas que nadie descargaria nunca; y aunque estuvieran, el navegador no los
 * pide, porque cada cara declara su `unicode-range`.
 */
const RAIZ = fileURLToPath(new URL('../', import.meta.url));
const DESTINO = join(RAIZ, 'packages/ui/fuentes');

const SUBCONJUNTOS = ['latin', 'latin-ext'];

// Un navegador moderno, para que Google devuelva WOFF2 y no WOFF ni TTF.
const NAVEGADOR =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

async function pedir(url, comoTexto) {
  const respuesta = await fetch(url, { headers: { 'User-Agent': NAVEGADOR } });
  if (!respuesta.ok) throw new Error(`${respuesta.status} al pedir ${url}`);
  return comoTexto ? respuesta.text() : Buffer.from(await respuesta.arrayBuffer());
}

/**
 * Parte la hoja de Google en caras.
 *
 * El nombre del subconjunto va en un comentario **antes** de su bloque, asi que
 * se recorre linea a linea llevando cuenta del ultimo comentario visto. Es
 * fragil hacerlo por indices; asi no.
 */
function caras(css) {
  const salida = [];
  let subconjunto = null;
  let rango = null;

  for (const linea of css.split('\n')) {
    const comentario = /^\/\* (\S+) \*\/$/.exec(linea.trim());
    if (comentario) {
      subconjunto = comentario[1];
      continue;
    }

    const unicode = /unicode-range:\s*([^;]+);/.exec(linea);
    if (unicode) rango = unicode[1].trim();

    const url = /src:\s*url\((https:\/\/[^)]+\.woff2)\)/.exec(linea);
    if (url) salida.push({ subconjunto, url: url[1], rango: null });

    // El `unicode-range` va despues del `src` dentro del mismo bloque.
    if (unicode && salida.length > 0) salida[salida.length - 1].rango = rango;
  }

  return salida;
}

await rm(DESTINO, { recursive: true, force: true });
await mkdir(DESTINO, { recursive: true });

// El eje entero de una vez: `400..700` pide la fuente variable, no cuatro cortes.
const hoja = await pedir(
  'https://fonts.googleapis.com/css2?family=Montserrat:wght@400..700&display=swap',
  true,
);

const queridas = caras(hoja).filter((c) => SUBCONJUNTOS.includes(c.subconjunto));
if (queridas.length !== SUBCONJUNTOS.length) {
  throw new Error(
    `Se esperaban ${SUBCONJUNTOS.length} caras y han llegado ${queridas.length}. Revisa la peticion.`,
  );
}

const rangos = {};
for (const { subconjunto, url, rango } of queridas) {
  const nombre = `montserrat-${subconjunto}.woff2`;
  await writeFile(join(DESTINO, nombre), await pedir(url, false));
  rangos[subconjunto] = rango;
  console.log(`  ${nombre}`);
}

// Los `unicode-range` se dejan escritos: son lo que hace que un navegador que
// solo pinta castellano no descargue nunca `latin-ext`.
await writeFile(join(DESTINO, 'rangos.json'), `${JSON.stringify(rangos, null, 2)}\n`, 'utf8');

let total = 0;
for (const fichero of await readdir(DESTINO)) {
  if (!fichero.endsWith('.woff2')) continue;
  total += (await stat(join(DESTINO, fichero))).size;
}
console.log(`\nPesan ${(total / 1024).toFixed(1)} KB en total. Ya vienen comprimidas.`);
