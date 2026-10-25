/**
 * La comanda que se va tomando, antes de mandarla (M20A · 1 · 2, decisión 0106).
 *
 * Lo que el camarero toca se apunta **en el aparato** hasta que pulsa «Mandar»: así cada
 * toque no espera a la red, y si la tablet se reinicia no se pierde (se guarda en el
 * navegador, por mesa). Al mandar, todo va a la API de una vez con su identificador
 * nacido aquí: repetir el envío no pide dos veces (0081).
 *
 * El destino (cocina o barra) **no lo decide la pantalla**: lo dice la sección del plato
 * en la API. Aquí solo se sabe para pintar la cuenta.
 */

export type Destino = 'cocina' | 'barra' | 'ninguno';

export interface LineaNueva {
  readonly id: string;
  readonly platoId: string | null;
  readonly menuId: string | null;
  readonly parteDe: string | null;
  readonly nombre: string;
  readonly cantidad: number;
  /** La unidad, con IVA: el de la carta, el del menú, o el suplemento del plato del menú. */
  readonly precioCentimos: number;
  readonly destino: Destino;
  readonly pase: number | null;
  readonly nota: string | null;
  /** Lo elegido (T3 · 2): la API lo vuelve a mirar y pone su precio. */
  readonly opciones?: readonly { readonly id: string; readonly nombre: string }[];
  /** Lo que pesa, si se vende a peso. */
  readonly pesoGramos?: number | null;
}

export type Borrador = readonly LineaNueva[];

/** Lo que hace falta de un plato de la carta para pedirlo. */
export interface PlatoQueSePide {
  readonly id: string;
  readonly nombre: string;
  readonly precioCentimos: number;
}

function nuevoId(): string {
  return crypto.randomUUID();
}

/**
 * Un plato más. Si ya hay uno igual sin mandar —el mismo plato, el mismo pase, sin nota—
 * suma uno: dos toques en «Croquetas» son «2 Croquetas», no dos líneas.
 */
export function anadirPlato(
  borrador: Borrador,
  plato: PlatoQueSePide,
  como: { readonly destino: 'cocina' | 'barra' | 'ninguno'; readonly pase: number | null },
): Borrador {
  // Solo lo de la cocina va por pases; la barra y «Nadie» salen al mandar.
  const pase = como.destino === 'cocina' ? como.pase : null;
  const igual = borrador.find(
    (l) =>
      l.platoId === plato.id &&
      l.parteDe === null &&
      l.menuId === null &&
      l.pase === pase &&
      l.nota === null &&
      (l.opciones ?? []).length === 0 &&
      (l.pesoGramos ?? null) === null,
  );
  if (igual !== undefined) {
    return borrador.map((l) => (l === igual ? { ...l, cantidad: l.cantidad + 1 } : l));
  }
  return [
    ...borrador,
    {
      id: nuevoId(),
      platoId: plato.id,
      menuId: null,
      parteDe: null,
      nombre: plato.nombre,
      cantidad: 1,
      precioCentimos: plato.precioCentimos,
      destino: como.destino,
      pase,
      nota: null,
    },
  ];
}

/** Lo que se elige de una sección de un menú: el plato y cuántos. */
export interface EleccionDelMenu {
  readonly seccion: { readonly pase: number | null; readonly esBebida: boolean };
  readonly platos: readonly {
    readonly platoId: string;
    readonly nombre: string;
    readonly suplementoCentimos: number;
    readonly cuantos: number;
  }[];
}

/**
 * Varios menús de una vez (0106): «2 menús: lentejas y ensalada; merluza y entrecot».
 * Cada menú es una línea (la que se cobra) y lo elegido de cada sección, sus platos
 * (los que se cocinan), repartidos en orden: el primer menú lleva el primero de cada
 * sección. A la cocina le da igual quién come qué; a la cuenta, no, por el suplemento.
 */
export function anadirMenus(
  borrador: Borrador,
  menu: { readonly id: string; readonly nombre: string; readonly precioCentimos: number },
  cuantos: number,
  elecciones: readonly EleccionDelMenu[],
): Borrador {
  const nuevas: LineaNueva[] = [];
  const repartidos = elecciones.map((e) =>
    e.platos.flatMap((p) => Array.from({ length: p.cuantos }, () => p)),
  );
  for (let i = 0; i < cuantos; i += 1) {
    const elMenu: LineaNueva = {
      id: nuevoId(),
      platoId: null,
      menuId: menu.id,
      parteDe: null,
      nombre: menu.nombre,
      cantidad: 1,
      precioCentimos: menu.precioCentimos,
      destino: 'ninguno',
      pase: null,
      nota: null,
    };
    nuevas.push(elMenu);
    elecciones.forEach((eleccion, s) => {
      const plato = repartidos[s]?.[i];
      if (plato === undefined) return;
      nuevas.push({
        id: nuevoId(),
        platoId: plato.platoId,
        menuId: null,
        parteDe: elMenu.id,
        nombre: plato.nombre,
        cantidad: 1,
        precioCentimos: plato.suplementoCentimos,
        destino: eleccion.seccion.esBebida ? 'barra' : 'cocina',
        pase: eleccion.seccion.esBebida ? null : eleccion.seccion.pase,
        nota: null,
      });
    });
  }
  return [...borrador, ...nuevas];
}

/** El postre (o lo que falte) de un menú que ya está en la mesa. */
export function anadirAlMenu(
  borrador: Borrador,
  menuLineaId: string,
  plato: { readonly platoId: string; readonly nombre: string; readonly suplementoCentimos: number },
  seccion: { readonly pase: number | null; readonly esBebida: boolean },
): Borrador {
  return [
    ...borrador,
    {
      id: nuevoId(),
      platoId: plato.platoId,
      menuId: null,
      parteDe: menuLineaId,
      nombre: plato.nombre,
      cantidad: 1,
      precioCentimos: plato.suplementoCentimos,
      destino: seccion.esBebida ? 'barra' : 'cocina',
      pase: seccion.esBebida ? null : seccion.pase,
      nota: null,
    },
  ];
}

/** Cambiar una línea sin mandar: cuántos, la nota y el pase. Con cero, se quita. */
export function cambiarLinea(
  borrador: Borrador,
  id: string,
  cambio: { readonly cantidad?: number; readonly nota?: string | null; readonly pase?: number },
): Borrador {
  return borrador.flatMap((l) => {
    if (l.id !== id) return [l];
    const cantidad = cambio.cantidad ?? l.cantidad;
    if (cantidad <= 0) return [];
    const nota = cambio.nota === undefined ? l.nota : cambio.nota?.trim() || null;
    const pase = l.destino === 'cocina' ? (cambio.pase ?? l.pase) : null;
    return [{ ...l, cantidad, nota, pase }];
  });
}

/** Quitar una línea sin mandar, con lo que lleva dentro si es un menú. */
export function quitarLinea(borrador: Borrador, id: string): Borrador {
  return borrador.filter((l) => l.id !== id && l.parteDe !== id);
}

/** Lo que vale lo nuevo. */
export function loQueVale(borrador: Borrador): number {
  return borrador.reduce((total, l) => total + l.precioCentimos * l.cantidad, 0);
}

/** Lo nuevo, como lo pide `pedir`: el destino lo pone la API. */
export function comoPedido(borrador: Borrador): readonly Record<string, unknown>[] {
  return borrador.map((l) => ({
    id: l.id,
    ...(l.platoId === null ? {} : { plato_id: l.platoId }),
    ...(l.menuId === null ? {} : { menu_id: l.menuId }),
    ...(l.parteDe === null ? {} : { parte_de: l.parteDe }),
    ...(l.cantidad === 1 ? {} : { cantidad: l.cantidad }),
    ...(l.pase === null ? {} : { pase: l.pase }),
    ...(l.nota === null ? {} : { nota: l.nota }),
    ...(l.opciones === undefined || l.opciones.length === 0
      ? {}
      : { opciones: l.opciones.map((o) => o.id) }),
    ...(l.pesoGramos === undefined || l.pesoGramos === null ? {} : { peso_gramos: l.pesoGramos }),
  }));
}

/**
 * **Un plato con lo elegido** (T3 · 2): sus opciones, o lo que pesa. Va en su línea, sin
 * sumarse a otra: dos hamburguesas con distinta guarnición son dos líneas. El precio de la
 * unidad ya lleva lo elegido (la API lo vuelve a calcular).
 */
export function anadirConLoElegido(
  borrador: Borrador,
  plato: PlatoQueSePide,
  como: { readonly destino: Destino; readonly pase: number | null },
  elegido: {
    readonly opciones: readonly { readonly id: string; readonly nombre: string }[];
    readonly pesoGramos: number | null;
    readonly precioCentimos: number;
  },
): Borrador {
  return [
    ...borrador,
    {
      id: nuevoId(),
      platoId: plato.id,
      menuId: null,
      parteDe: null,
      nombre: plato.nombre,
      cantidad: 1,
      precioCentimos: elegido.precioCentimos,
      destino: como.destino,
      pase: como.destino === 'cocina' ? como.pase : null,
      nota: null,
      opciones: elegido.opciones,
      pesoGramos: elegido.pesoGramos,
    },
  ];
}

// ═══ Guardado en el aparato ════════════════════════════════════════════════════

const PREFIJO = 'estook.tpv.borrador.';

export function leerBorrador(cuentaId: string): Borrador {
  try {
    const guardado = window.localStorage.getItem(`${PREFIJO}${cuentaId}`);
    if (guardado === null) return [];
    const leido: unknown = JSON.parse(guardado);
    return Array.isArray(leido) ? (leido as Borrador) : [];
  } catch {
    return [];
  }
}

export function guardarBorrador(cuentaId: string, borrador: Borrador): void {
  try {
    if (borrador.length === 0) window.localStorage.removeItem(`${PREFIJO}${cuentaId}`);
    else window.localStorage.setItem(`${PREFIJO}${cuentaId}`, JSON.stringify(borrador));
  } catch {
    // Sin poder guardar, sigue en memoria: solo se perdería al recargar.
  }
}
