import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { catalogo } from './catalogo.ts';

/**
 * Que cada comando y cada consulta los llame alguien desde una pantalla.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * Esta prueba existe porque M5 se dejó tres fallos dentro con 613 en verde
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Los tres eran la misma forma de fallo, y es la más callada que hay: **código
 * escrito, registrado y probado por dentro al que no llegaba nadie desde la
 * pantalla.** No da error. No rompe ninguna prueba. No se ve hasta que alguien
 * intenta usarlo y no puede.
 *
 *   · `salir_de_la_demostracion` estaba hecho y probado, y el botón «Salir»
 *     llamaba a `salir`, que devolvía 403. La sesión seguía viva en el servidor
 *     y la promesa era «se entra y se sale sin dejar rastro».
 *   · `quitar_logo` estaba hecho y probado, y en la pantalla no había botón:
 *     quien subía el logo de la cadena en vez del de su local podía
 *     sustituirlo, jamás volver a no tener ninguno.
 *   · Y `quien_soy` no contaba que estabas en una demostración, así que la
 *     aplicación enseñaba botones de guardar que iban a fallar.
 *
 * De los catorce fallos de M5, **seis los encontró mirar la aplicación en un
 * móvil**, y esta familia era la mayoría. Escribir la lección en un documento no
 * la impide: la impide una prueba (E4). Esta es esa prueba.
 *
 * ── Lo que comprueba, y lo que NO ────────────────────────────────────────────
 *
 * Comprueba que el **nombre** de cada operación aparece en el código de alguna
 * aplicación. Es una comprobación de texto, y no pretende ser más: no sabe si el
 * botón se ve, si está deshabilitado o si la pantalla se puede alcanzar. Eso lo
 * miran las pruebas de extremo a extremo, y sobre todo mirarlo en un móvil de
 * verdad (regla 11).
 *
 * Pero caza exactamente el fallo que se coló tres veces: **construir algo y no
 * enchufarlo a nada**. Con que alguien escriba el nombre en la aplicación, ya
 * hay un sitio desde donde tirar del hilo.
 *
 * ── Y por qué la lista de excepciones se escribe con su motivo ───────────────
 *
 * Porque una excepción sin motivo es una excepción que se copia. Cada línea de
 * abajo dice por qué esa operación no la llama ninguna pantalla, y si algún día
 * deja de ser verdad, se borra la línea.
 */

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));

/**
 * Las que a propósito no llama ninguna pantalla, con su porqué.
 *
 * Ojo: **estar aquí no es gratis.** Si una operación entra en esta lista sin un
 * motivo que se sostenga, lo que se ha hecho es apagar la comprobación.
 */
const NO_LAS_LLAMA_NADIE: Readonly<Record<string, string>> = {
  // El cliente de la API la llama por su cuenta, dentro de `@estook/cliente-api`,
  // y no desde una pantalla: es el latido que dice si hay servidor.
  salud: 'La llama el cliente de la API, no una pantalla',

  // Las recetas de referencia son de M5 y su consumidor es M9, que es quien
  // copia una receta a una ficha técnica. Está dicho en ESTADO.md, sin redondear:
  // «`recetas_de_referencia` no la consume nadie todavía, y se deja a propósito».
  recetas_de_referencia: 'La consume M9, que es quien copia una receta a una ficha técnica',

  // ── Las tres que esta prueba encontró en cuanto se escribió ────────────────
  //
  // Son de M2 y M3, y **M4 las dejó sin trabajo sin que nadie se diera cuenta**:
  // `quien_soy` devuelve de una vez la persona, su organización, su local, sus
  // locales visibles y sus permisos resueltos, así que la aplicación no necesita
  // preguntar lo mismo tres veces más.
  //
  // No se borran aquí porque quitar operaciones de la API es una decisión de
  // producto —el contrato mantiene compatibilidad N−2— y no la toma un módulo de
  // inventario. Queda apuntado en ESTADO.md para decidirlo a propósito.
  mis_locales: 'La sustituyó `quien_soy` en M4, que ya devuelve los locales visibles',
  mis_permisos: 'La sustituyó `quien_soy` en M4, que ya devuelve los permisos resueltos',
  un_local:
    'Es la prueba del 403 de M2: la ejercita `acceso.spec.ts` llamando a la API a pelo, que es su sitio',

  // M5 unificó las dos salidas en `cerrarLaSesion`, que es el único punto donde
  // se decide que una visita se borra en vez de cerrarse. La pantalla llama a
  // `salir` para las dos, y ese fue el arreglo. Esta se queda porque la API
  // mantiene sus operaciones dos versiones, no porque falte una pantalla.
  salir_de_la_demostracion: 'M5 unificó las dos salidas en `salir`; esta se queda por el contrato',

  // `reactivar_producto` **ya no está aquí**, y la razón por la que estuvo es de
  // las que hay que recordar. Decía «su pantalla es la lista de desactivados, que
  // llega con M8», y sonaba razonable. Lo que ocultaba era esto: se podía
  // desactivar un producto y **no había forma de volver a verlo**, ni de traerlo
  // de vuelta, hasta dos módulos después.
  //
  // «Si algo se puede poner, tiene que poderse quitar» —y al revés— no es una
  // regla que se pueda aplazar a un módulo siguiente: mientras tanto, la
  // aplicación tiene una puerta de salida sin puerta de entrada. Ahora la lista
  // de Productos trae su «ver también los desactivados» y la ficha su «volver a
  // activarlo», que era todo lo que hacía falta.
  //
  // La lección: **una excepción apuntada con una razón bonita sigue siendo un
  // agujero.** Esta lista sirve para no olvidarlos, no para justificarlos.
};

/** Todos los ficheros de código de las cuatro aplicaciones, leídos una vez. */
async function codigoDeLasApps(): Promise<string> {
  const trozos: string[] = [];

  async function recorrer(carpeta: string): Promise<void> {
    const entradas = await readdir(carpeta, { withFileTypes: true });
    for (const entrada of entradas) {
      const camino = join(carpeta, entrada.name);
      if (entrada.isDirectory()) {
        if (entrada.name === 'node_modules' || entrada.name === 'dist') continue;
        await recorrer(camino);
        continue;
      }
      if (!/\.(ts|tsx)$/.test(entrada.name)) continue;
      trozos.push(await readFile(camino, 'utf8'));
    }
  }

  for (const app of ['app', 'admin', 'carta', 'web']) {
    await recorrer(join(RAIZ, 'apps', app, 'src'));
  }

  return trozos.join('\n');
}

describe('lo que se construye, se usa', () => {
  it('cada comando lo llama alguien desde una pantalla', async () => {
    const codigo = await codigoDeLasApps();

    const huerfanos = Object.keys(catalogo.comandos).filter(
      (nombre) => !(nombre in NO_LAS_LLAMA_NADIE) && !codigo.includes(`'${nombre}'`),
    );

    expect(
      huerfanos,
      `Estos comandos están registrados y no los llama ninguna aplicación. O se enchufan a una pantalla, o se apuntan en NO_LAS_LLAMA_NADIE con el motivo escrito.`,
    ).toEqual([]);
  });

  it('cada consulta la lee alguien desde una pantalla', async () => {
    const codigo = await codigoDeLasApps();

    const huerfanas = Object.keys(catalogo.consultas).filter(
      (nombre) => !(nombre in NO_LAS_LLAMA_NADIE) && !codigo.includes(`'${nombre}'`),
    );

    expect(
      huerfanas,
      `Estas consultas están registradas y no las lee ninguna aplicación. O se enchufan a una pantalla, o se apuntan en NO_LAS_LLAMA_NADIE con el motivo escrito.`,
    ).toEqual([]);
  });

  it('y la lista de excepciones no tiene nombres que ya no existen', () => {
    // Una excepción que sobrevive a la operación que excusaba es una comprobación
    // apagada para siempre y sin que nadie se entere.
    const existen = new Set([
      ...Object.keys(catalogo.comandos),
      ...Object.keys(catalogo.consultas),
      // `salud` no está en el catálogo: es una ruta de la API, no una operación.
      'salud',
    ]);

    const sobran = Object.keys(NO_LAS_LLAMA_NADIE).filter((nombre) => !existen.has(nombre));
    expect(sobran).toEqual([]);
  });

  it('cada excepción trae un motivo escrito de verdad', () => {
    const sinMotivo = Object.entries(NO_LAS_LLAMA_NADIE)
      .filter(([, motivo]) => motivo.trim().length < 20)
      .map(([nombre]) => nombre);

    expect(sinMotivo).toEqual([]);
  });
});
