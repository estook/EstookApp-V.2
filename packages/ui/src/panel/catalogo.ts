import { leerIdDelIndicador } from '@estook/dominio';
import type { Permiso, PermisoDeApp } from '@estook/permisos';

/**
 * El catálogo de widgets del Panel · Manifiesto 6 y el rediseño (entrega 3 · decisión 0148).
 *
 * **Este fichero es el único dueño de «qué widgets hay» y de «qué trae cada puesto».** Hermano
 * de `apps.ts`, y por la misma razón: si el nombre de un widget se escribe en dos sitios, un día
 * habrá dos nombres.
 *
 * ── Lo que pidió Richi el 18-nov, y lo que se construye ─────────────────────
 *
 * «El Panel: cada puesto lo suyo, **también el jefe de cocina y el jefe de sala**; los fijos
 * arriba y **los que se añaden, abajo y del mismo tamaño**; "Ventas según canal"; las gráficas
 * dicen lo suyo al pasar el ratón o al tocarlas.» La maqueta aprobada (`el-rediseno.html`,
 * pestaña «El Panel») dibuja cinco Paneles. Así que el Panel ya no es una rejilla que cada uno
 * monta desde cero, sino dos partes:
 *
 *   · **Los fijos de su puesto**, arriba (`FIJOS_DEL_PUESTO`). No se mueven ni se quitan: son lo
 *     que ese puesto mira cada día, en el sitio de siempre. Cada uno con su forma (`FormaDelFijo`):
 *     una cifra, una gráfica, una lista… y la rejilla los coloca sin huecos en cada pantalla.
 *   · **Los añadidos por él**, abajo, **todos del mismo tamaño** y en el orden que elija. Es lo
 *     que se guarda (`mi_panel`, por persona y por aparato). El gerente y los jefes eligen; la
 *     cocina y la sala ven lo suyo y nada más (`ELIGE_EL_PUESTO`).
 *
 * Lo que había guardado cada uno no se pierde: `MUDANZAS` dice en qué se ha convertido cada
 * widget de antes («fichar» es «Tu día»), y lo que ya es fijo de su puesto no se repite abajo.
 */

/** Cuánto ocupa un widget en la rejilla de los añadidos: siempre uno, el mismo para todos. */
export type TamanoDeWidget = 'chico' | 'ancho' | 'grande';

/** Cuántas columnas y filas ocupa cada tamaño en la rejilla que se edita. */
export const CUANTO_OCUPA: Readonly<
  Record<TamanoDeWidget, { readonly columnas: number; readonly filas: number }>
> = {
  chico: { columnas: 1, filas: 1 },
  ancho: { columnas: 2, filas: 1 },
  grande: { columnas: 2, filas: 2 },
};

/** El tamaño de todos los añadidos: «del mismo tamaño, así nunca quedan huecos» (maqueta). */
export const TAMANO_DE_LOS_ANADIDOS: TamanoDeWidget = 'chico';

/** Los grupos de «Añadir un widget», los de la maqueta. */
export type GrupoDeWidget = 'ventas' | 'almacen' | 'equipo' | 'canales';

export const NOMBRE_DEL_GRUPO: Readonly<Record<GrupoDeWidget, string>> = {
  ventas: 'Ventas',
  almacen: 'Almacén y cocina',
  equipo: 'Equipo',
  canales: 'Canales',
};

const ORDEN_DE_LOS_GRUPOS: readonly GrupoDeWidget[] = ['ventas', 'almacen', 'equipo', 'canales'];

export interface Widget {
  readonly id: string;
  readonly nombre: string;
  /** Qué enseña, en una frase. Es lo que se lee en el catálogo al añadirlo. */
  readonly queEnsena: string;
  /**
   * El permiso que hace falta para verlo. Nulo cuando no hace falta ninguno («Tu día» lo tiene
   * cualquiera). Los que piden uno **no se ofrecen ni se pintan** a quien no lo tiene: un cocinero
   * no ve un widget de margen, ni apagado. Y el servidor lo niega igual.
   */
  readonly permiso: Permiso | null;
  /** Un segundo permiso, cuando hacen falta dos (el food cost: ventas y costes). */
  readonly yTambien?: Permiso;
  readonly grupo: GrupoDeWidget;
  /** Si se puede añadir abajo. Las cifras sueltas y las gráficas grandes solo son fijas. */
  readonly anadible: boolean;
  /** Lo que llega con otro módulo: sale en gris en el catálogo, con su módulo («Con M29»). */
  readonly pronto?: string;
}

/**
 * Todos los widgets. Las cifras sueltas (`cifra-…`) son las de arriba de cada puesto; quien no las
 * tiene fijas añade «Las cifras del día», que las junta.
 */
export const WIDGETS: readonly Widget[] = [
  // ── Ventas ─────────────────────────────────────────────────────────────────
  {
    id: 'cifra-ventas',
    nombre: 'Ventas de hoy',
    queEnsena: 'Lo vendido hoy, el objetivo del día y la previsión al cierre',
    permiso: 'dato.ventas',
    grupo: 'ventas',
    anadible: false,
  },
  {
    id: 'cifra-tickets',
    nombre: 'Tickets',
    queEnsena: 'Los tickets de hoy y su ticket medio',
    permiso: 'dato.ventas',
    grupo: 'ventas',
    anadible: false,
  },
  {
    id: 'cifra-ticket-medio',
    nombre: 'Ticket medio',
    queEnsena: 'Lo que deja cada mesa, hoy',
    permiso: 'dato.ventas',
    grupo: 'ventas',
    anadible: false,
  },
  {
    id: 'cifra-food-cost',
    nombre: 'Food cost real',
    queEnsena: 'Lo que se va en género de cada cien euros que entran',
    permiso: 'dato.ventas',
    yTambien: 'dato.precio_de_compra',
    grupo: 'ventas',
    anadible: false,
  },
  {
    id: 'cifra-merma',
    nombre: 'Merma de la semana',
    queEnsena: 'Lo que se ha tirado en siete días',
    permiso: 'app.almacen',
    yTambien: 'dato.precio_de_compra',
    grupo: 'almacen',
    anadible: false,
  },
  {
    id: 'cifra-compras',
    nombre: 'Compras de la semana',
    queEnsena: 'Lo que ha entrado de género, y cuánto es de lo vendido',
    permiso: 'app.almacen',
    yTambien: 'dato.precio_de_compra',
    grupo: 'almacen',
    anadible: false,
  },
  {
    id: 'cifra-camara',
    nombre: 'La cámara vale',
    queEnsena: 'Lo que vale el género que tienes',
    permiso: 'app.almacen',
    yTambien: 'dato.precio_de_compra',
    grupo: 'almacen',
    anadible: false,
  },
  {
    id: 'cifra-mesas',
    nombre: 'Mesas ahora',
    queEnsena: 'Las mesas abiertas, las que esperan la cuenta y los comensales',
    permiso: 'dato.ventas',
    grupo: 'ventas',
    anadible: false,
  },
  {
    id: 'cifra-espera',
    nombre: 'Espera de cocina',
    queEnsena: 'Lo que tarda la cocina de media hoy',
    permiso: 'dato.ventas',
    grupo: 'ventas',
    anadible: false,
  },
  {
    id: 'cifras-del-dia',
    nombre: 'Las cifras del día',
    queEnsena: 'Ventas, tickets, food cost y merma',
    permiso: 'dato.ventas',
    grupo: 'ventas',
    anadible: true,
  },
  {
    id: 'ventas-y-compras',
    nombre: 'Ventas y compras',
    queEnsena: 'Lo que vendes y lo que compras cada día de la semana',
    permiso: 'dato.ventas',
    grupo: 'ventas',
    anadible: false,
  },
  {
    id: 'cuando-se-vende',
    nombre: 'Cuándo se vende',
    queEnsena: 'Lo que se vende cada hora, de media, este día de la semana',
    permiso: 'dato.ventas',
    grupo: 'ventas',
    anadible: false,
  },
  {
    id: 'lo-que-mas-sale',
    nombre: 'Lo que más sale',
    queEnsena: 'Los platos que más se venden, con su foto',
    permiso: 'dato.ventas',
    grupo: 'ventas',
    anadible: true,
  },
  {
    id: 'por-secciones',
    nombre: 'Por secciones',
    queEnsena: 'Lo que vende cada sección de la carta',
    permiso: 'dato.ventas',
    grupo: 'ventas',
    anadible: true,
  },
  {
    id: 'como-se-cobra',
    nombre: 'Cómo se cobra',
    queEnsena: 'Tarjeta, efectivo y Bizum de lo cobrado hoy',
    permiso: 'dato.ventas',
    grupo: 'ventas',
    anadible: true,
  },
  {
    id: 'mesas-ahora',
    nombre: 'Mesas ahora',
    queEnsena: 'Ocupadas, por cobrar y la espera media',
    permiso: 'dato.ventas',
    grupo: 'ventas',
    anadible: true,
  },
  {
    id: 'objetivos',
    nombre: 'Objetivos',
    queEnsena: 'Cómo vas frente a tus objetivos, en un vistazo',
    permiso: 'dato.ventas',
    grupo: 'ventas',
    anadible: true,
  },

  // ── Almacén y cocina ──────────────────────────────────────────────────────
  {
    id: 'almacen-pide',
    nombre: 'El almacén pide',
    queEnsena: 'Bajo mínimo, lo que caduca, los pedidos de hoy y lo que vale la cámara',
    permiso: 'app.almacen',
    grupo: 'almacen',
    anadible: true,
  },
  {
    id: 'caducidades',
    nombre: 'Caduca pronto',
    queEnsena: 'Lo que caduca en los próximos días',
    permiso: 'app.almacen',
    grupo: 'almacen',
    anadible: true,
  },
  {
    id: 'bajo-minimo',
    nombre: 'Bajo mínimo',
    queEnsena: 'Lo que hay que pedir, con cuánto queda de su mínimo',
    permiso: 'app.almacen',
    grupo: 'almacen',
    anadible: true,
  },
  {
    id: 'repartos',
    nombre: 'Repartos de hoy',
    queEnsena: 'Lo que llega, lo que hay que pedir y lo enviado',
    permiso: 'accion.enviar_pedidos',
    grupo: 'almacen',
    anadible: true,
  },
  {
    id: 'food-cost-y-merma',
    nombre: 'Food cost y merma',
    queEnsena: 'El food cost de cada día frente a tu objetivo, y la merma',
    permiso: 'dato.ventas',
    yTambien: 'dato.precio_de_compra',
    grupo: 'almacen',
    anadible: false,
  },
  {
    id: 'lo-que-se-escapa',
    nombre: 'Lo que se escapa',
    queEnsena: 'Los platos cuyo coste ha subido, y por qué',
    permiso: 'app.escandallos',
    yTambien: 'dato.coste_de_plato',
    grupo: 'almacen',
    anadible: true,
  },
  {
    id: 'cocina-en-el-servicio',
    nombre: 'La cocina en el servicio',
    queEnsena: 'Lo que tarda, lo más lento, lo sacado y lo que espera',
    permiso: 'dato.ventas',
    grupo: 'almacen',
    anadible: false,
  },
  {
    id: 'agotados',
    nombre: 'Agotados',
    queEnsena: 'Lo que se ha acabado hoy, y marcar otro en dos toques',
    permiso: 'accion.marcar_agotado',
    grupo: 'almacen',
    anadible: true,
  },
  {
    id: 'menu-del-dia',
    nombre: 'Menú del día',
    queEnsena: 'El menú de hoy, con la foto de cada plato',
    permiso: null,
    grupo: 'almacen',
    anadible: true,
  },
  {
    id: 'para-recomendar',
    nombre: 'Para recomendar',
    queEnsena: 'Lo que recomienda la casa, para ofrecerlo en la mesa',
    permiso: null,
    grupo: 'almacen',
    anadible: true,
  },

  // ── Equipo ─────────────────────────────────────────────────────────────────
  {
    id: 'equipo-ahora',
    nombre: 'El equipo ahora',
    queEnsena: 'Trabajando, en pausa y quién falta',
    permiso: 'app.equipo',
    grupo: 'equipo',
    anadible: true,
  },
  {
    id: 'sala-ahora',
    nombre: 'La sala ahora',
    queEnsena: 'Quién está en sala, trabajando o en pausa',
    permiso: 'app.equipo',
    grupo: 'equipo',
    anadible: false,
  },
  {
    id: 'tu-dia',
    nombre: 'Tu día',
    queEnsena: 'Tu turno de hoy, lo trabajado y fichar',
    permiso: null,
    grupo: 'equipo',
    anadible: true,
  },
  {
    id: 'mis-horas',
    nombre: 'Mis horas',
    queEnsena: 'Lo que llevas esta semana, frente a tu horario',
    permiso: null,
    grupo: 'equipo',
    anadible: true,
  },
  {
    id: 'tablon',
    nombre: 'El tablón',
    queEnsena: 'Lo que escribe el encargado',
    permiso: null,
    grupo: 'equipo',
    anadible: true,
  },
  {
    // Los botones que elige cada uno (0084): la maqueta no los dibuja y pasan a «Añadidos».
    id: 'acciones-rapidas',
    nombre: 'Tus atajos',
    queEnsena: 'Los botones que tú elijas, de cualquier app',
    permiso: null,
    grupo: 'equipo',
    anadible: true,
  },
  {
    id: 'calendario',
    nombre: 'Lo que viene',
    queEnsena: 'Hoy y mañana: entregas, caducidades, turnos y avisos',
    permiso: 'app.calendario',
    grupo: 'equipo',
    anadible: true,
  },
  {
    id: 'atajos',
    nombre: 'Atajos',
    queEnsena: 'Apuntar merma, las fichas técnicas y contar',
    permiso: null,
    grupo: 'equipo',
    anadible: false,
  },

  // ── Canales ────────────────────────────────────────────────────────────────
  {
    id: 'ventas-segun-canal',
    nombre: 'Ventas según canal',
    queEnsena: 'Sala, barra, para llevar y reparto',
    permiso: 'dato.ventas',
    grupo: 'canales',
    anadible: true,
  },
  {
    id: 'uber-eats',
    nombre: 'Uber Eats',
    queEnsena: 'Pedidos, lo que deja y lo que más sale ahí',
    permiso: 'dato.ventas',
    grupo: 'canales',
    anadible: false,
    pronto: 'Con M29',
  },
];

// ── Los puestos ────────────────────────────────────────────────────────────────

/** El Panel de cada puesto (0148): los cinco de la maqueta. */
export type Puesto = 'gerente' | 'jefe-cocina' | 'jefe-sala' | 'cocina' | 'sala';

export const NOMBRE_DEL_PUESTO: Readonly<Record<Puesto, string>> = {
  gerente: 'Gerente',
  'jefe-cocina': 'Jefe de cocina',
  'jefe-sala': 'Jefe de sala',
  cocina: 'Cocina',
  sala: 'Sala',
};

/**
 * El puesto de alguien, por lo que puede ver: así vale también para un rol hecho a medida.
 * Quien ve ventas y coste de personal lleva el local; quien ve ventas y el almacén, la cocina;
 * quien ve ventas sin almacén, la sala. Sin ventas: cocina si tiene el almacén, si no, sala.
 */
export function elPuestoDe(tienePermiso: (permiso: Permiso) => boolean): Puesto {
  if (tienePermiso('dato.ventas') && tienePermiso('dato.coste_de_personal')) return 'gerente';
  if (tienePermiso('dato.ventas')) return tienePermiso('app.almacen') ? 'jefe-cocina' : 'jefe-sala';
  if (tienePermiso('app.almacen')) return 'cocina';
  return 'sala';
}

/**
 * La forma de un fijo en la rejilla de arriba, en doce columnas en el PC (la maqueta): una cifra
 * ocupa tres, la gráfica siete y lo de su lado cinco, una lista cuatro, un cuarto tres, y una fila
 * entera las doce. En la tablet y en el móvil, cada forma tiene su ancho (`anchoDeLaForma`).
 */
export type FormaDelFijo =
  'cifra' | 'grafica' | 'lado' | 'tercio' | 'dos-tercios' | 'cuarto' | 'fila';

export interface Fijo {
  readonly id: string;
  readonly forma: FormaDelFijo;
  /** En naranja: lo primero que se mira de ese puesto. */
  readonly destacado?: boolean;
}

/** Lo de arriba de cada puesto, en su orden: la maqueta aprobada, pestaña «El Panel». */
export const FIJOS_DEL_PUESTO: Readonly<Record<Puesto, readonly Fijo[]>> = {
  gerente: [
    { id: 'cifra-ventas', forma: 'cifra', destacado: true },
    { id: 'cifra-tickets', forma: 'cifra' },
    { id: 'cifra-food-cost', forma: 'cifra' },
    { id: 'cifra-merma', forma: 'cifra' },
    { id: 'ventas-y-compras', forma: 'grafica' },
    { id: 'lo-que-mas-sale', forma: 'lado' },
    { id: 'por-secciones', forma: 'cuarto' },
    { id: 'equipo-ahora', forma: 'cuarto' },
    { id: 'como-se-cobra', forma: 'cuarto' },
    { id: 'almacen-pide', forma: 'cuarto' },
    { id: 'ventas-segun-canal', forma: 'fila' },
  ],
  'jefe-cocina': [
    { id: 'cifra-food-cost', forma: 'cifra', destacado: true },
    { id: 'cifra-merma', forma: 'cifra' },
    { id: 'cifra-compras', forma: 'cifra' },
    { id: 'cifra-camara', forma: 'cifra' },
    { id: 'food-cost-y-merma', forma: 'grafica' },
    { id: 'lo-que-se-escapa', forma: 'lado' },
    { id: 'caducidades', forma: 'tercio' },
    { id: 'bajo-minimo', forma: 'tercio' },
    { id: 'repartos', forma: 'tercio' },
    { id: 'cocina-en-el-servicio', forma: 'fila' },
  ],
  'jefe-sala': [
    { id: 'cifra-ventas', forma: 'cifra', destacado: true },
    { id: 'cifra-ticket-medio', forma: 'cifra' },
    { id: 'cifra-mesas', forma: 'cifra' },
    { id: 'cifra-espera', forma: 'cifra' },
    { id: 'cuando-se-vende', forma: 'grafica' },
    { id: 'lo-que-mas-sale', forma: 'lado' },
    { id: 'sala-ahora', forma: 'tercio' },
    { id: 'como-se-cobra', forma: 'tercio' },
    { id: 'objetivos', forma: 'tercio' },
    { id: 'ventas-segun-canal', forma: 'fila' },
  ],
  cocina: [
    { id: 'tu-dia', forma: 'tercio', destacado: true },
    { id: 'menu-del-dia', forma: 'dos-tercios' },
    { id: 'caducidades', forma: 'tercio' },
    { id: 'agotados', forma: 'tercio' },
    { id: 'tablon', forma: 'tercio' },
    { id: 'atajos', forma: 'fila' },
  ],
  sala: [
    { id: 'tu-dia', forma: 'tercio', destacado: true },
    { id: 'menu-del-dia', forma: 'dos-tercios' },
    { id: 'agotados', forma: 'tercio' },
    { id: 'para-recomendar', forma: 'tercio' },
    { id: 'tablon', forma: 'tercio' },
  ],
};

/** Si el puesto añade widgets abajo: el gerente y los jefes sí; la cocina y la sala, no. */
export const ELIGE_EL_PUESTO: Readonly<Record<Puesto, boolean>> = {
  gerente: true,
  'jefe-cocina': true,
  'jefe-sala': true,
  cocina: false,
  sala: false,
};

/** Los añadidos que trae cada puesto la primera vez, los de la maqueta. */
export const ANADIDOS_DE_FABRICA: Readonly<Record<Puesto, readonly string[]>> = {
  gerente: ['objetivos', 'repartos', 'caducidades', 'mis-horas'],
  'jefe-cocina': ['objetivos', 'mis-horas', 'agotados', 'tablon'],
  'jefe-sala': ['mis-horas', 'agotados', 'para-recomendar', 'tablon'],
  cocina: [],
  sala: [],
};

/**
 * Los ids de lo fijo de un puesto, incluidas las cifras que junta «Las cifras del día»: quien tiene
 * las cifras sueltas arriba no la añade abajo.
 */
export function losIdsFijos(puesto: Puesto): ReadonlySet<string> {
  const ids = new Set(FIJOS_DEL_PUESTO[puesto].map((f) => f.id));
  if ([...ids].some((id) => id.startsWith('cifra-'))) ids.add('cifras-del-dia');
  if (ids.has('sala-ahora')) ids.add('equipo-ahora');
  if (ids.has('cifra-mesas')) ids.add('mesas-ahora');
  if (ids.has('cifra-camara') || ids.has('bajo-minimo')) ids.add('almacen-pide');
  return ids;
}

// ── Lo guardado de antes ──────────────────────────────────────────────────────

/**
 * En qué se ha convertido cada widget de antes (la experiencia, 0083, y el rediseño, 0148). Lo que
 * no está aquí ni en `WIDGETS` se deja de pintar: «Tus apps» ya está en el menú lateral (la maqueta,
 * «Fuera»).
 */
export const MUDANZAS: Readonly<Record<string, string>> = {
  // El rediseño (0148)
  fichar: 'tu-dia',
  'mi-turno': 'tu-dia',
  ventas: 'cifras-del-dia',
  'food-cost': 'cifras-del-dia',
  merma: 'cifras-del-dia',
  'gasto-en-compras': 'cifras-del-dia',
  'valor-de-la-camara': 'almacen-pide',
  pedidos: 'repartos',
  'menu-de-hoy': 'menu-del-dia',
  fichajes: 'equipo-ahora',
  // La experiencia (0083)
  'ventas-de-hoy': 'cifras-del-dia',
  'sin-precio': 'bajo-minimo',
  personas: 'equipo-ahora',
  'indicador-ventas': 'cifras-del-dia',
  'indicador-ticket-medio': 'cifras-del-dia',
  'indicador-cierres': 'cifras-del-dia',
  'indicador-food-cost': 'cifras-del-dia',
  'indicador-merma': 'cifras-del-dia',
  'indicador-compras': 'cifras-del-dia',
  'indicador-mis-horas': 'mis-horas',
  'indicador-valor-camara': 'almacen-pide',
  'indicador-bajo-minimo': 'bajo-minimo',
  'indicador-horas-equipo': 'equipo-ahora',
  'indicador-coste-personal': 'equipo-ahora',
  'indicador-retrasos': 'equipo-ahora',
  'indicador-incidencias': 'equipo-ahora',
};

/**
 * Los Paneles de fábrica de antes del rediseño (0084). Quien tenía guardado justo uno de estos no
 * lo había tocado: estrena los añadidos de su puesto, en vez de arrastrar lo de antes.
 */
const DE_FABRICA_ANTES: readonly (readonly string[])[] = [
  ['fichar', 'ventas', 'objetivos', 'merma', 'valor-de-la-camara', 'fichajes'],
  ['fichar', 'objetivos', 'caducidades', 'bajo-minimo', 'pedidos', 'fichajes'],
  ['fichar', 'mis-horas', 'mi-turno', 'merma', 'caducidades', 'bajo-minimo'],
  ['fichar', 'mis-horas', 'mi-turno', 'menu-de-hoy', 'agotados', 'merma'],
];

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

/** Un widget puesto en la rejilla de los añadidos. */
export interface WidgetPuesto {
  readonly id: string;
  readonly tamano: TamanoDeWidget;
}

/** Los fijos de un puesto que esta persona puede ver, en su orden. */
export function losFijos(
  puesto: Puesto,
  tienePermiso: (permiso: Permiso) => boolean,
): readonly Fijo[] {
  return FIJOS_DEL_PUESTO[puesto].filter((fijo) => {
    const widget = WIDGETS.find((w) => w.id === fijo.id);
    return widget !== undefined && sePuedeTener(widget, tienePermiso);
  });
}

/** Los añadidos que trae su puesto la primera vez. */
export function elPanelDeFabrica(
  tienePermiso: (permiso: Permiso) => boolean,
): readonly WidgetPuesto[] {
  const puesto = elPuestoDe(tienePermiso);
  return loQueSePuedePintar(
    ANADIDOS_DE_FABRICA[puesto].map((id) => ({ id, tamano: TAMANO_DE_LOS_ANADIDOS })),
    tienePermiso,
  );
}

/**
 * Lo que se pinta abajo de un Panel guardado: cada widget con su id de ahora y el tamaño de todos,
 * sin repetidos, sin lo que ya es fijo de su puesto, sin lo que no se añade y sin lo que su rol ya
 * no puede ver. La cocina y la sala no tienen añadidos.
 */
export function loQueSePuedePintar(
  puestos: readonly WidgetPuesto[],
  tienePermiso: (permiso: Permiso) => boolean,
): readonly WidgetPuesto[] {
  const puesto = elPuestoDe(tienePermiso);
  if (!ELIGE_EL_PUESTO[puesto]) return [];
  const fijos = losIdsFijos(puesto);
  const vistos = new Set<string>();

  return puestos.flatMap((guardado) => {
    const widget = widgetPorId(guardado.id);
    if (widget === undefined || !widget.anadible) return [];
    if (vistos.has(widget.id) || fijos.has(widget.id)) return [];
    if (!sePuedeTener(widget, tienePermiso)) return [];

    vistos.add(widget.id);
    return [{ id: widget.id, tamano: TAMANO_DE_LOS_ANADIDOS }];
  });
}

/**
 * Lo guardado, como se pinta ahora. Si lo guardado era justo el Panel de fábrica de antes (nadie lo
 * había tocado), los añadidos de fábrica de su puesto.
 */
export function loGuardadoDeAhora(
  guardados: readonly WidgetPuesto[],
  tienePermiso: (permiso: Permiso) => boolean,
): readonly WidgetPuesto[] {
  const ids = guardados.map((g) => g.id);
  const eraElDeFabrica = DE_FABRICA_ANTES.some(
    (deFabrica) => deFabrica.length === ids.length && deFabrica.every((id, i) => ids[i] === id),
  );
  return eraElDeFabrica
    ? elPanelDeFabrica(tienePermiso)
    : loQueSePuedePintar(guardados, tienePermiso);
}

/** Lo que se puede añadir: lo que su rol ve, se añade y todavía no está, ni arriba ni abajo. */
export function loQueSePuedeAnadir(
  puestos: readonly WidgetPuesto[],
  tienePermiso: (permiso: Permiso) => boolean,
): readonly Widget[] {
  const fijos = losIdsFijos(elPuestoDe(tienePermiso));
  const yaEsta = new Set(puestos.map((p) => idDeAhora(p.id)));
  return WIDGETS.filter(
    (widget) =>
      widget.anadible &&
      !yaEsta.has(widget.id) &&
      !fijos.has(widget.id) &&
      sePuedeTener(widget, tienePermiso),
  );
}

/** Cómo está un widget en el Panel de alguien, para el catálogo. */
export type EstadoEnElCatalogo = 'fijo' | 'puesto' | 'libre' | 'pronto';

export interface GrupoDelCatalogo {
  readonly grupo: GrupoDeWidget;
  readonly nombre: string;
  readonly widgets: readonly { readonly widget: Widget; readonly estado: EstadoEnElCatalogo }[];
}

/**
 * «Añadir un widget», por grupos (la maqueta): los que se pueden añadir con su «Añadir», los ya
 * puestos con su «Quitar», los fijos de su puesto dicho («En tu panel») y lo que llega con otro
 * módulo, en gris («Con M29»). Solo lo que su rol puede ver.
 */
export function elCatalogoParaAnadir(
  puestos: readonly WidgetPuesto[],
  tienePermiso: (permiso: Permiso) => boolean,
): readonly GrupoDelCatalogo[] {
  const fijos = losIdsFijos(elPuestoDe(tienePermiso));
  const yaEsta = new Set(puestos.map((p) => idDeAhora(p.id)));
  const estadoDe = (widget: Widget): EstadoEnElCatalogo | null => {
    if (widget.pronto !== undefined) return 'pronto';
    if (fijos.has(widget.id)) return widget.anadible ? 'fijo' : null;
    if (!widget.anadible) return null;
    return yaEsta.has(widget.id) ? 'puesto' : 'libre';
  };
  return ORDEN_DE_LOS_GRUPOS.map((grupo) => ({
    grupo,
    nombre: NOMBRE_DEL_GRUPO[grupo],
    widgets: WIDGETS.filter((w) => w.grupo === grupo && sePuedeTener(w, tienePermiso)).flatMap(
      (widget) => {
        const estado = estadoDe(widget);
        return estado === null ? [] : [{ widget, estado }];
      },
    ),
  })).filter((g) => g.widgets.length > 0);
}

/**
 * De qué app es cada permiso que no es de una app, para el color del widget. Fichar es de Equipo;
 * la merma, de Almacén; las ventas, de Negocio.
 */
const DE_QUE_APP: Readonly<Record<string, PermisoDeApp>> = {
  'accion.fichar': 'app.equipo',
  'accion.registrar_merma': 'app.almacen',
  'accion.marcar_agotado': 'app.carta',
  'accion.enviar_pedidos': 'app.almacen',
  'dato.ventas': 'app.negocio',
  'dato.precio_de_compra': 'app.almacen',
  'dato.coste_de_personal': 'app.equipo',
};

/** De qué app es cada widget sin permiso, para su color. */
const APP_SIN_PERMISO: Readonly<Record<string, PermisoDeApp>> = {
  'tu-dia': 'app.equipo',
  'mis-horas': 'app.equipo',
  'menu-del-dia': 'app.carta',
  'acciones-rapidas': 'app.panel',
  'para-recomendar': 'app.carta',
  tablon: 'app.equipo',
};

/** El acento de un widget: el de su app, o ninguno si es de todos. */
export function acentoDelWidget(id: string): string | undefined {
  const deLaApp = appDelWidget(id);
  if (deLaApp === undefined) return undefined;
  return `var(--color-app-${deLaApp.replace('app.', '')})`;
}

export function appDelWidget(id: string): PermisoDeApp | undefined {
  const widget = widgetPorId(id);
  if (widget === undefined) return undefined;
  const sinPermiso = APP_SIN_PERMISO[widget.id];
  if (sinPermiso !== undefined) return sinPermiso;
  const permiso = widget.permiso;
  if (permiso === null) return undefined;
  return permiso.startsWith('app.') ? (permiso as PermisoDeApp) : DE_QUE_APP[permiso];
}
