import { puedeEditar, puedeVer, type PermisosResueltos } from '@estook/permisos';
import { sinAcentos } from '@estook/dominio';

/**
 * Las secciones de Ajustes, y lo que hay en cada una (entrega V, mejora 7).
 *
 * «En Ajustes pones todo en cascada, en vez de por secciones o desplegables. Que
 *  vaya por ramas.» Eran catorce tarjetas una debajo de otra, y quien entraba a
 *  cambiar el tema tenía que pasar por el IVA de sus precios para encontrarlo.
 *
 * Son cinco, porque **no es lo mismo el aparato, la persona, el local y la
 * organización**, y mezclarlo es donde se equivoca quien lleva tres locales: el
 * tema es de esta tablet, la contraseña es tuya, el logo es del local y el doble
 * factor obligatorio es de todo el negocio.
 *
 * **Este fichero es el único que sabe qué ajustes hay y dónde viven.** Lo leen la
 * pantalla, su buscador y el buscador universal: un ajuste nuevo se escribe aquí
 * una vez y aparece en los tres (regla 6).
 */

export type IdDeSeccion =
  'aparato' | 'cuenta' | 'local' | 'conexiones' | 'suscripcion' | 'organizacion';

export interface Seccion {
  readonly id: IdDeSeccion;
  readonly nombre: string;
  /** Qué hay dentro, en una línea: lo que se lee en la lista antes de entrar. */
  readonly queHay: string;
}

export const SECCIONES: readonly Seccion[] = [
  { id: 'aparato', nombre: 'Este aparato', queHay: 'Letra, tema y modo cocina' },
  { id: 'cuenta', nombre: 'Mi cuenta', queHay: 'Contraseña, PIN, doble factor e idioma' },
  { id: 'local', nombre: 'Tu local', queHay: 'Marca, objetivos, el QR de tu carta y precios' },
  { id: 'conexiones', nombre: 'Conexiones', queHay: 'Tus ventas y Google' },
  // La suscripción, a mano de quien la paga (Richi, 25-sep · 0048).
  { id: 'suscripcion', nombre: 'Suscripción', queHay: 'Plan, tarjeta, facturas y renovación' },
  { id: 'organizacion', nombre: 'Organización', queHay: 'La seguridad de todo el negocio' },
];

export interface Ajuste {
  /** El ancla dentro de su sección: `/ajustes/aparato#tema`. */
  readonly id: string;
  readonly seccion: IdDeSeccion;
  readonly nombre: string;
  /**
   * Lo que la gente escribe de verdad para encontrarlo: «clave» y no
   * «credencial», «oscuro» y no «tema». Sin esto, buscar «IVA» no encontraría
   * «Tus precios de compra».
   */
  readonly palabras: string;
}

export const AJUSTES: readonly Ajuste[] = [
  {
    id: 'tamano-de-letra',
    seccion: 'aparato',
    nombre: 'Tamaño de letra',
    palabras: 'letra grande pequeña tamaño leer ver',
  },
  {
    id: 'tema',
    seccion: 'aparato',
    nombre: 'Tema claro u oscuro',
    palabras: 'tema modo oscuro claro noche colores sistema',
  },
  {
    id: 'modo-cocina',
    seccion: 'aparato',
    nombre: 'Modo cocina',
    palabras: 'cocina guantes botones grandes contraste tablet pase',
  },
  {
    id: 'mi-acceso',
    seccion: 'cuenta',
    nombre: 'Contraseña, PIN y doble factor',
    palabras: 'contraseña clave pin doble segundo factor sesiones seguridad acceso',
  },
  { id: 'idioma', seccion: 'cuenta', nombre: 'Idioma', palabras: 'idioma lengua' },
  {
    id: 'salir',
    seccion: 'cuenta',
    nombre: 'Salir de este aparato',
    palabras: 'salir cerrar sesión desconectar',
  },
  { id: 'tu-marca', seccion: 'local', nombre: 'Logo y color', palabras: 'logo marca color imagen' },
  {
    id: 'donde-esta-el-local',
    seccion: 'local',
    nombre: 'Dónde está el local',
    palabras: 'ubicación gps dirección fichar metros',
  },
  {
    id: 'llegar-tarde',
    seccion: 'local',
    nombre: 'Cuándo es llegar tarde',
    palabras: 'retraso tarde margen minutos fichaje',
  },
  {
    id: 'objetivos',
    seccion: 'local',
    nombre: 'Tus objetivos',
    palabras: 'objetivos food cost coste materia prima personal merma ventas semáforo porcentaje',
  },
  {
    id: 'tu-carta',
    seccion: 'local',
    nombre: 'Tu carta y su QR',
    palabras: 'qr carta código mesa imprimir cartel menú dirección subir pdf fotos',
  },
  {
    id: 'precios-de-compra',
    seccion: 'local',
    nombre: 'Precios de compra con o sin IVA',
    palabras: 'iva precios compra impuestos',
  },
  {
    id: 'tus-ventas',
    seccion: 'conexiones',
    nombre: 'Cómo entran tus ventas',
    palabras: 'ventas tpv caja conectar a mano',
  },
  {
    id: 'google',
    seccion: 'conexiones',
    nombre: 'Tu local en Google',
    palabras: 'google maps reseñas horario ficha valoración',
  },
  {
    id: 'suscripcion',
    seccion: 'suscripcion',
    nombre: 'Tu suscripción',
    palabras:
      'suscripción plan pago pagar tarjeta factura facturas cancelar renovar cuota precio prueba baja pausa',
  },
  {
    id: 'acceso-de-la-organizacion',
    seccion: 'organizacion',
    nombre: 'Doble factor para todos y correo de recuperación',
    palabras: 'organización negocio doble factor obligatorio recuperación correo',
  },
];

/** Lo mínimo de la sesión que hace falta para saber qué secciones ve alguien. */
export interface QuienMira {
  readonly permisos: PermisosResueltos;
  readonly tieneLocal: boolean;
  readonly tieneOrganizacion: boolean;
  /** Si lleva la suscripción (`quien_soy` → `cuenta.laLlevo`): es de la organización. */
  readonly llevaLaSuscripcion?: boolean;
}

/**
 * Las secciones que ve una persona, **con los mismos permisos que cada tarjeta**.
 *
 * Si una sección saliera en la lista y dentro no hubiera nada, sería la pestaña
 * muerta de B5 otra vez. Por eso se pide aquí lo mismo que pide la tarjeta:
 * llevar el local es `editar` en Ajustes; los precios, además, editar el precio de
 * compra y ver Almacén.
 */
export function seccionesQueVe({
  permisos,
  tieneLocal,
  tieneOrganizacion,
  llevaLaSuscripcion = false,
}: QuienMira): readonly Seccion[] {
  const llevaElLocal = tieneLocal && puedeEditar(permisos, 'app.ajustes');
  return SECCIONES.filter((seccion) => {
    if (seccion.id === 'aparato' || seccion.id === 'cuenta') return true;
    // «Tu marca» la ve cualquiera con local, igual que antes.
    if (seccion.id === 'local') return tieneLocal;
    if (seccion.id === 'conexiones') return llevaElLocal;
    // La suscripción, quien lleva la facturación: lo mismo que pide `mi_suscripcion`, y
    // de la organización, que en la vista de cadena no hay local del que sacarlo.
    if (seccion.id === 'suscripcion') return tieneOrganizacion && llevaLaSuscripcion;
    return tieneOrganizacion && puedeEditar(permisos, 'app.ajustes');
  });
}

/** Si alguien ve el ajuste de los precios de compra: lo que pide su tarjeta. */
export function llevaLosPrecios(permisos: PermisosResueltos, tieneLocal: boolean): boolean {
  return (
    tieneLocal &&
    puedeEditar(permisos, 'dato.precio_de_compra') &&
    puedeVer(permisos, 'app.almacen')
  );
}

/**
 * Si alguien ve sus objetivos en Ajustes (entrega O): quien puede ponerlos, que es
 * lo que pide el comando. Ver el semáforo es otra cosa, y está en el Panel.
 */
export function llevaLosObjetivos(permisos: PermisosResueltos, tieneLocal: boolean): boolean {
  return tieneLocal && puedeEditar(permisos, 'accion.poner_objetivos');
}

/** Los ajustes que ve una persona: los de sus secciones. */
export function ajustesQueVe(quien: QuienMira): readonly Ajuste[] {
  const suyas = new Set(seccionesQueVe(quien).map((s) => s.id));
  const llevaElLocal = quien.tieneLocal && puedeEditar(quien.permisos, 'app.ajustes');
  return AJUSTES.filter((ajuste) => {
    if (!suyas.has(ajuste.seccion)) return false;
    if (ajuste.id === 'precios-de-compra') return llevaLosPrecios(quien.permisos, quien.tieneLocal);
    if (ajuste.id === 'objetivos') return llevaLosObjetivos(quien.permisos, quien.tieneLocal);
    if (ajuste.seccion === 'local' && ajuste.id !== 'tu-marca') return llevaElLocal;
    return true;
  });
}

/**
 * Buscar entre los ajustes: cada palabra escrita tiene que estar en su nombre o
 * en sus palabras, sin acentos y sin mayúsculas. «iva» encuentra los precios;
 * «doble factor» encuentra los dos sitios donde se pone.
 */
export function buscarAjustes(ajustes: readonly Ajuste[], texto: string): readonly Ajuste[] {
  const palabras = sinAcentos(texto.toLowerCase()).split(/\s+/).filter(Boolean);
  if (palabras.length === 0) return [];
  return ajustes.filter((ajuste) => {
    const donde = sinAcentos(`${ajuste.nombre} ${ajuste.palabras}`.toLowerCase());
    return palabras.every((palabra) => donde.includes(palabra));
  });
}

export function nombreDeLaSeccion(id: IdDeSeccion): string {
  return SECCIONES.find((s) => s.id === id)?.nombre ?? 'Ajustes';
}

/** La dirección de un ajuste: su sección y su ancla. */
export function rutaDelAjuste(ajuste: Ajuste): string {
  return `/ajustes/${ajuste.seccion}#${ajuste.id}`;
}
