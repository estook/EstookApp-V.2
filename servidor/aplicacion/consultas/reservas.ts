import { z } from 'zod';
import type { ServicioDeReservas } from '@estook/dominio';
import { consulta, FalloDeAplicacion } from '../contrato.ts';
import { elLocalDelServicio } from '../sala.ts';
import { lasMarcasDeLosClientes, type LasMarcasDelCliente } from '../clientes-del-local.ts';
import {
  hoyEnElLocal,
  lasDuraciones,
  lasHorasLibres,
  lasMesasDelLocal,
  laZonaHoraria,
  losAjustesDeReservas,
  type LasHorasDeUnDia,
} from '../reservas.ts';

/**
 * Las reservas, leídas en Estook TPV (la Ampliación 5 · 1, 0153; migración 0132) **y en Estook, en Servicio ›
 * Reservas** (5 · 2, Richi, 26-nov: «así el gerente puede vigilar las reservas»): las dos primeras, con la
 * sesión de una persona o en un aparato; son de Estook TPV, y Estook TPV es de Pro.
 *
 *   las_reservas              las de un día (hoy, si no se dice), con sus mesas: la pantalla de
 *                             Reservas, el plano que marca lo reservado y los avisos
 *   horas_para_reservar       las horas que quedan para tantos un día, con la mesa que pondría Estook
 *   los_ajustes_de_reservas   Ajustes del TPV › Reservas: los ajustes, lo que dura de verdad cada mesa
 *                             y las mesas que se juntan
 */

const fecha = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export type EstadoDeLaReserva = 'reservada' | 'sentada' | 'cancelada' | 'no_vino';

export interface UnaReserva {
  readonly id: string;
  readonly dia: string;
  readonly hora: string;
  /** El instante en que empieza y en que acaba, para contar lo que falta o el retraso. */
  readonly empieza: string;
  readonly acaba: string;
  readonly comensales: number;
  readonly nombre: string;
  readonly telefono: string;
  readonly nota: string | null;
  readonly origen: 'tpv' | 'web';
  readonly estado: EstadoDeLaReserva;
  readonly mesas: readonly { readonly id: string; readonly nombre: string }[];
  readonly cuentaId: string | null;
  readonly creadaEn: string;
  /** Si la puso quien mira: «reserva nueva» avisa de las de otros. */
  readonly esMia: boolean;
  /** Si el cliente la confirmó en la web (5 · 2). */
  readonly confirmada: boolean;
  /** Quién la canceló y cuándo: el TPV avisa de la que se canceló sola o canceló el cliente. */
  readonly canceladaPor: 'local' | 'cliente' | 'sin_confirmar' | null;
  readonly canceladaEn: string | null;
  /**
   * Su cliente, por su teléfono (5 · 3): lo que importa en servicio (VIP, habitual, sus alergias, las
   * veces que no vino). Nulo en una reserva de un cliente borrado.
   */
  readonly cliente: LasMarcasDelCliente | null;
}

/** «En espera» (5 · 3): quien llega sin reservar y espera mesa. Solo las de hoy. */
export interface UnoEnEspera {
  readonly id: string;
  readonly nombre: string;
  readonly comensales: number;
  readonly telefono: string | null;
  readonly nota: string | null;
  readonly llegoEn: string;
}

export interface LasReservas {
  readonly hoy: string;
  readonly dia: string;
  readonly encendidas: boolean;
  /** A los cuántos minutos de retraso se da la mesa por libre. */
  readonly liberarTras: number;
  readonly servicios: readonly ServicioDeReservas[];
  readonly reservas: readonly UnaReserva[];
  /** La lista de espera de ahora (vacía si el día no es hoy). */
  readonly espera: readonly UnoEnEspera[];
}

export const lasReservas = consulta<{ dia?: string | undefined }, LasReservas>({
  nombre: 'las_reservas',
  entrada: z.object({ dia: fecha.optional() }).strict(),
  exige: 'accion.tomar_nota',
  enElTpv: 'tambien',
  deEstookTpv: true,

  async ejecutar(contexto, entrada) {
    const localId = elLocalDelServicio(contexto);
    const ajustes = await losAjustesDeReservas(contexto, localId);
    const zona = await laZonaHoraria(contexto, localId);
    const hoy = hoyEnElLocal(contexto, zona);
    const dia = entrada.dia ?? hoy;
    const filas = ajustes.encendidas
      ? await contexto.sql<
          {
            id: string;
            hora: string;
            empieza: Date;
            acaba: Date;
            comensales: number;
            nombre: string;
            telefono: string;
            nota: string | null;
            origen: 'tpv' | 'web';
            estado: EstadoDeLaReserva;
            cuenta_id: string | null;
            creada_en: Date;
            creada_por: string | null;
            mesas: string | null;
            confirmada_en: Date | null;
            cancelada_por: UnaReserva['canceladaPor'];
            cancelada_en: Date | null;
            cliente_id: string | null;
          }[]
        >`
          select r.id::text as id, to_char(r.hora, 'HH24:MI') as hora, r.empieza, r.acaba,
                 r.comensales, r.nombre, r.telefono, r.nota, r.origen, r.estado,
                 r.cuenta_id::text as cuenta_id, r.creada_en, r.creada_por::text as creada_por,
                 r.confirmada_en, r.cancelada_por, r.cancelada_en, r.cliente_id::text as cliente_id,
                 (select string_agg(m.id::text || ':' || m.nombre, '|' order by m.nombre)
                    from estook.reserva_de_mesa rm join estook.mesa m on m.id = rm.mesa_id
                   where rm.reserva_id = r.id) as mesas
            from estook.reserva r
           where r.local_id = ${localId}::uuid and r.dia = ${dia}::date
           order by r.hora, r.creada_en
           limit 500
        `
      : [];
    const marcas = await lasMarcasDeLosClientes(
      contexto,
      localId,
      filas.flatMap((f) => (f.cliente_id === null ? [] : [f.cliente_id])),
    );
    // Quien espera ahora: lo de las últimas doce horas, por si alguien se queda sin quitar.
    const espera =
      ajustes.encendidas && dia === hoy
        ? await contexto.sql<
            {
              id: string;
              nombre: string;
              comensales: number;
              telefono: string | null;
              nota: string | null;
              llego_en: Date;
            }[]
          >`
            select id::text as id, nombre, comensales, telefono, nota, llego_en
              from estook.espera
             where local_id = ${localId}::uuid and estado = 'esperando'
               and llego_en > ${new Date(contexto.ahora.getTime() - 12 * 3_600_000).toISOString()}::timestamptz
             order by llego_en
             limit 100
          `
        : [];
    return {
      hoy,
      dia,
      encendidas: ajustes.encendidas,
      liberarTras: ajustes.liberarTras,
      servicios: ajustes.servicios,
      reservas: filas.map((f) => ({
        id: f.id,
        dia,
        hora: f.hora,
        empieza: new Date(f.empieza).toISOString(),
        acaba: new Date(f.acaba).toISOString(),
        comensales: f.comensales,
        nombre: f.nombre,
        telefono: f.telefono,
        nota: f.nota,
        origen: f.origen,
        estado: f.estado,
        mesas:
          f.mesas === null
            ? []
            : f.mesas.split('|').map((m) => {
                const corte = m.indexOf(':');
                return { id: m.slice(0, corte), nombre: m.slice(corte + 1) };
              }),
        cuentaId: f.cuenta_id,
        creadaEn: new Date(f.creada_en).toISOString(),
        esMia: f.creada_por !== null && f.creada_por === contexto.personaId,
        confirmada: f.confirmada_en !== null,
        canceladaPor: f.cancelada_por,
        canceladaEn: f.cancelada_en === null ? null : new Date(f.cancelada_en).toISOString(),
        cliente: f.cliente_id === null ? null : (marcas.get(f.cliente_id) ?? null),
      })),
      espera: espera.map((e) => ({
        id: e.id,
        nombre: e.nombre,
        comensales: e.comensales,
        telefono: e.telefono,
        nota: e.nota,
        llegoEn: new Date(e.llego_en).toISOString(),
      })),
    };
  },
});

export const horasParaReservar = consulta<
  { dia: string; comensales: string; reserva_id?: string | undefined },
  LasHorasDeUnDia
>({
  nombre: 'horas_para_reservar',
  entrada: z
    .object({
      dia: fecha,
      comensales: z.string().regex(/^\d{1,2}$/),
      reserva_id: z.string().uuid().optional(),
    })
    .strict(),
  exige: 'accion.tomar_nota',
  enElTpv: 'solo',

  async ejecutar(contexto, entrada) {
    const localId = elLocalDelServicio(contexto);
    const comensales = Number(entrada.comensales);
    if (comensales < 1) {
      throw new FalloDeAplicacion('faltan_datos', { porque: 'Di para cuántos.' });
    }
    return lasHorasLibres(contexto, localId, entrada.dia, comensales, entrada.reserva_id ?? null);
  },
});

export interface LosAjustesDeReservas {
  readonly encendidas: boolean;
  readonly servicios: readonly ServicioDeReservas[];
  readonly duraciones: readonly number[];
  /** Lo que dura de verdad cada tamaño, de las cuentas cobradas, y si ya se ha aprendido. */
  readonly reales: readonly number[];
  readonly aprendidas: readonly boolean[];
  readonly topePorCuarto: number | null;
  readonly liberarTras: number;
  readonly juntables: readonly { readonly a: string; readonly b: string }[];
  /** La web de reservas (5 · 2): avisar por correo, pedir que confirmen y su enlace. */
  readonly avisarPorCorreo: boolean;
  readonly pedirQueConfirmen: boolean;
  readonly minutosParaConfirmar: number;
  /** Hasta cuántos minutos antes se reserva por la web. */
  readonly antelacionWeb: number;
  /** `estook.com/reservar/<esto>`: la dirección de la carta del local. Nula si no tiene. */
  readonly direccion: string | null;
}

export const losAjustesDeReservasConsulta = consulta<Record<string, never>, LosAjustesDeReservas>({
  nombre: 'los_ajustes_de_reservas',
  entrada: z.object({}).strict(),
  exige: 'accion.ajustes_del_tpv',
  enElTpv: 'tambien',
  deEstookTpv: true,

  async ejecutar(contexto) {
    const localId = elLocalDelServicio(contexto);
    const ajustes = await losAjustesDeReservas(contexto, localId);
    const reales = await lasDuraciones(contexto, localId, ajustes.duraciones);
    const { juntables } = await lasMesasDelLocal(contexto, localId);
    const [local] = await contexto.sql<{ direccion: string | null }[]>`
      select direccion_de_la_carta as direccion from estook.local where id = ${localId}::uuid
    `;
    return {
      encendidas: ajustes.encendidas,
      servicios: ajustes.servicios,
      duraciones: ajustes.duraciones,
      reales: reales.duraciones,
      aprendidas: reales.aprendidas,
      topePorCuarto: ajustes.topePorCuarto,
      liberarTras: ajustes.liberarTras,
      juntables: juntables.map(([a, b]) => ({ a, b })),
      avisarPorCorreo: ajustes.avisarPorCorreo,
      pedirQueConfirmen: ajustes.pedirQueConfirmen,
      minutosParaConfirmar: ajustes.minutosParaConfirmar,
      antelacionWeb: ajustes.antelacionWeb,
      direccion: local?.direccion ?? null,
    };
  },
});
