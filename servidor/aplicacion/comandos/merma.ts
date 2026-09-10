import { z } from 'zod';
import { MOTIVOS_DE_MERMA, partidaDe, valorDeLaMerma } from '@estook/dominio';
import { publicar } from '../../eventos/bandeja.ts';
import { laOrganizacionDeLaSesion } from '../alta.ts';
import { comando } from '../contrato.ts';
import { apuntar, elProductoBloqueado, loQueHay } from '../inventario.ts';

/**
 * Apuntar una merma (M6½).
 *
 * ── Lo que llevaba doce migraciones sin poder hacerse ───────────────────────
 *
 * El tipo de movimiento `merma` está en el catálogo desde la 0023 y el permiso
 * `accion.registrar_merma` desde M1, y lo tienen el camarero, el cocinero, el jefe
 * de sala y el jefe de cocina. **No había forma de apuntar ninguna.** Lo que se
 * hacía en su lugar era una salida con el motivo escrito a mano, y un texto libre
 * no se puede sumar: «¿cuánto se me ha ido en producto caducado este mes?» no se
 * contesta con un `like`.
 *
 * ── Por qué es un comando aparte y no una salida con motivo ─────────────────
 *
 * Porque una merma **no es una salida**. Una salida es género que se va —un
 * traspaso, un catering, un pedido— y sigue existiendo en algún sitio. Una merma
 * es género que se ha perdido, y eso es una cifra del negocio: sube el food cost,
 * entra en la desviación del periodo y es lo primero que mira alguien cuando el
 * margen no sale.
 *
 * Y por la regla que ordena todo esto: «la comida del personal **no es merma**, ni
 * las invitaciones: van con motivo propio y **como partida aparte**, o el food
 * cost miente» (Manifiesto 28). Esa separación necesita un motivo de una lista
 * cerrada, y una salida no lo tiene.
 *
 * ── El camarero puede, y por eso la política cambió ─────────────────────────
 *
 * Escribir en el libro pedía `app.inventario` en «ver y editar», que un camarero
 * no tiene. Y el camarero es quien rompe una copa. La política de la 0028 deja
 * apuntar en el libro con Inventario **o** con permiso de merma, y en el segundo
 * caso **solo mermas**: un camarero no apunta una entrada de género.
 */

export const entradaApuntarMerma = z
  .object({
    producto_id: z.string().uuid(),
    /** En unidades de uso, y positiva: aquí no se manda el signo. */
    cuanto: z.number().positive().max(10_000_000),
    motivo: z.enum(MOTIVOS_DE_MERMA),
    /**
     * Qué pasó, en una frase. Obligatorio con «otra cosa» —lo exige también la
     * restricción de la base— y opcional en el resto.
     */
    detalle: z.string().trim().max(400).nullable().optional(),
  })
  .strict()
  .refine((e) => e.motivo !== 'otro' || (e.detalle ?? '').trim().length > 0, {
    message: '«Otra cosa» sin explicar es lo mismo que no poner motivo. Escribe qué pasó.',
    path: ['detalle'],
  });

export type EntradaApuntarMerma = z.infer<typeof entradaApuntarMerma>;

export interface SalidaApuntarMerma {
  readonly movimientoId: string;
  readonly cantidad: number;
  readonly unidadDeUso: string;
  readonly fechaOperativa: string;
  readonly partida: string;
  /**
   * Lo que ha costado, si quien apunta puede ver precios.
   *
   * Un cocinero apunta la merma y **no ve lo que vale**: es la misma regla que
   * ordena Inventario entera —«un rol sin costes no recibe ni un campo de coste en
   * ninguna respuesta»— y no se esconde en la pantalla, no se envía.
   */
  readonly valorCentimos?: number | null;
}

export const apuntarMerma = comando<EntradaApuntarMerma, SalidaApuntarMerma>({
  nombre: 'apuntar_merma',
  entrada: entradaApuntarMerma,
  exige: 'accion.registrar_merma',

  async ejecutar(contexto, entrada) {
    const producto = await elProductoBloqueado(contexto, entrada.producto_id);

    // Lo que hay **antes** de sacarlo: es con ese coste medio con el que se valora
    // lo perdido. Después de apuntar, el coste medio es el mismo —una salida no lo
    // mueve— pero leerlo antes deja claro de dónde sale el número.
    const antes = await loQueHay(contexto, producto.id);
    const valor = valorDeLaMerma(entrada.cuanto, antes.coste);

    const apuntado = await apuntar(contexto, producto, {
      tipo: 'merma',
      cantidad: -entrada.cuanto,
      motivo: entrada.detalle ?? null,
      motivoDeMerma: entrada.motivo,
      origen: 'a_mano',
      esEjemplo: producto.esEjemplo,
    });

    const puedePrecios = await contexto.sql<{ puede: boolean }[]>`
      select estook.puede_ver('dato.precio_de_compra', ${producto.localId}::uuid) as puede
    `;
    const conPrecios = puedePrecios[0]?.puede === true;

    await contexto.sql`
      select estook.anotar(
        ${laOrganizacionDeLaSesion(contexto)}::uuid, 'crear', 'movimiento_de_stock',
        ${apuntado.movimientoId}, ${producto.localId}::uuid, null,
        ${JSON.stringify({
          tipo: 'merma',
          motivo: entrada.motivo,
          cantidad: -entrada.cuanto,
          producto: producto.nombre,
        })}::jsonb,
        ${entrada.detalle ?? null}
      )
    `;

    // Y este **sí** publica evento, cuando la entrada y la salida no lo hacen. La
    // regla 14 pregunta a quién le importa, y aquí la respuesta es concreta: el
    // food cost del periodo, la desviación de M8 y, cuando hable, Fogón —que es
    // quien tiene que decir «llevas tres semanas tirando pulpo los martes».
    await publicar(contexto.sql, {
      tipo: 'merma.apuntada',
      organizacionId: laOrganizacionDeLaSesion(contexto),
      localId: producto.localId,
      datos: {
        productoId: producto.id,
        nombre: producto.nombre,
        cuanto: entrada.cuanto,
        motivo: entrada.motivo,
        partida: partidaDe(entrada.motivo),
        valorCentimos: valor,
      },
      correlacionId: contexto.correlacionId,
    });

    return {
      movimientoId: apuntado.movimientoId,
      cantidad: apuntado.despues.cantidad,
      unidadDeUso: producto.unidadDeUso,
      fechaOperativa: apuntado.fechaOperativa,
      partida: partidaDe(entrada.motivo),
      ...(conPrecios ? { valorCentimos: valor } : {}),
    };
  },
});
