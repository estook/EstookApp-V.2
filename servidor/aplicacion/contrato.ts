import type { z } from 'zod';
import type { CodigoDeError } from '@estook/dominio';
import type { Permiso } from '@estook/permisos';
import type { SesionViva, Sql } from '../infraestructura/postgres.ts';

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
  /**
   * Quien pregunta. Desde M4 **no lo dice el cliente**: sale de resolver el
   * token de sesion contra la base de datos.
   */
  readonly personaId: string | null;
  readonly correlacionId: string;
  /** El instante que decide el servidor. Nunca se lee un reloj aqui (regla 10). */
  readonly ahora: Date;
  /**
   * La sesion viva, con su contexto (M4).
   *
   * De aqui sale el local que se esta mirando, y no de lo que mande el cliente:
   * fiarse del identificador que llega en la peticion es el error tipico que M1
   * avisa de no cometer. Cambiar de local cambia esta fila, no abre sesion nueva.
   */
  readonly sesion: SesionViva | null;
}

/**
 * Lo que puede salir mal, dicho con el catalogo de errores en cristiano.
 *
 * Escrito sin propiedades de constructor a proposito: asi el fichero se puede
 * ejecutar tal cual en cualquier sitio que solo sepa quitar los tipos, sin
 * compilar. Es lo que permite arrancar la API contra Supabase sin construir nada.
 */
export class FalloDeAplicacion extends Error {
  readonly codigo: CodigoDeError;
  readonly detalle: Record<string, unknown> | undefined;

  constructor(codigo: CodigoDeError, detalle?: Record<string, unknown>) {
    super(codigo);
    this.name = 'FalloDeAplicacion';
    this.codigo = codigo;
    this.detalle = detalle;
  }
}

/**
 * Las tres puertas que M4 pone delante de cada operacion.
 *
 * Ninguna es opcional por comodidad: cada una existe porque hay un estado en el
 * que dejar pasar seria un fallo de seguridad, y **la excepcion se declara en la
 * operacion**, no se comprueba a mano dentro de ella. Lo que se comprueba a mano
 * se olvida en la operacion numero cuarenta.
 */
export interface Puertas {
  /**
   * Se puede llamar sin haber entrado. Solo `entrar`, y las publicas del dia que
   * exista la carta digital (M11).
   */
  readonly sinSesion?: true;
  /**
   * **Lo que devuelve lleva un secreto**, asi que no se guarda para repetirlo.
   *
   * La idempotencia de M2 guarda la respuesta de la primera vez en
   * `estook.clave_de_idempotencia` y la devuelve tal cual en los reintentos. Eso
   * esta bien para «se ha apuntado la merma»; para un token de sesion, un PIN o
   * el secreto del segundo factor **es guardar la credencial en una tabla**,
   * durante veinticuatro horas, y en claro.
   *
   * Y seria absurdo: la sesion guarda solo la huella del token justamente para
   * que quien se lleve la base de datos no se lleve ninguna sesion. Guardar el
   * token al lado tiraria esa decision a la basura.
   *
   * Asi que estos comandos **no se recuerdan**. Un reintento vuelve a
   * ejecutarlos y genera otro secreto: otra sesion, otro PIN. Es lo correcto:
   * los dos son baratos, el viejo deja de valer, y nadie se queda con una
   * credencial en un sitio donde no tiene que estar.
   */
  readonly conSecreto?: true;
  /**
   * Se puede llamar con la sesion a medias, esperando el segundo factor. Solo lo
   * que hace falta para terminarlo o para irse.
   */
  readonly aunSinDobleFactor?: true;
  /**
   * Se puede llamar cuando hay que cambiar la contrasena antes de nada. Solo
   * cambiarla y salir.
   */
  readonly aunConClavePorCambiar?: true;
}

export interface Consulta<Entrada, Salida> extends Puertas {
  readonly nombre: string;
  readonly entrada: z.ZodType<Entrada>;
  /** Que hace falta para poder preguntarlo. Vacio = con estar dentro basta. */
  readonly exige?: Permiso;
  ejecutar(contexto: Contexto, entrada: Entrada): Promise<Salida>;
}

export interface Comando<Entrada, Salida> extends Puertas {
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
