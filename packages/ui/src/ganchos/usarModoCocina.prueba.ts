import { describe, expect, it } from 'vitest';
import {
  ATRIBUTO,
  DONDE_SE_GUARDA,
  PUESTO,
  guardarEn,
  leerDe,
  type DondeSeRecuerda,
} from './usarModoCocina.ts';

/**
 * El modo cocina · mejora 1 de la entrega V.
 *
 * ── Qué se comprueba aquí, y qué no ─────────────────────────────────────────
 *
 * Aquí, **lo que decide si está puesto**: qué se guarda, qué se borra, y que un
 * almacén que no deja escribir no tire la aplicación abajo.
 *
 * Lo que cambia de aspecto —los 64 px, el AAA, la letra— lo comprueba
 * `contraste.prueba.ts` leyendo `cocina.css`, que es donde vive de verdad.
 * Comprobarlo también aquí sería tener el valor en dos sitios (regla 6).
 *
 * Y que el interruptor de Ajustes hace lo que dice, y que con el modo puesto
 * ningún botón baja de 64 px, es de las pruebas de pantalla: eso hay que verlo
 * pintado, no en memoria.
 *
 * ── Por qué no se monta React ───────────────────────────────────────────────
 *
 * Porque probar un gancho imitando `useState` y `useEffect` es probar la
 * imitación, y se rompe el día que React cambie por dentro. Lo que tiene lógica
 * propia está sacado a dos funciones sin React, y es lo que se prueba.
 */

/** Un almacén de mentira, con lo justo que pide `DondeSeRecuerda`. */
function almacen(inicial: Record<string, string> = {}) {
  const datos = new Map(Object.entries(inicial));
  return {
    getItem: (clave: string) => datos.get(clave) ?? null,
    setItem: (clave: string, valor: string) => {
      datos.set(clave, valor);
    },
    removeItem: (clave: string) => {
      datos.delete(clave);
    },
    datos,
  };
}

/** Uno que se niega a todo, como en navegación privada. */
const bloqueado: DondeSeRecuerda = {
  getItem: () => {
    throw new Error('almacenamiento bloqueado');
  },
  setItem: () => {
    throw new Error('almacenamiento bloqueado');
  },
  removeItem: () => {
    throw new Error('almacenamiento bloqueado');
  },
};

describe('el modo cocina se recuerda en el aparato', () => {
  it('de fabrica esta apagado', () => {
    // Es lo que hace que quien no entre en Ajustes vea **exactamente** lo de
    // siempre: sin la clave no hay atributo, y sin atributo `cocina.css` no
    // pinta nada.
    expect(leerDe(almacen())).toBe(false);
  });

  it('si el aparato lo tenia puesto, arranca puesto', () => {
    expect(leerDe(almacen({ [DONDE_SE_GUARDA]: PUESTO }))).toBe(true);
  });

  it('cualquier otra cosa guardada se lee como apagado', () => {
    // Una version vieja, o alguien toqueteando el almacenamiento a mano. Ante la
    // duda, modo normal: es el que no sorprende a nadie.
    expect(leerDe(almacen({ [DONDE_SE_GUARDA]: 'true' }))).toBe(false);
    expect(leerDe(almacen({ [DONDE_SE_GUARDA]: '' }))).toBe(false);
  });

  it('ponerlo lo guarda', () => {
    const donde = almacen();
    guardarEn(donde, true);
    expect(donde.datos.get(DONDE_SE_GUARDA)).toBe(PUESTO);
  });

  it('quitarlo borra la clave, no guarda un «no»', () => {
    // Una clave que no esta es un aparato que nunca lo toco, y es lo mismo que
    // un aparato que lo apago. Dos formas de escribir lo mismo son dos formas de
    // que un dia no coincidan.
    const donde = almacen({ [DONDE_SE_GUARDA]: PUESTO });
    guardarEn(donde, false);
    expect(donde.datos.has(DONDE_SE_GUARDA)).toBe(false);
  });

  it('con el almacenamiento bloqueado no revienta, ni al leer ni al escribir', () => {
    // Navegacion privada, o un navegador con el almacenamiento capado. La
    // aplicacion tiene que seguir funcionando; lo unico que se pierde es poder
    // recordarlo la proxima vez.
    expect(leerDe(bloqueado)).toBe(false);
    expect(() => {
      guardarEn(bloqueado, true);
    }).not.toThrow();
    expect(() => {
      guardarEn(bloqueado, false);
    }).not.toThrow();
  });

  it('sin navegador tampoco revienta', () => {
    // El servidor no tiene `localStorage`, y estas funciones viven en un paquete
    // que tambien se importa desde ahi.
    expect(leerDe(undefined)).toBe(false);
    expect(() => {
      guardarEn(undefined, true);
    }).not.toThrow();
  });

  it('el atributo es el que lee cocina.css', () => {
    // Si alguien renombra uno de los dos, esto salta. Sin esta linea, el modo se
    // guardaria bien y no cambiaria nada en pantalla, que es el fallo mas caro
    // de encontrar: todo «funciona» y no se ve.
    expect(ATRIBUTO).toBe('data-cocina');
    expect(PUESTO).toBe('si');
  });
});
