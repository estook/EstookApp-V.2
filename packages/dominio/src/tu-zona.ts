import { centimos, entreFactor } from './dinero.ts';

/**
 * Tu zona (M10 · 2, decisiones 0103 y 0104): «Tus bravas a 7 € están 1,50 € por encima
 * de lo que cobran los de tu calle».
 *
 * No es la zona de un producto (`zona.ts`: cocina, sala, limpieza), sino **los locales de
 * alrededor**. Lo busca Fogón en internet; **las cuentas, aquí**, nunca el modelo (Plan,
 * M22: los números los calcula Estook). Y con menos de tres locales para comparar, no se
 * juzga: dos precios no son una zona (plantilla, 21).
 */

/** Con menos de tres precios de la zona, un plato no se compara. */
export const MINIMO_PARA_COMPARAR = 3;

/** Richi, 21-oct: «solo 1 al día cada 24 horas». */
export const HORAS_ENTRE_ANALISIS_DE_ZONA = 24;

/** Lo más que puede buscar Fogón en un análisis: unos 8 céntimos de búsquedas. */
export const BUSQUEDAS_POR_ANALISIS = 8;

/** Dentro de este tanto por ciento de la media, se está «en la media». */
export const MARGEN_DE_LA_MEDIA = 0.07;

export interface ComoEstasEnLaZona {
  readonly cuantos: number;
  readonly mediaCentimos: number;
  readonly desdeCentimos: number;
  readonly hastaCentimos: number;
  /** Tu precio menos la media: positivo, más caro que la zona. */
  readonly diferenciaCentimos: number;
  readonly como: 'por_encima' | 'en_la_media' | 'por_debajo';
}

/**
 * Cómo está tu precio frente a los de la zona. Nulo si no hay tu precio o hay menos de
 * tres para comparar.
 */
export function compararConLaZona(
  miPrecioCentimos: number | null,
  preciosDeLaZona: readonly number[],
): ComoEstasEnLaZona | null {
  const precios = preciosDeLaZona.filter((p) => Number.isFinite(p) && p > 0);
  if (miPrecioCentimos === null || miPrecioCentimos <= 0) return null;
  if (precios.length < MINIMO_PARA_COMPARAR) return null;
  const media = entreFactor(centimos(precios.reduce((s, p) => s + p, 0)), precios.length);
  const diferencia = miPrecioCentimos - media;
  const como =
    Math.abs(diferencia) <= media * MARGEN_DE_LA_MEDIA
      ? 'en_la_media'
      : diferencia > 0
        ? 'por_encima'
        : 'por_debajo';
  return {
    cuantos: precios.length,
    mediaCentimos: media,
    desdeCentimos: Math.min(...precios),
    hastaCentimos: Math.max(...precios),
    diferenciaCentimos: diferencia,
    como,
  };
}

/** Cuándo se puede volver a analizar la zona, o nulo si ya se puede. */
export function cuandoSePuedeOtraVez(ultimo: Date | null, ahora: Date): Date | null {
  if (ultimo === null) return null;
  const otraVez = new Date(ultimo.getTime() + HORAS_ENTRE_ANALISIS_DE_ZONA * 3_600_000);
  return otraVez > ahora ? otraVez : null;
}
