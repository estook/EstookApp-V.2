/**
 * Mete la letra de la app dentro del paquete de los documentos (0068).
 *
 *   pnpm documentos:letra
 *
 * Los PDF los imprime un navegador que no es el nuestro, y ese navegador no tiene
 * por qué tener Montserrat. Así que la letra va dentro de cada documento, sacada del
 * mismo fichero que sirve la app. Si un día cambia la letra de la app, se pasa esto
 * y la prueba de `packages/documentos` vuelve a verde.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ORIGEN = fileURLToPath(
  new URL('../packages/ui/fuentes/montserrat-latin.woff2', import.meta.url),
);
const DESTINO = fileURLToPath(new URL('../packages/documentos/src/letra.ts', import.meta.url));

const base64 = readFileSync(ORIGEN).toString('base64');

writeFileSync(
  DESTINO,
  `/**
 * La letra de Estook, Montserrat, **dentro** de cada documento (0068).
 *
 * Un PDF lo imprime un navegador que no es el nuestro (Cloudflare), y ese navegador
 * no tiene por qué tener Montserrat: si no la tiene, pone otra y el documento deja de
 * parecerse a la app. Así que va incrustada. Es la misma que sirve la app
 * (\`packages/ui/fuentes/montserrat-latin.woff2\`), con todas las letras del castellano,
 * y una prueba comprueba que no se separan.
 *
 * Sale de \`pnpm documentos:letra\`. No se edita a mano.
 */
export const MONTSERRAT_WOFF2_BASE64 =
  '${base64}';
`,
);
console.log(`  La letra, dentro de packages/documentos (${(base64.length / 1024).toFixed(0)} KB).`);
