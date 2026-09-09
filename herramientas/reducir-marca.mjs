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

/**
 * Y el logotipo para fondo oscuro.
 *
 * ── Por que hace falta, y por que se genera en vez de dibujarse ─────────────
 *
 * El logotipo es tipografia **charcoal** sobre transparente. Sobre el fondo claro
 * se lee perfectamente; con el modo oscuro de M6½ se quedaba negro sobre negro en
 * la barra de arriba, que es el fallo que mas miedo daba de todo el tema oscuro y
 * el primero que aparecio al mirarlo.
 *
 * Se genera y no se pide un PNG nuevo porque **es el mismo dibujo**: lo unico que
 * cambia es que lo oscuro pasa a claro. Pedir un fichero aparte seria tener dos
 * logotipos que pueden separarse el dia que la marca cambie.
 *
 * ── Y por que no vale un filtro de CSS ──────────────────────────────────────
 *
 * `invert(1)` invierte tambien el naranja, y el naranja **es la marca**: saldria
 * azul. Aqui se toca solo lo que es gris o negro y el naranja se queda como esta,
 * pixel a pixel.
 */
function paraFondoOscuro(imagen) {
  const salida = {
    ancho: imagen.ancho,
    alto: imagen.alto,
    pixeles: new Uint8Array(imagen.pixeles),
  };

  for (let i = 0; i < salida.pixeles.length; i += 4) {
    const r = salida.pixeles[i];
    const v = salida.pixeles[i + 1];
    const a = salida.pixeles[i + 2];

    // Lo que tiene color se queda: el naranja de la marca no se toca.
    const maximo = Math.max(r, v, a);
    const minimo = Math.min(r, v, a);
    if (maximo - minimo > 24) continue;

    // Y lo gris se da la vuelta: el charcoal se vuelve casi blanco, y lo que ya
    // era claro se queda claro.
    salida.pixeles[i] = 255 - r;
    salida.pixeles[i + 1] = 255 - v;
    salida.pixeles[i + 2] = 255 - a;
  }

  return salida;
}

{
  const original = leerPng(await readFile(join(MARCA, 'Logohorizontal.png')));
  const util = recortar(original);
  const alto = 96;
  const ancho = Math.max(1, Math.trunc((util.ancho / util.alto) * alto + 0.5));
  const png = escribirPng(paraFondoOscuro(reducir(util, ancho, alto)));

  await writeFile(join(MARCA, 'estook-logo-oscuro.png'), png);
  salidas.push('estook-logo-oscuro.png');
  console.log(`  ${'estook-logo-oscuro.png'.padEnd(18)} ${ancho}x${alto}  ·  para el tema oscuro`);
}

for (const aplicacion of APLICACIONES) {
  const carpeta = join(RAIZ, 'apps', aplicacion, 'public/marca');
  await mkdir(carpeta, { recursive: true });
  for (const fichero of salidas) {
    await copyFile(join(MARCA, fichero), join(carpeta, fichero));
  }
}

console.log(`\nRepartidos a apps/{${APLICACIONES.join(',')}}/public/marca`);
