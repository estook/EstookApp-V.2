/**
 * @estook/permisos · el vocabulario de permisos, compartido entre cliente y servidor.
 *
 * IMPORTANTE, y es lo que evita el peor error posible aqui:
 *
 *   **La matriz de que trae puesto cada rol NO vive en este paquete.** Vive en la
 *   base de datos, en `base-de-datos/migraciones/0004_matriz_de_roles.sql`, y
 *   tiene un unico dueno (regla 6: nunca se calcula lo mismo en dos sitios).
 *
 * Aqui solo estan los nombres de los permisos y los tres niveles. El servidor
 * calcula los niveles efectivos de quien pregunta y se los manda ya resueltos;
 * el cliente los lee para decidir que ensena.
 *
 * Y sobre todo: esconder un boton no es proteger nada (principio 7). Si el
 * servidor no manda un campo de coste, no hay nada que esconder. Esto sirve para
 * que la pantalla no ensene lo que no toca, no para vigilar la puerta.
 */

export const NIVELES = ['sin_acceso', 'ver', 'ver_y_editar'] as const;
export type Nivel = (typeof NIVELES)[number];

/** Las ocho apps, mas el Panel, Fogon, Ajustes y la vista aparte de la gestoria. */
export const PERMISOS_DE_APP = [
  'app.panel',
  'app.inventario',
  'app.escandallos',
  'app.carta',
  'app.calendario',
  'app.equipo',
  'app.servicio',
  'app.negocio',
  'app.cuaderno',
  'app.fogon',
  'app.ajustes',
  'app.gestoria',
] as const;

/** Los datos que no todo el mundo puede ver. */
export const PERMISOS_DE_DATO = [
  'dato.precio_de_compra',
  'dato.coste_de_plato',
  'dato.coste_de_personal',
  'dato.ventas',
  'dato.facturacion',
  'dato.datos_del_equipo',
  'dato.cuadrante_completo',
  'dato.chat_directos',
] as const;

/** Lo que se puede ejecutar. */
export const PERMISOS_DE_ACCION = [
  'accion.fichar',
  'accion.registrar_merma',
  'accion.marcar_agotado',
  'accion.cerrar_recuento',
  'accion.publicar_carta',
  'accion.publicar_cuadrante',
  'accion.invitar_personas',
  'accion.conectar_tpv',
  'accion.poner_objetivos',
  'accion.exportar_contabilidad',
  'accion.gestionar_locales',
  'accion.catalogo_maestro',
  'accion.contratos_marco',
] as const;

export const PERMISOS = [...PERMISOS_DE_APP, ...PERMISOS_DE_DATO, ...PERMISOS_DE_ACCION] as const;

export type Permiso = (typeof PERMISOS)[number];
export type PermisoDeApp = (typeof PERMISOS_DE_APP)[number];

/** Lo que el servidor manda: el nivel ya resuelto de cada permiso, para un local. */
export type PermisosResueltos = Readonly<Partial<Record<Permiso, Nivel>>>;

export function nivelDe(permisos: PermisosResueltos, permiso: Permiso): Nivel {
  return permisos[permiso] ?? 'sin_acceso';
}

export function puedeVer(permisos: PermisosResueltos, permiso: Permiso): boolean {
  return nivelDe(permisos, permiso) !== 'sin_acceso';
}

export function puedeEditar(permisos: PermisosResueltos, permiso: Permiso): boolean {
  return nivelDe(permisos, permiso) === 'ver_y_editar';
}

/**
 * Las apps que se le ensenan a quien pregunta, en el orden de la rueda.
 *
 * «Las apps que un rol no tiene no aparecen, la rueda se reparte entre las que
 * quedan y los sectores se agrandan.» No hay huecos ni candados: un cocinero no
 * usa «Estook con cosas ocultas», usa una aplicacion pensada para el.
 */
export const ORDEN_DE_LA_RUEDA = [
  'app.inventario',
  'app.escandallos',
  'app.carta',
  'app.calendario',
  'app.equipo',
  'app.servicio',
  'app.negocio',
  'app.cuaderno',
] as const satisfies readonly PermisoDeApp[];

export function appsVisibles(permisos: PermisosResueltos): PermisoDeApp[] {
  return ORDEN_DE_LA_RUEDA.filter((app) => puedeVer(permisos, app));
}

export function esPermiso(valor: unknown): valor is Permiso {
  return typeof valor === 'string' && (PERMISOS as readonly string[]).includes(valor);
}

// ── M2 · el motor: el servidor no envia lo que el rol no puede ver ────────────

/**
 * «Viven en el servidor: **un rol sin costes no recibe los campos de precio**»
 * (Manifiesto). Y el documento de Roles lo remata: «el servidor no envia lo que
 * el rol no puede ver. Un cocinero no recibe un campo de coste, asi que no hay
 * nada que esconder en la interfaz».
 *
 * Esto es lo que lo hace verdad. Se declara que permiso protege cada campo, y la
 * respuesta sale ya sin ellos. Esconder un campo en la pantalla no es protegerlo
 * (regla 4): si viaja, alguien lo puede leer.
 */
export type CamposProtegidos<T> = Readonly<Partial<Record<keyof T, Permiso>>>;

/**
 * Quita de un objeto los campos cuyo permiso no llega a `ver`.
 *
 * No los pone a vacio ni a cero: **los quita**. Un campo con `null` sigue
 * diciendo que existe, y a veces eso ya es informacion de mas.
 */
export function recortar<T extends object>(
  dato: T,
  proteccion: CamposProtegidos<T>,
  permisos: PermisosResueltos,
): Partial<T> {
  const salida: Partial<T> = {};

  for (const clave of Object.keys(dato) as (keyof T)[]) {
    const exigido = proteccion[clave];
    if (exigido !== undefined && !puedeVer(permisos, exigido)) continue;
    salida[clave] = dato[clave];
  }

  return salida;
}

/** Lo mismo sobre una lista. Es el caso comun: una tabla de platos, un listado. */
export function recortarLista<T extends object>(
  datos: readonly T[],
  proteccion: CamposProtegidos<T>,
  permisos: PermisosResueltos,
): Partial<T>[] {
  return datos.map((dato) => recortar(dato, proteccion, permisos));
}

/**
 * Junta varios conjuntos de permisos quedandose con el mas amplio de cada uno.
 *
 * «Si alguien tiene dos roles sobre el mismo local, gana el mas amplio»
 * (Manifiesto). La base de datos ya lo resuelve al consultar; esto es para
 * cuando hay que hacerlo en memoria, y da exactamente lo mismo.
 */
export function elMasAmplio(...conjuntos: readonly PermisosResueltos[]): PermisosResueltos {
  const salida: Partial<Record<Permiso, Nivel>> = {};

  for (const conjunto of conjuntos) {
    for (const [permiso, nivel] of Object.entries(conjunto) as [Permiso, Nivel][]) {
      const actual = salida[permiso];
      if (actual === undefined || NIVELES.indexOf(nivel) > NIVELES.indexOf(actual)) {
        salida[permiso] = nivel;
      }
    }
  }

  return salida;
}

/**
 * Comprueba un permiso antes de ejecutar algo, y si no, dice cual falta.
 * Devuelve el codigo de error del catalogo, para que la API responda en cristiano.
 */
export function comprobarAccion(
  permisos: PermisosResueltos,
  permiso: Permiso,
): { readonly puede: true } | { readonly puede: false; readonly falta: Permiso } {
  return puedeEditar(permisos, permiso) ? { puede: true } : { puede: false, falta: permiso };
}
