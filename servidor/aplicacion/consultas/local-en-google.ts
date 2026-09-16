import { z } from 'zod';
import { TOPES_DE_GOOGLE, horaDeCorte, jornadaDe, mesDe } from '@estook/dominio';
import { consulta, FalloDeAplicacion } from '../contrato.ts';

/**
 * El local en Google, tal como está guardado (M7, entrega 5 · 0040).
 *
 * **No llama a Google nunca**: lee lo guardado, con su fecha (0030). Dice además si
 * Google está conectado —si el servidor tiene su clave— y cuánto se ha gastado del
 * tope este mes, que es lo que Ajustes enseña debajo del buscador.
 */
export interface SalidaMiLocalEnGoogle {
  /** Si el servidor tiene la clave de Google. Sin ella, el buscador sale apagado. */
  readonly conectado: boolean;
  readonly ficha: {
    readonly id: string;
    readonly nombre: string | null;
    readonly direccion: string | null;
    readonly telefono: string | null;
    readonly web: string | null;
    readonly mapa: string | null;
    readonly valoracion: number | null;
    readonly resenas: number | null;
    readonly horario: readonly string[] | null;
    readonly leidoEn: string;
  } | null;
  readonly tienePosicion: boolean;
  /** De dónde sale la posición del fichaje: a mano, de Google, o no se sabe. */
  readonly posicionDe: 'a_mano' | 'google' | null;
  readonly uso: { readonly busquedas: number; readonly fichas: number };
  readonly topes: { readonly busquedas: number; readonly fichas: number };
}

export const miLocalEnGoogle = consulta<Record<string, never>, SalidaMiLocalEnGoogle>({
  nombre: 'mi_local_en_google',
  entrada: z.object({}).strict(),
  exige: 'app.ajustes',

  async ejecutar(contexto) {
    const localId = contexto.sesion?.localId;
    if (!localId) {
      throw new FalloDeAplicacion('faltan_datos', {
        porque: 'Hay que estar dentro de un local para verlo en Google. Elige uno primero.',
      });
    }

    const filas = await contexto.sql<
      {
        google_id: string | null;
        google_nombre: string | null;
        google_direccion: string | null;
        google_telefono: string | null;
        google_web: string | null;
        google_mapa: string | null;
        google_valoracion: string | null;
        google_resenas: number | null;
        google_horario: unknown;
        google_leido_en: string | null;
        tiene_posicion: boolean;
        posicion_de: string | null;
        zona_horaria: string;
        hora_de_corte: string;
      }[]
    >`
      select google_id, google_nombre, google_direccion, google_telefono, google_web,
             google_mapa, google_valoracion::text as google_valoracion, google_resenas,
             google_horario,
             to_char(google_leido_en, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as google_leido_en,
             (latitud is not null and longitud is not null) as tiene_posicion,
             posicion_de, zona_horaria, to_char(hora_de_corte, 'HH24:MI') as hora_de_corte
        from estook.local where id = ${localId}
    `;
    const fila = filas[0];
    if (!fila) throw new FalloDeAplicacion('local_ajeno');

    const mes = mesDe(
      jornadaDe(contexto.ahora, fila.zona_horaria, horaDeCorte(fila.hora_de_corte)),
    );
    const usos = await contexto.sql<{ que: string; cuantas: number }[]>`
      select que, cuantas from estook.uso_de_google
       where local_id = ${localId} and mes = ${mes}::date
    `;
    const cuantas = (que: string) => usos.find((u) => u.que === que)?.cuantas ?? 0;

    const horario = Array.isArray(fila.google_horario)
      ? fila.google_horario.filter((linea): linea is string => typeof linea === 'string')
      : null;

    return {
      conectado: contexto.google !== null,
      ficha:
        fila.google_id === null || fila.google_leido_en === null
          ? null
          : {
              id: fila.google_id,
              nombre: fila.google_nombre,
              direccion: fila.google_direccion,
              telefono: fila.google_telefono,
              web: fila.google_web,
              mapa: fila.google_mapa,
              valoracion: fila.google_valoracion === null ? null : Number(fila.google_valoracion),
              resenas: fila.google_resenas,
              horario,
              leidoEn: fila.google_leido_en,
            },
      tienePosicion: fila.tiene_posicion,
      posicionDe:
        fila.posicion_de === 'a_mano' || fila.posicion_de === 'google' ? fila.posicion_de : null,
      uso: { busquedas: cuantas('busqueda'), fichas: cuantas('ficha') },
      topes: { busquedas: TOPES_DE_GOOGLE.busquedasAlMes, fichas: TOPES_DE_GOOGLE.fichasAlMes },
    };
  },
});
