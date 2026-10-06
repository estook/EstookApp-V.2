import { FalloDeAplicacion } from './contrato.ts';

/**
 * Lo que llega como fichero dentro de un comando: el logo (M5) y las fotos de
 * producto (entrega V).
 *
 * La API no tiene una ruta de subida: los ficheros viajan en base64 dentro del
 * JSON, y la razón está contada en `comandos/marca.ts`. Esto es lo que los dos
 * comparten, en un solo sitio, para que una foto y un logo se lean igual.
 */

/**
 * De base64 a bytes, sin librerías.
 *
 * `atob` existe igual en Node, en Deno y en el navegador, que es la misma razón
 * por la que las contraseñas se derivan con `crypto.subtle` (decisión 0010).
 */
export function decodificar(base64: string, campo = 'contenido'): Uint8Array {
  const limpio = base64.replace(/^data:[^;]+;base64,/, '');
  let binario: string;
  try {
    binario = atob(limpio);
  } catch {
    throw new FalloDeAplicacion('faltan_datos', {
      campos: [campo],
      porque: 'Ese fichero no ha llegado entero. Vuelve a intentarlo.',
    });
  }

  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
  return bytes;
}

/**
 * Si los bytes son de verdad lo que dicen ser, mirando **sus primeros bytes**.
 *
 * El tipo lo manda quien llama, y quien llama a la API a pelo puede decir
 * `image/webp` y mandar cualquier cosa. El almacén lo guardaría con ese tipo y
 * acabaría pintándose en la lista de productos de todo el equipo. Cada formato
 * empieza por su firma: JPG por `FF D8 FF`, WebP por `RIFF····WEBP`, PNG por su
 * cabecera de ocho bytes.
 */
export function esDeVerdadDeEseTipo(bytes: Uint8Array, tipo: string): boolean {
  const empieza = (...firma: readonly number[]) => firma.every((b, i) => bytes[i] === b);

  if (tipo === 'image/jpeg') return bytes.length > 3 && empieza(0xff, 0xd8, 0xff);
  if (tipo === 'image/png') {
    return bytes.length > 8 && empieza(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
  }
  if (tipo === 'image/webp') {
    const riff = empieza(0x52, 0x49, 0x46, 0x46);
    const webp = bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
    return bytes.length > 12 && riff && webp;
  }
  // Lo del chat (C1 · 0073): documentos y notas de voz.
  if (tipo === 'application/pdf') return bytes.length > 4 && empieza(0x25, 0x50, 0x44, 0x46);
  // Word y Excel son un ZIP por dentro: empiezan por `PK\x03\x04`.
  if (
    tipo === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    tipo === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ) {
    return bytes.length > 4 && empieza(0x50, 0x4b, 0x03, 0x04);
  }
  if (tipo === 'audio/webm') return bytes.length > 4 && empieza(0x1a, 0x45, 0xdf, 0xa3);
  if (tipo === 'audio/ogg') return bytes.length > 4 && empieza(0x4f, 0x67, 0x67, 0x53);
  // MP4 (la voz del iPhone): `ftyp` a partir del cuarto byte.
  if (tipo === 'audio/mp4') {
    return (
      bytes.length > 8 &&
      bytes[4] === 0x66 &&
      bytes[5] === 0x74 &&
      bytes[6] === 0x79 &&
      bytes[7] === 0x70
    );
  }
  return false;
}
