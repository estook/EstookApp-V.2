import { z } from 'zod';
import { elLocalDeLaSesion, laOrganizacionDeLaSesion } from '../alta.ts';
import { comando, FalloDeAplicacion } from '../contrato.ts';
import { sembrarElInventario } from '../inventario.ts';

/**
 * Las categorías del local, y el botón de los ejemplos (M6).
 *
 * Las categorías nacen sembradas por tipo de local, así que este comando no es
 * el camino normal: es el de «me falta una». Cada cocina llama a las cosas como
 * quiere, y obligar a usar las nuestras sería la primera pelea.
 */

export const crearCategoria = comando<{ nombre: string }, { categoriaId: string; nombre: string }>({
  nombre: 'crear_categoria',
  entrada: z.object({ nombre: z.string().trim().min(1).max(120) }).strict(),
  exige: 'app.inventario',

  async ejecutar(contexto, entrada) {
    const localId = elLocalDeLaSesion(contexto);
    const organizacionId = laOrganizacionDeLaSesion(contexto);

    // Igual que con los proveedores: crear la que ya existe devuelve la que ya
    // existe, para que «crear desde un desplegable» no explote en la cara de
    // quien está a mitad de dar de alta un producto.
    const yaEsta = await contexto.sql<{ id: string; nombre: string; activa: boolean }[]>`
      select id, nombre, activa from estook.categoria_de_producto
       where local_id = ${localId}
         and estook.sin_acentos(nombre) = estook.sin_acentos(${entrada.nombre})
       limit 1
    `;

    const existente = yaEsta[0];
    if (existente) {
      if (!existente.activa) {
        await contexto.sql`
          update estook.categoria_de_producto set activa = true, actualizado_en = now()
           where id = ${existente.id}
        `;
      }
      return { categoriaId: existente.id, nombre: existente.nombre };
    }

    const creadas = await contexto.sql<{ id: string }[]>`
      insert into estook.categoria_de_producto (local_id, nombre, orden)
      values (
        ${localId},
        ${entrada.nombre},
        (select coalesce(max(orden), 0) + 10 from estook.categoria_de_producto
          where local_id = ${localId})
      )
      returning id
    `;

    const categoriaId = creadas[0]?.id;
    if (categoriaId === undefined) throw new FalloDeAplicacion('sin_permiso');

    await contexto.sql`
      select estook.anotar(
        ${organizacionId}::uuid, 'crear', 'categoria_de_producto', ${categoriaId},
        ${localId}::uuid, null,
        ${JSON.stringify({ nombre: entrada.nombre })}::jsonb, null
      )
    `;

    return { categoriaId, nombre: entrada.nombre };
  },
});

// ── «Ponme unos ejemplos para ver cómo funciona» ─────────────────────────────

/**
 * Sembrar los seis productos de ejemplo, a petición.
 *
 * ── Por qué existe este botón, si los ejemplos ya se siembran solos ─────────
 *
 * Porque se siembran solos **al dar de alta el local**, y hay dos casos en los
 * que eso no ha pasado y el inventario está vacío:
 *
 *   · Los locales que ya existían antes de M6. La migración les puso sus
 *     categorías, y a propósito **no** les metió seis productos de mentira por
 *     detrás: aparecer una mañana con género que nadie ha pedido es lo contrario
 *     de «Estook no mete nada en tu inventario».
 *   · Aquel a quien los quitó y quiere volver a verlos.
 *
 * Y porque «todo estado vacío tiene una frase **y un botón**» (Auditoría, parte
 * 3). El de Inventario vacío es este: se ve cómo funciona sin escribir nada.
 *
 * Lo que no hace: meterlos si ya hay género. Eso lo comprueba
 * `sembrarElInventario`, que devuelve cero productos y no toca nada.
 */
export const ponerLosEjemplos = comando<
  Record<string, never>,
  { readonly categorias: number; readonly productos: number }
>({
  nombre: 'poner_los_ejemplos',
  entrada: z.object({}).strict(),
  exige: 'app.inventario',

  async ejecutar(contexto) {
    const localId = elLocalDeLaSesion(contexto);
    const organizacionId = laOrganizacionDeLaSesion(contexto);

    const puesto = await sembrarElInventario(contexto, localId, { conEjemplos: true });

    await contexto.sql`
      select estook.anotar(
        ${organizacionId}::uuid, 'crear', 'ejemplos', ${localId},
        ${localId}::uuid, null,
        ${JSON.stringify(puesto)}::jsonb, null
      )
    `;

    return puesto;
  },
});
