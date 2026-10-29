import type { DentroDelTpv, YoEnElTpv } from '../datos/tipos.ts';

/**
 * **Quién ha entrado hoy en este aparato**, para que vuelva a entrar sin internet (T5 · 2 · 1,
 * Anexo 3.4): sin nube y sin la caja, **solo entra quien ya entró ese día en ese aparato**.
 *
 * Del PIN se guarda **una huella lenta** (PBKDF2, cien mil vueltas, con su sal), nunca el PIN,
 * y solo de quien lo tecleó aquí, y durante un servicio largo. Sirve para saber quién es sin
 * internet; **quien lo da por bueno es Estook al volver**, con el PIN cifrado (0070). Guardar
 * las huellas de todo el local en un aparato no sería seguro: por eso solo las de hoy.
 */

const DONDE = 'estook.tpv.quien-entro-hoy';
/** Lo mismo que un turno: al día siguiente se vuelve a teclear con internet. */
const DURA_MS = 16 * 60 * 60 * 1000;
const VUELTAS = 100_000;

export interface QuienEntroHoy {
  readonly persona: DentroDelTpv['persona'];
  readonly fichaje: DentroDelTpv['fichaje'];
  /** Lo suyo (sus permisos, su local), para abrir sin internet. Nulo si aún no se leyó. */
  readonly yo: YoEnElTpv | null;
  readonly sal: string;
  readonly huella: string;
  readonly entroEn: number;
}

function todos(): readonly QuienEntroHoy[] {
  try {
    const guardados = window.localStorage.getItem(DONDE);
    if (guardados === null) return [];
    const ahora = Date.now();
    return (JSON.parse(guardados) as QuienEntroHoy[]).filter((q) => ahora - q.entroEn < DURA_MS);
  } catch {
    return [];
  }
}

function guardar(lista: readonly QuienEntroHoy[]): void {
  try {
    window.localStorage.setItem(DONDE, JSON.stringify(lista));
  } catch {
    // Sin sitio, sin internet solo seguirá quien esté dentro.
  }
}

function aHex(bytes: ArrayBuffer | Uint8Array): string {
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function deHex(texto: string): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(new ArrayBuffer(texto.length / 2));
  for (let i = 0; i < bytes.length; i += 1) bytes[i] = parseInt(texto.slice(i * 2, i * 2 + 2), 16);
  return bytes;
}

async function laHuella(pin: string, sal: string): Promise<string> {
  const llave = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(pin),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: deHex(sal), iterations: VUELTAS, hash: 'SHA-256' },
    llave,
    256,
  );
  return aHex(bits);
}

/** Entró con internet: se apunta (o se renueva) para que pueda volver a entrar sin él. */
export async function apuntarQuienEntro(pin: string, dentro: DentroDelTpv): Promise<void> {
  const sal = aHex(crypto.getRandomValues(new Uint8Array(16)));
  const huella = await laHuella(pin, sal);
  const antes = todos().find((q) => q.persona.id === dentro.persona.id);
  guardar([
    ...todos().filter((q) => q.persona.id !== dentro.persona.id),
    {
      persona: dentro.persona,
      fichaje: dentro.fichaje,
      yo: antes?.yo ?? null,
      sal,
      huella,
      entroEn: Date.now(),
    },
  ]);
}

/** Lo suyo, leído ya dentro: así, sin internet, sabe qué puede hacer. */
export function guardarSuYo(yo: YoEnElTpv): void {
  const lista = todos();
  if (!lista.some((q) => q.persona.id === yo.persona.id)) return;
  guardar(lista.map((q) => (q.persona.id === yo.persona.id ? { ...q, yo } : q)));
}

/** Sin internet: de quién es este PIN, entre los que entraron hoy aquí; nulo si de nadie. */
export async function quienEsSinInternet(pin: string): Promise<QuienEntroHoy | null> {
  for (const quien of todos()) {
    if (quien.yo !== null && (await laHuella(pin, quien.sal)) === quien.huella) return quien;
  }
  return null;
}

/** Al desvincular el aparato. */
export function olvidarATodos(): void {
  try {
    window.localStorage.removeItem(DONDE);
  } catch {
    // Nada que olvidar.
  }
}
