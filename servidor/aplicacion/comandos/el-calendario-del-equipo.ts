import { z } from 'zod';
import {
  fechaOperativa,
  moverloAl,
  PARA_QUIEN,
  ROLES_PARA,
  TIPOS_DE_RECORDATORIO,
} from '@estook/dominio';
import { apuntarLoDelCalendario } from '../al-movil.ts';
import { elLocalDeLaSesion, laOrganizacionDeLaSesion } from '../alta.ts';
import { comando, FalloDeAplicacion, type Contexto } from '../contrato.ts';
import { elReloj } from '../consultas/equipo.ts';
import { enNombreDelSistema } from '../pago.ts';

/**
 * El calendario del equipo (la Ampliación 4 · 3, decisión 0153, sección 5; migración 0131).
 *
 *   poner_recordatorio    el gerente y los jefes: un día o un tramo con aviso, para todos, sala o
 *                         cocina (crear y cambiar)
 *   mover_recordatorio    arrastrarlo a otro día en el mes: dura lo mismo
 *   quitar_recordatorio   quitarlo
 *   poner_mi_nota         una nota de cada uno, con aviso si quiere (crear y cambiar)
 *   quitar_mi_nota        quitarla
 *
 * Los recordatorios los pone **quien edita el Calendario** (los jefes, el gerente y RRHH, 0004):
 * lo mira la puerta (`exige`) y lo vuelve a mirar la base. Las notas, cada uno las suyas: la base
 * no deja ver ni tocar las de otro, tampoco al gerente.
 *
 * Avisar lo hace el reloj (cada hora apunta lo de la hora siguiente). Por si el aviso cae antes
 * del próximo latido, **al ponerlo se apunta ya** si toca dentro de esa hora.
 */

const fecha = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const hora = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

/** Lo que el reloj apunta cada hora: la hora siguiente, con margen para el latido. */
const VENTANA_MS = 75 * 60_000;

async function hoyEnElLocal(contexto: Contexto, localId: string): Promise<string> {
  const reloj = await elReloj(contexto, localId);
  return fechaOperativa(reloj.jornada);
}

function fechaQueExiste(dia: string, campo: string): void {
  if (Number.isNaN(Date.parse(`${dia}T12:00:00Z`))) {
    throw new FalloDeAplicacion('faltan_datos', {
      campos: [campo],
      porque: 'Esa fecha no existe.',
    });
  }
}

/** Si su aviso cae antes del próximo latido del reloj, se apunta ya. */
async function apuntarSiTocaYa(contexto: Contexto, id: string): Promise<void> {
  await enNombreDelSistema(contexto, async () => {
    await apuntarLoDelCalendario(
      contexto,
      contexto.ahora,
      new Date(contexto.ahora.getTime() + VENTANA_MS),
      { soloDe: id },
    );
  });
}

// ═══ Los recordatorios del equipo ═════════════════════════════════════════════

export const entradaPonerRecordatorio = z
  .object({
    /** Para cambiar uno que ya está. Sin esto, se pone uno nuevo. */
    id: z.string().uuid().optional(),
    titulo: z.string().trim().min(1).max(80),
    tipo: z.enum(TIPOS_DE_RECORDATORIO),
    para: z.enum(PARA_QUIEN),
    dia: fecha,
    /** El último día, si dura varios. */
    hasta_el: fecha.optional(),
    /** A qué hora es. Sin esto, todo el día. */
    desde: hora.optional(),
    /** A qué hora avisa, cada día que dura. Sin esto, no avisa. */
    avisa_a: hora.optional(),
    detalle: z.string().trim().min(1).max(200).optional(),
  })
  .strict();
export type EntradaPonerRecordatorio = z.infer<typeof entradaPonerRecordatorio>;

export const ponerRecordatorio = comando<EntradaPonerRecordatorio, { id: string }>({
  nombre: 'poner_recordatorio',
  entrada: entradaPonerRecordatorio,
  exige: 'app.calendario',

  async ejecutar(contexto, entrada) {
    if (!contexto.personaId) throw new FalloDeAplicacion('sin_sesion');
    const localId = elLocalDeLaSesion(contexto);
    fechaQueExiste(entrada.dia, 'dia');
    const hastaEl =
      entrada.hasta_el === undefined || entrada.hasta_el === entrada.dia ? null : entrada.hasta_el;
    if (hastaEl !== null) {
      fechaQueExiste(hastaEl, 'hasta_el');
      if (hastaEl < entrada.dia) {
        throw new FalloDeAplicacion('faltan_datos', {
          campos: ['hasta_el'],
          porque: 'El último día va después del primero.',
        });
      }
      if (
        Date.parse(`${hastaEl}T12:00:00Z`) - Date.parse(`${entrada.dia}T12:00:00Z`) >
        30 * 86_400_000
      ) {
        throw new FalloDeAplicacion('faltan_datos', {
          campos: ['hasta_el'],
          porque: 'Un recordatorio dura un mes como mucho.',
        });
      }
    }
    const hoy = await hoyEnElLocal(contexto, localId);
    if ((hastaEl ?? entrada.dia) < hoy) {
      throw new FalloDeAplicacion('faltan_datos', {
        campos: ['dia'],
        porque: 'Ese día ya ha pasado.',
      });
    }
    const roles = ROLES_PARA[entrada.para];
    const lista = roles === null ? null : `{${roles.join(',')}}`;

    if (entrada.id !== undefined) {
      const cambiados = await contexto.sql<{ id: string }[]>`
        update estook.evento_de_calendario
           set titulo = ${entrada.titulo}, grupo = ${entrada.tipo}, roles = ${lista}::text[],
               dia = ${entrada.dia}::date, hasta_el = ${hastaEl}::date,
               desde = ${entrada.desde ?? null}::time, avisa_a = ${entrada.avisa_a ?? null}::time,
               detalle = ${entrada.detalle ?? null}
         where id = ${entrada.id} and origen = 'recordatorio' and local_id = ${localId}
         returning id::text as id
      `;
      if (cambiados.length === 0) {
        throw new FalloDeAplicacion('no_existe', { porque: 'Ese recordatorio ya no está.' });
      }
      await apuntarSiTocaYa(contexto, entrada.id);
      return { id: entrada.id };
    }

    const id = crypto.randomUUID();
    await contexto.sql`
      insert into estook.evento_de_calendario
        (id, local_id, capa, origen, origen_id, dia, hasta_el, desde, titulo, detalle, ir, grupo,
         roles, avisa_a, publicado_por)
      values (${id}, ${localId}, 'aviso', 'recordatorio', ${id}, ${entrada.dia}::date,
              ${hastaEl}::date, ${entrada.desde ?? null}::time, ${entrada.titulo},
              ${entrada.detalle ?? null}, '/calendario/calendario/equipo', ${entrada.tipo},
              ${lista}::text[], ${entrada.avisa_a ?? null}::time, ${contexto.personaId})
    `;
    await apuntarSiTocaYa(contexto, id);
    return { id };
  },
});

export const moverRecordatorio = comando<
  { id: string; dia: string },
  { dia: string; hastaEl: string | null }
>({
  nombre: 'mover_recordatorio',
  entrada: z.object({ id: z.string().uuid(), dia: fecha }).strict(),
  exige: 'app.calendario',

  async ejecutar(contexto, entrada) {
    const localId = elLocalDeLaSesion(contexto);
    fechaQueExiste(entrada.dia, 'dia');
    const filas = await contexto.sql<{ dia: string; hasta_el: string | null }[]>`
      select to_char(dia, 'YYYY-MM-DD') as dia, to_char(hasta_el, 'YYYY-MM-DD') as hasta_el
        from estook.evento_de_calendario
       where id = ${entrada.id} and origen = 'recordatorio' and local_id = ${localId}
    `;
    const r = filas[0];
    if (r === undefined) {
      throw new FalloDeAplicacion('no_existe', { porque: 'Ese recordatorio ya no está.' });
    }
    if (entrada.dia < (await hoyEnElLocal(contexto, localId))) {
      throw new FalloDeAplicacion('faltan_datos', {
        campos: ['dia'],
        porque: 'No se puede llevar a un día que ya ha pasado.',
      });
    }
    const nuevo = moverloAl(r.dia, r.hasta_el, entrada.dia);
    await contexto.sql`
      update estook.evento_de_calendario
         set dia = ${nuevo.dia}::date, hasta_el = ${nuevo.hastaEl}::date
       where id = ${entrada.id}
    `;
    // Lo apuntado para los días de antes se queda sin aviso solo: al llegar su hora, el reloj
    // vuelve a leerlo y ese día ya no cae. Los nuevos se apuntan como siempre.
    await apuntarSiTocaYa(contexto, entrada.id);
    return { dia: nuevo.dia, hastaEl: nuevo.hastaEl };
  },
});

export const quitarRecordatorio = comando<{ id: string }, { quitado: true }>({
  nombre: 'quitar_recordatorio',
  entrada: z.object({ id: z.string().uuid() }).strict(),
  exige: 'app.calendario',

  async ejecutar(contexto, entrada) {
    const localId = elLocalDeLaSesion(contexto);
    const quitados = await contexto.sql<{ id: string }[]>`
      delete from estook.evento_de_calendario
       where id = ${entrada.id} and origen = 'recordatorio' and local_id = ${localId}
       returning id::text as id
    `;
    if (quitados.length === 0) {
      throw new FalloDeAplicacion('no_existe', { porque: 'Ese recordatorio ya no está.' });
    }
    return { quitado: true };
  },
});

// ═══ Las notas de cada uno ════════════════════════════════════════════════════

export const entradaPonerNota = z
  .object({
    id: z.string().uuid().optional(),
    texto: z.string().trim().min(1).max(200),
    dia: fecha,
    /** A qué hora avisa ese día. Sin esto, no avisa. */
    avisa_a: hora.optional(),
  })
  .strict();
export type EntradaPonerNota = z.infer<typeof entradaPonerNota>;

export const ponerMiNota = comando<EntradaPonerNota, { id: string }>({
  nombre: 'poner_mi_nota',
  entrada: entradaPonerNota,

  async ejecutar(contexto, entrada) {
    if (!contexto.personaId) throw new FalloDeAplicacion('sin_sesion');
    const localId = elLocalDeLaSesion(contexto);
    const organizacionId = laOrganizacionDeLaSesion(contexto);
    fechaQueExiste(entrada.dia, 'dia');
    if (entrada.id !== undefined) {
      const cambiadas = await contexto.sql<{ id: string }[]>`
        update estook.nota_personal
           set texto = ${entrada.texto}, dia = ${entrada.dia}::date,
               avisa_a = ${entrada.avisa_a ?? null}::time
         where id = ${entrada.id} and persona_id = ${contexto.personaId}
         returning id::text as id
      `;
      if (cambiadas.length === 0) {
        throw new FalloDeAplicacion('no_existe', { porque: 'Esa nota ya no está.' });
      }
      await apuntarSiTocaYa(contexto, entrada.id);
      return { id: entrada.id };
    }
    if (entrada.dia < (await hoyEnElLocal(contexto, localId))) {
      throw new FalloDeAplicacion('faltan_datos', {
        campos: ['dia'],
        porque: 'Ese día ya ha pasado.',
      });
    }
    const filas = await contexto.sql<{ id: string }[]>`
      insert into estook.nota_personal (organizacion_id, local_id, persona_id, dia, texto, avisa_a)
      values (${organizacionId}, ${localId}, ${contexto.personaId}, ${entrada.dia}::date,
              ${entrada.texto}, ${entrada.avisa_a ?? null}::time)
      returning id::text as id
    `;
    const id = filas[0]?.id;
    if (id === undefined) throw new FalloDeAplicacion('sin_permiso');
    await apuntarSiTocaYa(contexto, id);
    return { id };
  },
});

export const quitarMiNota = comando<{ id: string }, { quitada: true }>({
  nombre: 'quitar_mi_nota',
  entrada: z.object({ id: z.string().uuid() }).strict(),

  async ejecutar(contexto, entrada) {
    if (!contexto.personaId) throw new FalloDeAplicacion('sin_sesion');
    const quitadas = await contexto.sql<{ id: string }[]>`
      delete from estook.nota_personal
       where id = ${entrada.id} and persona_id = ${contexto.personaId}
       returning id::text as id
    `;
    if (quitadas.length === 0) {
      throw new FalloDeAplicacion('no_existe', { porque: 'Esa nota ya no está.' });
    }
    return { quitada: true };
  },
});
