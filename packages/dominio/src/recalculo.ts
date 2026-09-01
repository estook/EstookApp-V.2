/**
 * Motor de recálculo (M2).
 *
 * De la Auditoría de flujos, hallazgo 9:
 *
 * > «No estaba escrito el orden de los recálculos. Sin eso, dos cambios
 * > simultáneos dan resultados distintos según cuál gane. **Decisión: el
 * > recálculo va siempre en el mismo orden —precio, elaboración, plato, margen,
 * > aviso— y se hace en cola por producto**, así que dos cambios seguidos
 * > producen el mismo resultado que uno tras otro.»
 *
 * Aquí vive ese orden, y la función que decide qué hay que rehacer cuando algo
 * cambia. **Quién lo ejecuta son los workers**, que no viven aquí: esto es
 * cálculo puro y no toca ni la red ni la base de datos.
 */

/** El orden. No se altera: es lo que hace el resultado predecible. */
export const ORDEN_DEL_RECALCULO = ['precio', 'elaboracion', 'plato', 'margen', 'aviso'] as const;

export type PasoDelRecalculo = (typeof ORDEN_DEL_RECALCULO)[number];

/** Qué ha cambiado. De aquí sale por dónde hay que empezar. */
export const DISPARADORES = [
  /** Llegó un albarán, o se corrigió una factura. */
  'precio_de_compra',
  /** Cambió el formato, el factor o el rendimiento de un producto. */
  'conversion_del_producto',
  /** Cambió el gramaje de una elaboración. */
  'receta_de_elaboracion',
  /** Cambió el gramaje de un plato, o su composición. */
  'receta_de_plato',
  /** Cambió el precio de venta o el canal. */
  'precio_de_venta',
  /** Cambió un objetivo, que es lo que decide de qué color sale todo. */
  'objetivo',
] as const;

export type Disparador = (typeof DISPARADORES)[number];

/**
 * Por dónde entra cada cambio en la cadena. Un cambio de precio de compra
 * arrastra todo; un cambio de objetivo solo repinta los avisos.
 */
const ENTRADA: Readonly<Record<Disparador, PasoDelRecalculo>> = {
  precio_de_compra: 'precio',
  conversion_del_producto: 'precio',
  receta_de_elaboracion: 'elaboracion',
  receta_de_plato: 'plato',
  precio_de_venta: 'margen',
  objetivo: 'aviso',
};

/**
 * Qué pasos hay que rehacer, y en qué orden, ante un cambio.
 *
 * Siempre devuelve una cola **desde el paso de entrada hasta el final**: si
 * cambia un precio de compra hay que rehacer la elaboración, el plato, el margen
 * y el aviso, porque cada uno cuelga del anterior.
 */
export function pasosPara(disparador: Disparador): readonly PasoDelRecalculo[] {
  const desde = ORDEN_DEL_RECALCULO.indexOf(ENTRADA[disparador]);
  return ORDEN_DEL_RECALCULO.slice(desde);
}

/**
 * Junta varios cambios en una sola cola.
 *
 * Es lo que hace que dos cambios seguidos den lo mismo que uno tras otro: si en
 * el mismo momento cambia un precio de compra y un objetivo, no se hacen dos
 * recorridos, se hace uno que empieza por el paso más temprano de los dos.
 */
export function colaPara(disparadores: readonly Disparador[]): readonly PasoDelRecalculo[] {
  if (disparadores.length === 0) return [];

  const masTemprano = Math.min(...disparadores.map((d) => ORDEN_DEL_RECALCULO.indexOf(ENTRADA[d])));
  return ORDEN_DEL_RECALCULO.slice(masTemprano);
}

/**
 * La clave de la cola. **Una cola por producto**, tal como decide la Auditoría:
 * dos cambios sobre el mismo producto se ponen en fila, y así no se pisan.
 */
export function claveDeCola(localId: string, productoId: string): string {
  return `recalculo:${localId}:${productoId}`;
}
