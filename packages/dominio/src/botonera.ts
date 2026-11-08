/**
 * **La botonera de Estook TPV** (T3, Anexo 11.11): qué se vende en el TPV, en qué página y
 * de qué color, **quién lo prepara** y **en qué pase sale**.
 *
 * «Es de bebidas» se fue (respuesta 6 de la 0107: no se entendía). Lo que hacía lo dicen dos
 * preguntas que cualquiera entiende, por página, y que hereda cada botón de la página:
 *
 *   · **¿Quién lo prepara?** Cocina · Barra · Nadie: a qué pantalla o impresora va al mandar
 *   · **¿En qué pase sale?** Bebidas · 1.º · 2.º · 3.º · Postre: qué pestaña se marca sola
 *
 * **Vienen propuestas por el nombre** de la sección (`loQueProponeElNombre`), y se cambian con
 * un toque. La botonera no copia la carta: cada botón apunta a su plato, con su precio, su
 * IVA y su escandallo de siempre.
 */

import { sinAcentos } from './parecido.ts';

/** A qué pantalla o impresora va al mandar. «Nadie»: se sirve tal cual (el agua, el pan). */
export const QUIEN_LO_PREPARA = ['cocina', 'barra', 'nadie'] as const;
export type QuienLoPrepara = (typeof QUIEN_LO_PREPARA)[number];

export const NOMBRE_DE_QUIEN_LO_PREPARA: Readonly<Record<QuienLoPrepara, string>> = {
  cocina: 'Cocina',
  barra: 'Barra',
  nadie: 'Nadie',
};

/** En qué pase sale: la pestaña que se marca sola al abrir la página (Anexo 11.10). */
export const PASES_DE_LA_BOTONERA = ['bebidas', '1', '2', '3', 'postre'] as const;
export type PaseDeLaBotonera = (typeof PASES_DE_LA_BOTONERA)[number];

export const NOMBRE_DEL_PASE: Readonly<Record<PaseDeLaBotonera, string>> = {
  bebidas: 'Bebidas',
  '1': '1.º',
  '2': '2.º',
  '3': '3.º',
  postre: 'Postre',
};

/**
 * Los colores de una sección o de un botón: **los del sistema de diseño**, por su nombre
 * (Anexo 11.12: ningún color escrito a mano en una pantalla). Sin color, el de su sección.
 *
 * **Once** desde R3 (0133): los nueve de T3 y dos más, **amarillo** (el de «Lo más pedido») y
 * **marrón** (el de los cafés). En el orden en que salen al elegir.
 */
export const COLORES_DE_LA_BOTONERA = [
  'amarillo',
  'naranja',
  'ambar',
  'rojo',
  'rosa',
  'morado',
  'azul',
  'turquesa',
  'verde',
  'arena',
  'marron',
] as const;
export type ColorDeLaBotonera = (typeof COLORES_DE_LA_BOTONERA)[number];

/**
 * **Los iconos de una sección** (R3, 0133): treinta de comida y bebida, **todos de Lucide**
 * (Richi, 5-nov: nunca dibujados a mano), descargados con `herramientas/traer-iconos.mjs`. Se
 * guardan por su nombre de Lucide. La hamburguesa y la paella no existen en Lucide: van con el
 * bocadillo y la olla.
 */
export const ICONOS_DE_LA_SECCION = [
  'beer',
  'wine',
  'martini',
  'cup-soda',
  'glass-water',
  'coffee',
  'milk',
  'croissant',
  'sandwich',
  'pizza',
  'salad',
  'soup',
  'beef',
  'drumstick',
  'ham',
  'fish',
  'shell',
  'egg-fried',
  'cooking-pot',
  'leaf',
  'wheat',
  'cake-slice',
  'ice-cream-cone',
  'cookie',
  'cherry',
  'citrus',
  'baby',
  'chef-hat',
  'star',
  'utensils-crossed',
] as const;
export type IconoDeLaSeccion = (typeof ICONOS_DE_LA_SECCION)[number];

/** Cómo se ve una sección: su icono, y su color (nulo: el gris de «lo demás»). */
export interface ComoSeVeLaSeccion {
  readonly icono: IconoDeLaSeccion;
  readonly color: ColorDeLaBotonera | null;
}

/** «Lo más pedido» va siempre con la estrella en amarillo. */
export const COMO_SE_VE_LO_MAS_PEDIDO: ComoSeVeLaSeccion = { icono: 'star', color: 'amarillo' };

/**
 * Lo que propone cada nombre, **en este orden** (el primero que encaja): los postres antes que
 * nada («Tarta de queso» no es queso), las bebidas antes que la comida, el marisco antes que el
 * pescado. Lo que no se reconoce, los cubiertos en gris.
 */
const POR_EL_NOMBRE: readonly (readonly [RegExp, IconoDeLaSeccion, ColorDeLaBotonera | null])[] = [
  [/lo mas pedido/, 'star', 'amarillo'],
  [/(helado|granizado|sorbete)/, 'ice-cream-cone', 'rosa'],
  [/(postre|dulce|tarta|reposteria|pasteleria)/, 'cake-slice', 'rosa'],
  [/(infantil|ninos|nino|peques|kids)/, 'baby', 'azul'],
  [/(cafe|infusion|cafeteria)/, 'coffee', 'marron'],
  // Antes que las bebidas: «Pan y agua» es del pan, que lo sirve el camarero al sentarse.
  [/(^|[^a-z])(pan|panes|panaderia)([^a-z]|$)/, 'wheat', 'arena'],
  [/(cerveza|(^|[^a-z])canas?([^a-z]|$)|tercio|birra)/, 'beer', 'naranja'],
  [/(vino|cava|champan|bodega|tinto|rosado|espumoso)/, 'wine', 'morado'],
  [
    /(coctel|copa|combinado|licor|(^|[^a-z])(gin|ron)([^a-z]|$)|whisky|vermut|aperitivo|chupito)/,
    'martini',
    'rosa',
  ],
  [/(refresco|agua|zumo|bebida|soda|batido)/, 'cup-soda', 'azul'],
  [/(desayuno|bolleria|tostada|merienda)/, 'croissant', 'arena'],
  [/pizza/, 'pizza', 'naranja'],
  [
    /(bocadillo|bocata|burger|hamburguesa|sandwich|montadito|bikini|kebab|wrap)/,
    'sandwich',
    'arena',
  ],
  [/(marisco|molusco|ostra|gamba|mejillon)/, 'shell', 'turquesa'],
  [/(pescado|del mar|bacalao|merluza)/, 'fish', 'turquesa'],
  [/(pollo|(^|[^a-z])aves?([^a-z]|$)|alitas)/, 'drumstick', 'ambar'],
  [/(embutido|iberico|jamon|chacina|tabla)/, 'ham', 'rojo'],
  [/(carne|parrilla|brasa|chuleton|ternera|cerdo|cordero|asado)/, 'beef', 'rojo'],
  [/(arroz|arroces|paella|guiso|cuchara|potaje|cocido|olla)/, 'cooking-pot', 'ambar'],
  [/(sopa|crema|caldo)/, 'soup', 'ambar'],
  [/(huevo|tortilla)/, 'egg-fried', 'amarillo'],
  [/(vegetariano|vegano|verdura|vegetal)/, 'leaf', 'verde'],
  [/fruta/, 'cherry', 'rojo'],
  [/(entrante|para picar|picoteo|tapa|racion|ensalada|primero|compartir)/, 'salad', 'verde'],
  [/(menu|del dia|chef|degustacion)/, 'chef-hat', 'naranja'],
  // Lo principal de la carta (0143): «Principales» salía en gris y sin nada que lo distinguiera.
  [/(principal|segundo|plato fuerte|especialidad|de la casa)/, 'utensils-crossed', 'morado'],
];

/**
 * **Lo que Estook pone solo a una sección por su nombre** (R3, maqueta «Icono y color»):
 * «Cervezas» → la jarra en naranja; «Vinos» → la copa en morado; «Lo más pedido» → la estrella
 * en amarillo. El local lo cambia en Ajustes del TPV › Productos y precios, y lo suyo manda.
 */
export function comoSeVeElNombre(nombre: string): ComoSeVeLaSeccion {
  const limpio = sinAcentos(nombre).trim().replace(/\s+/g, ' ');
  for (const [encaja, icono, color] of POR_EL_NOMBRE) {
    if (encaja.test(limpio)) return { icono, color };
  }
  return { icono: 'utensils-crossed', color: null };
}

/** Cómo se ve una sección: lo que eligió el local, y si no, lo que propone su nombre. */
export function comoSeVeLaSeccion(seccion: {
  readonly nombre: string;
  readonly color: ColorDeLaBotonera | null;
  readonly icono?: IconoDeLaSeccion | null;
}): ComoSeVeLaSeccion {
  const propone = comoSeVeElNombre(seccion.nombre);
  return { icono: seccion.icono ?? propone.icono, color: seccion.color ?? propone.color };
}

/** Cómo se montó la botonera (Anexo 11.11, «Al empezar: tres caminos»). */
export const CAMINOS_DE_LA_BOTONERA = ['toda_la_carta', 'elegir', 'de_cero'] as const;
export type CaminoDeLaBotonera = (typeof CAMINOS_DE_LA_BOTONERA)[number];

const DE_LA_BARRA =
  /(bebida|refresco|cerveza|vino|cava|champan|cafe|infusion|copa|coctel|combinado|licor|agua|zumo|vermut|sidra)/;
const DEL_1 = /(entrante|para picar|picoteo|tapa|racion|ensalada|primero|sopa|crema|compartir)/;
const DEL_2 =
  /(principal|segundo|carne|pescado|arroz|arroces|pizza|hamburguesa|parrilla|brasa|pasta|plato fuerte)/;
const DEL_POSTRE = /(postre|dulce|tarta|helado)/;
/** Una sección de pan (o de pan y agua): lo sirve el camarero, sin pasar por nadie. */
const DE_PAN = /(^|[^a-z])(pan|panes)([^a-z]|$)/;

/**
 * **Lo que se propone por el nombre de la sección** (la tabla de 11.11): el pan, Nadie y
 * Bebidas (lo sirve el camarero al sentarse); las bebidas, los
 * vinos, los cafés y las copas, Barra y Bebidas; los entrantes y los primeros, Cocina y 1.º;
 * los principales y los segundos, Cocina y 2.º; los postres, Cocina y Postre; y cualquier
 * otra, Cocina y 1.º.
 */
export function loQueProponeElNombre(nombre: string): {
  readonly quienLoPrepara: QuienLoPrepara;
  readonly pase: PaseDeLaBotonera;
} {
  const limpio = sinAcentos(nombre);
  if (DEL_POSTRE.test(limpio)) return { quienLoPrepara: 'cocina', pase: 'postre' };
  if (DE_PAN.test(limpio)) return { quienLoPrepara: 'nadie', pase: 'bebidas' };
  if (DE_LA_BARRA.test(limpio)) return { quienLoPrepara: 'barra', pase: 'bebidas' };
  if (DEL_2.test(limpio)) return { quienLoPrepara: 'cocina', pase: '2' };
  if (DEL_1.test(limpio)) return { quienLoPrepara: 'cocina', pase: '1' };
  return { quienLoPrepara: 'cocina', pase: '1' };
}

/** Lo que manda en un botón: lo suyo si lo cambió, y si no, lo de su página. */
export function loQueValeEnElBoton(
  pagina: { readonly quienLoPrepara: QuienLoPrepara; readonly pase: PaseDeLaBotonera },
  boton: {
    readonly quienLoPrepara: QuienLoPrepara | null;
    readonly pase: PaseDeLaBotonera | null;
  },
): { readonly quienLoPrepara: QuienLoPrepara; readonly pase: PaseDeLaBotonera } {
  return {
    quienLoPrepara: boton.quienLoPrepara ?? pagina.quienLoPrepara,
    pase: boton.pase ?? pagina.pase,
  };
}

/** El destino de la línea de la cuenta (`linea_de_cuenta.destino`) de quien lo prepara. */
export function elDestinoDeLaLinea(quien: QuienLoPrepara): 'cocina' | 'barra' | 'ninguno' {
  return quien === 'nadie' ? 'ninguno' : quien;
}

/** Cuántos salen en «Lo más pedido», y cuántas semanas mira (Anexo 11.10). */
export const LO_MAS_PEDIDO = { cuantos: 12, semanas: 4, horasAlrededor: 1 } as const;

// ── El pan, el agua y los cafés, en su página de siempre (0112) ───────────────

/**
 * **Las páginas de siempre** (0112): en cualquier TPV de hostelería el pan y el agua van
 * juntos y los sirve el camarero, y los cafés y las infusiones tienen su página, que hace la
 * barra. Aunque la carta los tenga en Entrantes o en Postres, en el TPV van aquí: es donde el
 * camarero los busca.
 */
export const LAS_PAGINAS_DE_SIEMPRE = {
  pan: { nombre: 'Pan y agua', quienLoPrepara: 'nadie', pase: 'bebidas' },
  cafes: { nombre: 'Cafés', quienLoPrepara: 'barra', pase: 'bebidas' },
} as const satisfies Record<
  string,
  {
    readonly nombre: string;
    readonly quienLoPrepara: QuienLoPrepara;
    readonly pase: PaseDeLaBotonera;
  }
>;
export type PaginaDeSiempre = keyof typeof LAS_PAGINAS_DE_SIEMPRE;

// Solo el pan que se sirve con la comida: «Pan con tomate» o «Pan de ajo» se cocinan.
const ES_PAN =
  /^(pan|panes|pan (blanco|integral|sin gluten|de pueblo|casero|rustico|payes|de centeno|de cristal|de molde|de masa madre|artesano)|cesta de pan|servicio de pan|picos|reganas|colines)$/;
const ES_AGUA =
  /^(agua|aguas|agua mineral|agua (con|sin) gas|agua (grande|pequena|de litro|de medio litro)|botella de agua|solan de cabras|font vella|bezoya|lanjaron|vichy catalan)( \d.*)?$/;
const ES_CAFE =
  /^(cafe|cafes|cortado|carajillo|capuchino|cappuccino|descafeinado|expreso|espresso|americano|leche manchada|infusion|infusiones|te|poleo|poleo menta|rooibos|chocolate caliente|cola cao|colacao)( |$)/;
const DE_CAFES = /(cafe|infusion)/;

/** Si un plato es el pan o el agua de la mesa, por su nombre. */
export function esPanOAgua(nombre: string): boolean {
  const limpio = sinAcentos(nombre).trim().replace(/\s+/g, ' ');
  return ES_PAN.test(limpio) || ES_AGUA.test(limpio);
}

/** Si un plato es el pan de la mesa (para «Pan para 4»), por su nombre. */
export function esElPan(nombre: string): boolean {
  return ES_PAN.test(sinAcentos(nombre).trim().replace(/\s+/g, ' '));
}

/**
 * **A qué página de siempre va un plato** al traerlo de la carta (0112): el pan y el agua, a
 * «Pan y agua»; los cafés y las infusiones, a «Cafés». **Solo si su sección no es ya la
 * suya**: el café de «Cafés e infusiones» se queda en su página.
 */
export function laPaginaDeSiempre(plato: string, seccion: string | null): PaginaDeSiempre | null {
  const deLaSeccion = sinAcentos(seccion ?? '');
  const limpio = sinAcentos(plato).trim().replace(/\s+/g, ' ');
  if (esPanOAgua(plato)) return DE_PAN.test(deLaSeccion) ? null : 'pan';
  if (ES_CAFE.test(limpio)) return DE_CAFES.test(deLaSeccion) ? null : 'cafes';
  return null;
}
