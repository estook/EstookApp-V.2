import postgres from 'postgres';

/**
 * Donde vive la base a la que se esta hablando: `local` o `remota`.
 *
 * Existe porque **una etiqueta miente y una direccion no** (M5). La semilla de
 * acceso se negaba a correr «en produccion» mirando la variable `ENTORNO`, que en
 * la maquina de quien desarrolla pone `desarrollo` mientras `DATABASE_URL`, dos
 * lineas mas abajo del mismo fichero, apunta al Supabase de verdad. La negativa
 * no podia saltar nunca, y ocho cuentas con una clave publicada acabaron en
 * produccion.
 *
 * Quien abre la conexion es el unico que sabe a donde va, asi que lo dice el.
 */
export function dondeApunta(url) {
  return /(?:^|@|\/\/)(?:localhost|127\.0\.0\.1|\[::1\])(?::|\/|$)/.test(url) ? 'local' : 'remota';
}

/**
 * La unica puerta a Postgres de las herramientas de base de datos.
 *
 * La cadena de conexion no vive en el repositorio: sale de `DATABASE_URL` en
 * `.env.local`, que esta en `.gitignore`. Si falta, se dice que falta y donde se
 * pone, en vez de fallar con un error de red a los treinta segundos.
 *
 * Devuelve la conexion con `.donde` puesto: `local` o `remota`.
 */
export function abrirConexion() {
  const url = process.env['DATABASE_URL'] ?? process.env['SUPABASE_DB_URL'];

  if (!url) {
    console.error(
      [
        'Falta DATABASE_URL.',
        '',
        'Que ha pasado: las herramientas de base de datos no saben a que Postgres conectarse.',
        'Que se puede hacer: crea `.env.local` en la raiz partiendo de `.env.example` y pon ahi',
        'la cadena de conexion de tu entorno de desarrollo.',
        '',
        'Nunca se escribe una clave dentro del repositorio.',
      ].join('\n'),
    );
    process.exit(1);
  }

  if (/TU-PROYECTO|CONTRASENA|\[YOUR-PASSWORD\]/i.test(url)) {
    console.error(
      [
        'DATABASE_URL sigue siendo la plantilla.',
        '',
        'Que ha pasado: en `.env.local` todavia pone TU-PROYECTO o CONTRASENA en vez de',
        'los datos de verdad.',
        'Que se puede hacer: en Supabase, boton Connect, pestana de cadena de conexion,',
        'copia la URI entera y pegala tal cual sustituyendo la contrasena.',
      ].join('\n'),
    );
    process.exit(1);
  }

  const donde = dondeApunta(url);
  // El agrupador de conexiones de Supabase (pooler) no lleva bien las consultas
  // preparadas. Sin esto, la primera migracion falla con un error que no dice
  // nada util. Se detecta por el nombre del servidor y se apagan.
  const porElAgrupador = url.includes('pooler.supabase.com');

  const sql = postgres(url, {
    max: 1,
    onnotice: () => {},
    // Supabase exige TLS; un Postgres local normalmente no lo tiene.
    ssl: donde === 'local' ? false : 'require',
    ...(porElAgrupador ? { prepare: false } : {}),
    // Las migraciones grandes tardan; el minuto por defecto se queda corto.
    connect_timeout: 30,
    idle_timeout: 20,
  });

  // Se cuelga de la conexion, no se devuelve aparte, para que sea imposible
  // usar una y olvidarse de la otra.
  sql.donde = donde;
  return sql;
}
