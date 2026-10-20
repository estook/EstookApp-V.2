import { desdeEuros } from './dinero.ts';
import { sinAcentos } from './parecido.ts';

/**
 * Leer la carta que ya tiene el local (M10 · 1, decisión 0102; Plan, M10, y 0049).
 *
 * «4 platos nuevos, 2 precios distintos, 1 que ya no está · ¿actualizo tu carta?»:
 * Estook lee la carta en papel y **propone**; nada cambia hasta que alguien dice que sí.
 *
 *   · `leerLasLineas`  de las líneas de texto de un PDF (las saca el móvil, sin IA) a
 *                      los platos con su precio y su sección.
 *   · `compararConLaCarta`  de lo leído a la propuesta: nuevos, precios distintos y
 *                      los que ya no están.
 *
 * Una foto o un PDF escaneado lo lee Fogón (`leer_la_carta_con_fogon`), que devuelve lo
 * mismo que `leerLasLineas`: la comparación es una sola.
 *
 * **Se empareja por el nombre exacto**, sin mayúsculas, acentos ni signos: «Croquetas de
 * jamón» y «Croquetas caseras» son dos platos. Así una carta con dos precios cambiados
 * propone exactamente esos dos (Plan, M10, «Terminado cuando»), y nada se cambia por un
 * parecido.
 */

export interface PlatoLeido {
  readonly nombre: string;
  /** El precio, con IVA, en céntimos. Nulo si no se ha leído. */
  readonly precioCentimos: number | null;
  /** La sección de la carta en papel en la que estaba, si había. */
  readonly seccion: string | null;
  readonly descripcion: string | null;
  /** Si tenía más de un precio (media y ración): se queda el último y se dice. */
  readonly otrosPrecios: readonly number[];
}

export interface CartaLeida {
  readonly platos: readonly PlatoLeido[];
  /** Las líneas con un precio que no se han entendido como plato. */
  readonly sinEntender: readonly string[];
}

/** El precio más alto que se cree: lo de encima es un teléfono, un año o un código. */
const PRECIO_MAXIMO_CREIBLE = 100_000;
const LARGO_MAXIMO_DEL_NOMBRE = 120;

/** Las secciones más comunes de una carta, para reconocerlas aunque no vayan en mayúsculas. */
const SECCIONES_CONOCIDAS = [
  'entrantes',
  'para picar',
  'para compartir',
  'raciones',
  'medias raciones',
  'tapas',
  'pinchos',
  'ensaladas',
  'sopas',
  'cremas',
  'verduras',
  'de la huerta',
  'primeros',
  'segundos',
  'principales',
  'platos principales',
  'carnes',
  'pescados',
  'del mar',
  'mariscos',
  'arroces',
  'pastas',
  'pizzas',
  'hamburguesas',
  'bocadillos',
  'sandwiches',
  'tostas',
  'huevos',
  'guarniciones',
  'postres',
  'dulces',
  'bebidas',
  'refrescos',
  'cervezas',
  'vinos',
  'vinos tintos',
  'vinos blancos',
  'cafes',
  'cafes e infusiones',
  'infusiones',
  'cocteles',
  'copas',
  'licores',
  'menu infantil',
  'para los peques',
  'sugerencias',
  'fuera de carta',
] as const;

/** Lo que no es ni plato ni sección: avisos legales, el pie y la cabecera. */
const LO_QUE_NO_ES_UN_PLATO =
  /(^|[^\p{L}])(iva|i\.v\.a|impuestos|al[eé]rgen\p{L}*|tel[eé]fono|tel\.|reservas|horario|p[aá]gina|precios en euros|pan y servicio|suplemento terraza)([^\p{L}]|$)|www\.|https?:|@/iu;

/** Los puntitos, guiones y barras que unen el nombre y el precio en una carta. */
const RELLENO = /[\s.·…_\-–—|/:]*$/;

function aCentimos(texto: string): number | null {
  const conPunto = texto.replace(',', '.');
  const valor = Number(conPunto);
  if (!Number.isFinite(valor)) return null;
  const enCentimos = desdeEuros(valor);
  return enCentimos > 0 && enCentimos <= PRECIO_MAXIMO_CREIBLE ? enCentimos : null;
}

/**
 * Los precios del final de una línea, del primero al último, y lo que queda delante.
 *
 * «Calamares ... 6,00 / 10,00 €» → [600, 1000] y «Calamares». Un número entero sin
 * euro solo cuenta si va al final y no lleva unidad detrás: «Entrecot 300 g 24» es 24,
 * pero «Ración de 6 croquetas» no tiene precio.
 */
export function preciosDelFinal(linea: string): { delante: string; precios: number[] } {
  const precios: number[] = [];
  let resto = linea.trimEnd();
  for (let vuelta = 0; vuelta < 3; vuelta += 1) {
    const ultimo = /(\d{1,4}(?:[.,]\d{1,2})?)\s*(€|eur(?:os)?)?\s*$/i.exec(resto);
    if (ultimo === null) break;
    const [entero, numero, simbolo] = ultimo as unknown as [string, string, string | undefined];
    const conDecimales = /[.,]\d{1,2}$/.test(numero);
    const delanteDelNumero = resto.slice(0, resto.length - entero.length);
    // Un número pegado a una letra («6uds», «x2») o en medio de una palabra no es precio.
    if (/[\p{L}]$/u.test(delanteDelNumero)) break;
    if (!conDecimales && simbolo === undefined) {
      // Sin euro ni decimales, solo si es el único número del final y es creíble.
      const enteroSolo = Number(numero);
      if (precios.length > 0 || enteroSolo > 200) break;
      // «… para 2 personas 24»: el 24 vale; «Ración de 6» sin nada más, no.
      if (!/[\s.·…_\-–—|/:]{2,}$|\s$/.test(delanteDelNumero)) break;
      if (/\b(de|x|con|para|por)\s*$/i.test(delanteDelNumero.trimEnd())) break;
    }
    const valor = aCentimos(numero);
    if (valor === null) break;
    precios.unshift(valor);
    resto = delanteDelNumero.replace(RELLENO, '');
    // Entre dos precios suele haber una barra o «ración»/«media»: se quitan.
    resto = resto.replace(/\s*(media|ración|racion|1\/2|tapa|copa|botella)\s*$/i, '').trimEnd();
  }
  return { delante: resto.replace(RELLENO, '').trim(), precios };
}

/** Un nombre escrito todo en mayúsculas pasa a «Así»: «CROQUETAS DE JAMÓN» → «Croquetas de jamón». */
function comoNombre(texto: string): string {
  const limpio = texto
    .replace(/^[\s•·*\-–—>»]+/, '')
    .replace(/\s+/g, ' ')
    .trim();
  const letras = limpio.replace(/[^\p{L}]/gu, '');
  if (letras.length > 0 && letras === letras.toUpperCase()) {
    const minusculas = limpio.toLocaleLowerCase('es');
    return minusculas.charAt(0).toLocaleUpperCase('es') + minusculas.slice(1);
  }
  return limpio;
}

function esUnaSeccion(linea: string): boolean {
  const limpio = linea.replace(/[:.\s]+$/, '').trim();
  if (limpio.length < 3 || limpio.length > 40 || /\d/.test(limpio)) return false;
  const letras = limpio.replace(/[^\p{L}]/gu, '');
  if (letras.length < 3) return false;
  const clave = sinAcentos(limpio)
    .replace(/[^a-z ]/g, '')
    .trim();
  if ((SECCIONES_CONOCIDAS as readonly string[]).includes(clave)) return true;
  // En mayúsculas y corto, o acabado en dos puntos: es una cabecera.
  return (
    (letras === letras.toUpperCase() && limpio.split(/\s+/).length <= 4) || /:\s*$/.test(linea)
  );
}

/**
 * De las líneas de texto de una carta a sus platos.
 *
 * Las líneas vienen como las saca el PDF: «Croquetas de jamón ........ 8,50 €». Una línea
 * sin precio es una **sección** si lo parece (mayúsculas, dos puntos o un nombre de
 * sección conocido); si no, la **descripción** del plato de encima; y un precio solo en
 * su línea es el del plato de encima que no tenía.
 */
export function leerLasLineas(lineas: readonly string[]): CartaLeida {
  const platos: { -readonly [K in keyof PlatoLeido]: PlatoLeido[K] }[] = [];
  const sinEntender: string[] = [];
  let seccion: string | null = null;
  const vistos = new Set<string>();
  // Una línea sin precio que no es sección: o cuenta el plato de encima, o es un plato
  // con el precio en la línea de abajo. Se sabe al leer la siguiente.
  let pendiente: string | null = null;

  /** Lo pendiente pasa a ser lo que cuenta el plato de encima, si es de su sección. */
  function comoDescripcion() {
    const ultimo = platos[platos.length - 1];
    if (pendiente !== null && ultimo !== undefined && ultimo.seccion === seccion) {
      const texto = pendiente.slice(0, 300);
      ultimo.descripcion =
        ultimo.descripcion === null ? texto : `${ultimo.descripcion} ${texto}`.slice(0, 500);
    }
    pendiente = null;
  }

  function anadir(nombre: string, precios: readonly number[], linea: string) {
    if (nombre.length > LARGO_MAXIMO_DEL_NOMBRE) {
      sinEntender.push(linea);
      return;
    }
    const clave = claveDelNombre(nombre);
    if (vistos.has(clave)) return;
    vistos.add(clave);
    platos.push({
      nombre,
      precioCentimos: precios[precios.length - 1] ?? null,
      seccion,
      descripcion: null,
      otrosPrecios: precios.slice(0, -1),
    });
  }

  for (const cruda of lineas) {
    const linea = cruda.replace(/\s+/g, ' ').trim();
    if (linea === '' || LO_QUE_NO_ES_UN_PLATO.test(linea)) continue;

    const { delante, precios } = preciosDelFinal(linea);

    if (precios.length === 0) {
      comoDescripcion();
      if (esUnaSeccion(linea)) seccion = comoNombre(linea.replace(/[:.\s]+$/, ''));
      else pendiente = linea;
      continue;
    }

    const nombre = comoNombre(delante);
    if (nombre === '' || nombre.replace(/[^\p{L}]/gu, '').length < 2) {
      // Solo un precio: el del plato de la línea de arriba.
      if (pendiente !== null) {
        const deArriba = comoNombre(pendiente);
        pendiente = null;
        anadir(deArriba, precios, linea);
      } else {
        sinEntender.push(linea);
      }
      continue;
    }

    comoDescripcion();
    anadir(nombre, precios, linea);
  }
  comoDescripcion();

  return { platos, sinEntender };
}

/**
 * La clave de un nombre para emparejar: sin mayúsculas, acentos ni signos.
 * «Croquetas de jamón.» y «CROQUETAS DE JAMON» son lo mismo.
 */
export function claveDelNombre(nombre: string): string {
  return sinAcentos(nombre)
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

export interface PlatoDeLaCarta {
  readonly id: string;
  readonly nombre: string;
  readonly precioCentimos: number | null;
  readonly activo: boolean;
}

export interface LoQueCambia {
  readonly nuevos: readonly PlatoLeido[];
  readonly precios: readonly {
    readonly platoId: string;
    readonly nombre: string;
    readonly antes: number | null;
    readonly ahora: number;
  }[];
  readonly yaNoEstan: readonly { readonly platoId: string; readonly nombre: string }[];
  /** Los que están igual: ni nuevos ni con otro precio. */
  readonly iguales: number;
}

/**
 * Lo que cambiaría en tu carta con lo leído.
 *
 * Un plato archivado que vuelve a salir cuenta como nuevo: al crearlo, vuelve con su
 * historial (`crear_platos`). Un plato leído sin precio no cambia el tuyo.
 */
export function compararConLaCarta(
  leidos: readonly PlatoLeido[],
  carta: readonly PlatoDeLaCarta[],
): LoQueCambia {
  const activos = new Map(carta.filter((p) => p.activo).map((p) => [claveDelNombre(p.nombre), p]));
  const nuevos: PlatoLeido[] = [];
  const precios: { platoId: string; nombre: string; antes: number | null; ahora: number }[] = [];
  const encontrados = new Set<string>();
  let iguales = 0;

  for (const leido of leidos) {
    const clave = claveDelNombre(leido.nombre);
    const suyo = activos.get(clave);
    if (suyo === undefined) {
      nuevos.push(leido);
      continue;
    }
    encontrados.add(suyo.id);
    if (leido.precioCentimos !== null && leido.precioCentimos !== suyo.precioCentimos) {
      precios.push({
        platoId: suyo.id,
        nombre: suyo.nombre,
        antes: suyo.precioCentimos,
        ahora: leido.precioCentimos,
      });
    } else {
      iguales += 1;
    }
  }

  const yaNoEstan = [...activos.values()]
    .filter((p) => !encontrados.has(p.id))
    .map((p) => ({ platoId: p.id, nombre: p.nombre }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));

  return { nuevos, precios, yaNoEstan, iguales };
}

/** «4 platos nuevos · 2 precios distintos · 1 que ya no está». */
export function resumenDeLoQueCambia(cambia: LoQueCambia): string {
  const partes: string[] = [];
  const n = cambia.nuevos.length;
  const p = cambia.precios.length;
  const y = cambia.yaNoEstan.length;
  if (n > 0) partes.push(`${String(n)} ${n === 1 ? 'plato nuevo' : 'platos nuevos'}`);
  if (p > 0) partes.push(`${String(p)} ${p === 1 ? 'precio distinto' : 'precios distintos'}`);
  if (y > 0) partes.push(`${String(y)} ${y === 1 ? 'que ya no está' : 'que ya no están'}`);
  return partes.length === 0 ? 'Tu carta ya está como la leída' : partes.join(' · ');
}
