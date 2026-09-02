/**
 * Catálogo de errores en cristiano (M2).
 *
 * La regla del Plan, en B4: **«todo error dice qué ha pasado, qué se puede hacer
 * y con qué botón»**. Nunca un código, nunca un «error inesperado», nunca el
 * mensaje que devolvió la base de datos.
 *
 * El catálogo es cerrado. Un error que no esté aquí no existe, igual que un
 * permiso que no esté en su catálogo. Así no acaban apareciendo mensajes sueltos
 * escritos con prisa a las tres de la mañana.
 */

export interface ErrorDeEstook {
  /** Para los registros y para que dos personas hablen del mismo error. */
  readonly codigo: string;
  /** Qué ha pasado, en una frase, sin culpar a nadie. */
  readonly quePasa: string;
  /** Qué puede hacer quien lo está leyendo. Siempre hay algo. */
  readonly queSePuedeHacer: string;
  /** El botón que lo resuelve, si lo hay. */
  readonly boton: { readonly texto: string; readonly accion: string } | null;
  /** Lo que responde la API. */
  readonly estadoHttp: number;
}

function error(
  codigo: string,
  quePasa: string,
  queSePuedeHacer: string,
  estadoHttp: number,
  boton: { texto: string; accion: string } | null = null,
): ErrorDeEstook {
  return { codigo, quePasa, queSePuedeHacer, boton, estadoHttp };
}

export const ERRORES = {
  // ── Acceso ─────────────────────────────────────────────────────────────────
  sin_sesion: error(
    'sin_sesion',
    'La sesión ha caducado.',
    'Vuelve a entrar con tu correo o con tu PIN. Lo que estabas escribiendo se ha guardado.',
    401,
    { texto: 'Entrar', accion: 'ir_a_entrar' },
  ),

  sin_permiso: error(
    'sin_permiso',
    'Esto no está en tu acceso.',
    'Si crees que deberías poder hacerlo, pídeselo a quien lleva el local.',
    403,
  ),

  local_ajeno: error(
    'local_ajeno',
    'Ese local no es de los tuyos.',
    'Cambia de local arriba, o pide acceso a quien lleve la organización.',
    403,
    { texto: 'Cambiar de local', accion: 'abrir_selector_de_local' },
  ),

  // ── M4 · las puertas del login ─────────────────────────────────────────────

  // A propósito NO dice si el correo existe: si dijera «ese correo no está
  // dado de alta», cualquiera podría averiguar quién trabaja dónde probando
  // direcciones. La misma frase para el correo que no existe y para la
  // contraseña equivocada.
  no_cuadra: error(
    'no_cuadra',
    'Ese correo y esa contraseña no cuadran.',
    'Vuelve a intentarlo. Si no te acuerdas, quien lleva el local puede darte una nueva en un momento.',
    401,
  ),

  demasiados_intentos: error(
    'demasiados_intentos',
    'Se han fallado cinco veces seguidas, así que la entrada está parada un rato.',
    'Espera quince minutos y vuelve a intentarlo. Si tienes prisa, quien lleva el local puede darte un PIN nuevo ahora mismo.',
    429,
  ),

  falta_doble_factor: error(
    'falta_doble_factor',
    'Falta el código de tu aplicación de autenticación.',
    'Ábrela y escribe los seis dígitos que enseña ahora.',
    401,
    { texto: 'Escribir el código', accion: 'pedir_doble_factor' },
  ),

  clave_por_cambiar: error(
    'clave_por_cambiar',
    'Antes de nada, pon una contraseña tuya.',
    'La que estás usando te la dio otra persona, así que la sabe alguien más.',
    403,
    { texto: 'Poner mi contraseña', accion: 'ir_a_cambiar_clave' },
  ),

  pin_ocupado: error(
    'pin_ocupado',
    'Ese PIN ya lo tiene otra persona de este local.',
    'Dos personas del mismo local no pueden compartir PIN. Se ha generado otro.',
    409,
    { texto: 'Usar el nuevo', accion: 'aceptar_pin_nuevo' },
  ),

  se_queda_sin_administrador: error(
    'se_queda_sin_administrador',
    'Si le quitas el acceso, el negocio se queda sin nadie que pueda administrarlo.',
    'Nombra antes a otra persona como dirección o administrador de cuenta, o declara un correo de recuperación en Ajustes.',
    409,
    { texto: 'Ir a Ajustes', accion: 'abrir_ajustes_de_organizacion' },
  ),

  /**
   * La visita de demostración, que mira todo y no escribe nada (M5).
   *
   * No es un fallo ni una falta de permiso: es lo que se prometió. «Se entra y
   * se sale sin dejar rastro», y la forma de que eso sea verdad es que no haya
   * nada que borrar. Por eso el texto lo cuenta como una característica y el
   * botón lleva a crear una cuenta, que es lo que quiere quien se topa con esto.
   */
  solo_lectura: error(
    'solo_lectura',
    'Esto es una demostración, así que no se guarda nada.',
    'Puedes mirarlo todo y trastear sin miedo. Para trabajar de verdad con tus datos, date de alta.',
    403,
    { texto: 'Quiero mi cuenta', accion: 'salir_de_la_demostracion' },
  ),

  // ── Cosas que ya han pasado ────────────────────────────────────────────────
  ya_hecho: error(
    'ya_hecho',
    'Esto ya estaba hecho.',
    'No se ha duplicado nada. Puedes seguir tranquilo.',
    200,
  ),

  lo_cambio_otra_persona: error(
    'lo_cambio_otra_persona',
    'Alguien ha cambiado esto mientras lo tenías abierto.',
    'Mira qué ha cambiado y decide si quieres conservar lo tuyo.',
    409,
    { texto: 'Ver qué ha cambiado', accion: 'comparar_versiones' },
  ),

  periodo_cerrado: error(
    'periodo_cerrado',
    'Ese periodo ya está cerrado.',
    'Se puede reabrir dejando escrito el motivo, o corregirlo con un ajuste con fecha de hoy.',
    409,
    { texto: 'Reabrir con motivo', accion: 'abrir_reapertura' },
  ),

  // ── Lo que se pide ─────────────────────────────────────────────────────────
  faltan_datos: error(
    'faltan_datos',
    'Falta algo por rellenar.',
    'Los campos que faltan están marcados debajo.',
    422,
  ),

  no_existe: error(
    'no_existe',
    'Eso ya no está.',
    'Puede que se archivara. Búscalo en el histórico.',
    404,
  ),

  // ── Fiscalidad ─────────────────────────────────────────────────────────────
  fiscal_sin_regla: error(
    'fiscal_sin_regla',
    'No hay una regla fiscal para esta operación.',
    'Estook no se inventa un impuesto. Revisa el territorio y la actividad del local, o dinos qué falta y la añadimos.',
    422,
    { texto: 'Revisar los datos del local', accion: 'abrir_ajustes_fiscales' },
  ),

  fiscal_ambiguo: error(
    'fiscal_ambiguo',
    'Hay dos reglas fiscales que encajan igual de bien, y no se puede elegir por ti.',
    'Se necesita una regla más concreta. Avísanos con lo que estabas haciendo y lo resolvemos.',
    422,
  ),

  // ── Cuando algo se rompe de verdad ─────────────────────────────────────────
  sin_conexion: error(
    'sin_conexion',
    'No hay conexión.',
    'Lo que has apuntado se guarda en el móvil y sube solo cuando vuelva la señal.',
    503,
  ),

  fallo_nuestro: error(
    'fallo_nuestro',
    'Se nos ha roto algo por dentro.',
    'No es cosa tuya y no has perdido nada. Ya lo estamos viendo; inténtalo en un minuto.',
    500,
    { texto: 'Reintentar', accion: 'reintentar' },
  ),
} as const satisfies Record<string, ErrorDeEstook>;

export type CodigoDeError = keyof typeof ERRORES;

export function errorDeEstook(codigo: CodigoDeError): ErrorDeEstook {
  return ERRORES[codigo];
}

/** El texto entero, para enseñarlo donde no cabe un botón. */
export function comoFrase(codigo: CodigoDeError): string {
  const el = ERRORES[codigo];
  return `${el.quePasa} ${el.queSePuedeHacer}`;
}
