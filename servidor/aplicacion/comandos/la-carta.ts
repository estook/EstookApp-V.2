import { z } from 'zod';
import { ALERGENOS, CANALES_DE_VENTA, CODIGOS_DE_CANAL, type CanalDeVenta } from '@estook/dominio';
import {
  TIPOS_DE_FOTO,
  TOPE_DE_LA_FOTO,
  TOPE_DE_LA_MINIATURA,
  claveDeLaFotoDePlato,
} from '../../infraestructura/almacen.ts';
import { laOrganizacionDeLaSesion } from '../alta.ts';
import { comando, FalloDeAplicacion, type Contexto } from '../contrato.ts';
import { decodificar, esDeVerdadDeEseTipo } from '../ficheros.ts';
import { elLocalDeLaCarta } from '../consultas/mi-carta.ts';
import { loQuePuede } from '../lo-que-puede.ts';
import { comoLista } from '../listas.ts';
import { queSeVincula, vincularUnPlato } from './fichas.ts';

/**
 * La carta (M9 · 1, decisión 0086): secciones, platos, canales y precios.
 *
 * Todo lo exige Carta para editar —quien lleva el local, el jefe de sala y el de
 * cocina—, y lo vuelve a mirar la política de cada tabla (0068). Cada cambio de un
 * plato queda en la auditoría con su antes y su después: **eso es su historial**,
 * el que enseña `un_plato` («quién cambió qué precio y cuándo», Richi).
 *
 * Lo que vale al guardarlo vale dentro de Estook. «Publicar la carta» sigue siendo
 * enseñarla fuera —el QR y las plataformas— y no es esto.
 */

const nombreDeSeccion = z.string().trim().min(1).max(80);
const nombreDePlato = z.string().trim().min(1).max(120);
const centimos = z.number().int().min(0).max(100_000_000);
const canalQueNoEsSala = z
  .enum(CODIGOS_DE_CANAL as [CanalDeVenta, ...CanalDeVenta[]])
  .refine((c: CanalDeVenta): boolean => c !== 'sala', {
    message: 'Sala es el canal de siempre: su precio es el del plato.',
  });

async function anotar(
  contexto: Contexto,
  accion: string,
  entidad: 'plato' | 'seccion_de_carta' | 'canal_de_venta',
  id: string,
  localId: string,
  antes: unknown,
  despues: unknown,
): Promise<void> {
  await contexto.sql`
    select estook.anotar(
      ${laOrganizacionDeLaSesion(contexto)}::uuid, ${accion}, ${entidad}, ${id},
      ${localId}::uuid,
      ${antes === null ? null : JSON.stringify(antes)}::text::jsonb,
      ${despues === null ? null : JSON.stringify(despues)}::text::jsonb,
      null
    )
  `;
}

/** La sección, si es de este local; si no, «no existe» (lo mismo que si no es suya). */
async function laSeccion(contexto: Contexto, localId: string, seccionId: string | null) {
  if (seccionId === null) return null;
  const filas = await contexto.sql<{ id: string; nombre: string }[]>`
    select id, nombre from estook.seccion_de_carta
     where id = ${seccionId}::uuid and local_id = ${localId}::uuid
  `;
  const seccion = filas[0];
  if (seccion === undefined) {
    throw new FalloDeAplicacion('no_existe', { porque: 'Esa sección no está en esta carta.' });
  }
  return seccion;
}

// ═══ Las secciones ════════════════════════════════════════════════════════════

export const crearSeccion = comando<{ nombre: string }, { seccionId: string; yaExistia: boolean }>({
  nombre: 'crear_seccion',
  entrada: z.object({ nombre: nombreDeSeccion }).strict(),
  exige: 'app.carta',

  async ejecutar(contexto, entrada) {
    const localId = elLocalDeLaCarta(contexto);
    // La que ya existe con ese nombre se devuelve: dos «Postres» son un error de tecleo.
    const ya = await contexto.sql<{ id: string }[]>`
      select id from estook.seccion_de_carta
       where local_id = ${localId}::uuid
         and estook.sin_acentos(nombre) = estook.sin_acentos(${entrada.nombre})
    `;
    if (ya[0] !== undefined) return { seccionId: ya[0].id, yaExistia: true };

    const filas = await contexto.sql<{ id: string }[]>`
      insert into estook.seccion_de_carta (local_id, nombre, orden)
      values (
        ${localId}::uuid, ${entrada.nombre},
        coalesce((select max(orden) + 1 from estook.seccion_de_carta
                   where local_id = ${localId}::uuid), 0)
      )
      returning id
    `;
    const seccionId = filas[0]?.id;
    if (seccionId === undefined) throw new FalloDeAplicacion('sin_permiso');
    await anotar(contexto, 'crear', 'seccion_de_carta', seccionId, localId, null, {
      nombre: entrada.nombre,
    });
    return { seccionId, yaExistia: false };
  },
});

export const entradaCambiarSeccion = z
  .object({
    seccion_id: z.string().uuid(),
    nombre: nombreDeSeccion.optional(),
  })
  .strict();
export type EntradaCambiarSeccion = z.infer<typeof entradaCambiarSeccion>;

export const cambiarSeccion = comando<EntradaCambiarSeccion, { seccionId: string }>({
  nombre: 'cambiar_seccion',
  entrada: entradaCambiarSeccion,
  exige: 'app.carta',

  async ejecutar(contexto, entrada) {
    const localId = elLocalDeLaCarta(contexto);
    const antes = await laSeccion(contexto, localId, entrada.seccion_id);
    if (antes === null) throw new FalloDeAplicacion('no_existe');
    const nombre = entrada.nombre ?? antes.nombre;
    const otra = await contexto.sql<{ id: string }[]>`
        select id from estook.seccion_de_carta
         where local_id = ${localId}::uuid and id <> ${entrada.seccion_id}::uuid
           and estook.sin_acentos(nombre) = estook.sin_acentos(${nombre})
      `;
    if (otra[0] !== undefined) {
      throw new FalloDeAplicacion('faltan_datos', {
        campos: ['nombre'],
        porque: 'Ya hay una sección que se llama así.',
      });
    }
    await contexto.sql`
        update estook.seccion_de_carta
           set nombre = ${nombre}, actualizado_en = now()
         where id = ${entrada.seccion_id}::uuid
      `;
    await anotar(
      contexto,
      'cambiar',
      'seccion_de_carta',
      entrada.seccion_id,
      localId,
      { nombre: antes.nombre },
      { nombre },
    );
    return { seccionId: entrada.seccion_id };
  },
});

export const ordenarSecciones = comando<{ secciones: string[] }, { ordenadas: number }>({
  nombre: 'ordenar_secciones',
  entrada: z.object({ secciones: z.array(z.string().uuid()).min(1).max(100) }).strict(),
  exige: 'app.carta',

  async ejecutar(contexto, entrada) {
    const localId = elLocalDeLaCarta(contexto);
    let ordenadas = 0;
    for (const [orden, id] of entrada.secciones.entries()) {
      const filas = await contexto.sql<{ id: string }[]>`
        update estook.seccion_de_carta set orden = ${orden}, actualizado_en = now()
         where id = ${id}::uuid and local_id = ${localId}::uuid
        returning id
      `;
      ordenadas += filas.length;
    }
    return { ordenadas };
  },
});

export const quitarSeccion = comando<{ seccion_id: string }, { platosSinSeccion: number }>({
  nombre: 'quitar_seccion',
  entrada: z.object({ seccion_id: z.string().uuid() }).strict(),
  exige: 'app.carta',

  async ejecutar(contexto, entrada) {
    const localId = elLocalDeLaCarta(contexto);
    const antes = await laSeccion(contexto, localId, entrada.seccion_id);
    if (antes === null) throw new FalloDeAplicacion('no_existe');
    // Sus platos no se borran: pasan a «Sin sección» (0086, punto 4).
    const movidos = await contexto.sql<{ id: string }[]>`
      update estook.plato set seccion_id = null, actualizado_en = now()
       where seccion_id = ${entrada.seccion_id}::uuid
      returning id
    `;
    await contexto.sql`delete from estook.seccion_de_carta where id = ${entrada.seccion_id}::uuid`;
    await anotar(
      contexto,
      'quitar',
      'seccion_de_carta',
      entrada.seccion_id,
      localId,
      {
        nombre: antes.nombre,
      },
      { platosSinSeccion: movidos.length },
    );
    return { platosSinSeccion: movidos.length };
  },
});

// ═══ Los platos ═══════════════════════════════════════════════════════════════

const unoNuevo = z
  .object({
    nombre: nombreDePlato,
    precio_centimos: centimos.nullable().optional(),
    descripcion: z.string().trim().max(500).nullable().optional(),
    // Desde el Almacén (0087): el plato **es** ese producto, vendido tal cual, y lo que
    // lleva la ración si no va por unidades (el entrecot, 300 g).
    producto_id: z.string().uuid().nullable().optional(),
    ...queSeVincula,
  })
  .strict();

export const entradaCrearPlatos = z
  .object({
    seccion_id: z.string().uuid().nullable(),
    // De uno en uno o de golpe, fila a fila, como se pasa una carta de papel (0086).
    platos: z.array(unoNuevo).min(1).max(60),
  })
  .strict();

export type EntradaCrearPlatos = z.infer<typeof entradaCrearPlatos>;

export const crearPlatos = comando<
  EntradaCrearPlatos,
  {
    creados: { platoId: string; nombre: string }[];
    recuperados: { platoId: string; nombre: string }[];
    yaEstaban: string[];
  }
>({
  nombre: 'crear_platos',
  entrada: entradaCrearPlatos,
  exige: 'app.carta',

  async ejecutar(contexto, entrada) {
    const localId = elLocalDeLaCarta(contexto);
    await laSeccion(contexto, localId, entrada.seccion_id);

    // Vincular es escribir su ficha: hace falta Escandallos para editar (0087).
    const conVinculo = entrada.platos.some((p) => (p.producto_id ?? null) !== null);
    if (conVinculo) {
      const puede = await loQuePuede(contexto, localId, ['app.escandallos']);
      if (!puede.editar('app.escandallos')) throw new FalloDeAplicacion('sin_permiso');
    }

    const creados: { platoId: string; nombre: string }[] = [];
    const recuperados: { platoId: string; nombre: string }[] = [];
    const yaEstaban: string[] = [];
    const vistos = new Set<string>();

    for (const nuevo of entrada.platos) {
      // Dos veces lo mismo en la misma tanda: se queda el primero.
      const clave = nuevo.nombre.toLocaleLowerCase('es');
      if (vistos.has(clave)) continue;
      vistos.add(clave);

      const ya = await contexto.sql<
        { id: string; activo: boolean; nombre: string; en_la_carta: boolean }[]
      >`
        select id, activo, nombre, en_la_carta from estook.plato
         where local_id = ${localId}::uuid
           and estook.sin_acentos(nombre) = estook.sin_acentos(${nuevo.nombre})
      `;
      const existente = ya[0];
      if (existente !== undefined) {
        if (existente.activo && !existente.en_la_carta) {
          // El plato que nació en un menú (0104) y ahora se escribe en la carta: es el
          // mismo, con su escandallo; pasa a la carta, en esta sección y con este precio.
          await contexto.sql`
            update estook.plato
               set en_la_carta = true, seccion_id = ${entrada.seccion_id}::uuid,
                   precio_centimos = coalesce(${nuevo.precio_centimos ?? null}::int, precio_centimos),
                   actualizado_en = now()
             where id = ${existente.id}::uuid
          `;
          await anotar(
            contexto,
            'poner_en_la_carta',
            'plato',
            existente.id,
            localId,
            { en_la_carta: false },
            { en_la_carta: true },
          );
          recuperados.push({ platoId: existente.id, nombre: existente.nombre });
          continue;
        }
        if (existente.activo) {
          yaEstaban.push(existente.nombre);
          continue;
        }
        // El que estaba archivado vuelve, en esta sección y con este precio: es el
        // mismo plato, con su historial.
        await contexto.sql`
          update estook.plato
             set activo = true, en_la_carta = true, seccion_id = ${entrada.seccion_id}::uuid,
                 precio_centimos = coalesce(${nuevo.precio_centimos ?? null}::int, precio_centimos),
                 actualizado_en = now()
           where id = ${existente.id}::uuid
        `;
        await anotar(
          contexto,
          'recuperar',
          'plato',
          existente.id,
          localId,
          { activo: false },
          {
            activo: true,
            ...(nuevo.precio_centimos === undefined ? {} : { precio: nuevo.precio_centimos }),
          },
        );
        recuperados.push({ platoId: existente.id, nombre: existente.nombre });
        continue;
      }

      const filas = await contexto.sql<{ id: string }[]>`
        insert into estook.plato (local_id, seccion_id, nombre, descripcion, precio_centimos,
                                  orden, creado_por)
        values (
          ${localId}::uuid, ${entrada.seccion_id}::uuid, ${nuevo.nombre},
          ${nuevo.descripcion ?? null}, ${nuevo.precio_centimos ?? null},
          coalesce((select max(orden) + 1 from estook.plato
                     where local_id = ${localId}::uuid
                       and seccion_id is not distinct from ${entrada.seccion_id}::uuid), 0),
          ${contexto.personaId}::uuid
        )
        returning id
      `;
      const platoId = filas[0]?.id;
      if (platoId === undefined) throw new FalloDeAplicacion('sin_permiso');
      await anotar(contexto, 'crear', 'plato', platoId, localId, null, {
        nombre: nuevo.nombre,
        precio: nuevo.precio_centimos ?? null,
      });
      if (nuevo.producto_id !== undefined && nuevo.producto_id !== null) {
        await vincularUnPlato(contexto, localId, platoId, {
          productoId: nuevo.producto_id,
          cantidad: nuevo.cantidad ?? null,
          unidad: nuevo.unidad ?? null,
        });
      }
      creados.push({ platoId, nombre: nuevo.nombre });
    }

    return { creados, recuperados, yaEstaban };
  },
});

export const entradaCambiarPlato = z
  .object({
    plato_id: z.string().uuid(),
    version: z.number().int().min(1),
    nombre: nombreDePlato.optional(),
    descripcion: z.string().trim().max(500).nullable().optional(),
    seccion_id: z.string().uuid().nullable().optional(),
    precio_centimos: centimos.nullable().optional(),
    // El precio a mano de cada canal; nulo lo quita y vuelve a valer el de sala.
    precios: z.record(z.string(), centimos.nullable()).optional(),
    // Lo que la carta le dice al cliente (0087): las unidades de la ración, los
    // alérgenos puestos a mano, cuánto pica y si es vegetariano o vegano.
    unidades_por_racion: z.number().int().min(1).max(99).nullable().optional(),
    alergenos: z
      .array(z.enum(ALERGENOS as unknown as [string, ...string[]]))
      .max(14)
      .optional(),
    picante: z.number().int().min(0).max(3).optional(),
    distintivos: z
      .array(z.enum(['vegetariano', 'vegano']))
      .max(2)
      .optional(),
  })
  .strict();

export type EntradaCambiarPlato = z.infer<typeof entradaCambiarPlato>;

interface FilaDelPlato {
  nombre: string;
  descripcion: string | null;
  seccion_id: string | null;
  precio_centimos: number | null;
  version: number;
  activo: boolean;
  unidades_por_racion: number | null;
  alergenos: string[];
  picante: number;
  distintivos: string[];
}

async function elPlatoParaEscribir(
  contexto: Contexto,
  localId: string,
  platoId: string,
): Promise<FilaDelPlato> {
  // `for update`: además del candado, aplica las políticas de escribir (0068).
  const filas = await contexto.sql<FilaDelPlato[]>`
    select nombre, descripcion, seccion_id, precio_centimos, version, activo,
           unidades_por_racion, alergenos, picante, distintivos
      from estook.plato
     where id = ${platoId}::uuid and local_id = ${localId}::uuid
       for update
  `;
  const plato = filas[0];
  if (plato === undefined) {
    throw new FalloDeAplicacion('no_existe', {
      porque: 'Ese plato no está en esta carta, o tu acceso no deja cambiarlo.',
    });
  }
  return plato;
}

export const cambiarPlato = comando<EntradaCambiarPlato, { platoId: string; version: number }>({
  nombre: 'cambiar_plato',
  entrada: entradaCambiarPlato,
  exige: 'app.carta',

  async ejecutar(contexto, entrada) {
    const localId = elLocalDeLaCarta(contexto);
    const antes = await elPlatoParaEscribir(contexto, localId, entrada.plato_id);
    if (antes.version !== entrada.version) throw new FalloDeAplicacion('lo_cambio_otra_persona');

    if (entrada.seccion_id !== undefined) await laSeccion(contexto, localId, entrada.seccion_id);
    if (entrada.nombre !== undefined) {
      const otro = await contexto.sql<{ id: string }[]>`
        select id from estook.plato
         where local_id = ${localId}::uuid and id <> ${entrada.plato_id}::uuid
           and estook.sin_acentos(nombre) = estook.sin_acentos(${entrada.nombre})
      `;
      if (otro[0] !== undefined) {
        throw new FalloDeAplicacion('faltan_datos', {
          campos: ['nombre'],
          porque: 'Ya hay un plato que se llama así en esta carta.',
        });
      }
    }

    // Los canales que se tocan, solo los que se pueden tener hoy (0086).
    const precios = Object.entries(entrada.precios ?? {});
    for (const [canal] of precios) {
      const como = CANALES_DE_VENTA.find((c) => c.canal === canal);
      if (como === undefined || canal === 'sala' || !como.disponible) {
        throw new FalloDeAplicacion('faltan_datos', {
          campos: ['precios'],
          porque: `«${canal}» no es un canal que se pueda usar todavía.`,
        });
      }
    }

    const cambiado: Record<string, unknown> = {};
    const eraAntes: Record<string, unknown> = {};
    const apunta = (que: string, de: unknown, a: unknown) => {
      if (de === a) return;
      eraAntes[que] = de;
      cambiado[que] = a;
    };
    if (entrada.nombre !== undefined) apunta('nombre', antes.nombre, entrada.nombre);
    if (entrada.descripcion !== undefined) {
      apunta(
        'descripcion',
        antes.descripcion,
        entrada.descripcion === '' ? null : entrada.descripcion,
      );
    }
    if (entrada.seccion_id !== undefined) apunta('seccion', antes.seccion_id, entrada.seccion_id);
    if (entrada.precio_centimos !== undefined) {
      apunta('precio', antes.precio_centimos, entrada.precio_centimos);
    }
    if (entrada.unidades_por_racion !== undefined) {
      apunta('unidades', antes.unidades_por_racion, entrada.unidades_por_racion);
    }
    if (entrada.picante !== undefined) apunta('picante', antes.picante, entrada.picante);
    // Las listas, en el orden oficial y sin repetir: así «lo mismo» compara igual.
    const enOrden = (lista: readonly string[], orden: readonly string[]) =>
      orden.filter((a) => lista.includes(a));
    const alergenos =
      entrada.alergenos === undefined ? antes.alergenos : enOrden(entrada.alergenos, ALERGENOS);
    const distintivos =
      entrada.distintivos === undefined
        ? antes.distintivos
        : enOrden(entrada.distintivos, ['vegetariano', 'vegano']);
    if (alergenos.join(',') !== antes.alergenos.join(',')) {
      eraAntes['alergenos'] = antes.alergenos;
      cambiado['alergenos'] = alergenos;
    }
    if (distintivos.join(',') !== antes.distintivos.join(',')) {
      eraAntes['distintivos'] = antes.distintivos;
      cambiado['distintivos'] = distintivos;
    }

    const filas = await contexto.sql<{ version: number }[]>`
      update estook.plato
         set nombre = ${entrada.nombre ?? antes.nombre},
             descripcion = ${entrada.descripcion === undefined ? antes.descripcion : entrada.descripcion === '' ? null : entrada.descripcion},
             seccion_id = ${entrada.seccion_id === undefined ? antes.seccion_id : entrada.seccion_id}::uuid,
             precio_centimos = ${entrada.precio_centimos === undefined ? antes.precio_centimos : entrada.precio_centimos},
             unidades_por_racion = ${entrada.unidades_por_racion === undefined ? antes.unidades_por_racion : entrada.unidades_por_racion},
             alergenos = ${comoLista(alergenos)}::text::text[],
             picante = ${entrada.picante ?? antes.picante},
             distintivos = ${comoLista(distintivos)}::text::text[],
             actualizado_en = now()
       where id = ${entrada.plato_id}::uuid
      returning version
    `;

    if (precios.length > 0) {
      const tenia = await contexto.sql<{ canal: string; precio_centimos: number }[]>`
        select canal::text as canal, precio_centimos from estook.precio_de_plato
         where plato_id = ${entrada.plato_id}::uuid
      `;
      const deAntes = new Map(tenia.map((t) => [t.canal, t.precio_centimos]));
      for (const [canal, precio] of precios) {
        apunta(`precio_${canal}`, deAntes.get(canal) ?? null, precio);
        if (precio === null) {
          await contexto.sql`
            delete from estook.precio_de_plato
             where plato_id = ${entrada.plato_id}::uuid and canal = ${canal}::estook.canal_de_venta
          `;
        } else {
          await contexto.sql`
            insert into estook.precio_de_plato (plato_id, canal, precio_centimos, actualizado_por)
            values (${entrada.plato_id}::uuid, ${canal}::estook.canal_de_venta, ${precio},
                    ${contexto.personaId}::uuid)
            on conflict (plato_id, canal) do update
               set precio_centimos = excluded.precio_centimos,
                   actualizado_por = excluded.actualizado_por,
                   actualizado_en = now()
          `;
        }
      }
    }

    if (Object.keys(cambiado).length > 0) {
      await anotar(contexto, 'cambiar', 'plato', entrada.plato_id, localId, eraAntes, cambiado);
    }
    return { platoId: entrada.plato_id, version: filas[0]?.version ?? antes.version };
  },
});

export const ordenarPlatos = comando<
  { seccion_id: string | null; platos: string[] },
  { ordenados: number }
>({
  nombre: 'ordenar_platos',
  entrada: z
    .object({
      seccion_id: z.string().uuid().nullable(),
      platos: z.array(z.string().uuid()).min(1).max(300),
    })
    .strict(),
  exige: 'app.carta',

  async ejecutar(contexto, entrada) {
    const localId = elLocalDeLaCarta(contexto);
    await laSeccion(contexto, localId, entrada.seccion_id);
    let ordenados = 0;
    // El orden dentro de la sección, y si alguno venía de otra, pasa a esta.
    for (const [orden, id] of entrada.platos.entries()) {
      const filas = await contexto.sql<{ id: string }[]>`
        update estook.plato
           set orden = ${orden}, seccion_id = ${entrada.seccion_id}::uuid, actualizado_en = now()
         where id = ${id}::uuid and local_id = ${localId}::uuid
        returning id
      `;
      ordenados += filas.length;
    }
    return { ordenados };
  },
});

function archivarORecuperar(nombre: 'archivar_plato' | 'recuperar_plato') {
  const activo = nombre === 'recuperar_plato';
  return comando<{ plato_id: string }, { platoId: string; activo: boolean }>({
    nombre,
    entrada: z.object({ plato_id: z.string().uuid() }).strict(),
    exige: 'app.carta',

    async ejecutar(contexto, entrada) {
      const localId = elLocalDeLaCarta(contexto);
      const antes = await elPlatoParaEscribir(contexto, localId, entrada.plato_id);
      if (antes.activo === activo) return { platoId: entrada.plato_id, activo };
      await contexto.sql`
        update estook.plato set activo = ${activo}, actualizado_en = now()
         where id = ${entrada.plato_id}::uuid
      `;
      await anotar(
        contexto,
        activo ? 'recuperar' : 'archivar',
        'plato',
        entrada.plato_id,
        localId,
        {
          activo: !activo,
        },
        { activo },
      );
      return { platoId: entrada.plato_id, activo };
    },
  });
}

export const archivarPlato = archivarORecuperar('archivar_plato');
export const recuperarPlato = archivarORecuperar('recuperar_plato');

/**
 * **Borrar un plato, para siempre** (Richi, 19-oct: «poder borrar platos archivados, o
 * borrarlos directamente»). Se va con su escandallo, su ficha técnica, su historial y sus
 * precios por canal, y sus fotos del almacén. La pantalla lo confirma diciendo que no
 * hay vuelta atrás; quien solo quiere quitarlo de la carta, lo archiva.
 */
export const borrarPlato = comando<{ plato_id: string }, { platoId: string; nombre: string }>({
  nombre: 'borrar_plato',
  entrada: z.object({ plato_id: z.string().uuid() }).strict(),
  exige: 'app.carta',

  async ejecutar(contexto, entrada) {
    const localId = elLocalDeLaCarta(contexto);
    const antes = await elPlatoParaEscribir(contexto, localId, entrada.plato_id);
    // Las fotos, antes de que se vaya la fila que dice dónde están.
    const fotos = await contexto.sql<{ clave: string | null }[]>`
      select unnest(array[p.foto_clave, p.miniatura_clave]) as clave
        from estook.plato p where p.id = ${entrada.plato_id}::uuid
      union all
      select unnest(r.fotos_de_los_pasos) from estook.receta r
       where r.plato_id = ${entrada.plato_id}::uuid
    `;
    const borrados = await contexto.sql<{ id: string }[]>`
      delete from estook.plato
       where id = ${entrada.plato_id}::uuid and local_id = ${localId}::uuid
      returning id
    `;
    if (borrados.length === 0) {
      throw new FalloDeAplicacion('sin_permiso', {
        porque: 'Tu acceso no deja borrar platos de esta carta.',
      });
    }
    if (contexto.almacen !== null) {
      for (const { clave } of fotos) {
        if (clave !== null && clave !== '') await contexto.almacen.borrar(clave);
      }
    }
    await anotar(
      contexto,
      'borrar',
      'plato',
      entrada.plato_id,
      localId,
      { nombre: antes.nombre },
      null,
    );
    return { platoId: entrada.plato_id, nombre: antes.nombre };
  },
});

// ═══ La foto del plato ═══════════════════════════════════════════════════════
//
// El mismo camino que la del producto (`fotos.ts`): dos ficheros ya reducidos en el
// móvil, la fila tomada para escribir antes de subir, y lo viejo borrado al final.

const base64QueCabe = (tope: number) =>
  z
    .string()
    .min(1)
    .max(Math.ceil((tope * 4) / 3) + 1024);

export const entradaPonerFotoDePlato = z
  .object({
    plato_id: z.string().uuid(),
    tipo: z.string().refine((t) => t in TIPOS_DE_FOTO, {
      message: 'Solo se admiten fotos en WebP o JPG.',
    }),
    foto: base64QueCabe(TOPE_DE_LA_FOTO),
    miniatura: base64QueCabe(TOPE_DE_LA_MINIATURA),
  })
  .strict();

async function laFotoParaEscribir(contexto: Contexto, localId: string, platoId: string) {
  const filas = await contexto.sql<{ foto_clave: string | null; miniatura_clave: string | null }[]>`
    select foto_clave, miniatura_clave from estook.plato
     where id = ${platoId}::uuid and local_id = ${localId}::uuid
       for update
  `;
  const fila = filas[0];
  if (fila === undefined) {
    throw new FalloDeAplicacion('no_existe', {
      porque: 'Ese plato no está en esta carta, o tu acceso no deja cambiarlo.',
    });
  }
  return fila;
}

export const ponerFotoDePlato = comando<
  z.infer<typeof entradaPonerFotoDePlato>,
  { platoId: string; puesta: boolean }
>({
  nombre: 'poner_foto_de_plato',
  entrada: entradaPonerFotoDePlato,
  exige: 'app.carta',

  async ejecutar(contexto, entrada) {
    const localId = elLocalDeLaCarta(contexto);
    const almacen = contexto.almacen;
    if (almacen === null) {
      throw new FalloDeAplicacion('fallo_nuestro', {
        porque: 'Todavía no hay dónde guardar las fotos. Todo lo demás del plato funciona igual.',
      });
    }
    const foto = decodificar(entrada.foto, 'foto');
    const miniatura = decodificar(entrada.miniatura, 'miniatura');
    if (foto.byteLength > TOPE_DE_LA_FOTO || miniatura.byteLength > TOPE_DE_LA_MINIATURA) {
      throw new FalloDeAplicacion('faltan_datos', {
        campos: ['foto'],
        porque: `Esa foto pesa demasiado aun reducida. El tope son ${Math.trunc(TOPE_DE_LA_FOTO / 1024)} KB: prueba con otra.`,
      });
    }
    if (!esDeVerdadDeEseTipo(foto, entrada.tipo) || !esDeVerdadDeEseTipo(miniatura, entrada.tipo)) {
      throw new FalloDeAplicacion('faltan_datos', {
        campos: ['foto'],
        porque: 'Eso no es una foto que se pueda guardar. Prueba a hacerla otra vez.',
      });
    }

    const antes = await laFotoParaEscribir(contexto, localId, entrada.plato_id);
    const extension = TIPOS_DE_FOTO[entrada.tipo] ?? 'jpg';
    const claveFoto = claveDeLaFotoDePlato(
      localId,
      entrada.plato_id,
      'foto',
      extension,
      contexto.ahora,
    );
    const claveMiniatura = claveDeLaFotoDePlato(
      localId,
      entrada.plato_id,
      'miniatura',
      extension,
      contexto.ahora,
    );

    await almacen.guardar(claveFoto, foto, entrada.tipo);
    try {
      await almacen.guardar(claveMiniatura, miniatura, entrada.tipo);
    } catch (fallo) {
      await almacen.borrar(claveFoto);
      throw fallo;
    }

    await contexto.sql`
      update estook.plato
         set foto_clave = ${claveFoto}, miniatura_clave = ${claveMiniatura}, actualizado_en = now()
       where id = ${entrada.plato_id}::uuid
    `;
    if (antes.foto_clave !== null) await almacen.borrar(antes.foto_clave);
    if (antes.miniatura_clave !== null) await almacen.borrar(antes.miniatura_clave);

    await anotar(
      contexto,
      'cambiar',
      'plato',
      entrada.plato_id,
      localId,
      {
        foto: antes.foto_clave === null ? 'sin' : 'puesta',
      },
      { foto: 'puesta' },
    );
    return { platoId: entrada.plato_id, puesta: true };
  },
});

export const quitarFotoDePlato = comando<
  { plato_id: string },
  { platoId: string; quitada: boolean }
>({
  nombre: 'quitar_foto_de_plato',
  entrada: z.object({ plato_id: z.string().uuid() }).strict(),
  exige: 'app.carta',

  async ejecutar(contexto, entrada) {
    const localId = elLocalDeLaCarta(contexto);
    const antes = await laFotoParaEscribir(contexto, localId, entrada.plato_id);
    if (antes.foto_clave === null) return { platoId: entrada.plato_id, quitada: false };
    await contexto.sql`
        update estook.plato set foto_clave = null, miniatura_clave = null, actualizado_en = now()
         where id = ${entrada.plato_id}::uuid
      `;
    if (contexto.almacen !== null) {
      await contexto.almacen.borrar(antes.foto_clave);
      if (antes.miniatura_clave !== null) await contexto.almacen.borrar(antes.miniatura_clave);
    }
    await anotar(
      contexto,
      'cambiar',
      'plato',
      entrada.plato_id,
      localId,
      { foto: 'puesta' },
      {
        foto: 'quitada',
      },
    );
    return { platoId: entrada.plato_id, quitada: true };
  },
});

// ═══ Los canales ═════════════════════════════════════════════════════════════

export const entradaConfigurarCanal = z
  .object({
    canal: canalQueNoEsSala,
    activo: z.boolean(),
    comision_porcentaje: z.number().min(0).max(100).nullable().optional(),
    envase_centimos: z.number().int().min(0).max(10_000_000).nullable().optional(),
  })
  .strict();

export const configurarCanal = comando<
  z.infer<typeof entradaConfigurarCanal>,
  { canal: CanalDeVenta; activo: boolean }
>({
  nombre: 'configurar_canal',
  entrada: entradaConfigurarCanal,
  exige: 'app.carta',

  async ejecutar(contexto, entrada) {
    const localId = elLocalDeLaCarta(contexto);
    const como = CANALES_DE_VENTA.find((c) => c.canal === entrada.canal);
    if (como === undefined || !como.disponible) {
      throw new FalloDeAplicacion('todavia_no_disponible', {
        porque: `${como?.nombre ?? 'Ese canal'} todavía no se puede activar.`,
      });
    }
    const tenia = await contexto.sql<
      { activo: boolean; comision_porcentaje: string | null; envase_centimos: number | null }[]
    >`
      select activo, comision_porcentaje::text as comision_porcentaje, envase_centimos
        from estook.canal_de_venta_del_local
       where local_id = ${localId}::uuid and canal = ${entrada.canal}::estook.canal_de_venta
    `;
    const antes = tenia[0];
    const comision =
      entrada.comision_porcentaje !== undefined
        ? entrada.comision_porcentaje
        : antes !== undefined
          ? antes.comision_porcentaje === null
            ? null
            : Number(antes.comision_porcentaje)
          : como.comisionHabitual;
    const envase =
      entrada.envase_centimos !== undefined
        ? entrada.envase_centimos
        : (antes?.envase_centimos ?? null);

    await contexto.sql`
      insert into estook.canal_de_venta_del_local (local_id, canal, activo, comision_porcentaje, envase_centimos)
      values (${localId}::uuid, ${entrada.canal}::estook.canal_de_venta, ${entrada.activo},
              ${comision}, ${envase})
      on conflict (local_id, canal) do update
         set activo = excluded.activo,
             comision_porcentaje = excluded.comision_porcentaje,
             envase_centimos = excluded.envase_centimos,
             actualizado_en = now()
    `;
    await anotar(
      contexto,
      antes === undefined ? 'crear' : 'cambiar',
      'canal_de_venta',
      entrada.canal,
      localId,
      antes === undefined
        ? null
        : {
            activo: antes.activo,
            comision: antes.comision_porcentaje === null ? null : Number(antes.comision_porcentaje),
            envase: antes.envase_centimos,
          },
      { activo: entrada.activo, comision, envase },
    );
    return { canal: entrada.canal, activo: entrada.activo };
  },
});
