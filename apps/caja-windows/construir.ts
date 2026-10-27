// La caja para Windows (0119): el proceso principal y el puente, de TypeScript a un solo fichero
// cada uno. Electron se queda fuera: lo pone el propio programa.
import { build, type BuildOptions } from 'esbuild';

const comun: BuildOptions = {
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node22',
  external: ['electron'],
  logLevel: 'warning',
  legalComments: 'none',
};

await build({ ...comun, entryPoints: ['src/principal.ts'], outfile: 'dist/principal.cjs' });
// El puente corre aislado y sin Node: solo puede pedir «electron», y nada más.
await build({ ...comun, entryPoints: ['src/puente.ts'], outfile: 'dist/puente.cjs' });
