/**
 * Los aparatos de Estook TPV y quién los usa (T1 · La puerta, decisión 0107; Anexo
 * 11.3 y 11.4).
 *
 * Lo que tienen que decir igual la API y la pantalla: las cinco funciones, cómo se
 * escribe el token de un aparato con su operador, qué PIN es demasiado fácil, cuándo se
 * bloquea cada aparato y dónde cae quien entra. Cálculo puro: se prueba sin levantar
 * nada.
 */

// ── Las funciones ────────────────────────────────────────────────────────────

/**
 * Lo que es cada aparato, elegido al vincularlo: **nunca se adivina** (Anexo 11.3). Lo
 * que separa la caja del comandero es el cajón: una caja siempre tiene el suyo.
 */
export const FUNCIONES_DEL_APARATO = ['caja', 'comandero', 'cocina', 'barra', 'fichar'] as const;
export type FuncionDelAparato = (typeof FUNCIONES_DEL_APARATO)[number];

export const NOMBRE_DE_LA_FUNCION: Readonly<Record<FuncionDelAparato, string>> = {
  caja: 'Caja',
  comandero: 'Comandero',
  cocina: 'Pantalla de cocina',
  barra: 'Pantalla de barra',
  fichar: 'Fichar',
};

/**
 * **Las que se eligen hoy.** Las pantallas de cocina y de barra existen en la base desde
 * T1, pero su pantalla llega con T4: hasta entonces no se ofrecen, en vez de vincular un
 * aparato que no hace nada (lo que no funciona no se enseña apagado).
 */
export const FUNCIONES_QUE_SE_ELIGEN = [
  'caja',
  'comandero',
  'fichar',
] as const satisfies readonly FuncionDelAparato[];

export function esFuncionDelAparato(valor: unknown): valor is FuncionDelAparato {
  return typeof valor === 'string' && (FUNCIONES_DEL_APARATO as readonly string[]).includes(valor);
}

/**
 * El nombre que se propone, para no tener que escribir nada: «Caja 1», «Comandero 2»,
 * «Móvil de Sara», «Fichar». Si ya existe, el número siguiente.
 */
export function nombrePropuesto(
  funcion: FuncionDelAparato,
  losQueHay: readonly string[],
  dueno?: string,
): string {
  const ocupados = new Set(losQueHay.map((n) => n.trim().toLowerCase()));
  const libre = (nombre: string) => !ocupados.has(nombre.toLowerCase());
  const conNumero = (base: string, desde: number) => {
    for (let n = desde; n < 100; n++) {
      const nombre = `${base} ${String(n)}`;
      if (libre(nombre)) return nombre;
    }
    return base;
  };

  // La caja y la tablet de la sala van numeradas desde el principio: «Caja 1».
  const delDueno = dueno?.trim() ?? '';
  if (funcion === 'caja') return conNumero('Caja', 1);
  if (funcion === 'comandero' && delDueno === '') return conNumero('Comandero', 1);

  // El móvil de alguien, Fichar y las pantallas: su nombre, y un número si se repite.
  const base = funcion === 'comandero' ? `Móvil de ${delDueno}` : NOMBRE_DE_LA_FUNCION[funcion];
  return libre(base) ? base : conNumero(base, 2);
}

// ── El token de un aparato con su operador ───────────────────────────────────

/**
 * Lo que manda Estook TPV en cada petición (Anexo 11.14, punto 4): **el turno del
 * operador y la llave del aparato**, los dos, en la cabecera de siempre
 * (`Authorization: Bearer tpv.<turno>.<llave>`). La API mira los dos.
 */
export function tokenDelAparato(turno: string, llave: string): string {
  return `tpv.${turno}.${llave}`;
}

const TOKEN_DEL_APARATO = /^tpv\.([A-Za-z0-9_-]{20,200})\.([A-Za-z0-9_-]{20,200})$/;

export function leerElTokenDelAparato(
  token: string,
): { readonly turno: string; readonly llave: string } | null {
  const partes = TOKEN_DEL_APARATO.exec(token);
  if (partes?.[1] === undefined || partes[2] === undefined) return null;
  return { turno: partes[1], llave: partes[2] };
}

// ── El código para vincular ──────────────────────────────────────────────────

/** Seis cifras, de un solo uso, diez minutos; y una dirección no prueba más de veinte por hora. */
export const CODIGO_PARA_VINCULAR = { cifras: 6, minutos: 10, porHora: 20 } as const;

export function esCodigoConForma(valor: string): boolean {
  return /^[0-9]{6}$/.test(valor);
}

/**
 * El código que trae el QR: `https://estook.com/tpv/vincular#482913`. Va detrás del `#`,
 * que el navegador no manda en ninguna petición ni queda en ningún registro (Anexo
 * 11.3, punto 3). Nulo si la dirección no es esa.
 */
export function elCodigoDeLaDireccion(rutaYAncla: {
  pathname: string;
  hash: string;
}): string | null {
  if (!/\/vincular\/?$/.test(rutaYAncla.pathname)) return null;
  const codigo = rutaYAncla.hash.replace(/^#/, '').trim();
  return esCodigoConForma(codigo) ? codigo : null;
}

// ── El PIN ───────────────────────────────────────────────────────────────────

/**
 * Las cifras del PIN, para las pantallas que lo teclean. El servidor tiene la suya
 * (`DIGITOS_DEL_PIN`, en `servidor/dominio/secretos.ts`), y una prueba vigila que sean la
 * misma: una pantalla que esperara cuatro no dejaría entrar a nadie.
 */
export const CIFRAS_DEL_PIN = 6;

/**
 * **Un PIN que se adivina** no se da (Anexo 11.4): todas las cifras iguales (111111) y
 * las escaleras, hacia arriba o hacia abajo (123456, 654321, 890123). El PIN lo da
 * Estook al azar, así que nadie lo elige; esto solo descarta los pocos que cualquiera
 * probaría primero.
 */
export function esPinFacil(pin: string): boolean {
  if (!/^[0-9]{2,}$/.test(pin)) return false;
  const cifras = Array.from({ length: pin.length }, (_, i) => Number(pin.charAt(i)));
  const pasos = cifras.slice(1).map((c, i) => (c - (cifras[i] ?? 0) + 10) % 10);
  const primero = pasos[0];
  if (primero === undefined) return false;
  const todosIgual = pasos.every((p) => p === primero);
  return todosIgual && (primero === 0 || primero === 1 || primero === 9);
}

// ── El bloqueo ───────────────────────────────────────────────────────────────

export interface AjustesDelBloqueo {
  /** La caja y el comandero para todos, sin tocar. De 1 a 10. */
  readonly minutos: number;
  readonly alCobrar: boolean;
  /** El móvil de cada camarero. De 5 a 30. */
  readonly personalMinutos: number;
  readonly soloEntraQuienFicha: boolean;
}

/** Los de fábrica (respuesta 4 de la 0107). */
export const BLOQUEO_DE_FABRICA: AjustesDelBloqueo = {
  minutos: 2,
  alCobrar: true,
  personalMinutos: 10,
  soloEntraQuienFicha: false,
};

export const LIMITES_DEL_BLOQUEO = {
  minutos: { desde: 1, hasta: 10 },
  personalMinutos: { desde: 5, hasta: 30 },
} as const;

/**
 * A los cuántos minutos sin tocar se bloquea un aparato, o nulo si no se bloquea nunca:
 * las pantallas de cocina y de barra no tienen operador. El aparato para fichar vuelve
 * al teclado después de cada fichaje, que es otra cosa.
 */
export function minutosDelBloqueo(
  funcion: FuncionDelAparato,
  esPersonal: boolean,
  ajustes: AjustesDelBloqueo,
): number | null {
  if (funcion === 'cocina' || funcion === 'barra' || funcion === 'fichar') return null;
  if (funcion === 'comandero' && esPersonal) return ajustes.personalMinutos;
  return ajustes.minutos;
}

/**
 * Dónde cae quien teclea su PIN (decidido por la IA, 0107): **el primero del día en ese
 * aparato, en el inicio**; los siguientes, que vienen a pedir, **en las mesas**. Sin
 * mesas dibujadas, al inicio (la venta rápida llega con T7).
 */
export function dondeCae(primeroDelDia: boolean, hayMesas: boolean): 'inicio' | 'mesas' {
  if (primeroDelDia || !hayMesas) return 'inicio';
  return 'mesas';
}

/** Las iniciales que lleva cada mesa y cada persona: «Sara» → SA, «Jon Mikel» → JM. */
export function inicialesDe(nombre: string): string {
  const palabras = nombre
    .trim()
    .split(/\s+/)
    .filter((p) => p !== '');
  if (palabras.length === 0) return '?';
  if (palabras.length === 1) return (palabras[0] ?? '').slice(0, 2).toUpperCase();
  return `${(palabras[0] ?? '').charAt(0)}${(palabras[1] ?? '').charAt(0)}`.toUpperCase();
}
