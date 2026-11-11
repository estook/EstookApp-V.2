import { z } from 'zod';
import {
  FORMAS_DE_PAGO,
  MOTIVOS_DE_LA_DIFERENCIA,
  MOTIVOS_PARA_METER,
  MOTIVOS_PARA_SACAR,
  POR_QUE_NO_SE_COBRA,
  abreElCajon,
  elCambio,
  elNumeroEntero,
  elTotalContado,
  esLoContado,
  fechaEnElLocal,
  laLineaDeUnaParte,
  laParte,
  porQueNoSeCobra,
  sinLosCeros,
  type LineaVendida,
  type ElRecuento,
  type MotivoDeLaDiferencia,
} from '@estook/dominio';
import { publicar } from '../../eventos/bandeja.ts';
import { comando, FalloDeAplicacion, type Contexto } from '../contrato.ts';
import { laOrganizacionDeLaSesion } from '../alta.ts';
import { enNombreDelSistema } from '../pago.ts';
import { tocarElServicio } from '../al-segundo.ts';
import {
  aprobarConElPin,
  quienEsElPin,
  usarLaAprobacion,
  type OperacionQueSeAprueba,
} from '../aprobaciones.ts';
import { elRelojYElFisco, elTipoDeRestauracion } from '../desviacion.ts';
import { prepararUnDocumento } from '../emitir.ts';
import { cuandoEnElLocal, loDelLocalParaImprimir } from '../impresion.ts';
import {
  elLocalDelServicio,
  elTituloDeLaCuenta,
  laCuentaAbierta,
  laJornadaDeHoy,
  losPlatos,
} from '../sala.ts';
import { soloEnLaCaja } from './aparatos.ts';
import {
  abrirElCajonDeEsteAparato,
  elCajonDelAparato,
  elCajonOFallo,
  imprimirLaCaja,
  laCajaAbiertaDe,
  laCajaEnPapel,
  lasFormasDelLocal,
  loDeLaUltimaVez,
  loQueDeberiaHaberEn,
  loQueLlevaLaCaja,
  losAjustesDeLaCaja,
  losMovimientosParaElPapel,
  nombreCorto,
  puedeLlevarLaCaja,
  quienYCuando,
} from '../caja.ts';

/**
 * **La caja de Estook TPV** (R3 · 1, decisión 0144; Anexo 5.1, 10.5, 10.6 y 11.6; maqueta del 9-nov):
 *
 *   abrir_caja                 con lo de la última vez («Está correcto») o contando el cajón
 *   cobrar                     una cuenta entera, unos platos o una parte igual: un cobro, un ticket;
 *                              en la caja, y en el comandero lo que no es efectivo (0145)
 *   dejar_el_cobro_en_la_caja  el efectivo de una mesa, pendiente en la caja a nombre del camarero
 *   quitar_el_cobro_pendiente  el cliente pagó al final de otra forma
 *   quien_cobra_con_este_pin   en la caja, el PIN de quien cobra un pendiente, antes de cobrarlo
 *   mover_dinero               abrir el cajón para cambio, sacar o meter dinero, siempre con para qué
 *   cerrar_caja                contando a ciegas; la diferencia se ve con la caja ya cerrada
 *   explicar_la_diferencia     el motivo de un toque, después, una vez
 *   imprimir_como_va           el X, en papel
 *   imprimir_el_z              el Z de una caja cerrada (otra vez, sale «COPIA»)
 *   guardar_ajustes_de_la_caja quién abre, el recuento, a ciegas, el fondo, Bizum y el cheque
 *
 * **Todo en la caja** (el aparato con cajón) y con quien tecleó su PIN. Abrir, cerrar y el cajón los
 * hace quien puede; si quien está no puede, lo aprueba un encargado con su PIN ahí mismo.
 */

const id = z.string().uuid();

const loContado = z
  .record(z.string(), z.number().int().min(0).max(9999))
  .refine(esLoContado, 'Solo billetes y monedas de euro, contados enteros.');

// ── Lo de todos ────────────────────────────────────────────────────────────────────

/**
 * **Quién lo hace, y si hace falta un encargado.** Si quien está puede, nada; si no, sin PIN se pide
 * («lo_aprueba_un_encargado») y con PIN se aprueba ahí mismo. Devuelve quién lo aprobó.
 */
async function quienLoAprueba(
  contexto: Contexto,
  puede: boolean,
  que: {
    readonly operacion: OperacionQueSeAprueba;
    readonly sobre: string;
    readonly motivo: string;
    readonly pin: string | undefined;
  },
): Promise<{ readonly aprobadoPor: string | null; readonly aprobacionId: string | null }> {
  if (puede) return { aprobadoPor: null, aprobacionId: null };
  if (que.pin === undefined) {
    throw new FalloDeAplicacion('lo_aprueba_un_encargado', { que: que.operacion });
  }
  const aprobacionId = await aprobarConElPin(contexto, {
    operacion: que.operacion,
    sobre: que.sobre,
    motivo: que.motivo,
    pin: que.pin,
  });
  const filas = await enNombreDelSistema(
    contexto,
    () => contexto.sql<{ aprobada_por: string }[]>`
      select aprobada_por::text as aprobada_por from estook.aprobacion where id = ${aprobacionId}::uuid
    `,
  );
  return { aprobadoPor: filas[0]?.aprobada_por ?? null, aprobacionId };
}

/** Lo hace la persona; lo aprobado por un encargado, el sistema con los dos nombres. */
async function comoQuien<T>(
  contexto: Contexto,
  aprobado: boolean,
  hacer: () => Promise<T>,
): Promise<T> {
  return aprobado ? enNombreDelSistema(contexto, hacer) : hacer();
}

async function apuntar(
  contexto: Contexto,
  accion: string,
  sobre: 'turno_de_caja' | 'cuenta' | 'movimiento_de_caja',
  sobreId: string,
  localId: string,
  despues: unknown,
): Promise<void> {
  await contexto.sql`
    select estook.anotar(
      ${laOrganizacionDeLaSesion(contexto)}::uuid, ${accion}, ${sobre}, ${sobreId},
      ${localId}::uuid, null, ${JSON.stringify(despues)}::text::jsonb, null
    )
  `;
}

function sinInternetNo(contexto: Contexto): void {
  // Sin internet, la caja de centro lo guarda y lo sube después (0123). Un cobro necesita su número de
  // ticket ahora: cobrar sin internet, con su justificante, llega con lo siguiente de T7 (0144).
  if (contexto.porLaCaja === true) {
    throw new FalloDeAplicacion('sin_conexion', {
      porque:
        'Sin internet todavía no se cobra en Estook TPV: cobra como antes y apúntalo después.',
    });
  }
}

// ═══ Abrir caja ═════════════════════════════════════════════════════════════════════

export const entradaAbrirCaja = z
  .object({
    turno_id: id,
    /** Billete a billete. Sin él, «Está correcto»: lo que se dejó la última vez. */
    contado: loContado.nullable().optional(),
    pin_del_encargado: z.string().optional(),
  })
  .strict();
export type EntradaAbrirCaja = z.infer<typeof entradaAbrirCaja>;

export interface CajaAbierta {
  readonly turnoId: string;
  readonly fondo: number;
  /** Lo contado frente a lo de la última vez: «Hay 5,00 € menos». Cero sin contar o sin última vez. */
  readonly frenteALaUltimaVez: number;
  readonly yaEstaba: boolean;
  readonly cajonAbierto: boolean;
}

/**
 * **Abrir caja** (Anexo 11.6, 0144): se propone lo que se dejó la última vez; «Está correcto» abre con
 * eso y «Contar» con lo contado, que dice si hay más o menos sin parar. El primer día, o con
 * «Recuento obligatorio», se cuenta. El cajón se abre para meter el fondo.
 */
export const abrirCaja = comando<EntradaAbrirCaja, CajaAbierta>({
  nombre: 'abrir_caja',
  entrada: entradaAbrirCaja,
  exige: 'accion.tomar_nota',
  enElTpv: 'solo',
  enLosAparatos: ['caja'],

  async ejecutar(contexto, entrada) {
    soloEnLaCaja(contexto);
    const localId = elLocalDelServicio(contexto);
    const personaId = contexto.personaId;
    if (personaId === null) throw new FalloDeAplicacion('sin_sesion');
    const cajon = await elCajonOFallo(contexto);

    const abierta = await laCajaAbiertaDe(contexto, cajon.id);
    if (abierta?.id === entrada.turno_id) {
      return {
        turnoId: abierta.id,
        fondo: abierta.fondo,
        frenteALaUltimaVez: 0,
        yaEstaba: true,
        cajonAbierto: false,
      };
    }
    const hoy = await laJornadaDeHoy(contexto, localId);
    if (abierta !== null) {
      throw new FalloDeAplicacion('faltan_datos', {
        porque:
          abierta.fecha < hoy
            ? 'La caja de ayer sigue abierta: ciérrala primero, contando el cajón.'
            : `Esta caja ya está abierta: la abrió ${abierta.abiertaPorNombre}.`,
      });
    }

    const { aprobadoPor, aprobacionId } = await quienLoAprueba(
      contexto,
      await puedeLlevarLaCaja(contexto, localId),
      {
        operacion: 'llevar_la_caja',
        sobre: entrada.turno_id,
        motivo: 'Abrir la caja',
        pin: entrada.pin_del_encargado,
      },
    );

    const ajustes = await losAjustesDeLaCaja(contexto, localId);
    const ultima = await loDeLaUltimaVez(contexto, cajon.id);
    const contado: ElRecuento | null =
      entrada.contado == null ? null : sinLosCeros(entrada.contado);
    if (contado === null && ajustes.recuentoAlAbrir) {
      throw new FalloDeAplicacion('faltan_datos', {
        porque: 'En este local se cuenta siempre al abrir: cuenta el cajón.',
      });
    }
    if (contado === null && ultima === null) {
      throw new FalloDeAplicacion('faltan_datos', {
        porque: 'Es la primera vez: cuenta con cuánto empiezas.',
      });
    }
    const fondo = contado === null ? (ultima ?? 0) : elTotalContado(contado);

    await comoQuien(
      contexto,
      aprobadoPor !== null,
      () =>
        contexto.sql`
        insert into estook.turno_de_caja
          (id, local_id, cajon_id, fecha_operativa, abierta_en, abierta_por, abierta_desde,
           abierta_aprobada_por, fondo, contado_al_abrir, lo_de_la_ultima_vez)
        values (${entrada.turno_id}::uuid, ${localId}::uuid, ${cajon.id}::uuid, ${hoy}::date,
                ${contexto.ahora.toISOString()}::timestamptz, ${personaId}::uuid,
                ${contexto.sesion?.aparato?.terminalId ?? null}::uuid, ${aprobadoPor}::uuid, ${fondo},
                ${contado === null ? null : JSON.stringify(contado)}::text::jsonb, ${ultima})
      `,
    );
    if (aprobacionId !== null) await usarLaAprobacion(contexto, aprobacionId);

    // Otra caja en un día ya cerrado lo reabre, con su motivo escrito (0080).
    await reabrirElDiaSiEstabaCerrado(
      contexto,
      localId,
      hoy,
      `Se abrió ${cajon.nombre} otra vez el mismo día`,
    );

    const cajonAbierto = await abrirElCajonDeEsteAparato(contexto, localId);
    await apuntar(contexto, 'abrir_caja', 'turno_de_caja', entrada.turno_id, localId, {
      cajon: cajon.nombre,
      fondo,
      contada: contado !== null,
      ...(aprobadoPor === null ? {} : { aprobada_por: aprobadoPor }),
    });
    await tocarElServicio(contexto, localId);
    return {
      turnoId: entrada.turno_id,
      fondo,
      frenteALaUltimaVez: contado === null || ultima === null ? 0 : fondo - ultima,
      yaEstaba: false,
      cajonAbierto,
    };
  },
});

/** Si el día estaba cerrado, se reabre con su motivo: es lo que deja volver a cerrarlo (0080). */
async function reabrirElDiaSiEstabaCerrado(
  contexto: Contexto,
  localId: string,
  fecha: string,
  motivo: string,
): Promise<void> {
  await enNombreDelSistema(contexto, async () => {
    const filas = await contexto.sql<{ id: string }[]>`
      select id::text as id from estook.cierre_de_caja
       where local_id = ${localId}::uuid and fecha_operativa = ${fecha}::date and estado = 'cerrada'
       for update
    `;
    const cierre = filas[0];
    if (cierre === undefined) return;
    await contexto.sql`
      insert into estook.reapertura_de_jornada (cierre_id, local_id, motivo, reabierta_por)
      values (${cierre.id}::uuid, ${localId}::uuid, ${motivo}, ${contexto.personaId}::uuid)
    `;
    await contexto.sql`
      update estook.cierre_de_caja set estado = 'reabierta', actualizado_en = now()
       where id = ${cierre.id}::uuid
    `;
  });
}

// ═══ Cobrar ═════════════════════════════════════════════════════════════════════════

const unPago = z
  .object({
    forma: z.enum(FORMAS_DE_PAGO),
    importe: z.number().int().min(1).max(300000),
    entregado: z.number().int().min(1).max(10000000).nullable().optional(),
  })
  .strict();

/** Lo cobrado ya en la mesa, sin cajón: tarjeta, Bizum o cheque. Nunca efectivo. */
const unPagoEnLaMesa = z
  .object({
    forma: z.enum(['tarjeta', 'bizum', 'cheque']),
    importe: z.number().int().min(1).max(300000),
  })
  .strict();

/** Lo que cubre un cobro, igual al cobrar que al dejarlo pendiente en la caja. */
const loQueCubreLaEntrada = {
  cuenta_id: id,
  /** Lo que queda de la cuenta, unos platos o una parte igual. */
  que: z.enum(['toda', 'platos', 'parte']),
  lineas: z.array(id).min(1).max(200).optional(),
  parte: z.number().int().min(1).max(20).optional(),
  de: z.number().int().min(2).max(20).optional(),
  /** Lo que el aparato enseñó: si la cuenta cambió entre medias, no se cobra a ciegas. */
  importe: z.number().int().min(1).max(300000),
};

export const entradaCobrar = z
  .object({
    /** Nace en el aparato: repetir no cobra dos veces (0121). */
    cobro_id: id,
    ...loQueCubreLaEntrada,
    /** Cómo se paga. Sin él, solo para cobrar un pendiente: lo ya pagado y el efectivo. */
    pagos: z.array(unPago).min(1).max(4).optional(),
    /** Desde un aparato sin cajón, si hay más de una caja abierta: en cuál va (0145). */
    turno_id: id.optional(),
    /** En la caja: el efectivo que dejó pendiente un camarero (0145)… */
    pendiente_id: id.optional(),
    /** …y lo que da el cliente. Sin él, justo. */
    entregado: z.number().int().min(1).max(10000000).optional(),
    /** El PIN de quien cobra: el cobro queda a su nombre aunque la caja la tenga otro (0145). */
    pin: z.string().optional(),
  })
  .strict();
export type EntradaCobrar = z.infer<typeof entradaCobrar>;

export interface Cobrado {
  readonly cobroId: string;
  readonly documentoId: string;
  /** «T-IKA-2026-000124». */
  readonly numero: string;
  readonly cambio: number;
  /** Lo que queda por cobrar de la cuenta después de este cobro. */
  readonly queda: number;
  /** La mesa ha quedado libre: era lo último. */
  readonly liberada: boolean;
  readonly cajonAbierto: boolean;
  readonly yaEstaba: boolean;
  /** Quién cobró: quien tecleó su PIN, o quien está en el aparato. */
  readonly cobradoPor: string;
}

interface CobroAnterior {
  readonly importe: number;
  readonly parte: number | null;
  readonly de_partes: number | null;
}

type LineaViva = Awaited<ReturnType<typeof losPlatos>>[number];

interface LoQueCubre {
  readonly cuenta: Awaited<ReturnType<typeof laCuentaAbierta>>;
  readonly importe: number;
  readonly queda: number;
  readonly lineasDelCobro: readonly LineaViva[];
  readonly parte: { readonly parte: number; readonly de: number } | null;
  readonly titulo: string;
}

/**
 * **Lo que cubre un cobro** (0144): lo que queda de la cuenta, unos platos o una parte igual, mirado con
 * la cuenta bloqueada. Lo usan cobrar y dejar un cobro pendiente en la caja (0145), para que los dos
 * digan lo mismo. Si lo que enseñó el aparato no es lo que hay, no se cobra a ciegas.
 */
async function loQueCubre(
  contexto: Contexto,
  localId: string,
  que: {
    readonly cuenta_id: string;
    readonly que: 'toda' | 'platos' | 'parte';
    readonly lineas?: readonly string[] | undefined;
    readonly parte?: number | undefined;
    readonly de?: number | undefined;
    readonly importe: number;
  },
): Promise<LoQueCubre> {
  // **La cuenta, bloqueada mientras se cobra**: la segunda caja espera y ve lo que queda.
  await contexto.sql`
    select id from estook.cuenta
     where id = ${que.cuenta_id}::uuid and local_id = ${localId}::uuid
     for update
  `;
  const cuenta = await laCuentaAbierta(contexto, localId, que.cuenta_id);
  const vivas = (await losPlatos(contexto, [cuenta.id])).filter((l) => l.quitada_en === null);
  const total = vivas.reduce((s, l) => s + l.precio_centimos * l.cantidad, 0);
  const [anteriores, lineasCobradas] = await Promise.all([
    contexto.sql<CobroAnterior[]>`
      select importe, parte, de_partes from estook.cobro where cuenta_id = ${cuenta.id}::uuid
    `,
    contexto.sql<{ linea_id: string }[]>`
      select l.linea_id::text as linea_id
        from estook.cobro_de_linea l join estook.cobro c on c.id = l.cobro_id
       where c.cuenta_id = ${cuenta.id}::uuid
    `,
  ]);
  const cobrado = anteriores.reduce((s, c) => s + c.importe, 0);
  const queda = total - cobrado;
  const cobradas = new Set(lineasCobradas.map((l) => l.linea_id));
  const partesAnteriores = anteriores.filter((c) => c.parte !== null);
  const sinCobrar = vivas.filter((l) => !cobradas.has(l.id));

  if (queda <= 0) {
    throw new FalloDeAplicacion('ya_hecho', { porque: 'Esta cuenta ya está cobrada entera.' });
  }

  let importe: number;
  let lineasDelCobro: LineaViva[] = [];
  let parte: { readonly parte: number; readonly de: number } | null = null;

  if (que.que === 'toda') {
    const aMedias =
      partesAnteriores.length > 0 &&
      partesAnteriores.length < (partesAnteriores[0]?.de_partes ?? 0);
    if (aMedias) {
      throw new FalloDeAplicacion('faltan_datos', {
        porque: 'Esta cuenta se está cobrando a partes iguales: cobra las que quedan.',
      });
    }
    importe = queda;
    // Si ya se cobró a partes, lo que queda no son platos: es el resto.
    lineasDelCobro = partesAnteriores.length > 0 ? [] : sinCobrar;
  } else if (que.que === 'platos') {
    if (partesAnteriores.length > 0) {
      throw new FalloDeAplicacion('faltan_datos', {
        porque: 'Esta cuenta se está cobrando a partes iguales, no por platos.',
      });
    }
    const elegidas = new Set(que.lineas ?? []);
    const arriba = sinCobrar.filter((l) => elegidas.has(l.id));
    if (arriba.length !== elegidas.size || arriba.some((l) => l.parte_de !== null)) {
      throw new FalloDeAplicacion('lo_cambio_otra_persona', {
        porque: 'Algún plato ya no está o ya se cobró: mira la cuenta otra vez.',
      });
    }
    // Los platos de un menú van con su menú.
    lineasDelCobro = [
      ...arriba,
      ...sinCobrar.filter((l) => l.parte_de !== null && elegidas.has(l.parte_de)),
    ];
    importe = lineasDelCobro.reduce((s, l) => s + l.precio_centimos * l.cantidad, 0);
  } else {
    const de = que.de;
    const cual = que.parte;
    if (de === undefined || cual === undefined || cual > de) {
      throw new FalloDeAplicacion('faltan_datos', { porque: 'Di qué parte y de cuántas.' });
    }
    if (cobradas.size > 0 || anteriores.some((c) => c.parte === null)) {
      throw new FalloDeAplicacion('faltan_datos', {
        porque: 'Esta cuenta ya se ha empezado a cobrar de otra forma.',
      });
    }
    if (partesAnteriores.some((c) => c.de_partes !== de)) {
      throw new FalloDeAplicacion('lo_cambio_otra_persona', {
        porque: `Esta cuenta se está cobrando en ${String(partesAnteriores[0]?.de_partes ?? de)} partes.`,
      });
    }
    if (partesAnteriores.some((c) => c.parte === cual)) {
      throw new FalloDeAplicacion('ya_hecho', { porque: 'Esa parte ya está cobrada.' });
    }
    // La última parte se lleva lo que quede: si se pidió algo entre medias, la cuenta cuadra igual.
    const esLaUltima = partesAnteriores.length === de - 1;
    importe = esLaUltima ? queda : laParte(total, cual, de);
    parte = { parte: cual, de };
  }

  if (importe !== que.importe) {
    throw new FalloDeAplicacion('lo_cambio_otra_persona', {
      porque: 'La cuenta ha cambiado mientras cobrabas: mírala otra vez.',
    });
  }
  return { cuenta, importe, queda, lineasDelCobro, parte, titulo: elTituloDeLaCuenta(cuenta) };
}

/** Un cobro pendiente que sigue esperando en la caja, como lo lee la API. */
interface FilaDelPendiente {
  readonly id: string;
  readonly cuenta_id: string;
  readonly que: 'toda' | 'platos' | 'parte';
  readonly lineas: string[] | null;
  readonly parte: number | null;
  readonly de_partes: number | null;
  readonly importe: number;
  readonly ya_pagado: { forma: 'tarjeta' | 'bizum' | 'cheque'; importe: number }[];
  readonly cobro_id: string | null;
  readonly quitado_en: string | null;
}

async function elPendiente(
  contexto: Contexto,
  localId: string,
  pendienteId: string,
): Promise<FilaDelPendiente> {
  const filas = await contexto.sql<FilaDelPendiente[]>`
    select id::text as id, cuenta_id::text as cuenta_id, que, lineas::text[] as lineas, parte,
           de_partes, importe, ya_pagado, cobro_id::text as cobro_id, quitado_en::text as quitado_en
      from estook.cobro_pendiente
     where id = ${pendienteId}::uuid and local_id = ${localId}::uuid
     for update
  `;
  const fila = filas[0];
  if (fila === undefined) {
    throw new FalloDeAplicacion('no_existe', { porque: 'Ese cobro pendiente ya no está.' });
  }
  return fila;
}

/** Los que siguen esperando en la caja para una cuenta. */
async function losPendientesDeLaCuenta(
  contexto: Contexto,
  cuentaId: string,
): Promise<{ id: string; parte: number | null }[]> {
  return contexto.sql<{ id: string; parte: number | null }[]>`
    select id::text as id, parte from estook.cobro_pendiente
     where cuenta_id = ${cuentaId}::uuid and cobro_id is null and quitado_en is null
  `;
}

/**
 * **La caja del cobro** (0145). En la caja, la de su cajón: sin abrir, no se cobra. En un aparato sin
 * cajón (el comandero), la caja abierta del local; si hay más de una, la que se elija.
 */
async function laCajaDelCobro(
  contexto: Contexto,
  localId: string,
  turnoElegido: string | undefined,
): Promise<{ readonly id: string; readonly conCajon: boolean }> {
  const cajon = await elCajonDelAparato(contexto);
  if (cajon !== null) {
    const caja = await laCajaAbiertaDe(contexto, cajon.id);
    if (caja === null) {
      throw new FalloDeAplicacion('faltan_datos', {
        porque: 'Abre la caja para cobrar.',
        caja: 'cerrada',
      });
    }
    return { id: caja.id, conCajon: true };
  }
  const abiertas = await enNombreDelSistema(
    contexto,
    () => contexto.sql<{ id: string; nombre: string }[]>`
      select t.id::text as id, c.nombre
        from estook.turno_de_caja t join estook.cajon c on c.id = t.cajon_id
       where t.local_id = ${localId}::uuid and t.cerrada_en is null
       order by c.nombre
    `,
  );
  const elegida = abiertas.find((a) => a.id === turnoElegido);
  if (elegida !== undefined) return { id: elegida.id, conCajon: false };
  if (abiertas.length === 1 && abiertas[0] !== undefined) {
    return { id: abiertas[0].id, conCajon: false };
  }
  if (abiertas.length === 0) {
    throw new FalloDeAplicacion('faltan_datos', {
      porque: 'La caja está cerrada: ábrela en la caja para poder cobrar.',
      caja: 'cerrada',
    });
  }
  throw new FalloDeAplicacion('faltan_datos', {
    porque: 'Hay más de una caja abierta: elige en cuál va este cobro.',
    cajas: abiertas.map((a) => ({ turnoId: a.id, nombre: a.nombre })),
  });
}

/**
 * **Cobrar** (Anexo 5.1 y 10.5, 0144 y 0145): un cobro, un ticket, con uno o varios pagos. La cuenta se
 * bloquea mientras se cobra: dos aparatos a la vez, gana uno y el otro lo ve. El ticket sale solo en
 * cuanto contesta Hacienda, por la impresora del aparato; con efectivo o cheque, en la caja, la
 * impresora abre el cajón. La mesa queda libre con lo último.
 *
 * **En el comandero** (0145) se cobra con tarjeta (el datáfono de siempre), Bizum o cheque. **El efectivo
 * no**: va al cajón, y se deja pendiente en la caja (`dejar_el_cobro_en_la_caja`). **En la caja** se
 * cobra todo, y también lo pendiente, con el PIN de quien cobra.
 */
export const cobrar = comando<EntradaCobrar, Cobrado>({
  nombre: 'cobrar',
  entrada: entradaCobrar,
  exige: 'accion.cobrar',
  enElTpv: 'solo',
  enLosAparatos: ['caja', 'comandero'],

  async ejecutar(contexto, entrada) {
    sinInternetNo(contexto);
    const localId = elLocalDelServicio(contexto);
    const enElAparato = contexto.personaId;
    if (enElAparato === null) throw new FalloDeAplicacion('sin_sesion');

    // El mismo cobro otra vez (la respuesta se perdió): lo de entonces, sin cobrar dos veces.
    const repetido = await contexto.sql<
      {
        documento_id: string;
        serie: string;
        numero: number;
        cuenta_id: string;
        cobrado_por: string;
      }[]
    >`
      select c.documento_id::text as documento_id, d.serie, d.numero, c.cuenta_id::text as cuenta_id,
             c.cobrado_por::text as cobrado_por
        from estook.cobro c join facturacion.documento d on d.id = c.documento_id
       where c.id = ${entrada.cobro_id}::uuid and c.local_id = ${localId}::uuid
    `;
    const yaCobrado = repetido[0];
    if (yaCobrado !== undefined) {
      const quedaAhora = await loQueQueda(contexto, yaCobrado.cuenta_id);
      return {
        cobroId: entrada.cobro_id,
        documentoId: yaCobrado.documento_id,
        numero: elNumeroEntero(yaCobrado.serie, yaCobrado.numero),
        cambio: entrada.pagos === undefined ? 0 : elCambio(entrada.pagos),
        queda: quedaAhora,
        liberada: quedaAhora === 0,
        cajonAbierto: false,
        yaEstaba: true,
        cobradoPor: yaCobrado.cobrado_por,
      };
    }

    // **Quien cobra**: quien teclea su PIN, aunque la caja la tenga abierta otro (0145).
    const cobradoPor =
      entrada.pin === undefined
        ? enElAparato
        : (await quienEsElPin(contexto, entrada.pin, 'accion.cobrar')).personaId;

    const caja = await laCajaDelCobro(contexto, localId, entrada.turno_id);

    // ── Lo pendiente en la caja: lo cubre lo que dejó el camarero, con lo ya pagado en la mesa ──
    const pendiente =
      entrada.pendiente_id === undefined
        ? null
        : await elPendiente(contexto, localId, entrada.pendiente_id);
    if (pendiente !== null) {
      if (!caja.conCajon) {
        throw new FalloDeAplicacion('faltan_datos', {
          porque: 'El efectivo pendiente se cobra en la caja, que es donde está el cajón.',
        });
      }
      if (pendiente.cobro_id !== null || pendiente.quitado_en !== null) {
        throw new FalloDeAplicacion('ya_hecho', {
          porque:
            pendiente.cobro_id !== null
              ? 'Este cobro ya lo ha cobrado otra persona.'
              : 'Este cobro pendiente lo han quitado.',
        });
      }
    }
    const loQue =
      pendiente === null
        ? entrada
        : {
            cuenta_id: pendiente.cuenta_id,
            que: pendiente.que,
            lineas: pendiente.lineas ?? undefined,
            parte: pendiente.parte ?? undefined,
            de: pendiente.de_partes ?? undefined,
            importe: pendiente.importe,
          };
    const cubre = await loQueCubre(contexto, localId, loQue);

    // Una cuenta con un efectivo pendiente en la caja no se cobra por otro lado: se quita antes.
    if (pendiente === null) {
      const esperan = await losPendientesDeLaCuenta(contexto, cubre.cuenta.id);
      const pisa = esperan.some(
        (p) => p.parte === null || cubre.parte === null || p.parte === cubre.parte.parte,
      );
      if (pisa) {
        throw new FalloDeAplicacion('faltan_datos', {
          porque:
            'Esta cuenta tiene un cobro en efectivo pendiente en la caja. Cóbralo allí, o quítalo antes.',
        });
      }
    }

    let pagos: readonly z.infer<typeof unPago>[];
    if (pendiente !== null) {
      const yaPagado = pendiente.ya_pagado.reduce((s, p) => s + p.importe, 0);
      const enEfectivo = pendiente.importe - yaPagado;
      if (enEfectivo <= 0) {
        throw new FalloDeAplicacion('faltan_datos', {
          porque: 'No queda nada por cobrar en efectivo.',
        });
      }
      pagos = [
        ...pendiente.ya_pagado.map((p) => ({ forma: p.forma, importe: p.importe })),
        {
          forma: 'efectivo' as const,
          importe: enEfectivo,
          entregado: entrada.entregado ?? enEfectivo,
        },
      ];
    } else {
      if (entrada.pagos === undefined) {
        throw new FalloDeAplicacion('faltan_datos', { porque: 'Di cómo se paga.' });
      }
      pagos = entrada.pagos;
      // **Sin cajón, el efectivo no se cobra aquí** (0145): se deja pendiente en la caja.
      if (!caja.conCajon && pagos.some((p) => p.forma === 'efectivo')) {
        throw new FalloDeAplicacion('faltan_datos', {
          porque: 'El efectivo se cobra en la caja: déjalo pendiente para cobrarlo allí.',
        });
      }
    }

    const ajustes = await losAjustesDeLaCaja(contexto, localId);
    const no = porQueNoSeCobra({
      importe: cubre.importe,
      queda: cubre.queda,
      pagos,
      encendidas: lasFormasDelLocal(ajustes),
    });
    if (no !== null)
      throw new FalloDeAplicacion('faltan_datos', { porque: POR_QUE_NO_SE_COBRA[no] });

    // ── El ticket ────────────────────────────────────────────────────────────────────
    const fisco = await elRelojYElFisco(contexto, localId);
    const hoy = fechaEnElLocal(contexto.ahora, fisco.zonaHoraria);
    const tipo = await elTipoDeRestauracion(contexto, fisco, hoy);
    if (tipo === null) {
      throw new FalloDeAplicacion('faltan_datos', {
        porque: 'Estook no sabe todavía el impuesto de tu local. Escríbenos y lo miramos.',
      });
    }
    const regimen = fisco.regimen as LineaVendida['regimen'];
    const lineas: LineaVendida[] =
      cubre.lineasDelCobro.length > 0
        ? cubre.lineasDelCobro
            // Los platos de un menú sin suplemento no cobran: van dentro de su menú.
            .filter((l) => l.precio_centimos > 0)
            .map((l) => ({
              nombre: l.nombre,
              cantidad: l.cantidad,
              importe: l.precio_centimos * l.cantidad,
              regimen,
              tipo,
            }))
        : [
            {
              nombre:
                cubre.parte === null
                  ? `Servicio de restauración · ${cubre.titulo} · el resto`
                  : laLineaDeUnaParte(cubre.titulo, cubre.parte.parte, cubre.parte.de),
              cantidad: 1,
              importe: cubre.importe,
              regimen,
              tipo,
            },
          ];
    const camarero = cubre.cuenta.camarero === null ? null : nombreCorto(cubre.cuenta.camarero);
    const hecho = await prepararUnDocumento(contexto, {
      localId,
      tipo: 'F2',
      descripcion: 'Servicio de restauración',
      lineas,
      regimenDelLocal: regimen,
      zonaHoraria: fisco.zonaHoraria,
      donde: camarero === null ? cubre.titulo : `${cubre.titulo} · ${camarero}`,
      origen: 'cobro',
    });

    // ── El cobro, lo que cubre y cómo se pagó: a nombre de quien cobra ───────────────
    await comoQuien(contexto, cobradoPor !== enElAparato, async () => {
      await contexto.sql`
        insert into estook.cobro
          (id, local_id, cuenta_id, turno_id, documento_id, importe, parte, de_partes,
           cobrado_por, cobrado_desde, cobrado_en)
        values (${entrada.cobro_id}::uuid, ${localId}::uuid, ${cubre.cuenta.id}::uuid,
                ${caja.id}::uuid, ${hecho.id}::uuid, ${cubre.importe}, ${cubre.parte?.parte ?? null},
                ${cubre.parte?.de ?? null}, ${cobradoPor}::uuid,
                ${contexto.sesion?.aparato?.terminalId ?? null}::uuid,
                ${contexto.ahora.toISOString()}::timestamptz)
      `;
      for (const l of cubre.lineasDelCobro) {
        await contexto.sql`
          insert into estook.cobro_de_linea (cobro_id, linea_id)
          values (${entrada.cobro_id}::uuid, ${l.id}::uuid)
        `;
      }
      for (const p of pagos) {
        await contexto.sql`
          insert into estook.pago (cobro_id, local_id, forma, importe, entregado)
          values (${entrada.cobro_id}::uuid, ${localId}::uuid, ${p.forma}, ${p.importe},
                  ${p.forma === 'efectivo' ? (p.entregado ?? null) : null})
        `;
      }
      if (pendiente !== null) {
        await contexto.sql`
          update estook.cobro_pendiente set cobro_id = ${entrada.cobro_id}::uuid
           where id = ${pendiente.id}::uuid
        `;
      }
    });

    const quedaDespues = cubre.queda - cubre.importe;
    const liberada = quedaDespues === 0;
    if (liberada) {
      await contexto.sql`
        update estook.cuenta
           set liberada_en = ${contexto.ahora.toISOString()}::timestamptz,
               liberada_por = ${enElAparato}::uuid
         where id = ${cubre.cuenta.id}::uuid
      `;
    }
    // **El cajón lo abre la impresora** de esta caja, con su impulso. Un comandero no tiene cajón.
    const cajonAbierto =
      caja.conCajon && pagos.some((p) => abreElCajon(p.forma))
        ? await abrirElCajonDeEsteAparato(contexto, localId)
        : false;
    await apuntar(contexto, 'cobrar', 'cuenta', cubre.cuenta.id, localId, {
      cobro: entrada.cobro_id,
      ticket: hecho.numero,
      importe: cubre.importe,
      pagos: pagos.map((p) => ({ forma: p.forma, importe: p.importe })),
      ...(cubre.parte === null ? {} : { parte: cubre.parte.parte, de: cubre.parte.de }),
      ...(pendiente === null ? {} : { pendiente: pendiente.id }),
      ...(cobradoPor === enElAparato ? {} : { cobrado_por: cobradoPor }),
      liberada,
    });
    await tocarElServicio(contexto, localId);
    return {
      cobroId: entrada.cobro_id,
      documentoId: hecho.id,
      numero: hecho.numero,
      cambio: elCambio(pagos),
      queda: quedaDespues,
      liberada,
      cajonAbierto,
      yaEstaba: false,
      cobradoPor,
    };
  },
});

/** Lo que queda por cobrar de una cuenta, ahora. */
async function loQueQueda(contexto: Contexto, cuentaId: string): Promise<number> {
  const filas = await contexto.sql<{ queda: number }[]>`
    select (coalesce((select sum(l.precio_centimos * l.cantidad) from estook.linea_de_cuenta l
                       where l.cuenta_id = ${cuentaId}::uuid and l.quitada_en is null), 0)
          - coalesce((select sum(c.importe) from estook.cobro c
                       where c.cuenta_id = ${cuentaId}::uuid), 0))::integer as queda
  `;
  return Math.max(0, filas[0]?.queda ?? 0);
}

// ═══ El efectivo, pendiente en la caja (0145) ═══════════════════════════════════════

export const entradaDejarElCobroEnLaCaja = z
  .object({
    /** Nace en el aparato: dejarlo dos veces desde el mismo toque no deja dos. */
    pendiente_id: id,
    ...loQueCubreLaEntrada,
    /** Lo cobrado ya en la mesa con tarjeta, Bizum o cheque: va en el mismo ticket. */
    ya_pagado: z.array(unPagoEnLaMesa).max(3).optional(),
  })
  .strict();
export type EntradaDejarElCobroEnLaCaja = z.infer<typeof entradaDejarElCobroEnLaCaja>;

export interface CobroDejadoEnLaCaja {
  readonly pendienteId: string;
  /** Lo que se cobra en efectivo en la caja. */
  readonly enEfectivo: number;
  readonly yaEstaba: boolean;
}

/**
 * **Dejar el efectivo para la caja** (0145; Richi, 10-nov): el camarero cobra en la mesa lo que no es
 * efectivo, y el efectivo lo deja pendiente a su nombre. En la caja sale «Cobro pendiente · Mesa 4 ·
 * Ricardo», en la pantalla del PIN y en la mesa, y se cobra allí con el PIN de quien cobra. No hace falta
 * ninguna caja abierta para dejarlo: se cobra cuando se abra.
 */
export const dejarElCobroEnLaCaja = comando<EntradaDejarElCobroEnLaCaja, CobroDejadoEnLaCaja>({
  nombre: 'dejar_el_cobro_en_la_caja',
  entrada: entradaDejarElCobroEnLaCaja,
  exige: 'accion.cobrar',
  enElTpv: 'solo',
  enLosAparatos: ['caja', 'comandero'],

  async ejecutar(contexto, entrada) {
    const localId = elLocalDelServicio(contexto);
    const personaId = contexto.personaId;
    if (personaId === null) throw new FalloDeAplicacion('sin_sesion');

    const antes = await contexto.sql<{ importe: number; ya_pagado: { importe: number }[] }[]>`
      select importe, ya_pagado from estook.cobro_pendiente
       where id = ${entrada.pendiente_id}::uuid and local_id = ${localId}::uuid
    `;
    const yaDejado = antes[0];
    if (yaDejado !== undefined) {
      return {
        pendienteId: entrada.pendiente_id,
        enEfectivo: yaDejado.importe - yaDejado.ya_pagado.reduce((s, p) => s + p.importe, 0),
        yaEstaba: true,
      };
    }

    const cubre = await loQueCubre(contexto, localId, entrada);
    const yaPagado = entrada.ya_pagado ?? [];
    const enMesa = yaPagado.reduce((s, p) => s + p.importe, 0);
    const enEfectivo = cubre.importe - enMesa;
    if (enEfectivo <= 0) {
      throw new FalloDeAplicacion('faltan_datos', {
        porque: 'Así no queda nada en efectivo: cóbralo todo aquí.',
      });
    }
    const ajustes = await losAjustesDeLaCaja(contexto, localId);
    const encendidas = lasFormasDelLocal(ajustes);
    if (yaPagado.some((p) => !encendidas.includes(p.forma))) {
      throw new FalloDeAplicacion('faltan_datos', {
        porque: 'Esa forma de pago no está encendida en este local.',
      });
    }
    const esperan = await losPendientesDeLaCuenta(contexto, cubre.cuenta.id);
    if (
      esperan.some((p) => p.parte === null || cubre.parte === null || p.parte === cubre.parte.parte)
    ) {
      throw new FalloDeAplicacion('ya_hecho', {
        porque: 'Esta cuenta ya tiene un cobro pendiente en la caja.',
      });
    }

    await contexto.sql`
      insert into estook.cobro_pendiente
        (id, local_id, cuenta_id, que, lineas, parte, de_partes, importe, ya_pagado,
         marcado_por, marcado_desde, marcado_en)
      values (${entrada.pendiente_id}::uuid, ${localId}::uuid, ${cubre.cuenta.id}::uuid,
              ${entrada.que}, ${entrada.que === 'platos' ? (entrada.lineas ?? null) : null}::uuid[],
              ${cubre.parte?.parte ?? null}, ${cubre.parte?.de ?? null}, ${cubre.importe},
              ${JSON.stringify(yaPagado)}::text::jsonb, ${personaId}::uuid,
              ${contexto.sesion?.aparato?.terminalId ?? null}::uuid,
              ${contexto.ahora.toISOString()}::timestamptz)
    `;
    await apuntar(contexto, 'dejar_el_cobro_en_la_caja', 'cuenta', cubre.cuenta.id, localId, {
      pendiente: entrada.pendiente_id,
      importe: cubre.importe,
      en_efectivo: enEfectivo,
      ya_pagado: yaPagado,
    });
    await tocarElServicio(contexto, localId);
    return { pendienteId: entrada.pendiente_id, enEfectivo, yaEstaba: false };
  },
});

/**
 * **Quitar un cobro pendiente** (0145): el cliente al final paga con tarjeta, o se dejó por error. Lo
 * puede quitar quien cobra, en la caja o en el comandero. Queda quién y cuándo.
 */
export const quitarElCobroPendiente = comando<
  { pendiente_id: string },
  { readonly quitado: boolean }
>({
  nombre: 'quitar_el_cobro_pendiente',
  entrada: z.object({ pendiente_id: id }).strict(),
  exige: 'accion.cobrar',
  enElTpv: 'solo',
  enLosAparatos: ['caja', 'comandero'],

  async ejecutar(contexto, entrada) {
    const localId = elLocalDelServicio(contexto);
    const personaId = contexto.personaId;
    if (personaId === null) throw new FalloDeAplicacion('sin_sesion');
    const pendiente = await elPendiente(contexto, localId, entrada.pendiente_id);
    if (pendiente.quitado_en !== null) return { quitado: true };
    if (pendiente.cobro_id !== null) {
      throw new FalloDeAplicacion('ya_hecho', { porque: 'Ya está cobrado: no se puede quitar.' });
    }
    await contexto.sql`
      update estook.cobro_pendiente
         set quitado_en = ${contexto.ahora.toISOString()}::timestamptz, quitado_por = ${personaId}::uuid
       where id = ${pendiente.id}::uuid
    `;
    await apuntar(contexto, 'quitar_el_cobro_pendiente', 'cuenta', pendiente.cuenta_id, localId, {
      pendiente: pendiente.id,
    });
    await tocarElServicio(contexto, localId);
    return { quitado: true };
  },
});

/**
 * **¿De quién es este PIN?** (0145): en la caja, al tocar un cobro pendiente, se teclea el PIN de quien
 * cobra antes de escribir lo que da el cliente. Esto lo mira y dice su nombre; el cobro lo vuelve a
 * mirar. El intento se guarda, acierte o no.
 */
export const quienCobraConEstePin = comando<{ pin: string }, { readonly nombre: string }>({
  nombre: 'quien_cobra_con_este_pin',
  entrada: z.object({ pin: z.string().max(12) }).strict(),
  exige: 'accion.tomar_nota',
  enElTpv: 'solo',
  enLosAparatos: ['caja'],

  async ejecutar(contexto, entrada) {
    const quien = await quienEsElPin(contexto, entrada.pin, 'accion.cobrar');
    return { nombre: nombreCorto(quien.nombre) };
  },
});

// ═══ Abrir el cajón: cambio, sacar o meter ═════════════════════════════════════════

export const entradaMoverDinero = z
  .object({
    movimiento_id: id,
    que: z.enum(['cambio', 'sacar', 'meter']),
    importe: z.number().int().min(1).max(10000000).optional(),
    /** De la lista de su tipo; con «Otro», la nota dice para qué. */
    motivo: z.string().trim().min(2).max(60).optional(),
    nota: z.string().trim().max(200).optional(),
    pin_del_encargado: z.string().optional(),
  })
  .strict();
export type EntradaMoverDinero = z.infer<typeof entradaMoverDinero>;

/**
 * **Abrir el cajón** (Anexo 11.6, Richi 28-oct): un solo botón para todo lo que no es una venta, que
 * **siempre pregunta para qué**. Cambio (sin importe), sacar o meter dinero con su para qué. Con el
 * permiso del cajón o de llevar la caja; si no, lo aprueba un encargado con su PIN. Sale en el X y el Z.
 */
export const moverDinero = comando<
  EntradaMoverDinero,
  { readonly movimientoId: string; readonly cajonAbierto: boolean }
>({
  nombre: 'mover_dinero',
  entrada: entradaMoverDinero,
  exige: 'accion.tomar_nota',
  enElTpv: 'solo',
  enLosAparatos: ['caja'],

  async ejecutar(contexto, entrada) {
    soloEnLaCaja(contexto);
    const localId = elLocalDelServicio(contexto);
    const personaId = contexto.personaId;
    if (personaId === null) throw new FalloDeAplicacion('sin_sesion');
    const cajon = await elCajonOFallo(contexto);
    const caja = await laCajaAbiertaDe(contexto, cajon.id);
    if (caja === null) {
      throw new FalloDeAplicacion('faltan_datos', {
        porque: 'Abre la caja primero: lo que se mete o se saca va a una caja abierta.',
        caja: 'cerrada',
      });
    }
    const yaHecho = await contexto.sql<{ id: string }[]>`
      select id::text as id from estook.movimiento_de_caja where id = ${entrada.movimiento_id}::uuid
    `;
    if (yaHecho.length > 0) return { movimientoId: entrada.movimiento_id, cajonAbierto: false };

    let motivo: string | null = null;
    let importe = 0;
    if (entrada.que !== 'cambio') {
      const lista: readonly string[] =
        entrada.que === 'sacar' ? MOTIVOS_PARA_SACAR : MOTIVOS_PARA_METER;
      if (entrada.motivo === undefined || !lista.includes(entrada.motivo)) {
        throw new FalloDeAplicacion('faltan_datos', { porque: 'Di para qué es.' });
      }
      if (entrada.motivo === 'Otro' && (entrada.nota ?? '').length < 2) {
        throw new FalloDeAplicacion('faltan_datos', { porque: 'Escribe para qué es.' });
      }
      if (entrada.importe === undefined) {
        throw new FalloDeAplicacion('faltan_datos', { porque: 'Di cuánto.' });
      }
      motivo = entrada.motivo === 'Otro' ? (entrada.nota ?? 'Otro') : entrada.motivo;
      importe = entrada.importe;
    }

    const puede = (
      await contexto.sql<{ puede: boolean }[]>`
        select estook.puede_editar('accion.abrir_el_cajon', ${localId}::uuid)
            or estook.puede_llevar_la_caja(${localId}::uuid) as puede
      `
    )[0]?.puede;
    const { aprobadoPor, aprobacionId } = await quienLoAprueba(contexto, puede === true, {
      operacion: 'abrir_el_cajon',
      sobre: entrada.movimiento_id,
      motivo:
        entrada.que === 'cambio'
          ? 'Abrir el cajón para cambio'
          : `${entrada.que === 'sacar' ? 'Sacar' : 'Meter'} dinero`,
      pin: entrada.pin_del_encargado,
    });

    const nota = entrada.motivo === 'Otro' ? null : (entrada.nota ?? null) || null;
    await comoQuien(
      contexto,
      aprobadoPor !== null,
      () =>
        contexto.sql`
        insert into estook.movimiento_de_caja
          (id, turno_id, local_id, tipo, importe, motivo, nota, hecho_por, aprobado_por,
           hecho_desde, en)
        values (${entrada.movimiento_id}::uuid, ${caja.id}::uuid, ${localId}::uuid, ${entrada.que},
                ${importe}, ${motivo}, ${nota}, ${personaId}::uuid, ${aprobadoPor}::uuid,
                ${contexto.sesion?.aparato?.terminalId ?? null}::uuid,
                ${contexto.ahora.toISOString()}::timestamptz)
      `,
    );
    if (aprobacionId !== null) await usarLaAprobacion(contexto, aprobacionId);
    const cajonAbierto = await abrirElCajonDeEsteAparato(contexto, localId);
    await apuntar(contexto, 'mover_dinero', 'movimiento_de_caja', entrada.movimiento_id, localId, {
      que: entrada.que,
      importe,
      motivo,
      ...(aprobadoPor === null ? {} : { aprobado_por: aprobadoPor }),
    });
    return { movimientoId: entrada.movimiento_id, cajonAbierto };
  },
});

// ═══ Cerrar caja ════════════════════════════════════════════════════════════════════

export const entradaCerrarCaja = z
  .object({
    turno_id: id,
    contado: loContado,
    /** El total del cierre del datáfono; nulo si hoy no se usó. */
    datafono: z.number().int().min(0).max(100000000).nullable(),
    para_manana: z.number().int().min(0).max(10000000),
    pin_del_encargado: z.string().optional(),
  })
  .strict();
export type EntradaCerrarCaja = z.infer<typeof entradaCerrarCaja>;

export interface LaCajaCerrada {
  readonly turnoId: string;
  readonly deberiaHaber: number;
  readonly contado: number;
  readonly diferencia: number;
  readonly tarjeta: number;
  readonly datafono: number | null;
  /** El datáfono menos lo cobrado con tarjeta en Estook; nulo sin datáfono. */
  readonly diferenciaDeTarjeta: number | null;
  readonly bizum: number;
  readonly cheque: number;
  readonly paraManana: number;
  readonly retiras: number;
  /** Era la última caja abierta del día: el día queda cerrado. */
  readonly diaCerrado: boolean;
  /** Las que siguen abiertas el mismo día: «Comedor». */
  readonly quedanAbiertas: readonly string[];
  readonly yaEstaba: boolean;
}

/**
 * **Cerrar caja** (Anexo 11.6, 0144): lo contado a ciegas, el datáfono y lo que se queda para mañana.
 * **La diferencia se calcula y se enseña con la caja ya cerrada**: así nadie vuelve a contar hasta
 * cuadrar. No bloquea nada y queda a nombre de quien cierra. Si era la última caja abierta del día, el
 * día se cierra solo con lo de todas sus cajas.
 */
export const cerrarCaja = comando<EntradaCerrarCaja, LaCajaCerrada>({
  nombre: 'cerrar_caja',
  entrada: entradaCerrarCaja,
  exige: 'accion.tomar_nota',
  enElTpv: 'solo',
  enLosAparatos: ['caja'],

  async ejecutar(contexto, entrada) {
    soloEnLaCaja(contexto);
    const localId = elLocalDelServicio(contexto);
    const personaId = contexto.personaId;
    if (personaId === null) throw new FalloDeAplicacion('sin_sesion');
    const cajon = await elCajonOFallo(contexto);

    const ya = await elZ(contexto, localId, entrada.turno_id);
    if (ya !== null) return { ...ya, yaEstaba: true };

    const caja = await laCajaAbiertaDe(contexto, cajon.id);
    if (caja === null || caja.id !== entrada.turno_id) {
      throw new FalloDeAplicacion('no_existe', {
        porque: 'Esa caja no está abierta en este cajón.',
      });
    }
    const { aprobadoPor, aprobacionId } = await quienLoAprueba(
      contexto,
      await puedeLlevarLaCaja(contexto, localId),
      {
        operacion: 'llevar_la_caja',
        sobre: caja.id,
        motivo: 'Cerrar la caja',
        pin: entrada.pin_del_encargado,
      },
    );

    const contado = sinLosCeros(entrada.contado);
    const contadoTotal = elTotalContado(contado);
    if (entrada.para_manana > contadoTotal) {
      throw new FalloDeAplicacion('faltan_datos', {
        porque: 'Para mañana no se puede dejar más de lo que has contado.',
      });
    }
    const lleva = await loQueLlevaLaCaja(contexto, caja.id);
    const deberia = loQueDeberiaHaberEn(caja.fondo, lleva);
    const diferencia = contadoTotal - deberia;

    await comoQuien(
      contexto,
      aprobadoPor !== null,
      () =>
        contexto.sql`
        update estook.turno_de_caja
           set cerrada_en = ${contexto.ahora.toISOString()}::timestamptz,
               cerrada_por = ${personaId}::uuid,
               cerrada_desde = ${contexto.sesion?.aparato?.terminalId ?? null}::uuid,
               cerrada_aprobada_por = ${aprobadoPor}::uuid,
               contado = ${JSON.stringify(contado)}::text::jsonb,
               contado_total = ${contadoTotal},
               datafono = ${entrada.datafono},
               para_manana = ${entrada.para_manana},
               efectivo_cobrado = ${lleva.efectivo},
               tarjeta_cobrada = ${lleva.tarjeta},
               bizum_cobrado = ${lleva.bizum},
               cheque_cobrado = ${lleva.cheque},
               metido = ${lleva.metido},
               sacado = ${lleva.sacado},
               devuelto = ${lleva.devuelto},
               tickets = ${lleva.tickets},
               cajon_sin_venta = ${lleva.cajonSinVenta},
               deberia_haber = ${deberia},
               diferencia = ${diferencia}
         where id = ${caja.id}::uuid and cerrada_en is null
      `,
    );
    if (aprobacionId !== null) await usarLaAprobacion(contexto, aprobacionId);

    const quedan = await enNombreDelSistema(
      contexto,
      () => contexto.sql<{ nombre: string }[]>`
        select c.nombre from estook.turno_de_caja t join estook.cajon c on c.id = t.cajon_id
         where t.local_id = ${localId}::uuid and t.fecha_operativa = ${caja.fecha}::date
           and t.cerrada_en is null
         order by c.nombre
      `,
    );
    const diaCerrado = quedan.length === 0;
    if (diaCerrado) await cerrarElDia(contexto, localId, caja.fecha);

    await apuntar(contexto, 'cerrar_caja', 'turno_de_caja', caja.id, localId, {
      cajon: cajon.nombre,
      contado: contadoTotal,
      deberia_haber: deberia,
      diferencia,
      para_manana: entrada.para_manana,
      ...(aprobadoPor === null ? {} : { aprobada_por: aprobadoPor }),
    });
    await tocarElServicio(contexto, localId);
    return {
      turnoId: caja.id,
      deberiaHaber: deberia,
      contado: contadoTotal,
      diferencia,
      tarjeta: lleva.tarjeta,
      datafono: entrada.datafono,
      diferenciaDeTarjeta: entrada.datafono === null ? null : entrada.datafono - lleva.tarjeta,
      bizum: lleva.bizum,
      cheque: lleva.cheque,
      paraManana: entrada.para_manana,
      retiras: contadoTotal - entrada.para_manana,
      diaCerrado,
      quedanAbiertas: quedan.map((q) => q.nombre),
      yaEstaba: false,
    };
  },
});

/** El Z de una caja ya cerrada de este local, como lo devolvió al cerrarla; nulo si sigue abierta. */
async function elZ(
  contexto: Contexto,
  localId: string,
  turnoId: string,
): Promise<Omit<LaCajaCerrada, 'yaEstaba'> | null> {
  const filas = await enNombreDelSistema(
    contexto,
    () => contexto.sql<
      {
        deberia_haber: number;
        contado_total: number;
        diferencia: number;
        tarjeta_cobrada: number;
        datafono: number | null;
        bizum_cobrado: number;
        cheque_cobrado: number;
        para_manana: number;
        fecha: string;
      }[]
    >`
      select deberia_haber, contado_total, diferencia, tarjeta_cobrada, datafono, bizum_cobrado,
             cheque_cobrado, para_manana, fecha_operativa::text as fecha
        from estook.turno_de_caja
       where id = ${turnoId}::uuid and local_id = ${localId}::uuid and cerrada_en is not null
    `,
  );
  const z = filas[0];
  if (z === undefined) return null;
  const abiertas = await enNombreDelSistema(
    contexto,
    () => contexto.sql<{ nombre: string }[]>`
      select c.nombre from estook.turno_de_caja t join estook.cajon c on c.id = t.cajon_id
       where t.local_id = ${localId}::uuid and t.fecha_operativa = ${z.fecha}::date
         and t.cerrada_en is null
    `,
  );
  return {
    turnoId,
    deberiaHaber: z.deberia_haber,
    contado: z.contado_total,
    diferencia: z.diferencia,
    tarjeta: z.tarjeta_cobrada,
    datafono: z.datafono,
    diferenciaDeTarjeta: z.datafono === null ? null : z.datafono - z.tarjeta_cobrada,
    bizum: z.bizum_cobrado,
    cheque: z.cheque_cobrado,
    paraManana: z.para_manana,
    retiras: z.contado_total - z.para_manana,
    diaCerrado: abiertas.length === 0,
    quedanAbiertas: abiertas.map((a) => a.nombre),
  };
}

/**
 * **Cerrar el día con lo de sus cajas** (0144): el cierre de siempre (`cierre_de_caja`, M6½), con
 * `origen = 'tpv'` y lo de todas las cajas del día. Si estaba reabierto, se corrige y queda cerrado;
 * si estaba cerrado (otra caja del día se cerró antes), se reabre con su motivo y se vuelve a cerrar.
 */
async function cerrarElDia(contexto: Contexto, localId: string, fecha: string): Promise<void> {
  await reabrirElDiaSiEstabaCerrado(contexto, localId, fecha, 'Se cerró otra caja del mismo día');
  const sumas = await enNombreDelSistema(
    contexto,
    () => contexto.sql<{ efectivo: number; tarjeta: number; otros: number; tickets: number }[]>`
      select coalesce(sum(efectivo_cobrado), 0)::integer as efectivo,
             coalesce(sum(tarjeta_cobrada), 0)::integer as tarjeta,
             coalesce(sum(bizum_cobrado + cheque_cobrado), 0)::integer as otros,
             coalesce(sum(tickets), 0)::integer as tickets
        from estook.turno_de_caja
       where local_id = ${localId}::uuid and fecha_operativa = ${fecha}::date
         and cerrada_en is not null
    `,
  );
  const s = sumas[0] ?? { efectivo: 0, tarjeta: 0, otros: 0, tickets: 0 };
  const total = s.efectivo + s.tarjeta + s.otros;
  const filas = await enNombreDelSistema(
    contexto,
    () => contexto.sql<{ id: string; corregido: boolean }[]>`
      insert into estook.cierre_de_caja (
        local_id, fecha_operativa, total_centimos, efectivo_centimos, tarjeta_centimos,
        otros_centimos, tickets, origen, cerrado_por
      )
      values (${localId}::uuid, ${fecha}::date, ${total}, ${s.efectivo}, ${s.tarjeta}, ${s.otros},
              ${s.tickets}, 'tpv', ${contexto.personaId}::uuid)
      on conflict (local_id, fecha_operativa) do update
        set total_centimos = excluded.total_centimos,
            efectivo_centimos = excluded.efectivo_centimos,
            tarjeta_centimos = excluded.tarjeta_centimos,
            otros_centimos = excluded.otros_centimos,
            tickets = excluded.tickets,
            origen = 'tpv',
            cerrado_por = excluded.cerrado_por,
            estado = 'cerrada',
            cerrado_en = now(),
            actualizado_en = now()
      returning id::text as id, (xmax <> 0) as corregido
    `,
  );
  const cierre = filas[0];
  if (cierre === undefined) return;
  // La misma cascada que el cierre a mano: las ventas del día, el ticket medio y lo que escucha.
  await publicar(contexto.sql, {
    tipo: 'caja.cerrada',
    organizacionId: laOrganizacionDeLaSesion(contexto),
    localId,
    datos: {
      cierreId: cierre.id,
      fecha,
      totalCentimos: total,
      lineas: 0,
      origen: 'tpv',
      seHaCorregido: cierre.corregido,
    },
    correlacionId: contexto.correlacionId,
  });
}

// ═══ El motivo de la diferencia ═════════════════════════════════════════════════════

export const explicarLaDiferencia = comando<
  { turno_id: string; motivo: MotivoDeLaDiferencia },
  { readonly motivo: MotivoDeLaDiferencia }
>({
  nombre: 'explicar_la_diferencia',
  entrada: z.object({ turno_id: id, motivo: z.enum(MOTIVOS_DE_LA_DIFERENCIA) }).strict(),
  exige: 'accion.tomar_nota',
  enElTpv: 'solo',
  enLosAparatos: ['caja'],

  async ejecutar(contexto, entrada) {
    const localId = elLocalDelServicio(contexto);
    const filas = await enNombreDelSistema(
      contexto,
      () => contexto.sql<
        { cerrada_por: string | null; diferencia: number | null; motivo: string | null }[]
      >`
        select cerrada_por::text as cerrada_por, diferencia, motivo_de_la_diferencia as motivo
          from estook.turno_de_caja where id = ${entrada.turno_id}::uuid and local_id = ${localId}::uuid
      `,
    );
    const turno = filas[0];
    if (turno?.cerrada_por == null) throw new FalloDeAplicacion('no_existe');
    if (turno.diferencia === 0) {
      throw new FalloDeAplicacion('faltan_datos', {
        porque: 'Esta caja cuadra: no hay nada que explicar.',
      });
    }
    if (turno.motivo !== null) {
      throw new FalloDeAplicacion('ya_hecho', { porque: 'El motivo ya está puesto.' });
    }
    // Lo pone quien la cerró, o quien lleva la caja.
    if (turno.cerrada_por !== contexto.personaId && !(await puedeLlevarLaCaja(contexto, localId))) {
      throw new FalloDeAplicacion('sin_permiso');
    }
    await enNombreDelSistema(
      contexto,
      () => contexto.sql`
        update estook.turno_de_caja set motivo_de_la_diferencia = ${entrada.motivo}
         where id = ${entrada.turno_id}::uuid
      `,
    );
    await apuntar(contexto, 'explicar_la_diferencia', 'turno_de_caja', entrada.turno_id, localId, {
      motivo: entrada.motivo,
    });
    return { motivo: entrada.motivo };
  },
});

// ═══ El X y el Z en papel ═══════════════════════════════════════════════════════════

export const imprimirComoVa = comando<Record<string, never>, { readonly impreso: boolean }>({
  nombre: 'imprimir_como_va',
  entrada: z.object({}).strict(),
  exige: 'accion.tomar_nota',
  enElTpv: 'solo',
  enLosAparatos: ['caja'],

  async ejecutar(contexto) {
    const localId = elLocalDelServicio(contexto);
    if (!(await puedeLlevarLaCaja(contexto, localId))) throw new FalloDeAplicacion('sin_permiso');
    const cajon = await elCajonOFallo(contexto);
    const caja = await laCajaAbiertaDe(contexto, cajon.id);
    if (caja === null)
      throw new FalloDeAplicacion('faltan_datos', { porque: 'La caja no está abierta.' });
    const local = await loDelLocalParaImprimir(contexto, localId);
    if (local === null) throw new FalloDeAplicacion('local_ajeno');
    const lleva = await loQueLlevaLaCaja(contexto, caja.id);
    const papel = laCajaEnPapel({
      local: local.nombre,
      caja: cajon.nombre,
      que: 'X',
      cuando: cuandoEnElLocal(contexto.ahora, local.zonaHoraria),
      abrio: quienYCuando(caja.abiertaPorNombre, caja.abiertaEn, local.zonaHoraria),
      cerro: null,
      fondo: caja.fondo,
      efectivo: lleva.efectivo,
      tarjeta: lleva.tarjeta,
      bizum: lleva.bizum,
      cheque: lleva.cheque,
      movimientos: losMovimientosParaElPapel(lleva.movimientos),
      deberiaHaber: loQueDeberiaHaberEn(caja.fondo, lleva),
      contado: null,
      diferencia: null,
      datafono: null,
      paraManana: null,
      tickets: lleva.tickets,
      cajonSinVenta: lleva.cajonSinVenta,
      copia: false,
    });
    return { impreso: await imprimirLaCaja(contexto, localId, papel) };
  },
});

export const imprimirElZ = comando<{ turno_id: string }, { readonly impreso: boolean }>({
  nombre: 'imprimir_el_z',
  entrada: z.object({ turno_id: id }).strict(),
  exige: 'accion.tomar_nota',
  enElTpv: 'solo',
  enLosAparatos: ['caja'],

  async ejecutar(contexto, entrada) {
    const localId = elLocalDelServicio(contexto);
    const filas = await enNombreDelSistema(
      contexto,
      () => contexto.sql<
        {
          cajon: string;
          abrio: string;
          abierta_en: string;
          cerro: string;
          cerrada_en: string;
          cerrada_por: string;
          fondo: number;
          efectivo_cobrado: number;
          tarjeta_cobrada: number;
          bizum_cobrado: number;
          cheque_cobrado: number;
          deberia_haber: number;
          contado_total: number;
          diferencia: number;
          datafono: number | null;
          para_manana: number;
          tickets: number;
          cajon_sin_venta: number;
          impreso_antes: boolean;
        }[]
      >`
        select c.nombre as cajon, pa.nombre as abrio,
               to_char(t.abierta_en at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as abierta_en,
               pc.nombre as cerro,
               to_char(t.cerrada_en at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as cerrada_en,
               t.cerrada_por::text as cerrada_por,
               t.fondo, t.efectivo_cobrado, t.tarjeta_cobrada, t.bizum_cobrado, t.cheque_cobrado,
               t.deberia_haber, t.contado_total, t.diferencia, t.datafono, t.para_manana, t.tickets,
               t.cajon_sin_venta,
               exists (select 1 from estook.auditoria a
                        where a.entidad = 'turno_de_caja' and a.entidad_id = t.id::text
                          and a.accion = 'imprimir_el_z') as impreso_antes
          from estook.turno_de_caja t
          join estook.cajon c on c.id = t.cajon_id
          join estook.persona pa on pa.id = t.abierta_por
          join estook.persona pc on pc.id = t.cerrada_por
         where t.id = ${entrada.turno_id}::uuid and t.local_id = ${localId}::uuid
           and t.cerrada_en is not null
      `,
    );
    const z = filas[0];
    if (z === undefined)
      throw new FalloDeAplicacion('no_existe', { porque: 'Esa caja no está cerrada.' });
    if (z.cerrada_por !== contexto.personaId && !(await puedeLlevarLaCaja(contexto, localId))) {
      throw new FalloDeAplicacion('sin_permiso');
    }
    const local = await loDelLocalParaImprimir(contexto, localId);
    if (local === null) throw new FalloDeAplicacion('local_ajeno');
    const lleva = await loQueLlevaLaCaja(contexto, entrada.turno_id);
    const papel = laCajaEnPapel({
      local: local.nombre,
      caja: z.cajon,
      que: 'Z',
      cuando: cuandoEnElLocal(new Date(z.cerrada_en), local.zonaHoraria),
      abrio: quienYCuando(z.abrio, z.abierta_en, local.zonaHoraria),
      cerro: quienYCuando(z.cerro, z.cerrada_en, local.zonaHoraria),
      fondo: z.fondo,
      efectivo: z.efectivo_cobrado,
      tarjeta: z.tarjeta_cobrada,
      bizum: z.bizum_cobrado,
      cheque: z.cheque_cobrado,
      movimientos: losMovimientosParaElPapel(lleva.movimientos),
      deberiaHaber: z.deberia_haber,
      contado: z.contado_total,
      diferencia: z.diferencia,
      datafono: z.datafono,
      paraManana: z.para_manana,
      tickets: z.tickets,
      cajonSinVenta: z.cajon_sin_venta,
      copia: z.impreso_antes,
    });
    const impreso = await imprimirLaCaja(contexto, localId, papel);
    if (impreso)
      await apuntar(contexto, 'imprimir_el_z', 'turno_de_caja', entrada.turno_id, localId, {});
    return { impreso };
  },
});

// ═══ Ajustes del TPV › La caja ══════════════════════════════════════════════════════

export const entradaAjustesDeLaCaja = z
  .object({
    caja_la_abren: z.enum(['encargados', 'todos']),
    recuento_al_abrir: z.boolean(),
    contar_a_ciegas: z.boolean(),
    fondo_de_siempre: z.number().int().min(0).max(10000000).nullable(),
    con_bizum: z.boolean(),
    con_cheque: z.boolean(),
  })
  .strict();
export type EntradaAjustesDeLaCaja = z.infer<typeof entradaAjustesDeLaCaja>;

export const guardarAjustesDeLaCaja = comando<EntradaAjustesDeLaCaja, EntradaAjustesDeLaCaja>({
  nombre: 'guardar_ajustes_de_la_caja',
  entrada: entradaAjustesDeLaCaja,
  exige: 'accion.ajustes_del_tpv',
  enElTpv: 'solo',
  enLosAparatos: ['caja'],

  async ejecutar(contexto, entrada) {
    soloEnLaCaja(contexto);
    const localId = elLocalDelServicio(contexto);
    await contexto.sql`
      insert into estook.ajustes_del_tpv
        (local_id, caja_la_abren, recuento_al_abrir, contar_a_ciegas, fondo_de_siempre, con_bizum,
         con_cheque, cambiado_por, cambiado_en)
      values (${localId}::uuid, ${entrada.caja_la_abren}, ${entrada.recuento_al_abrir},
              ${entrada.contar_a_ciegas}, ${entrada.fondo_de_siempre}, ${entrada.con_bizum},
              ${entrada.con_cheque}, ${contexto.personaId}::uuid,
              ${contexto.ahora.toISOString()}::timestamptz)
      on conflict (local_id) do update
        set caja_la_abren = excluded.caja_la_abren,
            recuento_al_abrir = excluded.recuento_al_abrir,
            contar_a_ciegas = excluded.contar_a_ciegas,
            fondo_de_siempre = excluded.fondo_de_siempre,
            con_bizum = excluded.con_bizum,
            con_cheque = excluded.con_cheque,
            cambiado_por = excluded.cambiado_por,
            cambiado_en = excluded.cambiado_en
    `;
    await contexto.sql`
      select estook.anotar(
        ${laOrganizacionDeLaSesion(contexto)}::uuid, 'cambiar', 'ajustes_del_tpv', ${localId},
        ${localId}::uuid, null, ${JSON.stringify(entrada)}::text::jsonb, null
      )
    `;
    await tocarElServicio(contexto, localId);
    return entrada;
  },
});
