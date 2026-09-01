import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { crearDespachador, type Puertos } from './despachador.ts';
import { catalogo } from './catalogo.ts';
import { comando, FalloDeAplicacion, type Contexto } from './contrato.ts';

/**
 * M2 · el criterio de terminado, literal:
 *
 * > «El mismo comando tres veces con la misma clave produce **un solo efecto**.»
 *
 * Se prueba con un comando que cuenta cuántas veces se ha ejecutado de verdad.
 * Si la idempotencia funciona, ese contador se queda en uno por muchas veces que
 * se llame.
 */

function bancoDePruebas() {
  const claves = new Map<string, { huella: string; respuesta: unknown }>();
  let vecesEjecutado = 0;

  const contador = comando<{ cuanto: number }, { total: number }>({
    nombre: 'sumar',
    entrada: z.object({ cuanto: z.number() }).strict(),
    ejecutar(_contexto, entrada) {
      vecesEjecutado += 1;
      return Promise.resolve({ total: entrada.cuanto });
    },
  });

  const queFalla = comando<Record<string, never>, never>({
    nombre: 'siempre_falla',
    entrada: z.object({}).strict(),
    ejecutar() {
      throw new FalloDeAplicacion('periodo_cerrado');
    },
  });

  catalogo.comandos[contador.nombre] = contador as never;
  catalogo.comandos[queFalla.nombre] = queFalla as never;

  const puertos: Puertos = {
    enTransaccion: (quien, hacer) =>
      hacer({
        sql: null as unknown as Contexto['sql'],
        personaId: quien.personaId,
        correlacionId: quien.correlacionId,
        ahora: new Date(Date.UTC(2026, 8, 1)),
      }),

    recordar: (_contexto, clave, nombre, entrada) => {
      const guardada = claves.get(clave);
      if (!guardada) return Promise.resolve({ estado: 'nueva' as const });
      const huella = `${nombre}:${JSON.stringify(entrada)}`;
      return Promise.resolve(
        guardada.huella === huella
          ? { estado: 'repetida' as const, respuesta: guardada.respuesta }
          : { estado: 'clave_reutilizada' as const },
      );
    },

    anotar: (_contexto, clave, nombre, entrada, respuesta) => {
      claves.set(clave, { huella: `${nombre}:${JSON.stringify(entrada)}`, respuesta });
      return Promise.resolve();
    },
  };

  return {
    despachador: crearDespachador(puertos),
    veces: () => vecesEjecutado,
  };
}

const quien = { personaId: 'una-persona', correlacionId: 'un-hilo' };

describe('el mismo comando tres veces con la misma clave', () => {
  it('produce UN SOLO efecto', async () => {
    const { despachador, veces } = bancoDePruebas();

    for (let intento = 1; intento <= 3; intento += 1) {
      const salida = await despachador.ejecutar(quien, 'sumar', { cuanto: 5 }, 'la-misma-clave');
      expect(salida.estado === 'fallo' ? salida.codigo : salida.estado).not.toBe('fallo');
    }

    expect(veces(), 'el comando solo debe haberse ejecutado una vez').toBe(1);
  });

  it('y las tres veces devuelven lo mismo', async () => {
    const { despachador } = bancoDePruebas();

    const primera = await despachador.ejecutar(quien, 'sumar', { cuanto: 7 }, 'clave-repetida');
    const segunda = await despachador.ejecutar(quien, 'sumar', { cuanto: 7 }, 'clave-repetida');

    expect(primera.estado).toBe('ok');
    expect(segunda.estado).toBe('repetida');
    expect(segunda.estado !== 'fallo' && segunda.datos).toEqual({ total: 7 });
  });

  it('con claves distintas si se ejecuta cada vez', async () => {
    const { despachador, veces } = bancoDePruebas();
    await despachador.ejecutar(quien, 'sumar', { cuanto: 1 }, 'clave-a');
    await despachador.ejecutar(quien, 'sumar', { cuanto: 1 }, 'clave-b');
    expect(veces()).toBe(2);
  });

  it('la misma clave para otra cosa distinta se rechaza, no se confunde', async () => {
    const { despachador } = bancoDePruebas();
    await despachador.ejecutar(quien, 'sumar', { cuanto: 1 }, 'clave-reutilizada');
    const otra = await despachador.ejecutar(quien, 'sumar', { cuanto: 999 }, 'clave-reutilizada');

    expect(otra.estado).toBe('fallo');
    if (otra.estado === 'fallo') {
      expect(otra.detalle?.['porque']).toMatch(/no puede significar dos cosas/i);
    }
  });

  it('sin clave no se ejecuta nada', async () => {
    const { despachador, veces } = bancoDePruebas();
    const salida = await despachador.ejecutar(quien, 'sumar', { cuanto: 1 }, '');
    expect(salida.estado).toBe('fallo');
    expect(veces()).toBe(0);
  });

  it('si el comando falla, la clave NO se anota y el reintento vuelve a intentarlo', async () => {
    const { despachador } = bancoDePruebas();
    const primera = await despachador.ejecutar(quien, 'siempre_falla', {}, 'clave-de-fallo');
    expect(primera.estado === 'fallo' && primera.codigo).toBe('periodo_cerrado');

    // La segunda vuelve a fallar igual, no devuelve una respuesta guardada.
    const segunda = await despachador.ejecutar(quien, 'siempre_falla', {}, 'clave-de-fallo');
    expect(segunda.estado === 'fallo' && segunda.codigo).toBe('periodo_cerrado');
  });
});

describe('las consultas no llevan clave, porque no cambian nada', () => {
  it('una consulta que no existe se dice, no se inventa', async () => {
    const { despachador } = bancoDePruebas();
    const salida = await despachador.consultar(quien, 'inventada', {});
    expect(salida.estado === 'fallo' && salida.codigo).toBe('no_existe');
  });

  it('un identificador con mala forma se para antes de tocar la base de datos', async () => {
    const { despachador } = bancoDePruebas();
    const salida = await despachador.consultar(quien, 'un_local', { id: 'no-soy-un-uuid' });
    expect(salida.estado === 'fallo' && salida.codigo).toBe('faltan_datos');
  });
});
