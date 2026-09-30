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
 * El registro de jornada, para la Inspección (0062, 0068).
 *
 * El Estatuto de los Trabajadores (art. 34.9) pide que la empresa registre el inicio
 * y el fin de cada jornada, lo guarde cuatro años y lo tenga a disposición del
 * trabajador, sus representantes y la Inspección. Esto es ese registro, de un
 * periodo, en papel: **cada fichaje con su hora de entrada y de salida, sus pausas,
 * lo trabajado, desde dónde se fichó y, si se corrigió, cómo era antes, quién lo
 * cambió y por qué**.
 *
 * Va con la huella de la hoja de cálculo del mismo periodo: si alguien la toca
 * después, la huella deja de cuadrar. El formato que pida el Real Decreto del
 * registro digital, cuando se publique, se ajusta aquí.
 */

export interface CorreccionEnElRegistro {
  readonly veces: number;
  /** «09:02 – 17:10»: como se fichó la primera vez. */
  readonly original: string;
  readonly motivo: string;
  /** «Ana Ruiz, el 3 de octubre». */
  readonly quienYCuando: string;
}

export interface FilaDelRegistro {
  readonly persona: string;
  readonly fecha: string;
  readonly entrada: string;
  readonly salida: string;
  readonly pausas: string;
  readonly trabajado: string;
  readonly desde: string;
  readonly correccion: CorreccionEnElRegistro | null;
}

export interface TotalDelRegistro {
  readonly persona: string;
  readonly dias: number;
  readonly trabajado: string;
}

export interface DatosDelRegistro {
  readonly marca: MarcaDelDocumento;
  /** «del 1 al 30 de septiembre de 2026». */
  readonly periodo: string;
  readonly hechoEl: string;
  readonly filas: readonly FilaDelRegistro[];
  readonly totales: readonly TotalDelRegistro[];
  /** La huella SHA-256 de la hoja de cálculo del mismo periodo. */
  readonly huella: string;
  readonly pausaCuenta: boolean;
}

export function documentoDelRegistro(datos: DatosDelRegistro): string {
  const fichajes =
    datos.filas.length === 0
      ? unParrafo('No hay ningún fichaje en este periodo.', 'suave')
      : unaTabla(
          [
            { titulo: 'Persona' },
            { titulo: 'Día' },
            { titulo: 'Entrada', numero: true },
            { titulo: 'Salida', numero: true },
            { titulo: 'Pausas', numero: true },
            { titulo: 'Trabajado', numero: true },
            { titulo: 'Desde' },
          ],
          datos.filas.map((f) => [
            f.correccion === null
              ? f.persona
              : {
                  html: `${escapar(f.persona)} ${unaMarca(f.correccion.veces === 1 ? 'Corregido' : `Corregido ${String(f.correccion.veces)} veces`)}<small>Antes: ${escapar(f.correccion.original)} · ${escapar(f.correccion.motivo)} · ${escapar(f.correccion.quienYCuando)}</small>`,
                },
            f.fecha,
            f.entrada,
            f.salida,
            f.pausas,
            f.trabajado,
            f.desde,
          ]),
        );

  const totales =
    datos.totales.length === 0
      ? ''
      : `${unTitulo('Por persona')}${unaTabla(
          [
            { titulo: 'Persona' },
            { titulo: 'Días', numero: true },
            { titulo: 'Trabajado', numero: true },
          ],
          datos.totales.map((t) => [t.persona, String(t.dias), t.trabajado]),
        )}`;

  const cuerpo = [
    unTitulo('Los fichajes'),
    fichajes,
    totales,
    unaNota(
      `La hora la pone el servidor, no el aparato. Una corrección no borra el fichaje: se ve cómo era antes, quién lo cambió y por qué. Las pausas de descanso ${datos.pausaCuenta ? 'cuentan' : 'no cuentan'} como trabajo en este local. Se guarda cuatro años (Estatuto de los Trabajadores, art. 34.9).`,
    ),
    `<div class="aviso"><strong>Huella de la hoja de cálculo de este periodo</strong> (SHA-256). Si la hoja cambia, deja de cuadrar:<br><span class="huella">${escapar(datos.huella)}</span></div>`,
  ].join('');

  return paginaDelDocumento({
    titulo: 'Registro de jornada',
    subtitulo: datos.periodo,
    marca: datos.marca,
    hechoEl: datos.hechoEl,
    cuerpo,
    apaisado: true,
  });
}
