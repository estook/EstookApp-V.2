/**
 * El vocabulario fiscal (M2).
 *
 * Los catalogos cerrados de los que se componen las reglas. Un valor que no este
 * aqui no existe, igual que en el catalogo de permisos: asi no acaban apareciendo
 * cadenas sueltas por el codigo.
 *
 * El principio que lo sostiene todo: **un producto no tiene un tipo impositivo.
 * Lo tiene la operacion.**
 */

/** Cada uno con su impuesto propio. No son variantes del mismo. */
export const TERRITORIOS = ['peninsula_y_baleares', 'canarias', 'ceuta', 'melilla'] as const;
export type Territorio = (typeof TERRITORIOS)[number];

export const REGIMENES = ['iva', 'igic', 'ipsi'] as const;
export type Regimen = (typeof REGIMENES)[number];

export const REGIMEN_DEL_TERRITORIO: Readonly<Record<Territorio, Regimen>> = {
  peninsula_y_baleares: 'iva',
  canarias: 'igic',
  ceuta: 'ipsi',
  melilla: 'ipsi',
};

/**
 * La distincion juridica, y la que mas manda: ¿se presta un servicio o se entrega
 * un bien? Una cerveza en barra es lo primero; una caja de cervezas de una tienda,
 * lo segundo. El impuesto puede ser distinto aunque el producto sea el mismo.
 */
export const NATURALEZAS = ['prestacion_de_servicios', 'entrega_de_bienes'] as const;
export type Naturaleza = (typeof NATURALEZAS)[number];

/**
 * El hecho: donde se consume. Va aparte de la naturaleza a proposito, porque
 * «para llevar» **no determina por si solo** si hay servicio o entrega. Puede ser
 * cualquiera de las dos, y quien lo decide es la naturaleza.
 */
export const MODOS_DE_CONSUMO = ['en_el_local', 'para_llevar', 'reparto'] as const;
export type ModoDeConsumo = (typeof MODOS_DE_CONSUMO)[number];

/** Clasificacion fiscal del producto. Reutilizable, no un tipo pegado a la ficha. */
export const CATEGORIAS_FISCALES = [
  'alimento',
  'bebida_alcoholica',
  'bebida_refrescante',
  'bebida_refrescante_azucarada',
  'otros',
] as const;
export type CategoriaFiscal = (typeof CATEGORIAS_FISCALES)[number];

/**
 * La categoria de actividad del establecimiento. En Ceuta y en Melilla **decide
 * el tipo**: un restaurante de un tenedor y uno de tres no tributan igual.
 */
export const ACTIVIDADES = [
  'restaurante_un_tenedor',
  'restaurante_dos_o_mas_tenedores',
  'cafe_o_bar_categoria_especial',
  'demas_cafes_y_bares',
  'demas_hosteleria',
] as const;
export type Actividad = (typeof ACTIVIDADES)[number];
