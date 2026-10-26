import type { Contexto } from './contrato.ts';

/**
 * **Un punto de guardado que vale de verdad** (el reloj del lunes, 26-oct; lección 225).
 *
 * `postgres.js` apunta **cualquier consulta que falla** dentro de una transacción, aunque
 * el código la recoja, y al acabar tira la transacción entera con ese fallo. Un
 * `savepoint` escrito a mano no lo evita: la consulta que falla sigue siendo de la
 * transacción de fuera. Así, la madrugada del 26-oct, una revisión de Fogón que chocaba
 * —y que el reloj daba por apartada— se llevó por delante el latido de cada hora.
 *
 * Lo que de verdad aparta es `sql.savepoint`: lo de dentro va con **su propio `sql`**, y
 * lo que falla ahí se queda ahí. Por eso `hacer` recibe un contexto nuevo, y **todo lo de
 * dentro tiene que usarlo a él**, no el de fuera.
 *
 * Si `hacer` falla, se vuelve al punto de guardado —también quién era cada uno, que
 * `set_config(…, true)` se deshace con él— y el fallo sigue hacia arriba.
 */
export async function enUnPuntoDeGuardado<T>(
  contexto: Contexto,
  hacer: (aparte: Contexto) => Promise<T>,
): Promise<T> {
  return (await contexto.sql.savepoint((sql) => hacer({ ...contexto, sql }))) as T;
}
