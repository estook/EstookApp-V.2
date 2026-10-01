import { z } from 'zod';
import {
  avisosDelHorario,
  comoSeLeeElDia,
  comoSeLeenLasHoras,
  costeDelHorario,
  fechaOperativa,
  laSemanaEnLetra,
  loQueHaCambiado,
  masDias,
  minutosDeTrabajo,
  parteDePersonal,
  ventasPrevistas,
  COMO_SE_DICE_LA_AUSENCIA,
  type AvisoDelHorario,
  type FechaOperativa,
  type Retribucion,
  type TurnoDelHorario,
} from '@estook/dominio';
import {
  documentoDeMiHorario,
  documentoDelHorario,
  type DiaDelHorario,
  type GrupoDelHorario,
} from '@estook/documentos';
import { consulta, FalloDeAplicacion, type Contexto } from '../contrato.ts';
import { hacerElPdf, hechoEl, laMarcaDelLocal, type UnPdf } from '../documentos.ts';
import {
  elBorrador,
  elEquipoDelHorario,
  elLocalDelHorario,
  laSemana,
  laSemanaQueToca,
  loPublicado,
  losDias,
  nombreCorto,
  unLunes,
  type DiaDeLaSemana,
  type PersonaDelHorario,
  type TurnoLeido,
  type Zona,
} from '../horario.ts';

/**
 * El horario de la semana (H2 · decisiones 0068 y 0069).
 *
 *   el_horario              lo publicado, que ve todo el equipo del local: el de
 *                           todos, o solo el suyo. Horas, nunca euros.
 *   el_horario_en_borrador  lo que se está montando, con sus avisos y, para quien
 *                           puede verlo, lo que cuesta. Solo quien monta el horario.
 *   el_horario_en_pdf       lo publicado en papel: el de la pared o el de cada uno.
 */

const entradaDeLaSemana = z.object({ lunes: unLunes.optional() }).strict();

export interface TurnoVisto {
  readonly id: string;
  readonly personaId: string;
  readonly dia: string;
  readonly tipo: TurnoDelHorario['tipo'];
  readonly entra: string | null;
  readonly sale: string | null;
  readonly descansoMinutos: number;
  readonly nota: string | null;
  /** Lo que se trabaja en él, sin el descanso. */
  readonly minutos: number;
}

function visto(t: TurnoLeido): TurnoVisto {
  return { ...t, minutos: minutosDeTrabajo(t) };
}

export interface PersonaEnElHorario extends PersonaDelHorario {
  /** Lo que trabaja esa semana, sin descansos. */
  readonly minutos: number;
}

function conSusMinutos(
  personas: readonly PersonaDelHorario[],
  turnos: readonly TurnoLeido[],
): PersonaEnElHorario[] {
  return personas.map((p) => ({
    ...p,
    minutos: turnos
      .filter((t) => t.personaId === p.personaId)
      .reduce((suma, t) => suma + minutosDeTrabajo(t), 0),
  }));
}

// ── Lo publicado ─────────────────────────────────────────────────────────────

export interface SalidaElHorario {
  readonly lunes: string;
  /** «del 5 al 11 de octubre». */
  readonly semana: string;
  readonly hoy: string;
  readonly dias: readonly DiaDeLaSemana[];
  readonly publicado: boolean;
  readonly publicadaEn: string | null;
  readonly publicadaPor: string | null;
  /** Quien sale esa semana, y yo aunque no salga. */
  readonly personas: readonly PersonaEnElHorario[];
  readonly turnos: readonly TurnoVisto[];
  readonly yo: string;
  /** Si quien mira monta el horario: entonces la pantalla le ofrece el borrador. */
  readonly puedoMontarlo: boolean;
}

export const elHorario = consulta<z.infer<typeof entradaDeLaSemana>, SalidaElHorario>({
  nombre: 'el_horario',
  entrada: entradaDeLaSemana,

  async ejecutar(contexto, entrada) {
    if (!contexto.personaId) throw new FalloDeAplicacion('sin_sesion');
    const localId = elLocalDelHorario(contexto);
    const { hoy, lunes } = await laSemanaQueToca(contexto, localId, entrada.lunes);
    const semana = await laSemana(contexto, localId, lunes);
    const publicada = semana !== null && semana.publicadaEn !== null;
    const turnos = publicada ? await loPublicado(contexto, semana.id) : [];

    const equipo = await elEquipoDelHorario(contexto, localId);
    const salen = new Set([...turnos.map((t) => t.personaId), contexto.personaId]);
    const puede = await contexto.sql<{ puede: boolean }[]>`
      select estook.puede_editar('accion.publicar_cuadrante', ${localId}::uuid) as puede
    `;

    return {
      lunes,
      semana: laSemanaEnLetra(lunes),
      hoy,
      dias: losDias(lunes),
      publicado: publicada,
      publicadaEn: semana?.publicadaEn ?? null,
      publicadaPor: semana?.publicadaPor ?? null,
      personas: conSusMinutos(
        equipo.filter((p) => salen.has(p.personaId)),
        turnos,
      ),
      turnos: turnos.map(visto),
      yo: contexto.personaId,
      puedoMontarlo: puede[0]?.puede === true,
    };
  },
});

// ── El borrador ──────────────────────────────────────────────────────────────

export type EstadoDeLaSemana = 'nueva' | 'borrador' | 'publicada' | 'con_cambios';

export interface PersonaEnElBorrador extends PersonaEnElHorario {
  /** Sus horas de contrato a la semana, o nulo si no tiene (se compara con 40). */
  readonly horasDeContrato: number | null;
  /** Solo con `dato.coste_de_personal`. Nulo si no tiene sueldo puesto. */
  readonly costeCentimos?: number | null;
}

export interface CosteDeLaSemana {
  readonly totalCentimos: number;
  /** Quien trabaja esa semana sin sueldo puesto: no suma, y se dice cuántos. */
  readonly sinSueldo: number;
  /** Lo que se espera vender, o nulo si todavía no se sabe. */
  readonly ventasPrevistasCentimos: number | null;
  /** Qué parte de lo previsto se va en personal. */
  readonly parteDePersonal: number | null;
  readonly porDia: readonly {
    readonly costeCentimos: number;
    readonly ventasCentimos: number | null;
  }[];
}

export interface CambioQueSeAvisara {
  readonly personaId: string;
  readonly nombre: string;
  readonly dias: readonly string[];
}

export interface SalidaElBorrador {
  readonly lunes: string;
  readonly semana: string;
  readonly hoy: string;
  readonly dias: readonly DiaDeLaSemana[];
  readonly estado: EstadoDeLaSemana;
  readonly publicadaEn: string | null;
  readonly publicadaPor: string | null;
  readonly personas: readonly PersonaEnElBorrador[];
  readonly turnos: readonly TurnoVisto[];
  readonly avisos: readonly AvisoDelHorario[];
  /** Lo que se avisará al volver a publicar: solo a quien le cambia algo. */
  readonly cambiosSinPublicar: readonly CambioQueSeAvisara[];
  readonly puedeVerCostes: boolean;
  readonly coste?: CosteDeLaSemana;
}

async function lasRetribuciones(
  contexto: Contexto,
  localId: string,
  lunes: FechaOperativa,
): Promise<Map<string, Retribucion | null>> {
  // La vigente **el domingo**, al acabar la semana, como el Resumen de Equipo, que
  // cuenta un periodo con la de su final: quien se incorpora el jueves con su sueldo
  // puesto ese día cuesta esa semana. La del local antes que la de toda la
  // organización, y solo la lee quien ve el coste de personal (0027).
  const domingo = masDias(lunes, 6);
  const filas = await contexto.sql<
    { persona_id: string; forma: string; importe: string; horas: string | null }[]
  >`
    select distinct on (re.persona_id)
           re.persona_id::text as persona_id, re.forma::text as forma,
           re.importe_centimos::text as importe, re.horas_semanales::text as horas
      from estook.retribucion re
     where (re.local_id is null or re.local_id = ${localId})
       and re.desde <= ${domingo}::date
       and (re.hasta is null or re.hasta >= ${domingo}::date)
     order by re.persona_id, re.local_id nulls last, re.desde desc
  `;
  return new Map(
    filas.map((f) => [
      f.persona_id,
      {
        forma: f.forma as Retribucion['forma'],
        importeCentimos: Number(f.importe),
        horasSemanales: f.horas === null ? null : Number(f.horas),
      },
    ]),
  );
}

async function lasVentasDeAntes(
  contexto: Contexto,
  localId: string,
  lunes: FechaOperativa,
): Promise<{ fecha: string; centimos: number }[]> {
  const filas = await contexto.sql<{ fecha: string; centimos: string }[]>`
    select to_char(c.fecha_operativa, 'YYYY-MM-DD') as fecha, c.total_centimos::text as centimos
      from estook.cierre_de_caja c
     where c.local_id = ${localId}
       and c.fecha_operativa >= ${masDias(lunes, -28)}::date
       and c.fecha_operativa < ${lunes}::date
  `;
  return filas.map((f) => ({ fecha: f.fecha, centimos: Number(f.centimos) }));
}

export const elHorarioEnBorrador = consulta<z.infer<typeof entradaDeLaSemana>, SalidaElBorrador>({
  nombre: 'el_horario_en_borrador',
  entrada: entradaDeLaSemana,
  exige: 'accion.publicar_cuadrante',

  async ejecutar(contexto, entrada) {
    if (!contexto.personaId) throw new FalloDeAplicacion('sin_sesion');
    const localId = elLocalDelHorario(contexto);
    const { hoy, lunes } = await laSemanaQueToca(contexto, localId, entrada.lunes);
    const semana = await laSemana(contexto, localId, lunes);
    const borrador = semana === null ? [] : await elBorrador(contexto, semana.id);
    const publicado =
      semana !== null && semana.publicadaEn !== null ? await loPublicado(contexto, semana.id) : [];

    const equipo = await elEquipoDelHorario(contexto, localId);
    const horas = await contexto.sql<{ persona_id: string; horas: string }[]>`
      select persona_id::text as persona_id, horas::text as horas
        from estook.horas_de_contrato(${localId}::uuid, ${masDias(lunes, 6)}::date)
    `;
    const horasDe = new Map<string, number | null>(
      horas.map((h) => [h.persona_id, Number(h.horas)] as const),
    );

    const estado: EstadoDeLaSemana =
      semana === null
        ? 'nueva'
        : semana.publicadaEn === null
          ? 'borrador'
          : semana.conCambios
            ? 'con_cambios'
            : 'publicada';

    const nombres = new Map(equipo.map((p) => [p.personaId, nombreCorto(p)] as const));
    const cambios =
      semana !== null && semana.publicadaEn !== null
        ? loQueHaCambiado(publicado, borrador, lunes).map((c) => ({
            personaId: c.personaId,
            nombre: nombres.get(c.personaId) ?? 'Alguien',
            dias: c.dias,
          }))
        : [];

    const conCostes = await contexto.sql<{ puede: boolean }[]>`
      select estook.puede_ver('dato.coste_de_personal', ${localId}::uuid) as puede
    `;
    const puedeVerCostes = conCostes[0]?.puede === true;

    const personas = conSusMinutos(equipo, borrador).map((p) => ({
      ...p,
      horasDeContrato: horasDe.get(p.personaId) ?? null,
    }));

    const base: SalidaElBorrador = {
      lunes,
      semana: laSemanaEnLetra(lunes),
      hoy,
      dias: losDias(lunes),
      estado,
      publicadaEn: semana?.publicadaEn ?? null,
      publicadaPor: semana?.publicadaPor ?? null,
      personas,
      turnos: borrador.map(visto),
      avisos: avisosDelHorario(borrador, lunes, horasDe),
      cambiosSinPublicar: cambios,
      puedeVerCostes,
    };

    // **Un rol sin costes no recibe ni un campo de coste** (0027): no se esconde en
    // la pantalla, no se envía.
    if (!puedeVerCostes) return base;

    const retribuciones = await lasRetribuciones(contexto, localId, lunes);
    const coste = costeDelHorario(borrador, retribuciones);
    const previstas = ventasPrevistas(await lasVentasDeAntes(contexto, localId, lunes), lunes);
    const porDia = losDias(lunes).map((d, i) => ({
      costeCentimos: costeDelHorario(
        borrador.filter((t) => t.dia === d.fecha),
        retribuciones,
      ).totalCentimos,
      ventasCentimos: previstas === null ? null : (previstas.porDia[i] ?? 0),
    }));

    return {
      ...base,
      personas: personas.map((p) => ({
        ...p,
        costeCentimos: p.minutos === 0 ? 0 : (coste.porPersona.get(p.personaId) ?? null),
      })),
      coste: {
        totalCentimos: coste.totalCentimos,
        sinSueldo: coste.sinSueldo.length,
        ventasPrevistasCentimos: previstas?.totalCentimos ?? null,
        parteDePersonal: parteDePersonal(coste.totalCentimos, previstas?.totalCentimos ?? null),
        porDia,
      },
    };
  },
});

// ── En PDF ───────────────────────────────────────────────────────────────────

const entradaDelPdf = z
  .object({
    lunes: unLunes,
    /** «todos»: el de la pared. «mio»: el de quien lo pide. */
    de: z.enum(['todos', 'mio']),
  })
  .strict();

const COMO_SE_LLAMA_LA_ZONA: Readonly<Record<Zona, string>> = {
  sala: 'Sala',
  cocina: 'Cocina',
  otros: 'El resto del equipo',
};

function elDiaEnPapel(turnos: readonly TurnoLeido[]): DiaDelHorario {
  const ausencia = turnos.find((t) => t.tipo !== 'trabajo');
  if (ausencia !== undefined && ausencia.tipo !== 'trabajo') {
    return { tramos: [], ausencia: COMO_SE_DICE_LA_AUSENCIA[ausencia.tipo] };
  }
  return {
    tramos: turnos
      .filter((t) => t.tipo === 'trabajo')
      .map((t) => comoSeLeeElDia([t]))
      .sort(),
    ausencia: null,
  };
}

/** «Publicado el 3 de octubre por Rosa». */
function publicadoPor(
  semana: { publicadaEn: string | null; publicadaPor: string | null },
  zona: string,
): string {
  if (semana.publicadaEn === null) return 'Sin publicar';
  const dia = new Intl.DateTimeFormat('es-ES', {
    timeZone: zona,
    day: 'numeric',
    month: 'long',
  }).format(new Date(semana.publicadaEn));
  return `Publicado el ${dia}${semana.publicadaPor === null ? '' : ` por ${semana.publicadaPor}`}`;
}

export const elHorarioEnPdf = consulta<z.infer<typeof entradaDelPdf>, UnPdf>({
  nombre: 'el_horario_en_pdf',
  entrada: entradaDelPdf,

  async ejecutar(contexto, entrada) {
    if (!contexto.personaId) throw new FalloDeAplicacion('sin_sesion');
    const localId = elLocalDelHorario(contexto);
    const lunes = fechaOperativa(entrada.lunes);
    const semana = await laSemana(contexto, localId, lunes);
    if (semana === null || semana.publicadaEn === null) {
      throw new FalloDeAplicacion('faltan_datos', {
        porque: 'Esta semana todavía no está publicada: en papel sale lo que ve el equipo.',
      });
    }
    const turnos = await loPublicado(contexto, semana.id);
    const equipo = await elEquipoDelHorario(contexto, localId);
    const marca = await laMarcaDelLocal(contexto, localId);
    const dias = losDias(lunes);
    const publicado = publicadoPor(semana, marca.zonaHoraria);
    const horasDe = (personaId: string) =>
      comoSeLeenLasHoras(
        turnos
          .filter((t) => t.personaId === personaId)
          .reduce((suma, t) => suma + minutosDeTrabajo(t), 0),
      );

    if (entrada.de === 'mio') {
      const yo = equipo.find((p) => p.personaId === contexto.personaId);
      const mios = turnos.filter((t) => t.personaId === contexto.personaId);
      const html = documentoDeMiHorario({
        marca,
        semana: laSemanaEnLetra(lunes),
        hechoEl: hechoEl(contexto.ahora, marca.zonaHoraria),
        persona:
          yo === undefined
            ? 'Mi horario'
            : `${yo.nombre}${yo.apellidos === null ? '' : ` ${yo.apellidos}`}`,
        dias: dias.map((d) => {
          const delDia = mios.filter((t) => t.dia === d.fecha);
          const minutos = delDia.reduce((suma, t) => suma + minutosDeTrabajo(t), 0);
          return {
            dia: `${d.largo.charAt(0).toUpperCase()}${d.largo.slice(1)}`,
            ...elDiaEnPapel(delDia),
            horas: minutos === 0 ? '' : comoSeLeenLasHoras(minutos),
          };
        }),
        total: horasDe(contexto.personaId),
        publicado,
      });
      return hacerElPdf(contexto, html, {
        nombre: `mi-horario-${lunes}.pdf`,
        pie: `Mi horario · ${marca.nombreDelLocal} · ${laSemanaEnLetra(lunes)}`,
      });
    }

    const salen = new Set(turnos.map((t) => t.personaId));
    const grupos: GrupoDelHorario[] = (['sala', 'cocina', 'otros'] as const).map((zona) => ({
      nombre: COMO_SE_LLAMA_LA_ZONA[zona],
      filas: equipo
        .filter((p) => p.zona === zona && salen.has(p.personaId))
        .map((p) => ({
          persona: nombreCorto(p),
          puesto: p.rolNombre,
          dias: dias.map((d) =>
            elDiaEnPapel(turnos.filter((t) => t.personaId === p.personaId && t.dia === d.fecha)),
          ),
          horas: horasDe(p.personaId),
        })),
    }));

    const html = documentoDelHorario({
      marca,
      semana: laSemanaEnLetra(lunes),
      hechoEl: hechoEl(contexto.ahora, marca.zonaHoraria),
      dias: dias.map((d) => d.corto),
      grupos,
      publicado,
    });
    return hacerElPdf(contexto, html, {
      nombre: `horario-${lunes}.pdf`,
      pie: `Horario · ${marca.nombreDelLocal} · ${laSemanaEnLetra(lunes)}`,
      apaisado: true,
    });
  },
});
