import { z } from 'zod';
import { horaDeCorte, jornadaDe } from '@estook/dominio';
import { publicar } from '../../eventos/bandeja.ts';
import { elLocalDeLaSesion, laOrganizacionDeLaSesion } from '../alta.ts';
import { comando, FalloDeAplicacion, type Contexto } from '../contrato.ts';

/**
 * Fichar (M6½, anticipando M15).
 *
 * ── Las dos preguntas, y ninguna más ────────────────────────────────────────
 *
 *   `fichar_entrada`  «empiezo»
 *   `fichar_salida`   «me voy»
 *
 * No hay «crear fichaje» ni «editar fichaje»: «la aplicación no pregunta *¿qué
 * tabla quieres modificar?*, pregunta *¿qué quieres hacer?*» (Evolución 1.0,
 * capítulo 14). Corregir el de otra persona sí existe, y es otro comando, con
 * otro permiso y con motivo obligatorio, porque es otra cosa.
 *
 * ── La ubicación: se pide siempre, y nunca bloquea ──────────────────────────
 *
 * Se pide **siempre**, y esa es la parte obligatoria: la pantalla la pregunta
 * antes de enseñar el botón. Lo que llega aquí es lo que el aparato haya dado.
 *
 * Y si no ha dado nada, **se ficha igual**. Un teléfono con el GPS apagado, un
 * sótano sin señal o un permiso denegado hace seis meses no pueden dejar a nadie
 * sin poder entrar a su turno: eso es lo que «nunca se bloquea a nadie por
 * cuadrar» significa cuando lo que está en juego es el registro horario de una
 * persona. Se apunta que no había ubicación **y por qué**, sale en la lista con
 * su palabra, y decide quien lleva el local.
 *
 * Rechazar el fichaje sería, además, contraproducente: lo que consigue es que la
 * gente fiche desde el ordenador de la oficina cuando el móvil no va, y entonces
 * el dato es peor que no tenerlo.
 */

/**
 * Lo que el navegador cuenta de dónde está.
 *
 * `precision` es en lo que el propio navegador se fía, en metros. Va porque sin
 * ella un «a 40 m del local» no significa nada: puede ser un GPS con ocho metros
 * de error o una torre de móvil con quinientos.
 */
const donde = z
  .object({
    latitud: z.number().min(-90).max(90),
    longitud: z.number().min(-180).max(180),
    precision: z.number().min(0).max(100_000).optional(),
  })
  .strict();

/**
 * Por qué no hay ubicación.
 *
 * Lista cerrada, y no texto libre, por lo mismo que los motivos de merma: la
 * pregunta que se hace después es «¿a cuánta gente le está fallando esto?», y eso
 * no se contesta con frases sueltas.
 */
const sinDonde = z.enum(['la_nego', 'sin_senal', 'no_la_da_el_aparato']);

export const entradaFicharEntrada = z
  .object({
    donde: donde.optional(),
    sin_donde: sinDonde.optional(),
    notas: z.string().trim().max(400).nullable().optional(),
  })
  .strict()
  // Una de las dos, siempre. Sin ninguna no se sabría si se pidió la ubicación o
  // si a alguien se le olvidó mandarla, y eso ya no se puede investigar después.
  .refine((e) => (e.donde === undefined) !== (e.sin_donde === undefined), {
    message: 'Hace falta la ubicación o el motivo por el que no la hay, y solo una de las dos.',
  });

export type EntradaFicharEntrada = z.infer<typeof entradaFicharEntrada>;

export interface SalidaDeFichaje {
  readonly fichajeId: string;
  readonly entroEn: string;
  readonly salioEn: string | null;
  readonly fechaOperativa: string;
  /** A cuántos metros del local. Nulo si el local no tiene posición puesta. */
  readonly metros: number | null;
  /** Si eso está dentro del radio que el local acepta. Nulo si no se sabe. */
  readonly enElLocal: boolean | null;
  readonly minutos: number | null;
}

interface FichaDelLocal {
  readonly id: string;
  readonly zonaHoraria: string;
  readonly horaDeCorte: string;
  readonly latitud: number | null;
  readonly longitud: number | null;
  readonly radio: number;
}

async function elLocal(contexto: Contexto, localId: string): Promise<FichaDelLocal> {
  const filas = await contexto.sql<
    {
      id: string;
      zona_horaria: string;
      hora_de_corte: string;
      latitud: string | null;
      longitud: string | null;
      radio_de_fichaje_metros: number;
    }[]
  >`
    select id, zona_horaria, to_char(hora_de_corte, 'HH24:MI') as hora_de_corte,
           latitud::text as latitud, longitud::text as longitud,
           radio_de_fichaje_metros
      from estook.local
     where id = ${localId}
  `;
  const fila = filas[0];
  if (!fila) throw new FalloDeAplicacion('local_ajeno');
  return {
    id: fila.id,
    zonaHoraria: fila.zona_horaria,
    horaDeCorte: fila.hora_de_corte,
    latitud: fila.latitud === null ? null : Number(fila.latitud),
    longitud: fila.longitud === null ? null : Number(fila.longitud),
    radio: fila.radio_de_fichaje_metros,
  };
}

/**
 * A cuántos metros del local.
 *
 * La cuenta la hace **la base de datos**, con `estook.metros_entre`, que es su
 * único dueño (regla 6): la usan este comando, el resumen de Equipo y mañana el
 * informe. Escrita aquí en JavaScript serían dos fórmulas del semiverseno
 * ligeramente distintas.
 */
async function aCuantosMetros(
  contexto: Contexto,
  local: FichaDelLocal,
  posicion: { latitud: number; longitud: number } | undefined,
): Promise<number | null> {
  if (posicion === undefined || local.latitud === null || local.longitud === null) return null;
  const filas = await contexto.sql<{ metros: number | null }[]>`
    select estook.metros_entre(
      ${local.latitud}, ${local.longitud}, ${posicion.latitud}, ${posicion.longitud}
    ) as metros
  `;
  return filas[0]?.metros ?? null;
}

export const ficharEntrada = comando<EntradaFicharEntrada, SalidaDeFichaje>({
  nombre: 'fichar_entrada',
  entrada: entradaFicharEntrada,
  exige: 'accion.fichar',

  async ejecutar(contexto, entrada) {
    if (!contexto.personaId) throw new FalloDeAplicacion('sin_sesion');
    const localId = elLocalDeLaSesion(contexto);
    const local = await elLocal(contexto, localId);

    // ¿Ya está dentro? El índice único de la 0027 lo impediría, pero un error de
    // clave duplicada llega a la pantalla como «se nos ha roto algo», y esto no
    // es que se haya roto nada: es que ya habías fichado. Se contesta con la
    // frase correcta.
    const abiertos = await contexto.sql<{ id: string; local: string }[]>`
      select f.id::text as id, l.nombre as local
        from estook.fichaje f
        join estook.local l on l.id = f.local_id
       where f.persona_id = ${contexto.personaId} and f.salio_en is null
    `;
    const abierto = abiertos[0];
    if (abierto) {
      throw new FalloDeAplicacion('ya_hecho', {
        porque: `Ya estás fichado en ${abierto.local}. Ficha la salida antes de volver a entrar.`,
      });
    }

    const metros = await aCuantosMetros(contexto, local, entrada.donde);
    const fecha = jornadaDe(contexto.ahora, local.zonaHoraria, horaDeCorte(local.horaDeCorte));

    const puestos = await contexto.sql<{ id: string; entro_en: string }[]>`
      insert into estook.fichaje (
        local_id, persona_id, fecha_operativa, entro_en,
        entro_latitud, entro_longitud, entro_precision, entro_metros, entro_sin_donde, notas
      )
      values (
        ${localId}, ${contexto.personaId}, ${fecha}::date, ${contexto.ahora.toISOString()},
        ${entrada.donde?.latitud ?? null}, ${entrada.donde?.longitud ?? null},
        ${entrada.donde?.precision ?? null}, ${metros}, ${entrada.sin_donde ?? null},
        ${entrada.notas ?? null}
      )
      returning id::text as id, to_char(entro_en, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as entro_en
    `;

    const puesto = puestos[0];
    if (!puesto) throw new FalloDeAplicacion('sin_permiso');

    // Sí publica evento, y las entradas de género no. La diferencia es la regla
    // 14: a quién le importa. Que alguien esté dentro lo mira el Panel de su
    // jefe, el cierre de la jornada y, cuando llegue, el cuadrante.
    await publicar(contexto.sql, {
      tipo: 'fichaje.abierto',
      organizacionId: laOrganizacionDeLaSesion(contexto),
      localId,
      datos: { fichajeId: puesto.id, personaId: contexto.personaId, metros },
      correlacionId: contexto.correlacionId,
    });

    return {
      fichajeId: puesto.id,
      entroEn: puesto.entro_en,
      salioEn: null,
      fechaOperativa: fecha,
      metros,
      enElLocal: metros === null ? null : metros <= local.radio,
      minutos: 0,
    };
  },
});

// ── Me voy ───────────────────────────────────────────────────────────────────

export const entradaFicharSalida = z
  .object({
    donde: donde.optional(),
    sin_donde: sinDonde.optional(),
    notas: z.string().trim().max(400).nullable().optional(),
  })
  .strict()
  .refine((e) => (e.donde === undefined) !== (e.sin_donde === undefined), {
    message: 'Hace falta la ubicación o el motivo por el que no la hay, y solo una de las dos.',
  });

export type EntradaFicharSalida = z.infer<typeof entradaFicharSalida>;

export const ficharSalida = comando<EntradaFicharSalida, SalidaDeFichaje>({
  nombre: 'fichar_salida',
  entrada: entradaFicharSalida,
  exige: 'accion.fichar',

  async ejecutar(contexto, entrada) {
    if (!contexto.personaId) throw new FalloDeAplicacion('sin_sesion');

    // **El abierto, sea del local que sea.** No se usa el local de la sesión: si
    // alguien fichó en Bar Centro y cambió de local en la aplicación —que es un
    // gesto de una pestaña— tiene que poder cerrar su turno igual. El turno es de
    // donde se abrió.
    const abiertos = await contexto.sql<{ id: string; local_id: string; entro_en: string }[]>`
      select id::text as id, local_id::text as local_id,
             to_char(entro_en, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as entro_en
        from estook.fichaje
       where persona_id = ${contexto.personaId} and salio_en is null
    `;
    const abierto = abiertos[0];
    if (!abierto) {
      throw new FalloDeAplicacion('no_existe', {
        porque: 'No estás fichado ahora mismo, así que no hay salida que apuntar.',
      });
    }

    const local = await elLocal(contexto, abierto.local_id);
    const metros = await aCuantosMetros(contexto, local, entrada.donde);

    const cerrados = await contexto.sql<
      { salio_en: string; fecha_operativa: string; minutos: number }[]
    >`
      update estook.fichaje
         set salio_en = ${contexto.ahora.toISOString()},
             salio_latitud = ${entrada.donde?.latitud ?? null},
             salio_longitud = ${entrada.donde?.longitud ?? null},
             salio_precision = ${entrada.donde?.precision ?? null},
             salio_metros = ${metros},
             salio_sin_donde = ${entrada.sin_donde ?? null},
             notas = coalesce(${entrada.notas ?? null}, notas),
             actualizado_en = now()
       where id = ${abierto.id}::bigint and salio_en is null
      returning to_char(salio_en, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as salio_en,
                to_char(fecha_operativa, 'YYYY-MM-DD') as fecha_operativa,
                -- Los minutos se cuentan **para contestar**, no se guardan: el
                -- dueno de esa cuenta es duracionDelTurno, del dominio, y una
                -- columna calculada aquí sería un segundo dueño (regla 6).
                floor(extract(epoch from (salio_en - entro_en)) / 60)::int as minutos
    `;

    const cerrado = cerrados[0];
    if (!cerrado) throw new FalloDeAplicacion('sin_permiso');

    await publicar(contexto.sql, {
      tipo: 'fichaje.cerrado',
      organizacionId: laOrganizacionDeLaSesion(contexto),
      localId: abierto.local_id,
      datos: {
        fichajeId: abierto.id,
        personaId: contexto.personaId,
        minutos: cerrado.minutos,
        metros,
      },
      correlacionId: contexto.correlacionId,
    });

    return {
      fichajeId: abierto.id,
      entroEn: abierto.entro_en,
      salioEn: cerrado.salio_en,
      fechaOperativa: cerrado.fecha_operativa,
      metros,
      enElLocal: metros === null ? null : metros <= local.radio,
      minutos: cerrado.minutos,
    };
  },
});

// ── Corregir el de otra persona ──────────────────────────────────────────────

export const entradaCorregirFichaje = z
  .object({
    fichaje_id: z.string().regex(/^\d+$/, 'Un fichaje se identifica con un número.'),
    entro_en: z.string().datetime().optional(),
    salio_en: z.string().datetime().nullable().optional(),
    /** Obligatorio y de verdad: la restricción de la base también lo exige. */
    motivo: z.string().trim().min(3).max(400),
  })
  .strict();

export type EntradaCorregirFichaje = z.infer<typeof entradaCorregirFichaje>;

/**
 * Arreglar un fichaje · con nombre y con motivo, siempre.
 *
 * ── Por qué esto existe, y por qué es un comando aparte ─────────────────────
 *
 * Porque la gente se olvida de fichar la salida. Un turno que dice diecinueve
 * horas no se puede dejar así, y no se puede borrar: **esto es el registro horario
 * de otra persona**, y lo que se toca de él queda escrito, con quién lo tocó y por
 * qué. La restricción de la 0027 lo exige en la base, no solo aquí.
 *
 * No hay borrado. Un fichaje equivocado se corrige, igual que una línea del libro
 * de movimientos se enmienda: si se pudiera borrar, el registro no serviría para
 * lo único para lo que sirve.
 */
export const corregirFichaje = comando<
  EntradaCorregirFichaje,
  { fichajeId: string; minutos: number | null }
>({
  nombre: 'corregir_fichaje',
  entrada: entradaCorregirFichaje,
  exige: 'app.equipo',

  async ejecutar(contexto, entrada) {
    if (!contexto.personaId) throw new FalloDeAplicacion('sin_sesion');

    const antes = await contexto.sql<
      { local_id: string; persona_id: string; entro_en: string; salio_en: string | null }[]
    >`
      select local_id::text as local_id, persona_id::text as persona_id,
             to_char(entro_en, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as entro_en,
             to_char(salio_en, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as salio_en
        from estook.fichaje
       where id = ${entrada.fichaje_id}::bigint
    `;
    const elDeAntes = antes[0];
    if (!elDeAntes) {
      throw new FalloDeAplicacion('no_existe', {
        porque: 'Ese fichaje no está, o no es de nadie que puedas ver.',
      });
    }

    // **Lo que no se manda, no se toca.** Antes, corregir solo la hora de entrada
    // dejaba la salida en blanco: el turno de ayer volvía a estar «abierto», y si
    // esa persona ya había fichado hoy, chocaba con el suyo de hoy. `null` sí se
    // manda a propósito —«esta salida estaba mal, no salió a esa hora»— y por eso
    // se distingue de no mandarlo.
    const tocaLaSalida = entrada.salio_en !== undefined;
    const salidaNueva = entrada.salio_en ?? null;

    const cambiados = await contexto.sql<{ fecha_operativa: string; minutos: number | null }[]>`
      update estook.fichaje
         set entro_en = coalesce(${entrada.entro_en ?? null}::timestamptz, entro_en),
             salio_en = case when ${tocaLaSalida} then ${salidaNueva}::timestamptz else salio_en end,
             corregido_por = ${contexto.personaId},
             corregido_en = ${contexto.ahora.toISOString()},
             motivo_de_la_correccion = ${entrada.motivo},
             actualizado_en = now()
       where id = ${entrada.fichaje_id}::bigint
      returning to_char(fecha_operativa, 'YYYY-MM-DD') as fecha_operativa,
                case when salio_en is null then null
                     else floor(extract(epoch from (salio_en - entro_en)) / 60)::int
                end as minutos
    `;

    const cambiado = cambiados[0];
    if (!cambiado) throw new FalloDeAplicacion('sin_permiso');

    // A la auditoría **sí**, y aquí no hay duda: «de todo lo que toca dinero,
    // permisos o registros legales». Un registro horario es de los tres.
    await contexto.sql`
      select estook.anotar(
        ${laOrganizacionDeLaSesion(contexto)}::uuid, 'cambiar', 'fichaje',
        ${entrada.fichaje_id}, ${elDeAntes.local_id}::uuid,
        ${JSON.stringify({ entro_en: elDeAntes.entro_en, salio_en: elDeAntes.salio_en })}::text::jsonb,
        ${JSON.stringify({ entro_en: entrada.entro_en ?? elDeAntes.entro_en, salio_en: tocaLaSalida ? salidaNueva : elDeAntes.salio_en })}::text::jsonb,
        ${entrada.motivo}
      )
    `;

    await publicar(contexto.sql, {
      tipo: 'fichaje.corregido',
      organizacionId: laOrganizacionDeLaSesion(contexto),
      localId: elDeAntes.local_id,
      datos: {
        fichajeId: entrada.fichaje_id,
        personaId: elDeAntes.persona_id,
        quienLoCorrigio: contexto.personaId,
        motivo: entrada.motivo,
      },
      correlacionId: contexto.correlacionId,
    });

    return { fichajeId: entrada.fichaje_id, minutos: cambiado.minutos };
  },
});
