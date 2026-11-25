import { z } from 'zod';
import type { SaldoDeVacaciones, VacacionesEn } from '@estook/dominio';
import { elLocalDeLaSesion, laOrganizacionDeLaSesion } from '../alta.ts';
import { consulta, FalloDeAplicacion, type Contexto } from '../contrato.ts';
import { elEquipoDelHorario, type Zona } from '../horario.ts';
import { hoyEnElLocal, laFichaDeSusVacaciones } from '../vacaciones.ts';

/**
 * Las vacaciones, leídas (la Ampliación 4 · 2, decisión 0153).
 *
 *   mis_vacaciones              Calendario › Personal: mi saldo, lo que puedo pedir y mis peticiones
 *   las_vacaciones_del_equipo   Calendario › Propuestas: lo pedido por mi gente, con quién coincide y
 *                               cuántos quedarían cada día si se aprueba
 */

export interface UnaSolicitud {
  readonly id: string;
  readonly desde: string;
  readonly hasta: string;
  readonly dias: number;
  readonly estado: 'pedida' | 'aprobada' | 'rechazada' | 'contrapropuesta' | 'retirada';
  readonly nota: string | null;
  readonly motivo: string | null;
  readonly propuestaDesde: string | null;
  readonly propuestaHasta: string | null;
  readonly decididaPor: string | null;
  readonly pedidaEn: string;
}

interface FilaDeSolicitud {
  id: string;
  persona_id: string;
  desde: string;
  hasta: string;
  dias: string;
  estado: UnaSolicitud['estado'];
  nota: string | null;
  motivo: string | null;
  propuesta_desde: string | null;
  propuesta_hasta: string | null;
  decidida_por: string | null;
  pedida_en: string;
}

function comoSolicitud(f: FilaDeSolicitud): UnaSolicitud {
  return {
    id: f.id,
    desde: f.desde,
    hasta: f.hasta,
    dias: Number(f.dias),
    estado: f.estado,
    nota: f.nota,
    motivo: f.motivo,
    propuestaDesde: f.propuesta_desde,
    propuestaHasta: f.propuesta_hasta,
    decididaPor: f.decidida_por,
    pedidaEn: f.pedida_en,
  };
}

async function lasSolicitudes(
  contexto: Contexto,
  donde: { persona?: string; local?: string; estados: readonly string[] },
): Promise<FilaDeSolicitud[]> {
  return contexto.sql<FilaDeSolicitud[]>`
    select s.id::text as id, s.persona_id::text as persona_id,
           to_char(s.desde, 'YYYY-MM-DD') as desde, to_char(s.hasta, 'YYYY-MM-DD') as hasta,
           s.dias::text as dias, s.estado, s.nota, s.motivo,
           to_char(s.propuesta_desde, 'YYYY-MM-DD') as propuesta_desde,
           to_char(s.propuesta_hasta, 'YYYY-MM-DD') as propuesta_hasta,
           p.nombre as decidida_por,
           to_char(s.pedida_en, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as pedida_en
      from estook.solicitud_de_vacaciones s
      left join estook.persona p on p.id = s.decidida_por
     where (${donde.persona ?? null}::uuid is null or s.persona_id = ${donde.persona ?? null}::uuid)
       and (${donde.local ?? null}::uuid is null or s.local_id = ${donde.local ?? null}::uuid)
       and s.estado = any (${`{${donde.estados.join(',')}}`}::text[])
     order by s.desde desc, s.pedida_en desc
     limit 200
  `;
}

// ═══ Mis vacaciones ═══════════════════════════════════════════════════════════

export interface MisVacaciones {
  readonly hoy: string;
  readonly vacacionesEn: VacacionesEn;
  readonly saldo: SaldoDeVacaciones | null;
  /** Lo pedido y sin contestar. */
  readonly pedidas: number;
  /** Lo que se puede pedir todavía: lo disponible menos lo pedido. Nulo sin ficha. */
  readonly sePuedenPedir: number | null;
  readonly solicitudes: readonly UnaSolicitud[];
  /** Si gestiona las de alguien: para enseñarle Propuestas. */
  readonly gestiona: boolean;
}

export const misVacaciones = consulta<Record<string, never>, MisVacaciones>({
  nombre: 'mis_vacaciones',
  entrada: z.object({}).strict(),

  async ejecutar(contexto) {
    if (!contexto.personaId) throw new FalloDeAplicacion('sin_sesion');
    const localId = elLocalDeLaSesion(contexto);
    const organizacionId = laOrganizacionDeLaSesion(contexto);
    const hoy = await hoyEnElLocal(contexto, localId);
    const ficha = await laFichaDeSusVacaciones(contexto, contexto.personaId, organizacionId, hoy);
    const filas = await lasSolicitudes(contexto, {
      persona: contexto.personaId,
      estados: ['pedida', 'aprobada', 'rechazada', 'contrapropuesta'],
    });
    const gestiona = await contexto.sql<{ si: boolean }[]>`
      select estook.puede_editar('accion.gestionar_vacaciones', ${localId}::uuid) as si
    `;
    return {
      hoy,
      vacacionesEn: ficha.vacacionesEn,
      saldo: ficha.saldo,
      pedidas: ficha.pedidas,
      sePuedenPedir: ficha.sePuedenPedir,
      solicitudes: filas.map(comoSolicitud),
      gestiona: gestiona[0]?.si === true,
    };
  },
});

// ═══ Las del equipo ═══════════════════════════════════════════════════════════

export interface UnaPeticionDelEquipo extends UnaSolicitud {
  readonly personaId: string;
  readonly nombre: string;
  readonly apellidos: string | null;
  readonly zona: Zona;
  readonly rolNombre: string;
  /** Lo que le quedaría por pedir si se aprueba (nulo si su ficha no lo dice). */
  readonly leQuedarian: number | null;
  /** Otras vacaciones de su zona (aprobadas o pedidas) que se pisan con estas. */
  readonly coincidencias: readonly {
    readonly nombre: string;
    readonly desde: string;
    readonly hasta: string;
    readonly estado: 'aprobada' | 'pedida';
  }[];
  /** El peor día: cuántos de su zona quedarían trabajando si se aprueba, y de cuántos. */
  readonly quedan: { readonly fecha: string; readonly quedan: number; readonly de: number } | null;
  /** Si empiezan dentro de menos de dos meses (la ley pide saberlas con dos meses: avisa, no impide). */
  readonly conPocoMargen: boolean;
}

export interface LasVacacionesDelEquipo {
  readonly hoy: string;
  readonly pendientes: readonly UnaPeticionDelEquipo[];
  /** Las aprobadas que vienen, para verlas de un vistazo. */
  readonly proximas: readonly (UnaSolicitud & {
    readonly personaId: string;
    readonly nombre: string;
    readonly zona: Zona;
  })[];
  /** A quién puede ponerle vacaciones: su gente. */
  readonly equipo: readonly {
    readonly personaId: string;
    readonly nombre: string;
    readonly apellidos: string | null;
  }[];
}

function masDias(fecha: string, dias: number): string {
  return new Date(Date.parse(`${fecha}T12:00:00Z`) + dias * 86_400_000).toISOString().slice(0, 10);
}

function seMontan(
  a: { desde: string; hasta: string },
  b: { desde: string; hasta: string },
): boolean {
  return a.desde <= b.hasta && b.desde <= a.hasta;
}

export const lasVacacionesDelEquipo = consulta<Record<string, never>, LasVacacionesDelEquipo>({
  nombre: 'las_vacaciones_del_equipo',
  entrada: z.object({}).strict(),
  exige: 'accion.gestionar_vacaciones',

  async ejecutar(contexto) {
    if (!contexto.personaId) throw new FalloDeAplicacion('sin_sesion');
    const localId = elLocalDeLaSesion(contexto);
    const organizacionId = laOrganizacionDeLaSesion(contexto);
    const hoy = await hoyEnElLocal(contexto, localId);

    // Su gente: a quien lleva en este local (la base lo dice), sin él.
    const llevo = await contexto.sql<{ persona_id: string }[]>`
      select q.persona_id::text as persona_id from estook.a_quien_lleva(${localId}::uuid) q
    `;
    const suyos = new Set(llevo.map((f) => f.persona_id).filter((id) => id !== contexto.personaId));
    const equipo = (await elEquipoDelHorario(contexto, localId)).filter((p) =>
      suyos.has(p.personaId),
    );
    const deQuien = new Map(equipo.map((p) => [p.personaId, p] as const));

    const filas = (
      await lasSolicitudes(contexto, { local: localId, estados: ['pedida', 'aprobada'] })
    ).filter((f) => suyos.has(f.persona_id));
    const pendientes = filas.filter((f) => f.estado === 'pedida');
    const aprobadas = filas.filter((f) => f.estado === 'aprobada');
    // Para las coincidencias y los que quedan: las de todo el local, también de quien no llevo.
    const deTodos = await contexto.sql<{ persona_id: string; desde: string; hasta: string }[]>`
      select persona_id::text as persona_id, to_char(desde, 'YYYY-MM-DD') as desde,
             to_char(hasta, 'YYYY-MM-DD') as hasta
        from estook.vacaciones_aprobadas(${localId}::uuid, ${hoy}::date, ${masDias(hoy, 400)}::date)
    `;
    const todoElLocal = await elEquipoDelHorario(contexto, localId);
    const zonaDe = new Map(todoElLocal.map((p) => [p.personaId, p.zona] as const));
    const nombreDe = new Map(todoElLocal.map((p) => [p.personaId, p.nombre] as const));

    const resultado: UnaPeticionDelEquipo[] = [];
    for (const f of pendientes) {
      const p = deQuien.get(f.persona_id);
      if (p === undefined) continue;
      const ficha = await laFichaDeSusVacaciones(contexto, f.persona_id, organizacionId, hoy);
      const coincidencias = [
        ...deTodos
          .filter(
            (o) =>
              o.persona_id !== f.persona_id &&
              zonaDe.get(o.persona_id) === p.zona &&
              seMontan(o, f),
          )
          .map((o) => ({
            nombre: nombreDe.get(o.persona_id) ?? 'Alguien',
            desde: o.desde,
            hasta: o.hasta,
            estado: 'aprobada' as const,
          })),
        ...pendientes
          .filter((o) => o.id !== f.id && zonaDe.get(o.persona_id) === p.zona && seMontan(o, f))
          .map((o) => ({
            nombre: nombreDe.get(o.persona_id) ?? 'Alguien',
            desde: o.desde,
            hasta: o.hasta,
            estado: 'pedida' as const,
          })),
      ];
      // El peor día: los de su zona, menos los de vacaciones aprobadas ese día, menos él.
      const deSuZona = todoElLocal.filter((o) => o.zona === p.zona).length;
      let peor: UnaPeticionDelEquipo['quedan'] = null;
      for (
        let dia = f.desde;
        dia <= f.hasta && dia <= masDias(f.desde, 62);
        dia = masDias(dia, 1)
      ) {
        const fuera = deTodos.filter(
          (o) =>
            zonaDe.get(o.persona_id) === p.zona &&
            o.persona_id !== f.persona_id &&
            o.desde <= dia &&
            o.hasta >= dia,
        ).length;
        const quedan = Math.max(deSuZona - fuera - 1, 0);
        if (peor === null || quedan < peor.quedan) peor = { fecha: dia, quedan, de: deSuZona };
      }
      resultado.push({
        ...comoSolicitud(f),
        personaId: f.persona_id,
        nombre: p.nombre,
        apellidos: p.apellidos,
        zona: p.zona,
        rolNombre: p.rolNombre,
        leQuedarian: ficha.sePuedenPedir === null ? null : Number(ficha.sePuedenPedir.toFixed(2)),
        coincidencias,
        quedan: peor,
        conPocoMargen: f.desde < masDias(hoy, 60),
      });
    }

    return {
      hoy,
      pendientes: resultado.sort((a, b) => a.desde.localeCompare(b.desde)),
      proximas: aprobadas
        .filter((f) => f.hasta >= hoy)
        .sort((a, b) => a.desde.localeCompare(b.desde))
        .map((f) => ({
          ...comoSolicitud(f),
          personaId: f.persona_id,
          nombre: deQuien.get(f.persona_id)?.nombre ?? 'Alguien',
          zona: deQuien.get(f.persona_id)?.zona ?? 'otros',
        })),
      equipo: equipo.map((p) => ({
        personaId: p.personaId,
        nombre: p.nombre,
        apellidos: p.apellidos,
      })),
    };
  },
});
