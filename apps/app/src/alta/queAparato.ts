/**
 * Qué aparato es este · lo mira el paseo y lo mira la guía (M5).
 *
 * Vive en su propio fichero y no dentro de `GuiaDeInstalacion` por una razón
 * pequeña y real: ese fichero exporta un componente, y una función exportada al
 * lado rompe la recarga en caliente mientras se desarrolla. Lo dice el propio
 * aviso del linter, y tiene razón.
 */
export type Sistema = 'iphone' | 'android' | 'ordenador';

/**
 * Qué aparato parece.
 *
 * ── El fallo que esto arregla ────────────────────────────────────────────────
 *
 * Antes solo distinguía iPhone de Android, y **todo lo que no fuera un iPhone
 * caía en Android**. En un ordenador, que es donde se hace media configuración,
 * la pantalla decía «toca el botón de compartir» y «añádelo a tu pantalla de
 * inicio»: instrucciones para un teléfono, delante de alguien con un ratón.
 *
 * Un texto que no encaja con lo que la persona tiene delante no es un detalle
 * de estilo: es la aplicación diciendo que no sabe dónde está.
 *
 * Se mira si hay pantalla táctil, no el nombre del navegador. Los nombres
 * cambian cada año; que un ordenador de sobremesa no tenga dedos, no.
 */
export function elQueParece(): Sistema {
  if (typeof navigator === 'undefined') return 'ordenador';

  const agente = navigator.userAgent;

  // El iPad moderno dice ser un Mac. Se le reconoce porque un Mac de verdad no
  // tiene pantalla táctil con varios puntos.
  const esIpadDisfrazado = /Macintosh/.test(agente) && navigator.maxTouchPoints > 1;
  if (/iPhone|iPad|iPod/.test(agente) || esIpadDisfrazado) return 'iphone';

  if (/Android/.test(agente)) return 'android';

  // Y si no es ninguno de los dos, es un ordenador. Antes esta rama no existía.
  return 'ordenador';
}

/**
 * Si esto es un teléfono.
 *
 * Lo usa el paseo para decidir si **ofrece** la guía: poner Estook en la pantalla
 * de inicio es algo que se hace en el móvil, y ofrecérselo a quien está en un
 * ordenador es mandarle a hacer algo que no puede hacer ahí.
 *
 * Y al revés: en el móvil tiene que salir, que es donde de verdad sirve. Estaba
 * al revés de las dos maneras —se veía en el escritorio y no se llegaba a ver en
 * el teléfono— porque el paseo la escondía detrás de las cinco pantallas.
 */
export function esUnMovil(): boolean {
  return elQueParece() !== 'ordenador';
}
