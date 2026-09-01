import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * M3 · las fichas de diseno no pueden chocar con Tailwind.
 *
 * ── El fallo que esta prueba existe para que no vuelva ───────────────────────
 *
 * Cada ficha declarada en `@theme` genera una utilidad. B1 llama a los radios
 * `--r-s`, `--r-m`, `--r-l`, `--r-xl` y `--r-full`, asi que se declararon como
 * `--radius-r-full` y compania... y `rounded-r-*` **ya significa otra cosa en
 * Tailwind**: «redondea las esquinas de la derecha».
 *
 * El resultado fue que el boton central de la rueda de apps salia con forma de
 * media pastilla en vez de redondo. No lo dijo ningun error: la clase existia,
 * el CSS se generaba, y lo que se pintaba era otra cosa. Se vio mirando la
 * pantalla, que es la unica forma de ver esta clase de fallo... o esta.
 *
 * Por eso se comprueba el nombre y no el resultado: una ficha que choque es un
 * fallo aunque hoy se pinte bien de casualidad.
 */
const FICHAS = readFileSync(
  fileURLToPath(new URL('../estilos/fichas.css', import.meta.url)),
  'utf8',
);

/** Solo lo de dentro de `@theme`: es lo unico que genera utilidades. */
function dentroDelTema(): string {
  const abre = FICHAS.indexOf('@theme {');
  const cierra = FICHAS.indexOf('\n}', abre);
  return FICHAS.slice(abre, cierra);
}

/** Las fichas de un espacio de nombres: `radius`, `color`, `spacing`, `text`. */
function fichasDe(espacio: string): string[] {
  const tema = dentroDelTema();
  const encontradas = [...tema.matchAll(new RegExp(`--${espacio}-([a-z0-9-]+):`, 'g'))];
  return [...new Set(encontradas.map((m) => m[1] ?? ''))].filter(Boolean);
}

/**
 * Los lados que Tailwind ya usa en `rounded-*`, `border-*`, `p-*`, `m-*`.
 *
 * `t` arriba · `r` derecha · `b` abajo · `l` izquierda · `s` inicio · `e` fin, y
 * las esquinas de dos letras.
 */
const LADOS = [
  't',
  'r',
  'b',
  'l',
  's',
  'e',
  'x',
  'y',
  'tl',
  'tr',
  'br',
  'bl',
  'ss',
  'se',
  'es',
  'ee',
];

/** Los tamanos que Tailwind trae de serie y que no se pueden pisar. */
const TAMANOS_DE_TAILWIND = [
  'xs',
  'sm',
  'md',
  'lg',
  'xl',
  '2xl',
  '3xl',
  '4xl',
  'none',
  'full',
  'px',
];

describe('los radios', () => {
  const RADIOS = fichasDe('radius');

  it('estan los cinco de B1', () => {
    expect(RADIOS.sort()).toEqual(['chico', 'grande', 'mayor', 'medio', 'redondo']);
  });

  it('ninguno empieza por un lado de Tailwind', () => {
    // `--radius-r-full` generaba `rounded-r-full`, que Tailwind entiende como
    // «esquinas de la derecha, redondeadas del todo». Este es el fallo.
    for (const radio of RADIOS) {
      const primero = radio.split('-')[0] ?? '';
      expect(LADOS, `--radius-${radio} choca con rounded-${primero}-*`).not.toContain(primero);
    }
  });

  it('ninguno se llama como un tamano de Tailwind', () => {
    for (const radio of RADIOS) {
      expect(TAMANOS_DE_TAILWIND, `--radius-${radio} pisa un tamano de Tailwind`).not.toContain(
        radio,
      );
    }
  });

  it('valen lo que dice B1', () => {
    const valor = (nombre: string) =>
      new RegExp(`--radius-${nombre}:\\s*([^;]+);`).exec(FICHAS)?.[1]?.trim();

    expect(valor('chico')).toBe('8px');
    expect(valor('medio')).toBe('12px');
    expect(valor('grande')).toBe('16px');
    expect(valor('mayor')).toBe('24px');
    expect(valor('redondo')).toBe('999px');
  });
});

describe('los espacios', () => {
  const ESPACIOS = fichasDe('spacing');

  it('estan los ocho de la escala de 4, mas los dos toques', () => {
    expect(ESPACIOS.sort()).toEqual([
      'e1',
      'e2',
      'e3',
      'e4',
      'e5',
      'e6',
      'e7',
      'e8',
      'toque',
      'toque-cocina',
    ]);
  });

  it('ninguno empieza por un lado de Tailwind', () => {
    // `--spacing-x-...` chocaria con `px-*` y `mx-*`.
    for (const espacio of ESPACIOS) {
      const primero = espacio.split('-')[0] ?? '';
      expect(LADOS, `--spacing-${espacio} choca con p${primero}-* o m${primero}-*`).not.toContain(
        primero,
      );
    }
  });

  it('la escala de 4 vale lo que dice B1', () => {
    const valor = (nombre: string) =>
      new RegExp(`--spacing-${nombre}:\\s*([^;]+);`).exec(FICHAS)?.[1]?.trim();

    expect([1, 2, 3, 4, 5, 6, 7, 8].map((n) => valor(`e${n}`))).toEqual([
      '4px',
      '8px',
      '12px',
      '16px',
      '24px',
      '32px',
      '48px',
      '64px',
    ]);
  });

  it('el toque minimo es 44 px, y 52 en cocina', () => {
    // «Toque minimo 44 px. En listas de cocina, 52 px» (B4). No es un minimo
    // teorico: se usa con prisa y con las manos mojadas.
    expect(/--spacing-toque:\s*44px/.test(FICHAS)).toBe(true);
    expect(/--spacing-toque-cocina:\s*52px/.test(FICHAS)).toBe(true);
  });
});

describe('los nombres de B1 siguen existiendo', () => {
  it('los radios, los espacios y los colores, tal como los escribe el Plan', () => {
    // Quien venga del Plan buscara `--r-m`, no `--radius-medio`. Los dos valen y
    // apuntan a lo mismo, que es lo que evita que se separen.
    for (const alias of ['--r-s', '--r-m', '--r-l', '--r-xl', '--r-full']) {
      expect(FICHAS, `falta el alias ${alias} de B1`).toContain(`${alias}: var(--radius-`);
    }
    for (const alias of ['--e1', '--e4', '--e8']) {
      expect(FICHAS).toContain(`${alias}: var(--spacing-`);
    }
    for (const alias of ['--charcoal', '--naranja', '--fondo', '--texto-suave', '--bien']) {
      expect(FICHAS).toContain(`${alias}: var(--color-`);
    }
    for (const alias of ['--s1', '--s2', '--s3']) {
      expect(FICHAS).toContain(`${alias}: var(--shadow-`);
    }
  });
});

describe('la tipografia de B2', () => {
  it('los seis usos, cada uno con su interlineado y su peso', () => {
    for (const uso of ['cifra', 'pantalla', 'seccion', 'cuerpo', 'secundario', 'etiqueta']) {
      expect(FICHAS, `falta el tamano --text-${uso}`).toContain(`--text-${uso}:`);
      expect(FICHAS, `falta el interlineado de ${uso}`).toContain(`--text-${uso}--line-height:`);
      expect(FICHAS, `falta el peso de ${uso}`).toContain(`--text-${uso}--font-weight:`);
    }
  });

  it('todos los tamanos van multiplicados por la escala', () => {
    // Es lo que hace que los tres tamanos de letra de B2 funcionen cambiando una
    // sola variable. Si alguien escribe un tamano fijo, esa linea deja de crecer
    // y nadie se entera hasta que alguien pone la letra grande.
    const tamanos = [...FICHAS.matchAll(/--text-([a-z]+):\s*([^;]+);/g)];
    expect(tamanos.length).toBe(6);

    for (const [, uso, valor] of tamanos) {
      expect(valor, `--text-${uso} no usa var(--escala)`).toContain('var(--escala)');
    }
  });
});
