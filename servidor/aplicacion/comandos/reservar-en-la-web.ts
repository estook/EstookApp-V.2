import { z } from 'zod';
import {
  COMENSALES_DE_LA_WEB,
  DIAS_QUE_OFRECE_LA_WEB,
  cabeEnElCuarto,
  cuantoDura,
  elCodigoDeLaReserva,
  elCuartoDe,
  fechaEnElLocal,
  hastaCuandoConfirmar,
  horaEnElLocal,
  laMejorMesa,
  lasHorasDelServicio,
  telefonoLimpio,
} from '@estook/dominio';
import { tocarElServicio } from '../al-segundo.ts';
import { comando, consulta, FalloDeAplicacion, type Contexto } from '../contrato.ts';
import {
  cuandoEmpieza,
  lasDuraciones,
  lasHorasLibres,
  lasMesasDelLocal,
  liberarLasDeQuienNoLlega,
  loOcupado,
  losQueEmpiezan,
} from '../reservas.ts';
import {
  cancelarLaReserva,
  comoElSistema,
  elDiaEnLetra,
  elLocalDeLaWeb,
  gastarUnIntento,
  loQueSigueAReservar,
  type ElLocalDeLaWeb,
} from '../reservas-web.ts';

/**
 * **La web de reservas de cada local** (la Ampliación 5 · 2, decisión 0153, sección 6; migración 0133):
 * `estook.com/reservar/<dirección>`, sin sesión.
 *
 *   la_web_de_reservas       el local, sus servicios y lo que pide (correo, confirmar)
 *   horas_en_la_web          las horas con mesa de verdad para tantos un día: solo las mesas que salen por
 *                            internet, y sin pasar del tope de comensales del cuarto de hora
 *   reservar_en_la_web       la reserva, con su código de 4 cifras
 *   mi_reserva_en_la_web     «Ya tengo reserva»: con el teléfono y el código (o desde el correo)
 *   confirmar_mi_reserva     «Confirmo que vamos»
 *   cancelar_mi_reserva      «Cancelar la reserva»: la mesa queda libre y se avisa a quien espera
 *   avisame_si_se_libera     un día lleno: se le escribe si se libera una mesa (si el local avisa por correo)
 *
 * **Lo que se cuenta es solo lo justo**: las horas libres, nunca quién ha reservado; y una reserva solo a quien
 * da su teléfono y su código. Lo que escribe o busca cada dirección tiene tope por hora (0133, E). Reservar,
 * buscar y cambiar son comandos: el teléfono y el código viajan en el cuerpo, no en una dirección.
 *
 * **Ninguno guarda su respuesta para repetirla** (`sinRecordar`), como «Pide tu factura»: sin sesión no hay de
 * quién recordar nada, y guardarla guardaría el código en una tabla. Repetir cada uno ya es lo mismo: la
 * reserva por su id, que nace en el navegador; confirmar y cancelar, por el estado; y «Avísame», que no
 * apunta dos veces al mismo correo el mismo día.
 */

const direccion = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9-]+$/i);
const fecha = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const cuarto = z.string().regex(/^([01]\d|2[0-3]):(00|15|30|45)$/);
const codigo = z.string().regex(/^\d{4}$/);
const telefono = z.string().trim().min(6).max(20);
const correo = z.string().trim().max(120).email();

function masDias(dia: string, dias: number): string {
  return new Date(Date.parse(`${dia}T12:00:00Z`) + dias * 86_400_000).toISOString().slice(0, 10);
}

/** Que el día esté entre hoy y los dos meses que ofrece la web. */
function queElDiaSePueda(dia: string, hoy: string): void {
  if (
    Number.isNaN(Date.parse(`${dia}T12:00:00Z`)) ||
    dia < hoy ||
    dia > masDias(hoy, DIAS_QUE_OFRECE_LA_WEB)
  ) {
    throw new FalloDeAplicacion('faltan_datos', {
      campos: ['dia'],
      porque: `Por aquí se reserva de hoy a ${String(DIAS_QUE_OFRECE_LA_WEB)} días vista.`,
    });
  }
}

// ═══ El local y sus horas ═════════════════════════════════════════════════════

export interface LaWebDeReservas {
  readonly nombre: string;
  readonly poblacion: string | null;
  readonly telefono: string | null;
  readonly color: string | null;
  readonly hoy: string;
  readonly ultimoDia: string;
  readonly comensalesMax: number;
  /** Si pide el correo (el local avisa por correo) y si funciona «Avísame si se libera». */
  readonly avisaPorCorreo: boolean;
  /** Si hay que confirmarla, y cuántos minutos antes de la hora. */
  readonly pideQueConfirmen: boolean;
  readonly minutosParaConfirmar: number;
}

export const laWebDeReservas = consulta<{ direccion: string }, LaWebDeReservas>({
  nombre: 'la_web_de_reservas',
  entrada: z.object({ direccion }).strict(),
  sinSesion: true,

  async ejecutar(contexto, entrada) {
    await comoElSistema(contexto);
    const local = await elLocalDeLaWeb(contexto, entrada.direccion);
    const hoy = fechaEnElLocal(contexto.ahora, local.zona);
    return {
      nombre: local.nombre,
      poblacion: local.poblacion,
      telefono: local.telefono,
      color: local.color,
      hoy,
      ultimoDia: masDias(hoy, DIAS_QUE_OFRECE_LA_WEB),
      comensalesMax: COMENSALES_DE_LA_WEB,
      avisaPorCorreo: local.ajustes.avisarPorCorreo,
      pideQueConfirmen: local.ajustes.pedirQueConfirmen,
      minutosParaConfirmar: local.ajustes.minutosParaConfirmar,
    };
  },
});

export interface LasHorasDeLaWeb {
  readonly dia: string;
  readonly servicios: readonly { readonly nombre: string; readonly horas: readonly string[] }[];
  /** Si ese día no queda ninguna hora para tantos: sale «Avísame si se libera». */
  readonly lleno: boolean;
  /**
   * Si tantos no caben **nunca** en las mesas que el local ofrece por internet (ni juntando las que se
   * juntan): no se ofrece «Avísame», que nunca llegaría; se dice que llamen.
   */
  readonly noCaben: boolean;
}

export const horasEnLaWeb = consulta<
  { direccion: string; dia: string; comensales: string },
  LasHorasDeLaWeb
>({
  nombre: 'horas_en_la_web',
  entrada: z.object({ direccion, dia: fecha, comensales: z.string().regex(/^\d{1,2}$/) }).strict(),
  sinSesion: true,

  async ejecutar(contexto, entrada) {
    await comoElSistema(contexto);
    const local = await elLocalDeLaWeb(contexto, entrada.direccion);
    const comensales = Number(entrada.comensales);
    if (comensales < 1 || comensales > COMENSALES_DE_LA_WEB) {
      throw new FalloDeAplicacion('faltan_datos', {
        campos: ['comensales'],
        porque: `Por aquí se reserva para ${String(COMENSALES_DE_LA_WEB)} como mucho: para más, llámales.`,
      });
    }
    queElDiaSePueda(entrada.dia, fechaEnElLocal(contexto.ahora, local.zona));
    const { mesas, juntables } = await lasMesasDelLocal(contexto, local.id, true);
    const noCaben =
      laMejorMesa({ mesas, juntables, ocupados: [], comensales, desde: 0, hasta: 1 }) === null;
    if (noCaben) return { dia: entrada.dia, servicios: [], lleno: true, noCaben };
    const libres = await lasHorasLibres(contexto, local.id, entrada.dia, comensales, null, true);
    // La web no pasa del tope: es el camarero quien decide si mete a alguien más.
    const servicios = libres.servicios.map((s) => ({
      nombre: s.nombre,
      horas: s.horas.filter((h) => h.mesas !== null && !h.pasaDelTope).map((h) => h.hora),
    }));
    return {
      dia: entrada.dia,
      servicios,
      lleno: servicios.every((s) => s.horas.length === 0),
      noCaben: false,
    };
  },
});

// ═══ Reservar ═════════════════════════════════════════════════════════════════

export const entradaReservarEnLaWeb = z
  .object({
    direccion,
    /** Nace en el navegador: tocar dos veces o perder la red no duplica la reserva. */
    id: z.string().uuid(),
    dia: fecha,
    hora: cuarto,
    comensales: z.number().int().min(1).max(COMENSALES_DE_LA_WEB),
    nombre: z.string().trim().min(1).max(60),
    telefono,
    correo: correo.optional(),
    nota: z.string().trim().min(1).max(200).optional(),
    /** La casilla de recibir ofertas: aparte y sin marcar. */
    ofertas: z.boolean().optional(),
  })
  .strict();
export type EntradaReservarEnLaWeb = z.infer<typeof entradaReservarEnLaWeb>;

export interface LaReservaDeLaWeb {
  readonly id: string;
  readonly codigo: string;
  readonly dia: string;
  readonly diaEnLetra: string;
  readonly hora: string;
  readonly comensales: number;
  readonly nombre: string;
  readonly estado: 'reservada' | 'sentada' | 'cancelada' | 'no_vino';
  readonly confirmada: boolean;
  /** «20:45», si tiene que confirmarla y aún no lo ha hecho. */
  readonly confirmarAntesDe: string | null;
  readonly local: string;
}

export const reservarEnLaWeb = comando<
  EntradaReservarEnLaWeb,
  LaReservaDeLaWeb & { readonly correoMandado: boolean }
>({
  nombre: 'reservar_en_la_web',
  entrada: entradaReservarEnLaWeb,
  sinSesion: true,
  sinRecordar: true,

  async ejecutar(contexto, entrada) {
    await comoElSistema(contexto);
    const local = await elLocalDeLaWeb(contexto, entrada.direccion);

    // Repetir no duplica: si ya está, se devuelve la misma (sin gastar un intento).
    const yaEsta = await laReservaDeLaWeb(contexto, local, entrada.id);
    if (yaEsta !== null) return { ...yaEsta, correoMandado: false };

    await gastarUnIntento(contexto, 'reservar');
    if (local.ajustes.avisarPorCorreo && entrada.correo === undefined) {
      throw new FalloDeAplicacion('faltan_datos', {
        campos: ['correo'],
        porque: 'Pon tu correo: te mandamos ahí la reserva y el recordatorio.',
      });
    }
    const tel = telefonoLimpio(entrada.telefono);
    if (tel.replace(/\D/g, '').length < 6) {
      throw new FalloDeAplicacion('faltan_datos', {
        campos: ['telefono'],
        porque: 'Ese teléfono no tiene bastantes números.',
      });
    }
    const hoy = fechaEnElLocal(contexto.ahora, local.zona);
    queElDiaSePueda(entrada.dia, hoy);
    if (!local.ajustes.servicios.some((s) => lasHorasDelServicio(s).includes(entrada.hora))) {
      throw new FalloDeAplicacion('faltan_datos', {
        campos: ['hora'],
        porque: 'A esa hora no se reserva.',
      });
    }
    const empieza = cuandoEmpieza(entrada.dia, entrada.hora, local.zona);
    if (empieza.getTime() < contexto.ahora.getTime() + 15 * 60_000) {
      throw new FalloDeAplicacion('faltan_datos', {
        campos: ['hora'],
        porque: 'Esa hora ya está muy cerca. Elige otra o llámales.',
      });
    }

    const { duraciones } = await lasDuraciones(contexto, local.id, local.ajustes.duraciones);
    const acaba = new Date(empieza.getTime() + cuantoDura(entrada.comensales, duraciones) * 60_000);
    const empiezan = await losQueEmpiezan(contexto, local.id, entrada.dia, null);
    const sinSitio = new FalloDeAplicacion('faltan_datos', {
      campos: ['hora'],
      porque: `A las ${entrada.hora} ya no queda mesa para ${String(entrada.comensales)}. Elige otra hora.`,
    });
    if (
      !cabeEnElCuarto(
        local.ajustes.topePorCuarto,
        empiezan.get(elCuartoDe(entrada.hora)) ?? 0,
        entrada.comensales,
      )
    ) {
      throw sinSitio;
    }
    const { mesas, juntables } = await lasMesasDelLocal(contexto, local.id, true);
    const ocupados = await loOcupado(
      contexto,
      local.id,
      empieza,
      acaba,
      duraciones,
      null,
      local.ajustes.liberarTras,
    );
    const mejor = laMejorMesa({
      mesas,
      juntables,
      ocupados,
      comensales: entrada.comensales,
      desde: empieza.getTime(),
      hasta: acaba.getTime(),
    });
    if (mejor === null) throw sinSitio;

    await liberarLasDeQuienNoLlega(contexto, local.id, local.ajustes.liberarTras);
    const elCodigo = elCodigoDeLaReserva(
      (crypto.getRandomValues(new Uint32Array(1))[0] ?? 0) / 4_294_967_296,
    );
    await contexto.sql`
      insert into estook.reserva
        (id, organizacion_id, local_id, dia, hora, empieza, acaba, comensales, nombre, telefono,
         correo, nota, origen, codigo, ofertas)
      values (${entrada.id}::uuid, ${local.organizacionId}::uuid, ${local.id}::uuid,
              ${entrada.dia}::date, ${entrada.hora}::time, ${empieza.toISOString()}::timestamptz,
              ${acaba.toISOString()}::timestamptz, ${entrada.comensales}, ${entrada.nombre}, ${tel},
              ${entrada.correo ?? null}, ${entrada.nota ?? null}, 'web', ${elCodigo},
              ${entrada.ofertas === true})
    `;
    try {
      for (const m of mejor) {
        await contexto.sql`
          insert into estook.reserva_de_mesa (reserva_id, mesa_id, local_id, tramo)
          values (${entrada.id}::uuid, ${m.id}::uuid, ${local.id}::uuid,
                  tstzrange(${empieza.toISOString()}::timestamptz, ${acaba.toISOString()}::timestamptz))
        `;
      }
    } catch (error) {
      // Otro acaba de quedarse esa mesa (la base no deja dos): se pide otra hora.
      if ((error as { code?: string }).code === '23P01') throw sinSitio;
      throw error;
    }
    await tocarElServicio(contexto, local.id);
    const sigue = await loQueSigueAReservar(contexto, local, entrada.id);
    const hecha = await laReservaDeLaWeb(contexto, local, entrada.id);
    if (hecha === null) throw new FalloDeAplicacion('fallo_nuestro');
    return { ...hecha, confirmarAntesDe: sigue.confirmarAntesDe, correoMandado: sigue.correo };
  },
});

// ═══ «Ya tengo reserva» ═══════════════════════════════════════════════════════

/** La reserva tal como la ve su dueño en la web: sin el teléfono ni el correo. */
async function laReservaDeLaWeb(
  contexto: Contexto,
  local: ElLocalDeLaWeb,
  id: string,
): Promise<LaReservaDeLaWeb | null> {
  const [r] = await contexto.sql<
    {
      id: string;
      codigo: string;
      dia: string;
      hora: string;
      empieza: Date;
      comensales: number;
      nombre: string;
      estado: LaReservaDeLaWeb['estado'];
      confirmada_en: Date | null;
    }[]
  >`
    select id::text as id, codigo, to_char(dia, 'YYYY-MM-DD') as dia, to_char(hora, 'HH24:MI') as hora,
           empieza, comensales, nombre, estado, confirmada_en
      from estook.reserva where id = ${id}::uuid and local_id = ${local.id}::uuid
  `;
  if (r === undefined) return null;
  const confirmada = r.confirmada_en !== null;
  return {
    id: r.id,
    codigo: r.codigo,
    dia: r.dia,
    diaEnLetra: elDiaEnLetra(r.dia),
    hora: r.hora,
    comensales: r.comensales,
    nombre: r.nombre,
    estado: r.estado,
    confirmada,
    confirmarAntesDe:
      local.ajustes.pedirQueConfirmen && !confirmada && r.estado === 'reservada'
        ? horaEnElLocal(
            hastaCuandoConfirmar(new Date(r.empieza), local.ajustes.minutosParaConfirmar),
            local.zona,
          )
        : null,
    local: local.nombre,
  };
}

const entradaDeMiReserva = z
  .object({
    direccion,
    codigo,
    /** Con su teléfono, desde «Ya tengo reserva»… */
    telefono: telefono.optional(),
    /** …o con el id, desde el enlace del correo. */
    reserva_id: z.string().uuid().optional(),
  })
  .strict()
  .refine((e) => e.telefono !== undefined || e.reserva_id !== undefined, {
    message: 'Hace falta el teléfono o el enlace del correo.',
  });
type EntradaDeMiReserva = z.infer<typeof entradaDeMiReserva>;

/**
 * **Su reserva, con su teléfono y su código**: la que viene antes de las que aún pueden servir. Gasta un
 * intento siempre, y si no casa el intento queda: no se dice si es el teléfono o el código lo que está mal.
 * **El teléfono se compara por sus nueve últimas cifras**: «+34 600 111 222» y «600111222» son el mismo.
 */
async function suReserva(
  contexto: Contexto,
  entrada: EntradaDeMiReserva,
): Promise<{ local: ElLocalDeLaWeb; reserva: LaReservaDeLaWeb }> {
  await comoElSistema(contexto);
  const local = await elLocalDeLaWeb(contexto, entrada.direccion);
  await gastarUnIntento(contexto, 'buscar');
  const hoy = fechaEnElLocal(contexto.ahora, local.zona);
  const cifras =
    entrada.telefono === undefined ? null : entrada.telefono.replace(/\D/g, '').slice(-9);
  const [fila] = await contexto.sql<{ id: string }[]>`
    select id::text as id from estook.reserva
     where local_id = ${local.id}::uuid and codigo = ${entrada.codigo}
       and (${entrada.reserva_id ?? null}::uuid is null or id = ${entrada.reserva_id ?? null}::uuid)
       and (${cifras}::text is null
            or right(regexp_replace(telefono, '\D', '', 'g'), 9) = ${cifras})
       and dia >= ${masDias(hoy, -1)}::date
     order by (estado = 'reservada') desc, empieza
     limit 1
  `;
  const reserva = fila === undefined ? null : await laReservaDeLaWeb(contexto, local, fila.id);
  if (reserva === null) {
    throw new FalloDeAplicacion(
      'no_existe',
      {
        porque:
          'Con ese teléfono y ese código no hay ninguna reserva. Míralo en el correo o llámales.',
      },
      { conservarLoHecho: true },
    );
  }
  return { local, reserva };
}

export const miReservaEnLaWeb = comando<EntradaDeMiReserva, LaReservaDeLaWeb>({
  nombre: 'mi_reserva_en_la_web',
  entrada: entradaDeMiReserva,
  sinSesion: true,
  sinRecordar: true,

  async ejecutar(contexto, entrada) {
    return (await suReserva(contexto, entrada)).reserva;
  },
});

export const confirmarMiReserva = comando<EntradaDeMiReserva, LaReservaDeLaWeb>({
  nombre: 'confirmar_mi_reserva',
  entrada: entradaDeMiReserva,
  sinSesion: true,
  sinRecordar: true,

  async ejecutar(contexto, entrada) {
    const { local, reserva } = await suReserva(contexto, entrada);
    if (reserva.estado !== 'reservada') {
      throw new FalloDeAplicacion('ya_hecho', {
        porque:
          reserva.estado === 'cancelada'
            ? 'Esa reserva está cancelada. Si queréis venir, haz otra.'
            : 'Esa reserva ya no se puede cambiar.',
      });
    }
    if (!reserva.confirmada) {
      await contexto.sql`
        update estook.reserva set confirmada_en = ${contexto.ahora.toISOString()}::timestamptz
         where id = ${reserva.id}::uuid
      `;
      await tocarElServicio(contexto, local.id);
    }
    return { ...reserva, confirmada: true, confirmarAntesDe: null };
  },
});

export const cancelarMiReserva = comando<EntradaDeMiReserva, LaReservaDeLaWeb>({
  nombre: 'cancelar_mi_reserva',
  entrada: entradaDeMiReserva,
  sinSesion: true,
  sinRecordar: true,

  async ejecutar(contexto, entrada) {
    const { reserva } = await suReserva(contexto, entrada);
    if (reserva.estado === 'cancelada') return reserva;
    if (reserva.estado !== 'reservada') {
      throw new FalloDeAplicacion('ya_hecho', { porque: 'Esa reserva ya no se puede cancelar.' });
    }
    await cancelarLaReserva(contexto, reserva.id, { estado: 'cancelada', por: 'cliente' });
    return { ...reserva, estado: 'cancelada', confirmarAntesDe: null };
  },
});

// ═══ «Avísame si se libera» ═══════════════════════════════════════════════════

export const avisameSiSeLibera = comando<
  {
    direccion: string;
    dia: string;
    comensales: number;
    nombre: string;
    telefono: string;
    correo: string;
  },
  { apuntado: true }
>({
  nombre: 'avisame_si_se_libera',
  entrada: z
    .object({
      direccion,
      dia: fecha,
      comensales: z.number().int().min(1).max(COMENSALES_DE_LA_WEB),
      nombre: z.string().trim().min(1).max(60),
      telefono,
      correo,
    })
    .strict(),
  sinSesion: true,
  sinRecordar: true,

  async ejecutar(contexto, entrada) {
    await comoElSistema(contexto);
    const local = await elLocalDeLaWeb(contexto, entrada.direccion);
    if (!local.ajustes.avisarPorCorreo) {
      throw new FalloDeAplicacion('faltan_datos', {
        porque: 'Este local no avisa por correo. Llámales por si se libera algo.',
      });
    }
    await gastarUnIntento(contexto, 'avisame');
    queElDiaSePueda(entrada.dia, fechaEnElLocal(contexto.ahora, local.zona));
    // Pedirlo dos veces (dos toques, la red) no apunta dos veces ni manda dos correos.
    await contexto.sql`
      insert into estook.aviso_si_se_libera
        (organizacion_id, local_id, dia, comensales, nombre, telefono, correo)
      select ${local.organizacionId}::uuid, ${local.id}::uuid, ${entrada.dia}::date,
             ${entrada.comensales}, ${entrada.nombre}, ${telefonoLimpio(entrada.telefono)},
             ${entrada.correo}
       where not exists (
         select 1 from estook.aviso_si_se_libera
          where local_id = ${local.id}::uuid and dia = ${entrada.dia}::date
            and lower(correo) = lower(${entrada.correo}) and avisado_en is null
       )
    `;
    return { apuntado: true };
  },
});
