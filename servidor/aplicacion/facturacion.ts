import {
  comoVaLaFacturacion,
  enMinuscula,
  seriesPropuestas,
  type ComoVaLaFacturacion,
  type CodigoDeError,
  type EstadoDeLaAutorizacion,
  type HaciendaForal,
  type ModalidadDeFacturacion,
  type TerritorioDelLocal,
  type TipoDeSerie,
} from '@estook/dominio';
import { VerifactiNoContesta, type Verifacti } from '../facturacion/verifacti.ts';
import { apuntarUnFallo } from '../infraestructura/fallos.ts';
import { FalloDeAplicacion, type Contexto } from './contrato.ts';

/**
 * Lo que comparten los pasos del alta de facturación (T6 · 1, decisión 0126).
 *
 * Vive aparte por la regla 6: la consulta de Ajustes › Facturación y los cinco comandos tienen
 * que contar igual en qué paso va el alta (lo cuenta `comoVaLaFacturacion`, de `@estook/dominio`) y
 * traducir igual lo que digan la base y Verifacti.
 */

/** Verifacti, o la frase de que la facturación todavía no está conectada. */
export function laVerifacti(contexto: Contexto): Verifacti {
  const verifacti = contexto.facturacion ?? null;
  if (verifacti === null) throw new FalloDeAplicacion('facturacion_sin_conectar');
  return verifacti;
}

/**
 * Lo que dice la base cuando un paso no se puede dar (los `raise exception` de la 0099), dicho
 * con el catálogo de errores. Lo que no está aquí sigue hacia arriba como un fallo nuestro.
 */
const LO_QUE_DICE_LA_BASE: Readonly<Record<string, CodigoDeError>> = {
  sin_permiso: 'sin_permiso',
  local_ajeno: 'local_ajeno',
  no_existe: 'no_existe',
  titular_sin_permiso: 'titular_sin_permiso',
  nif_de_otra_empresa: 'nif_de_otra_empresa',
  nif_no_se_cambia: 'nif_no_se_cambia',
  empresa_de_pruebas: 'empresa_de_pruebas',
  falta_la_empresa: 'falta_la_empresa',
  series_repetidas: 'series_repetidas',
  serie_de_otro_local: 'serie_de_otro_local',
  solo_el_titular: 'solo_el_titular',
  sin_envio_todavia_no: 'sin_envio_todavia_no',
  fuera_solo_con_el_sii: 'fuera_solo_con_el_sii',
  solo_admin_total: 'sin_permiso',
  solo_admin: 'sin_permiso',
  no_es_de_la_casa: 'no_es_de_la_casa',
  faltan_condiciones: 'faltan_condiciones',
  empresa_sin_terminar: 'empresa_sin_terminar',
};

function esElNifRepetido(fallo: unknown): boolean {
  if (typeof fallo !== 'object' || fallo === null) return false;
  const f = fallo as { code?: unknown; constraint_name?: unknown; constraint?: unknown };
  const restriccion =
    typeof f.constraint_name === 'string'
      ? f.constraint_name
      : typeof f.constraint === 'string'
        ? f.constraint
        : '';
  return f.code === '23505' && restriccion.includes('empresa_nif');
}

export async function enLaBase<T>(hacer: () => Promise<T>): Promise<T> {
  try {
    return await hacer();
  } catch (fallo) {
    const codigo = fallo instanceof Error ? LO_QUE_DICE_LA_BASE[fallo.message.trim()] : undefined;
    if (codigo !== undefined) throw new FalloDeAplicacion(codigo);
    // Un índice único: el NIF que otra cuenta acaba de dar de alta a la vez.
    if (esElNifRepetido(fallo)) throw new FalloDeAplicacion('nif_de_otra_empresa');
    throw fallo;
  }
}

/**
 * Lo que Verifacti no ha podido hacer, apuntado por dentro con lo que dijo (que **nunca** va a
 * la pantalla tal cual) y dicho fuera con el catálogo. Lo que el comando sabe leer (una firma ya
 * en curso, un 409), lo lee antes de llamar a esto.
 */
export async function loQueNoHizoVerifacti(
  contexto: Contexto,
  fallo: unknown,
  que: string,
): Promise<never> {
  if (!(fallo instanceof VerifactiNoContesta)) throw fallo;
  await apuntarUnFallo(fallo, {
    mensaje: `Verifacti · ${que}`,
    correlacionId: contexto.correlacionId,
    extra: { estado: fallo.estado, detalle: fallo.detalle },
  });
  if (fallo.estado === 402) throw new FalloDeAplicacion('firma_sin_cobrar');
  if (fallo.estado === 400) {
    throw new FalloDeAplicacion('verifacti_no_contesta', {
      porque: 'Verifacti no ha aceptado los datos. Revisa que coincidan con los de Hacienda.',
    });
  }
  throw new FalloDeAplicacion('verifacti_no_contesta');
}

// ── Lo del local ────────────────────────────────────────────────────────────────

export interface LaEmpresa {
  readonly id: string;
  readonly nif: string;
  readonly nombre: string;
  readonly nombreComercial: string | null;
  readonly persona: 'fisica' | 'juridica';
  readonly calle: string;
  readonly numero: string;
  readonly codigoPostal: string;
  readonly municipio: string;
  readonly provincia: string;
  readonly enSii: boolean | null;
  readonly foral: HaciendaForal | 'no' | null;
  readonly dePruebas: boolean;
  readonly entorno: 'pruebas' | 'real';
  /** Cómo factura (0127): con VERI*FACTU, sin envío o fuera, por el SII. */
  readonly modalidad: ModalidadDeFacturacion;
  readonly enVerifacti: boolean;
  readonly titular: { readonly id: string; readonly nombre: string } | null;
  readonly representanteNombre: string | null;
  readonly representanteNif: string | null;
  readonly autorizacion: {
    readonly estado: EstadoDeLaAutorizacion;
    readonly forma: 'en_linea' | 'con_certificado' | null;
    readonly firmante: string | null;
    readonly empezadaEn: string | null;
    readonly caducaEn: string | null;
    readonly correctaEn: string | null;
    readonly error: string | null;
    readonly miradaEn: string | null;
  };
}

export interface LoDelLocal {
  readonly localId: string;
  readonly nombreDelLocal: string;
  readonly organizacion: string;
  readonly territorio: TerritorioDelLocal;
  readonly empresa: LaEmpresa | null;
  readonly series: Readonly<Record<TipoDeSerie, string | null>>;
  readonly propuestas: Readonly<Record<TipoDeSerie, string>>;
  readonly otroPrograma: boolean | null;
  readonly pideTuFactura: boolean;
  readonly como: ComoVaLaFacturacion;
}

interface FilaDelLocal {
  nombre: string;
  organizacion: string;
  territorio: TerritorioDelLocal;
  facturacion_otro_programa: boolean | null;
  pide_tu_factura: boolean;
  empresa_id: string | null;
}

interface FilaDeLaEmpresa {
  id: string;
  nif: string;
  nombre: string;
  nombre_comercial: string | null;
  persona: 'fisica' | 'juridica';
  calle: string;
  numero: string;
  codigo_postal: string;
  municipio: string;
  provincia: string;
  en_sii: boolean | null;
  foral: string | null;
  de_pruebas: boolean;
  entorno: 'pruebas' | 'real';
  modalidad: ModalidadDeFacturacion;
  en_verifacti_en: Date | null;
  titular_id: string | null;
  titular_nombre: string | null;
  representante_nombre: string | null;
  representante_nif: string | null;
  autorizacion: EstadoDeLaAutorizacion;
  autorizacion_forma: 'en_linea' | 'con_certificado' | null;
  autorizacion_firmante: string | null;
  autorizacion_empezada_en: Date | null;
  autorizacion_caduca_en: Date | null;
  autorizacion_correcta_en: Date | null;
  autorizacion_error: string | null;
  autorizacion_mirada_en: Date | null;
}

const enTexto = (fecha: Date | null) => (fecha === null ? null : new Date(fecha).toISOString());

/**
 * Cómo va la facturación del local de la sesión: su empresa, sus series y en qué paso está. Lo
 * leen la consulta y cada comando, para no dejar dar un paso sin el anterior.
 */
export async function loDelLocal(contexto: Contexto, localId: string): Promise<LoDelLocal> {
  const [local] = await contexto.sql<FilaDelLocal[]>`
    select l.nombre, o.nombre as organizacion, l.territorio::text as territorio,
           l.facturacion_otro_programa, l.pide_tu_factura, l.empresa_id
      from estook.local l join estook.organizacion o on o.id = l.organizacion_id
     where l.id = ${localId}::uuid
  `;
  if (local === undefined) throw new FalloDeAplicacion('local_ajeno');

  let empresa: LaEmpresa | null = null;
  if (local.empresa_id !== null) {
    const [e] = await contexto.sql<FilaDeLaEmpresa[]>`
      select e.id, e.nif, e.nombre, e.nombre_comercial, e.persona, e.calle, e.numero,
             e.codigo_postal, e.municipio, e.provincia, e.en_sii, e.foral, e.de_pruebas, e.entorno,
             e.modalidad,
             e.en_verifacti_en, e.titular_id,
             nullif(btrim(coalesce(p.nombre, '') || ' ' || coalesce(p.apellidos, '')), '') as titular_nombre,
             e.representante_nombre, e.representante_nif, e.autorizacion, e.autorizacion_forma,
             e.autorizacion_firmante, e.autorizacion_empezada_en, e.autorizacion_caduca_en,
             e.autorizacion_correcta_en, e.autorizacion_error, e.autorizacion_mirada_en
        from estook.empresa e
        left join estook.persona p on p.id = e.titular_id
       where e.id = ${local.empresa_id}::uuid
    `;
    if (e !== undefined) {
      empresa = {
        id: e.id,
        nif: e.nif,
        nombre: e.nombre,
        nombreComercial: e.nombre_comercial,
        persona: e.persona,
        calle: e.calle,
        numero: e.numero,
        codigoPostal: e.codigo_postal,
        municipio: e.municipio,
        provincia: e.provincia,
        enSii: e.en_sii,
        foral: e.foral as LaEmpresa['foral'],
        dePruebas: e.de_pruebas,
        entorno: e.entorno,
        modalidad: e.modalidad,
        enVerifacti: e.en_verifacti_en !== null,
        titular:
          e.titular_id === null ? null : { id: e.titular_id, nombre: e.titular_nombre ?? '' },
        representanteNombre: e.representante_nombre,
        representanteNif: e.representante_nif,
        autorizacion: {
          estado: e.autorizacion,
          forma: e.autorizacion_forma,
          firmante: e.autorizacion_firmante,
          empezadaEn: enTexto(e.autorizacion_empezada_en),
          caducaEn: enTexto(e.autorizacion_caduca_en),
          correctaEn: enTexto(e.autorizacion_correcta_en),
          error: e.autorizacion_error,
          miradaEn: enTexto(e.autorizacion_mirada_en),
        },
      };
    }
  }

  const filas = await contexto.sql<{ tipo: TipoDeSerie; prefijo: string; empresa_id: string }[]>`
    select distinct on (s.tipo) s.tipo, s.prefijo, s.empresa_id::text as empresa_id
      from facturacion.serie s
     where s.local_id = ${localId}::uuid
     order by s.tipo, s.puesta_en desc
  `;
  // Las series son de su empresa: si el local cambió de empresa, las de la otra no valen.
  const deLaEmpresa = (tipo: TipoDeSerie) =>
    filas.find((f) => f.tipo === tipo && f.empresa_id === local.empresa_id)?.prefijo ?? null;
  const series = {
    ticket: deLaEmpresa('ticket'),
    factura: deLaEmpresa('factura'),
    rectificativa: deLaEmpresa('rectificativa'),
  };

  const como = comoVaLaFacturacion({
    territorio: local.territorio,
    empresa:
      empresa === null
        ? null
        : {
            comprobada: true,
            enSii: empresa.enSii,
            foral: empresa.foral === null ? null : empresa.foral === 'no' ? false : empresa.foral,
            enVerifacti: empresa.enVerifacti,
            autorizacion: empresa.autorizacion.estado,
            dePruebas: empresa.dePruebas,
            modalidad: empresa.modalidad,
          },
    seriesPuestas: Object.values(series).filter((s) => s !== null).length,
    otroProgramaContestado: local.facturacion_otro_programa !== null,
  });

  return {
    localId,
    nombreDelLocal: local.nombre,
    organizacion: local.organizacion,
    territorio: local.territorio,
    empresa,
    series,
    propuestas: seriesPropuestas(local.nombre),
    otroPrograma: local.facturacion_otro_programa,
    pideTuFactura: local.pide_tu_factura,
    como,
  };
}

/**
 * Que el alta haya llegado al paso que se quiere dar, y no esté parada. **Un paso no se salta**:
 * dar de alta en Verifacti sin las series, o firmar sin el alta, se para aquí.
 */
export function exigirElPaso(lo: LoDelLocal, paso: 2 | 3 | 4 | 5): void {
  if (lo.empresa === null) throw new FalloDeAplicacion('falta_la_empresa');
  if (lo.como.estado === 'parada') {
    throw new FalloDeAplicacion('alta_parada', { porque: lo.como.parada.porque });
  }
  const llega = lo.como.estado === 'lista' ? 6 : lo.como.paso;
  if (llega < paso) {
    throw new FalloDeAplicacion('faltan_datos', {
      porque: `Antes de este paso falta: ${lo.como.estado === 'en_marcha' ? enMinuscula(lo.como.falta) : 'lo anterior'}.`,
    });
  }
}

/**
 * Lo de Verifacti (su alta y la autorización) **solo con VERI*FACTU**: fuera de VERI*FACTU, por el
 * SII, no hace falta, y sin envío no pasa por Verifacti (0127).
 */
export function soloConVerifactu(lo: LoDelLocal): void {
  if (lo.empresa !== null && lo.empresa.modalidad !== 'verifactu') {
    throw new FalloDeAplicacion('faltan_datos', {
      porque:
        lo.empresa.modalidad === 'fuera_sii'
          ? 'No hace falta: tu empresa está en el SII y factura fuera de VERI*FACTU.'
          : 'Sin envío no pasa por Verifacti.',
    });
  }
}
