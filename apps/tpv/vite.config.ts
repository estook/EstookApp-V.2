import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwind from '@tailwindcss/vite';
import { laPoliticaDeSeguridad } from '../../herramientas/politica-de-seguridad.ts';
import {
  DE_PUBLIC_DEL_TPV,
  elTrabajadorDeServicio,
} from '../../herramientas/trabajador-de-servicio.ts';

/**
 * Estook TPV (M20A, 0056): la sala y la cocina, en su propia puerta del mismo código.
 *
 * Las cinco aplicaciones se publican bajo un mismo dominio (decision 0001):
 *   web -> VITE_BASE            carta -> VITE_BASE + carta/
 *   app -> VITE_BASE + app/     admin -> VITE_BASE + admin/     tpv -> VITE_BASE + tpv/
 *
 * VITE_BASE se declara una sola vez en las variables del repositorio, para no
 * tener cuatro sitios donde equivocarse con la barra final.
 */
const RAIZ = fileURLToPath(new URL('../../', import.meta.url));

/**
 * **La dirección del QR para vincular** (T1, Anexo 11.3): `estook.com/tpv/vincular/#482913`.
 * Pages sirve ficheros, así que esa carpeta tiene que existir: es la misma página. El
 * código va detrás del `#`, que no llega a ningún servidor.
 *
 * Lo de `public/` (el manifiesto y los iconos) se pide con direcciones relativas: en la copia,
 * un nivel más arriba. Sin eso, desde el QR no se podía instalar (0115).
 */
function laDireccionDelQr(): Plugin {
  return {
    name: 'la-direccion-del-qr',
    apply: 'build',
    closeBundle() {
      const dist = fileURLToPath(new URL('./dist/', import.meta.url));
      mkdirSync(`${dist}vincular`, { recursive: true });
      const pagina = readFileSync(`${dist}index.html`, 'utf8').replaceAll('="./', '="../');
      writeFileSync(`${dist}vincular/index.html`, pagina);
    },
  };
}

export default defineConfig(({ mode }) => {
  const variables = loadEnv(mode, RAIZ, '');
  const raiz = variables['VITE_BASE'] ?? '/';
  const conBarra = raiz.endsWith('/') ? raiz : `${raiz}/`;
  const base = `${conBarra}tpv/`;

  return {
    base,
    envDir: RAIZ,
    plugins: [
      react(),
      tailwind(),
      laDireccionDelQr(),
      // La politica de seguridad de contenido. Se calcula al construir porque
      // depende de donde este la API, que se decide al construir. Vive entera en
      // herramientas/politica-de-seguridad.mjs, que es su unico dueno.
      laPoliticaDeSeguridad({
        direccionDeLaApi: variables['VITE_API_URL'] ?? '',
        // La sala y la cocina se avisan al segundo por Supabase Realtime (0106).
        direccionDeSupabase: variables['VITE_SUPABASE_URL'] ?? '',
        enDesarrollo: mode !== 'production',
        // Sin internet, la cocina recibe por la caja de centro (0123): su puerto en el wifi,
        // `PUERTO_DEL_CENTRO` del dominio (lo vigila politica-de-seguridad.prueba.ts).
        puertoDeLaCaja: 47100,
      }),
      // Instalable (0115): abre sin señal, con su caché, que no es la de Estook.
      elTrabajadorDeServicio({ cache: 'estook-tpv', dePublic: DE_PUBLIC_DEL_TPV }),
    ],
    build: {
      outDir: 'dist',
      sourcemap: true,
      target: 'es2022',
      // El presupuesto de B7 se comprueba aparte, en herramientas/presupuesto-tamano.mjs
      chunkSizeWarningLimit: 250,
    },
    server: { port: 5178, strictPort: true },
    preview: { port: 5178, strictPort: true },
  };
});
