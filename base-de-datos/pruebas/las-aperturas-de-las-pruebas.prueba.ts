import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Las pruebas de pantalla navegan por `abrir.ts`, o no navegan (25-sep-2026).
 *
 * El Safari de la integración continua contesta a veces «WebKit encountered an
 * internal error» al navegar, antes de pedir nada a Estook. Se protegieron las
 * aperturas (`abrirSinQueSeCaiga`) y **se quedaron fuera veinticuatro recargas**:
 * la del ayudante de entrar de `esqueleto.spec.ts` se cayó con ese error en la #68 y
 * pasó al repetirse, que es un rojo escondido en una vuelta verde.
 *
 * Esto lee las pruebas y no deja ni un `page.goto` ni un `page.reload` fuera de
 * `abrir.ts`: el siguiente que se escriba suelto, sale aquí y no en GitHub.
 */
const CARPETA = fileURLToPath(new URL('../../pruebas/e2e/', import.meta.url));

describe('las pruebas de pantalla', () => {
  it('navegan siempre por abrir.ts, que aguanta al Safari de la integración continua', () => {
    const sueltas: string[] = [];
    for (const nombre of readdirSync(CARPETA)) {
      if (!nombre.endsWith('.ts') || nombre === 'abrir.ts') continue;
      const lineas = readFileSync(`${CARPETA}${nombre}`, 'utf8').split('\n');
      lineas.forEach((linea, i) => {
        if (/\bpage\.(goto|reload)\(/.test(linea)) sueltas.push(`${nombre}:${String(i + 1)}`);
      });
    }
    expect(sueltas).toEqual([]);
  });
});
