/**
 * Los enlaces que llegan por correo, leídos de la dirección. Aparte de las pantallas para
 * que la app los mire antes de cargar nada.
 *
 *   · `#/correo?confirmar=…` y `?parar=…`: el cambio del correo de acceso (A2 · 0041)
 *   · `#/correo?contrasena=…`: poner la contraseña, la olvidada o la primera (0109)
 *   · `#/correo?pin=…`: un PIN nuevo para los aparatos de un local (0109)
 */
export type EnlaceDelCorreo = {
  readonly que: 'confirmar' | 'parar' | 'contrasena' | 'pin';
  readonly token: string;
};

const LOS_QUE_HAY = ['confirmar', 'parar', 'contrasena', 'pin'] as const;

/** El enlace, si la dirección es uno de los del correo. */
export function elEnlaceDelCorreo(hash: string): EnlaceDelCorreo | null {
  if (!hash.startsWith('#/correo?')) return null;
  const parametros = new URLSearchParams(hash.slice('#/correo?'.length));
  for (const que of LOS_QUE_HAY) {
    const token = parametros.get(que);
    if (token !== null && token !== '') return { que, token };
  }
  return null;
}
