import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwind from '@tailwindcss/vite';
import { laPoliticaDeSeguridad } from '../../herramientas/politica-de-seguridad.ts';

/**
 * Estook · web
 *
 * Las cuatro aplicaciones se publican bajo un mismo dominio (decision 0001):
 *   web -> VITE_BASE            carta -> VITE_BASE + carta/
 *   app -> VITE_BASE + app/     admin -> VITE_BASE + admin/
 *
 * VITE_BASE se declara una sola vez en las variables del repositorio, para no
 * tener cuatro sitios donde equivocarse con la barra final.
 */
const RAIZ = fileURLToPath(new URL('../../', import.meta.url));

export default defineConfig(({ mode }) => {
  const variables = loadEnv(mode, RAIZ, '');
  const raiz = variables['VITE_BASE'] ?? '/';
  const base = raiz.endsWith('/') ? raiz : `${raiz}/`;

  return {
    base,
    envDir: RAIZ,
    plugins: [
      react(),
      tailwind(),
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
      // Tres páginas (0042): la portada y las dos legales, cada una con su HTML, para
      // que `estook.com/privacidad/` exista de verdad y no dependa de una ruta en JS.
      rollupOptions: {
        input: {
          portada: fileURLToPath(new URL('./index.html', import.meta.url)),
          privacidad: fileURLToPath(new URL('./privacidad/index.html', import.meta.url)),
          condiciones: fileURLToPath(new URL('./condiciones/index.html', import.meta.url)),
        },
      },
      // El presupuesto de B7 se comprueba aparte, en herramientas/presupuesto-tamano.mjs
      chunkSizeWarningLimit: 250,
    },
    server: { port: 5173, strictPort: true },
    preview: { port: 5173, strictPort: true },
  };
});
