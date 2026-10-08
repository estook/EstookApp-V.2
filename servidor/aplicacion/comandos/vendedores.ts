import { z } from 'zod';
import { comoCodigoDeVendedor, DESCUENTO_MAXIMO } from '@estook/dominio';
import { anotarEnElAdmin } from '../admin.ts';
import { comando, FalloDeAplicacion, type Contexto } from '../contrato.ts';

/**
 * Lo que el admin hace con los vendedores (A3 · decisión 0076).
 *
 * El vendedor es **una ficha nuestra**: no entra en Estook. Todo deja rastro en la
 * auditoría del admin, y lo que cierra algo —dar de baja, cerrar un código, cambiar
 * con quién vino un cliente— pide motivo. **Lo comercial es nuestro**: nada de esto
 * va a la auditoría del cliente.
 */

const motivo = z.string().trim().min(3, 'Di por qué, en unas palabras.').max(500);
const telefono = z
  .string()
  .trim()
  .regex(/^[0-9+ ()-]{7,24}$/, 'Un teléfono son cifras, espacios, + y guiones.')
  .nullable();
const correo = z
  .string()
  .trim()
  .toLowerCase()
  .email('Ese correo no parece un correo.')
  .max(320)
  .nullable();

const datosDelVendedor = {
  nombre: z.string().trim().min(1, 'Ponle un nombre.').max(120),
  telefono,
  correo,
  notas: z.string().trim().max(2000).nullable(),
};

async function elVendedor(
  contexto: Contexto,
  vendedorId: string,
): Promise<{
  nombre: string;
  telefono: string | null;
  correo: string | null;
  notas: string | null;
  baja_en: string | null;
}> {
  const [fila] = await contexto.sql<
    {
      nombre: string;
      telefono: string | null;
      correo: string | null;
      notas: string | null;
      baja_en: string | null;
    }[]
  >`
    select nombre, telefono, correo, notas, baja_en::text as baja_en
      from plataforma.vendedor where id = ${vendedorId}
  `;
  if (fila === undefined)
    throw new FalloDeAplicacion('no_existe', { porque: 'Ese vendedor no está.' });
  return fila;
}

// ── El vendedor ──────────────────────────────────────────────────────────────

export const adminCrearVendedor = comando<
  z.infer<z.ZodObject<typeof datosDelVendedor>>,
  { vendedorId: string }
>({
  nombre: 'admin_crear_vendedor',
  entrada: z.object(datosDelVendedor).strict(),
  soloAdmin: true,

  async ejecutar(contexto, e) {
    const [fila] = await contexto.sql<{ id: string }[]>`
      insert into plataforma.vendedor (nombre, telefono, correo, notas, creado_por)
      values (${e.nombre}, ${e.telefono}, ${e.correo}, ${e.notas}, ${contexto.personaId})
      returning id
    `;
    const vendedorId = fila?.id ?? '';
    await anotarEnElAdmin(contexto, {
      accion: 'crear',
      entidad: 'vendedor',
      entidadId: vendedorId,
      despues: { nombre: e.nombre, telefono: e.telefono, correo: e.correo },
    });
    return { vendedorId };
  },
});

export const adminCambiarElVendedor = comando<
  z.infer<z.ZodObject<typeof datosDelVendedor>> & { vendedor_id: string },
  { guardado: true }
>({
  nombre: 'admin_cambiar_el_vendedor',
  entrada: z.object({ vendedor_id: z.string().uuid(), ...datosDelVendedor }).strict(),
  soloAdmin: true,

  async ejecutar(contexto, e) {
    const antes = await elVendedor(contexto, e.vendedor_id);
    await contexto.sql`
      update plataforma.vendedor
         set nombre = ${e.nombre}, telefono = ${e.telefono}, correo = ${e.correo}, notas = ${e.notas}
       where id = ${e.vendedor_id}
    `;
    await anotarEnElAdmin(contexto, {
      accion: 'editar',
      entidad: 'vendedor',
      entidadId: e.vendedor_id,
      antes: { nombre: antes.nombre, telefono: antes.telefono, correo: antes.correo },
      despues: { nombre: e.nombre, telefono: e.telefono, correo: e.correo },
    });
    return { guardado: true };
  },
});

/**
 * Dar de baja: **se cierran todos sus códigos**, y sus clientes siguen siendo suyos,
 * que es la historia. La baja no se deshace (para volver, otra ficha).
 */
export const adminDarDeBajaAlVendedor = comando<
  { vendedor_id: string; motivo: string },
  { codigosCerrados: number }
>({
  nombre: 'admin_dar_de_baja_al_vendedor',
  entrada: z.object({ vendedor_id: z.string().uuid(), motivo }).strict(),
  soloAdmin: true,

  async ejecutar(contexto, e) {
    const antes = await elVendedor(contexto, e.vendedor_id);
    if (antes.baja_en !== null) {
      throw new FalloDeAplicacion('ya_hecho', { porque: 'Ya estaba de baja.' });
    }
    const cerrados = await contexto.sql<{ id: string }[]>`
      update plataforma.codigo_de_vendedor set cerrado_en = now()
       where vendedor_id = ${e.vendedor_id} and cerrado_en is null
      returning id
    `;
    await contexto.sql`update plataforma.vendedor set baja_en = now() where id = ${e.vendedor_id}`;
    await anotarEnElAdmin(contexto, {
      accion: 'dar_de_baja',
      entidad: 'vendedor',
      entidadId: e.vendedor_id,
      despues: { codigosCerrados: cerrados.length },
      motivo: e.motivo,
    });
    return { codigosCerrados: cerrados.length };
  },
});

// ── Los códigos ──────────────────────────────────────────────────────────────

export const adminCrearUnCodigo = comando<
  { vendedor_id: string; codigo: string; campana: string | null; descuento: number },
  { codigoId: string; codigo: string }
>({
  nombre: 'admin_crear_un_codigo',
  entrada: z
    .object({
      vendedor_id: z.string().uuid(),
      codigo: z.string().trim().min(1).max(40),
      campana: z.string().trim().max(80).nullable(),
      descuento: z.number().int().min(0).max(DESCUENTO_MAXIMO),
    })
    .strict(),
  soloAdmin: true,

  async ejecutar(contexto, e) {
    const codigo = comoCodigoDeVendedor(e.codigo);
    if (codigo === null) {
      throw new FalloDeAplicacion('faltan_datos', {
        campos: ['codigo'],
        porque: 'De 3 a 20 letras, números o guiones, sin tildes ni eñes.',
      });
    }
    const vendedor = await elVendedor(contexto, e.vendedor_id);
    if (vendedor.baja_en !== null) {
      throw new FalloDeAplicacion('faltan_datos', {
        porque: 'Ese vendedor está de baja: no se le hacen códigos nuevos.',
      });
    }
    let codigoId: string;
    try {
      const [fila] = await contexto.sql<{ id: string }[]>`
        insert into plataforma.codigo_de_vendedor (vendedor_id, codigo, campana, descuento, creado_por)
        values (${e.vendedor_id}, ${codigo}, ${e.campana === '' ? null : e.campana}, ${e.descuento},
                ${contexto.personaId})
        returning id
      `;
      codigoId = fila?.id ?? '';
    } catch (fallo) {
      // Un código no se reutiliza jamás (0041): ni cerrado, ni de otro vendedor.
      if (
        typeof fallo === 'object' &&
        fallo !== null &&
        (fallo as { code?: string }).code === '23505'
      ) {
        throw new FalloDeAplicacion('ya_hecho', {
          campos: ['codigo'],
          porque: `${codigo} ya existe, o existió: un código no se repite nunca. Elige otro.`,
        });
      }
      throw fallo;
    }
    await anotarEnElAdmin(contexto, {
      accion: 'crear_codigo',
      entidad: 'vendedor',
      entidadId: e.vendedor_id,
      despues: { codigo, campana: e.campana, descuento: e.descuento },
    });
    return { codigoId, codigo };
  },
});

/** Cerrar un código: ya no vale para nadie nuevo. Quien llegó con él conserva lo suyo. */
export const adminCerrarUnCodigo = comando<
  { codigo_id: string; motivo: string },
  { cerrado: true }
>({
  nombre: 'admin_cerrar_un_codigo',
  entrada: z.object({ codigo_id: z.string().uuid(), motivo }).strict(),
  soloAdmin: true,

  async ejecutar(contexto, e) {
    const filas = await contexto.sql<{ vendedor_id: string; codigo: string }[]>`
        update plataforma.codigo_de_vendedor set cerrado_en = now()
         where id = ${e.codigo_id} and cerrado_en is null
        returning vendedor_id, codigo
      `;
    const cerrado = filas[0];
    if (cerrado === undefined) {
      throw new FalloDeAplicacion('no_existe', {
        porque: 'Ese código no está, o ya estaba cerrado.',
      });
    }
    await anotarEnElAdmin(contexto, {
      accion: 'cerrar_codigo',
      entidad: 'vendedor',
      entidadId: cerrado.vendedor_id,
      despues: { codigo: cerrado.codigo },
      motivo: e.motivo,
    });
    return { cerrado: true };
  },
});

// ── Con quién vino un cliente ────────────────────────────────────────────────

/**
 * Poner o cambiar el vendedor de un cliente, **con motivo**: el código del registro
 * manda, y solo un admin lo corrige (0041, 0076). Vale un código cerrado —se corrige
 * algo del pasado—, pero no uno que no existe. Sin código, se le quita.
 */
export const adminPonerElVendedor = comando<
  { organizacion_id: string; codigo: string | null; motivo: string },
  { codigo: string | null }
>({
  nombre: 'admin_poner_el_vendedor',
  entrada: z
    .object({
      organizacion_id: z.string().uuid(),
      codigo: z.string().trim().max(40).nullable(),
      motivo,
    })
    .strict(),
  soloAdmin: true,

  async ejecutar(contexto, e) {
    const [organizacion] = await contexto.sql<{ es: boolean }[]>`
      select exists (select 1 from estook.los_clientes() c where c.organizacion_id = ${e.organizacion_id}) as es
    `;
    if (organizacion?.es !== true) {
      throw new FalloDeAplicacion('no_existe', { porque: 'Ese cliente no está.' });
    }

    let codigoId: string | null = null;
    let codigo: string | null = null;
    if (e.codigo !== null && e.codigo !== '') {
      codigo = comoCodigoDeVendedor(e.codigo);
      const filas =
        codigo === null
          ? []
          : await contexto.sql<{ id: string }[]>`
              select id from plataforma.codigo_de_vendedor where codigo = ${codigo}
            `;
      if (filas[0] === undefined) {
        throw new FalloDeAplicacion('no_existe', {
          campos: ['codigo'],
          porque: 'Ese código no existe.',
        });
      }
      codigoId = filas[0].id;
    }

    const antes = await contexto.sql<{ codigo: string | null }[]>`
      select c.codigo from plataforma.llegada l
        left join plataforma.codigo_de_vendedor c on c.id = l.codigo_id
       where l.organizacion_id = ${e.organizacion_id}
    `;
    // Si llegó antes de A3 no tiene fila: se le hace una, sin saber por dónde vino.
    await contexto.sql`
      insert into plataforma.llegada (organizacion_id, codigo_id, origen, llego_en, puesto_por, puesto_en)
      values (${e.organizacion_id}, ${codigoId}, 'sin_saber', now(), ${contexto.personaId}, now())
      on conflict (organizacion_id) do update
         set codigo_id = excluded.codigo_id, puesto_por = excluded.puesto_por,
             puesto_en = excluded.puesto_en
    `;
    await anotarEnElAdmin(contexto, {
      accion: 'poner_el_vendedor',
      entidad: 'cliente',
      entidadId: e.organizacion_id,
      antes: { codigo: antes[0]?.codigo ?? null },
      despues: { codigo },
      motivo: e.motivo,
    });
    return { codigo };
  },
});
