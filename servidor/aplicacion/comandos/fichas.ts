import { z } from 'zod';
import {
  UNIDADES_DE_USO,
  convertir,
  juntarLoRepetido,
  queCambioEnLaReceta,
  seLlevaASiMisma,
  type LineaQueSeEscribe,
  type UnidadDeUso,
} from '@estook/dominio';
import { laOrganizacionDeLaSesion } from '../alta.ts';
import { comoLista } from '../listas.ts';
import { comando, FalloDeAplicacion, type Contexto } from '../contrato.ts';
import {
  comoSeGuarda,
  elLibroDelLocal,
  elLocalDeEscandallos,
  elVinculado,
  type RecetaGuardada,
} from '../escandallos.ts';

/**
 * Las fichas (M9 · 2, decisiones 0086 y 0087): lo que lleva cada plato y cada
 * elaboración, y cómo se hace.
 *
 * **Una receta a la vista y su historial** (0086, pregunta 5): guardar es confirmar,
 * y lo guardado es la receta de ahora. Cada guardado queda **entero** en
 * `receta_guardada`, con quién, cuándo y qué cambió en una línea cada cosa; desde ahí
 * se ve la de antes y **se recupera**, que es otro guardado más. No hay versiones
 * que elegir ni comparador.
 *
 * Lo exige Escandallos para editar (quien lleva el local y el jefe de cocina), y lo
 * vuelve a mirar la política de cada tabla (0069).
 */

const unidad = z.enum(UNIDADES_DE_USO as unknown as [UnidadDeUso, ...UnidadDeUso[]]);

const unaLinea = z
  .object({
    producto_id: z.string().uuid().nullable().optional(),
    elaboracion_id: z.string().uuid().nullable().optional(),
    cantidad: z.number().positive().max(100_000),
    unidad,
    nota: z.string().trim().max(80).nullable().optional(),
  })
  .strict()
  .refine((l) => ((l.producto_id ?? null) === null) !== ((l.elaboracion_id ?? null) === null), {
    message: 'Cada línea lleva un producto o una elaboración.',
  });

const lineas = z.array(unaLinea).max(60);
const pasos = z.array(z.string().trim().min(1).max(400)).max(40);
const notas = z.string().trim().max(1000).nullable().optional();
const minutos = z.number().int().min(1).max(2880).nullable().optional();

type Dueno = { readonly platoId: string } | { readonly elaboracionId: string };

interface LoQueSeGuarda {
  readonly lineas: readonly LineaQueSeEscribe[];
  readonly pasos: readonly string[];
  readonly notas: string | null;
  readonly minutos: number | null;
  /** Solo de una elaboración. */
  readonly nombre?: string;
  readonly rinde?: { readonly cantidad: number; readonly unidad: UnidadDeUso };
}

export interface Guardada {
  readonly version: number;
  readonly cambios: readonly string[];
  /** Los ingredientes que venían dos veces y se han sumado: se avisa. */
  readonly sumadas: readonly string[];
}

async function anotarEnElPlato(
  contexto: Contexto,
  platoId: string,
  localId: string,
  antes: unknown,
  despues: unknown,
): Promise<void> {
  await contexto.sql`
    select estook.anotar(
      ${laOrganizacionDeLaSesion(contexto)}::uuid, 'cambiar', 'plato', ${platoId},
      ${localId}::uuid, ${JSON.stringify(antes)}::text::jsonb,
      ${JSON.stringify(despues)}::text::jsonb, null
    )
  `;
}

/**
 * Guardar la receta de un plato o de una elaboración: comprueba lo que lleva, suma lo
 * repetido, no deja que una elaboración se lleve a sí misma, la deja como la de ahora
 * y apunta el guardado entero en el historial. Si no cambia nada, no apunta nada.
 */
export async function guardarLaReceta(
  contexto: Contexto,
  localId: string,
  dueno: Dueno,
  datos: LoQueSeGuarda,
  opciones: {
    readonly version: number | null;
    readonly recupera?: { version: number; cuando: string };
  },
): Promise<Guardada> {
  // ── De quién es ─────────────────────────────────────────────────────────────
  let nombre: string;
  let rinde: RecetaGuardada['rinde'] = null;
  if ('platoId' in dueno) {
    const filas = await contexto.sql<{ nombre: string }[]>`
      select nombre from estook.plato
       where id = ${dueno.platoId}::uuid and local_id = ${localId}::uuid
    `;
    if (filas[0] === undefined) {
      throw new FalloDeAplicacion('no_existe', { porque: 'Ese plato no está en este local.' });
    }
    nombre = filas[0].nombre;
  } else {
    const filas = await contexto.sql<
      { nombre: string; rinde_cantidad: string; rinde_unidad: UnidadDeUso }[]
    >`
      select nombre, rinde_cantidad::text as rinde_cantidad, rinde_unidad::text as rinde_unidad
        from estook.elaboracion
       where id = ${dueno.elaboracionId}::uuid and local_id = ${localId}::uuid
         for update
    `;
    const fila = filas[0];
    if (fila === undefined) {
      throw new FalloDeAplicacion('no_existe', {
        porque: 'Esa elaboración no está en este local, o tu acceso no deja cambiarla.',
      });
    }
    nombre = datos.nombre ?? fila.nombre;
    rinde = datos.rinde ?? { cantidad: Number(fila.rinde_cantidad), unidad: fila.rinde_unidad };
  }

  const platoId = 'platoId' in dueno ? dueno.platoId : null;
  const elaboracionId = 'elaboracionId' in dueno ? dueno.elaboracionId : null;
  const tenia = await contexto.sql<{ id: string; version: number }[]>`
    select id, version from estook.receta
     where local_id = ${localId}::uuid
       and (plato_id = ${platoId}::uuid or elaboracion_id = ${elaboracionId}::uuid)
       for update
  `;
  const receta = tenia[0];
  if (opciones.version !== null && (receta?.version ?? 0) !== opciones.version) {
    throw new FalloDeAplicacion('lo_cambio_otra_persona');
  }

  // ── Lo que lleva, comprobado ────────────────────────────────────────────────
  const { libro, productos, elaboraciones } = await elLibroDelLocal(contexto, localId, false);
  for (const linea of datos.lineas) {
    if (linea.productoId !== null) {
      const producto = productos.get(linea.productoId);
      if (producto === undefined) {
        throw new FalloDeAplicacion('faltan_datos', {
          campos: ['lineas'],
          porque: 'Uno de los ingredientes no está en el Almacén de este local.',
        });
      }
      if (convertir(1, linea.unidad, producto.unidad) === null) {
        throw new FalloDeAplicacion('faltan_datos', {
          campos: ['lineas'],
          porque: `«${producto.nombre}» se lleva en ${producto.unidad}: escríbelo en ${producto.unidad === 'ud' ? 'unidades' : producto.unidad === 'g' || producto.unidad === 'kg' ? 'g o kg' : 'ml o l'}.`,
        });
      }
    } else {
      const elaboracion = elaboraciones.get(linea.elaboracionId ?? '');
      if (elaboracion === undefined) {
        throw new FalloDeAplicacion('faltan_datos', {
          campos: ['lineas'],
          porque: 'Una de las elaboraciones no está en este local.',
        });
      }
      if (convertir(1, linea.unidad, elaboracion.rindeUnidad) === null) {
        throw new FalloDeAplicacion('faltan_datos', {
          campos: ['lineas'],
          porque: `«${elaboracion.nombre}» rinde en ${elaboracion.rindeUnidad}: escríbelo igual.`,
        });
      }
    }
  }
  if ('elaboracionId' in dueno) {
    // Lo que rinde cambia de familia (de litros a kilos) y otras recetas la llevan en la
    // de antes: se quedarían sin coste. Se dice, y no se guarda.
    const antes = elaboraciones.get(dueno.elaboracionId);
    const laLlevan = [...libro.elaboraciones.values()].filter((e) =>
      e.lineas.some((l) => l.elaboracionId === dueno.elaboracionId),
    ).length;
    const enPlatos = await contexto.sql<{ cuantas: number }[]>`
      select count(distinct r.id)::int as cuantas
        from estook.linea_de_receta l
        join estook.receta r on r.id = l.receta_id
       where l.elaboracion_id = ${dueno.elaboracionId}::uuid and r.plato_id is not null
    `;
    const usos = laLlevan + (enPlatos[0]?.cuantas ?? 0);
    if (
      rinde !== null &&
      antes !== undefined &&
      usos > 0 &&
      convertir(1, rinde.unidad, antes.rindeUnidad) === null
    ) {
      throw new FalloDeAplicacion('faltan_datos', {
        campos: ['rinde_unidad'],
        porque: `${String(usos)} ${usos === 1 ? 'receta la lleva' : 'recetas la llevan'} en ${antes.rindeUnidad}: lo que rinde tiene que seguir en ${antes.rindeUnidad === 'ud' ? 'unidades' : antes.rindeUnidad === 'g' || antes.rindeUnidad === 'kg' ? 'g o kg' : 'ml o l'}.`,
      });
    }
    if (seLlevaASiMisma(dueno.elaboracionId, datos.lineas, libro)) {
      throw new FalloDeAplicacion('faltan_datos', {
        campos: ['lineas'],
        porque: `«${nombre}» no puede llevarse a sí misma, ni dentro de otra que la lleve.`,
      });
    }
  }
  const juntas = juntarLoRepetido(datos.lineas);
  const sumadas = juntas.sumadas.map(
    (id) => productos.get(id)?.nombre ?? elaboraciones.get(id)?.nombre ?? id,
  );

  // ── Qué cambió ─────────────────────────────────────────────────────────────
  const ahora = comoSeGuarda(
    nombre,
    rinde,
    { lineas: juntas.lineas, pasos: datos.pasos, notas: datos.notas, minutos: datos.minutos },
    { productos, elaboraciones },
  );
  const ultima =
    receta === undefined
      ? []
      : await contexto.sql<{ contenido: RecetaGuardada }[]>`
          select contenido from estook.receta_guardada
           where receta_id = ${receta.id}::uuid
           order by version desc
           limit 1
        `;
  const cambios = queCambioEnLaReceta(ultima[0]?.contenido ?? null, ahora);
  if (receta !== undefined && cambios.length === 0 && opciones.recupera === undefined) {
    return { version: receta.version, cambios: [], sumadas };
  }

  // ── Se guarda ──────────────────────────────────────────────────────────────
  let recetaId: string;
  let version: number;
  if (receta === undefined) {
    const filas = await contexto.sql<{ id: string; version: number }[]>`
      insert into estook.receta (local_id, plato_id, elaboracion_id, pasos, notas, tiempo_minutos,
                                 actualizado_por)
      values (${localId}::uuid, ${platoId}::uuid, ${elaboracionId}::uuid, ${comoLista(datos.pasos)}::text::text[],
              ${datos.notas}, ${datos.minutos}, ${contexto.personaId}::uuid)
      returning id, version
    `;
    const fila = filas[0];
    if (fila === undefined) throw new FalloDeAplicacion('sin_permiso');
    recetaId = fila.id;
    version = fila.version;
  } else {
    const filas = await contexto.sql<{ version: number }[]>`
      update estook.receta
         set pasos = ${comoLista(datos.pasos)}::text::text[], notas = ${datos.notas},
             tiempo_minutos = ${datos.minutos}, actualizado_por = ${contexto.personaId}::uuid,
             actualizado_en = now()
       where id = ${receta.id}::uuid
      returning version
    `;
    recetaId = receta.id;
    version = filas[0]?.version ?? receta.version + 1;
  }

  await contexto.sql`delete from estook.linea_de_receta where receta_id = ${recetaId}::uuid`;
  for (const [orden, linea] of juntas.lineas.entries()) {
    await contexto.sql`
      insert into estook.linea_de_receta
        (receta_id, orden, producto_id, elaboracion_id, cantidad, unidad, nota)
      values (${recetaId}::uuid, ${orden}, ${linea.productoId}::uuid, ${linea.elaboracionId}::uuid,
              ${linea.cantidad}, ${linea.unidad}::estook.unidad_de_uso, ${linea.nota})
    `;
  }

  if ('elaboracionId' in dueno && rinde !== null) {
    if (datos.nombre !== undefined) {
      const otra = await contexto.sql<{ id: string }[]>`
        select id from estook.elaboracion
         where local_id = ${localId}::uuid and id <> ${dueno.elaboracionId}::uuid
           and estook.sin_acentos(nombre) = estook.sin_acentos(${datos.nombre})
      `;
      if (otra[0] !== undefined) {
        throw new FalloDeAplicacion('faltan_datos', {
          campos: ['nombre'],
          porque: 'Ya hay una elaboración que se llama así.',
        });
      }
    }
    await contexto.sql`
      update estook.elaboracion
         set nombre = ${nombre}, rinde_cantidad = ${rinde.cantidad},
             rinde_unidad = ${rinde.unidad}::estook.unidad_de_uso, actualizado_en = now()
       where id = ${dueno.elaboracionId}::uuid
    `;
  }

  const conLaRecuperada =
    opciones.recupera === undefined
      ? cambios
      : [`Recuperó la del ${opciones.recupera.cuando}`, ...cambios];
  await contexto.sql`
    insert into estook.receta_guardada
      (receta_id, local_id, version, contenido, cambios, recupera, persona_id, guardada_en)
    values (${recetaId}::uuid, ${localId}::uuid, ${version}, ${JSON.stringify(ahora)}::text::jsonb,
            ${comoLista(conLaRecuperada)}::text::text[], ${opciones.recupera?.version ?? null},
            ${contexto.personaId}::uuid, ${contexto.ahora.toISOString()}::timestamptz)
  `;
  return { version, cambios: conLaRecuperada, sumadas };
}

function lineasDeLaEntrada(entrada: readonly z.infer<typeof unaLinea>[]): LineaQueSeEscribe[] {
  return entrada.map((l) => ({
    productoId: l.producto_id ?? null,
    elaboracionId: l.elaboracion_id ?? null,
    cantidad: l.cantidad,
    unidad: l.unidad,
    nota: l.nota === undefined || l.nota === '' ? null : l.nota,
  }));
}

// ═══ Guardar una ficha ════════════════════════════════════════════════════════

export const entradaGuardarFicha = z
  .object({
    plato_id: z.string().uuid().optional(),
    elaboracion_id: z.string().uuid().optional(),
    /** La de la receta que se tenía delante; 0 si todavía no tenía. */
    version: z.number().int().min(0),
    lineas,
    pasos,
    notas,
    tiempo_minutos: minutos,
    /** Solo de una elaboración: su nombre y lo que rinde. */
    nombre: z.string().trim().min(1).max(120).optional(),
    rinde_cantidad: z.number().positive().max(100_000).optional(),
    rinde_unidad: unidad.optional(),
  })
  .strict()
  .refine((e) => (e.plato_id === undefined) !== (e.elaboracion_id === undefined), {
    message: 'La ficha es de un plato o de una elaboración.',
  });

export type EntradaGuardarFicha = z.infer<typeof entradaGuardarFicha>;

export const guardarFicha = comando<EntradaGuardarFicha, Guardada>({
  nombre: 'guardar_ficha',
  entrada: entradaGuardarFicha,
  exige: 'app.escandallos',

  async ejecutar(contexto, entrada) {
    const localId = elLocalDeEscandallos(contexto);
    const dueno: Dueno =
      entrada.plato_id !== undefined
        ? { platoId: entrada.plato_id }
        : { elaboracionId: entrada.elaboracion_id ?? '' };
    const rinde =
      entrada.rinde_cantidad !== undefined && entrada.rinde_unidad !== undefined
        ? { cantidad: entrada.rinde_cantidad, unidad: entrada.rinde_unidad }
        : undefined;
    return guardarLaReceta(
      contexto,
      localId,
      dueno,
      {
        lineas: lineasDeLaEntrada(entrada.lineas),
        pasos: entrada.pasos,
        notas: entrada.notas === undefined || entrada.notas === '' ? null : entrada.notas,
        minutos: entrada.tiempo_minutos ?? null,
        ...(entrada.nombre === undefined ? {} : { nombre: entrada.nombre }),
        ...(rinde === undefined ? {} : { rinde }),
      },
      { version: entrada.version },
    );
  },
});

// ═══ Recuperar la de antes ═══════════════════════════════════════════════════

const CUANDO = (zona: string) =>
  new Intl.DateTimeFormat('es-ES', { timeZone: zona, day: 'numeric', month: 'short' });

export const recuperarReceta = comando<{ guardada_id: string }, Guardada>({
  nombre: 'recuperar_receta',
  entrada: z.object({ guardada_id: z.string().uuid() }).strict(),
  exige: 'app.escandallos',

  async ejecutar(contexto, entrada) {
    const localId = elLocalDeEscandallos(contexto);
    const filas = await contexto.sql<
      {
        version: number;
        contenido: RecetaGuardada;
        guardada_en: Date;
        plato_id: string | null;
        elaboracion_id: string | null;
        zona_horaria: string;
      }[]
    >`
      select g.version, g.contenido, g.guardada_en, r.plato_id, r.elaboracion_id, l.zona_horaria
        from estook.receta_guardada g
        join estook.receta r on r.id = g.receta_id
        join estook.local l on l.id = g.local_id
       where g.id = ${entrada.guardada_id}::uuid and g.local_id = ${localId}::uuid
    `;
    const guardada = filas[0];
    if (guardada === undefined) {
      throw new FalloDeAplicacion('no_existe', { porque: 'Esa receta no está en este local.' });
    }
    const c = guardada.contenido;
    const dueno: Dueno =
      guardada.plato_id !== null
        ? { platoId: guardada.plato_id }
        : { elaboracionId: guardada.elaboracion_id ?? '' };
    return guardarLaReceta(
      contexto,
      localId,
      dueno,
      {
        lineas: c.lineas.map((l) => ({
          productoId: l.tipo === 'producto' ? l.id : null,
          elaboracionId: l.tipo === 'elaboracion' ? l.id : null,
          cantidad: l.cantidad,
          unidad: l.unidad,
          nota: l.nota,
        })),
        pasos: c.pasos,
        notas: c.notas,
        minutos: c.minutos,
        ...('elaboracionId' in dueno && c.rinde !== null
          ? { nombre: c.nombre, rinde: c.rinde }
          : {}),
      },
      {
        version: null,
        recupera: {
          version: guardada.version,
          cuando: CUANDO(guardada.zona_horaria).format(new Date(guardada.guardada_en)),
        },
      },
    );
  },
});

// ═══ Las elaboraciones ════════════════════════════════════════════════════════

export const entradaCrearElaboracion = z
  .object({
    nombre: z.string().trim().min(1).max(120),
    rinde_cantidad: z.number().positive().max(100_000),
    rinde_unidad: unidad,
  })
  .strict();

export const crearElaboracion = comando<
  z.infer<typeof entradaCrearElaboracion>,
  { elaboracionId: string; yaExistia: boolean }
>({
  nombre: 'crear_elaboracion',
  entrada: entradaCrearElaboracion,
  exige: 'app.escandallos',

  async ejecutar(contexto, entrada) {
    const localId = elLocalDeEscandallos(contexto);
    const ya = await contexto.sql<{ id: string; activo: boolean }[]>`
      select id, activo from estook.elaboracion
       where local_id = ${localId}::uuid
         and estook.sin_acentos(nombre) = estook.sin_acentos(${entrada.nombre})
    `;
    const existente = ya[0];
    if (existente !== undefined) {
      // La que estaba archivada vuelve, con su receta: es lo que se quiere al volver a
      // crearla (como un plato, 0086).
      if (!existente.activo) {
        await contexto.sql`
          update estook.elaboracion set activo = true, actualizado_en = now()
           where id = ${existente.id}::uuid
        `;
      }
      return { elaboracionId: existente.id, yaExistia: true };
    }
    const filas = await contexto.sql<{ id: string }[]>`
      insert into estook.elaboracion (local_id, nombre, rinde_cantidad, rinde_unidad, creado_por)
      values (${localId}::uuid, ${entrada.nombre}, ${entrada.rinde_cantidad},
              ${entrada.rinde_unidad}::estook.unidad_de_uso, ${contexto.personaId}::uuid)
      returning id
    `;
    const elaboracionId = filas[0]?.id;
    if (elaboracionId === undefined) throw new FalloDeAplicacion('sin_permiso');
    return { elaboracionId, yaExistia: false };
  },
});

function archivarORecuperar(nombre: 'archivar_elaboracion' | 'recuperar_elaboracion') {
  const activo = nombre === 'recuperar_elaboracion';
  return comando<{ elaboracion_id: string }, { elaboracionId: string; activo: boolean }>({
    nombre,
    entrada: z.object({ elaboracion_id: z.string().uuid() }).strict(),
    exige: 'app.escandallos',

    async ejecutar(contexto, entrada) {
      const localId = elLocalDeEscandallos(contexto);
      // Archivar no rompe nada: lo que ya la lleva sigue costando igual. Solo deja de
      // salir en la lista y para añadir (principio 6: nada se borra).
      const filas = await contexto.sql<{ id: string }[]>`
        update estook.elaboracion set activo = ${activo}, actualizado_en = now()
         where id = ${entrada.elaboracion_id}::uuid and local_id = ${localId}::uuid
        returning id
      `;
      if (filas[0] === undefined) {
        throw new FalloDeAplicacion('no_existe', {
          porque: 'Esa elaboración no está en este local, o tu acceso no deja cambiarla.',
        });
      }
      return { elaboracionId: entrada.elaboracion_id, activo };
    },
  });
}

export const archivarElaboracion = archivarORecuperar('archivar_elaboracion');
export const recuperarElaboracion = archivarORecuperar('recuperar_elaboracion');

// ═══ Vincular un plato a un producto del Almacén ═══════════════════════════════

/**
 * El chuletón, la lata de refresco, la botella de vino: **lo que se vende por unidades
 * tal como se guarda** (Richi, 16-oct). Vincularlo es su ficha entera —un producto,
 * una unidad— y así Estook sabe qué es lo vendido. Lo que se corta o se cocina (el
 * lomo entero que llega en 20 kg) no se vincula: se desgrana con su gramaje.
 */
export async function vincularUnPlato(
  contexto: Contexto,
  localId: string,
  platoId: string,
  productoId: string | null,
): Promise<{ readonly vinculadoA: string | null }> {
  const { productos, recetaDelPlato } = await elLibroDelLocal(contexto, localId, false);
  const receta = recetaDelPlato.get(platoId);
  const antes = elVinculado(receta);
  if (receta !== undefined && receta.lineas.length > 0 && antes === null) {
    throw new FalloDeAplicacion('faltan_datos', {
      porque: 'Este plato ya tiene su ficha con varios ingredientes: cámbiala en Escandallos.',
    });
  }
  let nombre: string | null = null;
  if (productoId !== null) {
    const producto = productos.get(productoId);
    if (producto === undefined || !producto.activo) {
      throw new FalloDeAplicacion('no_existe', {
        porque: 'Ese producto no está en el Almacén de este local.',
      });
    }
    if (producto.unidad !== 'ud') {
      throw new FalloDeAplicacion('faltan_datos', {
        porque: `«${producto.nombre}» se lleva en ${producto.unidad}: lo que se corta o se cocina se desgrana en Escandallos con sus gramos.`,
      });
    }
    nombre = producto.nombre;
  }
  if (antes === productoId) return { vinculadoA: productoId };

  await guardarLaReceta(
    contexto,
    localId,
    { platoId },
    {
      lineas:
        productoId === null
          ? []
          : [{ productoId, elaboracionId: null, cantidad: 1, unidad: 'ud', nota: null }],
      pasos: receta?.pasos ?? [],
      notas: receta?.notas ?? null,
      minutos: receta?.minutos ?? null,
    },
    { version: null },
  );
  await anotarEnElPlato(
    contexto,
    platoId,
    localId,
    { vinculo: antes === null ? null : (productos.get(antes)?.nombre ?? null) },
    { vinculo: nombre },
  );
  return { vinculadoA: productoId };
}

export const vincularPlato = comando<
  { plato_id: string; producto_id: string | null },
  { platoId: string; vinculadoA: string | null }
>({
  nombre: 'vincular_plato',
  entrada: z
    .object({ plato_id: z.string().uuid(), producto_id: z.string().uuid().nullable() })
    .strict(),
  exige: 'app.escandallos',

  async ejecutar(contexto, entrada) {
    const localId = elLocalDeEscandallos(contexto);
    const hecho = await vincularUnPlato(contexto, localId, entrada.plato_id, entrada.producto_id);
    return { platoId: entrada.plato_id, ...hecho };
  },
});
