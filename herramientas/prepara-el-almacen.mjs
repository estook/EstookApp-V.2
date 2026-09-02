/**
 * Preparar el almacen de ficheros en Supabase (M5).
 *
 *   pnpm almacen:preparar
 *
 * Crea el cubo `marca`, donde vive el logo de cada local, y comprueba que se
 * puede subir, firmar y borrar. Se ejecuta **una vez por proyecto**, y es
 * idempotente: volver a lanzarlo no rompe nada.
 *
 * ── Por que esto no es una migracion ─────────────────────────────────────────
 *
 * Porque un cubo no es una tabla. Vive en el esquema `storage`, que lo gestiona
 * Supabase y **no existe en el Postgres efimero de las pruebas**: una migracion
 * que lo tocara no se podria aplicar en dos de las tres capas, que es exactamente
 * el problema que la decision 0009 evito con `unaccent`.
 *
 * ── Y por que comprueba ademas de crear ──────────────────────────────────────
 *
 * Por la leccion de E4: «una comprobacion que no puede fallar es peor que no
 * tenerla». Crear el cubo y decir «listo» no demuestra nada; lo que demuestra que
 * el almacen funciona es **subir un fichero, firmarlo, leerlo y borrarlo**, que
 * es exactamente lo que hara `poner_logo` cuando alguien suba su marca.
 *
 * Es el mismo motivo por el que existe `bd:comprobar-api`: aquel nacio porque la
 * API no podia ponerse el disfraz de `estook_api` y solo se vio contra Supabase
 * de verdad.
 */
import { variable } from '@estook/utiles';
import { CUBO_DE_LA_MARCA } from '../servidor/infraestructura/almacen.ts';

const url = variable('SUPABASE_URL') ?? variable('VITE_SUPABASE_URL');
const clave = variable('SUPABASE_SERVICE_KEY');

if (!url || !clave) {
  console.error(
    [
      'Faltan las credenciales del almacen.',
      '',
      'Que ha pasado: esta herramienta habla con Supabase Storage con la clave de',
      'servicio, y no la encuentra.',
      '',
      'Que se puede hacer: en `.env.local`, pon',
      '  VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co',
      '  SUPABASE_SERVICE_KEY=  (Supabase → Project Settings → API → service_role)',
      '',
      '**Esa clave no va nunca al navegador.** Es la unica de todo el proyecto que',
      'se salta la seguridad por filas, asi que solo vive en tu maquina y en los',
      'secretos de Edge Functions.',
    ].join('\n'),
  );
  process.exit(1);
}

const raiz = `${url.replace(/\/+$/, '')}/storage/v1`;
const cabeceras = { authorization: `Bearer ${clave}`, apikey: clave };

async function paso(que, hacer) {
  process.stdout.write(`  ${que.padEnd(38)} ... `);
  try {
    const nota = await hacer();
    process.stdout.write(`${nota ?? 'hecho'}\n`);
    return true;
  } catch (fallo) {
    process.stdout.write(`FALLO\n      ${fallo instanceof Error ? fallo.message : fallo}\n`);
    return false;
  }
}

console.log(`\n  El almacen de ficheros · ${url}\n`);

let todoBien = true;

todoBien &&= await paso('el cubo de la marca', async () => {
  const existentes = await fetch(`${raiz}/bucket`, { headers: cabeceras });
  if (!existentes.ok) throw new Error(`no se pueden listar los cubos (${existentes.status})`);

  const cubos = await existentes.json();
  if (cubos.some((c) => c.id === CUBO_DE_LA_MARCA)) return 'ya estaba';

  const creado = await fetch(`${raiz}/bucket`, {
    method: 'POST',
    headers: { ...cabeceras, 'content-type': 'application/json' },
    body: JSON.stringify({
      id: CUBO_DE_LA_MARCA,
      name: CUBO_DE_LA_MARCA,
      // **Privado.** Nadie llega a un logo sin un enlace firmado por nosotros, y
      // quien lo tiene lo tiene una hora. Un cubo publico seria una direccion
      // adivinable a la marca de cualquier cliente.
      public: false,
      file_size_limit: 512 * 1024,
      allowed_mime_types: ['image/png', 'image/jpeg', 'image/webp'],
    }),
  });

  if (!creado.ok) throw new Error(`no se ha podido crear (${creado.status})`);
  return 'creado';
});

// La prueba de verdad: el camino entero que recorrera `poner_logo`.
const laClave = `${CUBO_DE_LA_MARCA}/comprobacion/${Date.now()}.png`;

// Un PNG de 1x1 transparente, escrito a mano. Es el fichero mas pequeno que
// Supabase aceptara como `image/png`.
const UN_PIXEL = Uint8Array.from(
  atob(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  ),
  (c) => c.charCodeAt(0),
);

todoBien &&= await paso('subir un fichero', async () => {
  const subido = await fetch(`${raiz}/object/${laClave}`, {
    method: 'POST',
    headers: { ...cabeceras, 'content-type': 'image/png', 'x-upsert': 'true' },
    body: UN_PIXEL,
  });
  if (!subido.ok) throw new Error(`el almacen no lo acepto (${subido.status})`);
});

let enlace = null;

todoBien &&= await paso('firmar un enlace de una hora', async () => {
  const firmado = await fetch(`${raiz}/object/sign/${laClave}`, {
    method: 'POST',
    headers: { ...cabeceras, 'content-type': 'application/json' },
    body: JSON.stringify({ expiresIn: 3600 }),
  });
  if (!firmado.ok) throw new Error(`no se ha podido firmar (${firmado.status})`);

  const datos = await firmado.json();
  if (!datos.signedURL) throw new Error('la respuesta no trae enlace');
  enlace = `${url.replace(/\/+$/, '')}/storage/v1${datos.signedURL}`;
});

todoBien &&= await paso('y que el enlace sirva el fichero', async () => {
  if (enlace === null) throw new Error('no hay enlace que probar');

  const leido = await fetch(enlace);
  if (!leido.ok) throw new Error(`el enlace firmado no sirve el fichero (${leido.status})`);

  const bytes = new Uint8Array(await leido.arrayBuffer());
  if (bytes.byteLength !== UN_PIXEL.byteLength) {
    throw new Error(`ha vuelto otra cosa: ${bytes.byteLength} bytes`);
  }
});

todoBien &&= await paso('que sin firmar NO sirva', async () => {
  // Es la mitad que importa: un cubo privado que sirviera sin firma seria un
  // cubo publico con pasos de mas.
  const aPelo = await fetch(`${raiz}/object/public/${laClave}`);
  if (aPelo.ok) throw new Error('el fichero se sirve sin enlace firmado');
});

await paso('y limpiar lo de la comprobacion', async () => {
  await fetch(`${raiz}/object/${laClave}`, { method: 'DELETE', headers: cabeceras });
});

if (todoBien) {
  console.log(`\n  El almacen esta listo. El logo del alta ya se puede subir.\n`);
} else {
  console.log(
    [
      '',
      '  El almacen NO esta listo, y hasta que lo este el paso 5 del alta dira que',
      '  todavia no hay donde guardar el logo. El color de la marca si funciona.',
      '',
    ].join('\n'),
  );
  process.exitCode = 1;
}
