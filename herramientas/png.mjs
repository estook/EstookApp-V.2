import { deflateSync, inflateSync } from 'node:zlib';

/**
 * Leer y escribir PNG, sin dependencias.
 *
 * Estook no necesita una librería de imágenes: necesita **dos cosas concretas**
 * —rasterizar el símbolo y reducir los PNG de marca— y las dos caben aquí. Traer
 * `sharp` significaría un binario por plataforma en cada instalación, para algo
 * que se ejecuta tres veces en la vida del proyecto.
 *
 * Solo entiende lo que hace falta: 8 bits por canal, sin entrelazar, en color
 * verdadero con o sin transparencia. Es lo que exporta cualquier herramienta de
 * diseño. Si llega otra cosa, lo dice en vez de sacar una imagen rara.
 */

const FIRMA = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

const TABLA_CRC = (() => {
  const tabla = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    tabla[n] = c;
  }
  return tabla;
})();

function crc(buf) {
  let c = -1;
  for (const b of buf) c = TABLA_CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

/** Una imagen en memoria: ancho, alto y sus píxeles en RGBA. */
export function lienzo(ancho, alto) {
  return { ancho, alto, pixeles: new Uint8Array(ancho * alto * 4) };
}

// ── Leer ──────────────────────────────────────────────────────────────────────

/** Deshace el filtro de una fila. Es la única parte del PNG con enjundia. */
function desfiltrar(tipo, fila, anterior, porPixel) {
  const salida = Buffer.from(fila);

  for (let i = 0; i < salida.length; i++) {
    const izquierda = i >= porPixel ? salida[i - porPixel] : 0;
    const arriba = anterior ? anterior[i] : 0;
    const esquina = anterior && i >= porPixel ? anterior[i - porPixel] : 0;

    switch (tipo) {
      case 0:
        break;
      case 1:
        salida[i] = (salida[i] + izquierda) & 0xff;
        break;
      case 2:
        salida[i] = (salida[i] + arriba) & 0xff;
        break;
      case 3:
        salida[i] = (salida[i] + ((izquierda + arriba) >> 1)) & 0xff;
        break;
      case 4: {
        // Paeth: se queda con el vecino que menos se aleja de la predicción.
        const p = izquierda + arriba - esquina;
        const di = Math.abs(p - izquierda);
        const da = Math.abs(p - arriba);
        const de = Math.abs(p - esquina);
        const mejor = di <= da && di <= de ? izquierda : da <= de ? arriba : esquina;
        salida[i] = (salida[i] + mejor) & 0xff;
        break;
      }
      default:
        throw new Error(`Filtro de fila desconocido: ${tipo}`);
    }
  }

  return salida;
}

export function leerPng(buffer) {
  for (let i = 0; i < FIRMA.length; i++) {
    if (buffer[i] !== FIRMA[i]) throw new Error('Esto no es un PNG');
  }

  let ancho = 0;
  let alto = 0;
  let canales = 0;
  const trozos = [];

  let i = 8;
  while (i < buffer.length) {
    const largo = buffer.readUInt32BE(i);
    const tipo = buffer.toString('ascii', i + 4, i + 8);
    const datos = buffer.subarray(i + 8, i + 8 + largo);
    i += 12 + largo;

    if (tipo === 'IHDR') {
      ancho = datos.readUInt32BE(0);
      alto = datos.readUInt32BE(4);
      const bits = datos[8];
      const color = datos[9];
      const entrelazado = datos[12];

      if (bits !== 8) throw new Error(`Solo se leen PNG de 8 bits por canal, y este tiene ${bits}`);
      if (entrelazado !== 0)
        throw new Error('Los PNG entrelazados no se leen. Vuelve a exportarlo sin entrelazar.');
      if (color !== 2 && color !== 6) {
        throw new Error(
          `Solo se lee color verdadero, con o sin transparencia. Este es del tipo ${color}.`,
        );
      }
      canales = color === 6 ? 4 : 3;
    } else if (tipo === 'IDAT') {
      trozos.push(datos);
    } else if (tipo === 'IEND') {
      break;
    }
  }

  if (ancho === 0 || alto === 0) throw new Error('El PNG no dice cuánto mide');

  const crudo = inflateSync(Buffer.concat(trozos));
  const porFila = ancho * canales;
  const imagen = lienzo(ancho, alto);

  let anterior = null;
  for (let y = 0; y < alto; y++) {
    const desde = y * (porFila + 1);
    const fila = desfiltrar(
      crudo[desde],
      crudo.subarray(desde + 1, desde + 1 + porFila),
      anterior,
      canales,
    );
    anterior = fila;

    for (let x = 0; x < ancho; x++) {
      const origen = x * canales;
      const destino = (y * ancho + x) * 4;
      imagen.pixeles[destino] = fila[origen];
      imagen.pixeles[destino + 1] = fila[origen + 1];
      imagen.pixeles[destino + 2] = fila[origen + 2];
      imagen.pixeles[destino + 3] = canales === 4 ? fila[origen + 3] : 255;
    }
  }

  return imagen;
}

// ── Escribir ──────────────────────────────────────────────────────────────────

export function escribirPng(imagen) {
  const trozo = (tipo, datos) => {
    const largo = Buffer.alloc(4);
    largo.writeUInt32BE(datos.length);
    const cuerpo = Buffer.concat([Buffer.from(tipo, 'ascii'), datos]);
    const suma = Buffer.alloc(4);
    suma.writeUInt32BE(crc(cuerpo));
    return Buffer.concat([largo, cuerpo, suma]);
  };

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(imagen.ancho, 0);
  ihdr.writeUInt32BE(imagen.alto, 4);
  ihdr[8] = 8; // bits por canal
  ihdr[9] = 6; // RGBA
  // 10, 11 y 12 quedan a cero: compresión, filtro y entrelazado estándar.

  const porFila = imagen.ancho * 4;
  const crudo = Buffer.alloc(imagen.alto * (porFila + 1));
  for (let y = 0; y < imagen.alto; y++) {
    const desde = y * (porFila + 1);
    crudo[desde] = 0; // «sin filtro»
    Buffer.from(imagen.pixeles.buffer, y * porFila, porFila).copy(crudo, desde + 1);
  }

  return Buffer.concat([
    Buffer.from(FIRMA),
    trozo('IHDR', ihdr),
    trozo('IDAT', deflateSync(crudo, { level: 9 })),
    trozo('IEND', Buffer.alloc(0)),
  ]);
}

// ── Reducir ───────────────────────────────────────────────────────────────────

/**
 * Reduce una imagen promediando cada bloque de píxeles de origen.
 *
 * No es el mejor remuestreo que existe, pero para **reducir** es el correcto: al
 * quedarse con la media de todos los píxeles que caen en el destino, no se pierde
 * detalle ni salen dientes de sierra, que es lo que pasa al coger uno de cada N.
 *
 * El color se promedia **multiplicado por su transparencia**, o los bordes de una
 * figura sobre fondo transparente se rodean de un halo del color de la nada.
 */
export function reducir(imagen, ancho, alto) {
  const salida = lienzo(ancho, alto);
  const escalaX = imagen.ancho / ancho;
  const escalaY = imagen.alto / alto;

  for (let y = 0; y < alto; y++) {
    const desdeY = Math.floor(y * escalaY);
    const hastaY = Math.max(desdeY + 1, Math.floor((y + 1) * escalaY));

    for (let x = 0; x < ancho; x++) {
      const desdeX = Math.floor(x * escalaX);
      const hastaX = Math.max(desdeX + 1, Math.floor((x + 1) * escalaX));

      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      let cuantos = 0;

      for (let oy = desdeY; oy < hastaY; oy++) {
        for (let ox = desdeX; ox < hastaX; ox++) {
          const i = (oy * imagen.ancho + ox) * 4;
          const alfa = imagen.pixeles[i + 3] / 255;
          r += imagen.pixeles[i] * alfa;
          g += imagen.pixeles[i + 1] * alfa;
          b += imagen.pixeles[i + 2] * alfa;
          a += alfa;
          cuantos++;
        }
      }

      const destino = (y * ancho + x) * 4;
      const media = a / cuantos;
      salida.pixeles[destino] = a > 0 ? Math.trunc(r / a + 0.5) : 0;
      salida.pixeles[destino + 1] = a > 0 ? Math.trunc(g / a + 0.5) : 0;
      salida.pixeles[destino + 2] = a > 0 ? Math.trunc(b / a + 0.5) : 0;
      salida.pixeles[destino + 3] = Math.trunc(media * 255 + 0.5);
    }
  }

  return salida;
}

/** Recorta lo transparente de alrededor. Devuelve la misma imagen si no sobra nada. */
export function recortar(imagen) {
  let x0 = imagen.ancho;
  let y0 = imagen.alto;
  let x1 = -1;
  let y1 = -1;

  for (let y = 0; y < imagen.alto; y++) {
    for (let x = 0; x < imagen.ancho; x++) {
      if (imagen.pixeles[(y * imagen.ancho + x) * 4 + 3] <= 8) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }

  if (x1 < 0) return imagen;

  const salida = lienzo(x1 - x0 + 1, y1 - y0 + 1);
  for (let y = 0; y < salida.alto; y++) {
    for (let x = 0; x < salida.ancho; x++) {
      const origen = ((y + y0) * imagen.ancho + (x + x0)) * 4;
      const destino = (y * salida.ancho + x) * 4;
      for (let c = 0; c < 4; c++) salida.pixeles[destino + c] = imagen.pixeles[origen + c];
    }
  }

  return salida;
}
