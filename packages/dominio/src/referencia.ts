/**
 * El vocabulario del catálogo de referencia (M5).
 *
 * Las unidades de uso y los catorce alérgenos oficiales. Están aquí y no en el
 * catálogo mismo porque los necesita la pantalla para pintar, y porque **M6 los
 * hereda**: cuando exista `estook.producto`, sus unidades y sus alérgenos son
 * exactamente estos. Un catálogo cerrado se declara una vez.
 *
 * El dueño de verdad de los alérgenos es la base de datos (`estook.alergeno`,
 * migración 0020), igual que pasa con la matriz de permisos: aquí están sus
 * nombres para poder pintarlos sin una consulta, y hay una prueba que comprueba
 * que las dos listas cuadran.
 */

/** Lista cerrada (Auditoría, parte 3). El catálogo usa g, ml y ud. */
export const UNIDADES_DE_USO = ['g', 'ml', 'ud', 'kg', 'l'] as const;

export type UnidadDeUso = (typeof UNIDADES_DE_USO)[number];

export function esUnidadDeUso(valor: unknown): valor is UnidadDeUso {
  return typeof valor === 'string' && (UNIDADES_DE_USO as readonly string[]).includes(valor);
}

/**
 * Los catorce del anexo II del Reglamento (UE) 1169/2011, en su orden oficial.
 *
 * El orden importa y no es alfabético: es el del reglamento, que es el que
 * espera ver quien está acostumbrado a leer etiquetas.
 */
export const ALERGENOS = [
  'gluten',
  'crustaceos',
  'huevos',
  'pescado',
  'cacahuetes',
  'soja',
  'lacteos',
  'frutos_de_cascara',
  'apio',
  'mostaza',
  'sesamo',
  'sulfitos',
  'altramuces',
  'moluscos',
] as const;

export type Alergeno = (typeof ALERGENOS)[number];

export const NOMBRE_DEL_ALERGENO: Readonly<Record<Alergeno, string>> = {
  gluten: 'Cereales con gluten',
  crustaceos: 'Crustáceos',
  huevos: 'Huevos',
  pescado: 'Pescado',
  cacahuetes: 'Cacahuetes',
  soja: 'Soja',
  lacteos: 'Leche y derivados',
  frutos_de_cascara: 'Frutos de cáscara',
  apio: 'Apio',
  mostaza: 'Mostaza',
  sesamo: 'Granos de sésamo',
  sulfitos: 'Dióxido de azufre y sulfitos',
  altramuces: 'Altramuces',
  moluscos: 'Moluscos',
};

/**
 * **El nombre de servicio** (T4 · 2, 0117): el que cabe en un botón de la sala y en una marca
 * de la cocina, «LLEVA GLUTEN». El largo, el del reglamento, se queda para la carta y la ficha.
 */
export const NOMBRE_CORTO_DEL_ALERGENO: Readonly<Record<Alergeno, string>> = {
  gluten: 'Gluten',
  crustaceos: 'Crustáceos',
  huevos: 'Huevo',
  pescado: 'Pescado',
  cacahuetes: 'Cacahuete',
  soja: 'Soja',
  lacteos: 'Lácteos',
  frutos_de_cascara: 'Frutos secos',
  apio: 'Apio',
  mostaza: 'Mostaza',
  sesamo: 'Sésamo',
  sulfitos: 'Sulfitos',
  altramuces: 'Altramuces',
  moluscos: 'Moluscos',
};

export function esAlergeno(valor: unknown): valor is Alergeno {
  return typeof valor === 'string' && (ALERGENOS as readonly string[]).includes(valor);
}

/**
 * La cuenta que el alta enseña hecha, y el motivo de que exista este catálogo.
 *
 * «Confundir unidad de compra con unidad de uso es la primera causa de
 *  escandallos falsos. Por eso el alta obliga a decir las dos y **enseña el
 *  resultado**» (Auditoría 1.2): «Caja 3 kg = 3.000 g para usar».
 *
 * Esto compone esa frase. No calcula el coste —eso es `costePorUnidadDeUso`, que
 * tiene un único dueño en `coste.ts`— sino que **explica de dónde sale**, que es
 * lo que hace que alguien note que se ha equivocado antes de guardarlo. Sin
 * aprovechamiento desde el 22-nov (0150): lo que se compra es lo que se usa.
 */
export function comoSaleElCoste(referencia: {
  readonly formato: string;
  readonly factor: number;
  readonly unidadDeUso: UnidadDeUso;
}): string {
  const { formato, factor, unidadDeUso } = referencia;
  return `${formato} = ${factor.toLocaleString('es-ES')} ${unidadDeUso} para usar.`;
}
