/**
 * Una lista que va a un array de Postgres, **como texto**: `{"a","b"}` (M7).
 *
 * ── El fallo que esto evita, que es primo del de los JSON ────────────────────
 *
 * Al recibir un albarán sin incidencias, la lista vacía de incidencias viajaba
 * como una lista de JavaScript y el conductor de las pruebas la mandaba como un
 * texto vacío: «malformed array literal». Con incidencias funcionaba; sin ellas,
 * que es lo normal, no se podía recibir nada. Pasa con los arrays de **tipos
 * nuestros** —un `enum`—, que el conductor no conoce.
 *
 * Es la lección de la 0029 con otra forma: **lo que depende de cómo convierte el
 * conductor se escribe para que dé igual**. La lista va como texto con la forma
 * de un array, y la convierte Postgres, que hace lo mismo en las pruebas y en
 * producción. Se escribe `${comoLista(lista)}::text::uuid[]`.
 *
 * Cada elemento va entre comillas y con sus comillas y barras escapadas, así que
 * un nombre con una coma dentro no parte la lista en dos.
 */
export function comoLista(valores: readonly (string | number)[]): string {
  return `{${valores.map((valor) => `"${String(valor).replace(/[\\"]/g, '\\$&')}"`).join(',')}}`;
}
