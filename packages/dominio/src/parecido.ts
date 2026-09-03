/**
 * Parecido por trigramas · el mismo método que `pg_trgm` (M3, movido en M5).
 *
 * ── Por qué vive aquí desde M5 ───────────────────────────────────────────────
 *
 * Nació en `@estook/ui`, porque quien lo necesitaba era el buscador de acciones.
 * En M5 lo necesita también el servidor, para proponer el mapeo de columnas de
 * una importación: emparejar «Correo electrónico» con `correo` es parecido de
 * texto, exactamente el mismo cálculo.
 *
 * Copiarlo habría roto la regla 6 —un cálculo, un único dueño— y el servidor no
 * puede importar `@estook/ui`, que es React y no cabe en la función de Deno. Así
 * que el cálculo se muda a donde vive el cálculo puro, y `@estook/ui` lo
 * reexporta para no cambiar a quien ya lo usaba.
 *
 * ── Y por qué esto no duplica lo que hace Postgres ───────────────────────────
 *
 * **Los datos** —locales, personas, y desde M6 productos— los busca Postgres con
 * `pg_trgm` (migración 0017): son muchas filas con políticas de seguridad
 * encima, y es su dueño. Esto es para corpus que ya están en memoria: veinte
 * acciones de un buscador, o las ocho columnas de un fichero CSV. Son problemas
 * distintos, y se copia el método a propósito para que la misma errata perdone
 * lo mismo en los dos sitios.
 */

/**
 * Las letras que **no** se deshacen en «letra + tilde».
 *
 * `normalize('NFD')` parte la «á» en «a» y su acento, y así se quita solo. Pero
 * la «ø» danesa, la «ł» polaca y la «đ» croata no son eso: son letras enteras y
 * distintas, y NFD las deja tal cual. Sin esta lista, buscar «Soren» no
 * encontraría a «Søren», y la mitad castellana del buscador perdonaría cosas que
 * la mitad de Postgres no.
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

/** Minúsculas y sin acentos, igual que `estook.sin_acentos` en la migración 0017. */
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
 * Cada palabra se rellena con dos espacios delante y uno detrás, para que el
 * principio y el final de palabra cuenten. Es lo que hace que «inv» se parezca a
 * «inventario» mucho más que «ari».
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
 * Cuánto se parecen dos textos, de 0 a 1.
 *
 * Es el índice de Jaccard sobre sus trigramas: lo que comparten entre todo lo
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
 * De un texto libre a un código: minúsculas, sin acentos y con guiones.
 *
 * Lo usan el alta, al crear un local, y cualquier sitio que necesite un
 * identificador legible. Sale del mismo `sinAcentos` que el buscador **a
 * propósito**: así el código de un local y la forma en que se le busca no
 * discrepan nunca.
 */
export function comoCodigo(texto: string, largoMaximo = 40): string {
  return sinAcentos(texto)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, largoMaximo);
}
