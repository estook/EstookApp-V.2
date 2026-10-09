import { z } from 'zod';
import {
  MOTIVOS_DE_MERMA,
  laHoraDeLoHecho,
  partidaDe,
  sePuedeTirar,
  valorDeLaMerma,
} from '@estook/dominio';
import { publicar } from '../../eventos/bandeja.ts';
import {
  TIPOS_DE_FOTO,
  TOPE_DE_LA_FOTO,
  claveDeLaFotoDeMerma,
} from '../../infraestructura/almacen.ts';
import { elLocalDeLaSesion, laOrganizacionDeLaSesion } from '../alta.ts';
import { comando, FalloDeAplicacion } from '../contrato.ts';
import { apuntar, elProductoBloqueado, loQueHay } from '../almacen.ts';
import { decodificar, esDeVerdadDeEseTipo } from '../ficheros.ts';

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
 * Escribir en el libro pedía `app.almacen` en «ver y editar», que un camarero
 * no tiene. Y el camarero es quien rompe una copa. La política de la 0028 deja
 * apuntar en el libro con Almacén **o** con permiso de merma, y en el segundo
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
   * ordena Almacén entera —«un rol sin costes no recibe ni un campo de coste en
   * ninguna respuesta»— y no se esconde en la pantalla, no se envía.
   */
  readonly valorCentimos?: number | null;
}

export const apuntarMerma = comando<EntradaApuntarMerma, SalidaApuntarMerma>({
  nombre: 'apuntar_merma',
  entrada: entradaApuntarMerma,
  // Se puede apuntar sin señal y mandarla al volver: la jornada la decide el servidor
  // con la hora en que se tiró, no con la de mandarla (0070, mejora 15).
  sinConexion: true,
  exige: 'accion.registrar_merma',

  async ejecutar(contexto, entrada) {
    const producto = await elProductoBloqueado(contexto, entrada.producto_id);

    // Lo que hay **antes** de sacarlo: es con ese coste medio con el que se valora
    // lo perdido. Después de apuntar, el coste medio es el mismo —una salida no lo
    // mueve— pero leerlo antes deja claro de dónde sale el número.
    const antes = await loQueHay(contexto, producto.id);

    // Nunca más de lo que hay (23-sep): se mira con el producto ya bloqueado, así que
    // dos mermas a la vez no pueden tirar entre las dos lo que no hay.
    const puede = sePuedeTirar(antes.cantidad, entrada.cuanto, producto.unidadDeUso);
    if (!puede.sePuede) {
      throw new FalloDeAplicacion('mas_de_lo_que_hay', {
        porque: puede.porque,
        campos: ['cuanto'],
      });
    }

    const valor = valorDeLaMerma(entrada.cuanto, antes.coste);

    const apuntado = await apuntar(contexto, producto, {
      tipo: 'merma',
      cantidad: -entrada.cuanto,
      motivo: entrada.detalle ?? null,
      motivoDeMerma: entrada.motivo,
      origen: 'a_mano',
      esEjemplo: producto.esEjemplo,
      ...(contexto.hechoHaceMs === undefined || contexto.hechoHaceMs === null
        ? {}
        : { cuando: laHoraDeLoHecho(contexto.ahora, contexto.hechoHaceMs) }),
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
        })}::text::jsonb,
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
        // Para el aviso de lo que se tira caro (0052): de qué es, en qué se mide y si es de ejemplo.
        movimientoId: apuntado.movimientoId,
        unidadDeUso: producto.unidadDeUso,
        esEjemplo: producto.esEjemplo,
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

// ── La foto de la merma, si se quiere (M8 · 0078, 4A · 0079) ─────────────────

export const entradaPonerFotoDeMerma = z
  .object({
    /** La merma, como la devuelve `apuntar_merma`. */
    movimiento_id: z.string().regex(/^\d{1,18}$/, 'Esa merma no existe.'),
    tipo: z.string().refine((t) => t in TIPOS_DE_FOTO, {
      message: 'Solo se admiten fotos en WebP o JPG.',
    }),
    /** La foto de 800 px, reducida en el móvil, en base64 y sin el prefijo `data:`. */
    foto: z
      .string()
      .min(1)
      .max(Math.ceil((TOPE_DE_LA_FOTO * 4) / 3) + 1024),
  })
  .strict();

export type EntradaPonerFotoDeMerma = z.infer<typeof entradaPonerFotoDeMerma>;

/**
 * Poner la foto de lo que se tiró.
 *
 * **Un cuarto toque que se puede saltar** (4A): la merma ya está apuntada cuando
 * llega esto —también sin señal—, y la foto va después, por su lado. Si la foto
 * falla, la merma sigue apuntada: «una merma sin foto vale más que una sin apuntar».
 *
 * La pone quien apuntó la merma, o quien lleva el Almacén; **una vez**: es la prueba
 * de lo que se tiró —para reclamar al proveedor o para que el gerente lo vea—, y una
 * prueba que se cambia no prueba nada.
 */
export const ponerFotoDeMerma = comando<
  EntradaPonerFotoDeMerma,
  { readonly movimientoId: string; readonly puesta: boolean }
>({
  nombre: 'poner_foto_de_merma',
  entrada: entradaPonerFotoDeMerma,
  exige: 'accion.registrar_merma',

  async ejecutar(contexto, entrada) {
    const localId = elLocalDeLaSesion(contexto);
    const almacen = contexto.almacen;
    if (almacen === null) {
      throw new FalloDeAplicacion('fallo_nuestro', {
        porque: 'Todavía no hay dónde guardar las fotos. La merma está apuntada igual.',
      });
    }

    const mermas = await contexto.sql<
      { persona_id: string | null; tiene_foto: boolean; lleva_almacen: boolean }[]
    >`
      select m.persona_id::text as persona_id,
             exists (select 1 from estook.foto_de_merma f where f.movimiento_id = m.id) as tiene_foto,
             estook.puede_editar('app.almacen', m.local_id) as lleva_almacen
        from estook.movimiento_de_stock m
       where m.id = ${entrada.movimiento_id}::bigint
         and m.local_id = ${localId}
         and m.tipo = 'merma'
    `;
    const merma = mermas[0];
    if (merma === undefined || (merma.persona_id !== contexto.personaId && !merma.lleva_almacen)) {
      throw new FalloDeAplicacion('no_existe', {
        porque: 'Esa merma no está en este local, o no la apuntaste tú.',
      });
    }
    if (merma.tiene_foto) {
      throw new FalloDeAplicacion('ya_hecho', {
        porque: 'Esa merma ya tiene su foto, y no se cambia: es la prueba de lo que se tiró.',
      });
    }

    const foto = decodificar(entrada.foto, 'foto');
    if (foto.byteLength > TOPE_DE_LA_FOTO) {
      throw new FalloDeAplicacion('faltan_datos', {
        campos: ['foto'],
        porque: `Esa foto pesa demasiado aun reducida. El tope son ${Math.trunc(TOPE_DE_LA_FOTO / 1024)} KB: prueba con otra.`,
      });
    }
    if (!esDeVerdadDeEseTipo(foto, entrada.tipo)) {
      throw new FalloDeAplicacion('faltan_datos', {
        campos: ['foto'],
        porque: 'Eso no es una foto que se pueda guardar. Prueba a hacerla otra vez.',
      });
    }

    const clave = claveDeLaFotoDeMerma(
      localId,
      entrada.movimiento_id,
      TIPOS_DE_FOTO[entrada.tipo] ?? 'jpg',
      contexto.ahora,
    );
    await almacen.guardar(clave, foto, entrada.tipo);

    // La fila, después de subir: al revés, la lista enseñaría una foto que no existe.
    // Y si dos la ponen a la vez, la segunda choca con la clave y se borra su fichero.
    try {
      await contexto.sql`
        insert into estook.foto_de_merma (movimiento_id, local_id, clave, puesta_por)
        values (${entrada.movimiento_id}::bigint, ${localId}, ${clave}, ${contexto.personaId})
      `;
    } catch (fallo) {
      await almacen.borrar(clave);
      throw fallo;
    }

    await contexto.sql`
      select estook.anotar(
        ${laOrganizacionDeLaSesion(contexto)}::uuid, 'crear', 'foto_de_merma',
        ${entrada.movimiento_id}, ${localId}::uuid, null,
        ${JSON.stringify({ foto: 'puesta' })}::text::jsonb, null
      )
    `;

    return { movimientoId: entrada.movimiento_id, puesta: true };
  },
});
