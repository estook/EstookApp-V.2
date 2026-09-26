import {
  COMO_ES_EL_INDICADOR,
  INDICADORES,
  leerIdDelIndicador,
  nombreDelIndicador,
  type Indicador,
} from '@estook/dominio';
import {
  LO_QUE_PIDE_EL_INDICADOR,
  puedeTenerElIndicador,
  type Permiso,
  type PermisoDeApp,
} from '@estook/permisos';
import { MODULOS } from '../apps.ts';

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
 * ── Los tres tamanos, y por que hay tres ─────────────────────────────────────
 *
 * En un movil el Panel era **una columna**, asi que seis tarjetas eran seis
 * pantallas de scroll para leer cuatro cifras. Con dos columnas y tres tamanos, lo
 * que cabe en un vistazo pasa de una tarjeta a cuatro:
 *
 *   `chico`   1 columna  · una cifra con su origen. Cuatro por pantalla de movil
 *   `ancho`   2 columnas · una lista corta, o una cifra con su comparacion
 *   `grande`  2 columnas y doble alto · una grafica, o una lista de verdad
 *
 * Cada widget declara **que tamanos admite**, y ninguno admite todos: una grafica
 * en un cuadrado de 1×1 no es una grafica pequena, es una mancha.
 *
 * ── Y lo que no esta construido, se dice ─────────────────────────────────────
 *
 * Un widget con `modulo` puesto **no se puede anadir**: sale en el catalogo, en
 * gris, con el modulo en el que llega. Es informacion util —saber que va a haber
 * un widget de Pulse cambia como te montas el Panel hoy— y no es un boton mudo,
 * porque no se puede pulsar.
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
  /** Que ensena, en una frase. Es lo que se lee en el catalogo al anadirlo. */
  readonly queEnsena: string;
  /**
   * El permiso que hace falta para verlo.
   *
   * Nulo cuando no hace falta ninguno —«mi turno» lo tiene cualquiera—. Los que
   * piden uno **no se ofrecen** a quien no lo tiene: un cocinero no ve en el
   * catalogo un widget de margen, ni apagado, porque no es que le falte un modulo,
   * es que no es para el.
   *
   * ── Y por que es `Permiso` y no `PermisoDeApp` ─────────────────────────────
   *
   * Porque hay widgets cuyo publico **no coincide con ninguna app**. Fichar lo
   * hace un cocinero, que no tiene la app Equipo: su permiso es `accion.fichar`.
   * Y las ventas del dia las ve un jefe de sala, que no tiene la app Negocio: su
   * permiso es `dato.ventas`. Limitar esto a las ocho apps obligaba a colgar cada
   * widget de la app mas parecida, y entonces la mitad de la plantilla no veia el
   * boton que existe para ella.
   */
  readonly permiso: Permiso | null;
  /** Un segundo permiso, cuando hacen falta dos (el food cost: ventas y costes). */
  readonly yTambien?: Permiso;
  /** Los tamanos que admite. El primero es el que se pone al anadirlo. */
  readonly tamanos: readonly TamanoDeWidget[];
  /** Si todavia no esta construido, el modulo que lo trae. */
  readonly modulo?: string;
}

/**
 * Los widgets, en el orden en el que se ofrecen al anadir.
 *
 * El orden no es alfabetico: va de lo que hay que atender a lo que se consulta,
 * que es el orden en el que alguien se monta un Panel.
 */
export const WIDGETS: readonly Widget[] = [
  // ── Lo que hay que atender ─────────────────────────────────────────────────
  {
    id: 'caducidades',
    nombre: 'Caducidades',
    queEnsena: 'Lo que caduca esta semana, con su lote y sus días',
    permiso: 'app.almacen',
    tamanos: ['ancho', 'grande'],
  },
  {
    id: 'bajo-minimo',
    nombre: 'Bajo mínimo',
    queEnsena: 'Lo que hay que pedir, con su previsión de agotamiento',
    permiso: 'app.almacen',
    tamanos: ['ancho', 'grande'],
  },
  /**
   * Compras de hoy (M7) · a quién toca pedir, lo que llega y lo que espera a
   * mandarse. Es el aviso del Manifiesto 28 —«el bajo mínimo sabe qué día reparte
   * tu proveedor»— puesto donde se mira cada mañana, con su botón.
   */
  {
    id: 'pedidos',
    nombre: 'Compras de hoy',
    queEnsena: 'A quién toca pedir hoy, lo que llega y lo que espera a mandarse',
    permiso: 'app.almacen',
    tamanos: ['ancho', 'grande'],
  },
  /**
   * Lo que viene (M7) · hoy y mañana, del Calendario de todos (0031).
   *
   * Estaba apagado con «llega con M14», y M7 es el primer módulo que **publica**
   * en el Calendario: las entregas de los proveedores, los repartos y las
   * caducidades. El Calendario entero —mes, semana, turnos y tareas— sigue siendo
   * M14; lo de hoy y mañana ya tiene de qué llenarse.
   */
  {
    id: 'calendario',
    nombre: 'Lo que viene',
    queEnsena: 'Hoy y mañana: las entregas de tus proveedores, lo que caduca y los avisos',
    permiso: 'app.calendario',
    tamanos: ['ancho', 'grande'],
  },
  {
    id: 'sin-precio',
    nombre: 'Productos sin precio',
    queEnsena: 'Cuántos cuentan cero en el valor de la cámara, y cuáles',
    permiso: 'app.almacen',
    tamanos: ['chico', 'ancho'],
  },
  // ── Las cifras ─────────────────────────────────────────────────────────────
  {
    id: 'valor-de-la-camara',
    nombre: 'Valor de la cámara',
    queEnsena: 'Lo que vale el género que hay, a precio medio ponderado',
    permiso: 'app.almacen',
    tamanos: ['chico', 'ancho'],
  },
  {
    id: 'cuanto-genero',
    nombre: 'Cuánto género',
    queEnsena: 'Cuántos productos tienes dados de alta',
    permiso: 'app.almacen',
    tamanos: ['chico'],
  },
  /**
   * Los objetivos con su semáforo (entrega O, mejora 17 · 0047).
   *
   * Food cost, personal, coste primo, merma y ventas de la semana, cada uno en
   * verde, ámbar o rojo frente a su objetivo y **con su porqué**. Pide ver las
   * ventas, que es de lo que cuelgan casi todas; cada cifra pide además lo suyo, y
   * el servidor no manda la que no se puede ver.
   */
  {
    id: 'objetivos',
    nombre: 'Objetivos',
    queEnsena: 'Cómo vas esta semana frente a tus objetivos, en verde, ámbar o rojo, y por qué',
    permiso: 'dato.ventas',
    tamanos: ['ancho', 'grande'],
  },
  // ── Lo que se hace ─────────────────────────────────────────────────────────
  {
    id: 'acciones-rapidas',
    nombre: 'Acciones rápidas',
    queEnsena: 'Los botones que tú elijas, de cualquier app',
    permiso: null,
    tamanos: ['ancho', 'grande'],
  },
  {
    id: 'mis-apps',
    nombre: 'Tus apps',
    queEnsena: 'Las apps que tienes en tu acceso, para entrar de un toque',
    permiso: null,
    tamanos: ['ancho', 'grande'],
  },
  /**
   * ── «Tu equipo» partido en dos, y el original fuera ───────────────────────
   *
   * Había un solo widget que enseñaba la plantilla entera en pastillas, y ocupaba
   * media pantalla de un TPV para contestar algo que no se pregunta a diario:
   * quién tiene acceso. Para eso se entra en Equipo.
   *
   * Lo que sí se pregunta cada mañana son **dos cosas distintas**, y por eso son
   * dos widgets y cada uno se pone o no se pone:
   *
   *   `fichajes`  ¿quién está trabajando ahora, desde cuándo, y quién falta?
   *   `personas`  ¿quién hay, quién está en línea, y cuándo se le vio?
   *
   * El de fichajes es el de un jefe de cocina a las siete de la tarde. El de
   * personas es el de quien lleva el local y quiere saber a quién le falta
   * estrenar el PIN. Juntos eran una tarjeta que no contestaba ninguna de las dos.
   */
  {
    id: 'fichajes',
    nombre: 'Quién está trabajando',
    queEnsena: 'Quién ha fichado, desde cuándo, y quién todavía no',
    permiso: 'app.equipo',
    tamanos: ['ancho', 'grande'],
  },
  {
    id: 'personas',
    nombre: 'Personas',
    queEnsena: 'Tu equipo, quién está en línea y cuándo se le vio por última vez',
    permiso: 'app.equipo',
    tamanos: ['ancho', 'grande'],
  },
  /**
   * Fichar, desde el Panel.
   *
   * ── Por qué esto es un widget y no una pantalla ───────────────────────────
   *
   * Porque un cocinero **no tiene la app Equipo**: la matriz de M1 no se la da, y
   * con razón. Si fichar viviera solo dentro de Equipo, la mitad de la plantilla
   * no podría fichar, que es justo la mitad que ficha.
   *
   * Así que vive donde vive todo el mundo cada mañana: el Panel. Su permiso es
   * `accion.fichar`, que es exactamente quién lo necesita.
   */
  {
    id: 'fichar',
    nombre: 'Fichar',
    queEnsena: 'Entrar y salir de tu turno, y las horas que llevas',
    permiso: 'accion.fichar',
    tamanos: ['chico', 'ancho'],
  },
  {
    id: 'merma',
    nombre: 'Merma',
    queEnsena: 'Lo que se ha ido hoy sin venderse, y el botón para apuntarlo',
    // Con el permiso de apuntar merma, y no con Almacén: el camarero no tiene
    // la app y es quien rompe una copa.
    permiso: 'accion.registrar_merma',
    tamanos: ['ancho', 'grande'],
  },
  {
    id: 'ultimos-movimientos',
    nombre: 'Lo último apuntado',
    queEnsena: 'Las últimas entradas, salidas y ajustes, con quién las apuntó',
    permiso: 'app.almacen',
    tamanos: ['ancho', 'grande'],
  },
  /**
   * Las ventas del día · **ya no espera a M20**.
   *
   * Estaba apagada con «llega con M20» porque la cifra iba a venir del TPV. Y el
   * TPV es una conexión que media hostelería no va a hacer nunca, así que el
   * widget habría seguido apagado para ellos para siempre.
   *
   * Desde M6½ la cifra sale del **cierre de caja**, que se apunta a mano, se sube
   * de un CSV o se saca de una foto del Z. Cuando llegue el conector de M20, lo
   * que traiga se guarda en la misma tabla y este widget no se entera.
   */
  {
    id: 'ventas-de-hoy',
    nombre: 'Ventas de hoy',
    queEnsena: 'Lo que ha entrado hoy, con lo que se ha gastado de género al lado',
    permiso: 'dato.ventas',
    tamanos: ['chico', 'ancho'],
  },

  // ── Y los que llegan con su modulo ─────────────────────────────────────────
  {
    id: 'pulse',
    nombre: 'Estook Pulse',
    queEnsena: 'La salud del negocio en un número, con su explicación',
    permiso: 'app.negocio',
    tamanos: ['ancho', 'grande'],
    modulo: 'M21',
  },
  {
    id: 'margen',
    nombre: 'Dónde se va el margen',
    queEnsena: 'Las cuatro fugas principales, con lo que cuesta cada una',
    permiso: 'app.negocio',
    tamanos: ['ancho', 'grande'],
    modulo: 'M21',
  },
  {
    id: 'mi-turno',
    nombre: 'Mi turno',
    queEnsena: 'Con quién trabajo hoy y qué me toca hacer',
    permiso: null,
    tamanos: ['chico', 'ancho'],
    modulo: 'M14',
  },
  {
    id: 'platos-bajo-objetivo',
    nombre: 'Platos bajo objetivo',
    queEnsena: 'Los que están dejando menos margen del que te pusiste',
    permiso: 'app.escandallos',
    tamanos: ['ancho', 'grande'],
    modulo: 'M9',
  },
  {
    id: 'pedidos-delivery',
    nombre: 'Pedidos de delivery',
    queEnsena: 'Los pedidos que están entrando de Uber Eats, con su hora y su estado',
    permiso: 'app.servicio',
    tamanos: ['ancho', 'grande'],
    modulo: 'M29',
  },
  {
    id: 'avisos-de-fogon',
    nombre: 'Avisos de Fogón',
    queEnsena: 'Lo que Fogón ha visto mientras no mirabas, con su botón',
    permiso: 'app.fogon',
    tamanos: ['ancho', 'grande'],
    modulo: 'M22',
  },
];

export function widgetPorId(id: string): Widget | undefined {
  return WIDGETS.find((widget) => widget.id === id) ?? widgetDelIndicador(id);
}

/**
 * Un indicador puesto en el Panel, como widget (0039).
 *
 * No está en `WIDGETS` porque no es uno: es una familia —seis cifras por dos
 * periodos— y lo elegido va en el identificador (`indicador-ventas-7`). Lo que
 * pide para verse sale de `@estook/permisos`, que es lo mismo que comprueba el
 * servidor.
 *
 * Es el único widget que admite los tres tamaños, y no por descuido: una cifra
 * con su flecha cabe en un cuadrado, con su línea en uno ancho y con la línea
 * grande y sus días en uno grande.
 */
function widgetDelIndicador(id: string): Widget | undefined {
  const leido = leerIdDelIndicador(id);
  if (leido === null) return undefined;
  const pide = LO_QUE_PIDE_EL_INDICADOR[leido.indicador];
  return {
    id,
    nombre: nombreDelIndicador(leido.indicador, leido.dias),
    queEnsena: COMO_ES_EL_INDICADOR[leido.indicador].queEnsena,
    permiso: pide[0] ?? null,
    ...(pide[1] === undefined ? {} : { yTambien: pide[1] }),
    tamanos: ['ancho', 'chico', 'grande'],
  };
}

/** Los indicadores que esta persona puede ponerse, en el orden del dominio. */
export function losIndicadoresQueSePuedenTener(
  tienePermiso: (permiso: Permiso) => boolean,
): readonly Indicador[] {
  return INDICADORES.filter((indicador) => puedeTenerElIndicador(tienePermiso, indicador));
}

/** Si esta persona puede tener este widget: su permiso y, si pide dos, el otro. */
function sePuedeTener(widget: Widget, tienePermiso: (permiso: Permiso) => boolean): boolean {
  return (
    (widget.permiso === null || tienePermiso(widget.permiso)) &&
    (widget.yTambien === undefined || tienePermiso(widget.yTambien))
  );
}

/** El nombre entero del modulo de un widget, o nada si esta construido. */
export function cuandoLlega(widget: Widget): string | null {
  if (widget.modulo === undefined) return null;
  return MODULOS[widget.modulo] ?? widget.modulo;
}

/** Un widget puesto en el Panel de alguien: cual, y de que tamano. */
export interface WidgetPuesto {
  readonly id: string;
  readonly tamano: TamanoDeWidget;
}

/**
 * Con qué Panel empieza cada puesto · «Nadie empieza con el Panel vacío» (mejora 9).
 *
 * Hasta la entrega O había **uno** para todos, filtrado por permisos: el cocinero y
 * la gerente arrancaban con las mismas tarjetas menos las que no podían ver. Ahora
 * hay uno por **puesto**, pensado para lo que cada uno mira al abrir la app, como lo
 * hacen las que mejor lo resuelven (7shifts, Toast, MarketMan): quien ficha y
 * cocina ve fichar, lo que caduca y lo que falta; quien lleva el local ve ventas,
 * costes y su semáforo.
 *
 * ── Cómo se sabe el puesto, y por qué no se pregunta el rol ─────────────────
 *
 * **Por permisos**, no por nombre de rol. Hay doce roles y la matriz vive en la base
 * de datos: una lista por rol aquí sería una segunda copia de la matriz, y se
 * separaría de la de verdad en cuanto alguien recortara un permiso a un local (que M1
 * permite hacer). Se pregunta lo mismo que pregunta la rueda:
 *
 *   gerente   ve lo que cuesta el personal y las ventas: lleva el local
 *   jefe      ve las ventas, pero no lo que cobra cada uno (jefe de cocina o de sala)
 *   cocina    ve el género, y ni un euro de ventas
 *   sala      ni lo uno ni lo otro: ficha, apunta la merma y mira lo que viene
 *
 * Y todo pasa después por `loQueSePuedePintar`, así que un widget que alguien no
 * pueda ver no llega aunque su puesto lo traiga.
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

export const PANEL_DEL_PUESTO: Readonly<Record<Puesto, readonly WidgetPuesto[]>> = {
  // Su reloj arriba, como todos; lo que ha entrado hoy, y el semáforo, que ya lleva
  // el food cost, el personal y el coste primo: otra tarjeta con el food cost sería
  // la misma cifra dos veces.
  //
  // Después, lo que el Manifiesto le pone a quien lleva el local y ya existe: lo que
  // vale la cámara y lo tirado esta semana, lo que está bajo mínimo, quién está
  // trabajando, las compras de hoy, lo que caduca y lo que viene.
  gerente: [
    { id: 'fichar', tamano: 'chico' },
    { id: 'ventas-de-hoy', tamano: 'chico' },
    { id: 'objetivos', tamano: 'grande' },
    { id: 'valor-de-la-camara', tamano: 'chico' },
    { id: 'indicador-merma-7', tamano: 'chico' },
    { id: 'bajo-minimo', tamano: 'ancho' },
    { id: 'fichajes', tamano: 'ancho' },
    { id: 'pedidos', tamano: 'ancho' },
    { id: 'caducidades', tamano: 'ancho' },
    { id: 'calendario', tamano: 'ancho' },
  ],
  // Lo suyo del día, cómo va su food cost día a día (la línea, que el semáforo no
  // enseña) y su gente.
  jefe: [
    { id: 'fichar', tamano: 'chico' },
    { id: 'indicador-food-cost-7', tamano: 'chico' },
    { id: 'objetivos', tamano: 'ancho' },
    { id: 'caducidades', tamano: 'ancho' },
    { id: 'bajo-minimo', tamano: 'ancho' },
    { id: 'pedidos', tamano: 'ancho' },
    { id: 'fichajes', tamano: 'ancho' },
    { id: 'calendario', tamano: 'ancho' },
  ],
  // Fichar arriba a la izquierda, y lo que caduca, lo que falta y lo que llega.
  cocina: [
    { id: 'fichar', tamano: 'chico' },
    { id: 'indicador-mis-horas-7', tamano: 'chico' },
    { id: 'caducidades', tamano: 'ancho' },
    { id: 'bajo-minimo', tamano: 'ancho' },
    { id: 'merma', tamano: 'ancho' },
    { id: 'pedidos', tamano: 'ancho' },
    { id: 'calendario', tamano: 'ancho' },
  ],
  // Fichar, sus horas, la merma que rompe una copa y lo que viene.
  sala: [
    { id: 'fichar', tamano: 'chico' },
    { id: 'indicador-mis-horas-7', tamano: 'chico' },
    { id: 'merma', tamano: 'ancho' },
    { id: 'calendario', tamano: 'ancho' },
    { id: 'mis-apps', tamano: 'ancho' },
  ],
};

/** El de fábrica de quien mira: el de su puesto, sin lo que no puede ver. */
export function elPanelDeFabrica(
  tienePermiso: (permiso: Permiso) => boolean,
): readonly WidgetPuesto[] {
  return loQueSePuedePintar(PANEL_DEL_PUESTO[elPuestoDe(tienePermiso)], tienePermiso);
}

/**
 * Deja la lista guardada en algo que se pueda pintar.
 *
 * Quita lo que ya no existe, lo que esta sin construir y lo que esta persona no
 * puede ver, y corrige un tamano que el widget no admita. **Nada de esto es
 * paranoia**: la lista la guardo un navegador hace meses, puede nombrar un widget
 * que se quito, y a esa persona le pueden haber recortado un permiso desde
 * entonces. Un Panel guardado no es una promesa de que todo siga estando.
 */
export function loQueSePuedePintar(
  puestos: readonly WidgetPuesto[],
  tienePermiso: (permiso: Permiso) => boolean,
): readonly WidgetPuesto[] {
  const vistos = new Set<string>();

  return puestos.flatMap((puesto) => {
    if (vistos.has(puesto.id)) return [];
    const widget = widgetPorId(puesto.id);
    if (widget === undefined) return [];
    if (widget.modulo !== undefined) return [];
    if (!sePuedeTener(widget, tienePermiso)) return [];

    vistos.add(puesto.id);
    const tamano = widget.tamanos.includes(puesto.tamano)
      ? puesto.tamano
      : (widget.tamanos[0] ?? 'ancho');
    return [{ id: puesto.id, tamano }];
  });
}

/** Los que se pueden anadir hoy: construidos y con permiso, y no puestos ya. */
export function loQueSePuedeAnadir(
  puestos: readonly WidgetPuesto[],
  tienePermiso: (permiso: Permiso) => boolean,
): readonly Widget[] {
  const yaEsta = new Set(puestos.map((p) => p.id));
  return WIDGETS.filter(
    (widget) =>
      !yaEsta.has(widget.id) && widget.modulo === undefined && sePuedeTener(widget, tienePermiso),
  );
}

/**
 * Los grupos del catalogo, al anadir (M7, repaso).
 *
 * «Valor de la camara, acciones rapidas, bajo minimo, caduca esta semana: salen
 *  en el Panel, pero al dar a anadir no aparecen. ¿Si las borras las pierdes para
 *  siempre?» No se perdian —se podian volver a poner con «Volver al panel de
 *  siempre»—, pero el catalogo **solo ensenaba los que no estaban**, asi que lo
 *  que se veia era una lista corta de cosas raras y ninguna de las de todos los
 *  dias. Ahora salen todos, agrupados, y los que ya estan lo dicen.
 */
export type GrupoDeWidget = 'atender' | 'cifras' | 'atajos' | 'equipo';

export const NOMBRE_DEL_GRUPO: Readonly<Record<GrupoDeWidget, string>> = {
  atender: 'Lo que hay que atender',
  cifras: 'Cifras',
  atajos: 'Atajos',
  equipo: 'Tu equipo',
};

const ORDEN_DE_LOS_GRUPOS: readonly GrupoDeWidget[] = ['atender', 'cifras', 'atajos', 'equipo'];

/**
 * De que grupo es cada widget construido. Uno nuevo sin grupo sale en «Cifras» y
 * lo dice una prueba: `catalogo.prueba.ts` exige que todos tengan el suyo.
 */
export const GRUPO_DEL_WIDGET: Readonly<Record<string, GrupoDeWidget>> = {
  caducidades: 'atender',
  'bajo-minimo': 'atender',
  pedidos: 'atender',
  calendario: 'atender',
  'sin-precio': 'atender',
  'valor-de-la-camara': 'cifras',
  'cuanto-genero': 'cifras',
  'ventas-de-hoy': 'cifras',
  objetivos: 'cifras',
  'ultimos-movimientos': 'cifras',
  'acciones-rapidas': 'atajos',
  'mis-apps': 'atajos',
  fichar: 'atajos',
  merma: 'atajos',
  fichajes: 'equipo',
  personas: 'equipo',
};

export interface GrupoDelCatalogo {
  readonly grupo: GrupoDeWidget;
  readonly nombre: string;
  readonly widgets: readonly { readonly widget: Widget; readonly puesto: boolean }[];
}

/** Todos los que se pueden tener, por grupos, y si ya estan puestos. */
export function elCatalogoParaAnadir(
  puestos: readonly WidgetPuesto[],
  tienePermiso: (permiso: Permiso) => boolean,
): readonly GrupoDelCatalogo[] {
  const yaEsta = new Set(puestos.map((p) => p.id));
  const construidos = WIDGETS.filter(
    (widget) => widget.modulo === undefined && sePuedeTener(widget, tienePermiso),
  );
  return ORDEN_DE_LOS_GRUPOS.map((grupo) => ({
    grupo,
    nombre: NOMBRE_DEL_GRUPO[grupo],
    widgets: construidos
      .filter((widget) => (GRUPO_DEL_WIDGET[widget.id] ?? 'cifras') === grupo)
      .map((widget) => ({ widget, puesto: yaEsta.has(widget.id) })),
  })).filter((grupo) => grupo.widgets.length > 0);
}

/** Los que todavia no estan, para poder decir en que modulo llegan. */
export function losQueLlegan(tienePermiso: (permiso: Permiso) => boolean): readonly Widget[] {
  return WIDGETS.filter(
    (widget) => widget.modulo !== undefined && sePuedeTener(widget, tienePermiso),
  );
}

/**
 * El acento del widget · el de la app de la que cuenta algo.
 *
 * ── Por que se deduce y no se escribe ────────────────────────────────────────
 *
 * Porque ya estaba escrito dos veces, sin juntarse. Cada widget declara **de que
 * app es** (su `permiso`), y B3 le da a cada app **su acento**. Escribir aqui un
 * tercer color por widget seria una tercera lista que el dia de manana no
 * coincide con las otras dos.
 *
 * Y ademas es lo que hace que signifique algo: el Panel deja de ser una pared de
 * tarjetas blancas y pasa a leerse de un vistazo —lo naranja es de Almacén, lo
 * morado es de Equipo— sin tener que leer ningun titulo.
 *
 * Los que no son de ninguna app —las acciones rapidas, la rueda— no llevan
 * acento, y tampoco es un olvido: no cuentan nada de un sitio concreto.
 */
/**
 * De que app tira el acento de un widget cuyo permiso no es de una app.
 *
 * Fichar es de Equipo aunque su permiso sea `accion.fichar`, y la merma y las
 * ventas cuentan cosas de Almacén y de Negocio. Sin esto saldrian en blanco, y
 * el acento es lo que hace que el Panel se lea de un vistazo sin leer titulos.
 */
const DE_QUE_APP: Readonly<Record<string, PermisoDeApp>> = {
  'accion.fichar': 'app.equipo',
  'accion.registrar_merma': 'app.almacen',
  'dato.ventas': 'app.negocio',
  'dato.precio_de_compra': 'app.almacen',
  'dato.coste_de_personal': 'app.equipo',
};

export function acentoDelWidget(id: string): string | undefined {
  const deLaApp = appDelWidget(id);
  if (deLaApp === undefined) return undefined;
  return `var(--color-app-${deLaApp.replace('app.', '')})`;
}

/**
 * De qué app es un widget, por su permiso. Lo usa el acento y, desde la entrega
 * V, el icono de la cabecera de cada widget (0045): los dos salen del mismo sitio.
 */
export function appDelWidget(id: string): PermisoDeApp | undefined {
  const permiso = widgetPorId(id)?.permiso;
  if (permiso == null) return undefined;
  return permiso.startsWith('app.') ? (permiso as PermisoDeApp) : DE_QUE_APP[permiso];
}
