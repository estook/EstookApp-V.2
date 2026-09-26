import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Nada se esconde con `:has(:empty)` (repaso del 25-sep).
 *
 * En el iPhone, WebKit no vuelve a mirar `:has(:empty)` cuando lo de dentro se
 * llena después de pintarse: la zona de atención del Panel se quedaba escondida
 * con «Hoy» dentro, y Richi lo veía «a veces sí, a veces no». En Chrome no pasa,
 * así que ninguna pantalla de las pruebas lo caza: lo caza esta, leyendo el código.
 * Lo que tenga que esconderse cuando está vacío lo decide la página
 * (`usarSinNadaDentro`).
 */
const RAIZ = fileURLToPath(new URL('../../../', import.meta.url));

async function codigoDe(carpeta: string): Promise<{ ruta: string; texto: string }[]> {
  const salida: { ruta: string; texto: string }[] = [];
  for (const entrada of await readdir(carpeta, { withFileTypes: true })) {
    if (entrada.name === 'node_modules' || entrada.name === 'dist') continue;
    const ruta = join(carpeta, entrada.name);
    if (entrada.isDirectory()) salida.push(...(await codigoDe(ruta)));
    else if (/\.(ts|tsx|css)$/.test(entrada.name) && !entrada.name.endsWith('.prueba.ts')) {
      salida.push({ ruta, texto: await readFile(ruta, 'utf8') });
    }
  }
  return salida;
}

describe('sin :has(:empty)', () => {
  it('ninguna app ni el sistema de diseño esconde nada con :has(:empty)', async () => {
    const ficheros = [
      ...(await codigoDe(join(RAIZ, 'apps'))),
      ...(await codigoDe(join(RAIZ, 'packages'))),
    ];
    // Sin los comentarios, que cuentan por qué no se usa.
    const sinComentarios = (texto: string) =>
      texto.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    const conHas = ficheros
      .filter(({ texto }) => /:has\([^)]*:empty/.test(sinComentarios(texto)))
      .map(({ ruta }) => relative(RAIZ, ruta).replaceAll('\\', '/'));
    expect(conHas).toEqual([]);
  });
});
