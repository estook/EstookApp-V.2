import type { Rol } from './alcances.ts';

/**
 * De dónde es cada producto: cocina, sala o limpieza (M7, las apps conectadas).
 *
 * ── Por qué hacía falta ─────────────────────────────────────────────────────
 *
 * Porque Inventario era **un solo montón**. Un cocinero buscando harina pasaba
 * por las servilletas y el lavavajillas, y la lista de categorías —que es lo que
 * ordena la cámara— mezclaba «carnes» con «productos de limpieza». Un bar tiene
 * tres almacenes distintos y los lleva gente distinta; enseñarlos juntos es
 * pedirle a cada uno que ignore dos tercios de lo que ve.
 *
 * ── Y por qué la zona decide también quién lo ve ────────────────────────────
 *
 * Porque no es solo un filtro de comodidad: **un cocinero no lleva la barra y un
 * camarero no lleva la cámara**. Que cada uno vea lo suyo es la misma idea que
 * ordena la matriz de permisos desde M1, un escalón más abajo: no es secreto, es
 * que no es su trabajo.
 *
 * Los dos limpian, así que los dos ven lo de limpieza. Y de jefe de cocina y jefe
 * de sala para arriba se ve todo, porque son los que piden, los que cuadran y los
 * que responden de lo que falta.
 *
 * **La misma regla vive en SQL** (`estook.zonas_que_ve`), porque la seguridad por
 * filas no puede preguntarle a esto. Son dos copias del mismo catálogo y hay una
 * prueba que las cuadra, igual que con `partida_de_la_merma` desde M6½.
 */
export const ZONAS = ['cocina', 'sala', 'limpieza'] as const;

export type Zona = (typeof ZONAS)[number];

export const NOMBRE_DE_LA_ZONA: Readonly<Record<Zona, string>> = {
  cocina: 'Cocina',
  sala: 'Sala',
  limpieza: 'Limpieza',
};

/** Qué entra en cada una, dicho donde se elige. */
export const QUE_ES_CADA_ZONA: Readonly<Record<Zona, string>> = {
  cocina: 'Lo que se cocina: género de la cámara y del almacén',
  sala: 'Lo que se sirve tal cual: botellas, café, lo de las mesas',
  limpieza: 'Lo que no se come: productos, papel, bolsas',
};

/**
 * Si la zona lleva categorías propias.
 *
 * Limpieza **no**, y es a propósito: son quince cosas, y montarles un árbol de
 * categorías encima es trabajo de configuración para no encontrar nada mejor.
 * Cuando una zona no las lleva, el filtro de categoría no se esconde: **no
 * está**, que es distinto (Auditoría, parte 3).
 */
export function llevaCategorias(zona: Zona): boolean {
  return zona !== 'limpieza';
}

/**
 * Las zonas que ve cada rol.
 *
 * Es el gemelo de `estook.zonas_que_ve`. Aquí sirve para que la pantalla no
 * ofrezca un filtro que el servidor va a contestar vacío; allí, para que el dato
 * no salga aunque se pida a mano. Las dos capas, y las dos probadas.
 */
export const ZONAS_DEL_ROL: Readonly<Record<Rol, readonly Zona[]>> = {
  direccion: ZONAS,
  administrador_de_cuenta: ZONAS,
  chef_corporativo: ZONAS,
  compras_central: ZONAS,
  rrhh: ZONAS,
  gestoria: ZONAS,
  area_manager: ZONAS,
  gerente: ZONAS,
  jefe_de_cocina: ZONAS,
  jefe_de_sala: ZONAS,
  cocinero: ['cocina', 'limpieza'],
  camarero: ['sala', 'limpieza'],
};

export function esZona(valor: unknown): valor is Zona {
  return typeof valor === 'string' && (ZONAS as readonly string[]).includes(valor);
}

/**
 * Las zonas que ve alguien con estos roles, juntas y en el orden del catálogo.
 *
 * Una persona puede tener más de una membresía en el mismo local —de gerente en
 * la organización y de camarera en el suyo— y entonces ve la suma, no la
 * intersección: gana el rol más amplio, igual que con los permisos (M1).
 */
export function zonasDe(roles: readonly Rol[]): readonly Zona[] {
  const suyas = new Set(roles.flatMap((rol) => ZONAS_DEL_ROL[rol]));
  return ZONAS.filter((zona) => suyas.has(zona));
}
