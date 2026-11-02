/**
 * **Los PIN y Aparatos** (T5 · 2 · 2 · 2, decisión 0124; Anexo 3.4): sin internet, **la caja
 * comprueba el PIN de cualquiera del local**, como lo haría Estook. Aquí, lo que comparten la
 * API, la caja y los aparatos: quién es cada persona para la caja, cómo se comprueba un PIN
 * con las huellas del local, y cómo dice cada aparato si llega a la caja.
 *
 * La caja guarda **las huellas** que guarda Estook (PBKDF2 con la sal del local y 210.000
 * vueltas), nunca un PIN, y en su disco cifradas con la cuenta de Windows. A un móvil no se le
 * dan nunca: un PIN de seis cifras se adivina probando el millón en un ordenador.
 */

export type EstadoDelFichajeEnLaCaja = 'fuera' | 'dentro' | 'en_pausa';

/** Quién es cada persona del local para la caja de centro: lo que da la API con internet. */
export interface PersonaDelCentro {
  readonly id: string;
  /** «Ana G.», como en fichar. */
  readonly nombre: string;
  readonly iniciales: string;
  /** La huella de su PIN en este local, tal cual la guarda Estook. */
  readonly huella: string;
  /** Hasta cuándo está parado su PIN por fallarlo (ISO), o nulo. */
  readonly paradoHasta: string | null;
  readonly permisos: Readonly<Record<string, 'ver' | 'ver_y_editar'>>;
  readonly fichaje: EstadoDelFichajeEnLaCaja;
  /** Desde cuándo está dentro o en pausa (ISO). */
  readonly desde: string | null;
}

export interface LosPinDelCentro {
  readonly pausasEnUso: boolean;
  readonly personas: readonly PersonaDelCentro[];
}

// ── Comprobar un PIN ─────────────────────────────────────────────────────────

const ALGORITMO = 'pbkdf2-sha256';

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

interface HuellaLeida {
  readonly vueltas: number;
  readonly sal: string;
  readonly resultado: string;
}

function leerLaHuella(huella: string): HuellaLeida | null {
  const trozos = huella.split('$');
  if (trozos.length !== 4 || trozos[0] !== ALGORITMO) return null;
  const vueltas = Number(trozos[1]);
  const sal = trozos[2] ?? '';
  const resultado = trozos[3] ?? '';
  if (!Number.isInteger(vueltas) || vueltas < 1 || vueltas > 10_000_000) return null;
  if (sal === '' || resultado === '') return null;
  return { vueltas, sal, resultado };
}

async function derivar(pin: string, sal: string, vueltas: number): Promise<string> {
  const llave = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(pin),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: deBase64Url(sal), iterations: vueltas, hash: 'SHA-256' },
    llave,
    256,
  );
  return aBase64Url(new Uint8Array(bits));
}

/** Sin decir cuánto se ha acercado: recorre siempre las dos enteras. */
function sonIguales(uno: string, otro: string): boolean {
  const largo = Math.max(uno.length, otro.length);
  let diferencia = uno.length ^ otro.length;
  for (let i = 0; i < largo; i += 1) {
    diferencia |= (uno.charCodeAt(i) || 0) ^ (otro.charCodeAt(i) || 0);
  }
  return diferencia === 0;
}

/**
 * **De quién es este PIN**, entre las personas del local; nula si de nadie. Todas las huellas
 * de un local llevan su misma sal, así que se deriva una vez (no una por persona): tarda lo
 * mismo diga quien diga, y lo mismo que en Estook.
 */
export async function deQuienEsElPin<P extends Pick<PersonaDelCentro, 'huella'>>(
  pin: string,
  personas: readonly P[],
): Promise<P | null> {
  if (!/^[0-9]{6}$/.test(pin)) return null;
  const derivadas = new Map<string, string>();
  let encontrada: P | null = null;
  for (const persona of personas) {
    const leida = leerLaHuella(persona.huella);
    if (leida === null) continue;
    const clave = `${String(leida.vueltas)}$${leida.sal}`;
    let derivada = derivadas.get(clave);
    if (derivada === undefined) {
      derivada = await derivar(pin, leida.sal, leida.vueltas);
      derivadas.set(clave, derivada);
    }
    if (sonIguales(derivada, leida.resultado) && encontrada === null) encontrada = persona;
  }
  return encontrada;
}

// ── Cómo llega cada aparato a la caja ────────────────────────────────────────

export const SISTEMAS_DEL_APARATO = ['android', 'ios', 'windows', 'otro'] as const;
export type SistemaDelAparato = (typeof SISTEMAS_DEL_APARATO)[number];

/**
 * Cómo llega un aparato a la caja, según él mismo, cada minuto (maquetas de T5 · 2, sección 3,
 * y de la caja de centro, sección 1):
 *
 *   · `llega`           contesta la caja por el wifi del local
 *   · `no_llega`        la caja no contesta (apagada, otra red, Windows no la deja escuchar)
 *   · `con_datos`       va con datos móviles: si se va internet, no llega
 *   · `sin_permiso`     Chrome aún no ha dado el permiso de red local
 *   · `bloqueado`       alguien tocó «Bloquear» en Chrome
 *   · `guarda_lo_suyo`  un iPhone o un iPad: Safari no deja hablar con la caja
 */
export const CAMINOS_AL_CENTRO = [
  'llega',
  'no_llega',
  'con_datos',
  'sin_permiso',
  'bloqueado',
  'guarda_lo_suyo',
] as const;
export type CaminoAlCentro = (typeof CAMINOS_AL_CENTRO)[number];

/** Sigue sin internet: llega a la caja, o guarda lo suyo y lo sube al volver. */
export function sigueSinInternet(camino: CaminoAlCentro | null): boolean {
  return camino === 'llega' || camino === 'guarda_lo_suyo';
}

/** Qué es el aparato, por lo que dice su navegador. */
export function elSistemaDe(agente: string, puntosTactiles = 0): SistemaDelAparato {
  if (/android/i.test(agente)) return 'android';
  // El iPad de ahora dice ser un Mac: se le reconoce por la pantalla táctil.
  if (/iphone|ipad|ipod/i.test(agente) || (/macintosh/i.test(agente) && puntosTactiles > 1)) {
    return 'ios';
  }
  if (/windows/i.test(agente)) return 'windows';
  return 'otro';
}
