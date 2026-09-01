import type { z } from 'zod';
import type { CodigoDeError } from '@estook/dominio';
import type { Permiso } from '@estook/permisos';
import type { Sql } from '../infraestructura/postgres.ts';

/**
 * El contrato de la capa de aplicacion (M2).
 *
 * Dos cosas, y solo dos:
 *
 *   CONSULTA  lee. No cambia nada, no deja evento, no necesita clave.
 *   COMANDO   cambia algo. Es idempotente, deja auditoria y puede publicar
 *             eventos.
 *
 * Es la regla 3 del Plan puesta en tipos: **el cliente llama comandos y lee
 * vistas**. Nunca escribe en una tabla de dominio.
 */

export interface Contexto {
  readonly sql: Sql;
  readonly personaId: string | null;
  readonly correlacionId: string;
  /** El instante que decide el servidor. Nunca se lee un reloj aqui (regla 10). */
  readonly ahora: Date;
}

/** Lo que puede salir mal, dicho con el catalogo de errores en cristiano. */
export class FalloDeAplicacion extends Error {
  constructor(
    readonly codigo: CodigoDeError,
    readonly detalle?: Record<string, unknown>,
  ) {
    super(codigo);
    this.name = 'FalloDeAplicacion';
  }
}

export interface Consulta<Entrada, Salida> {
  readonly nombre: string;
  readonly entrada: z.ZodType<Entrada>;
  /** Que hace falta para poder preguntarlo. Vacio = con estar dentro basta. */
  readonly exige?: Permiso;
  ejecutar(contexto: Contexto, entrada: Entrada): Promise<Salida>;
}

export interface Comando<Entrada, Salida> {
  readonly nombre: string;
  readonly entrada: z.ZodType<Entrada>;
  readonly exige?: Permiso;
  ejecutar(contexto: Contexto, entrada: Entrada): Promise<Salida>;
}

/** Azucar para declararlos sin repetir el tipo. */
export function consulta<Entrada, Salida>(c: Consulta<Entrada, Salida>): Consulta<Entrada, Salida> {
  return c;
}

export function comando<Entrada, Salida>(c: Comando<Entrada, Salida>): Comando<Entrada, Salida> {
  return c;
}
