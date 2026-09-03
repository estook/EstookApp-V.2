import { abrirConexion } from './conexion.mjs';

/**
 * Cerrar las cuentas de ejemplo de una base de datos que no es la tuya.
 *
 *   pnpm bd:sin-cuentas-de-ejemplo
 *
 * ── Por que existe esta herramienta ──────────────────────────────────────────
 *
 * Porque hizo falta. La semilla de acceso de M4 se negaba a correr «en
 * produccion» mirando la variable `ENTORNO`, y esa negativa **no podia saltar
 * nunca**: `ENTORNO` vive en el `.env.local` de quien desarrolla, donde pone
 * `desarrollo`, y `DATABASE_URL`, dos lineas mas abajo del mismo fichero, apunta
 * al Supabase de verdad.
 *
 * Resultado: la base de datos de produccion acabo con ocho cuentas cuya
 * contrasena esta publicada en GitHub, y una de ellas con rol `direccion`. No se
 * noto porque la API todavia no estaba desplegada; el dia que se despliegue, esas
 * ocho cuentas son ocho puertas abiertas.
 *
 * La 0020 arregla la causa —ahora se mira **a donde se conecta**, no una
 * etiqueta— y esto arregla la consecuencia: limpia lo que ya este puesto.
 *
 * ── Que borra, y que NO ──────────────────────────────────────────────────────
 *
 * Borra **con que entran**: las contrasenas, los PIN, los segundos factores y las
 * sesiones de las personas marcadas `es_ejemplo`.
 *
 * **No borra a las personas ni sus locales.** Y es a proposito: el restaurante de
 * ejemplo es lo que hace posible el modo demostracion (M5), que abre una visita
 * de solo lectura sin pedirle a nadie una cuenta. Quitar las personas se cargaria
 * la demostracion; quitar sus credenciales no, porque la demostracion no las usa.
 *
 * Y no toca ninguna persona de verdad: la condicion `es_ejemplo` es la segunda
 * red, igual que en la semilla.
 */
const sql = abrirConexion();

try {
  console.log(`\n  Cerrando las cuentas de ejemplo · base ${sql.donde}\n`);

  const [antes] = await sql`
    select
      (select count(*) from estook.persona where es_ejemplo)                  as personas,
      (select count(*) from estook.credencial c
         join estook.persona p on p.id = c.persona_id where p.es_ejemplo)     as credenciales,
      (select count(*) from estook.pin x
         join estook.persona p on p.id = x.persona_id where p.es_ejemplo)     as pines,
      (select count(*) from estook.doble_factor d
         join estook.persona p on p.id = d.persona_id where p.es_ejemplo)     as dobles,
      (select count(*) from estook.sesion s
         join estook.persona p on p.id = s.persona_id
        where p.es_ejemplo and s.cerrada_en is null)                          as sesiones,
      (select count(*) from estook.persona where not es_ejemplo)              as de_verdad
  `;

  console.log(`  personas de ejemplo   ${antes.personas}`);
  console.log(`  con contrasena        ${antes.credenciales}`);
  console.log(`  con PIN               ${antes.pines}`);
  console.log(`  con segundo factor    ${antes.dobles}`);
  console.log(`  sesiones abiertas     ${antes.sesiones}`);
  console.log(`  personas de verdad    ${antes.de_verdad}   (no se toca ninguna)\n`);

  if (
    Number(antes.credenciales) === 0 &&
    Number(antes.pines) === 0 &&
    Number(antes.dobles) === 0 &&
    Number(antes.sesiones) === 0
  ) {
    console.log('  No hay nada que cerrar. Esta base ya esta limpia.\n');
  } else {
    // En una transaccion: o se cierran todas o no se cierra ninguna. Media
    // limpieza es peor que ninguna, porque parece hecha.
    await sql.begin(async (tx) => {
      await tx`
        delete from estook.sesion s
         using estook.persona p
         where p.id = s.persona_id and p.es_ejemplo
      `;
      await tx`
        delete from estook.doble_factor d
         using estook.persona p
         where p.id = d.persona_id and p.es_ejemplo
      `;
      await tx`
        delete from estook.pin x
         using estook.persona p
         where p.id = x.persona_id and p.es_ejemplo
      `;
      await tx`
        delete from estook.credencial c
         using estook.persona p
         where p.id = c.persona_id and p.es_ejemplo
      `;
    });

    console.log('  Cerradas. Ninguna cuenta de ejemplo puede entrar ya.\n');
  }

  console.log('  Para entrar de verdad en esta base:  pnpm bd:cuenta-de-verdad tu@correo.com\n');
} catch (fallo) {
  console.error(`  fallo: ${fallo instanceof Error ? fallo.message : String(fallo)}`);
  process.exitCode = 1;
} finally {
  await sql.end();
}
