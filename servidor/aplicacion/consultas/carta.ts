import { z } from 'zod';
import { consulta, FalloDeAplicacion } from '../contrato.ts';

/**
 * La carta de un local, **sin sesión** (entrega O, punto 20 · decisión 0047).
 *
 * Es lo que enseña `estook.com/carta/<dirección>` a quien escanea el QR de la mesa.
 * Quien escanea no ha entrado en ningún sitio, así que esto no pasa por la
 * seguridad de las filas: lee de `estook.la_carta_publica`, que **solo devuelve lo
 * que el local ya enseña al mundo** —su nombre, dónde está, su teléfono y lo que
 * dice su ficha de Google—. Ni un identificador, ni nada de dentro.
 *
 * Hasta M12 eso es la carta entera: el QR se imprime hoy, una vez, y el día que
 * haya platos con precio y alérgenos los enseñará el mismo QR sin reimprimir nada.
 */

export const entradaLaCarta = z
  .object({
    // La forma de la columna: minúsculas, números y guiones. Lo demás no existe,
    // y se contesta igual que si no existiera, sin preguntar a la base.
    direccion: z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[a-z0-9]([a-z0-9-]{0,78}[a-z0-9])?$/),
  })
  .strict();

export type EntradaLaCarta = z.infer<typeof entradaLaCarta>;

export interface LaCarta {
  readonly nombre: string;
  readonly direccion: string | null;
  readonly telefono: string | null;
  readonly web: string | null;
  /** El enlace de Google Maps, si el local está enlazado con Google (0040). */
  readonly mapa: string | null;
  readonly valoracion: number | null;
  readonly resenas: number | null;
  /** Las líneas del horario tal como las da Google: «lunes: 13:00–16:00». */
  readonly horario: readonly string[];
  readonly colorDeMarca: string | null;
  /** Firmado y caduco, como en la cabecera de la app. */
  readonly logo: string | null;
}

/** Una hora, como el logo de la cabecera: el enlace se pide cada vez que se abre. */
const LO_QUE_DURA_EL_ENLACE = 3600;

export const laCarta = consulta<EntradaLaCarta, LaCarta>({
  nombre: 'la_carta',
  entrada: entradaLaCarta,
  sinSesion: true,

  async ejecutar(contexto, entrada) {
    const filas = await contexto.sql<
      {
        nombre: string;
        direccion: string | null;
        telefono: string | null;
        web: string | null;
        mapa: string | null;
        valoracion: string | null;
        resenas: number | null;
        horario: unknown;
        color_de_marca: string | null;
        logo_clave: string | null;
      }[]
    >`
      select nombre, direccion, telefono, web, mapa, valoracion::text as valoracion,
             resenas, horario, color_de_marca, logo_clave
        from estook.la_carta_publica(${entrada.direccion})
    `;

    const fila = filas[0];
    if (fila === undefined) throw new FalloDeAplicacion('no_existe');

    const logo =
      fila.logo_clave === null || contexto.almacen === null
        ? null
        : await contexto.almacen.enlace(fila.logo_clave, LO_QUE_DURA_EL_ENLACE).catch(() => null);

    return {
      nombre: fila.nombre,
      direccion: fila.direccion,
      telefono: fila.telefono,
      web: fila.web,
      mapa: fila.mapa,
      valoracion: fila.valoracion === null ? null : Number(fila.valoracion),
      resenas: fila.resenas,
      horario: lasLineasDelHorario(fila.horario),
      colorDeMarca: fila.color_de_marca,
      logo,
    };
  },
});

/**
 * El horario de Google, en líneas: se guarda como una lista de textos (0040), igual
 * que lo lee `mi_local_en_google`. Lo que no tenga esa forma no se enseña, en vez de
 * enseñar algo raro en la carta de un restaurante.
 */
function lasLineasDelHorario(horario: unknown): readonly string[] {
  if (!Array.isArray(horario)) return [];
  return horario.filter((linea): linea is string => typeof linea === 'string').slice(0, 7);
}
