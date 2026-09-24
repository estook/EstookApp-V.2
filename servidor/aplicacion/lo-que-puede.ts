import type { Permiso } from '@estook/permisos';
import type { Contexto } from './contrato.ts';
import { comoLista } from './listas.ts';

/**
 * Lo que puede esta persona en este local, de varios permisos a la vez (entrega O).
 *
 * Las consultas que juntan cosas de varias apps —el semáforo de objetivos, lo de
 * hoy— no tienen un `exige` fijo: cada trozo pide lo suyo, y lo que no se puede ver
 * **no se calcula**, no se esconde después. Esto pregunta todos de una pasada, con
 * la misma función que usa el despachador (`nivel_de_permiso`), para que aquí no
 * se decida distinto que en la puerta.
 */
export interface LoQuePuede {
  ver(permiso: Permiso): boolean;
  editar(permiso: Permiso): boolean;
  /** Todos a la vez: los que pide una cifra que sale de dos sitios. */
  verTodos(permisos: readonly Permiso[]): boolean;
}

export async function loQuePuede(
  contexto: Contexto,
  localId: string,
  permisos: readonly Permiso[],
): Promise<LoQuePuede> {
  const niveles = new Map<string, string | null>();
  const personaId = contexto.personaId;
  const unicos = [...new Set(permisos)];

  if (personaId !== null && unicos.length > 0) {
    const filas = await contexto.sql<{ permiso: string; nivel: string | null }[]>`
      select p as permiso,
             estook.nivel_de_permiso(${personaId}::uuid, ${localId}::uuid, p)::text as nivel
        from unnest(${comoLista(unicos)}::text::text[]) as p
    `;
    for (const fila of filas) niveles.set(fila.permiso, fila.nivel);
  }

  const ver = (permiso: Permiso) => {
    const nivel = niveles.get(permiso);
    return nivel === 'ver' || nivel === 'ver_y_editar';
  };
  return {
    ver,
    editar: (permiso) => niveles.get(permiso) === 'ver_y_editar',
    verTodos: (todos) => todos.every(ver),
  };
}
