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
  await conexion.end();
} catch (fallo) {
  console.error(`\n  Se ha roto: ${fallo instanceof Error ? fallo.message : String(fallo)}`);
  fallos += 1;
} finally {
  await cerrarConexion();
}

console.log(fallos === 0 ? '\nTodo correcto\n' : `\n${fallos} comprobacion(es) mal\n`);
process.exit(fallos === 0 ? 0 : 1);
