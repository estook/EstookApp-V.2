/**
 * Los cuatro niveles de alcance del Manifiesto.
 *
 *   ORGANIZACION   la empresa que contrata. De 1 a 40 locales
 *     ├── AREA     agrupacion opcional: «Zona Norte», «Madrid»
 *     ├── LOCAL    el restaurante. Donde ocurre la operacion
 *     └── PERSONA  lo tuyo: tus horas, tu horario, tus fichas
 *
 * Un local independiente usa un solo nivel y no ve la palabra «area» en ninguna
 * parte. Una cadena de doce usa los cuatro. La misma aplicacion.
 */
export const ALCANCES = ['organizacion', 'area', 'local', 'persona'] as const;
export type Alcance = (typeof ALCANCES)[number];

/** Los alcances en los que se puede conceder una membresia. */
export const ALCANCES_DE_MEMBRESIA = ['organizacion', 'area', 'local'] as const;
export type AlcanceDeMembresia = (typeof ALCANCES_DE_MEMBRESIA)[number];

/**
 * Los doce roles. Seis de organizacion, uno de area y cinco de local.
 * El catalogo es cerrado: un rol nuevo es una decision de producto.
 */
export const ROLES = [
  'direccion',
  'administrador_de_cuenta',
  'chef_corporativo',
  'compras_central',
  'rrhh',
  'gestoria',
  'area_manager',
  'gerente',
  'jefe_de_cocina',
  'jefe_de_sala',
  'cocinero',
  'camarero',
] as const;
export type Rol = (typeof ROLES)[number];

export const ALCANCE_DEL_ROL: Readonly<Record<Rol, AlcanceDeMembresia>> = {
  direccion: 'organizacion',
  administrador_de_cuenta: 'organizacion',
  chef_corporativo: 'organizacion',
  compras_central: 'organizacion',
  rrhh: 'organizacion',
  gestoria: 'organizacion',
  area_manager: 'area',
  gerente: 'local',
  jefe_de_cocina: 'local',
  jefe_de_sala: 'local',
  cocinero: 'local',
  camarero: 'local',
};

/**
 * Interfaz en espanol, catalan, gallego, euskera e ingles, elegida por persona y
 * no por local: en la misma cocina puede haber quien la quiera en castellano y
 * quien la quiera en ingles.
 */
export const IDIOMAS = ['es', 'ca', 'gl', 'eu', 'en'] as const;
export type Idioma = (typeof IDIOMAS)[number];

export const NOMBRE_DEL_IDIOMA: Readonly<Record<Idioma, string>> = {
  es: 'Espanol',
  ca: 'Catala',
  gl: 'Galego',
  eu: 'Euskara',
  en: 'English',
};

/** Las tres politicas del catalogo maestro de una cadena. */
export const POLITICAS_MAESTRAS = ['obligatorio', 'sugerido', 'libre'] as const;
export type PoliticaMaestra = (typeof POLITICAS_MAESTRAS)[number];

/** Lo que puede vivir en el catalogo maestro de una organizacion o de un area. */
export const TIPOS_MAESTROS = [
  'producto',
  'receta',
  'carta',
  'plantilla_appcc',
  'plantilla_tarea',
  'objetivo',
] as const;
export type TipoMaestro = (typeof TIPOS_MAESTROS)[number];

/** Lo que nunca se hereda del catalogo maestro. Es del local, siempre. */
export const NUNCA_SE_HEREDA = [
  'stock',
  'albaranes',
  'precios de compra reales',
  'fichajes',
  'canales de chat',
] as const;
