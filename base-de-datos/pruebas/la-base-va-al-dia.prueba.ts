import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { laUltimaDelCodigo, veredicto } from '../../herramientas/la-base-va-al-dia.mjs';

/**
 * «Desplegar la API» no despliega si la base va por detrás (23-sep).
 *
 * Se fusionó la #64, se desplegó sin la `0040` y Equipo dejó de funcionar. Esto es
 * lo que lo impide, y aquí se comprueba su regla con cifras de mentira: la llamada a
 * Supabase solo puede probarse desplegando.
 */
describe('la base va al día', () => {
  it('la última del código es la más alta, sin contar las reversiones', () => {
    expect(
      laUltimaDelCodigo([
        '0039_los_intentos.sql',
        '0040_cuando_es_llegar_tarde.revertir.sql',
        '0040_cuando_es_llegar_tarde.sql',
        'LEEME.md',
      ]),
    ).toBe(40);
  });

  it('y cuadra con las migraciones de verdad del repositorio', () => {
    const carpeta = fileURLToPath(new URL('../migraciones/', import.meta.url));
    const ficheros = readdirSync(carpeta);
    const cuantas = ficheros.filter(
      (f) => /^\d{4}_.+\.sql$/.test(f) && !f.endsWith('.revertir.sql'),
    ).length;
    // Van seguidas desde la 0001: la última es cuántas hay.
    expect(laUltimaDelCodigo(ficheros)).toBe(cuantas);
  });

  it('con la base por detrás, para y dice qué hacer', () => {
    const { para, frase } = veredicto(40, 39);
    expect(para).toBe(true);
    expect(frase).toContain('0040');
    expect(frase).toContain('bd:migrar');
  });

  it('con la base al día o por delante, se despliega', () => {
    expect(veredicto(40, 40).para).toBe(false);
    expect(veredicto(40, 41).para).toBe(false);
  });

  it('sin poder preguntar, avisa y no bloquea', () => {
    const { para, frase } = veredicto(40, null);
    expect(para).toBe(false);
    expect(frase).toContain('bd:comprobar');
  });
});
