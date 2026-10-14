/**
 * El mismo enlace para la misma foto, mientras siga valiendo (las bases firmes, 0084).
 *
 * Las fotos (tu cara, el logo del local, las del género) llegan **firmadas y caducas**
 * desde la API, y cada respuesta trae una firma nueva aunque la foto sea la misma. Para
 * el navegador, un enlace distinto es otra imagen: volvía a descargarla y se veía
 * parpadear cada vez que la app se ponía al día (al volver a ella, cada minuto). Era
 * parte de «la app carga más lenta».
 *
 * Aquí se recuerda, por cada foto (el enlace sin la firma), el primer enlace que llegó,
 * y se sigue usando **media hora**: la API firma las caras para doce horas y los
 * logos para una, así que dentro de esa media hora el de antes sigue abriendo. Pasada,
 * se coge el nuevo. Una foto cambiada tiene otra clave, y entra al momento.
 */
const MEDIA_HORA = 30 * 60 * 1000;
const vistos = new Map<string, { readonly enlace: string; readonly hasta: number }>();

export function enlaceEstable(enlace: string | null | undefined): string | null {
  if (enlace === null || enlace === undefined || enlace === '') return null;
  const laFoto = enlace.split('?')[0] ?? enlace;
  const ahora = Date.now();
  const antes = vistos.get(laFoto);
  if (antes !== undefined && antes.hasta > ahora) return antes.enlace;
  vistos.set(laFoto, { enlace, hasta: ahora + MEDIA_HORA });
  return enlace;
}
