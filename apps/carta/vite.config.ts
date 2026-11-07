import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv, type Connect, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwind from '@tailwindcss/vite';
import { laPoliticaDeSeguridad } from '../../herramientas/politica-de-seguridad.ts';

/**
 * Estook · carta
 *
 * Las cuatro aplicaciones se publican bajo un mismo dominio (decision 0001):
 *   web -> VITE_BASE            carta -> VITE_BASE + carta/
 *   app -> VITE_BASE + app/     admin -> VITE_BASE + admin/
 *
 * VITE_BASE se declara una sola vez en las variables del repositorio, para no
 * tener cuatro sitios donde equivocarse con la barra final.
 */
const RAIZ = fileURLToPath(new URL('../../', import.meta.url));

/**
 * **`/factura` también en el ordenador** (T6 · 2 · 3, 0141). En estook.com la sirve la `404.html`, que es
 * esta aplicación (`publicar.yml`). Aquí, que `vite` solo sirve lo que cuelga de `/carta/`, se hace lo
 * mismo a mano: si no, la página no se podría ni probar ni abrir en local.
 */
function laPaginaDeLaFactura(base: string): Plugin {
  const aLaCarta: Connect.NextHandleFunction = (pedido, _respuesta, seguir) => {
    if (/^\/factura(\/|\?|$)/.test(pedido.url ?? '')) pedido.url = base;
    seguir();
  };
  return {
    name: 'la-pagina-de-la-factura',
    configureServer(servidor) {
      servidor.middlewares.use(aLaCarta);
    },
    configurePreviewServer(servidor) {
      servidor.middlewares.use(aLaCarta);
    },
  };
}

export default defineConfig(({ mode }) => {
  const variables = loadEnv(mode, RAIZ, '');
  const raiz = variables['VITE_BASE'] ?? '/';
  const conBarra = raiz.endsWith('/') ? raiz : `${raiz}/`;
  const base = `${conBarra}carta/`;

  return {
    base,
    envDir: RAIZ,
    plugins: [
      react(),
      tailwind(),
      laPaginaDeLaFactura(base),
      // La politica de seguridad de contenido. Se calcula al construir porque
      // depende de donde este la API, que se decide al construir. Vive entera en
      // herramientas/politica-de-seguridad.mjs, que es su unico dueno.
      laPoliticaDeSeguridad({
        direccionDeLaApi: variables['VITE_API_URL'] ?? '',
        enDesarrollo: mode !== 'production',
      }),
    ],
    build: {
      outDir: 'dist',
      sourcemap: true,
      target: 'es2022',
      // El presupuesto de B7 se comprueba aparte, en herramientas/presupuesto-tamano.mjs
      chunkSizeWarningLimit: 250,
    },
    server: { port: 5175, strictPort: true },
    preview: { port: 5175, strictPort: true },
  };
});
