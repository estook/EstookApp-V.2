/**
 * @estook/utiles · fechas, dinero, unidades, formatos, banderas y registro.
 *
 * En M0 solo vive aqui lo transversal que hace falta para arrancar: entorno,
 * banderas de funcion, correlacion y registro. Los motores de dinero, unidades,
 * tiempo y textos entran en M2 y no antes.
 */
export { ENTORNOS, esEntorno, resolverEntorno, esProduccion, esDemostracion } from './entorno.ts';
export type { Entorno } from './entorno.ts';

export { BANDERAS, banderaEncendida, estadoDeLasBanderas } from './banderas.ts';
export type { NombreDeBandera } from './banderas.ts';

export {
  CABECERA_CORRELACION,
  CABECERA_SESION,
  esCorrelacionId,
  esSesionId,
  nuevaCorrelacionId,
  nuevaSesionId,
  correlacionIdDeEntrada,
  sesionIdDeEntrada,
} from './correlacion.ts';

export { crearRegistro } from './registro.ts';
export type { Registro, Linea, Nivel, OpcionesDeRegistro } from './registro.ts';
