import { comoSeLlamaEsteAparato, type ClienteApi, type ErrorDeLaApi } from '@estook/cliente-api';
import { elRegistro } from './trabajador.ts';
import { esUnIphone, estaInstalada } from './instalar.ts';

/**
 * Los avisos al móvil, del lado del navegador (I · decisión 0070).
 *
 * Decir que sí son tres pasos, y los tres los da quien toca el botón: el permiso del
 * navegador, la suscripción a su servicio de avisos (con la clave pública de Estook) y
 * apuntarla en Estook (`poner_este_movil`). **El permiso solo se puede pedir al tocar
 * un botón**, y en el iPhone, una vez: si alguien dice «No permitir», ya no se puede
 * volver a preguntar desde la app, y hay que ir a los Ajustes del iPhone.
 */

/**
 * Cómo está este móvil:
 *
 *   no_se_puede        este navegador no recibe avisos
 *   instala_primero    un iPhone sin Estook en la pantalla de inicio: Apple no deja
 *   apagado_en_estook  las claves VAPID no están puestas: todavía no se puede
 *   bloqueado          dijeron que no al permiso: se cambia en los ajustes del móvil
 *   sin_activar        se puede, y todavía no se ha dicho que sí
 *   activo             recibe avisos
 */
export type ComoEstaElMovil =
  'no_se_puede' | 'instala_primero' | 'apagado_en_estook' | 'bloqueado' | 'sin_activar' | 'activo';

export function sePuedeAvisarEnEsteNavegador(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/** La suscripción de este navegador, si la tiene. */
export async function suSuscripcion(): Promise<PushSubscription | null> {
  if (!sePuedeAvisarEnEsteNavegador()) return null;
  const registro = await elRegistro();
  if (registro === null) return null;
  try {
    return await registro.pushManager.getSubscription();
  } catch {
    return null;
  }
}

export async function comoEstaEsteMovil(encendidoEnEstook: boolean): Promise<ComoEstaElMovil> {
  if (esUnIphone() && !estaInstalada()) return 'instala_primero';
  if (!sePuedeAvisarEnEsteNavegador()) return 'no_se_puede';
  if (!encendidoEnEstook) return 'apagado_en_estook';
  if (Notification.permission === 'denied') return 'bloqueado';
  const suscripcion = await suSuscripcion();
  return suscripcion !== null && Notification.permission === 'granted' ? 'activo' : 'sin_activar';
}

function deBase64Url(texto: string): Uint8Array<ArrayBuffer> {
  const normal = texto.replace(/-/g, '+').replace(/_/g, '/');
  const binario = atob(normal + '='.repeat((4 - (normal.length % 4)) % 4));
  const bytes = new Uint8Array(new ArrayBuffer(binario.length));
  for (let i = 0; i < binario.length; i += 1) bytes[i] = binario.charCodeAt(i);
  return bytes;
}

function aBase64Url(buffer: ArrayBuffer | null): string {
  if (buffer === null) return '';
  let binario = '';
  for (const b of new Uint8Array(buffer)) binario += String.fromCharCode(b);
  return btoa(binario).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Apuntar en Estook la suscripción de este navegador. */
async function apuntarla(cliente: ClienteApi, suscripcion: PushSubscription) {
  return cliente.ejecutar('poner_este_movil', {
    direccion: suscripcion.endpoint,
    p256dh: aBase64Url(suscripcion.getKey('p256dh')),
    auth: aBase64Url(suscripcion.getKey('auth')),
    aparato: comoSeLlamaEsteAparato().slice(0, 80),
  });
}

/**
 * **«Recibir en este móvil»**: el permiso, la suscripción y apuntarla. Tiene que
 * llamarse **al tocar un botón**: el navegador no deja pedir el permiso de otra forma.
 */
export async function recibirEnEsteMovil(
  cliente: ClienteApi,
  clavePublica: string,
): Promise<
  { readonly ok: true } | { readonly ok: false; readonly porque: ComoEstaElMovil | ErrorDeLaApi }
> {
  if (!sePuedeAvisarEnEsteNavegador()) return { ok: false, porque: 'no_se_puede' };
  const permiso = await Notification.requestPermission();
  if (permiso !== 'granted')
    return { ok: false, porque: permiso === 'denied' ? 'bloqueado' : 'sin_activar' };
  const registro = await elRegistro(true);
  if (registro === null) return { ok: false, porque: 'no_se_puede' };
  let suscripcion = await registro.pushManager.getSubscription();
  if (suscripcion === null) {
    suscripcion = await registro.pushManager.subscribe({
      // Cada aviso se enseña: Apple corta a quien manda avisos invisibles.
      userVisibleOnly: true,
      applicationServerKey: deBase64Url(clavePublica),
    });
  }
  const apuntada = await apuntarla(cliente, suscripcion);
  return apuntada.ok ? { ok: true } : { ok: false, porque: apuntada.error };
}

/** «Dejar de recibir en este móvil»: en el navegador y en Estook. */
export async function dejarDeRecibir(cliente: ClienteApi): Promise<void> {
  const suscripcion = await suSuscripcion();
  if (suscripcion === null) return;
  await cliente.ejecutar('quitar_este_movil', { direccion: suscripcion.endpoint });
  try {
    await suscripcion.unsubscribe();
  } catch {
    // Quitada de Estook ya no le llega nada, aunque el navegador la recuerde.
  }
}

/**
 * Al abrir la app: si este móvil ya dijo que sí, que Estook lo tenga apuntado (pudo
 * borrarse al cambiar de persona en el mismo móvil). Y si la clave de Estook cambió,
 * se vuelve a suscribir con la nueva: con la vieja, los avisos ya no le valen.
 */
export async function ponerAlDiaEsteMovil(
  cliente: ClienteApi,
  clavePublica: string,
): Promise<void> {
  if (!sePuedeAvisarEnEsteNavegador() || Notification.permission !== 'granted') return;
  const registro = await elRegistro();
  if (registro === null) return;
  let suscripcion = await registro.pushManager.getSubscription();
  if (suscripcion === null) return;
  const suya = aBase64Url(suscripcion.options.applicationServerKey);
  if (suya !== '' && suya !== clavePublica) {
    await suscripcion.unsubscribe();
    suscripcion = await registro.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: deBase64Url(clavePublica),
    });
  }
  await apuntarla(cliente, suscripcion);
}

/** El número del icono de Estook: los avisos sin leer. Donde se pueda. */
export function ponerElNumeroDelIcono(sinLeer: number): void {
  try {
    if (!('setAppBadge' in navigator)) return;
    if (sinLeer > 0) void navigator.setAppBadge(sinLeer).catch(() => undefined);
    else void navigator.clearAppBadge().catch(() => undefined);
  } catch {
    // Es un extra: sin él, la campana dice lo mismo.
  }
}
