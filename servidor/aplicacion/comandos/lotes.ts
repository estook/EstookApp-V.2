import { z } from 'zod';
import { partidaDe, valorDeLaMerma } from '@estook/dominio';
import { publicar } from '../../eventos/bandeja.ts';
import { laOrganizacionDeLaSesion } from '../alta.ts';
import { comando, FalloDeAplicacion } from '../contrato.ts';
import { apuntar, elProductoBloqueado, loQueHay } from '../inventario.ts';

/**
 * Los lotes: quitarlos cuando se gastan o se tiran, y congelarlos (M7, repaso).
 *
 * «Si hay un producto caducado, poder quitarlo con un botón de quitar en ese
 *  lote; si no, se queda siempre y no tiene sentido. Si se gasta o se tira el que
 *  estaba a punto de caducar o caducado, se tiene que poder quitar.»
 *
 * Y «indicar en el producto que está congelado, cuándo se congeló, y que salga
 *  "congelado", así tienen en mente lo que hay en la cámara de congelados».
 *
 * ── Quitar no es borrar ──────────────────────────────────────────────────────
 *
 * El lote se queda, marcado con cuándo, quién y cómo se quitó, y deja de avisar:
 * sale de «Caduca esta semana», del widget y del Calendario. Dos formas, porque
 * son dos cosas distintas para el negocio:
 *
 *   **Se ha gastado**  se usó entero. No mueve nada: lo que salió de cámara ya
 *                      salió con cada plato, o saldrá con el recuento de M8.
 *   **Se ha tirado**   es una **merma**, con motivo «caducado», y sale de cámara
 *                      por `apuntar` como cualquier otra. Sin eso, el food cost
 *                      del mes no sabría que se tiró.
 */

const fecha = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha se escribe así: 2026-09-30.');

export const entradaQuitarLote = z
  .object({
    lote_id: z.string().uuid(),
    como: z.enum(['gastado', 'tirado']),
    /** Lo que se tira, en unidades de uso. Solo al tirarlo. */
    cuanto: z.number().positive().max(10_000_000).optional(),
  })
  .strict()
  .refine((e) => e.como !== 'tirado' || (e.cuanto ?? 0) > 0, {
    message: 'Dime cuánto se tira: es lo que sale de cámara como merma.',
    path: ['cuanto'],
  });

export type EntradaQuitarLote = z.infer<typeof entradaQuitarLote>;

export interface SalidaQuitarLote {
  readonly loteId: string;
  readonly como: 'gastado' | 'tirado';
  /** Lo que queda en cámara después de tirarlo. Solo al tirarlo. */
  readonly quedan?: number;
}

export const quitarLote = comando<EntradaQuitarLote, SalidaQuitarLote>({
  nombre: 'quitar_lote',
  entrada: entradaQuitarLote,
  exige: 'app.inventario',

  async ejecutar(contexto, entrada) {
    const organizacionId = laOrganizacionDeLaSesion(contexto);

    const filas = await contexto.sql<
      {
        id: string;
        local_id: string;
        producto_id: string;
        codigo: string | null;
        retirado: boolean;
      }[]
    >`
      select id, local_id, producto_id, codigo, retirado_en is not null as retirado
        from estook.lote where id = ${entrada.lote_id}
    `;
    const lote = filas[0];
    if (!lote) {
      throw new FalloDeAplicacion('no_existe', {
        porque: 'Ese lote no está, o no es de un local que puedas ver.',
      });
    }
    if (lote.retirado) {
      throw new FalloDeAplicacion('ya_hecho', { porque: 'Ese lote ya está quitado.' });
    }

    // El candado del producto, como en cualquier cosa que toca su cámara: dos
    // personas quitando el mismo lote a la vez no dejan dos mermas.
    const producto = await elProductoBloqueado(contexto, lote.producto_id);

    let quedan: number | undefined;
    if (entrada.como === 'tirado') {
      const cuanto = entrada.cuanto ?? 0;
      const antes = await loQueHay(contexto, producto.id);
      const valor = valorDeLaMerma(cuanto, antes.coste);

      const apuntado = await apuntar(contexto, producto, {
        tipo: 'merma',
        cantidad: -cuanto,
        motivo: lote.codigo === null ? 'Caducado' : `Lote ${lote.codigo}, caducado`,
        motivoDeMerma: 'caducado',
        loteId: lote.id,
        origen: 'a_mano',
        esEjemplo: producto.esEjemplo,
      });
      quedan = apuntado.despues.cantidad;

      // La misma merma que la de siempre, para quien la escucha: el food cost
      // del periodo y, cuando hable, Fogón.
      await publicar(contexto.sql, {
        tipo: 'merma.apuntada',
        organizacionId,
        localId: producto.localId,
        datos: {
          productoId: producto.id,
          nombre: producto.nombre,
          cuanto,
          motivo: 'caducado',
          partida: partidaDe('caducado'),
          valorCentimos: valor,
        },
        correlacionId: contexto.correlacionId,
      });
    }

    await contexto.sql`
      update estook.lote
         set retirado_en = now(),
             retirado_por = ${contexto.personaId},
             como_se_retiro = ${entrada.como}
       where id = ${lote.id}
    `;

    await contexto.sql`
      select estook.anotar(
        ${organizacionId}::uuid, 'cambiar', 'lote', ${lote.id}, ${lote.local_id}::uuid,
        ${JSON.stringify({ retirado: false })}::text::jsonb,
        ${JSON.stringify({ como_se_retiro: entrada.como, cuanto: entrada.cuanto ?? null, producto: producto.nombre })}::text::jsonb,
        null
      )
    `;

    // Su caducidad se va del Calendario. Lo hace la reacción, no esto.
    await publicar(contexto.sql, {
      tipo: 'lote.retirado',
      organizacionId,
      localId: lote.local_id,
      datos: { loteId: lote.id, productoId: producto.id, como: entrada.como },
      correlacionId: contexto.correlacionId,
    });

    return {
      loteId: lote.id,
      como: entrada.como,
      ...(quedan === undefined ? {} : { quedan }),
    };
  },
});

// ── Congelar ─────────────────────────────────────────────────────────────────

export const entradaCongelar = z
  .object({
    producto_id: z.string().uuid(),
    /** Un lote que ya había: se congela ese. Sin él, se apunta uno nuevo, congelado hoy. */
    lote_id: z.string().uuid().optional(),
    /**
     * Hasta cuándo aguanta ya congelado. Sin mandarlo, se queda la que tuviera;
     * a nulo, sin fecha.
     */
    caduca_el: fecha.nullable().optional(),
    codigo: z.string().trim().max(64).nullable().optional(),
  })
  .strict();

export type EntradaCongelar = z.infer<typeof entradaCongelar>;

/**
 * Congelar género: «la mitad de la carne va al congelador».
 *
 * **No mueve nada**: el producto es el mismo y está en el mismo local. Lo que
 * cambia es que ese lote queda marcado como congelado, con su fecha, y
 * normalmente con otra caducidad —congelado aguanta meses—. Sale como tal en la
 * lista de productos, en su ficha y en el Calendario, y los productos que tienen
 * algo congelado tienen su vista: «Congelados».
 */
export const congelar = comando<EntradaCongelar, { loteId: string }>({
  nombre: 'congelar',
  entrada: entradaCongelar,
  exige: 'app.inventario',

  async ejecutar(contexto, entrada) {
    const organizacionId = laOrganizacionDeLaSesion(contexto);

    const productos = await contexto.sql<
      { local_id: string; nombre: string; es_ejemplo: boolean }[]
    >`
      select local_id, nombre, es_ejemplo from estook.producto where id = ${entrada.producto_id}
    `;
    const producto = productos[0];
    if (!producto) {
      throw new FalloDeAplicacion('no_existe', {
        porque: 'Ese producto no está, o no es de un local que puedas ver.',
      });
    }

    let loteId: string | undefined;

    if (entrada.lote_id !== undefined) {
      const cambiaLaFecha = entrada.caduca_el !== undefined;
      const congelados = await contexto.sql<{ id: string; ya: boolean }[]>`
        update estook.lote
           set congelado_el = coalesce(congelado_el, current_date),
               caduca_el = case when ${cambiaLaFecha} then ${entrada.caduca_el ?? null}::date
                                else caduca_el end
         where id = ${entrada.lote_id}
           and producto_id = ${entrada.producto_id}
           and retirado_en is null
        returning id, false as ya
      `;
      loteId = congelados[0]?.id;
      if (loteId === undefined) {
        throw new FalloDeAplicacion('no_existe', {
          porque: 'Ese lote ya no está: se ha quitado, o es de otro producto.',
        });
      }
    } else {
      const nuevos = await contexto.sql<{ id: string }[]>`
        insert into estook.lote (
          local_id, producto_id, codigo, caduca_el, recibido_el, congelado_el, es_ejemplo
        )
        values (
          ${producto.local_id}, ${entrada.producto_id}, ${entrada.codigo ?? null},
          ${entrada.caduca_el ?? null}::date, current_date, current_date, ${producto.es_ejemplo}
        )
        returning id
      `;
      loteId = nuevos[0]?.id;
      if (loteId === undefined) throw new FalloDeAplicacion('sin_permiso');
    }

    await contexto.sql`
      select estook.anotar(
        ${organizacionId}::uuid, 'cambiar', 'lote', ${loteId}, ${producto.local_id}::uuid, null,
        ${JSON.stringify({ congelado: true, producto: producto.nombre, caduca_el: entrada.caduca_el ?? null })}::text::jsonb,
        null
      )
    `;

    await publicar(contexto.sql, {
      tipo: 'lote.congelado',
      organizacionId,
      localId: producto.local_id,
      datos: { loteId, productoId: entrada.producto_id },
      correlacionId: contexto.correlacionId,
    });

    return { loteId };
  },
});
