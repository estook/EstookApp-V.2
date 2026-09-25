import { z } from 'zod';
import {
  codigosDeRespaldo,
  comprobarCodigo,
  enlaceDeAlta,
  secretoNuevo,
  secretoParaTeclear,
} from '../../dominio/doble-factor.ts';
import { comprobar, derivar } from '../../dominio/secretos.ts';
import type { Sql } from '../../infraestructura/postgres.ts';
import { comando, FalloDeAplicacion, falloQueSeGuarda } from '../contrato.ts';

/** Cinco códigos mal, quince minutos: lo mismo que la contraseña (0039). */
const FALLOS_ANTES_DE_PARAR = 5;

/**
 * El segundo factor, sus cuatro comandos (M4).
 *
 * Los cuatro juntos en un fichero, y es la excepcion a «un fichero por comando»,
 * porque son cuatro pasos de **una sola cosa** y separarlos obligaria a leer
 * cuatro ficheros para entender uno:
 *
 *   activar     · se genera el secreto y se ensena. Todavia no cuenta
 *   confirmar   · se escribe un codigo y ya cuenta. Salen los de respaldo
 *   superar     · al entrar, con la sesion a medias
 *   quitar      · con la contrasena delante, que si no lo quitaria cualquiera
 *                 que pillara la sesion abierta
 *
 * ── Por que activar y confirmar son dos pasos ────────────────────────────────
 *
 * Porque si fueran uno, quien se equivoque copiando el secreto se queda fuera de
 * su propia cuenta para siempre. Mientras no se confirma con un codigo de
 * verdad, el segundo factor **no cuenta**, y la fila esta ahi sin hacer nada.
 */

// ── Activar ──────────────────────────────────────────────────────────────────

export interface SalidaActivar {
  /** Para la aplicacion de autenticacion. */
  readonly enlace: string;
  /** Y para teclearlo a mano, en grupos de cuatro. */
  readonly secreto: string;
}

export const activarDobleFactor = comando<Record<string, never>, SalidaActivar>({
  nombre: 'activar_doble_factor',
  // Sin pagar también (0048): es de la persona, o hace falta para pagar o irse.
  sinPagar: true,
  entrada: z.object({}).strict(),
  // Devuelve el secreto del segundo factor: no se recuerda.
  conSecreto: true,
  // Quien tiene que activarlo porque lo exige su organizacion entra sin el: si
  // no, no podria activarlo nunca.
  aunSinDobleFactor: true,
  // Y en el admin es obligatorio, así que tiene que poder montarse desde ahí (0041).
  tambienEnElAdmin: true,

  async ejecutar({ sql, sesion }) {
    if (sesion === null) throw new FalloDeAplicacion('sin_sesion');

    const yaConfirmado = await sql<{ hay: boolean }[]>`
      select true as hay from estook.doble_factor
       where persona_id = ${sesion.personaId} and confirmado_en is not null
    `;
    // Volver a activarlo generaria un secreto nuevo y dejaria fuera al telefono
    // que ya funciona. Primero se quita, y luego se activa.
    if (yaConfirmado.length > 0) throw new FalloDeAplicacion('ya_hecho');

    const secreto = secretoNuevo();

    await sql`
      insert into estook.doble_factor (persona_id, secreto)
      values (${sesion.personaId}, ${secreto})
      on conflict (persona_id) do update
        set secreto = excluded.secreto, confirmado_en = null, codigos_de_respaldo = '{}'
    `;

    const correo = await correoDe(sql, sesion.personaId);

    return { enlace: enlaceDeAlta(secreto, correo), secreto: secretoParaTeclear(secreto) };
  },
});

// ── Confirmar ────────────────────────────────────────────────────────────────

export const confirmarDobleFactor = comando<
  { readonly codigo: string },
  { readonly codigosDeRespaldo: readonly string[] }
>({
  nombre: 'confirmar_doble_factor',
  // Sin pagar también (0048): es de la persona, o hace falta para pagar o irse.
  sinPagar: true,
  entrada: z.object({ codigo: z.string().trim().min(6).max(10) }).strict(),
  // Devuelve los codigos de respaldo: no se recuerdan.
  conSecreto: true,
  aunSinDobleFactor: true,
  tambienEnElAdmin: true,

  async ejecutar({ sql, sesion, ahora }, entrada) {
    if (sesion === null) throw new FalloDeAplicacion('sin_sesion');

    const filas = await sql<{ secreto: string; confirmado_en: Date | null }[]>`
      select secreto, confirmado_en from estook.doble_factor
       where persona_id = ${sesion.personaId}
    `;
    const fila = filas[0];
    if (!fila) throw new FalloDeAplicacion('no_existe');
    if (fila.confirmado_en !== null) throw new FalloDeAplicacion('ya_hecho');

    // «Ese código no es correcto», y no «ese correo y esa contraseña no cuadran»,
    // que es lo que decía y no tiene nada que ver con lo que se ha escrito.
    if (!(await comprobarCodigo(fila.secreto, entrada.codigo, ahora))) {
      throw new FalloDeAplicacion('codigo_incorrecto');
    }

    // Los de respaldo se ensenan **una sola vez** y se guardan derivados, igual
    // que una contrasena. Si se pierden, se generan otros; no se recuperan.
    const enClaro = codigosDeRespaldo();
    const derivados = await Promise.all(enClaro.map((c) => derivar(c)));

    await sql`
      update estook.doble_factor
         set confirmado_en = now(), codigos_de_respaldo = ${derivados}
       where persona_id = ${sesion.personaId}
    `;

    // La sesion en la que se acaba de activar ya lo ha superado: pedirle el
    // codigo justo despues de escribirlo seria absurdo.
    await sql`
      update estook.sesion set doble_factor_superado = true where id = ${sesion.id}
    `;

    return { codigosDeRespaldo: enClaro };
  },
});

// ── Superar, al entrar ───────────────────────────────────────────────────────

export const superarDobleFactor = comando<
  { readonly codigo: string },
  { readonly superado: boolean; readonly conUnoDeRespaldo: boolean }
>({
  nombre: 'superar_doble_factor',
  // Sin pagar también (0048): es de la persona, o hace falta para pagar o irse.
  sinPagar: true,
  entrada: z.object({ codigo: z.string().trim().min(6).max(16) }).strict(),
  aunSinDobleFactor: true,
  aunConClavePorCambiar: true,
  tambienEnElAdmin: true,

  async ejecutar({ sql, sesion, ahora }, entrada) {
    if (sesion === null) throw new FalloDeAplicacion('sin_sesion');
    if (sesion.dobleFactorSuperado) return { superado: true, conUnoDeRespaldo: false };

    const filas = await sql<
      { secreto: string; codigos_de_respaldo: string[]; bloqueado: boolean }[]
    >`
      select secreto, codigos_de_respaldo,
             coalesce(bloqueado_hasta > now(), false) as bloqueado
        from estook.doble_factor
       where persona_id = ${sesion.personaId} and confirmado_en is not null
    `;
    const fila = filas[0];
    if (!fila) throw new FalloDeAplicacion('no_existe');

    // **Con límite de intentos**, que no tenía (0039): seis cifras sin límite se
    // prueban enteras en una tarde.
    if (fila.bloqueado) throw new FalloDeAplicacion('demasiados_intentos');

    if (await comprobarCodigo(fila.secreto, entrada.codigo, ahora)) {
      await sql`update estook.sesion set doble_factor_superado = true where id = ${sesion.id}`;
      await sql`
        update estook.doble_factor set intentos_fallidos = 0, bloqueado_hasta = null
         where persona_id = ${sesion.personaId}
      `;
      return { superado: true, conUnoDeRespaldo: false };
    }

    // Uno de respaldo. Se recorren todos, sin parar al que acierte, y el que se
    // usa **se gasta**: un codigo de respaldo vale una vez.
    const limpio = entrada.codigo.toUpperCase().replace(/\s/g, '');
    let cual = -1;
    for (const [i, derivado] of fila.codigos_de_respaldo.entries()) {
      if (await comprobar(limpio, derivado)) cual = i;
    }

    if (cual < 0) {
      // El fallo se cuenta **y se guarda**: si el error deshiciera el apunte, el
      // límite no limitaría nada, que es lo que le pasaba a la contraseña.
      await sql`
        update estook.doble_factor
           set intentos_fallidos = intentos_fallidos + 1,
               bloqueado_hasta = case
                 when intentos_fallidos + 1 >= ${FALLOS_ANTES_DE_PARAR}
                   then now() + interval '15 minutes'
                 else bloqueado_hasta
               end
         where persona_id = ${sesion.personaId}
      `;
      throw falloQueSeGuarda('codigo_incorrecto');
    }

    const quedan = fila.codigos_de_respaldo.filter((_, i) => i !== cual);
    await sql`
      update estook.doble_factor
         set codigos_de_respaldo = ${quedan}, intentos_fallidos = 0, bloqueado_hasta = null
       where persona_id = ${sesion.personaId}
    `;
    await sql`update estook.sesion set doble_factor_superado = true where id = ${sesion.id}`;

    return { superado: true, conUnoDeRespaldo: true };
  },
});

// ── Quitar ───────────────────────────────────────────────────────────────────

export const quitarDobleFactor = comando<
  { readonly contrasena: string },
  { readonly quitado: boolean }
>({
  nombre: 'quitar_doble_factor',
  // Sin pagar también (0048): es de la persona, o hace falta para pagar o irse.
  sinPagar: true,
  // Con la contrasena delante a proposito: si no, a quien se dejara la sesion
  // abierta en la tablet del pase le podrian quitar el segundo factor de un clic,
  // que es justo de lo que protege el segundo factor.
  entrada: z.object({ contrasena: z.string().min(1).max(512) }).strict(),

  async ejecutar({ sql, sesion }, entrada) {
    if (sesion === null) throw new FalloDeAplicacion('sin_sesion');

    const filas = await sql<{ derivada: string }[]>`
      select derivada from estook.credencial where persona_id = ${sesion.personaId}
    `;
    const derivada = filas[0]?.derivada;
    if (derivada === undefined || !(await comprobar(entrada.contrasena, derivada))) {
      throw new FalloDeAplicacion('no_cuadra');
    }

    // Si la organizacion lo exige, no se puede quitar. La regla la pone la
    // organizacion, no cada persona.
    const exigido = await sql<{ exige: boolean }[]>`
      select bool_or(o.exige_doble_factor) as exige
        from estook.organizacion o
       where o.id in (select organizacion_id from estook.organizaciones_visibles())
    `;
    if (exigido[0]?.exige === true) throw new FalloDeAplicacion('sin_permiso');

    // Y quien tiene acceso al admin, tampoco (0041): ahí el segundo factor es
    // obligatorio, y quitárselo desde la app dejaría el admin con la puerta floja.
    const admin = await sql<{ nivel: string | null }[]>`
      select plataforma.nivel_de(${sesion.personaId}::uuid)::text as nivel
    `;
    if (admin[0]?.nivel != null) {
      throw new FalloDeAplicacion('sin_permiso', {
        porque:
          'Tienes acceso al admin de Estook, y ahí el segundo factor es obligatorio. Para quitarlo, primero hay que quitarte ese acceso.',
      });
    }

    await sql`delete from estook.doble_factor where persona_id = ${sesion.personaId}`;

    return { quitado: true };
  },
});

/**
 * El correo, que es lo que la aplicacion de autenticacion ensena debajo del
 * codigo. Con seis cuentas en la lista, sin el no se sabe cual es cual.
 */
async function correoDe(sql: Sql, personaId: string): Promise<string> {
  const filas = await sql<{ correo: string }[]>`
    select correo from estook.persona where id = ${personaId}
  `;
  return filas[0]?.correo ?? 'estook';
}
