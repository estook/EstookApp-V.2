import { z } from 'zod';
import { comprobar, derivar, porQueNoValeLaClave } from '../../dominio/secretos.ts';
import { ponerPinNuevo } from '../pines.ts';
import { comando, FalloDeAplicacion } from '../contrato.ts';

/**
 * «Mi acceso» · los cuatro comandos de la pantalla (M4).
 *
 * «Ajustes → **Mi acceso** (contrasena, PIN, doble factor, mis dispositivos)»
 * (Manifiesto 23). El doble factor esta en su fichero; aqui van los otros tres.
 *
 * Los tres juntos porque son la misma pantalla y las mismas dos lineas de
 * comprobacion. Separarlos en tres ficheros de cuarenta lineas no aclararia nada.
 */

// ── Cambiar mi contrasena ────────────────────────────────────────────────────

export const entradaCambiarMiClave = z
  .object({
    /**
     * La de ahora. Opcional **solo** para quien no tiene ninguna todavia: quien
     * entro con el PIN de la invitacion y esta poniendo la suya por primera vez.
     */
    actual: z.string().min(1).max(512).optional(),
    nueva: z.string().min(1).max(512),
  })
  .strict();

export type EntradaCambiarMiClave = z.infer<typeof entradaCambiarMiClave>;

export const cambiarMiClave = comando<EntradaCambiarMiClave, { readonly cambiada: true }>({
  nombre: 'cambiar_mi_clave',
  entrada: entradaCambiarMiClave,
  // Es justo lo que hay que poder hacer con la contrasena por cambiar.
  aunConClavePorCambiar: true,

  async ejecutar({ sql, sesion }, entrada) {
    if (sesion === null) throw new FalloDeAplicacion('sin_sesion');

    const porque = porQueNoValeLaClave(entrada.nueva);
    if (porque !== null) throw new FalloDeAplicacion('faltan_datos', { campos: ['nueva'], porque });

    const filas = await sql<{ derivada: string }[]>`
      select derivada from estook.credencial where persona_id = ${sesion.personaId}
    `;
    const actual = filas[0]?.derivada;

    if (actual !== undefined) {
      // Ya tenia una: hay que saberla. Sin esto, a quien se dejara la sesion
      // abierta en la tablet del pase le podrian cambiar la contrasena de un clic
      // y quedarse con la cuenta.
      if (entrada.actual === undefined || !(await comprobar(entrada.actual, actual))) {
        throw new FalloDeAplicacion('no_cuadra');
      }
      if (await comprobar(entrada.nueva, actual)) {
        throw new FalloDeAplicacion('faltan_datos', {
          campos: ['nueva'],
          porque: 'Esa es la que ya tenías. Pon una distinta.',
        });
      }
    }

    const derivada = await derivar(entrada.nueva);

    await sql`
      insert into estook.credencial (persona_id, derivada, debe_cambiarla)
      values (${sesion.personaId}, ${derivada}, false)
      on conflict (persona_id) do update
        set derivada = excluded.derivada,
            debe_cambiarla = false,
            cambiada_en = now(),
            intentos_fallidos = 0,
            bloqueada_hasta = null
    `;

    // Todas las demas sesiones se cierran. Si alguien te habia robado la
    // contrasena, cambiarla tiene que echarle; si no, cambiarla no sirve de nada.
    // La de ahora no, claro: quien la cambia no quiere que le echen a el.
    await sql`
      update estook.sesion
         set cerrada_en = now(), cerrada_por = ${sesion.personaId}
       where persona_id = ${sesion.personaId} and cerrada_en is null and id <> ${sesion.id}
    `;

    return { cambiada: true };
  },
});

// ── Poner una contrasena a otra persona ──────────────────────────────────────

export const entradaPonerClaveA = z
  .object({
    persona_id: z.string().uuid(),
    organizacion_id: z.string().uuid(),
    nueva: z.string().min(1).max(512),
  })
  .strict();

export type EntradaPonerClaveA = z.infer<typeof entradaPonerClaveA>;

/**
 * La forma de volver a entrar cuando no hay correo (M4).
 *
 * Sin proveedor de correo dado de alta, «he olvidado mi contrasena» no puede
 * mandar un enlace. Y no hace falta que pueda: el Plan ya lo resolvio de otra
 * manera, «**segundo administrador** o correo de recuperacion obligatorio». Quien
 * lleva el local pone una contrasena nueva, la dice en mano, y quien entra con
 * ella **tiene que cambiarla antes de tocar nada**.
 *
 * Eso ultimo es lo que lo hace aceptable: la contrasena que te dio otra persona la
 * sabe otra persona, asi que dura lo que tarda en cambiarla. Lo cierra el
 * despachador, no la pantalla.
 */
export const ponerClaveA = comando<EntradaPonerClaveA, { readonly puesta: true }>({
  nombre: 'poner_clave_a',
  entrada: entradaPonerClaveA,
  exige: 'accion.invitar_personas',

  async ejecutar({ sql, sesion }, entrada) {
    if (sesion === null) throw new FalloDeAplicacion('sin_sesion');
    if (entrada.persona_id === sesion.personaId) {
      throw new FalloDeAplicacion('faltan_datos', {
        porque: 'Para cambiar la tuya, usa «Mi acceso»: ahí se te pide la de ahora.',
      });
    }

    const porque = porQueNoValeLaClave(entrada.nueva);
    if (porque !== null) throw new FalloDeAplicacion('faltan_datos', { campos: ['nueva'], porque });

    // Que esa persona sea de verdad de esta organizacion, y no un identificador
    // pescado. `personas_visibles` ya lo filtra por las politicas de M1.
    const suya = await sql<{ persona_id: string }[]>`
      select m.persona_id
        from estook.membresia m
       where m.persona_id = ${entrada.persona_id}
         and m.organizacion_id = ${entrada.organizacion_id}
         and m.persona_id in (select persona_id from estook.personas_visibles())
       limit 1
    `;
    if (!suya[0]) throw new FalloDeAplicacion('no_existe');

    const derivada = await derivar(entrada.nueva);

    // `debe_cambiarla` en `true`: es la mitad de lo que hace esto aceptable.
    //
    // Y ojo con las politicas: `credencial` solo deja escribir la propia. Esta
    // escritura la hace otra persona, asi que hace falta que la haga una funcion
    // con permiso. Se llama a `estook.poner_credencial`, que comprueba el permiso
    // por su cuenta en vez de fiarse de que se haya comprobado aqui.
    await sql`
      select estook.poner_credencial(
        ${entrada.persona_id}::uuid, ${derivada}, ${entrada.organizacion_id}::uuid
      )
    `;

    // Y se le echa de todas partes: la contrasena de antes ya no vale.
    await sql`
      select estook.cerrar_sesiones_de(${entrada.persona_id}::uuid, ${sesion.personaId}::uuid)
    `;

    await sql`
      select estook.anotar(
        ${entrada.organizacion_id}::uuid, 'poner_clave', 'credencial', ${entrada.persona_id},
        null, null, null, 'Contrasena puesta por otra persona; se cambia al entrar'
      )
    `;

    return { puesta: true };
  },
});

// ── Regenerar mi PIN, o el de otra persona ───────────────────────────────────

export const entradaRegenerarPin = z
  .object({
    persona_id: z.string().uuid(),
    local_id: z.string().uuid(),
  })
  .strict();

export type EntradaRegenerarPin = z.infer<typeof entradaRegenerarPin>;

/**
 * Un PIN nuevo, en pantalla y una sola vez.
 *
 * El caso de todos los dias: alguien se lo olvida. Y el otro caso, el que
 * importa: alguien lo ha visto por encima del hombro en el quiosco.
 *
 * No hace falta el viejo, porque el viejo no se puede consultar: lo que hay
 * guardado es su huella. Si se pudiera consultar, no serviria de nada.
 */
export const regenerarPin = comando<
  EntradaRegenerarPin,
  { readonly pin: string; readonly esElMio: boolean }
>({
  nombre: 'regenerar_pin',
  entrada: entradaRegenerarPin,

  async ejecutar({ sql, sesion }, entrada) {
    if (sesion === null) throw new FalloDeAplicacion('sin_sesion');

    const esElMio = entrada.persona_id === sesion.personaId;

    if (!esElMio) {
      const nivel = await sql<{ nivel: string }[]>`
        select estook.nivel_de_permiso(
          estook.persona_actual(), ${entrada.local_id}::uuid, 'accion.invitar_personas'
        )::text as nivel
      `;
      if (nivel[0]?.nivel !== 'ver_y_editar') throw new FalloDeAplicacion('sin_permiso');
    }

    // Que esa persona tenga acceso a ese local: un PIN de un local para quien no
    // trabaja ahi no significa nada.
    const trabaja = await sql<{ hay: boolean }[]>`
      select true as hay
        from estook.membresia m
        join estook.local l on l.id = ${entrada.local_id}::uuid
       where m.persona_id = ${entrada.persona_id}
         and m.organizacion_id = l.organizacion_id
         and m.desde <= current_date
         and (m.hasta is null or m.hasta >= current_date)
         and (m.revocada_en is null or m.revocada_en > now())
         and (
           m.alcance = 'organizacion'
           or (m.alcance = 'area' and l.area_id = m.area_id)
           or (m.alcance = 'local' and l.id = m.local_id)
         )
       limit 1
    `;
    if (!trabaja[0]) throw new FalloDeAplicacion('no_existe');

    const pin = await ponerPinNuevo(sql, entrada.persona_id, entrada.local_id);

    const organizaciones = await sql<{ organizacion_id: string }[]>`
      select organizacion_id from estook.local where id = ${entrada.local_id}
    `;
    const organizacionId = organizaciones[0]?.organizacion_id;

    if (organizacionId !== undefined) {
      await sql`
        select estook.anotar(
          ${organizacionId}::uuid, 'regenerar_pin', 'pin', ${entrada.persona_id},
          ${entrada.local_id}::uuid, null, null, null
        )
      `;
    }

    return { pin, esElMio };
  },
});
