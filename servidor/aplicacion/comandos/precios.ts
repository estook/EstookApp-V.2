import { z } from 'zod';
import { comando, FalloDeAplicacion } from '../contrato.ts';
import { ponerUnPrecio } from '../inventario.ts';

/**
 * El precio de compra (M6) · con vigencia, y sin reescribir el pasado.
 *
 * «Si cambia: **abre vigencia nueva**, la anterior queda en el histórico, y
 *  dispara el recálculo de todo lo que cuelga» (Auditoría 1.2).
 *
 * ── Lo que este comando no hace, y es la mitad del valor ─────────────────────
 *
 * No toca ni un dato del pasado. Ni el coste de un movimiento que ya está
 * apuntado, ni el precio medio de la cámara, ni ninguna venta. El precio nuevo
 * vale **desde hoy**; lo que entró la semana pasada entró al precio de la semana
 * pasada, y así seguirá el año que viene cuando alguien mire por qué subió el
 * food cost en septiembre.
 *
 * El precio medio ponderado sí se mueve, pero no aquí: se mueve cuando **entra
 * género** a ese precio, que es lo que de verdad cambia lo que hay en cámara.
 * Cambiar el precio de la lista sin recibir nada no vuelve más caro lo que ya
 * tienes guardado.
 *
 * Desde M7 la vigencia se abre en `ponerUnPrecio`, que es el mismo sitio que usan
 * el albarán y la factura: tres caminos para poner un precio, una sola forma de
 * hacerlo.
 */

export const entradaPonerPrecio = z
  .object({
    producto_id: z.string().uuid(),
    /** Lo que cuesta el formato de compra, en céntimos enteros (regla 9). */
    precio_centimos: z.number().int().min(0).max(100_000_000),
    proveedor_id: z.string().uuid().nullable().optional(),
    /**
     * El formato al que corresponde ese precio. Nulo = el que tenga el producto.
     * Se pasa cuando el proveedor sirve otro tamaño de caja, que es el caso de
     * «el producto cambia de formato» del Manifiesto 29.
     */
    formato: z.string().trim().max(120).nullable().optional(),
    factor: z.number().positive().max(1_000_000).optional(),
    rendimiento: z.number().positive().max(1).optional(),
  })
  .strict();

export type EntradaPonerPrecio = z.infer<typeof entradaPonerPrecio>;

export interface SalidaPonerPrecio {
  readonly precioId: string;
  readonly costeMilesimas: number;
  /** «Ha subido un 12 %.» Ya compuesta: se enseña tal cual. */
  readonly frase: string;
  readonly variacion: number | null;
}

export const ponerPrecio = comando<EntradaPonerPrecio, SalidaPonerPrecio>({
  nombre: 'poner_precio',
  entrada: entradaPonerPrecio,
  // **No es `app.inventario`, y esa es la diferencia que importa.** Un cocinero
  // lleva Inventario entera y no ve precios de compra: apunta lo que entra y lo
  // que sale, y lo que cuesta es cosa de quien compra.
  exige: 'dato.precio_de_compra',

  async ejecutar(contexto, entrada) {
    const productos = await contexto.sql<
      {
        local_id: string;
        nombre: string;
        formato: string | null;
        factor: string;
        unidad_de_uso: string;
        rendimiento: string;
      }[]
    >`
      select local_id, nombre, formato, factor::text as factor,
             unidad_de_uso::text as unidad_de_uso, rendimiento::text as rendimiento
        from estook.producto
       where id = ${entrada.producto_id}
    `;

    const producto = productos[0];
    if (!producto) {
      throw new FalloDeAplicacion('no_existe', {
        porque: 'Ese producto no está, o no es de un local que puedas ver.',
      });
    }

    const puesto = await ponerUnPrecio(contexto, {
      productoId: entrada.producto_id,
      localId: producto.local_id,
      nombre: producto.nombre,
      unidadDeUso: producto.unidad_de_uso,
      proveedorId: entrada.proveedor_id ?? null,
      precioCentimos: entrada.precio_centimos,
      formato: entrada.formato ?? producto.formato,
      factor: entrada.factor ?? Number(producto.factor),
      rendimiento: entrada.rendimiento ?? Number(producto.rendimiento),
      origen: 'a_mano',
    });

    // Sin `soloSiCambia`, siempre abre una: quien lo pone a mano lo pone a
    // propósito, aunque sea el mismo número.
    if (puesto === null) throw new FalloDeAplicacion('sin_permiso');

    return {
      precioId: puesto.precioId,
      costeMilesimas: puesto.costeMilesimas,
      frase: puesto.cambio.frase,
      variacion: puesto.cambio.variacion,
    };
  },
});
