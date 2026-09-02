import postgres from 'postgres';
import { variable } from '@estook/utiles';
import { huellaDeToken } from '../dominio/secretos.ts';

/**
 * La unica puerta a Postgres (M2, ampliada en M4).
 *
 * **Decision 0005, y hay que leerla antes de tocar esto.** Aqui se aplica su
 * regla, que no es de comodidad sino de seguridad:
 *
 *   begin;
 *     set local role estook_api;              -- deja de ser el dueno
 *     ...se resuelve la sesion...             -- M4: quien es, se demuestra
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
 *
 * ── Lo que cambia en M4, y es lo importante ──────────────────────────────────
 *
 * Hasta hoy quien llamaba **decia** quien era, en una cabecera. Estaba bien
 * mientras no hubiera login —lo advertia cada comentario que lo rodeaba— pero es
 * exactamente lo que prohibe la regla 4: una regla de acceso que se cumple
 * porque el cliente colabora no es una regla de acceso.
 *
 * Ahora quien llama trae un **token**, y la identidad sale de resolverlo contra
 * `estook.sesion`. Falsificarlo exige adivinar 256 bits de azar.
 *
 * El orden importa y no es negociable: el token se resuelve **despues** de
 * ponerse el disfraz de `estook_api` y **antes** de declarar la identidad. Si se
 * resolviera antes del disfraz, lo haria el dueno de las tablas y las politicas
 * no aplicarian; si se resolviera despues de declarar la identidad, no habria
 * identidad que declarar.
 */

export type Sql = postgres.TransactionSql;

/** La sesion viva detras de una peticion. Nula en `entrar` y en lo publico. */
export interface SesionViva {
  readonly id: string;
  readonly personaId: string;
  readonly organizacionId: string | null;
  readonly localId: string | null;
  readonly dobleFactorSuperado: boolean;
  readonly debeCambiarClave: boolean;
  /** Una visita al restaurante de ejemplo (M5). Mira todo y no escribe nada. */
  readonly esDemostracion: boolean;
}

export interface QuienPregunta {
  /**
   * El token que trajo la peticion, tal cual, o nulo.
   *
   * Se convierte en su huella **aqui**, y no en la capa de transporte: la regla
   * A4 dice que `servidor/api` es transporte y validacion de forma, y no puede
   * saltar ni a dominio ni a infraestructura. Asi que la API lee la cabecera y
   * poco mas; quien sabe que del token se guarda su SHA-256 es esta capa, que es
   * la unica que sabe como estan guardadas las cosas.
   */
  readonly tokenDeSesion: string | null;
  readonly correlacionId: string;
}

let conexion: postgres.Sql | null = null;

function abrir(): postgres.Sql {
  if (conexion) return conexion;

  const url = variable('DATABASE_URL');
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
 * Ejecuta como `estook_api`, en nombre de quien trae el token, dentro de una
 * transaccion. Es la unica forma de hablar con la base de datos.
 */
export async function enTransaccion<T>(
  quien: QuienPregunta,
  hacer: (sql: Sql, sesion: SesionViva | null) => Promise<T>,
): Promise<T> {
  return abrir().begin(async (sql) => {
    // 1 · El disfraz. A partir de aqui las politicas de M1 aplican.
    await sql`set local role estook_api`;

    // 2 · Quien es. `sesion_activa` es `security definer` a proposito: al
    //     resolver el token todavia no hay identidad puesta, que es justo lo que
    //     se esta averiguando. Esta razonado en la migracion 0018.
    const sesion =
      quien.tokenDeSesion === null
        ? null
        : await resolver(sql, await huellaDeToken(quien.tokenDeSesion));

    // 3 · Y ahora si, se declara. `set local`, para que muera con la transaccion.
    await sql`select set_config('estook.persona_id', ${sesion?.personaId ?? ''}, true)`;
    await sql`select set_config('estook.correlacion_id', ${quien.correlacionId}, true)`;

    return hacer(sql, sesion);
  }) as Promise<T>;
}

async function resolver(sql: Sql, huella: string): Promise<SesionViva | null> {
  const filas = await sql<
    {
      sesion_id: string;
      persona_id: string;
      organizacion_id: string | null;
      local_id: string | null;
      doble_factor_superado: boolean;
      debe_cambiar_clave: boolean;
      es_demostracion: boolean;
    }[]
  >`select * from estook.sesion_activa(${huella})`;

  const fila = filas[0];
  if (!fila) return null;

  return {
    id: fila.sesion_id,
    personaId: fila.persona_id,
    organizacionId: fila.organizacion_id,
    localId: fila.local_id,
    dobleFactorSuperado: fila.doble_factor_superado,
    debeCambiarClave: fila.debe_cambiar_clave,
    esDemostracion: fila.es_demostracion,
  };
}

/** Para las pruebas y para los trabajos, que se cierran al terminar. */
export async function cerrarConexion(): Promise<void> {
  if (conexion) {
    await conexion.end();
    conexion = null;
  }
}
