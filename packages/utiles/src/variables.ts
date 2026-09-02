/**
 * De donde salen las variables de entorno, sin suponer quien las guarda (M4).
 *
 * ── Por que esto existe ─────────────────────────────────────────────────────
 *
 * El mismo codigo del servidor corre en dos sitios distintos:
 *
 *   · en Node, cuando se prueba y cuando se ejecutan las herramientas de la
 *     base de datos, donde las variables estan en `process.env`
 *   · en Deno, cuando esta desplegado como Supabase Edge Function, donde el
 *     sitio de verdad es `Deno.env`
 *
 * Leer `process.env` a pelo funciona en las pruebas y es una apuesta en el
 * despliegue: depende de cuanta compatibilidad con Node traiga el motor de
 * Supabase ese mes. Y si falla, no falla al desplegar —que se veria— sino al
 * atender la primera peticion, con un 500 y sin decir por que.
 *
 * `entorno.ts` ya estaba bien resuelto: **recibe** el mapa de variables en vez
 * de ir a buscarlo, justamente para no suponer donde corre. Lo que faltaba era
 * quien se lo diera de forma portable. Esto es eso.
 */

interface QuizaDeno {
  Deno?: { env?: { get(nombre: string): string | undefined } };
}

interface QuizaNode {
  process?: { env?: Record<string, string | undefined> };
}

/**
 * Una variable, la busque donde la busque.
 *
 * Deno primero, porque donde hay Deno es el sitio bueno. Va envuelto porque
 * `Deno.env.get` **lanza** si el proceso no tiene permiso de entorno, y una
 * variable que no se puede leer es una variable que no esta, no un fallo.
 */
export function variable(nombre: string): string | undefined {
  try {
    const deDeno = (globalThis as QuizaDeno).Deno?.env?.get(nombre);
    if (deDeno !== undefined) return deDeno;
  } catch {
    // Sin permiso de entorno. Se prueba con el otro.
  }

  return (globalThis as QuizaNode).process?.env?.[nombre];
}

/** Lo mismo, pero para pasarselo entero a `resolverEntorno`. */
export function variablesDelEntorno(
  nombres: readonly string[],
): Record<string, string | undefined> {
  const mapa: Record<string, string | undefined> = {};
  for (const nombre of nombres) mapa[nombre] = variable(nombre);
  return mapa;
}
