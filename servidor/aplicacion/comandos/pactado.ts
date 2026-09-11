import { z } from 'zod';
import { publicar } from '../../eventos/bandeja.ts';
import { laOrganizacionDeLaSesion } from '../alta.ts';
import { elProveedor } from '../compras.ts';
import { comando, FalloDeAplicacion } from '../contrato.ts';
import { costeDeUso } from '../inventario.ts';

/**
 * Lo pactado (M7) · «Makro me deja el aceite a 42 € hasta diciembre».
 *
 * «Contratos marco con precio de referencia, **para comparar lo pactado con lo que
 *  de verdad te cobran**» (Manifiesto 12). Lo pactado no es un precio: es una
 * promesa. El precio lo pone el albarán y lo confirma la factura; lo pactado está
 * para que, cuando no coincidan, se diga.
 *
 * Es de cada local. El contrato de toda una cadena —el mismo precio para el mismo
 * producto en todos sus locales— necesita el catálogo maestro y es M24, que es
 * donde vive «la comparativa de precios de compra frente al contrato marco».
 */

const fecha = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha se escribe así: 2026-12-31.');

export const entradaPactarPrecio = z
  .object({
    producto_id: z.string().uuid(),
    proveedor_id: z.string().uuid(),
    /** Por formato, sin impuestos. */
    precio_centimos: z.number().int().min(0).max(100_000_000),
    /** Hasta cuándo vale. Nulo: sin fecha. */
    hasta: fecha.nullable().optional(),
    nota: z.string().trim().max(400).nullable().optional(),
  })
  .strict();

export type EntradaPactarPrecio = z.infer<typeof entradaPactarPrecio>;

export const pactarPrecio = comando<EntradaPactarPrecio, { pactadoId: string }>({
  nombre: 'pactar_precio',
  entrada: entradaPactarPrecio,
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
        from estook.producto where id = ${entrada.producto_id}
    `;
    const producto = productos[0];
    if (!producto) {
      throw new FalloDeAplicacion('no_existe', {
        porque: 'Ese producto no está, o no es de un local que puedas ver.',
      });
    }

    const proveedor = await elProveedor(contexto, entrada.proveedor_id);
    if (proveedor.localId !== producto.local_id) {
      throw new FalloDeAplicacion('no_existe', {
        porque: 'Ese proveedor no es del mismo local que el producto.',
      });
    }

    // Uno vivo por producto y proveedor: pactar otra vez sustituye lo de antes, y
    // lo de antes se queda anulado —no borrado— para poder decir qué se pactó.
    await contexto.sql`
      update estook.precio_pactado set anulado_en = now()
       where producto_id = ${entrada.producto_id} and proveedor_id = ${entrada.proveedor_id}
         and anulado_en is null
    `;

    const factor = Number(producto.factor);
    const rendimiento = Number(producto.rendimiento);

    const puestos = await contexto.sql<{ id: string }[]>`
      insert into estook.precio_pactado (
        producto_id, proveedor_id, precio_centimos, formato, factor, unidad_de_uso,
        rendimiento, coste_milesimas, desde, hasta, nota, creado_por
      )
      values (
        ${entrada.producto_id}, ${entrada.proveedor_id}, ${entrada.precio_centimos},
        ${producto.formato}, ${factor}, ${producto.unidad_de_uso}::estook.unidad_de_uso,
        ${rendimiento}, ${costeDeUso(entrada.precio_centimos, factor, rendimiento)},
        current_date, ${entrada.hasta ?? null}::date, ${entrada.nota ?? null}, ${contexto.personaId}
      )
      returning id
    `;
    const pactadoId = puestos[0]?.id;
    if (pactadoId === undefined) throw new FalloDeAplicacion('sin_permiso');

    const organizacionId = laOrganizacionDeLaSesion(contexto);
    await contexto.sql`
      select estook.anotar(
        ${organizacionId}::uuid, 'crear', 'precio_pactado', ${pactadoId}, ${producto.local_id}::uuid, null,
        ${JSON.stringify({ producto: producto.nombre, proveedor: proveedor.nombre, precio_centimos: entrada.precio_centimos, hasta: entrada.hasta ?? null })}::text::jsonb,
        null
      )
    `;

    await publicar(contexto.sql, {
      tipo: 'precio.pactado',
      organizacionId,
      localId: producto.local_id,
      datos: {
        pactadoId,
        productoId: entrada.producto_id,
        proveedorId: entrada.proveedor_id,
        precioCentimos: entrada.precio_centimos,
        hasta: entrada.hasta ?? null,
      },
      correlacionId: contexto.correlacionId,
    });

    return { pactadoId };
  },
});

export const entradaDejarDePactar = z.object({ pactado_id: z.string().uuid() }).strict();

export type EntradaDejarDePactar = z.infer<typeof entradaDejarDePactar>;

export const dejarDePactar = comando<EntradaDejarDePactar, { pactadoId: string }>({
  nombre: 'dejar_de_pactar',
  entrada: entradaDejarDePactar,
  exige: 'dato.precio_de_compra',

  async ejecutar(contexto, entrada) {
    const filas = await contexto.sql<{ local_id: string; anulado: boolean }[]>`
      select p.local_id, pp.anulado_en is not null as anulado
        from estook.precio_pactado pp
        join estook.producto p on p.id = pp.producto_id
       where pp.id = ${entrada.pactado_id}
    `;
    const pactado = filas[0];
    if (!pactado) {
      throw new FalloDeAplicacion('no_existe', { porque: 'Eso pactado ya no está.' });
    }
    if (pactado.anulado) return { pactadoId: entrada.pactado_id };

    await contexto.sql`
      update estook.precio_pactado set anulado_en = now() where id = ${entrada.pactado_id}
    `;

    await contexto.sql`
      select estook.anotar(
        ${laOrganizacionDeLaSesion(contexto)}::uuid, 'cambiar', 'precio_pactado', ${entrada.pactado_id},
        ${pactado.local_id}::uuid, null, ${JSON.stringify({ anulado: true })}::text::jsonb, null
      )
    `;

    return { pactadoId: entrada.pactado_id };
  },
});
