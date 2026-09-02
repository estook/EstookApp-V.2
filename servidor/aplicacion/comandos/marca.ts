import { z } from 'zod';
import { publicar } from '../../eventos/bandeja.ts';
import { TIPOS_DE_LOGO, TOPE_DEL_LOGO, claveDelLogo } from '../../infraestructura/almacen.ts';
import { elLocalDeLaSesion, laOrganizacionDeLaSesion, respondido } from '../alta.ts';
import { comando, FalloDeAplicacion } from '../contrato.ts';

/**
 * La marca del local (M5) · paso 5 del alta.
 *
 * «Sube tu logo y elige tu color. Se aplican a la app y a todos los documentos,
 *  con previsualización» (Manifiesto 8).
 *
 * ── El logo viaja en base64, y hay que decir por qué ─────────────────────────
 *
 * La API tiene dos rutas y ninguna más: `GET consultas/:nombre` y `POST
 * comandos/:nombre`, las dos con JSON (regla 3 y parte A4). Añadir una ruta de
 * subida con `multipart` sería añadir una tercera forma de hablar con el
 * servidor, con su validación, su tamaño máximo y sus errores aparte, para un
 * fichero de 200 KB.
 *
 * Base64 cuesta un tercio más de bytes. Sobre un logo ya reducido a 512 px por
 * el navegador, eso son unas decenas de kilobytes en una operación que se hace
 * **una vez en la vida del local**. Pagarlos para no abrir una segunda puerta al
 * servidor sale barato.
 *
 * ── Lo que se comprueba aquí y no en la pantalla ─────────────────────────────
 *
 * El tipo y el tamaño. La pantalla ya reduce la imagen —«la foto pesa 8 MB → se
 * reduce antes de subir» (Auditoría, parte 5)— pero eso es comodidad, no
 * protección: quien llame a la API a pelo con un fichero de 40 MB tiene que
 * recibir un no (regla 4).
 *
 * Y **no se acepta SVG**. Un SVG es un documento que puede llevar JavaScript
 * dentro, y este fichero acaba pintándose en la cabecera de la aplicación.
 */

export const entradaColor = z
  .object({
    color: z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^#[0-9a-f]{6}$/, 'Un color se escribe así: #ff7a00.')
      .nullable(),
  })
  .strict();

export type EntradaColor = z.infer<typeof entradaColor>;

export const guardarColorDeMarca = comando<EntradaColor, { color: string | null }>({
  nombre: 'guardar_color_de_marca',
  entrada: entradaColor,
  exige: 'app.ajustes',

  async ejecutar(contexto, entrada) {
    const localId = elLocalDeLaSesion(contexto);
    const organizacionId = laOrganizacionDeLaSesion(contexto);

    await contexto.sql`
      update estook.local set color_de_marca = ${entrada.color} where id = ${localId}
    `;

    await contexto.sql`
      select estook.anotar(
        ${organizacionId}::uuid, 'cambiar', 'local', ${localId},
        ${localId}::uuid, null, ${JSON.stringify({ color: entrada.color })}::jsonb, null
      )
    `;

    await respondido(contexto, localId, 'marca');

    return { color: entrada.color };
  },
});

// ── El logo ──────────────────────────────────────────────────────────────────

export const entradaLogo = z
  .object({
    tipo: z.string().refine((t) => t in TIPOS_DE_LOGO, {
      message: 'Solo se admiten PNG, JPG y WebP.',
    }),
    /** El fichero en base64, sin el prefijo `data:`. */
    contenido: z
      .string()
      .min(1)
      .max(Math.ceil((TOPE_DEL_LOGO * 4) / 3) + 1024),
  })
  .strict();

export type EntradaLogo = z.infer<typeof entradaLogo>;

export const ponerLogo = comando<EntradaLogo, { puesto: boolean }>({
  nombre: 'poner_logo',
  entrada: entradaLogo,
  exige: 'app.ajustes',

  async ejecutar(contexto, entrada) {
    const localId = elLocalDeLaSesion(contexto);
    const organizacionId = laOrganizacionDeLaSesion(contexto);

    if (contexto.almacen === null) {
      throw new FalloDeAplicacion('fallo_nuestro', {
        porque:
          'Todavía no hay dónde guardar ficheros. El color de tu marca sí se puede poner; el logo, en cuanto esté montado el almacén.',
      });
    }

    const bytes = decodificar(entrada.contenido);
    if (bytes.byteLength > TOPE_DEL_LOGO) {
      throw new FalloDeAplicacion('faltan_datos', {
        campos: ['contenido'],
        porque: `Ese logo pesa demasiado. El tope son ${Math.trunc(TOPE_DEL_LOGO / 1024)} KB, y con eso sobra para un logo.`,
      });
    }

    const extension = TIPOS_DE_LOGO[entrada.tipo] ?? 'png';
    const clave = claveDelLogo(localId, extension, contexto.ahora);

    // El viejo se lee **antes** de escribir el nuevo, para poder borrarlo. Si se
    // leyera después ya se habría perdido la referencia y quedaría un fichero
    // huérfano en el almacén para siempre.
    const antes = await contexto.sql<{ logo_clave: string | null }[]>`
      select logo_clave from estook.local where id = ${localId}
    `;
    const viejo = antes[0]?.logo_clave ?? null;

    await contexto.almacen.guardar(clave, bytes, entrada.tipo);

    // Y **la fila se escribe después de subir**. Al revés, un fallo del almacén
    // dejaría el local apuntando a un fichero que no existe, y la cabecera
    // enseñaría un hueco roto en vez del logo de antes.
    const puestas = await contexto.sql<{ id: string }[]>`
      update estook.local
         set logo_clave = ${clave}, logo_puesto_en = now()
       where id = ${localId}
      returning id
    `;

    if (puestas.length === 0) {
      // No se pudo escribir la fila: se deshace la subida para no dejar basura.
      await contexto.almacen.borrar(clave);
      throw new FalloDeAplicacion('sin_permiso');
    }

    if (viejo !== null) await contexto.almacen.borrar(viejo);

    await contexto.sql`
      select estook.anotar(
        ${organizacionId}::uuid, 'cambiar', 'local', ${localId},
        ${localId}::uuid, null, ${JSON.stringify({ logo: 'puesto' })}::jsonb, null
      )
    `;

    await respondido(contexto, localId, 'marca');

    await publicar(contexto.sql, {
      tipo: 'local.ficha_cambiada',
      organizacionId,
      localId,
      // M11 lo necesita: los documentos ya generados llevan el logo de entonces,
      // y las plantillas tienen que saber que hay uno nuevo.
      datos: { que: 'logo' },
      correlacionId: contexto.correlacionId,
    });

    return { puesto: true };
  },
});

export const quitarLogo = comando<Record<string, never>, { quitado: boolean }>({
  nombre: 'quitar_logo',
  entrada: z.object({}).strict(),
  exige: 'app.ajustes',

  async ejecutar(contexto) {
    const localId = elLocalDeLaSesion(contexto);
    const organizacionId = laOrganizacionDeLaSesion(contexto);

    // La clave se lee antes de borrarla de la fila: después ya no hay forma de
    // saber qué fichero sobraba, y quedaría en el almacén para siempre.
    const antes = await contexto.sql<{ logo_clave: string | null }[]>`
      select logo_clave from estook.local where id = ${localId}
    `;
    const viejo = antes[0]?.logo_clave ?? null;

    await contexto.sql`
      update estook.local set logo_clave = null, logo_puesto_en = null
       where id = ${localId}
    `;

    // Y el fichero se borra al final, cuando la fila ya no lo nombra. Si fallara
    // el borrado, sobra un fichero que nadie ve; al revés, la cabecera enseñaría
    // un hueco roto.
    if (viejo !== null && contexto.almacen !== null) await contexto.almacen.borrar(viejo);

    await contexto.sql`
      select estook.anotar(
        ${organizacionId}::uuid, 'cambiar', 'local', ${localId},
        ${localId}::uuid, null, ${JSON.stringify({ logo: 'quitado' })}::jsonb, null
      )
    `;

    return { quitado: true };
  },
});

/**
 * De base64 a bytes, sin librerías.
 *
 * `atob` existe igual en Node, en Deno y en el navegador, que es la misma razón
 * por la que las contraseñas se derivan con `crypto.subtle` (decisión 0010).
 */
function decodificar(base64: string): Uint8Array {
  const limpio = base64.replace(/^data:[^;]+;base64,/, '');
  let binario: string;
  try {
    binario = atob(limpio);
  } catch {
    throw new FalloDeAplicacion('faltan_datos', {
      campos: ['contenido'],
      porque: 'Ese fichero no ha llegado entero. Vuelve a intentarlo.',
    });
  }

  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
  return bytes;
}
