import { z } from 'zod';
import {
  avisoDeFichajeApuntado,
  avisoDeFichajeCorregido,
  horaDeCorte,
  jornadaDe,
  laHoraDeLoHecho,
  seRevisaElFichaje,
} from '@estook/dominio';
import { publicar } from '../../eventos/bandeja.ts';
import { elLocalDeLaSesion, laOrganizacionDeLaSesion } from '../alta.ts';
import { avisar, quienesPuedenRecibir } from '../avisos.ts';
import { comando, FalloDeAplicacion, type Contexto } from '../contrato.ts';
import { enNombreDelSistema } from '../pago.ts';

/**
 * Fichar (M6½, anticipando M15; la pausa y el aparato del local, con H1 · 0068).
 *
 * ── Las preguntas, y ninguna más ────────────────────────────────────────────
 *
 *   `fichar_entrada`  «empiezo»
 *   `empezar_pausa`   «me voy a descansar»
 *   `acabar_pausa`    «vuelvo»
 *   `fichar_salida`   «me voy»
 *
 * No hay «crear fichaje» ni «editar fichaje»: «la aplicación no pregunta *¿qué
 * tabla quieres modificar?*, pregunta *¿qué quieres hacer?*» (Evolución 1.0,
 * capítulo 14). Corregir el de otra persona sí existe, y es otro comando, con
 * otro permiso y con motivo obligatorio, porque es otra cosa.
 *
 * Las cuatro se hacen igual desde el móvil de cada uno y desde **el aparato del
 * local** (`aparato-para-fichar.ts`): por eso lo de dentro vive en funciones que
 * reciben a la persona, y los comandos de aquí solo dicen quién es.
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
 * En el aparato del local no se pide: está en el local. Se apunta `aparato_del_local`.
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
 * no se contesta con frases sueltas. `aparato_del_local` no está aquí: lo pone el
 * aparato, no lo manda nadie.
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
  readonly pausasEnUso: boolean;
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
      pausas_en_uso: boolean;
    }[]
  >`
    select id, zona_horaria, to_char(hora_de_corte, 'HH24:MI') as hora_de_corte,
           latitud::text as latitud, longitud::text as longitud,
           radio_de_fichaje_metros, pausas_en_uso
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
    pausasEnUso: fila.pausas_en_uso,
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

// ── Lo hecho sin conexión (I · 0070) ────────────────────────────────────────

/**
 * **A qué hora se fichó**: ahora, o —si se hizo sin señal— la que cuenta el servidor
 * con lo que dice el móvil que ha pasado (`laHoraDeLoHecho`). Y si se hizo sin señal,
 * queda escrito, y con más de doce horas lo revisa quien lleva el equipo.
 */
export function cuandoSeFicho(contexto: Contexto): {
  readonly cuando: Date;
  readonly sinConexion: boolean;
  readonly seRevisa: boolean;
} {
  const hace = contexto.hechoHaceMs ?? null;
  if (hace === null) return { cuando: contexto.ahora, sinConexion: false, seRevisa: false };
  return {
    cuando: laHoraDeLoHecho(contexto.ahora, hace),
    sinConexion: true,
    seRevisa: seRevisaElFichaje(hace),
  };
}

// ── Lo de dentro, que comparten el móvil y el aparato del local ─────────────

/** Desde dónde se ficha: el móvil de cada uno, con su ubicación, o el aparato. */
export type DesdeDonde =
  | {
      readonly desde: 'movil';
      readonly donde:
        { latitud: number; longitud: number; precision?: number | undefined } | undefined;
      readonly sinDonde: 'la_nego' | 'sin_senal' | 'no_la_da_el_aparato' | undefined;
    }
  | { readonly desde: 'aparato'; readonly terminalId: string };

function laUbicacion(desde: DesdeDonde) {
  if (desde.desde === 'aparato') {
    return { donde: undefined, sinDonde: 'aparato_del_local', terminalId: desde.terminalId };
  }
  return { donde: desde.donde, sinDonde: desde.sinDonde ?? null, terminalId: null };
}

export async function abrirElTurno(
  contexto: Contexto,
  personaId: string,
  organizacionId: string,
  localId: string,
  desde: DesdeDonde,
  notas: string | null,
): Promise<SalidaDeFichaje> {
  const local = await elLocal(contexto, localId);

  // ¿Ya está dentro? El índice único de la 0027 lo impediría, pero un error de
  // clave duplicada llega a la pantalla como «se nos ha roto algo», y esto no
  // es que se haya roto nada: es que ya habías fichado. Se contesta con la
  // frase correcta.
  const abiertos = await contexto.sql<{ id: string; local: string }[]>`
    select f.id::text as id, l.nombre as local
      from estook.fichaje f
      join estook.local l on l.id = f.local_id
     where f.persona_id = ${personaId} and f.salio_en is null
  `;
  const abierto = abiertos[0];
  if (abierto) {
    throw new FalloDeAplicacion('ya_hecho', {
      porque: `Ya estás fichado en ${abierto.local}. Ficha la salida antes de volver a entrar.`,
    });
  }

  const ubicacion = laUbicacion(desde);
  const metros = await aCuantosMetros(contexto, local, ubicacion.donde);
  // La jornada la decide el servidor con la hora en que se fichó, también sin conexión.
  const { cuando, sinConexion, seRevisa } = cuandoSeFicho(contexto);
  const fecha = jornadaDe(cuando, local.zonaHoraria, horaDeCorte(local.horaDeCorte));

  const puestos = await contexto.sql<{ id: string; entro_en: string }[]>`
    insert into estook.fichaje (
      local_id, persona_id, fecha_operativa, entro_en,
      entro_latitud, entro_longitud, entro_precision, entro_metros, entro_sin_donde, notas,
      terminal_id, entro_sin_conexion, por_revisar
    )
    values (
      ${localId}, ${personaId}, ${fecha}::date, ${cuando.toISOString()},
      ${ubicacion.donde?.latitud ?? null}, ${ubicacion.donde?.longitud ?? null},
      ${ubicacion.donde?.precision ?? null}, ${metros}, ${ubicacion.sinDonde},
      ${notas}, ${ubicacion.terminalId}, ${sinConexion}, ${seRevisa}
    )
    returning id::text as id, to_char(entro_en, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as entro_en
  `;

  const puesto = puestos[0];
  if (!puesto) throw new FalloDeAplicacion('sin_permiso');

  // «Entras en cinco minutos» ya está hecho: fuera de su campana (0070).
  await enNombreDelSistema(contexto, async () => {
    await contexto.sql`
      update estook.aviso set leido_en = now()
       where persona_id = ${personaId} and tipo = 'turno.entras' and leido_en is null
    `;
  });

  // Sí publica evento, y las entradas de género no. La diferencia es la regla
  // 14: a quién le importa. Que alguien esté dentro lo mira el Panel de su
  // jefe, el cierre de la jornada y, cuando llegue, el cuadrante.
  await publicar(contexto.sql, {
    tipo: 'fichaje.abierto',
    organizacionId,
    localId,
    datos: { fichajeId: puesto.id, personaId, metros },
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
}

export async function cerrarElTurno(
  contexto: Contexto,
  personaId: string,
  organizacionId: string,
  desde: DesdeDonde,
  notas: string | null,
): Promise<SalidaDeFichaje> {
  // **El abierto, sea del local que sea.** No se usa el local de la sesión: si
  // alguien fichó en Bar Centro y cambió de local en la aplicación —que es un
  // gesto de una pestaña— tiene que poder cerrar su turno igual. El turno es de
  // donde se abrió.
  const abiertos = await contexto.sql<{ id: string; local_id: string; entro_en: string }[]>`
    select id::text as id, local_id::text as local_id,
           to_char(entro_en, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as entro_en
      from estook.fichaje
     where persona_id = ${personaId} and salio_en is null
  `;
  const abierto = abiertos[0];
  if (!abierto) {
    throw new FalloDeAplicacion('no_existe', {
      porque: 'No estás fichado ahora mismo, así que no hay salida que apuntar.',
    });
  }

  const local = await elLocal(contexto, abierto.local_id);
  const ubicacion = laUbicacion(desde);
  const metros = await aCuantosMetros(contexto, local, ubicacion.donde);
  const { cuando, sinConexion, seRevisa } = cuandoSeFicho(contexto);

  // **Irse cierra la pausa**: quien sale sin tocar «Volver» no ha vuelto a
  // trabajar, y la pausa acaba al salir (0068). Nunca antes de que empezara.
  await contexto.sql`
    update estook.pausa set acabo_en = greatest(${cuando.toISOString()}::timestamptz, empezo_en)
     where persona_id = ${personaId} and acabo_en is null
  `;

  const cerrados = await contexto.sql<
    { salio_en: string; fecha_operativa: string; minutos: number }[]
  >`
    update estook.fichaje as f
       -- Sin conexión, la hora la cuenta el servidor; nunca antes de entrar.
       set salio_en = greatest(${cuando.toISOString()}::timestamptz, f.entro_en),
           salio_sin_conexion = ${sinConexion},
           por_revisar = f.por_revisar or ${seRevisa},
           salio_latitud = ${ubicacion.donde?.latitud ?? null},
           salio_longitud = ${ubicacion.donde?.longitud ?? null},
           salio_precision = ${ubicacion.donde?.precision ?? null},
           salio_metros = ${metros},
           salio_sin_donde = ${ubicacion.sinDonde},
           notas = coalesce(${notas}, notas),
           actualizado_en = now()
     where f.id = ${abierto.id}::bigint and f.salio_en is null
    returning to_char(f.salio_en, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as salio_en,
              to_char(f.fecha_operativa, 'YYYY-MM-DD') as fecha_operativa,
              -- Los minutos se cuentan **para contestar**, no se guardan, y los
              -- cuenta su único dueño: sin las pausas si en el local no cuentan.
              floor(estook.segundos_trabajados(f, f.salio_en) / 60)::int as minutos
  `;

  const cerrado = cerrados[0];
  if (!cerrado) throw new FalloDeAplicacion('sin_permiso');

  await publicar(contexto.sql, {
    tipo: 'fichaje.cerrado',
    organizacionId,
    localId: abierto.local_id,
    datos: {
      fichajeId: abierto.id,
      personaId,
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
}

export interface SalidaDePausa {
  readonly fichajeId: string;
  readonly empezoEn: string;
  readonly acaboEn: string | null;
}

export async function empezarLaPausa(
  contexto: Contexto,
  personaId: string,
  terminalId: string | null,
): Promise<SalidaDePausa> {
  const abiertos = await contexto.sql<{ id: string; local_id: string }[]>`
    select id::text as id, local_id::text as local_id
      from estook.fichaje where persona_id = ${personaId} and salio_en is null
  `;
  const abierto = abiertos[0];
  if (!abierto) {
    throw new FalloDeAplicacion('no_existe', {
      porque: 'Para empezar una pausa hay que estar fichado. Ficha la entrada primero.',
    });
  }
  const local = await elLocal(contexto, abierto.local_id);
  if (!local.pausasEnUso) {
    throw new FalloDeAplicacion('sin_permiso', {
      porque: 'En este local no se fichan las pausas. Se cambia en Ajustes → Tu local.',
    });
  }

  const yaEnPausa = await contexto.sql<{ id: string }[]>`
    select id::text as id from estook.pausa where persona_id = ${personaId} and acabo_en is null
  `;
  if (yaEnPausa.length > 0) {
    throw new FalloDeAplicacion('ya_hecho', {
      porque: 'Ya estás en tu pausa. Toca «Volver» al acabar.',
    });
  }

  const { cuando, sinConexion } = cuandoSeFicho(contexto);
  const puestas = await contexto.sql<{ empezo_en: string }[]>`
    insert into estook.pausa (fichaje_id, local_id, persona_id, empezo_en, terminal_id, sin_conexion)
    values (${abierto.id}::bigint, ${abierto.local_id}, ${personaId},
            greatest(${cuando.toISOString()}::timestamptz,
                     (select f.entro_en from estook.fichaje f where f.id = ${abierto.id}::bigint)),
            ${terminalId}, ${sinConexion})
    returning to_char(empezo_en, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as empezo_en
  `;
  const puesta = puestas[0];
  if (!puesta) throw new FalloDeAplicacion('sin_permiso');
  return { fichajeId: abierto.id, empezoEn: puesta.empezo_en, acaboEn: null };
}

export async function acabarLaPausa(contexto: Contexto, personaId: string): Promise<SalidaDePausa> {
  const { cuando, sinConexion } = cuandoSeFicho(contexto);
  const acabadas = await contexto.sql<
    { fichaje_id: string; empezo_en: string; acabo_en: string }[]
  >`
    update estook.pausa
       set acabo_en = greatest(${cuando.toISOString()}::timestamptz, empezo_en),
           sin_conexion = sin_conexion or ${sinConexion}
     where persona_id = ${personaId} and acabo_en is null
    returning fichaje_id::text as fichaje_id,
              to_char(empezo_en, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as empezo_en,
              to_char(acabo_en, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as acabo_en
  `;
  const acabada = acabadas[0];
  if (!acabada) {
    throw new FalloDeAplicacion('no_existe', { porque: 'No estás en ninguna pausa ahora mismo.' });
  }
  return { fichajeId: acabada.fichaje_id, empezoEn: acabada.empezo_en, acaboEn: acabada.acabo_en };
}

// ── Los comandos del móvil ───────────────────────────────────────────────────

function yo(contexto: Contexto): string {
  if (!contexto.personaId) throw new FalloDeAplicacion('sin_sesion');
  return contexto.personaId;
}

export const ficharEntrada = comando<EntradaFicharEntrada, SalidaDeFichaje>({
  nombre: 'fichar_entrada',
  // Se puede fichar sin señal y mandarlo al volver (0070).
  sinConexion: true,
  entrada: entradaFicharEntrada,
  exige: 'accion.fichar',

  async ejecutar(contexto, entrada) {
    return abrirElTurno(
      contexto,
      yo(contexto),
      laOrganizacionDeLaSesion(contexto),
      elLocalDeLaSesion(contexto),
      { desde: 'movil', donde: entrada.donde, sinDonde: entrada.sin_donde },
      entrada.notas ?? null,
    );
  },
});

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
  // Se puede fichar sin señal y mandarlo al volver (0070).
  sinConexion: true,
  entrada: entradaFicharSalida,
  exige: 'accion.fichar',

  async ejecutar(contexto, entrada) {
    return cerrarElTurno(
      contexto,
      yo(contexto),
      laOrganizacionDeLaSesion(contexto),
      { desde: 'movil', donde: entrada.donde, sinDonde: entrada.sin_donde },
      entrada.notas ?? null,
    );
  },
});

/**
 * La pausa de descanso (0068), desde el móvil. La ubicación no se pide: la pausa
 * cuelga del turno, que ya dice dónde se entró.
 */
export const empezarPausa = comando<Record<string, never>, SalidaDePausa>({
  nombre: 'empezar_pausa',
  // Se puede fichar sin señal y mandarlo al volver (0070).
  sinConexion: true,
  entrada: z.object({}).strict(),
  exige: 'accion.fichar',

  async ejecutar(contexto) {
    return empezarLaPausa(contexto, yo(contexto), null);
  },
});

export const acabarPausa = comando<Record<string, never>, SalidaDePausa>({
  nombre: 'acabar_pausa',
  // Se puede fichar sin señal y mandarlo al volver (0070).
  sinConexion: true,
  entrada: z.object({}).strict(),
  exige: 'accion.fichar',

  async ejecutar(contexto) {
    return acabarLaPausa(contexto, yo(contexto));
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
 * ── Y desde la 0052, el original no se pierde ───────────────────────────────
 *
 * Corregir sube `correcciones` en uno, y **la base escribe sola la fila de la
 * corrección** con lo de antes y lo de después (`correccion_de_fichaje`), que no se
 * puede cambiar ni borrar. Sin subirlo, la base no deja tocar las horas: no hay
 * forma de corregir sin que quede. Y **al trabajador le llega un aviso** (0062).
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
      {
        local_id: string;
        persona_id: string;
        entro_en: string;
        salio_en: string | null;
        fecha: string;
      }[]
    >`
      select local_id::text as local_id, persona_id::text as persona_id,
             to_char(entro_en, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as entro_en,
             to_char(salio_en, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as salio_en,
             to_char(fecha_operativa, 'YYYY-MM-DD') as fecha
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

    const cambiados = await contexto.sql<{ minutos: number | null }[]>`
      update estook.fichaje as f
         set entro_en = coalesce(${entrada.entro_en ?? null}::timestamptz, entro_en),
             salio_en = case when ${tocaLaSalida} then ${salidaNueva}::timestamptz else salio_en end,
             corregido_por = ${contexto.personaId},
             corregido_en = ${contexto.ahora.toISOString()},
             motivo_de_la_correccion = ${entrada.motivo},
             correcciones = correcciones + 1,
             -- Corregirlo es haberlo revisado (0070).
             por_revisar = false,
             revisado_por = case when f.por_revisar then ${contexto.personaId}::uuid else f.revisado_por end,
             revisado_en = case when f.por_revisar then now() else f.revisado_en end,
             actualizado_en = now()
       where f.id = ${entrada.fichaje_id}::bigint
      returning case when f.salio_en is null then null
                     else floor(estook.segundos_trabajados(f, f.salio_en) / 60)::int
                end as minutos
    `;

    const cambiado = cambiados[0];
    if (!cambiado) throw new FalloDeAplicacion('sin_permiso');

    const organizacionId = laOrganizacionDeLaSesion(contexto);

    // A la auditoría **sí**, y aquí no hay duda: «de todo lo que toca dinero,
    // permisos o registros legales». Un registro horario es de los tres.
    await contexto.sql`
      select estook.anotar(
        ${organizacionId}::uuid, 'cambiar', 'fichaje',
        ${entrada.fichaje_id}, ${elDeAntes.local_id}::uuid,
        ${JSON.stringify({ entro_en: elDeAntes.entro_en, salio_en: elDeAntes.salio_en })}::text::jsonb,
        ${JSON.stringify({ entro_en: entrada.entro_en ?? elDeAntes.entro_en, salio_en: tocaLaSalida ? salidaNueva : elDeAntes.salio_en })}::text::jsonb,
        ${entrada.motivo}
      )
    `;

    await publicar(contexto.sql, {
      tipo: 'fichaje.corregido',
      organizacionId,
      localId: elDeAntes.local_id,
      datos: {
        fichajeId: entrada.fichaje_id,
        personaId: elDeAntes.persona_id,
        quienLoCorrigio: contexto.personaId,
        motivo: entrada.motivo,
      },
      correlacionId: contexto.correlacionId,
    });

    // **Al trabajador, su aviso** (0062): «el trabajador ve cualquier cambio en lo
    // suyo». Uno por fichaje: si se vuelve a corregir, vuelve a sonar.
    const quienCorrige = await contexto.sql<{ nombre: string }[]>`
      select nombre from estook.persona where id = ${contexto.personaId}
    `;
    const trabajador = (
      await quienesPuedenRecibir(contexto, elDeAntes.local_id, 'fichaje.corregido')
    ).filter((q) => q.personaId === elDeAntes.persona_id);
    await avisar(
      contexto,
      {
        tipo: 'fichaje.corregido',
        organizacionId,
        localId: elDeAntes.local_id,
        clave: `fichaje:${entrada.fichaje_id}`,
        texto: () =>
          avisoDeFichajeCorregido(
            quienCorrige[0]?.nombre ?? 'Alguien',
            elDeAntes.fecha,
            entrada.motivo,
          ),
        // A sus fichajes, que ve cualquiera, tenga o no la app Equipo.
        ir: '/mis-fichajes',
        quien: quienCorrige[0]?.nombre ?? null,
        como: 'de_nuevo',
      },
      trabajador,
    );

    return { fichajeId: entrada.fichaje_id, minutos: cambiado.minutos };
  },
});

// ── Revisar lo hecho sin conexión, y apuntar lo que falta (I · 0070) ─────────

/**
 * «Está bien»: quien lleva el equipo da por bueno un fichaje que se hizo con más de
 * doce horas sin señal (mejora 15). Si no lo está, lo corrige, que también lo da por
 * revisado. Queda en la auditoría con su nombre.
 */
export const darPorBuenoElFichaje = comando<{ fichaje_id: string }, { fichajeId: string }>({
  nombre: 'dar_por_bueno_el_fichaje',
  entrada: z
    .object({ fichaje_id: z.string().regex(/^\d+$/, 'Un fichaje se identifica con un número.') })
    .strict(),
  exige: 'app.equipo',

  async ejecutar(contexto, entrada) {
    if (!contexto.personaId) throw new FalloDeAplicacion('sin_sesion');
    const filas = await contexto.sql<{ local_id: string }[]>`
      update estook.fichaje
         set por_revisar = false, revisado_por = ${contexto.personaId}, revisado_en = now(),
             actualizado_en = now()
       where id = ${entrada.fichaje_id}::bigint and por_revisar
      returning local_id::text as local_id
    `;
    const fila = filas[0];
    if (!fila) {
      throw new FalloDeAplicacion('ya_hecho', {
        porque: 'Ese fichaje ya está revisado, o no es de nadie que lleves.',
      });
    }
    await contexto.sql`
      select estook.anotar(
        ${laOrganizacionDeLaSesion(contexto)}::uuid, 'cambiar', 'fichaje',
        ${entrada.fichaje_id}, ${fila.local_id}::uuid,
        ${JSON.stringify({ por_revisar: true })}::text::jsonb,
        ${JSON.stringify({ por_revisar: false })}::text::jsonb,
        'Revisado: hecho sin conexión, está bien'
      )
    `;
    return { fichajeId: entrada.fichaje_id };
  },
});

export const entradaApuntarFichajeQueFalta = z
  .object({
    persona_id: z.string().uuid(),
    entro_en: z.string().datetime(),
    salio_en: z.string().datetime().nullable(),
    /** Obligatorio y de verdad: la restricción de la base también lo exige. */
    motivo: z.string().trim().min(3).max(400),
  })
  .strict()
  .refine((e) => e.salio_en === null || Date.parse(e.salio_en) > Date.parse(e.entro_en), {
    message: 'La salida tiene que ser después de la entrada.',
    path: ['salio_en'],
  });

/**
 * **Apuntar un fichaje que falta** (0070): quien lleva el equipo, con su nombre y su
 * motivo. Para el fichaje del aparato que se hizo sin conexión con el PIN equivocado,
 * y para quien se olvidó de fichar la entrada.
 *
 * Es el registro horario de otra persona, así que va como una corrección: con nombre
 * y motivo (lo exige la base), sin ubicación (no hay aparato al que pedírsela; su
 * porqué es `a_mano`), en la auditoría, y **al trabajador le llega su aviso**, como
 * cuando le corrigen uno (0062).
 */
export const apuntarFichajeQueFalta = comando<
  z.infer<typeof entradaApuntarFichajeQueFalta>,
  { fichajeId: string; minutos: number | null }
>({
  nombre: 'apuntar_fichaje_que_falta',
  entrada: entradaApuntarFichajeQueFalta,
  exige: 'app.equipo',

  async ejecutar(contexto, entrada) {
    if (!contexto.personaId) throw new FalloDeAplicacion('sin_sesion');
    const localId = elLocalDeLaSesion(contexto);
    const organizacionId = laOrganizacionDeLaSesion(contexto);
    const entro = new Date(entrada.entro_en);
    const salio = entrada.salio_en === null ? null : new Date(entrada.salio_en);
    // Lo que no ha pasado todavía no se apunta: el registro dice lo que pasó.
    if (entro > contexto.ahora || (salio !== null && salio > contexto.ahora)) {
      throw new FalloDeAplicacion('faltan_datos', {
        campos: ['entro_en'],
        porque: 'No se puede apuntar un fichaje que todavía no ha pasado.',
      });
    }

    const local = await elLocal(contexto, localId);
    // Sin salida es estar dentro ahora: no puede haber otro abierto.
    if (salio === null) {
      const abiertos = await contexto.sql<{ id: string }[]>`
        select id::text as id from estook.fichaje
         where persona_id = ${entrada.persona_id} and salio_en is null
      `;
      if (abiertos.length > 0) {
        throw new FalloDeAplicacion('ya_hecho', {
          porque: 'Esa persona ya está fichada ahora. Corrige ese fichaje en vez de apuntar otro.',
        });
      }
    }
    // Ni encima de otro suyo: dos fichajes a la vez es contar dos veces las mismas horas.
    const pisados = await contexto.sql<{ id: string }[]>`
      select id::text as id from estook.fichaje
       where persona_id = ${entrada.persona_id}
         and tstzrange(entro_en, coalesce(salio_en, 'infinity'::timestamptz))
             && tstzrange(${entro.toISOString()}::timestamptz,
                          coalesce(${salio?.toISOString() ?? null}::timestamptz, 'infinity'::timestamptz))
    `;
    if (pisados.length > 0) {
      throw new FalloDeAplicacion('faltan_datos', {
        campos: ['entro_en'],
        porque: 'A esas horas ya tiene otro fichaje. Corrige ese en vez de apuntar otro.',
      });
    }

    const fecha = jornadaDe(entro, local.zonaHoraria, horaDeCorte(local.horaDeCorte));
    const puestos = await contexto.sql<{ id: string; minutos: number | null }[]>`
      insert into estook.fichaje as f (
        local_id, persona_id, fecha_operativa, entro_en, salio_en,
        entro_sin_donde, salio_sin_donde, apuntado_por, motivo_a_mano
      )
      values (
        ${localId}, ${entrada.persona_id}, ${fecha}::date, ${entro.toISOString()},
        ${salio?.toISOString() ?? null}, 'a_mano',
        ${salio === null ? null : 'a_mano'}, ${contexto.personaId}, ${entrada.motivo}
      )
      returning id::text as id,
                case when f.salio_en is null then null
                     else floor(estook.segundos_trabajados(f, f.salio_en) / 60)::int end as minutos
    `;
    const puesto = puestos[0];
    if (!puesto) throw new FalloDeAplicacion('sin_permiso');

    await contexto.sql`
      select estook.anotar(
        ${organizacionId}::uuid, 'crear', 'fichaje', ${puesto.id}, ${localId}::uuid, null,
        ${JSON.stringify({ persona_id: entrada.persona_id, entro_en: entro.toISOString(), salio_en: salio?.toISOString() ?? null })}::text::jsonb,
        ${entrada.motivo}
      )
    `;

    const quienApunta = await contexto.sql<{ nombre: string }[]>`
      select nombre from estook.persona where id = ${contexto.personaId}
    `;
    const nombre = quienApunta[0]?.nombre ?? 'Alguien';
    const trabajador = (await quienesPuedenRecibir(contexto, localId, 'fichaje.corregido')).filter(
      (q) => q.personaId === entrada.persona_id,
    );
    await avisar(
      contexto,
      {
        tipo: 'fichaje.corregido',
        organizacionId,
        localId,
        clave: `fichaje:${puesto.id}`,
        texto: () => avisoDeFichajeApuntado(nombre, fecha, entrada.motivo),
        ir: '/mis-fichajes',
        quien: nombre,
        como: 'de_nuevo',
      },
      trabajador,
    );

    return { fichajeId: puesto.id, minutos: puesto.minutos };
  },
});
