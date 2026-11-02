import {
  PUERTO_DEL_CENTRO,
  abrirElSobre,
  cerrarElSobre,
  elSistemaDe,
  esDireccionDelLocal,
  type CaminoAlCentro,
  type EstadoDelFichajeEnLaCaja,
  type LoQueSePasaPorLaCaja,
  type LoQueTieneLaCaja,
  type SistemaDelAparato,
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

// ── El PIN de cualquiera, y fichar (T5 · 2 · 2 · 2, 0124) ────────────────────

/** Quién es, para la caja: lo que necesita el aparato para dejarle entrar o fichar sin internet. */
export interface QuienEsParaLaCaja {
  readonly persona: { readonly id: string; readonly nombre: string; readonly iniciales: string };
  readonly permisos: Readonly<Record<string, 'ver' | 'ver_y_editar'>>;
  readonly fichaje: EstadoDelFichajeEnLaCaja;
  readonly desde: string | null;
  readonly pausasEnUso: boolean;
  readonly companeros: readonly { readonly id: string; readonly nombre: string }[];
}

/**
 * Lo que contesta la caja a un PIN:
 *
 *   · `no_llega`             no se llega a la caja (o el local no tiene)
 *   · `sin_personas`         la caja aún no sabe quién es cada uno (no ha tenido internet)
 *   · `pin_desconocido`      el PIN no es de nadie del local
 *   · `aparato_parado`       diez fallos seguidos desde este aparato: cinco minutos parado
 *   · `demasiados_intentos`  ese PIN está parado en Estook por fallarlo
 *   · `no_toca`              al fichar: eso no toca ahora (entrar estando dentro)
 */
export type LoQueDiceLaCaja =
  | ({ readonly ok: true } & QuienEsParaLaCaja)
  | {
      readonly ok: false;
      readonly porque:
        | 'no_llega'
        | 'sin_personas'
        | 'pin_desconocido'
        | 'aparato_parado'
        | 'demasiados_intentos'
        | 'no_toca'
        | 'sin_permiso';
      readonly quien?: QuienEsParaLaCaja;
    };

const LO_QUE_PUEDE_DECIR = new Set([
  'sin_personas',
  'pin_desconocido',
  'aparato_parado',
  'demasiados_intentos',
  'no_toca',
  'sin_permiso',
]);

function comoLoDice(dice: Record<string, unknown> | null): LoQueDiceLaCaja {
  if (dice === null) return { ok: false, porque: 'no_llega' };
  const tieneQuien =
    typeof dice['persona'] === 'object' &&
    dice['persona'] !== null &&
    Array.isArray(dice['companeros']);
  const quien = tieneQuien ? (dice as unknown as QuienEsParaLaCaja) : undefined;
  if (dice['ok'] === true && quien !== undefined) return { ok: true, ...quien };
  const porque = dice['porque'];
  return {
    ok: false,
    porque:
      typeof porque === 'string' && LO_QUE_PUEDE_DECIR.has(porque)
        ? (porque as Exclude<LoQueDiceLaCaja, { ok: true }>['porque'])
        : 'pin_desconocido',
    ...(quien === undefined ? {} : { quien }),
  };
}

/** **Entrar sin internet con el PIN de cualquiera**: lo comprueba la caja. */
export async function elPinPorLaCaja(pin: string): Promise<LoQueDiceLaCaja> {
  if (laCaja === null) return { ok: false, porque: 'no_llega' };
  return comoLoDice(await hablar({ que: 'pin', pin }));
}

/** **Fichar sin internet**, en la propia caja: la caja comprueba el PIN y lo apunta. */
export async function ficharPorLaCaja(
  pin: string,
  accion: 'entrada' | 'pausa' | 'vuelta' | 'salida',
): Promise<LoQueDiceLaCaja> {
  if (laCaja === null) return { ok: false, porque: 'no_llega' };
  return comoLoDice(await hablar({ que: 'fichar', pin, accion }));
}

// ── Cómo llega este aparato, para Aparatos ───────────────────────────────────

/** Qué es este aparato, para «Android · comandero». */
export function esteSistema(): SistemaDelAparato {
  if (typeof navigator === 'undefined') return 'otro';
  return elSistemaDe(navigator.userAgent, navigator.maxTouchPoints);
}

/**
 * **Cómo llega este aparato a la caja**, para su latido (maquetas de T5 · 2, sección 3, y de la
 * caja de centro, sección 1). Nulo si no hay caja que alcanzar, o si aún no se ha probado: lo que
 * no se sabe no se dice. La propia caja no lo dice: es el centro.
 */
export async function elCaminoAlCentro(): Promise<CaminoAlCentro | null> {
  if (laCaja === null || laCajaParaWindows() !== null) return null;
  if (esteSistema() === 'ios') return 'guarda_lo_suyo';
  const permiso = await elPermisoDeChrome();
  if (permiso === 'bloqueado') return 'bloqueado';
  if (permiso === 'por_pedir') return 'sin_permiso';
  if (vaConDatos()) return 'con_datos';
  return llega === null ? null : llega ? 'llega' : 'no_llega';
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
