import {
  IconoAnadir,
  IconoAtencion,
  IconoBuscar,
  IconoDocumento,
  IconoEquipo,
  IconoInventario,
  IconoOrganizacion,
  IconoPersona,
  IconoReloj,
  type Icono,
} from '@estook/iconos';
import type { Permiso, PermisosResueltos } from '@estook/permisos';
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
    nombre: 'Añadir un producto',
    queHace: 'Abre el alta, con el catálogo de referencia para que sean quince segundos',
    icono: IconoAnadir,
    permiso: { cual: 'app.inventario', como: 'editar' },
    ir: '/inventario/productos/todo?hacer=nuevo',
  },
  {
    id: 'que-atender',
    nombre: 'Ver qué hay que atender',
    queHace: 'Lo que se acaba, lo que caduca y lo que no tiene precio, con su botón',
    icono: IconoAtencion,
    permiso: { cual: 'app.inventario', como: 'ver' },
    ir: '/inventario/hoy',
  },
  {
    id: 'bajo-minimo',
    nombre: 'Ver lo que está bajo mínimo',
    queHace: 'Los productos por debajo de su mínimo, con su previsión de agotamiento',
    icono: IconoInventario,
    permiso: { cual: 'app.inventario', como: 'ver' },
    ir: '/inventario/productos/bajo-minimo',
  },
  {
    id: 'sin-precio',
    nombre: 'Ponerles precio a los que no tienen',
    queHace: 'Los productos que cuentan cero en el valor de la cámara',
    icono: IconoInventario,
    permiso: { cual: 'app.inventario', como: 'ver' },
    ir: '/inventario/productos/sin-precio',
  },
  {
    id: 'el-libro',
    nombre: 'Ver el libro de movimientos',
    queHace: 'Todo lo que ha entrado y salido, por día y con quién lo apuntó',
    icono: IconoDocumento,
    permiso: { cual: 'app.inventario', como: 'ver' },
    ir: '/inventario/movimientos/todo',
  },
  {
    id: 'nuevo-proveedor',
    nombre: 'Añadir un proveedor',
    queHace: 'La ficha corta, que es lo que hace falta para comparar precios',
    icono: IconoOrganizacion,
    permiso: { cual: 'app.inventario', como: 'editar' },
    ir: '/inventario/compras/proveedores?hacer=nuevo',
  },
  {
    id: 'invitar',
    nombre: 'Dar acceso a alguien',
    queHace: 'Le crea el acceso y te enseña su PIN para dárselo en mano',
    icono: IconoPersona,
    permiso: { cual: 'accion.invitar_personas', como: 'editar' },
    ir: '/equipo/personas/con-acceso?hacer=invitar',
  },
  {
    id: 'quien-no-ha-entrado',
    nombre: 'Ver quién no ha entrado todavía',
    queHace: 'A quién hay que volver a darle el PIN',
    icono: IconoEquipo,
    permiso: { cual: 'app.equipo', como: 'ver' },
    ir: '/equipo/personas/sin-entrar-todavia',
  },
  {
    id: 'mi-acceso',
    nombre: 'Cambiar mi contraseña',
    queHace: 'Tu contraseña, tu PIN, el doble factor y tus aparatos',
    icono: IconoReloj,
    permiso: null,
    ir: '/ajustes#mi-acceso',
  },
  {
    id: 'buscar',
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
  return ACCIONES.filter((accion) => {
    if (accion.permiso === null) return true;
    return accion.permiso.como === 'editar'
      ? puedeEditar(permisos, accion.permiso.cual)
      : puedeVer(permisos, accion.permiso.cual);
  });
}

/**
 * Las que trae puestas el widget de accesos rápidos cuando nadie lo ha tocado.
 *
 * Cuatro, que es lo que cabe en un widget ancho sin apretar. Se filtran por
 * permisos como todo lo demás, así que a un cocinero le salen las suyas.
 */
export const ACCIONES_DE_FABRICA: readonly string[] = [
  'nuevo-producto',
  'que-atender',
  'bajo-minimo',
  'el-libro',
];
