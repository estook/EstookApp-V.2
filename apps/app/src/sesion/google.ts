/**
 * Ir a Google y volver (0042).
 *
 * El paso del navegador en el flujo de «código con PKCE»: aquí se prepara un
 * verificador al azar y un `state`, se guardan en `sessionStorage` y se manda a
 * Google. Cuando Google vuelve a `estook.com/app/?code=…&state=…`, se comprueba
 * que el `state` es el que se mandó —si no, alguien ha fabricado la vuelta— y se
 * le pasan el código y el verificador a la API, que es quien los canjea con el
 * secreto del cliente.
 *
 * **Sin scripts de Google en la página**: es una navegación de ida y vuelta, así
 * que la política de seguridad no se abre (ver `identidad-de-google.ts`).
 */

const DONDE_SE_GUARDA = 'estook.google';

export type IntencionConGoogle = 'entrar' | 'crear';

interface LoGuardado {
  readonly estado: string;
  readonly verificador: string;
  readonly vuelta: string;
  readonly intencion: IntencionConGoogle;
  readonly negocio?: string;
  readonly aceptaCondiciones?: true;
}

export type VueltaDeGoogle =
  | {
      readonly codigo: string;
      readonly verificador: string;
      readonly redireccion: string;
      readonly intencion: IntencionConGoogle;
      readonly negocio?: string;
      readonly aceptaCondiciones?: true;
    }
  | { readonly fallo: string };

function base64Url(bytes: Uint8Array): string {
  let binario = '';
  for (const byte of bytes) binario += String.fromCharCode(byte);
  return btoa(binario).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** La dirección a la que vuelve Google: la de la app, sin nada detrás. */
function laVuelta(): string {
  const camino = window.location.pathname.endsWith('/')
    ? window.location.pathname
    : `${window.location.pathname}/`;
  return `${window.location.origin}${camino}`;
}

export async function irAGoogle(
  clienteId: string,
  datos: {
    readonly intencion: IntencionConGoogle;
    readonly negocio?: string;
    readonly aceptaCondiciones?: true;
  },
): Promise<void> {
  const verificador = base64Url(crypto.getRandomValues(new Uint8Array(32)));
  const reto = base64Url(
    new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verificador))),
  );
  const estado = base64Url(crypto.getRandomValues(new Uint8Array(16)));
  const vuelta = laVuelta();

  const guardado: LoGuardado = { estado, verificador, vuelta, ...datos };
  try {
    window.sessionStorage.setItem(DONDE_SE_GUARDA, JSON.stringify(guardado));
  } catch {
    // Sin poder guardar no se puede comprobar la vuelta: mejor no ir.
    throw new Error('Este navegador no deja guardar lo necesario para entrar con Google.');
  }

  const parametros = new URLSearchParams({
    client_id: clienteId,
    redirect_uri: vuelta,
    response_type: 'code',
    scope: 'openid email profile',
    state: estado,
    code_challenge: reto,
    code_challenge_method: 'S256',
    // Que Google pregunte qué cuenta usar: en una tablet compartida, la última que
    // entró no tiene por qué ser la tuya.
    prompt: 'select_account',
  });

  window.location.assign(`https://accounts.google.com/o/oauth2/v2/auth?${parametros.toString()}`);
}

/**
 * Si se está volviendo de Google, lo que hay que mandar a la API. Nulo si no.
 *
 * Quita el `?code=…` de la dirección **siempre**, vaya bien o mal: un código de un
 * solo uso no se queda en el historial ni en una captura de pantalla.
 */
export function laVueltaDeGoogle(): VueltaDeGoogle | null {
  const parametros = new URLSearchParams(window.location.search);
  const codigo = parametros.get('code');
  const estado = parametros.get('state');
  const error = parametros.get('error');
  if (codigo === null && error === null) return null;

  window.history.replaceState(null, '', `${window.location.pathname}${window.location.hash}`);

  let guardado: LoGuardado | null = null;
  try {
    const texto = window.sessionStorage.getItem(DONDE_SE_GUARDA);
    window.sessionStorage.removeItem(DONDE_SE_GUARDA);
    guardado = texto === null ? null : (JSON.parse(texto) as LoGuardado);
  } catch {
    guardado = null;
  }

  if (error !== null) {
    return {
      fallo:
        error === 'access_denied'
          ? 'Has cancelado la entrada con Google. Puedes volver a intentarlo cuando quieras.'
          : 'Google no ha dejado entrar. Vuelve a intentarlo.',
    };
  }

  if (guardado === null || estado === null || estado !== guardado.estado || codigo === null) {
    return {
      fallo:
        'La vuelta de Google no coincide con la que empezaste aquí. Por seguridad, vuelve a pulsar «Continuar con Google».',
    };
  }

  return {
    codigo,
    verificador: guardado.verificador,
    redireccion: guardado.vuelta,
    intencion: guardado.intencion,
    ...(guardado.negocio === undefined ? {} : { negocio: guardado.negocio }),
    ...(guardado.aceptaCondiciones === undefined ? {} : { aceptaCondiciones: true as const }),
  };
}
