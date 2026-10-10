import {
  escapar,
  paginaDelDocumento,
  unaMarca,
  unaNota,
  unaTabla,
  unParrafo,
  unTitulo,
  type MarcaDelDocumento,
} from './base.ts';

/**
 * El horario de la semana, en papel (H2 · decisión 0069).
 *
 * Dos documentos con la misma base:
 *
 *   · **El de la pared**: la semana entera del local, apaisada, una fila por
 *     persona y una columna por día, separada en sala, cocina y el resto. Es el que
 *     se imprime y se cuelga al lado del fichaje.
 *   · **El de cada uno**: lo suyo, día a día, con las horas. Es el que se le da a
 *     quien no tiene correo, o el que alguien se guarda en el móvil.
 *
 * **Solo horas, nunca euros**: el horario lo ve todo el equipo (0068), y en el papel
 * tampoco va lo que cuesta.
 */

/**
 * Un tramo en papel: las horas, y el descanso aparte (repaso del 10-oct).
 *
 * Iba todo en una línea, «12:00–18:30 (30 min de descanso)», y ese paréntesis
 * ensanchaba la columna de su día y estrechaba las demás. Ahora las horas van
 * grandes y el descanso, en pequeño debajo.
 */
export interface TramoEnPapel {
  /** «12:00–18:30». */
  readonly horas: string;
  /** «Descanso 30 min», o nulo si no tiene. */
  readonly descanso: string | null;
}

/** Lo que va en un día: sus tramos, o su ausencia. */
export interface DiaDelHorario {
  /** Uno por tramo, por orden. Vacío si no tiene nada. */
  readonly tramos: readonly TramoEnPapel[];
  /** «Libre», «Vacaciones», «Baja», o nulo si trabaja o no tiene nada. */
  readonly ausencia: string | null;
}

export interface FilaDelHorario {
  readonly persona: string;
  /** Su puesto, en pequeño debajo del nombre. */
  readonly puesto: string;
  /** Los siete días, de lunes a domingo. */
  readonly dias: readonly DiaDelHorario[];
  /** «38 h 30 min» a la semana. */
  readonly horas: string;
}

export interface GrupoDelHorario {
  /** «Sala», «Cocina», «El resto del equipo». */
  readonly nombre: string;
  readonly filas: readonly FilaDelHorario[];
}

export interface DatosDelHorario {
  readonly marca: MarcaDelDocumento;
  /** «del 5 al 11 de octubre». */
  readonly semana: string;
  readonly hechoEl: string;
  /** Las siete cabeceras: «Lun 5», «Mar 6»… */
  readonly dias: readonly string[];
  readonly grupos: readonly GrupoDelHorario[];
  /** «Publicado el 3 de octubre por Rosa». */
  readonly publicado: string;
  /** Si algún tramo acaba al día siguiente: entonces, y solo entonces, se dice. */
  readonly cruzaLaMedianoche?: boolean;
}

function elDia(dia: DiaDelHorario | undefined): { html: string } {
  if (dia === undefined) return { html: '' };
  if (dia.ausencia !== null) return { html: unaMarca(dia.ausencia) };
  if (dia.tramos.length === 0) return { html: '<span class="tenue">—</span>' };
  return {
    html: dia.tramos
      .map(
        (t) =>
          `<span class="tramo"><span class="entero">${escapar(t.horas)}</span>${
            t.descanso === null ? '' : `<small>${escapar(t.descanso)}</small>`
          }</span>`,
      )
      .join(''),
  };
}

/**
 * Lo propio del horario de la pared (repaso del 10-oct, «se ve algo raro»):
 *
 *   · **Una sola tabla** para todos los grupos, con una fila de título por grupo. Con
 *     una tabla por grupo, cada una repartía sus columnas a su manera y los días de
 *     Cocina no caían debajo de los del resto.
 *   · **Columnas fijas**: el nombre, siete días iguales y las horas. Un tramo largo
 *     ya no ensancha su día a costa de los demás.
 *   · **El nombre no se parte** («Alejandro / S.»), y el fin de semana va un poco
 *     sombreado, que es lo que se busca primero en la pared.
 */
const ESTILO_DE_LA_PARED = `
  table.semana { table-layout: fixed; }
  table.semana col.persona { width: 14%; }
  table.semana col.horas { width: 10%; }
  table.semana th, table.semana td { padding: 6px 5px; }
  table.semana td { border-left: 1px solid #EEF1F2; }
  table.semana td:first-child { border-left: 0; }
  table.semana td.persona { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 600; }
  table.semana td.persona small { font-weight: 400; overflow: hidden; text-overflow: ellipsis; }
  table.semana .finde { background: #F7F9FA; }
  table.semana td.numero { font-weight: 600; }
  table.semana tr.grupo th { padding: 14px 5px 4px; border-bottom: 1.5px solid currentColor;
    font-size: 8.5pt; letter-spacing: 0.07em; }
  table.semana tr.grupo:first-child th { padding-top: 4px; }
  .tramo { display: block; }
  .tramo small { white-space: nowrap; }
  .tramo + .tramo { margin-top: 4px; }
`;

export function documentoDelHorario(datos: DatosDelHorario): string {
  const grupos = datos.grupos.filter((g) => g.filas.length > 0);
  const finde = (i: number) => (i >= 5 ? ' finde' : '');

  const cabecera = `<tr><th>Persona</th>${datos.dias
    .map((d, i) => `<th class="${finde(i).trim()}">${escapar(d)}</th>`)
    .join('')}<th class="numero">Horas</th></tr>`;

  const cuerpo = grupos
    .map(
      (g) =>
        `<tr class="grupo"><th colspan="9" class="color">${escapar(g.nombre)}</th></tr>${g.filas
          .map(
            (f) =>
              `<tr><td class="persona">${escapar(f.persona)}${
                f.puesto === '' ? '' : `<small>${escapar(f.puesto)}</small>`
              }</td>${[0, 1, 2, 3, 4, 5, 6]
                .map((i) => `<td class="${finde(i).trim()}">${elDia(f.dias[i]).html}</td>`)
                .join('')}<td class="numero">${escapar(f.horas)}</td></tr>`,
          )
          .join('')}`,
    )
    .join('');

  const tabla = `<table class="semana"><colgroup><col class="persona">${'<col>'.repeat(7)}<col class="horas"></colgroup><thead>${cabecera}</thead><tbody>${cuerpo}</tbody></table>`;

  const nota = [
    `${datos.publicado}.`,
    datos.cruzaLaMedianoche === true
      ? 'Un tramo que acaba antes de empezar termina al día siguiente.'
      : '',
    'Si cambia algo, a quien le toca le llega un aviso.',
  ]
    .filter((p) => p !== '')
    .join(' ');

  return paginaDelDocumento({
    titulo: 'Horario de la semana',
    subtitulo: datos.semana,
    marca: datos.marca,
    hechoEl: datos.hechoEl,
    cuerpo: [
      grupos.length === 0 ? unParrafo('Esta semana no tiene nada puesto.', 'suave') : tabla,
      unaNota(nota),
    ].join(''),
    apaisado: true,
    estilo: ESTILO_DE_LA_PARED,
  });
}

// ── El de cada uno ───────────────────────────────────────────────────────────

export interface DiaDeMiHorario {
  /** «Lunes 5». */
  readonly dia: string;
  readonly tramos: readonly TramoEnPapel[];
  readonly ausencia: string | null;
  /** «8 h», o vacío si no trabaja. */
  readonly horas: string;
}

export interface DatosDeMiHorario {
  readonly marca: MarcaDelDocumento;
  readonly semana: string;
  readonly hechoEl: string;
  readonly persona: string;
  readonly dias: readonly DiaDeMiHorario[];
  readonly total: string;
  readonly publicado: string;
}

export function documentoDeMiHorario(datos: DatosDeMiHorario): string {
  const cuerpo = [
    unTitulo(datos.persona),
    unaTabla(
      [{ titulo: 'Día' }, { titulo: 'Horario' }, { titulo: 'Horas', numero: true }],
      [
        ...datos.dias.map((d) => [d.dia, elDia(d), d.horas]),
        [
          { html: '<strong>La semana</strong>' },
          '',
          { html: `<strong>${escapar(datos.total)}</strong>` },
        ],
      ],
    ),
    unaNota(`${datos.publicado}. El de todo el equipo está en la app, en el horario.`),
  ].join('');

  return paginaDelDocumento({
    titulo: 'Mi horario',
    subtitulo: datos.semana,
    marca: datos.marca,
    hechoEl: datos.hechoEl,
    cuerpo,
  });
}
