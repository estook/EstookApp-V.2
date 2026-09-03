import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { variable, variablesDelEntorno } from './variables.ts';

/**
 * Estas pruebas existen por un despliegue que se cayo.
 *
 * El servidor corre en Node cuando se prueba y en Deno cuando esta desplegado,
 * y hasta M4 leia `process.env` a pelo: funcionaba en las pruebas y era una
 * apuesta en el despliegue. Lo malo de esa apuesta es que no se pierde al
 * desplegar —que se veria— sino al atender la primera peticion.
 *
 * Aqui se finge un Deno para comprobar que se le hace caso, porque en Node de
 * verdad nunca se ejercitaria esa rama.
 */
const conDeno = globalThis as { Deno?: unknown };

afterEach(() => {
  delete conDeno.Deno;
  delete process.env['SOLO_PARA_LA_PRUEBA'];
});

describe('leer una variable de entorno', () => {
  it('en Node la coge de process.env', () => {
    process.env['SOLO_PARA_LA_PRUEBA'] = 'de node';
    expect(variable('SOLO_PARA_LA_PRUEBA')).toBe('de node');
  });

  it('la que no esta no esta, y no revienta', () => {
    expect(variable('ESTA_NO_EXISTE_EN_NINGUN_SITIO')).toBeUndefined();
  });

  it('donde hay Deno, manda Deno', () => {
    process.env['SOLO_PARA_LA_PRUEBA'] = 'de node';
    conDeno.Deno = {
      env: { get: (n: string) => (n === 'SOLO_PARA_LA_PRUEBA' ? 'de deno' : undefined) },
    };
    expect(variable('SOLO_PARA_LA_PRUEBA')).toBe('de deno');
  });

  it('si Deno no la tiene, se sigue mirando en Node', () => {
    process.env['SOLO_PARA_LA_PRUEBA'] = 'de node';
    conDeno.Deno = { env: { get: () => undefined } };
    expect(variable('SOLO_PARA_LA_PRUEBA')).toBe('de node');
  });

  it('un Deno sin permiso de entorno no tumba nada', () => {
    process.env['SOLO_PARA_LA_PRUEBA'] = 'de node';
    conDeno.Deno = {
      env: {
        get: () => {
          throw new Error('Requires env access');
        },
      },
    };
    // Una variable que no se puede leer es una variable que no esta, no un fallo.
    expect(variable('SOLO_PARA_LA_PRUEBA')).toBe('de node');
  });

  it('el mapa para resolverEntorno sale con lo que haya y nada mas', () => {
    process.env['SOLO_PARA_LA_PRUEBA'] = 'algo';
    expect(variablesDelEntorno(['SOLO_PARA_LA_PRUEBA', 'ESTA_NO_EXISTE_EN_NINGUN_SITIO'])).toEqual({
      SOLO_PARA_LA_PRUEBA: 'algo',
      ESTA_NO_EXISTE_EN_NINGUN_SITIO: undefined,
    });
  });
});

// ── Ningún secreto nuestro empieza por `SUPABASE_` ───────────────────────────

/**
 * **Este proyecto se ha comido este fallo dos veces, y la segunda dolió más.**
 *
 * Supabase **reserva el prefijo `SUPABASE_`** en los secretos de Edge Functions:
 * si intentas guardar uno con ese nombre, lo rechaza con «Name must not start
 * with the SUPABASE_ prefix».
 *
 *   · En M4 pasó con `SUPABASE_ACCESS_TOKEN` y `SUPABASE_PROJECT_REF`. Se
 *     renombraron a `TOKEN_DE_SUPABASE` y `PROYECTO_DE_SUPABASE`, y quedó
 *     escrito en `ESTADO.md`: «un nombre que se parece al de otro sitio es un
 *     nombre que acabará donde no va».
 *   · En M5 se repitió con `SUPABASE_SERVICE_KEY`, **con la lección ya escrita
 *     delante**. Richi se topó con el mismo error rojo en la misma pantalla.
 *
 * Escribirlo en un documento no lo impidió. Esto sí: una lección que no se puede
 * comprobar es una lección que se vuelve a aprender.
 *
 * ── Lo que sí se puede leer, y por qué ──────────────────────────────────────
 *
 * Supabase **pone** unas cuantas variables en cada función —`SUPABASE_URL`,
 * `SUPABASE_ANON_KEY`…— y esas se leen tal cual: no las inventamos nosotros, ya
 * están ahí. La regla es sobre los nombres que **elegimos**, no sobre los que
 * nos encontramos.
 */
const LAS_QUE_PONE_SUPABASE = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_DB_URL',
  'SUPABASE_PUBLISHABLE_KEYS',
  'SUPABASE_SECRET_KEYS',
];

async function ficherosDe(carpeta: string): Promise<string[]> {
  const salida: string[] = [];
  async function recorrer(donde: string) {
    for (const entrada of await readdir(donde, { withFileTypes: true })) {
      const camino = join(donde, entrada.name);
      if (entrada.isDirectory()) {
        if (entrada.name === 'node_modules' || entrada.name === 'dist') continue;
        await recorrer(camino);
      } else if (/\.(ts|tsx|mjs)$/.test(entrada.name)) {
        salida.push(camino);
      }
    }
  }
  await recorrer(carpeta);
  return salida;
}

describe('los nombres de las variables de entorno', () => {
  it('ninguna que elijamos nosotros empieza por SUPABASE_', async () => {
    const raiz = fileURLToPath(new URL('../../../', import.meta.url));
    const ficheros = [
      ...(await ficherosDe(join(raiz, 'servidor'))),
      ...(await ficherosDe(join(raiz, 'herramientas'))),
    ];

    const nuestras = new Set<string>();
    for (const fichero of ficheros) {
      const texto = await readFile(fichero, 'utf8');
      for (const trozo of texto.match(/variable\('([A-Z_0-9]+)'\)/g) ?? []) {
        const nombre = trozo.slice("variable('".length, -2);
        if (nombre.startsWith('SUPABASE_') && !LAS_QUE_PONE_SUPABASE.includes(nombre)) {
          nuestras.add(nombre);
        }
      }
    }

    // Si esto falla, el nombre hay que cambiarlo **antes** de que alguien lo
    // intente guardar en Supabase: el estilo de la casa es `X_DE_SUPABASE` o
    // directamente en castellano, como `ORIGENES_PERMITIDOS` o `ENTORNO`.
    expect([...nuestras]).toEqual([]);
  });
});
