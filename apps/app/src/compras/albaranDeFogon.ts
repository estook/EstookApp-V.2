import type { AlbaranLeido } from '../fogon/contrato.ts';

/** Una línea en la puerta: lo que se pidió y lo que se está apuntando que llega. */
export interface LineaAlRecibir {
  readonly clave: string;
  readonly lineaDePedidoId: string | null;
  readonly productoId: string;
  readonly producto: string;
  readonly formato: string | null;
  readonly factor: number;
  readonly unidadDeUso: string;
  readonly pesoVariable: boolean;
  /** En formatos. Nulo si no estaba en el pedido. */
  readonly pedida: number | null;
  readonly formatos: number;
  /** Para el peso variable: lo que dice la báscula, escrito. */
  readonly kilos: string;
  /** Por formato, sin impuestos. */
  readonly precio: number | null;
  /** Para el peso variable: lo que cobra la línea entera. */
  readonly importe: number | null;
  readonly rechazada: boolean;
  readonly lote: string;
  readonly caducaEl: string;
  readonly nota: string;
  readonly conDetalle: boolean;
}

export interface LoQueDejaElAlbaran {
  readonly lineas: LineaAlRecibir[];
  /** Las claves de las líneas que ha tocado Fogón: se marcan para revisarlas. */
  readonly deFogon: ReadonlySet<string>;
  /** Las del pedido que no salen en la foto: se marcan, no se tocan. */
  readonly noSalen: ReadonlySet<string>;
  /** Lo que ha leído y no se sabe cuál de tus productos es. */
  readonly sinCasar: readonly string[];
}

/** «1,5» para el peso: como se escribe en la caja. */
function enLetra(n: number): string {
  return String(Number(n.toFixed(3))).replace('.', ',');
}

/**
 * Lo leído por Fogón en la foto del albarán, puesto en las líneas de la puerta
 * (Fogón 1 · 2, decisión 0098).
 *
 *   · **Lo que estaba en el pedido** se rellena con lo que dice el papel: cuántos, el
 *     precio (solo a quien edita precios), el lote y la caducidad.
 *   · **Lo que no estaba** y es uno de tus productos, se añade como línea nueva.
 *   · **Lo que estaba y no sale en la foto se marca y no se toca**: puede que la foto no
 *     llegue a todo, y quitarlo sin decir nada sería apuntar de menos.
 *   · **Lo que no se sabe qué es** se dice, para añadirlo a mano.
 *
 * Nada de esto se apunta: la persona lo mira y pulsa «Apuntar lo que ha llegado».
 */
export function conLoLeidoDelAlbaran(
  antes: readonly LineaAlRecibir[],
  leido: Pick<AlbaranLeido, 'lineas'>,
  editaPrecios: boolean,
): LoQueDejaElAlbaran {
  const lineas = [...antes];
  const deFogon = new Set<string>();
  const sinCasar: string[] = [];

  leido.lineas.forEach((l, i) => {
    const producto = l.producto;
    if (producto === null) {
      if (l.texto.trim() !== '') sinCasar.push(l.texto.trim());
      return;
    }
    const donde = lineas.findIndex((x) => x.productoId === producto.id && !deFogon.has(x.clave));
    const precio = editaPrecios ? (l.precioCentimos ?? null) : null;
    const importe = editaPrecios ? (l.importeCentimos ?? null) : null;
    const lote = l.lote ?? '';
    const caducaEl = l.caducaEl ?? '';

    if (donde >= 0) {
      const ya = lineas[donde];
      if (ya === undefined) return;
      lineas[donde] = {
        ...ya,
        ...(ya.pesoVariable
          ? {
              kilos: l.cantidad === null ? ya.kilos : enLetra(l.cantidad),
              importe: importe ?? ya.importe,
            }
          : { formatos: l.formatos ?? ya.formatos, precio: precio ?? ya.precio }),
        lote: lote === '' ? ya.lote : lote,
        caducaEl: caducaEl === '' ? ya.caducaEl : caducaEl,
        conDetalle: ya.conDetalle || lote !== '' || caducaEl !== '',
      };
      deFogon.add(ya.clave);
      return;
    }

    const clave = `fogon-${String(i)}-${producto.id}`;
    lineas.push({
      clave,
      lineaDePedidoId: null,
      productoId: producto.id,
      producto: producto.nombre,
      formato: producto.formato,
      factor: producto.factor,
      unidadDeUso: producto.unidadDeUso,
      pesoVariable: producto.pesoVariable,
      pedida: null,
      formatos: l.formatos ?? 1,
      kilos: l.cantidad === null ? '' : enLetra(l.cantidad),
      precio,
      importe,
      rechazada: false,
      lote,
      caducaEl,
      nota: '',
      conDetalle: lote !== '' || caducaEl !== '',
    });
    deFogon.add(clave);
  });

  const noSalen = new Set(
    antes.filter((x) => x.lineaDePedidoId !== null && !deFogon.has(x.clave)).map((x) => x.clave),
  );
  // Si no ha casado nada, no se marca nada como «no sale»: la foto no era de esto.
  return {
    lineas,
    deFogon,
    noSalen: deFogon.size === 0 ? new Set() : noSalen,
    sinCasar,
  };
}
