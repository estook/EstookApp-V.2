/**
 * El nombre en pantalla de un código que llega del servidor, o el propio código.
 *
 * ── Por qué existe ──────────────────────────────────────────────────────────
 *
 * Los motivos de merma, las partidas y los orígenes de un cierre llegan como
 * texto —`'fallo_de_elaboracion'`— y se enseñan con su nombre —«Ha salido mal»—.
 * Las tablas de nombres están tipadas por su lista cerrada, así que buscar en
 * ellas un texto suelto obligaba a forzar el tipo en cada pantalla, y el lint,
 * con razón, protestaba de que el resultado «nunca podía faltar».
 *
 * Puede faltar: el servidor puede estrenar un motivo antes que la pantalla. Y
 * entonces lo correcto es enseñar el código tal cual en vez de un hueco.
 */
export function nombreEn(
  mapa: Readonly<Record<string, string>>,
  clave: string,
  siNoEsta: string,
): string {
  return mapa[clave] ?? siNoEsta;
}
