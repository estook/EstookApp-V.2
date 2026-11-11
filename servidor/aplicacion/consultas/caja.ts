import { z } from 'zod';
import {
  NOMBRE_DEL_MOTIVO_DE_LA_DIFERENCIA,
  elNumeroEntero,
  enDinero,
  laDiferenciaEnTexto,
} from '@estook/dominio';
import { documentoDelZ } from '@estook/documentos';
import { hacerElPdf, hechoEl, laMarcaDelLocal, type UnPdf } from '../documentos.ts';
import type { FormaDePago, ElRecuento, MotivoDeLaDiferencia } from '@estook/dominio';
import { consulta, FalloDeAplicacion, type Contexto } from '../contrato.ts';
import { elLocalDeLaSesion } from '../alta.ts';
import { enNombreDelSistema } from '../pago.ts';
import { elLocalDelServicio, elTituloDeLaCuenta, laJornadaDeHoy } from '../sala.ts';
import {
  elCajonDelAparato,
  lasFormasDelLocal,
  laCajaAbiertaDe,
  loDeLaUltimaVez,
  loQueDeberiaHaberEn,
  loQueLlevaLaCaja,
  losAjustesDeLaCaja,
  losMovimientosParaElPapel,
  nombreCorto,
  puedeLlevarLaCaja,
  quienYCuando,
  type LosAjustesDeLaCaja,
  type UnMovimientoDeLaCaja,
} from '../caja.ts';

/**
 * **Lo que se pregunta de la caja** (R3 · 1, decisión 0144):
 *
 *   la_caja           en Estook TPV: el cajón del aparato, si está abierta, lo que se propone al abrir,
 *                     los ajustes y lo que puede hacer quien está
 *   como_va_la_caja   el X: lo cobrado, lo movido y lo que debería haber, sin cerrarla
 *   cierres_de_caja   en Estook, con Pro: hoy en vivo y un día por fila, **solo para ver**
 *   un_dia_de_caja    el día entero y cada caja con su Z
 */

// ═══ En Estook TPV ══════════════════════════════════════════════════════════════════

export interface LaCajaDelAparato {
  readonly cajon: { readonly id: string; readonly nombre: string } | null;
  readonly abierta: {
    readonly turnoId: string;
    readonly desde: string;
    readonly abiertaPor: string;
    readonly fondo: number;
    readonly fecha: string;
    /** Abierta otro día: «La caja de ayer sigue abierta». */
    readonly deOtroDia: boolean;
  } | null;
  /** Lo que se dejó al cerrar la última vez: lo que se propone al abrir. Nulo el primer día. */
  readonly loDeLaUltimaVez: number | null;
  readonly ajustes: LosAjustesDeLaCaja;
  readonly formas: readonly FormaDePago[];
  /** Si quien está puede abrir y cerrar, y abrir el cajón, sin que lo apruebe nadie. */
  readonly puedoLlevarla: boolean;
  readonly puedoAbrirElCajon: boolean;
  /** Las mesas que siguen abiertas: al cerrar caja se avisa, sin parar. */
  readonly mesasAbiertas: number;
}

export const laCaja = consulta<Record<string, never>, LaCajaDelAparato>({
  nombre: 'la_caja',
  entrada: z.object({}).strict(),
  exige: 'accion.tomar_nota',
  enElTpv: 'solo',

  async ejecutar(contexto) {
    const localId = elLocalDelServicio(contexto);
    const [cajon, ajustes, hoy, puedo, mesas] = await Promise.all([
      elCajonDelAparato(contexto),
      losAjustesDeLaCaja(contexto, localId),
      laJornadaDeHoy(contexto, localId),
      contexto.sql<{ llevarla: boolean; cajon: boolean }[]>`
        select estook.puede_llevar_la_caja(${localId}::uuid) as llevarla,
               estook.puede_editar('accion.abrir_el_cajon', ${localId}::uuid)
                 or estook.puede_llevar_la_caja(${localId}::uuid) as cajon
      `,
      contexto.sql<{ cuantas: number }[]>`
        select count(*)::integer as cuantas from estook.cuenta
         where local_id = ${localId}::uuid and liberada_en is null and anulada_en is null
      `,
    ]);
    const [abierta, ultima] =
      cajon === null
        ? [null, null]
        : await Promise.all([
            laCajaAbiertaDe(contexto, cajon.id),
            loDeLaUltimaVez(contexto, cajon.id),
          ]);
    return {
      cajon,
      abierta:
        abierta === null
          ? null
          : {
              turnoId: abierta.id,
              desde: abierta.abiertaEn,
              abiertaPor: abierta.abiertaPorNombre,
              fondo: abierta.fondo,
              fecha: abierta.fecha,
              deOtroDia: abierta.fecha < hoy,
            },
      loDeLaUltimaVez: ultima,
      ajustes,
      formas: lasFormasDelLocal(ajustes),
      puedoLlevarla: puedo[0]?.llevarla === true,
      puedoAbrirElCajon: puedo[0]?.cajon === true,
      mesasAbiertas: mesas[0]?.cuantas ?? 0,
    };
  },
});

export interface ComoVaLaCaja {
  readonly turnoId: string;
  readonly cajon: string;
  readonly abiertaPor: string;
  readonly desde: string;
  readonly fondo: number;
  readonly efectivo: number;
  readonly tarjeta: number;
  readonly bizum: number;
  readonly cheque: number;
  readonly tickets: number;
  readonly deberiaHaber: number;
  readonly cajonSinVenta: number;
  readonly movimientos: readonly UnMovimientoDeLaCaja[];
}

/** **«Cómo va»**, el X (Anexo 11.6): lo ven quien lleva la caja. Nada se cierra al mirarlo. */
export const comoVaLaCaja = consulta<Record<string, never>, ComoVaLaCaja>({
  nombre: 'como_va_la_caja',
  entrada: z.object({}).strict(),
  exige: 'accion.tomar_nota',
  enElTpv: 'solo',

  async ejecutar(contexto) {
    const localId = elLocalDelServicio(contexto);
    if (!(await puedeLlevarLaCaja(contexto, localId))) throw new FalloDeAplicacion('sin_permiso');
    const cajon = await elCajonDelAparato(contexto);
    const caja = cajon === null ? null : await laCajaAbiertaDe(contexto, cajon.id);
    if (cajon === null || caja === null) {
      throw new FalloDeAplicacion('faltan_datos', { porque: 'La caja no está abierta.' });
    }
    const lleva = await loQueLlevaLaCaja(contexto, caja.id);
    return {
      turnoId: caja.id,
      cajon: cajon.nombre,
      abiertaPor: caja.abiertaPorNombre,
      desde: caja.abiertaEn,
      fondo: caja.fondo,
      efectivo: lleva.efectivo,
      tarjeta: lleva.tarjeta,
      bizum: lleva.bizum,
      cheque: lleva.cheque,
      tickets: lleva.tickets,
      deberiaHaber: loQueDeberiaHaberEn(caja.fondo, lleva),
      cajonSinVenta: lleva.cajonSinVenta,
      movimientos: lleva.movimientos,
    };
  },
});

// ═══ En Estook: Cierres de caja ═════════════════════════════════════════════════════

export interface UnaCajaDeHoy {
  readonly turnoId: string;
  readonly cajon: string;
  readonly abiertaPor: string;
  readonly desde: string;
  /** Lo que debería haber ahora en su cajón. */
  readonly enElCajon: number;
  readonly tarjeta: number;
  readonly tickets: number;
}

export interface UnDiaDeCaja {
  readonly fecha: string;
  readonly total: number;
  readonly diferencia: number;
  readonly cajas: number;
  readonly ultimaCerro: string;
  readonly ultimaHora: string;
  /** Alguna caja de ese día sigue abierta. */
  readonly abierto: boolean;
}

export interface LosCierresDeCaja {
  readonly hoy: readonly UnaCajaDeHoy[];
  readonly dias: readonly UnDiaDeCaja[];
}

interface FilaDelTurno {
  readonly id: string;
  readonly cajon: string;
  readonly fecha: string;
  readonly abrio: string;
  readonly abierta_en: string;
  readonly cerro: string | null;
  readonly cerrada_en: string | null;
  readonly fondo: number;
  readonly contado_al_abrir: ElRecuento | null;
  readonly lo_de_la_ultima_vez: number | null;
  readonly contado_total: number | null;
  readonly datafono: number | null;
  readonly para_manana: number | null;
  readonly efectivo_cobrado: number | null;
  readonly tarjeta_cobrada: number | null;
  readonly bizum_cobrado: number | null;
  readonly cheque_cobrado: number | null;
  readonly metido: number | null;
  readonly sacado: number | null;
  readonly devuelto: number | null;
  readonly tickets: number | null;
  readonly cajon_sin_venta: number | null;
  readonly deberia_haber: number | null;
  readonly diferencia: number | null;
  readonly motivo: MotivoDeLaDiferencia | null;
}

async function losTurnos(
  contexto: Contexto,
  localId: string,
  desde: string,
  hasta: string,
): Promise<FilaDelTurno[]> {
  return contexto.sql<FilaDelTurno[]>`
    select t.id::text as id, c.nombre as cajon, t.fecha_operativa::text as fecha,
           pa.nombre as abrio,
           to_char(t.abierta_en at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as abierta_en,
           pc.nombre as cerro,
           to_char(t.cerrada_en at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as cerrada_en,
           t.fondo, t.contado_al_abrir, t.lo_de_la_ultima_vez, t.contado_total, t.datafono,
           t.para_manana, t.efectivo_cobrado, t.tarjeta_cobrada, t.bizum_cobrado, t.cheque_cobrado,
           t.metido, t.sacado, t.devuelto, t.tickets, t.cajon_sin_venta, t.deberia_haber,
           t.diferencia, t.motivo_de_la_diferencia as motivo
      from estook.turno_de_caja t
      join estook.cajon c on c.id = t.cajon_id
      join estook.persona pa on pa.id = t.abierta_por
      left join estook.persona pc on pc.id = t.cerrada_por
     where t.local_id = ${localId}::uuid
       and t.fecha_operativa between ${desde}::date and ${hasta}::date
     order by t.fecha_operativa desc, t.abierta_en
  `;
}

/** Los cajones se leen como el sistema: quien ve las ventas no tiene por qué ver los aparatos. */
async function losTurnosDelLocal(
  contexto: Contexto,
  localId: string,
  desde: string,
  hasta: string,
): Promise<FilaDelTurno[]> {
  // Primero, que pueda ver la caja: el sistema solo lee lo de este local.
  const puede = await contexto.sql<
    { ve: boolean }[]
  >`select estook.ve_la_caja(${localId}::uuid) as ve`;
  if (puede[0]?.ve !== true) throw new FalloDeAplicacion('sin_permiso');
  return enNombreDelSistema(contexto, () => losTurnos(contexto, localId, desde, hasta));
}

function menosDias(fecha: string, dias: number): string {
  const d = new Date(`${fecha}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - dias);
  return d.toISOString().slice(0, 10);
}

/**
 * **Cierres de caja** (0142 y 0144): en Estook, con Pro, Servicio › Jornada › Cierres de caja, **solo
 * para ver**. Hoy en vivo (lo que hay ahora en cada cajón) y los dos últimos meses, un día por fila con
 * el total y si cuadra. «Buscar un día» pide ese día.
 */
export const cierresDeCaja = consulta<{ dia?: string | undefined }, LosCierresDeCaja>({
  nombre: 'cierres_de_caja',
  entrada: z
    .object({
      dia: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional(),
    })
    .strict(),
  exige: 'dato.ventas',

  async ejecutar(contexto, entrada) {
    const localId = elLocalDeLaSesion(contexto);
    const hoy = await laJornadaDeHoy(contexto, localId);
    const desde = entrada.dia ?? menosDias(hoy, 62);
    const hasta = entrada.dia ?? hoy;
    const turnos = await losTurnosDelLocal(contexto, localId, desde, hasta);

    const abiertos = turnos.filter((t) => t.cerrada_en === null);
    const hoyEnVivo: UnaCajaDeHoy[] = [];
    for (const t of abiertos) {
      const lleva = await enNombreDelSistema(contexto, () => loQueLlevaLaCaja(contexto, t.id));
      hoyEnVivo.push({
        turnoId: t.id,
        cajon: t.cajon,
        abiertaPor: nombreCorto(t.abrio),
        desde: t.abierta_en,
        enElCajon: loQueDeberiaHaberEn(t.fondo, lleva),
        tarjeta: lleva.tarjeta,
        tickets: lleva.tickets,
      });
    }

    const porDia = new Map<string, FilaDelTurno[]>();
    for (const t of turnos) porDia.set(t.fecha, [...(porDia.get(t.fecha) ?? []), t]);
    const dias: UnDiaDeCaja[] = [];
    for (const [fecha, deEseDia] of porDia) {
      const cerradas = deEseDia.filter((t) => t.cerrada_en !== null);
      if (cerradas.length === 0) continue;
      const ultima = cerradas.reduce((a, b) =>
        (a.cerrada_en ?? '') > (b.cerrada_en ?? '') ? a : b,
      );
      dias.push({
        fecha,
        total: cerradas.reduce(
          (s, t) =>
            s +
            (t.efectivo_cobrado ?? 0) +
            (t.tarjeta_cobrada ?? 0) +
            (t.bizum_cobrado ?? 0) +
            (t.cheque_cobrado ?? 0),
          0,
        ),
        diferencia: cerradas.reduce((s, t) => s + (t.diferencia ?? 0), 0),
        cajas: deEseDia.length,
        ultimaCerro: nombreCorto(ultima.cerro ?? ''),
        ultimaHora: ultima.cerrada_en ?? '',
        abierto: cerradas.length < deEseDia.length,
      });
    }
    return { hoy: hoyEnVivo, dias };
  },
});

export interface UnaCajaCerrada {
  readonly turnoId: string;
  readonly cajon: string;
  readonly abrio: string;
  readonly abiertaEn: string;
  /** Contada al abrir, o «Está correcto»: lo de la última vez. */
  readonly abiertaContando: boolean;
  /** Lo contado al abrir frente a lo que se dejó: «Había 5,00 € menos». */
  readonly alAbrirHabia: number | null;
  readonly cerro: string | null;
  readonly cerradaEn: string | null;
  readonly fondo: number;
  readonly efectivo: number;
  readonly tarjeta: number;
  readonly datafono: number | null;
  readonly bizum: number;
  readonly cheque: number;
  readonly movimientos: readonly UnMovimientoDeLaCaja[];
  readonly deberiaHaber: number;
  readonly contado: number | null;
  readonly diferencia: number | null;
  readonly motivo: MotivoDeLaDiferencia | null;
  readonly paraManana: number | null;
  readonly tickets: number;
  readonly cajonSinVenta: number;
}

export interface ElDiaDeCaja {
  readonly fecha: string;
  readonly total: number;
  readonly efectivo: number;
  readonly tarjeta: number;
  readonly bizum: number;
  readonly cheque: number;
  readonly tickets: number;
  readonly diferencia: number;
  readonly cajonSinVenta: number;
  readonly devuelto: number;
  readonly cajas: readonly UnaCajaCerrada[];
}

/** **Un día**, con el día entero arriba y cada caja con su Z (como Toast; Richi, 9-nov). */
export const unDiaDeCaja = consulta<{ fecha: string }, ElDiaDeCaja>({
  nombre: 'un_dia_de_caja',
  entrada: z.object({ fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).strict(),
  exige: 'dato.ventas',

  async ejecutar(contexto, entrada) {
    const localId = elLocalDeLaSesion(contexto);
    const turnos = await losTurnosDelLocal(contexto, localId, entrada.fecha, entrada.fecha);
    if (turnos.length === 0)
      throw new FalloDeAplicacion('no_existe', { porque: 'Ese día no se abrió la caja.' });
    const cajas: UnaCajaCerrada[] = [];
    for (const t of turnos) {
      const lleva = await enNombreDelSistema(contexto, () => loQueLlevaLaCaja(contexto, t.id));
      const cerrada = t.cerrada_en !== null;
      cajas.push({
        turnoId: t.id,
        cajon: t.cajon,
        abrio: nombreCorto(t.abrio),
        abiertaEn: t.abierta_en,
        abiertaContando: t.contado_al_abrir !== null,
        alAbrirHabia:
          t.contado_al_abrir === null || t.lo_de_la_ultima_vez === null
            ? null
            : t.fondo - t.lo_de_la_ultima_vez,
        cerro: t.cerro === null ? null : nombreCorto(t.cerro),
        cerradaEn: t.cerrada_en,
        fondo: t.fondo,
        efectivo: cerrada ? (t.efectivo_cobrado ?? 0) : lleva.efectivo,
        tarjeta: cerrada ? (t.tarjeta_cobrada ?? 0) : lleva.tarjeta,
        datafono: t.datafono,
        bizum: cerrada ? (t.bizum_cobrado ?? 0) : lleva.bizum,
        cheque: cerrada ? (t.cheque_cobrado ?? 0) : lleva.cheque,
        movimientos: lleva.movimientos,
        deberiaHaber: cerrada ? (t.deberia_haber ?? 0) : loQueDeberiaHaberEn(t.fondo, lleva),
        contado: t.contado_total,
        diferencia: t.diferencia,
        motivo: t.motivo,
        paraManana: t.para_manana,
        tickets: cerrada ? (t.tickets ?? 0) : lleva.tickets,
        cajonSinVenta: cerrada ? (t.cajon_sin_venta ?? 0) : lleva.cajonSinVenta,
      });
    }
    const suma = (f: (c: UnaCajaCerrada) => number) => cajas.reduce((s, c) => s + f(c), 0);
    return {
      fecha: entrada.fecha,
      total: suma((c) => c.efectivo + c.tarjeta + c.bizum + c.cheque),
      efectivo: suma((c) => c.efectivo),
      tarjeta: suma((c) => c.tarjeta),
      bizum: suma((c) => c.bizum),
      cheque: suma((c) => c.cheque),
      tickets: suma((c) => c.tickets),
      diferencia: suma((c) => c.diferencia ?? 0),
      cajonSinVenta: suma((c) => c.cajonSinVenta),
      devuelto: suma((c) =>
        c.movimientos.filter((m) => m.tipo === 'devolucion').reduce((s, m) => s + m.importe, 0),
      ),
      cajas,
    };
  },
});

// ═══ En Estook: los cobros (0145) ════════════════════════════════════════════════════

export interface UnCobroEnEstook {
  readonly cobroId: string;
  readonly en: string;
  /** «Mesa 4», «Barra · Laura». */
  readonly titulo: string;
  readonly importe: number;
  readonly parte: number | null;
  readonly de: number | null;
  readonly pagos: readonly {
    readonly forma: 'efectivo' | 'tarjeta' | 'bizum' | 'cheque';
    readonly importe: number;
    /** Solo en efectivo: lo que dio el cliente, y el cambio. */
    readonly entregado: number | null;
    readonly cambio: number | null;
  }[];
  readonly cobradoPor: string;
  readonly camarero: string | null;
  readonly cajon: string;
  readonly turnoId: string;
  readonly ticket: { readonly documentoId: string; readonly numero: string };
  /** Lo devuelto después, con su rectificativa: un ticket devuelto entero da su importe. */
  readonly devuelto: number;
}

export interface LosCobrosEnEstook {
  readonly desde: string;
  readonly hasta: string;
  readonly totales: {
    readonly cobros: number;
    readonly total: number;
    readonly efectivo: number;
    readonly tarjeta: number;
    readonly bizum: number;
    readonly cheque: number;
    readonly devuelto: number;
  };
  readonly cobros: readonly UnCobroEnEstook[];
}

interface FilaDelCobro {
  readonly id: string;
  readonly en: string;
  readonly tipo: string;
  readonly mesa: string | null;
  readonly nombre: string | null;
  readonly importe: number;
  readonly parte: number | null;
  readonly de_partes: number | null;
  readonly pagos: {
    forma: 'efectivo' | 'tarjeta' | 'bizum' | 'cheque';
    importe: number;
    entregado: number | null;
  }[];
  readonly cobro_por: string;
  readonly camarero: string | null;
  readonly cajon: string;
  readonly turno_id: string;
  readonly documento_id: string;
  readonly serie: string;
  readonly numero: number;
  readonly devuelto: number;
}

/**
 * **Los cobros** (0145; Richi, 10-nov): Negocio › Ventas › Cobros, cada cobro con su hora, su mesa, cómo
 * se pagó, lo que dio el cliente y el cambio, quién lo cobró y su ticket. Y sus totales por forma de
 * pago, para el Resumen. Por días del restaurante (hoy, la semana, el mes…) o los de una caja (los de
 * su Z, «Sus tickets»). Solo para quien ve las ventas.
 */
export const losCobros = consulta<
  { dias?: string | undefined; dia?: string | undefined; turno_id?: string | undefined },
  LosCobrosEnEstook
>({
  nombre: 'los_cobros',
  entrada: z
    .object({
      dias: z
        .string()
        .regex(/^\d{1,3}$/)
        .optional(),
      dia: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional(),
      turno_id: z.string().uuid().optional(),
    })
    .strict(),
  exige: 'dato.ventas',

  async ejecutar(contexto, entrada) {
    const localId = elLocalDeLaSesion(contexto);
    const puede = await contexto.sql<
      { ve: boolean }[]
    >`select estook.ve_la_caja(${localId}::uuid) as ve`;
    if (puede[0]?.ve !== true) throw new FalloDeAplicacion('sin_permiso');
    const hoy = await laJornadaDeHoy(contexto, localId);
    const dias = Math.min(366, Math.max(1, Number(entrada.dias ?? '1')));
    const desde = entrada.dia ?? menosDias(hoy, dias - 1);
    const hasta = entrada.dia ?? hoy;
    const turno = entrada.turno_id ?? null;

    // Las cuentas, sus cajas y quién las cobró se leen como el sistema, ya mirado que puede.
    const filas = await enNombreDelSistema(
      contexto,
      () => contexto.sql<FilaDelCobro[]>`
        select c.id::text as id,
               to_char(c.cobrado_en at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as en,
               cu.tipo, m.nombre as mesa, cu.nombre, c.importe, c.parte, c.de_partes,
               coalesce((select jsonb_agg(jsonb_build_object('forma', p.forma, 'importe', p.importe,
                                                            'entregado', p.entregado)
                                          order by p.forma)
                           from estook.pago p where p.cobro_id = c.id), '[]'::jsonb) as pagos,
               pc.nombre as cobro_por, pm.nombre as camarero, cj.nombre as cajon,
               t.id::text as turno_id, d.id::text as documento_id, d.serie, d.numero,
               coalesce((select sum(-dr.total)::integer
                           from facturacion.rectificacion r
                           join facturacion.documento dr on dr.id = r.rectificativa_id
                          where r.documento_id = d.id and r.clase = 'devolucion'), 0) as devuelto
          from estook.cobro c
          join estook.turno_de_caja t on t.id = c.turno_id
          join estook.cajon cj on cj.id = t.cajon_id
          join estook.cuenta cu on cu.id = c.cuenta_id
          left join estook.mesa m on m.id = cu.mesa_id
          join estook.persona pc on pc.id = c.cobrado_por
          left join estook.persona pm on pm.id = cu.camarero_id
          join facturacion.documento d on d.id = c.documento_id
         where c.local_id = ${localId}::uuid
           and (${turno}::uuid is null or c.turno_id = ${turno}::uuid)
           and (${turno}::uuid is not null
                or t.fecha_operativa between ${desde}::date and ${hasta}::date)
         order by c.cobrado_en desc
      `,
    );
    const cobros: UnCobroEnEstook[] = filas.map((f) => ({
      cobroId: f.id,
      en: f.en,
      titulo: elTituloDeLaCuenta({ tipo: f.tipo, mesa: f.mesa, nombre: f.nombre }),
      importe: f.importe,
      parte: f.parte,
      de: f.de_partes,
      pagos: f.pagos.map((p) => ({
        forma: p.forma,
        importe: p.importe,
        entregado: p.forma === 'efectivo' ? p.entregado : null,
        cambio:
          p.forma === 'efectivo' && p.entregado !== null
            ? Math.max(0, p.entregado - p.importe)
            : null,
      })),
      cobradoPor: nombreCorto(f.cobro_por),
      camarero: f.camarero === null ? null : nombreCorto(f.camarero),
      cajon: f.cajon,
      turnoId: f.turno_id,
      ticket: { documentoId: f.documento_id, numero: elNumeroEntero(f.serie, f.numero) },
      devuelto: f.devuelto,
    }));
    const deLaForma = (forma: string) =>
      cobros.reduce(
        (s, c) => s + c.pagos.filter((p) => p.forma === forma).reduce((t, p) => t + p.importe, 0),
        0,
      );
    return {
      desde,
      hasta,
      totales: {
        cobros: cobros.length,
        total: cobros.reduce((s, c) => s + c.importe, 0),
        efectivo: deLaForma('efectivo'),
        tarjeta: deLaForma('tarjeta'),
        bizum: deLaForma('bizum'),
        cheque: deLaForma('cheque'),
        devuelto: cobros.reduce((s, c) => s + c.devuelto, 0),
      },
      cobros,
    };
  },
});

// ═══ En Estook: el Z de una caja, en PDF (0145) ═══════════════════════════════════════

/** «martes, 10 de noviembre de 2026». */
function elDiaLargo(fecha: string): string {
  return new Intl.DateTimeFormat('es-ES', {
    timeZone: 'UTC',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${fecha}T12:00:00Z`));
}

/**
 * **«Descargar su Z»** (0145; la maqueta de R3): el cierre de una caja, en A4, como salió al cerrarla. Lo
 * descarga quien ve las ventas, desde Servicio › Jornadas › Cierres de caja. No es un documento fiscal.
 */
export const elZEnPdf = consulta<{ turno_id: string }, UnPdf>({
  nombre: 'el_z_en_pdf',
  entrada: z.object({ turno_id: z.string().uuid() }).strict(),
  exige: 'dato.ventas',

  async ejecutar(contexto, entrada) {
    const localId = elLocalDeLaSesion(contexto);
    const cuando = await enNombreDelSistema(
      contexto,
      () => contexto.sql<{ fecha: string }[]>`
        select fecha_operativa::text as fecha from estook.turno_de_caja
         where id = ${entrada.turno_id}::uuid and local_id = ${localId}::uuid
      `,
    );
    const fecha = cuando[0]?.fecha;
    if (fecha === undefined) throw new FalloDeAplicacion('no_existe');
    const t = (await losTurnosDelLocal(contexto, localId, fecha, fecha)).find(
      (x) => x.id === entrada.turno_id,
    );
    if (t === undefined) throw new FalloDeAplicacion('no_existe');
    const marca = await laMarcaDelLocal(contexto, localId);
    const lleva = await enNombreDelSistema(contexto, () => loQueLlevaLaCaja(contexto, t.id));
    const cerrada = t.cerrada_en !== null;
    const efectivo = cerrada ? (t.efectivo_cobrado ?? 0) : lleva.efectivo;
    const tarjeta = cerrada ? (t.tarjeta_cobrada ?? 0) : lleva.tarjeta;
    const bizum = cerrada ? (t.bizum_cobrado ?? 0) : lleva.bizum;
    const cheque = cerrada ? (t.cheque_cobrado ?? 0) : lleva.cheque;
    const deberia = cerrada ? (t.deberia_haber ?? 0) : loQueDeberiaHaberEn(t.fondo, lleva);
    const html = documentoDelZ({
      marca,
      hechoEl: hechoEl(contexto.ahora, marca.zonaHoraria),
      caja: t.cajon,
      dia: elDiaLargo(fecha),
      abrio: `${quienYCuando(t.abrio, t.abierta_en, marca.zonaHoraria)}${t.contado_al_abrir === null ? '' : ' · contando'}`,
      cerro:
        t.cerro === null || t.cerrada_en === null
          ? null
          : quienYCuando(t.cerro, t.cerrada_en, marca.zonaHoraria),
      delCajon: [
        { que: 'Fondo', importe: enDinero(t.fondo) },
        { que: 'Cobrado en efectivo', importe: enDinero(efectivo) },
        ...losMovimientosParaElPapel(lleva.movimientos).map((m) => ({
          que: m.que,
          importe: `${m.importe < 0 ? '−' : '+'}${enDinero(Math.abs(m.importe))}`,
        })),
      ],
      deberiaHaber: enDinero(deberia),
      contado: t.contado_total === null ? null : enDinero(t.contado_total),
      comoCuadra: t.diferencia === null ? 'Sigue abierta' : laDiferenciaEnTexto(t.diferencia),
      cuadra: t.diferencia === 0,
      motivo: t.motivo === null ? null : NOMBRE_DEL_MOTIVO_DE_LA_DIFERENCIA[t.motivo],
      cobrado: enDinero(efectivo + tarjeta + bizum + cheque),
      formas: [
        { que: 'Efectivo', importe: enDinero(efectivo) },
        { que: 'Tarjeta', importe: enDinero(tarjeta) },
        ...(bizum > 0 ? [{ que: 'Bizum', importe: enDinero(bizum) }] : []),
        ...(cheque > 0 ? [{ que: 'Cheques', importe: enDinero(cheque) }] : []),
      ],
      paraManana: t.para_manana === null ? null : enDinero(t.para_manana),
      tickets: cerrada ? (t.tickets ?? 0) : lleva.tickets,
      cajonSinVenta: cerrada ? (t.cajon_sin_venta ?? 0) : lleva.cajonSinVenta,
    });
    const nombre = `z-${t.cajon.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${fecha}.pdf`;
    return hacerElPdf(contexto, html, {
      nombre,
      pie: `Cierre de caja · ${t.cajon} · ${fecha}`,
    });
  },
});
