import { variable } from '@estook/utiles';

/**
 * Los avisos al móvil, detrás de un puerto (I · decisión 0070).
 *
 * **Web Push con claves propias (VAPID), sin servicio de pago** (mejora 14). Cada
 * navegador tiene su servicio de avisos —el de Google para Chrome y Android, el de
 * Apple para el iPhone, el de Mozilla, el de Microsoft— y Estook le manda el aviso a
 * la dirección que le dio el navegador al decir que sí. Esos servicios son gratis y no
 * piden cuenta: se identifica uno con su par de claves VAPID, que genera Estook.
 *
 * ── Lo que viaja, cifrado de punta a punta ─────────────────────────────────
 *
 * El aviso va **cifrado con las claves del propio navegador** (RFC 8291, aes128gcm):
 * el servicio de Google o de Apple lo entrega y no lo puede leer. Y va **firmado con
 * la clave de Estook** (RFC 8292): sin ella, nadie más puede mandar avisos a esos
 * móviles aunque conozca su dirección.
 *
 * Todo con `crypto.subtle`, que tienen igual Deno (la API desplegada) y Node (las
 * pruebas). Sin librerías de fuera: son ciento y pico líneas, y así no hay un paquete
 * más que vigilar.
 *
 * ── Sin sus dos secretos, no se rompe nada ─────────────────────────────────
 *
 * `VAPID_CLAVE_PUBLICA` y `VAPID_CLAVE_PRIVADA` (`config/claves.md`). Sin ellos el
 * puerto es nulo: la app dice que los avisos al móvil todavía no están encendidos, y
 * todo sigue llegando a la campana y al correo, como hasta hoy.
 */

export interface SuscripcionDeMovil {
  /** La dirección de su servicio de avisos. */
  readonly direccion: string;
  /** La clave pública del navegador (P-256, sin comprimir, en base64url). */
  readonly p256dh: string;
  /** Su secreto de 16 bytes, en base64url. */
  readonly auth: string;
}

/** Lo que enseña el aviso. Lo pinta el trabajador de servicio de la app (`sw.js`). */
export interface LoQueVaAlMovil {
  readonly titulo: string;
  readonly detalle: string | null;
  /** A dónde lleva al tocarlo, dentro de la app: `/almacen/…`. */
  readonly ir: string | null;
  /** El mismo aviso con la misma etiqueta se sustituye en la pantalla, no se apila. */
  readonly etiqueta: string;
  /** Los avisos sin leer, para el número del icono. */
  readonly sinLeer: number;
}

export interface OpcionesDelEnvio {
  /** «Entras en cinco minutos» no espera a que el móvil salga del ahorro de batería. */
  readonly urgente: boolean;
  /** Cuánto lo guarda el servicio si el móvil está apagado. Pasado eso, ya no sirve. */
  readonly segundosQueVale: number;
}

/**
 * Cómo fue: `entregado` (el servicio lo ha cogido), `ya_no_existe` (el móvil dejó de
 * existir o cambiaron las claves: se borra), o `fallo` (pasajero: se reintenta).
 */
export type ComoFueAlMovil = 'entregado' | 'ya_no_existe' | 'fallo';

export interface MovilSaliente {
  /** La pública, que necesita el navegador para suscribirse. No es un secreto. */
  readonly clavePublica: string;
  mandar(
    suscripcion: SuscripcionDeMovil,
    carga: LoQueVaAlMovil,
    opciones: OpcionesDelEnvio,
  ): Promise<ComoFueAlMovil>;
}

// ── Solo a los servicios de avisos de verdad ─────────────────────────────────

/**
 * **Solo se manda a los servicios de avisos de los navegadores.** La dirección la
 * da el navegador, pero llega por la API, y una dirección inventada haría que Estook
 * mandara peticiones a donde alguien quisiera (una puerta clásica, SSRF). Así que se
 * acepta solo la de Google, Apple, Mozilla y Microsoft, por `https`.
 */
const SERVICIOS_DE_AVISOS: readonly ((host: string) => boolean)[] = [
  (h) => h === 'fcm.googleapis.com' || h === 'android.googleapis.com',
  (h) => h === 'web.push.apple.com' || h.endsWith('.push.apple.com'),
  (h) => h === 'updates.push.services.mozilla.com' || h.endsWith('.push.services.mozilla.com'),
  (h) => h.endsWith('.notify.windows.com'),
];

export function esDireccionDeAvisos(direccion: string): boolean {
  let url: URL;
  try {
    url = new URL(direccion);
  } catch {
    return false;
  }
  if (url.protocol !== 'https:' || url.username !== '' || url.password !== '') return false;
  if (url.port !== '' && url.port !== '443') return false;
  const host = url.hostname.toLowerCase();
  return SERVICIOS_DE_AVISOS.some((es) => es(host));
}

/**
 * Los tipos de las llaves de `crypto.subtle`, sacados de él: el servidor no carga los
 * del navegador (`CryptoKey`), y así valen igual en Deno y en Node.
 */
export type Llave = Awaited<ReturnType<typeof crypto.subtle.importKey>>;
export interface ParDeLlaves {
  readonly publicKey: Llave;
  readonly privateKey: Llave;
}

// ── base64url y bytes ────────────────────────────────────────────────────────

export function aBase64Url(bytes: Uint8Array): string {
  let binario = '';
  for (const b of bytes) binario += String.fromCharCode(b);
  return btoa(binario).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function deBase64Url(texto: string): Uint8Array {
  const normal = texto.replace(/-/g, '+').replace(/_/g, '/');
  const relleno = normal + '='.repeat((4 - (normal.length % 4)) % 4);
  const binario = atob(relleno);
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i += 1) bytes[i] = binario.charCodeAt(i);
  return bytes;
}

function juntar(...partes: readonly Uint8Array[]): Uint8Array {
  const total = partes.reduce((suma, p) => suma + p.length, 0);
  const junto = new Uint8Array(total);
  let donde = 0;
  for (const parte of partes) {
    junto.set(parte, donde);
    donde += parte.length;
  }
  return junto;
}

const texto = (t: string) => new TextEncoder().encode(t);

/** `crypto.subtle` pide `ArrayBuffer`s de verdad: se copia a uno propio. */
function buffer(bytes: Uint8Array): ArrayBuffer {
  const copia = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(copia).set(bytes);
  return copia;
}

async function hmac(clave: Uint8Array, datos: Uint8Array): Promise<Uint8Array> {
  const k = await crypto.subtle.importKey(
    'raw',
    buffer(clave),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return new Uint8Array(await crypto.subtle.sign('HMAC', k, buffer(datos)));
}

// ── El cifrado (RFC 8291) ────────────────────────────────────────────────────

/** Lo que se le manda al servicio de avisos: un solo trozo, como pide aes128gcm. */
const TAMANO_DE_TROZO = 4096;

/**
 * Cifra lo que va al móvil con las claves de su navegador (RFC 8291, sección 3).
 *
 * `local` y `sal` solo se pasan en las pruebas, para comparar con el ejemplo de la
 * propia RFC; en la vida real se generan cada vez.
 */
export async function cifrarParaElMovil(
  suscripcion: Pick<SuscripcionDeMovil, 'p256dh' | 'auth'>,
  carga: Uint8Array,
  prueba?: { readonly local: ParDeLlaves; readonly sal: Uint8Array },
): Promise<Uint8Array> {
  const delNavegador = deBase64Url(suscripcion.p256dh);
  const secreto = deBase64Url(suscripcion.auth);
  if (delNavegador.length !== 65 || secreto.length !== 16) {
    throw new Error('Las claves del navegador no tienen la forma de Web Push.');
  }

  const local =
    prueba?.local ??
    (await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']));
  const localPublica = new Uint8Array(await crypto.subtle.exportKey('raw', local.publicKey));
  const navegador = await crypto.subtle.importKey(
    'raw',
    buffer(delNavegador),
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    [],
  );
  const compartido = new Uint8Array(
    await crypto.subtle.deriveBits({ name: 'ECDH', public: navegador }, local.privateKey, 256),
  );

  // IKM = HKDF(auth, ecdh, "WebPush: info" || 0 || ua_public || as_public, 32)
  const prkClave = await hmac(secreto, compartido);
  const info = juntar(texto('WebPush: info\0'), delNavegador, localPublica, new Uint8Array([1]));
  const ikm = (await hmac(prkClave, info)).slice(0, 32);

  const sal = prueba?.sal ?? crypto.getRandomValues(new Uint8Array(16));
  const prk = await hmac(sal, ikm);
  const cek = (await hmac(prk, texto('Content-Encoding: aes128gcm\0\x01'))).slice(0, 16);
  const nonce = (await hmac(prk, texto('Content-Encoding: nonce\0\x01'))).slice(0, 12);

  // Un solo trozo, el último: lo de dentro y el delimitador 0x02, sin relleno.
  const claro = juntar(carga, new Uint8Array([2]));
  if (claro.length + 16 > TAMANO_DE_TROZO) {
    throw new Error('El aviso no cabe en un trozo de Web Push.');
  }
  const aes = await crypto.subtle.importKey('raw', buffer(cek), { name: 'AES-GCM' }, false, [
    'encrypt',
  ]);
  const cifrado = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv: buffer(nonce) }, aes, buffer(claro)),
  );

  // La cabecera: sal (16) · tamaño de trozo (4) · largo de la clave (1) · la clave (65).
  const tamano = new Uint8Array(4);
  new DataView(tamano.buffer).setUint32(0, TAMANO_DE_TROZO);
  return juntar(sal, tamano, new Uint8Array([localPublica.length]), localPublica, cifrado);
}

// ── La firma de Estook (RFC 8292) ────────────────────────────────────────────

/** A quién se identifica Estook ante los servicios: su web. Apple pide `mailto:` o `https:`. */
const CONTACTO = 'https://estook.com';

/** Doce horas: el máximo son veinticuatro, y se firma en cada envío. */
const LA_FIRMA_VALE_S = 12 * 60 * 60;

async function laClavePrivada(publica: Uint8Array, privada: Uint8Array): Promise<Llave> {
  if (publica.length !== 65 || publica[0] !== 4 || privada.length !== 32) {
    throw new Error('Las claves VAPID no tienen la forma de P-256.');
  }
  return crypto.subtle.importKey(
    'jwk',
    {
      kty: 'EC',
      crv: 'P-256',
      x: aBase64Url(publica.slice(1, 33)),
      y: aBase64Url(publica.slice(33, 65)),
      d: aBase64Url(privada),
      ext: false,
    },
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  );
}

/** El JWT firmado con la clave de Estook, para el servicio de esa dirección. */
export async function laFirmaVapid(
  direccion: string,
  clave: Llave,
  ahoraEnSegundos: number,
): Promise<string> {
  const audiencia = new URL(direccion).origin;
  const cabecera = aBase64Url(texto(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const cuerpo = aBase64Url(
    texto(
      JSON.stringify({ aud: audiencia, exp: ahoraEnSegundos + LA_FIRMA_VALE_S, sub: CONTACTO }),
    ),
  );
  const firmado = `${cabecera}.${cuerpo}`;
  // WebCrypto firma ECDSA en crudo (r || s, 64 bytes), que es justo lo que pide JWS.
  const firma = new Uint8Array(
    await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, clave, buffer(texto(firmado))),
  );
  return `${firmado}.${aBase64Url(firma)}`;
}

// ── El puerto de verdad ──────────────────────────────────────────────────────

/** Lo que tarda como mucho el servicio en contestar. */
const ESPERA_MAXIMA_MS = 10_000;

export function movilConVapid(
  publica: string | undefined = variable('VAPID_CLAVE_PUBLICA'),
  privada: string | undefined = variable('VAPID_CLAVE_PRIVADA'),
  pedir: typeof fetch = fetch,
): MovilSaliente | null {
  if (
    publica === undefined ||
    publica.trim() === '' ||
    privada === undefined ||
    privada.trim() === ''
  ) {
    return null;
  }
  const publicaEnBytes = deBase64Url(publica.trim());
  const privadaEnBytes = deBase64Url(privada.trim());
  let clave: Promise<Llave> | null = null;

  return {
    clavePublica: publica.trim(),
    async mandar(suscripcion, carga, opciones) {
      if (!esDireccionDeAvisos(suscripcion.direccion)) return 'ya_no_existe';
      clave ??= laClavePrivada(publicaEnBytes, privadaEnBytes);
      const cuerpo = await cifrarParaElMovil(suscripcion, texto(JSON.stringify(carga)));
      const jwt = await laFirmaVapid(
        suscripcion.direccion,
        await clave,
        Math.floor(Date.now() / 1000),
      );

      let respuesta: Response;
      try {
        respuesta = await pedir(suscripcion.direccion, {
          method: 'POST',
          headers: {
            Authorization: `vapid t=${jwt}, k=${publica.trim()}`,
            'Content-Encoding': 'aes128gcm',
            'Content-Type': 'application/octet-stream',
            TTL: String(Math.max(0, Math.trunc(opciones.segundosQueVale))),
            Urgency: opciones.urgente ? 'high' : 'normal',
            // El servicio guarda solo el último de cada tema si el móvil está apagado.
            Topic: carga.etiqueta.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 32) || 'estook',
          },
          body: buffer(cuerpo),
          signal: AbortSignal.timeout(ESPERA_MAXIMA_MS),
        });
      } catch {
        return 'fallo';
      }
      // 404 y 410: el móvil ya no existe, y se borra. **Un 403 no**: dice que la firma
      // no le vale, y eso puede ser que se cambiaron las claves… o un fallo nuestro.
      // Borrar los móviles de todo el mundo por un fallo nuestro sería mucho peor que
      // reintentar: cuenta como fallo, y pasados muchos seguidos se borra (`avisos.ts`).
      if (respuesta.status === 404 || respuesta.status === 410) return 'ya_no_existe';
      return respuesta.ok ? 'entregado' : 'fallo';
    },
  };
}

// ── El de mentira, para las pruebas ──────────────────────────────────────────

export interface EnvioDeMentira {
  readonly suscripcion: SuscripcionDeMovil;
  readonly carga: LoQueVaAlMovil;
  readonly opciones: OpcionesDelEnvio;
}

/**
 * Un móvil de mentira (0070): no sale a internet, guarda lo que se le manda y contesta
 * lo que se le diga, como el correo en memoria. Su clave pública tiene la forma de una
 * de verdad, para que la app la acepte, pero no hay privada: con él no sale nada.
 */
export function movilDeMentira(): MovilSaliente & {
  readonly mandados: EnvioDeMentira[];
  contestar(como: ComoFueAlMovil): void;
} {
  const mandados: EnvioDeMentira[] = [];
  let contesta: ComoFueAlMovil = 'entregado';
  return {
    clavePublica:
      'BBilJF7lQjNuCGVb84J7Z66Kfpda0Gn4RsaeqG_FTCSM2MUpL1exI8BQr3ggm6m3rNwgB7jnUHiJ541Mp3Vrtt8',
    mandados,
    contestar(como) {
      contesta = como;
    },
    mandar(suscripcion, carga, opciones) {
      if (!esDireccionDeAvisos(suscripcion.direccion)) return Promise.resolve('ya_no_existe');
      mandados.push({ suscripcion, carga, opciones });
      return Promise.resolve(contesta);
    },
  };
}
