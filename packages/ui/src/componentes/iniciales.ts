/**
 * Las iniciales y el color del avatar (`Avatar`, en `Tarjeta.tsx`).
 *
 * El color sale del nombre, no al azar, para que la misma persona salga siempre
 * del mismo color. Son los acentos de las apps, que ya estan elegidos para
 * distinguirse entre si.
 *
 * El acento va en el **aro** y no en el relleno: con relleno, las iniciales en
 * blanco dan 3,5:1 sobre el acento de Inventario y 4,1 sobre el de Servicio, por
 * debajo del 4,5:1 que pide B8. Con el aro, las iniciales van en charcoal sobre
 * blanco (16:1) y el color sigue identificando a la persona igual de bien.
 */
const COLORES = [
  'var(--color-app-inventario)',
  'var(--color-app-escandallos)',
  'var(--color-app-carta)',
  'var(--color-app-calendario)',
  'var(--color-app-equipo)',
  'var(--color-app-servicio)',
  'var(--color-app-negocio)',
  'var(--color-app-cuaderno)',
] as const;

export function inicialesDe(nombre: string): string {
  const trozos = nombre.trim().split(/\s+/).filter(Boolean);
  const primera = trozos[0]?.[0] ?? '?';
  const segunda = trozos.length > 1 ? (trozos[trozos.length - 1]?.[0] ?? '') : '';
  return `${primera}${segunda}`.toUpperCase();
}

export function colorDe(nombre: string): string {
  let suma = 0;
  for (const letra of nombre) suma = (suma + letra.charCodeAt(0)) % 1024;
  return COLORES[suma % COLORES.length] ?? COLORES[0];
}
