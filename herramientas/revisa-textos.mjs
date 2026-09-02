/**
 * Revisa lo que lee una persona en la pantalla.
 *
 *   pnpm textos
 *
 * ── Por qué existe esta herramienta ──────────────────────────────────────────
 *
 * Al mirar M4 en un móvil de verdad —la regla 11— apareció una pantalla que
 * decía «todavia no tengo datos» justo al lado de otra que decía «¿Dónde estás
 * hoy?». Las dos son nuestras y las dos estaban publicadas.
 *
 * No es una falta suelta: es que **M0 y M3 escribieron sin tildes y M4 con
 * ellas**, y nadie lo vio porque cada módulo se miró por separado. Una aplicación
 * que escribe mal la mitad del tiempo parece hecha con prisa, y esto se le vende
 * a gente que ya desconfía.
 *
 * Se arregla una vez y **se deja comprobado**, que es lo único que impide que
 * vuelva. Es la misma idea que el presupuesto de tamaño: una regla que se cumple
 * porque alguien se acuerda, no se cumple.
 *
 * ── Qué mira, y qué no ───────────────────────────────────────────────────────
 *
 * Solo **texto de cara al usuario**: lo que hay suelto dentro de JSX y las
 * cadenas largas. No mira comentarios, ni nombres de cosas, ni códigos internos.
 *
 * Y a propósito **no toca**:
 *
 *   · Los códigos de permiso (`accion.fichar`, `app.gestoria`). Son un catálogo
 *     cerrado que cuadra con la base de datos: cambiarlos rompería M1.
 *   · Las clases de CSS (`text-seccion`, `bg-atencion-suave`). Son las fichas de
 *     B1, y están en la lista de lo que no se toca.
 *   · Los códigos de error y de destino (`sin_sesion`, `elegir_organizacion`).
 *
 * Todos esos llevan guion bajo o punto, o son una sola palabra en minúsculas. Es
 * lo que los distingue de una frase.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SIEMPRE_CON_TILDE } from '../packages/dominio/src/textos.ts';

const RAIZ = fileURLToPath(new URL('../', import.meta.url));

/** Donde vive lo que lee una persona. */
const DONDE_MIRAR = ['apps', 'packages/ui/src', 'packages/dominio/src'];

const SIN_MIRAR = ['node_modules', 'dist', '.turbo', 'coverage'];

const ficheros = [];
function recorrer(carpeta) {
  let dentro;
  try {
    dentro = readdirSync(carpeta);
  } catch {
    return;
  }
  for (const nombre of dentro) {
    if (SIN_MIRAR.includes(nombre)) continue;
    const camino = join(carpeta, nombre);
    if (statSync(camino).isDirectory()) recorrer(camino);
    else if (/\.(tsx|ts)$/.test(nombre) && !nombre.includes('.prueba.')) ficheros.push(camino);
  }
}
for (const carpeta of DONDE_MIRAR) recorrer(join(RAIZ, carpeta));

/** Fuera los comentarios: ahí se escribe sin tildes a propósito. */
function sinComentarios(texto) {
  return texto.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
}

/**
 * Lo que **no** es una frase para una persona.
 *
 * Un identificador (`elegir_organizacion`), un camino (`app.gestoria`), una clase
 * de CSS (`text-seccion font-semibold`) o una sola palabra en minúsculas.
 */
function noEsUnaFrase(trozo) {
  // Fuera lo que quede delante despues de quitar lo interpolado: `${que}: todavia
  // no tengo datos` empieza por dos puntos cuando se le quita el hueco, y eso lo
  // tomaba por codigo. Era el texto que mas se lee de toda la aplicacion.
  const limpio = trozo.trim().replace(/^[^A-Za-zÁÉÍÓÚÑÜáéíóúñü¿«]+/, '');

  // Un identificador o un camino: `elegir_organizacion`, `app.gestoria`.
  if (limpio.includes('_')) return true;
  if (/^[a-z][\w.]*$/.test(limpio)) return true;

  // Codigo que se cuela por los `<` y `>` de una comparacion o de un generico.
  // Una frase para una persona no lleva punto y coma, ni igual, ni corchetes, ni
  // parentesis de llamada.
  if (/[;={}[\]()$`]/.test(limpio)) return true;

  // Un camino de importacion (`../sesion/Sesion.tsx`) no lleva espacios.
  if (!/\s/.test(limpio)) return true;

  // Ni una frase lleva extension de fichero.
  if (/\.(tsx?|css|svg|png|mjs|json)\b/.test(limpio)) return true;

  // Una lista de clases de CSS: todo en minusculas **y con al menos un guion,
  // dos puntos o barra**, que es lo que tiene una clase y no tiene una frase.
  //
  // Sin esa segunda mitad, «todavia no tengo datos» pasaba por lista de clases y
  // se colaba. Era, con diferencia, el texto que mas se lee de toda la
  // aplicacion: sale en las ocho apps y en cada widget del Panel.
  if (/^[a-z0-9:./&-]+(\s+[a-z0-9:./&-]+)*$/.test(limpio) && /[-:/]/.test(limpio)) return true;

  // Un trozo de codigo suelto empieza por coma, parentesis o dos puntos.
  if (!/^[A-Za-zÁÉÍÓÚÑÜáéíóúñü¿«]/.test(limpio)) return true;

  // Y una frase tiene al menos dos palabras. Con una sola es un nombre de campo
  // («, accion:») o un trozo de codigo, no algo que alguien lea.
  if ((limpio.match(/[A-Za-zÁÉÍÓÚÑÜáéíóúñü]{2,}/g) ?? []).length < 2) return true;

  return false;
}

const hallazgos = [];

for (const fichero of ficheros) {
  const limpio = sinComentarios(readFileSync(fichero, 'utf8'));

  const trozos = [
    ...[...limpio.matchAll(/>([^<>{}]{4,})</g)].map((m) => m[1]),
    ...[...limpio.matchAll(/'([^'\\\n]{6,})'|"([^"\\\n]{6,})"/g)].map((m) => m[1] ?? m[2]),
    // Las plantillas, con lo interpolado sustituido por un hueco.
    //
    // Sin esto se escapaba justo el texto que se vio mal en el movil:
    // `${que}: todavia no tengo datos`, que lleva un `${...}` dentro y por eso
    // no cuadraba con una cadena normal. Era el que mas se lee de todos.
    ...[...limpio.matchAll(/`([^`\\]{6,}?)`/g)].map((m) =>
      (m[1] ?? '').replace(/\$\{[^}]*\}/g, ' '),
    ),
  ];

  for (const trozo of trozos) {
    if (noEsUnaFrase(trozo)) continue;

    for (const palabra of trozo.toLowerCase().match(/[a-záéíóúñü]+/g) ?? []) {
      const bien = SIEMPRE_CON_TILDE[palabra];
      if (bien === undefined) continue;
      hallazgos.push({
        fichero: fichero.replace(RAIZ, '').replaceAll('\\', '/'),
        palabra,
        bien,
        frase: trozo.trim().replace(/\s+/g, ' ').slice(0, 70),
      });
    }
  }
}

console.log('Revision de los textos de pantalla\n');

if (hallazgos.length === 0) {
  console.log('  todo el texto que lee una persona esta en espanol de Espana\n');
  process.exit(0);
}

const porFichero = new Map();
for (const h of hallazgos) porFichero.set(h.fichero, [...(porFichero.get(h.fichero) ?? []), h]);

for (const [fichero, suyos] of [...porFichero].sort()) {
  console.log(`  ${fichero}`);
  const vistos = new Set();
  for (const h of suyos) {
    const clave = `${h.palabra}·${h.frase}`;
    if (vistos.has(clave)) continue;
    vistos.add(clave);
    console.log(`      «${h.palabra}» deberia ser «${h.bien}»  ·  ${h.frase}`);
  }
}

console.log(`\n  ${hallazgos.length} palabra(s) mal escritas en ${porFichero.size} fichero(s)\n`);
process.exit(1);
