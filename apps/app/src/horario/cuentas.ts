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
