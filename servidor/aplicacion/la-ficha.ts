import {
  elSaldoDeVacaciones,
  esTipoDeContrato,
  loDeUnAno,
  type Jornada,
  type SaldoDeVacaciones,
  type TipoDeContrato,
  type VacacionesEn,
} from '@estook/dominio';
import type { Contexto } from './contrato.ts';

/**
 * La ficha del trabajador, leída (la Ampliación 3, decisión 0153, sección 4).
 *
 * **Lo que se ve lo deciden las políticas de la 0127**, no este fichero: aquí se lee
 * todo lo que la base deja leer a quien pregunta, y lo privado que no le toca
 * simplemente no vuelve (cero filas). Así un jefe de sala abre la misma ficha que el
 * gerente y no recibe ni el DNI, ni el sueldo, ni el contrato: **no se esconde, no
 * llega**, como el sueldo desde la 0027.
 */

export interface FichaLaboral {
  readonly incorporacion: string | null;
  readonly contrato: TipoDeContrato | null;
  readonly jornada: Jornada | null;
  readonly horasSemanales: number | null;
  readonly categoria: string | null;
  readonly convenio: string | null;
  readonly vacacionesAlAno: number | null;
  readonly vacacionesEn: VacacionesEn;
  readonly pendientesAnteriores: number;
  readonly origen: 'a_mano' | 'contrato';
  readonly cambiadaEn: string;
  readonly cambiadaPor: string | null;
}

export interface FichaPrivada {
  readonly dni: string | null;
  readonly telefono: string | null;
  readonly domicilio: string | null;
  readonly sueldoCentimos: number | null;
  readonly sueldoEs: 'bruto' | 'neto' | null;
  readonly sueldoCada: 'mes' | 'ano' | null;
  readonly pagas: number | null;
}

export interface DocumentoDeLaFicha {
  readonly documentoId: string;
  readonly tipo: 'contrato' | 'nomina';
  readonly nombre: string;
  readonly mime: string;
  readonly bytes: number;
  readonly subidoEn: string;
  readonly subidoPor: string | null;
  /** Solo en las nóminas (0128): de qué mes es, «AAAA-MM», y su bruto y su neto si se saben. */
  readonly mes?: string;
  readonly brutoCentimos?: number | null;
  readonly netoCentimos?: number | null;
}

export interface LaFicha {
  /** Nula si nadie la ha rellenado todavía. */
  readonly laboral: FichaLaboral | null;
  /** Solo para quien ve lo privado; y dentro, nula si no hay nada escrito. */
  readonly privada?: FichaPrivada | null;
  /** Solo para quien ve lo privado: el contrato, del último al primero. */
  readonly documentos?: readonly DocumentoDeLaFicha[];
  /** Solo para quien ve lo privado: sus nóminas, de la más nueva a la más vieja (0128). */
  readonly nominas?: readonly DocumentoDeLaFicha[];
  /** Lo calcula Estook con la ficha (nunca la IA). Nulo si falta cuántos días hay al año. */
  readonly vacaciones: SaldoDeVacaciones | null;
  /** Si quien mira ve lo privado (el DNI, el sueldo, el contrato). */
  readonly veLoPrivado: boolean;
  /** Si quien mira puede rellenarla o subir el contrato: no la suya, y no hacia arriba. */
  readonly puedeRellenarla: boolean;
}

/**
 * Lo gastado de vacaciones este año (la Ampliación 4 · 2): lo disfrutado antes de hoy y lo aprobado
 * de hoy en adelante, de sus solicitudes aprobadas en la organización. Las lee quien puede verlas
 * (la persona y quien gestiona sus vacaciones): a cualquier otro, cero filas.
 */
export async function loGastadoDeVacaciones(
  contexto: Contexto,
  personaId: string,
  organizacionId: string,
  hoy: string,
): Promise<{ disfrutadas: number; porDisfrutar: number }> {
  const ano = Number(hoy.slice(0, 4));
  // Cada una, con los días que libraba cuando se pidió (0130): nulo es en naturales.
  const filas = await contexto.sql<{ desde: string; hasta: string; libra: string | null }[]>`
    select to_char(desde, 'YYYY-MM-DD') as desde, to_char(hasta, 'YYYY-MM-DD') as hasta,
           array_to_string(libra, ',') as libra
      from estook.solicitud_de_vacaciones
     where persona_id = ${personaId} and organizacion_id = ${organizacionId}
       and estado = 'aprobada'
       and desde <= ${`${String(ano)}-12-31`}::date and hasta >= ${`${String(ano)}-01-01`}::date
  `;
  let disfrutadas = 0;
  let porDisfrutar = 0;
  for (const f of filas) {
    const libra = f.libra === null || f.libra === '' ? null : f.libra.split(',').map(Number);
    const lo = loDeUnAno(f.desde, f.hasta, ano, hoy, libra);
    disfrutadas += lo.disfrutadas;
    porDisfrutar += lo.porDisfrutar;
  }
  return { disfrutadas, porDisfrutar };
}

/** La amplitud de rol más alta de una persona en la organización: para «no hacia arriba». */
export async function laAmplitud(
  contexto: Contexto,
  personaId: string,
  organizacionId: string,
): Promise<number> {
  const filas = await contexto.sql<{ amplitud: number | null }[]>`
    select max(r.amplitud) as amplitud
      from estook.membresia m join estook.rol r on r.codigo = m.rol
     where m.persona_id = ${personaId}
       and m.organizacion_id = ${organizacionId}
       and m.revocada_en is null
  `;
  return filas[0]?.amplitud ?? 0;
}

/**
 * Si quien pregunta puede rellenar la ficha de esa persona: tiene los datos del equipo
 * para editar, no es la suya, y no manda menos que ella (la regla del sueldo, 0027).
 */
export async function puedeRellenarLaFicha(
  contexto: Contexto,
  personaId: string,
  organizacionId: string,
): Promise<boolean> {
  if (contexto.personaId === null || contexto.personaId === personaId) return false;
  const filas = await contexto.sql<{ lleva: boolean }[]>`
    select estook.la_lleva(${personaId}::uuid, ${organizacionId}::uuid,
                           'dato.datos_del_equipo', true) as lleva
  `;
  if (filas[0]?.lleva !== true) return false;
  const mia = await laAmplitud(contexto, contexto.personaId, organizacionId);
  const suya = await laAmplitud(contexto, personaId, organizacionId);
  return mia > suya;
}

function numero(texto: string | null): number | null {
  return texto === null ? null : Number(texto);
}

/** La ficha entera de una persona, con lo que quien pregunta puede ver. */
export async function laFichaDe(
  contexto: Contexto,
  personaId: string,
  organizacionId: string,
  hoy: string,
): Promise<LaFicha> {
  const laborales = await contexto.sql<
    {
      incorporacion: string | null;
      contrato: string | null;
      jornada: string | null;
      horas_semanales: string | null;
      categoria: string | null;
      convenio: string | null;
      vacaciones_al_ano: string | null;
      vacaciones_en: string;
      pendientes_anteriores: string;
      origen: string;
      cambiada_en: string;
      cambiada_por: string | null;
    }[]
  >`
    select to_char(f.incorporacion, 'YYYY-MM-DD') as incorporacion, f.contrato, f.jornada,
           f.horas_semanales::text as horas_semanales, f.categoria, f.convenio,
           f.vacaciones_al_ano::text as vacaciones_al_ano, f.vacaciones_en,
           f.pendientes_anteriores::text as pendientes_anteriores, f.origen,
           to_char(f.cambiada_en, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as cambiada_en,
           p.nombre as cambiada_por
      from estook.ficha_laboral f
      left join estook.persona p on p.id = f.cambiada_por
     where f.persona_id = ${personaId} and f.organizacion_id = ${organizacionId}
  `;
  const l = laborales[0];
  const laboral: FichaLaboral | null =
    l === undefined
      ? null
      : {
          incorporacion: l.incorporacion,
          contrato: l.contrato !== null && esTipoDeContrato(l.contrato) ? l.contrato : null,
          jornada: l.jornada as Jornada | null,
          horasSemanales: numero(l.horas_semanales),
          categoria: l.categoria,
          convenio: l.convenio,
          vacacionesAlAno: numero(l.vacaciones_al_ano),
          vacacionesEn: l.vacaciones_en as VacacionesEn,
          pendientesAnteriores: Number(l.pendientes_anteriores),
          origen: l.origen as 'a_mano' | 'contrato',
          cambiadaEn: l.cambiada_en,
          cambiadaPor: l.cambiada_por,
        };

  // Lo privado: si quien pregunta lo ve lo dice la base, con la misma función que sus
  // políticas. Si no, ni se pregunta.
  const permiso = await contexto.sql<{ ve: boolean }[]>`
    select (${personaId}::uuid = estook.persona_actual()
            or estook.la_lleva(${personaId}::uuid, ${organizacionId}::uuid,
                               'dato.datos_del_equipo', false)) as ve
  `;
  const veLoPrivado = permiso[0]?.ve === true;

  let privada: FichaPrivada | null = null;
  let documentos: DocumentoDeLaFicha[] = [];
  let nominas: DocumentoDeLaFicha[] = [];
  if (veLoPrivado) {
    const privadas = await contexto.sql<
      {
        dni: string | null;
        telefono: string | null;
        domicilio: string | null;
        sueldo_centimos: string | null;
        sueldo_es: string | null;
        sueldo_cada: string | null;
        pagas: number | null;
      }[]
    >`
      select dni, telefono, domicilio, sueldo_centimos::text as sueldo_centimos,
             sueldo_es, sueldo_cada, pagas
        from estook.ficha_privada
       where persona_id = ${personaId} and organizacion_id = ${organizacionId}
    `;
    const p = privadas[0];
    privada =
      p === undefined
        ? null
        : {
            dni: p.dni,
            telefono: p.telefono,
            domicilio: p.domicilio,
            sueldoCentimos: numero(p.sueldo_centimos),
            sueldoEs: p.sueldo_es as 'bruto' | 'neto' | null,
            sueldoCada: p.sueldo_cada as 'mes' | 'ano' | null,
            pagas: p.pagas,
          };

    const filas = await contexto.sql<
      {
        id: string;
        tipo: string;
        nombre: string;
        mime: string;
        bytes: number;
        subido_en: string;
        subido_por: string | null;
        mes: string | null;
        bruto_centimos: string | null;
        neto_centimos: string | null;
      }[]
    >`
      select d.id::text as id, d.tipo, d.nombre, d.mime, d.bytes,
             to_char(d.subido_en, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as subido_en,
             p.nombre as subido_por, to_char(d.mes, 'YYYY-MM') as mes,
             d.bruto_centimos::text as bruto_centimos, d.neto_centimos::text as neto_centimos
        from estook.documento_de_persona d
        left join estook.persona p on p.id = d.subido_por
       where d.persona_id = ${personaId} and d.organizacion_id = ${organizacionId}
       order by d.mes desc nulls last, d.subido_en desc, d.nombre
       limit 80
    `;
    const comoDocumento = (d: (typeof filas)[number]): DocumentoDeLaFicha => ({
      documentoId: d.id,
      tipo: d.tipo as 'contrato' | 'nomina',
      nombre: d.nombre,
      mime: d.mime,
      bytes: d.bytes,
      subidoEn: d.subido_en,
      subidoPor: d.subido_por,
      ...(d.mes === null
        ? {}
        : {
            mes: d.mes,
            brutoCentimos: numero(d.bruto_centimos),
            netoCentimos: numero(d.neto_centimos),
          }),
    });
    documentos = filas.filter((d) => d.tipo === 'contrato').map(comoDocumento);
    nominas = filas.filter((d) => d.tipo === 'nomina').map(comoDocumento);
  }

  // Lo disfrutado y lo aprobado por disfrutar este año, de sus vacaciones aprobadas (la
  // Ampliación 4 · 2): lo cuenta Estook, cada una como se contó al pedirla (0130).
  const gastado =
    laboral === null
      ? { disfrutadas: 0, porDisfrutar: 0 }
      : await loGastadoDeVacaciones(contexto, personaId, organizacionId, hoy);
  const vacaciones =
    laboral === null
      ? null
      : elSaldoDeVacaciones({
          alAno: laboral.vacacionesAlAno,
          incorporacion: laboral.incorporacion,
          hoy,
          pendientes: laboral.pendientesAnteriores,
          disfrutadas: gastado.disfrutadas,
          aprobadas: gastado.porDisfrutar,
        });

  return {
    laboral,
    ...(veLoPrivado ? { privada, documentos, nominas } : {}),
    vacaciones,
    veLoPrivado,
    puedeRellenarla: await puedeRellenarLaFicha(contexto, personaId, organizacionId),
  };
}
