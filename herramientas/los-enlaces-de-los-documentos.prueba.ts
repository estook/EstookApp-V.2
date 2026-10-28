import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * **Cada enlace entre documentos lleva a algún sitio** (28-oct). Al ordenar `docs/` se movieron
 * veintiocho papeles a `historia/` y `auditorias/`; sin esto, un enlace roto se colaba sin que
 * nadie lo viera hasta que Richi lo tocaba. Mira los enlaces relativos de todos los `.md` del
 * repositorio; lo que va entre comillas de código no es un enlace.
 */
const RAIZ = fileURLToPath(new URL('..', import.meta.url));

function losDocumentos(): string[] {
  return execFileSync('git', ['ls-files', '*.md'], { cwd: RAIZ, encoding: 'utf8' })
    .split('\n')
    .filter((fichero) => fichero !== '' && existsSync(join(RAIZ, fichero)));
}

function losRotos(fichero: string): string[] {
  const texto = readFileSync(join(RAIZ, fichero), 'utf8')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`\n]*`/g, '');
  const rotos: string[] = [];
  for (const [, destino = ''] of texto.matchAll(/\]\(([^)\s]+)\)/g)) {
    const ruta = destino.split('#')[0] ?? '';
    if (ruta === '' || /^[a-z]+:/i.test(ruta)) continue;
    if (!existsSync(resolve(join(RAIZ, dirname(fichero)), decodeURIComponent(ruta)))) {
      rotos.push(`${fichero} → ${destino}`);
    }
  }
  return rotos;
}

describe('los enlaces de los documentos', () => {
  it('ninguno lleva a un fichero que no existe', () => {
    const documentos = losDocumentos();
    expect(documentos.length).toBeGreaterThan(100);
    expect(documentos.flatMap(losRotos)).toEqual([]);
  });
});
