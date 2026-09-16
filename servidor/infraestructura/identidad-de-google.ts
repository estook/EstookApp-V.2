import { variable } from '@estook/utiles';

/**
 * Entrar con Google (0042).
 *
 * ── Cómo, y por qué así ──────────────────────────────────────────────────────
 *
 * El flujo de «código de autorización con PKCE», que es el que Google recomienda
 * para una aplicación web:
 *
 *   1. La app manda a Google con un `state` y el reto de un verificador al azar.
 *   2. Google vuelve a `estook.com/app/` con un código de un solo uso.
 *   3. La app manda el código y el verificador a la API, y **la API** lo canjea
 *      con el secreto del cliente, que no sale nunca del servidor.
 *
 * **Sin cargar ningún script de Google en la página**, a propósito: la política de
 * seguridad de las apps solo deja ejecutar lo nuestro (`script-src 'self'`), y un
 * botón de Google de los que se incrustan obligaría a abrirla.
 *
 * El `id_token` llega **directamente de Google, por TLS, al servidor**, en la
 * respuesta al canje; por eso no hace falta comprobar su firma (OpenID Connect,
 * 3.1.3.7). Lo que sí se comprueba: que es para nuestro cliente, que lo ha emitido
 * Google y que no ha caducado. Y el correo solo vale si Google dice que está
 * verificado.
 */

export interface PersonaDeGoogle {
  /** El identificador de la cuenta de Google. No cambia aunque cambie el correo. */
  readonly sujeto: string;
  readonly correo: string;
  readonly correoVerificado: boolean;
  readonly nombre: string | null;
  readonly apellidos: string | null;
}

export interface IdentidadDeGoogle {
  /** Público: la app lo pone en la dirección de Google. */
  readonly clienteId: string;
  canjear(datos: {
    readonly codigo: string;
    readonly verificador: string;
    readonly redireccion: string;
  }): Promise<PersonaDeGoogle>;
}

/** Google no ha aceptado el código, o no ha contestado bien. */
export class GoogleNoIdentifica extends Error {
  readonly estado: number;

  constructor(estado: number, porque: string) {
    super(porque);
    this.name = 'GoogleNoIdentifica';
    this.estado = estado;
  }
}

interface ContenidoDelToken {
  readonly iss?: string;
  readonly aud?: string;
  readonly exp?: number;
  readonly sub?: string;
  readonly email?: string;
  readonly email_verified?: boolean | string;
  readonly given_name?: string;
  readonly family_name?: string;
  readonly name?: string;
}

/** La parte del medio de un JWT, leída. No comprueba firma: ver arriba por qué. */
export function leerContenidoDelToken(token: string): ContenidoDelToken {
  const partes = token.split('.');
  const medio = partes[1];
  if (partes.length !== 3 || medio === undefined) {
    throw new GoogleNoIdentifica(502, 'El token de Google no tiene forma de token.');
  }
  const base64 = medio.replace(/-/g, '+').replace(/_/g, '/');
  const relleno = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  const bytes = Uint8Array.from(atob(relleno), (c) => c.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes)) as ContenidoDelToken;
}

/** Las comprobaciones del token, separadas para poder probarlas sin Google. */
export function personaDelToken(
  contenido: ContenidoDelToken,
  clienteId: string,
  ahora: Date,
): PersonaDeGoogle {
  if (contenido.iss !== 'https://accounts.google.com' && contenido.iss !== 'accounts.google.com') {
    throw new GoogleNoIdentifica(401, 'El token no lo ha emitido Google.');
  }
  if (contenido.aud !== clienteId) {
    throw new GoogleNoIdentifica(401, 'El token no es para Estook.');
  }
  if (contenido.exp === undefined || contenido.exp * 1000 <= ahora.getTime()) {
    throw new GoogleNoIdentifica(401, 'El token de Google ha caducado.');
  }
  if (contenido.sub === undefined || contenido.email === undefined) {
    throw new GoogleNoIdentifica(401, 'Google no ha dado la cuenta ni el correo.');
  }
  return {
    sujeto: contenido.sub,
    correo: contenido.email.toLowerCase(),
    correoVerificado: contenido.email_verified === true || contenido.email_verified === 'true',
    nombre: contenido.given_name ?? contenido.name ?? null,
    apellidos: contenido.family_name ?? null,
  };
}

/** El de verdad. Nulo si falta el cliente o su secreto: se dice, no se rompe. */
export function identidadDeGoogle(
  clienteId: string | undefined = variable('GOOGLE_OAUTH_CLIENT_ID'),
  secreto: string | undefined = variable('GOOGLE_OAUTH_CLIENT_SECRET'),
): IdentidadDeGoogle | null {
  if (clienteId === undefined || clienteId.trim() === '') return null;
  if (secreto === undefined || secreto.trim() === '') return null;

  return {
    clienteId,
    async canjear({ codigo, verificador, redireccion }) {
      const respuesta = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code: codigo,
          client_id: clienteId,
          client_secret: secreto,
          redirect_uri: redireccion,
          grant_type: 'authorization_code',
          code_verifier: verificador,
        }).toString(),
      });
      if (!respuesta.ok) {
        throw new GoogleNoIdentifica(respuesta.status, 'Google no ha aceptado el código.');
      }
      const cuerpo = (await respuesta.json()) as { id_token?: string };
      if (cuerpo.id_token === undefined) {
        throw new GoogleNoIdentifica(502, 'Google no ha devuelto quién eres.');
      }
      return personaDelToken(
        leerContenidoDelToken(cuerpo.id_token),
        clienteId,
        new Date(Date.now()),
      );
    },
  };
}

/**
 * Uno de mentira, para las pruebas. El código dice quién es:
 * `prueba|sujeto|correo|Nombre|verificado` (el último, `si` o `no`).
 */
export function identidadDeMentira(): IdentidadDeGoogle {
  return {
    clienteId: 'cliente-de-prueba.apps.googleusercontent.com',
    canjear({ codigo }) {
      const [marca, sujeto, correo, nombre, verificado] = codigo.split('|');
      if (marca !== 'prueba' || !sujeto || !correo) {
        return Promise.reject(new GoogleNoIdentifica(400, 'Google no ha aceptado el código.'));
      }
      return Promise.resolve({
        sujeto,
        correo: correo.toLowerCase(),
        correoVerificado: verificado !== 'no',
        nombre: nombre ?? null,
        apellidos: null,
      });
    },
  };
}
