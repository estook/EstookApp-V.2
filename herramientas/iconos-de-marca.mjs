#!/usr/bin/env node
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Los iconos de aplicacion, a partir del SVG de la marca.
 *
 * Casi todo en Estook es SVG, que escala y pesa una fraccion. Pero hay tres
 * sitios donde el sistema operativo **obliga a PNG**: el icono de la pantalla de
 * inicio de un iPhone, y los dos iconos de aplicacion instalable.
 *
 * Esta herramienta los genera a partir de `packages/ui/marca/favicon.svg`, que
 * es el unico dueno de la forma. Se ejecuta una vez y lo que sale se sube al
 * repositorio, igual que las fuentes y los iconos de Lucide:
 *
 *   node herramientas/iconos-de-marca.mjs
 *
 * ── Como se rasteriza sin instalar nada ──────────────────────────────────────
 *
 * No hace falta ImageMagick ni `sharp`. El simbolo son **cinco rectangulos y un
 * triangulo**, asi que se pinta a mano sobre un lienzo de pixeles y se escribe
 * el PNG con `zlib`, que ya viene con Node. Son cien lineas y ninguna
 * dependencia nueva (E1).
 *
 * Y como se pinta desde la misma geometria que el SVG, los dos no se pueden
 * separar: si cambia la marca, cambian los dos a la vez.
 */
import { deflateSync } from 'node:zlib';

const RAIZ = fileURLToPath(new URL('../', import.meta.url));
const MARCA = join(RAIZ, 'packages/ui/marca');

const CHARCOAL = [0x11, 0x1c, 0x1f];
const NARANJA = [0xff, 0x7a, 0x00];

/**
 * La geometria del simbolo, en el lienzo de 855 x 1075 del SVG.
 *
 * Se lee del propio SVG para que no haya dos copias: si alguien mueve una barra
 * en `estook-simbolo.svg`, los PNG salen movidos igual.
 */
async function geometria() {
  const svg = await readFile(join(MARCA, 'estook-simbolo.svg'), 'utf8');

  const rects = [
    ...svg.matchAll(
      /<rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)" rx="([\d.]+)"(?: fill="(#[0-9A-Fa-f]{6})")?/g,
    ),
  ].map((m) => ({
    x: Number(m[1]),
    y: Number(m[2]),
    w: Number(m[3]),
    h: Number(m[4]),
    r: Number(m[5]),
    color: m[6] === '#FF7A00' ? NARANJA : CHARCOAL,
  }));

  const cola = /<path d="M([\d.]+) ([\d.]+) H([\d.]+) L([\d.]+) ([\d.]+) Z"/.exec(svg);
  if (rects.length !== 5 || !cola) {
    throw new Error('El simbolo no tiene la forma esperada. Revisa estook-simbolo.svg.');
  }

  return {
    rects,
    cola: {
      x1: Number(cola[1]),
      y: Number(cola[2]),
      x2: Number(cola[3]),
      px: Number(cola[4]),
      py: Number(cola[5]),
    },
  };
}

/** Un lienzo RGBA, con la transparencia puesta. */
function lienzo(lado) {
  return { lado, pixeles: new Uint8Array(lado * lado * 4) };
}

/**
 * Redondea al entero mas cercano, sin usar `Math.round`.
 *
 * No es rebuscado: la regla 9 del Plan prohibe `Math.round` en todo el proyecto
 * salvo en los motores de dinero, y hace bien en no admitir excepciones por
 * contexto. Aqui son canales de color, no euros, pero el sitio para discutirlo no
 * es una lista de excepciones que crece.
 */
function redondear(valor) {
  return Math.trunc(valor + 0.5);
}

function pintar(cv, x, y, color, alfa) {
  if (x < 0 || y < 0 || x >= cv.lado || y >= cv.lado || alfa <= 0) return;
  const i = (y * cv.lado + x) * 4;
  const previo = cv.pixeles[i + 3] / 255;
  const nuevo = Math.min(1, alfa);
  const total = nuevo + previo * (1 - nuevo);
  if (total === 0) return;

  for (let c = 0; c < 3; c++) {
    const antes = cv.pixeles[i + c];
    cv.pixeles[i + c] = redondear((color[c] * nuevo + antes * previo * (1 - nuevo)) / total);
  }
  cv.pixeles[i + 3] = redondear(total * 255);
}

/**
 * Cuanto de un pixel cae dentro de una forma, de 0 a 1.
 *
 * Se mira en cuatro puntos dentro del pixel en vez de solo en el centro: es lo
 * que hace que los bordes salgan suaves y no en escalera. A 512 px se nota.
 */
function cobertura(dentro, x, y) {
  let cuantos = 0;
  for (const dx of [0.25, 0.75]) {
    for (const dy of [0.25, 0.75]) {
      if (dentro(x + dx, y + dy)) cuantos++;
    }
  }
  return cuantos / 4;
}

/** Rectangulo con esquinas redondeadas. */
function enRect(r) {
  return (x, y) => {
    if (x < r.x || x > r.x + r.w || y < r.y || y > r.y + r.h) return false;

    const cx = Math.min(Math.max(x, r.x + r.r), r.x + r.w - r.r);
    const cy = Math.min(Math.max(y, r.y + r.r), r.y + r.h - r.r);
    return (x - cx) ** 2 + (y - cy) ** 2 <= r.r ** 2;
  };
}

/** Triangulo, por el signo de los tres lados. */
function enTriangulo(a, b, c) {
  const lado = (p, q, x, y) => (q[0] - p[0]) * (y - p[1]) - (q[1] - p[1]) * (x - p[0]);
  return (x, y) => {
    const s1 = lado(a, b, x, y);
    const s2 = lado(b, c, x, y);
    const s3 = lado(c, a, x, y);
    return (s1 >= 0 && s2 >= 0 && s3 >= 0) || (s1 <= 0 && s2 <= 0 && s3 <= 0);
  };
}

/** Escribe un PNG de verdad: cabecera, datos comprimidos y CRC. */
function comoPng(cv) {
  const crcTabla = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crcTabla[n] = c;
  }
  const crc = (buf) => {
    let c = -1;
    for (const b of buf) c = crcTabla[(c ^ b) & 0xff] ^ (c >>> 8);
    return (c ^ -1) >>> 0;
  };

  const trozo = (tipo, datos) => {
    const largo = Buffer.alloc(4);
    largo.writeUInt32BE(datos.length);
    const cuerpo = Buffer.concat([Buffer.from(tipo, 'ascii'), datos]);
    const suma = Buffer.alloc(4);
    suma.writeUInt32BE(crc(cuerpo));
    return Buffer.concat([largo, cuerpo, suma]);
  };

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(cv.lado, 0);
  ihdr.writeUInt32BE(cv.lado, 4);
  ihdr[8] = 8; // bits por canal
  ihdr[9] = 6; // RGBA
  // 10, 11, 12 quedan a cero: compresion, filtro e interlazado estandar.

  // Cada fila lleva delante su byte de filtro; se usa el 0, «sin filtro».
  const crudo = Buffer.alloc(cv.lado * (cv.lado * 4 + 1));
  for (let y = 0; y < cv.lado; y++) {
    const desde = y * (cv.lado * 4 + 1);
    crudo[desde] = 0;
    Buffer.from(cv.pixeles.buffer, y * cv.lado * 4, cv.lado * 4).copy(crudo, desde + 1);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    trozo('IHDR', ihdr),
    trozo('IDAT', deflateSync(crudo, { level: 9 })),
    trozo('IEND', Buffer.alloc(0)),
  ]);
}

/**
 * Dibuja el simbolo centrado en un lienzo cuadrado, con margen.
 *
 * `fondo` sirve para el icono de iPhone, que no admite transparencia: iOS la
 * rellena de negro por su cuenta y el simbolo charcoal desapareceria.
 */
async function dibujar(lado, { margen = 0.16, fondo = null } = {}) {
  const { rects, cola } = await geometria();
  const cv = lienzo(lado);

  if (fondo) {
    for (let y = 0; y < lado; y++) for (let x = 0; x < lado; x++) pintar(cv, x, y, fondo, 1);
  }

  // El simbolo es mas alto que ancho: se escala por el alto y se centra.
  const ANCHO = 855;
  const ALTO = 1075;
  const util = lado * (1 - margen * 2);
  const escala = util / ALTO;
  const offsetX = (lado - ANCHO * escala) / 2;
  const offsetY = (lado - ALTO * escala) / 2;

  const aLienzo = (dentro) => (x, y) => dentro((x - offsetX) / escala, (y - offsetY) / escala);

  const formas = [
    ...rects.map((r) => ({ dentro: aLienzo(enRect(r)), color: r.color })),
    {
      dentro: aLienzo(enTriangulo([cola.x1, cola.y], [cola.x2, cola.y], [cola.px, cola.py])),
      color: CHARCOAL,
    },
  ];

  for (const { dentro, color } of formas) {
    for (let y = 0; y < lado; y++) {
      for (let x = 0; x < lado; x++) {
        const cuanto = cobertura(dentro, x, y);
        if (cuanto > 0) pintar(cv, x, y, color, cuanto);
      }
    }
  }

  return comoPng(cv);
}

const QUE_HACE_FALTA = [
  // «apple-touch-icon.png · 180 px» (LEEME de la marca). Sin transparencia.
  { nombre: 'apple-touch-icon.png', lado: 180, fondo: [0xfa, 0xfa, 0xf8], margen: 0.18 },
  // Los dos de aplicacion instalable. Con fondo, que es lo que pide una PWA
  // para poder recortarlos en redondo sin que se vea el hueco.
  { nombre: 'pwa-192.png', lado: 192, fondo: [0xfa, 0xfa, 0xf8], margen: 0.16 },
  { nombre: 'pwa-512.png', lado: 512, fondo: [0xfa, 0xfa, 0xf8], margen: 0.16 },
];

for (const { nombre, lado, fondo, margen } of QUE_HACE_FALTA) {
  const png = await dibujar(lado, { margen, fondo });
  await writeFile(join(MARCA, nombre), png);
  console.log(`  ${nombre.padEnd(22)} ${lado}x${lado} · ${(png.length / 1024).toFixed(1)} KB`);
}

/*
 * Y se reparten a las cuatro aplicaciones.
 *
 * Vite copia `public/` tal cual, y un `<link rel="icon">` lo pide por su
 * direccion, no por un import: no hay forma de que salga de `packages/ui` sin
 * copiarlo. Se copia desde aqui, y no a mano, para que las cinco copias no
 * puedan separarse nunca: son cinco kilobytes y un solo dueno.
 */
const APLICACIONES = ['web', 'app', 'carta', 'admin'];
const AL_PUBLICO = ['favicon.svg', ...QUE_HACE_FALTA.map((q) => q.nombre)];

for (const aplicacion of APLICACIONES) {
  const destino = join(RAIZ, 'apps', aplicacion, 'public/marca');
  await mkdir(destino, { recursive: true });
  for (const fichero of AL_PUBLICO) {
    await copyFile(join(MARCA, fichero), join(destino, fichero));
  }
}

console.log(`\nRepartidos a apps/{${APLICACIONES.join(',')}}/public/marca`);
console.log('El logo horizontal y el simbolo van en SVG: no hacen falta en PNG.');
