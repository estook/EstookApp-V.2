import { z } from 'zod';
import { TOPES_DEL_GRUPO, UNIDADES_DE_USO } from '@estook/dominio';
import { laOrganizacionDeLaSesion } from '../alta.ts';
import { comando, FalloDeAplicacion, type Contexto } from '../contrato.ts';
import { comoLista } from '../listas.ts';
import { elLocalDelServicio } from '../sala.ts';
import { puedeEditarLaCarta } from '../consultas/mi-carta.ts';
import { noEnUnMovilPersonal } from './aparatos.ts';

/**
 * **Las opciones y los extras de cada plato, y lo de la carta que se toca desde el TPV**
 * (T3 · 2, decisión 0113; Anexo 10.3 y 11.11). Se montan en Ajustes del TPV › Productos, en la
 * hoja de cada botón, con los Ajustes del TPV, como la botonera.
 *
 *   guardar_grupo_de_opciones   crea o cambia un grupo entero: nombre, cuántas y sus opciones
 *   copiar_grupo_de_opciones    «Copiar y cambiar», para cambiarlo en un plato solo
 *   quitar_grupo_de_opciones    se va de todos los platos que lo usan
 *   poner_grupos_al_plato       qué grupos pregunta un plato, y en qué orden
 *   cambiar_precio_desde_el_tpv el precio de la carta, con su rastro (no hay un precio del TPV)
 *   vender_a_peso               el precio pasa a ser el del kilo
 *
 * Las dos últimas tocan la carta: piden también poder cambiarla.
 */

const id = z.string().uuid();
const nombre = z.string().trim().min(1).max(40);
const centimosDeOpcion = z.number().int().min(-100_000).max(100_000);

const DEL_TPV = {
  exige: 'accion.ajustes_del_tpv',
  enElTpv: 'solo',
  enLosAparatos: ['caja', 'comandero'],
} as const;

function elLocal(contexto: Contexto): string {
  noEnUnMovilPersonal(contexto);
  return elLocalDelServicio(contexto);
}

async function anotar(
  contexto: Contexto,
  accion: string,
  entidad: 'grupo_de_opciones' | 'plato',
  entidadId: string,
  localId: string,
  antes: unknown,
  despues: unknown,
): Promise<void> {
  await contexto.sql`
    select estook.anotar(
      ${laOrganizacionDeLaSesion(contexto)}::uuid, ${accion}, ${entidad}, ${entidadId},
      ${localId}::uuid, ${antes === null ? null : JSON.stringify(antes)}::text::jsonb,
      ${JSON.stringify(despues)}::text::jsonb, null
    )
  `;
}

async function elGrupo(contexto: Contexto, localId: string, grupoId: string) {
  const filas = await contexto.sql<
    { id: string; nombre: string; minimo: number; maximo: number }[]
  >`
    select id::text as id, nombre, minimo, maximo from estook.grupo_de_opciones
     where id = ${grupoId}::uuid and local_id = ${localId}::uuid
  `;
  if (filas[0] === undefined) {
    throw new FalloDeAplicacion('no_existe', { porque: 'Ese grupo no está en este local.' });
  }
  return filas[0];
}

async function elPlato(contexto: Contexto, localId: string, platoId: string) {
  const filas = await contexto.sql<
    {
      id: string;
      nombre: string;
      precio_centimos: number | null;
      a_peso: boolean;
      version: number;
    }[]
  >`
    select id::text as id, nombre, precio_centimos, a_peso, version from estook.plato
     where id = ${platoId}::uuid and local_id = ${localId}::uuid and activo
  `;
  if (filas[0] === undefined) {
    throw new FalloDeAplicacion('no_existe', { porque: 'Ese plato no está en la carta.' });
  }
  return filas[0];
}

function yaHayUnoAsi(error: unknown): never {
  if ((error as { code?: string }).code === '23505') {
    throw new FalloDeAplicacion('faltan_datos', {
      campos: ['nombre'],
      porque: 'Ya hay un grupo que se llama así: ponle otro nombre o usa ese.',
    });
  }
  throw error;
}

const unaOpcion = z
  .object({
    nombre,
    precio_centimos: centimosDeOpcion.optional(),
    // Lo que gasta del almacén: añade un producto en su cantidad…
    anade: z
      .object({
        producto_id: id,
        cantidad: z.number().positive().max(100_000),
        unidad: z.enum(UNIDADES_DE_USO),
      })
      .strict()
      .nullable()
      .optional(),
    // …y quita un ingrediente del escandallo.
    quita_producto_id: id.nullable().optional(),
  })
  .strict();

const entradaGuardarGrupo = z
  .object({
    /** Sin él, un grupo nuevo. */
    grupo_id: id.optional(),
    nombre,
    minimo: z.number().int().min(0).max(TOPES_DEL_GRUPO.maximo),
    maximo: z.number().int().min(1).max(TOPES_DEL_GRUPO.maximo),
    opciones: z.array(unaOpcion).min(1).max(TOPES_DEL_GRUPO.opciones),
    /** Ponerlo, de paso, en este plato (al crearlo desde su botón). */
    plato_id: id.optional(),
  })
  .strict()
  .refine((g) => g.minimo <= g.maximo, {
    message: 'El mínimo no puede pasar del máximo.',
    path: ['minimo'],
  })
  .refine((g) => g.maximo <= g.opciones.length, {
    message: 'Se pueden elegir más de las que hay.',
    path: ['maximo'],
  });

export const guardarGrupoDeOpciones = comando<
  z.infer<typeof entradaGuardarGrupo>,
  { grupoId: string; platos: number }
>({
  nombre: 'guardar_grupo_de_opciones',
  entrada: entradaGuardarGrupo,
  ...DEL_TPV,

  async ejecutar(contexto, entrada) {
    const localId = elLocal(contexto);
    // Lo que gasta tiene que ser de este almacén.
    const productos = [
      ...new Set(
        entrada.opciones.flatMap((o) => [
          ...(o.anade === null || o.anade === undefined ? [] : [o.anade.producto_id]),
          ...(o.quita_producto_id === null || o.quita_producto_id === undefined
            ? []
            : [o.quita_producto_id]),
        ]),
      ),
    ];
    if (productos.length > 0) {
      const suyos = await contexto.sql<{ n: number }[]>`
        select count(*)::int as n from estook.producto
         where local_id = ${localId}::uuid and id = any (${comoLista(productos)}::text::uuid[])
      `;
      if ((suyos[0]?.n ?? 0) !== productos.length) {
        throw new FalloDeAplicacion('no_existe', {
          porque: 'Una de las opciones gasta algo que no está en el almacén de este local.',
        });
      }
    }

    let grupoId = entrada.grupo_id;
    let antes: unknown = null;
    try {
      if (grupoId === undefined) {
        const filas = await contexto.sql<{ id: string }[]>`
          insert into estook.grupo_de_opciones (local_id, nombre, minimo, maximo)
          values (${localId}::uuid, ${entrada.nombre}, ${entrada.minimo}, ${entrada.maximo})
          returning id::text as id
        `;
        grupoId = filas[0]?.id;
        if (grupoId === undefined) throw new FalloDeAplicacion('sin_permiso');
      } else {
        antes = await elGrupo(contexto, localId, grupoId);
        await contexto.sql`
          update estook.grupo_de_opciones
             set nombre = ${entrada.nombre}, minimo = ${entrada.minimo}, maximo = ${entrada.maximo}
           where id = ${grupoId}::uuid
        `;
      }
    } catch (error) {
      yaHayUnoAsi(error);
    }
    // Las opciones, enteras: las de antes se van y entran las de ahora, en su orden. Lo ya
    // pedido no cambia: cada línea guardó las suyas al pedir.
    await contexto.sql`delete from estook.opcion_de_grupo where grupo_id = ${grupoId}::uuid`;
    for (const [orden, o] of entrada.opciones.entries()) {
      await contexto.sql`
        insert into estook.opcion_de_grupo
          (local_id, grupo_id, nombre, orden, precio_centimos,
           anade_producto_id, anade_cantidad, anade_unidad, quita_producto_id)
        values (
          ${localId}::uuid, ${grupoId}::uuid, ${o.nombre}, ${orden}, ${o.precio_centimos ?? 0},
          ${o.anade?.producto_id ?? null}::uuid, ${o.anade?.cantidad ?? null}::numeric,
          ${o.anade?.unidad ?? null}::estook.unidad_de_uso, ${o.quita_producto_id ?? null}::uuid
        )
      `;
    }
    if (entrada.plato_id !== undefined) {
      await elPlato(contexto, localId, entrada.plato_id);
      await contexto.sql`
        insert into estook.grupo_del_plato (local_id, plato_id, grupo_id, orden)
        values (
          ${localId}::uuid, ${entrada.plato_id}::uuid, ${grupoId}::uuid,
          coalesce((select max(orden) + 1 from estook.grupo_del_plato
                     where plato_id = ${entrada.plato_id}::uuid), 0)
        )
        on conflict (plato_id, grupo_id) do nothing
      `;
    }
    const platos = await contexto.sql<{ n: number }[]>`
      select count(*)::int as n from estook.grupo_del_plato where grupo_id = ${grupoId}::uuid
    `;
    await anotar(
      contexto,
      entrada.grupo_id === undefined ? 'crear' : 'cambiar',
      'grupo_de_opciones',
      grupoId,
      localId,
      antes,
      {
        nombre: entrada.nombre,
        minimo: entrada.minimo,
        maximo: entrada.maximo,
        opciones: entrada.opciones.map((o) => o.nombre),
      },
    );
    return { grupoId, platos: platos[0]?.n ?? 0 };
  },
});

const entradaCopiarGrupo = z.object({ grupo_id: id, nombre, plato_id: id.optional() }).strict();

export const copiarGrupoDeOpciones = comando<
  z.infer<typeof entradaCopiarGrupo>,
  { grupoId: string }
>({
  nombre: 'copiar_grupo_de_opciones',
  entrada: entradaCopiarGrupo,
  ...DEL_TPV,

  async ejecutar(contexto, entrada) {
    const localId = elLocal(contexto);
    const grupo = await elGrupo(contexto, localId, entrada.grupo_id);
    let nuevo: string | undefined;
    try {
      nuevo = (
        await contexto.sql<{ id: string }[]>`
          insert into estook.grupo_de_opciones (local_id, nombre, minimo, maximo)
          values (${localId}::uuid, ${entrada.nombre}, ${grupo.minimo}, ${grupo.maximo})
          returning id::text as id
        `
      )[0]?.id;
    } catch (error) {
      yaHayUnoAsi(error);
    }
    if (nuevo === undefined) throw new FalloDeAplicacion('sin_permiso');
    await contexto.sql`
      insert into estook.opcion_de_grupo
        (local_id, grupo_id, nombre, orden, precio_centimos,
         anade_producto_id, anade_cantidad, anade_unidad, quita_producto_id)
      select local_id, ${nuevo}::uuid, nombre, orden, precio_centimos,
             anade_producto_id, anade_cantidad, anade_unidad, quita_producto_id
        from estook.opcion_de_grupo where grupo_id = ${grupo.id}::uuid
    `;
    // En ese plato, el copiado ocupa el sitio del de antes.
    if (entrada.plato_id !== undefined) {
      await contexto.sql`
        update estook.grupo_del_plato set grupo_id = ${nuevo}::uuid
         where plato_id = ${entrada.plato_id}::uuid and grupo_id = ${grupo.id}::uuid
           and local_id = ${localId}::uuid
      `;
    }
    await anotar(contexto, 'copiar', 'grupo_de_opciones', nuevo, localId, null, {
      de: grupo.nombre,
      nombre: entrada.nombre,
    });
    return { grupoId: nuevo };
  },
});

export const quitarGrupoDeOpciones = comando<{ grupo_id: string }, { platos: number }>({
  nombre: 'quitar_grupo_de_opciones',
  entrada: z.object({ grupo_id: id }).strict(),
  ...DEL_TPV,

  async ejecutar(contexto, entrada) {
    const localId = elLocal(contexto);
    const grupo = await elGrupo(contexto, localId, entrada.grupo_id);
    const platos = await contexto.sql<{ n: number }[]>`
      select count(*)::int as n from estook.grupo_del_plato where grupo_id = ${grupo.id}::uuid
    `;
    await contexto.sql`delete from estook.grupo_de_opciones where id = ${grupo.id}::uuid`;
    await anotar(contexto, 'quitar', 'grupo_de_opciones', grupo.id, localId, grupo, {});
    return { platos: platos[0]?.n ?? 0 };
  },
});

export const ponerGruposAlPlato = comando<
  { plato_id: string; grupo_ids: string[] },
  { grupos: number }
>({
  nombre: 'poner_grupos_al_plato',
  entrada: z.object({ plato_id: id, grupo_ids: z.array(id).max(10) }).strict(),
  ...DEL_TPV,

  async ejecutar(contexto, entrada) {
    const localId = elLocal(contexto);
    await elPlato(contexto, localId, entrada.plato_id);
    for (const grupoId of entrada.grupo_ids) await elGrupo(contexto, localId, grupoId);
    await contexto.sql`delete from estook.grupo_del_plato where plato_id = ${entrada.plato_id}::uuid`;
    for (const [orden, grupoId] of [...new Set(entrada.grupo_ids)].entries()) {
      await contexto.sql`
        insert into estook.grupo_del_plato (local_id, plato_id, grupo_id, orden)
        values (${localId}::uuid, ${entrada.plato_id}::uuid, ${grupoId}::uuid, ${orden})
      `;
    }
    return { grupos: new Set(entrada.grupo_ids).size };
  },
});

// ═══ Lo de la carta que se toca desde el TPV ═══════════════════════════════════

async function conLaCarta(contexto: Contexto, localId: string): Promise<void> {
  if (!(await puedeEditarLaCarta(contexto, localId))) {
    throw new FalloDeAplicacion('sin_permiso', {
      porque: 'Esto cambia tu carta de Estook: lo hace quien puede cambiar la carta.',
    });
  }
}

export const cambiarPrecioDesdeElTpv = comando<
  { plato_id: string; precio_centimos: number },
  { platoId: string }
>({
  nombre: 'cambiar_precio_desde_el_tpv',
  entrada: z
    .object({ plato_id: id, precio_centimos: z.number().int().min(0).max(100_000_000) })
    .strict(),
  ...DEL_TPV,

  async ejecutar(contexto, entrada) {
    const localId = elLocal(contexto);
    await conLaCarta(contexto, localId);
    const plato = await elPlato(contexto, localId, entrada.plato_id);
    // **Es el precio de la carta**, no uno del TPV (Anexo 11.11): cambia en Estook, con su
    // rastro, que es su historial.
    await contexto.sql`
      update estook.plato set precio_centimos = ${entrada.precio_centimos}, actualizado_en = now()
       where id = ${plato.id}::uuid
    `;
    await anotar(
      contexto,
      'cambiar_precio_desde_el_tpv',
      'plato',
      plato.id,
      localId,
      { precio: plato.precio_centimos },
      { precio: entrada.precio_centimos },
    );
    return { platoId: plato.id };
  },
});

export const venderAPeso = comando<{ plato_id: string; si: boolean }, { platoId: string }>({
  nombre: 'vender_a_peso',
  entrada: z.object({ plato_id: id, si: z.boolean() }).strict(),
  ...DEL_TPV,

  async ejecutar(contexto, entrada) {
    const localId = elLocal(contexto);
    await conLaCarta(contexto, localId);
    const plato = await elPlato(contexto, localId, entrada.plato_id);
    await contexto.sql`
      update estook.plato set a_peso = ${entrada.si}, actualizado_en = now()
       where id = ${plato.id}::uuid
    `;
    await anotar(
      contexto,
      'vender_a_peso',
      'plato',
      plato.id,
      localId,
      { aPeso: plato.a_peso },
      { aPeso: entrada.si },
    );
    return { platoId: plato.id };
  },
});
