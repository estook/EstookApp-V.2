/**
 * **Lo último que abriste desde el buscador** (0085).
 *
 * Richi, el 15-oct: «el buscador: búsquedas recientes». Al abrirlo con la caja vacía
 * salen las últimas cosas que abriste —un producto, un pedido, una persona—, y un toque
 * las vuelve a abrir. Se guarda **lo abierto**, no lo escrito: lo que se busca dos veces
 * es lo que se abre dos veces, y «salm» no le dice nada a nadie.
 *
 * En este aparato y **de cada persona**: en la tablet de la cocina, cada uno ve lo
 * suyo. Y al salir de la app, fuera (`olvidarTodosLosRecientes`), como todo lo demás.
 */

/** Lo que se guarda de cada cosa abierta: lo mismo que devuelve `buscar`. */
export interface Reciente {
  readonly tipo: string;
  readonly id: string;
  readonly titulo: string;
  readonly subtitulo: string;
  readonly local_id: string | null;
}

/** Los que se enseñan: más no caben sin bajar, y lo de hace un mes ya no es reciente. */
export const CUANTOS_RECIENTES = 6;

const PREFIJO = 'estook.buscado.';

/** La lista con el nuevo delante, sin repetirlo y sin pasar del tope. */
export function conElNuevo(lista: readonly Reciente[], nuevo: Reciente): readonly Reciente[] {
  return [nuevo, ...lista.filter((r) => !(r.tipo === nuevo.tipo && r.id === nuevo.id))].slice(
    0,
    CUANTOS_RECIENTES,
  );
}

/** Lo guardado, comprobado: lo que no tenga la forma de un reciente no sale. */
export function leidos(crudo: string | null): readonly Reciente[] {
  try {
    const leido: unknown = JSON.parse(crudo ?? '[]');
    if (!Array.isArray(leido)) return [];
    return leido
      .filter(
        (r): r is Reciente =>
          typeof r === 'object' &&
          r !== null &&
          typeof (r as Reciente).tipo === 'string' &&
          typeof (r as Reciente).id === 'string' &&
          typeof (r as Reciente).titulo === 'string',
      )
      .map((r) => ({
        tipo: r.tipo,
        id: r.id,
        titulo: r.titulo,
        subtitulo: typeof r.subtitulo === 'string' ? r.subtitulo : '',
        local_id: typeof r.local_id === 'string' ? r.local_id : null,
      }))
      .slice(0, CUANTOS_RECIENTES);
  } catch {
    return [];
  }
}

export function leerLosRecientes(personaId: string): readonly Reciente[] {
  try {
    return leidos(window.localStorage.getItem(PREFIJO + personaId));
  } catch {
    return [];
  }
}

export function apuntarUnReciente(personaId: string, nuevo: Reciente): readonly Reciente[] {
  const lista = conElNuevo(leerLosRecientes(personaId), nuevo);
  try {
    window.localStorage.setItem(PREFIJO + personaId, JSON.stringify(lista));
  } catch {
    // En navegación privada no se puede: se ven mientras la app siga abierta.
  }
  return lista;
}

export function olvidarLosRecientes(personaId: string): void {
  try {
    window.localStorage.removeItem(PREFIJO + personaId);
  } catch {
    // Nada que hacer: no había dónde guardarlos.
  }
}

/** Al salir de la app: los de todos, que en un aparato compartido no se quedan. */
export function olvidarTodosLosRecientes(): void {
  try {
    const claves: string[] = [];
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const clave = window.localStorage.key(i);
      if (clave?.startsWith(PREFIJO) === true) claves.push(clave);
    }
    for (const clave of claves) window.localStorage.removeItem(clave);
  } catch {
    // Igual que arriba.
  }
}
