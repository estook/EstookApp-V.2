import { z } from 'zod';
import { publicar } from '../../eventos/bandeja.ts';
import { comando, FalloDeAplicacion } from '../contrato.ts';

/**
 * Retirar el acceso a alguien (M4).
 *
 * «PIN muerto **al instante** · sesiones cerradas · sus turnos futuros quedan sin
 *  cubrir con aviso · **la persona no se borra**: sigue en lo que firmo, en sus
 *  fichajes y en su historial · deja de escribir en el chat pero su historial
 *  permanece · **si vuelve, se reactiva con todo**» (Auditoria de flujos, 2.11).
 *
 * De esa lista, M4 hace las tres primeras cosas y garantiza la cuarta. Los turnos
 * son M11 y el chat es M16; cuando lleguen, se enganchan al evento
 * `membresia.revocada` que se publica aqui, y no tocan este comando.
 *
 * ── El orden importa, y es este ──────────────────────────────────────────────
 *
 *   1. Se comprueba que el negocio no se queda sin quien lo administre
 *   2. Se cierra la membresia (no se borra: quien se fue en marzo sigue en marzo)
 *   3. Se **borra el PIN**, que es lo que mata el acceso al instante
 *   4. Se cierran todas sus sesiones
 *
 * El 3 y el 4 son los que hacen que «al instante» sea verdad. Sin ellos, la
 * membresia caducada dejaria de dar permisos en la peticion siguiente, pero
 * seguiria pudiendo teclear su PIN en el quiosco esa misma tarde.
 */
export const entradaRetirarAcceso = z
  .object({
    persona_id: z.string().uuid(),
    /** El local o la organizacion de la que se le retira. */
    membresia_id: z.string().uuid(),
    motivo: z.string().trim().max(500).optional(),
  })
  .strict();

export type EntradaRetirarAcceso = z.infer<typeof entradaRetirarAcceso>;

export interface SalidaRetirarAcceso {
  readonly sesionesCerradas: number;
  readonly pinesBorrados: number;
}

export const retirarAcceso = comando<EntradaRetirarAcceso, SalidaRetirarAcceso>({
  nombre: 'retirar_acceso',
  entrada: entradaRetirarAcceso,
  exige: 'accion.invitar_personas',

  async ejecutar({ sql, sesion, correlacionId }, entrada) {
    if (sesion === null) throw new FalloDeAplicacion('sin_sesion');

    const membresias = await sql<
      { id: string; organizacion_id: string; local_id: string | null; rol: string }[]
    >`
      select id, organizacion_id, local_id, rol
        from estook.membresia
       where id = ${entrada.membresia_id} and persona_id = ${entrada.persona_id}
    `;
    const membresia = membresias[0];
    // Las politicas de M1 ya filtran lo que no se puede ver. Si no vuelve, o no
    // existe o no es de quien se dice: la misma respuesta para las dos cosas.
    if (!membresia) throw new FalloDeAplicacion('no_existe');

    // ── 1 · Que no se vaya el último que puede administrar ───────────────────
    //
    // «Segundo administrador o correo de recuperacion obligatorio» (Plan, M4).
    // Se comprueba **antes** de quitar nada: quitar y avisar despues deja el
    // negocio bloqueado y a nosotros con un dia de soporte.
    //
    // ── El fallo que esto arregla ────────────────────────────────────────────
    //
    // Antes se preguntaba una sola cosa: «sin contar a esta persona, ¿queda
    // alguien que pueda administrar?». Y si la organizacion **no tenia ninguno
    // desde el principio** —ni direccion, ni administrador de cuenta, ni correo
    // de recuperacion— la respuesta era «no» **para todo el mundo**, asi que
    // no se le podia retirar el acceso a nadie. Ni al cocinero que se fue el mes
    // pasado.
    //
    // Y encima el mensaje decia algo que no era verdad: «si le quitas el acceso,
    // el negocio se queda sin nadie que pueda administrarlo». Quitar a un
    // cocinero no deja a nadie sin administrar nada.
    //
    // Es un fallo de seguridad, no solo de texto: quien se va sigue entrando con
    // su PIN porque la aplicacion no deja quitarselo.
    //
    // Lo que hay que comparar son **las dos fotos**: como esta la organizacion
    // contando a esta persona, y como quedaria sin ella. Solo se bloquea cuando
    // la persona es justo lo que sostiene el acceso, que es lo que la regla
    // queria decir.
    const [foto] = await sql<{ con: boolean; sin: boolean }[]>`
      select estook.tiene_como_volver_a_entrar(${membresia.organizacion_id}::uuid, null) as con,
             estook.tiene_como_volver_a_entrar(
               ${membresia.organizacion_id}::uuid, ${entrada.persona_id}::uuid
             ) as sin
    `;

    if (foto?.con === true && !foto.sin) {
      throw new FalloDeAplicacion('se_queda_sin_administrador');
    }

    // ── 2 · La membresia se cierra, no se borra ──────────────────────────────
    //
    // «Quien se fue en marzo tiene que seguir apareciendo en el historico de
    // marzo» (migracion 0002). Asi que se cierra con dos cosas distintas, y las
    // dos hacen falta:
    //
    //   `hasta`        la fecha en que acabo. Es el dato del historico
    //   `revocada_en`  el instante exacto. Es lo que hace verdad «al instante»
    //
    // Con `hasta` sola no bastaba, y lo encontro una prueba: poniendo hoy, la
    // persona seguia viendo el local hasta medianoche; poniendo ayer, a quien
    // hubiera entrado ese mismo dia le quedaba una membresia que acaba antes de
    // empezar y la base de datos lo rechazaba. Esta razonado en la 0018.
    //
    // `greatest` es para la contratacion futura: si empieza el lunes que viene y
    // se le retira hoy, la fecha de fin es la de inicio, no una anterior.
    await sql`
      update estook.membresia
         set hasta = greatest(desde, current_date),
             revocada_en = now()
       where id = ${membresia.id}
    `;

    // ── 3 · El PIN muere al instante ─────────────────────────────────────────
    //
    // Este si se borra, y es la unica cosa de M4 que se borra. Un PIN retirado no
    // tiene ningun valor historico y dejarlo puesto seria dejar la puerta abierta.
    const pines = membresia.local_id
      ? await sql<{ id: string }[]>`
          delete from estook.pin
           where persona_id = ${entrada.persona_id} and local_id = ${membresia.local_id}
          returning id
        `
      : await sql<{ id: string }[]>`
          delete from estook.pin
           where persona_id = ${entrada.persona_id}
             and local_id in (
               select l.id from estook.local l
                where l.organizacion_id = ${membresia.organizacion_id}
             )
          returning id
        `;

    // ── 4 · Y las sesiones ───────────────────────────────────────────────────
    //
    // Solo si esa era su ultima membresia viva. Quien deja el Bar Puerto pero
    // sigue en el Bar Centro no tiene por que volver a entrar: al recalcularse
    // los permisos en la peticion siguiente, deja de ver Puerto y ya esta.
    const vivas = await sql<{ cuantas: number }[]>`
      select count(*)::int as cuantas
        from estook.membresia m
       where m.persona_id = ${entrada.persona_id}
         and m.desde <= current_date
         and (m.hasta is null or m.hasta >= current_date)
         and (m.revocada_en is null or m.revocada_en > now())
    `;

    const cerradas =
      (vivas[0]?.cuantas ?? 0) > 0
        ? 0
        : ((
            await sql<{ cerrar_sesiones_de: number }[]>`
              select estook.cerrar_sesiones_de(
                ${entrada.persona_id}::uuid, ${sesion.personaId}::uuid
              ) as cerrar_sesiones_de
            `
          )[0]?.cerrar_sesiones_de ?? 0);

    await sql`
      select estook.anotar(
        ${membresia.organizacion_id}::uuid, 'revocar', 'membresia', ${membresia.id},
        ${membresia.local_id}::uuid, null,
        ${JSON.stringify({ persona_id: entrada.persona_id, rol: membresia.rol })}::jsonb,
        ${entrada.motivo ?? null}
      )
    `;

    await publicar(sql, {
      tipo: 'membresia.revocada',
      organizacionId: membresia.organizacion_id,
      localId: membresia.local_id,
      datos: { persona_id: entrada.persona_id, rol: membresia.rol },
      correlacionId,
    });

    return { sesionesCerradas: cerradas, pinesBorrados: pines.length };
  },
});
