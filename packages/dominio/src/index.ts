/**
 * @estook/dominio · tipos, reglas puras y calculos. Sin red y sin base de datos.
 *
 * M1 trajo el vocabulario del modelo maestro: los cuatro alcances, los doce
 * roles, los idiomas y el catalogo maestro.
 *
 * M2 trae los motores transversales. Van aqui, y no en el servidor, porque son
 * calculo puro: las mismas cuentas tienen que dar lo mismo en el servidor que en
 * la pantalla, y con un solo dueno (regla 6).
 */

// ── M1 · el modelo maestro ────────────────────────────────────────────────────
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

// ── M2 · dinero · centimos enteros, nunca coma flotante (regla 9) ─────────────
export {
  CERO,
  A_QUIEN_VA_EL_RESTO,
  centimos,
  desdeEuros,
  suma,
  resta,
  porCantidad,
  porFraccion,
  repartir,
  repartirEnPartesIguales,
  enEuros,
  conSimbolo,
} from './dinero.ts';

export type { Centimos } from './dinero.ts';

// ── M2 · tiempo · la fecha operativa la decide el servidor (regla 10) ─────────
export {
  CORTE_POR_DEFECTO,
  fechaOperativa,
  horaDeCorte,
  jornadaDe,
  fechaEnElLocal,
  masDias,
  diasEntre,
  esAnterior,
  estaVigente,
} from './tiempo.ts';

export type { FechaOperativa, HoraDeCorte } from './tiempo.ts';

// ── M2 · unidades y coste · precio ÷ (factor × rendimiento) ───────────────────
export {
  SIN_EXISTENCIAS,
  FACTOR_SIN_VERIFICAR,
  RENDIMIENTO_SIN_VERIFICAR,
  milesimas,
  cantidad,
  costePorUnidadDeUso,
  costeDeLinea,
  costeDeLineaDesdeCompra,
  precioMedioPonderado,
  valorDeLasExistencias,
  comoPrecioPorUnidad,
} from './coste.ts';

export type { Milesimas, Cantidad, Conversion, Existencias } from './coste.ts';
