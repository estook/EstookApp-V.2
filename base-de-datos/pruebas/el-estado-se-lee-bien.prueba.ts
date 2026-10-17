import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Que `ESTADO.md` se pueda leer al empezar, y que sus cifras no se queden atrás (0091).
 *
 * La 0063 lo dejó en 150 líneas y se cumplía apretando: el 17-oct tenía 150 justas, pero
 * siete eran párrafos de 1.400 a 6.300 caracteres. Por eso se cuentan **las líneas y lo
 * largo de cada una**. Las filas de las tablas no cuentan: Prettier las rellena con
 * espacios hasta la más ancha de su columna.
 *
 * Y las dos cifras que se quedaban atrás en cada entrega —cuántas decisiones y cuántas
 * lecciones— se cuadran con el repositorio. Las de producción (migraciones, consultas y
 * comandos) no las puede saber una prueba: las dicen `bd:comprobar` y `bd:comprobar-api`.
 */
const RAIZ = fileURLToPath(new URL('../../', import.meta.url));

const LINEAS_COMO_MUCHO = 250;
const CARACTERES_POR_LINEA_COMO_MUCHO = 700;

async function elEstado(): Promise<string> {
  return readFile(join(RAIZ, 'ESTADO.md'), 'utf8');
}

/** Una fila de tabla, también dentro de una cita (`> | … |`). */
function esFilaDeTabla(linea: string): boolean {
  return /^(?:>\s*)?\|/.test(linea);
}

describe('ESTADO.md', () => {
  it(`no pasa de ${LINEAS_COMO_MUCHO} líneas`, async () => {
    const lineas = (await elEstado()).trimEnd().split('\n');
    expect(lineas.length).toBeLessThanOrEqual(LINEAS_COMO_MUCHO);
  });

  it(`ninguna línea de texto pasa de ${CARACTERES_POR_LINEA_COMO_MUCHO} caracteres`, async () => {
    const largas = (await elEstado())
      .split('\n')
      .map((linea, i) => ({ linea, numero: i + 1, largo: linea.length }))
      .filter(
        ({ linea, largo }) => !esFilaDeTabla(linea) && largo > CARACTERES_POR_LINEA_COMO_MUCHO,
      )
      .map(({ numero, largo }) => `línea ${numero}: ${largo} caracteres`);
    expect(largas, 'Un párrafo así no se lee: se resume o se va a su documento').toEqual([]);
  });

  it('dice cuántas decisiones hay, y son las que hay', async () => {
    const hay = (await readdir(join(RAIZ, 'docs/decisiones'))).filter((nombre) =>
      /^\d{4}-.+\.md$/.test(nombre),
    ).length;
    const dice = /\[`docs\/decisiones\/`\]\([^)]*\) \((\d+)\)/.exec(await elEstado())?.[1];
    expect(Number(dice)).toBe(hay);
  });

  it('dice cuántas lecciones hay, y son las que hay', async () => {
    const lecciones = await readFile(join(RAIZ, 'docs/lecciones.md'), 'utf8');
    const numeros = [...lecciones.matchAll(/^(\d+)\. /gm)].map((encontrada) =>
      Number(encontrada[1]),
    );
    // Numeradas de una en una y sin saltos: así la última es también cuántas hay.
    expect(numeros).toEqual(numeros.map((_, i) => i + 1));
    const dice = /Lo aprendido fallando \((\d+)\)/.exec(await elEstado())?.[1];
    expect(Number(dice)).toBe(numeros.length);
  });
});
