import { cambiarMiIdioma } from './comandos/cambiar-mi-idioma.ts';
import { misLocales } from './consultas/mis-locales.ts';
import { unLocal } from './consultas/un-local.ts';
import type { Comando, Consulta } from './contrato.ts';

/**
 * Un fichero por comando y por consulta, y este catalogo que los junta.
 *
 * Anadir una operacion es anadir un fichero y una linea aqui. Ni la API ni el
 * despachador cambian nunca.
 */
export const catalogo = {
  consultas: {
    [misLocales.nombre]: misLocales,
    [unLocal.nombre]: unLocal,
  } as Record<string, Consulta<never, unknown>>,

  comandos: {
    [cambiarMiIdioma.nombre]: cambiarMiIdioma,
  } as Record<string, Comando<never, unknown>>,
};
