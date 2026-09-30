import {
  lasCifras,
  lasFrases,
  paginaDelDocumento,
  unaNota,
  unaTabla,
  unTitulo,
  escapar,
  type CifraDelDocumento,
  type MarcaDelDocumento,
} from './base.ts';

/**
 * Tu día, Tu semana y Tu mes, en PDF (R2 · 0053; el PDF, con H · 0068).
 *
 * Es la misma pantalla de Negocio → Informes, en papel: las cifras con su flecha, las
 * tres frases y, en la semana, el semáforo de los objetivos. **Lo que no se ve en la
 * app no sale aquí**: las cifras llegan ya filtradas por lo que puede ver quien lo pide.
 */

export interface LineaDelSemaforo {
  readonly nombre: string;
  readonly valor: string;
  readonly objetivo: string | null;
  readonly semaforo: 'verde' | 'ambar' | 'rojo' | 'sin_dato';
  readonly porque: string | null;
}

export interface DatosDelInforme {
  readonly marca: MarcaDelDocumento;
  /** «Tu semana». */
  readonly titulo: string;
  /** «del 21 al 27 de septiembre». */
  readonly periodo: string;
  /** «frente a la semana anterior». */
  readonly comparado: string;
  readonly hechoEl: string;
  readonly cifras: readonly CifraDelDocumento[];
  readonly frases: readonly string[];
  readonly semaforo: readonly LineaDelSemaforo[] | null;
}

const COMO_SE_DICE_EL_SEMAFORO: Readonly<Record<LineaDelSemaforo['semaforo'], string>> = {
  verde: 'Dentro',
  ambar: 'Cerca del límite',
  rojo: 'Fuera',
  sin_dato: 'Sin dato',
};

export function documentoDelInforme(datos: DatosDelInforme): string {
  const semaforo =
    datos.semaforo === null || datos.semaforo.length === 0
      ? ''
      : `${unTitulo('Tus objetivos')}${unaTabla(
          [
            { titulo: 'Qué' },
            { titulo: 'Cómo va', numero: true },
            { titulo: 'Objetivo', numero: true },
            { titulo: '' },
          ],
          datos.semaforo.map((linea) => [
            linea.porque === null
              ? linea.nombre
              : { html: `${escapar(linea.nombre)}<small>${escapar(linea.porque)}</small>` },
            linea.valor,
            linea.objetivo ?? '—',
            {
              html: `<span class="${linea.semaforo === 'verde' ? 'bien' : linea.semaforo === 'rojo' ? 'mal' : 'suave'}">${escapar(COMO_SE_DICE_EL_SEMAFORO[linea.semaforo])}</span>`,
            },
          ]),
        )}`;

  const cuerpo = [
    lasFrases(datos.frases),
    unTitulo('Las cifras'),
    lasCifras(datos.cifras.map((c) => ({ ...c, frente: datos.comparado }))),
    semaforo,
    unaNota(
      'Contadas igual que en la app, con las cajas cerradas y el género apuntado. Lo que tu acceso no deja ver no sale en este documento.',
    ),
  ].join('');

  return paginaDelDocumento({
    titulo: datos.titulo,
    subtitulo: datos.periodo,
    marca: datos.marca,
    hechoEl: datos.hechoEl,
    cuerpo,
  });
}
