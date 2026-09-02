#!/usr/bin/env node
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve, relative, isAbsolute } from 'node:path';

/**
 * Comprueba que la API se puede desplegar, sin desplegarla.
 *
 *     pnpm grafo
 *
 * ── Por que existe ──────────────────────────────────────────────────────────
 *
 * El primer despliegue de verdad de M4 se cayo asi:
 *
 *     Error: failed to create the graph
 *     Caused by:
 *       Relative import path "@estook/utiles" not prefixed with / or ./ or ../
 *
 * Y las 532 pruebas estaban en verde. No es que fueran malas: es que **corren en
 * Node**, donde `@estook/utiles` lo resuelve pnpm con los enlaces del espacio de
 * trabajo. La API desplegada corre en **Deno**, que no hace eso: para el,
 * cualquier cosa que no empiece por `/`, `./` o `../` es un paquete que hay que
 * declarar en un mapa de importaciones.
 *
 * Habia, por tanto, un camino entero —el que de verdad llega al cliente— que no
 * comprobaba nadie. Esto lo comprueba: recorre el grafo desde el mismo fichero
 * que arranca Supabase, con el mismo mapa, y falla si algo no resuelve.
 *
 * ── Por que no lo hace un Deno de verdad ────────────────────────────────────
 *
 * Se intento, y no vale. `deno info` pasa **igual de verde con el fallo puesto**,
 * porque Deno lee el `package.json` del espacio de trabajo y resuelve
 * `@estook/utiles` el solo, aunque no este en el mapa. Ni desactivando
 * `node_modules` ni el `package.json` se le quita la manía.
 *
 * El empaquetador de Supabase no hace eso: resuelve con el mapa y con rutas
 * relativas, y nada mas. Asi que esto resuelve igual que el, que es de lo que se
 * trata. Una comprobacion que no puede fallar es peor que no tenerla, porque da
 * confianza.
 *
 * Esta probado contra el fallo real: quitando `@estook/utiles` del mapa, falla.
 */

const RAIZ = resolve(import.meta.dirname, '..');
const ENTRADA = resolve(RAIZ, 'supabase/functions/api/index.ts');
const MAPA = resolve(RAIZ, 'supabase/functions/api/deno.json');

/** Lo que Deno sabe traerse solo, sin que nadie se lo declare. */
const ESQUEMAS_QUE_DENO_ENTIENDE = ['node:', 'npm:', 'jsr:', 'http:', 'https:', 'data:'];

/**
 * Quita comentarios sin romper las cadenas.
 *
 * Hace falta de verdad: este codigo esta lleno de comentarios que citan
 * importaciones («el catalogo de `@estook/permisos` manda»), y un buscador tonto
 * las contaria como si fueran codigo.
 */
function sinComentarios(texto) {
  let fuera = '';
  let i = 0;
  while (i < texto.length) {
    const dos = texto.slice(i, i + 2);
    if (dos === '//') {
      while (i < texto.length && texto[i] !== '\n') i += 1;
      continue;
    }
    if (dos === '/*') {
      i += 2;
      while (i < texto.length && texto.slice(i, i + 2) !== '*/') i += 1;
      i += 2;
      continue;
    }
    const c = texto[i];
    if (c === '"' || c === "'" || c === '`') {
      fuera += c;
      i += 1;
      while (i < texto.length && texto[i] !== c) {
        if (texto[i] === '\\') {
          fuera += texto.slice(i, i + 2);
          i += 2;
          continue;
        }
        fuera += texto[i];
        i += 1;
      }
      fuera += c;
      i += 1;
      continue;
    }
    fuera += c;
    i += 1;
  }
  return fuera;
}

function importacionesDe(texto) {
  const limpio = sinComentarios(texto);
  const encontradas = new Set();
  for (const m of limpio.matchAll(/\bfrom\s*['"]([^'"]+)['"]/g)) encontradas.add(m[1]);
  for (const m of limpio.matchAll(/\bimport\s*\(\s*['"]([^'"]+)['"]/g)) encontradas.add(m[1]);
  for (const m of limpio.matchAll(/^\s*import\s+['"]([^'"]+)['"]/gm)) encontradas.add(m[1]);
  return [...encontradas];
}

const fallos = [];
const visto = new Set();

if (!existsSync(MAPA)) {
  console.error(`  falta el mapa de importaciones: ${relative(RAIZ, MAPA)}`);
  process.exit(1);
}

const mapa = JSON.parse(readFileSync(MAPA, 'utf8')).imports ?? {};

// Lo primero, el propio mapa: un mapa que apunta a un fichero que no existe es
// peor que no tenerlo, porque parece que esta resuelto.
for (const [nombre, destino] of Object.entries(mapa)) {
  if (ESQUEMAS_QUE_DENO_ENTIENDE.some((e) => destino.startsWith(e))) continue;
  const fichero = resolve(dirname(MAPA), destino);
  if (!existsSync(fichero)) {
    fallos.push(`el mapa manda «${nombre}» a ${destino}, y ahi no hay nada`);
  }
}

function recorrer(fichero, desde) {
  if (visto.has(fichero)) return;
  visto.add(fichero);

  if (!existsSync(fichero)) {
    fallos.push(`${desde} importa ${relative(RAIZ, fichero)}, que no existe`);
    return;
  }

  const contenido = readFileSync(fichero, 'utf8');

  // ── Y de paso, lo que no se ve hasta la primera peticion ──────────────────
  //
  // `process.env` funciona en Node, que es donde corren las pruebas. En Deno el
  // sitio de verdad es `Deno.env`, y que `process.env` funcione o no depende de
  // cuanta compatibilidad traiga el motor de Supabase ese mes. Si no funciona,
  // no falla al desplegar —que se veria— sino al atender la primera peticion,
  // con un 500 y sin decir por que.
  //
  // Se lee con `variable()` de `@estook/utiles`, que mira en los dos sitios.
  if (/\bprocess\.env\b/.test(sinComentarios(contenido))) {
    fallos.push(
      `${relative(RAIZ, fichero)} lee «process.env», que en Deno puede no existir.\n` +
        `      Usa «variable()» de @estook/utiles, que mira en los dos sitios.`,
    );
  }

  for (const especificador of importacionesDe(contenido)) {
    if (ESQUEMAS_QUE_DENO_ENTIENDE.some((e) => especificador.startsWith(e))) continue;

    if (especificador.startsWith('./') || especificador.startsWith('../')) {
      recorrer(resolve(dirname(fichero), especificador), relative(RAIZ, fichero));
      continue;
    }

    if (isAbsolute(especificador)) continue;

    // Aqui es donde se cayo el despliegue: un nombre pelado sin declarar.
    const destino = mapa[especificador];
    if (destino === undefined) {
      fallos.push(
        `${relative(RAIZ, fichero)} importa «${especificador}», que Deno no sabe resolver.\n` +
          `      Declaralo en supabase/functions/api/deno.json.`,
      );
      continue;
    }

    if (ESQUEMAS_QUE_DENO_ENTIENDE.some((e) => destino.startsWith(e))) continue;
    recorrer(resolve(dirname(MAPA), destino), relative(RAIZ, fichero));
  }
}

recorrer(ENTRADA, '(la entrada)');

if (fallos.length > 0) {
  console.error(`\n  El grafo de Deno no resuelve. ${fallos.length} fallo(s):\n`);
  for (const f of fallos) console.error(`    · ${f}`);
  console.error(
    `\n  Esto tumbaria el despliegue de la API, aunque las pruebas esten en verde:\n` +
      `  corren en Node, y esto solo pasa en Deno.\n`,
  );
  process.exit(1);
}

console.log(`  El grafo de Deno resuelve · ${visto.size} ficheros desde la entrada de Supabase`);
