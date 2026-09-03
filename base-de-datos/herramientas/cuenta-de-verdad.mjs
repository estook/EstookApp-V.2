import { abrirConexion } from './conexion.mjs';
import { derivar } from '../../servidor/dominio/secretos.ts';
// La misma que usa «Quien tiene acceso» para dar una contraseña nueva: una lista
// copiada es una lista que se desincroniza (regla 6).
import { claveDeUnSoloUso } from '@estook/dominio';

/**
 * Crear una cuenta de verdad en una base de datos, con una clave de un solo uso.
 *
 *   pnpm bd:cuenta-de-verdad tu@correo.com "Tu Nombre"
 *
 * ── Por que hace falta ───────────────────────────────────────────────────────
 *
 * Porque a una base de datos remota **no se le siembran credenciales de ejemplo**
 * (M5), y sin eso no habria forma de entrar en la aplicacion publicada para
 * comprobarla en un movil de verdad, que es la regla 11.
 *
 * El registro abierto no existe y no va a existir: «tres formas de entrar por
 * primera vez: registro, invitacion, y nada mas» (Manifiesto 31), y el registro
 * lo monta M26 con su cobro. Hasta entonces, la primera cuenta de un entorno se
 * crea con esto.
 *
 * ── Las tres cosas que la hacen segura ───────────────────────────────────────
 *
 * 1. **La contrasena se genera aqui y se enseña una vez.** No se escribe en el
 *    repositorio, ni se pide por teclado, ni viaja por un chat: sale por pantalla
 *    y se apunta. Si se pierde, se vuelve a ejecutar esto.
 * 2. **Nace con «debes cambiarla».** La primera vez que se entra, M4 obliga a
 *    ponerse una propia antes de tocar nada. Asi la clave que salio por pantalla
 *    deja de valer en cuanto se usa.
 * 3. **La persona NO se marca como ejemplo.** Es una cuenta de verdad, y por eso
 *    `pnpm bd:sin-cuentas-de-ejemplo` no la va a tocar nunca.
 */
const [correo, nombre = 'Administrador'] = process.argv.slice(2);

if (!correo || !/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(correo)) {
  console.error(
    [
      'Falta el correo, o no tiene forma de correo.',
      '',
      '  pnpm bd:cuenta-de-verdad tu@correo.com "Tu Nombre"',
      '',
      'Ese correo es con el que entraras en la aplicacion.',
    ].join('\n'),
  );
  process.exit(1);
}

const sql = abrirConexion();

try {
  const clave = claveDeUnSoloUso();
  const derivada = await derivar(clave);

  const [persona] = await sql`
    insert into estook.persona (correo, nombre, es_ejemplo)
    values (${correo.toLowerCase()}, ${nombre}, false)
    on conflict (correo) do update set nombre = excluded.nombre
    returning id, correo, es_ejemplo
  `;

  if (persona.es_ejemplo) {
    console.error(
      [
        `  ${correo} es una persona de ejemplo, asi que no se le pone una clave de verdad.`,
        '  Usa un correo tuyo.',
      ].join('\n'),
    );
    process.exit(1);
  }

  await sql`
    insert into estook.credencial (persona_id, derivada, debe_cambiarla)
    values (${persona.id}, ${derivada}, true)
    on conflict (persona_id) do update
      set derivada = excluded.derivada, debe_cambiarla = true,
          intentos_fallidos = 0, bloqueada_hasta = null
  `;

  const membresias = await sql`
    select o.nombre, m.rol::text as rol
      from estook.membresia m
      join estook.organizacion o on o.id = m.organizacion_id
     where m.persona_id = ${persona.id}
  `;

  console.log(`\n  Cuenta lista en la base ${sql.donde}.\n`);
  console.log(`  correo      ${persona.correo}`);
  console.log(`  contrasena  ${clave}`);
  console.log(`\n  Se enseña **una vez**: no se guarda en ningun sitio, solo su huella.`);
  console.log(`  Al entrar te pedira que te pongas una tuya, y esta dejara de valer.\n`);

  if (membresias.length === 0) {
    console.log(
      [
        '  Ojo: esta persona todavia no pertenece a ningun negocio, asi que al',
        '  entrar vera «tu cuenta no esta asociada a ningun negocio».',
        '',
        '  Para trabajar hace falta una organizacion, un local y una membresia.',
        '  Hasta que M26 monte el registro, se crean a mano en la base de datos.',
        '',
      ].join('\n'),
    );
  } else {
    for (const m of membresias) {
      console.log(`  entra en    ${m.nombre} como ${m.rol}`);
    }
    console.log('');
  }
} catch (fallo) {
  console.error(`  fallo: ${fallo instanceof Error ? fallo.message : String(fallo)}`);
  process.exitCode = 1;
} finally {
  await sql.end();
}
