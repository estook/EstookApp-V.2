import { abrirConexion } from './conexion.mjs';
import { derivar } from '../../servidor/dominio/secretos.ts';
// La misma que usa `bd:cuenta-de-verdad`: una lista de palabras copiada es una
// lista que se desincroniza (regla 6).
import { claveDeUnSoloUso } from '@estook/dominio';

/**
 * Dar acceso total al admin desde la consola (0041).
 *
 *   .\estook.cmd bd:dar-admin estookapp@gmail.com "Estook"
 *
 * ── Por qué hace falta ───────────────────────────────────────────────────────
 *
 * Porque desde el admin solo da acceso **otro admin**, y el primero no lo puede
 * dar nadie. Es el mismo problema que resolvió `bd:cuenta-de-verdad` para la
 * primera cuenta de la app, y se resuelve igual.
 *
 * ── Lo que hace, y lo que no ─────────────────────────────────────────────────
 *
 * 1. **Si el correo no tiene cuenta, la crea** con una contraseña de un solo uso
 *    que se enseña una vez por pantalla y nace con «debes cambiarla».
 * 2. **Si ya tiene cuenta, no le toca la contraseña.** Entra con la suya.
 * 3. Le da **acceso total** y lo apunta en la auditoría del admin, a nombre de la
 *    consola.
 * 4. **No monta el segundo factor**: eso lo hace la persona en su móvil la primera
 *    vez que entra, porque el secreto no tiene que pasar por ninguna otra mano.
 *
 * **No usa una contraseña escrita en ningún sitio**, tampoco en un chat: lo que
 * pasa por un chat se da por visto.
 */
const [correoEscrito, nombre = 'Administrador'] = process.argv.slice(2);
const correo = (correoEscrito ?? '').trim().toLowerCase();

if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(correo)) {
  console.error(
    [
      'Falta el correo, o no tiene forma de correo.',
      '',
      '  .\\estook.cmd bd:dar-admin tu@correo.com "Tu Nombre"',
      '',
      'Ese correo es con el que entraras en estook.com/admin/.',
    ].join('\n'),
  );
  process.exit(1);
}

const sql = abrirConexion();

try {
  await sql.begin(async (tx) => {
    const [existente] = await tx`
      select id, es_ejemplo, activa from estook.persona where correo = ${correo}
    `;

    if (existente?.es_ejemplo) {
      throw new Error(
        `${correo} es una persona de ejemplo, y su contraseña está en el repositorio. Usa un correo de verdad.`,
      );
    }
    if (existente && !existente.activa) {
      throw new Error(`${correo} está dada de baja en Estook, así que no podría entrar.`);
    }

    const [persona] = existente
      ? [existente]
      : await tx`
          insert into estook.persona (correo, nombre, es_ejemplo)
          values (${correo}, ${nombre}, false)
          returning id
        `;

    const [credencial] = await tx`
      select 1 as hay from estook.credencial where persona_id = ${persona.id}
    `;
    let clave = null;
    if (!credencial) {
      clave = claveDeUnSoloUso();
      await tx`
        insert into estook.credencial (persona_id, derivada, debe_cambiarla)
        values (${persona.id}, ${await derivar(clave)}, true)
      `;
    }

    const [vivo] = await tx`
      select nivel::text as nivel from plataforma.administrador
       where persona_id = ${persona.id} and quitado_en is null
    `;

    if (vivo) {
      console.log(
        `\n  ${correo} ya tenía acceso al admin (${vivo.nivel}). No se ha cambiado nada.\n`,
      );
      return;
    }

    await tx`
      insert into plataforma.administrador (persona_id, nivel)
      values (${persona.id}, 'total')
    `;
    await tx`
      insert into plataforma.auditoria (accion, entidad, entidad_id, despues)
      values (
        'dar_acceso', 'administrador', ${persona.id},
        ${JSON.stringify({ correo, nivel: 'total', desde: 'consola', personaNueva: !existente })}::text::jsonb
      )
    `;

    console.log(`\n  Acceso total al admin, en la base ${sql.donde}.\n`);
    console.log(`  correo      ${correo}`);
    if (clave) {
      console.log(`  contrasena  ${clave}`);
      console.log(`\n  Se enseña **una vez**: no se guarda en ningun sitio, solo su huella.`);
      console.log(`  Al entrar te pedira que te pongas una tuya, y esta dejara de valer.`);
    } else {
      console.log(`  contrasena  la que ya tenias: no se ha tocado`);
    }
    console.log(`\n  Entra en https://estook.com/admin/ y monta el segundo factor con tu movil:`);
    console.log(`  en el admin es obligatorio, y sin el no se ve nada.\n`);
  });
} catch (fallo) {
  console.error(`  fallo: ${fallo instanceof Error ? fallo.message : String(fallo)}`);
  process.exitCode = 1;
} finally {
  await sql.end();
}
