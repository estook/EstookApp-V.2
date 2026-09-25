import type { z } from 'zod';
import type { CodigoDeError } from '@estook/dominio';
import type { Permiso } from '@estook/permisos';
import type { AlmacenDeFicheros } from '../infraestructura/almacen.ts';
import type { CorreoSaliente } from '../infraestructura/correo.ts';
import type { LugaresDeGoogle } from '../infraestructura/google.ts';
import type { IdentidadDeGoogle } from '../infraestructura/identidad-de-google.ts';
import type { Pagos } from '../infraestructura/stripe.ts';
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
  /**
   * Donde acaban los ficheros (M5). Nulo cuando no hay ninguno enchufado, y
   * entonces subir un logo **dice que no se puede** en vez de romperse.
   *
   * Es un puerto, como `sql`: la capa de aplicacion no sabe si detras hay
   * Supabase Storage o un mapa en memoria.
   */
  readonly almacen: AlmacenDeFicheros | null;
  /**
   * Google Places (M7, entrega 5). Nulo sin clave, y entonces buscar el local
   * **dice que Google no está conectado** en vez de romperse (0022, 0040).
   */
  readonly google: LugaresDeGoogle | null;
  /**
   * El correo que sale (0042). Nulo sin `RESEND_API_KEY`, y entonces crear cuenta
   * con correo **dice que todavía no se puede** en vez de romperse.
   */
  readonly correo: CorreoSaliente | null;
  /** Entrar con Google (0042). Nulo sin el cliente de OAuth y su secreto. */
  readonly identidadDeGoogle: IdentidadDeGoogle | null;
  /**
   * El pago, con Stripe (0048). Nulo sin `STRIPE_SECRET_KEY`, y entonces pagar
   * **dice que el pago no está abierto** en vez de romperse.
   */
  readonly pagos: Pagos | null;
  /**
   * Desde qué dirección llega la petición, tal como la ve la API, o nulo (0041).
   *
   * **Solo para la auditoría del admin.** No decide nada: una dirección se puede
   * falsear y cambia en cada red móvil. Sirve para leer después «desde dónde se
   * hizo», que es lo que se pregunta cuando algo no cuadra.
   */
  readonly desde: string | null;
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
  /**
   * **Lo escrito antes de fallar se guarda** (repaso de la 0042).
   *
   * Un fallo normal deshace la transacción entera, y es lo que se quiere casi
   * siempre. Pero hay fallos que **son** el dato: el intento de contraseña que
   * no cuadra tiene que quedar contado, o el bloqueo a los cinco intentos no
   * bloquea nunca. Y eso es exactamente lo que pasaba desde M4: `entrar` apuntaba
   * el intento, fallaba, y el fallo se llevaba el apunte por delante.
   *
   * Solo se usa donde se ha escrito a propósito lo que hay que conservar.
   */
  readonly conservarLoHecho: boolean;

  constructor(
    codigo: CodigoDeError,
    detalle?: Record<string, unknown>,
    opciones?: { readonly conservarLoHecho?: true },
  ) {
    super(codigo);
    this.name = 'FalloDeAplicacion';
    this.codigo = codigo;
    this.detalle = detalle;
    this.conservarLoHecho = opciones?.conservarLoHecho === true;
  }
}

/** Un fallo que no deshace lo escrito antes de él. Ver `conservarLoHecho`. */
export function falloQueSeGuarda(
  codigo: CodigoDeError,
  detalle?: Record<string, unknown>,
): FalloDeAplicacion {
  return new FalloDeAplicacion(codigo, detalle, { conservarLoHecho: true });
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
   * **Se repite cada poco y da igual cuántas veces llegue**, así que tampoco se
   * recuerda (23-sep-2026).
   *
   * Es el «sigo aquí» de la app abierta: uno por minuto y aparato, todo el día.
   * Guardarlos en `estook.clave_de_idempotencia` sería llenar esa tabla de avisos
   * que no hay que repetir nunca, porque repetirlo ya es lo mismo: «se le vio ahora».
   * Solo lo declara lo que es así de verdad; lo que suma, resta o crea algo se
   * recuerda siempre.
   */
  readonly sinRecordar?: true;
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
  /**
   * Se puede llamar desde una visita de demostracion (M5).
   *
   * «Modo demostracion aparte, con un restaurante ficticio entero. Se entra y se
   *  sale **sin dejar rastro**» (Manifiesto 8).
   *
   * Y la forma de que no quede rastro no es limpiar despues —eso necesitaria un
   * proceso de fondo que todavia no existe, y un fallo a mitad dejaria datos de
   * mentira dentro del restaurante de ejemplo—, sino **no dejar escribir**.
   *
   * Asi que una visita de demostracion puede consultar todo lo que quiera y no
   * puede ejecutar ningun comando, salvo los que declaren esto: salir, y poco
   * mas. Se comprueba en el despachador, en el mismo sitio que las tres puertas
   * de M4, porque lo que se comprueba a mano se olvida en la operacion numero
   * cuarenta.
   */
  readonly enDemostracion?: true;
  /**
   * **Se puede aunque la cuenta no esté pagada** (0048).
   *
   * «Sin pago no hay app» (Richi, 25-sep): con la cuenta sin pagar no pasa nada,
   * y en solo lectura no pasa ningún comando. Lo que sí tiene que pasar para poder
   * pagar o irse —quién soy, la suscripción, pagar, el portal, salir, la
   * contraseña— lo declara aquí. **Lo que no dice nada queda cerrado**, así que una
   * operación nueva no abre un agujero por olvidarse de esto. Lo cumple el
   * despachador, que es la quinta puerta.
   */
  readonly sinPagar?: true;
  /**
   * **Solo para el admin** (0041). La operación exige una sesión abierta desde el
   * admin, de una persona con acceso vivo y **con el segundo factor montado**.
   *
   * Lo comprueba el despachador antes de ejecutar nada, igual que las otras
   * puertas. Y al revés también: una sesión del admin no vale para ninguna
   * operación que no lo declare, así que un token del admin robado no abre la
   * app de nadie, y uno de la app no abre el admin.
   */
  readonly soloAdmin?: true;
  /** Además de admin, con este nivel. Hoy solo existe la exigencia de «total». */
  readonly nivelDeAdmin?: 'total';
  /**
   * Una operación de la app que también se usa desde el admin: salir, cambiar la
   * contraseña y montar el segundo factor. Son de la persona, no del sitio.
   */
  readonly tambienEnElAdmin?: true;
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
