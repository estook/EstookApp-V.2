import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Lo que va a una columna `jsonb` se manda **como texto**: `${…}::text::jsonb`.
 *
 * ── El fallo que esto fija, y por qué ninguna otra prueba lo veía ────────────
 *
 * En producción la API habla con Postgres con `postgres.js`, y cuando un
 * parámetro acaba en `jsonb` postgres.js lo convierte él a JSON. El código ya le
 * pasaba el texto hecho con `JSON.stringify`, así que **se codificaba dos veces**:
 * se guardaba un texto con el objeto dentro, no el objeto.
 *
 * Donde una restricción miraba dentro —el Panel exige una lista de widgets— el
 * guardado fallaba entero, con «cannot get array length of a scalar»: por eso en
 * producción no se guardó ni un Panel. En el resto se guardaba el texto, y la
 * auditoría, la bandeja de eventos y la memoria de idempotencia se llenaron de
 * cadenas.
 *
 * Las pruebas corren con PGlite, que pasa el texto tal cual, así que **todas
 * pasaban**. Es la lección E4 del Plan con nombre y apellidos: una prueba que
 * corre en un sitio no prueba el otro. Con `::text::jsonb` el parámetro viaja
 * como texto en los dos, y la conversión la hace Postgres, que es la misma en
 * los dos.
 *
 * Se comprueba leyendo el código y no ejecutándolo, a propósito: lo que falla es
 * el conductor de producción, que aquí no está.
 */
const SERVIDOR = fileURLToPath(new URL('..', import.meta.url));

function losFicheros(carpeta: string): string[] {
  return readdirSync(carpeta).flatMap((nombre) => {
    const camino = join(carpeta, nombre);
    if (nombre === 'node_modules') return [];
    if (statSync(camino).isDirectory()) return losFicheros(camino);
    return camino.endsWith('.ts') && !camino.endsWith('.prueba.ts') ? [camino] : [];
  });
}

describe('lo que va a una columna jsonb', () => {
  it('se manda como texto y lo convierte Postgres', () => {
    const mal: string[] = [];

    for (const fichero of losFicheros(SERVIDOR)) {
      readFileSync(fichero, 'utf8')
        .split('\n')
        .forEach((linea, indice) => {
          if (/\}::jsonb/.test(linea)) mal.push(`${fichero.slice(SERVIDOR.length)}:${indice + 1}`);
        });
    }

    expect(
      mal,
      'Estos parámetros van a jsonb sin pasar por texto. En producción se guardan como una cadena: escribe `${…}::text::jsonb`.',
    ).toEqual([]);
  });
});
