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
  // ── M5 · el alta de un local ─────────────────────────────────────────────
  //
  // Los cuatro salen de responder la regla 14: **quien tiene que enterarse
  // cuando esto cambie**. Se publican ya, aunque hoy no los lea nadie, porque un
  // evento que se añade despues no trae el pasado consigo.
  //
  //   local.creado          M6 le siembra sus categorias, M25 sus apps
  //   local.alta_terminado  el Panel deja de enseñar el alta y empieza a medir
  //   objetivo.cambiado     **todos** los semaforos de la aplicacion y Fogon
  //   local.ficha_cambiada  el motor fiscal, la fecha operativa y los documentos
  'local.creado',
  'local.alta_terminado',
  'objetivo.cambiado',
  'local.ficha_cambiada',
  'ejemplos.quitados',
] as const;

export type TipoDeEvento = (typeof EVENTOS)[number];

export function esEvento(valor: unknown): valor is TipoDeEvento {
  return typeof valor === 'string' && (EVENTOS as readonly string[]).includes(valor);
}
