/**
 * El segundo factor (M4).
 *
 * «Doble factor disponible y **exigible desde la organizacion**» (Manifiesto 28).
 *
 * TOTP, que es el de las aplicaciones de autenticacion: seis digitos que cambian
 * cada treinta segundos. Se elige eso y no el codigo por SMS por tres razones, y
 * las tres pesan en hosteleria:
 *
 *   · **No cuesta dinero.** Un SMS por cada entrada de cada persona de cada local
 *     sale mas caro que servir el local entero (Manifiesto 29: 4,02 € al mes).
 *   · **Funciona sin cobertura.** El codigo lo calcula el telefono, no lo recibe.
 *     Media cocina de Espana no tiene linea.
 *   · **No hay que pedir el numero de nadie.** Un dato personal menos que guardar.
 *
 * Como todo lo de M4, esta escrito con `crypto.subtle` y sin dependencias: tiene
 * que correr igual en Node y en Deno.
 *
 * TOTP usa HMAC-SHA1. **No es un descuido**: lo fija el RFC 6238, y lo que hace
 * seguro a TOTP no es el resumen sino que el secreto solo lo conocen dos partes y
 * el codigo dura treinta segundos. Todas las aplicaciones de autenticacion que la
 * gente tiene instalada hablan SHA-1; usar SHA-256 dejaria a la mitad fuera.
 */

/** Lo que dura un codigo. Los treinta segundos del RFC, que es lo que todos usan. */
export const SEGUNDOS_POR_CODIGO = 30;

/** Digitos del codigo. Seis, como en todas partes. */
export const DIGITOS = 6;

/**
 * Cuantos tramos de treinta segundos se aceptan hacia atras y hacia delante.
 *
 * Uno: hasta treinta segundos de desfase entre el reloj del telefono y el
 * nuestro. Sin esta ventana, un telefono con el reloj mal puesto no entra nunca;
 * con una ventana mas ancha, un codigo interceptado vale demasiado tiempo.
 */
export const VENTANA = 1;

const ALFABETO_BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * Una letra del alfabeto, por su posicion.
 *
 * El indice siempre cae dentro —las mascaras de abajo lo garantizan— pero el
 * compilador no lo sabe, y tiene razon en no saberlo: `noUncheckedIndexedAccess`
 * esta puesto justamente para que nadie de por hecho que un indice existe. Se
 * dice aqui una vez, en vez de callar al compilador en cuatro sitios.
 */
function letra(alfabeto: string, posicion: number): string {
  return alfabeto[posicion % alfabeto.length] ?? '';
}

// ── Base32, que es lo que leen las aplicaciones de autenticacion ─────────────

export function aBase32(bytes: Uint8Array): string {
  let bits = 0;
  let valor = 0;
  let salida = '';

  for (const byte of bytes) {
    valor = (valor << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      salida += letra(ALFABETO_BASE32, (valor >>> (bits - 5)) & 31);
      bits -= 5;
    }
  }
  if (bits > 0) salida += letra(ALFABETO_BASE32, (valor << (5 - bits)) & 31);

  return salida;
}

export function deBase32(texto: string): Uint8Array {
  const limpio = texto.toUpperCase().replace(/[^A-Z2-7]/g, '');
  const bytes: number[] = [];
  let bits = 0;
  let valor = 0;

  for (const letra of limpio) {
    const indice = ALFABETO_BASE32.indexOf(letra);
    if (indice < 0) continue;
    valor = (valor << 5) | indice;
    bits += 5;
    if (bits >= 8) {
      bytes.push((valor >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return new Uint8Array(bytes);
}

// ── El secreto ───────────────────────────────────────────────────────────────

/**
 * 160 bits, que es lo que pide el RFC 4226 y lo que espera cualquier aplicacion
 * de autenticacion. Salen 32 caracteres de base32.
 */
export function secretoNuevo(): string {
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  return aBase32(bytes);
}

/**
 * La direccion que se mete en la aplicacion de autenticacion.
 *
 * Se ensena tal cual, en texto, y **tambien** el secreto en grupos de cuatro para
 * teclearlo a mano. Un codigo QR haria falta una libreria de dibujo entera para
 * ahorrar veinte segundos una vez en la vida; cuando la carta digital traiga la
 * suya (M11), esta pantalla la reutiliza.
 */
export function enlaceDeAlta(secreto: string, correo: string): string {
  const cuenta = encodeURIComponent(`Estook:${correo}`);
  const parametros = new URLSearchParams({
    secret: secreto,
    issuer: 'Estook',
    algorithm: 'SHA1',
    digits: String(DIGITOS),
    period: String(SEGUNDOS_POR_CODIGO),
  });
  return `otpauth://totp/${cuenta}?${parametros.toString()}`;
}

/** El secreto en grupos de cuatro, para poder dictarlo por telefono sin perderse. */
export function secretoParaTeclear(secreto: string): string {
  return (secreto.match(/.{1,4}/g) ?? []).join(' ');
}

// ── El codigo ────────────────────────────────────────────────────────────────

async function codigoDelTramo(secreto: string, tramo: number): Promise<string> {
  // El contador va en ocho bytes, el mas significativo primero (RFC 4226).
  const contador = new Uint8Array(8);
  let resto = tramo;
  for (let i = 7; i >= 0; i--) {
    contador[i] = resto & 255;
    resto = Math.floor(resto / 256);
  }

  const clave = await crypto.subtle.importKey(
    'raw',
    deBase32(secreto),
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign'],
  );

  const firma = new Uint8Array(await crypto.subtle.sign('HMAC', clave, contador));

  // Truncado dinamico: los cuatro ultimos bits dicen por donde cortar.
  const desde = (firma[19] ?? 0) & 15;
  const numero =
    (((firma[desde] ?? 0) & 127) << 24) |
    (((firma[desde + 1] ?? 0) & 255) << 16) |
    (((firma[desde + 2] ?? 0) & 255) << 8) |
    ((firma[desde + 3] ?? 0) & 255);

  return String(numero % 10 ** DIGITOS).padStart(DIGITOS, '0');
}

/** El codigo que toca ahora mismo. El instante lo pone el servidor (regla 10). */
export function codigoEn(secreto: string, instante: Date): Promise<string> {
  return codigoDelTramo(secreto, Math.floor(instante.getTime() / 1000 / SEGUNDOS_POR_CODIGO));
}

/**
 * Comprueba un codigo, aceptando el tramo de antes y el de despues.
 *
 * Recorre los tres siempre, aunque el primero ya acierte: si parara al acertar,
 * lo que tarda en contestar diria en que tramo estaba el codigo.
 */
export async function comprobarCodigo(
  secreto: string,
  codigo: string,
  instante: Date,
): Promise<boolean> {
  const limpio = codigo.replace(/[^0-9]/g, '');
  if (limpio.length !== DIGITOS) return false;

  const ahora = Math.floor(instante.getTime() / 1000 / SEGUNDOS_POR_CODIGO);
  let acierta = false;

  for (let salto = -VENTANA; salto <= VENTANA; salto++) {
    const esperado = await codigoDelTramo(secreto, ahora + salto);
    let diferencia = 0;
    for (let i = 0; i < DIGITOS; i++) {
      diferencia |= esperado.charCodeAt(i) ^ limpio.charCodeAt(i);
    }
    if (diferencia === 0) acierta = true;
  }

  return acierta;
}

// ── Codigos de respaldo ──────────────────────────────────────────────────────

/**
 * Para cuando se pierde el telefono, que en hosteleria pasa.
 *
 * Ocho codigos de diez caracteres, de un alfabeto sin las letras que se confunden
 * al dictarlas (`I`, `O`, `0`, `1`). Se ensenan **una sola vez** al activar y se
 * guardan derivados, como las contrasenas: si se pierden, se generan otros.
 */
const ALFABETO_DE_RESPALDO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export const CUANTOS_DE_RESPALDO = 8;

export function codigosDeRespaldo(cuantos = CUANTOS_DE_RESPALDO): string[] {
  const salida: string[] = [];
  for (let i = 0; i < cuantos; i++) {
    const bytes = new Uint8Array(10);
    crypto.getRandomValues(bytes);
    let codigo = '';
    for (const byte of bytes) codigo += letra(ALFABETO_DE_RESPALDO, byte);
    salida.push(`${codigo.slice(0, 5)}-${codigo.slice(5)}`);
  }
  return salida;
}
