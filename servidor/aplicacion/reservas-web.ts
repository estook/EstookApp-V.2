import {
  HORA_DEL_RECORDATORIO,
  INTENTOS_DE_LA_WEB_DE_RESERVAS,
  fechaOperativa,
  hastaCuandoConfirmar,
  horaEnElLocal,
  instanteEnElLocal,
  llevaEstookTpv,
  masDias,
  type ClaseDeIntentoDeReserva,
} from '@estook/dominio';
import { tocarElServicio } from './al-segundo.ts';
import { FalloDeAplicacion, type Contexto } from './contrato.ts';
import {
  correoDeCanceladaSola,
  correoDeLaReserva,
  correoDelRecordatorio,
  correoDeSeHaLiberado,
} from './correos-de-reservas.ts';
import { losAjustesDeReservas, type AjustesDeReservas } from './reservas.ts';

/**
 * Lo que comparten la web de reservas, el TPV y el reloj (la Ampliación 5 · 2, decisión 0153, sección 6;
 * migración 0133): buscar el local de la web, frenar los intentos, cancelar una reserva avisando a quien
 * espera, y los correos al cliente si el local avisa por correo.
 */

/**
 * **Como el sistema hasta que acabe la transacción**: la web no tiene sesión y, sin ella, las filas no se
 * ven (0133, F). Igual que «Pide tu factura» (0141).
 */
export async function comoElSistema(contexto: Contexto): Promise<void> {
  await contexto.sql`select set_config('estook.sistema', 'si', true)`;
}

export interface ElLocalDeLaWeb {
  readonly id: string;
  readonly organizacionId: string;
  readonly direccion: string;
  readonly nombre: string;
  readonly poblacion: string | null;
  readonly telefono: string | null;
  readonly color: string | null;
  readonly zona: string;
  readonly ajustes: AjustesDeReservas;
}

/**
 * **El local de `estook.com/reservar/<dirección>`**: activo, de Pro (las reservas lo son, como el TPV) y con
 * las reservas encendidas. Si no, la web dice que ese local no reserva por internet, sin contar por qué.
 */
export async function elLocalDeLaWeb(
  contexto: Contexto,
  direccion: string,
): Promise<ElLocalDeLaWeb> {
  const [l] = await contexto.sql<
    {
      id: string;
      organizacion_id: string;
      nombre: string;
      poblacion: string | null;
      telefono: string | null;
      color: string | null;
      zona_horaria: string;
    }[]
  >`
    select id::text as id, organizacion_id::text as organizacion_id, nombre, poblacion,
           coalesce(google_telefono, telefono) as telefono, color_de_marca as color, zona_horaria
      from estook.local
     where direccion_de_la_carta = ${direccion.toLowerCase()} and activo
  `;
  const noReserva = new FalloDeAplicacion('no_existe', {
    porque: 'Este local no tiene reservas por internet. Llámales por teléfono.',
  });
  if (l === undefined) throw noReserva;
  const [plan] = await contexto.sql<{ plan: string; de_la_casa: boolean; es_ejemplo: boolean }[]>`
    select plan, de_la_casa, es_ejemplo from estook.el_plan_de(${l.organizacion_id}::uuid)
  `;
  const esDePro =
    plan !== undefined &&
    llevaEstookTpv({
      plan: plan.plan as 'pro',
      deLaCasa: plan.de_la_casa,
      esEjemplo: plan.es_ejemplo,
    });
  const ajustes = await losAjustesDeReservas(contexto, l.id);
  if (!esDePro || !ajustes.encendidas) throw noReserva;
  return {
    id: l.id,
    organizacionId: l.organizacion_id,
    direccion: direccion.toLowerCase(),
    nombre: l.nombre,
    poblacion: l.poblacion,
    telefono: l.telefono,
    color: l.color,
    zona: l.zona_horaria,
    ajustes,
  };
}

/**
 * **Gasta un intento de esa dirección, o dice que no quedan**: reservar, buscar su reserva y «Avísame si se
 * libera», cada cosa con su tope por hora. El intento queda aunque lo que venga después falle: un código
 * que no casa también cuenta, y así no se pueden ir probando los diez mil.
 */
export async function gastarUnIntento(
  contexto: Contexto,
  clase: ClaseDeIntentoDeReserva,
): Promise<void> {
  const direccion = contexto.desde ?? 'sin-direccion';
  const haceUnaHora = new Date(contexto.ahora.getTime() - 3_600_000).toISOString();
  const [fila] = await contexto.sql<{ van: number }[]>`
    select count(*)::int as van from estook.intento_en_la_web_de_reservas
     where direccion = ${direccion} and clase = ${clase} and en > ${haceUnaHora}::timestamptz
  `;
  if ((fila?.van ?? 0) >= INTENTOS_DE_LA_WEB_DE_RESERVAS[clase]) {
    throw new FalloDeAplicacion('demasiados_intentos');
  }
  await contexto.sql`
    insert into estook.intento_en_la_web_de_reservas (direccion, clase, en)
    values (${direccion}, ${clase}, ${contexto.ahora.toISOString()}::timestamptz)
  `;
}

/** «Sábado 28 de noviembre». */
export function elDiaEnLetra(dia: string): string {
  const texto = new Date(`${dia}T12:00:00Z`).toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  });
  return `${texto.charAt(0).toUpperCase()}${texto.slice(1)}`;
}

const LA_WEB = 'https://estook.com/reservar';

export function enlaceDeReservar(direccion: string): string {
  return `${LA_WEB}/${encodeURIComponent(direccion)}`;
}

/**
 * La web, ya abierta en una reserva: su id y su código, **detrás de la almohadilla** (no viaja al servidor
 * ni se queda en ningún registro) y sin el teléfono ni el nombre de nadie.
 */
export function enlaceDeMiReserva(direccion: string, id: string, codigo: string): string {
  return `${enlaceDeReservar(direccion)}#/mi-reserva?r=${id}&c=${codigo}`;
}

interface FilaDeLaReserva {
  id: string;
  local_id: string;
  dia: string;
  hora: string;
  empieza: Date;
  comensales: number;
  nombre: string;
  correo: string | null;
  codigo: string;
  estado: string;
  confirmada_en: Date | null;
}

export async function laReservaPorId(
  contexto: Contexto,
  id: string,
): Promise<FilaDeLaReserva | null> {
  const [r] = await contexto.sql<FilaDeLaReserva[]>`
    select id::text as id, local_id::text as local_id, to_char(dia, 'YYYY-MM-DD') as dia,
           to_char(hora, 'HH24:MI') as hora, empieza, comensales, nombre, correo, codigo, estado,
           confirmada_en
      from estook.reserva where id = ${id}::uuid
  `;
  return r ?? null;
}

/**
 * **Avisa a quien pidió «Avísame si se libera»** ese día, una vez y solo si el local avisa por correo: se
 * ha liberado una mesa. No se le guarda: el primero que reserva, se la queda.
 */
export async function avisarALosQueEsperan(
  contexto: Contexto,
  localId: string,
  dia: string,
): Promise<number> {
  const ajustes = await losAjustesDeReservas(contexto, localId);
  if (!ajustes.avisarPorCorreo || contexto.correo === null) return 0;
  const [local] = await contexto.sql<{ nombre: string; direccion: string | null }[]>`
    select nombre, direccion_de_la_carta as direccion from estook.local where id = ${localId}::uuid
  `;
  if (local === undefined || local.direccion === null) return 0;
  const esperan = await contexto.sql<{ id: string; nombre: string; correo: string }[]>`
    update estook.aviso_si_se_libera
       set avisado_en = ${contexto.ahora.toISOString()}::timestamptz
     where local_id = ${localId}::uuid and dia = ${dia}::date and avisado_en is null
     returning id::text as id, nombre, correo
  `;
  for (const e of esperan) {
    await contexto.correo
      .mandar(
        correoDeSeHaLiberado({
          para: e.correo,
          local: local.nombre,
          nombre: e.nombre,
          dia: elDiaEnLetra(dia),
          reservar: enlaceDeReservar(local.direccion),
        }),
      )
      .catch(() => undefined);
  }
  return esperan.length;
}

/**
 * **Cancelar una reserva**, la haga quien la haga: el local desde el TPV, el cliente desde la web o el reloj
 * porque no se confirmó. Suelta sus mesas, avisa a los aparatos al segundo y a quien espera ese día.
 */
export async function cancelarLaReserva(
  contexto: Contexto,
  reservaId: string,
  como: {
    readonly estado: 'cancelada' | 'no_vino';
    readonly por: 'local' | 'cliente' | 'sin_confirmar';
  },
): Promise<boolean> {
  const cambiadas = await contexto.sql<{ local_id: string; dia: string }[]>`
    update estook.reserva
       set estado = ${como.estado}, cancelada_en = ${contexto.ahora.toISOString()}::timestamptz,
           cancelada_por = ${como.por}
     where id = ${reservaId}::uuid and estado = 'reservada'
     returning local_id::text as local_id, to_char(dia, 'YYYY-MM-DD') as dia
  `;
  const r = cambiadas[0];
  if (r === undefined) return false;
  await contexto.sql`delete from estook.reserva_de_mesa where reserva_id = ${reservaId}::uuid`;
  await tocarElServicio(contexto, r.local_id);
  await avisarALosQueEsperan(contexto, r.local_id, r.dia);
  return true;
}

/**
 * Lo que el reloj tiene que hacer con una reserva hecha en la web, y los correos de ese momento: **si el
 * local pide que confirmen**, cancelarla a su hora si no se ha confirmado (y si ya pasó esa hora al
 * reservar, se da por confirmada: reservar tan tarde es venir); **si avisa por correo**, el correo con la
 * reserva ya y el recordatorio a las 12:00 del día antes. Ya dentro del sistema.
 */
export async function loQueSigueAReservar(
  contexto: Contexto,
  local: ElLocalDeLaWeb,
  reservaId: string,
): Promise<{ readonly confirmarAntesDe: string | null; readonly correo: boolean }> {
  const r = await laReservaPorId(contexto, reservaId);
  if (r === null) return { confirmarAntesDe: null, correo: false };
  const empieza = new Date(r.empieza);
  let confirmarAntesDe: string | null = null;

  if (local.ajustes.pedirQueConfirmen) {
    const hasta = hastaCuandoConfirmar(empieza, local.ajustes.minutosParaConfirmar);
    if (hasta.getTime() <= contexto.ahora.getTime()) {
      await contexto.sql`
        update estook.reserva set confirmada_en = ${contexto.ahora.toISOString()}::timestamptz
         where id = ${reservaId}::uuid
      `;
    } else {
      confirmarAntesDe = horaEnElLocal(hasta, local.zona);
      await contexto.sql`
        insert into estook.al_movil_programado (local_id, persona_id, tipo, clave, cuando)
        values (${local.id}::uuid, null, 'reserva.sin_confirmar', ${reservaId}, ${hasta.toISOString()}::timestamptz)
        on conflict (tipo, clave) do nothing
      `;
    }
  }

  let correo = false;
  if (local.ajustes.avisarPorCorreo && r.correo !== null && contexto.correo !== null) {
    await contexto.correo
      .mandar(
        correoDeLaReserva({
          para: r.correo,
          local: local.nombre,
          dia: elDiaEnLetra(r.dia),
          hora: r.hora,
          comensales: r.comensales,
          nombre: r.nombre,
          codigo: r.codigo,
          confirmarAntesDe,
          enlace: enlaceDeMiReserva(local.direccion, r.id, r.codigo),
        }),
      )
      .then(() => {
        correo = true;
      })
      .catch(() => undefined);
    const recordar = instanteEnElLocal(
      masDias(fechaOperativa(r.dia), -1),
      HORA_DEL_RECORDATORIO,
      local.zona,
    );
    if (recordar.getTime() > contexto.ahora.getTime()) {
      await contexto.sql`
        insert into estook.al_movil_programado (local_id, persona_id, tipo, clave, cuando)
        values (${local.id}::uuid, null, 'reserva.recordatorio', ${reservaId}, ${recordar.toISOString()}::timestamptz)
        on conflict (tipo, clave) do nothing
      `;
    }
  }
  return { confirmarAntesDe, correo };
}

/** El reloj: la que no se confirmó a tiempo se cancela sola, y se le dice al cliente si avisa por correo. */
export async function cancelarSiNoConfirmo(contexto: Contexto, reservaId: string): Promise<number> {
  const r = await laReservaPorId(contexto, reservaId);
  if (r === null || r.estado !== 'reservada' || r.confirmada_en !== null) return 0;
  const cancelada = await cancelarLaReserva(contexto, reservaId, {
    estado: 'cancelada',
    por: 'sin_confirmar',
  });
  if (!cancelada) return 0;
  const ajustes = await losAjustesDeReservas(contexto, r.local_id);
  const [local] = await contexto.sql<{ nombre: string; direccion: string | null }[]>`
    select nombre, direccion_de_la_carta as direccion from estook.local where id = ${r.local_id}::uuid
  `;
  if (
    ajustes.avisarPorCorreo &&
    r.correo !== null &&
    contexto.correo !== null &&
    local?.direccion != null
  ) {
    await contexto.correo
      .mandar(
        correoDeCanceladaSola({
          para: r.correo,
          local: local.nombre,
          dia: elDiaEnLetra(r.dia),
          hora: r.hora,
          comensales: r.comensales,
          nombre: r.nombre,
          codigo: r.codigo,
          enlace: enlaceDeMiReserva(local.direccion, r.id, r.codigo),
          reservar: enlaceDeReservar(local.direccion),
        }),
      )
      .catch(() => undefined);
  }
  return 1;
}

/** El reloj: el recordatorio del día antes, si sigue en pie y el local sigue avisando por correo. */
export async function recordarLaReserva(contexto: Contexto, reservaId: string): Promise<number> {
  const r = await laReservaPorId(contexto, reservaId);
  if (r === null || r.estado !== 'reservada' || r.correo === null || contexto.correo === null)
    return 0;
  const ajustes = await losAjustesDeReservas(contexto, r.local_id);
  if (!ajustes.avisarPorCorreo) return 0;
  const [local] = await contexto.sql<
    { nombre: string; direccion: string | null; zona_horaria: string }[]
  >`
    select nombre, direccion_de_la_carta as direccion, zona_horaria from estook.local
     where id = ${r.local_id}::uuid
  `;
  if (local === undefined || local.direccion === null) return 0;
  const confirmarAntesDe =
    ajustes.pedirQueConfirmen && r.confirmada_en === null
      ? horaEnElLocal(
          hastaCuandoConfirmar(new Date(r.empieza), ajustes.minutosParaConfirmar),
          local.zona_horaria,
        )
      : null;
  await contexto.correo.mandar(
    correoDelRecordatorio({
      para: r.correo,
      local: local.nombre,
      dia: elDiaEnLetra(r.dia),
      hora: r.hora,
      comensales: r.comensales,
      nombre: r.nombre,
      codigo: r.codigo,
      confirmarAntesDe,
      enlace: enlaceDeMiReserva(local.direccion, r.id, r.codigo),
      esHoy: false,
    }),
  );
  return 1;
}
