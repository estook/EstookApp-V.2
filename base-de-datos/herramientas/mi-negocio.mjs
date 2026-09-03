import { abrirConexion } from './conexion.mjs';
import { comoCodigo } from '@estook/dominio';

/**
 * Crear el negocio de una cuenta de verdad: organizacion, local y membresia.
 *
 *   pnpm bd:mi-negocio tu@correo.com "Nombre de tu bar"
 *
 * ── Por que hace falta, y por que se vio tarde ───────────────────────────────
 *
 * `bd:cuenta-de-verdad` crea la persona y su clave, y ya avisaba de esto:
 *
 *   «Ojo: esta persona todavia no pertenece a ningun negocio, asi que al entrar
 *    vera "tu cuenta no esta asociada a ningun negocio". [...] se crean a mano
 *    en la base de datos.»
 *
 * «A mano en la base de datos» estaba escrito como si fuera un paso, y no lo
 * era: son tres tablas, un rol que hay que buscar en `estook.rol`, un alcance y
 * un codigo con una forma concreta. **Y sin eso no se puede ver M5 en un movil
 * de verdad**, que es la regla 11 y lo unico que le faltaba al modulo.
 *
 * Un aviso que dice «hazlo a mano» sin decir como es un pendiente disfrazado de
 * documentacion.
 *
 * ── El local nace con el alta SIN terminar, y es el punto ────────────────────
 *
 * Lo que se quiere probar en el movil es justamente el alta: las ocho preguntas,
 * la marca, los objetivos. Un local que naciera montado dejaria M5 sin poderse
 * mirar, que es lo contrario de para lo que existe esto.
 *
 * Es exactamente como nace un local de verdad: las columnas del alta se quedan
 * nulas hasta que alguien las responde.
 *
 * ── Y no marca nada como ejemplo ─────────────────────────────────────────────
 *
 * Ni la organizacion, ni el local, ni la persona. Son tuyos de verdad, asi que
 * `bd:sin-cuentas-de-ejemplo` no los toca y el boton de «quitar los ejemplos»
 * tampoco. Es la misma razon por la que `bd:cuenta-de-verdad` pone
 * `es_ejemplo = false`.
 */
const [correo, nombre = 'Mi restaurante'] = process.argv.slice(2);

if (!correo || !/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(correo)) {
  console.error(
    [
      'Falta el correo, o no tiene forma de correo.',
      '',
      '  pnpm bd:mi-negocio tu@correo.com "Nombre de tu bar"',
      '',
      'El correo es el de la cuenta que ya creaste con `pnpm bd:cuenta-de-verdad`.',
    ].join('\n'),
  );
  process.exit(1);
}

/** Del nombre a un codigo, con el mismo `comoCodigo` que usa `crear_local`. */
function codigoDesde(texto) {
  const limpio = comoCodigo(texto);
  return limpio.length >= 2 ? limpio.slice(0, 40) : `local-${Date.now().toString(36)}`;
}

const sql = abrirConexion();

try {
  const [persona] = await sql`
    select id, correo, nombre, es_ejemplo from estook.persona
     where correo = ${correo.toLowerCase()}
  `;

  if (!persona) {
    console.error(
      [
        `\n  No hay ninguna persona con el correo ${correo}.`,
        '',
        '  Primero crea la cuenta:',
        `    pnpm bd:cuenta-de-verdad ${correo} "Tu Nombre"`,
        '',
      ].join('\n'),
    );
    process.exit(1);
  }

  // La misma negativa que en `cuenta-de-verdad`: a una persona de ejemplo no se
  // le monta un negocio de verdad, porque acabaria mezclada con lo sembrado.
  if (persona.es_ejemplo) {
    console.error([`\n  ${correo} es una persona de ejemplo. Usa un correo tuyo.`, ''].join('\n'));
    process.exit(1);
  }

  const codigo = codigoDesde(nombre);

  const [organizacion] = await sql`
    insert into estook.organizacion (codigo, nombre, usa_areas, es_ejemplo)
    values (${codigo}, ${nombre}, false, false)
    on conflict (codigo) do update set nombre = excluded.nombre
    returning id, codigo, nombre, es_ejemplo
  `;

  if (organizacion.es_ejemplo) {
    console.error(
      [
        `\n  Ya existe una organizacion de ejemplo con el codigo «${codigo}».`,
        '  Ponle a tu negocio otro nombre para que no choquen.',
        '',
      ].join('\n'),
    );
    process.exit(1);
  }

  // El local, **sin nada del alta respondido**: sin tipo, sin direccion y sin
  // objetivos. Es lo que hace que al entrar te lleve a las ocho preguntas.
  const [local] = await sql`
    insert into estook.local (organizacion_id, area_id, codigo, nombre, zona_horaria, es_ejemplo)
    values (${organizacion.id}, null, ${codigo}, ${nombre}, 'Europe/Madrid', false)
    on conflict (organizacion_id, codigo) do update set nombre = excluded.nombre
    returning id, codigo, onboarding_terminado
  `;

  // `direccion` y no `gerente`: es tu negocio, asi que lo ves todo. El alcance
  // es de organizacion, para que un segundo local salga solo sin tocar nada.
  await sql`
    insert into estook.membresia (persona_id, organizacion_id, alcance, rol)
    values (${persona.id}, ${organizacion.id}, 'organizacion', 'direccion')
    on conflict do nothing
  `;

  console.log(`\n  Negocio listo en la base ${sql.donde}.\n`);
  console.log(`  organizacion  ${organizacion.nombre}  (${organizacion.codigo})`);
  console.log(`  local         ${local.codigo}`);
  console.log(`  ${persona.nombre} entra como direccion, y lo ve todo.\n`);

  if (local.onboarding_terminado) {
    console.log('  El alta de ese local ya estaba terminada, asi que al entrar');
    console.log('  iras al Panel. Para volver a recorrerla, usa «Retomar el alta».\n');
  } else {
    console.log('  El alta esta sin empezar **a proposito**: al entrar te llevara');
    console.log('  a las ocho preguntas, que es lo que hay que mirar en el movil.\n');
  }
} catch (fallo) {
  console.error(`  fallo: ${fallo instanceof Error ? fallo.message : String(fallo)}`);
  process.exitCode = 1;
} finally {
  await sql.end();
}
