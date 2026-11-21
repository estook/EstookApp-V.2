import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * **Una migración no borra lo que lee la API de antes** (lección 276, 21-nov).
 *
 * El orden es fusionar, migrar y **después** desplegar la API. En ese rato la API de antes sigue
 * leyendo la base: si una migración borra una columna que lee, lo que la lee se cae hasta el
 * despliegue. Así que, desde la 0120, una migración que borra una columna (o una tabla) lo dice con
 * `-- Se borra porque:` y el motivo —normalmente, que la dejó sin usar una migración de antes y ya
 * no la lee ninguna API—. La reversión no cuenta: deshacer es volver atrás a propósito.
 */
const MIGRACIONES = fileURLToPath(new URL('../base-de-datos/migraciones', import.meta.url));
const DESDE = 120;

function lasQueMiran(): string[] {
  return readdirSync(MIGRACIONES)
    .filter((f) => /^\d{4}_.*\.sql$/.test(f) && !f.endsWith('.revertir.sql'))
    .filter((f) => Number(f.slice(0, 4)) >= DESDE);
}

describe('las migraciones no borran lo que lee la API de antes (lección 276)', () => {
  it('cada «drop column» o «drop table» dice por qué ya nadie lo lee', () => {
    const sinMotivo = lasQueMiran().filter((fichero) => {
      const texto = readFileSync(join(MIGRACIONES, fichero), 'utf8');
      const sinComentarios = texto.replace(/--.*$/gm, '');
      const borra = /\bdrop\s+(column|table)\b/i.test(sinComentarios);
      return borra && !/--\s*Se borra porque:/i.test(texto);
    });
    expect(
      sinMotivo,
      'Estas migraciones borran una columna o una tabla sin decir por qué ya no la lee la API de antes. Se deja sin usar y se borra en una migración de después, con «-- Se borra porque:».',
    ).toEqual([]);
  });

  it('la 0120 deja el fijado del botón, que lee la API de antes', () => {
    const texto = readFileSync(join(MIGRACIONES, '0120_los_recomendados.sql'), 'utf8').replace(
      /--.*$/gm,
      '',
    );
    expect(texto).not.toMatch(/drop\s+column\s+fijado/i);
  });
});
