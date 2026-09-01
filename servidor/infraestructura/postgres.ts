import postgres from 'postgres';

/**
 * La unica puerta a Postgres (M2).
 *
 * **Decision 0005, y hay que leerla antes de tocar esto.** Aqui se aplica su
 * regla, que no es de comodidad sino de seguridad:
 *
 *   begin;
 *     set local role estook_api;              -- deja de ser el dueno
 *     set local estook.persona_id = '...';    -- quien pregunta
 *     set local estook.correlacion_id = '...';
 *     ... aqui, y solo aqui, se lee y se escribe
 *   commit;
 *
 * Las Edge Functions comparten conexiones entre peticiones. Con un `set` normal
 * la identidad se quedaria pegada a la conexion y **la heredaria la siguiente
 * peticion**: el camarero de un bar leyendo los datos de otro. Con `set local`
 * muere al terminar la transaccion.
 *
 * Por eso no hay forma de consultar fuera de una transaccion: `enTransaccion` es
 * la unica salida, igual que el cliente no puede escribir en una tabla de
 * dominio (regla 3).
 */

export type Sql = postgres.TransactionSql;

export interface QuienPregunta {
  /** Vacio en las rutas publicas, como la carta digital. Entonces no se ve nada. */
  readonly personaId: string | null;
  readonly correlacionId: string;
}

let conexion: postgres.Sql | null = null;

function abrir(): postgres.Sql {
  if (conexion) return conexion;

  const url = process.env['DATABASE_URL'];
  if (!url) {
    throw new Error(
      'Falta DATABASE_URL. La API no sabe a que Postgres conectarse. Se declara en los secretos del entorno, nunca en el repositorio.',
    );
  }

  conexion = postgres(url, {
    // El agrupador de Supabase no lleva bien las consultas preparadas.
    prepare: !url.includes('pooler.supabase.com'),
    ssl: url.includes('localhost') || url.includes('127.0.0.1') ? false : 'require',
    connect_timeout: 15,
    idle_timeout: 20,
    onnotice: () => {},
  });

  return conexion;
}

/**
 * Ejecuta algo como `estook_api`, en nombre de quien pregunta, dentro de una
 * transaccion. Es la unica forma de hablar con la base de datos.
 */
export async function enTransaccion<T>(
  quien: QuienPregunta,
  hacer: (sql: Sql) => Promise<T>,
): Promise<T> {
  return abrir().begin(async (sql) => {
    // El orden importa: primero el disfraz, luego la identidad.
    await sql`set local role estook_api`;
    await sql`select set_config('estook.persona_id', ${quien.personaId ?? ''}, true)`;
    await sql`select set_config('estook.correlacion_id', ${quien.correlacionId}, true)`;
    return hacer(sql);
  }) as Promise<T>;
}

/** Para las pruebas y para los trabajos, que se cierran al terminar. */
export async function cerrarConexion(): Promise<void> {
  if (conexion) {
    await conexion.end();
    conexion = null;
  }
}
