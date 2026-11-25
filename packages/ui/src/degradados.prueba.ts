import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Los degradados de cada tipo de cosa (la Ampliación, 0153): **el blanco se lee encima**.
 *
 * Las baldosas de la ficha del trabajador llevan el texto en blanco sobre su degradado.
 * Los de la maqueta empezaban en tonos tan claros (un azul cielo, un naranja melocotón)
 * que el blanco se quedaba en 1,6:1: bonito en la pantalla del ordenador y sin leerse al
 * sol en el móvil. Aquí se mide **cada color de cada degradado**, también el más claro,
 * contra 3:1, que es lo que pide WCAG para el texto grande y en negrita de una baldosa.
 * Se lee `temas.css`, que es su único dueño (regla 6).
 */
const TEMAS = readFileSync(fileURLToPath(new URL('../estilos/temas.css', import.meta.url)), 'utf8');

function luminancia(hex: string): number {
  const canal = (desde: number) => {
    const v = Number.parseInt(hex.slice(desde, desde + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * canal(1) + 0.7152 * canal(3) + 0.0722 * canal(5);
}

function contrasteConElBlanco(hex: string): number {
  return 1.05 / (luminancia(hex) + 0.05);
}

const DEGRADADOS = [...TEMAS.matchAll(/--degradado-([a-z]+):\s*linear-gradient\(([^;]+)\);/g)].map(
  (m) => ({
    nombre: m[1] ?? '',
    colores: [...(m[2] ?? '').matchAll(/#[0-9a-fA-F]{6}/g)].map((c) => c[0]),
  }),
);

describe('los degradados de cada tipo de cosa', () => {
  it('están los seis de la ficha', () => {
    expect(DEGRADADOS.map((d) => d.nombre).sort()).toEqual([
      'contrato',
      'fechas',
      'historial',
      'horas',
      'incidencias',
      'vacaciones',
    ]);
  });

  it.each(DEGRADADOS)('el blanco se lee sobre todo el de «$nombre»', ({ colores }) => {
    expect(colores.length).toBeGreaterThanOrEqual(2);
    for (const color of colores) {
      expect(contrasteConElBlanco(color), color).toBeGreaterThanOrEqual(3);
    }
  });
});
