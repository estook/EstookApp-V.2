import { z } from 'zod';
import { DIAS_DE_OFERTA_MAXIMOS, DIAS_DE_OFERTA_MINIMOS, claveDeUnSoloUso } from '@estook/dominio';
import { derivar, huellaDeToken, tokenNuevo } from '../../dominio/secretos.ts';
import { anotarEnElAdmin, comprobarMiCodigo } from '../admin.ts';
import { comando, FalloDeAplicacion } from '../contrato.ts';
import { elAparato, porContrasena, tieneDobleFactorConfirmado } from './entrar.ts';

/**
 * La puerta del admin: entrar, dar acceso y quitarlo (0041, entrega A1).
 *
 * Los tres juntos porque son **una sola cosa**, quién entra en el admin, igual que
 * los cuatro del segundo factor viven en un fichero.
 */

/** Ocho horas, y lo repite la base: `sesion_de_admin_dura_ocho_horas`. */
const HORAS_DE_SESION_DEL_ADMIN = 8;

// ── Entrar ───────────────────────────────────────────────────────────────────

export const entradaEntrarEnAdmin = z
  .object({
    correo: z.string().trim().toLowerCase().email().max(320),
    // **Solo contraseña.** El PIN es de un local, y el admin no es de ninguno.
    contrasena: z.string().min(1).max(512),
    aparato: elAparato.optional(),
  })
  .strict();

export type EntradaEntrarEnAdmin = z.infer<typeof entradaEntrarEnAdmin>;

export interface SalidaEntrarEnAdmin {
  readonly token: string;
  /** Lo tiene montado: hay que escribir el código antes de ver nada. */
  readonly faltaDobleFactor: boolean;
  /** No lo tiene: en el admin es obligatorio, así que lo monta antes de ver nada. */
  readonly debeActivarDobleFactor: boolean;
  readonly debeCambiarClave: boolean;
}

/**
 * Entrar en el admin.
 *
 * Con la misma cuenta que la app, pero **abre otra clase de sesión**: marcada del
 * admin, de ocho horas, sin organización ni local. El despachador no deja usarla
 * para nada de la app, ni una de la app para el admin.
 *
 * **A quien no es admin se le contesta lo mismo que a una contraseña mal.** Si
 * dijera «no tienes acceso», cualquiera con una cuenta de Estook podría averiguar
 * qué correos administran Estook, que son justo los que interesa atacar.
 */
export const entrarEnAdmin = comando<EntradaEntrarEnAdmin, SalidaEntrarEnAdmin>({
  nombre: 'entrar_en_admin',
  entrada: entradaEntrarEnAdmin,
  sinSesion: true,
  // Devuelve el token de sesión: no se recuerda.
  conSecreto: true,
  // No exige sesión del admin —todavía no la hay—, pero es del admin.
  tambienEnElAdmin: true,

  async ejecutar(contexto, entrada) {
    const quien = await porContrasena(contexto, entrada.correo, entrada.contrasena);

    // Como en `entrar`: la identidad se declara a mano, solo para esta
    // transacción, porque se ha entrado sin sesión.
    await contexto.sql`select set_config('estook.persona_id', ${quien.personaId}, true)`;

    const niveles = await contexto.sql<{ nivel: string | null }[]>`
      select plataforma.nivel_de(${quien.personaId}::uuid)::text as nivel
    `;
    if (niveles[0]?.nivel == null) throw new FalloDeAplicacion('no_cuadra');

    const tieneDoble = await tieneDobleFactorConfirmado(contexto, quien.personaId);

    let dispositivoId: string | null = null;
    if (entrada.aparato !== undefined) {
      const aparatos = await contexto.sql<{ reconocer_dispositivo: string | null }[]>`
        select estook.reconocer_dispositivo(
          ${quien.personaId}::uuid,
          ${entrada.aparato.huella},
          ${entrada.aparato.nombre},
          ${entrada.aparato.tipo}::estook.tipo_de_dispositivo,
          null::uuid
        ) as reconocer_dispositivo
      `;
      dispositivoId = aparatos[0]?.reconocer_dispositivo ?? null;
    }

    const token = tokenNuevo();
    const huella = await huellaDeToken(token);

    // Sin segundo factor montado, la sesión nace «superada» para poder montarlo;
    // el despachador no le deja hacer nada más hasta entonces.
    const filas = await contexto.sql<{ abrir_sesion: string }[]>`
      select estook.abrir_sesion(
        ${quien.personaId}::uuid,
        ${huella},
        'contrasena',
        null::uuid,
        null::uuid,
        ${!tieneDoble},
        1,
        ${dispositivoId}::uuid
      ) as abrir_sesion
    `;
    const sesionId = filas[0]?.abrir_sesion;
    if (sesionId === undefined) throw new FalloDeAplicacion('fallo_nuestro');

    // `abrir_sesion` cuenta en días, y el admin en horas. Se ajusta en la misma
    // transacción, y la base no deja que pase de ocho.
    await contexto.sql`
      update estook.sesion
         set para_admin = true,
             caduca_en = creada_en + make_interval(hours => ${HORAS_DE_SESION_DEL_ADMIN})
       where id = ${sesionId}::uuid
    `;

    await anotarEnElAdmin(
      {
        ...contexto,
        sesion: {
          id: sesionId,
          personaId: quien.personaId,
          organizacionId: null,
          localId: null,
          dobleFactorSuperado: !tieneDoble,
          debeCambiarClave: quien.debeCambiarClave,
          esDemostracion: false,
          paraAdmin: true,
        },
      },
      { accion: 'entrar', entidad: 'sesion', entidadId: sesionId },
    );

    return {
      token,
      faltaDobleFactor: tieneDoble,
      debeActivarDobleFactor: !tieneDoble,
      debeCambiarClave: quien.debeCambiarClave,
    };
  },
});

// ── Dar acceso ───────────────────────────────────────────────────────────────

export const entradaDarAccesoAlAdmin = z
  .object({
    correo: z.string().trim().toLowerCase().email().max(320),
    nombre: z.string().trim().min(1).max(120),
    // Hoy solo total: los otros niveles se estrenan con las entregas que les dan
    // algo que hacer (0041). Ofrecerlos antes sería dar un acceso que no abre nada.
    nivel: z.enum(['total']),
    codigo: z.string().trim().min(6).max(10),
  })
  .strict();

export type EntradaDarAccesoAlAdmin = z.infer<typeof entradaDarAccesoAlAdmin>;

export interface SalidaDarAccesoAlAdmin {
  readonly personaId: string;
  readonly personaNueva: boolean;
  /**
   * La contraseña de un solo uso, **solo si se le ha puesto**: a quien ya tenía
   * cuenta no se le toca la suya. Se enseña una vez y no se guarda en claro.
   */
  readonly clave: string | null;
}

export const darAccesoAlAdmin = comando<EntradaDarAccesoAlAdmin, SalidaDarAccesoAlAdmin>({
  nombre: 'admin_dar_acceso',
  entrada: entradaDarAccesoAlAdmin,
  soloAdmin: true,
  nivelDeAdmin: 'total',
  // Puede devolver una contraseña: no se recuerda.
  conSecreto: true,

  async ejecutar(contexto, entrada) {
    await comprobarMiCodigo(contexto, entrada.codigo);

    // De uno en uno: dos admins dando acceso a la vez al mismo correo acabarían
    // en el índice único con un error que no dice nada.
    await contexto.sql`select pg_advisory_xact_lock(hashtext('plataforma.administrador'))`;

    const personas = await contexto.sql<{ persona_id: string; activa: boolean }[]>`
      select * from estook.persona_por_correo(${entrada.correo})
    `;
    const existente = personas[0];

    if (existente !== undefined) {
      if (!existente.activa) {
        throw new FalloDeAplicacion('faltan_datos', {
          campos: ['correo'],
          porque: 'Esa persona está dada de baja en Estook, así que no podría entrar.',
        });
      }
      const vivos = await contexto.sql<{ id: string }[]>`
        select id from plataforma.administrador
         where persona_id = ${existente.persona_id}::uuid and quitado_en is null
      `;
      if (vivos.length > 0) throw new FalloDeAplicacion('ya_hecho');
    }

    const clave = claveDeUnSoloUso();
    const derivada = await derivar(clave);

    const filas = await contexto.sql<
      { persona_id: string; persona_nueva: boolean; clave_puesta: boolean }[]
    >`
      select * from plataforma.dar_acceso(
        ${entrada.correo}, ${entrada.nombre}, ${entrada.nivel}::plataforma.nivel, ${derivada}
      )
    `;
    const fila = filas[0];
    if (fila === undefined) throw new FalloDeAplicacion('fallo_nuestro');

    await anotarEnElAdmin(contexto, {
      accion: 'dar_acceso',
      entidad: 'administrador',
      entidadId: fila.persona_id,
      despues: {
        correo: entrada.correo,
        nivel: entrada.nivel,
        personaNueva: fila.persona_nueva,
        conClaveDeUnSoloUso: fila.clave_puesta,
      },
    });

    return {
      personaId: fila.persona_id,
      personaNueva: fila.persona_nueva,
      clave: fila.clave_puesta ? clave : null,
    };
  },
});

// ── Quitar el acceso ─────────────────────────────────────────────────────────

export const entradaQuitarAccesoAlAdmin = z
  .object({
    personaId: z.string().uuid(),
    motivo: z.string().trim().min(3).max(500),
    codigo: z.string().trim().min(6).max(10),
  })
  .strict();

export type EntradaQuitarAccesoAlAdmin = z.infer<typeof entradaQuitarAccesoAlAdmin>;

/**
 * Quitar el acceso al admin. **Con motivo, con código, y nunca a uno mismo ni al
 * último total.**
 *
 * No hace falta cerrar sus sesiones del admin: el despachador mira el acceso en
 * cada petición, así que la siguiente ya no pasa. Y las de la app no se tocan:
 * quitarle el admin a alguien no le echa de su restaurante.
 */
export const quitarAccesoAlAdmin = comando<EntradaQuitarAccesoAlAdmin, { readonly quitado: true }>({
  nombre: 'admin_quitar_acceso',
  entrada: entradaQuitarAccesoAlAdmin,
  soloAdmin: true,
  nivelDeAdmin: 'total',

  async ejecutar(contexto, entrada) {
    const { sql, sesion } = contexto;
    if (sesion === null) throw new FalloDeAplicacion('sin_sesion');

    if (entrada.personaId === sesion.personaId) {
      throw new FalloDeAplicacion('faltan_datos', {
        campos: ['personaId'],
        porque: 'No te puedes quitar el acceso a ti mismo: pídeselo a otro admin con acceso total.',
      });
    }

    await comprobarMiCodigo(contexto, entrada.codigo);

    // De uno en uno, o dos admins quitándose el acceso a la vez podrían dejar
    // Estook sin ninguno. La base también lo impide; esto hace que se diga bien.
    await sql`select pg_advisory_xact_lock(hashtext('plataforma.administrador'))`;

    const filas = await sql<{ id: string; nivel: string }[]>`
      select id, nivel::text as nivel from plataforma.administrador
       where persona_id = ${entrada.personaId}::uuid and quitado_en is null
    `;
    const fila = filas[0];
    if (fila === undefined) throw new FalloDeAplicacion('no_existe');

    if (fila.nivel === 'total') {
      const otros = await sql<{ cuantos: number }[]>`
        select count(*)::int as cuantos from plataforma.administrador
         where nivel = 'total' and quitado_en is null and id <> ${fila.id}::uuid
      `;
      if ((otros[0]?.cuantos ?? 0) === 0) throw new FalloDeAplicacion('se_queda_sin_admin');
    }

    await sql`
      update plataforma.administrador
         set quitado_en = now(),
             quitado_por = ${sesion.personaId}::uuid,
             motivo_de_quitar = ${entrada.motivo}
       where id = ${fila.id}::uuid
    `;

    await anotarEnElAdmin(contexto, {
      accion: 'quitar_acceso',
      entidad: 'administrador',
      entidadId: entrada.personaId,
      antes: { nivel: fila.nivel },
      motivo: entrada.motivo,
    });

    return { quitado: true };
  },
});

// ── La oferta de prueba (0042) ───────────────────────────────────────────────

export const entradaCambiarLaOferta = z
  .object({
    activa: z.boolean(),
    dias: z.number().int().min(DIAS_DE_OFERTA_MINIMOS).max(DIAS_DE_OFERTA_MAXIMOS),
  })
  .strict();

export type EntradaCambiarLaOferta = z.infer<typeof entradaCambiarLaOferta>;

/**
 * Encender o apagar la oferta de prueba, y cuántos días da.
 *
 * «De vez en cuando subiremos una prueba de 12 días para marketing; desde el admin
 *  manejamos si activamos la oferta o no.» Con ella encendida, quien crea su cuenta
 * entra con esos días; apagada, paga al empezar. **No cambia a quien ya tiene
 * cuenta**: su prueba es la que le tocó al crearla.
 */
export const cambiarLaOferta = comando<
  EntradaCambiarLaOferta,
  { readonly activa: boolean; readonly dias: number }
>({
  nombre: 'admin_cambiar_oferta',
  entrada: entradaCambiarLaOferta,
  soloAdmin: true,
  nivelDeAdmin: 'total',

  async ejecutar(contexto, entrada) {
    const { sql, sesion } = contexto;
    if (sesion === null) throw new FalloDeAplicacion('sin_sesion');

    const antes = await sql<{ activa: boolean; dias: number }[]>`
      select activa, dias from plataforma.oferta_de_prueba where unica
    `;

    await sql`
      update plataforma.oferta_de_prueba
         set activa = ${entrada.activa}, dias = ${entrada.dias},
             cambiada_en = now(), cambiada_por = ${sesion.personaId}::uuid
       where unica
    `;

    await anotarEnElAdmin(contexto, {
      accion: 'cambiar_oferta',
      entidad: 'oferta_de_prueba',
      entidadId: null,
      antes: antes[0] === undefined ? null : { activa: antes[0].activa, dias: antes[0].dias },
      despues: { activa: entrada.activa, dias: entrada.dias },
    });

    return { activa: entrada.activa, dias: entrada.dias };
  },
});
