/**
 * El recuento · «hemos hecho inventario, esto es lo que hay» (M7).
 *
 * ── Qué es, y en qué se diferencia de apuntar una entrada ───────────────────
 *
 * Un recuento **no suma**: dice lo que hay. Se cuenta la cámara con una hoja en
 * la mano, se escribe lo contado, y cada producto pasa a valer eso. La diferencia
 * con lo que decía el libro se apunta como un movimiento de tipo `recuento`, con
 * su fecha y con quién lo hizo, porque «el stock es un libro de movimientos» y
 * también aquí: no se corrige el pasado, se apunta la corrección.
 *
 * Esa diferencia tiene nombre y es la cifra que se viene a buscar: **la
 * desviación**. Si el libro decía 43 kg y hay 38, faltan 5 que no los apuntó
 * nadie. Un recuento que solo pusiera los números bien y no dijera cuánto
 * bailaban sería media herramienta.
 *
 * ── Lo que NO hace, y hay que decirlo ───────────────────────────────────────
 *
 * **No pone a cero lo que no se ha contado.** Contar la cámara un martes y el
 * almacén el jueves es lo normal, y si el primero borrase el segundo, hacer
 * inventario por partes sería imposible. Quien quiera vaciar lo no contado lo
 * dice a propósito, y se le enseña cuántos productos se va a llevar por delante
 * antes de tocar nada.
 */

/** Una línea de lo contado: un producto y lo que hay de verdad. */
export interface LoContado {
  readonly productoId: string;
  /** En la unidad de uso del producto. Cero vale: «no queda nada» es un dato. */
  readonly hay: number;
}

/** Lo que hay que hacer con lo que no se ha contado. */
export const QUE_HAGO_CON_LO_QUE_FALTA = ['dejarlo', 'a_cero'] as const;

export type QueHagoConLoQueFalta = (typeof QUE_HAGO_CON_LO_QUE_FALTA)[number];

export const NOMBRE_DE_LO_QUE_FALTA: Readonly<Record<QueHagoConLoQueFalta, string>> = {
  dejarlo: 'Dejarlo como está',
  a_cero: 'Ponerlo a cero',
};

export const QUE_ES_LO_QUE_FALTA: Readonly<Record<QueHagoConLoQueFalta, string>> = {
  dejarlo: 'Lo que no hayas contado se queda con lo que dice el libro',
  a_cero: 'Lo que no hayas contado pasa a cero. Solo si has contado el local entero',
};

export function esQueHagoConLoQueFalta(valor: unknown): valor is QueHagoConLoQueFalta {
  return (
    typeof valor === 'string' && (QUE_HAGO_CON_LO_QUE_FALTA as readonly string[]).includes(valor)
  );
}

/** Una línea de un CSV de recuento que sí se ha entendido. */
export interface LineaDeRecuento {
  /** Tal cual viene escrito: puede ser el nombre o el código de barras. */
  readonly cual: string;
  readonly hay: number;
}

export interface LoQueTraeElRecuento {
  readonly lineas: readonly LineaDeRecuento[];
  readonly noEntendidas: readonly { readonly fila: number; readonly texto: string }[];
}

/**
 * Lee el fichero de un recuento: qué producto y cuánto hay.
 *
 * Dos columnas y nada más, porque es lo que sale de cualquier sitio —una hoja de
 * cálculo, la exportación de otro programa, lo que teclea alguien en el móvil— y
 * porque pedir un formato concreto es pedir que nadie lo use.
 *
 * Es el mismo lector que el del cierre de caja (`leerUnCsvDeCierre`) con otras
 * columnas: separador adivinado, número español, cabecera saltada, y **lo que no
 * se entiende se dice con su número de fila** en vez de tragárselo. Un fichero
 * que se importa a medias sin avisar es peor que uno que falla.
 */
export function leerUnCsvDeRecuento(texto: string): LoQueTraeElRecuento {
  const lineas: LineaDeRecuento[] = [];
  const noEntendidas: { fila: number; texto: string }[] = [];

  const filas = texto
    .split(/\r?\n/)
    .map((fila) => fila.trim())
    .filter((fila) => fila !== '');

  if (filas.length === 0) return { lineas: [], noEntendidas: [] };

  const primera = filas[0] ?? '';
  const cuantos = (cual: string) => primera.split(cual).length - 1;
  const separador = cuantos(';') > 0 ? ';' : cuantos('\t') > 0 ? '\t' : ',';

  filas.forEach((fila, indice) => {
    const celdas = fila.split(separador).map((celda) => celda.trim().replace(/^"|"$/g, ''));
    const cual = celdas[0] ?? '';
    const hay = comoNumero(celdas[1] ?? '');

    // La cabecera: la primera fila sin número al lado. No es un error.
    if (indice === 0 && hay === null) return;

    // Y aquí el cero **sí vale**, al revés que en el cierre: «no queda nada» es
    // justo lo que más falta hace apuntar de un recuento.
    if (cual === '' || hay === null || hay < 0) {
      noEntendidas.push({ fila: indice + 1, texto: fila.slice(0, 120) });
      return;
    }

    lineas.push({ cual, hay });
  });

  return { lineas, noEntendidas };
}

/**
 * Un número de un CSV español: `1.234,50` es 1234,5.
 *
 * Copiado a conciencia de `cierre.ts` y no compartido: son dos lectores de dos
 * ficheros distintos, y juntarlos en un «lector de CSV» genérico es cómo se acaba
 * con una función con cinco parámetros que no sirve bien para ninguno de los dos.
 */
function comoNumero(celda: string): number | null {
  const limpio = celda.replace(/[^\d,.-]/g, '');
  if (limpio === '') return null;

  const conComa = limpio.includes(',');
  const normal = conComa ? limpio.replace(/\./g, '').replace(',', '.') : limpio;

  const valor = Number(normal);
  return Number.isFinite(valor) ? valor : null;
}
