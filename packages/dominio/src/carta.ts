/**
 * La dirección de la carta de un local (entrega O, punto 20 · decisión 0047).
 *
 * **La del QR, siempre la de producción**, aunque se esté probando en otra
 * máquina: un QR impreso con `localhost` no lo abre nadie. Y sin almohadilla
 * (`/carta/ikatz`, no `/carta/#/ikatz`): es una dirección que se imprime una vez y
 * no cambia, y la almohadilla es un detalle de cómo se publica hoy la app (0008)
 * que no tiene por qué quedar grabado en cuatrocientas mesas.
 */
export const DIRECCION_DE_ESTOOK = 'https://estook.com';

export function direccionDeLaCarta(direccion: string): string {
  return `${DIRECCION_DE_ESTOOK}/carta/${direccion}`;
}

/** De una dirección de la barra del navegador, la de la carta: `/carta/ikatz/` → `ikatz`. */
export function laCartaDeLaDireccion(camino: string): string | null {
  const encontrada = /^\/carta\/([a-z0-9]([a-z0-9-]{0,78}[a-z0-9])?)\/?$/i.exec(camino);
  return encontrada?.[1]?.toLowerCase() ?? null;
}
