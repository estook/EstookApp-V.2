/**
 * **El PIN tecleado sin conexión** (I · decisión 0070; desde T5 · 2 · 1, también Estook TPV).
 *
 * Sin conexión el PIN no se puede comprobar: su huella no sale del servidor (0068). Así que
 * el aparato **lo cifra con la llave pública** que le dio Estook y lo manda al volver la
 * señal. En el aparato no queda ningún PIN legible: solo Estook, con la privada, lo lee.
 *
 * Lo cifrado lleva **un número de un solo uso** dentro: si alguien copiara un cifrado del
 * aparato y lo volviera a mandar, Estook no lo usa dos veces.
 */

function deBase64Url(texto: string): Uint8Array<ArrayBuffer> {
  const normal = texto.replace(/-/g, '+').replace(/_/g, '/');
  const binario = atob(normal + '='.repeat((4 - (normal.length % 4)) % 4));
  const bytes = new Uint8Array(new ArrayBuffer(binario.length));
  for (let i = 0; i < binario.length; i += 1) bytes[i] = binario.charCodeAt(i);
  return bytes;
}

function aBase64Url(bytes: Uint8Array): string {
  let binario = '';
  for (const b of bytes) binario += String.fromCharCode(b);
  return btoa(binario).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** El PIN, cifrado para Estook con su número de un solo uso. */
export async function cifrarElPin(clavePublica: string, pin: string): Promise<string> {
  const llave = await crypto.subtle.importKey(
    'spki',
    deBase64Url(clavePublica),
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['encrypt'],
  );
  const numero = [...crypto.getRandomValues(new Uint8Array(16))]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  const cifrado = await crypto.subtle.encrypt(
    { name: 'RSA-OAEP' },
    llave,
    new TextEncoder().encode(JSON.stringify({ pin, n: numero })),
  );
  return aBase64Url(new Uint8Array(cifrado));
}
