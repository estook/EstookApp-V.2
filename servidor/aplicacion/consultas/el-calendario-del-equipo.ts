import { z } from 'zod';
import {
  fechaOperativa,
  paraQuienDe,
  type ParaQuien,
  type TipoDeRecordatorio,
} from '@estook/dominio';
import { elLocalDeLaSesion } from '../alta.ts';
import { consulta, FalloDeAplicacion, type Contexto } from '../contrato.ts';
import { elReloj } from './equipo.ts';

/**
 * El calendario del equipo, leído (la Ampliación 4 · 3, decisión 0153; migración 0131).
 *
 *   el_calendario_del_equipo   Calendario › Equipo: los recordatorios de un tramo de días. Cada uno
 *                              ve los que le tocan (lo filtra la base por sus roles); quien edita
 *                              el Calendario, todos, y puede ponerlos
 *   mis_notas                  Calendario › Personal: mis notas de hoy en adelante, y lo del equipo
 *                              que me toca en las dos semanas que vienen
 *
 * Las vacaciones de la gente **no salen en Equipo** (Richi, 24-nov): cada uno ve las suyas en
 * Personal, y quien las gestiona, en Propuestas.
 */

const fecha = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export interface UnRecordatorio {
  readonly id: string;
  readonly titulo: string;
  readonly tipo: TipoDeRecordatorio;
  readonly para: ParaQuien;
  readonly dia: string;
  readonly hastaEl: string | null;
  /** «10:00», o nulo si es todo el día. */
  readonly desde: string | null;
  /** «09:00», o nulo si no avisa. */
  readonly avisaA: string | null;
  readonly detalle: string | null;
  readonly puestoPor: string | null;
}

interface FilaDeRecordatorio {
  id: string;
  titulo: string;
  grupo: TipoDeRecordatorio;
  roles: string | null;
  dia: string;
  hasta_el: string | null;
  desde: string | null;
  avisa_a: string | null;
  detalle: string | null;
  puesto_por: string | null;
}

function comoRecordatorio(f: FilaDeRecordatorio): UnRecordatorio {
  return {
    id: f.id,
    titulo: f.titulo,
    tipo: f.grupo,
    para: paraQuienDe(f.roles === null || f.roles === '' ? null : f.roles.split(',')),
    dia: f.dia,
    hastaEl: f.hasta_el,
    desde: f.desde,
    avisaA: f.avisa_a,
    detalle: f.detalle,
    puestoPor: f.puesto_por,
  };
}

async function losRecordatorios(
  contexto: Contexto,
  localId: string,
  desde: string,
  hasta: string,
  soloLosMios: boolean,
): Promise<UnRecordatorio[]> {
  const filas = await contexto.sql<FilaDeRecordatorio[]>`
    select e.id::text as id, e.titulo, e.grupo, array_to_string(e.roles, ',') as roles,
           to_char(e.dia, 'YYYY-MM-DD') as dia, to_char(e.hasta_el, 'YYYY-MM-DD') as hasta_el,
           to_char(e.desde, 'HH24:MI') as desde, to_char(e.avisa_a, 'HH24:MI') as avisa_a,
           e.detalle, p.nombre as puesto_por
      from estook.evento_de_calendario e
      left join estook.persona p on p.id = e.publicado_por
     where e.local_id = ${localId} and e.capa = 'aviso' and e.origen = 'recordatorio'
       and e.dia <= ${hasta}::date and coalesce(e.hasta_el, e.dia) >= ${desde}::date
       and (
         not ${soloLosMios}
         or coalesce(cardinality(e.roles), 0) = 0
         or e.roles && estook.mis_roles_en(e.local_id)
       )
     order by e.dia, e.desde nulls first, e.titulo
     limit 500
  `;
  return filas.map(comoRecordatorio);
}

async function hoyEnElLocal(contexto: Contexto, localId: string): Promise<string> {
  const reloj = await elReloj(contexto, localId);
  return fechaOperativa(reloj.jornada);
}

function masDias(fecha: string, dias: number): string {
  return new Date(Date.parse(`${fecha}T12:00:00Z`) + dias * 86_400_000).toISOString().slice(0, 10);
}

// ═══ Equipo ═══════════════════════════════════════════════════════════════════

export interface ElCalendarioDelEquipo {
  readonly hoy: string;
  /** Lo que viene de hoy en adelante (seis semanas), para «Próximos». */
  readonly proximos: readonly UnRecordatorio[];
  /** Si puede poner, cambiar y mover recordatorios: quien edita el Calendario. */
  readonly puedePoner: boolean;
  readonly recordatorios: readonly UnRecordatorio[];
}

/** El mes que pinta la pantalla: de su primer lunes, seis semanas. */
function lasSemanasDelMes(hoy: string): { desde: string; hasta: string } {
  const primero = `${hoy.slice(0, 7)}-01`;
  const deJs = new Date(`${primero}T12:00:00Z`).getUTCDay();
  const desde = masDias(primero, 1 - (deJs === 0 ? 7 : deJs));
  return { desde, hasta: masDias(desde, 41) };
}

export const elCalendarioDelEquipo = consulta<
  { desde?: string | undefined; hasta?: string | undefined },
  ElCalendarioDelEquipo
>({
  nombre: 'el_calendario_del_equipo',
  // Sin días, las semanas del mes de hoy en el local: el navegador no decide qué día es (regla 10).
  entrada: z.object({ desde: fecha.optional(), hasta: fecha.optional() }).strict(),
  exige: 'app.calendario',

  async ejecutar(contexto, entrada) {
    if (!contexto.personaId) throw new FalloDeAplicacion('sin_sesion');
    const localId = elLocalDeLaSesion(contexto);
    const hoy = await hoyEnElLocal(contexto, localId);
    const { desde, hasta } =
      entrada.desde !== undefined && entrada.hasta !== undefined
        ? { desde: entrada.desde, hasta: entrada.hasta }
        : lasSemanasDelMes(hoy);
    if (hasta < desde || hasta > masDias(desde, 62)) {
      throw new FalloDeAplicacion('faltan_datos', {
        campos: ['hasta'],
        porque: 'Se piden dos meses como mucho.',
      });
    }
    const puede = await contexto.sql<{ si: boolean }[]>`
      select estook.puede_editar('app.calendario', ${localId}::uuid) as si
    `;
    return {
      hoy,
      puedePoner: puede[0]?.si === true,
      recordatorios: await losRecordatorios(contexto, localId, desde, hasta, false),
      proximos: (await losRecordatorios(contexto, localId, hoy, masDias(hoy, 42), false)).slice(
        0,
        30,
      ),
    };
  },
});

// ═══ Mis notas ════════════════════════════════════════════════════════════════

export interface UnaNota {
  readonly id: string;
  readonly dia: string;
  readonly texto: string;
  readonly avisaA: string | null;
}

export interface MisNotas {
  readonly hoy: string;
  /** De hoy en adelante, la más cercana primero. */
  readonly notas: readonly UnaNota[];
  /** Lo del equipo que me toca en las dos semanas que vienen (la cata de hoy, la limpieza…). */
  readonly delEquipo: readonly UnRecordatorio[];
}

export const misNotas = consulta<Record<string, never>, MisNotas>({
  nombre: 'mis_notas',
  entrada: z.object({}).strict(),

  async ejecutar(contexto) {
    if (!contexto.personaId) throw new FalloDeAplicacion('sin_sesion');
    const localId = elLocalDeLaSesion(contexto);
    const hoy = await hoyEnElLocal(contexto, localId);
    const notas = await contexto.sql<
      { id: string; dia: string; texto: string; avisa_a: string | null }[]
    >`
      select id::text as id, to_char(dia, 'YYYY-MM-DD') as dia, texto,
             to_char(avisa_a, 'HH24:MI') as avisa_a
        from estook.nota_personal
       where persona_id = ${contexto.personaId} and dia >= ${hoy}::date
       order by dia, avisa_a nulls last, creada_en, id
       limit 100
    `;
    const veElCalendario = await contexto.sql<{ si: boolean }[]>`
      select estook.puede_ver('app.calendario', ${localId}::uuid) as si
    `;
    return {
      hoy,
      notas: notas.map((n) => ({ id: n.id, dia: n.dia, texto: n.texto, avisaA: n.avisa_a })),
      delEquipo:
        veElCalendario[0]?.si === true
          ? await losRecordatorios(contexto, localId, hoy, masDias(hoy, 14), true)
          : [],
    };
  },
});
