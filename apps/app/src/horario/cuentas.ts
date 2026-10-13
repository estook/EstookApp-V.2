import type { TurnoVisto } from './contrato.ts';

function minutosDe(hora: string): number {
  const [h = '0', m = '0'] = hora.split(':');
  return Number(h) * 60 + Number(m);
}

/**
 * Si dos tramos del mismo día coinciden en algún momento: es «con quién trabajo».
 * Un tramo que sale antes de entrar cruza la medianoche, como en el dominio.
 */
export function coinciden(a: TurnoVisto, b: TurnoVisto): boolean {
  if (a.entra === null || a.sale === null || b.entra === null || b.sale === null) return false;
  const tramo = (t: TurnoVisto) => {
    const empieza = minutosDe(t.entra ?? '');
    const acaba = minutosDe(t.sale ?? '');
    return [empieza, acaba > empieza ? acaba : acaba + 24 * 60] as const;
  };
  const [a1, a2] = tramo(a);
  const [b1, b2] = tramo(b);
  return a1 < b2 && b1 < a2;
}

/** Quién coincide con alguien un día, en el horario publicado. */
export function conQuienCoincide<P extends { readonly personaId: string }>(
  personas: readonly P[],
  turnos: readonly TurnoVisto[],
  personaId: string,
  fecha: string,
): P[] {
  const suyos = turnos.filter(
    (t) => t.personaId === personaId && t.dia === fecha && t.tipo === 'trabajo',
  );
  return personas.filter(
    (p) =>
      p.personaId !== personaId &&
      turnos.some(
        (t) => t.personaId === p.personaId && t.dia === fecha && suyos.some((s) => coinciden(s, t)),
      ),
  );
}

export const AUSENCIA: Readonly<Record<string, string>> = {
  libre: 'Libre',
  vacaciones: 'Vacaciones',
  baja: 'Baja',
};

/** Lo de un día de una persona, en texto: para la casilla y para quien no ve. */
export function loDelDia(turnos: readonly TurnoVisto[]): string {
  const ausencia = turnos.find((t) => t.tipo !== 'trabajo');
  if (ausencia !== undefined) return AUSENCIA[ausencia.tipo] ?? '';
  return turnos
    .filter((t) => t.tipo === 'trabajo')
    .map((t) => `${t.entra ?? ''}–${t.sale ?? ''}`)
    .join(' y ');
}

/** Lo que contesta el servidor al publicar la semana. */
export interface LoPublicado {
  readonly primeraVez: boolean;
  readonly avisados: number;
  readonly alMovil?: number;
  readonly porCorreo?: number;
  readonly soloEnLaApp?: number;
}

const personas = (n: number) => (n === 1 ? '1 persona' : `${String(n)} personas`);

/**
 * Lo que se dice al publicar (repaso del 10-oct): **por dónde le llega a cada uno**.
 *
 * Antes decía «les ha llegado el aviso a 4 personas» aunque a tres solo les hubiera
 * llegado a la campana, que no ven si no abren Estook: Richi publicó, «le doy a sí,
 * avisar, y nada». Ahora se dice cuántos lo tienen en el móvil, cuántos por correo y,
 * si queda alguien, que solo lo verá al entrar.
 */
export function fraseDeLoPublicado(lo: LoPublicado): string {
  if (lo.avisados === 0) {
    return lo.primeraVez
      ? 'Publicado. Nadie tiene turno esta semana: no hay a quién avisar.'
      : 'Publicado. No le cambia nada a nadie: no se avisa a nadie.';
  }
  const partes = [
    (lo.alMovil ?? 0) > 0 ? `${personas(lo.alMovil ?? 0)} en el móvil` : '',
    (lo.porCorreo ?? 0) > 0 ? `${personas(lo.porCorreo ?? 0)} por correo` : '',
  ].filter((p) => p !== '');
  const llega =
    partes.length === 0
      ? ''
      : ` Le llega a ${partes.length === 2 ? `${partes[0] ?? ''} y ${partes[1] ?? ''}` : (partes[0] ?? '')}.`;
  const solo = lo.soloEnLaApp ?? 0;
  const falta =
    solo === 0
      ? ''
      : ` ${solo === 1 ? '1 persona no tiene' : `${String(solo)} personas no tienen`} ni móvil ni correo: lo verá${solo === 1 ? '' : 'n'} al entrar en Estook.`;
  return `Publicado.${llega}${falta}`;
}
