import { z } from 'zod';
import { elLocalDeLaSesion, laOrganizacionDeLaSesion } from '../alta.ts';
import { comando, FalloDeAplicacion } from '../contrato.ts';

/**
 * Emparejar una línea de la caja con un producto (M8 · decisión 0079).
 *
 * «Basta con decir una vez que "Coca-Cola" de la caja es tu producto "Coca-Cola
 * 33 cl"» (el plan de M8, pregunta 1). Desde ese momento, lo que vende la caja de esa
 * línea cuenta como gastado del producto, y la desviación sale sola.
 *
 *   · Con producto: «esto es este producto», y cuánto gasta cada venta (1 de fábrica).
 *   · `ignorar`: «esto no es de almacén» —un plato, el pan, el menú—, y no se vuelve
 *     a proponer.
 *   · `quitar`: se deshace lo dicho, y la línea vuelve a proponerse.
 *
 * Lo hace quien responde del inventario y ve las ventas: la política de la 0061 pide
 * los dos, y aquí se dice antes para contestar en cristiano.
 */

export const entradaEmparejarConcepto = z
  .object({
    /** Como sale en la caja. Se junta sin mayúsculas ni acentos. */
    concepto: z.string().trim().min(1).max(200),
    producto_id: z.string().uuid().nullable().optional(),
    /** Cuánto gasta cada venta, en la unidad de uso del producto. */
    por_venta: z.number().positive().max(100_000).optional(),
    ignorar: z.boolean().optional(),
    quitar: z.boolean().optional(),
  })
  .strict()
  .refine(
    (e) =>
      Number(e.producto_id !== null && e.producto_id !== undefined) +
        Number(e.ignorar === true) +
        Number(e.quitar === true) ===
      1,
    {
      message: 'Di qué producto es, que no es de almacén, o que se quite. Una de las tres.',
      path: ['producto_id'],
    },
  );

export type EntradaEmparejarConcepto = z.infer<typeof entradaEmparejarConcepto>;

export const emparejarConcepto = comando<
  EntradaEmparejarConcepto,
  { readonly concepto: string; readonly como: 'emparejado' | 'ignorado' | 'quitado' }
>({
  nombre: 'emparejar_concepto',
  entrada: entradaEmparejarConcepto,
  exige: 'accion.cerrar_recuento',

  async ejecutar(contexto, entrada) {
    const localId = elLocalDeLaSesion(contexto);
    const organizacionId = laOrganizacionDeLaSesion(contexto);

    const ventas = await contexto.sql<{ puede: boolean }[]>`
      select estook.puede_ver('dato.ventas', ${localId}::uuid) as puede
    `;
    if (ventas[0]?.puede !== true) {
      throw new FalloDeAplicacion('sin_permiso', {
        porque: 'Para emparejar la caja hay que poder ver las ventas, y tu acceso no las ve.',
      });
    }

    if (entrada.quitar === true) {
      await contexto.sql`
        delete from estook.concepto_de_caja
         where local_id = ${localId}
           and concepto_normalizado = estook.sin_acentos(lower(btrim(${entrada.concepto})))
      `;
    } else {
      const productoId = entrada.producto_id ?? null;
      if (productoId !== null) {
        // Del local y de una zona que se ve: el cocinero no empareja lo de la barra.
        const productos = await contexto.sql<{ id: string }[]>`
          select id from estook.producto
           where id = ${productoId} and local_id = ${localId} and activo
             and zona = any ((select estook.zonas_que_ve(${localId}::uuid))::estook.zona_del_producto[])
        `;
        if (productos.length === 0) {
          throw new FalloDeAplicacion('no_existe', {
            porque: 'Ese producto no está en este local, o no es de tu zona.',
          });
        }
      }
      // El normalizado lo pone la base (0061): se manda algo para el «not null».
      await contexto.sql`
        insert into estook.concepto_de_caja (
          local_id, concepto, concepto_normalizado, producto_id, por_venta, ignorado,
          emparejado_por
        )
        values (
          ${localId}, ${entrada.concepto}, '', ${productoId}, ${entrada.por_venta ?? 1},
          ${productoId === null}, ${contexto.personaId}
        )
        on conflict (local_id, concepto_normalizado) do update
          set concepto = excluded.concepto,
              producto_id = excluded.producto_id,
              por_venta = excluded.por_venta,
              ignorado = excluded.ignorado,
              emparejado_por = excluded.emparejado_por,
              emparejado_en = now()
      `;
    }

    const como =
      entrada.quitar === true ? 'quitado' : entrada.ignorar === true ? 'ignorado' : 'emparejado';
    await contexto.sql`
      select estook.anotar(
        ${organizacionId}::uuid, ${como === 'quitado' ? 'borrar' : 'cambiar'}, 'concepto_de_caja',
        ${entrada.concepto}, ${localId}::uuid, null,
        ${JSON.stringify({ concepto: entrada.concepto, producto: entrada.producto_id ?? null, por_venta: entrada.por_venta ?? 1, como })}::text::jsonb,
        null
      )
    `;

    return { concepto: entrada.concepto, como };
  },
});
