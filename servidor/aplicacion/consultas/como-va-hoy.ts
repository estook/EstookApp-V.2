import { z } from 'zod';
import {
  CANALES_DEL_PANEL,
  FORMAS_DE_PAGO,
  SEMANAS_DE_HISTORIAL,
  alCentimo,
  dondeDeberiasIr,
  elCanalDeLaCuenta,
  elObjetivoDelDia,
  jornadaDe,
  laParteDelDiaQueSueleIrVendida,
  laPrevisionDelCierre,
  losPesosDeLaSemana,
  elLunesDe,
  minutosDeCocina,
  type CanalDeVentaDelPanel,
  type DiaDeLaSemana,
  type FormaDePago,
  type HoraDeLaCurva,
} from '@estook/dominio';
import { consulta, type Contexto } from '../contrato.ts';
import { elLocalDeLaSesion } from '../alta.ts';
import { enNombreDelSistema } from '../pago.ts';
import { elRelojYElFisco } from '../desviacion.ts';
import {
  importeDe,
  lasLineasVendidas,
  lasMesasDelServicio,
  seVendio,
  type LineaVendida,
  type MesaDelServicio,
} from '../lo-que-se-vende.ts';
import { lasCuentasAbiertasEnElPlano } from './sala.ts';

/**
 * **Cómo va hoy** · las cifras vivas del Panel (el rediseño, entrega 3 · decisión 0148).
 *
 * Lo que el Panel pide de un vistazo y ninguna otra consulta daba junto:
 *
 *   · **Las ventas de hoy y las del mismo día de la semana pasada a esta misma hora** (Richi,
 *     21-nov): a las 15:00 no se compara con el miércoles pasado entero, que siempre saldría en
 *     rojo hasta la noche.
 *   · **El objetivo de hoy**, el semanal repartido según lo que vende cada día; **dónde debería ir
 *     la semana**; y **la previsión al cierre**, con la curva de ese mismo día de la semana.
 *   · **Ventas según canal**, **cómo se cobra**, **las mesas ahora** (con las que esperan la
 *     cuenta) y **la cocina**: la espera media, lo que más tarda y lo que espera ahora.
 *
 * **Con IVA** (Richi, 21-nov): como la caja, el objetivo semanal y el semáforo. Información sigue
 * sin IVA, porque allí se mira el margen. El ticket medio, por mesa servida, como en Información.
 *
 * De dónde sale cada cosa: lo de hoy, de las mesas de Estook TPV; si no las hay, del cierre de caja
 * de hoy, si ya está hecho. El historial (el reparto del objetivo), de los cierres de caja, que
 * también escribe la caja del TPV al cerrar (0144). La curva del día, de las mesas.
 */

export type ComoVaHoyOrigen = 'tpv' | 'cierre' | 'nada';

export interface ComoVaHoy {
  /** La jornada de hoy y la hora del local, `HH:MM`. */
  readonly hoy: string;
  readonly hora: string;
  readonly origen: ComoVaHoyOrigen;
  readonly ventas: {
    /** Lo vendido hoy hasta ahora, con IVA; nulo si no se sabe (sin mesas ni cierre). */
    readonly hoy: number | null;
    /** El mismo día de la semana pasada. */
    readonly elOtroDia: string;
    /** Lo de aquel día hasta esta misma hora (solo con mesas); nulo si no se sabe. */
    readonly aEstaHora: number | null;
    /** Aquel día entero. */
    readonly entero: number | null;
  };
  readonly tickets: {
    readonly hoy: number | null;
    /** Con IVA, por mesa servida. */
    readonly medio: number | null;
    /** El de aquel día a esta hora (o entero, sin mesas). */
    readonly medioAntes: number | null;
  };
  /** Nulo si el local no tiene objetivo de ventas semanal. */
  readonly objetivo: {
    readonly semanal: number;
    /** Lo vendido esta semana, de lunes a hoy (hoy, hasta ahora). */
    readonly llevas: number;
    readonly deberiasIr: number;
    readonly hoy: number;
    readonly reparto: 'historial' | 'igual';
  } | null;
  /** Lo que se venderá hoy al ritmo de un día normal; nulo si no hay con qué preverlo. */
  readonly prevision: number | null;
  /**
   * Lo que se suele vender en cada hora este día de la semana, de media, en el orden de la
   * jornada (de la hora de corte en adelante). Vacío sin mesas.
   */
  readonly curva: readonly HoraDeLaCurva[];
  readonly semanasDeCurva: number;
  /** Lo vendido hoy en cada canal (solo con mesas). */
  readonly canales: readonly {
    readonly canal: CanalDeVentaDelPanel;
    readonly ventas: number;
    readonly tickets: number;
  }[];
  /** Lo cobrado hoy por cada forma; nulo si quien mira no ve la caja. */
  readonly cobros: Readonly<Record<FormaDePago, number>> | null;
  /** Lo que pasa en la sala ahora (solo con mesas hoy). */
  readonly sala: {
    readonly mesas: number;
    readonly porCobrar: number | null;
    readonly personas: number;
  } | null;
  readonly cocina: {
    /** Minutos de media desde que le llega la comanda hasta que sale, hoy. */
    readonly media: number | null;
    /** La de ayer, para decir si va más rápida o más lenta. */
    readonly mediaAyer: number | null;
    /** El plato que más tarda esta semana, con dos raciones o más. */
    readonly masLenta: { readonly nombre: string; readonly media: number } | null;
    readonly sacados: number;
    /** Platos en la cocina ahora, y las mesas que los esperan. */
    readonly esperando: number;
    readonly mesasEsperando: number;
  } | null;
}

/** La hora y el minuto del local, de un instante. */
function laHoraDelLocal(instante: Date, zona: string): { hora: number; minuto: number } {
  const partes = new Intl.DateTimeFormat('es-ES', {
    timeZone: zona,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(instante);
  const leer = (tipo: string) => Number(partes.find((p) => p.type === tipo)?.value ?? '0');
  return { hora: leer('hour') % 24, minuto: leer('minute') };
}

/** Los minutos desde la hora de corte: el reloj de la jornada, que pasa la medianoche. */
function minutosDeLaJornada(hora: number, minuto: number, corte: string): number {
  const [h, m] = corte.split(':').map(Number);
  return (hora * 60 + minuto - ((h ?? 5) * 60 + (m ?? 0)) + 24 * 60) % (24 * 60);
}

function masDias(fecha: string, dias: number): string {
  const d = new Date(`${fecha}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

function diaDeLaSemana(fecha: string): DiaDeLaSemana {
  return (((new Date(`${fecha}T12:00:00Z`).getUTCDay() + 6) % 7) + 1) as DiaDeLaSemana;
}

function media(valores: readonly number[]): number | null {
  if (valores.length === 0) return null;
  return alCentimo(valores.reduce((s, v) => s + v, 0) / valores.length);
}

/** Las mesas servidas (no anuladas) que tienen algo vendido. */
function servidas(mesas: readonly MesaDelServicio[], vendidas: readonly LineaVendida[]) {
  const conAlgo = new Set(vendidas.map((l) => l.cuentaId));
  return mesas.filter((m) => m.anuladaEn === null && conAlgo.has(m.cuentaId));
}

function lasCifrasDe(lineas: readonly LineaVendida[], mesas: readonly MesaDelServicio[]) {
  const vendidas = lineas.filter(seVendio);
  if (vendidas.length === 0) return null;
  const conIva = vendidas.reduce((s, l) => s + importeDe(l), 0);
  const tickets = servidas(mesas, vendidas).length;
  return { ventas: conIva, tickets, medio: tickets === 0 ? null : alCentimo(conIva / tickets) };
}

const DE_LA_COCINA = (l: LineaVendida) => l.destino === 'cocina' && seVendio(l);

function laMediaDeCocina(lineas: readonly LineaVendida[]): number | null {
  return media(
    lineas
      .filter(DE_LA_COCINA)
      .map((l) => minutosDeCocina(l.mandadaEn, l.marchadoEn, l.salioEn))
      .filter((m): m is number => m !== null),
  );
}

async function laCurva(
  contexto: Contexto,
  localId: string,
  desde: string,
  hasta: string,
  dia: DiaDeLaSemana,
): Promise<{ porHora: Map<number, number>; jornadas: number }> {
  const filas = await contexto.sql<{ hora: number; ventas: string; jornadas: string }[]>`
    select l.hora::integer as hora,
           sum(l.precio_centimos * l.cantidad)::text as ventas,
           (select count(distinct x.jornada)
              from estook.las_lineas_vendidas(${localId}::uuid, ${desde}::date, ${hasta}::date) x
             where x.quitada_en is null and x.dia_de_semana = ${dia})::text as jornadas
      from estook.las_lineas_vendidas(${localId}::uuid, ${desde}::date, ${hasta}::date) l
     where l.quitada_en is null and l.dia_de_semana = ${dia}
     group by l.hora
  `;
  const jornadas = Number(filas[0]?.jornadas ?? '0');
  return {
    porHora: new Map(filas.map((f) => [f.hora, Number(f.ventas)])),
    jornadas,
  };
}

export const comoVaHoy = consulta<Record<string, never>, ComoVaHoy>({
  nombre: 'como_va_hoy',
  entrada: z.object({}).strict(),
  exige: 'dato.ventas',

  async ejecutar(contexto) {
    const localId = elLocalDeLaSesion(contexto);
    const local = await elRelojYElFisco(contexto, localId);
    const hoy = jornadaDe(contexto.ahora, local.zonaHoraria, local.corte);
    const { hora, minuto } = laHoraDelLocal(contexto.ahora, local.zonaHoraria);
    const ahoraEnLaJornada = minutosDeLaJornada(hora, minuto, local.corte);
    const elOtroDia = masDias(hoy, -7);
    const ayer = masDias(hoy, -1);
    const lunes = elLunesDe(hoy);
    const hoyEs = diaDeLaSemana(hoy);
    const desdeLaSemanaOAyer = lunes < ayer ? lunes : ayer;
    const desdeElHistorial = masDias(hoy, -7 * SEMANAS_DE_HISTORIAL);

    const [lineas, mesas, lineasDeAntes, mesasDeAntes, cierres, objetivos, curva] =
      await Promise.all([
        lasLineasVendidas(contexto, localId, desdeLaSemanaOAyer, hoy),
        lasMesasDelServicio(contexto, localId, hoy, hoy),
        lasLineasVendidas(contexto, localId, elOtroDia, elOtroDia),
        lasMesasDelServicio(contexto, localId, elOtroDia, elOtroDia),
        contexto.sql<{ fecha: string; total: number; tickets: number | null }[]>`
          select to_char(c.fecha_operativa, 'YYYY-MM-DD') as fecha, c.total_centimos as total,
                 c.tickets
            from estook.cierre_de_caja c
           where c.local_id = ${localId}::uuid
             and c.fecha_operativa between ${desdeElHistorial}::date and ${hoy}::date
        `,
        contexto.sql<{ importe: number | null }[]>`
          select importe_centimos as importe from estook.objetivo
           where local_id = ${localId}::uuid and clave = 'ventas_semanales' and hasta is null
        `,
        laCurva(contexto, localId, desdeElHistorial, ayer, hoyEs),
      ]);

    // ── Las ventas de hoy y las de aquel día a esta hora ─────────────────────────────────
    const deHoy = lineas.filter((l) => l.jornada === hoy);
    const cifrasDeHoy = lasCifrasDe(deHoy, mesas);
    const cierreDe = new Map(cierres.map((c) => [c.fecha, c]));
    const cierreDeHoy = cierreDe.get(hoy);
    const origen: ComoVaHoyOrigen =
      cifrasDeHoy !== null ? 'tpv' : cierreDeHoy !== undefined ? 'cierre' : 'nada';
    const ventasDeHoy = cifrasDeHoy?.ventas ?? cierreDeHoy?.total ?? null;

    const zona = local.zonaHoraria;
    const hastaEstaHora = (l: LineaVendida) => {
      const h = laHoraDelLocal(new Date(l.pedidaEn), zona);
      return minutosDeLaJornada(h.hora, h.minuto, local.corte) <= ahoraEnLaJornada;
    };
    const aquelDia = lasCifrasDe(lineasDeAntes, mesasDeAntes);
    const aquelDiaAEstaHora = lasCifrasDe(lineasDeAntes.filter(hastaEstaHora), mesasDeAntes);
    const cierreDeAquel = cierreDe.get(elOtroDia);
    const aEstaHora =
      origen === 'tpv' ? (aquelDiaAEstaHora?.ventas ?? (aquelDia === null ? null : 0)) : null;

    // ── El objetivo, dónde debería ir la semana y la previsión ──────────────────────────
    const delHistorial = cierres
      .filter((c) => c.fecha < hoy)
      .map((c) => ({ fecha: c.fecha, diaDeLaSemana: diaDeLaSemana(c.fecha), ventas: c.total }));
    const pesos = losPesosDeLaSemana(delHistorial);
    const elDeLaJornada = (h: number) => (h - Number(local.corte.slice(0, 2)) + 24) % 24;
    const curvaEnOrden: HoraDeLaCurva[] =
      curva.jornadas === 0
        ? []
        : [...curva.porHora.entries()]
            .map(([h, total]) => ({ hora: h, media: alCentimo(total / curva.jornadas) }))
            .sort((a, b) => elDeLaJornada(a.hora) - elDeLaJornada(b.hora));
    // La parte del día se cuenta en el reloj de la jornada, que pasa la medianoche.
    const parteDelDia = laParteDelDiaQueSueleIrVendida(
      curvaEnOrden.map((h) => ({ hora: elDeLaJornada(h.hora), media: h.media })),
      elDeLaJornada(hora),
      minuto,
    );
    const prevision =
      origen === 'tpv' && ventasDeHoy !== null
        ? laPrevisionDelCierre(ventasDeHoy, parteDelDia, curva.jornadas)
        : null;

    const semanal = objetivos[0]?.importe ?? null;
    let objetivo: ComoVaHoy['objetivo'] = null;
    if (semanal !== null && semanal > 0) {
      const deLaSemana = cierres
        .filter((c) => c.fecha >= lunes && c.fecha < hoy)
        .reduce((s, c) => s + c.total, 0);
      objetivo = {
        semanal,
        llevas: deLaSemana + (ventasDeHoy ?? 0),
        deberiasIr: dondeDeberiasIr(semanal, pesos, hoyEs, parteDelDia, hora, minuto),
        hoy: elObjetivoDelDia(semanal, pesos, hoyEs),
        reparto: pesos.reparto,
      };
    }

    // ── Ventas según canal ─────────────────────────────────────────────────────────────
    const tipoDe = new Map(mesas.map((m) => [m.cuentaId, m.tipo]));
    const canales = CANALES_DEL_PANEL.map((canal) => {
      const suyas = deHoy.filter(
        (l) => seVendio(l) && elCanalDeLaCuenta(tipoDe.get(l.cuentaId) ?? 'mesa') === canal,
      );
      return {
        canal,
        ventas: suyas.reduce((s, l) => s + importeDe(l), 0),
        tickets: new Set(suyas.map((l) => l.cuentaId)).size,
      };
    }).filter((c) => c.ventas > 0);

    // ── Cómo se cobra: solo quien ve la caja ─────────────────────────────────────────────
    const veLaCaja = await contexto.sql<{ ve: boolean }[]>`
      select estook.ve_la_caja(${localId}::uuid) as ve
    `;
    let cobros: ComoVaHoy['cobros'] = null;
    if (veLaCaja[0]?.ve === true) {
      const filas = await enNombreDelSistema(
        contexto,
        () => contexto.sql<{ forma: string; importe: string }[]>`
          select p.forma, sum(p.importe)::text as importe
            from estook.pago p
            join estook.cobro c on c.id = p.cobro_id
            join estook.turno_de_caja t on t.id = c.turno_id
           where c.local_id = ${localId}::uuid and t.fecha_operativa = ${hoy}::date
           group by p.forma
        `,
      );
      const deCada = new Map(filas.map((f) => [f.forma, Number(f.importe)]));
      cobros = Object.fromEntries(FORMAS_DE_PAGO.map((f) => [f, deCada.get(f) ?? 0])) as Record<
        FormaDePago,
        number
      >;
    }

    // ── La sala y la cocina, ahora ───────────────────────────────────────────────────────
    let sala: ComoVaHoy['sala'] = null;
    let cocina: ComoVaHoy['cocina'] = null;
    if (mesas.length > 0) {
      const abiertas = mesas.filter(
        (m) => m.tipo === 'mesa' && m.liberadaEn === null && m.anuladaEn === null,
      );
      // Las que esperan la cuenta, contadas como en el plano. Quien no puede leer el plano
      // (no toma nota) ve las mesas sin ese número.
      let porCobrar: number | null = null;
      try {
        const { enPlano } = await lasCuentasAbiertasEnElPlano(contexto, localId);
        porCobrar = enPlano.filter(
          (c) => c.fila.mesa_id !== null && c.cuenta.comoVa === 'para_cobrar',
        ).length;
      } catch {
        porCobrar = null;
      }
      sala = {
        mesas: abiertas.length,
        porCobrar,
        personas: abiertas.reduce((s, m) => s + (m.personas ?? 0), 0),
      };

      const enCocina = deHoy.filter(
        (l) => DE_LA_COCINA(l) && l.mandadaEn !== null && l.salioEn === null,
      );
      const lentos = new Map<string, number[]>();
      for (const l of lineas.filter((x) => x.jornada >= lunes && DE_LA_COCINA(x))) {
        const m = minutosDeCocina(l.mandadaEn, l.marchadoEn, l.salioEn);
        if (m === null || l.parteDe !== null) continue;
        lentos.set(l.nombre, [...(lentos.get(l.nombre) ?? []), m]);
      }
      const masLenta =
        [...lentos.entries()]
          .filter(([, tiempos]) => tiempos.length >= 2)
          .map(([nombre, tiempos]) => ({ nombre, media: media(tiempos) ?? 0 }))
          .sort((a, b) => b.media - a.media)[0] ?? null;
      cocina = {
        media: laMediaDeCocina(deHoy),
        mediaAyer: laMediaDeCocina(lineas.filter((l) => l.jornada === ayer)),
        masLenta,
        sacados: deHoy
          .filter((l) => DE_LA_COCINA(l) && l.salioEn !== null)
          .reduce((s, l) => s + l.cantidad, 0),
        esperando: enCocina.reduce((s, l) => s + l.cantidad, 0),
        mesasEsperando: new Set(enCocina.map((l) => l.cuentaId)).size,
      };
    }

    return {
      hoy,
      hora: `${String(hora).padStart(2, '0')}:${String(minuto).padStart(2, '0')}`,
      origen,
      ventas: {
        hoy: ventasDeHoy,
        elOtroDia,
        aEstaHora,
        entero: aquelDia?.ventas ?? cierreDeAquel?.total ?? null,
      },
      tickets: {
        hoy: cifrasDeHoy?.tickets ?? cierreDeHoy?.tickets ?? null,
        medio:
          cifrasDeHoy?.medio ??
          (cierreDeHoy?.tickets ? alCentimo(cierreDeHoy.total / cierreDeHoy.tickets) : null),
        medioAntes:
          origen === 'tpv'
            ? (aquelDiaAEstaHora?.medio ?? null)
            : cierreDeAquel?.tickets
              ? alCentimo(cierreDeAquel.total / cierreDeAquel.tickets)
              : null,
      },
      objetivo,
      prevision,
      curva: curvaEnOrden,
      semanasDeCurva: curva.jornadas,
      canales,
      cobros,
      sala,
      cocina,
    };
  },
});
