import {
  comoSeLlamaElDia,
  diaDeLaSemana,
  fechaOperativa,
  masDias,
  ventasPrevistas,
  type FechaOperativa,
} from '@estook/dominio';
import type { Contexto } from './contrato.ts';
import { elEquipoDelHorario, laSemana, loPublicado, nombreCorto, type Zona } from './horario.ts';

/**
 * Lo que sabe Fogón para hacer el cuadrante (Fogón 1 · 3, decisión 0098), **sin un solo
 * nombre para el modelo**: cada persona va con un código (P1, P2…), su zona y sus horas
 * de contrato, y aquí se vuelve a saber quién es. Richi (19-oct): «ya tiene horas de
 * cada uno en su lista, no lo pregunta».
 *
 * Todo sale de lo que ya hay, gratis y sin IA:
 *
 *   · **Las horas de contrato**, las del Equipo (`horas_de_contrato`, H1).
 *   · **Qué libró cada uno la semana pasada**, del horario publicado: para que haya
 *     rotación y no le toque siempre el lunes al mismo.
 *   · **Los turnos habituales del local**, de las cuatro semanas de antes: a qué horas
 *     se entra y se sale de verdad, por zona.
 *   · **Los días fuertes**, de las ventas de las cuatro semanas de antes; sin caja,
 *     viernes y sábado, que es lo normal. Se proponen y la persona los cambia.
 */

export interface PersonaParaElCuadrante {
  readonly personaId: string;
  /** «Rosa I.»: lo que ve la persona, nunca el modelo. */
  readonly nombre: string;
  /** «P1»: lo que ve el modelo. */
  readonly codigo: string;
  readonly zona: Zona;
  readonly horasDeContrato: number | null;
  /** «lunes», «martes»: los días sin trabajo de la semana pasada. Vacío si no salía. */
  readonly libroLaSemanaPasada: readonly string[];
}

/** El equipo del horario, con su código para el modelo. */
export async function lasPersonasDelCuadrante(
  contexto: Contexto,
  localId: string,
  lunes: FechaOperativa,
): Promise<readonly PersonaParaElCuadrante[]> {
  const equipo = await elEquipoDelHorario(contexto, localId);
  const horas = await contexto.sql<{ persona_id: string; horas: string | null }[]>`
    select persona_id::text as persona_id, horas::text as horas
      from estook.horas_de_contrato(${localId}::uuid, ${masDias(lunes, 6)}::date)
  `;
  const horasDe = new Map(
    horas.map((h) => [h.persona_id, h.horas === null ? null : Number(h.horas)] as const),
  );

  const pasada = await laSemana(contexto, localId, masDias(lunes, -7));
  const publicado =
    pasada === null || pasada.publicadaEn === null ? [] : await loPublicado(contexto, pasada.id);
  const losDias = [0, 1, 2, 3, 4, 5, 6].map((i) => masDias(masDias(lunes, -7), i));

  return equipo.map((p, i) => {
    const suyos = publicado.filter((t) => t.personaId === p.personaId);
    const trabajo = new Set(suyos.filter((t) => t.tipo === 'trabajo').map((t) => t.dia));
    return {
      personaId: p.personaId,
      nombre: nombreCorto(p),
      codigo: `P${String(i + 1)}`,
      zona: p.zona,
      horasDeContrato: horasDe.get(p.personaId) ?? null,
      libroLaSemanaPasada:
        suyos.length === 0
          ? []
          : losDias
              .filter((d) => !trabajo.has(d))
              .map((d) => comoSeLlamaElDia(diaDeLaSemana(fechaOperativa(d)))),
    };
  });
}

/** Cuántos turnos habituales se dicen por zona. */
const TURNOS_POR_ZONA = 3;

/**
 * Los turnos habituales del local, en llano: «Cocina: 10:00–16:00, 19:00–23:30. Sala:
 * 12:30–16:30, 20:00–00:00». Los que más se repiten en las cuatro semanas de antes. Vacío
 * si todavía no hay horario.
 */
export async function losTurnosHabituales(
  contexto: Contexto,
  localId: string,
  lunes: FechaOperativa,
): Promise<string> {
  const equipo = await elEquipoDelHorario(contexto, localId);
  const zonaDe = new Map(equipo.map((p) => [p.personaId, p.zona] as const));
  const filas = await contexto.sql<{ persona_id: string; entra: string; sale: string }[]>`
    select t.persona_id::text as persona_id,
           to_char(t.entra, 'HH24:MI') as entra, to_char(t.sale, 'HH24:MI') as sale
      from estook.turno_publicado t
      join estook.semana_de_horario s on s.id = t.semana_id
     where s.local_id = ${localId}::uuid
       and s.lunes >= ${masDias(lunes, -28)}::date and s.lunes < ${lunes}::date
       and t.tipo = 'trabajo' and t.entra is not null and t.sale is not null
  `;
  const cuenta = new Map<string, Map<string, number>>();
  for (const f of filas) {
    const zona = zonaDe.get(f.persona_id) ?? 'otros';
    const deLaZona = cuenta.get(zona) ?? new Map<string, number>();
    const tramo = `${f.entra}–${f.sale}`;
    deLaZona.set(tramo, (deLaZona.get(tramo) ?? 0) + 1);
    cuenta.set(zona, deLaZona);
  }
  const NOMBRE: Readonly<Record<string, string>> = {
    cocina: 'Cocina',
    sala: 'Sala',
    otros: 'Otros',
  };
  return ['cocina', 'sala', 'otros']
    .filter((z) => cuenta.has(z))
    .map((z) => {
      const tramos = [...(cuenta.get(z) ?? new Map<string, number>()).entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, TURNOS_POR_ZONA)
        .map(([t]) => t)
        .sort();
      return `${NOMBRE[z] ?? z}: ${tramos.join(', ')}`;
    })
    .join('. ');
}

/**
 * Los días fuertes que se proponen: los de más venta según las cuatro semanas de antes
 * (los dos primeros y los que se les acercan), o viernes y sábado si no hay caja. Solo
 * qué días, nunca cuánto: eso es de quien ve ventas.
 */
export async function losDiasFuertes(
  contexto: Contexto,
  localId: string,
  lunes: FechaOperativa,
): Promise<{ readonly dias: readonly string[]; readonly segunTusVentas: boolean }> {
  const filas = await contexto.sql<{ fecha: string; centimos: string }[]>`
    select to_char(c.fecha_operativa, 'YYYY-MM-DD') as fecha, c.total_centimos::text as centimos
      from estook.cierre_de_caja c
     where c.local_id = ${localId}::uuid
       and c.fecha_operativa >= ${masDias(lunes, -28)}::date
       and c.fecha_operativa < ${lunes}::date
  `;
  const previstas = ventasPrevistas(
    filas.map((f) => ({ fecha: f.fecha, centimos: Number(f.centimos) })),
    lunes,
  );
  if (previstas === null || previstas.totalCentimos <= 0) {
    return { dias: [masDias(lunes, 4), masDias(lunes, 5)], segunTusVentas: false };
  }
  const orden = previstas.porDia.map((c, i) => ({ c, i })).sort((a, b) => b.c - a.c);
  const segundo = orden[1]?.c ?? 0;
  const dias = orden
    .filter((d, i) => i < 2 || (d.c > 0 && d.c >= segundo * 0.9))
    .slice(0, 3)
    .map((d) => masDias(lunes, d.i))
    .sort();
  return { dias, segunTusVentas: true };
}
