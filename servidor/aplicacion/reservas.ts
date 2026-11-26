import {
  DURACIONES_DE_FABRICA,
  cabeEnElCuarto,
  cuantoDura,
  elCuartoDe,
  esUnServicio,
  fechaEnElLocal,
  fechaOperativa,
  instanteEnElLocal,
  laMejorMesa,
  lasDuracionesReales,
  lasHorasDelServicio,
  type MesaParaReservar,
  type ServicioDeReservas,
  type TramoOcupado,
} from '@estook/dominio';
import { FalloDeAplicacion, type Contexto } from './contrato.ts';

/**
 * Lo que comparten los comandos y las consultas de las reservas (la Ampliación 5 · 1, 0153, sección 6;
 * migración 0132): los ajustes del local, lo que dura de verdad cada mesa, lo ocupado y las horas que
 * quedan libres. Las cuentas son del dominio (`reservas.ts`); aquí se lee la base.
 */

export interface AjustesDeReservas {
  readonly encendidas: boolean;
  readonly servicios: readonly ServicioDeReservas[];
  /** Las del local (de fábrica, o las que puso a mano). */
  readonly duraciones: readonly number[];
  readonly topePorCuarto: number | null;
  readonly liberarTras: number;
}

const DE_FABRICA: AjustesDeReservas = {
  encendidas: false,
  servicios: [
    { nombre: 'Comida', desde: '13:00', hasta: '15:30' },
    { nombre: 'Cena', desde: '20:00', hasta: '22:30' },
  ],
  duraciones: DURACIONES_DE_FABRICA,
  topePorCuarto: null,
  liberarTras: 15,
};

export async function losAjustesDeReservas(
  contexto: Contexto,
  localId: string,
): Promise<AjustesDeReservas> {
  const filas = await contexto.sql<
    {
      encendidas: boolean;
      servicios: unknown;
      duraciones: string;
      tope_por_cuarto: number | null;
      liberar_tras: number;
    }[]
  >`
    select encendidas, servicios, array_to_string(duraciones, ',') as duraciones,
           tope_por_cuarto, liberar_tras
      from estook.ajuste_de_reservas where local_id = ${localId}::uuid
  `;
  const f = filas[0];
  if (f === undefined) return DE_FABRICA;
  const servicios = (
    typeof f.servicios === 'string' ? JSON.parse(f.servicios) : f.servicios
  ) as unknown;
  return {
    encendidas: f.encendidas,
    servicios: Array.isArray(servicios) ? servicios.filter(esUnServicio) : DE_FABRICA.servicios,
    duraciones: f.duraciones.split(',').map(Number),
    topePorCuarto: f.tope_por_cuarto,
    liberarTras: f.liberar_tras,
  };
}

/** Que estén encendidas; si no, no se reserva (se encienden en Ajustes del TPV › Reservas). */
export function queEstenEncendidas(ajustes: AjustesDeReservas): void {
  if (!ajustes.encendidas) {
    throw new FalloDeAplicacion('faltan_datos', {
      porque: 'Las reservas están apagadas. Se encienden en Ajustes del TPV › Reservas.',
    });
  }
}

/**
 * **Lo que dura de verdad cada mesa**: de las cuentas de mesa cobradas en las últimas ocho semanas, la
 * mediana de cada tamaño; donde no hay bastantes, lo del local.
 */
export async function lasDuraciones(
  contexto: Contexto,
  localId: string,
  delLocal: readonly number[],
): Promise<ReturnType<typeof lasDuracionesReales>> {
  const cuentas = await contexto.sql<{ comensales: number; minutos: number }[]>`
    select personas as comensales,
           (extract(epoch from (liberada_en - abierta_en)) / 60)::int as minutos
      from estook.cuenta
     where local_id = ${localId}::uuid and tipo = 'mesa' and personas is not null
       and liberada_en is not null and anulada_en is null and unida_a is null
       and abierta_en > ${new Date(contexto.ahora.getTime() - 56 * 86_400_000).toISOString()}::timestamptz
     limit 5000
  `;
  return lasDuracionesReales(cuentas, delLocal);
}

export async function laZonaHoraria(contexto: Contexto, localId: string): Promise<string> {
  const filas = await contexto.sql<{ zona_horaria: string }[]>`
    select zona_horaria from estook.local where id = ${localId}::uuid
  `;
  const zona = filas[0]?.zona_horaria;
  if (zona === undefined) throw new FalloDeAplicacion('local_ajeno');
  return zona;
}

/** El día de hoy en el reloj del local (el de la fecha, no el de la jornada). */
export function hoyEnElLocal(contexto: Contexto, zona: string): string {
  return fechaEnElLocal(contexto.ahora, zona);
}

/** El instante en que empieza una reserva: ese día, a esa hora, en el reloj del local. */
export function cuandoEmpieza(dia: string, hora: string, zona: string): Date {
  return instanteEnElLocal(fechaOperativa(dia), hora, zona);
}

export async function lasMesasDelLocal(
  contexto: Contexto,
  localId: string,
): Promise<{
  readonly mesas: readonly MesaParaReservar[];
  readonly juntables: readonly (readonly [string, string])[];
}> {
  const mesas = await contexto.sql<MesaParaReservar[]>`
    select id::text as id, nombre, plazas from estook.mesa
     where local_id = ${localId}::uuid and archivada_en is null
     order by nombre
  `;
  const juntables = await contexto.sql<{ a: string; b: string }[]>`
    select mesa_a::text as a, mesa_b::text as b from estook.mesas_que_se_juntan
     where local_id = ${localId}::uuid
  `;
  return { mesas, juntables: juntables.map((j) => [j.a, j.b] as const) };
}

/**
 * Lo ocupado entre dos instantes: **las reservas** (cada mesa en su tramo) y **las mesas abiertas
 * ahora**, que ocupan hasta lo que suele durar una mesa de los que son (y como poco, el cuarto de
 * hora que viene). Sin la reserva que se está cambiando, que no se pisa a sí misma.
 */
export async function loOcupado(
  contexto: Contexto,
  localId: string,
  desde: Date,
  hasta: Date,
  duraciones: readonly number[],
  menosLaReserva: string | null,
): Promise<TramoOcupado[]> {
  const reservas = await contexto.sql<{ mesa_id: string; desde: Date; hasta: Date }[]>`
    select mesa_id::text as mesa_id, lower(tramo) as desde, upper(tramo) as hasta
      from estook.reserva_de_mesa
     where local_id = ${localId}::uuid
       and tramo && tstzrange(${desde.toISOString()}::timestamptz, ${hasta.toISOString()}::timestamptz)
       and (${menosLaReserva}::uuid is null or reserva_id <> ${menosLaReserva}::uuid)
  `;
  const abiertas = await contexto.sql<
    { mesa_id: string; abierta_en: Date; personas: number | null }[]
  >`
    select mesa_id::text as mesa_id, abierta_en, personas from estook.cuenta
     where local_id = ${localId}::uuid and mesa_id is not null
       and liberada_en is null and anulada_en is null
  `;
  const ahora = contexto.ahora.getTime();
  return [
    ...reservas.map((r) => ({
      mesaId: r.mesa_id,
      desde: new Date(r.desde).getTime(),
      hasta: new Date(r.hasta).getTime(),
    })),
    ...abiertas.map((c) => {
      const abierta = new Date(c.abierta_en).getTime();
      const suele = abierta + cuantoDura(c.personas ?? 2, duraciones) * 60_000;
      return { mesaId: c.mesa_id, desde: abierta, hasta: Math.max(suele, ahora + 15 * 60_000) };
    }),
  ];
}

/** Los comensales que ya empiezan en cada cuarto de hora de un día, para el tope. */
export async function losQueEmpiezan(
  contexto: Contexto,
  localId: string,
  dia: string,
  menosLaReserva: string | null,
): Promise<ReadonlyMap<string, number>> {
  const filas = await contexto.sql<{ hora: string; comensales: number }[]>`
    select to_char(hora, 'HH24:MI') as hora, comensales from estook.reserva
     where local_id = ${localId}::uuid and dia = ${dia}::date and estado in ('reservada', 'sentada')
       and (${menosLaReserva}::uuid is null or id <> ${menosLaReserva}::uuid)
  `;
  const porCuarto = new Map<string, number>();
  for (const f of filas) {
    const cuarto = elCuartoDe(f.hora);
    porCuarto.set(cuarto, (porCuarto.get(cuarto) ?? 0) + f.comensales);
  }
  return porCuarto;
}

export interface UnaHora {
  readonly hora: string;
  /** La mesa (o las dos que se juntan) que pondría Estook; nula si no cabe. */
  readonly mesas: readonly { readonly id: string; readonly nombre: string }[] | null;
  /** Si a esa hora se pasa del tope de comensales del cuarto de hora. */
  readonly pasaDelTope: boolean;
}

export interface LasHorasDeUnDia {
  readonly dia: string;
  readonly duracion: number;
  readonly servicios: readonly {
    readonly nombre: string;
    readonly horas: readonly UnaHora[];
  }[];
}

/**
 * **Las horas que quedan** para tantos un día: cada hora de cada servicio, con la mesa que pondría
 * Estook. Hoy, solo de dentro de un cuarto de hora en adelante.
 */
export async function lasHorasLibres(
  contexto: Contexto,
  localId: string,
  dia: string,
  comensales: number,
  menosLaReserva: string | null,
): Promise<LasHorasDeUnDia> {
  const ajustes = await losAjustesDeReservas(contexto, localId);
  const zona = await laZonaHoraria(contexto, localId);
  const { duraciones } = await lasDuraciones(contexto, localId, ajustes.duraciones);
  const duracion = cuantoDura(comensales, duraciones);
  const { mesas, juntables } = await lasMesasDelLocal(contexto, localId);
  const empiezaElDia = cuandoEmpieza(dia, '00:00', zona);
  const ocupados = await loOcupado(
    contexto,
    localId,
    empiezaElDia,
    new Date(empiezaElDia.getTime() + 36 * 3_600_000),
    duraciones,
    menosLaReserva,
  );
  const empiezan = await losQueEmpiezan(contexto, localId, dia, menosLaReserva);
  const desdeYa = contexto.ahora.getTime() + 15 * 60_000;
  return {
    dia,
    duracion,
    servicios: ajustes.servicios.map((s) => ({
      nombre: s.nombre,
      horas: lasHorasDelServicio(s)
        .map((hora) => ({ hora, empieza: cuandoEmpieza(dia, hora, zona).getTime() }))
        .filter((h) => h.empieza >= desdeYa)
        .map(({ hora, empieza }) => {
          const mejor = laMejorMesa({
            mesas,
            juntables,
            ocupados,
            comensales,
            desde: empieza,
            hasta: empieza + duracion * 60_000,
          });
          return {
            hora,
            mesas: mejor === null ? null : mejor.map((m) => ({ id: m.id, nombre: m.nombre })),
            pasaDelTope: !cabeEnElCuarto(
              ajustes.topePorCuarto,
              empiezan.get(elCuartoDe(hora)) ?? 0,
              comensales,
            ),
          };
        }),
    })),
  };
}
