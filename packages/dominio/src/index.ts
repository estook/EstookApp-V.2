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
} from './fiscal/index.ts';

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
} from './fiscal/index.ts';

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

// ── M4 · a donde se entra · las seis comprobaciones ──────────────────────────
export { DESTINOS, aDondeEntra } from './destino.ts';
export type { Destino, QuienAcabaDeEntrar, ResolucionDeDestino } from './destino.ts';

// ── M5 · el alta de un local · los ocho pasos ────────────────────────────────
export {
  PASOS_DEL_ALTA,
  CODIGOS_DE_PASO,
  CUANTOS_PASOS,
  esPasoDelAlta,
  pasoNumero,
  numeroDelPaso,
  TIPOS_DE_LOCAL,
  NOMBRE_DEL_TIPO,
  esTipoDeLocal,
  CLAVES_DE_OBJETIVO,
  NOMBRE_DEL_OBJETIVO,
  QUE_ES_EL_OBJETIVO,
  esClaveDeObjetivo,
  comoVa,
} from './onboarding.ts';

export type {
  PasoDelAlta,
  TipoDeLocal,
  ClaveDeObjetivo,
  ComoVaElAlta,
  Progreso,
} from './onboarding.ts';

// ── M4 · las reglas de acceso que la pantalla tambien necesita ───────────────
//
// El minimo de la contraseña lo comprueba el servidor, y ahi se queda la
// decision. Aqui vive el numero, para que el texto de ayuda de la pantalla y la
// regla que la rechaza no puedan discrepar (regla 6).
export { LARGO_MINIMO_DE_CLAVE, claveDeUnSoloUso } from './acceso.ts';

// ── M5 · parecido por trigramas · el mismo metodo que pg_trgm ────────────────
//
// Vivia en `@estook/ui` desde M3. Se muda aqui porque el servidor lo necesita
// para proponer el mapeo de columnas de una importacion, y copiarlo habria roto
// la regla 6. `@estook/ui` lo reexporta.
export { sinAcentos, trigramas, parecido, comoCodigo } from './parecido.ts';

// ── M5 · el catalogo de referencia ───────────────────────────────────────────
export {
  UNIDADES_DE_USO,
  esUnidadDeUso,
  ALERGENOS,
  NOMBRE_DEL_ALERGENO,
  esAlergeno,
  comoSaleElCoste,
} from './referencia.ts';

export type { UnidadDeUso, Alergeno } from './referencia.ts';

// ── M6 · inventario · el libro de movimientos y la capa que predice ──────────
//
// Toda la aritmetica del stock vive aqui y no en la base de datos: el precio
// medio ponderado ya tenia dueno en `coste.ts` desde M2, y escribirlo otra vez
// en un disparador de Postgres serian dos duenos del mismo calculo (regla 6).
export {
  TIPOS_DE_MOVIMIENTO,
  CAMARA_VACIA,
  VENTANA_DE_CONSUMO,
  DIAS_MINIMOS_PARA_PREDECIR,
  DIAS_DE_COBERTURA_OBJETIVO,
  ESTADOS_DEL_STOCK,
  NOMBRE_DEL_ESTADO,
  esTipoDeMovimiento,
  siguienteEstado,
  reconstruir,
  ajusteHasta,
  consumoMedioDiario,
  diasDeCobertura,
  previsionDeAgotamiento,
  diaDeAgotamiento,
  comoEsta,
  urgenciaDe,
  pedidoRecomendado,
  comoHaCambiado,
} from './inventario.ts';

export type {
  TipoDeMovimiento,
  EstadoDelStock,
  Movimiento,
  Salida,
  Consumo,
  EstadoDeExistencias,
  Sugerencia,
  CambioDePrecio,
} from './inventario.ts';
