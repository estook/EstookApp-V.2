import { leerIdDelIndicador, type Indicador } from '@estook/dominio';
import type { Permiso, PermisoDeApp } from '@estook/permisos';

/**
 * El catalogo de widgets del Panel · Manifiesto 6.
 *
 * **Este fichero es el unico dueno de «que widgets hay».** Hermano de `apps.ts`,
 * y por la misma razon: si el nombre de un widget se escribe en dos sitios, un dia
 * habra dos nombres.
 *
 * ── Lo que el Manifiesto prometia y no existia ───────────────────────────────
 *
 * «Una rejilla de widgets que cada uno coloca a su gusto, arrastrando. La
 * configuracion se guarda por persona y por dispositivo.» Y una tabla con
 * dieciseis widgets, y «que trae puesto cada rol», y «fijar cualquier cosa al
 * Panel desde cualquier app».
 *
 * Lo que habia eran **seis tarjetas fijas escritas a mano**, iguales para las doce
 * clases de rol, sin poder quitar ni anadir ninguna. Y una de las seis era un
 * andamio de pruebas —«apuntar una nota de prueba»— publicado en el Panel de un
 * negocio de verdad.
 *
 * ── Menos, distintos y de un solo tamaño (la experiencia, 0083) ─────────────
 *
 * Richi, el 13-oct, con un panel de referencia delante: «reducir widgets
 * innecesarios, que cada widget tenga su diseño, no todos igual; que no se elijan si
 * son grandes o pequeños, tamaño único; no pongas 7-30 días para elegir el widget,
 * sino que el propio widget tenga esa opción; algunas gráficas, si le das clic, se
 * abren con más información».
 *
 * Así que:
 *
 *   · **Dieciséis widgets en vez de cuarenta y tantos.** Antes cada una de las trece
 *     cifras salía dos veces (7 y 30 días) además de los widgets propios, y varias
 *     decían lo mismo con otro marco: «Merma» y «Merma · 7 días», «Valor de la
 *     cámara» dos veces, «Personas» y «Quién está trabajando». Se juntan: la merma
 *     es **una**, con su gráfica, su periodo dentro y su botón de apuntar.
 *   · **Cada uno, su tamaño**, el que pide su dibujo: una cifra con su línea cabe en
 *     una columna (`chico`); una lista o una gráfica que se lee, en dos (`ancho`).
 *     Ya no se elige: un widget que admite tres tamaños acaba bien en uno solo.
 *   · **El periodo, dentro**: los que tienen gráfica llevan su «7 d · 30 d», y se
 *     recuerda en el aparato.
 *   · **Lo que llega en otro módulo no se ofrece**: «lo que todavía no existe no se
 *     enseña en pantallas que se usan» (0045). Llegará con su módulo.
 *
 * Los Paneles guardados con los de antes **no se pierden**: `MUDANZAS` dice en qué
 * se ha convertido cada uno («indicador-merma-7» es ahora «merma») y, si dos acaban
 * en el mismo, se queda uno.
 */

/** Cuanto ocupa un widget en la rejilla. */
export type TamanoDeWidget = 'chico' | 'ancho' | 'grande';

/** Cuantas columnas ocupa cada tamano, y cuantas filas. */
export const CUANTO_OCUPA: Readonly<
  Record<TamanoDeWidget, { readonly columnas: number; readonly filas: number }>
> = {
  chico: { columnas: 1, filas: 1 },
  ancho: { columnas: 2, filas: 1 },
  grande: { columnas: 2, filas: 2 },
};

export interface Widget {
  readonly id: string;
  readonly nombre: string;
  /** Qué enseña, en una frase. Es lo que se lee en el catálogo al añadirlo. */
  readonly queEnsena: string;
  /**
   * El permiso que hace falta para verlo.
   *
   * Nulo cuando no hace falta ninguno —«mi turno» lo tiene cualquiera—. Los que
   * piden uno **no se ofrecen** a quien no lo tiene: un cocinero no ve en el
   * catálogo un widget de margen, ni apagado, porque no es para él.
   *
   * Es `Permiso` y no `PermisoDeApp` porque hay widgets cuyo público **no coincide
   * con ninguna app**: fichar lo hace un cocinero, que no tiene Equipo
   * (`accion.fichar`), y las ventas las ve un jefe de sala, que no tiene Negocio
   * (`dato.ventas`).
   */
  readonly permiso: Permiso | null;
  /** Un segundo permiso, cuando hacen falta dos (el food cost: ventas y costes). */
  readonly yTambien?: Permiso;
  /** Su tamaño, el único (la experiencia, 0083). */
  readonly tamano: TamanoDeWidget;
  /**
   * La cifra que pinta, si es un widget de cifra: su gráfica, su periodo dentro y su
   * detalle al tocarla salen de `un_indicador`, el mismo número que en cada app.
   * Quien no puede ver esa cifra (la merma en euros, para un cocinero) ve el widget
   * sin ella: lo que pide verlo lo dicen `permiso` y `yTambien`.
   */
  readonly indicador?: Indicador;
}

/**
 * Los widgets, en el orden en el que se ofrecen al añadir: de lo que hay que
 * atender a lo que se consulta, que es el orden en el que alguien se monta un Panel.
 */
export const WIDGETS: readonly Widget[] = [
  // ── Lo que hay que atender ──────────────────────────────────────────────────
  {
    id: 'bajo-minimo',
    nombre: 'Bajo mínimo',
    queEnsena: 'Lo que hay que pedir, con cuánto queda de su mínimo',
    permiso: 'app.almacen',
    tamano: 'ancho',
  },
  {
    id: 'caducidades',
    nombre: 'Caduca pronto',
    queEnsena: 'Lo que caduca esta semana, día a día',
    permiso: 'app.almacen',
    tamano: 'ancho',
  },
  {
    id: 'pedidos',
    nombre: 'Compras de hoy',
    queEnsena: 'A quién toca pedir hoy y lo que llega',
    permiso: 'app.almacen',
    tamano: 'ancho',
  },
  {
    id: 'calendario',
    nombre: 'Lo que viene',
    queEnsena: 'Hoy y mañana: entregas, caducidades y avisos',
    permiso: 'app.calendario',
    tamano: 'ancho',
  },

  // ── Cifras ──────────────────────────────────────────────────────────────────
  {
    id: 'ventas',
    nombre: 'Ventas',
    queEnsena: 'Lo facturado día a día, con el ticket medio y las cajas',
    permiso: 'dato.ventas',
    tamano: 'ancho',
    indicador: 'ventas',
  },
  {
    id: 'objetivos',
    nombre: 'Objetivos',
    queEnsena: 'Cómo vas frente a tus objetivos, en un vistazo',
    permiso: 'dato.ventas',
    tamano: 'ancho',
  },
  {
    id: 'food-cost',
    nombre: 'Food cost',
    queEnsena: 'Lo que se va en género de cada cien euros que entran',
    permiso: 'dato.ventas',
    yTambien: 'dato.precio_de_compra',
    tamano: 'chico',
    indicador: 'food-cost',
  },
  {
    id: 'merma',
    nombre: 'Merma',
    queEnsena: 'Lo que se ha tirado, día a día, y el botón para apuntarlo',
    permiso: 'accion.registrar_merma',
    tamano: 'chico',
    indicador: 'merma',
  },
  {
    id: 'valor-de-la-camara',
    nombre: 'Valor de la cámara',
    queEnsena: 'Lo que vale el género que tienes, y cómo cambia',
    permiso: 'app.almacen',
    yTambien: 'dato.precio_de_compra',
    tamano: 'chico',
    indicador: 'valor-camara',
  },
  {
    id: 'gasto-en-compras',
    nombre: 'Gasto en compras',
    queEnsena: 'Lo que ha entrado de género, sin IVA',
    permiso: 'app.almacen',
    yTambien: 'dato.precio_de_compra',
    tamano: 'chico',
    indicador: 'compras',
  },

  // ── Tu equipo ───────────────────────────────────────────────────────────────
  {
    id: 'fichajes',
    nombre: 'Equipo ahora',
    queEnsena: 'Quién está dentro, sus horas y los retrasos',
    permiso: 'app.equipo',
    tamano: 'ancho',
  },
  {
    id: 'mi-turno',
    nombre: 'Mi turno',
    queEnsena: 'Tu turno de hoy y con quién coincides',
    permiso: null,
    tamano: 'ancho',
  },
  {
    id: 'mis-horas',
    nombre: 'Mis horas',
    queEnsena: 'Lo que has trabajado cada día',
    permiso: null,
    tamano: 'chico',
    indicador: 'mis-horas',
  },

  // ── Atajos ──────────────────────────────────────────────────────────────────
  {
    id: 'fichar',
    nombre: 'Tu jornada',
    queEnsena: 'Entrar, salir y la pausa, con tus horas de hoy',
    permiso: 'accion.fichar',
    tamano: 'chico',
  },
  {
    id: 'acciones-rapidas',
    nombre: 'Atajos',
    queEnsena: 'Los botones que tú elijas, de cualquier app',
    permiso: null,
    tamano: 'ancho',
  },
  {
    id: 'mis-apps',
    nombre: 'Tus apps',
    queEnsena: 'Tus apps, para entrar de un toque',
    permiso: null,
    tamano: 'ancho',
  },
];

/**
 * En qué se ha convertido cada widget de antes (la experiencia, 0083). Lo que no
 * está aquí ni en `WIDGETS` se deja de pintar: no decía nada que no diga otro.
 */
export const MUDANZAS: Readonly<Record<string, string>> = {
  'ventas-de-hoy': 'ventas',
  'sin-precio': 'bajo-minimo',
  personas: 'fichajes',
  'indicador-ventas': 'ventas',
  'indicador-ticket-medio': 'ventas',
  'indicador-cierres': 'ventas',
  'indicador-food-cost': 'food-cost',
  'indicador-merma': 'merma',
  'indicador-compras': 'gasto-en-compras',
  'indicador-mis-horas': 'mis-horas',
  'indicador-valor-camara': 'valor-de-la-camara',
  'indicador-bajo-minimo': 'bajo-minimo',
  'indicador-horas-equipo': 'fichajes',
  'indicador-coste-personal': 'fichajes',
  'indicador-retrasos': 'fichajes',
  'indicador-incidencias': 'fichajes',
};

/** El id de ahora de un widget guardado, sea de los de antes o no. */
export function idDeAhora(id: string): string {
  const leido = leerIdDelIndicador(id);
  if (leido !== null) return MUDANZAS[`indicador-${leido.indicador}`] ?? id;
  return MUDANZAS[id] ?? id;
}

export function widgetPorId(id: string): Widget | undefined {
  const deAhora = idDeAhora(id);
  return WIDGETS.find((widget) => widget.id === deAhora);
}

function sePuedeTener(widget: Widget, tienePermiso: (permiso: Permiso) => boolean): boolean {
  return (
    (widget.permiso === null || tienePermiso(widget.permiso)) &&
    (widget.yTambien === undefined || tienePermiso(widget.yTambien))
  );
}

/** Un widget puesto en la rejilla de alguien. */
export interface WidgetPuesto {
  readonly id: string;
  readonly tamano: TamanoDeWidget;
}

/**
 * El Panel de cada puesto (entrega O, mejora 4): lo que trae quien no ha tocado el
 * suyo, sacado de lo que su rol puede ver.
 */
export type Puesto = 'gerente' | 'jefe' | 'cocina' | 'sala';

export const NOMBRE_DEL_PUESTO: Readonly<Record<Puesto, string>> = {
  gerente: 'quien lleva el local',
  jefe: 'jefe de cocina o de sala',
  cocina: 'cocina',
  sala: 'sala',
};

export function elPuestoDe(tienePermiso: (permiso: Permiso) => boolean): Puesto {
  if (tienePermiso('dato.ventas') && tienePermiso('dato.coste_de_personal')) return 'gerente';
  if (tienePermiso('dato.ventas')) return 'jefe';
  if (tienePermiso('app.almacen')) return 'cocina';
  return 'sala';
}

/**
 * Lo que trae cada puesto, en orden. Solo los ids: el tamaño es el de cada widget,
 * y la rejilla los coloca en filas completas.
 *
 * **Seis como mucho** (las bases firmes, 0084): «un Panel de fábrica más corto para
 * quien empieza, y que se añada el resto cuando haga falta». Eran ocho o diez, y un
 * Panel que se abre por primera vez con diez tarjetas, la mitad vacías porque todavía
 * no hay datos, es lo contrario de «lo que necesita tu atención». Lo de cada puesto
 * que se queda fuera sale **primero** al añadir (`SUGERIDOS_DEL_PUESTO`).
 */
const DEL_PUESTO: Readonly<Record<Puesto, readonly string[]>> = {
  // El reloj arriba a la izquierda en todos (mejora 9), y para quien lleva el local,
  // lo que ha entrado y el semáforo justo al lado. El food cost va en el semáforo: no
  // se repite en otra tarjeta.
  gerente: ['fichar', 'ventas', 'objetivos', 'merma', 'valor-de-la-camara', 'fichajes'],
  jefe: ['fichar', 'objetivos', 'caducidades', 'bajo-minimo', 'pedidos', 'fichajes'],
  cocina: ['fichar', 'mis-horas', 'mi-turno', 'merma', 'caducidades', 'bajo-minimo'],
  sala: ['fichar', 'mis-horas', 'mi-turno', 'merma', 'calendario', 'mis-apps'],
};

/**
 * Lo que cada puesto traía antes y ya no trae de fábrica: lo primero que se le ofrece
 * al añadir, porque es lo que más probablemente eche de menos.
 */
export const SUGERIDOS_DEL_PUESTO: Readonly<Record<Puesto, readonly string[]>> = {
  gerente: ['bajo-minimo', 'pedidos', 'caducidades', 'calendario'],
  jefe: ['food-cost', 'calendario'],
  cocina: ['pedidos', 'calendario'],
  sala: [],
};

function puesto(id: string): WidgetPuesto {
  return { id, tamano: WIDGETS.find((w) => w.id === id)?.tamano ?? 'ancho' };
}

export const PANEL_DEL_PUESTO: Readonly<Record<Puesto, readonly WidgetPuesto[]>> = {
  gerente: DEL_PUESTO.gerente.map(puesto),
  jefe: DEL_PUESTO.jefe.map(puesto),
  cocina: DEL_PUESTO.cocina.map(puesto),
  sala: DEL_PUESTO.sala.map(puesto),
};

export function elPanelDeFabrica(
  tienePermiso: (permiso: Permiso) => boolean,
): readonly WidgetPuesto[] {
  return loQueSePuedePintar(PANEL_DEL_PUESTO[elPuestoDe(tienePermiso)], tienePermiso);
}

/**
 * Lo que se puede pintar de un Panel guardado: cada widget con su id de ahora y su
 * único tamaño, sin repetidos y sin lo que el rol ya no puede ver.
 */
export function loQueSePuedePintar(
  puestos: readonly WidgetPuesto[],
  tienePermiso: (permiso: Permiso) => boolean,
): readonly WidgetPuesto[] {
  const vistos = new Set<string>();

  return puestos.flatMap((guardado) => {
    const widget = widgetPorId(guardado.id);
    if (widget === undefined) return [];
    if (vistos.has(widget.id)) return [];
    if (!sePuedeTener(widget, tienePermiso)) return [];

    vistos.add(widget.id);
    return [{ id: widget.id, tamano: widget.tamano }];
  });
}

/** Lo que se puede añadir: lo que su rol ve y todavía no está puesto. */
export function loQueSePuedeAnadir(
  puestos: readonly WidgetPuesto[],
  tienePermiso: (permiso: Permiso) => boolean,
): readonly Widget[] {
  const yaEsta = new Set(puestos.map((p) => idDeAhora(p.id)));
  return WIDGETS.filter((widget) => !yaEsta.has(widget.id) && sePuedeTener(widget, tienePermiso));
}

/** Los grupos del catálogo al añadir, para que no sea una lista de veinte sin orden. */
export type GrupoDeWidget = 'para-ti' | 'atender' | 'cifras' | 'equipo' | 'atajos';

export const NOMBRE_DEL_GRUPO: Readonly<Record<GrupoDeWidget, string>> = {
  'para-ti': 'Para ti',
  atender: 'Lo que hay que atender',
  cifras: 'Cifras',
  equipo: 'Tu equipo',
  atajos: 'Atajos',
};

const ORDEN_DE_LOS_GRUPOS: readonly GrupoDeWidget[] = ['atender', 'cifras', 'equipo', 'atajos'];

export const GRUPO_DEL_WIDGET: Readonly<Record<string, GrupoDeWidget>> = {
  'bajo-minimo': 'atender',
  caducidades: 'atender',
  pedidos: 'atender',
  calendario: 'atender',
  ventas: 'cifras',
  objetivos: 'cifras',
  'food-cost': 'cifras',
  merma: 'cifras',
  'valor-de-la-camara': 'cifras',
  'gasto-en-compras': 'cifras',
  fichajes: 'equipo',
  'mi-turno': 'equipo',
  'mis-horas': 'equipo',
  fichar: 'atajos',
  'acciones-rapidas': 'atajos',
  'mis-apps': 'atajos',
};

export interface GrupoDelCatalogo {
  readonly grupo: GrupoDeWidget;
  readonly nombre: string;
  readonly widgets: readonly { readonly widget: Widget; readonly puesto: boolean }[];
}

/** El catálogo entero para añadir, por grupos, con lo que ya está puesto marcado. */
export function elCatalogoParaAnadir(
  puestos: readonly WidgetPuesto[],
  tienePermiso: (permiso: Permiso) => boolean,
): readonly GrupoDelCatalogo[] {
  const yaEsta = new Set(puestos.map((p) => idDeAhora(p.id)));
  const suyos = WIDGETS.filter((widget) => sePuedeTener(widget, tienePermiso));
  // «Para ti», arriba (0084): lo que su puesto traía antes y no trae de fábrica, si
  // todavía no lo tiene. Sale ahí y no en su grupo: dos veces sería ruido.
  const paraTi = new Set(
    SUGERIDOS_DEL_PUESTO[elPuestoDe(tienePermiso)].filter(
      (id) => !yaEsta.has(id) && suyos.some((widget) => widget.id === id),
    ),
  );
  const grupoDe = (widget: Widget): GrupoDeWidget =>
    paraTi.has(widget.id) ? 'para-ti' : (GRUPO_DEL_WIDGET[widget.id] ?? 'cifras');
  return (['para-ti', ...ORDEN_DE_LOS_GRUPOS] as const)
    .map((grupo) => ({
      grupo,
      nombre: NOMBRE_DEL_GRUPO[grupo],
      widgets: suyos
        .filter((widget) => grupoDe(widget) === grupo)
        .map((widget) => ({ widget, puesto: yaEsta.has(widget.id) })),
    }))
    .filter((grupo) => grupo.widgets.length > 0);
}

/**
 * De qué app es cada permiso que no es de una app, para el color del widget. Fichar
 * es de Equipo; la merma, de Almacén; las ventas, de Negocio.
 */
const DE_QUE_APP: Readonly<Record<string, PermisoDeApp>> = {
  'accion.fichar': 'app.equipo',
  'accion.registrar_merma': 'app.almacen',
  'dato.ventas': 'app.negocio',
  'dato.precio_de_compra': 'app.almacen',
  'dato.coste_de_personal': 'app.equipo',
};

/** El acento de un widget: el de su app, o ninguno si es de todos. */
export function acentoDelWidget(id: string): string | undefined {
  const deLaApp = appDelWidget(id);
  if (deLaApp === undefined) return undefined;
  return `var(--color-app-${deLaApp.replace('app.', '')})`;
}

export function appDelWidget(id: string): PermisoDeApp | undefined {
  const widget = widgetPorId(id);
  // «Mis horas» no pide nada, pero es de Equipo; «Mi turno», de Calendario.
  if (widget?.id === 'mis-horas') return 'app.equipo';
  if (widget?.id === 'mi-turno') return 'app.calendario';
  const permiso = widget?.permiso;
  if (permiso == null) return undefined;
  return permiso.startsWith('app.') ? (permiso as PermisoDeApp) : DE_QUE_APP[permiso];
}
