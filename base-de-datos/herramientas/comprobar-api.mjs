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
 * Solo lee. No cambia nada.
 */
import { api } from '../../servidor/index.ts';
import { cerrarConexion } from '../../servidor/infraestructura/postgres.ts';
import postgres from 'postgres';

const url = process.env['DATABASE_URL'];
if (!url) {
  console.error('Falta DATABASE_URL en .env.local.');
  process.exit(1);
}

let fallos = 0;

function comprobar(titulo, condicion, detalle = '') {
  const marca = condicion ? 'OK  ' : 'MAL ';
  if (!condicion) fallos += 1;
  console.log(`  ${marca} ${titulo}${detalle ? ` · ${detalle}` : ''}`);
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

const pedir = (camino, cabeceras = {}) => api.request(camino, { headers: cabeceras });

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

  titulo('Cada persona ve exactamente los suyos');
  const esperado = {
    'elena@ejemplo.estook.com': 6,
    'ignacio@ejemplo.estook.com': 3,
    'luis@ejemplo.estook.com': 1,
    'rosa@ejemplo.estook.com': 1,
    'sara@ejemplo.estook.com': 1,
  };

  for (const [correo, cuantos] of Object.entries(esperado)) {
    const respuesta = await (
      await pedir('/v1/consultas/mis_locales', { 'x-persona-id': personas[correo] })
    ).json();
    const vistos = respuesta.datos?.length ?? -1;
    comprobar(`${correo.split('@')[0]} ve ${cuantos}`, vistos === cuantos, `ha visto ${vistos}`);
  }

  titulo('La deuda de M1 · un local ajeno devuelve 403');
  const ajeno = await pedir(`/v1/consultas/un_local?id=${locales['bar-puerto']}`, {
    'x-persona-id': personas['rosa@ejemplo.estook.com'],
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
    'x-persona-id': personas['rosa@ejemplo.estook.com'],
  });
  const cuerpoPropio = await propio.json();
  comprobar('estado 200', propio.status === 200);
  comprobar('y trae el local', cuerpoPropio.datos?.codigo === 'bar-centro');

  titulo('La correlacion viaja de vuelta');
  const conHilo = await pedir('/v1/consultas/mis_locales', {
    'x-persona-id': personas['rosa@ejemplo.estook.com'],
    'x-correlacion-id': '3f0c2e6a-1b4d-4a71-9c2e-8a6f5b0d1e77',
  });
  comprobar(
    'la misma que se mando',
    conHilo.headers.get('x-correlacion-id') === '3f0c2e6a-1b4d-4a71-9c2e-8a6f5b0d1e77',
  );

  titulo('La identidad no se pega a la conexion (decision 0005)');
  // Se pregunta como Elena (ve 6) y justo despues sin identidad. Si la identidad
  // se hubiera quedado pegada, la segunda veria 6 en vez de ninguno.
  await pedir('/v1/consultas/mis_locales', {
    'x-persona-id': personas['elena@ejemplo.estook.com'],
  });
  const despues = await (await pedir('/v1/consultas/mis_locales')).json();
  comprobar('la siguiente peticion no hereda nada', despues.error?.codigo === 'sin_sesion');

  titulo('Versionado con compatibilidad N-2');
  const futura = await (await pedir('/v9/consultas/mis_locales')).json();
  comprobar('una version que no existe se rechaza', futura.error?.codigo === 'faltan_datos');

  // ── M3 · el buscador y los permisos, contra Supabase ──────────────────────
  //
  // Van aqui por la leccion de M2: la migracion 0016 existe porque algo que
  // funcionaba contra Postgres efimero no funcionaba contra Supabase. La 0017
  // instala una extension y crea indices GIN, que es exactamente el tipo de cosa
  // que un Postgres compilado a WebAssembly puede hacer de otra manera.

  titulo('M3 · mis_permisos');
  const permisosDeSara = await (
    await pedir(`/v1/consultas/mis_permisos?local_id=${locales['bar-centro']}`, {
      'x-persona-id': personas['sara@ejemplo.estook.com'],
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

  const permisosAjenos = await pedir(`/v1/consultas/mis_permisos?local_id=${locales['bar-faro']}`, {
    'x-persona-id': personas['rosa@ejemplo.estook.com'],
  });
  comprobar(
    'sobre un local ajeno devuelve 403',
    permisosAjenos.status === 403,
    `ha devuelto ${permisosAjenos.status}`,
  );

  titulo('M3 · el buscador universal');
  const buscar = async (correo, texto) => {
    const respuesta = await (
      await pedir(`/v1/consultas/buscar?texto=${encodeURIComponent(texto)}`, {
        'x-persona-id': personas[correo],
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

  const sinDecirQuien = await (await pedir('/v1/consultas/buscar?texto=bar')).json();
  comprobar(
    'sin decir quien pregunta no encuentra nada',
    sinDecirQuien.error?.codigo === 'sin_sesion',
  );

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

  const [indices] = await conexion`
    select count(*)::int as cuantos
      from pg_indexes
     where schemaname = 'estook' and indexname like '%buscable'
  `;
  comprobar('los seis indices de trigramas estan', indices.cuantos === 6, `hay ${indices.cuantos}`);

  const [buscadora] = await conexion`
    select p.prosecdef as definer
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'estook' and p.proname = 'buscar'
  `;
  comprobar('estook.buscar NO es security definer', buscadora?.definer === false);

  await conexion.end();
} catch (fallo) {
  console.error(`\n  Se ha roto: ${fallo instanceof Error ? fallo.message : String(fallo)}`);
  fallos += 1;
} finally {
  await cerrarConexion();
}

console.log(fallos === 0 ? '\nTodo correcto\n' : `\n${fallos} comprobacion(es) mal\n`);
process.exit(fallos === 0 ? 0 : 1);
