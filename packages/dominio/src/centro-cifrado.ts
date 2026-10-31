/**
 * **Lo que viaja por el wifi del local, cifrado** (T5 · 2 · 2, decisión 0123).
 *
 * Sin internet, el comandero y la pantalla de cocina hablan con la caja en http por la red del
 * local: no hay certificado para una dirección privada. Así que **cada mensaje va en un sobre
 * cerrado** (AES-GCM) con una clave que solo tienen ese aparato y la caja:
 *
 *   · **La clave de cada aparato** sale de la huella de la llave de la caja y del id del
 *     aparato. Estook la calcula con la huella que guarda y se la da al aparato con internet;
 *     la caja, con su propia llave, la calcula sin preguntar a nadie. Volver a vincular la caja
 *     cambia todas las claves.
 *   · **El id del aparato va pegado al sobre**: cambiarlo rompe el sobre. Así la caja sabe de
 *     quién es sin fiarse de lo que diga.
 *   · Un wifi abierto ve que hay tráfico, no lo que lleva; y no puede escribir lo que la caja
 *     imprime.
 *
 * Funciona igual en el navegador, en el servidor y en la caja para Windows (`crypto.subtle`).
 */

const VERSION_DEL_SOBRE = 1;

function aBase64Url(bytes: Uint8Array): string {
  let binario = '';
  for (const b of bytes) binario += String.fromCharCode(b);
  return btoa(binario).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function deBase64Url(texto: string): Uint8Array<ArrayBuffer> {
  const normal = texto.replace(/-/g, '+').replace(/_/g, '/');
  const binario = atob(normal + '='.repeat((4 - (normal.length % 4)) % 4));
  const bytes = new Uint8Array(new ArrayBuffer(binario.length));
  for (let i = 0; i < binario.length; i += 1) bytes[i] = binario.charCodeAt(i);
  return bytes;
}

const utf8 = (texto: string): Uint8Array<ArrayBuffer> => {
  const codificado = new TextEncoder().encode(texto);
  const bytes = new Uint8Array(new ArrayBuffer(codificado.length));
  bytes.set(codificado);
  return bytes;
};

/** La huella de una llave de aparato: SHA-256 en hexadecimal, la que guarda Estook. */
export async function laHuellaDeLaLlave(llave: string): Promise<string> {
  const resumen = await crypto.subtle.digest('SHA-256', utf8(llave));
  return [...new Uint8Array(resumen)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** La clave que comparten un aparato y la caja: HMAC de su id con la huella de la caja. */
export async function laClaveConLaCaja(huellaDeLaCaja: string, terminalId: string): Promise<string> {
  const llave = await crypto.subtle.importKey(
    'raw',
    utf8(huellaDeLaCaja),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const firma = await crypto.subtle.sign('HMAC', llave, utf8(`estook-centro:${terminalId}`));
  return aBase64Url(new Uint8Array(firma));
}

async function laLlaveDelSobre(clave: string) {
  const bytes = deBase64Url(clave);
  if (bytes.length !== 32) throw new Error('La clave con la caja no tiene la medida.');
  return crypto.subtle.importKey('raw', bytes, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

interface ElSobre {
  readonly v: number;
  /** El aparato que lo manda (o al que va la respuesta). */
  readonly t: string;
  /** El número de un solo uso del cifrado. */
  readonly n: string;
  readonly c: string;
}

/** Cierra lo que se manda: el texto que viaja por el wifi. */
export async function cerrarElSobre(
  clave: string,
  terminalId: string,
  cuerpo: unknown,
): Promise<string> {
  const numero = crypto.getRandomValues(new Uint8Array(new ArrayBuffer(12)));
  const cifrado = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: numero, additionalData: utf8(terminalId) },
    await laLlaveDelSobre(clave),
    utf8(JSON.stringify(cuerpo)),
  );
  const sobre: ElSobre = {
    v: VERSION_DEL_SOBRE,
    t: terminalId,
    n: aBase64Url(numero),
    c: aBase64Url(new Uint8Array(cifrado)),
  };
  return JSON.stringify(sobre);
}

function leerElSobre(texto: string): ElSobre | null {
  try {
    const leido = JSON.parse(texto) as Partial<ElSobre>;
    if (
      leido.v !== VERSION_DEL_SOBRE ||
      typeof leido.t !== 'string' ||
      !/^[0-9a-f-]{36}$/.test(leido.t) ||
      typeof leido.n !== 'string' ||
      typeof leido.c !== 'string'
    ) {
      return null;
    }
    return leido as ElSobre;
  } catch {
    return null;
  }
}

/** De quién dice ser el sobre, sin abrirlo: para saber con qué clave probar. */
export function deQuienEsElSobre(texto: string): string | null {
  return leerElSobre(texto)?.t ?? null;
}

/**
 * Abre un sobre. Nulo si no es un sobre, si no es de ese aparato o si alguien lo ha tocado:
 * quien lo recibe no tiene que distinguir por qué, solo no fiarse.
 */
export async function abrirElSobre(
  clave: string,
  texto: string,
): Promise<{ readonly terminalId: string; readonly numero: string; readonly cuerpo: unknown } | null> {
  const sobre = leerElSobre(texto);
  if (sobre === null) return null;
  try {
    const claro = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: deBase64Url(sobre.n), additionalData: utf8(sobre.t) },
      await laLlaveDelSobre(clave),
      deBase64Url(sobre.c),
    );
    return {
      terminalId: sobre.t,
      numero: sobre.n,
      cuerpo: JSON.parse(new TextDecoder().decode(claro)) as unknown,
    };
  } catch {
    return null;
  }
}
