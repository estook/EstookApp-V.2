import { z } from 'zod';
import { comoHaCambiado } from '@estook/dominio';
import { publicar } from '../../eventos/bandeja.ts';
import { laOrganizacionDeLaSesion } from '../alta.ts';
import { comando, FalloDeAplicacion } from '../contrato.ts';
import { costeDeUso } from '../inventario.ts';

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
    const organizacionId = laOrganizacionDeLaSesion(contexto);

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

    const factor = entrada.factor ?? Number(producto.factor);
    const rendimiento = entrada.rendimiento ?? Number(producto.rendimiento);
    const formato = entrada.formato ?? producto.formato;
    const proveedorId = entrada.proveedor_id ?? null;

    // El que estaba vigente **de ese mismo proveedor**: dos proveedores tienen
    // dos precios vivos a la vez, que es lo que permite compararlos.
    const vigentes = await contexto.sql<{ id: string; precio_centimos: string }[]>`
      select id, precio_centimos::text as precio_centimos
        from estook.precio_de_producto
       where producto_id = ${entrada.producto_id}
         and hasta is null
         and proveedor_id is not distinct from ${proveedorId}::uuid
    `;

    const anterior = vigentes[0];
    const cambio = comoHaCambiado(
      anterior === undefined ? null : Number(anterior.precio_centimos),
      entrada.precio_centimos,
    );

    if (anterior !== undefined) {
      // Se cierra **ayer**, no hoy: si se cerrara hoy, el vigente nuevo y el
      // viejo compartirían el día de hoy y una consulta por fecha devolvería
      // dos precios para el mismo momento.
      await contexto.sql`
        update estook.precio_de_producto
           set hasta = greatest(desde, current_date - 1)
         where id = ${anterior.id}
      `;
    }

    const coste = costeDeUso(entrada.precio_centimos, factor, rendimiento);

    const puestos = await contexto.sql<{ id: string }[]>`
      insert into estook.precio_de_producto (
        producto_id, proveedor_id, precio_centimos, formato, factor, unidad_de_uso,
        rendimiento, coste_milesimas, desde, origen, creado_por
      )
      values (
        ${entrada.producto_id}, ${proveedorId}, ${entrada.precio_centimos}, ${formato},
        ${factor}, ${producto.unidad_de_uso}::estook.unidad_de_uso, ${rendimiento},
        ${coste}, current_date, 'a_mano', ${contexto.personaId}
      )
      returning id
    `;

    const precioId = puestos[0]?.id;
    if (precioId === undefined) throw new FalloDeAplicacion('sin_permiso');

    await contexto.sql`
      select estook.anotar(
        ${organizacionId}::uuid, 'cambiar', 'precio_de_producto', ${precioId},
        ${producto.local_id}::uuid,
        ${anterior === undefined ? null : JSON.stringify({ precio_centimos: Number(anterior.precio_centimos) })}::jsonb,
        ${JSON.stringify({ precio_centimos: entrada.precio_centimos, coste_milesimas: coste })}::jsonb,
        null
      )
    `;

    // **El principio de la cascada de la Auditoría 2.1.** Aquí acaba lo que M6
    // puede hacer: se cierra la vigencia anterior, se abre la nueva y se avisa.
    // Lo de después —recalcular las elaboraciones que lo llevan, y de ahí los
    // platos, y de ahí margen, food cost y alerta— necesita fichas técnicas, y
    // esas son M9. El evento se publica ya, con la variación dentro, porque un
    // evento que se añade después no trae el pasado consigo.
    await publicar(contexto.sql, {
      tipo: 'precio.cambiado',
      organizacionId,
      localId: producto.local_id,
      datos: {
        productoId: entrada.producto_id,
        nombre: producto.nombre,
        proveedorId,
        precioCentimos: entrada.precio_centimos,
        costeMilesimas: coste,
        variacion: cambio.variacion,
      },
      correlacionId: contexto.correlacionId,
    });

    return {
      precioId,
      costeMilesimas: coste,
      frase: cambio.frase,
      variacion: cambio.variacion,
    };
  },
});
