import { z } from 'zod';
import { centimos, ivaDeCompraPorDefecto, sinIva } from '@estook/dominio';
import { elLocalDeLaSesion, laOrganizacionDeLaSesion } from '../alta.ts';
import { comando, FalloDeAplicacion } from '../contrato.ts';
import { ponerUnPrecio } from '../inventario.ts';

/**
 * Cómo escribe cada local sus precios de compra: con IVA o sin él (M7, repaso).
 *
 * «Actualmente cuento con los precios con IVA, pero estaría genial añadir una
 *  opción para elegir si el IVA está incluido o excluido, bien puesta: mira cómo
 *  lo gestionan las mejores aplicaciones y copia su estructura.»
 *
 * Está razonado en `packages/dominio/src/iva.ts`: **se guarda siempre sin IVA** y
 * lo que cambia es cómo se escribe. Aquí están las dos cosas que eso necesita:
 * decir cómo escribe este local, y **quitarle el IVA a lo que ya estaba
 * apuntado** con él, una sola vez.
 */

export const guardarPreciosConIva = comando<{ con_iva: boolean }, { conIva: boolean }>({
  nombre: 'guardar_precios_con_iva',
  entrada: z.object({ con_iva: z.boolean() }).strict(),
  exige: 'dato.precio_de_compra',

  async ejecutar(contexto, entrada) {
    const localId = elLocalDeLaSesion(contexto);
    const filas = await contexto.sql<{ id: string }[]>`
      update estook.local set precios_de_compra_con_iva = ${entrada.con_iva}
       where id = ${localId}
      returning id
    `;
    if (!filas[0]) throw new FalloDeAplicacion('sin_permiso');

    await contexto.sql`
      select estook.anotar(
        ${laOrganizacionDeLaSesion(contexto)}::uuid, 'cambiar', 'local', ${localId}, ${localId}::uuid,
        null, ${JSON.stringify({ precios_de_compra_con_iva: entrada.con_iva })}::text::jsonb, null
      )
    `;
    return { conIva: entrada.con_iva };
  },
});

export interface SalidaQuitarIva {
  /** Cuántos precios se han pasado a sin IVA. */
  readonly cambiados: number;
  /** Los que no tenían tipo —un local en Canarias, o sin categoría—, que se dejan como estaban. */
  readonly sinTipo: readonly string[];
}

/**
 * Pasar a sin IVA lo que ya estaba apuntado con él.
 *
 * Cada precio vigente de cada producto activo, con **su tipo** —el que se le
 * eligió, o el de su categoría—, se abre de nuevo desde hoy sin el impuesto. El
 * de antes queda en el histórico, como cualquier cambio de precio: nada se
 * reescribe, y en la ficha se ve que el precio bajó el día que se quitó el IVA.
 *
 * **Una sola vez por local**: la fecha queda guardada, y la segunda vez dice que
 * ya está hecho. Quitarle el IVA dos veces a un precio es dejarlo mal.
 *
 * Lo que ya entró en cámara no se toca: el libro no se reescribe. El valor medio
 * se irá poniendo al día con lo que llegue, que ya entra sin IVA.
 */
export const quitarIvaALosPrecios = comando<{ confirmado: true }, SalidaQuitarIva>({
  nombre: 'quitar_iva_a_los_precios',
  entrada: z.object({ confirmado: z.literal(true) }).strict(),
  exige: 'dato.precio_de_compra',

  async ejecutar(contexto) {
    const localId = elLocalDeLaSesion(contexto);

    // El candado del local: dos personas pulsando a la vez no lo quitan dos veces.
    await contexto.sql`select pg_advisory_xact_lock(hashtextextended(${`iva:${localId}`}, 0))`;

    const locales = await contexto.sql<{ territorio: string; hecho: boolean }[]>`
      select territorio::text as territorio, iva_quitado_de_los_precios_en is not null as hecho
        from estook.local where id = ${localId}
    `;
    const local = locales[0];
    if (!local) throw new FalloDeAplicacion('sin_permiso');
    if (local.hecho) {
      throw new FalloDeAplicacion('ya_hecho', {
        porque:
          'A los precios de este local ya se les quitó el IVA. Hacerlo otra vez los dejaría mal.',
      });
    }

    const vigentes = await contexto.sql<
      {
        producto_id: string;
        proveedor_id: string | null;
        precio: string;
        nombre: string;
        unidad_de_uso: string;
        formato: string | null;
        factor: string;
        rendimiento: string;
        iva: string | null;
        categoria_fiscal: string;
      }[]
    >`
      select pr.producto_id, pr.proveedor_id, pr.precio_centimos::text as precio,
             p.nombre, p.unidad_de_uso::text as unidad_de_uso, p.formato,
             p.factor::text as factor, p.rendimiento::text as rendimiento,
             p.iva_de_compra::text as iva, p.categoria_fiscal::text as categoria_fiscal
        from estook.precio_de_producto pr
        join estook.producto p on p.id = pr.producto_id
       where p.local_id = ${localId} and p.activo and pr.hasta is null
       order by p.nombre
    `;

    let cambiados = 0;
    const sinTipo: string[] = [];

    for (const v of vigentes) {
      const tipo =
        v.iva === null
          ? ivaDeCompraPorDefecto(v.categoria_fiscal, local.territorio)
          : Number(v.iva);
      if (tipo === null || tipo === 0) {
        if (!sinTipo.includes(v.nombre)) sinTipo.push(v.nombre);
        continue;
      }
      const puesto = await ponerUnPrecio(contexto, {
        productoId: v.producto_id,
        localId,
        nombre: v.nombre,
        unidadDeUso: v.unidad_de_uso,
        proveedorId: v.proveedor_id,
        precioCentimos: sinIva(centimos(Number(v.precio)), tipo),
        formato: v.formato,
        factor: Number(v.factor),
        rendimiento: Number(v.rendimiento),
        origen: 'a_mano',
        referencia: { motivo: 'se_quito_el_iva', tipo },
        soloSiCambia: true,
      });
      if (puesto !== null) cambiados += 1;
    }

    // Y desde hoy este local escribe con IVA: es lo que hacía, y se le quita al
    // guardar.
    await contexto.sql`
      update estook.local
         set iva_quitado_de_los_precios_en = now(),
             precios_de_compra_con_iva = true
       where id = ${localId}
    `;

    await contexto.sql`
      select estook.anotar(
        ${laOrganizacionDeLaSesion(contexto)}::uuid, 'cambiar', 'local', ${localId}, ${localId}::uuid,
        null, ${JSON.stringify({ iva_quitado_de_los_precios: cambiados, sin_tipo: sinTipo.length })}::text::jsonb,
        'Se paso a sin IVA lo que estaba apuntado con el'
      )
    `;

    return { cambiados, sinTipo };
  },
});
