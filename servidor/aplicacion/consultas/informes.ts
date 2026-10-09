import { z } from 'zod';
import {
  LAS_CIFRAS_DEL_INFORME,
  NOMBRE_DE_LO_QUE_SE_JUZGA,
  TIPOS_DE_INFORME,
  TITULO_DEL_INFORME,
  atrasDe,
  elPeriodoDelInforme,
  fechaOperativa,
  lasFlechasDelInforme,
  lasCifrasDelCorreo,
  lasTresFrases,
  losDiasEntre,
  type CifraDelInforme,
  type CifraDelSemaforo,
  type FechaOperativa,
  type Indicador,
  type LasTresFrases,
  type PeriodoDelInforme,
  type TipoDeInforme,
} from '@estook/dominio';
import { documentoDelInforme } from '@estook/documentos';
import { LO_QUE_PIDE_EL_INDICADOR, type Permiso } from '@estook/permisos';
import { consulta, FalloDeAplicacion, type Contexto } from '../contrato.ts';
import { hacerElPdf, hechoEl, laMarcaDelLocal, type UnPdf } from '../documentos.ts';
import { loQuePuede } from '../lo-que-puede.ts';
import { calcularElIndicador, laJornada, type DiaDelIndicador } from './indicador.ts';
import { elSemaforoDeLaSemana } from './objetivos.ts';

/**
 * Los informes · Tu día, Tu semana y Tu mes (entrega R2, mejora 16 · decisión 0053).
 *
 * Negocio → Informes. Cada uno es un periodo **cerrado** —ayer, la semana de lunes
 * a domingo que acaba de pasar, el mes pasado— frente al de antes, con las cifras
 * **contadas por el mismo camino que las tarjetas** (`calcularElIndicador`), las
 * tres frases del dominio y, en la semana, el semáforo de los objetivos.
 *
 * Lo usan dos: esta consulta, que es la pantalla, y el reloj, que a las ocho lo
 * cuenta **a nombre de quien lo va a recibir** y le deja el aviso y el correo. Por
 * eso el informe sale de una función y no del cuerpo de la consulta.
 *
 * Cada cifra, con su permiso (`LO_QUE_PIDE_EL_INDICADOR`): lo que no se puede ver
 * no se cuenta, igual que en las tarjetas.
 */

export interface CifraDelInformeConSusDias extends CifraDelInforme {
  /** Los días del periodo, para la línea. En Tu día, uno. */
  readonly serie: readonly DiaDelIndicador[];
}

export interface ElInforme {
  readonly tipo: TipoDeInforme;
  readonly titulo: string;
  readonly periodo: PeriodoDelInforme;
  /** Hasta qué día se puede ir hacia atrás y hacia delante: para las flechas. */
  readonly anteriorDel: string | null;
  readonly siguienteDel: string | null;
  readonly cifras: readonly CifraDelInformeConSusDias[];
  readonly frases: LasTresFrases;
  /** El semáforo de los objetivos, solo en Tu semana y si ve alguno. */
  readonly semaforo: readonly CifraDelSemaforo[] | null;
}

/** Lo que pide ver alguna cifra de un informe: con esto se sabe cuáles salen. */
const LO_QUE_PIDEN_LAS_CIFRAS: readonly Permiso[] = [
  ...new Set(
    TIPOS_DE_INFORME.flatMap((tipo) =>
      LAS_CIFRAS_DEL_INFORME[tipo].flatMap((indicador) => LO_QUE_PIDE_EL_INDICADOR[indicador]),
    ),
  ),
];

/** «food cost, 34 %, con objetivo 30 %», para la frase de lo que conviene mirar. */
function fueraDeObjetivo(semaforo: readonly CifraDelSemaforo[]): string[] {
  return semaforo
    .filter((cifra) => cifra.semaforo === 'rojo')
    .map((cifra) => {
      const nombre = NOMBRE_DE_LO_QUE_SE_JUZGA[cifra.que].toLowerCase();
      const objetivo = cifra.objetivoEnTexto === null ? '' : `, con ${cifra.objetivoEnTexto}`;
      return `${nombre}, ${cifra.valorEnTexto}${objetivo}`;
    });
}

/**
 * Un informe de un local, contado a nombre de quien pregunta.
 *
 * `del` es un día de dentro del periodo; nulo, el último cerrado. La jornada de hoy
 * es la del local, con su hora de corte (regla 10).
 */
export async function elInforme(
  contexto: Contexto,
  localId: string,
  tipo: TipoDeInforme,
  del: FechaOperativa | null,
): Promise<ElInforme> {
  const hoy = fechaOperativa(await laJornada(contexto, localId));
  const atras = del === null ? 0 : atrasDe(tipo, hoy, del);
  const periodo = elPeriodoDelInforme(tipo, hoy, atras);
  const deAhora = losDiasEntre(periodo.desde, periodo.hasta);
  const deAntes = losDiasEntre(periodo.antesDesde, periodo.antesHasta);

  const puede = await loQuePuede(contexto, localId, LO_QUE_PIDEN_LAS_CIFRAS);
  const queSeVen = LAS_CIFRAS_DEL_INFORME[tipo].filter((indicador: Indicador) =>
    puede.verTodos(LO_QUE_PIDE_EL_INDICADOR[indicador]),
  );

  const cifras: CifraDelInformeConSusDias[] = [];
  for (const indicador of queSeVen) {
    const calculado = await calcularElIndicador(contexto, localId, indicador, {
      deAntes,
      deAhora,
      jornada: periodo.hasta,
    });
    cifras.push({
      indicador,
      total: calculado.total,
      anterior: calculado.anterior,
      diasConDato: calculado.diasConDato,
      serie: calculado.serie,
    });
  }

  const semaforo =
    tipo === 'semana' ? await elSemaforoDeLaSemana(contexto, localId, deAntes, deAhora) : null;

  return {
    tipo,
    titulo: TITULO_DEL_INFORME[tipo],
    periodo,
    // Las flechas llevan al periodo de antes y al de después, no al que se compara.
    ...lasFlechasDelInforme(tipo, hoy, atras),
    cifras,
    frases: lasTresFrases(cifras, periodo, {
      fueraDeObjetivo: semaforo === null ? [] : fueraDeObjetivo(semaforo),
    }),
    semaforo: semaforo === null || semaforo.length === 0 ? null : semaforo,
  };
}

// ── La consulta ─────────────────────────────────────────────────────────────

const fecha = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha se escribe así: 2026-09-21.');

export const entradaMiInforme = z
  .object({
    tipo: z.enum(TIPOS_DE_INFORME),
    /**
     * Un día de dentro del periodo que se quiere ver. Sin él, el último cerrado. Va
     * por fecha y no por «cuántos atrás» para que el enlace del correo del lunes, si
     * se abre el jueves, siga enseñando la semana de la que habla.
     */
    del: fecha.optional(),
  })
  .strict();

export type EntradaMiInforme = z.infer<typeof entradaMiInforme>;

export const miInforme = consulta<EntradaMiInforme, ElInforme>({
  nombre: 'mi_informe',
  entrada: entradaMiInforme,
  exige: 'app.negocio',

  async ejecutar(contexto, entrada) {
    return elInforme(
      contexto,
      elLocalDelInforme(contexto),
      entrada.tipo,
      entrada.del === undefined ? null : fechaOperativa(entrada.del),
    );
  },
});

function elLocalDelInforme(contexto: Contexto): string {
  const localId = contexto.sesion?.localId;
  if (!localId) {
    throw new FalloDeAplicacion('faltan_datos', {
      porque: 'Hay que estar dentro de un local para ver sus informes. Elige uno primero.',
    });
  }
  return localId;
}

// ── El informe en PDF (H1 · 0068) ───────────────────────────────────────────

/**
 * El mismo informe de la pantalla, en PDF: lo pidió Richi para los informes (27-sep,
 * «ventas y Tu semana ya; el PDF, con Horarios»). **Las mismas cifras**, contadas por
 * `elInforme` a nombre de quien lo pide: lo que no ve en la app no sale en el papel.
 */
export const miInformeEnPdf = consulta<EntradaMiInforme, UnPdf>({
  nombre: 'mi_informe_en_pdf',
  entrada: entradaMiInforme,
  exige: 'app.negocio',

  async ejecutar(contexto, entrada) {
    const localId = elLocalDelInforme(contexto);
    // Se mira antes de contar nada: sin motor, contar el informe sería trabajo tirado.
    if (contexto.pdf === null) throw new FalloDeAplicacion('pdf_sin_encender');

    const informe = await elInforme(
      contexto,
      localId,
      entrada.tipo,
      entrada.del === undefined ? null : fechaOperativa(entrada.del),
    );
    const marca = await laMarcaDelLocal(contexto, localId);

    const html = documentoDelInforme({
      marca,
      titulo: informe.titulo,
      periodo: informe.periodo.nombre,
      comparado: informe.periodo.comparado,
      hechoEl: hechoEl(contexto.ahora, marca.zonaHoraria),
      cifras: lasCifrasDelCorreo(informe.cifras, informe.periodo),
      frases: [informe.frases.mejor, informe.frases.peor, informe.frases.mirar].filter(
        (f): f is string => f !== null,
      ),
      semaforo:
        informe.semaforo === null
          ? null
          : informe.semaforo.map((c) => ({
              nombre: c.nombre,
              valor: c.valorEnTexto,
              objetivo: c.objetivoEnTexto,
              semaforo: c.semaforo,
              porque: c.porque.length === 0 ? null : c.porque.join(' '),
            })),
    });

    return hacerElPdf(contexto, html, {
      nombre: `${nombreDeFichero(informe.titulo)}-${informe.periodo.desde}.pdf`,
      pie: `${informe.titulo} · ${marca.nombreDelLocal} · ${informe.periodo.nombre}`,
    });
  },
});

/** «Tu semana» → «tu-semana», para el nombre del fichero. */
export function nombreDeFichero(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}
