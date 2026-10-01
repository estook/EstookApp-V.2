/**
 * Contrasenas, PIN y tokens de sesion (M4).
 *
 * Calculo puro: entra un texto, sale otro. No sabe que hay una base de datos
 * detras, asi que se prueba sin levantar nada, que es lo que pide la regla A4
 * para `servidor/dominio`.
 *
 * ── Por que PBKDF2 y no algo mas moderno ─────────────────────────────────────
 *
 * Argon2id o scrypt serian mejores: cuestan memoria ademas de tiempo, y eso es lo
 * que arruina un ataque con tarjetas graficas. Pero los dos exigen una
 * dependencia o un modulo nativo, y **este codigo tiene que correr en tres sitios
 * distintos**: Node (las pruebas y `bd:comprobar-api`), Deno (las Edge Functions,
 * decision 0002) y, algun dia, un trabajo programado.
 *
 * `crypto.subtle` es la unica pieza de criptografia que existe **igual** en los
 * tres, sin importar nada y sin instalar nada. PBKDF2-HMAC-SHA256 con 210.000
 * vueltas es lo que recomienda OWASP para 2023 en adelante, y los parametros
 * viajan dentro de lo guardado, asi que subirlos el dia que haga falta no
 * invalida ni una contrasena.
 *
 * Es la misma forma de decidir que la decision 0009: se elige lo que se puede
 * probar en las tres capas antes que lo que suena mejor sobre el papel.
 *
 * ── Lo que nunca se guarda ───────────────────────────────────────────────────
 *
 * Ni la contrasena, ni el PIN, ni el token. De los tres se guarda una huella que
 * no sirve para entrar. Quien se lleve la base de datos entera no se lleva una
 * sola sesion.
 */
import { LARGO_MINIMO_DE_CLAVE } from '@estook/dominio';

const ALGORITMO = 'pbkdf2-sha256';

/**
 * 210.000 vueltas · lo que OWASP recomienda para PBKDF2-HMAC-SHA256.
 *
 * En un portatil son unos 150 ms. Es lento a proposito: es lo que convierte
 * recorrer el millon de PIN posibles de un local en dias en vez de segundos.
 */
export const VUELTAS = 210_000;

/** Un PIN de seis digitos: un millon de combinaciones. */
export const DIGITOS_DEL_PIN = 6;

/**
 * Lo minimo que se le pide a una contrasena.
 *
 * El numero vive en `@estook/dominio` porque **la pantalla tambien lo necesita**
 * —para decirlo en la ayuda y para no mandar un viaje que ya sabe fallido— y las
 * aplicaciones no pueden importar de `servidor/`. Se reexporta aqui para que
 * quien lea estas reglas lo siga encontrando donde lo buscaria.
 *
 * Quien decide sigue siendo este fichero: la pantalla avisa, el servidor manda.
 */
export { LARGO_MINIMO_DE_CLAVE };

// ── Azar ─────────────────────────────────────────────────────────────────────

function bytesAlAzar(cuantos: number): Uint8Array {
  const bytes = new Uint8Array(cuantos);
  crypto.getRandomValues(bytes);
  return bytes;
}

/**
 * Base64 sin los caracteres que molestan en una direccion web ni el relleno.
 * Se usa dentro de lo guardado y en el token, que viaja en una cabecera.
 */
function aBase64Url(bytes: Uint8Array): string {
  let texto = '';
  for (const byte of bytes) texto += String.fromCharCode(byte);
  return btoa(texto).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function deBase64Url(texto: string): Uint8Array {
  const normal = texto.replace(/-/g, '+').replace(/_/g, '/');
  const crudo = atob(normal.padEnd(Math.ceil(normal.length / 4) * 4, '='));
  return Uint8Array.from(crudo, (c) => c.charCodeAt(0));
}

function aHexadecimal(bytes: Uint8Array): string {
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// ── Derivar y comprobar ──────────────────────────────────────────────────────

async function derivarBytes(
  secreto: string,
  sal: Uint8Array,
  vueltas: number,
): Promise<Uint8Array> {
  const clave = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secreto),
    'PBKDF2',
    false,
    ['deriveBits'],
  );

  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: sal, iterations: vueltas, hash: 'SHA-256' },
    clave,
    256,
  );

  return new Uint8Array(bits);
}

/**
 * Una sal nueva, para una contrasena.
 *
 * El PIN **no usa esto**: su sal es la del local, y esa es justamente la razon de
 * que «PIN unico por local» lo pueda garantizar un indice unico. Esta escrito en
 * la migracion `0018`.
 */
export function salNueva(): string {
  return aBase64Url(bytesAlAzar(16));
}

/**
 * Lo que se guarda: algoritmo, coste, sal y resultado, separados por `$`.
 *
 * Los parametros van dentro por una razon concreta: dentro de tres anos 210.000
 * vueltas seran pocas, y habra que subirlas. Con los parametros guardados, lo
 * viejo se sigue comprobando bien y lo nuevo nace mas caro. Sin ellos habria que
 * pedirle a todo el mundo que cambiara la contrasena el mismo dia.
 */
export async function derivar(secreto: string, sal: string = salNueva()): Promise<string> {
  const bytes = await derivarBytes(secreto, deBase64Url(sal), VUELTAS);
  return `${ALGORITMO}$${VUELTAS}$${sal}$${aBase64Url(bytes)}`;
}

/**
 * La misma derivacion, pero con la sal del local. Es la del PIN.
 *
 * La sal del local llega como texto hexadecimal (`estook.local.sal_del_pin`), no
 * como base64: se convierte aqui, para que quien la mire no tenga que saberlo.
 */
export async function derivarConSalDelLocal(secreto: string, salDelLocal: string): Promise<string> {
  return derivar(secreto, aBase64Url(new TextEncoder().encode(salDelLocal)));
}

/**
 * Comprueba sin decir cuanto se ha acercado.
 *
 * La comparacion es de tiempo constante: recorre los dos enteros siempre, aunque
 * el primer byte ya no cuadre. Comparar con `===` filtra, byte a byte, por
 * cuanto tarda en decir que no.
 */
export async function comprobar(secreto: string, guardado: string): Promise<boolean> {
  const trozos = guardado.split('$');
  if (trozos.length !== 4 || trozos[0] !== ALGORITMO) return false;

  const vueltas = Number(trozos[1]);
  const sal = trozos[2];
  const esperado = trozos[3];
  if (!Number.isInteger(vueltas) || vueltas < 1 || sal === undefined || esperado === undefined) {
    return false;
  }

  const bytes = await derivarBytes(secreto, deBase64Url(sal), vueltas);
  return sonIguales(aBase64Url(bytes), esperado);
}

function sonIguales(uno: string, otro: string): boolean {
  // Si el largo ya no cuadra, no hay nada que comparar; pero se compara igual
  // contra si mismo para no delatar el largo por lo que tarda.
  const largo = Math.max(uno.length, otro.length);
  let diferencia = uno.length ^ otro.length;
  for (let i = 0; i < largo; i++) {
    diferencia |= (uno.charCodeAt(i) || 0) ^ (otro.charCodeAt(i) || 0);
  }
  return diferencia === 0;
}

// ── El PIN ───────────────────────────────────────────────────────────────────

/**
 * Seis digitos al azar, **sin sesgo**.
 *
 * `bytes[0] % 10` parece lo mismo y no lo es: 256 no es multiplo de 10, asi que
 * los digitos del 0 al 5 saldrian mas veces que los del 6 al 9. Se descartan los
 * bytes que caen fuera del ultimo tramo completo y se vuelve a tirar. Con PIN de
 * seis digitos el sesgo seria pequeno, pero un generador sesgado es una de esas
 * cosas que nadie mira nunca mas.
 */
export function pinNuevo(digitos = DIGITOS_DEL_PIN): string {
  const TOPE = 250; // 25 tramos completos de 10 en 256.
  let pin = '';
  while (pin.length < digitos) {
    for (const byte of bytesAlAzar(digitos * 2)) {
      if (byte >= TOPE) continue;
      pin += String(byte % 10);
      if (pin.length === digitos) break;
    }
  }
  return pin;
}

export function esPinConForma(valor: string): boolean {
  return new RegExp(`^[0-9]{${DIGITOS_DEL_PIN}}$`).test(valor);
}

// ── El token de sesion ───────────────────────────────────────────────────────

/**
 * 256 bits de azar. No se guarda: se guarda su SHA-256.
 *
 * Y de ahi que la huella **no lleve sal ni derivacion lenta**: con 256 bits no
 * hay diccionario que recorrer, asi que derivar despacio solo haria lenta cada
 * peticion sin proteger de nada.
 */
export function tokenNuevo(): string {
  return aBase64Url(bytesAlAzar(32));
}

export async function huellaDeToken(token: string): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return aHexadecimal(new Uint8Array(bytes));
}

// ── Que se le pide a una contrasena ──────────────────────────────────────────

/**
 * Largo y nada mas.
 *
 * Nada de «una mayuscula, un numero y un simbolo»: esas reglas producen
 * `Verano2024!` en todos los restaurantes de Espana. Diez caracteres, y que no
 * sea de la lista corta de las que se prueban primero. Es lo que recomienda el
 * NIST desde 2017 y lo unico que de verdad cambia algo.
 */
const LAS_DE_SIEMPRE = new Set([
  '1234567890',
  '0123456789',
  'contrasena',
  'contraseña',
  'password123',
  'qwertyuiop',
  'administrador',
  'estook12345',
  'restaurante',
]);

export function porQueNoValeLaClave(clave: string): string | null {
  if (clave.length < LARGO_MINIMO_DE_CLAVE) {
    return `Necesita al menos ${LARGO_MINIMO_DE_CLAVE} caracteres. No hacen falta símbolos raros: una frase corta que recuerdes vale más que «Verano2024!».`;
  }
  if (LAS_DE_SIEMPRE.has(clave.toLowerCase())) {
    return 'Esa es de las primeras que se prueban. Pon otra cosa.';
  }
  if (/^(.)\1+$/.test(clave)) {
    return 'Es el mismo carácter repetido. Pon otra cosa.';
  }
  return null;
}

// ── El PIN tecleado sin conexión (I · 0070) ─────────────────────────────────

/**
 * La llave de cifrado de un aparato del local: RSA-OAEP de 2048 bits con SHA-256.
 *
 * Sin conexión el PIN no se puede comprobar, así que el aparato lo guarda **cifrado
 * con la pública**, y solo Estook, con la privada, lo puede leer al volver la señal.
 * En la tablet no queda ningún PIN legible. Las dos van en base64url: la pública en
 * SPKI, que es lo que importa el navegador, y la privada en PKCS#8.
 */
export async function llavesDelAparato(): Promise<{ publica: string; privada: string }> {
  const par = await crypto.subtle.generateKey(
    {
      name: 'RSA-OAEP',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['encrypt', 'decrypt'],
  );
  const publica = new Uint8Array(await crypto.subtle.exportKey('spki', par.publicKey));
  const privada = new Uint8Array(await crypto.subtle.exportKey('pkcs8', par.privateKey));
  return { publica: aBase64UrlDeBytes(publica), privada: aBase64UrlDeBytes(privada) };
}

/** Lo que va cifrado: el PIN y un número de un solo uso, para que no se pueda repetir. */
export interface PinCifrado {
  readonly pin: string;
  readonly numero: string;
}

/**
 * Lee lo que cifró el aparato. **Nulo si no se puede leer** —otra llave, un cifrado
 * tocado o algo que no tiene la forma—: quien llama lo trata como un PIN que no vale.
 */
export async function descifrarElPin(privada: string, cifrado: string): Promise<PinCifrado | null> {
  try {
    const llave = await crypto.subtle.importKey(
      'pkcs8',
      copiaDeBytes(deBase64UrlABytes(privada)),
      { name: 'RSA-OAEP', hash: 'SHA-256' },
      false,
      ['decrypt'],
    );
    const claro = await crypto.subtle.decrypt(
      { name: 'RSA-OAEP' },
      llave,
      copiaDeBytes(deBase64UrlABytes(cifrado)),
    );
    const leido = JSON.parse(new TextDecoder().decode(claro)) as { pin?: unknown; n?: unknown };
    if (typeof leido.pin !== 'string' || typeof leido.n !== 'string') return null;
    if (!/^[0-9a-f]{32}$/.test(leido.n)) return null;
    return { pin: leido.pin, numero: leido.n };
  } catch {
    return null;
  }
}

function aBase64UrlDeBytes(bytes: Uint8Array): string {
  let binario = '';
  for (const b of bytes) binario += String.fromCharCode(b);
  return btoa(binario).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function deBase64UrlABytes(texto: string): Uint8Array {
  const normal = texto.replace(/-/g, '+').replace(/_/g, '/');
  const binario = atob(normal + '='.repeat((4 - (normal.length % 4)) % 4));
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i += 1) bytes[i] = binario.charCodeAt(i);
  return bytes;
}

function copiaDeBytes(bytes: Uint8Array): ArrayBuffer {
  const copia = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(copia).set(bytes);
  return copia;
}
