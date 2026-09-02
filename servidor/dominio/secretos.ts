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

/** Lo minimo que se le pide a una contrasena. */
export const LARGO_MINIMO_DE_CLAVE = 10;

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
