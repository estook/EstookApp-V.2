#!/usr/bin/env node
/**
 * Las dos claves de los avisos al móvil (I · decisión 0070), hechas en tu ordenador.
 *
 *     .\estook.cmd movil:claves
 *
 * Saca un par de claves VAPID nuevo —la pública y la privada— y te dice dónde se
 * pone cada una. **No las guarda en ningún sitio ni las manda a nadie**: salen en tu
 * pantalla, las copias a los secretos de Supabase y ya está. Por el chat, nunca
 * (`config/claves.md`).
 *
 * Se hace **una sola vez**. Si un día se cambian, los móviles que ya recibían avisos
 * tienen que volver a decir que sí (la app lo hace sola al abrirse, `ponerAlDiaEsteMovil`).
 *
 * Con `crypto.subtle`, que trae Node: sin instalar nada.
 */

const par = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, [
  'sign',
  'verify',
]);
const publica = Buffer.from(await crypto.subtle.exportKey('raw', par.publicKey)).toString(
  'base64url',
);
const { d: privada } = await crypto.subtle.exportKey('jwk', par.privateKey);

console.log(`
Las dos claves de los avisos al móvil · se ponen en Supabase y en ningún otro sitio

  Supabase → tu proyecto → Edge Functions → Secrets → «Add new secret», dos veces:

  Nombre:  VAPID_CLAVE_PUBLICA
  Valor:   ${publica}

  Nombre:  VAPID_CLAVE_PRIVADA
  Valor:   ${privada}

  La privada es un secreto: no la pegues en el chat ni en ningún documento.
  Después, despliega la API (Actions → Desplegar la API) para que las lea.
`);
