/**
 * Los entornos de Estook (M0).
 *
 * Son tres mas el de demostracion:
 *   desarrollo    · la maquina de quien programa
 *   pruebas       · la que levanta la integracion continua, efimera
 *   demostracion  · el restaurante ficticio con el que se hacen las capturas
 *   produccion    · los locales de verdad
 *
 * Nadie lee `process.env` ni `import.meta.env` fuera de aqui.
 */
export const ENTORNOS = ['desarrollo', 'pruebas', 'demostracion', 'produccion'] as const;

export type Entorno = (typeof ENTORNOS)[number];

export function esEntorno(valor: unknown): valor is Entorno {
  return typeof valor === 'string' && (ENTORNOS as readonly string[]).includes(valor);
}

/**
 * Resuelve el entorno a partir de un mapa de variables, sin suponer donde corre.
 * Si no viene nada, es `desarrollo`: el entorno que menos dano hace equivocandose.
 */
export function resolverEntorno(variables: Record<string, string | undefined>): Entorno {
  const declarado = variables['VITE_ENTORNO'] ?? variables['ENTORNO'];
  return esEntorno(declarado) ? declarado : 'desarrollo';
}

/** En produccion no se ensena nada que no este verificado. */
export function esProduccion(entorno: Entorno): boolean {
  return entorno === 'produccion';
}

/** El entorno de demostracion lleva datos ficticios y se puede ensenar a cualquiera. */
export function esDemostracion(entorno: Entorno): boolean {
  return entorno === 'demostracion';
}
