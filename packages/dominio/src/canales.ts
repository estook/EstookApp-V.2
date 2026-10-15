import { centimos, porFraccion } from './dinero.ts';

/**
 * Los canales de venta (M9 · 1, decisión 0086).
 *
 * Richi, el 15-oct: «añadimos un apartado para poder añadir todos los comercios;
 * prográmalo todo, pero pon activo solo Uber Eats por ahora, porque es el único que
 * tenemos». Así que **están todos** y **hoy se puede activar Uber Eats**: encender
 * otro es cambiar `disponible` aquí. Sala es el canal de siempre y no se activa.
 *
 * Activar un canal **no lo conecta**: es su lista de precios y su comisión. Recibir
 * sus pedidos es Estook Link (M29). Es el mismo tipo que `estook.canal_de_venta`
 * (migración 0068); una prueba comprueba que no se separan.
 */
export type CanalDeVenta = 'sala' | 'para_llevar' | 'uber_eats' | 'glovo' | 'just_eat';

export interface ComoEsElCanal {
  readonly canal: CanalDeVenta;
  readonly nombre: string;
  /** De la casa (sala, para llevar) o de una plataforma de reparto. */
  readonly tipo: 'propio' | 'plataforma';
  /** Si hoy se puede activar. Sala, siempre. */
  readonly disponible: boolean;
  /** La comisión que se propone al activarlo, en %, si es de una plataforma. */
  readonly comisionHabitual: number | null;
}

export const CANALES_DE_VENTA: readonly ComoEsElCanal[] = [
  { canal: 'sala', nombre: 'Sala', tipo: 'propio', disponible: true, comisionHabitual: null },
  {
    canal: 'uber_eats',
    nombre: 'Uber Eats',
    tipo: 'plataforma',
    disponible: true,
    comisionHabitual: 30,
  },
  { canal: 'glovo', nombre: 'Glovo', tipo: 'plataforma', disponible: false, comisionHabitual: 30 },
  {
    canal: 'just_eat',
    nombre: 'Just Eat',
    tipo: 'plataforma',
    disponible: false,
    comisionHabitual: 30,
  },
  {
    canal: 'para_llevar',
    nombre: 'Para llevar',
    tipo: 'propio',
    disponible: false,
    comisionHabitual: null,
  },
];

export const CODIGOS_DE_CANAL: readonly CanalDeVenta[] = CANALES_DE_VENTA.map((c) => c.canal);

export function comoEsElCanal(canal: CanalDeVenta): ComoEsElCanal {
  const el = CANALES_DE_VENTA.find((c) => c.canal === canal);
  if (el === undefined) throw new Error(`Canal desconocido: ${canal}`);
  return el;
}

/**
 * El precio de un plato en un canal: el suyo si lo tiene, si no el de sala (0086:
 * «si el precio de un canal es el mismo que el de la carta, no hay que ponerlo»).
 */
export function precioEnElCanal(
  precioDeSala: number | null,
  propio: number | null | undefined,
): { readonly centimos: number | null; readonly igualQueSala: boolean } {
  if (propio !== null && propio !== undefined) return { centimos: propio, igualQueSala: false };
  return { centimos: precioDeSala, igualQueSala: true };
}

/**
 * Lo que se lleva la plataforma de un precio con IVA, en céntimos, redondeado al
 * céntimo. Para el margen por canal de M9 · 2.
 */
export function comisionDe(precioCentimos: number, porcentaje: number | null): number {
  if (porcentaje === null || porcentaje <= 0) return 0;
  // Con el motor del dinero (regla 9): el porcentaje, como fracción.
  return porFraccion(centimos(precioCentimos), porcentaje / 100);
}
