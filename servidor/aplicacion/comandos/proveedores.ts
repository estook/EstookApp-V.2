import { z } from 'zod';
import { elLocalDeLaSesion, laOrganizacionDeLaSesion } from '../alta.ts';
import { comando, FalloDeAplicacion } from '../contrato.ts';

/**
 * Proveedores (M6) · la ficha mínima, y por qué está aquí.
 *
 * M7 es «Proveedores y compras» y es quien los desarrolla: días de reparto,
 * pedido mínimo, contratos marco, el ciclo de un pedido, WhatsApp con el pedido
 * escrito. Nada de eso está aquí.
 *
 * Lo que sí está es lo mínimo que M6 necesita para cumplir lo suyo, que son tres
 * promesas escritas:
 *
 *   · «Histórico de precio **por proveedor**» (Plan, capa inteligente de M6).
 *   · «Aceptas, pones tu precio y **tu proveedor**» (Manifiesto 8, los quince
 *     segundos del catálogo de referencia).
 *   · El desplegable «Proveedor · proveedores activos del local · por uso
 *     reciente · si está vacío, "crea tu primer proveedor" con el botón»
 *     (Auditoría, parte 3).
 *
 * Un precio que no sabe de quién viene no se puede comparar con el de al lado, y
 * comparar es donde aparece el dinero fácil.
 */

export const entradaCrearProveedor = z
  .object({
    nombre: z.string().trim().min(1).max(160),
    notas: z.string().trim().max(2000).nullable().optional(),
  })
  .strict();

export type EntradaCrearProveedor = z.infer<typeof entradaCrearProveedor>;

export const crearProveedor = comando<
  EntradaCrearProveedor,
  { proveedorId: string; nombre: string }
>({
  nombre: 'crear_proveedor',
  entrada: entradaCrearProveedor,
  exige: 'app.inventario',

  async ejecutar(contexto, entrada) {
    const localId = elLocalDeLaSesion(contexto);
    const organizacionId = laOrganizacionDeLaSesion(contexto);

    // «Crear desde un desplegable devuelve al sitio con lo creado seleccionado»
    // (Auditoría, parte 3), y para eso hace falta que crear el que ya existe
    // devuelva el que ya existe en vez de un error. Quien está dando de alta un
    // producto no quiere que le cuenten su historia de proveedores duplicados.
    const yaEsta = await contexto.sql<{ id: string; nombre: string; activo: boolean }[]>`
      select id, nombre, activo from estook.proveedor
       where local_id = ${localId}
         and estook.sin_acentos(nombre) = estook.sin_acentos(${entrada.nombre})
       limit 1
    `;

    const existente = yaEsta[0];
    if (existente) {
      if (!existente.activo) {
        await contexto.sql`
          update estook.proveedor set activo = true, actualizado_en = now()
           where id = ${existente.id}
        `;
      }
      return { proveedorId: existente.id, nombre: existente.nombre };
    }

    const creados = await contexto.sql<{ id: string }[]>`
      insert into estook.proveedor (local_id, nombre, notas)
      values (${localId}, ${entrada.nombre}, ${entrada.notas ?? null})
      returning id
    `;

    const proveedorId = creados[0]?.id;
    if (proveedorId === undefined) throw new FalloDeAplicacion('sin_permiso');

    await contexto.sql`
      select estook.anotar(
        ${organizacionId}::uuid, 'crear', 'proveedor', ${proveedorId},
        ${localId}::uuid, null,
        ${JSON.stringify({ nombre: entrada.nombre })}::jsonb, null
      )
    `;

    return { proveedorId, nombre: entrada.nombre };
  },
});

export const entradaCambiarProveedor = z
  .object({
    proveedor_id: z.string().uuid(),
    nombre: z.string().trim().min(1).max(160),
    notas: z.string().trim().max(2000).nullable(),
    activo: z.boolean(),
  })
  .strict();

export type EntradaCambiarProveedor = z.infer<typeof entradaCambiarProveedor>;

/**
 * Cambiar la ficha, y desactivarla, en un solo comando.
 *
 * Aquí sí van juntos —y en productos no— porque un proveedor tiene tres campos y
 * la pantalla es un formulario con un interruptor. Desactivar un producto es
 * otra cosa: lleva su aviso de en cuántas fichas está, y por eso tiene comando
 * propio.
 */
export const cambiarProveedor = comando<EntradaCambiarProveedor, { proveedorId: string }>({
  nombre: 'cambiar_proveedor',
  entrada: entradaCambiarProveedor,
  exige: 'app.inventario',

  async ejecutar(contexto, entrada) {
    const organizacionId = laOrganizacionDeLaSesion(contexto);

    const filas = await contexto.sql<{ local_id: string; nombre: string; activo: boolean }[]>`
      select local_id, nombre, activo from estook.proveedor where id = ${entrada.proveedor_id}
    `;

    const antes = filas[0];
    if (!antes) {
      throw new FalloDeAplicacion('no_existe', {
        porque: 'Ese proveedor no está, o no es de un local que puedas ver.',
      });
    }

    await contexto.sql`
      update estook.proveedor
         set nombre = ${entrada.nombre},
             notas = ${entrada.notas},
             activo = ${entrada.activo},
             actualizado_en = now()
       where id = ${entrada.proveedor_id}
    `;

    await contexto.sql`
      select estook.anotar(
        ${organizacionId}::uuid, 'cambiar', 'proveedor', ${entrada.proveedor_id},
        ${antes.local_id}::uuid,
        ${JSON.stringify({ nombre: antes.nombre, activo: antes.activo })}::jsonb,
        ${JSON.stringify({ nombre: entrada.nombre, activo: entrada.activo })}::jsonb,
        null
      )
    `;

    return { proveedorId: entrada.proveedor_id };
  },
});
