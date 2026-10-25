import { z } from 'zod';
import {
  CAMINOS_DE_LA_BOTONERA,
  COLORES_DE_LA_BOTONERA,
  PASES_DE_LA_BOTONERA,
  QUIEN_LO_PREPARA,
  loQueProponeElNombre,
} from '@estook/dominio';
import { laOrganizacionDeLaSesion } from '../alta.ts';
import { comando, FalloDeAplicacion, type Contexto } from '../contrato.ts';
import { comoLista } from '../listas.ts';
import { elLocalDelServicio } from '../sala.ts';
import { puedeEditarLaCarta } from '../consultas/mi-carta.ts';
import { noEnUnMovilPersonal } from './aparatos.ts';

/**
 * **La botonera de Estook TPV** (T3, decisión 0111; Anexo 11.11): qué se vende en el TPV, en
 * qué página y de qué color, quién lo prepara y en qué pase sale. Se monta en Ajustes del
 * TPV › Productos, en la caja o en la tablet, con el permiso de los Ajustes del TPV (Roles
 * 1.12). **La botonera no copia la carta**: cada botón apunta a su plato.
 *
 *   montar_la_botonera        los tres caminos: toda la carta, elegir o de cero
 *   traer_de_la_carta         lo que falta de la carta, o los «Nuevos en la carta» elegidos
 *   lo_nuevo_entra_solo       si lo que se añade a la carta entra solo en su página
 *   crear_pagina_del_tpv · cambiar_pagina_del_tpv · ordenar_las_paginas_del_tpv ·
 *   quitar_pagina_del_tpv     las páginas, con sus dos preguntas y su color
 *   poner_botones · cambiar_boton_del_tpv · ordenar_los_botones · quitar_boton_del_tpv
 *                             los botones: «+ De la carta», su color, lo suyo, fijarlo
 *   nuevo_producto_del_tpv    «Empezar de cero»: el plato nace en la carta, sin escandallo
 */

const id = z.string().uuid();
const nombreDePagina = z.string().trim().min(1).max(30);
const color = z.enum(COLORES_DE_LA_BOTONERA).nullable();
const quien = z.enum(QUIEN_LO_PREPARA);
const pase = z.enum(PASES_DE_LA_BOTONERA);

/** Las puertas de todo lo de aquí: en la caja o en la tablet, con los Ajustes del TPV. */
const DEL_TPV = {
  exige: 'accion.ajustes_del_tpv',
  enElTpv: 'solo',
  enLosAparatos: ['caja', 'comandero'],
} as const;

function elLocalDeLaBotonera(contexto: Contexto): string {
  noEnUnMovilPersonal(contexto);
  return elLocalDelServicio(contexto);
}

async function anotar(
  contexto: Contexto,
  accion: string,
  entidad: 'pagina_del_tpv' | 'boton_del_tpv' | 'local' | 'plato',
  entidadId: string,
  localId: string,
  despues: unknown,
): Promise<void> {
  await contexto.sql`
    select estook.anotar(
      ${laOrganizacionDeLaSesion(contexto)}::uuid, ${accion}, ${entidad}, ${entidadId},
      ${localId}::uuid, null, ${JSON.stringify(despues)}::text::jsonb, null
    )
  `;
}

async function laPagina(
  contexto: Contexto,
  localId: string,
  paginaId: string,
): Promise<{ id: string; nombre: string; seccion_id: string | null; quien_lo_prepara: string }> {
  const filas = await contexto.sql<
    { id: string; nombre: string; seccion_id: string | null; quien_lo_prepara: string }[]
  >`
    select id::text as id, nombre, seccion_id::text as seccion_id, quien_lo_prepara
      from estook.pagina_del_tpv
     where id = ${paginaId}::uuid and local_id = ${localId}::uuid
  `;
  if (filas[0] === undefined) {
    throw new FalloDeAplicacion('no_existe', { porque: 'Esa página no está en este TPV.' });
  }
  return filas[0];
}

async function elBoton(contexto: Contexto, localId: string, botonId: string): Promise<string> {
  const filas = await contexto.sql<{ pagina_id: string }[]>`
    select pagina_id::text as pagina_id from estook.boton_del_tpv
     where id = ${botonId}::uuid and local_id = ${localId}::uuid
  `;
  if (filas[0] === undefined) {
    throw new FalloDeAplicacion('no_existe', { porque: 'Ese botón no está en este TPV.' });
  }
  return filas[0].pagina_id;
}

/**
 * La página de una sección de la carta, creada si no está, con lo que propone su nombre.
 * Si ya hay una página que se llama como la sección y no viene de ninguna, es esa.
 */
async function laPaginaDeLaSeccion(
  contexto: Contexto,
  localId: string,
  seccion: { readonly id: string; readonly nombre: string },
): Promise<string> {
  const ya = await contexto.sql<{ id: string }[]>`
    select id::text as id from estook.pagina_del_tpv
     where local_id = ${localId}::uuid and seccion_id = ${seccion.id}::uuid
  `;
  if (ya[0] !== undefined) return ya[0].id;
  const conSuNombre = await contexto.sql<{ id: string }[]>`
    update estook.pagina_del_tpv set seccion_id = ${seccion.id}::uuid
     where id = (
       select id from estook.pagina_del_tpv
        where local_id = ${localId}::uuid and seccion_id is null
          and estook.sin_acentos(nombre) = estook.sin_acentos(${seccion.nombre})
        order by orden limit 1
     )
    returning id::text as id
  `;
  if (conSuNombre[0] !== undefined) return conSuNombre[0].id;
  const propone = loQueProponeElNombre(seccion.nombre);
  const filas = await contexto.sql<{ id: string }[]>`
    insert into estook.pagina_del_tpv (local_id, nombre, orden, quien_lo_prepara, pase, seccion_id)
    values (
      ${localId}::uuid, ${seccion.nombre.slice(0, 30)},
      coalesce((select max(orden) + 1 from estook.pagina_del_tpv where local_id = ${localId}::uuid), 0),
      ${propone.quienLoPrepara}, ${propone.pase}, ${seccion.id}::uuid
    )
    returning id::text as id
  `;
  const paginaId = filas[0]?.id;
  if (paginaId === undefined) throw new FalloDeAplicacion('sin_permiso');
  return paginaId;
}

/** Pone los platos en una página, detrás de los que ya tiene; los que ya estaban, no. */
async function ponerEnLaPagina(
  contexto: Contexto,
  localId: string,
  paginaId: string,
  platoIds: readonly string[],
): Promise<number> {
  let puestos = 0;
  for (const platoId of platoIds) {
    const filas = await contexto.sql<{ id: string }[]>`
      insert into estook.boton_del_tpv (local_id, pagina_id, plato_id, orden)
      select ${localId}::uuid, ${paginaId}::uuid, p.id,
             coalesce((select max(orden) + 1 from estook.boton_del_tpv
                        where pagina_id = ${paginaId}::uuid), 0)
        from estook.plato p
       where p.id = ${platoId}::uuid and p.local_id = ${localId}::uuid and p.activo
      on conflict (pagina_id, plato_id) do nothing
      returning id::text as id
    `;
    puestos += filas.length;
  }
  return puestos;
}

/**
 * **Trae de la carta** los platos que todavía no tienen botón (todos, o los elegidos), cada uno
 * a la página de su sección, que se crea si no está. Lo que no tiene sección no se trae
 * solo: se coloca a mano con «+ De la carta».
 */
async function traerDeLaCarta(
  contexto: Contexto,
  localId: string,
  soloEstos: readonly string[] | null,
): Promise<{ paginas: number; botones: number }> {
  const faltan = await contexto.sql<{ plato_id: string; seccion_id: string; seccion: string }[]>`
    select p.id::text as plato_id, s.id::text as seccion_id, s.nombre as seccion
      from estook.plato p
      join estook.seccion_de_carta s on s.id = p.seccion_id
     where p.local_id = ${localId}::uuid and p.activo and p.en_la_carta
       and (${soloEstos === null}::boolean
            or p.id = any (${comoLista(soloEstos ?? [])}::text::uuid[]))
       and not exists (select 1 from estook.boton_del_tpv b where b.plato_id = p.id)
     order by s.orden, s.nombre, p.orden, p.nombre
  `;
  const antes = await contexto.sql<{ n: number }[]>`
    select count(*)::int as n from estook.pagina_del_tpv where local_id = ${localId}::uuid
  `;
  let botones = 0;
  for (const f of faltan) {
    const paginaId = await laPaginaDeLaSeccion(contexto, localId, {
      id: f.seccion_id,
      nombre: f.seccion,
    });
    botones += await ponerEnLaPagina(contexto, localId, paginaId, [f.plato_id]);
  }
  const despues = await contexto.sql<{ n: number }[]>`
    select count(*)::int as n from estook.pagina_del_tpv where local_id = ${localId}::uuid
  `;
  return { paginas: (despues[0]?.n ?? 0) - (antes[0]?.n ?? 0), botones };
}

// ═══ Los tres caminos ═════════════════════════════════════════════════════════

const entradaMontarLaBotonera = z
  .object({
    camino: z.enum(CAMINOS_DE_LA_BOTONERA),
    // «Elegir lo que se vende aquí»: lo marcado en la carta.
    plato_ids: z.array(id).max(2000).optional(),
  })
  .strict();

export const montarLaBotonera = comando<
  z.infer<typeof entradaMontarLaBotonera>,
  { paginas: number; botones: number }
>({
  nombre: 'montar_la_botonera',
  entrada: entradaMontarLaBotonera,
  ...DEL_TPV,

  async ejecutar(contexto, entrada) {
    const localId = elLocalDeLaBotonera(contexto);
    // Con toda la carta, lo nuevo entra solo; eligiendo o de cero, se pregunta.
    const entraSolo = entrada.camino === 'toda_la_carta';
    await contexto.sql`
      update estook.local
         set botonera_camino = ${entrada.camino}, botonera_entra_solo = ${entraSolo}
       where id = ${localId}::uuid
    `;
    const traido =
      entrada.camino === 'toda_la_carta'
        ? await traerDeLaCarta(contexto, localId, null)
        : entrada.camino === 'elegir'
          ? await traerDeLaCarta(contexto, localId, entrada.plato_ids ?? [])
          : { paginas: 0, botones: 0 };
    await anotar(contexto, 'montar_la_botonera', 'local', localId, localId, {
      camino: entrada.camino,
      ...traido,
    });
    return traido;
  },
});

const entradaTraerDeLaCartaAlTpv = z
  .object({ plato_ids: z.array(id).min(1).max(2000).optional() })
  .strict();

export const traerDeLaCartaAlTpv = comando<
  z.infer<typeof entradaTraerDeLaCartaAlTpv>,
  { paginas: number; botones: number }
>({
  nombre: 'traer_de_la_carta',
  entrada: entradaTraerDeLaCartaAlTpv,
  ...DEL_TPV,

  async ejecutar(contexto, entrada) {
    const localId = elLocalDeLaBotonera(contexto);
    const traido = await traerDeLaCarta(contexto, localId, entrada.plato_ids ?? null);
    return traido;
  },
});

export const loNuevoEntraSolo = comando<{ si: boolean }, { entraSolo: boolean }>({
  nombre: 'lo_nuevo_entra_solo',
  entrada: z.object({ si: z.boolean() }).strict(),
  ...DEL_TPV,

  async ejecutar(contexto, entrada) {
    const localId = elLocalDeLaBotonera(contexto);
    await contexto.sql`
      update estook.local
         set botonera_entra_solo = ${entrada.si},
             botonera_camino = coalesce(botonera_camino, 'elegir')
       where id = ${localId}::uuid
    `;
    await anotar(contexto, 'lo_nuevo_entra_solo', 'local', localId, localId, {
      entraSolo: entrada.si,
    });
    return { entraSolo: entrada.si };
  },
});

// ═══ Las páginas ══════════════════════════════════════════════════════════════

const entradaCrearPaginaDelTpv = z
  .object({
    nombre: nombreDePagina,
    quien_lo_prepara: quien.optional(),
    pase: pase.optional(),
    color: color.optional(),
  })
  .strict();

export const crearPaginaDelTpv = comando<
  z.infer<typeof entradaCrearPaginaDelTpv>,
  { paginaId: string }
>({
  nombre: 'crear_pagina_del_tpv',
  entrada: entradaCrearPaginaDelTpv,
  ...DEL_TPV,

  async ejecutar(contexto, entrada) {
    const localId = elLocalDeLaBotonera(contexto);
    // Las dos preguntas vienen propuestas por el nombre, y se cambian con un toque.
    const propone = loQueProponeElNombre(entrada.nombre);
    const filas = await contexto.sql<{ id: string }[]>`
      insert into estook.pagina_del_tpv (local_id, nombre, orden, color, quien_lo_prepara, pase)
      values (
        ${localId}::uuid, ${entrada.nombre},
        coalesce((select max(orden) + 1 from estook.pagina_del_tpv where local_id = ${localId}::uuid), 0),
        ${entrada.color ?? null}, ${entrada.quien_lo_prepara ?? propone.quienLoPrepara},
        ${entrada.pase ?? propone.pase}
      )
      returning id::text as id
    `;
    const paginaId = filas[0]?.id;
    if (paginaId === undefined) throw new FalloDeAplicacion('sin_permiso');
    // Una página hecha a mano pide que la botonera esté montada: si no, «de cero».
    await contexto.sql`
      update estook.local set botonera_camino = coalesce(botonera_camino, 'de_cero')
       where id = ${localId}::uuid
    `;
    await anotar(contexto, 'crear', 'pagina_del_tpv', paginaId, localId, {
      nombre: entrada.nombre,
    });
    return { paginaId };
  },
});

const entradaCambiarPaginaDelTpv = z
  .object({
    pagina_id: id,
    nombre: nombreDePagina.optional(),
    color: color.optional(),
    quien_lo_prepara: quien.optional(),
    pase: pase.optional(),
  })
  .strict();

export const cambiarPaginaDelTpv = comando<
  z.infer<typeof entradaCambiarPaginaDelTpv>,
  { paginaId: string }
>({
  nombre: 'cambiar_pagina_del_tpv',
  entrada: entradaCambiarPaginaDelTpv,
  ...DEL_TPV,

  async ejecutar(contexto, entrada) {
    const localId = elLocalDeLaBotonera(contexto);
    await laPagina(contexto, localId, entrada.pagina_id);
    await contexto.sql`
      update estook.pagina_del_tpv
         set nombre = coalesce(${entrada.nombre ?? null}, nombre),
             color = case when ${entrada.color !== undefined} then ${entrada.color ?? null} else color end,
             quien_lo_prepara = coalesce(${entrada.quien_lo_prepara ?? null}, quien_lo_prepara),
             pase = coalesce(${entrada.pase ?? null}, pase)
       where id = ${entrada.pagina_id}::uuid
    `;
    await anotar(contexto, 'cambiar', 'pagina_del_tpv', entrada.pagina_id, localId, entrada);
    return { paginaId: entrada.pagina_id };
  },
});

export const ordenarLasPaginasDelTpv = comando<{ paginas: string[] }, { ordenadas: number }>({
  nombre: 'ordenar_las_paginas_del_tpv',
  entrada: z.object({ paginas: z.array(id).min(1).max(100) }).strict(),
  ...DEL_TPV,

  async ejecutar(contexto, entrada) {
    const localId = elLocalDeLaBotonera(contexto);
    let ordenadas = 0;
    for (const [orden, paginaId] of entrada.paginas.entries()) {
      const filas = await contexto.sql<{ id: string }[]>`
        update estook.pagina_del_tpv set orden = ${orden}
         where id = ${paginaId}::uuid and local_id = ${localId}::uuid
        returning id
      `;
      ordenadas += filas.length;
    }
    return { ordenadas };
  },
});

export const quitarPaginaDelTpv = comando<{ pagina_id: string }, { quitados: number }>({
  nombre: 'quitar_pagina_del_tpv',
  entrada: z.object({ pagina_id: id }).strict(),
  ...DEL_TPV,

  async ejecutar(contexto, entrada) {
    const localId = elLocalDeLaBotonera(contexto);
    const pagina = await laPagina(contexto, localId, entrada.pagina_id);
    // Sus botones se van con ella; los platos siguen en la carta.
    const botones = await contexto.sql<{ n: number }[]>`
      select count(*)::int as n from estook.boton_del_tpv where pagina_id = ${pagina.id}::uuid
    `;
    await contexto.sql`delete from estook.pagina_del_tpv where id = ${pagina.id}::uuid`;
    await anotar(contexto, 'quitar', 'pagina_del_tpv', pagina.id, localId, {
      nombre: pagina.nombre,
    });
    return { quitados: botones[0]?.n ?? 0 };
  },
});

// ═══ Los botones ══════════════════════════════════════════════════════════════

export const ponerBotones = comando<
  { pagina_id: string; plato_ids: string[] },
  { puestos: number }
>({
  nombre: 'poner_botones',
  entrada: z.object({ pagina_id: id, plato_ids: z.array(id).min(1).max(500) }).strict(),
  ...DEL_TPV,

  async ejecutar(contexto, entrada) {
    const localId = elLocalDeLaBotonera(contexto);
    await laPagina(contexto, localId, entrada.pagina_id);
    const puestos = await ponerEnLaPagina(contexto, localId, entrada.pagina_id, entrada.plato_ids);
    return { puestos };
  },
});

const entradaCambiarBotonDelTpv = z
  .object({
    boton_id: id,
    color: color.optional(),
    // Nulo: vuelve a valer lo de su página.
    quien_lo_prepara: quien.nullable().optional(),
    pase: pase.nullable().optional(),
    fijado: z.boolean().optional(),
    // Moverlo a otra página.
    pagina_id: id.optional(),
  })
  .strict();

export const cambiarBotonDelTpv = comando<
  z.infer<typeof entradaCambiarBotonDelTpv>,
  { botonId: string }
>({
  nombre: 'cambiar_boton_del_tpv',
  entrada: entradaCambiarBotonDelTpv,
  ...DEL_TPV,

  async ejecutar(contexto, entrada) {
    const localId = elLocalDeLaBotonera(contexto);
    await elBoton(contexto, localId, entrada.boton_id);
    if (entrada.pagina_id !== undefined) await laPagina(contexto, localId, entrada.pagina_id);
    try {
      await contexto.sql`
        update estook.boton_del_tpv
           set color = case when ${entrada.color !== undefined} then ${entrada.color ?? null} else color end,
               quien_lo_prepara = case when ${entrada.quien_lo_prepara !== undefined}
                                       then ${entrada.quien_lo_prepara ?? null} else quien_lo_prepara end,
               pase = case when ${entrada.pase !== undefined} then ${entrada.pase ?? null} else pase end,
               fijado = coalesce(${entrada.fijado ?? null}::boolean, fijado),
               pagina_id = coalesce(${entrada.pagina_id ?? null}::uuid, pagina_id),
               orden = case when ${entrada.pagina_id !== undefined}
                            then coalesce((select max(orden) + 1 from estook.boton_del_tpv
                                            where pagina_id = ${entrada.pagina_id ?? null}::uuid), 0)
                            else orden end
         where id = ${entrada.boton_id}::uuid
      `;
    } catch (error) {
      if ((error as { code?: string }).code === '23505') {
        throw new FalloDeAplicacion('faltan_datos', {
          porque: 'Ese plato ya tiene su botón en esa página.',
        });
      }
      throw error;
    }
    await anotar(contexto, 'cambiar', 'boton_del_tpv', entrada.boton_id, localId, entrada);
    return { botonId: entrada.boton_id };
  },
});

export const ordenarLosBotones = comando<
  { pagina_id: string; botones: string[] },
  { ordenados: number }
>({
  nombre: 'ordenar_los_botones',
  entrada: z.object({ pagina_id: id, botones: z.array(id).min(1).max(500) }).strict(),
  ...DEL_TPV,

  async ejecutar(contexto, entrada) {
    const localId = elLocalDeLaBotonera(contexto);
    await laPagina(contexto, localId, entrada.pagina_id);
    let ordenados = 0;
    for (const [orden, botonId] of entrada.botones.entries()) {
      const filas = await contexto.sql<{ id: string }[]>`
        update estook.boton_del_tpv set orden = ${orden}
         where id = ${botonId}::uuid and pagina_id = ${entrada.pagina_id}::uuid
        returning id
      `;
      ordenados += filas.length;
    }
    return { ordenados };
  },
});

export const quitarBotonDelTpv = comando<{ boton_id: string }, { quitado: boolean }>({
  nombre: 'quitar_boton_del_tpv',
  entrada: z.object({ boton_id: id }).strict(),
  ...DEL_TPV,

  async ejecutar(contexto, entrada) {
    const localId = elLocalDeLaBotonera(contexto);
    await elBoton(contexto, localId, entrada.boton_id);
    // El plato sigue en la carta: solo deja de venderse en el TPV.
    await contexto.sql`delete from estook.boton_del_tpv where id = ${entrada.boton_id}::uuid`;
    await anotar(contexto, 'quitar', 'boton_del_tpv', entrada.boton_id, localId, {});
    return { quitado: true };
  },
});

// ═══ «Empezar de cero»: un producto nuevo ═════════════════════════════════════

const entradaNuevoProductoDelTpv = z
  .object({
    nombre: z.string().trim().min(1).max(120),
    precio_centimos: z.number().int().min(0).max(100_000_000),
    pagina_id: id,
    quien_lo_prepara: quien.optional(),
  })
  .strict();

export const nuevoProductoDelTpv = comando<
  z.infer<typeof entradaNuevoProductoDelTpv>,
  { platoId: string; botonId: string }
>({
  nombre: 'nuevo_producto_del_tpv',
  entrada: entradaNuevoProductoDelTpv,
  ...DEL_TPV,

  async ejecutar(contexto, entrada) {
    const localId = elLocalDeLaBotonera(contexto);
    // El producto nace en la carta de Estook: hace falta poder cambiar la carta.
    if (!(await puedeEditarLaCarta(contexto, localId))) {
      throw new FalloDeAplicacion('sin_permiso', {
        porque:
          'Un producto nuevo se pone también en la carta de Estook: lo crea quien puede cambiar la carta.',
      });
    }
    const pagina = await laPagina(contexto, localId, entrada.pagina_id);
    const ya = await contexto.sql<{ id: string }[]>`
      select id from estook.plato
       where local_id = ${localId}::uuid
         and estook.sin_acentos(nombre) = estook.sin_acentos(${entrada.nombre})
    `;
    if (ya[0] !== undefined) {
      throw new FalloDeAplicacion('faltan_datos', {
        campos: ['nombre'],
        porque: 'Ya hay un plato que se llama así en tu carta: ponlo con «+ De la carta».',
      });
    }

    // **En la sección del mismo nombre que la página**, que se crea si no está (11.11).
    let seccionId = pagina.seccion_id;
    if (seccionId === null) {
      const seccion = await contexto.sql<{ id: string }[]>`
        select id::text as id from estook.seccion_de_carta
         where local_id = ${localId}::uuid
           and estook.sin_acentos(nombre) = estook.sin_acentos(${pagina.nombre})
      `;
      seccionId =
        seccion[0]?.id ??
        (
          await contexto.sql<{ id: string }[]>`
            insert into estook.seccion_de_carta (local_id, nombre, orden)
            values (
              ${localId}::uuid, ${pagina.nombre},
              coalesce((select max(orden) + 1 from estook.seccion_de_carta
                         where local_id = ${localId}::uuid), 0)
            )
            returning id::text as id
          `
        )[0]?.id ??
        null;
      if (seccionId === null) throw new FalloDeAplicacion('sin_permiso');
      // La página queda unida a su sección, si ninguna otra lo está ya.
      await contexto.sql`
        update estook.pagina_del_tpv set seccion_id = ${seccionId}::uuid
         where id = ${pagina.id}::uuid
           and not exists (
             select 1 from estook.pagina_del_tpv o
              where o.local_id = ${localId}::uuid and o.seccion_id = ${seccionId}::uuid
           )
      `;
    }

    // **Sin escandallo** (0095): se completa en Estook cuando se quiera; el almacén lo
    // sabe y lo dice.
    const filas = await contexto.sql<{ id: string }[]>`
      insert into estook.plato (local_id, seccion_id, nombre, precio_centimos, orden, creado_por)
      values (
        ${localId}::uuid, ${seccionId}::uuid, ${entrada.nombre}, ${entrada.precio_centimos},
        coalesce((select max(orden) + 1 from estook.plato
                   where local_id = ${localId}::uuid and seccion_id = ${seccionId}::uuid), 0),
        ${contexto.personaId}::uuid
      )
      returning id::text as id
    `;
    const platoId = filas[0]?.id;
    if (platoId === undefined) throw new FalloDeAplicacion('sin_permiso');
    await ponerEnLaPagina(contexto, localId, pagina.id, [platoId]);
    const boton = await contexto.sql<{ id: string }[]>`
      update estook.boton_del_tpv
         set quien_lo_prepara = case
               when ${entrada.quien_lo_prepara ?? null}::text is null
                 or ${entrada.quien_lo_prepara ?? null}::text = ${pagina.quien_lo_prepara} then null
               else ${entrada.quien_lo_prepara ?? null}::text end
       where pagina_id = ${pagina.id}::uuid and plato_id = ${platoId}::uuid
      returning id::text as id
    `;
    const botonId = boton[0]?.id;
    if (botonId === undefined) throw new FalloDeAplicacion('sin_permiso');
    await contexto.sql`
      update estook.local set botonera_camino = coalesce(botonera_camino, 'de_cero')
       where id = ${localId}::uuid
    `;
    await anotar(contexto, 'crear_desde_el_tpv', 'plato', platoId, localId, {
      nombre: entrada.nombre,
      precio: entrada.precio_centimos,
    });
    return { platoId, botonId };
  },
});
