import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Lo que la API puede hacer en cada tabla de `estook`, según sus migraciones (0089).
 *
 * La 0006 dejó puesto que toda tabla nueva naciera con leer, añadir, cambiar y borrar
 * para `estook_api`, y un `grant` más corto **no quita** nada: suma (lección 189). La
 * 0069 escribió «el historial solo se lee y se añade» y en producción la API podía
 * cambiarlo. La 0071 lo arregló en todas y quitó el defecto.
 *
 * Esto lo usan dos sitios, y por eso vive aquí y no en cada uno (lección 185):
 *
 *   · la prueba `los-permisos-de-la-api`, contra el Postgres efímero;
 *   · `bd:comprobar-api`, contra la base de verdad.
 *
 * Los dos comparan lo que **quiso** cada migración con lo que la API **tiene**.
 */

const CARPETA = fileURLToPath(new URL('../migraciones/', import.meta.url));

const LOS_CUATRO = ['DELETE', 'INSERT', 'SELECT', 'UPDATE'];

/**
 * Las migraciones, en orden y hasta la que se diga.
 *
 * @param {number} [hasta] la última que cuenta: en producción, la que tiene aplicada.
 * @returns {string[]}
 */
export function lasMigraciones(hasta = Number.POSITIVE_INFINITY) {
  return readdirSync(CARPETA)
    .filter((f) => /^\d{4}_.*\.sql$/.test(f) && !f.endsWith('.revertir.sql'))
    .filter((f) => Number(f.slice(0, 4)) <= hasta)
    .sort()
    .map((f) => readFileSync(join(CARPETA, f), 'utf8'));
}

/** Los permisos de una línea (`select, insert` o `all`), en mayúsculas. */
function permisos(texto) {
  const dichos = texto.split(',').map((p) => p.trim().toUpperCase());
  return dichos.includes('ALL') || dichos.includes('ALL PRIVILEGES')
    ? [...LOS_CUATRO]
    : dichos.filter((p) => LOS_CUATRO.includes(p));
}

/** Las tablas de una línea (`estook.a, estook.b`), sin el esquema. */
const tablas = (texto) => [...texto.matchAll(/estook\.(\w+)/g)].map((t) => t[1]);

const ORDENES =
  /create\s+(?:table|view)\s+(?:if\s+not\s+exists\s+)?estook\.(\w+)|grant\s+([\w\s,]+?)\s+on\s+(?:table\s+)?((?:estook\.\w+\s*,\s*)*estook\.\w+)\s+to\s+([^;]+);|revoke\s+([\w\s,]+?)\s+on\s+(?:table\s+)?((?:estook\.\w+\s*,\s*)*estook\.\w+)\s+from\s+([^;]+);/gi;

/**
 * Lo que las migraciones quisieron dar a la API, tabla a tabla.
 *
 * Se leen, en el orden en que aparecen, tres cosas: crear una tabla o una vista (nace
 * sin permisos queridos), dar (`grant`, suma) y quitar (`revoke`, resta). Una tabla que
 * nunca dijo nada no tiene ninguno: lo que no se escribe no se da. Lo que va en los
 * comentarios no cuenta: la 0070 cita un `grant` en uno.
 *
 * @param {string[]} migraciones el SQL de cada una, en orden.
 * @returns {Map<string, Set<string>>}
 */
export function loQueQuisieron(migraciones) {
  const quiso = new Map();
  const cambiar = (enTexto, como) => {
    for (const t of tablas(enTexto)) {
      const suyos = quiso.get(t) ?? new Set();
      como(suyos);
      quiso.set(t, suyos);
    }
  };
  for (const sql of migraciones) {
    const sinComentarios = sql.replace(/--[^\n]*/g, '');
    for (const [, creada, dar, darEn, darA, quitar, quitarEn, quitarA] of sinComentarios.matchAll(
      ORDENES,
    )) {
      if (creada) {
        quiso.set(creada, new Set());
      } else if (dar && /\bestook_api\b/.test(darA)) {
        cambiar(darEn, (suyos) => permisos(dar).forEach((p) => suyos.add(p)));
      } else if (quitar && /\bestook_api\b/.test(quitarA)) {
        cambiar(quitarEn, (suyos) => permisos(quitar).forEach((p) => suyos.delete(p)));
      }
    }
  }
  return quiso;
}

/**
 * Lo que la API tiene de verdad: una fila por tabla (o vista) y permiso.
 * La tabla de control de las migraciones no es de la API ni la crea ninguna.
 */
export const LO_QUE_TIENE = `
  select c.relname as tabla, p.permiso
    from pg_class c
    cross join unnest(array['SELECT', 'INSERT', 'UPDATE', 'DELETE']) as p (permiso)
   where c.relnamespace = 'estook'::regnamespace
     and c.relkind in ('r', 'v', 'm', 'p')
     and c.relname <> 'migracion'
     and has_table_privilege('estook_api', c.oid, p.permiso)
`;

/**
 * Las filas de `LO_QUE_TIENE`, agrupadas por tabla.
 *
 * @param {{ tabla: string; permiso: string }[]} filas
 * @returns {Map<string, Set<string>>}
 */
export function agrupar(filas) {
  const tiene = new Map();
  for (const { tabla, permiso } of filas) {
    tiene.set(tabla, (tiene.get(tabla) ?? new Set()).add(permiso));
  }
  return tiene;
}

/** «INSERT, SELECT», o «nada». */
export const enTexto = (permisos) => [...(permisos ?? [])].sort().join(', ') || 'nada';

/**
 * Las tablas en las que no cuadra, una línea por tabla y en orden.
 *
 * @param {Map<string, Set<string>>} quiso
 * @param {Map<string, Set<string>>} tiene
 * @returns {string[]}
 */
export function loQueNoCuadra(quiso, tiene) {
  const distintas = [];
  for (const tabla of new Set([...quiso.keys(), ...tiene.keys()])) {
    const querido = enTexto(quiso.get(tabla));
    const real = enTexto(tiene.get(tabla));
    if (querido !== real) distintas.push(`${tabla}: quiso «${querido}», tiene «${real}»`);
  }
  return distintas.sort();
}
