#!/usr/bin/env node
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { escribirPng, leerPng, recortar, reducir } from './png.mjs';

/**
 * Reducir los PNG de marca al tamaño en el que se ven.
 *
 * `Logohorizontal.png` mide 2048 × 512 y pesa 468 KB. `Fogonicono.png` mide
 * 2048 × 2048 y pesa 1,2 MB. En la barra se pintan a 28 px de alto y a 22 px de
 * lado: el navegador descargaría **1,7 MB para enseñar dos sellos**.
 *
 * Esto los deja al doble del tamaño en que se pintan —lo justo para que se vean
 * nítidos en una pantalla de retina— **sin tocar el dibujo**: es la misma imagen,
 * con menos píxeles. No es «optimizar»: es no descargar setenta veces lo que se
 * ve.
 *
 *   node herramientas/reducir-marca.mjs
 *
 * Se ejecuta cuando cambien los originales. Lo que sale se sube al repositorio.
 *
 * ── Y por qué los originales se quedan ───────────────────────────────────────
 *
 * Se quedan en `packages/ui/marca/` porque son la fuente: de ellos salen estos, y
 * el día que aparezcan los vectoriales originales se sustituyen los dos. No se
 * publican, así que no pesan en lo que nadie descarga.
 */
const RAIZ = fileURLToPath(new URL('../', import.meta.url));
const MARCA = join(RAIZ, 'packages/ui/marca');

const APLICACIONES = ['web', 'app', 'carta', 'admin'];

const QUE_REDUCIR = [
  {
    origen: 'Logohorizontal.png',
    destino: 'estook-logo.png',
    // Se pinta a 28 px de alto en la barra; 96 da margen para retina y para la
    // web pública, donde va más grande.
    alto: 96,
    recortar: true,
  },
  {
    origen: 'Fogonicono.png',
    destino: 'fogon.png',
    // Cuadrado. Se pinta a 22 px en la barra y a 40 en el chat.
    alto: 128,
    recortar: false,
  },
];

const salidas = [];

for (const { origen, destino, alto, recortar: seRecorta } of QUE_REDUCIR) {
  const original = leerPng(await readFile(join(MARCA, origen)));
  const util = seRecorta ? recortar(original) : original;

  // Se conserva la proporción: el logo es apaisado y Fogón es cuadrado.
  const ancho = Math.max(1, Math.trunc((util.ancho / util.alto) * alto + 0.5));
  const png = escribirPng(reducir(util, ancho, alto));

  await writeFile(join(MARCA, destino), png);
  salidas.push(destino);

  const antes = (await readFile(join(MARCA, origen))).length;
  console.log(
    `  ${destino.padEnd(18)} ${ancho}x${alto}` +
      `  ·  ${(antes / 1024).toFixed(0)} KB -> ${(png.length / 1024).toFixed(1)} KB`,
  );
}

for (const aplicacion of APLICACIONES) {
  const carpeta = join(RAIZ, 'apps', aplicacion, 'public/marca');
  await mkdir(carpeta, { recursive: true });
  for (const fichero of salidas) {
    await copyFile(join(MARCA, fichero), join(carpeta, fichero));
  }
}

console.log(`\nRepartidos a apps/{${APLICACIONES.join(',')}}/public/marca`);
