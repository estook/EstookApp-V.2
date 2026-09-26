import { z } from 'zod';
import {
  cuandoCae,
  fechaEnElLocal,
  fechaOperativa,
  masDias,
  type FechaOperativa,
} from '@estook/dominio';
import { consulta, FalloDeAplicacion, type Contexto } from '../contrato.ts';
import { comoLista } from '../listas.ts';
import { loQuePuede } from '../lo-que-puede.ts';

/**
 * El Tablón del local (repaso del 25-sep · decisión 0049).
 *
 * «Poder poner mensajes compartidos y avisos tipo reservas: "reserva a las 5:00 de
 * 20 personas", y marcas como leído.» (Richi) Es el corcho de la cocina, en la
 * app: notas del equipo para un día, para todos o para cocina o sala, con hora si
 * la tienen.
 *
 * Lo que devuelve: las de hoy y los próximos siete días, que es lo que se mira en
 * un turno —«mañana viene un grupo de 30»—. Las de días pasados no se enseñan: no
 * se borran, dejan de estar en el corcho.
 *
 * **Quién la ha leído** lo ve quien la escribió y quien lleva al equipo, que es
 * para lo que sirve saberlo; y **quién falta**, solo quien lleva al equipo, que es
 * quien ve la plantilla (y de ella, a quien lleva: un jefe de cocina, su cocina).
 * Quién ve cada nota lo decide la política de la tabla, no esta consulta.
 */

export interface LecturaDeLaNota {
  readonly leidas: number;
  /** Quién la ha leído, por su nombre. */
  readonly quien: readonly string[];
  /** Quién no, si quien pregunta lleva al equipo. Nulo si no lo puede saber. */
  readonly faltan: readonly string[] | null;
}

export interface NotaDelTablon {
  readonly id: string;
  readonly texto: string;
  /** Para quién: toda la plantilla (nulo), la cocina o la sala. */
  readonly zona: 'cocina' | 'sala' | null;
  readonly dia: string;
  /** «Hoy», «Mañana», «El viernes». */
  readonly cuando: string;
  /** «17:00», si la tiene. */
  readonly hora: string | null;
  readonly autor: string;
  readonly esMia: boolean;
  /** Si quien pregunta ya la ha leído. La suya cuenta como leída. */
  readonly leida: boolean;
  readonly puedeQuitarla: boolean;
  /** Para su autor y para quien lleva al equipo. */
  readonly lectura: LecturaDeLaNota | null;
}

export interface SalidaElTablon {
  readonly hoy: string;
  readonly notas: readonly NotaDelTablon[];
}

/** Lo que se ve del corcho: hoy y una semana por delante. */
const DIAS_POR_DELANTE = 7;

export function elLocalDelTablon(contexto: Contexto): string {
  const localId = contexto.sesion?.localId;
  if (!localId) {
    throw new FalloDeAplicacion('faltan_datos', {
      porque: 'Hay que estar dentro de un local para ver su tablón. Elige uno primero.',
    });
  }
  return localId;
}

/** El día del calendario de pared en el local: una reserva es del día que dice la agenda. */
export async function hoyEnElLocal(contexto: Contexto, localId: string): Promise<FechaOperativa> {
  const filas = await contexto.sql<{ zona_horaria: string }[]>`
    select zona_horaria from estook.local where id = ${localId}
  `;
  return fechaEnElLocal(contexto.ahora, filas[0]?.zona_horaria ?? 'Europe/Madrid');
}

export const elTablon = consulta<Record<string, never>, SalidaElTablon>({
  nombre: 'el_tablon',
  entrada: z.object({}).strict(),

  async ejecutar(contexto) {
    const localId = elLocalDelTablon(contexto);
    const hoy = await hoyEnElLocal(contexto, localId);
    const hasta = masDias(hoy, DIAS_POR_DELANTE);
    const puede = await loQuePuede(contexto, localId, ['app.equipo']);
    const llevaAlEquipo = puede.ver('app.equipo');

    const filas = await contexto.sql<
      {
        id: string;
        texto: string;
        zona: 'cocina' | 'sala' | null;
        dia: string;
        hora: string | null;
        autor_id: string;
        autor: string;
        leida: boolean;
      }[]
    >`
      select n.id, n.texto, n.zona::text as zona, to_char(n.dia, 'YYYY-MM-DD') as dia,
             to_char(n.hora, 'HH24:MI') as hora, n.autor_id::text as autor_id,
             coalesce(p.nombre, 'Alguien') as autor,
             exists (
               select 1 from estook.nota_leida l
                where l.nota_id = n.id and l.persona_id = ${contexto.personaId}
             ) as leida
        from estook.nota_del_tablon n
        left join estook.persona p on p.id = n.autor_id
       where n.local_id = ${localId}
         and n.quitada_en is null
         and n.dia between ${hoy}::date and ${hasta}::date
       order by n.dia, n.hora nulls first, n.creada_en desc
       limit 50
    `;

    // Quién la ha leído, de las que puede saberlo quien pregunta: la política de
    // `nota_leida` solo le da las suyas y las que escribió (o todas, si lleva al
    // equipo). Por nombre, que es como se dice en una cocina.
    const ids = filas.map((f) => f.id);
    const lecturas =
      ids.length === 0
        ? []
        : await contexto.sql<{ nota_id: string; persona_id: string; nombre: string | null }[]>`
            select l.nota_id::text as nota_id, l.persona_id::text as persona_id, p.nombre
              from estook.nota_leida l
              left join estook.persona p on p.id = l.persona_id
             where l.nota_id = any (${comoLista(ids)}::text::uuid[])
             order by l.leida_en
          `;

    // Y a quién va, solo para quien lleva al equipo: las personas del local que
    // lleva (`a_quien_lleva`, la misma cuenta que la lista de Equipo). Una nota de
    // cocina no espera a la sala, y al revés: el camarero no lleva la cocina, y el
    // cocinero no lleva la sala, como en `zonas_que_ve`.
    const plantilla = llevaAlEquipo
      ? await contexto.sql<{ id: string; nombre: string; rol: string }[]>`
          select distinct on (p.id) p.id::text as id, p.nombre, m.rol::text as rol
            from estook.membresia m
            join estook.persona p on p.id = m.persona_id
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
             and p.id in (select q.persona_id from estook.a_quien_lleva(${localId}::uuid) q)
           order by p.id
        `
      : [];

    const notas = filas.map((f): NotaDelTablon => {
      const esMia = f.autor_id === contexto.personaId;
      const suyas = lecturas.filter((l) => l.nota_id === f.id);
      const leyeron = new Set(suyas.map((l) => l.persona_id));
      const cuando = cuandoCae(fechaOperativa(f.dia), hoy);
      const faltan = llevaAlEquipo
        ? plantilla
            .filter((p) => p.id !== f.autor_id && !leyeron.has(p.id))
            .filter((p) => laNotaLeToca(f.zona, p.rol))
            .map((p) => p.nombre)
        : null;
      return {
        id: f.id,
        texto: f.texto,
        zona: f.zona,
        dia: f.dia,
        cuando: cuando.charAt(0).toUpperCase() + cuando.slice(1),
        hora: f.hora,
        autor: f.autor,
        esMia,
        leida: esMia || f.leida,
        puedeQuitarla: esMia || llevaAlEquipo,
        lectura:
          esMia || llevaAlEquipo
            ? {
                leidas: suyas.length,
                quien: suyas.map((l) => l.nombre ?? 'Alguien'),
                faltan,
              }
            : null,
      };
    });

    return { hoy, notas };
  },
});

/** Si una nota de cocina o de sala le toca a este puesto (como `zonas_que_ve`). */
function laNotaLeToca(zona: 'cocina' | 'sala' | null, rol: string): boolean {
  if (zona === null) return true;
  if (rol === 'cocinero') return zona === 'cocina';
  if (rol === 'camarero') return zona === 'sala';
  return true;
}
