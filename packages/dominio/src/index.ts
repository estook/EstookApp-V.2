/**
 * @estook/dominio · tipos, reglas puras y calculos. Sin red y sin base de datos.
 *
 * En M1 entra el vocabulario del modelo maestro: los cuatro alcances, los doce
 * roles, los idiomas y el catalogo maestro. Los motores de dinero, unidades,
 * coste, fiscal y tiempo entran en M2 y no antes.
 */
export {
  ALCANCES,
  ALCANCES_DE_MEMBRESIA,
  ROLES,
  ALCANCE_DEL_ROL,
  IDIOMAS,
  NOMBRE_DEL_IDIOMA,
  POLITICAS_MAESTRAS,
  TIPOS_MAESTROS,
  NUNCA_SE_HEREDA,
} from './alcances.ts';

export type {
  Alcance,
  AlcanceDeMembresia,
  Rol,
  Idioma,
  PoliticaMaestra,
  TipoMaestro,
} from './alcances.ts';
