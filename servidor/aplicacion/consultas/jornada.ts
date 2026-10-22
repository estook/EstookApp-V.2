import { z } from 'zod';
import {
  fechaOperativa,
  horaDeCorte,
  horaEnElLocal,
  jornadaDe,
  laJornadaEntera,
  masDias,
} from '@estook/dominio';
import { consulta, FalloDeAplicacion, type Contexto } from '../contrato.ts';
import { loQuePuede } from '../lo-que-puede.ts';
import { laCajaSinCerrar } from './hoy.ts';

/**
 * M16a · La jornada (decisión 0105): cómo va el día del restaurante.
 *
 * El día va **de hora de corte a hora de corte**, en el reloj del local, y lo decide el
 * servidor (regla 10): el móvil de la camarera puede ir con la hora mal. **Se abre solo**
 * a la hora de corte —no hay que pulsar nada, ni un reloj que lo apunte: un día sin
 * cierre está abierto— y dura lo que dura de verdad: el sábado de la noche en que se
 * atrasa la hora, 25 horas.
 *
 * Lo pide «En marcha» (Servicio › Jornada), que lo mira también quien no ve las ventas:
 * **aquí no hay un euro**. Si el día está cerrado, quién lo cerró y cuándo, por
 * `como_esta_la_jornada` (0080), que no enseña la caja.
 */

export type EstadoDeLaJornada = 'abierta' | 'cerrada' | 'reabierta';

export interface SalidaLaJornada {
  /** La jornada de ahora: «2026-10-24», también a las 02:30 del domingo. */
  readonly fecha: string;
  readonly empiezaEn: string;
  readonly terminaEn: string;
  /** Lo que dura: 1440 casi siempre, 1500 o 1380 las noches del cambio de hora. */
  readonly minutos: number;
  /** Cuánto le queda, en minutos. */
  readonly quedan: number;
  /** La hora del reloj del local, «HH:MM». */
  readonly horaDelLocal: string;
  /** La hora de corte, «HH:MM». */
  readonly corte: string;
  readonly estado: EstadoDeLaJornada;
  readonly cerradaEn: string | null;
  readonly cerradaPor: string | null;
  /** Si quien mira puede cerrar el día (las ventas y el Servicio, para editar). */
  readonly puedeCerrar: boolean;
  /**
   * El día de antes, si se suele cerrar y se quedó sin cerrar: el mismo aviso del Panel
   * (0042). Solo a quien ve las ventas.
   */
  readonly ayerSinCerrar: string | null;
}

function elLocal(contexto: Contexto): string {
  const localId = contexto.sesion?.localId;
  if (!localId) {
    throw new FalloDeAplicacion('faltan_datos', {
      porque: 'Hay que estar dentro de un local para ver su jornada. Elige uno primero.',
    });
  }
  return localId;
}

/** Cómo está un día: abierto si no tiene cierre. Sin un euro (0080). */
export async function comoEstaElDia(
  contexto: Contexto,
  localId: string,
  fecha: string,
): Promise<{
  readonly estado: EstadoDeLaJornada;
  readonly cerradaEn: string | null;
  readonly cerradaPor: string | null;
}> {
  const filas = await contexto.sql<
    { estado: string; cerrada_en: string | null; cerrada_por: string | null }[]
  >`
    select estado,
           to_char(cerrada_en at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as cerrada_en,
           cerrada_por
      from estook.como_esta_la_jornada(${localId}::uuid, ${fecha}::date)
  `;
  const fila = filas[0];
  if (fila === undefined) return { estado: 'abierta', cerradaEn: null, cerradaPor: null };
  return {
    estado: fila.estado === 'reabierta' ? 'reabierta' : 'cerrada',
    cerradaEn: fila.cerrada_en,
    cerradaPor: fila.cerrada_por,
  };
}

export const laJornada = consulta<Record<string, never>, SalidaLaJornada>({
  nombre: 'la_jornada',
  entrada: z.object({}).strict(),
  exige: 'app.servicio',

  async ejecutar(contexto) {
    const localId = elLocal(contexto);
    const filas = await contexto.sql<{ zona_horaria: string; hora_de_corte: string }[]>`
      select zona_horaria, to_char(hora_de_corte, 'HH24:MI') as hora_de_corte
        from estook.local where id = ${localId}
    `;
    const local = filas[0];
    if (local === undefined) throw new FalloDeAplicacion('local_ajeno');

    const corte = horaDeCorte(local.hora_de_corte);
    const fecha = jornadaDe(contexto.ahora, local.zona_horaria, corte);
    const entera = laJornadaEntera(fecha, local.zona_horaria, corte);
    const dia = await comoEstaElDia(contexto, localId, fecha);

    const puede = await loQuePuede(contexto, localId, ['dato.ventas', 'app.servicio']);
    const ayer = puede.ver('dato.ventas')
      ? await laCajaSinCerrar(contexto, localId, fechaOperativa(fecha))
      : null;

    return {
      fecha,
      empiezaEn: entera.empieza.toISOString(),
      terminaEn: entera.termina.toISOString(),
      minutos: entera.minutos,
      quedan: Math.max(
        0,
        Math.floor((entera.termina.getTime() - contexto.ahora.getTime()) / 60_000),
      ),
      horaDelLocal: horaEnElLocal(contexto.ahora, local.zona_horaria),
      corte,
      ...dia,
      puedeCerrar: puede.editar('dato.ventas') && puede.editar('app.servicio'),
      ayerSinCerrar: ayer === null ? null : masDias(fechaOperativa(fecha), -1),
    };
  },
});
