/**
 * Catalogo de eventos (M2).
 *
 * Cerrado, igual que el de permisos y el de errores. Un evento que no este aqui
 * no existe, y asi no acaban apareciendo cadenas sueltas por el codigo.
 *
 * Los eventos se escriben en la **misma transaccion** que el cambio que los
 * provoca (bandeja de salida) y se publican despues. Si la transaccion se cae,
 * el evento se cae con ella: nunca hay un evento de algo que no paso, ni un
 * cambio sin su evento.
 */
export const EVENTOS = [
  'persona.idioma_cambiado',
  'membresia.creada',
  'membresia.revocada',
  'regla_fiscal.creada',
  'regla_fiscal.desactivada',
  'recalculo.pedido',
] as const;

export type TipoDeEvento = (typeof EVENTOS)[number];

export function esEvento(valor: unknown): valor is TipoDeEvento {
  return typeof valor === 'string' && (EVENTOS as readonly string[]).includes(valor);
}
