import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { DIBUJOS, NOMBRES_DE_LOS_DIBUJOS, PARA_QUE_ES } from './dibujos/catalogo.ts';

/**
 * Los dibujos de los vacíos (entrega V, punto 4), vigilados.
 *
 * Tres promesas del plan que ninguna pantalla deja ver si se rompen:
 *
 *   · «**Se cargan aparte** del paquete inicial». Basta con que alguien importe un
 *     dibujo de frente —`import Camara from './dibujos/Camara.tsx'`— para que los
 *     veinte entren en el arranque de todas las apps, y la pantalla se vería igual.
 *   · «En SVG y **pintados con las fichas**: salen bien en claro y en oscuro sin
 *     hacer dos». Un solo `#1f2a2e` escrito a mano sale negro sobre negro en oscuro,
 *     que es exactamente el fallo que el tema oscuro no puede tener.
 *   · Que son **una familia**: todos sobre el mismo lienzo, con su halo y su suelo.
 */
const RAIZ = fileURLToPath(new URL('../../../', import.meta.url));
const DIBUJOS_EN = fileURLToPath(new URL('./dibujos/', import.meta.url));

/** Los ficheros de un dibujo: los que no son el lienzo, las clases o el catálogo. */
const LO_COMUN = new Set(['Lienzo.tsx', 'trazos.ts', 'catalogo.ts']);

async function codigoDe(carpeta: string): Promise<{ ruta: string; texto: string }[]> {
  const salida: { ruta: string; texto: string }[] = [];
  for (const entrada of await readdir(carpeta, { withFileTypes: true })) {
    if (entrada.name === 'node_modules' || entrada.name === 'dist') continue;
    const ruta = join(carpeta, entrada.name);
    if (entrada.isDirectory()) salida.push(...(await codigoDe(ruta)));
    else if (/\.(ts|tsx)$/.test(entrada.name)) {
      salida.push({ ruta, texto: await readFile(ruta, 'utf8') });
    }
  }
  return salida;
}

describe('los dibujos de los vacíos', () => {
  it('cada fichero de dibujo está en el catálogo, y cada entrada del catálogo tiene su fichero', async () => {
    const ficheros = (await readdir(DIBUJOS_EN)).filter((f) => !LO_COMUN.has(f));
    const catalogo = await readFile(join(DIBUJOS_EN, 'catalogo.ts'), 'utf8');

    for (const fichero of ficheros) {
      expect(catalogo, `${fichero} no está en el catálogo de dibujos`).toContain(
        `import('./${fichero}')`,
      );
    }
    expect(ficheros).toHaveLength(NOMBRES_DE_LOS_DIBUJOS.length);
  });

  it('cada uno dice para qué es', () => {
    for (const nombre of NOMBRES_DE_LOS_DIBUJOS) {
      expect(PARA_QUE_ES[nombre].trim(), nombre).not.toBe('');
    }
  });

  it('cada uno se carga y es un componente', async () => {
    for (const nombre of NOMBRES_DE_LOS_DIBUJOS) {
      const modulo = await DIBUJOS[nombre]();
      expect(typeof modulo.default, nombre).toBe('function');
    }
  });

  it('nadie importa un dibujo de frente: solo el catálogo, y con import()', async () => {
    const ficheros = [
      ...(await codigoDe(join(RAIZ, 'packages'))),
      ...(await codigoDe(join(RAIZ, 'apps'))),
    ];
    const nombres = (await readdir(DIBUJOS_EN)).filter((f) => !LO_COMUN.has(f));

    const deFrente = ficheros.filter(({ ruta, texto }) => {
      // Las pruebas no van al paquete, y esta cuenta el ejemplo en su cabecera.
      if (ruta.startsWith(DIBUJOS_EN) || ruta.endsWith('.prueba.ts')) return false;
      return nombres.some((n) =>
        new RegExp(`from\\s+['"][^'"]*dibujos/${n.replace('.', '\\.')}['"]`).test(texto),
      );
    });

    expect(
      deFrente.map((f) => relative(RAIZ, f.ruta)),
      'Un dibujo importado de frente entra en el paquete inicial de todas las apps',
    ).toEqual([]);
  });

  it('todos van sobre el lienzo común y ninguno lleva un color escrito a mano', async () => {
    const nombres = (await readdir(DIBUJOS_EN)).filter((f) => !LO_COMUN.has(f));

    for (const nombre of nombres) {
      const texto = await readFile(join(DIBUJOS_EN, nombre), 'utf8');
      expect(texto, `${nombre} no usa el lienzo común`).toContain('<Lienzo>');
      // Ni hexadecimales, ni rgb(), ni nombres de color: todo sale de las fichas
      // o del acento, que llega como `currentColor`.
      expect(texto, `${nombre} lleva un color a mano`).not.toMatch(
        /#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(|(fill|stroke)="(white|black|red|gray|grey)"/,
      );
    }
  });
});
