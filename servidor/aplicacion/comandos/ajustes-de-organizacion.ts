import { z } from 'zod';
import { comando, FalloDeAplicacion } from '../contrato.ts';

/**
 * Lo que la organizacion decide sobre el acceso (M4).
 *
 * Dos comandos, los dos del Plan: «doble factor **exigible desde la
 * organizacion**» y «segundo administrador **o correo de recuperacion**
 * obligatorio».
 *
 * Los dos escriben en `estook.organizacion`, cuya politica de M1 exige
 * `app.ajustes` en `ver_y_editar` sobre la organizacion. No se comprueba aqui: si
 * la politica no deja, el `update` no toca ninguna fila y sale «sin permiso». Un
 * dueno, no dos (regla 6).
 */

// ── Exigir el segundo factor ─────────────────────────────────────────────────

export const entradaExigirDobleFactor = z
  .object({
    organizacion_id: z.string().uuid(),
    exigir: z.boolean(),
    version: z.number().int().positive(),
  })
  .strict();

export type EntradaExigirDobleFactor = z.infer<typeof entradaExigirDobleFactor>;

export const exigirDobleFactor = comando<
  EntradaExigirDobleFactor,
  { readonly version: number; readonly aQuienLeFalta: number }
>({
  nombre: 'exigir_doble_factor',
  entrada: entradaExigirDobleFactor,

  async ejecutar({ sql, sesion }, entrada) {
    if (sesion === null) throw new FalloDeAplicacion('sin_sesion');

    const cambiadas = await sql<{ version: number }[]>`
      update estook.organizacion
         set exige_doble_factor = ${entrada.exigir}
       where id = ${entrada.organizacion_id} and version = ${entrada.version}
      returning version
    `;

    const cambiada = cambiadas[0];
    if (!cambiada) {
      const existe = await sql<{ version: number }[]>`
        select version from estook.organizacion where id = ${entrada.organizacion_id}
      `;
      if (existe[0]) {
        throw new FalloDeAplicacion('lo_cambio_otra_persona', {
          version_actual: existe[0].version,
        });
      }
      throw new FalloDeAplicacion('sin_permiso');
    }

    // A cuanta gente le va a caer encima. Se devuelve para poder decirlo antes de
    // que empiecen a llamar: «esto se lo vas a pedir manana a catorce personas».
    const faltan = await sql<{ cuantas: number }[]>`
      select count(distinct m.persona_id)::int as cuantas
        from estook.membresia m
        join estook.persona p on p.id = m.persona_id and p.activa
       where m.organizacion_id = ${entrada.organizacion_id}
         and m.desde <= current_date
         and (m.hasta is null or m.hasta >= current_date)
         and (m.revocada_en is null or m.revocada_en > now())
         and not exists (
           select 1 from estook.doble_factor d
            where d.persona_id = m.persona_id and d.confirmado_en is not null
         )
    `;

    await sql`
      select estook.anotar(
        ${entrada.organizacion_id}::uuid, 'modificar', 'organizacion',
        ${entrada.organizacion_id}, null, null,
        ${JSON.stringify({ exige_doble_factor: entrada.exigir })}::jsonb, null
      )
    `;

    return { version: cambiada.version, aQuienLeFalta: faltan[0]?.cuantas ?? 0 };
  },
});

// ── El correo de recuperacion ────────────────────────────────────────────────

export const entradaCorreoDeRecuperacion = z
  .object({
    organizacion_id: z.string().uuid(),
    correo: z.string().trim().toLowerCase().email().max(320).nullable(),
    version: z.number().int().positive(),
  })
  .strict();

export type EntradaCorreoDeRecuperacion = z.infer<typeof entradaCorreoDeRecuperacion>;

export const ponerCorreoDeRecuperacion = comando<
  EntradaCorreoDeRecuperacion,
  { readonly version: number }
>({
  nombre: 'poner_correo_de_recuperacion',
  entrada: entradaCorreoDeRecuperacion,

  async ejecutar({ sql, sesion }, entrada) {
    if (sesion === null) throw new FalloDeAplicacion('sin_sesion');

    // Quitarlo solo se puede si queda un segundo administrador. Es la otra mitad
    // de «segundo administrador **o** correo de recuperacion obligatorio»: si se
    // pudiera quitar sin mas, el «o» no serviria de nada.
    if (entrada.correo === null) {
      const puede = await sql<{ tiene: boolean }[]>`
        select estook.tiene_como_volver_a_entrar(${entrada.organizacion_id}::uuid, null) as tiene
      `;
      // Con el correo todavia puesto, la funcion diria que si por el correo. Hay
      // que preguntar por lo otro: ¿hay dos personas que administren?
      const administradores = await sql<{ cuantos: number }[]>`
        select count(distinct m.persona_id)::int as cuantos
          from estook.membresia m
          join estook.persona p on p.id = m.persona_id and p.activa
         where m.organizacion_id = ${entrada.organizacion_id}
           and m.alcance = 'organizacion'
           and m.rol in ('direccion', 'administrador_de_cuenta')
           and m.desde <= current_date
           and (m.hasta is null or m.hasta >= current_date)
         and (m.revocada_en is null or m.revocada_en > now())
      `;
      if (puede[0]?.tiene !== true || (administradores[0]?.cuantos ?? 0) < 2) {
        throw new FalloDeAplicacion('se_queda_sin_administrador');
      }
    }

    const cambiadas = await sql<{ version: number }[]>`
      update estook.organizacion
         set correo_de_recuperacion = ${entrada.correo}
       where id = ${entrada.organizacion_id} and version = ${entrada.version}
      returning version
    `;

    const cambiada = cambiadas[0];
    if (!cambiada) {
      const existe = await sql<{ version: number }[]>`
        select version from estook.organizacion where id = ${entrada.organizacion_id}
      `;
      if (existe[0]) {
        throw new FalloDeAplicacion('lo_cambio_otra_persona', {
          version_actual: existe[0].version,
        });
      }
      throw new FalloDeAplicacion('sin_permiso');
    }

    // El correo **no** se escribe en la auditoria: es un dato de contacto y la
    // auditoria la lee mas gente de la que tiene por que verlo.
    await sql`
      select estook.anotar(
        ${entrada.organizacion_id}::uuid, 'modificar', 'organizacion',
        ${entrada.organizacion_id}, null, null,
        ${JSON.stringify({ correo_de_recuperacion: entrada.correo === null ? 'quitado' : 'puesto' })}::jsonb,
        null
      )
    `;

    return { version: cambiada.version };
  },
});
