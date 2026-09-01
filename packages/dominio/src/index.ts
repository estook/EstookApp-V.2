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
  entreFactor,
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

// ── M2 · fiscal · un producto no tiene tipo; lo tiene la operacion ────────────
export {
  TERRITORIOS,
  REGIMENES,
  REGIMEN_DEL_TERRITORIO,
  NATURALEZAS,
  MODOS_DE_CONSUMO,
  CATEGORIAS_FISCALES,
  ACTIVIDADES,
  MODOS_DE_PRECIO,
  resolver,
  copiaFiscalDe,
  desglosar,
} from './fiscal.ts';

export type {
  Territorio,
  Regimen,
  Naturaleza,
  ModoDeConsumo,
  CategoriaFiscal,
  Actividad,
  ReglaFiscal,
  ContextoFiscal,
  Resolucion,
  CopiaFiscal,
  ModoDePrecio,
  LineaAFacturar,
  GrupoFiscal,
  Desglose,
} from './fiscal.ts';

// ── M2 · textos · espanol de Espana, sin jerga y sin emojis ───────────────────
export {
  JERGA_PROHIBIDA,
  revisarTexto,
  plural,
  enumerar,
  fechaEnLetra,
  fechaCorta,
  conUnidad,
  comoPorcentaje,
  haceCuanto,
} from './textos.ts';

// ── M2 · errores · que ha pasado, que se puede hacer y con que boton ──────────
export { ERRORES, errorDeEstook, comoFrase } from './errores.ts';
export type { ErrorDeEstook, CodigoDeError } from './errores.ts';

// ── M2 · recalculo · precio, elaboracion, plato, margen, aviso ────────────────
export {
  ORDEN_DEL_RECALCULO,
  DISPARADORES,
  pasosPara,
  colaPara,
  claveDeCola,
} from './recalculo.ts';
export type { PasoDelRecalculo, Disparador } from './recalculo.ts';
