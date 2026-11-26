import {
  diaDeLaSemana,
  diasDeVacaciones,
  elSaldoDeVacaciones,
  fechaOperativa,
  losDiasQueSueleLibrar,
  type DiaDeLaSemana,
  type DiaDelHorario,
  type SaldoDeVacaciones,
  type VacacionesEn,
} from '@estook/dominio';
import { avisar, quienesPuedenRecibir, type AvisoQueSeDa, type QuienRecibe } from './avisos.ts';
import { FalloDeAplicacion, type Contexto } from './contrato.ts';
import { elReloj } from './consultas/equipo.ts';
import { loGastadoDeVacaciones } from './la-ficha.ts';

/**
 * Lo que comparten los comandos y las consultas de las vacaciones (la Ampliación 4 · 2, 0153).
 *
 * **El saldo sale de la ficha** (0127): los días del año de su contrato o su convenio, lo
 * disfrutado y lo aprobado, y aquí además **lo que ya tiene pedido y sin contestar**, para que no
 * se pidan más días de los que hay (Richi: «no deja pedir más días de los que hay»).
 */

export interface SuFicha {
  readonly vacacionesEn: VacacionesEn;
  readonly saldo: SaldoDeVacaciones | null;
  /** Lo pedido y sin contestar, o propuesto: lo que no se puede volver a pedir. */
  readonly pedidas: number;
  /** Lo que de verdad se puede pedir: lo disponible menos lo pedido. */
  readonly sePuedenPedir: number | null;
}

/** El día de hoy en el local, para contar y para no pedir el pasado. */
export async function hoyEnElLocal(contexto: Contexto, localId: string): Promise<string> {
  const reloj = await elReloj(contexto, localId);
  return fechaOperativa(reloj.jornada);
}

export async function laFichaDeSusVacaciones(
  contexto: Contexto,
  personaId: string,
  organizacionId: string,
  hoy: string,
): Promise<SuFicha> {
  const filas = await contexto.sql<
    {
      vacaciones_al_ano: string | null;
      vacaciones_en: string;
      incorporacion: string | null;
      pendientes_anteriores: string;
    }[]
  >`
    select vacaciones_al_ano::text as vacaciones_al_ano, vacaciones_en,
           to_char(incorporacion, 'YYYY-MM-DD') as incorporacion,
           pendientes_anteriores::text as pendientes_anteriores
      from estook.ficha_laboral
     where persona_id = ${personaId} and organizacion_id = ${organizacionId}
  `;
  const f = filas[0];
  const vacacionesEn = (f?.vacaciones_en ?? 'naturales') as VacacionesEn;
  if (f === undefined) return { vacacionesEn, saldo: null, pedidas: 0, sePuedenPedir: null };
  const gastado = await loGastadoDeVacaciones(contexto, personaId, organizacionId, hoy);
  const saldo = elSaldoDeVacaciones({
    alAno: f.vacaciones_al_ano === null ? null : Number(f.vacaciones_al_ano),
    incorporacion: f.incorporacion,
    hoy,
    pendientes: Number(f.pendientes_anteriores),
    disfrutadas: gastado.disfrutadas,
    aprobadas: gastado.porDisfrutar,
  });
  const pedidas = await contexto.sql<{ dias: string | null }[]>`
    select sum(dias)::text as dias from estook.solicitud_de_vacaciones
     where persona_id = ${personaId} and organizacion_id = ${organizacionId}
       and estado in ('pedida', 'contrapropuesta')
  `;
  const enEspera = Number(pedidas[0]?.dias ?? 0);
  return {
    vacacionesEn,
    saldo,
    pedidas: enEspera,
    sePuedenPedir: saldo === null ? null : Number((saldo.disponibles - enEspera).toFixed(2)),
  };
}

export interface SusDiasLibres {
  readonly dias: readonly DiaDeLaSemana[];
  /** «horario»: lo sacó Estook de sus semanas publicadas; «escrito»: lo dijo alguien. */
  readonly de: 'horario' | 'escrito';
}

function masDias(fecha: string, dias: number): string {
  return new Date(Date.parse(`${fecha}T12:00:00Z`) + dias * 86_400_000).toISOString().slice(0, 10);
}

function comoDias(texto: string | null): DiaDeLaSemana[] | null {
  if (texto === null || texto === '') return null;
  return texto.split(',').map((d) => Number(d) as DiaDeLaSemana);
}

/**
 * **Qué días suele librar** alguien, para contar sus vacaciones en laborables (Richi, 26-nov):
 * primero, de su horario publicado (siete semanas atrás, esta y la que viene, en todos los locales de
 * la empresa); si de ahí no sale una costumbre, lo último que dijo él o quien se las puso. Si no hay
 * ninguna de las dos cosas, nulo: la pantalla le pregunta.
 */
export async function susDiasLibres(
  contexto: Contexto,
  personaId: string,
  organizacionId: string,
  hoy: string,
): Promise<SusDiasLibres | null> {
  const lunes = masDias(hoy, 1 - diaDeLaSemana(fechaOperativa(hoy)));
  const horario = await contexto.sql<DiaDelHorario[]>`
    select to_char(t.dia, 'YYYY-MM-DD') as dia, t.tipo::text as tipo
      from estook.turno_publicado t
      join estook.local l on l.id = t.local_id
     where t.persona_id = ${personaId} and l.organizacion_id = ${organizacionId}
       and t.dia between ${masDias(lunes, -49)}::date and ${masDias(lunes, 13)}::date
  `;
  const delHorario = losDiasQueSueleLibrar(horario);
  if (delHorario !== null) return { dias: delHorario, de: 'horario' };

  const dicho = await contexto.sql<{ libra: string | null }[]>`
    select array_to_string(libra, ',') as libra from estook.solicitud_de_vacaciones
     where persona_id = ${personaId} and organizacion_id = ${organizacionId}
       and libra_de = 'escrito'
     order by pedida_en desc limit 1
  `;
  const escrito = comoDias(dicho[0]?.libra ?? null);
  return escrito === null ? null : { dias: escrito, de: 'escrito' };
}

/**
 * Con qué días libres se cuentan unas vacaciones nuevas: en naturales, ninguno; en laborables, los
 * que se escriben al pedirlas o, si no, los que sabe Estook. Sin ninguno, se pide que los diga.
 */
export async function conQueDiasLibres(
  contexto: Contexto,
  ficha: SuFicha,
  personaId: string,
  organizacionId: string,
  hoy: string,
  escritos: readonly number[] | undefined,
): Promise<{ libra: readonly DiaDeLaSemana[] | null; de: 'horario' | 'escrito' | null }> {
  if (ficha.vacacionesEn === 'naturales') return { libra: null, de: null };
  const sabidos = await susDiasLibres(contexto, personaId, organizacionId, hoy);
  if (escritos !== undefined) {
    const dias = [...new Set(escritos)].sort((a, b) => a - b) as DiaDeLaSemana[];
    const igual = sabidos !== null && sabidos.dias.join(',') === dias.join(',');
    return { libra: dias, de: igual ? sabidos.de : 'escrito' };
  }
  if (sabidos === null) {
    throw new FalloDeAplicacion('faltan_datos', {
      campos: ['libra'],
      porque: 'Sus vacaciones son en días laborables y no sabemos qué días suele librar: márcalos.',
    });
  }
  return { libra: sabidos.dias, de: sabidos.de };
}

/** El texto de unos días libres para guardarlos en la base: «{1,2}». */
export function comoLista(libra: readonly number[] | null): string | null {
  return libra === null ? null : `{${libra.join(',')}}`;
}

/** Los días que cuentan unas fechas para esa persona, o el fallo si no caben. */
export function quePuedaPedirlas(
  ficha: SuFicha,
  desde: string,
  hasta: string,
  libra: readonly number[] | null,
  quitarDeLoPedido = 0,
): number {
  const dias = diasDeVacaciones(desde, hasta, libra);
  if (dias === 0) {
    throw new FalloDeAplicacion('faltan_datos', {
      campos: ['desde', 'hasta'],
      porque: 'Esas fechas son todas días que libra: no cuentan ningún día de vacaciones.',
    });
  }
  if (ficha.sePuedenPedir === null) {
    throw new FalloDeAplicacion('faltan_datos', {
      porque:
        'La ficha no dice cuántos días de vacaciones hay al año. Lo pone quien lleva el local, con el contrato.',
    });
  }
  if (dias > ficha.sePuedenPedir + quitarDeLoPedido + 0.001) {
    throw new FalloDeAplicacion('faltan_datos', {
      campos: ['desde', 'hasta'],
      porque: `Son ${String(dias)} días y quedan ${String(Number((ficha.sePuedenPedir + quitarDeLoPedido).toFixed(2)))} por pedir. Elige menos días.`,
    });
  }
  return dias;
}

/** Que no se pisen con otras suyas pedidas o aprobadas. */
export async function queNoSePisen(
  contexto: Contexto,
  personaId: string,
  desde: string,
  hasta: string,
  menosLa: string | null,
): Promise<void> {
  const pisan = await contexto.sql<{ id: string }[]>`
    select id::text as id from estook.solicitud_de_vacaciones
     where persona_id = ${personaId}
       and estado in ('pedida', 'aprobada', 'contrapropuesta')
       and desde <= ${hasta}::date and hasta >= ${desde}::date
       and (${menosLa}::uuid is null or id <> ${menosLa}::uuid)
     limit 1
  `;
  if (pisan.length > 0) {
    throw new FalloDeAplicacion('faltan_datos', {
      campos: ['desde', 'hasta'],
      porque: 'Ya tienes vacaciones pedidas o aprobadas en esas fechas.',
    });
  }
}

/**
 * Quién gestiona las vacaciones de alguien: los del permiso en el local que **llevan a su gente**.
 * Un jefe de sala, la sala; uno de cocina, la cocina; quien lleva el local, a todos los que mandan
 * menos que él. A nadie se le avisa de las suyas.
 */
export async function quienesLasGestionan(
  contexto: Contexto,
  localId: string,
  personaId: string,
): Promise<readonly QuienRecibe[]> {
  const suyo = await contexto.sql<{ rol: string; amplitud: number }[]>`
    select m.rol, r.amplitud
      from estook.membresia m join estook.rol r on r.codigo = m.rol
      join estook.local l on l.id = ${localId}::uuid
     where m.persona_id = ${personaId} and m.organizacion_id = l.organizacion_id
       and m.revocada_en is null
     order by r.amplitud desc limit 1
  `;
  const rol = suyo[0]?.rol ?? '';
  const amplitud = suyo[0]?.amplitud ?? 0;
  const familia: Readonly<Record<string, readonly string[]>> = {
    jefe_de_sala: ['camarero', 'jefe_de_sala'],
    jefe_de_cocina: ['cocinero', 'jefe_de_cocina'],
  };
  return (await quienesPuedenRecibir(contexto, localId, 'vacaciones.pedidas')).filter(
    (q) =>
      q.personaId !== personaId &&
      q.amplitud > amplitud &&
      (familia[q.rol] === undefined || (familia[q.rol] ?? []).includes(rol)),
  );
}

/** A la persona, el aviso de lo que le han contestado. */
export async function avisarALaPersona(
  contexto: Contexto,
  localId: string,
  personaId: string,
  aviso: Omit<AvisoQueSeDa, 'localId'>,
): Promise<void> {
  const ella = (await quienesPuedenRecibir(contexto, localId, 'vacaciones.respondidas')).filter(
    (q) => q.personaId === personaId,
  );
  await avisar(contexto, { ...aviso, localId }, ella);
}

export async function suNombre(contexto: Contexto, personaId: string): Promise<string> {
  const filas = await contexto.sql<{ nombre: string }[]>`
    select nombre from estook.persona where id = ${personaId}
  `;
  return filas[0]?.nombre ?? 'Alguien';
}
