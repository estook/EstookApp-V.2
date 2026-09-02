/**
 * Motor de textos (M2).
 *
 * Todo lo que lee una persona pasa por aquí. El Plan lo exige en su definición de
 * terminado: «los textos van por el motor de textos, **en español de España, sin
 * jerga y sin emojis**».
 *
 * Y el principio 14 del Manifiesto: **«Cero jerga. "Lo que hay en cámara", no
 * "stock disponible"».** Quien usa Estook lleva veinte años con un bar, no con un
 * ordenador.
 */

import type { Cantidad } from './coste.ts';
import type { FechaOperativa } from './tiempo.ts';

// ── Lo que no se escribe nunca ────────────────────────────────────────────────

/**
 * Palabras que no aparecen en Estook. No es una lista de estilo: es que cada una
 * de ellas obliga a quien lee a traducir mentalmente.
 */
export const JERGA_PROHIBIDA: Readonly<Record<string, string>> = {
  'stock disponible': 'lo que hay en cámara',
  stock: 'lo que hay',
  sku: 'producto',
  input: 'campo',
  log: 'registro',
  dashboard: 'panel',
  performance: 'velocidad',
  reporting: 'informes',
  user: 'persona',
  item: 'línea',
  timestamp: 'hora',
  deploy: 'publicación',
};

const EMOJI = /\p{Extended_Pictographic}/u;

/**
 * Palabras que en castellano llevan tilde o eñe **siempre**, escritas sin ella.
 *
 * ── Por qué esta lista existe ────────────────────────────────────────────────
 *
 * Al mirar M4 en un móvil de verdad se vio una pantalla que decía «todavia no
 * tengo datos» al lado de otra que decía «¿Dónde estás hoy?». Las dos son
 * nuestras, y las dos están en la misma aplicación.
 *
 * No es una falta de ortografía suelta: es que **una aplicación que escribe mal
 * la mitad del tiempo parece hecha con prisa**, y este producto se lo vende a
 * gente que desconfía. El Manifiesto pide «español de España» y este motor es
 * quien lo hace cumplir.
 *
 * ── Lo que NO está aquí, y por qué ───────────────────────────────────────────
 *
 * Solo palabras que **no existen sin tilde**. Nada de `esta`/`está`, `mas`/`más`
 * o `si`/`sí`, que son dos palabras distintas y las dos correctas: marcarlas
 * llenaría la comprobación de avisos falsos, y una comprobación que grita se
 * acaba apagando.
 *
 * Y ninguna llana acabada en `-s`: «acciones», «opciones» y «organizaciones» se
 * escriben tal cual. Estaban en la primera versión de esta lista, apuntando a sí
 * mismas, y la comprobación las marcaba como falta. Que una lista de faltas
 * tuviera faltas habría sido el colmo.
 *
 * Tampoco `cuanto`, y esto lo aprendí escribiéndolo: «en cuanto se conecte el
 * TPV» **no lleva tilde**, y «¿cuántos platos tienen ficha?» sí. Sin distinguir
 * la pregunta de la locución, la comprobación marcaba como falta media
 * aplicación bien escrita.
 */
export const SIEMPRE_CON_TILDE: Readonly<Record<string, string>> = {
  accion: 'acción',
  ademas: 'además',
  alergeno: 'alérgeno',
  alergenos: 'alérgenos',
  anadir: 'añadir',
  ano: 'año',
  anos: 'años',
  apareceran: 'aparecerán',
  aplicacion: 'aplicación',
  aqui: 'aquí',
  articulo: 'artículo',
  articulos: 'artículos',
  asi: 'así',
  atencion: 'atención',
  auditoria: 'auditoría',
  auditorias: 'auditorías',
  automatico: 'automático',
  camara: 'cámara',
  camaras: 'cámaras',
  categoria: 'categoría',
  categorias: 'categorías',
  codigo: 'código',
  codigos: 'códigos',
  companeros: 'compañeros',
  comprobacion: 'comprobación',
  configuracion: 'configuración',
  contrasena: 'contraseña',
  contrasenas: 'contraseñas',
  correccion: 'corrección',
  deberia: 'debería',
  deberian: 'deberían',
  descripcion: 'descripción',
  despues: 'después',
  desviacion: 'desviación',
  dia: 'día',
  dias: 'días',
  direccion: 'dirección',
  edicion: 'edición',
  elaboracion: 'elaboración',
  ensena: 'enseña',
  ensenan: 'enseñan',
  ensenar: 'enseñar',
  estan: 'están',
  explicacion: 'explicación',
  exportacion: 'exportación',
  facturacion: 'facturación',
  gestion: 'gestión',
  gestoria: 'gestoría',
  grafica: 'gráfica',
  graficas: 'gráficas',
  importacion: 'importación',
  informacion: 'información',
  limite: 'límite',
  linea: 'línea',
  lineas: 'líneas',
  manana: 'mañana',
  navegacion: 'navegación',
  ningun: 'ningún',
  numero: 'número',
  numeros: 'números',
  opcion: 'opción',
  organizacion: 'organización',
  pagina: 'página',
  paginas: 'páginas',
  pequena: 'pequeña',
  pequeno: 'pequeño',
  pideselo: 'pídeselo',
  produccion: 'producción',
  proposito: 'propósito',
  publicacion: 'publicación',
  rapido: 'rápido',
  relacion: 'relación',
  resena: 'reseña',
  resenas: 'reseñas',
  revision: 'revisión',
  seccion: 'sección',
  segun: 'según',
  sesion: 'sesión',
  tamano: 'tamaño',
  tambien: 'también',
  telefono: 'teléfono',
  titulo: 'título',
  todavia: 'todavía',
  ubicacion: 'ubicación',
  ultima: 'última',
  ultimo: 'último',
  unica: 'única',
  unico: 'único',
  version: 'versión',
};

/**
 * Comprueba que un texto cumple las reglas. Se usa en las pruebas: un texto que
 * no las cumple no llega a producción.
 */
export function revisarTexto(texto: string): readonly string[] {
  const problemas: string[] = [];

  if (EMOJI.test(texto)) {
    problemas.push('lleva emoji, y en Estook no se usan');
  }

  for (const palabra of texto.toLowerCase().match(/[a-záéíóúñü]+/g) ?? []) {
    const bien = SIEMPRE_CON_TILDE[palabra];
    if (bien !== undefined) {
      problemas.push(`escribe «${palabra}»; se escribe «${bien}»`);
    }
  }

  const enMinusculas = texto.toLowerCase();
  for (const [jerga, mejor] of Object.entries(JERGA_PROHIBIDA)) {
    if (new RegExp(`\\b${jerga}\\b`, 'i').test(enMinusculas)) {
      problemas.push(`dice «${jerga}»; en Estook se dice «${mejor}»`);
    }
  }

  if (/[!¡]/.test(texto)) {
    problemas.push('lleva signo de exclamación, y el tono de Estook es sereno');
  }

  return problemas;
}

// ── Escribir en español de España ─────────────────────────────────────────────

/** «1 producto» · «3 productos». Sin el «(s)» de los formularios feos. */
export function plural(cuantos: number, singular: string, plural_: string): string {
  return `${cuantos} ${cuantos === 1 ? singular : plural_}`;
}

/**
 * «pan, queso y tomate». Con la conjunción de verdad, no con una coma final.
 * Y con la «e» cuando toca: «agua e hielo».
 */
export function enumerar(cosas: readonly string[]): string {
  if (cosas.length === 0) return '';
  if (cosas.length === 1) return cosas[0] ?? '';

  const ultima = cosas[cosas.length - 1] ?? '';
  const anteriores = cosas.slice(0, -1).join(', ');
  const conjuncion = /^[iíhH]/.test(ultima) && !/^hi[aeo]/i.test(ultima) ? 'e' : 'y';
  return `${anteriores} ${conjuncion} ${ultima}`;
}

const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
] as const;

/** «1 de septiembre de 2026». Como se escribe una fecha aquí. */
export function fechaEnLetra(fecha: FechaOperativa): string {
  const [anio, mes, dia] = fecha.split('-').map(Number) as [number, number, number];
  return `${dia} de ${MESES[mes - 1] ?? '?'} de ${anio}`;
}

/** «01/09/2026», para tablas y documentos donde la letra ocupa demasiado. */
export function fechaCorta(fecha: FechaOperativa): string {
  const [anio, mes, dia] = fecha.split('-') as [string, string, string];
  return `${dia}/${mes}/${anio}`;
}

/** Cantidades con su unidad, sin decimales que sobren: «1,5 kg», «250 g». */
export function conUnidad(cuanto: Cantidad, unidad: string): string {
  const limpio = Number(cuanto)
    .toFixed(4)
    .replace(/\.?0+$/, '')
    .replace('.', ',');
  return `${limpio} ${unidad}`;
}

/** Un porcentaje, desde su fracción: 0,1 se lee «10 %». */
export function comoPorcentaje(fraccion: number, decimales = 0): string {
  return `${(fraccion * 100).toFixed(decimales).replace('.', ',')} %`;
}

/**
 * Cuánto hace, en palabras. «hace 3 días», «hace un momento».
 * Los dos instantes vienen de fuera: aquí no se lee ningún reloj (regla 10).
 */
export function haceCuanto(desde: FechaOperativa, hasta: FechaOperativa): string {
  const aUtc = (f: FechaOperativa) => {
    const [anio, mes, dia] = f.split('-').map(Number) as [number, number, number];
    return Date.UTC(anio, mes - 1, dia);
  };
  const dias = (aUtc(hasta) - aUtc(desde)) / 86_400_000;

  if (dias === 0) return 'hoy';
  if (dias === 1) return 'ayer';
  if (dias < 0) return `dentro de ${plural(-dias, 'día', 'días')}`;
  if (dias < 30) return `hace ${plural(dias, 'día', 'días')}`;
  if (dias < 365) return `hace ${plural(Math.floor(dias / 30), 'mes', 'meses')}`;
  return `hace ${plural(Math.floor(dias / 365), 'año', 'años')}`;
}
