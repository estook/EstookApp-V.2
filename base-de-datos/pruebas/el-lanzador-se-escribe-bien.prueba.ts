import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Que ningún documento mande a escribir `.estook.cmd` sin la barra.
 *
 * En PowerShell el lanzador se llama con la barra invertida delante, y sin ella no
 * es nada. Se coló **dos veces**: en los pasos de M7 y, al corregirlo, otra vez en
 * los de antes de M8, porque el script que escribía el documento pasaba por una
 * terminal que se comía la barra. Las dos veces lo habría pagado Richi copiando un
 * comando que no funciona.
 *
 * Una lección escrita no impide nada; esta prueba sí. Se salta solo la línea que
 * **cuenta** el fallo, que dice «sin la barra».
 */
const RAIZ = fileURLToPath(new URL('../../', import.meta.url));

const BARRA = String.fromCharCode(92);
const LANZADOR = 'estook.cmd';

async function losDocumentos(): Promise<string[]> {
  const encontrados: string[] = [join(RAIZ, 'ESTADO.md'), join(RAIZ, 'README.md')];
  async function recorrer(carpeta: string): Promise<void> {
    for (const entrada of await readdir(carpeta, { withFileTypes: true })) {
      const camino = join(carpeta, entrada.name);
      if (entrada.isDirectory()) await recorrer(camino);
      else if (entrada.name.endsWith('.md')) encontrados.push(camino);
    }
  }
  await recorrer(join(RAIZ, 'docs'));
  await recorrer(join(RAIZ, 'config'));
  return encontrados;
}

/** Si en esa línea hay un `.estook.cmd` que no lleva la barra delante. */
function sinBarra(linea: string): boolean {
  const buscado = `.${LANZADOR}`;
  let desde = linea.indexOf(buscado);
  while (desde !== -1) {
    if (desde === 0 || linea[desde - 1] !== BARRA) return true;
    desde = linea.indexOf(buscado, desde + 1);
  }
  return false;
}

describe('el lanzador, en los documentos', () => {
  it('siempre se escribe con la barra delante', async () => {
    const mal: string[] = [];
    for (const fichero of await losDocumentos()) {
      const lineas = (await readFile(fichero, 'utf8')).split('\n');
      lineas.forEach((linea, i) => {
        if (sinBarra(linea) && !linea.includes('sin la barra')) {
          mal.push(`${fichero.slice(RAIZ.length)}:${i + 1}  ${linea.trim()}`);
        }
      });
    }
    expect(mal, `En PowerShell el lanzador es .${BARRA}${LANZADOR}`).toEqual([]);
  });

  it('y la comprobación de verdad caza el fallo', () => {
    expect(sinBarra(`.${LANZADOR} bd:migrar`)).toBe(true);
    expect(sinBarra(`Con \`.${LANZADOR}\` y uno por recuadro`)).toBe(true);
    expect(sinBarra(`.${BARRA}${LANZADOR} bd:migrar`)).toBe(false);
  });
});
