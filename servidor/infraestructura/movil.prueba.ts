import { describe, expect, it } from 'vitest';
import {
  aBase64Url,
  cifrarParaElMovil,
  deBase64Url,
  esDireccionDeAvisos,
  laFirmaVapid,
  movilConVapid,
  type ParDeLlaves,
} from './movil.ts';

/**
 * Los avisos al móvil (I · 0070): el cifrado de Web Push, la firma VAPID y a dónde
 * se deja mandar. El cifrado se comprueba **contra el ejemplo de la propia RFC 8291**
 * (sección 5), byte a byte: si el ejemplo sale igual, Chrome y Safari lo leen.
 */

const RFC = {
  claro: 'When I grow up, I want to be a watermelon',
  servidorPrivada: 'yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw',
  servidorPublica:
    'BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8',
  navegadorPrivada: 'q1dXpw3UpT5VOmu_cf_v6ih07Aems3njxI-JWgLcM94',
  navegadorPublica:
    'BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4',
  auth: 'BTBZMqHH6r4Tts7J_aSIgg',
  sal: 'DGv6ra1nlYgDCS1FRnbzlw',
  cifrado:
    'DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A_yl95bQpu6cVPTpK4Mqgkf1CXztLVBSt2Ks3oZwbuwXPXLWyouBWLVWGNWQexSgSxsj_Qulcy4a-fN',
};

function copia(bytes: Uint8Array): ArrayBuffer {
  const b = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(b).set(bytes);
  return b;
}

async function parDeLaRfc(privada: string, publica: string): Promise<ParDeLlaves> {
  const pub = deBase64Url(publica);
  const jwk = {
    kty: 'EC',
    crv: 'P-256',
    x: aBase64Url(pub.slice(1, 33)),
    y: aBase64Url(pub.slice(33, 65)),
  };
  return {
    privateKey: await crypto.subtle.importKey(
      'jwk',
      { ...jwk, d: privada },
      { name: 'ECDH', namedCurve: 'P-256' },
      true,
      ['deriveBits'],
    ),
    publicKey: await crypto.subtle.importKey(
      'raw',
      copia(pub),
      { name: 'ECDH', namedCurve: 'P-256' },
      true,
      [],
    ),
  };
}

async function hmac(clave: Uint8Array, datos: Uint8Array): Promise<Uint8Array> {
  const k = await crypto.subtle.importKey(
    'raw',
    copia(clave),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return new Uint8Array(await crypto.subtle.sign('HMAC', k, copia(datos)));
}

/** Lo que hace el navegador al recibirlo (RFC 8291, al revés). Solo para las pruebas. */
async function descifrarComoElNavegador(
  cuerpo: Uint8Array,
  navegador: ParDeLlaves,
  auth: Uint8Array,
): Promise<string> {
  const sal = cuerpo.slice(0, 16);
  const largo = cuerpo[20] ?? 0;
  const delServidor = cuerpo.slice(21, 21 + largo);
  const cifrado = cuerpo.slice(21 + largo);
  const servidor = await crypto.subtle.importKey(
    'raw',
    copia(delServidor),
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    [],
  );
  const compartido = new Uint8Array(
    await crypto.subtle.deriveBits({ name: 'ECDH', public: servidor }, navegador.privateKey, 256),
  );
  const mia = new Uint8Array(await crypto.subtle.exportKey('raw', navegador.publicKey));
  const t = (s: string) => new TextEncoder().encode(s);
  const junta = (...p: Uint8Array[]) => {
    const r = new Uint8Array(p.reduce((s, x) => s + x.length, 0));
    let i = 0;
    for (const x of p) {
      r.set(x, i);
      i += x.length;
    }
    return r;
  };
  const ikm = (
    await hmac(
      await hmac(auth, compartido),
      junta(t('WebPush: info\0'), mia, delServidor, new Uint8Array([1])),
    )
  ).slice(0, 32);
  const prk = await hmac(sal, ikm);
  const cek = (await hmac(prk, t('Content-Encoding: aes128gcm\0\x01'))).slice(0, 16);
  const nonce = (await hmac(prk, t('Content-Encoding: nonce\0\x01'))).slice(0, 12);
  const aes = await crypto.subtle.importKey('raw', copia(cek), { name: 'AES-GCM' }, false, [
    'decrypt',
  ]);
  const claro = new Uint8Array(
    await crypto.subtle.decrypt({ name: 'AES-GCM', iv: copia(nonce) }, aes, copia(cifrado)),
  );
  // Quita el delimitador del último trozo (0x02).
  expect(claro.at(-1)).toBe(2);
  return new TextDecoder().decode(claro.slice(0, -1));
}

describe('el cifrado de Web Push (RFC 8291)', () => {
  it('sale igual que el ejemplo de la RFC, byte a byte', async () => {
    const servidor = await parDeLaRfc(RFC.servidorPrivada, RFC.servidorPublica);
    const cuerpo = await cifrarParaElMovil(
      { p256dh: RFC.navegadorPublica, auth: RFC.auth },
      new TextEncoder().encode(RFC.claro),
      { local: servidor, sal: deBase64Url(RFC.sal) },
    );
    expect(aBase64Url(cuerpo)).toBe(RFC.cifrado);
  });

  it('y lo que cifra con claves nuevas, el navegador lo lee', async () => {
    const navegador = (await crypto.subtle.generateKey(
      { name: 'ECDH', namedCurve: 'P-256' },
      true,
      ['deriveBits'],
    )) as ParDeLlaves;
    const auth = crypto.getRandomValues(new Uint8Array(16));
    const p256dh = aBase64Url(
      new Uint8Array(await crypto.subtle.exportKey('raw', navegador.publicKey)),
    );
    const carga = JSON.stringify({ titulo: 'Entras en 5 minutos', detalle: 'A las 10:00.' });
    const cuerpo = await cifrarParaElMovil(
      { p256dh, auth: aBase64Url(auth) },
      new TextEncoder().encode(carga),
    );
    expect(await descifrarComoElNavegador(cuerpo, navegador, auth)).toBe(carga);
  });
});

describe('la firma de Estook (RFC 8292)', () => {
  it('es un JWT ES256 para el servicio de esa dirección, que se comprueba con la pública', async () => {
    const par = (await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, [
      'sign',
      'verify',
    ])) as ParDeLlaves;
    const jwt = await laFirmaVapid(
      'https://fcm.googleapis.com/fcm/send/abc',
      par.privateKey,
      1_800_000_000,
    );
    const [cabecera = '', cuerpo = '', firma = ''] = jwt.split('.');
    expect(JSON.parse(new TextDecoder().decode(deBase64Url(cabecera)))).toEqual({
      typ: 'JWT',
      alg: 'ES256',
    });
    expect(JSON.parse(new TextDecoder().decode(deBase64Url(cuerpo)))).toEqual({
      aud: 'https://fcm.googleapis.com',
      exp: 1_800_000_000 + 12 * 3600,
      sub: 'https://estook.com',
    });
    const vale = await crypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      par.publicKey,
      copia(deBase64Url(firma)),
      copia(new TextEncoder().encode(`${cabecera}.${cuerpo}`)),
    );
    expect(vale).toBe(true);
  });
});

describe('a dónde se deja mandar', () => {
  it('solo a los servicios de avisos de los navegadores, por https', () => {
    expect(esDireccionDeAvisos('https://fcm.googleapis.com/fcm/send/abc')).toBe(true);
    expect(esDireccionDeAvisos('https://web.push.apple.com/QGuQyavXutnMH')).toBe(true);
    expect(esDireccionDeAvisos('https://updates.push.services.mozilla.com/wpush/v2/x')).toBe(true);
    expect(esDireccionDeAvisos('https://wns2-db5p.notify.windows.com/w/?token=x')).toBe(true);
    // Lo que no es de ellos, o no va por https, no.
    expect(esDireccionDeAvisos('http://fcm.googleapis.com/fcm/send/abc')).toBe(false);
    expect(esDireccionDeAvisos('https://fcm.googleapis.com.malo.com/x')).toBe(false);
    expect(esDireccionDeAvisos('https://169.254.169.254/latest/meta-data')).toBe(false);
    expect(esDireccionDeAvisos('https://localhost:5177/v1/comandos/x')).toBe(false);
    expect(esDireccionDeAvisos('https://a:b@fcm.googleapis.com/x')).toBe(false);
    expect(esDireccionDeAvisos('no es una dirección')).toBe(false);
  });
});

describe('el puerto', () => {
  it('sin sus dos claves no hay móvil: se dice, no se rompe', () => {
    expect(movilConVapid(undefined, undefined)).toBeNull();
    expect(movilConVapid('  ', 'x')).toBeNull();
  });

  it('manda cifrado y firmado, y entiende lo que contesta el servicio', async () => {
    const par = (await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, [
      'sign',
    ])) as ParDeLlaves;
    const publica = aBase64Url(new Uint8Array(await crypto.subtle.exportKey('raw', par.publicKey)));
    const jwk = await crypto.subtle.exportKey('jwk', par.privateKey);
    const navegador = (await crypto.subtle.generateKey(
      { name: 'ECDH', namedCurve: 'P-256' },
      true,
      ['deriveBits'],
    )) as ParDeLlaves;
    const suscripcion = {
      direccion: 'https://fcm.googleapis.com/fcm/send/abc',
      p256dh: aBase64Url(new Uint8Array(await crypto.subtle.exportKey('raw', navegador.publicKey))),
      auth: aBase64Url(crypto.getRandomValues(new Uint8Array(16))),
    };
    const carga = { titulo: 'T', detalle: null, ir: '/', etiqueta: 'turno.entras', sinLeer: 2 };

    const pedidas: { url: string; init: RequestInit }[] = [];
    let contesta = 201;
    const movil = movilConVapid(publica, jwk.d, ((url: string, init: RequestInit) => {
      pedidas.push({ url, init });
      return Promise.resolve(new Response(null, { status: contesta }));
    }) as unknown as typeof fetch);
    if (movil === null) throw new Error('debería haber móvil');

    expect(await movil.mandar(suscripcion, carga, { urgente: true, segundosQueVale: 300 })).toBe(
      'entregado',
    );
    const cabeceras = pedidas[0]?.init.headers as Record<string, string>;
    expect(cabeceras['Content-Encoding']).toBe('aes128gcm');
    expect(cabeceras.TTL).toBe('300');
    expect(cabeceras.Urgency).toBe('high');
    expect(cabeceras.Authorization).toMatch(new RegExp(`^vapid t=.+\\..+\\..+, k=${publica}$`));

    contesta = 410;
    expect(await movil.mandar(suscripcion, carga, { urgente: false, segundosQueVale: 60 })).toBe(
      'ya_no_existe',
    );
    // Un 403 no borra el móvil: puede ser un fallo nuestro.
    contesta = 403;
    expect(await movil.mandar(suscripcion, carga, { urgente: false, segundosQueVale: 60 })).toBe(
      'fallo',
    );
    // Y a una dirección que no es de un servicio de avisos, no se llama.
    const antes = pedidas.length;
    expect(
      await movil.mandar({ ...suscripcion, direccion: 'https://169.254.169.254/x' }, carga, {
        urgente: false,
        segundosQueVale: 60,
      }),
    ).toBe('ya_no_existe');
    expect(pedidas.length).toBe(antes);
  });
});
