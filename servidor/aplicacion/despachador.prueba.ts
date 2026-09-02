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
 *
 * M4 añade la segunda mitad: **las tres puertas**. Sin sesión, con la sesión a
 * medias esperando el segundo factor, y con una contraseña que puso otra persona.
 */

/** Una sesión normal y corriente: entrada, con su segundo factor y su contraseña. */
const SESION_NORMAL: Contexto['sesion'] = {
  id: 'una-sesion',
  personaId: 'una-persona',
  organizacionId: 'una-organizacion',
  localId: 'un-local',
  dobleFactorSuperado: true,
  debeCambiarClave: false,
};

/**
 * Un `sql` que no toca nada y devuelve vacio.
 *
 * Aqui no hay base de datos a proposito: lo que se prueba es el despachador. Con
 * `null` las operaciones que pasan la puerta reventaban con un TypeError y no se
 * podia distinguir «la puerta la dejo pasar» de «la puerta la paro». Con esto,
 * pasar la puerta y no encontrar datos es lo normal.
 */
const SQL_VACIO = (() => Promise.resolve([])) as unknown as Contexto['sql'];

function bancoDePruebas(sesion: Contexto['sesion'] = SESION_NORMAL) {
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
        sql: SQL_VACIO,
        // Desde M4 la persona sale de la sesion resuelta, no de quien llama.
        personaId: sesion?.personaId ?? null,
        sesion,
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

const quien = { tokenDeSesion: 'un-token', correlacionId: 'un-hilo' };

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

// ── M4 · las tres puertas ────────────────────────────────────────────────────

/**
 * Estas seis pruebas son las que impiden el peor fallo posible de M4: que una
 * operación se cuele sin sesión porque quien la escribió se olvidó de mirarla.
 *
 * No comprueban una operación concreta: comprueban **el despachador**, que es
 * quien las mira por todas. Una operación nueva nace protegida sin hacer nada, y
 * abrir una puerta es declararlo.
 */
describe('sin haber entrado', () => {
  it('ningún comando pasa', async () => {
    const { despachador, veces } = bancoDePruebas(null);
    const salida = await despachador.ejecutar(quien, 'sumar', { cuanto: 1 }, 'una-clave');

    expect(salida.estado === 'fallo' && salida.codigo).toBe('sin_sesion');
    // Y no llega ni a ejecutarse: se para antes, no después.
    expect(veces()).toBe(0);
  });

  it('ninguna consulta pasa', async () => {
    const { despachador } = bancoDePruebas(null);
    const salida = await despachador.consultar(quien, 'mis_locales', {});
    expect(salida.estado === 'fallo' && salida.codigo).toBe('sin_sesion');
  });

  it('salvo `entrar`, que es lo que se llama para entrar', async () => {
    const { despachador } = bancoDePruebas(null);
    const salida = await despachador.ejecutar(
      quien,
      'entrar',
      { correo: 'rosa@ejemplo.estook.com', contrasena: 'lo que sea' },
      'clave-de-entrada',
    );

    // Falla porque no hay base de datos detrás en este banco de pruebas, pero
    // **no** falla por la puerta: eso es lo que se está comprobando.
    expect(salida.estado === 'fallo' && salida.codigo).not.toBe('sin_sesion');
  });
});

describe('con la sesión a medias, esperando el segundo factor', () => {
  const A_MEDIAS = { ...SESION_NORMAL, dobleFactorSuperado: false };

  it('no pasa nada, o exigir doble factor sería decorativo', async () => {
    const { despachador, veces } = bancoDePruebas(A_MEDIAS);
    const salida = await despachador.ejecutar(quien, 'sumar', { cuanto: 1 }, 'una-clave');

    expect(salida.estado === 'fallo' && salida.codigo).toBe('falta_doble_factor');
    expect(veces()).toBe(0);
  });

  it('ni las consultas: los datos son lo que protege el segundo factor', async () => {
    const { despachador } = bancoDePruebas(A_MEDIAS);
    const salida = await despachador.consultar(quien, 'mis_locales', {});
    expect(salida.estado === 'fallo' && salida.codigo).toBe('falta_doble_factor');
  });

  it('salvo superar el segundo factor y salir', async () => {
    const { despachador } = bancoDePruebas(A_MEDIAS);

    for (const nombre of ['superar_doble_factor', 'salir']) {
      const salida = await despachador.ejecutar(quien, nombre, { codigo: '123456' }, `k-${nombre}`);
      expect(salida.estado === 'fallo' && salida.codigo).not.toBe('falta_doble_factor');
    }
  });
});

describe('con una contraseña que puso otra persona', () => {
  const POR_CAMBIAR = { ...SESION_NORMAL, debeCambiarClave: true };

  it('no se puede cambiar nada', async () => {
    const { despachador, veces } = bancoDePruebas(POR_CAMBIAR);
    const salida = await despachador.ejecutar(quien, 'sumar', { cuanto: 1 }, 'una-clave');

    expect(salida.estado === 'fallo' && salida.codigo).toBe('clave_por_cambiar');
    expect(veces()).toBe(0);
  });

  it('pero sí se puede mirar', async () => {
    // Bloquear también la lectura dejaría a quien acaba de ser invitado mirando
    // una pantalla vacía sin entender qué ha hecho mal.
    const { despachador } = bancoDePruebas(POR_CAMBIAR);
    const salida = await despachador.consultar(quien, 'mis_locales', {});
    expect(salida.estado === 'fallo' && salida.codigo).not.toBe('clave_por_cambiar');
  });

  it('y se puede cambiar la contraseña, que es de lo que se trata', async () => {
    const { despachador } = bancoDePruebas(POR_CAMBIAR);
    const salida = await despachador.ejecutar(
      quien,
      'cambiar_mi_clave',
      { nueva: 'la cocina cierra a las once' },
      'clave-de-cambio',
    );
    expect(salida.estado === 'fallo' && salida.codigo).not.toBe('clave_por_cambiar');
  });
});

describe('las puertas se cierran solas', () => {
  it('todas las operaciones del catálogo exigen sesión, salvo las que lo declaran', () => {
    // Si alguien añade una operación nueva y no dice nada, nace protegida. Esta
    // prueba es la que hace que abrir una puerta tenga que ser deliberado: la
    // lista de excepciones está aquí escrita, y crecer obliga a tocarla.
    const abiertas = [...Object.values(catalogo.consultas), ...Object.values(catalogo.comandos)]
      .filter((operacion) => operacion.sinSesion === true)
      .map((operacion) => operacion.nombre);

    expect(abiertas).toEqual(['entrar']);
  });

  it('y la lista de las que pasan con la sesión a medias está tasada', () => {
    const conSesionAMedias = [
      ...Object.values(catalogo.consultas),
      ...Object.values(catalogo.comandos),
    ]
      .filter((operacion) => operacion.aunSinDobleFactor === true)
      .map((operacion) => operacion.nombre)
      .sort();

    expect(conSesionAMedias).toEqual(
      [
        // Para saber a quién se le está pidiendo el código.
        'quien_soy',
        // Para poder salir sin superarlo.
        'salir',
        // Y para montarlo, si la organización lo exige y todavía no lo tiene.
        'activar_doble_factor',
        'confirmar_doble_factor',
        'superar_doble_factor',
      ].sort(),
    );
  });
});
