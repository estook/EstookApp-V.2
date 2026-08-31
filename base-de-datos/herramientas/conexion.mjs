import postgres from 'postgres';

/**
 * La unica puerta a Postgres de las herramientas de base de datos.
 *
 * La cadena de conexion no vive en el repositorio: sale de `DATABASE_URL` en
 * `.env.local`, que esta en `.gitignore`. Si falta, se dice que falta y donde se
 * pone, en vez de fallar con un error de red a los treinta segundos.
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

  return postgres(url, {
    max: 1,
    onnotice: () => {},
    // Supabase exige TLS; un Postgres local normalmente no lo tiene.
    ssl: url.includes('localhost') || url.includes('127.0.0.1') ? false : 'require',
  });
}
