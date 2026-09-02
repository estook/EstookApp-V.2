/**
 * Construye las aplicaciones apuntando a la API de pruebas.
 *
 *   pnpm prueba:e2e:completa
 *
 * ── Por que hace falta un fichero para esto ──────────────────────────────────
 *
 * Porque `VITE_API_URL=... pnpm build` **no funciona en Windows**, que es donde se
 * desarrolla esto: PowerShell no entiende poner una variable delante de un
 * comando. Y meter `cross-env` seria una dependencia entera para una linea.
 *
 * ── Y por que hay que construir antes de probar ──────────────────────────────
 *
 * Vite hornea las variables `VITE_*` **al construir**, no al servir. Las pruebas
 * de extremo a extremo levantan lo ya construido (`vite preview`), asi que si se
 * construyera sin la direccion de la API, la aplicacion se levantaria diciendo
 * «todavia no hay servidor» y no se podria entrar.
 *
 * En integracion continua no se usa este fichero: alli la variable se declara en
 * el trabajo entero, que es mas claro cuando se lee el flujo.
 */
import { spawnSync } from 'node:child_process';

const DIRECCION = process.env['VITE_API_URL'] ?? 'http://localhost:5177';

function corre(comando, ...argumentos) {
  const salida = spawnSync(comando, argumentos, {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, VITE_API_URL: DIRECCION },
  });
  if (salida.status !== 0) process.exit(salida.status ?? 1);
}

console.log(`Construyendo contra ${DIRECCION}\n`);
corre('pnpm', 'build');

console.log('\nPruebas de extremo a extremo\n');
corre('pnpm', 'prueba:e2e');
