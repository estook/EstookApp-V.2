import { z } from 'zod';
import {
  avisoDeHorarioCambiado,
  avisoDeHorarioPublicado,
  diasEntre,
  fechaOperativa,
  loQueHaCambiado,
  masDias,
  minutosDelTramo,
  TIPOS_DE_TURNO,
  type FechaOperativa,
} from '@estook/dominio';
import { publicar } from '../../eventos/bandeja.ts';
import { laOrganizacionDeLaSesion } from '../alta.ts';
import { avisar, quienesPuedenRecibir } from '../avisos.ts';
import { comoLista } from '../listas.ts';
import { comando, FalloDeAplicacion, type Contexto } from '../contrato.ts';
import {
  apuntarQueCambia,
  elBorrador,
  elEquipoDelHorario,
  elLocalDelHorario,
  laSemana,
  laSemanaParaMontar,
  loPublicado,
  unLunes,
  type TurnoLeido,
} from '../horario.ts';

/**
 * Montar y publicar el horario (H2 · decisiones 0066, 0068 y 0069).
 *
 * Todo lo pide `accion.publicar_cuadrante`: el jefe de sala y el jefe de cocina —los
 * dos, el de los dos (0010)—, el gerente, RRHH y quien está por encima. Y las
 * políticas de la 0053 lo cierran debajo: el borrador no lo toca nadie más.
 *
 * ── Lo que se decidió, en llano ─────────────────────────────────────────────
 *
 * - **Se monta en borrador** y el equipo no lo ve hasta publicar (Manifiesto 15).
 * - **Los avisos del horario avisan, no impiden**: se publica aunque alguien se
 *   pase de sus horas. Quien manda es quien lleva el local.
 * - **Al publicar, a cada uno lo suyo**, en la campana y por correo. **Al volver a
 *   publicar, solo a quien le cambia algo**, y le dice qué (0066).
 */

const hora = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'La hora se escribe así: 09:30.');

const fecha = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha se escribe así: 2026-10-05.');

/** Que la persona salga en el horario de este local: que fiche en él. */
async function esDelEquipo(contexto: Contexto, localId: string, personaId: string): Promise<void> {
  const equipo = await elEquipoDelHorario(contexto, localId);
  if (!equipo.some((p) => p.personaId === personaId)) {
    throw new FalloDeAplicacion('faltan_datos', {
      porque: 'Esa persona no ficha en este local, así que no sale en su horario.',
    });
  }
}

/** En qué minuto de la semana empieza y acaba un tramo, contando desde el lunes. */
function susMinutos(
  lunes: FechaOperativa,
  dia: string,
  entra: string,
  sale: string,
): { empieza: number; acaba: number } {
  const [h = '0', m = '0'] = entra.split(':');
  const empieza = diasEntre(lunes, fechaOperativa(dia)) * 24 * 60 + Number(h) * 60 + Number(m);
  return { empieza, acaba: empieza + minutosDelTramo(entra, sale) };
}

// ── Poner un tramo, o una ausencia ───────────────────────────────────────────

export const entradaPonerTramo = z
  .object({
    lunes: unLunes,
    persona_id: z.string().uuid(),
    dia: fecha,
    tipo: z.enum(TIPOS_DE_TURNO),
    entra: hora.nullable().optional(),
    sale: hora.nullable().optional(),
    descanso_minutos: z.number().int().min(0).max(240).optional(),
    nota: z.string().trim().max(200).nullable().optional(),
    /** Para cambiar uno que ya está puesto. */
    turno_id: z.string().uuid().optional(),
  })
  .strict()
  .refine((e) => e.tipo !== 'trabajo' || (e.entra != null && e.sale != null), {
    message: 'Un tramo de trabajo lleva hora de entrada y de salida.',
    path: ['entra'],
  })
  .refine((e) => e.tipo !== 'trabajo' || e.entra !== e.sale, {
    message: 'Entrar y salir a la misma hora no es un tramo.',
    path: ['sale'],
  });

export type EntradaPonerTramo = z.infer<typeof entradaPonerTramo>;

export const ponerTramo = comando<EntradaPonerTramo, { turnoId: string }>({
  nombre: 'poner_tramo',
  entrada: entradaPonerTramo,
  exige: 'accion.publicar_cuadrante',

  async ejecutar(contexto, entrada) {
    if (!contexto.personaId) throw new FalloDeAplicacion('sin_sesion');
    const localId = elLocalDelHorario(contexto);
    const organizacionId = laOrganizacionDeLaSesion(contexto);
    const lunes = fechaOperativa(entrada.lunes);
    const desdeElLunes = diasEntre(lunes, fechaOperativa(entrada.dia));
    if (desdeElLunes < 0 || desdeElLunes > 6) {
      throw new FalloDeAplicacion('faltan_datos', { porque: 'Ese día no es de esta semana.' });
    }
    await esDelEquipo(contexto, localId, entrada.persona_id);

    const semanaId = await laSemanaParaMontar(contexto, localId, organizacionId, lunes);
    const borrador = await elBorrador(contexto, semanaId);
    const delDia = borrador.filter(
      (t) =>
        t.personaId === entrada.persona_id && t.dia === entrada.dia && t.id !== entrada.turno_id,
    );

    if (entrada.turno_id !== undefined && !borrador.some((t) => t.id === entrada.turno_id)) {
      throw new FalloDeAplicacion('faltan_datos', {
        porque: 'Ese tramo ya no está en el horario. Vuelve a abrirlo.',
      });
    }

    if (entrada.tipo === 'trabajo') {
      // Que no se pise con otro suyo: ni el mismo día ni el de la noche de antes.
      const nuevo = susMinutos(lunes, entrada.dia, entrada.entra ?? '', entrada.sale ?? '');
      const pisa = borrador.find((t) => {
        if (t.personaId !== entrada.persona_id || t.id === entrada.turno_id) return false;
        if (t.tipo !== 'trabajo' || t.entra === null || t.sale === null) return false;
        const otro = susMinutos(lunes, t.dia, t.entra, t.sale);
        return otro.empieza < nuevo.acaba && nuevo.empieza < otro.acaba;
      });
      if (pisa !== undefined) {
        throw new FalloDeAplicacion('faltan_datos', {
          porque: `Se pisa con otro tramo suyo, de ${pisa.entra ?? ''} a ${pisa.sale ?? ''}.`,
        });
      }
      // Trabajar un día marcado como libre lo deja de ser: se quita la ausencia.
      const ausencias = delDia.filter((t) => t.tipo !== 'trabajo').map((t) => t.id);
      if (ausencias.length > 0) {
        await contexto.sql`delete from estook.turno where id = any (${comoLista(ausencias)}::text::uuid[])`;
      }
    } else if (delDia.length > 0) {
      // Una ausencia ocupa el día entero: lo que hubiera ese día se va.
      await contexto.sql`
        delete from estook.turno where id = any (${comoLista(delDia.map((t) => t.id))}::text::uuid[])
      `;
    }

    const trabajo = entrada.tipo === 'trabajo';
    const filas =
      entrada.turno_id === undefined
        ? await contexto.sql<{ id: string }[]>`
            insert into estook.turno (
              semana_id, local_id, persona_id, dia, tipo, entra, sale, descanso_minutos, nota, creado_por
            )
            values (
              ${semanaId}::uuid, ${localId}, ${entrada.persona_id}, ${entrada.dia}::date,
              ${entrada.tipo}::estook.tipo_de_turno,
              ${trabajo ? (entrada.entra ?? null) : null}::time,
              ${trabajo ? (entrada.sale ?? null) : null}::time,
              ${trabajo ? (entrada.descanso_minutos ?? 0) : 0},
              ${entrada.nota ?? null}, ${contexto.personaId}
            )
            returning id::text as id
          `
        : await contexto.sql<{ id: string }[]>`
            update estook.turno
               set dia = ${entrada.dia}::date,
                   tipo = ${entrada.tipo}::estook.tipo_de_turno,
                   entra = ${trabajo ? (entrada.entra ?? null) : null}::time,
                   sale = ${trabajo ? (entrada.sale ?? null) : null}::time,
                   descanso_minutos = ${trabajo ? (entrada.descanso_minutos ?? 0) : 0},
                   nota = ${entrada.nota ?? null},
                   actualizado_en = now()
             where id = ${entrada.turno_id}::uuid and semana_id = ${semanaId}::uuid
            returning id::text as id
          `;
    const fila = filas[0];
    if (fila === undefined) throw new FalloDeAplicacion('sin_permiso');
    await apuntarQueCambia(contexto, semanaId);
    return { turnoId: fila.id };
  },
});

// ── Quitar un tramo ──────────────────────────────────────────────────────────

export const quitarTramo = comando<{ turno_id: string }, { quitado: boolean }>({
  nombre: 'quitar_tramo',
  entrada: z.object({ turno_id: z.string().uuid() }).strict(),
  exige: 'accion.publicar_cuadrante',

  async ejecutar(contexto, entrada) {
    if (!contexto.personaId) throw new FalloDeAplicacion('sin_sesion');
    const filas = await contexto.sql<{ semana_id: string }[]>`
      delete from estook.turno where id = ${entrada.turno_id}::uuid
      returning semana_id::text as semana_id
    `;
    const fila = filas[0];
    if (fila === undefined) return { quitado: false };
    await apuntarQueCambia(contexto, fila.semana_id);
    return { quitado: true };
  },
});

// ── Para no empezar de cero ──────────────────────────────────────────────────

const entradaDeRelleno = z
  .object({
    lunes: unLunes,
    /** Si la semana ya tiene algo, se cambia por lo nuevo. Sin esto, se para y lo dice. */
    reemplazar: z.boolean().optional(),
  })
  .strict();

type EntradaDeRelleno = z.infer<typeof entradaDeRelleno>;

/** Una semana con algo puesto no se pisa sin decirlo. */
async function vaciarSiSePuede(
  contexto: Contexto,
  semanaId: string,
  reemplazar: boolean,
): Promise<void> {
  const hay = await contexto.sql<{ cuantos: number }[]>`
    select count(*)::int as cuantos from estook.turno where semana_id = ${semanaId}::uuid
  `;
  if ((hay[0]?.cuantos ?? 0) === 0) return;
  if (!reemplazar) {
    throw new FalloDeAplicacion('faltan_datos', {
      porque:
        'Esta semana ya tiene cosas puestas. Si quieres cambiarlas por las nuevas, confírmalo.',
    });
  }
  await contexto.sql`delete from estook.turno where semana_id = ${semanaId}::uuid`;
}

/**
 * «Copiar la semana anterior» (h-horarios, punto 3): lo que hay montado en la de
 * antes, un día después en cada día, y solo de quien sigue en el equipo.
 */
export const copiarLaSemanaAnterior = comando<EntradaDeRelleno, { puestos: number }>({
  nombre: 'copiar_la_semana_anterior',
  entrada: entradaDeRelleno,
  exige: 'accion.publicar_cuadrante',

  async ejecutar(contexto, entrada) {
    if (!contexto.personaId) throw new FalloDeAplicacion('sin_sesion');
    const localId = elLocalDelHorario(contexto);
    const organizacionId = laOrganizacionDeLaSesion(contexto);
    const lunes = fechaOperativa(entrada.lunes);

    const anterior = await laSemana(contexto, localId, masDias(lunes, -7));
    const deAntes = anterior === null ? [] : await elBorrador(contexto, anterior.id);
    if (deAntes.length === 0) {
      throw new FalloDeAplicacion('faltan_datos', {
        porque: 'La semana anterior no tiene nada montado que copiar.',
      });
    }

    const semanaId = await laSemanaParaMontar(contexto, localId, organizacionId, lunes);
    await vaciarSiSePuede(contexto, semanaId, entrada.reemplazar === true);

    const equipo = new Set((await elEquipoDelHorario(contexto, localId)).map((p) => p.personaId));
    let puestos = 0;
    for (const t of deAntes) {
      if (!equipo.has(t.personaId)) continue;
      await contexto.sql`
        insert into estook.turno (
          semana_id, local_id, persona_id, dia, tipo, entra, sale, descanso_minutos, nota, creado_por
        )
        values (
          ${semanaId}::uuid, ${localId}, ${t.personaId}, ${masDias(fechaOperativa(t.dia), 7)}::date,
          ${t.tipo}::estook.tipo_de_turno, ${t.entra}::time, ${t.sale}::time,
          ${t.descansoMinutos}, ${t.nota}, ${contexto.personaId}
        )
      `;
      puestos += 1;
    }
    await apuntarQueCambia(contexto, semanaId);
    return { puestos };
  },
});

/**
 * «Rellenar con el horario de siempre» (h-horarios, punto 3): el horario habitual
 * de cada uno (0027), el vigente cada día. Quien no tiene ninguno se queda en blanco.
 */
export const rellenarConElDeSiempre = comando<EntradaDeRelleno, { puestos: number }>({
  nombre: 'rellenar_con_el_de_siempre',
  entrada: entradaDeRelleno,
  exige: 'accion.publicar_cuadrante',

  async ejecutar(contexto, entrada) {
    if (!contexto.personaId) throw new FalloDeAplicacion('sin_sesion');
    const localId = elLocalDelHorario(contexto);
    const organizacionId = laOrganizacionDeLaSesion(contexto);
    const lunes = fechaOperativa(entrada.lunes);
    const equipo = (await elEquipoDelHorario(contexto, localId)).map((p) => p.personaId);

    const deSiempre = await contexto.sql<
      { persona_id: string; dia: string; entra: string; sale: string }[]
    >`
      select hh.persona_id::text as persona_id, to_char(d::date, 'YYYY-MM-DD') as dia,
             to_char(hh.entra, 'HH24:MI') as entra, to_char(hh.sale, 'HH24:MI') as sale
        from generate_series(${lunes}::date, ${lunes}::date + 6, interval '1 day') d
        join estook.horario_habitual hh
          on hh.local_id = ${localId}::uuid
         and hh.dia_de_la_semana = extract(isodow from d)::int
         and hh.desde <= d::date
         and (hh.hasta is null or hh.hasta >= d::date)
       where hh.persona_id = any (${comoLista(equipo)}::text::uuid[])
         and hh.entra <> hh.sale
       order by d, hh.entra
    `;
    if (deSiempre.length === 0) {
      throw new FalloDeAplicacion('faltan_datos', {
        porque:
          'Nadie del equipo tiene puesto su horario de siempre. Se pone en la ficha de cada persona.',
      });
    }

    const semanaId = await laSemanaParaMontar(contexto, localId, organizacionId, lunes);
    await vaciarSiSePuede(contexto, semanaId, entrada.reemplazar === true);

    for (const h of deSiempre) {
      await contexto.sql`
        insert into estook.turno (semana_id, local_id, persona_id, dia, tipo, entra, sale, creado_por)
        values (
          ${semanaId}::uuid, ${localId}, ${h.persona_id}, ${h.dia}::date, 'trabajo',
          ${h.entra}::time, ${h.sale}::time, ${contexto.personaId}
        )
      `;
    }
    await apuntarQueCambia(contexto, semanaId);
    return { puestos: deSiempre.length };
  },
});

// ── Publicar ─────────────────────────────────────────────────────────────────

export interface Publicado {
  /** Si es la primera vez que se publica esta semana. */
  readonly primeraVez: boolean;
  /** A cuántas personas les ha llegado algo. */
  readonly avisados: number;
}

/**
 * Publicar la semana: lo del borrador pasa a ser lo que ve el equipo.
 *
 * **La primera vez**, a cada uno que sale esa semana le llega lo suyo. **Las
 * siguientes**, solo a quien le cambia algo, y le dice qué día y cómo queda: borrar
 * un tramo y volver a ponerlo igual no le suena a nadie (`loQueHaCambiado`).
 */
export const publicarElHorario = comando<{ lunes: string }, Publicado>({
  nombre: 'publicar_el_horario',
  entrada: z.object({ lunes: unLunes }).strict(),
  exige: 'accion.publicar_cuadrante',

  async ejecutar(contexto, entrada) {
    if (!contexto.personaId) throw new FalloDeAplicacion('sin_sesion');
    const localId = elLocalDelHorario(contexto);
    const organizacionId = laOrganizacionDeLaSesion(contexto);
    const lunes = fechaOperativa(entrada.lunes);

    const semana = await laSemana(contexto, localId, lunes);
    const borrador = semana === null ? [] : await elBorrador(contexto, semana.id);
    if (semana === null || (borrador.length === 0 && semana.publicadaEn === null)) {
      throw new FalloDeAplicacion('faltan_datos', {
        porque: 'Esta semana no tiene nada puesto todavía: no hay nada que publicar.',
      });
    }

    const primeraVez = semana.publicadaEn === null;
    const antes = primeraVez ? [] : await loPublicado(contexto, semana.id);

    await contexto.sql`delete from estook.turno_publicado where semana_id = ${semana.id}::uuid`;
    await contexto.sql`
      insert into estook.turno_publicado (
        semana_id, local_id, persona_id, dia, tipo, entra, sale, descanso_minutos, nota
      )
      select semana_id, local_id, persona_id, dia, tipo, entra, sale, descanso_minutos, nota
        from estook.turno
       where semana_id = ${semana.id}::uuid
    `;
    await contexto.sql`
      update estook.semana_de_horario
         set publicada_en = now(), publicada_por = ${contexto.personaId},
             veces_publicada = veces_publicada + 1, cambiada_en = now(), actualizado_en = now()
       where id = ${semana.id}::uuid
    `;

    await contexto.sql`
      select estook.anotar(
        ${organizacionId}::uuid, 'publicar', 'horario', ${semana.id}, ${localId}::uuid,
        ${JSON.stringify({ tramos: antes.length })}::text::jsonb,
        ${JSON.stringify({ lunes, tramos: borrador.length })}::text::jsonb, null
      )
    `;
    await publicar(contexto.sql, {
      tipo: 'horario.publicado',
      organizacionId,
      localId,
      datos: { semanaId: semana.id, lunes, primeraVez },
      correlacionId: contexto.correlacionId,
    });

    const avisados = primeraVez
      ? await avisarDeLoSuyo(contexto, organizacionId, localId, semana.id, lunes, borrador)
      : await avisarDeLoQueCambia(
          contexto,
          organizacionId,
          localId,
          semana.id,
          lunes,
          antes,
          borrador,
        );

    return { primeraVez, avisados };
  },
});

async function avisarDeLoSuyo(
  contexto: Contexto,
  organizacionId: string,
  localId: string,
  semanaId: string,
  lunes: FechaOperativa,
  turnos: readonly TurnoLeido[],
): Promise<number> {
  const salen = new Set(turnos.map((t) => t.personaId));
  const pueden = (await quienesPuedenRecibir(contexto, localId, 'horario.publicado')).filter((q) =>
    salen.has(q.personaId),
  );
  const quien = await elNombreDeQuienPublica(contexto);
  let avisados = 0;
  for (const destinatario of pueden) {
    const suyos = turnos.filter((t) => t.personaId === destinatario.personaId);
    avisados += await avisar(
      contexto,
      {
        tipo: 'horario.publicado',
        organizacionId,
        localId,
        clave: `horario:${semanaId}`,
        texto: () => avisoDeHorarioPublicado(lunes, suyos),
        ir: `/horario?semana=${lunes}`,
        quien,
        como: 'de_nuevo',
      },
      [destinatario],
    );
  }
  return avisados;
}

async function avisarDeLoQueCambia(
  contexto: Contexto,
  organizacionId: string,
  localId: string,
  semanaId: string,
  lunes: FechaOperativa,
  antes: readonly TurnoLeido[],
  ahora: readonly TurnoLeido[],
): Promise<number> {
  const cambios = loQueHaCambiado(antes, ahora, lunes);
  if (cambios.length === 0) return 0;
  const pueden = await quienesPuedenRecibir(contexto, localId, 'horario.cambiado');
  const quien = await elNombreDeQuienPublica(contexto);
  let avisados = 0;
  for (const cambio of cambios) {
    const destinatario = pueden.find((q) => q.personaId === cambio.personaId);
    if (destinatario === undefined) continue;
    avisados += await avisar(
      contexto,
      {
        tipo: 'horario.cambiado',
        organizacionId,
        localId,
        clave: `horario:${semanaId}`,
        texto: () => avisoDeHorarioCambiado(lunes, cambio),
        ir: `/horario?semana=${lunes}`,
        quien,
        como: 'de_nuevo',
      },
      [destinatario],
    );
  }
  return avisados;
}

async function elNombreDeQuienPublica(contexto: Contexto): Promise<string | null> {
  const filas = await contexto.sql<{ nombre: string }[]>`
    select nombre from estook.persona where id = ${contexto.personaId}
  `;
  return filas[0]?.nombre ?? null;
}
