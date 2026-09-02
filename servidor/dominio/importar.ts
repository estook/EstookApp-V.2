import { parecido, sinAcentos } from '@estook/dominio';

/**
 * Leer un fichero y proponer su mapeo (M5).
 *
 * «Importadores desde Excel, CSV, PDF y foto, con el mapeo propuesto por Fogón y
 *  confirmado por una persona» (Manifiesto 8) · «Se sube un CSV con columnas
 *  raras → se propone el mapeo y se pide confirmar → pantalla de emparejar
 *  columnas con vista previa de 5 filas» (Auditoría, parte 5).
 *
 * ── Por qué el mapeo lo propone el código y no el modelo ─────────────────────
 *
 * Porque es una regla, no una opinión. La Evolución 1.0 lo escribe como norma de
 * Fogón: «**las reglas van en código** [...] son condiciones, no opiniones, y no
 * gastan un solo crédito» (capítulo 8, regla 4).
 *
 * Emparejar la columna «Correo electrónico» con el campo `correo` es parecido de
 * texto, exactamente el mismo cálculo que ya hace el buscador universal de M3.
 * Llamar a un modelo para eso sería pagar por una decisión determinista, tardar
 * dos segundos y poder equivocarse de formas nuevas.
 *
 * Cuando llegue M22, Fogón podrá mejorar la propuesta **en los casos raros** —una
 * columna que se llame «Quién» y contenga nombres— y ahí sí aporta. El camino
 * normal no le necesita, y eso es lo que hace que el importador funcione con los
 * créditos agotados.
 *
 * ── Y por qué esto vive en `servidor/dominio` ────────────────────────────────
 *
 * Porque es cálculo puro: entra texto, sale una propuesta. No toca Postgres, no
 * toca la red y se puede probar entero sin levantar nada. Es lo que la parte A4
 * pide de esta capa.
 */

/** Lo que se puede leer: cabeceras y filas, ya separadas. */
export interface FicheroLeido {
  readonly columnas: readonly string[];
  readonly filas: readonly (readonly string[])[];
}

/**
 * Lee un CSV, con las tres cosas que rompen un lector ingenuo.
 *
 *   · **Comillas.** Un campo entrecomillado puede llevar comas dentro, y llevar
 *     comillas escapadas doblándolas.
 *   · **Saltos de línea dentro de un campo.** Una dirección de dos líneas es
 *     normal, y partirla por el salto convierte una fila en dos.
 *   · **El separador.** Un Excel en español exporta con punto y coma, no con
 *     coma, porque la coma es el separador decimal. Media hostelería exporta así.
 *
 * No se usa una librería porque son cuarenta líneas y porque «ninguna dependencia
 * nueva sin justificarla»; y un CSV mal leído no falla, **entra mal**, que es
 * peor. Por eso hay pruebas de las tres cosas.
 */
export function leerCsv(texto: string): FicheroLeido {
  // El BOM que pone el Bloc de notas, escrito con su codigo: un caracter
  // invisible en un fichero fuente no lo puede revisar nadie. Sin quitarlo, se
  // colaria en el nombre de la primera columna y «nombre» no emparejaria.
  const limpio = texto.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
  const separador = adivinarSeparador(limpio);

  const filas: string[][] = [];
  let fila: string[] = [];
  let campo = '';
  let entreComillas = false;

  for (let i = 0; i < limpio.length; i++) {
    // `noUncheckedIndexedAccess` dice que puede ser `undefined`, y tiene razon
    // en general aunque aqui el indice este acotado. Se resuelve con un valor
    // por defecto en vez de con una asercion: una asercion es una promesa que
    // nadie comprueba.
    const letra = limpio[i] ?? '';

    if (entreComillas) {
      if (letra === '"') {
        // Dos comillas seguidas dentro de un campo son una comilla literal.
        if (limpio[i + 1] === '"') {
          campo += '"';
          i++;
        } else {
          entreComillas = false;
        }
      } else {
        campo += letra;
      }
      continue;
    }

    if (letra === '"' && campo === '') {
      entreComillas = true;
    } else if (letra === separador) {
      fila.push(campo.trim());
      campo = '';
    } else if (letra === '\n') {
      fila.push(campo.trim());
      campo = '';
      filas.push(fila);
      fila = [];
    } else {
      campo += letra;
    }
  }

  // Lo que quede sin cerrar es la última fila, que puede no acabar en salto.
  if (campo !== '' || fila.length > 0) {
    fila.push(campo.trim());
    filas.push(fila);
  }

  // Se tiran las filas enteramente vacías: una línea en blanco al final es lo
  // más común del mundo y no es una persona sin nombre.
  const conContenido = filas.filter((f) => f.some((c) => c !== ''));
  const columnas = conContenido[0] ?? [];

  return { columnas, filas: conContenido.slice(1) };
}

/**
 * Coma o punto y coma, lo que aparezca más veces en la primera línea.
 *
 * Se mira solo la cabecera a propósito: es la línea que seguro tiene un
 * separador por columna y ningún dato raro dentro.
 */
function adivinarSeparador(texto: string): string {
  const cabecera = texto.slice(0, texto.indexOf('\n') === -1 ? undefined : texto.indexOf('\n'));
  const comas = (cabecera.match(/,/g) ?? []).length;
  const puntoYComa = (cabecera.match(/;/g) ?? []).length;
  const tabuladores = (cabecera.match(/\t/g) ?? []).length;

  if (tabuladores > comas && tabuladores > puntoYComa) return '\t';
  return puntoYComa > comas ? ';' : ',';
}

// ── La propuesta de mapeo ────────────────────────────────────────────────────

/** Un campo nuestro, con cómo suele llamarse en un fichero de fuera. */
export interface CampoDestino {
  readonly campo: string;
  readonly comoSeLlama: readonly string[];
  readonly obligatorio: boolean;
}

/**
 * Los campos del equipo, que es el único destino que existe hoy.
 *
 * Los sinónimos son los que de verdad salen de un TPV, de una gestoría o de un
 * Excel hecho a mano. No se inventan: si mañana aparece uno nuevo, se añade aquí
 * y el importador entero se entera.
 */
export const CAMPOS_DEL_EQUIPO: readonly CampoDestino[] = [
  {
    campo: 'nombre',
    comoSeLlama: ['nombre', 'nombres', 'name', 'empleado', 'trabajador', 'persona'],
    obligatorio: true,
  },
  {
    campo: 'apellidos',
    comoSeLlama: ['apellidos', 'apellido', 'surname', 'apellidos y nombre'],
    obligatorio: false,
  },
  {
    campo: 'correo',
    comoSeLlama: ['correo', 'correo electronico', 'email', 'e-mail', 'mail'],
    obligatorio: true,
  },
  {
    campo: 'rol',
    comoSeLlama: ['rol', 'puesto', 'cargo', 'categoria', 'perfil', 'funcion'],
    obligatorio: false,
  },
];

export interface Emparejamiento {
  readonly campo: string;
  /** La columna del fichero, o nulo si no se ha encontrado ninguna que encaje. */
  readonly columna: string | null;
  /** Cuánto se parecen, de 0 a 1. Sirve para pintar «seguro» o «revísalo». */
  readonly confianza: number;
}

/**
 * Cuánto tiene que parecerse una columna para proponerla.
 *
 * Más alto que el 0,18 del buscador de datos, y por la misma razón que el del
 * buscador de acciones es 0,3: aquí una propuesta mala no es un resultado de
 * más en una lista, es un dato que acaba en la ficha de una persona. **Ante la
 * duda, mejor no proponer nada y que lo diga quien mira.**
 */
export const UMBRAL_DEL_MAPEO = 0.35;

/**
 * Empareja las columnas del fichero con nuestros campos.
 *
 * Dos formas de encajar, en este orden:
 *
 *   1. **Se llama igual que uno de sus nombres conocidos.** «Email» es `correo`
 *      sin discutir.
 *   2. **Se parece por trigramas.** «Corrreo electronico» con tres erres sigue
 *      siendo `correo`.
 *
 * Y una regla que evita el desastre silencioso: **una columna no se puede
 * asignar a dos campos**. Sin esto, un fichero con «Nombre» y «Nombre completo»
 * podría mandar la misma columna a `nombre` y a `apellidos`, y la mitad de la
 * plantilla entraría llamándose igual que su apellido.
 */
export function proponerMapeo(
  columnas: readonly string[],
  campos: readonly CampoDestino[] = CAMPOS_DEL_EQUIPO,
): Emparejamiento[] {
  const cogidas = new Set<string>();
  const propuestas: Emparejamiento[] = [];

  // Los obligatorios primero: si hay que dejar un campo sin columna, que sea uno
  // que se pueda vivir sin él.
  const enOrden = [...campos].sort((a, b) => Number(b.obligatorio) - Number(a.obligatorio));

  for (const campo of enOrden) {
    let mejor: { columna: string; confianza: number } | null = null;

    for (const columna of columnas) {
      if (cogidas.has(columna)) continue;

      const limpia = sinAcentos(columna.trim());
      if (limpia === '') continue;

      const exacta = campo.comoSeLlama.some((nombre) => sinAcentos(nombre) === limpia);
      const confianza = exacta
        ? 1
        : Math.max(...campo.comoSeLlama.map((nombre) => parecido(nombre, limpia)));

      if (confianza >= UMBRAL_DEL_MAPEO && (mejor === null || confianza > mejor.confianza)) {
        mejor = { columna, confianza };
      }
    }

    if (mejor !== null) cogidas.add(mejor.columna);
    propuestas.push({
      campo: campo.campo,
      columna: mejor?.columna ?? null,
      confianza: mejor?.confianza ?? 0,
    });
  }

  // Se devuelven en el orden en que se declararon, no en el que se resolvieron:
  // la pantalla los pinta como una lista y el orden tiene que ser estable.
  return campos.map(
    (campo) =>
      propuestas.find((p) => p.campo === campo.campo) ?? {
        campo: campo.campo,
        columna: null,
        confianza: 0,
      },
  );
}

/**
 * La huella de un fichero, que es lo que hace verdad «importar dos veces el
 * mismo fichero no cambia nada» (Manifiesto 28).
 *
 * SHA-256 con `crypto.subtle`, que existe igual en Node, en Deno y en el
 * navegador; la misma razón por la que las contraseñas se derivan así
 * (decisión 0010).
 */
export async function huellaDelFichero(contenido: string): Promise<string> {
  const bytes = new TextEncoder().encode(contenido);
  const resumen = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(resumen)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
