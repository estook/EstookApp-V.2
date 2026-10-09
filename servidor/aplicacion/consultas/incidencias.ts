import { z } from 'zod';
import { fechaOperativa, llegoTarde, masDias, type TipoDeIncidencia } from '@estook/dominio';
import { consulta, FalloDeAplicacion, type Contexto } from '../contrato.ts';
import { elReloj, esUnaFalta, lasEntradasDelHorario, type Justificacion } from './equipo.ts';

/**
 * Equipo → Incidencias (repaso del 9-oct, decisión 0081).
 *
 * «Si un día un trabajador no ficha y no está justificado, no hay sitio donde lo
 * muestre»; y en «Para mirar» salían «4 fichajes que revisar» y «8 retrasos» sin
 * poder llegar a ninguno. Aquí está **cada una**, con quién, cuándo y qué pasó, y lo
 * que se puede hacer: justificar una falta o un retraso, o abrir el fichaje.
 *
 * ── De dónde sale cada una ──────────────────────────────────────────────────
 *
 * Las faltas y los retrasos, **del horario publicado** y de los fichajes, con la
 * misma pieza que el Resumen y la cifra de Retrasos (`lasEntradasDelHorario`): lo que
 * aquí es un retraso, allí también. Los fichajes raros, de los fichajes de la gente
 * que llevas, como la columna «A revisar» del Resumen.
 *
 * Quién ve a quién lo deciden la base y `a_quien_lleva`, como en todo Equipo: un jefe
 * de cocina ve las de la cocina y ninguna de la sala.
 */

export interface UnaIncidencia {
  /** Estable entre lecturas: el tipo, la persona y el tramo o el fichaje. */
  readonly id: string;
  readonly tipo: TipoDeIncidencia;
  readonly personaId: string;
  readonly nombre: string;
  readonly apellidos: string | null;
  /** La jornada. */
  readonly fecha: string;
  /** Cuándo pasó, en ISO: el tramo o la entrada fichada. Ordena la lista. */
  readonly cuando: string;
  readonly entra: string | null;
  readonly sale: string | null;
  readonly minutosTarde: number | null;
  readonly fichoA: string | null;
  readonly metros: number | null;
  /** El fichaje, para abrirlo: los raros, y los retrasos. */
  readonly fichajeId: string | null;
  /** Justificada: se ve, tachada de la cuenta, con quién lo dijo. */
  readonly justificacion: Justificacion | null;
}

/** Cuánto lleva abierto un fichaje para ser «sin fichar la salida»: doce horas. */
const SIN_CERRAR_DESDE_HORAS = 12;

/**
 * Las incidencias de la gente que llevas en un periodo, de la más nueva a la más
 * vieja. Con `soloDe`, las de una persona (su ficha).
 */
export async function lasIncidencias(
  contexto: Contexto,
  localId: string,
  desde: string,
  hasta: string,
  soloDe: string | null = null,
): Promise<{
  readonly margen: number;
  readonly incidencias: readonly UnaIncidencia[];
  /** Las jornadas en las que alguien tenía turno publicado: las que tienen dato. */
  readonly conTurno: ReadonlySet<string>;
}> {
  const { margen, entradas } = await lasEntradasDelHorario(contexto, localId, desde, hasta, soloDe);
  const reloj = await elReloj(contexto, localId);

  const nombres = await contexto.sql<
    { persona_id: string; nombre: string; apellidos: string | null }[]
  >`
    select q.persona_id::text as persona_id, p.nombre, p.apellidos
      from estook.a_quien_lleva(${localId}::uuid) q
      join estook.persona p on p.id = q.persona_id
     where (${soloDe}::uuid is null or q.persona_id = ${soloDe}::uuid)
  `;
  const quien = new Map(nombres.map((n) => [n.persona_id, n]));

  const delHorario: UnaIncidencia[] = [];
  for (const e of entradas) {
    const persona = quien.get(e.personaId);
    if (persona === undefined) continue;
    const comun = {
      personaId: e.personaId,
      nombre: persona.nombre,
      apellidos: persona.apellidos,
      fecha: e.fecha,
      cuando: e.empieza,
      entra: e.entra,
      sale: e.sale,
      fichoA: e.fichoA,
      metros: null,
      fichajeId: null,
    };
    if (esUnaFalta(e)) {
      delHorario.push({
        ...comun,
        id: `falta:${e.personaId}:${e.empieza}`,
        tipo: 'falta',
        minutosTarde: null,
        justificacion: e.faltaJustificada,
      });
    } else if (e.minutosTarde !== null && llegoTarde(e.minutosTarde, margen)) {
      delHorario.push({
        ...comun,
        id: `retraso:${e.personaId}:${e.empieza}`,
        tipo: 'retraso',
        minutosTarde: e.minutosTarde,
        justificacion: e.retrasoJustificado,
      });
    }
  }

  // Los fichajes raros: los mismos que la columna «A revisar» del Resumen, y los de
  // sin conexión que nadie ha dado por buenos. Uno puede ser raro de dos maneras
  // —lejos y sin cerrar—, y sale dos veces: son dos cosas que mirar.
  const ahora = contexto.ahora.toISOString();
  const raros = await contexto.sql<
    {
      fichaje_id: string;
      persona_id: string;
      fecha: string;
      entro_en: string;
      ficho_a: string;
      metros: number | null;
      sin_cerrar: boolean;
      lejos: boolean;
      sin_ubicacion: boolean;
      sin_conexion: boolean;
    }[]
  >`
    select f.id::text as fichaje_id, f.persona_id::text as persona_id,
           to_char(f.fecha_operativa, 'YYYY-MM-DD') as fecha,
           to_char(f.entro_en at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as entro_en,
           to_char(f.entro_en at time zone l.zona_horaria, 'HH24:MI') as ficho_a,
           f.entro_metros as metros,
           (f.salio_en is null
             and f.entro_en < ${ahora}::timestamptz - make_interval(hours => ${SIN_CERRAR_DESDE_HORAS}))
             as sin_cerrar,
           (f.entro_metros is not null and f.entro_metros > ${reloj.radio}) as lejos,
           (f.entro_sin_donde is not null) as sin_ubicacion,
           f.por_revisar as sin_conexion
      from estook.fichaje f
      join estook.local l on l.id = f.local_id
     where f.local_id = ${localId}
       and f.fecha_operativa between ${desde}::date and ${hasta}::date
       and f.persona_id in (select q.persona_id from estook.a_quien_lleva(${localId}::uuid) q)
       and (${soloDe}::uuid is null or f.persona_id = ${soloDe}::uuid)
       and (
         (f.salio_en is null
           and f.entro_en < ${ahora}::timestamptz - make_interval(hours => ${SIN_CERRAR_DESDE_HORAS}))
         or (f.entro_metros is not null and f.entro_metros > ${reloj.radio})
         or f.entro_sin_donde is not null
         or f.por_revisar
       )
  `;

  const deLosFichajes: UnaIncidencia[] = [];
  for (const f of raros) {
    const persona = quien.get(f.persona_id);
    if (persona === undefined) continue;
    const tipos: TipoDeIncidencia[] = [
      ...(f.sin_cerrar ? (['sin_cerrar'] as const) : []),
      ...(f.lejos ? (['lejos'] as const) : []),
      ...(f.sin_ubicacion ? (['sin_ubicacion'] as const) : []),
      ...(f.sin_conexion ? (['sin_conexion'] as const) : []),
    ];
    for (const tipo of tipos) {
      deLosFichajes.push({
        id: `${tipo}:${f.fichaje_id}`,
        tipo,
        personaId: f.persona_id,
        nombre: persona.nombre,
        apellidos: persona.apellidos,
        fecha: f.fecha,
        cuando: f.entro_en,
        entra: null,
        sale: null,
        minutosTarde: null,
        fichoA: f.ficho_a,
        metros: tipo === 'lejos' ? f.metros : null,
        fichajeId: f.fichaje_id,
        justificacion: null,
      });
    }
  }

  const incidencias = [...delHorario, ...deLosFichajes].sort((a, b) =>
    a.cuando < b.cuando ? 1 : a.cuando > b.cuando ? -1 : a.id.localeCompare(b.id),
  );
  return { margen, incidencias, conTurno: new Set(entradas.map((e) => e.fecha)) };
}

// ── La consulta ──────────────────────────────────────────────────────────────

export const entradaLasIncidencias = z
  .object({
    /** Como el Resumen: el periodo por su nombre, y las fechas las pone el servidor. */
    periodo: z.enum(['semana', 'mes', '30']).optional(),
    /** Las de una persona: su ficha. */
    persona_id: z.string().uuid().optional(),
    /** Cuántas como mucho: la ficha enseña cuatro. Sin decirlo, todas las del periodo. */
    limite: z.coerce.number().int().min(1).max(500).optional(),
  })
  .strict();

export type EntradaLasIncidencias = z.infer<typeof entradaLasIncidencias>;

export interface SalidaLasIncidencias {
  readonly desde: string;
  readonly hasta: string;
  readonly margenDeRetraso: number;
  readonly incidencias: readonly UnaIncidencia[];
  /** Todas las del periodo, aunque la lista venga acotada. Sin las justificadas. */
  readonly sinJustificar: number;
  /** Si hay algo publicado en Horarios en el periodo: sin eso, no hay faltas que contar. */
  readonly hayHorarioPublicado: boolean;
  /** Si quien mira puede justificar y corregir. */
  readonly puedeJustificar: boolean;
}

export const lasIncidenciasDelEquipo = consulta<EntradaLasIncidencias, SalidaLasIncidencias>({
  nombre: 'las_incidencias',
  entrada: entradaLasIncidencias,
  exige: 'app.equipo',

  async ejecutar(contexto, entrada) {
    if (!contexto.personaId) throw new FalloDeAplicacion('sin_sesion');
    const localId = contexto.sesion?.localId;
    if (!localId) throw new FalloDeAplicacion('faltan_datos', { porque: 'Elige un local.' });
    const reloj = await elReloj(contexto, localId);

    const hasta = reloj.jornada;
    const desde =
      entrada.periodo === 'semana'
        ? masDias(fechaOperativa(reloj.jornada), -(reloj.diaDeLaSemana - 1))
        : entrada.periodo === 'mes'
          ? `${reloj.jornada.slice(0, 7)}-01`
          : masDias(fechaOperativa(hasta), -29);

    const { margen, incidencias } = await lasIncidencias(
      contexto,
      localId,
      desde,
      hasta,
      entrada.persona_id ?? null,
    );

    const publicado = await contexto.sql<{ hay: boolean; puede: boolean }[]>`
      select exists (
               select 1 from estook.semana_de_horario s
                where s.local_id = ${localId} and s.publicada_en is not null
                  and s.lunes between ${desde}::date - 6 and ${hasta}::date
             ) as hay,
             estook.puede_editar('app.equipo', ${localId}::uuid) as puede
    `;

    return {
      desde,
      hasta,
      margenDeRetraso: margen,
      incidencias:
        entrada.limite === undefined ? incidencias : incidencias.slice(0, entrada.limite),
      sinJustificar: incidencias.filter((i) => i.justificacion === null).length,
      hayHorarioPublicado: publicado[0]?.hay === true,
      puedeJustificar: publicado[0]?.puede === true,
    };
  },
});
