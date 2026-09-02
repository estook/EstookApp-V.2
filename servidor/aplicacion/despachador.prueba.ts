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
  esDemostracion: false,
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
        // M5. El despachador no toca ficheros: lo que se prueba aqui son las
        // puertas, y el almacen se enchufa en `servidor/index.ts`.
        almacen: null,
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
      .map((operacion) => operacion.nombre)
      .sort();

    expect(abiertas).toEqual(['entrar', 'entrar_en_demostracion'].sort());
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
        // M5 · una visita de demostracion no tiene segundo factor que superar,
        // asi que sin esto no podria ni irse.
        'salir_de_la_demostracion',
      ].sort(),
    );
  });
});

// ── M5 · la cuarta puerta: la visita que mira y no escribe ───────────────────

describe('una visita de demostración', () => {
  const DEMOSTRACION = { ...SESION_NORMAL, esDemostracion: true };

  it('no puede ejecutar ningún comando', async () => {
    const { despachador, veces } = bancoDePruebas(DEMOSTRACION);
    const salida = await despachador.ejecutar(quien, 'sumar', { cuanto: 1 }, 'una-clave');

    expect(salida.estado === 'fallo' && salida.codigo).toBe('solo_lectura');
    // Y no es que se ejecute y no se guarde: **no se ejecuta**. Es lo que hace
    // verdad «se entra y se sale sin dejar rastro» sin limpiar nada después.
    expect(veces()).toBe(0);
  });

  it('pero puede mirarlo todo, que es a lo que ha venido', async () => {
    const { despachador } = bancoDePruebas(DEMOSTRACION);
    const salida = await despachador.consultar(quien, 'mis_locales', {});
    expect(salida.estado === 'fallo' && salida.codigo).not.toBe('solo_lectura');
  });

  it('y puede irse sin esperar a que caduque', async () => {
    const { despachador } = bancoDePruebas(DEMOSTRACION);
    const salida = await despachador.ejecutar(quien, 'salir_de_la_demostracion', {}, 'k-salir');
    expect(salida.estado === 'fallo' && salida.codigo).not.toBe('solo_lectura');
  });

  it('la lista de lo que puede ejecutar está tasada', () => {
    // Igual que las otras tres puertas: una operación nueva nace cerrada a la
    // demostración, y abrirla obliga a tocar esta lista.
    const enDemostracion = Object.values(catalogo.comandos)
      .filter((comando) => comando.enDemostracion === true)
      .map((comando) => comando.nombre);

    expect(enDemostracion).toEqual(['salir_de_la_demostracion']);
  });
});

// ── M4 · lo que se encontró repasando, y no puede volver ─────────────────────

describe('los secretos no se guardan para repetirlos', () => {
  /**
   * El fallo, tal cual: la idempotencia guarda la respuesta de la primera vez en
   * `estook.clave_de_idempotencia` para devolverla en los reintentos. Y `entrar`
   * devuelve el **token de sesión**.
   *
   * Es decir: la sesión guardaba solo la huella del token, a propósito, para que
   * quien se llevara la base de datos no se llevara ninguna sesión... y la tabla
   * de al lado guardaba el token entero, en claro, veinticuatro horas.
   *
   * Se vio repasando, no probando. Estas dos pruebas son para que no vuelva.
   */
  it('los ocho comandos que devuelven un secreto están marcados', () => {
    const conSecreto = Object.values(catalogo.comandos)
      .filter((comando) => comando.conSecreto === true)
      .map((comando) => comando.nombre)
      .sort();

    expect(conSecreto).toEqual(
      [
        // El token de sesión.
        'entrar',
        // El PIN, en claro y una sola vez.
        'invitar_persona',
        'reactivar_persona',
        'regenerar_pin',
        // El secreto del segundo factor y sus códigos de respaldo.
        'activar_doble_factor',
        'confirmar_doble_factor',
        // M5 · el token de la visita de demostración, y los PIN de todo el
        // equipo que entra de una vez desde un fichero.
        'entrar_en_demostracion',
        'confirmar_importacion',
      ].sort(),
    );
  });

  it('y de esos no se guarda ni se consulta la respuesta', async () => {
    const guardadas: string[] = [];
    const preguntadas: string[] = [];

    const puertos: Puertos = {
      enTransaccion: (quien, hacer) =>
        hacer({
          sql: SQL_VACIO,
          personaId: SESION_NORMAL.personaId,
          sesion: SESION_NORMAL,
          almacen: null,
          correlacionId: quien.correlacionId,
          ahora: new Date(Date.UTC(2026, 8, 1)),
        }),
      recordar: (_contexto, _clave, nombre) => {
        preguntadas.push(nombre);
        return Promise.resolve({ estado: 'nueva' as const });
      },
      anotar: (_contexto, _clave, nombre) => {
        guardadas.push(nombre);
        return Promise.resolve();
      },
    };

    const despachador = crearDespachador(puertos);

    // Con puertos de mentira `entrar` falla al llegar al SQL, pero lo que se
    // comprueba es que **ni siquiera pregunta** por la clave.
    await despachador.ejecutar(
      { tokenDeSesion: null, correlacionId: 'un-hilo' },
      'entrar',
      { correo: 'rosa@ejemplo.estook.com', contrasena: 'lo que sea' },
      'una-clave',
    );

    expect(preguntadas, 'no se pregunta por la clave').toEqual([]);
    expect(guardadas, 'y no se guarda la respuesta').toEqual([]);
  });
});

describe('quien no puede, se le dice bien', () => {
  /**
   * El otro fallo del repaso: `exige` estaba en el contrato desde M2 y **no lo
   * miraba nadie**. La operación quedaba protegida igual —las políticas de M1 no
   * dejan escribir sin permiso— pero la protección llegaba como un error de
   * Postgres, así que un cocinero que intentaba invitar a alguien recibía un
   * `500` y un «se nos ha roto algo por dentro».
   *
   * Que además de feo es mentira: no se había roto nada.
   */
  it('un comando con `exige` se para antes de ejecutarse', async () => {
    const { despachador, veces } = bancoDePruebas();

    catalogo.comandos['solo_para_gerentes'] = comando<Record<string, never>, never>({
      nombre: 'solo_para_gerentes',
      entrada: z.object({}).strict(),
      exige: 'accion.invitar_personas',
      ejecutar() {
        throw new Error('esto no se tenia que haber ejecutado');
      },
    }) as never;

    const salida = await despachador.ejecutar(quien, 'solo_para_gerentes', {}, 'clave-de-permiso');

    // El `sql` de mentira devuelve vacío, así que el nivel no llega a
    // `ver_y_editar` y la puerta se cierra. Con un mensaje de verdad.
    expect(salida.estado === 'fallo' && salida.codigo).toBe('sin_permiso');
    expect(veces()).toBe(0);
  });

  it('y una política de Postgres que dice que no, tampoco es un fallo nuestro', async () => {
    const { despachador } = bancoDePruebas();

    catalogo.comandos['choca_con_la_politica'] = comando<Record<string, never>, never>({
      nombre: 'choca_con_la_politica',
      entrada: z.object({}).strict(),
      ejecutar() {
        // Lo que lanza Postgres cuando una política de M1 rechaza una escritura.
        throw Object.assign(new Error('new row violates row-level security policy'), {
          code: '42501',
        });
      },
    }) as never;

    const salida = await despachador.ejecutar(quien, 'choca_con_la_politica', {}, 'clave-politica');

    expect(salida.estado === 'fallo' && salida.codigo).toBe('sin_permiso');
  });
});
