import { z } from 'zod';
import type { Destino as ADonde, Idioma } from '@estook/dominio';
import { esPermiso, type Nivel, type PermisosResueltos } from '@estook/permisos';
import type { Sql } from '../../infraestructura/postgres.ts';
import { decidirDestino } from '../acceso.ts';
import { consulta, FalloDeAplicacion } from '../contrato.ts';

/**
 * Quien soy, donde estoy y que puedo (M4).
 *
 * **La consulta que la aplicacion hace primero, y la unica que necesita para
 * pintarse entera.** Junta en una respuesta lo que M3 pedia en dos y lo que M4
 * anade:
 *
 *   · quien eres, para la cabecera y el avatar
 *   · en que organizacion y en que local estas, para el selector y el color
 *   · a donde te lleva la resolucion de destino, si no estas en un local
 *   · **tus permisos sobre este local**, que es lo que reparte la rueda
 *
 * ── Por que en una y no en cuatro ────────────────────────────────────────────
 *
 * Porque las cuatro cosas se necesitan **a la vez y antes de pintar nada**. En
 * cuatro llamadas, la aplicacion pintaria la rueda vacia, luego con cuatro
 * sectores, luego con ocho; y en un movil con mala cobertura eso no son
 * milisegundos. B7 pide que la primera pantalla util llegue rapido, y encadenar
 * cuatro viajes de ida y vuelta es la forma mas segura de que no llegue.
 *
 * ── Y por que el local no viene del cliente ──────────────────────────────────
 *
 * Sale de la sesion. Si viniera en la peticion, cualquiera podria pedir los
 * permisos «sobre» un local ajeno; los recibiria vacios, porque las politicas de
 * M1 no fallan, pero estariamos comprobando lo mismo en dos sitios. El local en
 * el que se esta es una decision del servidor, y cambiarla es un comando.
 */
export interface QuienSoy {
  readonly personaId: string;
  readonly nombre: string;
  readonly apellidos: string | null;
  readonly correo: string;
  readonly idioma: Idioma;
  /** Para el control optimista al cambiar el idioma. */
  readonly version: number;

  readonly destino: ADonde;
  readonly porque: string;

  readonly organizacion: {
    readonly id: string;
    readonly nombre: string;
    readonly usaAreas: boolean;
    readonly estado: string;
    readonly exigeDobleFactor: boolean;
    /**
     * Se devuelve **el correo, no si lo hay**: lo lee solo quien puede cambiarlo,
     * porque la politica de M1 sobre `organizacion` ya filtra la fila entera.
     */
    readonly correoDeRecuperacion: string | null;
    /**
     * El alcance más amplio que tiene aquí. Lo necesita la pantalla para saber si
     * hay un consolidado al que volver, y sale de aquí y no de deducirlo en el
     * cliente: es la misma condición que la tercera comprobación de `aDondeEntra`,
     * y dos sitios que la calculen acabarán discrepando (regla 6).
     */
    readonly alcance: 'organizacion' | 'area' | 'local';
    /** Para el control optimista al cambiar lo que la organizacion exige. */
    readonly version: number;
  } | null;
  readonly local: {
    readonly id: string;
    readonly nombre: string;
    readonly codigo: string;
    readonly area: string | null;
  } | null;

  /** Para el selector: todo lo que alcanza. */
  readonly organizaciones: readonly { readonly id: string; readonly nombre: string }[];
  readonly locales: readonly {
    readonly id: string;
    readonly nombre: string;
    readonly organizacionId: string;
  }[];

  /** Vacio mientras no se esta dentro de un local: no hay sobre que resolverlos. */
  readonly permisos: PermisosResueltos;

  readonly debeCambiarClave: boolean;
  readonly faltaDobleFactor: boolean;
  readonly debeActivarDobleFactor: boolean;
}

export const quienSoy = consulta<Record<string, never>, QuienSoy>({
  nombre: 'quien_soy',
  entrada: z.object({}).strict(),
  // Se puede preguntar con la sesion a medias: es lo que la pantalla necesita
  // para saber que tiene que pedir el codigo, y a quien.
  aunSinDobleFactor: true,

  async ejecutar({ sql, sesion }) {
    if (sesion === null) throw new FalloDeAplicacion('sin_sesion');

    const personas = await sql<
      {
        id: string;
        nombre: string;
        apellidos: string | null;
        correo: string;
        idioma: string;
        version: number;
      }[]
    >`
      select id, nombre, apellidos, correo, idioma::text as idioma, version
        from estook.persona where id = ${sesion.personaId}
    `;
    const persona = personas[0];
    if (!persona) throw new FalloDeAplicacion('sin_sesion');

    // Las seis comprobaciones, otra vez. **Y esto es a proposito**: se rehacen en
    // cada peticion, no se guardan. Asi, si a alguien le cambian el rol, o su
    // organizacion cae en impago, la aplicacion se entera en la peticion
    // siguiente y no cuando vuelva a entrar. «Cambiar el rol de alguien surte
    // efecto en la peticion siguiente» (Auditoria, Parte 8).
    const destino = await decidirDestino(sql, sesion);

    const laSuya = destino.organizaciones.find((o) => o.id === destino.organizacionId);
    const organizacion =
      destino.organizacionId === null
        ? null
        : await leerOrganizacion(sql, destino.organizacionId, laSuya?.alcance ?? 'local');
    const local = destino.localId === null ? null : await leerLocal(sql, destino.localId);

    const permisos =
      destino.localId === null ? {} : await leerPermisos(sql, sesion.personaId, destino.localId);

    const dobleFactor = await sql<{ confirmado: boolean }[]>`
      select confirmado_en is not null as confirmado
        from estook.doble_factor where persona_id = ${sesion.personaId}
    `;
    const loTiene = dobleFactor[0]?.confirmado === true;

    return {
      personaId: persona.id,
      nombre: persona.nombre,
      apellidos: persona.apellidos,
      correo: persona.correo,
      idioma: persona.idioma as Idioma,
      version: persona.version,

      destino: destino.destino,
      porque: destino.porque,

      organizacion,
      local,

      organizaciones: destino.organizaciones.map((o) => ({ id: o.id, nombre: o.nombre })),
      locales: destino.locales.map((l) => ({
        id: l.id,
        nombre: l.nombre,
        organizacionId: l.organizacionId,
      })),

      permisos,

      debeCambiarClave: sesion.debeCambiarClave,
      faltaDobleFactor: !sesion.dobleFactorSuperado,
      debeActivarDobleFactor: (organizacion?.exigeDobleFactor ?? false) && !loTiene,
    };
  },
});

async function leerOrganizacion(
  sql: Sql,
  id: string,
  alcance: 'organizacion' | 'area' | 'local',
): Promise<QuienSoy['organizacion']> {
  const filas = await sql<
    {
      id: string;
      nombre: string;
      usa_areas: boolean;
      estado: string | null;
      exige_doble_factor: boolean;
      correo_de_recuperacion: string | null;
      version: number;
    }[]
  >`
    select o.id, o.nombre, o.usa_areas, s.estado::text as estado,
           o.exige_doble_factor, o.correo_de_recuperacion, o.version
      from estook.organizacion o
      left join estook.suscripcion s on s.organizacion_id = o.id
     where o.id = ${id}
  `;

  const fila = filas[0];
  if (!fila) return null;

  return {
    id: fila.id,
    nombre: fila.nombre,
    usaAreas: fila.usa_areas,
    estado: fila.estado ?? 'prueba',
    exigeDobleFactor: fila.exige_doble_factor,
    correoDeRecuperacion: fila.correo_de_recuperacion,
    alcance,
    version: fila.version,
  };
}

async function leerLocal(sql: Sql, id: string): Promise<QuienSoy['local']> {
  const filas = await sql<{ id: string; nombre: string; codigo: string; area: string | null }[]>`
    select l.id, l.nombre, l.codigo, a.nombre as area
      from estook.local l
      left join estook.area a on a.id = l.area_id
     where l.id = ${id}
  `;

  const fila = filas[0];
  return fila ? { id: fila.id, nombre: fila.nombre, codigo: fila.codigo, area: fila.area } : null;
}

/**
 * Lo mismo que hace `mis_permisos`, y a proposito: es la misma consulta.
 *
 * «La matriz de permisos vive **solo** en la base de datos» (decision de M1). Se
 * pregunta permiso a permiso contra el catalogo, en vez de repetir la matriz aqui.
 */
async function leerPermisos(sql: Sql, persona: string, local: string): Promise<PermisosResueltos> {
  const filas = await sql<{ codigo: string; nivel: string }[]>`
    select p.codigo,
           estook.nivel_de_permiso(${persona}::uuid, ${local}::uuid, p.codigo)::text as nivel
      from estook.permiso p
     order by p.codigo
  `;

  const resueltos: Record<string, Nivel> = {};
  for (const fila of filas) {
    // Los de `sin_acceso` no se envian: lo que no esta, no se tiene.
    if (fila.nivel === 'sin_acceso') continue;
    if (!esPermiso(fila.codigo)) continue;
    resueltos[fila.codigo] = fila.nivel as Nivel;
  }
  return resueltos;
}
