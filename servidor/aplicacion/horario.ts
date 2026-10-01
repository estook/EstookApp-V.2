import { z } from 'zod';
import {
  comoSeLlamaElDia,
  diaDeLaSemana,
  fechaOperativa,
  horaDeCorte,
  jornadaDe,
  losDiasDeLaSemana,
  lunesDe,
  type FechaOperativa,
  type TipoDeTurno,
  type TurnoDelHorario,
} from '@estook/dominio';
import { FalloDeAplicacion, type Contexto } from './contrato.ts';

/**
 * Las piezas que comparten las consultas y los comandos del horario (H2 · 0069).
 *
 * ── Quién sale en el horario ────────────────────────────────────────────────
 *
 * **Quien ficha en el local**: las personas con acceso vigente a él cuyo puesto
 * tiene `accion.fichar`. Así salen el camarero, el cocinero, los jefes y el gerente,
 * y no la gestoría ni quien solo administra la cuenta, que no trabajan turnos.
 *
 * Y todos, no solo «a quien llevas»: el jefe de sala y el de cocina **llevan los
 * dos horarios** (0010), así que los dos ven a todo el equipo al montarlo.
 */

export type Zona = 'sala' | 'cocina' | 'otros';

/** De qué zona es cada puesto, para separar el horario y filtrarlo. */
export function zonaDelRol(rol: string): Zona {
  if (rol === 'camarero' || rol === 'jefe_de_sala') return 'sala';
  if (rol === 'cocinero' || rol === 'jefe_de_cocina') return 'cocina';
  return 'otros';
}

export interface PersonaDelHorario {
  readonly personaId: string;
  readonly nombre: string;
  readonly apellidos: string | null;
  readonly rolNombre: string;
  readonly zona: Zona;
}

export interface TurnoLeido extends TurnoDelHorario {
  readonly id: string;
  readonly nota: string | null;
}

/** El lunes que se pide, que tiene que ser un lunes. */
export const unLunes = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha se escribe así: 2026-10-05.')
  .refine((f) => diaDeLaSemana(fechaOperativa(f)) === 1, {
    message: 'Una semana del horario empieza en lunes.',
  });

/** El local de la sesión: el horario es de un local. */
export function elLocalDelHorario(contexto: Contexto): string {
  const localId = contexto.sesion?.localId;
  if (!localId) {
    throw new FalloDeAplicacion('faltan_datos', {
      porque: 'El horario es de un local. Elige uno primero.',
    });
  }
  return localId;
}

/**
 * La jornada de hoy en el local y el lunes que toca: el pedido, o el de esta semana.
 * Los decide el servidor con la zona y la hora de corte del local (regla 10).
 */
export async function laSemanaQueToca(
  contexto: Contexto,
  localId: string,
  lunesPedido: string | undefined,
): Promise<{ readonly hoy: FechaOperativa; readonly lunes: FechaOperativa }> {
  const filas = await contexto.sql<{ zona: string; corte: string }[]>`
    select zona_horaria as zona, to_char(hora_de_corte, 'HH24:MI') as corte
      from estook.local where id = ${localId}
  `;
  const fila = filas[0];
  if (fila === undefined) throw new FalloDeAplicacion('local_ajeno');
  const hoy = jornadaDe(contexto.ahora, fila.zona, horaDeCorte(fila.corte));
  return { hoy, lunes: lunesPedido === undefined ? lunesDe(hoy) : fechaOperativa(lunesPedido) };
}

const DIAS_CORTOS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'] as const;

export interface DiaDeLaSemana {
  readonly fecha: string;
  /** «Lun 5». */
  readonly corto: string;
  /** «lunes 5». */
  readonly largo: string;
}

export function losDias(lunes: FechaOperativa): readonly DiaDeLaSemana[] {
  return losDiasDeLaSemana(lunes).map((fecha, i) => {
    const numero = String(Number(fecha.slice(8)));
    return {
      fecha,
      corto: `${DIAS_CORTOS[i] ?? ''} ${numero}`,
      largo: `${comoSeLlamaElDia(i + 1)} ${numero}`,
    };
  });
}

/** El equipo que sale en el horario de un local: quien ficha allí. */
export async function elEquipoDelHorario(
  contexto: Contexto,
  localId: string,
): Promise<readonly PersonaDelHorario[]> {
  const filas = await contexto.sql<
    {
      persona_id: string;
      nombre: string;
      apellidos: string | null;
      rol: string;
      rol_nombre: string;
    }[]
  >`
    select distinct on (p.id)
           p.id::text as persona_id, p.nombre, p.apellidos, r.codigo as rol, r.nombre as rol_nombre
      from estook.membresia m
      join estook.persona p on p.id = m.persona_id
      join estook.rol r on r.codigo = m.rol
      join estook.local l on l.id = ${localId}::uuid
     where m.organizacion_id = l.organizacion_id
       and (
         m.alcance = 'organizacion'
         or (m.alcance = 'area' and l.area_id = m.area_id)
         or (m.alcance = 'local' and l.id = m.local_id)
       )
       and p.activa
       and m.desde <= current_date
       and (m.hasta is null or m.hasta >= current_date)
       and (m.revocada_en is null or m.revocada_en > now())
       and exists (
         select 1 from estook.permiso_de_rol pr
          where pr.rol = m.rol and pr.permiso = 'accion.fichar' and pr.nivel = 'ver_y_editar'
       )
     order by p.id, r.amplitud desc
  `;
  const orden: Readonly<Record<Zona, number>> = { sala: 0, cocina: 1, otros: 2 };
  return filas
    .map((f) => ({
      personaId: f.persona_id,
      nombre: f.nombre,
      apellidos: f.apellidos,
      rolNombre: f.rol_nombre,
      zona: zonaDelRol(f.rol),
    }))
    .sort((a, b) => orden[a.zona] - orden[b.zona] || a.nombre.localeCompare(b.nombre, 'es'));
}

export interface LaSemana {
  readonly id: string;
  readonly publicadaEn: string | null;
  readonly publicadaPor: string | null;
  readonly vecesPublicada: number;
  /** Si el borrador ha cambiado después de publicar: hay cosas que el equipo no ve. */
  readonly conCambios: boolean;
}

/** La semana de un local, si existe. */
export async function laSemana(
  contexto: Contexto,
  localId: string,
  lunes: FechaOperativa,
): Promise<LaSemana | null> {
  const filas = await contexto.sql<
    {
      id: string;
      publicada_en: string | null;
      publicada_por: string | null;
      veces: number;
      con_cambios: boolean;
    }[]
  >`
    select s.id::text as id,
           to_char(s.publicada_en, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as publicada_en,
           (select p.nombre from estook.persona p where p.id = s.publicada_por) as publicada_por,
           s.veces_publicada as veces,
           (s.publicada_en is not null and s.cambiada_en > s.publicada_en) as con_cambios
      from estook.semana_de_horario s
     where s.local_id = ${localId} and s.lunes = ${lunes}::date
  `;
  const fila = filas[0];
  if (fila === undefined) return null;
  return {
    id: fila.id,
    publicadaEn: fila.publicada_en,
    publicadaPor: fila.publicada_por,
    vecesPublicada: fila.veces,
    conCambios: fila.con_cambios,
  };
}

/** La semana, creándola en borrador si todavía no existe. */
export async function laSemanaParaMontar(
  contexto: Contexto,
  localId: string,
  organizacionId: string,
  lunes: FechaOperativa,
): Promise<string> {
  const filas = await contexto.sql<{ id: string }[]>`
    insert into estook.semana_de_horario (organizacion_id, local_id, lunes, creado_por)
    values (${organizacionId}, ${localId}, ${lunes}::date, ${contexto.personaId})
    on conflict (local_id, lunes) do update set cambiada_en = now()
    returning id::text as id
  `;
  const fila = filas[0];
  if (fila === undefined) throw new FalloDeAplicacion('sin_permiso');
  return fila.id;
}

/** Apunta que el borrador ha cambiado: desde ahí, hay cosas que el equipo no ve. */
export async function apuntarQueCambia(contexto: Contexto, semanaId: string): Promise<void> {
  await contexto.sql`
    update estook.semana_de_horario set cambiada_en = now(), actualizado_en = now()
     where id = ${semanaId}::uuid
  `;
}

interface FilaDeTurno {
  id: string;
  persona_id: string;
  dia: string;
  tipo: TipoDeTurno;
  entra: string | null;
  sale: string | null;
  descanso: number;
  nota: string | null;
}

function comoTurno(f: FilaDeTurno): TurnoLeido {
  return {
    id: f.id,
    personaId: f.persona_id,
    dia: f.dia,
    tipo: f.tipo,
    entra: f.entra,
    sale: f.sale,
    descansoMinutos: f.descanso,
    nota: f.nota,
  };
}

/** Los tramos del borrador de una semana. Solo los lee quien monta el horario. */
export async function elBorrador(contexto: Contexto, semanaId: string): Promise<TurnoLeido[]> {
  const filas = await contexto.sql<FilaDeTurno[]>`
    select t.id::text as id, t.persona_id::text as persona_id,
           to_char(t.dia, 'YYYY-MM-DD') as dia, t.tipo::text as tipo,
           to_char(t.entra, 'HH24:MI') as entra, to_char(t.sale, 'HH24:MI') as sale,
           t.descanso_minutos as descanso, t.nota
      from estook.turno t
     where t.semana_id = ${semanaId}::uuid
     order by t.dia, t.entra nulls first
  `;
  return filas.map(comoTurno);
}

/** Lo publicado de una semana: lo que ve el equipo. */
export async function loPublicado(contexto: Contexto, semanaId: string): Promise<TurnoLeido[]> {
  const filas = await contexto.sql<FilaDeTurno[]>`
    select t.id::text as id, t.persona_id::text as persona_id,
           to_char(t.dia, 'YYYY-MM-DD') as dia, t.tipo::text as tipo,
           to_char(t.entra, 'HH24:MI') as entra, to_char(t.sale, 'HH24:MI') as sale,
           t.descanso_minutos as descanso, t.nota
      from estook.turno_publicado t
     where t.semana_id = ${semanaId}::uuid
     order by t.dia, t.entra nulls first
  `;
  return filas.map(comoTurno);
}

/** «Rosa I.», como se dice alguien en una casilla pequeña. */
export function nombreCorto(persona: { nombre: string; apellidos: string | null }): string {
  return persona.apellidos === null || persona.apellidos === ''
    ? persona.nombre
    : `${persona.nombre} ${persona.apellidos.charAt(0)}.`;
}
