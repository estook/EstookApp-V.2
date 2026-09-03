import { parecido, sinAcentos } from '@estook/dominio';

/**
 * El buscador de acciones de la barra (M3).
 *
 * ── Donde vive cada mitad, y por que ─────────────────────────────────────────
 *
 * El calculo de parecido —`sinAcentos`, `trigramas` y `parecido`— **se mudo a
 * `@estook/dominio` en M5**, porque el servidor lo necesita para proponer el
 * mapeo de columnas de una importacion y no puede importar React. Se reexporta
 * aqui para que quien lo usaba no note el cambio.
 *
 * Lo que se queda es lo de arriba: como se ordenan y se recortan **las acciones
 * de la barra**, que es una decision de esta pantalla y de ninguna otra.
 *
 * ── Y por que hay dos buscadores, que no es duplicar un calculo ──────────────
 *
 *   · **Los datos** (locales, personas, y desde M6 productos y platos) los busca
 *     Postgres con `pg_trgm`, en la migracion 0017. Es el dueno, y lo tiene que
 *     ser: son cien mil filas con politicas de seguridad encima.
 *   · **Las acciones** («ir a Inventario», «cambiar el tamano de letra») no estan
 *     en ninguna tabla. Son sitios y botones de la propia pantalla, y son
 *     veinte. Buscarlas es mirar una lista que ya esta en memoria.
 *
 * Son dos corpus distintos, no el mismo calculo dos veces. Y hacerlo aqui es lo
 * que permite que escribir «ajustes» y darle a `Enter` funcione **al instante y
 * sin conexion**, que es lo que se espera de un buscador de acciones.
 */
export { parecido, sinAcentos, trigramas } from '@estook/dominio';

/**
 * El umbral del buscador de acciones.
 *
 * Mas alto que el 0,18 de la migracion 0017, y a proposito: las acciones son
 * veinte y estan siempre delante, asi que colar una que no viene a cuento
 * molesta mas que en una lista de resultados. Y para las acciones ademas vale el
 * atajo de «lo que se escribe esta dentro del nombre», que se comprueba antes.
 */
export const UMBRAL = 0.3;

/**
 * Ordena una lista por lo que se parece a lo escrito, y tira lo que no llega.
 *
 * Dos formas de encajar, en este orden:
 *
 *   1. **Contenido.** Escribir «inv» tiene que encontrar «Inventario» sin
 *      discutir, y por trigramas eso da poco parecido porque «inv» es corto. Lo
 *      contenido gana siempre, y cuanto antes empiece, mejor: «Carta» antes que
 *      «Tarjeta de carta».
 *   2. **Parecido por trigramas**, para las erratas.
 *
 * ── El nombre se puntua; lo demas solo acompana ──────────────────────────────
 *
 * `textoDe` tiene que devolver **el nombre y nada mas**. El indice de Jaccard
 * castiga los textos largos: si se puntuara «Ir a Inventario · Que hay, que
 * falta y que se ha ido sin explicacion» contra «invetario», la errata dejaria
 * de encontrarse, porque los trigramas de la frase larga se comen el parecido.
 * Es exactamente por lo mismo que la migracion 0017 puntua contra el nombre del
 * local y no contra su ficha entera.
 *
 * Para lo que acompana (donde esta, de que va) esta `tambienEn`: **solo cuenta
 * si contiene** lo escrito, y nunca al reves. Asi buscar «margen» encuentra la
 * Carta por su descripcion, sin estropear la busqueda por nombre.
 */
export function filtrarPorParecido<T>(
  cosas: readonly T[],
  escrito: string,
  textoDe: (cosa: T) => string,
  umbral = UMBRAL,
  tambienEn?: (cosa: T) => string,
): T[] {
  const busca = sinAcentos(escrito.trim());
  if (busca === '') return [];

  const puntuadas = cosas
    .map((cosa) => {
      const nombre = sinAcentos(textoDe(cosa));
      if (nombre.includes(busca)) {
        return { cosa, punto: 2 - nombre.indexOf(busca) / 1000 };
      }

      const punto = parecido(escrito, textoDe(cosa));
      if (punto >= umbral) return { cosa, punto };

      // Lo de al lado, solo si lo contiene. Va por detras de todo lo anterior.
      const alLado = tambienEn === undefined ? '' : sinAcentos(tambienEn(cosa));
      if (alLado !== '' && alLado.includes(busca)) return { cosa, punto: umbral };

      return { cosa, punto };
    })
    .filter(({ punto }) => punto >= umbral);

  puntuadas.sort((a, b) => b.punto - a.punto);
  return puntuadas.map(({ cosa }) => cosa);
}
