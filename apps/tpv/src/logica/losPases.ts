import type { LaMesa } from '../datos/tipos.ts';

/**
 * **Los pases, en pestañas encima de la cuenta** (T2, Anexo 11.10), como las «órdenes» de
 * Revo: **Bebidas · 1.º · 2.º · 3.º · Postre**. Lo que se toca va al pase marcado, y **el pase
 * lo elige el camarero** (Richi, 28-oct): ningún plato está atado a un pase, ni cambiar de
 * página de la carta lo cambia.
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
