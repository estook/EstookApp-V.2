/**
 * Los dos enlaces del cambio del correo de acceso (A2 · 0041), leídos de la
 * dirección. Aparte de la pantalla para que la app los mire antes de cargar nada.
 */
export type EnlaceDelCorreo = { readonly que: 'confirmar' | 'parar'; readonly token: string };

/** El enlace, si la dirección es uno de los dos: `#/correo?confirmar=…` o `?parar=…`. */
export function elEnlaceDelCorreo(hash: string): EnlaceDelCorreo | null {
  if (!hash.startsWith('#/correo?')) return null;
  const parametros = new URLSearchParams(hash.slice('#/correo?'.length));
  const confirmar = parametros.get('confirmar');
  if (confirmar !== null && confirmar !== '') return { que: 'confirmar', token: confirmar };
  const parar = parametros.get('parar');
  if (parar !== null && parar !== '') return { que: 'parar', token: parar };
  return null;
}
