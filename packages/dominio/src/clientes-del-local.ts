import { centimos, entreFactor } from './dinero.ts';
import { NOMBRE_CORTO_DEL_ALERGENO, esAlergeno } from './referencia.ts';

/**
 * **Los clientes de cada local** (la Ampliación 5 · 3, decisión 0153, sección 21; migración 0135).
 *
 * Cada reserva crea o encuentra a su cliente por su teléfono, y su ficha se rellena sola con lo que ya
 * sabe el TPV: cuántas veces ha venido, lo que gasta, lo que suele pedir y las veces que no vino. Lo que
 * se apunta a mano es poco: VIP, sus alergias (solo con su sí) y una nota corta.
 *
 * Lo que decidió Richi el 26-nov, y que vive aquí para que el TPV, Estook y la API digan lo mismo:
 *   · **Habitual, solo**: más de cinco visitas en medio año. No se pone ni se quita a mano.
 *   · **Los que no vienen**: cuenta solo lo que marca la sala con «No han venido»; la que se cancela
 *     sola por no confirmar no cuenta. Con dos, sale marcado al reservar.
 *   · Sin «Cumpleaños» ni «Grupo»: «con saber los que vienen ya saben si son grupo».
 */

/** Más de cinco visitas en medio año: desde la sexta, habitual. */
export const VISITAS_DE_HABITUAL = 6;
export const DIAS_DE_HABITUAL = 183;

/** Con dos veces sin venir, sale marcado al reservar. */
export const VECES_SIN_VENIR_PARA_MARCAR = 2;

/**
 * Las reservas de tantos o más salen solas en Calendario › Equipo, para que cocina lo sepa (0153,
 * sección 5). Un número fijo: Richi no quiere otro ajuste para esto.
 */
export const COMENSALES_DE_RESERVA_GRANDE = 12;

export function esHabitual(visitasEnMedioAno: number): boolean {
  return visitasEnMedioAno >= VISITAS_DE_HABITUAL;
}

export function sinVenirMarca(vecesSinVenir: number): boolean {
  return vecesSinVenir >= VECES_SIN_VENIR_PARA_MARCAR;
}

export type TonoDeEtiqueta = 'habitual' | 'vip' | 'alergia' | 'sin_venir';

export interface EtiquetaDelCliente {
  readonly tono: TonoDeEtiqueta;
  readonly texto: string;
}

export interface LoQueMarcaAlCliente {
  readonly vip: boolean;
  readonly habitual: boolean;
  readonly alergenos: readonly string[];
  readonly vecesSinVenir: number;
}

/** El nombre corto de un alérgeno guardado; el gluten dice también «celíaco», que es como lo dicen. */
export function laAlergiaEnLetra(alergeno: string): string {
  if (alergeno === 'gluten') return 'Gluten · celíaco';
  return esAlergeno(alergeno) ? NOMBRE_CORTO_DEL_ALERGENO[alergeno] : alergeno;
}

/**
 * **Las etiquetas de un cliente**, en el orden en que importan en servicio: lo que puede hacer daño
 * primero (la alergia, en rojo), luego quien suele fallar, y al final VIP y habitual.
 */
export function lasEtiquetasDelCliente(c: LoQueMarcaAlCliente): EtiquetaDelCliente[] {
  const etiquetas: EtiquetaDelCliente[] = c.alergenos.map((a) => ({
    tono: 'alergia',
    texto: laAlergiaEnLetra(a),
  }));
  if (sinVenirMarca(c.vecesSinVenir)) {
    etiquetas.push({ tono: 'sin_venir', texto: `${String(c.vecesSinVenir)} sin venir` });
  }
  if (c.vip) etiquetas.push({ tono: 'vip', texto: 'VIP' });
  if (c.habitual) etiquetas.push({ tono: 'habitual', texto: 'Habitual' });
  return etiquetas;
}

/**
 * **El gasto medio por persona**: lo que tomaron sus mesas entre los que eran. Sin mesas cobradas, nada
 * (mejor «—» que un cero que parece un dato).
 */
export function elGastoMedioPorPersona(
  mesas: readonly { readonly centimos: number; readonly personas: number }[],
): number | null {
  const conGente = mesas.filter((m) => m.personas > 0 && m.centimos > 0);
  if (conGente.length === 0) return null;
  const total = conGente.reduce((suma, m) => suma + m.centimos, 0);
  const personas = conGente.reduce((suma, m) => suma + m.personas, 0);
  return entreFactor(centimos(total), personas);
}
