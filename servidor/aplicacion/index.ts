/**
 * servidor/aplicacion · un fichero por comando y por consulta.
 *
 * Orquesta: abre transaccion, llama al caso de uso, escribe en la bandeja de
 * salida. Habla con **puertos**, nunca con Postgres directamente: quien enchufa
 * la implementacion de verdad es `servidor/index.ts`.
 */
export { catalogo } from './catalogo.ts';
export { crearDespachador } from './despachador.ts';
export type { Despachador, Puertos, QuienLlama, Resultado } from './despachador.ts';
export { FalloDeAplicacion, comando, consulta } from './contrato.ts';
export type { Comando, Consulta, Contexto } from './contrato.ts';
// Los fallos, por una sola puerta (repaso del 10-oct · 0082): la API los apunta por aquí.
export {
  apuntarUnFallo,
  hayAvisadorDeFallos,
  ponerElAvisadorDeFallos,
} from '../infraestructura/fallos.ts';
