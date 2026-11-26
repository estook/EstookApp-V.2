import { z } from 'zod';
import { avisoDeVacacionesPedidas, avisoDeVacacionesRespondidas, delAl } from '@estook/dominio';
import { elLocalDeLaSesion, laOrganizacionDeLaSesion } from '../alta.ts';
import { avisar } from '../avisos.ts';
import { comando, FalloDeAplicacion, type Contexto } from '../contrato.ts';
import {
  avisarALaPersona,
  comoLista,
  conQueDiasLibres,
  hoyEnElLocal,
  laFichaDeSusVacaciones,
  queNoSePisen,
  quePuedaPedirlas,
  quienesLasGestionan,
  suNombre,
} from '../vacaciones.ts';

/**
 * Las vacaciones (la Ampliación 4 · 2, decisión 0153, sección 5; Plan, M14).
 *
 *   pedir_vacaciones          las pide la persona; o se las pone quien gestiona las de su gente
 *   responder_vacaciones      quien las gestiona: aprobar, proponer otras fechas o rechazar
 *   contestar_la_propuesta    la persona, a otras fechas que le proponen: aceptarlas o no
 *   retirar_vacaciones        la persona retira las que pidió y aún no le han contestado
 *
 * **Cómo se cuentan los días** (Richi, 26-nov; 0130): en naturales, todos; en laborables, todos
 * menos los que esa persona suele librar, que salen de su horario publicado o se escriben al pedir.
 * Cada petición guarda con qué días libres se contó.
 *
 * Lo que se mira siempre: **que no se pidan más días de los que hay** (el saldo de la ficha, menos
 * lo pedido y sin contestar), que no se pisen con otras suyas, y que no sean del pasado. Quién
 * decide lo mira aquí y lo vuelve a mirar la base (0129). **Las coincidencias avisan y no impiden
 * aprobar**: decide el responsable.
 */

const fecha = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

function fechasBuenas(desde: string, hasta: string, hoy: string): void {
  if (
    Number.isNaN(Date.parse(`${desde}T12:00:00Z`)) ||
    Number.isNaN(Date.parse(`${hasta}T12:00:00Z`))
  ) {
    throw new FalloDeAplicacion('faltan_datos', {
      campos: ['desde'],
      porque: 'Esa fecha no existe.',
    });
  }
  if (hasta < desde) {
    throw new FalloDeAplicacion('faltan_datos', {
      campos: ['hasta'],
      porque: 'El último día va después del primero.',
    });
  }
  if (desde < hoy) {
    throw new FalloDeAplicacion('faltan_datos', {
      campos: ['desde'],
      porque: 'Las vacaciones se piden para de hoy en adelante.',
    });
  }
}

interface LaSolicitud {
  readonly id: string;
  readonly persona_id: string;
  readonly local_id: string;
  readonly organizacion_id: string;
  readonly desde: string;
  readonly hasta: string;
  readonly estado: string;
  readonly propuesta_desde: string | null;
  readonly propuesta_hasta: string | null;
  readonly dias: string;
  readonly libra: string | null;
}

async function laSolicitud(contexto: Contexto, id: string): Promise<LaSolicitud> {
  const filas = await contexto.sql<LaSolicitud[]>`
    select id::text as id, persona_id::text as persona_id, local_id::text as local_id,
           organizacion_id::text as organizacion_id,
           to_char(desde, 'YYYY-MM-DD') as desde, to_char(hasta, 'YYYY-MM-DD') as hasta, estado,
           to_char(propuesta_desde, 'YYYY-MM-DD') as propuesta_desde,
           to_char(propuesta_hasta, 'YYYY-MM-DD') as propuesta_hasta,
           dias::text as dias, array_to_string(libra, ',') as libra
      from estook.solicitud_de_vacaciones where id = ${id}
  `;
  const s = filas[0];
  if (s === undefined) {
    throw new FalloDeAplicacion('no_existe', {
      porque: 'Esas vacaciones no están, o no son tuyas.',
    });
  }
  return s;
}

/** Si quien pregunta gestiona las vacaciones de esa persona en ese local. */
async function lasGestiona(
  contexto: Contexto,
  localId: string,
  personaId: string,
): Promise<boolean> {
  if (personaId === contexto.personaId) return false;
  const filas = await contexto.sql<{ si: boolean }[]>`
    select estook.puede_editar('accion.gestionar_vacaciones', ${localId}::uuid)
           and ${personaId}::uuid in (select q.persona_id from estook.a_quien_lleva(${localId}::uuid) q)
           as si
  `;
  return filas[0]?.si === true;
}

// ═══ Pedir ════════════════════════════════════════════════════════════════════

export const entradaPedirVacaciones = z
  .object({
    desde: fecha,
    hasta: fecha,
    nota: z.string().trim().min(1).max(300).optional(),
    /** Para ponérselas a alguien de tu gente: quedan aprobadas. Sin esto, las pides tú. */
    persona_id: z.string().uuid().optional(),
    /**
     * En laborables, los días que suele librar (1 = lunes … 7 = domingo), si se escriben o se
     * corrigen al pedir. Sin esto, los que sabe Estook de su horario. En naturales no se usa.
     */
    libra: z.array(z.number().int().min(1).max(7)).min(1).max(6).optional(),
  })
  .strict();
export type EntradaPedirVacaciones = z.infer<typeof entradaPedirVacaciones>;

export const pedirVacaciones = comando<
  EntradaPedirVacaciones,
  { solicitudId: string; estado: 'pedida' | 'aprobada'; dias: number }
>({
  nombre: 'pedir_vacaciones',
  entrada: entradaPedirVacaciones,

  async ejecutar(contexto, entrada) {
    if (!contexto.personaId) throw new FalloDeAplicacion('sin_sesion');
    const localId = elLocalDeLaSesion(contexto);
    const organizacionId = laOrganizacionDeLaSesion(contexto);
    const hoy = await hoyEnElLocal(contexto, localId);
    const personaId = entrada.persona_id ?? contexto.personaId;
    const seLasPone = personaId !== contexto.personaId;
    if (seLasPone && !(await lasGestiona(contexto, localId, personaId))) {
      throw new FalloDeAplicacion('sin_permiso', {
        porque: 'Solo pones vacaciones a la gente que llevas.',
      });
    }
    fechasBuenas(entrada.desde, entrada.hasta, hoy);
    const ficha = await laFichaDeSusVacaciones(contexto, personaId, organizacionId, hoy);
    const libres = await conQueDiasLibres(
      contexto,
      ficha,
      personaId,
      organizacionId,
      hoy,
      entrada.libra,
    );
    const dias = quePuedaPedirlas(ficha, entrada.desde, entrada.hasta, libres.libra);
    await queNoSePisen(contexto, personaId, entrada.desde, entrada.hasta, null);

    const estado = seLasPone ? 'aprobada' : 'pedida';
    const filas = await contexto.sql<{ id: string }[]>`
      insert into estook.solicitud_de_vacaciones
        (organizacion_id, local_id, persona_id, desde, hasta, dias, libra, libra_de, estado, nota,
         pedida_por, decidida_por, decidida_en)
      values (${organizacionId}, ${localId}, ${personaId}, ${entrada.desde}::date,
              ${entrada.hasta}::date, ${dias}, ${comoLista(libres.libra)}::smallint[], ${libres.de},
              ${estado}, ${entrada.nota ?? null},
              ${contexto.personaId},
              ${seLasPone ? contexto.personaId : null},
              ${seLasPone ? contexto.ahora.toISOString() : null}::timestamptz)
      returning id::text as id
    `;
    const solicitudId = filas[0]?.id;
    if (solicitudId === undefined) throw new FalloDeAplicacion('sin_permiso');

    const quien = await suNombre(contexto, contexto.personaId);
    const fechas = delAl(entrada.desde, entrada.hasta);
    if (seLasPone) {
      await avisarALaPersona(contexto, localId, personaId, {
        tipo: 'vacaciones.respondidas',
        organizacionId,
        clave: `vacaciones:${solicitudId}`,
        texto: () => avisoDeVacacionesRespondidas('puestas', fechas, quien),
        ir: '/calendario/calendario/personal',
        quien,
        como: 'de_nuevo',
      });
    } else {
      await avisar(
        contexto,
        {
          tipo: 'vacaciones.pedidas',
          organizacionId,
          localId,
          clave: `vacaciones:${solicitudId}`,
          texto: () => avisoDeVacacionesPedidas(quien, fechas, dias, false),
          ir: '/calendario/calendario/propuestas',
          quien,
          como: 'de_nuevo',
        },
        await quienesLasGestionan(contexto, localId, personaId),
      );
    }
    return { solicitudId, estado, dias };
  },
});

// ═══ Responder (quien las gestiona) ═══════════════════════════════════════════

export const entradaResponderVacaciones = z
  .object({
    solicitud_id: z.string().uuid(),
    respuesta: z.enum(['aprobar', 'proponer', 'rechazar']),
    motivo: z.string().trim().min(1).max(300).optional(),
    /** Las fechas que se proponen, con «proponer». */
    desde: fecha.optional(),
    hasta: fecha.optional(),
  })
  .strict();
export type EntradaResponderVacaciones = z.infer<typeof entradaResponderVacaciones>;

export const responderVacaciones = comando<EntradaResponderVacaciones, { estado: string }>({
  nombre: 'responder_vacaciones',
  entrada: entradaResponderVacaciones,
  exige: 'accion.gestionar_vacaciones',

  async ejecutar(contexto, entrada) {
    if (!contexto.personaId) throw new FalloDeAplicacion('sin_sesion');
    const s = await laSolicitud(contexto, entrada.solicitud_id);
    if (!(await lasGestiona(contexto, s.local_id, s.persona_id))) {
      throw new FalloDeAplicacion('sin_permiso', {
        porque: 'Solo contestas las vacaciones de la gente que llevas, y nunca las tuyas.',
      });
    }
    if (s.estado !== 'pedida') {
      throw new FalloDeAplicacion('ya_hecho', { porque: 'Esas vacaciones ya están contestadas.' });
    }
    const hoy = await hoyEnElLocal(contexto, s.local_id);
    const quien = await suNombre(contexto, contexto.personaId);
    let estado: 'aprobada' | 'contrapropuesta' | 'rechazada';
    let fechas = delAl(s.desde, s.hasta);

    if (entrada.respuesta === 'aprobar') {
      estado = 'aprobada';
      await contexto.sql`
        update estook.solicitud_de_vacaciones
           set estado = 'aprobada', motivo = ${entrada.motivo ?? null},
               decidida_por = ${contexto.personaId}, decidida_en = ${contexto.ahora.toISOString()}::timestamptz
         where id = ${s.id}
      `;
    } else if (entrada.respuesta === 'rechazar') {
      if (entrada.motivo === undefined) {
        throw new FalloDeAplicacion('faltan_datos', {
          campos: ['motivo'],
          porque: 'Al rechazarlas, di por qué: lo lee quien las pidió.',
        });
      }
      estado = 'rechazada';
      await contexto.sql`
        update estook.solicitud_de_vacaciones
           set estado = 'rechazada', motivo = ${entrada.motivo},
               decidida_por = ${contexto.personaId}, decidida_en = ${contexto.ahora.toISOString()}::timestamptz
         where id = ${s.id}
      `;
    } else {
      if (entrada.desde === undefined || entrada.hasta === undefined) {
        throw new FalloDeAplicacion('faltan_datos', {
          campos: ['desde', 'hasta'],
          porque: 'Di qué fechas le propones.',
        });
      }
      fechasBuenas(entrada.desde, entrada.hasta, hoy);
      estado = 'contrapropuesta';
      fechas = delAl(entrada.desde, entrada.hasta);
      await contexto.sql`
        update estook.solicitud_de_vacaciones
           set estado = 'contrapropuesta', motivo = ${entrada.motivo ?? null},
               propuesta_desde = ${entrada.desde}::date, propuesta_hasta = ${entrada.hasta}::date,
               decidida_por = ${contexto.personaId}, decidida_en = ${contexto.ahora.toISOString()}::timestamptz
         where id = ${s.id}
      `;
    }

    await avisarALaPersona(contexto, s.local_id, s.persona_id, {
      tipo: 'vacaciones.respondidas',
      organizacionId: s.organizacion_id,
      clave: `vacaciones:${s.id}`,
      texto: () =>
        avisoDeVacacionesRespondidas(
          estado === 'aprobada' ? 'aprobadas' : estado === 'rechazada' ? 'rechazadas' : 'propuesta',
          fechas,
          quien,
        ),
      ir: '/calendario/calendario/personal',
      quien,
      como: 'de_nuevo',
    });
    return { estado };
  },
});

// ═══ Contestar a otras fechas (la persona) ═══════════════════════════════════

export const entradaContestarLaPropuesta = z
  .object({
    solicitud_id: z.string().uuid(),
    respuesta: z.enum(['aceptar', 'rechazar']),
  })
  .strict();
export type EntradaContestarLaPropuesta = z.infer<typeof entradaContestarLaPropuesta>;

export const contestarLaPropuesta = comando<EntradaContestarLaPropuesta, { estado: string }>({
  nombre: 'contestar_la_propuesta',
  entrada: entradaContestarLaPropuesta,

  async ejecutar(contexto, entrada) {
    if (!contexto.personaId) throw new FalloDeAplicacion('sin_sesion');
    const s = await laSolicitud(contexto, entrada.solicitud_id);
    if (s.persona_id !== contexto.personaId) {
      throw new FalloDeAplicacion('sin_permiso', {
        porque: 'Solo contestas a lo que te proponen a ti.',
      });
    }
    if (
      s.estado !== 'contrapropuesta' ||
      s.propuesta_desde === null ||
      s.propuesta_hasta === null
    ) {
      throw new FalloDeAplicacion('ya_hecho', { porque: 'Ya no hay nada que contestar ahí.' });
    }
    if (entrada.respuesta === 'rechazar') {
      await contexto.sql`
        update estook.solicitud_de_vacaciones
           set estado = 'retirada', propuesta_desde = null, propuesta_hasta = null
         where id = ${s.id}
      `;
      return { estado: 'retirada' };
    }

    const hoy = await hoyEnElLocal(contexto, s.local_id);
    fechasBuenas(s.propuesta_desde, s.propuesta_hasta, hoy);
    const ficha = await laFichaDeSusVacaciones(contexto, s.persona_id, s.organizacion_id, hoy);
    // Con los mismos días libres con los que se pidió; y lo que ya tenía apartado esta misma
    // petición no cuenta dos veces.
    const libra = s.libra === null || s.libra === '' ? null : s.libra.split(',').map(Number);
    const dias = quePuedaPedirlas(
      ficha,
      s.propuesta_desde,
      s.propuesta_hasta,
      libra,
      Number(s.dias),
    );
    await queNoSePisen(contexto, s.persona_id, s.propuesta_desde, s.propuesta_hasta, s.id);
    await contexto.sql`
      update estook.solicitud_de_vacaciones
         set estado = 'aprobada', desde = propuesta_desde, hasta = propuesta_hasta, dias = ${dias},
             propuesta_desde = null, propuesta_hasta = null
       where id = ${s.id}
    `;
    const quien = await suNombre(contexto, contexto.personaId);
    await avisar(
      contexto,
      {
        tipo: 'vacaciones.pedidas',
        organizacionId: s.organizacion_id,
        localId: s.local_id,
        clave: `vacaciones:${s.id}`,
        texto: () =>
          avisoDeVacacionesPedidas(
            quien,
            delAl(s.propuesta_desde ?? '', s.propuesta_hasta ?? ''),
            dias,
            true,
          ),
        ir: '/calendario/calendario/propuestas',
        quien,
        como: 'de_nuevo',
      },
      await quienesLasGestionan(contexto, s.local_id, s.persona_id),
    );
    return { estado: 'aprobada' };
  },
});

// ═══ Retirar (la persona) ═════════════════════════════════════════════════════

export const retirarVacaciones = comando<{ solicitud_id: string }, { estado: string }>({
  nombre: 'retirar_vacaciones',
  entrada: z.object({ solicitud_id: z.string().uuid() }).strict(),

  async ejecutar(contexto, entrada) {
    if (!contexto.personaId) throw new FalloDeAplicacion('sin_sesion');
    const s = await laSolicitud(contexto, entrada.solicitud_id);
    if (s.persona_id !== contexto.personaId) {
      throw new FalloDeAplicacion('sin_permiso', { porque: 'Solo retiras las que pediste tú.' });
    }
    if (s.estado !== 'pedida') {
      throw new FalloDeAplicacion('ya_hecho', {
        porque:
          'Ya te las han contestado. Si necesitas cambiarlas, habla con quien lleva el local.',
      });
    }
    await contexto.sql`
      update estook.solicitud_de_vacaciones set estado = 'retirada' where id = ${s.id}
    `;
    return { estado: 'retirada' };
  },
});
