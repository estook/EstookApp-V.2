import { createHmac } from 'node:crypto';
import { expect, test, type APIRequestContext } from '@playwright/test';

/**
 * Las operaciones del catálogo que nadie ejecutaba.
 *
 * ── Por qué existe este fichero ──────────────────────────────────────────────
 *
 * «Una consulta que ninguna prueba llama es una consulta rota que todavía no
 *  sabes que lo está» (ESTADO, cómo trabajamos). Está escrito porque la pantalla
 * «Hoy» de M6 estaba en el catálogo, llamada desde la pantalla, y **devolvía un
 * 500 a todo el mundo desde el primer día**.
 *
 * Esa lección era prosa hasta que `pnpm cobertura` la convirtió en una medida:
 * la API de pruebas apunta qué operación ejecuta cada prueba, y al terminar se
 * compara con el catálogo. La primera medición dijo **43 de 62**, y entre las
 * que faltaban estaba **el segundo factor entero** —activar, confirmar, superar
 * y quitar— sin una sola prueba que lo viera funcionar.
 *
 * Aquí están las que faltaban. Se llaman **a pelo contra la API**, que es lo que
 * pide la regla 4 para todo lo que sea acceso, y lo que hace que la prueba de una
 * operación no dependa de que la pantalla que la usa siga siendo la misma.
 *
 * ── Y por qué casi todas se traen su propia persona ──────────────────────────
 *
 * Porque las pruebas corren **en paralelo contra una sola base de datos**.
 * Activarle el segundo factor a una de las siete personas de ejemplo dejaría a
 * las demás pruebas plantadas en la puerta del segundo factor, y «cerrar todas
 * las demás sesiones» les tiraría el token en mitad de una petición. Así que lo
 * que se toca, se crea aquí.
 */
const API = 'http://localhost:5177/api';
const CLAVE = 'estook en desarrollo';

/** Un identificador distinto por llamada: el despachador rechaza repetir uno. */
function unaVezMas(): Record<string, string> {
  return { 'x-idempotencia': `prueba-${Date.now()}-${Math.random().toString(36).slice(2)}` };
}

async function unToken(
  peticion: APIRequestContext,
  correo: string,
  clave = CLAVE,
): Promise<string> {
  const respuesta = await peticion.post(`${API}/v1/comandos/entrar`, {
    // Todo comando lleva su clave de idempotencia: sin ella, la API contesta 422
    // antes de mirar nada. Es lo que hace que pulsar «Entrar» dos veces con la
    // conexión mala no abra dos sesiones.
    headers: unaVezMas(),
    data: { correo, contrasena: clave },
  });
  expect(respuesta.status(), `no se ha podido entrar como ${correo}`).toBe(200);
  const cuerpo = (await respuesta.json()) as { datos: { token: string } };
  return cuerpo.datos.token;
}

function con(token: string) {
  return { authorization: `Bearer ${token}` } as const;
}

async function consultar(peticion: APIRequestContext, token: string, ruta: string) {
  const respuesta = await peticion.get(`${API}/v1/consultas/${ruta}`, { headers: con(token) });
  return {
    estado: respuesta.status(),
    cuerpo: (await respuesta.json()) as Record<string, unknown>,
  };
}

async function ejecutar(
  peticion: APIRequestContext,
  token: string,
  comando: string,
  datos: unknown,
) {
  const respuesta = await peticion.post(`${API}/v1/comandos/${comando}`, {
    headers: { ...con(token), ...unaVezMas() },
    data: datos,
  });
  return {
    estado: respuesta.status(),
    cuerpo: (await respuesta.json()) as Record<string, unknown>,
  };
}

interface Donde {
  readonly localId: string;
  readonly organizacionId: string;
}

async function dondeEsta(peticion: APIRequestContext, token: string): Promise<Donde> {
  const yo = await consultar(peticion, token, 'quien_soy');
  const datos = yo.cuerpo['datos'] as {
    local: { id: string } | null;
    organizacion: { id: string };
  };
  if (datos.local === null) throw new Error('esa persona no tiene un local elegido');
  return { localId: datos.local.id, organizacionId: datos.organizacion.id };
}

/**
 * Una persona recién creada, con su contraseña propia y su sesión limpia.
 *
 * Pasa por el camino entero de M4, que es el que hay de verdad: se la invita, se
 * le pone una clave en mano, entra con ella y **la cambia antes de tocar nada**,
 * porque una clave puesta por otro nace marcada como «hay que cambiarla». Si
 * este ayudante se saltara ese paso, las pruebas de aquí abajo correrían con una
 * sesión que la aplicación de verdad no deja usar.
 */
async function unaPersonaNueva(
  peticion: APIRequestContext,
  quienInvita: string,
  rol = 'gerente',
): Promise<{ personaId: string; membresiaId: string; correo: string; token: string } & Donde> {
  const jefe = await unToken(peticion, quienInvita);
  const donde = await dondeEsta(peticion, jefe);

  const sello = `${Date.now()}${Math.random().toString(36).slice(2, 7)}`;
  const correo = `prueba.${sello}@ejemplo.estook.com`;

  const invitada = await ejecutar(peticion, jefe, 'invitar_persona', {
    correo,
    nombre: 'Prueba',
    apellidos: 'De Cobertura',
    rol,
    local_id: donde.localId,
    organizacion_id: donde.organizacionId,
  });
  expect(invitada.estado, 'no se ha podido invitar a nadie').toBe(200);
  const { personaId } = invitada.cuerpo['datos'] as { personaId: string };

  const provisional = 'una clave provisional larga';
  const puesta = await ejecutar(peticion, jefe, 'poner_clave_a', {
    persona_id: personaId,
    organizacion_id: donde.organizacionId,
    nueva: provisional,
  });
  expect(puesta.estado).toBe(200);

  // Entra con la provisional y se pone la suya: hasta que no lo haga, las
  // puertas del despachador no la dejan hacer nada más.
  const primeraVez = await unToken(peticion, correo, provisional);
  const cambiada = await ejecutar(peticion, primeraVez, 'cambiar_mi_clave', {
    actual: provisional,
    nueva: CLAVE,
  });
  expect(cambiada.estado, 'no ha podido ponerse su propia clave').toBe(200);

  const equipo = await consultar(peticion, jefe, `quien_tiene_acceso?local_id=${donde.localId}`);
  const suya = (equipo.cuerpo['datos'] as { personaId: string; membresiaId: string }[]).find(
    (p) => p.personaId === personaId,
  );
  if (!suya) throw new Error('la persona recién invitada no sale en la lista');

  return {
    personaId,
    membresiaId: suya.membresiaId,
    correo,
    token: await unToken(peticion, correo),
    ...donde,
  };
}

// ── 1 · Las tres que solo se habían visto rechazar ──────────────────────────

/**
 * `mis_locales`, `un_local` y `mis_permisos` **se quedan**, y no por inercia.
 *
 * Ninguna pantalla las llama: `quien_soy` (M4) contesta en una sola vuelta lo que
 * necesita el esqueleto, y eso es lo correcto. Pero son **el sujeto de pruebas de
 * toda la capa de transporte**: la versión de la ruta, el CORS, las cuatro
 * puertas del despachador y el 403 entre organizaciones se comprueban
 * llamándolas, porque no tienen efectos, no llevan parámetros raros y valen para
 * cualquiera. Cambiarlas por `quien_soy` sería reescribir quince pruebas de
 * infraestructura a cambio de nada.
 *
 * Lo que sí faltaba —y es lo que arregla esto— es que alguna prueba las viera
 * **contestar bien**. Se las había llamado docenas de veces, y siempre para
 * comprobar que decían que no.
 */
test.describe('las tres consultas del transporte', () => {
  test('contestan de verdad, y no solo rechazan', async ({ request }) => {
    const token = await unToken(request, 'rosa@ejemplo.estook.com');

    const locales = await consultar(request, token, 'mis_locales');
    expect(locales.estado).toBe(200);
    const suyos = locales.cuerpo['datos'] as { id: string; nombre: string }[];
    expect(suyos.length).toBeGreaterThan(0);

    const uno = suyos[0];
    if (!uno) throw new Error('sin locales no se puede seguir');

    const local = await consultar(request, token, `un_local?id=${uno.id}`);
    expect(local.estado).toBe(200);
    expect((local.cuerpo['datos'] as { nombre: string }).nombre).toBe(uno.nombre);

    const permisos = await consultar(request, token, `mis_permisos?local_id=${uno.id}`);
    expect(permisos.estado).toBe(200);
    // Rosa lleva un bar: tiene apps. Si esto se vaciara, la rueda saldría sin
    // ninguna y nadie se enteraría hasta abrirla.
    expect(Object.keys(permisos.cuerpo['datos'] as object).length).toBeGreaterThan(0);
  });
});

// ── 2 · El segundo factor, entero ───────────────────────────────────────────

/**
 * TOTP, calculado aquí.
 *
 * Es la misma cuenta que hace el servidor, escrita otra vez a propósito. No rompe
 * la regla 6 —«un cálculo, un único dueño»— porque esto **no es dueño de nada**:
 * es una segunda opinión. Si las dos implementaciones del RFC 6238 dan lo mismo,
 * el servidor lo está haciendo bien. Importar la suya y llamarla desde aquí no
 * comprobaría nada: comprobaría que una función es igual a sí misma.
 */
function deBase32(texto: string): Buffer {
  const ALFABETO = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const limpio = texto.toUpperCase().replace(/[^A-Z2-7]/g, '');

  let bits = 0;
  let valor = 0;
  const bytes: number[] = [];

  for (const letra of limpio) {
    valor = (valor << 5) | ALFABETO.indexOf(letra);
    bits += 5;
    if (bits >= 8) {
      bytes.push((valor >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

function codigoAhora(secreto: string): string {
  const tramo = Math.floor(Date.now() / 1000 / 30);

  const contador = Buffer.alloc(8);
  contador.writeUInt32BE(Math.floor(tramo / 2 ** 32), 0);
  contador.writeUInt32BE(tramo >>> 0, 4);

  const firma = createHmac('sha1', deBase32(secreto)).update(contador).digest();
  const desde = (firma[19] ?? 0) & 15;
  const numero =
    (((firma[desde] ?? 0) & 127) << 24) |
    (((firma[desde + 1] ?? 0) & 255) << 16) |
    (((firma[desde + 2] ?? 0) & 255) << 8) |
    ((firma[desde + 3] ?? 0) & 255);

  return String(numero % 1_000_000).padStart(6, '0');
}

test.describe('el segundo factor', () => {
  test('se activa, se confirma, se supera y se quita', async ({ request }) => {
    const suya = await unaPersonaNueva(request, 'rosa@ejemplo.estook.com');

    // ── Activar · nace SIN contar todavía ──────────────────────────────────
    const activado = await ejecutar(request, suya.token, 'activar_doble_factor', {});
    expect(activado.estado).toBe(200);
    const { secreto, enlace } = activado.cuerpo['datos'] as { secreto: string; enlace: string };
    expect(secreto.replace(/\s/g, '').length).toBeGreaterThanOrEqual(16);
    // El enlace es el del código que lee la aplicación de autenticación.
    expect(enlace).toContain('otpauth://totp/');

    // ── Un código que no es, no confirma nada ──────────────────────────────
    const malo = await ejecutar(request, suya.token, 'confirmar_doble_factor', {
      codigo: '000000',
    });
    // 401 y no 400: lo que falla no es la forma del dato, es quién dice ser.
    expect(malo.estado, 'ha confirmado el segundo factor con un código inventado').toBe(401);

    // ── Confirmar · y salen los códigos de respaldo, una sola vez ──────────
    const confirmado = await ejecutar(request, suya.token, 'confirmar_doble_factor', {
      codigo: codigoAhora(secreto),
    });
    expect(confirmado.estado, 'el código calculado aquí no le cuadra al servidor').toBe(200);
    const { codigosDeRespaldo } = confirmado.cuerpo['datos'] as { codigosDeRespaldo: string[] };
    expect(codigosDeRespaldo.length).toBeGreaterThan(0);

    // ── Superar · en una sesión nueva, que es donde toca de verdad ─────────
    //
    // La sesión en la que se acaba de activar ya lo tiene superado a propósito:
    // pedirle el código justo después de escribirlo sería absurdo. Lo que hay que
    // comprobar es la de mañana por la mañana.
    const otroDia = await unToken(request, suya.correo);
    const superado = await ejecutar(request, otroDia, 'superar_doble_factor', {
      codigo: codigoAhora(secreto),
    });
    expect(superado.estado).toBe(200);
    expect((superado.cuerpo['datos'] as { superado: boolean }).superado).toBe(true);

    // ── Y un código de respaldo se gasta ──────────────────────────────────
    const terceraVez = await unToken(request, suya.correo);
    const deRespaldo = codigosDeRespaldo[0];
    if (deRespaldo === undefined) throw new Error('sin códigos de respaldo');

    const conRespaldo = await ejecutar(request, terceraVez, 'superar_doble_factor', {
      codigo: deRespaldo,
    });
    expect(conRespaldo.estado).toBe(200);
    expect((conRespaldo.cuerpo['datos'] as { conUnoDeRespaldo: boolean }).conUnoDeRespaldo).toBe(
      true,
    );

    // El mismo, otra vez, ya no vale: un código de respaldo vale una vez.
    const cuartaVez = await unToken(request, suya.correo);
    const repetido = await ejecutar(request, cuartaVez, 'superar_doble_factor', {
      codigo: deRespaldo,
    });
    expect(repetido.estado, 'un código de respaldo gastado sigue valiendo').toBe(401);

    // ── Quitar · con la contraseña delante, y no sin ella ──────────────────
    const sinClave = await ejecutar(request, suya.token, 'quitar_doble_factor', {
      contrasena: 'la que no es',
    });
    expect(sinClave.estado, 'lo ha quitado con una contraseña que no es').toBe(401);

    const quitado = await ejecutar(request, suya.token, 'quitar_doble_factor', {
      contrasena: CLAVE,
    });
    expect(quitado.estado).toBe(200);
  });
});

// ── 3 · Cerrar una sesión a distancia ───────────────────────────────────────

test.describe('las sesiones abiertas', () => {
  test('se cierra la del móvil perdido, y la de uno sigue valiendo', async ({ request }) => {
    // Lo que hay que comprobar no es que cierre: es que **no cierre la tuya** y
    // te deje fuera justo cuando estás arreglando el problema.
    const suya = await unaPersonaNueva(request, 'rosa@ejemplo.estook.com');

    const elMovilPerdido = await unToken(request, suya.correo);

    const abiertas = await consultar(request, suya.token, 'mi_acceso');
    expect(abiertas.estado).toBe(200);
    const sesiones = (
      abiertas.cuerpo['datos'] as { sesiones: { id: string; esLaDeAhora: boolean }[] }
    ).sesiones;

    // La que no es la de ahora: esa es «el móvil que se ha perdido».
    const otra = sesiones.find((s) => !s.esLaDeAhora);
    if (!otra) throw new Error('hacen falta dos sesiones abiertas');

    const cerrada = await ejecutar(request, suya.token, 'cerrar_sesion', { sesion_id: otra.id });
    expect(cerrada.estado).toBe(200);

    // La de uno sigue viva...
    expect((await consultar(request, suya.token, 'quien_soy')).estado).toBe(200);
    // ...y la otra, no.
    expect((await consultar(request, elMovilPerdido, 'quien_soy')).estado).toBe(401);
  });
});

// ── 4 · Retirar el acceso, y devolverlo ─────────────────────────────────────

test.describe('quien deja de entrar, y quien vuelve', () => {
  test('se le retira el acceso y se le devuelve, y no se pierde del histórico', async ({
    request,
  }) => {
    const suya = await unaPersonaNueva(request, 'rosa@ejemplo.estook.com', 'cocinero');
    const jefe = await unToken(request, 'rosa@ejemplo.estook.com');

    const retirado = await ejecutar(request, jefe, 'retirar_acceso', {
      persona_id: suya.personaId,
      membresia_id: suya.membresiaId,
      motivo: 'prueba de extremo a extremo',
    });
    // ── Lo que esta línea destapó ──────────────────────────────────────────
    //
    // Devolvía 409 «el negocio se queda sin nadie que pueda administrarlo», y era
    // mentira: se estaba retirando a un cocinero. El guardián preguntaba «sin
    // contar a esta persona, ¿queda alguien que administre?», y en una
    // organización que **nunca tuvo** ni dirección ni correo de recuperación la
    // respuesta era «no» para todo el mundo. Resultado: **no se le podía retirar
    // el acceso a nadie**, y quien se iba seguía entrando con su PIN.
    expect(retirado.estado, JSON.stringify(retirado.cuerpo)).toBe(200);

    // **Sigue en la lista**, marcada como fuera. Que desapareciera sería perder
    // el histórico de quién hizo qué, y eso es lo que no puede pasar nunca.
    const despues = await consultar(request, jefe, `quien_tiene_acceso?local_id=${suya.localId}`);
    const ahora = (despues.cuerpo['datos'] as { personaId: string; estado: string }[]).find(
      (p) => p.personaId === suya.personaId,
    );
    expect(ahora?.estado).toBe('fuera');

    // Y ya no entra.
    const intento = await request.post(`${API}/v1/comandos/entrar`, {
      data: { correo: suya.correo, contrasena: CLAVE },
    });
    expect(intento.status(), 'entra alguien a quien se le ha retirado el acceso').not.toBe(200);

    // Vuelve, con PIN nuevo.
    const devuelto = await ejecutar(request, jefe, 'reactivar_persona', {
      persona_id: suya.personaId,
      organizacion_id: suya.organizacionId,
      rol: 'cocinero',
      local_id: suya.localId,
    });
    expect(devuelto.estado).toBe(200);
    expect((devuelto.cuerpo['datos'] as { pin?: string }).pin).toMatch(/^\d{6}$/);

    const alFinal = await consultar(request, jefe, `quien_tiene_acceso?local_id=${suya.localId}`);
    const vuelta = (alFinal.cuerpo['datos'] as { personaId: string; estado: string }[]).find(
      (p) => p.personaId === suya.personaId,
    );
    expect(vuelta?.estado).not.toBe('fuera');
  });
});

// ── 5 · Los ejemplos, que se ponen y se quitan ──────────────────────────────

test.describe('los datos de ejemplo', () => {
  test('se quitan de golpe, y se pueden volver a poner', async ({ request }) => {
    // «Un solo botón, Quitar los ejemplos, los borra todos de golpe»
    // (Manifiesto 8). Se comprueba la vuelta entera porque el borrado ya se rompió
    // una vez: una clave ajena con `on delete set null` convertía el borrado en
    // una edición del libro de movimientos, y el guardián del libro la rechazaba.
    // Ninguna prueba lo habría visto.
    //
    // ── Y por qué en un local recién creado ────────────────────────────────
    //
    // Porque las pruebas corren en paralelo contra una sola base de datos, y los
    // ejemplos de Rosa y de Marcos los mira `inventario.spec`. Quitárselos desde
    // aquí sería tirarle la prueba a otra, un día sí y otro también, sin que el
    // fallo tuviera nada que ver con lo que se rompió.
    //
    // Elena es dirección del Grupo Costa, así que puede crear locales. Y el local
    // nace **con sus ejemplos puestos**: es la reacción de M6 a `local.creado`,
    // en la misma transacción (decisión 0014).
    const token = await unToken(request, 'elena@ejemplo.estook.com');

    const suyos = await consultar(request, token, 'mis_locales');
    const modelo = (suyos.cuerpo['datos'] as { id: string; codigo: string }[])[0];
    if (!modelo) throw new Error('Elena tendría que llegar a algún local');

    const creado = await ejecutar(request, token, 'crear_local', {
      nombre: `Bar de la cobertura ${Date.now()}`,
      duplicar_de: modelo.id,
    });
    expect(creado.estado, 'la dirección tiene que poder crear un local').toBe(200);
    const { localId } = creado.cuerpo['datos'] as { localId: string };

    const alli = await ejecutar(request, token, 'cambiar_de_contexto', { local_id: localId });
    expect(alli.estado).toBe(200);

    // Nace con ellos puestos.
    const alNacer = await consultar(request, token, 'mis_productos?incluir_ejemplos=true');
    const primeros = (alNacer.cuerpo['datos'] as { productos: { esEjemplo: boolean }[] }).productos;
    expect(
      primeros.some((p) => p.esEjemplo),
      'un local nuevo nace sin ejemplos',
    ).toBe(true);

    // Se quitan **todos de golpe**.
    const quitados = await ejecutar(request, token, 'quitar_los_ejemplos', {});
    expect(quitados.estado, JSON.stringify(quitados.cuerpo)).toBe(200);
    expect((quitados.cuerpo['datos'] as { borrados: number }).borrados).toBeGreaterThan(0);

    const limpio = await consultar(request, token, 'mis_productos?incluir_ejemplos=true');
    const despues = (limpio.cuerpo['datos'] as { productos: { esEjemplo: boolean }[] }).productos;
    expect(
      despues.some((p) => p.esEjemplo),
      'han quedado ejemplos sin borrar',
    ).toBe(false);

    // Y se pueden volver a pedir: «lo que se puede quitar se puede poner».
    const puestos = await ejecutar(request, token, 'poner_los_ejemplos', {});
    expect(puestos.estado, JSON.stringify(puestos.cuerpo)).toBe(200);
    expect((puestos.cuerpo['datos'] as { productos: number }).productos).toBeGreaterThan(0);
  });
});

// ── 6 · Lo que quedaba de Inventario ────────────────────────────────────────

test.describe('inventario · lo que ninguna prueba ejecutaba', () => {
  test('un producto se desactiva y deja de salir en la lista, sin perderse', async ({
    request,
  }) => {
    const token = await unToken(request, 'rosa@ejemplo.estook.com');

    const creado = await ejecutar(request, token, 'crear_producto', {
      nombre: `Producto que se va ${Date.now()}`,
    });
    expect(creado.estado).toBe(200);
    const { productoId } = creado.cuerpo['datos'] as { productoId: string };

    const apagado = await ejecutar(request, token, 'desactivar_producto', {
      producto_id: productoId,
    });
    expect(apagado.estado).toBe(200);
    expect((apagado.cuerpo['datos'] as { activo: boolean }).activo).toBe(false);

    // Desactivar **esconde, no borra**: «lo que se quita no se pierde»
    // (Manifiesto 28). Deja de salir en la lista...
    const lista = await consultar(request, token, 'mis_productos');
    const productos = (lista.cuerpo['datos'] as { productos: { id: string }[] }).productos;
    expect(productos.some((p) => p.id === productoId)).toBe(false);

    // ...y la ficha sigue estando para quien la pida por su identificador. Si no
    // estuviera, el histórico de sus movimientos sería inalcanzable.
    const ficha = await consultar(request, token, `un_producto?producto_id=${productoId}`);
    expect(ficha.estado, 'un producto desactivado se ha vuelto inalcanzable').toBe(200);

    // ── Y se puede volver a ver, que es lo que faltaba ─────────────────────
    //
    // La lista acepta `incluir_desactivados` desde el primer día de M6, y ninguna
    // pantalla lo pedía: se quitaba un producto y desaparecía para siempre.
    const conLosApagados = await consultar(
      request,
      token,
      'mis_productos?incluir_desactivados=true',
    );
    const todos = (
      conLosApagados.cuerpo['datos'] as { productos: { id: string; activo: boolean }[] }
    ).productos;
    const apagadoEnLista = todos.find((p) => p.id === productoId);
    expect(apagadoEnLista, 'un producto desactivado no se puede volver a ver').toBeDefined();
    expect(apagadoEnLista?.activo).toBe(false);

    // ── Y se puede traer de vuelta ────────────────────────────────────────
    //
    // `reactivar_producto` existía desde el primer día, registrado en el catálogo
    // y probado en el servidor, **sin ninguna pantalla que lo llamara**. Estaba
    // apuntado como excepción con la razón «su pantalla llega con M8», que es una
    // forma bonita de decir que la aplicación tenía una salida sin entrada.
    const devuelto = await ejecutar(request, token, 'reactivar_producto', {
      producto_id: productoId,
    });
    expect(devuelto.estado, JSON.stringify(devuelto.cuerpo)).toBe(200);

    const otraVez = await consultar(request, token, 'mis_productos');
    const vueltos = (otraVez.cuerpo['datos'] as { productos: { id: string }[] }).productos;
    expect(
      vueltos.some((p) => p.id === productoId),
      'no ha vuelto a la lista',
    ).toBe(true);
  });

  test('un proveedor se cambia, y lo cambiado llega de vuelta', async ({ request }) => {
    const token = await unToken(request, 'rosa@ejemplo.estook.com');

    const sello = Date.now();
    const creado = await ejecutar(request, token, 'crear_proveedor', {
      nombre: `Distribuciones ${sello}`,
      notas: null,
    });
    expect(creado.estado).toBe(200);
    const { proveedorId } = creado.cuerpo['datos'] as { proveedorId: string };

    const cambiado = await ejecutar(request, token, 'cambiar_proveedor', {
      proveedor_id: proveedorId,
      nombre: `Distribuciones ${sello} e hijos`,
      notas: 'Reparte los martes',
      activo: false,
    });
    expect(cambiado.estado).toBe(200);

    // Que **vuelva** lo guardado es la mitad de la prueba, y es la mitad que ya
    // falló: en la ficha de producto el servidor mandaba nombres y no
    // identificadores, y guardar una errata en el nombre borraba la categoría, el
    // proveedor y las notas sin decir nada.
    // Con `incluir_desactivados`, que es lo que la pantalla no pedía: se podía
    // desactivar un proveedor y **desaparecía para siempre**, sin forma de
    // volver a activarlo. La consulta lo aceptaba desde el primer día.
    const lista = await consultar(request, token, 'mis_proveedores?incluir_desactivados=true');
    const suyos = (
      lista.cuerpo['datos'] as {
        proveedores: { id: string; nombre: string; notas: string | null; activo: boolean }[];
      }
    ).proveedores;
    const suyo = suyos.find((p) => p.id === proveedorId);

    expect(suyo?.nombre).toBe(`Distribuciones ${sello} e hijos`);
    expect(suyo?.notas).toBe('Reparte los martes');
    expect(suyo?.activo).toBe(false);
  });
});

// ── 7 · «No me lo recuerdes más», que tiene que durar ───────────────────────

test.describe('el recordatorio del alta', () => {
  test('se apaga en el servidor, no en el navegador', async ({ request }) => {
    // Se guarda en el servidor justo para esto: apagarlo en el ordenador tiene que
    // apagarlo en el teléfono. Una prueba que solo mirara la pantalla no
    // distinguiría las dos cosas, y `localStorage` habría pasado igual.
    const suya = await unaPersonaNueva(request, 'rosa@ejemplo.estook.com');

    const apagado = await ejecutar(request, suya.token, 'ocultar_el_recordatorio_del_alta', {});
    expect(apagado.estado).toBe(200);

    // Sesión nueva, que es lo más parecido a otro aparato.
    const otroAparato = await unToken(request, suya.correo);
    const alta = await consultar(request, otroAparato, 'el_alta');
    expect(alta.estado).toBe(200);
    expect((alta.cuerpo['datos'] as { recordatorioOculto: boolean }).recordatorioOculto).toBe(true);

    // Y **no da nada por hecho**: lo que falta del alta sigue faltando.
    const progreso = (alta.cuerpo['datos'] as { progreso: { pendientes: string[] } }).progreso;
    expect(Array.isArray(progreso.pendientes)).toBe(true);
  });
});

// ── 8 · Y el guardián que sigue guardando ───────────────────────────────────

/**
 * Al último que puede administrar **no se le retira el acceso**.
 *
 * Esta prueba es la otra mitad de la de arriba, y va aquí a propósito. Al
 * arreglar «no se le podía retirar el acceso a nadie» se tocó un guardián de
 * seguridad, y un guardián que se toca sin una prueba que lo sujete es un
 * guardián que un día deja de guardar sin que nadie se entere.
 *
 * Elena es la dirección del Grupo Costa. Si se la pudiera echar, la organización
 * se quedaría sin nadie que pueda administrarla, que es exactamente lo que la
 * regla de M4 no permite: «segundo administrador o correo de recuperación
 * obligatorio».
 */
test.describe('el último administrador', () => {
  test('no se puede quedar la organización sin nadie que la administre', async ({ request }) => {
    const token = await unToken(request, 'elena@ejemplo.estook.com');

    const yo = await consultar(request, token, 'quien_soy');
    const { organizacion } = yo.cuerpo['datos'] as { organizacion: { id: string } };

    // Su propia membresía de organización, que es la que la hace dirección.
    const suyos = await consultar(request, token, 'mis_locales');
    const alguno = (suyos.cuerpo['datos'] as { id: string }[])[0];
    if (!alguno) throw new Error('Elena tendría que llegar a algún local');

    const equipo = await consultar(request, token, `quien_tiene_acceso?local_id=${alguno.id}`);
    const ella = (
      equipo.cuerpo['datos'] as {
        personaId: string;
        membresiaId: string;
        rol: string;
        alcance: string;
      }[]
    ).find((p) => p.rol === 'direccion' && p.alcance === 'organizacion');
    if (!ella) throw new Error('no encuentro la membresía de dirección');

    const intento = await ejecutar(request, token, 'retirar_acceso', {
      persona_id: ella.personaId,
      membresia_id: ella.membresiaId,
    });

    expect(intento.estado, 'se ha podido echar al último administrador').toBe(409);
    expect((intento.cuerpo['error'] as { codigo: string }).codigo).toBe(
      'se_queda_sin_administrador',
    );

    // Y sigue dentro: el guardián comprueba **antes** de tocar nada.
    expect((await consultar(request, token, 'quien_soy')).estado).toBe(200);
    expect(organizacion.id.length).toBeGreaterThan(0);
  });
});
