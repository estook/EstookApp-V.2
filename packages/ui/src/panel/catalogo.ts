import type { PermisoDeApp } from '@estook/permisos';
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
   */
  readonly permiso: PermisoDeApp | null;
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
    permiso: 'app.inventario',
    tamanos: ['ancho', 'grande'],
  },
  {
    id: 'bajo-minimo',
    nombre: 'Bajo mínimo',
    queEnsena: 'Lo que hay que pedir, con su previsión de agotamiento',
    permiso: 'app.inventario',
    tamanos: ['ancho', 'grande'],
  },
  {
    id: 'sin-precio',
    nombre: 'Productos sin precio',
    queEnsena: 'Cuántos cuentan cero en el valor de la cámara, y cuáles',
    permiso: 'app.inventario',
    tamanos: ['chico', 'ancho'],
  },
  // ── Las cifras ─────────────────────────────────────────────────────────────
  {
    id: 'valor-de-la-camara',
    nombre: 'Valor de la cámara',
    queEnsena: 'Lo que vale el género que hay, a precio medio ponderado',
    permiso: 'app.inventario',
    tamanos: ['chico', 'ancho'],
  },
  {
    id: 'cuanto-genero',
    nombre: 'Cuánto género',
    queEnsena: 'Cuántos productos tienes dados de alta',
    permiso: 'app.inventario',
    tamanos: ['chico'],
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
  {
    id: 'mi-equipo',
    nombre: 'Tu equipo',
    queEnsena: 'Quién tiene acceso y quién no ha entrado todavía',
    permiso: 'app.equipo',
    tamanos: ['ancho', 'grande'],
  },
  {
    id: 'ultimos-movimientos',
    nombre: 'Lo último apuntado',
    queEnsena: 'Las últimas entradas, salidas y ajustes, con quién las apuntó',
    permiso: 'app.inventario',
    tamanos: ['ancho', 'grande'],
  },

  // ── Y los que llegan con su modulo ─────────────────────────────────────────
  {
    id: 'ventas-de-hoy',
    nombre: 'Ventas de hoy',
    queEnsena: 'Lo facturado del día, comparado con el mismo día de la semana pasada',
    permiso: 'app.negocio',
    tamanos: ['chico', 'ancho'],
    modulo: 'M20',
  },
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
    id: 'calendario',
    nombre: 'Calendario',
    queEnsena: 'Lo de hoy y lo de mañana: turnos, entregas, limpiezas y tareas',
    permiso: 'app.calendario',
    tamanos: ['ancho', 'grande'],
    modulo: 'M14',
  },
  {
    id: 'mi-turno',
    nombre: 'Mi turno',
    queEnsena: 'A qué hora entro, con quién, y qué me toca',
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
    id: 'avisos-de-fogon',
    nombre: 'Avisos de Fogón',
    queEnsena: 'Lo que Fogón ha visto mientras no mirabas, con su botón',
    permiso: 'app.fogon',
    tamanos: ['ancho', 'grande'],
    modulo: 'M22',
  },
];

export function widgetPorId(id: string): Widget | undefined {
  return WIDGETS.find((widget) => widget.id === id);
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
 * Con que Panel empieza cada rol · «Nadie empieza con el Panel vacio».
 *
 * El Manifiesto da la lista por rol, y **no se cumplia**: todo el mundo empezaba
 * con las mismas seis tarjetas, andamio de pruebas incluido. Aqui esta la parte
 * que se puede cumplir hoy, que es la de Inventario y la de las apps; el resto
 * entra con su modulo.
 *
 * ── Como se elige, y por que no se pregunta el rol ──────────────────────────
 *
 * No por nombre de rol, **por permisos**. Hay doce roles y la matriz vive en la
 * base de datos: una lista por nombre de rol aqui seria una segunda copia de la
 * matriz, y se separaria de la de verdad en cuanto alguien recortara un permiso a
 * un local (que M1 permite hacer). Se pregunta lo mismo que pregunta la rueda.
 *
 * El resultado se filtra ademas por lo construido, asi que quien tenga Negocio no
 * arranca con un widget de Pulse apagado: arranca sin el, y lo anade el dia que
 * exista.
 */
export const PANEL_DE_FABRICA: readonly WidgetPuesto[] = [
  { id: 'acciones-rapidas', tamano: 'ancho' },
  { id: 'caducidades', tamano: 'ancho' },
  { id: 'bajo-minimo', tamano: 'ancho' },
  { id: 'valor-de-la-camara', tamano: 'chico' },
  { id: 'cuanto-genero', tamano: 'chico' },
  { id: 'mis-apps', tamano: 'ancho' },
];

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
  tienePermiso: (permiso: PermisoDeApp) => boolean,
): readonly WidgetPuesto[] {
  const vistos = new Set<string>();

  return puestos.flatMap((puesto) => {
    if (vistos.has(puesto.id)) return [];
    const widget = widgetPorId(puesto.id);
    if (widget === undefined) return [];
    if (widget.modulo !== undefined) return [];
    if (widget.permiso !== null && !tienePermiso(widget.permiso)) return [];

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
  tienePermiso: (permiso: PermisoDeApp) => boolean,
): readonly Widget[] {
  const yaEsta = new Set(puestos.map((p) => p.id));
  return WIDGETS.filter(
    (widget) =>
      !yaEsta.has(widget.id) &&
      widget.modulo === undefined &&
      (widget.permiso === null || tienePermiso(widget.permiso)),
  );
}

/** Los que todavia no estan, para poder decir en que modulo llegan. */
export function losQueLlegan(tienePermiso: (permiso: PermisoDeApp) => boolean): readonly Widget[] {
  return WIDGETS.filter(
    (widget) =>
      widget.modulo !== undefined && (widget.permiso === null || tienePermiso(widget.permiso)),
  );
}
