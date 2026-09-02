import { z } from 'zod';
import type { Sql } from '../../infraestructura/postgres.ts';
import { consulta, FalloDeAplicacion } from '../contrato.ts';

/**
 * La pantalla «Mi acceso» (M4).
 *
 * «Ajustes → **Mi acceso** (contrasena, PIN, doble factor, mis dispositivos)»
 * (Manifiesto 23). Las cuatro cosas, en una consulta, porque son una pantalla.
 *
 * ── Lo que NO devuelve, y es la mitad de lo que hace bien ────────────────────
 *
 * Ni la contrasena, ni su derivada, ni el PIN, ni la huella del PIN, ni el
 * secreto del segundo factor, ni el token de ninguna sesion. **Nada de lo que
 * viaja de aqui sirve para entrar.** Se dice si hay contrasena y de cuando es;
 * si hay PIN y en que local; si el segundo factor esta puesto y cuantos codigos
 * de respaldo quedan. Y ya.
 *
 * Es la misma idea que el motor de permisos de M2: el servidor no envia lo que no
 * hace falta enviar. Un campo con el secreto dentro «solo para la pantalla de
 * ajustes» es un secreto en el navegador de cualquiera que abra ajustes.
 */
export interface MiAcceso {
  readonly contrasena: {
    readonly puesta: boolean;
    readonly cambiadaEn: string | null;
    readonly laPusoOtraPersona: boolean;
  };
  readonly pines: readonly {
    readonly localId: string;
    readonly local: string;
    readonly creadoEn: string;
    readonly bloqueadoHasta: string | null;
  }[];
  readonly dobleFactor: {
    readonly activo: boolean;
    readonly empezadoSinTerminar: boolean;
    readonly codigosDeRespaldoQueQuedan: number;
    /** Si la organizacion lo exige, no se puede quitar. */
    readonly loExigeLaOrganizacion: boolean;
  };
  readonly sesiones: readonly {
    readonly id: string;
    readonly esLaDeAhora: boolean;
    readonly entroCon: string;
    readonly creadaEn: string;
    readonly ultimaActividadEn: string;
    readonly local: string | null;
  }[];
}

export const miAcceso = consulta<Record<string, never>, MiAcceso>({
  nombre: 'mi_acceso',
  entrada: z.object({}).strict(),

  async ejecutar({ sql, sesion }) {
    if (sesion === null) throw new FalloDeAplicacion('sin_sesion');

    return {
      contrasena: await leerContrasena(sql, sesion.personaId),
      pines: await leerPines(sql, sesion.personaId),
      dobleFactor: await leerDobleFactor(sql, sesion.personaId),
      sesiones: await leerSesiones(sql, sesion.personaId, sesion.id),
    };
  },
});

async function leerContrasena(sql: Sql, personaId: string): Promise<MiAcceso['contrasena']> {
  const filas = await sql<{ cambiada_en: Date; debe_cambiarla: boolean }[]>`
    select cambiada_en, debe_cambiarla from estook.credencial where persona_id = ${personaId}
  `;

  const fila = filas[0];
  if (!fila) return { puesta: false, cambiadaEn: null, laPusoOtraPersona: false };

  return {
    puesta: true,
    cambiadaEn: fila.cambiada_en.toISOString(),
    laPusoOtraPersona: fila.debe_cambiarla,
  };
}

async function leerPines(sql: Sql, personaId: string): Promise<MiAcceso['pines']> {
  const filas = await sql<
    { local_id: string; local: string; creado_en: Date; bloqueado_hasta: Date | null }[]
  >`
    select n.local_id, l.nombre as local, n.creado_en, n.bloqueado_hasta
      from estook.pin n
      join estook.local l on l.id = n.local_id
     where n.persona_id = ${personaId}
     order by l.nombre
  `;

  return filas.map((f) => ({
    localId: f.local_id,
    local: f.local,
    creadoEn: f.creado_en.toISOString(),
    bloqueadoHasta: f.bloqueado_hasta?.toISOString() ?? null,
  }));
}

async function leerDobleFactor(sql: Sql, personaId: string): Promise<MiAcceso['dobleFactor']> {
  const filas = await sql<{ confirmado_en: Date | null; cuantos: number }[]>`
    select confirmado_en, coalesce(array_length(codigos_de_respaldo, 1), 0) as cuantos
      from estook.doble_factor where persona_id = ${personaId}
  `;

  const exigido = await sql<{ exige: boolean }[]>`
    select coalesce(bool_or(o.exige_doble_factor), false) as exige
      from estook.organizacion o
     where o.id in (select organizacion_id from estook.organizaciones_visibles())
  `;

  const fila = filas[0];

  return {
    activo: fila?.confirmado_en != null,
    // Empezo a activarlo y no lo termino. La pantalla lo dice y ofrece
    // terminarlo: si no, la fila se queda ahi y nadie entiende por que no le
    // piden el codigo.
    empezadoSinTerminar: fila !== undefined && fila.confirmado_en === null,
    codigosDeRespaldoQueQuedan: fila?.cuantos ?? 0,
    loExigeLaOrganizacion: exigido[0]?.exige === true,
  };
}

async function leerSesiones(
  sql: Sql,
  personaId: string,
  laDeAhora: string,
): Promise<MiAcceso['sesiones']> {
  const filas = await sql<
    {
      id: string;
      entro_con: string;
      creada_en: Date;
      ultima_actividad_en: Date;
      local: string | null;
    }[]
  >`
    select s.id, s.entro_con, s.creada_en, s.ultima_actividad_en, l.nombre as local
      from estook.sesion s
      left join estook.local l on l.id = s.local_id
     where s.persona_id = ${personaId}
       and s.cerrada_en is null
       and s.caduca_en > now()
     order by s.ultima_actividad_en desc
  `;

  return filas.map((f) => ({
    id: f.id,
    esLaDeAhora: f.id === laDeAhora,
    entroCon: f.entro_con,
    creadaEn: f.creada_en.toISOString(),
    ultimaActividadEn: f.ultima_actividad_en.toISOString(),
    local: f.local,
  }));
}
