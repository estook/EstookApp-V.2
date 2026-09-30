/**
 * La copia de los ficheros del almacén de Supabase: logos, fotos de producto y cartas
 * (auditoría profunda · decisión 0061).
 *
 *   node herramientas/copia-de-los-ficheros.mjs <carpeta de destino>
 *
 * La base se copia con `pg_dump`, pero los ficheros no viven en la base: viven en el
 * almacén de Supabase, y la base solo guarda sus claves. Una copia de la base sin sus
 * ficheros devuelve un local sin logo y una carta sin páginas.
 *
 * Recorre **todos los cubos** —hoy `marca`, `fotos-de-producto` y `cartas`— y baja cada
 * fichero a `<destino>/<cubo>/<su camino>`. Lo lanza el flujo «Copia de seguridad», que
 * después lo empaqueta y lo cifra; se puede lanzar a mano para comprobarlo.
 *
 * Necesita `SUPABASE_URL` y una clave de servicio (`CLAVE_DE_SERVICIO`), la única que ve
 * los cubos privados. **Solo lee**: no mueve ni borra nada.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const url = process.env.SUPABASE_URL?.replace(/\/+$/, '');
const clave = process.env.CLAVE_DE_SERVICIO;
const destino = process.argv[2];

if (!url || !clave || !destino) {
  console.error(
    'Uso: SUPABASE_URL=… CLAVE_DE_SERVICIO=… node herramientas/copia-de-los-ficheros.mjs <destino>',
  );
  process.exit(1);
}

const raiz = `${url}/storage/v1`;
const cabeceras = { authorization: `Bearer ${clave}`, apikey: clave };

/** Pide algo al almacén y falla con un mensaje que se entiende. */
async function pedir(camino, opciones = {}) {
  const respuesta = await fetch(`${raiz}${camino}`, {
    ...opciones,
    headers: { ...cabeceras, ...opciones.headers },
  });
  if (!respuesta.ok) throw new Error(`${camino}: el almacén contestó ${respuesta.status}`);
  return respuesta;
}

/**
 * Todo lo que hay debajo de un prefijo de un cubo.
 *
 * El almacén lista una carpeta cada vez, y una carpeta viene como una entrada **sin
 * `id`**: se entra en ella. De cien en cien, que es lo que devuelve de una tanda.
 */
async function loDeDentro(cubo, prefijo) {
  const ficheros = [];
  for (let desde = 0; ; desde += 100) {
    const tanda = await (
      await pedir(`/object/list/${cubo}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          prefix: prefijo,
          limit: 100,
          offset: desde,
          sortBy: { column: 'name', order: 'asc' },
        }),
      })
    ).json();
    for (const entrada of tanda) {
      const camino = prefijo ? `${prefijo}/${entrada.name}` : entrada.name;
      if (entrada.id === null || entrada.id === undefined)
        ficheros.push(...(await loDeDentro(cubo, camino)));
      else ficheros.push(camino);
    }
    if (tanda.length < 100) return ficheros;
  }
}

const cubos = await (await pedir('/bucket')).json();
let total = 0;

for (const { id: cubo } of cubos) {
  const ficheros = await loDeDentro(cubo, '');
  for (const camino of ficheros) {
    const contenido = Buffer.from(await (await pedir(`/object/${cubo}/${camino}`)).arrayBuffer());
    const donde = join(destino, cubo, ...camino.split('/'));
    mkdirSync(dirname(donde), { recursive: true });
    writeFileSync(donde, contenido);
  }
  console.log(`${cubo}: ${ficheros.length} ficheros`);
  total += ficheros.length;
}

console.log(`En total, ${total} ficheros de ${cubos.length} cubos.`);
