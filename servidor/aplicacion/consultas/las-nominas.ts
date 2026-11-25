import { z } from 'zod';
import { elMesPasado, fechaOperativa } from '@estook/dominio';
import { elLocalDeLaSesion, laOrganizacionDeLaSesion } from '../alta.ts';
import { consulta, type Contexto } from '../contrato.ts';
import { elReloj } from './equipo.ts';

/**
 * Equipo › Nóminas (la Ampliación 3 · 2, decisión 0153; la maqueta, pestaña 3).
 *
 * **Mes a mes, qué nómina tiene cada uno y a quién le falta.** Lo que se lista lo deciden las
 * políticas de la 0127: las nóminas de quien lleva los datos del equipo. «Le falta» es a quien
 * tiene ficha (un contrato puesto) y empezó antes de acabar ese mes.
 */

export interface NominaDelEquipo {
  readonly documentoId: string;
  readonly personaId: string;
  readonly nombre: string;
  readonly apellidos: string | null;
  readonly brutoCentimos: number | null;
  readonly netoCentimos: number | null;
  readonly subidaEn: string;
  readonly mime: string;
}

export interface UnMesDeNominas {
  /** «AAAA-MM». */
  readonly mes: string;
  readonly nominas: readonly NominaDelEquipo[];
  readonly faltan: readonly {
    readonly personaId: string;
    readonly nombre: string;
    readonly apellidos: string | null;
  }[];
}

export interface LasNominasDelEquipo {
  readonly meses: readonly UnMesDeNominas[];
  /** El mes que se propone al subir: el que acaba de terminar. */
  readonly mesPropuesto: string;
}

/** Los meses que se enseñan: el pasado siempre, y los que tengan nóminas, hasta seis. */
const MESES_A_LA_VISTA = 6;

async function hoyDelLocal(contexto: Contexto, localId: string): Promise<string> {
  const reloj = await elReloj(contexto, localId);
  return fechaOperativa(reloj.jornada);
}

export const lasNominasDelEquipo = consulta<Record<string, never>, LasNominasDelEquipo>({
  nombre: 'las_nominas_del_equipo',
  entrada: z.object({}).strict(),
  exige: 'dato.datos_del_equipo',

  async ejecutar(contexto) {
    const organizacionId = laOrganizacionDeLaSesion(contexto);
    const localId = elLocalDeLaSesion(contexto);
    const hoy = await hoyDelLocal(contexto, localId);
    const mesPropuesto = elMesPasado(hoy);

    const filas = await contexto.sql<
      {
        id: string;
        persona_id: string;
        nombre: string;
        apellidos: string | null;
        mes: string;
        bruto_centimos: string | null;
        neto_centimos: string | null;
        subida_en: string;
        mime: string;
      }[]
    >`
      select d.id::text as id, d.persona_id::text as persona_id, p.nombre, p.apellidos,
             to_char(d.mes, 'YYYY-MM') as mes,
             d.bruto_centimos::text as bruto_centimos, d.neto_centimos::text as neto_centimos,
             to_char(d.subido_en, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as subida_en, d.mime
        from estook.documento_de_persona d
        join estook.persona p on p.id = d.persona_id
       where d.organizacion_id = ${organizacionId}
         and d.tipo = 'nomina'
         and d.mes >= (${`${mesPropuesto}-01`}::date - interval '12 months')
       order by d.mes desc, p.nombre, p.apellidos, d.subido_en desc
    `;

    // Quien tiene ficha en la organización, y desde cuándo: a quien le puede faltar una nómina.
    const conFicha = await contexto.sql<
      {
        persona_id: string;
        nombre: string;
        apellidos: string | null;
        incorporacion: string | null;
      }[]
    >`
      select f.persona_id::text as persona_id, p.nombre, p.apellidos,
             to_char(f.incorporacion, 'YYYY-MM-DD') as incorporacion
        from estook.ficha_laboral f
        join estook.persona p on p.id = f.persona_id
       where f.organizacion_id = ${organizacionId}
         and f.persona_id <> ${contexto.personaId}::uuid
         and estook.la_lleva(f.persona_id, ${organizacionId}::uuid, 'dato.datos_del_equipo', false)
         and exists (
           select 1 from estook.membresia m
            where m.persona_id = f.persona_id and m.organizacion_id = ${organizacionId}
              and m.revocada_en is null
         )
       order by p.nombre, p.apellidos
    `;

    const meses = [...new Set([mesPropuesto, ...filas.map((f) => f.mes)])]
      .sort()
      .reverse()
      .slice(0, MESES_A_LA_VISTA);

    return {
      mesPropuesto,
      meses: meses.map((mes) => {
        const delMes = filas.filter((f) => f.mes === mes);
        const tienen = new Set(delMes.map((f) => f.persona_id));
        // Empezó antes de acabar el mes (o no se sabe cuándo): le toca nómina.
        const finDelMes = `${mes}-31`;
        return {
          mes,
          nominas: delMes.map((f) => ({
            documentoId: f.id,
            personaId: f.persona_id,
            nombre: f.nombre,
            apellidos: f.apellidos,
            brutoCentimos: f.bruto_centimos === null ? null : Number(f.bruto_centimos),
            netoCentimos: f.neto_centimos === null ? null : Number(f.neto_centimos),
            subidaEn: f.subida_en,
            mime: f.mime,
          })),
          faltan: conFicha
            .filter(
              (p) =>
                !tienen.has(p.persona_id) &&
                (p.incorporacion === null || p.incorporacion <= finDelMes),
            )
            .map((p) => ({ personaId: p.persona_id, nombre: p.nombre, apellidos: p.apellidos })),
        };
      }),
    };
  },
});
