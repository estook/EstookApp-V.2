import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Estook · admin
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
  const conBarra = raiz.endsWith('/') ? raiz : `${raiz}/`;
  const base = `${conBarra}admin/`;

  return {
    base,
    envDir: RAIZ,
    plugins: [react()],
    build: {
      outDir: 'dist',
      sourcemap: true,
      target: 'es2022',
      // El presupuesto de B7 se comprueba aparte, en herramientas/presupuesto-tamano.mjs
      chunkSizeWarningLimit: 250,
    },
    server: { port: 5176, strictPort: true },
    preview: { port: 5176, strictPort: true },
  };
});
