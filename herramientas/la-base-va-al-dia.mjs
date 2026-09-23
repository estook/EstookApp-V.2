#!/usr/bin/env node
import { readdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

/**
 * ¿La base de datos va al día con el código que se va a desplegar?
 *
 *   node herramientas/la-base-va-al-dia.mjs
 *
 * Lo corre «Desplegar la API» **antes de desplegar**.
 *
 * ── Por qué existe ───────────────────────────────────────────────────────────
 *
 * El 23 de septiembre de 2026 se fusionó la #64 y se desplegó la API **sin haber
 * aplicado la migración `0040`**. El código nuevo leía una columna que todavía no
 * existía, y Equipo entero y el fichar del Panel dejaron de funcionar hasta que se
 * aplicó. La regla 1 —primero fusionar, después migrar, después desplegar— estaba
 * escrita; lo que faltaba era algo que **impidiera** saltársela.
 *
 * ── Cómo lo mira ─────────────────────────────────────────────────────────────
 *
 * La última migración del código sale de los ficheros de `base-de-datos/migraciones`.
 * La de la base, preguntándole a Supabase **en modo solo lectura** por su API de
 * gestión (`POST /v1/projects/{ref}/database/query`, con `read_only`), con la misma
 * clave con la que se despliega.
 *
 *   · La base va por detrás → **no se despliega**, y se dice qué hacer.
 *   · La base va igual o por delante → se despliega.
 *   · No se ha podido preguntar → se avisa en amarillo y **se despliega igual**. Es a
 *     propósito: esa puerta de Supabase está marcada como «beta», y si un día cambia,
 *     no puede dejar a Richi sin poder desplegar un arreglo. El aviso queda escrito
 *     en el resumen del despliegue.
 */

const CARPETA = fileURLToPath(new URL('../base-de-datos/migraciones/', import.meta.url));

/** La última migración que trae el código: el número más alto de sus ficheros. */
export function laUltimaDelCodigo(ficheros) {
  const numeros = ficheros
    .filter((f) => /^\d{4}_.+\.sql$/.test(f) && !f.endsWith('.revertir.sql'))
    .map((f) => Number(f.slice(0, 4)));
  return numeros.length === 0 ? 0 : Math.max(...numeros);
}

/** Lo que se dice y si se para, según las dos cifras. */
export function veredicto(delCodigo, deLaBase) {
  if (deLaBase === null) {
    return {
      para: false,
      frase:
        'No he podido preguntar a la base en qué migración está. Se despliega igual; comprueba después con «.\\estook.cmd bd:comprobar» que dice la ' +
        `${String(delCodigo).padStart(4, '0')}.`,
    };
  }
  if (deLaBase < delCodigo) {
    return {
      para: true,
      frase:
        `La base va por detrás: el código trae hasta la migración ${String(delCodigo).padStart(4, '0')} ` +
        `y la base está en la ${String(deLaBase).padStart(4, '0')}. No se despliega, porque la API nueva ` +
        'fallaría al leer lo que todavía no existe. Aplica antes las migraciones con «.\\estook.cmd bd:migrar» ' +
        'y vuelve a lanzar el despliegue.',
    };
  }
  return {
    para: false,
    frase: `La base va al día: migración ${String(deLaBase).padStart(4, '0')}.`,
  };
}

async function laDeLaBase() {
  const token = process.env['TOKEN_DE_SUPABASE'];
  const proyecto = process.env['PROYECTO_DE_SUPABASE'];
  if (!token || !proyecto) return null;
  try {
    const respuesta = await fetch(
      `https://api.supabase.com/v1/projects/${proyecto}/database/query`,
      {
        method: 'POST',
        headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
        body: JSON.stringify({
          query: 'select coalesce(max(numero), 0) as ultima from estook.migracion',
          read_only: true,
        }),
      },
    );
    if (!respuesta.ok) return null;
    const filas = await respuesta.json();
    const ultima = Array.isArray(filas) ? Number(filas[0]?.ultima) : Number.NaN;
    return Number.isFinite(ultima) ? ultima : null;
  } catch {
    return null;
  }
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const delCodigo = laUltimaDelCodigo(readdirSync(CARPETA));
  const { para, frase } = veredicto(delCodigo, await laDeLaBase());
  if (para) {
    console.log(`::error::${frase}`);
    process.exit(1);
  }
  console.log(frase.startsWith('No he podido') ? `::warning::${frase}` : frase);
}
