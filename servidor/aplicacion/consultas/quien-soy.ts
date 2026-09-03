import { z } from 'zod';
import type { Destino as ADonde, Idioma } from '@estook/dominio';
import { esPermiso, type Nivel, type PermisosResueltos } from '@estook/permisos';
import type { Sql } from '../../infraestructura/postgres.ts';
import { decidirDestino } from '../acceso.ts';
import { consulta, FalloDeAplicacion, type Contexto } from '../contrato.ts';

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
    /**
     * La marca del local (M5). «Se aplican a la app y a todos los documentos»
     * (Manifiesto 8), y la cabecera cambia de color al cambiar de local, «para
     * que nadie apunte una merma en el local equivocado» (Manifiesto 31).
     *
     * Van aquí y no en una consulta aparte porque la cabecera se pinta en
     * **todas** las pantallas: una consulta más sería un viaje más antes de la
     * primera pantalla útil, que es justo lo que B7 no perdona.
     */
    readonly colorDeMarca: string | null;
    /**
     * El enlace al logo, **firmado y caduco**. Nunca se guarda: lo que guarda la
     * base de datos es la clave del objeto, y esto se pide cada vez.
     *
     * Nulo si no hay logo, o si no hay almacén montado. La cabecera enseña
     * entonces el logotipo de Estook, que es lo correcto y no un hueco roto.
     */
    readonly logo: string | null;
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

  /**
   * Si esto es una visita de demostración (M5).
   *
   * **Sin esto, la aplicación no tenía forma de saberlo.** El despachador paraba
   * las escrituras —eso funcionaba— pero la pantalla enseñaba los mismos botones
   * de guardar que a un usuario de verdad, y quien pulsaba uno recibía un error
   * en la cara sin haber sido avisado de nada.
   *
   * «Se entra y se sale sin dejar rastro» es la promesa, y una promesa que el
   * visitante no ve no la ha recibido. Aquí se dice, la cabecera lo cuenta, y
   * hay un botón para irse.
   */
  readonly esDemostracion: boolean;
}

export const quienSoy = consulta<Record<string, never>, QuienSoy>({
  nombre: 'quien_soy',
  entrada: z.object({}).strict(),
  // Se puede preguntar con la sesion a medias: es lo que la pantalla necesita
  // para saber que tiene que pedir el codigo, y a quien.
  aunSinDobleFactor: true,

  async ejecutar(contexto) {
    const { sql, sesion } = contexto;
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
    const local =
      destino.localId === null ? null : await leerLocal(sql, destino.localId, contexto.almacen);

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

      // Sale de la sesión, igual que la miran las puertas del despachador. No se
      // deduce de los datos: una organización de ejemplo mirada por su dueño de
      // verdad no es una demostración.
      esDemostracion: sesion.esDemostracion,
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

/**
 * Cuánto vale un enlace al logo antes de caducar.
 *
 * Una hora. La cabecera se pinta en cada pantalla, así que un enlace corto se
 * rompería a media mañana; y uno eterno no sería un enlace firmado, sería una
 * dirección pública con pasos de más.
 */
const LO_QUE_DURA_EL_ENLACE = 3600;

async function leerLocal(
  sql: Sql,
  id: string,
  almacen: Contexto['almacen'],
): Promise<QuienSoy['local']> {
  const filas = await sql<
    {
      id: string;
      nombre: string;
      codigo: string;
      area: string | null;
      color_de_marca: string | null;
      logo_clave: string | null;
    }[]
  >`
    select l.id, l.nombre, l.codigo, a.nombre as area, l.color_de_marca, l.logo_clave
      from estook.local l
      left join estook.area a on a.id = l.area_id
     where l.id = ${id}
  `;

  const fila = filas[0];
  if (!fila) return null;

  // Si el almacén no contesta, se enseña la marca sin logo en vez de romper la
  // pantalla entera. «Nunca un error rojo por algo que no lo es» (Auditoría,
  // parte 5): que un enlace no se pueda firmar no es un fallo del restaurante.
  const logo =
    fila.logo_clave === null || almacen === null
      ? null
      : await almacen.enlace(fila.logo_clave, LO_QUE_DURA_EL_ENLACE).catch(() => null);

  return {
    id: fila.id,
    nombre: fila.nombre,
    codigo: fila.codigo,
    area: fila.area,
    colorDeMarca: fila.color_de_marca,
    logo,
  };
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
