import {
  IconoAjustes,
  IconoAtencion,
  IconoCalendario,
  IconoCarta,
  IconoCuaderno,
  IconoDocumento,
  IconoEquipo,
  IconoEscandallos,
  IconoHecho,
  IconoInventario,
  IconoNegocio,
  IconoOrganizacion,
  IconoPanel,
  IconoPersona,
  IconoRejilla,
  IconoReloj,
  IconoReparto,
  IconoServicio,
  type Icono,
} from '@estook/iconos';
import { ORDEN_DE_LA_RUEDA, type PermisoDeApp } from '@estook/permisos';

/** Solo las ocho de la rueda. El Panel, Fogon, Ajustes y la gestoria no lo son. */
type AppDeLaRueda = (typeof ORDEN_DE_LA_RUEDA)[number];

/**
 * Las ocho apps · tablas de B3 y B5 del Plan.
 *
 * **Este fichero es el unico dueno de «que apps hay y por donde se navegan».**
 * El icono, el acento, la forma, los destinos y las vistas de cada una salen de
 * aqui y de ningun otro sitio: es la regla 6 (un calculo, un unico dueno)
 * aplicada a la navegacion. Si el acento de Inventario se cambia aqui, cambia en
 * la rueda, en la cabecera y en el Panel a la vez, porque no esta escrito en
 * ningun otro lado.
 *
 * El orden es el de la rueda, y viene de `@estook/permisos`, que es quien sabe
 * cuales se ensenan a cada rol.
 *
 * ── Destinos y vistas, y por que no son lo mismo ─────────────────────────────
 *
 * Hasta M6 cada app tenia una lista plana de «pestanas», y salio mal de tres
 * maneras a la vez:
 *
 *   · **Pestanas muertas.** Inventario gastaba una de sus cuatro posiciones en
 *     «Pedidos», que es M7 y no hacia nada, y otra en un «Mas» que era el cajon
 *     donde vivia Proveedores. **Dos de cuatro no llevaban a ningun sitio.**
 *   · **Pestanas que eran la misma pantalla.** Calendario gastaba tres
 *     posiciones en «Mes», «Semana» y «Dia», que no son tres sitios: son el
 *     mismo sitio con otro aumento.
 *   · **Y un cajon de sastre por app.** Un «Mas» no responde a ninguna pregunta,
 *     asi que nadie sabe que hay dentro hasta que lo abre.
 *
 * Ahora hay dos niveles y cada uno tiene un trabajo:
 *
 *   **Destino** · un sitio de la app que responde a **una pregunta**. Va en la
 *   barra de abajo en movil y en el menu lateral en escritorio. Como mucho
 *   cuatro, y **solo entran los que existen de verdad**: un destino que todavia
 *   no se ha construido lleva su `modulo` puesto, no ocupa posicion y se
 *   ensena aparte diciendo cuando llega.
 *
 *   **Vista** · la misma pantalla mirada de otra forma. Va en un control
 *   segmentado arriba, dentro del destino. «Mes / Semana / Dia» son vistas.
 *   «Todo / Bajo minimo / Sin precio» son vistas. Cambiar de vista **no es
 *   entrar en ningun sitio**: no gasta un nivel de profundidad y el boton de
 *   volver sigue llevando al destino.
 *
 * Asi la regla de profundidad de B5 sigue intacta: **app -> destino -> ficha**,
 * tres niveles. La vista es un filtro de la pantalla del medio, no un piso mas.
 */

/**
 * La forma de una app: que esqueleto usa su contenido.
 *
 * ── Por que esto existe ──────────────────────────────────────────────────────
 *
 * Hasta M6 las ocho apps se pintaban con **la misma pantalla**: cabecera, migas
 * y una fila de pestanas, y lo unico que cambiaba entre una y otra era el color
 * del icono. Eso hace que ocho aplicaciones distintas se sientan una sola con
 * ocho temas, que es justo lo contrario de lo que promete el Manifiesto: «cada
 * app se siente una app».
 *
 * Un calendario no es una lista con otro acento. La forma decide el ancho, la
 * rejilla y donde se abre la ficha, y cada app declara la suya aqui.
 *
 * | Forma        | Como se pinta                                              |
 * | ------------ | ---------------------------------------------------------- |
 * | `panel`      | Rejilla de tarjetas, la cifra manda                        |
 * | `lista`      | Lista acotada con su ficha en panel lateral, sin taparla   |
 * | `calendario` | A todo lo ancho, sin tope de anchura: la rejilla es el eje |
 * | `cuaderno`   | Una sola columna estrecha, de leer y escribir              |
 */
export type FormaDeApp = 'panel' | 'lista' | 'calendario' | 'cuaderno';

export interface Vista {
  /** El trozo de la ruta: `/inventario/productos/bajo-minimo`. */
  readonly id: string;
  readonly nombre: string;
  /**
   * Si la vista todavia no existe, el modulo que la trae.
   *
   * Se ensena apagada y con su nombre, porque una vista que falta es
   * informacion; una vista que promete algo y no lo hace, no.
   */
  readonly modulo?: string;
}

export interface Destino {
  /** El trozo de la ruta: `/inventario/productos`. */
  readonly id: string;
  readonly nombre: string;
  readonly icono: Icono;
  /**
   * La pregunta que contesta, en una frase.
   *
   * «Cada app tiene que responder a una pregunta concreta y su pantalla de
   * inicio se ordena por esa pregunta» (Evolucion 1.0, capitulo 4). Lo mismo,
   * un piso mas abajo: si un destino no sabe que pregunta contesta, es un cajon.
   */
  readonly queContesta: string;
  /** Sus vistas. Vacio quiere decir que el destino es una sola pantalla. */
  readonly vistas: readonly Vista[];
  /**
   * Si el destino entero todavia no existe, el modulo que lo trae.
   *
   * **Un destino con modulo no ocupa posicion en la barra de abajo.** Es la regla
   * que arregla las pestanas muertas: lo que no esta construido se cuenta en su
   * sitio —el menu lateral y la pantalla «lo que llega»— y no le quita el hueco a
   * lo que si funciona.
   */
  readonly modulo?: string;
}

export interface App {
  /** El trozo de la ruta: `/inventario`. */
  readonly id: string;
  readonly nombre: string;
  /** El permiso que hay que tener para verla. Sin el, no aparece en ningun sitio. */
  readonly permiso: PermisoDeApp;
  readonly icono: Icono;
  /** La variable de color, no el color: el valor vive en las fichas de B1. */
  readonly acento: string;
  readonly forma: FormaDeApp;
  /**
   * Sus destinos, tal cual la tabla de B5. Como mucho cuatro **construidos**.
   * El primero construido es su pantalla de inicio.
   */
  readonly destinos: readonly Destino[];
  /** La pregunta que contesta la app entera (Evolucion 1.0, capitulo 4). */
  readonly queHace: string;
}

/**
 * Como se llama cada modulo · parte D del Plan de desarrollo.
 *
 * ── Por que esto vive aqui y no en cada pantalla ─────────────────────────────
 *
 * Porque cuando vivia en cada pantalla **habia dos duenos y dos valores**. La
 * pantalla de una app tenia su tabla, con los ocho numeros bien; y el Panel
 * escribia los suyos a mano en el texto de cada tarjeta, con dos mal: decia que
 * las ventas del TPV las traia «M13», que es Equipo, y que Negocio era «M17»,
 * que es Cuaderno. Los dos textos estaban en la primera pantalla que se ve cada
 * manana, y ninguna prueba los miraba.
 *
 * Es la regla 6 —un dato, un unico dueno— aplicada a algo que no parece un dato.
 * Ahora el numero se escribe una vez, en el catalogo de navegacion, y el nombre
 * sale de aqui. Y hay una prueba que lo cuadra **leyendo el Plan**, no una copia
 * del Plan escrita en la prueba: esa copia es la que dejaba pasar que las
 * pestanas de Negocio no fueran las de B5.
 */
export const MODULOS: Readonly<Record<string, string>> = {
  M6: 'M6 · Inventario',
  M7: 'M7 · Proveedores y compras',
  M9: 'M9 · Escandallos',
  M10: 'M10 · Carta, menús y análisis',
  M13: 'M13 · Equipo',
  M14: 'M14 · Calendario',
  M15: 'M15 · Fichajes',
  M16: 'M16 · Servicio, APPCC y trazabilidad',
  M17: 'M17 · Cuaderno',
  M20: 'M20 · Ventas, emparejamiento y consumo',
  M21: 'M21 · Negocio, analítica y Estook Pulse',
  M22: 'M22 · Fogón',
  M23: 'M23 · Reseñas, competencia y chat',
  M29: 'M29 · Canales de reparto e integraciones',
};

/** El nombre entero de un modulo, para decirlo en pantalla. */
export function comoSeLlamaElModulo(modulo: string): string {
  return MODULOS[modulo] ?? modulo;
}

/** Pasa «Bajo mínimo» a `bajo-minimo`, que es lo que va en la direccion. */
function comoRuta(nombre: string): string {
  return nombre
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/**
 * Unas vistas, escritas con sus nombres.
 *
 * `vistas('Todo', 'Bajo mínimo')` da los identificadores hechos. Con un modulo
 * detras, `vistas(['Pedidos', 'M7'])`, la vista queda apuntada como pendiente.
 */
function vistas(...nombres: readonly (string | readonly [string, string])[]): readonly Vista[] {
  return nombres.map((nombre) =>
    typeof nombre === 'string'
      ? { id: comoRuta(nombre), nombre }
      : { id: comoRuta(nombre[0]), nombre: nombre[0], modulo: nombre[1] },
  );
}

const CATALOGO: Record<AppDeLaRueda, App> = {
  // ── Inventario · M6, construida ────────────────────────────────────────────
  'app.inventario': {
    id: 'inventario',
    nombre: 'Inventario',
    permiso: 'app.inventario',
    icono: IconoInventario,
    acento: 'var(--color-app-inventario)',
    forma: 'lista',
    queHace: 'Qué hay, qué cuesta, qué se acaba y qué caduca',
    destinos: [
      {
        id: 'hoy',
        nombre: 'Hoy',
        icono: IconoAtencion,
        queContesta: '¿Qué tengo que atender ahora mismo?',
        vistas: [],
      },
      {
        id: 'productos',
        nombre: 'Productos',
        icono: IconoInventario,
        queContesta: '¿Qué hay en cámara, cuánto cuesta y cuánto dura?',
        // Los cuatro filtros que antes eran un interruptor suelto en mitad de la
        // pantalla y dos casillas de buscar. Son la misma lista mirada de otra
        // forma, asi que son vistas y no destinos.
        vistas: vistas('Todo', 'Bajo mínimo', 'Sin precio', 'Desactivados'),
      },
      {
        id: 'movimientos',
        nombre: 'Movimientos',
        icono: IconoDocumento,
        // «El stock es un libro de movimientos» (regla 8) y hasta hoy **el libro
        // no se podia leer**: sus lineas solo salian dentro de la ficha de un
        // producto, de una en una. Un libro que solo se lee por paginas sueltas
        // no sirve para lo que sirve un libro, que es cuadrar.
        queContesta: '¿Qué ha entrado, qué ha salido y quién lo apuntó?',
        vistas: vistas('Todo', 'Entradas', 'Salidas', 'Ajustes'),
      },
      {
        id: 'compras',
        nombre: 'Compras',
        icono: IconoOrganizacion,
        queContesta: '¿A quién se lo compro y a qué precio?',
        vistas: vistas('Proveedores', ['Pedidos', 'M7'], ['Facturas', 'M7']),
      },
    ],
  },

  // ── Escandallos · M9 ───────────────────────────────────────────────────────
  'app.escandallos': {
    id: 'escandallos',
    nombre: 'Escandallos',
    permiso: 'app.escandallos',
    icono: IconoEscandallos,
    acento: 'var(--color-app-escandallos)',
    forma: 'lista',
    queHace: 'Lo que cuesta de verdad cada plato y el margen que deja',
    destinos: [
      {
        id: 'hoy',
        nombre: 'Hoy',
        icono: IconoAtencion,
        queContesta: '¿Qué plato ha dejado de dar margen, y por culpa de qué?',
        vistas: [],
        modulo: 'M9',
      },
      {
        id: 'fichas',
        nombre: 'Fichas',
        icono: IconoEscandallos,
        queContesta: '¿Cuánto cuesta cada plato?',
        vistas: vistas(['Todas', 'M9'], ['Bajo objetivo', 'M9'], ['Sin coste', 'M9']),
        modulo: 'M9',
      },
      {
        id: 'elaboraciones',
        nombre: 'Elaboraciones',
        icono: IconoRejilla,
        queContesta: '¿Qué se prepara antes, y cuánto cuesta esa preparación?',
        vistas: [],
        modulo: 'M9',
      },
      {
        id: 'analisis',
        nombre: 'Análisis',
        icono: IconoNegocio,
        queContesta: '¿Qué ha cambiado de coste, y qué me ha costado?',
        vistas: [],
        modulo: 'M9',
      },
    ],
  },

  // ── Carta · M10 ────────────────────────────────────────────────────────────
  'app.carta': {
    id: 'carta',
    nombre: 'Carta',
    permiso: 'app.carta',
    icono: IconoCarta,
    acento: 'var(--color-app-carta)',
    forma: 'lista',
    queHace: 'Lo que vendes, a qué precio, en qué canal y con qué margen',
    destinos: [
      {
        id: 'carta',
        nombre: 'Carta',
        icono: IconoCarta,
        queContesta: '¿Qué vendo y a qué precio?',
        vistas: vistas(['Por secciones', 'M10'], ['Todos los platos', 'M10'], ['Agotados', 'M10']),
        modulo: 'M10',
      },
      {
        id: 'menus',
        nombre: 'Menús',
        icono: IconoDocumento,
        queContesta: '¿Qué menús tengo y qué llevan?',
        vistas: [],
        modulo: 'M10',
      },
      {
        id: 'analisis',
        nombre: 'Análisis',
        icono: IconoNegocio,
        queContesta: '¿Qué funciona, qué pierde dinero y qué quitaría?',
        vistas: vistas(['Matriz', 'M10'], ['Por canal', 'M10'], ['Histórico', 'M10']),
        modulo: 'M10',
      },
    ],
  },

  // ── Calendario · M14 ───────────────────────────────────────────────────────
  'app.calendario': {
    id: 'calendario',
    nombre: 'Calendario',
    permiso: 'app.calendario',
    icono: IconoCalendario,
    acento: 'var(--color-app-calendario)',
    forma: 'calendario',
    queHace: 'Qué pasa cada día: turnos, entregas, limpiezas y revisiones',
    destinos: [
      {
        id: 'calendario',
        nombre: 'Calendario',
        icono: IconoCalendario,
        queContesta: '¿Qué pasa hoy, esta semana y este mes?',
        // **Mes, semana y dia son vistas, no destinos.** Es el mismo calendario
        // con otro aumento, y gastaba tres de las cuatro posiciones de abajo.
        vistas: vistas(['Mes', 'M14'], ['Semana', 'M14'], ['Día', 'M14']),
        modulo: 'M14',
      },
      {
        id: 'tareas',
        nombre: 'Tareas',
        icono: IconoReloj,
        queContesta: '¿Qué limpiezas, revisiones y mantenimientos toca hacer?',
        vistas: vistas(['Pendientes', 'M14'], ['Periódicas', 'M14'], ['Hechas', 'M14']),
        modulo: 'M14',
      },
      {
        id: 'turnos',
        nombre: 'Turnos',
        icono: IconoEquipo,
        queContesta: '¿Quién trabaja, cuándo, y cuánto cuesta ese cuadrante?',
        vistas: [],
        modulo: 'M14',
      },
    ],
  },

  // ── Equipo · M13, con Personas ya construida en M4 ─────────────────────────
  'app.equipo': {
    id: 'equipo',
    nombre: 'Equipo',
    permiso: 'app.equipo',
    icono: IconoEquipo,
    acento: 'var(--color-app-equipo)',
    forma: 'lista',
    queHace: 'Quién trabaja, cuándo, cuántas horas y cuánto cuesta',
    destinos: [
      {
        id: 'hoy',
        nombre: 'Hoy',
        icono: IconoAtencion,
        queContesta: '¿Quién está hoy, quién falta y qué hay que resolver?',
        vistas: [],
        modulo: 'M13',
      },
      {
        // El unico destino construido de Equipo, y lo trajo M4: dar acceso,
        // quitarlo y devolverlo.
        id: 'personas',
        nombre: 'Personas',
        icono: IconoPersona,
        queContesta: '¿Quién tiene acceso, con qué rol, y quién no ha entrado?',
        vistas: vistas('Con acceso', 'Sin entrar todavía', 'Retirados'),
      },
      {
        id: 'horarios',
        nombre: 'Horarios',
        icono: IconoCalendario,
        queContesta: '¿Cuál es el cuadrante, y cuadra con los contratos?',
        vistas: [],
        modulo: 'M14',
      },
      {
        id: 'fichajes',
        nombre: 'Fichajes',
        icono: IconoReloj,
        queContesta: '¿Cuántas horas lleva cada uno de verdad?',
        vistas: [],
        modulo: 'M15',
      },
    ],
  },

  // ── Servicio · M16 ─────────────────────────────────────────────────────────
  'app.servicio': {
    id: 'servicio',
    nombre: 'Servicio',
    permiso: 'app.servicio',
    icono: IconoServicio,
    acento: 'var(--color-app-servicio)',
    forma: 'panel',
    queHace: 'El día a día: jornada, ventas del TPV, APPCC y cierre',
    destinos: [
      {
        id: 'jornada',
        nombre: 'Jornada',
        icono: IconoServicio,
        queContesta: '¿Qué está pasando ahora mismo en el local?',
        // **El cierre es una vista de la jornada, no un destino.** Cerrar la
        // jornada es el final de la jornada, no otro sitio; y separarlo gastaba
        // una de las cuatro posiciones de la app en algo que se hace una vez al
        // día, dejando fuera el reparto.
        vistas: vistas(['En marcha', 'M16'], ['Cierre', 'M16']),
        modulo: 'M16',
      },
      {
        id: 'ventas',
        nombre: 'Ventas',
        icono: IconoNegocio,
        queContesta: '¿Qué se ha vendido, y qué consumo ha generado?',
        vistas: vistas(['Del turno', 'M20'], ['Del día', 'M20'], ['Por producto', 'M20']),
        modulo: 'M20',
      },
      {
        /*
          Delivery · el reparto, que entra por aquí.

          Es el sitio, no la integración: «ninguna integración se da por disponible
          hasta verificar sus requisitos y capacidades reales» (Evolución 1.0,
          capítulo 16), y el módulo que la construye es M29.

          Va en Servicio y no en Carta porque lo que se mira aquí son **los pedidos
          que están entrando ahora**, que es la pregunta de Servicio: «¿qué está
          pasando hoy?». Lo que se publica en cada canal y a qué precio es de
          Carta, y ahí vive con su módulo.

          Es lo mismo que se hizo con Fogón en M6 (decisión 0015): el sitio se
          decide ahora, porque dónde vive algo es navegación, y dejarlo para el
          módulo obliga a rehacer la barra cuando llegue.
        */
        id: 'delivery',
        nombre: 'Delivery',
        icono: IconoReparto,
        queContesta: '¿Qué pedidos están entrando, y de qué canal?',
        vistas: [],
        modulo: 'M29',
      },
      {
        id: 'appcc',
        nombre: 'APPCC',
        icono: IconoHecho,
        queContesta: '¿Qué controles toca hoy y cuáles se han salido de rango?',
        vistas: [],
        modulo: 'M16',
      },
    ],
  },

  // ── Negocio · M21 ──────────────────────────────────────────────────────────
  'app.negocio': {
    id: 'negocio',
    nombre: 'Negocio',
    permiso: 'app.negocio',
    icono: IconoNegocio,
    acento: 'var(--color-app-negocio)',
    forma: 'panel',
    queHace: 'Cómo va, dónde se va el margen y qué debería cambiar',
    destinos: [
      {
        id: 'resumen',
        nombre: 'Resumen',
        icono: IconoPanel,
        queContesta: '¿Cómo va el restaurante?',
        vistas: vistas(['Mes', 'M21'], ['Trimestre', 'M21'], ['Año', 'M21']),
        modulo: 'M21',
      },
      {
        // Estaba en la tabla de B5 desde el principio y **no estaba en el
        // codigo**: el catalogo ponia «Reseñas» en su sitio y la prueba que
        // deberia haberlo cazado llevaba los valores copiados a mano, asi que
        // salia en verde diciendo que todo cuadraba.
        id: 'pulse',
        nombre: 'Pulse',
        icono: IconoAtencion,
        queContesta: '¿Cuál es la salud del negocio, y qué la está bajando?',
        vistas: [],
        modulo: 'M21',
      },
      {
        id: 'costes',
        nombre: 'Costes',
        icono: IconoEscandallos,
        queContesta: '¿Dónde se va el dinero?',
        vistas: [],
        modulo: 'M21',
      },
      {
        id: 'resenas',
        nombre: 'Reseñas',
        icono: IconoCarta,
        queContesta: '¿Qué dicen de nosotros y qué hace la competencia?',
        vistas: [],
        modulo: 'M23',
      },
    ],
  },

  // ── Cuaderno · M17 ─────────────────────────────────────────────────────────
  'app.cuaderno': {
    id: 'cuaderno',
    nombre: 'Cuaderno',
    permiso: 'app.cuaderno',
    icono: IconoCuaderno,
    acento: 'var(--color-app-cuaderno)',
    forma: 'cuaderno',
    queHace: 'Qué ha ocurrido, qué hay que revisar y qué debe saber el turno siguiente',
    destinos: [
      {
        id: 'incidencias',
        nombre: 'Incidencias',
        icono: IconoAtencion,
        queContesta: '¿Qué ha pasado y qué está sin resolver?',
        vistas: vistas(['Abiertas', 'M17'], ['Cerradas', 'M17']),
        modulo: 'M17',
      },
      {
        id: 'notas',
        nombre: 'Notas',
        icono: IconoCuaderno,
        queContesta: '¿Qué tiene que saber el turno siguiente?',
        vistas: [],
        modulo: 'M17',
      },
      {
        id: 'equipos',
        nombre: 'Equipos',
        icono: IconoAjustes,
        queContesta: '¿Qué máquinas hay y cuándo les toca revisión?',
        vistas: [],
        modulo: 'M17',
      },
    ],
  },
};

/** Las ocho, en el orden de la rueda. */
export const APPS: readonly App[] = ORDEN_DE_LA_RUEDA.map((permiso) => CATALOGO[permiso]);

/** El Panel no es una de las ocho: es la pantalla de inicio y no entra en la rueda. */
export const PANEL = {
  id: 'panel',
  nombre: 'Panel',
  permiso: 'app.panel',
  icono: IconoPanel,
  acento: 'var(--color-app-panel)',
  forma: 'panel',
  destinos: [],
  queHace: 'Lo que hay que atender hoy, de un vistazo',
} as const satisfies App;

export function appPorId(id: string): App | undefined {
  return APPS.find((app) => app.id === id);
}

export function appPorPermiso(permiso: PermisoDeApp): App | undefined {
  return (CATALOGO as Partial<Record<PermisoDeApp, App>>)[permiso];
}

/**
 * Los destinos que existen de verdad, que son los que van en la barra de abajo.
 *
 * **Es la funcion que arregla las pestanas muertas.** Un destino con `modulo`
 * puesto no ha sido construido todavia: se cuenta en el menu lateral y en la
 * pantalla de «lo que llega», y no le quita el hueco a lo que si funciona.
 */
export function destinosConstruidos(app: App): readonly Destino[] {
  return app.destinos.filter((destino) => destino.modulo === undefined);
}

/** Los que todavia no estan, para poder decirlo en su sitio. */
export function destinosQueLlegan(app: App): readonly Destino[] {
  return app.destinos.filter((destino) => destino.modulo !== undefined);
}

/** Donde entra una app: su primer destino construido, o el primero que haya. */
export function dondeEntra(app: App): Destino | undefined {
  return destinosConstruidos(app)[0] ?? app.destinos[0];
}

export function destinoPorId(app: App, id: string): Destino | undefined {
  return app.destinos.find((destino) => destino.id === id);
}

/** La direccion de un destino, con su primera vista si tiene vistas. */
export function rutaDe(app: App, destino?: Destino, vista?: Vista): string {
  const elDestino = destino ?? dondeEntra(app);
  if (elDestino === undefined) return `/${app.id}`;
  const laVista = vista ?? elDestino.vistas[0];
  return laVista === undefined
    ? `/${app.id}/${elDestino.id}`
    : `/${app.id}/${elDestino.id}/${laVista.id}`;
}
