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
import { comando, FalloDeAplicacion } from '../contrato.ts';

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
  entrada: z.object({}).strict(),
  // Quien tiene que activarlo porque lo exige su organizacion entra sin el: si
  // no, no podria activarlo nunca.
  aunSinDobleFactor: true,

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
  entrada: z.object({ codigo: z.string().trim().min(6).max(10) }).strict(),
  aunSinDobleFactor: true,

  async ejecutar({ sql, sesion, ahora }, entrada) {
    if (sesion === null) throw new FalloDeAplicacion('sin_sesion');

    const filas = await sql<{ secreto: string; confirmado_en: Date | null }[]>`
      select secreto, confirmado_en from estook.doble_factor
       where persona_id = ${sesion.personaId}
    `;
    const fila = filas[0];
    if (!fila) throw new FalloDeAplicacion('no_existe');
    if (fila.confirmado_en !== null) throw new FalloDeAplicacion('ya_hecho');

    if (!(await comprobarCodigo(fila.secreto, entrada.codigo, ahora))) {
      throw new FalloDeAplicacion('no_cuadra');
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
  entrada: z.object({ codigo: z.string().trim().min(6).max(16) }).strict(),
  aunSinDobleFactor: true,
  aunConClavePorCambiar: true,

  async ejecutar({ sql, sesion, ahora }, entrada) {
    if (sesion === null) throw new FalloDeAplicacion('sin_sesion');
    if (sesion.dobleFactorSuperado) return { superado: true, conUnoDeRespaldo: false };

    const filas = await sql<{ secreto: string; codigos_de_respaldo: string[] }[]>`
      select secreto, codigos_de_respaldo from estook.doble_factor
       where persona_id = ${sesion.personaId} and confirmado_en is not null
    `;
    const fila = filas[0];
    if (!fila) throw new FalloDeAplicacion('no_existe');

    if (await comprobarCodigo(fila.secreto, entrada.codigo, ahora)) {
      await sql`update estook.sesion set doble_factor_superado = true where id = ${sesion.id}`;
      return { superado: true, conUnoDeRespaldo: false };
    }

    // Uno de respaldo. Se recorren todos, sin parar al que acierte, y el que se
    // usa **se gasta**: un codigo de respaldo vale una vez.
    const limpio = entrada.codigo.toUpperCase().replace(/\s/g, '');
    let cual = -1;
    for (const [i, derivado] of fila.codigos_de_respaldo.entries()) {
      if (await comprobar(limpio, derivado)) cual = i;
    }

    if (cual < 0) throw new FalloDeAplicacion('no_cuadra');

    const quedan = fila.codigos_de_respaldo.filter((_, i) => i !== cual);
    await sql`
      update estook.doble_factor set codigos_de_respaldo = ${quedan}
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
