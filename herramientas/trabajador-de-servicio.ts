import { createHash } from 'node:crypto';

/**
 * El trabajador de servicio de la app (I · decisión 0070).
 *
 * Es **un trocito de Estook que se queda en el móvil** y sigue vivo con la app
 * cerrada. Hace tres cosas, y ninguna más:
 *
 *   1 · **Que Estook abra sin señal.** Guarda lo que hace falta para arrancar —la
 *       página, su código y sus iconos— y lo sirve cuando la red no contesta. Los
 *       datos no los guarda él: los guarda la app (`sinConexion/`).
 *   2 · **Los avisos al móvil.** Recibe el aviso cifrado del servicio de avisos del
 *       navegador, lo enseña, y al tocarlo abre la app donde se resuelve.
 *   3 · **El número del icono**: los avisos sin leer.
 *
 * ── Por qué se escribe a mano y se genera al construir ─────────────────────
 *
 * Las librerías que lo hacen (Workbox y sus complementos) traen decenas de casos
 * que Estook no usa y su propio vocabulario. Esto son ciento y pico líneas que se
 * leen de un tirón. Y **se genera al construir** porque tiene que saber **los
 * nombres exactos** de los ficheros de esa versión, que llevan su huella en el
 * nombre (`index-DnmfDpUq.js`): cambian en cada versión, y con ellos la versión del
 * trabajador, que es lo que hace que el navegador lo cambie solo.
 *
 * ── Lo que se guarda al instalar, y lo que no ───────────────────────────────
 *
 * Lo pequeño y lo de arrancar: la página, el código de menos de 300 KB, el estilo,
 * el manifiesto y los iconos. **No** lo grande que solo usa una pantalla —el lector
 * de códigos (1 MB), el visor de PDF, las gráficas—: se guarda la primera vez que se
 * abre, y así instalar Estook no se come los datos del móvil de un camarero.
 *
 * Los tipos van escritos aquí y no se importan de `vite`, como en
 * `politica-de-seguridad.ts`: `herramientas/` no tiene `vite` entre sus dependencias.
 */

interface TrozoDelPaquete {
  readonly type: 'chunk' | 'asset';
  readonly fileName: string;
  readonly isEntry?: boolean;
  readonly code?: string;
  readonly source?: string | Uint8Array;
}

interface ContextoDelComplemento {
  emitFile(fichero: { type: 'asset'; fileName: string; source: string }): string;
}

export interface ComplementoDelTrabajador {
  name: string;
  apply: 'build';
  generateBundle(
    this: ContextoDelComplemento,
    opciones: unknown,
    paquete: Record<string, TrozoDelPaquete>,
  ): void;
}

/** Lo que pesa más que esto no se guarda al instalar: se guarda al usarse. */
const TOPE_AL_INSTALAR = 300 * 1024;

/**
 * Lo de `public/` que hace falta para arrancar y para los avisos. Los logos y el
 * Fogón también: sin ellos, abrir sin señal enseñaba una imagen rota en el saludo
 * (repaso con capturas, 1-oct). Unos 60 KB entre los tres.
 */
const DE_PUBLIC = [
  'manifest.webmanifest',
  'marca/estook-logo.png',
  'marca/estook-logo-oscuro.png',
  'marca/fogon.png',
  'marca/favicon.svg',
  'marca/apple-touch-icon.png',
  'marca/pwa-192.png',
  'marca/pwa-512.png',
  'marca/insignia-96.png',
];

function cuantoPesa(trozo: TrozoDelPaquete): number {
  if (trozo.type === 'chunk') return Buffer.byteLength(trozo.code ?? '');
  const fuente = trozo.source ?? '';
  return typeof fuente === 'string' ? Buffer.byteLength(fuente) : fuente.byteLength;
}

/** Los ficheros que se guardan al instalar, de una versión. Exportado para la prueba. */
export function loQueSeGuarda(paquete: Record<string, TrozoDelPaquete>): string[] {
  const delPaquete = Object.values(paquete)
    .filter((trozo) => !trozo.fileName.endsWith('.map'))
    .filter((trozo) => /\.(js|mjs|css|html)$/.test(trozo.fileName))
    .filter((trozo) => trozo.fileName === 'index.html' || cuantoPesa(trozo) <= TOPE_AL_INSTALAR)
    // El trozo de entrada se guarda siempre, pese lo que pese: sin él no arranca.
    .concat(
      Object.values(paquete).filter((trozo) => trozo.type === 'chunk' && trozo.isEntry === true),
    )
    .map((trozo) => trozo.fileName);
  return ['./', ...new Set([...delPaquete, ...DE_PUBLIC])].sort();
}

export function elTrabajadorDeServicio(): ComplementoDelTrabajador {
  return {
    name: 'estook-trabajador-de-servicio',
    apply: 'build',
    generateBundle(_opciones, paquete) {
      const archivos = loQueSeGuarda(paquete);
      const version = createHash('sha256')
        .update(archivos.join('\n'))
        .update(CODIGO)
        .digest('hex')
        .slice(0, 16);
      this.emitFile({
        type: 'asset',
        fileName: 'sw.js',
        source: CODIGO.replace('__VERSION__', JSON.stringify(version)).replace(
          '__ARCHIVOS__',
          JSON.stringify(archivos),
        ),
      });
    },
  };
}

/**
 * El trabajador, tal cual se sirve. En JavaScript del navegador, sin módulos: así lo
 * acepta todo navegador que tenga trabajadores, Safari incluido.
 */
const CODIGO = `/* Estook · el trabajador de servicio de la app (I · decisión 0070).
 * Lo genera la construcción (herramientas/trabajador-de-servicio.ts): no se edita. */
'use strict';

const VERSION = __VERSION__;
const LO_DE_ARRANCAR = __ARCHIVOS__;
const CACHE = 'estook-app';
const LISTA = '__estook_lista__';
const ESPERA_A_LA_RED_MS = 4000;

const aqui = (ruta) => new URL(ruta, self.registration.scope).href;

// ── Instalar: guardar lo de arrancar, de uno en uno y sin romper ──────────────
self.addEventListener('install', (evento) => {
  evento.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await Promise.all(
        LO_DE_ARRANCAR.map(async (ruta) => {
          try {
            const respuesta = await fetch(new Request(aqui(ruta), { cache: 'reload' }));
            if (respuesta.ok) await cache.put(aqui(ruta), await sinRedireccion(respuesta));
          } catch (fallo) {
            // Un fichero que no llega no deja la app sin trabajador: se guarda al usarse.
          }
        }),
      );
      // La versión nueva manda en cuanto está lista: así la app se pone al día sola.
      await self.skipWaiting();
    })(),
  );
});

// ── Activar: quitar lo viejo, menos lo de la versión anterior ─────────────────
// Una pestaña abierta con la versión de antes todavía puede pedir sus trozos.
self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      const guardada = await cache.match(aqui(LISTA));
      let anterior = [];
      try {
        anterior = guardada ? await guardada.json() : [];
      } catch (fallo) {
        anterior = [];
      }
      const quedan = new Set([...LO_DE_ARRANCAR, ...anterior].map(aqui));
      for (const peticion of await cache.keys()) {
        if (peticion.url === aqui(LISTA)) continue;
        if (!quedan.has(peticion.url)) await cache.delete(peticion);
      }
      await cache.put(aqui(LISTA), new Response(JSON.stringify(LO_DE_ARRANCAR)));
      for (const nombre of await caches.keys()) {
        if (nombre !== CACHE && nombre.startsWith('estook-')) await caches.delete(nombre);
      }
      await self.clients.claim();
    })(),
  );
});

// ── Servir: la página de la red si contesta, y si no, la guardada ──────────────
self.addEventListener('fetch', (evento) => {
  const peticion = evento.request;
  if (peticion.method !== 'GET') return;
  const url = new URL(peticion.url);
  // Solo lo de la app: la API, las fotos y lo de otros sitios van por su camino.
  if (url.origin !== self.location.origin || !url.href.startsWith(self.registration.scope)) return;
  if (peticion.mode === 'navigate') {
    evento.respondWith(laPagina(peticion));
    return;
  }
  evento.respondWith(loGuardadoPrimero(peticion));
});

async function laPagina(peticion) {
  try {
    const deLaRed = await Promise.race([
      fetch(peticion),
      new Promise((_, rechazar) =>
        setTimeout(() => rechazar(new Error('la red no contesta')), ESPERA_A_LA_RED_MS),
      ),
    ]);
    return deLaRed;
  } catch (fallo) {
    const cache = await caches.open(CACHE);
    const guardada = (await cache.match(aqui('./'))) || (await cache.match(aqui('index.html')));
    return guardada ? await sinRedireccion(guardada) : Response.error();
  }
}

// Safari no acepta, para abrir una pantalla, una respuesta que llegó tras una
// redirección («Response served by service worker has redirections»); Chrome sí. Se
// rehace la misma, limpia: sin esto, en el iPhone Estook no abría sin señal (0070).
async function sinRedireccion(respuesta) {
  if (!respuesta.redirected) return respuesta;
  return new Response(await respuesta.blob(), {
    status: respuesta.status,
    statusText: respuesta.statusText,
    headers: respuesta.headers,
  });
}

async function loGuardadoPrimero(peticion) {
  const cache = await caches.open(CACHE);
  const guardada = await cache.match(peticion, { ignoreSearch: true });
  if (guardada) return guardada;
  const deLaRed = await fetch(peticion);
  // Lo que lleva su huella en el nombre no cambia nunca: se guarda para la próxima.
  if (
    deLaRed.ok &&
    deLaRed.type === 'basic' &&
    new URL(peticion.url).pathname.includes('/assets/') &&
    !peticion.url.endsWith('.map')
  ) {
    await cache.put(peticion, deLaRed.clone());
  }
  return deLaRed;
}

// ── Los avisos al móvil ───────────────────────────────────────────────────────
self.addEventListener('push', (evento) => {
  let aviso = { titulo: 'Estook', detalle: null, ir: '/', etiqueta: 'estook', sinLeer: 0 };
  try {
    aviso = Object.assign(aviso, evento.data ? evento.data.json() : {});
  } catch (fallo) {
    // Un aviso que no se puede leer se enseña igual: Apple no deja recibir sin enseñar.
  }
  evento.waitUntil(
    (async () => {
      try {
        if (aviso.sinLeer > 0 && self.navigator.setAppBadge) {
          await self.navigator.setAppBadge(aviso.sinLeer);
        }
      } catch (fallo) {
        // El número del icono es un extra: sin él, el aviso sale igual.
      }
      // Si la app está abierta, que ponga la campana al día.
      const ventanas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const ventana of ventanas) ventana.postMessage({ tipo: 'estook-aviso' });
      await self.registration.showNotification(aviso.titulo, {
        body: aviso.detalle || undefined,
        tag: aviso.etiqueta,
        renotify: true,
        icon: aqui('marca/pwa-192.png'),
        badge: aqui('marca/insignia-96.png'),
        lang: 'es-ES',
        vibrate: [200, 100, 200],
        data: { ir: aviso.ir || '/' },
      });
    })(),
  );
});

// Tocarlo abre la app donde se resuelve: la que ya está abierta, o una nueva.
self.addEventListener('notificationclick', (evento) => {
  evento.notification.close();
  const ir = (evento.notification.data && evento.notification.data.ir) || '/';
  const destino = aqui('./#' + ir);
  evento.waitUntil(
    (async () => {
      const ventanas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const abierta = ventanas.find((v) => v.url.startsWith(self.registration.scope));
      if (abierta) {
        await abierta.focus();
        abierta.postMessage({ tipo: 'estook-ir', ir });
        return;
      }
      await self.clients.openWindow(destino);
    })(),
  );
});

// La versión, para quien la pregunte (las pruebas y bd:comprobar no la necesitan).
self.addEventListener('message', (evento) => {
  if (evento.data && evento.data.tipo === 'estook-version' && evento.source) {
    evento.source.postMessage({ tipo: 'estook-version', version: VERSION });
  }
});
`;
