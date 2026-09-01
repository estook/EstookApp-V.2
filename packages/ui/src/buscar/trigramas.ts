/**
 * Parecido por trigramas, para las acciones del buscador.
 *
 * ── Por que hay dos buscadores y no es duplicar un calculo ───────────────────
 *
 * La regla 6 dice que un calculo tiene un unico dueno, asi que conviene dejar
 * claro que aqui no se rompe:
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
 *
 * Se copia el metodo de `pg_trgm` a proposito, para que las dos mitades de la
 * misma lista se comporten igual: la misma errata perdona lo mismo en un local
 * que en una accion. Si no, el buscador se sentiria de dos maneras.
 */

/**
 * Las letras que **no** se deshacen en «letra + tilde».
 *
 * `normalize('NFD')` parte la «á» en «a» y su acento, y asi se quita solo. Pero
 * la «ø» danesa, la «ł» polaca y la «đ» croata no son eso: son letras enteras y
 * distintas, y NFD las deja tal cual. Sin esta lista, buscar «Soren» no
 * encontraria a «Søren», y la mitad de castellana del buscador perdonaria cosas
 * que la mitad de Postgres no.
 */
const LETRAS_APARTE: Readonly<Record<string, string>> = {
  ø: 'o',
  Ø: 'o',
  ł: 'l',
  Ł: 'l',
  đ: 'd',
  Đ: 'd',
  ß: 'ss',
};

/** Minusculas y sin acentos, igual que `estook.sin_acentos` en la migracion 0017. */
export function sinAcentos(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[øØłŁđĐß]/g, (letra) => LETRAS_APARTE[letra] ?? letra)
    .toLowerCase();
}

/**
 * Los trigramas de un texto, como los hace `pg_trgm`.
 *
 * Cada palabra se rellena con dos espacios delante y uno detras, para que el
 * principio y el final de palabra cuenten. Es lo que hace que «inv» se parezca a
 * «inventario» mucho mas que «ari».
 */
export function trigramas(texto: string): ReadonlySet<string> {
  const palabras = sinAcentos(texto)
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .split(' ')
    .filter(Boolean);

  const salida = new Set<string>();

  for (const palabra of palabras) {
    const relleno = `  ${palabra} `;
    for (let i = 0; i + 3 <= relleno.length; i++) {
      salida.add(relleno.slice(i, i + 3));
    }
  }

  return salida;
}

/**
 * Cuanto se parecen dos textos, de 0 a 1.
 *
 * Es el indice de Jaccard sobre sus trigramas: lo que comparten entre todo lo
 * que tienen. La misma cuenta que `similarity()` de Postgres.
 */
export function parecido(uno: string, otro: string): number {
  const a = trigramas(uno);
  const b = trigramas(otro);
  if (a.size === 0 || b.size === 0) return 0;

  let comunes = 0;
  for (const trozo of a) if (b.has(trozo)) comunes += 1;

  return comunes / (a.size + b.size - comunes);
}

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
