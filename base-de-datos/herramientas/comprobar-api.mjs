/**
 * Comprueba la API contra la base de datos de VERDAD.
 *
 *   pnpm bd:comprobar-api
 *
 * Es la prueba que ninguna otra hace: las de `packages` son calculo puro, y las
 * de `base-de-datos/pruebas` van contra un Postgres efimero. Esta arranca la API
 * entera, se conecta a Supabase y hace peticiones reales.
 *
 * Lo que valida, y es lo importante: la **decision 0005**. Que la API pueda
 * ponerse el disfraz de `estook_api` con `set local role`, que las politicas de
 * seguridad le apliquen de verdad, y que la identidad no se quede pegada a la
 * conexion entre peticiones.
 *
 * ── Lo que escribe, desde M4 ─────────────────────────────────────────────────
 *
 * Hasta M4 esto **solo leia**, y aqui ponia que no cambiaba nada. Ya no es
 * verdad, y decirlo importa: para comprobar el login **hay que entrar de verdad**,
 * y entrar abre una sesion. Concretamente escribe:
 *
 *   · una fila en `estook.sesion` por cada persona con la que entra
 *   · `persona.ultimo_acceso_en`, que lo pone `abrir_sesion`
 *   · el contexto de una de esas sesiones, al comprobar el cambio de local
 *   · una linea de auditoria por cada entrada
 *
 * Nada de eso toca datos de negocio, y las sesiones caducan solas a los treinta
 * dias. Pero **no se ejecuta contra una base de datos con clientes** sin saber
 * esto, y por eso esta escrito aqui arriba y no enterrado.
 *
 * ── Y lo que hace cuando NO hay cuentas de ejemplo ───────────────────────────
 *
 * Que es el caso de cualquier base que no sea la de tu maquina, porque la semilla
 * `semillas/acceso.ts` se niega a poner ahi una contrasena que esta escrita en el
 * repositorio. Sin cuentas con las que entrar, todo lo que necesita una sesion
 * abierta **no se puede mirar**.
 *
 * Eso no se cuenta como fallo ni se calla: se marca con `--`, se lista al final y
 * se dice cuantas fueron. Antes salian diecinueve «MAL» que no eran fallos de
 * nada, y un diagnostico que grita cuando todo esta bien deja de leerse.
 *
 * Ahi tampoco escribe nada de lo de arriba: sin entrar no se abren sesiones.
 */
import { api } from '../../servidor/index.ts';
// Se importa con nombre largo a proposito: mas abajo hay un `catalogo` local
// —la fila del catalogo de referencia de M5— que tapaba a este. Lo hizo, y el
// fallo salio como «Cannot convert undefined or null to object», que no dice
// nada de lo que pasaba.
import { catalogo as catalogoDeOperaciones } from '../../servidor/aplicacion/index.ts';
import { cerrarConexion } from '../../servidor/infraestructura/postgres.ts';
import postgres from 'postgres';

const url = process.env['DATABASE_URL'];
if (!url) {
  console.error('Falta DATABASE_URL en .env.local.');
  process.exit(1);
}

let fallos = 0;
let noComprobadas = 0;

function comprobar(titulo, condicion, detalle = '') {
  const marca = condicion ? 'OK  ' : 'MAL ';
  if (!condicion) fallos += 1;
  console.log(`  ${marca} ${titulo}${detalle ? ` · ${detalle}` : ''}`);
}

/**
 * Lo que no se ha podido mirar porque en esta base no hay con quien entrar.
 *
 * **No es lo mismo que un fallo, y confundirlos costo una tarde.** Contra una
 * base de produccion —donde las cuentas de ejemplo no existen, que es lo
 * correcto— esta herramienta escupia diecinueve «MAL» seguidos que no eran
 * fallos de nada: eran la consecuencia de que no habia contrasena con la que
 * entrar. Un diagnostico que grita cuando todo esta bien deja de leerse.
 *
 * Se marca aparte, se cuenta aparte y se dice al final cuantas fueron. Saltarlas
 * en silencio seria el otro extremo, y ese es peor.
 */
function noSePuede(titulo) {
  noComprobadas += 1;
  console.log(`  --   ${titulo}`);
}

function titulo(texto) {
  console.log(`\n${texto}\n${'─'.repeat(texto.length)}`);
}

// Los identificadores de las personas de ejemplo, leidos como duenos.
const directo = postgres(url, {
  max: 1,
  prepare: !url.includes('pooler.supabase.com'),
  ssl: url.includes('localhost') ? false : 'require',
  onnotice: () => {},
});

const personas = Object.fromEntries(
  (await directo`select correo, id from estook.persona`).map((f) => [f.correo, f.id]),
);
const locales = Object.fromEntries(
  (await directo`select codigo, id from estook.local`).map((f) => [f.codigo, f.id]),
);
await directo.end();

/**
 * El prefijo que Supabase pone delante de todo.
 *
 * Las funciones se sirven en `/functions/v1/<nombre>/...` y la funcion recibe la
 * ruta **con su propio nombre delante**. Se pone aqui, y no dentro de cada
 * llamada, para que esta herramienta pida exactamente igual que pide el
 * navegador contra el despliegue de verdad.
 */
const RAIZ = '/api';

const pedir = (camino, cabeceras = {}) => api.request(RAIZ + camino, { headers: cabeceras });

const mandar = (camino, cuerpo, cabeceras = {}) =>
  api.request(RAIZ + camino, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...cabeceras },
    body: JSON.stringify(cuerpo),
  });

/**
 * Entrar de verdad, y quedarse con el token (M4).
 *
 * Antes esta herramienta se identificaba con `x-persona-id`. Esa cabecera ya no
 * existe, y quitarla es media M4: la identidad **se demuestra**, no se declara.
 *
 * La contrasena es la de las personas de ejemplo, que la semilla pone solo fuera
 * de produccion. Si esto falla contra Supabase, lo primero que hay que mirar es
 * si se ha sembrado `acceso.ts` alli.
 */
const CLAVE_DE_EJEMPLO = 'estook en desarrollo';

async function entrarComo(correo) {
  const respuesta = await mandar(
    '/v1/comandos/entrar',
    { correo, contrasena: CLAVE_DE_EJEMPLO },
    { 'x-idempotencia': `comprobar-${correo}-${process.pid}-${contador++}` },
  );
  const cuerpo = await respuesta.json();
  const token = cuerpo.datos?.token ?? null;
  if (token) tokensAbiertos.push(token);
  return token;
}

/**
 * Todo lo que esta herramienta abre, lo cierra.
 *
 * Sin esto dejaba **una sesion viva por cada vez que entraba**, y entra una
 * veintena de veces por pasada. Corriendola unas cuantas veces contra Supabase,
 * «Donde tienes la sesion abierta» de Rosa acabo con veintitres filas identicas.
 *
 * Una herramienta de diagnostico que ensucia lo que mira es una herramienta que
 * miente sobre el estado del sistema.
 */
const tokensAbiertos = [];

/** Apunta el token de una respuesta de `entrar` que no pasa por `entrarComo`. */
function apuntar(cuerpo) {
  if (typeof cuerpo?.datos?.token === 'string') tokensAbiertos.push(cuerpo.datos.token);
  return cuerpo;
}

async function cerrarLoQueSeAbrio() {
  let cerradas = 0;
  for (const token of tokensAbiertos) {
    try {
      const respuesta = await mandar(
        '/v1/comandos/salir',
        {},
        { ...como(token), 'x-idempotencia': `limpiar-${process.pid}-${contador++}` },
      );
      if (respuesta.ok) cerradas += 1;
    } catch {
      // Si una no se puede cerrar, se sigue con las demas: caducan en 30 dias.
    }
  }
  return cerradas;
}

let contador = 0;

/** Las cabeceras de quien ya ha entrado. */
const como = (token) => ({ authorization: `Bearer ${token}` });

console.log('Comprobacion de la API contra Supabase\n');

try {
  titulo('La API responde');
  const salud = await (await pedir('/salud')).json();
  comprobar(
    'dice que esta en pie',
    salud.datos?.estado === 'en pie',
    `version ${salud.datos?.version}`,
  );

  titulo('Sin decir quien pregunta no se ve nada');
  const anonima = await (await pedir('/v1/consultas/mis_locales')).json();
  comprobar('devuelve «la sesion ha caducado»', anonima.error?.codigo === 'sin_sesion');

  // ── M4 · la identidad se demuestra, no se declara ─────────────────────────

  titulo('M4 · la cabecera vieja ya no vale');
  const conLaVieja = await pedir('/v1/consultas/mis_locales', {
    'x-persona-id': personas['elena@ejemplo.estook.com'],
  });
  comprobar(
    'x-persona-id no abre nada',
    conLaVieja.status === 401,
    `ha devuelto ${conLaVieja.status}`,
  );

  titulo('M4 · entrar');
  const entrada = apuntar(
    await (
      await mandar(
        '/v1/comandos/entrar',
        { correo: 'rosa@ejemplo.estook.com', contrasena: CLAVE_DE_EJEMPLO },
        { 'x-idempotencia': `comprobar-entrar-${process.pid}` },
      )
    ).json(),
  );

  /**
   * **La pregunta que decide media herramienta**: ¿hay cuentas de ejemplo aqui?
   *
   * Contra la base de tu maquina si, porque `bd:sembrar` las pone. Contra una
   * base remota no, y **no es un descuido sino la regla**: la semilla de acceso
   * se niega a sembrar credenciales fuera de tu maquina, porque su contrasena
   * esta escrita en el repositorio.
   *
   * Asi que aqui no se da por hecho. Se pregunta una vez, y lo que necesita
   * entrar se mira solo si se puede entrar.
   */
  const hayCuentasDeEjemplo = typeof entrada.datos?.token === 'string';

  if (hayCuentasDeEjemplo) {
    comprobar('con correo y contrasena se entra', true);
    comprobar(
      'y la resolucion de destino le lleva a su Panel',
      entrada.datos?.destino === 'panel',
      `ha dicho ${entrada.datos?.destino}`,
    );
  } else {
    noSePuede('con correo y contrasena se entra');
    noSePuede('y la resolucion de destino le lleva a su Panel');
  }

  const conLaMala = await (
    await mandar(
      '/v1/comandos/entrar',
      { correo: 'rosa@ejemplo.estook.com', contrasena: 'esta no es' },
      { 'x-idempotencia': `comprobar-mala-${process.pid}` },
    )
  ).json();
  const conCorreoQueNoExiste = await (
    await mandar(
      '/v1/comandos/entrar',
      { correo: 'nadie@ejemplo.estook.com', contrasena: 'lo que sea' },
      { 'x-idempotencia': `comprobar-nadie-${process.pid}` },
    )
  ).json();
  comprobar('con la contrasena mal, no entra', conLaMala.error?.codigo === 'no_cuadra');
  comprobar(
    'y un correo que no existe da EXACTAMENTE el mismo error',
    conCorreoQueNoExiste.error?.codigo === conLaMala.error?.codigo,
  );

  titulo('M4 · un token inventado no vale');
  const inventado = await pedir('/v1/consultas/mis_locales', {
    authorization: 'Bearer me-lo-acabo-de-inventar',
  });
  comprobar('devuelve 401', inventado.status === 401, `ha devuelto ${inventado.status}`);

  titulo('Versionado con compatibilidad N-2');
  const futura = await (await pedir('/v9/consultas/mis_locales')).json();
  comprobar('una version que no existe se rechaza', futura.error?.codigo === 'faltan_datos');

  titulo('El buscador no contesta a quien no dice quien es');
  const sinDecirQuien = await (await pedir('/v1/consultas/buscar?texto=bar')).json();
  comprobar(
    'sin decir quien pregunta no encuentra nada',
    sinDecirQuien.error?.codigo === 'sin_sesion',
  );

  // ── Lo que hace falta entrar para mirar ───────────────────────────────────
  //
  // Todo lo de aqui abajo necesita una sesion abierta. Sin cuentas de ejemplo no
  // se puede, y **no se disimula**: se dice cual no se ha mirado y por que.

  if (!hayCuentasDeEjemplo) {
    titulo('Lo que hace falta entrar para mirar');
    console.log('  En esta base no hay cuentas de ejemplo con las que entrar.\n');
    console.log('  No es un fallo. La semilla de acceso se niega a poner credenciales');
    console.log('  de ejemplo en una base que no es la de tu maquina, porque su');
    console.log('  contrasena esta escrita en el repositorio.\n');
    console.log('  Casi todas se miran contra la API de pruebas, que si tiene cuentas');
    console.log('  porque su base muere al parar el servidor. Hacen falta dos');
    console.log('  ventanas, y NO van dentro de `pnpm verifica`:\n');
    console.log('      pnpm api:pruebas   (en una ventana, y se queda abierta)');
    console.log('      pnpm prueba:e2e    (en otra)\n');
    console.log('  La que no tiene sustituto es «la identidad no se pega a la');
    console.log('  conexion». La API de pruebas usa una sola conexion puesta en cola,');
    console.log('  asi que alli esa comprobacion no puede fallar aunque este mal: lo');
    console.log('  que mira es el agrupador de conexiones de Postgres de verdad.');
    console.log('  Para verla hace falta una base con cuentas de ejemplo.\n');
    for (const queda of [
      'el area manager entra en su consolidado',
      'la camarera con dos locales elige donde esta',
      'cambiar de local NO abre sesion nueva',
      'cada persona ve exactamente los suyos',
      'un local ajeno devuelve 403, y el propio 200',
      'la correlacion viaja de vuelta',
      'la identidad no se pega a la conexion',
      'mis_permisos da seis de app y ni uno de importe',
      'el buscador aguanta acentos y erratas, y no ensena lo ajeno',
    ]) {
      noSePuede(queda);
    }
  }

  if (hayCuentasDeEjemplo) {
    titulo('M4 · el area manager entra en su consolidado');
    const deIgnacio = await (
      await mandar(
        '/v1/comandos/entrar',
        { correo: 'ignacio@ejemplo.estook.com', contrasena: CLAVE_DE_EJEMPLO },
        { 'x-idempotencia': `comprobar-ignacio-${process.pid}` },
      )
    ).json();
    comprobar(
      'no entra en un local, entra en el conjunto',
      deIgnacio.datos?.destino === 'vista_de_cadena',
      `ha dicho ${deIgnacio.datos?.destino}`,
    );

    titulo('M4 · la camarera con dos locales elige donde esta');
    const deNuria = apuntar(
      await (
        await mandar(
          '/v1/comandos/entrar',
          { correo: 'nuria@ejemplo.estook.com', contrasena: CLAVE_DE_EJEMPLO },
          { 'x-idempotencia': `comprobar-nuria-${process.pid}` },
        )
      ).json(),
    );
    comprobar(
      'se le pregunta donde esta',
      deNuria.datos?.destino === 'elegir_local',
      `ha dicho ${deNuria.datos?.destino}`,
    );

    titulo('M4 · cambiar de local NO abre sesion nueva');

    /**
     * **Estas dos daban OK sin comprobar nada, y hay que contarlo.**
     *
     * Comparaban `cambiado.datos?.localId === elSuyo`. Cuando Nuria no podia
     * entrar, `elSuyo` salia `undefined`, la peticion devolvia 401, `localId`
     * tambien salia `undefined`, y `undefined === undefined` es verdad. Dos OK
     * verdes en una pasada en la que no se habia comprobado absolutamente nada.
     *
     * Es la leccion de E4 en su forma mas cara: «una comprobacion que no puede
     * fallar es peor que no tenerla», porque la que no esta al menos no miente.
     * El arreglo es exigir que el valor exista antes de compararlo.
     */
    const elSuyo = deNuria.datos?.locales?.[0]?.id;
    comprobar('la respuesta trae el local al que puede ir', typeof elSuyo === 'string');

    const cambiado = await (
      await mandar(
        '/v1/comandos/cambiar_de_contexto',
        { local_id: elSuyo },
        {
          ...como(deNuria.datos?.token),
          'x-idempotencia': `comprobar-contexto-${process.pid}`,
        },
      )
    ).json();
    comprobar(
      'el contexto cambia',
      typeof elSuyo === 'string' && cambiado.datos?.localId === elSuyo,
    );

    const conElMismoToken = await (
      await pedir('/v1/consultas/quien_soy', como(deNuria.datos?.token))
    ).json();
    comprobar(
      'y el MISMO token sigue valiendo, ya con local',
      typeof elSuyo === 'string' && conElMismoToken.datos?.local?.id === elSuyo,
    );

    titulo('Cada persona ve exactamente los suyos');
    const esperado = {
      'elena@ejemplo.estook.com': 6,
      'ignacio@ejemplo.estook.com': 3,
      'luis@ejemplo.estook.com': 1,
      'rosa@ejemplo.estook.com': 1,
      'sara@ejemplo.estook.com': 1,
      // M4 · la camarera con dos locales, que es el caso del criterio.
      'nuria@ejemplo.estook.com': 2,
    };

    for (const [correo, cuantos] of Object.entries(esperado)) {
      const respuesta = await (
        await pedir('/v1/consultas/mis_locales', como(await entrarComo(correo)))
      ).json();
      const vistos = respuesta.datos?.length ?? -1;
      comprobar(`${correo.split('@')[0]} ve ${cuantos}`, vistos === cuantos, `ha visto ${vistos}`);
    }

    titulo('La deuda de M1 · un local ajeno devuelve 403');
    const ajeno = await pedir(`/v1/consultas/un_local?id=${locales['bar-puerto']}`, {
      ...como(await entrarComo('rosa@ejemplo.estook.com')),
    });
    const cuerpoAjeno = await ajeno.json();
    comprobar('estado 403', ajeno.status === 403, `ha devuelto ${ajeno.status}`);
    comprobar('con su mensaje en cristiano', cuerpoAjeno.error?.codigo === 'local_ajeno');
    comprobar(
      'y no dice si existe o no',
      !JSON.stringify(cuerpoAjeno).toLowerCase().includes('existe pero'),
    );

    titulo('El propio si');
    const propio = await pedir(`/v1/consultas/un_local?id=${locales['bar-centro']}`, {
      ...como(await entrarComo('rosa@ejemplo.estook.com')),
    });
    const cuerpoPropio = await propio.json();
    comprobar('estado 200', propio.status === 200);
    comprobar('y trae el local', cuerpoPropio.datos?.codigo === 'bar-centro');

    titulo('La correlacion viaja de vuelta');
    const conHilo = await pedir('/v1/consultas/mis_locales', {
      ...como(await entrarComo('rosa@ejemplo.estook.com')),
      'x-correlacion-id': '3f0c2e6a-1b4d-4a71-9c2e-8a6f5b0d1e77',
    });
    comprobar(
      'la misma que se mando',
      conHilo.headers.get('x-correlacion-id') === '3f0c2e6a-1b4d-4a71-9c2e-8a6f5b0d1e77',
    );

    titulo('La identidad no se pega a la conexion (decision 0005)');
    // Se pregunta como Elena (ve 6) y justo despues sin identidad. Si la identidad
    // se hubiera quedado pegada, la segunda veria 6 en vez de ninguno.
    //
    // Y se exige que la primera **haya visto de verdad sus seis**: sin eso, una
    // peticion que fallara con 401 dejaria la segunda en «sin_sesion» igual, y el
    // OK saldria verde sin haber probado que la identidad no se hereda.
    const comoElena = await (
      await pedir('/v1/consultas/mis_locales', {
        ...como(await entrarComo('elena@ejemplo.estook.com')),
      })
    ).json();
    const despues = await (await pedir('/v1/consultas/mis_locales')).json();
    comprobar(
      'la siguiente peticion no hereda nada',
      comoElena.datos?.length === 6 && despues.error?.codigo === 'sin_sesion',
      comoElena.datos?.length === 6 ? '' : 'la primera peticion no llego a ver nada',
    );

    // ── M3 · el buscador y los permisos, contra Supabase ────────────────────
    //
    // Van aqui por la leccion de M2: la migracion 0016 existe porque algo que
    // funcionaba contra Postgres efimero no funcionaba contra Supabase. La 0017
    // instala una extension y crea indices GIN, que es exactamente el tipo de
    // cosa que un Postgres compilado a WebAssembly puede hacer de otra manera.

    titulo('M3 · mis_permisos');
    const permisosDeSara = await (
      await pedir(`/v1/consultas/mis_permisos?local_id=${locales['bar-centro']}`, {
        ...como(await entrarComo('sara@ejemplo.estook.com')),
      })
    ).json();

    const appsDeSara = Object.keys(permisosDeSara.datos ?? {}).filter((p) => p.startsWith('app.'));
    comprobar(
      'la camarera recibe seis permisos de app',
      appsDeSara.length === 6,
      `ha recibido ${appsDeSara.length}`,
    );
    comprobar(
      'y ni uno de importe',
      !Object.keys(permisosDeSara.datos ?? {}).some((p) => p.startsWith('dato.')),
    );

    const permisosAjenos = await pedir(
      `/v1/consultas/mis_permisos?local_id=${locales['bar-faro']}`,
      { ...como(await entrarComo('rosa@ejemplo.estook.com')) },
    );
    comprobar(
      'sobre un local ajeno devuelve 403',
      permisosAjenos.status === 403,
      `ha devuelto ${permisosAjenos.status}`,
    );

    titulo('M3 · el buscador universal');
    const buscar = async (correo, texto) => {
      const respuesta = await (
        await pedir(`/v1/consultas/buscar?texto=${encodeURIComponent(texto)}`, {
          ...como(await entrarComo(correo)),
        })
      ).json();
      return respuesta.datos ?? [];
    };

    const conTilde = await buscar('elena@ejemplo.estook.com', 'Amunárriz');
    const sinTilde = await buscar('elena@ejemplo.estook.com', 'amunarriz');
    comprobar(
      'encuentra sin escribir los acentos',
      sinTilde.length > 0 && sinTilde.length === conTilde.length,
    );

    const conErrata = await buscar('elena@ejemplo.estook.com', 'Ignaico');
    comprobar(
      'aguanta una errata',
      conErrata.some((r) => r.tipo === 'persona' && /Ignacio/.test(r.titulo)),
    );

    // La importante: que NO encuentre lo ajeno. Es donde se escaparian los datos.
    const desdeElBarCentro = await buscar('rosa@ejemplo.estook.com', 'bar');
    const localesQueVe = desdeElBarCentro.filter((r) => r.tipo === 'local');
    comprobar(
      'el bar independiente solo encuentra su local',
      localesQueVe.length === 1 && /centro/i.test(localesQueVe[0]?.titulo ?? ''),
      `ha encontrado ${localesQueVe.length}`,
    );
  }
  titulo('Las reglas fiscales estan');
  const conexion = postgres(url, {
    max: 1,
    prepare: !url.includes('pooler.supabase.com'),
    ssl: url.includes('localhost') ? false : 'require',
    onnotice: () => {},
  });
  const [fiscal] = await conexion`
    select count(*)::int as reglas,
           count(*) filter (where territorio = 'melilla')::int as melilla,
           count(*) filter (where referencia_legal is not null)::int as con_respaldo
      from estook.regla_fiscal
  `;
  comprobar('17 reglas sembradas', fiscal.reglas === 17, `hay ${fiscal.reglas}`);
  comprobar('6 de Melilla', fiscal.melilla === 6, `hay ${fiscal.melilla}`);
  comprobar('todas con referencia legal', fiscal.con_respaldo === fiscal.reglas);

  const [versiones] = await conexion`
    select count(*)::int as sin_version from pg_class c
     where c.relnamespace = 'estook'::regnamespace and c.relkind = 'r'
       and c.relname in ('organizacion','area','local','persona','membresia',
                         'recorte_de_permiso','traduccion','dispositivo','politica_de_catalogo')
       and not exists (
         select 1 from pg_attribute a
          where a.attrelid = c.oid and a.attname = 'version' and a.attnum > 0
       )
  `;
  comprobar('todas las tablas de dominio llevan version', versiones.sin_version === 0);

  titulo('M3 · lo que la 0017 dejo puesto en Supabase');
  const [trgm] = await conexion`
    select count(*)::int as puesta from pg_extension where extname = 'pg_trgm'
  `;
  comprobar('la extension pg_trgm esta instalada', trgm.puesta === 1);

  /**
   * Los indices de trigramas, **por nombre y no por cuenta**.
   *
   * Esto decia «los seis indices estan» y comparaba un numero. M5 anadio dos mas
   * (la 0020, para el catalogo de referencia) y la comprobacion se puso en rojo
   * diciendo «hay 8», que no es un fallo: es la herramienta desactualizada.
   *
   * Contar tiene ademas un agujero peor: si un dia se cayera `persona_buscable` y
   * se anadiera otro, la cuenta seguiria cuadrando y nadie se enteraria. Con la
   * lista de nombres, sobrar y faltar se ven por separado, que es lo que hace la
   * misma comprobacion en `pruebas/buscador.prueba.ts`. Las dos miran lo mismo.
   */
  const LOS_INDICES_DE_TRIGRAMAS = [
    'area_buscable',
    'local_buscable',
    'local_codigo_buscable',
    'organizacion_buscable',
    'persona_buscable',
    'persona_correo_buscable',
    // M5 · la 0020, para buscar en el catalogo de referencia.
    'producto_de_referencia_buscable',
    'receta_de_referencia_buscable',
    // M6 · la 0023. Estos dos **si** entran en `estook.buscar`: el genero y a
    // quien se le compra son cosas tuyas, y el catalogo de referencia no.
    'producto_buscable',
    'proveedor_buscable',
  ];

  const indices = await conexion`
    select indexname from pg_indexes
     where schemaname = 'estook' and indexname like '%buscable'
  `;
  const puestos = new Set(indices.map((f) => f.indexname));
  const faltan = LOS_INDICES_DE_TRIGRAMAS.filter((n) => !puestos.has(n));
  const sobran = [...puestos].filter((n) => !LOS_INDICES_DE_TRIGRAMAS.includes(n));
  const losIndicesCuadran = faltan.length === 0 && sobran.length === 0;
  comprobar(
    `los ${LOS_INDICES_DE_TRIGRAMAS.length} indices de trigramas estan`,
    losIndicesCuadran,
    losIndicesCuadran
      ? ''
      : [
          faltan.length > 0 ? `faltan ${faltan.join(', ')}` : '',
          sobran.length > 0 ? `sobran ${sobran.join(', ')}` : '',
        ]
          .filter(Boolean)
          .join(' · '),
  );

  const [buscadora] = await conexion`
    select p.prosecdef as definer
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'estook' and p.proname = 'buscar'
  `;
  comprobar('estook.buscar NO es security definer', buscadora?.definer === false);

  // ── M4 · lo que la 0018 dejo puesto ───────────────────────────────────────
  //
  // Va aqui por la misma leccion de siempre: la 0016 existe porque algo que
  // funcionaba contra Postgres efimero no funcionaba contra Supabase. La 0018
  // crea un indice unico y once funciones con privilegio, que es exactamente el
  // tipo de cosa que hay que mirar contra la base de datos de verdad.

  titulo('M4 · lo que la 0018 dejo puesto en Supabase');

  const [tablas] = await conexion`
    select count(*)::int as cuantas
      from pg_class c
     where c.relnamespace = 'estook'::regnamespace
       and c.relname in ('suscripcion','credencial','pin','doble_factor','sesion')
       and c.relrowsecurity
  `;
  comprobar(
    'las cinco tablas nuevas, con seguridad por filas',
    tablas.cuantas === 5,
    `hay ${tablas.cuantas}`,
  );

  const [sinRls] = await conexion`
    select count(*)::int as cuantas from pg_class c
     where c.relnamespace = 'estook'::regnamespace
       and c.relkind = 'r' and not c.relrowsecurity
  `;
  comprobar('y ninguna tabla del esquema se ha quedado sin ella', sinRls.cuantas === 0);

  const [indice] = await conexion`
    select count(*)::int as cuantos from pg_indexes
     where schemaname = 'estook' and indexname = 'pin_unico_en_su_local'
  `;
  comprobar('«PIN unico por local» lo garantiza un indice', indice.cuantos === 1);

  const [puertas] = await conexion`
    select count(*)::int as cuantas,
           count(*) filter (
             where has_function_privilege('public', p.oid, 'execute')
           )::int as publicas
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'estook' and p.prosecdef
       and p.proname in (
         'credencial_para_entrar','pines_para_entrar','pin_del_quiosco',
         'anotar_intento_de_contrasena','anotar_intento_de_pin','abrir_sesion',
         'sesion_activa','persona_por_correo','poner_credencial',
         'cerrar_sesiones_de','tiene_como_volver_a_entrar'
       )
  `;
  comprobar('las once puertas de atras estan', puertas.cuantas === 11, `hay ${puertas.cuantas}`);
  comprobar('y ninguna la puede ejecutar cualquiera', puertas.publicas === 0);

  const [revocacion] = await conexion`
    select count(*)::int as cuantas from information_schema.columns
     where table_schema = 'estook' and table_name = 'membresia' and column_name = 'revocada_en'
  `;
  comprobar('la revocacion tiene hora, no solo fecha', revocacion.cuantas === 1);

  // Lo mas barato de comprobar y lo mas caro de que se escape: que no haya ni una
  // contrasena guardada tal cual. La restriccion de la tabla ya lo impide, pero
  // esto lo mira en los datos de verdad, que es donde importa.
  const [secretos] = await conexion`
    select count(*)::int as en_claro
      from estook.credencial
     where derivada not like 'pbkdf2-sha256$%'
  `;
  comprobar('ninguna contrasena guardada en claro', secretos.en_claro === 0);

  // ── M5 · lo que la 0020 y la 0021 dejaron puesto ──────────────────────────
  //
  // Esta seccion existe por lo que paso al desplegarla. La 0020 anadia la
  // restriccion de coherencia del alta **antes** de rellenar la columna. Contra
  // el Postgres efimero de las pruebas pasaba en verde, porque alli las semillas
  // corren despues y `estook.local` esta vacia cuando llega la migracion: la
  // restriccion no tenia ni una fila que mirar. Contra los siete locales de
  // Supabase salto en la cara.
  //
  // El arreglo de fondo es la prueba nueva de `pruebas/migraciones.prueba.ts`,
  // que aplica las migraciones sobre una base ya sembrada. Esto es lo otro que
  // hacia falta: mirar en la base de verdad que lo que la migracion prometio
  // esta puesto de verdad.

  titulo('M5 · lo que la 0020 dejo puesto en Supabase');

  const [alta] = await conexion`
    select count(*) filter (
             where conname = 'local_onboarding_terminado_coherente'
           )::int as restriccion,
           (select count(*) from estook.local)::int as locales,
           (select count(*) from estook.local where onboarding_terminado)::int as montados,
           (select count(*) from estook.local
             where onboarding_terminado <> (onboarding_terminado_en is not null)
           )::int as incoherentes
      from pg_constraint
  `;
  comprobar('la restriccion de coherencia del alta esta', alta.restriccion === 1);
  comprobar(
    'y ni un local se ha quedado a medias al aplicarla',
    alta.incoherentes === 0,
    `${alta.montados} de ${alta.locales} montados · ${alta.incoherentes} incoherente(s)`,
  );

  /**
   * `abrir_sesion` **una sola vez, y con ocho argumentos**.
   *
   * La 0020 le anade el dispositivo, asi que tuvo que tirar la de siete y crear
   * la de ocho. Si el `drop` no hubiera entrado, hoy habria dos funciones con el
   * mismo nombre y Postgres contestaria «function is not unique» a cada intento
   * de entrar. Es un fallo que no aparece hasta que alguien va a entrar, asi que
   * se mira aqui y no se espera a que lo cuente un usuario.
   */
  const abridoras = await conexion`
    select p.pronargs from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'estook' and p.proname = 'abrir_sesion'
  `;
  comprobar(
    'abrir_sesion existe una sola vez, y ya con el dispositivo',
    abridoras.length === 1 && abridoras[0]?.pronargs === 8,
    `hay ${abridoras.length} con ${abridoras.map((f) => f.pronargs).join('/')} argumento(s)`,
  );

  const [nuevas] = await conexion`
    select count(*)::int as cuantas,
           count(*) filter (
             where has_function_privilege('public', p.oid, 'execute')
           )::int as publicas
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'estook' and p.prosecdef
       and p.proname in ('reconocer_dispositivo', 'abrir_demostracion', 'cerrar_demostracion')
  `;
  comprobar('las tres puertas nuevas estan', nuevas.cuantas === 3, `hay ${nuevas.cuantas}`);
  comprobar('y ninguna la puede ejecutar cualquiera', nuevas.publicas === 0);

  /**
   * Y la que tiene que NO tenerlo: `quitar_ejemplos`.
   *
   * Borra de golpe todo lo apuntado como ejemplo de un local. Con `security
   * definer` correria como dueno de la base y las politicas dejarian de mandar,
   * asi que un boton de limpieza podria llevarse por delante lo de otro. Sin el,
   * cada borrado pasa por las mismas politicas que todo lo demas.
   *
   * Se comprueba **que no lo tiene**, que es de las pocas comprobaciones que
   * vigilan una ausencia. Ponerselo un dia sin querer no daria ningun error.
   */
  const [limpiadora] = await conexion`
    select p.prosecdef as definer from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'estook' and p.proname = 'quitar_ejemplos'
  `;
  comprobar('quitar_ejemplos NO es security definer', limpiadora?.definer === false);

  const indicesDeM5 = await conexion`
    select indexname from pg_indexes
     where schemaname = 'estook'
       and indexname in (
         'objetivo_uno_vigente_por_clave',
         'dispositivo_uno_por_huella',
         'importacion_no_se_repite'
       )
  `;
  comprobar(
    'los tres indices unicos parciales de M5 estan',
    indicesDeM5.length === 3,
    `hay ${indicesDeM5.length}`,
  );

  titulo('M5 · el catalogo de referencia de la 0021');

  const [catalogo] = await conexion`
    select (select count(*) from estook.alergeno)::int                       as alergenos,
           (select count(*) from estook.producto_de_referencia)::int         as productos,
           (select count(distinct categoria) from estook.producto_de_referencia)::int as categorias,
           (select count(*) from estook.receta_de_referencia)::int           as recetas,
           (select count(*) from estook.linea_de_receta_de_referencia)::int  as lineas,
           (select count(*) from estook.objetivo_de_partida)::int            as objetivos
  `;
  comprobar(
    'los catorce alergenos oficiales',
    catalogo.alergenos === 14,
    `hay ${catalogo.alergenos}`,
  );
  comprobar(
    'el catalogo de productos, con sus categorias',
    catalogo.productos === 302 && catalogo.categorias === 22,
    `${catalogo.productos} producto(s) en ${catalogo.categorias} categoria(s)`,
  );
  comprobar(
    'las recetas de referencia con sus lineas',
    catalogo.recetas === 10 && catalogo.lineas === 60,
    `${catalogo.recetas} receta(s) · ${catalogo.lineas} linea(s)`,
  );
  comprobar(
    'los objetivos de partida, tres por tipo de local',
    catalogo.objetivos === 18,
    `hay ${catalogo.objetivos}`,
  );

  // Ninguna linea de receta puede apuntar a un producto que no esta. La clave
  // ajena ya lo impide; esto lo mira en los datos, que es donde importaria.
  const [huerfanas] = await conexion`
    select count(*)::int as sueltas
      from estook.linea_de_receta_de_referencia l
     where not exists (
       select 1 from estook.producto_de_referencia p
        where p.id = l.producto_de_referencia_id
     )
  `;
  comprobar('ni una linea de receta apunta al vacio', huerfanas.sueltas === 0);

  titulo('M5 · lo que la 0022 dejo puesto');

  // La 0022 guarda a que paso se volvio desde el Panel. Se mira aqui por lo
  // mismo que las otras: lo que una migracion promete hay que verlo en la base
  // de verdad, no darlo por hecho porque el fichero lo diga.
  const [recado] = await conexion`
    select (
      select count(*)::int from information_schema.columns
       where table_schema = 'estook' and table_name = 'local'
         and column_name = 'onboarding_retomado_para'
    ) as columna,
    (
      select count(*)::int from pg_constraint
       where conname in (
         'local_retomado_para_es_un_paso',
         'local_retomado_solo_con_el_alta_abierta'
       )
    ) as restricciones,
    (
      select count(*)::int from estook.local
       where onboarding_retomado_para is not null and onboarding_terminado
    ) as pegados
  `;
  comprobar('la columna del recado esta', recado.columna === 1);
  comprobar('con sus dos restricciones', recado.restricciones === 2, `hay ${recado.restricciones}`);
  // Un recado abierto sobre un alta terminada cerraria el alta siguiente en el
  // primer paso. La restriccion ya lo impide; esto lo mira en los datos.
  comprobar('y ni un recado pegado en un alta ya terminada', recado.pegados === 0);

  titulo('M6 · lo que la 0023 dejo puesto');

  // ── Por que esta seccion se salta en vez de gritar ─────────────────────────
  //
  // Porque la regla 1 de «como trabajamos» es «primero fusionar, despues aplicar
  // a Supabase»: hay un rato normal y correcto en el que el codigo de M6 esta en
  // `main` y la 0023 todavia no esta puesta. Marcar eso como MAL seria gritar
  // cuando todo esta bien, que es justo lo que costo una tarde en M5.
  //
  // Asi que si la migracion no esta, se dice y se cuentan aparte.
  const [cuantasMigraciones] = await conexion`
    select coalesce(max(numero), 0)::int as ultima from estook.migracion
  `;

  if (cuantasMigraciones.ultima < 23) {
    noSePuede(`la 0023 todavia no esta aplicada · la base va por la ${cuantasMigraciones.ultima}`);
  } else {
    const [inventario] = await conexion`
      select (
        select count(*)::int from pg_class c
         where c.relnamespace = 'estook'::regnamespace and c.relkind = 'r'
           and c.relname in (
             'proveedor','categoria_de_producto','categoria_de_partida','producto',
             'precio_de_producto','lote','movimiento_de_stock'
           )
           and c.relrowsecurity
      ) as tablas_con_rls,
      (
        select count(*)::int from pg_class c
         where c.relnamespace = 'estook'::regnamespace and c.relkind = 'v'
           and c.relname = 'existencias'
           and 'security_invoker=true' = any(c.reloptions)
      ) as vista_con_invoker,
      (
        select has_table_privilege('estook_api', 'estook.movimiento_de_stock', 'UPDATE')
      ) as puede_modificar_el_libro,
      (
        select count(*)::int from pg_proc
         where pronamespace = 'estook'::regnamespace
           and proname = 'sembrar_categorias' and prosecdef
      ) as siembra_con_privilegio,
      (
        select has_function_privilege(
          'public',
          (select oid from pg_proc
            where pronamespace = 'estook'::regnamespace and proname = 'sembrar_categorias'),
          'execute'
        )
      ) as la_siembra_es_publica,
      (
        select count(*)::int from estook.local l
         where l.tipo is not null
           and not exists (
             select 1 from estook.categoria_de_producto c where c.local_id = l.id
           )
      ) as locales_sin_categorias,
      (
        select count(*)::int from estook.categoria_de_partida
      ) as categorias_de_serie,
      (
        select count(*)::int from estook.movimiento_de_stock m
         where m.cantidad = 0
      ) as movimientos_vacios
    `;

    comprobar(
      'las siete tablas de inventario, con seguridad por filas',
      inventario.tablas_con_rls === 7,
      `hay ${inventario.tablas_con_rls}`,
    );
    // Sin esto, la vista se ejecutaria con los permisos de su dueno y se
    // saltaria la seguridad por filas entera: un local veria el stock de otro.
    comprobar(
      'la vista de existencias se ejecuta con los permisos de quien pregunta',
      inventario.vista_con_invoker === 1,
    );
    // Regla 8 del Plan: el stock no se sobreescribe, se anade un movimiento.
    comprobar(
      'el libro de movimientos NO se puede modificar',
      inventario.puede_modificar_el_libro === false,
    );
    comprobar('y ni un movimiento de cero se ha colado', inventario.movimientos_vacios === 0);
    comprobar(
      'sembrar_categorias es la unica puerta de atras de M6',
      inventario.siembra_con_privilegio === 1,
    );
    comprobar('y no la puede ejecutar cualquiera', inventario.la_siembra_es_publica === false);
    comprobar(
      'las categorias de serie estan, por tipo de local',
      inventario.categorias_de_serie > 0,
      `hay ${inventario.categorias_de_serie}`,
    );
    // «Nunca vacio: vienen de serie» (Auditoria, parte 3). Si un local con tipo
    // se queda sin categorias, su desplegable sale vacio.
    comprobar(
      'y ni un local con tipo se ha quedado sin las suyas',
      inventario.locales_sin_categorias === 0,
      `${inventario.locales_sin_categorias} sin categorias`,
    );
  }

  // ── La 0024, que es una sola columna pero se olvida igual ─────────────────
  //
  // «No me lo recuerdes mas» de la tarjeta del Panel se guarda ahi. Sin la
  // columna, ese boton devuelve un error y la tarjeta no se va: exactamente la
  // clase de boton mudo que este proyecto lleva persiguiendo desde M4.
  //
  // Se salta, y no grita, por la misma razon que la 0023: hay un rato normal en
  // el que el codigo esta fusionado y la migracion todavia no esta puesta.
  if (cuantasMigraciones.ultima < 24) {
    noSePuede(`la 0024 todavia no esta aplicada · la base va por la ${cuantasMigraciones.ultima}`);
  } else {
    const [recordatorio] = await conexion`
      select count(*)::int as columna
        from pg_attribute
       where attrelid = 'estook.local'::regclass
         and attname = 'panel_recordatorio_oculto'
         and not attisdropped
    `;
    comprobar(
      'se puede apagar el recordatorio del alta, y se apaga en el servidor',
      recordatorio.columna === 1,
    );
  }

  titulo('La API DESPLEGADA, que es otra cosa');

  // ══════════════════════════════════════════════════════════════════════════
  // Esta seccion existe porque M6 se publico a medias y no lo vio nadie
  // ══════════════════════════════════════════════════════════════════════════
  //
  // Todo lo de arriba arranca la API **en esta maquina** contra Supabase. Eso
  // comprueba que el codigo y la base cuadran, y es lo que tiene que comprobar.
  //
  // Lo que **no** comprueba es la API que hay ahi fuera, que es la que llama el
  // movil. Y esas dos cosas se separan con una facilidad pasmosa, porque las
  // aplicaciones se publican solas al fusionar y **la API se despliega a mano**
  // (esta razonado en su flujo: «desplegar la API es lo que pone los datos de
  // verdad al alcance de cualquiera con un navegador, y eso se hace mirando»).
  //
  // Al cerrar M6 pasó exactamente eso: la app publicada con Inventario dentro, y
  // la API sin desplegar. Entrar en Inventario devolvia «Eso ya no está» en cada
  // pantalla, y por fuera parecia que el modulo estaba roto.
  //
  // Asi que se pregunta a la de verdad. **Una operacion que el codigo tiene y la
  // desplegada no conoce significa que falta desplegar**, y se dice con esas
  // palabras en vez de con un numero.

  // Sin la barra del final, venga como venga: `https://x.supabase.co/` y
  // `https://x.supabase.co` tienen que dar la misma direccion.
  let laDesplegada = process.env['VITE_SUPABASE_URL'] ?? '';
  while (laDesplegada.endsWith('/')) laDesplegada = laDesplegada.slice(0, -1);

  if (laDesplegada === '') {
    noSePuede('no se donde vive la API desplegada · falta VITE_SUPABASE_URL en .env.local');
  } else {
    const raiz = `${laDesplegada}/functions/v1/api`;

    // Se preguntan **sin sesion**, a proposito. La respuesta distingue las dos
    // cosas que hacen falta y ninguna mas:
    //
    //   sin_sesion  la conoce, y pide identificarse. Es lo que tiene que salir.
    //   no_existe   no la conoce: el despliegue va por detras del codigo.
    const preguntar = async (nombre) => {
      try {
        const respuesta = await fetch(`${raiz}/v1/consultas/${nombre}`);
        const cuerpo = await respuesta.json();
        return cuerpo?.error?.codigo ?? 'la_conoce';
      } catch {
        return 'no_contesta';
      }
    };

    const salud = await fetch(`${raiz}/salud`)
      .then((r) => r.ok)
      .catch(() => false);

    comprobar('la API desplegada responde', salud);

    if (salud) {
      // Todas las consultas del catalogo, que es la lista de verdad y no una
      // copia: si manana se anade una y no se despliega, esto lo dice solo.
      const suyas = Object.keys(catalogoDeOperaciones.consultas);
      const desconocidas = [];

      for (const nombre of suyas) {
        if ((await preguntar(nombre)) === 'no_existe') desconocidas.push(nombre);
      }

      comprobar(
        'y conoce todas las consultas que tiene el codigo',
        desconocidas.length === 0,
        desconocidas.length === 0
          ? `las ${suyas.length}`
          : `FALTA DESPLEGARLA · no conoce ${desconocidas.length}: ${desconocidas.join(', ')}`,
      );

      if (desconocidas.length > 0) {
        console.log('');
        console.log('       La API desplegada va por detras del codigo.');
        console.log('       Se despliega a mano: GitHub -> Actions -> «Desplegar la API»,');
        console.log('       escribiendo «desplegar» para confirmar.');
      }
    }
  }

  await conexion.end();
} catch (fallo) {
  console.error(`\n  Se ha roto: ${fallo instanceof Error ? fallo.message : String(fallo)}`);
  fallos += 1;
} finally {
  // Antes de soltar nada: recoger. Va en el `finally` para que tambien recoja
  // cuando algo se ha roto, que es justo cuando mas rastro queda.
  const cerradas = await cerrarLoQueSeAbrio();
  if (cerradas > 0) console.log(`\n  ${cerradas} sesion(es) de prueba cerradas al terminar`);
  await cerrarConexion();
}

/**
 * El resumen dice las dos cifras, y **nunca una sola**.
 *
 * «Todo correcto» a secas, con nueve comprobaciones sin hacer detras, seria
 * exactamente la clase de verde que no significa nada. Y contarlas como fallos
 * seria el rojo que tampoco significa nada. Las dos cifras, siempre.
 *
 * El codigo de salida lo marcan los fallos: no haber podido entrar en una base
 * sin cuentas de ejemplo no es un fallo, es lo que tiene que pasar ahi.
 */
if (fallos === 0 && noComprobadas === 0) {
  console.log('\nTodo correcto\n');
} else {
  const partes = [];
  if (fallos > 0) partes.push(`${fallos} comprobacion(es) mal`);
  if (noComprobadas > 0) partes.push(`${noComprobadas} sin poder comprobar`);
  console.log(`\n${partes.join(' · ')}\n`);
}

process.exit(fallos === 0 ? 0 : 1);
