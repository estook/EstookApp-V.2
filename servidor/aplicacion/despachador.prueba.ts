import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  A_LA_VEZ_EN_UN_LOTE,
  crearDespachador,
  porQueNoPasaElAparato,
  type Puertos,
} from './despachador.ts';
import { catalogo } from './catalogo.ts';
import { comando, consulta, FalloDeAplicacion, type Contexto } from './contrato.ts';

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
  paraAdmin: false,
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

  // Tres consultas para el lote (0085): una que contesta, una que pide un permiso
  // (que este banco no da: la base vacía no devuelve ningún nivel) y una que revienta.
  const libre = consulta<{ eco?: string | undefined }, { eco: string }>({
    nombre: 'una_libre',
    entrada: z.object({ eco: z.string().optional() }).strict(),
    ejecutar: (_contexto, entrada) => Promise.resolve({ eco: entrada.eco ?? '' }),
  });
  const conPermiso = consulta<Record<string, never>, { importe: number }>({
    nombre: 'una_con_precios',
    entrada: z.object({}).strict(),
    exige: 'dato.precio_de_compra',
    ejecutar: () => Promise.resolve({ importe: 1234 }),
  });
  const queRevienta = consulta<Record<string, never>, never>({
    nombre: 'una_que_revienta',
    entrada: z.object({}).strict(),
    ejecutar: () => Promise.reject(new Error('relation "estook.lo_que_sea" does not exist')),
  });
  catalogo.consultas[libre.nombre] = libre as never;
  catalogo.consultas[conPermiso.nombre] = conPermiso as never;
  catalogo.consultas[queRevienta.nombre] = queRevienta as never;

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
        google: null,
        correo: null,
        identidadDeGoogle: null,
        pagos: null,
        pdf: null,
        movil: null,
        correlacionId: quien.correlacionId,
        desde: null,
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

// ── 0085 · varias consultas en una petición ──────────────────────────────────

/**
 * El Panel pide todo junto. Lo que no puede pasar es que **venir en lote abra una
 * puerta**: cada consulta tiene que contestar exactamente lo que contestaría sola.
 */
describe('varias consultas de una vez', () => {
  it('cada una contesta lo suyo, en su orden', async () => {
    const { despachador } = bancoDePruebas();
    const salida = await despachador.consultarVarias(quien, [
      { nombre: 'una_libre', entrada: { eco: 'primera' } },
      { nombre: 'una_libre', entrada: { eco: 'segunda' } },
    ]);
    expect(salida).toEqual([
      { estado: 'ok', datos: { eco: 'primera' } },
      { estado: 'ok', datos: { eco: 'segunda' } },
    ]);
  });

  it('el permiso de cada una se mira igual que si llegara sola', async () => {
    const { despachador } = bancoDePruebas();
    const sola = await despachador.consultar(quien, 'una_con_precios', {});
    const [enLote, laLibre] = await despachador.consultarVarias(quien, [
      { nombre: 'una_con_precios', entrada: {} },
      { nombre: 'una_libre', entrada: {} },
    ]);
    expect(sola.estado === 'fallo' && sola.codigo).toBe('sin_permiso');
    expect(enLote).toEqual(sola);
    // Y la que sí se puede leer, llega.
    expect(laLibre?.estado).toBe('ok');
  });

  it('como mucho seis a la vez, y cada una en su sitio aunque acaben desordenadas', async () => {
    let dentro = 0;
    let lasMas = 0;
    const lenta = consulta<{ n: string }, { n: string }>({
      nombre: 'una_lenta',
      entrada: z.object({ n: z.string() }).strict(),
      async ejecutar(_contexto, { n }) {
        dentro += 1;
        lasMas = Math.max(lasMas, dentro);
        await new Promise((listo) => setTimeout(listo, 20 - Number(n)));
        dentro -= 1;
        return { n };
      },
    });
    catalogo.consultas[lenta.nombre] = lenta as never;
    const { despachador } = bancoDePruebas();
    const salida = await despachador.consultarVarias(
      quien,
      Array.from({ length: 14 }, (_, i) => ({ nombre: 'una_lenta', entrada: { n: String(i) } })),
    );
    expect(lasMas).toBe(A_LA_VEZ_EN_UN_LOTE);
    expect(salida.map((r) => r.estado === 'ok' && (r.datos as { n: string }).n)).toEqual(
      Array.from({ length: 14 }, (_, i) => String(i)),
    );
  });

  it('sin haber entrado no pasa ninguna', async () => {
    const { despachador } = bancoDePruebas(null);
    const salida = await despachador.consultarVarias(quien, [
      { nombre: 'una_libre', entrada: {} },
      { nombre: 'mis_locales', entrada: {} },
    ]);
    expect(salida.map((r) => r.estado === 'fallo' && r.codigo)).toEqual([
      'sin_sesion',
      'sin_sesion',
    ]);
  });

  it('una que no existe, una mal escrita o una que revienta no tumban a las demás', async () => {
    const { despachador } = bancoDePruebas();
    const salida = await despachador.consultarVarias(quien, [
      { nombre: 'inventada', entrada: {} },
      { nombre: 'una_libre', entrada: { eco: 1 } },
      { nombre: 'una_que_revienta', entrada: {} },
      { nombre: 'una_libre', entrada: { eco: 'llego' } },
    ]);
    expect(salida.map((r) => (r.estado === 'fallo' ? r.codigo : r.estado))).toEqual([
      'no_existe',
      'faltan_datos',
      'fallo_nuestro',
      'ok',
    ]);
    // Y lo que reventó no sale con el nombre de la tabla ni media consulta.
    expect(JSON.stringify(salida)).not.toMatch(/relation|estook\./);
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

    expect(abiertas).toEqual(
      [
        'entrar',
        'entrar_en_demostracion',
        // 0041 · la puerta del admin, que abre otra clase de sesión.
        'entrar_en_admin',
        // 0042 · crear cuenta y entrar con Google: quien llega aún no tiene sesión,
        // y la pantalla de entrar necesita saber qué formas hay antes de que la haya.
        'como_se_entra',
        'pedir_codigo_de_registro',
        'confirmar_registro',
        'entrar_con_google',
        // Entrega O (0047) · la carta de un local: quien escanea el QR de la mesa
        // no ha entrado en ningún sitio. Solo devuelve lo que el local ya enseña.
        'la_carta',
        // A2 (0049) · los dos enlaces del cambio de correo de acceso: confirmar el nuevo
        // y pararlo desde el de ahora. Valen por el token del enlace, de un solo uso y
        // con caducidad, y la base solo guarda su huella.
        'confirmar_el_correo_nuevo',
        'parar_el_cambio_de_correo',
        // H1 (0068) · el aparato del local para fichar: no es nadie. Valen por su
        // llave, de la que la base solo guarda la huella, y el PIN de quien teclea.
        // Solo dicen de qué local es y fichan: no abren nada más.
        'el_aparato_para_fichar',
        'quien_ficha_aqui',
        'fichar_aqui',
        // I (0070) · prepararlo para cuando se caiga el wifi: con la misma llave, y
        // solo devuelve la pública con la que el aparato cifra el PIN.
        'preparar_el_aparato_sin_conexion',
        // A3 (0076) · si un código de vendedor vale, para la casilla de crear cuenta, que
        // todavía no es nadie. Solo dice el código y su descuento, no de quién es.
        'el_codigo_de_vendedor',
        // A4 (0077) · la portada cuenta que se ha abierto el enlace de un vendedor. Solo
        // suma uno a ese código ese día: ni quién, ni desde dónde, ni devuelve nada más.
        'contar_la_visita',
        // T1 (0107) · Estook TPV en un aparato sin nadie dentro: vincularlo con su código
        // (de un uso, diez minutos y veinte por hora desde una dirección), su latido con
        // su llave, y teclear el PIN, que abre el turno de quien lo teclea. Nada más.
        'vincular_con_codigo',
        'latir_el_aparato',
        'entrar_con_pin',
        // 0115 · fichar en la caja con el botón naranja, sin entrar: como en el aparato
        // para fichar, por su llave (y solo la de una caja) y el PIN de quien teclea.
        'quien_ficha_en_la_caja',
        'fichar_en_la_caja',
        // 0109 · recuperar el acceso, que se pide precisamente sin haber entrado: el
        // enlace al correo (diez por hora desde una dirección, y no dice si un correo
        // existe) y lo que se hace con él, que vale por su token, de un uso.
        'pedir_enlace_de_contrasena',
        'poner_contrasena_con_enlace',
        'pedir_pin_por_correo',
        'pin_con_enlace',
      ].sort(),
    );
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
        // 0041 · el admin tiene que saber que falta el código para pedirlo.
        'admin_quien_soy',
      ].sort(),
    );
  });

  it('lo que es solo del admin está tasado, y todo empieza por `admin_`', () => {
    // Una operación del admin que no lo declare **nace abierta a cualquier sesión
    // de la app**. Esta lista obliga a declararlo; y el prefijo, a que se vea en el
    // nombre de qué lado está.
    const delAdmin = [...Object.values(catalogo.consultas), ...Object.values(catalogo.comandos)]
      .filter((operacion) => operacion.soloAdmin === true)
      .map((operacion) => operacion.nombre)
      .sort();

    expect(delAdmin).toEqual(
      [
        'admin_quien_soy',
        'admin_administradores',
        'admin_auditoria',
        'admin_dar_acceso',
        'admin_quitar_acceso',
        // 0042 · la oferta de prueba.
        'admin_oferta',
        'admin_cambiar_oferta',
        // A2 (0049) · los clientes: la lista, la ficha y lo que se hace con cada uno.
        'admin_los_clientes',
        'admin_un_cliente',
        'admin_guardar_la_ficha_comercial',
        'admin_cambiar_el_nombre',
        'admin_escribir_una_nota',
        'admin_fijar_una_nota',
        'admin_alargar_la_prueba',
        'admin_de_la_casa',
        'admin_cancelar_al_acabar',
        'admin_cambiar_el_correo',
        'admin_exportar_los_clientes',
        'admin_calcular_el_uso',
        // A3 (0058) · los vendedores: la lista, la ficha, sus códigos y con quién vino
        // cada cliente.
        'admin_los_vendedores',
        'admin_un_vendedor',
        'admin_crear_vendedor',
        'admin_cambiar_el_vendedor',
        'admin_dar_de_baja_al_vendedor',
        'admin_crear_un_codigo',
        'admin_cerrar_un_codigo',
        'admin_poner_el_vendedor',
        // A4 (0059) · el tablero de ventas.
        'admin_las_ventas',
        // Fogón 1 · 1 (0097) · los dos interruptores y lo gastado.
        'admin_fogon',
        'admin_encender_fogon',
        'admin_encender_fogon_del_cliente',
        'admin_probar_fogon',
      ].sort(),
    );

    const conPrefijoSinDeclarar = [
      ...Object.values(catalogo.consultas),
      ...Object.values(catalogo.comandos),
    ].filter((operacion) => operacion.nombre.startsWith('admin_') && operacion.soloAdmin !== true);
    expect(conPrefijoSinDeclarar.map((o) => o.nombre)).toEqual([]);
  });

  it('lo que pasa sin pagar está tasado: pagar, irse y lo que es de la persona (0048)', () => {
    // «Sin pago no hay app.» Una operación que se declara `sinPagar` abre la puerta del
    // pago para siempre: esta lista obliga a que sea a propósito.
    const sinPagar = [...Object.values(catalogo.consultas), ...Object.values(catalogo.comandos)]
      .filter((operacion) => operacion.sinPagar === true)
      .map((operacion) => operacion.nombre)
      .sort();

    expect(sinPagar).toEqual(
      [
        // Pagar y llevar la suscripción.
        'mi_suscripcion',
        'empezar_a_pagar',
        'volver_del_pago',
        'abrir_el_portal',
        'cambiar_de_plan',
        'cancelar_la_suscripcion',
        'reanudar_la_suscripcion',
        // Quién soy, a dónde voy e irse.
        'quien_soy',
        'cambiar_de_contexto',
        'salir',
        'cerrar_sesion',
        'salir_de_la_demostracion',
        'sigo_aqui',
        // Lo que es de la persona.
        'mi_acceso',
        // I (0070) · al salir se quita el móvil, para que no le lleguen los avisos de
        // nadie: salir tiene que poder hacerse siempre, también sin pagar.
        'quitar_este_movil',
        'cambiar_mi_clave',
        'activar_doble_factor',
        'confirmar_doble_factor',
        'superar_doble_factor',
        'quitar_doble_factor',
        'cambiar_mi_idioma',
        // Mover los widgets no apunta nada: vale también en solo lectura.
        'guardar_mi_panel',
        // Ni el periodo de un widget ni el recorrido de la primera vez (0084).
        'poner_el_periodo_del_widget',
        'ya_he_visto_el_recorrido',
      ].sort(),
    );
  });

  it('y lo que una sesión del admin puede usar fuera del admin, también', () => {
    const enLosDos = [...Object.values(catalogo.consultas), ...Object.values(catalogo.comandos)]
      .filter((operacion) => operacion.tambienEnElAdmin === true)
      .map((operacion) => operacion.nombre)
      .sort();

    expect(enLosDos).toEqual(
      [
        // Lo que es de la persona, esté donde esté.
        'salir',
        'cambiar_mi_clave',
        'activar_doble_factor',
        'confirmar_doble_factor',
        'superar_doble_factor',
        // Y la entrada, que todavía no tiene sesión del admin.
        'entrar_en_admin',
      ].sort(),
    );
  });
});

describe('la puerta del admin (0041)', () => {
  const DEL_ADMIN: Contexto['sesion'] = { ...SESION_NORMAL, paraAdmin: true };

  it('una sesión del admin no abre lo que no es del admin', async () => {
    const { despachador } = bancoDePruebas(DEL_ADMIN);
    const resultado = await despachador.ejecutar(
      quien,
      'sumar',
      { cuanto: 1 },
      'una-clave-del-admin',
    );
    expect(resultado).toEqual({ estado: 'fallo', codigo: 'sin_permiso' });
  });

  it('y una sesión de la app no abre lo del admin, sin llegar a preguntar a la base', async () => {
    const { despachador } = bancoDePruebas(SESION_NORMAL);
    const resultado = await despachador.consultar(quien, 'admin_administradores', {});
    expect(resultado).toEqual({ estado: 'fallo', codigo: 'sin_permiso' });
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

  /**
   * **Y con el botón normal de salir, que es el que va a pulsar.**
   *
   * Esto faltaba, y el fallo estuvo puesto hasta el repaso de cierre de M5: la
   * pantalla tiene un botón «Salir» que llama a `salir`, y `salir` no admitía
   * demostraciones. Devolvía 403, la aplicación se olvidaba del token de todas
   * formas, y **la sesión seguía viva en el servidor** hasta caducar.
   *
   * La ficha de M5 pide «modo demostración con salida limpia». Existía
   * `salir_de_la_demostracion`, que la hacía bien, y no lo llamaba nadie.
   */
  it('y también con el botón de salir de siempre, que es el que hay en pantalla', async () => {
    const { despachador } = bancoDePruebas(DEMOSTRACION);
    const salida = await despachador.ejecutar(quien, 'salir', {}, 'k-salir-normal');
    expect(salida.estado === 'fallo' && salida.codigo).not.toBe('solo_lectura');
  });

  it('la lista de lo que puede ejecutar está tasada', () => {
    // Igual que las otras tres puertas: una operación nueva nace cerrada a la
    // demostración, y abrirla obliga a tocar esta lista.
    const enDemostracion = Object.values(catalogo.comandos)
      .filter((comando) => comando.enDemostracion === true)
      .map((comando) => comando.nombre)
      .sort();

    // Las dos son la misma salida por dentro: las dos llaman a `cerrarLaSesion`,
    // que es quien decide que una visita **se borra** en vez de cerrarse.
    expect(enDemostracion).toEqual(['salir', 'salir_de_la_demostracion']);
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
  it('los comandos que devuelven un secreto están marcados', () => {
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
        // 0041 · el token del admin, y la contraseña de un solo uso de quien
        // recibe acceso sin tener cuenta.
        'entrar_en_admin',
        'admin_dar_acceso',
        // 0042 · el token de quien acaba de crear su cuenta o entra con Google.
        'confirmar_registro',
        'entrar_con_google',
        // T1 (0107) · la llave de un aparato vinculado, una sola vez (con el correo o con
        // el código); el código de seis cifras para vincularlo; y el turno de quien teclea
        // su PIN. Hasta T1, la llave del aparato para fichar salía de Ajustes.
        'vincular_el_primer_aparato',
        'vincular_con_codigo',
        'sacar_codigo_para_vincular',
        'entrar_con_pin',
        // C1 (0073) · el tema secreto por el que llega el toque al segundo del chat.
        'abrir_el_chat',
        // 0109 · el PIN nuevo que da el enlace del correo, una sola vez.
        'pin_con_enlace',
      ].sort(),
    );
  });

  it('y lo que no se recuerda sin llevar secreto también está tasado', () => {
    // `sinRecordar` salta la idempotencia. Solo vale para lo que da igual cuántas
    // veces llegue; si algo que suma o crea lo declarara, un reintento lo haría dos
    // veces. Esta lista obliga a pensarlo.
    const sinRecordar = Object.values(catalogo.comandos)
      .filter((comando) => comando.sinRecordar === true)
      .map((comando) => comando.nombre)
      .sort();

    // 23-sep-2026 · el «sigo aquí» de la app abierta: uno por minuto y aparato.
    //
    // H1 (0068) · lo que se teclea en el aparato del local. **No es que dé igual
    // cuántas veces llegue**: es que lo protege el estado de la persona —entrar dos
    // veces dice «ya estás dentro»—, y recordar la respuesta guardaría la entrada con
    // su PIN acertado en una tabla. Y los PIN fallados se tienen que contar siempre.
    //
    // I (0070) · preparar el aparato sin conexión devuelve siempre la misma pública, y
    // probar el móvil no cambia nada: repetirlos ya es lo mismo.
    //
    // C1 (0073) · «leído» y «entregado» del chat: apuntan hasta dónde, con el mayor de
    // los dos, así que llegar dos veces es lo mismo. Y llegan a cada rato.
    //
    // T1 (0107) · el latido de cada aparato, cada minuto; bloquear, que solo acaba el
    // turno; y fichar desde el TPV, que protege el estado de la persona como en el
    // aparato para fichar. Y en la caja (0115), lo mismo: guardarlo guardaría el PIN.
    expect(sinRecordar).toEqual([
      'bloquear',
      'fichar_aqui',
      'fichar_en_el_tpv',
      'fichar_en_la_caja',
      'latir_el_aparato',
      'leer_el_canal',
      'preparar_el_aparato_sin_conexion',
      'probar_mi_movil',
      'quien_ficha_aqui',
      'quien_ficha_en_la_caja',
      'sigo_aqui',
      'ya_me_ha_llegado',
    ]);
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
          google: null,
          correo: null,
          identidadDeGoogle: null,
          pagos: null,
          pdf: null,
          movil: null,
          correlacionId: quien.correlacionId,
          desde: null,
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

describe('la puerta de Estook TPV (T1, 0107)', () => {
  const enUnAparato = (
    funcion: 'caja' | 'comandero' | 'cocina' | 'barra' | 'fichar',
    esPersonal = false,
  ): Contexto['sesion'] => ({
    ...SESION_NORMAL,
    aparato: { terminalId: 'un-aparato', funcion, esPersonal },
  });

  it('un aparato vinculado no es una puerta a la gestión: lo que no lo declara no pasa', () => {
    expect(porQueNoPasaElAparato({}, enUnAparato('caja'))).toBe('sin_permiso');
    expect(porQueNoPasaElAparato({ enElTpv: 'tambien' }, enUnAparato('caja'))).toBeNull();
    expect(porQueNoPasaElAparato({ enElTpv: 'solo' }, enUnAparato('comandero', true))).toBeNull();
  });

  it('y Estook TPV no se abre con la sesión de Estook', () => {
    expect(porQueNoPasaElAparato({ enElTpv: 'solo' }, SESION_NORMAL)).toBe('sin_permiso');
    expect(porQueNoPasaElAparato({ enElTpv: 'tambien' }, SESION_NORMAL)).toBeNull();
    expect(porQueNoPasaElAparato({}, SESION_NORMAL)).toBeNull();
  });

  it('un comandero no abre el cajón aunque teclee el gerente: manda la función del aparato', () => {
    // La persona puede tenerlo todo: lo que se mira aquí es qué es el aparato.
    const delCajon = { enElTpv: 'solo', enLosAparatos: ['caja'] } as const;
    expect(porQueNoPasaElAparato(delCajon, enUnAparato('caja'))).toBeNull();
    expect(porQueNoPasaElAparato(delCajon, enUnAparato('comandero'))).toBe('sin_permiso');
    expect(porQueNoPasaElAparato(delCajon, enUnAparato('cocina'))).toBe('sin_permiso');
  });

  it('lo que vale desde un aparato está tasado, y lo que solo vale desde uno, también', () => {
    const operaciones = [...Object.values(catalogo.consultas), ...Object.values(catalogo.comandos)];
    const tambien = operaciones.filter((o) => o.enElTpv === 'tambien').map((o) => o.nombre);
    expect(tambien.sort()).toEqual(
      [
        // La cocina (T4 tendrá su pantalla) y los agotados, desde la app y desde el TPV.
        'la_cocina',
        'tachar',
        'destachar',
        'todo_fuera',
        'recuperar',
        'marcar_agotado',
        'quitar_agotado',
        'los_agotados',
      ].sort(),
    );
    const solo = operaciones.filter((o) => o.enElTpv === 'solo').map((o) => o.nombre);
    expect(solo.sort()).toEqual(
      [
        // La sala (0106): solo desde un aparato vinculado, con el PIN de cada uno.
        'el_plano',
        'la_mesa',
        'la_carta_de_la_sala',
        'abrir_mesa',
        'pedir',
        'cambiar_plato_de_la_mesa',
        'quitar_plato',
        'devolver_a_cocina',
        'mandar_a_cocina',
        'marchar',
        'cambiar_la_mesa',
        'cambiar_de_mesa',
        'juntar_mesas',
        'pasar_a_otro_camarero',
        'liberar_mesa',
        'anular_mesa',
        // Lo del propio TPV (0107).
        'yo_en_el_tpv',
        'los_aparatos',
        'bloquear',
        'fichar_en_el_tpv',
        'sacar_codigo_para_vincular',
        'cambiar_aparato',
        'desvincular_aparato',
        'guardar_pin_y_bloqueo',
        // La sala se dibuja en el TPV (0110), con los Ajustes del TPV.
        'el_plano_del_local',
        'crear_zona_de_sala',
        'cambiar_zona_de_sala',
        'archivar_zona_de_sala',
        'ordenar_las_salas',
        'crear_mesa',
        'cambiar_mesa',
        'archivar_mesa',
        'crear_cosa_de_la_sala',
        'cambiar_cosa_de_la_sala',
        'quitar_cosa_de_la_sala',
        'colocar_en_el_plano',
        'empezar_con_una_plantilla',
        // La botonera se monta en el TPV (0111), con los Ajustes del TPV.
        'la_botonera',
        'montar_la_botonera',
        'traer_de_la_carta',
        'lo_nuevo_entra_solo',
        'crear_pagina_del_tpv',
        'cambiar_pagina_del_tpv',
        'ordenar_las_paginas_del_tpv',
        'quitar_pagina_del_tpv',
        'poner_botones',
        'cambiar_boton_del_tpv',
        'ordenar_los_botones',
        'quitar_boton_del_tpv',
        'nuevo_producto_del_tpv',
        // Las opciones, el precio y lo que se vende a peso, también (0113).
        'los_grupos_de_opciones',
        'guardar_grupo_de_opciones',
        'copiar_grupo_de_opciones',
        'quitar_grupo_de_opciones',
        'poner_grupos_al_plato',
        'cambiar_precio_desde_el_tpv',
        'vender_a_peso',
        // Y «Monta tus bebidas» (0114).
        'las_bebidas_para_montar',
        'montar_bebidas',
        'montar_copas',
        'montar_cafes',
        'cambiar_las_dosis',
      ].sort(),
    );
  });
});
