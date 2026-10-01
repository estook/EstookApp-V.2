/**
 * El aparato del local, sin wifi (I · decisión 0070; Richi: «elige la mejor»).
 *
 * Sin conexión el PIN no se puede comprobar: su huella no sale del servidor (0068).
 * Así que el aparato **guarda lo que se teclea, cifrado** con la llave pública que le
 * dio Estook al prepararlo, y lo manda al volver la señal. En la tablet no queda
 * ningún PIN legible: solo Estook, con la privada, lo puede leer.
 *
 * Lo cifrado lleva **un número de un solo uso** dentro: si alguien copiara un cifrado
 * de la tablet y lo volviera a mandar, Estook no lo apunta dos veces.
 *
 * Y para arrancar sin wifi, el aparato recuerda lo suyo: su nombre, su local, si allí
 * se fichan las pausas y su llave pública.
 */

export interface LoDelAparato {
  readonly nombre: string;
  readonly local: string;
  readonly pausasEnUso: boolean;
  readonly clavePublica: string | null;
}

const DONDE_VIVE = 'estook.aparato-para-fichar.datos';

export function leerLoDelAparato(): LoDelAparato | null {
  try {
    const guardado = window.localStorage.getItem(DONDE_VIVE);
    if (guardado === null) return null;
    const leido = JSON.parse(guardado) as Partial<LoDelAparato>;
    if (typeof leido.nombre !== 'string' || typeof leido.local !== 'string') return null;
    return {
      nombre: leido.nombre,
      local: leido.local,
      pausasEnUso: leido.pausasEnUso !== false,
      clavePublica: typeof leido.clavePublica === 'string' ? leido.clavePublica : null,
    };
  } catch {
    return null;
  }
}

export function guardarLoDelAparato(datos: LoDelAparato | null): void {
  try {
    if (datos === null) window.localStorage.removeItem(DONDE_VIVE);
    else window.localStorage.setItem(DONDE_VIVE, JSON.stringify(datos));
  } catch {
    // Sin donde guardarlo, el aparato necesitará señal para arrancar.
  }
}

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
