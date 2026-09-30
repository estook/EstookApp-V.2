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

/** Lo que va en un día: sus tramos, o su ausencia. */
export interface DiaDelHorario {
  /** «12:00–16:00», uno por tramo. Vacío si no tiene nada. */
  readonly tramos: readonly string[];
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
}

function elDia(dia: DiaDelHorario | undefined): { html: string } {
  if (dia === undefined) return { html: '' };
  if (dia.ausencia !== null) return { html: unaMarca(dia.ausencia) };
  if (dia.tramos.length === 0) return { html: '<span class="tenue">—</span>' };
  return { html: dia.tramos.map((t) => `<span class="entero">${escapar(t)}</span>`).join('<br>') };
}

export function documentoDelHorario(datos: DatosDelHorario): string {
  const columnas = [
    { titulo: 'Persona' },
    ...datos.dias.map((titulo) => ({ titulo })),
    { titulo: 'Horas', numero: true },
  ];

  const grupos = datos.grupos
    .filter((g) => g.filas.length > 0)
    .map(
      (g) =>
        `${unTitulo(g.nombre)}${unaTabla(
          columnas,
          g.filas.map((f) => [
            {
              html: `${escapar(f.persona)}${f.puesto === '' ? '' : `<small>${escapar(f.puesto)}</small>`}`,
            },
            ...[0, 1, 2, 3, 4, 5, 6].map((i) => elDia(f.dias[i])),
            f.horas,
          ]),
        )}`,
    )
    .join('');

  const cuerpo = [
    grupos === '' ? unParrafo('Esta semana no tiene nada puesto.', 'suave') : grupos,
    unaNota(
      `${datos.publicado}. Los tramos que acaban antes de empezar cruzan la medianoche. Si cambia algo, a quien le toca le llega un aviso.`,
    ),
  ].join('');

  return paginaDelDocumento({
    titulo: 'Horario de la semana',
    subtitulo: datos.semana,
    marca: datos.marca,
    hechoEl: datos.hechoEl,
    cuerpo,
    apaisado: true,
  });
}

// ── El de cada uno ───────────────────────────────────────────────────────────

export interface DiaDeMiHorario {
  /** «Lunes 5». */
  readonly dia: string;
  readonly tramos: readonly string[];
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
