import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { elTrabajadorDeServicio } from './trabajador-de-servicio.ts';

/**
 * **El trabajador cambia cuando cambia lo de `public/`** (lección 236). El manifiesto no lleva
 * huella en el nombre: si su versión no lo mira, cambiar solo el manifiesto deja el trabajador
 * igual y el navegador sigue sirviendo el viejo desde lo guardado.
 */
function laVersionCon(manifiesto: string): string {
  const carpeta = mkdtempSync(join(tmpdir(), 'estook-public-'));
  writeFileSync(join(carpeta, 'manifest.webmanifest'), manifiesto);
  const complemento = elTrabajadorDeServicio({
    cache: 'estook-tpv',
    dePublic: ['manifest.webmanifest'],
  });
  complemento.configResolved({ publicDir: carpeta });
  let sw = '';
  complemento.generateBundle.call(
    {
      emitFile: (fichero) => {
        sw = fichero.source;
        return fichero.fileName;
      },
    },
    {},
    { 'index.html': { type: 'asset', fileName: 'index.html', source: '<!doctype html>' } },
  );
  return /const VERSION = "([0-9a-f]{16})";/.exec(sw)?.[1] ?? '';
}

describe('la versión del trabajador', () => {
  it('cambia si cambia el manifiesto, aunque se llame igual', () => {
    const antes = laVersionCon('{"id": "./"}');
    expect(antes).toMatch(/^[0-9a-f]{16}$/);
    expect(laVersionCon('{"id": "./"}')).toBe(antes);
    expect(laVersionCon('{"id": "/tpv/"}')).not.toBe(antes);
  });
});
