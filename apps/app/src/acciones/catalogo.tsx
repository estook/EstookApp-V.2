import {
  IconoAnadir,
  IconoAtencion,
  IconoBuscar,
  IconoDinero,
  IconoBorrar,
  IconoDocumento,
  IconoEntrar,
  IconoEquipo,
  IconoAlmacen,
  IconoOrganizacion,
  IconoPersona,
  IconoQuitar,
  IconoReloj,
  IconoEscanear,
  IconoReparto,
  IconoTablon,
  type Icono,
} from '@estook/iconos';
import type { Permiso, PermisosResueltos } from '@estook/permisos';
import type { Puesto } from '@estook/ui';
import { puedeEditar, puedeVer } from '@estook/permisos';

/**
 * El catálogo de acciones · lo que se puede **hacer**, no lo que se puede mirar.
 *
 * ── Por qué esto existe, y por qué es la pieza que más cambia ────────────────
 *
 * Hasta M6½ cada operación vivía **dentro de la pantalla que la ofrece**. El botón
 * «Añadir producto» existía en Productos y en ningún otro sitio; el de invitar,
 * dentro de Equipo · Personas. Eso tiene tres consecuencias que se notan:
 *
 *   · **El buscador universal encuentra cosas, no cosas que hacer.** B5 dice
 *     literalmente que busca «también acciones», y las que ofrecía eran ir a una
 *     app, ir a Ajustes y cambiar el tamaño de letra: navegación, no acciones.
 *   · **El Panel no puede tener accesos rápidos**, que el Manifiesto pide en su
 *     tabla de widgets («Accesos rápidos · los botones que cada uno quiera»).
 *   · **Y Fogón no tiene de dónde sacar qué puede hacer por ti.** «Que rellene la
 *     ficha de un producto», «que deje el pedido en borrador»: para eso hace falta
 *     una lista de acciones con su permiso y su forma de abrirse, no ocho
 *     pantallas cada una con sus botones.
 *
 * Es el mismo patrón que `apps.ts` resolvió para la navegación: **un catálogo, un
 * dueño, varios consumidores**. Aquí los consumidores son tres —los accesos
 * rápidos del Panel, la paleta del buscador y los botones de Fogón— y por eso
 * merece la pena.
 *
 * ── Y cómo evita el fallo de siempre ─────────────────────────────────────────
 *
 * «Algo construido, registrado y probado a lo que la pantalla no llama» es la
 * familia de fallo que este proyecto lleva persiguiendo desde M4. Una acción de
 * esta lista **se alcanza desde tres sitios a la vez**, así que la que no se pueda
 * alcanzar salta antes: hay una prueba que comprueba que toda acción del catálogo
 * lleva a una dirección que la aplicación conoce.
 *
 * ── Lo que NO está aquí ──────────────────────────────────────────────────────
 *
 * Lo que Fogón hará y todavía no puede hacer: dictar una merma, pedir por foto de
 * albarán, montar un horario. Eso vive en `Fogon.tsx`, contado como lo que es
 * —algo que llega— y **no como un botón**. Un control que promete algo y no lo hace
 * es el fallo que más veces ha aparecido en este proyecto.
 */
export interface Accion {
  readonly id: string;
  /** En cristiano y en imperativo: lo que la persona quiere hacer. */
  readonly nombre: string;
  /** Qué pasa al pulsarlo, en una frase. Para el catálogo y para Fogón. */
  readonly queHace: string;
  readonly icono: Icono;
  /**
   * El permiso que hace falta.
   *
   * Nulo si no hace falta ninguno. Y **de dos clases**: `ver` para las que solo
   * llevan a mirar algo, `editar` para las que cambian algo. Sin esa distinción, a
   * un cocinero se le ofrecería «invitar a alguien» porque ve Equipo.
   */
  readonly permiso: { readonly cual: Permiso; readonly como: 'ver' | 'editar' } | null;
  /**
   * De que app es, para que Fogon pueda ofrecer **las de la pantalla de delante**
   * primero. Nulo si es de toda la aplicacion, como buscar o cambiar la clave.
   */
  readonly app: string | null;
  /**
   * A dónde lleva.
   *
   * Una dirección de la aplicación, con su `?hacer=` cuando además abre algo. Es
   * lo que permite que la misma acción funcione desde el Panel, desde el buscador
   * y desde un enlace pegado en el chat del equipo: **no hay estado escondido**.
   */
  readonly ir: string;
  /** Las que abren algo del esqueleto en vez de navegar. */
  readonly abre?: 'buscador' | 'fogon';
}

export const ACCIONES: readonly Accion[] = [
  {
    id: 'nuevo-producto',
    app: 'almacen',
    nombre: 'Añadir un producto',
    queHace: 'Abre el alta, con el catálogo de referencia para que sean quince segundos',
    icono: IconoAnadir,
    permiso: { cual: 'app.almacen', como: 'editar' },
    ir: '/almacen/productos/todo?hacer=nuevo',
  },
  {
    id: 'que-atender',
    app: 'almacen',
    nombre: 'Ver qué hay que atender',
    queHace: 'Lo que se acaba, lo que caduca y lo que no tiene precio, con su botón',
    icono: IconoAtencion,
    permiso: { cual: 'app.almacen', como: 'ver' },
    ir: '/almacen/resumen',
  },
  {
    id: 'bajo-minimo',
    app: 'almacen',
    nombre: 'Ver lo que está bajo mínimo',
    queHace: 'Los productos por debajo de su mínimo, con su previsión de agotamiento',
    icono: IconoAlmacen,
    permiso: { cual: 'app.almacen', como: 'ver' },
    ir: '/almacen/productos/bajo-minimo',
  },
  {
    id: 'sin-precio',
    app: 'almacen',
    nombre: 'Ponerles precio a los que no tienen',
    queHace: 'Los productos que cuentan cero en el valor de la cámara',
    icono: IconoAlmacen,
    permiso: { cual: 'app.almacen', como: 'ver' },
    ir: '/almacen/productos/sin-precio',
  },
  {
    id: 'el-libro',
    app: 'almacen',
    nombre: 'Ver el libro de movimientos',
    queHace: 'Todo lo que ha entrado y salido, por día y con quién lo apuntó',
    icono: IconoDocumento,
    permiso: { cual: 'app.almacen', como: 'ver' },
    ir: '/almacen/movimientos/todo',
  },
  {
    id: 'nuevo-proveedor',
    app: 'almacen',
    nombre: 'Añadir un proveedor',
    queHace: 'Su ficha: cuándo reparte, cómo se le pide y a quién llamar',
    icono: IconoOrganizacion,
    permiso: { cual: 'app.almacen', como: 'editar' },
    ir: '/almacen/compras/proveedores?hacer=nuevo',
  },
  // ── M7 · las compras ─────────────────────────────────────────────────────
  {
    id: 'nuevo-pedido',
    app: 'almacen',
    nombre: 'Hacer un pedido',
    queHace: 'Eliges a quién, y empieza por lo que Estook le pediría hoy',
    icono: IconoAnadir,
    permiso: { cual: 'app.almacen', como: 'editar' },
    ir: '/almacen/compras/pedidos?hacer=nuevo',
  },
  {
    id: 'recibir',
    app: 'almacen',
    nombre: 'Recibir lo que ha llegado',
    queHace: '¿Entero o con cambios? Entero son dos toques',
    icono: IconoReparto,
    permiso: { cual: 'app.almacen', como: 'editar' },
    ir: '/almacen/compras/pedidos?hacer=recibir',
  },
  {
    id: 'apuntar-factura',
    app: 'almacen',
    nombre: 'Apuntar una factura',
    queHace: 'Con sus albaranes, y te dice si te cobran lo que llegó',
    icono: IconoDocumento,
    permiso: { cual: 'dato.precio_de_compra', como: 'editar' },
    ir: '/almacen/compras/facturas?hacer=nueva',
  },
  {
    id: 'comparar-precios',
    app: 'almacen',
    nombre: 'Ver quién me lo deja mejor',
    queHace: 'La comparativa entre proveedores, lo que ha subido y lo pactado',
    icono: IconoDinero,
    permiso: { cual: 'dato.precio_de_compra', como: 'ver' },
    ir: '/almacen/compras/precios',
  },
  {
    id: 'invitar',
    app: 'equipo',
    nombre: 'Dar acceso a alguien',
    queHace: 'Le crea el acceso y te enseña su PIN para dárselo en mano',
    icono: IconoPersona,
    permiso: { cual: 'accion.invitar_personas', como: 'editar' },
    ir: '/equipo/personas/con-acceso?hacer=invitar',
  },
  {
    id: 'quien-no-ha-entrado',
    app: 'equipo',
    nombre: 'Ver quién no ha entrado todavía',
    queHace: 'A quién hay que volver a darle el PIN',
    icono: IconoEquipo,
    permiso: { cual: 'app.equipo', como: 'ver' },
    ir: '/equipo/personas/sin-entrar-todavia',
  },
  // ── M6½ · la merma, las horas y lo que entra ─────────────────────────────
  {
    // Va al Panel y no a Almacén, y es a propósito: **un camarero no tiene
    // Almacén** y es quien rompe una copa. El Panel lo tiene todo el mundo, y
    // la hoja de apuntar se abre ahí encima.
    id: 'apuntar-merma',
    app: 'almacen',
    nombre: 'Apuntar una merma',
    queHace: 'Qué se ha ido, cuánto y por qué, en tres toques',
    icono: IconoQuitar,
    permiso: { cual: 'accion.registrar_merma', como: 'editar' },
    ir: '/?hacer=merma',
  },
  {
    // Entrega O · contar lo que hay. Es lo que cierra el día de un jefe de cocina, y
    // vivía a dos pantallas: Almacén, Movimientos, la pestaña de recuento.
    id: 'hacer-recuento',
    app: 'almacen',
    nombre: 'Hacer inventario',
    queHace: 'Contar lo que hay y dejar la cámara como está de verdad',
    icono: IconoDocumento,
    permiso: { cual: 'accion.cerrar_recuento', como: 'editar' },
    ir: '/almacen/movimientos/inventario',
  },
  {
    // L · el lector (adelantada el 25-sep): desde el buscador y desde Fogón, a la
    // cámara directamente. En Productos, el botón está al lado de «Añadir producto».
    id: 'escanear-producto',
    app: 'almacen',
    nombre: 'Escanear un producto',
    queHace: 'Leer su código de barras: abre su ficha, o su alta si es nuevo',
    icono: IconoEscanear,
    permiso: { cual: 'app.almacen', como: 'ver' },
    ir: '/almacen/productos/todo?hacer=escanear',
  },
  {
    // El repaso del 25-sep · el Tablón (0049). Sin permiso: el corcho es de todo el
    // equipo, y quien más lo usa —la sala, con las reservas— no lleva nada más.
    id: 'escribir-en-el-tablon',
    app: null,
    nombre: 'Escribir en el tablón',
    queHace: 'Una nota para el equipo: una reserva, un aviso, lo que falta',
    icono: IconoTablon,
    permiso: null,
    ir: '/?hacer=tablon',
  },
  {
    // Entrega O · fichar desde cualquier sitio. Abre la hoja del botón «+», donde
    // fichar va arriba del todo; se puede pedir desde el buscador, desde Fogón y
    // desde «Lo de hoy» («Entras a las 16:00»).
    id: 'fichar',
    app: 'equipo',
    nombre: 'Fichar',
    queHace: 'Entrar o salir de tu turno, con dónde estás',
    icono: IconoEntrar,
    permiso: { cual: 'accion.fichar', como: 'editar' },
    ir: '/?hacer=fichar',
  },
  {
    id: 'mermas',
    app: 'almacen',
    nombre: 'Ver las mermas',
    queHace: 'Cuánto se va sin venderse y en qué, con la exportación',
    icono: IconoBorrar,
    permiso: { cual: 'app.almacen', como: 'ver' },
    ir: '/almacen/mermas',
  },
  {
    id: 'quien-esta',
    app: 'equipo',
    nombre: 'Ver quién está trabajando',
    queHace: 'Quién ha fichado, desde cuándo y quién no',
    icono: IconoEquipo,
    permiso: { cual: 'app.equipo', como: 'ver' },
    ir: '/equipo/resumen',
  },
  {
    id: 'horas',
    app: 'equipo',
    nombre: 'Ver las horas del equipo',
    queHace: 'Las horas de cada uno frente a su contrato, y lo que cuestan',
    icono: IconoReloj,
    permiso: { cual: 'app.equipo', como: 'ver' },
    ir: '/equipo/fichajes',
  },
  {
    id: 'cerrar-caja',
    app: 'servicio',
    nombre: 'Cerrar la caja',
    queHace: 'El total del día y, si quieres, lo que ha salido',
    icono: IconoDinero,
    permiso: { cual: 'dato.ventas', como: 'editar' },
    ir: '/servicio/jornada/cierre',
  },
  {
    id: 'ventas',
    app: 'negocio',
    nombre: 'Ver las ventas',
    queHace: 'Lo que ha entrado cada día, y cuánto se ha ido en género',
    icono: IconoDinero,
    permiso: { cual: 'dato.ventas', como: 'ver' },
    ir: '/negocio/ventas',
  },
  {
    id: 'mi-acceso',
    app: null,
    nombre: 'Cambiar mi contraseña',
    queHace: 'Tu contraseña, tu PIN, el doble factor y tus aparatos',
    icono: IconoReloj,
    permiso: null,
    ir: '/ajustes/cuenta#mi-acceso',
  },
  {
    id: 'buscar',
    app: null,
    nombre: 'Buscar en todo',
    queHace: 'Género, personas, locales y acciones, con erratas y sin acentos',
    icono: IconoBuscar,
    permiso: null,
    ir: '/',
    abre: 'buscador',
  },
];

export function accionPorId(id: string): Accion | undefined {
  return ACCIONES.find((accion) => accion.id === id);
}

/**
 * Las que esta persona puede hacer de verdad.
 *
 * «Esconder un botón no protege nada» (principio 7): esto no es la protección, que
 * la ponen las políticas de M1 y el `exige` de cada operación. Es para no ofrecerle
 * a un cocinero un botón que le va a decir que no.
 */
export function accionesQuePuedo(permisos: PermisosResueltos): readonly Accion[] {
  return ACCIONES.filter((accion) => puedoHacer(permisos, accion));
}

/**
 * Si esta persona puede hacer **esta** acción. Es la misma cuenta que la lista de
 * arriba, para una sola: la usan los vacíos, que ofrecen un botón (entrega V).
 */
export function puedoHacer(permisos: PermisosResueltos, accion: Accion): boolean {
  if (accion.permiso === null) return true;
  return accion.permiso.como === 'editar'
    ? puedeEditar(permisos, accion.permiso.cual)
    : puedeVer(permisos, accion.permiso.cual);
}

/**
 * Los atajos de fábrica del botón «+» y de las acciones rápidas, **por puesto**
 * (entrega O, mejora 6 · 0047).
 *
 * Como lo hacen las aplicaciones de equipo que mejor lo resuelven (Homebase,
 * 7shifts, Toast): cada uno tiene a mano **lo que hace varias veces al día** y nada
 * más. Fichar no está aquí: va siempre arriba, aparte, y resaltado cuando toca. Y
 * todo pasa por los permisos: a quien no puede cerrar la caja no le sale.
 */
export const ACCIONES_DEL_PUESTO: Readonly<Record<Puesto, readonly string[]>> = {
  gerente: [
    'cerrar-caja',
    'apuntar-merma',
    'recibir',
    'nuevo-pedido',
    'hacer-recuento',
    'escribir-en-el-tablon',
  ],
  jefe: [
    'apuntar-merma',
    'recibir',
    'nuevo-pedido',
    'hacer-recuento',
    'cerrar-caja',
    'escribir-en-el-tablon',
  ],
  cocina: [
    'apuntar-merma',
    'recibir',
    'bajo-minimo',
    'nuevo-pedido',
    'hacer-recuento',
    'escribir-en-el-tablon',
  ],
  sala: ['escribir-en-el-tablon', 'apuntar-merma', 'cerrar-caja', 'buscar'],
};

/**
 * Las de una pantalla, y luego las de toda la aplicacion.
 *
 * Es el orden que necesita Fogon: quien abre la burbuja en Almacén quiere ver
 * primero lo de Almacén. Y las generales van detras y no se quitan, porque
 * «buscar en todo» sirve igual en las ocho.
 */
export function accionesDeAqui(permisos: PermisosResueltos, idDeLaApp: string): readonly Accion[] {
  const puedo = accionesQuePuedo(permisos);

  // En el Panel no hay app delante, y ahí lo útil es **todo lo que se puede
  // hacer**: es la pantalla desde la que se sale a hacer cosas. Ofrecer solo las
  // generales dejaría a Fogón en el Panel con dos botones —buscar y cambiar la
  // contraseña— cuando es justo donde más falta hacen los atajos.
  if (idDeLaApp === '') return puedo;

  return [
    ...puedo.filter((accion) => accion.app === idDeLaApp),
    ...puedo.filter((accion) => accion.app === null),
  ];
}
