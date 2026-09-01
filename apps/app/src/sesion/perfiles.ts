import type { Nivel, Permiso, PermisosResueltos } from '@estook/permisos';

/**
 * Los perfiles de muestra · andamio de M3, lo tira M4.
 *
 * ── Por que existe esto ──────────────────────────────────────────────────────
 *
 * Un criterio de terminado de M3 es que **la rueda reparta los sectores entre
 * las apps que el rol tiene**. Comprobarlo hace falta saber que tiene cada rol, y
 * eso lo dice el servidor con `mis_permisos`... a quien haya entrado. Y entrar es
 * M4.
 *
 * Dejarlo sin comprobar hasta M4 seria dar M3 por bueno «al 90 %», que es justo
 * lo que el Plan prohibe. Asi que se pone un andamio: seis perfiles que copian
 * **los de las semillas de verdad**, para poder ver hoy que la rueda de Sara
 * tiene cuatro sectores y la de Rosa ocho.
 *
 * ── Y por que no miente ──────────────────────────────────────────────────────
 *
 * Los niveles de aqui **no estan inventados**: salen de la matriz de
 * `0004_matriz_de_roles.sql`, que es su unico dueno (regla 6). Y para que no se
 * queden atras el dia que la matriz cambie, hay una prueba contra Postgres de
 * verdad —`perfiles.prueba.ts`— que compara los dos y falla si dejan de cuadrar.
 *
 * Es andamio, pero es andamio que no puede mentir sin que salte una prueba.
 */
export interface PerfilDeMuestra {
  readonly id: string;
  readonly nombre: string;
  readonly rol: string;
  readonly donde: string;
  readonly permisos: PermisosResueltos;
}

const V = 'ver' satisfies Nivel;
const VE = 'ver_y_editar' satisfies Nivel;

function permisos(pares: readonly (readonly [Permiso, Nivel])[]): PermisosResueltos {
  return Object.fromEntries(pares);
}

/**
 * Camarero. «No ve costes, ni ventas, ni el cuadrante completo, ni datos de
 * otros.» Cuatro sectores en la rueda.
 */
const CAMARERO = permisos([
  ['app.panel', V],
  ['app.calendario', V],
  ['app.carta', V],
  ['app.servicio', V],
  ['app.cuaderno', VE],
  ['app.fogon', V],
  ['accion.fichar', VE],
  ['accion.registrar_merma', VE],
  ['accion.marcar_agotado', VE],
]);

/** Cocinero. «No ve ningun importe.» Cinco sectores. */
const COCINERO = permisos([
  ['app.panel', V],
  ['app.escandallos', V],
  ['app.inventario', VE],
  ['app.servicio', VE],
  ['app.calendario', V],
  ['app.cuaderno', VE],
  ['app.fogon', V],
  ['accion.fichar', VE],
  ['accion.registrar_merma', VE],
  ['accion.marcar_agotado', VE],
]);

/** Jefe de cocina. Siete sectores: le falta Negocio. */
const JEFE_DE_COCINA = permisos([
  ['app.panel', V],
  ['app.inventario', VE],
  ['app.escandallos', VE],
  ['app.carta', VE],
  ['app.servicio', VE],
  ['app.calendario', VE],
  ['app.cuaderno', VE],
  ['app.equipo', V],
  ['app.fogon', VE],
  ['app.ajustes', V],
  ['dato.precio_de_compra', VE],
  ['dato.coste_de_plato', VE],
  ['dato.cuadrante_completo', V],
  ['accion.fichar', VE],
  ['accion.registrar_merma', VE],
  ['accion.marcar_agotado', VE],
  ['accion.cerrar_recuento', VE],
  ['accion.publicar_cuadrante', VE],
]);

/** Gerente: todo lo de su local. Las ocho. Y el area manager, lo mismo. */
const GERENTE = permisos([
  ['app.panel', VE],
  ['app.inventario', VE],
  ['app.escandallos', VE],
  ['app.carta', VE],
  ['app.calendario', VE],
  ['app.equipo', VE],
  ['app.servicio', VE],
  ['app.negocio', VE],
  ['app.cuaderno', VE],
  ['app.fogon', VE],
  ['app.ajustes', VE],
  ['dato.precio_de_compra', VE],
  ['dato.coste_de_plato', VE],
  ['dato.coste_de_personal', VE],
  ['dato.ventas', VE],
  ['dato.datos_del_equipo', VE],
  ['dato.cuadrante_completo', VE],
  ['accion.fichar', VE],
  ['accion.registrar_merma', VE],
  ['accion.marcar_agotado', VE],
  ['accion.cerrar_recuento', VE],
  ['accion.publicar_carta', VE],
  ['accion.publicar_cuadrante', VE],
  ['accion.invitar_personas', VE],
  ['accion.conectar_tpv', VE],
  ['accion.poner_objetivos', VE],
]);

/**
 * Direccion: lo mismo mas facturacion, la gestoria y lo de organizacion.
 * Nadie, tampoco ella, ve los directos ajenos del chat.
 */
const DIRECCION = permisos([
  ...Object.entries(GERENTE).map(([p, n]) => [p, n] as [Permiso, Nivel]),
  ['app.gestoria', VE],
  ['dato.facturacion', VE],
  ['accion.gestionar_locales', VE],
  ['accion.catalogo_maestro', VE],
  ['accion.contratos_marco', VE],
  ['accion.exportar_contabilidad', VE],
]);

/**
 * Los seis, copiados de `base-de-datos/semillas/personas.sql`.
 *
 * En este orden a proposito: primero el que menos ve. Asi lo primero que se abre
 * al arrancar es la rueda de cuatro sectores, y no la de ocho, que es la que
 * disimula los fallos de reparto.
 */
export const PERFILES_DE_MUESTRA = [
  {
    id: 'sara',
    nombre: 'Sara Nunez',
    rol: 'Camarera',
    donde: 'Bar Centro',
    permisos: CAMARERO,
  },
  {
    id: 'marcos',
    nombre: 'Marcos Vega',
    rol: 'Cocinero',
    donde: 'Bar Centro',
    permisos: COCINERO,
  },
  {
    id: 'luis',
    nombre: 'Luis Amunarriz',
    rol: 'Jefe de cocina',
    donde: 'Bar Puerto · Grupo Costa',
    permisos: JEFE_DE_COCINA,
  },
  {
    id: 'rosa',
    nombre: 'Rosa Iglesias',
    rol: 'Gerente',
    donde: 'Bar Centro',
    permisos: GERENTE,
  },
  {
    id: 'ignacio',
    nombre: 'Ignacio Bordas',
    rol: 'Area manager',
    donde: 'Zona Norte · Grupo Costa',
    permisos: GERENTE,
  },
  {
    id: 'elena',
    nombre: 'Elena Prat',
    rol: 'Direccion',
    donde: 'Grupo Costa',
    permisos: DIRECCION,
  },
] as const satisfies readonly PerfilDeMuestra[];

/** El rol de cada perfil tal como se llama en la base de datos, para la prueba. */
export const ROL_EN_LA_BASE_DE_DATOS: Readonly<Record<string, string>> = {
  sara: 'camarero',
  marcos: 'cocinero',
  luis: 'jefe_de_cocina',
  rosa: 'gerente',
  ignacio: 'area_manager',
  elena: 'direccion',
};
