/**
 * Versionado de la API, con compatibilidad N−2 (M2).
 *
 * El Plan lo exige: **«API versionada con compatibilidad N−2»**. Traducido: la
 * version de ahora y las dos anteriores siguen funcionando.
 *
 * Por que importa aqui mas que en otros sitios: Estook se instala en el movil de
 * gente que no actualiza nada. Un camarero puede tener en el bolsillo una version
 * de hace seis meses. Si al publicar una version nueva la suya deja de funcionar,
 * ese dia el bar no ficha, no apunta mermas y no cierra jornada.
 *
 * Tres versiones dan margen de sobra para que todo el mundo actualice sin que
 * nadie se quede fuera de golpe.
 */

/** La de ahora. Se sube cuando un cambio rompe lo anterior, no en cada mejora. */
export const VERSION_ACTUAL = 1;

/** Cuantas hacia atras se siguen atendiendo, ademas de la actual. */
export const VERSIONES_HACIA_ATRAS = 2;

export const VERSION_MAS_ANTIGUA = Math.max(1, VERSION_ACTUAL - VERSIONES_HACIA_ATRAS);

export function versionSoportada(version: number): boolean {
  return Number.isInteger(version) && version >= VERSION_MAS_ANTIGUA && version <= VERSION_ACTUAL;
}

/** Saca la version de una ruta tipo `/v1/consultas/mis_locales`. */
export function versionDeLaRuta(ruta: string): number | null {
  const coincide = /^\/v(\d+)\//.exec(ruta);
  if (!coincide?.[1]) return null;
  return Number(coincide[1]);
}

/**
 * Que decirle a quien llama con una version que ya no se atiende. En cristiano,
 * como todo lo demas.
 */
export function porQueNoSeAtiende(version: number): string {
  if (version > VERSION_ACTUAL) {
    return `Esta aplicacion pide la version ${version} y aqui todavia va la ${VERSION_ACTUAL}. Puede que el movil se haya adelantado; en un rato deberia funcionar.`;
  }
  return `Esta version de Estook es demasiado antigua para seguir funcionando. Actualiza la aplicacion y vuelve a entrar; no has perdido nada de lo que tenias apuntado.`;
}
