/**
 * Los fallos del servidor, por una sola puerta (repaso del 10-oct · decisión 0082).
 *
 * «Las apps ya mandan sus errores a Sentry; la API no.» Hasta hoy, un fallo de la API
 * se quedaba en el registro de Supabase —un `console.error` con su hilo— y nadie se
 * enteraba si no iba a mirarlo. Ahora todo fallo que el servidor apunta pasa por
 * `apuntarUnFallo`, que hace dos cosas:
 *
 *   · **Lo apunta en el registro**, igual que antes: una línea JSON con el nivel, qué
 *     pasaba, el hilo (`correlacion_id`) y el detalle.
 *   · **Y avisa** a quien escuche: en Supabase, Sentry (`supabase/functions/api`); en
 *     las pruebas y en la API de pruebas, nadie.
 *
 * ── Sin datos personales ─────────────────────────────────────────────────────
 *
 * Un fallo puede traer dentro lo que no tiene que salir de aquí: Postgres dice
 * «Key (correo)=(ana@bar.es) already exists», un servicio de fuera repite el teléfono
 * que le mandamos. Todo lo que va a Sentry pasa antes por `sinDatosPersonales`. Y a
 * Sentry no va nunca quién era (ni su correo ni su IP): solo **el hilo**, que en
 * nuestro registro lleva a todo lo demás, a quien puede mirarlo.
 *
 * Un avisador que falla **no tumba nada**: avisar de un fallo no puede ser otro fallo.
 */

/** Lo que se sabe de un fallo, además del fallo. */
export interface DatosDelFallo {
  /** Qué estaba haciendo el servidor: «los correos de los avisos no han salido». */
  readonly mensaje: string;
  /** El hilo de la petición, o nulo si no lo hay (al arrancar). */
  readonly correlacionId: string | null;
  /** Lo que ayuda a entenderlo y no es de nadie: el motor del PDF, un código. */
  readonly extra?: Readonly<Record<string, string | number | boolean | null>>;
}

/** Quien escucha los fallos. En Supabase, Sentry; en las pruebas, nadie. */
export interface AvisadorDeFallos {
  avisar(fallo: unknown, datos: DatosDelFallo): Promise<void>;
}

let elAvisador: AvisadorDeFallos | null = null;

/** Lo llama el punto de entrada de la función, una vez, si hay Sentry. */
export function ponerElAvisadorDeFallos(avisador: AvisadorDeFallos | null): void {
  elAvisador = avisador;
}

/** Si hay alguien escuchando: lo dice `/salud`, sí o no, nunca el DSN. */
export function hayAvisadorDeFallos(): boolean {
  return elAvisador !== null;
}

/** El detalle de un fallo, en texto. */
function elDetalle(fallo: unknown): string {
  return fallo instanceof Error ? fallo.message : String(fallo);
}

/**
 * Apuntar un fallo: al registro siempre, y al avisador si lo hay. Se espera a que
 * salga (unos pocos segundos como mucho): en Supabase, una función que ya ha
 * contestado puede dejar de correr antes de que el aviso llegue.
 */
export async function apuntarUnFallo(fallo: unknown, datos: DatosDelFallo): Promise<void> {
  console.error(
    JSON.stringify({
      nivel: 'error',
      mensaje: datos.mensaje,
      ...(datos.correlacionId === null ? {} : { correlacion_id: datos.correlacionId }),
      ...datos.extra,
      detalle: elDetalle(fallo),
    }),
  );
  if (elAvisador === null) return;
  try {
    await elAvisador.avisar(fallo, datos);
  } catch {
    // Avisar de un fallo no puede ser otro fallo: se queda en el registro de arriba.
  }
}

// ── Sin datos personales ─────────────────────────────────────────────────────

const QUITADO = '[quitado]';

/**
 * Lo que se quita de un texto antes de que salga hacia Sentry. Va de lo más concreto
 * a lo más general: un token antes que «una ristra de cifras».
 */
const LO_QUE_SE_QUITA: readonly RegExp[] = [
  // Lo que Postgres repite de una fila: «Key (correo)=(ana@bar.es)», «(x, y)=(1, 2)».
  /(\([^()]*\)=)\([^()]*\)/g,
  // Tokens: «Bearer abc…», un JWT, una clave de Stripe o de Resend.
  /\bBearer\s+[\w.~+/=-]+/gi,
  /\beyJ[\w-]+\.[\w-]+\.[\w-]+/g,
  /\b(?:sk|pk|rk|whsec|re)_[A-Za-z0-9_]{8,}/g,
  // Correos.
  /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g,
  // IBAN: dos letras, dos cifras y el resto, con o sin espacios.
  /\b[A-Z]{2}\d{2}(?:\s?[A-Z0-9]{4}){3,7}(?:\s?[A-Z0-9]{1,4})?\b/g,
  // DNI y NIE.
  /\b[XYZ]?\d{7,8}[A-HJ-NP-TV-Z]\b/gi,
  // Teléfonos y cualquier ristra larga de cifras (tarjetas, cuentas): nueve o más.
  /\+?\d(?:[\s.-]?\d){8,}/g,
  // Direcciones IP.
  /\b\d{1,3}(?:\.\d{1,3}){3}\b/g,
];

/** Un texto sin correos, teléfonos, documentos, cuentas, tokens ni valores de filas. */
export function sinDatosPersonales(texto: string): string {
  return LO_QUE_SE_QUITA.reduce(
    (limpio, patron) =>
      limpio.replace(patron, (...partes: string[]) =>
        // En el de Postgres se deja el nombre de la columna: dice qué ha chocado.
        patron === LO_QUE_SE_QUITA[0] ? `${partes[1] ?? ''}(${QUITADO})` : QUITADO,
      ),
    texto,
  );
}
