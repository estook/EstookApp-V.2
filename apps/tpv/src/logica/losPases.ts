import type { LaMesa } from '../datos/tipos.ts';

/**
 * **Los pases, en pestañas encima de la cuenta** (T2, Anexo 11.10), como las «órdenes» de
 * Revo: **Bebidas · 1.º · 2.º · 3.º · Postre**. Lo que se toca va al pase marcado, y al
 * cambiar de página de la carta **se marca solo el de esa página**: así casi nunca hay que
 * tocar la pestaña.
 *
 * El postre es el pase 4 por dentro: sale cuando ha salido lo de antes, como siempre (0106).
 * Bebidas no es un pase: va a la barra al momento, al mandar.
 */

export type PestanaDelPase = 'bebidas' | 1 | 2 | 3 | 'postre';

export const PESTANAS_DE_LOS_PASES: readonly PestanaDelPase[] = ['bebidas', 1, 2, 3, 'postre'];

/** El pase del postre, por dentro. */
export const PASE_DEL_POSTRE = 4;

/** El número del pase de una pestaña; nulo en Bebidas, que no es un pase. */
export function elNumeroDelPase(pestana: PestanaDelPase): number | null {
  if (pestana === 'bebidas') return null;
  return pestana === 'postre' ? PASE_DEL_POSTRE : pestana;
}

export function laPestanaDelPase(numero: number | null): PestanaDelPase {
  if (numero === null) return 'bebidas';
  if (numero >= PASE_DEL_POSTRE) return 'postre';
  return numero as 1 | 2 | 3;
}

export function elNombreDeLaPestana(pestana: PestanaDelPase): string {
  if (pestana === 'bebidas') return 'Bebidas';
  if (pestana === 'postre') return 'Postre';
  return `${String(pestana)}.º`;
}

const SON_DEL_1 =
  /entrant|primer|compartir|tapa|racion|ración|ensalad|aperitiv|para picar|picoteo|sopa|crema/i;
const SON_DEL_2 =
  /principal|segund|carne|pescado|arroz|plato fuerte|parrilla|brasa|hamburgues|pasta|pizza/i;
const SON_DEL_POSTRE = /postre|dulce|tarta|helado|caf[eé]|sobremesa/i;

/**
 * **La pestaña que se marca sola al abrir una página de la carta** (Anexo 11.10). Hasta
 * T3, en que cada página dice «¿En qué pase sale?», se propone por el nombre de su sección
 * (Entrantes → 1.º, Principales → 2.º, Postres → Postre; las de bebidas, Bebidas). Si el
 * nombre no dice nada, no se cambia: manda lo que marcó el camarero.
 */
export function laPestanaDeLaSeccion(seccion: {
  readonly nombre: string;
  readonly esBebida: boolean;
}): PestanaDelPase | null {
  if (seccion.esBebida) return 'bebidas';
  if (SON_DEL_POSTRE.test(seccion.nombre)) return 'postre';
  if (SON_DEL_1.test(seccion.nombre)) return 1;
  if (SON_DEL_2.test(seccion.nombre)) return 2;
  return null;
}

export type ComoVaLaPestana = 'salio' | 'en_marcha' | 'en_espera' | null;

/** Cómo va cada pase, para su pestaña: ✓ si salió, «en marcha», «en espera», o nada. */
export function comoVaElPase(mesa: LaMesa | undefined, pestana: PestanaDelPase): ComoVaLaPestana {
  const numero = elNumeroDelPase(pestana);
  if (numero === null || mesa === undefined) return null;
  const pase = mesa.pases.find((p) =>
    numero === PASE_DEL_POSTRE ? p.numero >= PASE_DEL_POSTRE : p.numero === numero,
  );
  if (pase === undefined) return null;
  if (pase.haSalido) return 'salio';
  return pase.marchadoEn === null ? 'en_espera' : 'en_marcha';
}

/**
 * La que sale marcada al abrir la mesa: en una sin nada, Bebidas (se sientan y piden de
 * beber); si no, el último pase con algo en cocina que no ha salido, o el siguiente.
 */
export function laPestanaDeFabrica(mesa: LaMesa | undefined): PestanaDelPase {
  const platos = (mesa?.platos ?? []).filter((p) => p.estado !== 'quitado');
  if (platos.length === 0) return 'bebidas';
  const enCocina = platos.flatMap((p) =>
    p.destino === 'cocina' && p.pase !== null ? [p.pase] : [],
  );
  if (enCocina.length === 0) return 1;
  const ultimo = Math.max(...enCocina);
  const salio = mesa?.pases.find((p) => p.numero === ultimo)?.haSalido === true;
  return laPestanaDelPase(salio ? Math.min(ultimo + 1, PASE_DEL_POSTRE) : ultimo);
}
