/**
 * Las direcciones de antes del 25-sep, llevadas a las de ahora (decisión 0049).
 *
 * La app que se llamaba «Inventario» se llama **Almacén**, y la vista «Recuento»
 * se llama **Inventario**, que es como se dice en una cocina: «hoy toca hacer
 * inventario». Las direcciones cambiaron con ellas (`/almacen/movimientos/inventario`),
 * pero las de antes siguen vivas en marcadores, en la app puesta en el móvil y en
 * los enlaces que alguien se mandó. Ninguna se rompe: se lleva a la nueva.
 *
 * Los enlaces que guarda la base (el Calendario) los cambió la migración `0048`.
 *
 * Devuelve `null` si la dirección no es de las de antes.
 */
export function laDireccionDeAhora(ruta: string): string | null {
  // Las mermas, de vista de Movimientos a destino propio de Almacén (26-sep).
  if (/^\/(?:almacen|inventario)\/movimientos\/mermas\/?$/.test(ruta)) return '/almacen/mermas';
  const vieja = /^\/inventario(\/.*)?$/.exec(ruta);
  if (vieja === null) return null;
  const resto = (vieja[1] ?? '').replace(
    /^\/movimientos\/recuento(?=\/|$)/,
    '/movimientos/inventario',
  );
  return `/almacen${resto}`;
}
