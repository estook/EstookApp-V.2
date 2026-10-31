import {
  PUERTO_DEL_CENTRO,
  abrirElSobre,
  cerrarElSobre,
  esDireccionDelLocal,
  type LoQueSePasaPorLaCaja,
  type LoQueTieneLaCaja,
} from '@estook/dominio';
import { laCajaParaWindows } from '../datos/laCajaParaWindows.ts';
import { laCola, loQueFaltaPasar, marcarEnLaCaja } from './laCola.ts';

/**
 * **Hablar con la caja por el wifi del local** (T5 · 2 · 2, decisión 0123): sin internet, lo que
 * se manda a cocina llega a la caja para Windows, que lo imprime y se lo da a la pantalla de
 * cocina. Con internet no se usa: todo va a Estook como siempre.
 *
 *   · **Dónde está y con qué clave** lo dice el latido mientras hay internet, y se guarda con lo
 *     del aparato (`laCopia`). Dentro de la propia caja, se le habla por dentro (127.0.0.1).
 *   · **Todo va en un sobre cerrado** (`centro-cifrado.ts`): en el wifi no se lee ni se cambia.
 *   · **Chrome pide permiso una vez** para hablar con la red del local (Local Network Access).
 *     Antes de pedirlo, la sala explica por qué (maqueta de T5 · 2, sección 3). Un iPhone no
 *     deja: Safari no habla en http con el wifi desde una web segura. Ahí se guarda en el
 *     aparato, como en T5 · 2 · 1.
 */

export interface LaCajaDelAparato {
  readonly direcciones: readonly string[];
  readonly clave: string;
}

/** Lo que Chrome dice del permiso de red local; «no_hay» si el navegador no lo tiene. */
export type ElPermiso = 'concedido' | 'por_pedir' | 'bloqueado' | 'no_hay';

const ESPERA_MS = 2500;

type Escucha = () => void;
const escuchas = new Set<Escucha>();
let laCaja: (LaCajaDelAparato & { readonly terminalId: string }) | null = null;
let llega: boolean | null = null;
let laBuena: string | null = null;

function avisar(): void {
  for (const escucha of escuchas) escucha();
}

export function escucharLaCaja(escucha: Escucha): () => void {
  escuchas.add(escucha);
  return () => {
    escuchas.delete(escucha);
  };
}

/** Lo dice el latido (o lo guardado, sin internet). Nula si el local no tiene caja de centro. */
export function conocerLaCaja(caja: LaCajaDelAparato | null | undefined, terminalId: string): void {
  const nueva = caja === null || caja === undefined ? null : { ...caja, terminalId };
  if (JSON.stringify(nueva) === JSON.stringify(laCaja)) return;
  laCaja = nueva;
  if (nueva === null) llega = null;
  avisar();
}

export function hayCaja(): boolean {
  return laCaja !== null;
}

/** Si la última vez se llegó a la caja; nulo si aún no se ha probado. */
export function llegamosALaCaja(): boolean | null {
  return llega;
}

function marcar(si: boolean): void {
  if (llega === si) return;
  llega = si;
  avisar();
}

/** Por dónde probar: dentro de la caja, por dentro; si no, la que contestó la última vez primero. */
function lasDirecciones(): string[] {
  if (laCaja === null) return [];
  if (laCajaParaWindows() !== null) return [`127.0.0.1:${String(PUERTO_DEL_CENTRO)}`];
  const todas = laCaja.direcciones.filter(esDireccionDelLocal);
  return laBuena !== null && todas.includes(laBuena)
    ? [laBuena, ...todas.filter((d) => d !== laBuena)]
    : todas;
}

async function conEspera(direccion: string, sobre: string): Promise<string | null> {
  const parar = new AbortController();
  const reloj = window.setTimeout(() => {
    parar.abort();
  }, ESPERA_MS);
  try {
    const opciones: RequestInit & { targetAddressSpace?: string } = {
      method: 'POST',
      body: sobre,
      // Texto plano: sin pregunta previa del navegador, y la caja contesta igual.
      headers: { 'content-type': 'text/plain' },
      signal: parar.signal,
      cache: 'no-store',
      ...(direccion.startsWith('127.') ? {} : { targetAddressSpace: 'local' }),
    };
    const respuesta = await fetch(`http://${direccion}/`, opciones);
    return respuesta.ok ? await respuesta.text() : null;
  } catch {
    return null;
  } finally {
    window.clearTimeout(reloj);
  }
}

/** Le manda algo a la caja y abre lo que contesta. Nulo si no se llega o no se abre. */
async function hablar(cuerpo: unknown): Promise<Record<string, unknown> | null> {
  const caja = laCaja;
  if (caja === null) return null;
  for (const direccion of lasDirecciones()) {
    const sobre = await cerrarElSobre(caja.clave, caja.terminalId, cuerpo);
    const texto = await conEspera(direccion, sobre);
    if (texto === null) continue;
    const abierto = await abrirElSobre(caja.clave, texto);
    if (abierto === null || typeof abierto.cuerpo !== 'object' || abierto.cuerpo === null) continue;
    laBuena = direccion;
    marcar(true);
    return abierto.cuerpo as Record<string, unknown>;
  }
  marcar(false);
  return null;
}

/** «¿Estás ahí?», con sobre: si contesta, la caja es la nuestra y la clave vale. */
export async function probarLaCaja(): Promise<boolean> {
  const dice = await hablar({ que: 'hola' });
  return dice?.['ok'] === true;
}

/** Lo mandado sin internet, a la caja: sale en cocina. Verdadero si lo tiene. */
export async function pasarALaCaja(lo: LoQueSePasaPorLaCaja): Promise<boolean> {
  const dice = await hablar({ que: 'pasar', lo });
  return dice?.['ok'] === true;
}

/** Para la pantalla de cocina: lo que ha llegado a la caja sin internet. Nulo si no se llega. */
export async function loQueTieneLaCaja(): Promise<readonly LoQueTieneLaCaja[] | null> {
  const dice = await hablar({ que: 'la_cocina' });
  if (dice?.['ok'] !== true || !Array.isArray(dice['llegado'])) return null;
  return dice['llegado'] as LoQueTieneLaCaja[];
}

// ── El permiso de Chrome ─────────────────────────────────────────────────────

/**
 * Lo que dice Chrome del permiso de red local. Se llamó «local-network-access» y desde Chrome
 * 146 se parte en «local-network»: se prueban los dos. Fuera de Chrome, no hay permiso que pedir.
 */
export async function elPermisoDeChrome(): Promise<ElPermiso> {
  if (laCajaParaWindows() !== null || typeof navigator === 'undefined') return 'no_hay';
  for (const nombre of ['local-network', 'local-network-access']) {
    try {
      const estado = await navigator.permissions.query({ name: nombre as PermissionName });
      if (estado.state === 'granted') return 'concedido';
      if (estado.state === 'denied') return 'bloqueado';
      return 'por_pedir';
    } catch {
      // Este navegador no conoce ese nombre: se prueba el siguiente.
    }
  }
  return 'no_hay';
}

/** Si el aparato va con datos móviles (Chrome en Android lo dice; los demás, no). */
export function vaConDatos(): boolean {
  const conexion = (navigator as Navigator & { connection?: { type?: string } }).connection;
  return conexion?.type === 'cellular';
}

// ── Pasar a la caja lo que falta ─────────────────────────────────────────────

let pasando: Promise<void> | null = null;

/**
 * **Lo mandado sin internet, a la caja**, en su orden y una cosa detrás de otra. Si no se llega,
 * se para y se intenta en la siguiente: lo de después no se adelanta a lo de antes.
 */
export function pasarLoQueFalta(): Promise<void> {
  if (pasando !== null) return pasando;
  if (laCaja === null || loQueFaltaPasar(laCola()).length === 0) return Promise.resolve();
  pasando = (async () => {
    try {
      for (const cosa of loQueFaltaPasar(laCola())) {
        if (cosa.paraLaCaja === undefined) continue;
        if (!(await pasarALaCaja(cosa.paraLaCaja))) return;
        marcarEnLaCaja(cosa.id);
      }
    } finally {
      pasando = null;
    }
  })();
  return pasando;
}
