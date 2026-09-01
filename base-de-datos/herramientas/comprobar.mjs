import { abrirConexion } from './conexion.mjs';

/**
 * Que hay de verdad en la base de datos a la que apunta DATABASE_URL.
 *
 *   pnpm bd:comprobar
 *
 * No cambia nada: solo lee y cuenta. Sirve para mirar de un vistazo si un
 * despliegue quedo como tenia que quedar, sin abrir el panel de nadie.
 */
const sql = abrirConexion();

function titulo(texto) {
  console.log(`\n${texto}`);
  console.log('─'.repeat(texto.length));
}

try {
  const [migracion] = await sql`
    select count(*)::int as cuantas, max(numero) as ultima from estook.migracion
  `;
  console.log(`Migraciones aplicadas: ${migracion.cuantas} (hasta la ${migracion.ultima})`);

  titulo('Tablas del esquema estook');
  const tablas = await sql`
    select c.relname as tabla,
           c.relrowsecurity as con_rls,
           (select count(*) from pg_policy p where p.polrelid = c.oid)::int as politicas
      from pg_class c
     where c.relnamespace = 'estook'::regnamespace and c.relkind = 'r'
     order by c.relname
  `;
  for (const t of tablas) {
    const marca = t.con_rls ? 'RLS' : '   ';
    console.log(`  ${marca}  ${t.tabla.padEnd(24)} ${t.politicas} politica(s)`);
  }

  titulo('Catalogo');
  const [catalogo] = await sql`
    select (select count(*) from estook.rol)::int             as roles,
           (select count(*) from estook.permiso)::int         as permisos,
           (select count(*) from estook.permiso_de_rol)::int  as concesiones
  `;
  console.log(
    `  ${catalogo.roles} roles · ${catalogo.permisos} permisos · ${catalogo.concesiones} concesiones`,
  );

  titulo('Datos');
  const censo = await sql`
    select o.codigo as organizacion,
           count(distinct a.id)::int as areas,
           count(distinct l.id)::int as locales,
           count(distinct m.persona_id)::int as personas
      from estook.organizacion o
      left join estook.area a on a.organizacion_id = o.id
      left join estook.local l on l.organizacion_id = o.id
      left join estook.membresia m on m.organizacion_id = o.id
     group by o.codigo order by o.codigo
  `;
  for (const fila of censo) {
    console.log(
      `  ${fila.organizacion.padEnd(14)} ${fila.areas} area(s) · ${fila.locales} local(es) · ${fila.personas} persona(s)`,
    );
  }

  titulo('Aceptacion de M1 · quien ve cuantos locales');
  const visibilidad = await sql`
    select p.correo,
           m.rol,
           (select count(*) from estook.locales_visibles(p.id))::int as locales
      from estook.persona p
      join estook.membresia m on m.persona_id = p.id
     order by p.correo
  `;
  for (const fila of visibilidad) {
    console.log(`  ${fila.correo.padEnd(30)} ${fila.rol.padEnd(16)} ve ${fila.locales} local(es)`);
  }

  titulo('La auditoria no se puede tocar');
  const [permisos] = await sql`
    select has_table_privilege('estook_api', 'estook.auditoria', 'INSERT') as anadir,
           has_table_privilege('estook_api', 'estook.auditoria', 'UPDATE') as modificar,
           has_table_privilege('estook_api', 'estook.auditoria', 'DELETE') as borrar
  `;
  console.log(
    `  anadir: ${permisos.anadir ? 'si' : 'no'} · modificar: ${permisos.modificar ? 'SI (mal)' : 'no'} · borrar: ${permisos.borrar ? 'SI (mal)' : 'no'}`,
  );

  titulo('Que hay fuera del esquema estook');
  const publicas = await sql`
    select count(*)::int as cuantas from pg_class
     where relnamespace = 'public'::regnamespace and relkind = 'r'
  `;
  console.log(`  Tablas en el esquema public: ${publicas[0].cuantas} (lo normal es 0)`);

  console.log('');
} catch (fallo) {
  console.error(`  fallo: ${fallo instanceof Error ? fallo.message : String(fallo)}`);
  process.exitCode = 1;
} finally {
  await sql.end();
}
