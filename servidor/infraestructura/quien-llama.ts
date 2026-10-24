import { leerElTokenDelAparato, type FuncionDelAparato } from '@estook/dominio';
import { huellaDeToken } from '../dominio/secretos.ts';

/**
 * Quién llama, a partir del token que trae la petición (M4, y desde T1 también Estook
 * TPV, 0107).
 *
 * Dos clases de token, y una sola forma de leerlos:
 *
 *   · **La sesión de una persona** (la app, el admin): se busca su huella en
 *     `estook.sesion_activa`, como desde M4.
 *   · **Un aparato vinculado con su operador** (Estook TPV): `tpv.<turno>.<llave>`. Se
 *     busca la huella de los dos en `estook.turno_activo` (Anexo 11.14, punto 4): que
 *     el aparato sigue vinculado, de qué local es, su función, y quién tecleó su PIN.
 *     Desvincular el aparato o bloquearlo lo deja sin valer en la petición siguiente.
 *
 * Las dos devuelven lo mismo, así que los permisos y la seguridad de las filas miran al
 * operador igual que a quien entra en la app; el aparato va además en `aparato`.
 *
 * ── Por qué vive aquí y no copiado en cada sitio ─────────────────────────────
 *
 * La API de verdad, la de pruebas y el despachador de las pruebas resolvían la sesión
 * cada uno con su copia de la fila, y **una copia que se olvidó un campo dejó escribir a
 * una visita de demostración** (lección de M5, comentada en `api-de-pruebas.mjs`). Con
 * un segundo tipo de token eran seis copias. Ahora es una: cada sitio le pasa su forma
 * de consultar, y esto hace el resto.
 */

/** La sesión viva detrás de una petición. Nula en `entrar` y en lo publico. */
export interface SesionViva {
  readonly id: string;
  readonly personaId: string;
  readonly organizacionId: string | null;
  readonly localId: string | null;
  readonly dobleFactorSuperado: boolean;
  readonly debeCambiarClave: boolean;
  /** Una visita al restaurante de ejemplo (M5). Mira todo y no escribe nada. */
  readonly esDemostracion: boolean;
  /**
   * Una sesión abierta desde el admin (0041). Solo vale para el admin, dura ocho
   * horas como mucho, y el admin no acepta ninguna otra.
   */
  readonly paraAdmin: boolean;
  /**
   * **Estook TPV** (0107): el aparato vinculado desde el que opera quien tecleó su PIN.
   * Nulo, o sin poner, en la app y en el admin. Lo resuelve `quien-llama.ts`.
   */
  readonly aparato?: AparatoDeLaSesion | null;
}

/** El aparato de una petición de Estook TPV, con su función (Anexo 11.3). */
export interface AparatoDeLaSesion {
  readonly terminalId: string;
  readonly funcion: FuncionDelAparato;
  /** El móvil de un camarero, en el que solo entra él. */
  readonly esPersonal: boolean;
}

/** Consulta con parámetros numerados: `postgres.unsafe` o `PGlite.query`. */
export type ConsultarFilas = (
  texto: string,
  valores: readonly unknown[],
) => Promise<readonly Record<string, unknown>[]>;

const DE_LA_SESION = `
  select s.*, set_config('estook.persona_id', s.persona_id::text, true) as declarada
    from estook.sesion_activa($1) s`;

const DEL_APARATO = `
  select s.*, set_config('estook.persona_id', s.persona_id::text, true) as declarada
    from estook.turno_activo($1, $2) s`;

/**
 * La sesión viva detrás del token, **con la identidad ya declarada** en la conexión
 * (`estook.persona_id`), o nula. Se llama después de ponerse el disfraz de `estook_api`
 * y antes de nada más (0005).
 */
export async function resolverLaSesion(
  consultar: ConsultarFilas,
  token: string,
): Promise<SesionViva | null> {
  const delAparato = leerElTokenDelAparato(token);
  const filas =
    delAparato === null
      ? await consultar(DE_LA_SESION, [await huellaDeToken(token)])
      : await consultar(DEL_APARATO, [
          await huellaDeToken(delAparato.turno),
          await huellaDeToken(delAparato.llave),
        ]);

  const fila = filas[0];
  if (fila === undefined) return null;

  const terminalId = typeof fila['terminal_id'] === 'string' ? fila['terminal_id'] : null;
  return {
    id: String(fila['sesion_id']),
    personaId: String(fila['persona_id']),
    organizacionId: (fila['organizacion_id'] as string | null) ?? null,
    localId: (fila['local_id'] as string | null) ?? null,
    dobleFactorSuperado: fila['doble_factor_superado'] === true,
    debeCambiarClave: fila['debe_cambiar_clave'] === true,
    // M5 y 0041: sin estos dos, una visita de demostración escribía y una sesión de la
    // app entraba en el admin. Se leen aquí, una vez, para los tres sitios.
    esDemostracion: fila['es_demostracion'] === true,
    paraAdmin: fila['para_admin'] === true,
    aparato:
      terminalId === null
        ? null
        : {
            terminalId,
            funcion: String(fila['funcion']) as FuncionDelAparato,
            esPersonal: fila['es_personal'] === true,
          },
  };
}
