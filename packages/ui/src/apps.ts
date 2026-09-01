import {
  IconoCalendario,
  IconoCarta,
  IconoCuaderno,
  IconoEquipo,
  IconoEscandallos,
  IconoInventario,
  IconoNegocio,
  IconoPanel,
  IconoServicio,
  type Icono,
} from '@estook/iconos';
import { ORDEN_DE_LA_RUEDA, type PermisoDeApp } from '@estook/permisos';

/** Solo las ocho de la rueda. El Panel, Fogon, Ajustes y la gestoria no lo son. */
type AppDeLaRueda = (typeof ORDEN_DE_LA_RUEDA)[number];

/**
 * Las ocho apps · tablas de B3 y B5 del Plan.
 *
 * **Este fichero es el unico dueno de «que apps hay».** El icono, el acento, la
 * ruta y las pestanas de cada una salen de aqui, y de ningun otro sitio: es la
 * regla 6 (un calculo, un unico dueno) aplicada a la navegacion. Si el acento de
 * Inventario se cambia aqui, cambia en la rueda, en la cabecera y en el Panel a
 * la vez, porque no esta escrito en ningun otro lado.
 *
 * El orden es el de la rueda, y viene de `@estook/permisos`, que es quien sabe
 * cuales se ensenan a cada rol.
 *
 * «El acento se usa con moderacion: el icono de la app, la linea superior de su
 * cabecera y el sector de la rueda. **El fondo y los botones no cambian de color
 * entre apps**, o pareceria cuatro productos distintos.» (B3)
 */
export interface App {
  /** El trozo de la ruta: `/inventario`. */
  readonly id: string;
  readonly nombre: string;
  /** El permiso que hay que tener para verla. Sin el, no aparece en ningun sitio. */
  readonly permiso: PermisoDeApp;
  readonly icono: Icono;
  /** La variable de color, no el color: el valor vive en las fichas de B1. */
  readonly acento: string;
  /**
   * Sus pestanas, tal cual la tabla de B5. Maximo cuatro, y «Mas» si hicieran
   * falta cinco. La primera es su pantalla de inicio.
   */
  readonly pestanas: readonly { readonly id: string; readonly nombre: string }[];
  /** Una frase de que hace, para el estado vacio y para la rueda en rejilla. */
  readonly queHace: string;
}

function pestanas(...nombres: readonly string[]) {
  return nombres.map((nombre) => ({
    id: nombre.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''),
    nombre,
  }));
}

const CATALOGO: Record<AppDeLaRueda, App> = {
  'app.inventario': {
    id: 'inventario',
    nombre: 'Inventario',
    permiso: 'app.inventario',
    icono: IconoInventario,
    acento: 'var(--color-app-inventario)',
    pestanas: pestanas('Hoy', 'Productos', 'Pedidos', 'Mas'),
    queHace: 'Que hay, que falta y que se ha ido sin explicacion',
  },
  'app.escandallos': {
    id: 'escandallos',
    nombre: 'Escandallos',
    permiso: 'app.escandallos',
    icono: IconoEscandallos,
    acento: 'var(--color-app-escandallos)',
    pestanas: pestanas('Hoy', 'Fichas', 'Elaboraciones', 'Mas'),
    queHace: 'Lo que cuesta de verdad cada plato',
  },
  'app.carta': {
    id: 'carta',
    nombre: 'Carta',
    permiso: 'app.carta',
    icono: IconoCarta,
    acento: 'var(--color-app-carta)',
    pestanas: pestanas('Carta', 'Menus', 'Analisis', 'Mas'),
    queHace: 'Lo que vendes, a que precio y con que margen',
  },
  'app.calendario': {
    id: 'calendario',
    nombre: 'Calendario',
    permiso: 'app.calendario',
    icono: IconoCalendario,
    acento: 'var(--color-app-calendario)',
    pestanas: pestanas('Mes', 'Semana', 'Dia', 'Mas'),
    queHace: 'Que pasa cada dia en el local: turnos, limpiezas, entregas',
  },
  'app.equipo': {
    id: 'equipo',
    nombre: 'Equipo',
    permiso: 'app.equipo',
    icono: IconoEquipo,
    acento: 'var(--color-app-equipo)',
    pestanas: pestanas('Hoy', 'Personas', 'Fichajes', 'Mas'),
    queHace: 'Quien trabaja, cuando y cuanto cuesta',
  },
  'app.servicio': {
    id: 'servicio',
    nombre: 'Servicio',
    permiso: 'app.servicio',
    icono: IconoServicio,
    acento: 'var(--color-app-servicio)',
    pestanas: pestanas('Jornada', 'Ventas', 'APPCC', 'Mas'),
    queHace: 'El dia a dia: jornada, ventas del TPV, APPCC y cierre',
  },
  'app.negocio': {
    id: 'negocio',
    nombre: 'Negocio',
    permiso: 'app.negocio',
    icono: IconoNegocio,
    acento: 'var(--color-app-negocio)',
    pestanas: pestanas('Resumen', 'Costes', 'Resenas', 'Mas'),
    queHace: 'Como va, donde se va el margen, resenas y competencia',
  },
  'app.cuaderno': {
    id: 'cuaderno',
    nombre: 'Cuaderno',
    permiso: 'app.cuaderno',
    icono: IconoCuaderno,
    acento: 'var(--color-app-cuaderno)',
    // Tres, no cuatro: la tabla de B5 le da tres y no hace falta un «Mas».
    pestanas: pestanas('Incidencias', 'Notas', 'Equipos'),
    queHace: 'Notas, incidencias del turno y mantenimiento',
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
  pestanas: [],
  queHace: 'Lo que hay que atender hoy, de un vistazo',
} as const satisfies App;

export function appPorId(id: string): App | undefined {
  return APPS.find((app) => app.id === id);
}

export function appPorPermiso(permiso: PermisoDeApp): App | undefined {
  return (CATALOGO as Partial<Record<PermisoDeApp, App>>)[permiso];
}
