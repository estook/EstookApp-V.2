import type { UnaReserva } from '../datos/tipos.ts';

/**
 * Las cuentas de las reservas en la sala (la Ampliación 5 · 1, 0153): qué reserva marca cada mesa del
 * plano, cuánto falta o cuánto retraso llevan, y los avisos. Cálculo puro; pintarlo es de las pantallas.
 */

const MINUTO = 60_000;

/** Lo que falta para una reserva, en minutos (negativo: llevan retraso). */
export function minutosHasta(reserva: UnaReserva, ahora: number): number {
  // Minutos enteros, el más cercano (no es dinero: son minutos de reloj).
  return Math.floor((Date.parse(reserva.empieza) - ahora) / MINUTO + 0.5);
}

/** Si una reserva sigue esperando mesa: reservada, y sin pasarse del retraso con que se libera. */
export function sigueEsperando(reserva: UnaReserva, ahora: number, liberarTras: number): boolean {
  return reserva.estado === 'reservada' && minutosHasta(reserva, ahora) > -liberarTras;
}

/**
 * **La reserva que marca una mesa en el plano**: la siguiente que la ocupa y sigue esperando. Una mesa
 * libre con reserva lleva su hora; abrirla avisa.
 */
export function laReservaDeLaMesa(
  reservas: readonly UnaReserva[],
  mesaId: string,
  ahora: number,
  liberarTras: number,
): UnaReserva | null {
  return (
    reservas
      .filter((r) => r.mesas.some((m) => m.id === mesaId) && sigueEsperando(r, ahora, liberarTras))
      .sort((a, b) => Date.parse(a.empieza) - Date.parse(b.empieza))[0] ?? null
  );
}

/**
 * Si abrir ahora una mesa pisa su reserva: lo que suele durar una mesa de tantos llegaría a la hora
 * de la reserva. Con dos horas de margen como poco: abrir a las 20:40 una mesa reservada a las 21:00
 * avisa; abrirla a mediodía, no.
 */
export function abrirlaPisaLaReserva(reserva: UnaReserva | null, ahora: number): boolean {
  if (reserva === null) return false;
  const faltan = minutosHasta(reserva, ahora);
  return faltan <= 120;
}

/** «Faltan 20 minutos», «Llegan ya», «Llevan 12 minutos de retraso». */
export function cuantoFalta(reserva: UnaReserva, ahora: number): string {
  const faltan = minutosHasta(reserva, ahora);
  if (faltan > 90) return `A las ${reserva.hora}`;
  if (faltan > 1) return `Faltan ${String(faltan)} minutos`;
  if (faltan >= -1) return 'Llegan ya';
  const tarde = -faltan;
  return `Llevan ${String(tarde)} ${tarde === 1 ? 'minuto' : 'minutos'} de retraso`;
}

/** «7 + 8»: las mesas de una reserva. */
export function susMesas(reserva: UnaReserva): string {
  return reserva.mesas
    .map((m) => m.nombre)
    .sort((a, b) => a.localeCompare(b, 'es', { numeric: true }))
    .join(' + ');
}

export interface AvisoDeReserva {
  readonly id: string;
  readonly que: 'nueva' | 'llegan' | 'retraso' | 'cancelada';
  readonly reserva: UnaReserva;
}

/**
 * **Los avisos de las reservas** (0153): una **reserva nueva** que no ha puesto quien mira (la de la web,
 * la de otro aparato), en su primer cuarto de hora; **llegan en 10 minutos**; y **15 de retraso** (o los
 * minutos del local), con «No han venido» para liberar la mesa.
 */
export function losAvisosDeLasReservas(
  reservas: readonly UnaReserva[],
  ahora: number,
  liberarTras: number,
): readonly AvisoDeReserva[] {
  const avisos: AvisoDeReserva[] = [];
  for (const r of reservas) {
    // La que canceló el cliente en la web o se canceló sola por no confirmar (5 · 2): su primer cuarto
    // de hora, para que la sala sepa que esa mesa ha quedado libre.
    if (
      r.estado === 'cancelada' &&
      (r.canceladaPor === 'cliente' || r.canceladaPor === 'sin_confirmar') &&
      r.canceladaEn != null &&
      ahora - Date.parse(r.canceladaEn) < 15 * MINUTO
    ) {
      avisos.push({ id: `reserva:cancelada:${r.id}`, que: 'cancelada', reserva: r });
      continue;
    }
    if (r.estado !== 'reservada') continue;
    const faltan = minutosHasta(r, ahora);
    if (faltan <= -liberarTras) {
      avisos.push({ id: `reserva:retraso:${r.id}`, que: 'retraso', reserva: r });
    } else if (faltan > 0 && faltan <= 10) {
      avisos.push({ id: `reserva:llegan:${r.id}`, que: 'llegan', reserva: r });
    } else if (!r.esMia && ahora - Date.parse(r.creadaEn) < 15 * MINUTO) {
      avisos.push({ id: `reserva:nueva:${r.id}`, que: 'nueva', reserva: r });
    }
  }
  return avisos;
}
