import { z } from 'zod';
import {
  MINUTOS_PARA_IR_TARDE,
  alCentimo,
  mediaConUnDecimal,
  PERIODOS_DEL_SERVICIO,
  elPeriodoDelServicio,
  jornadaDe,
  minutosDeCocina,
  type PeriodoDelServicio,
} from '@estook/dominio';
import { consulta, FalloDeAplicacion, type Contexto } from '../contrato.ts';
import { loQuePuede } from '../lo-que-puede.ts';
import { elRelojYElFisco, elTipoDeRestauracion } from '../desviacion.ts';
import {
  importeDe,
  lasLineasVendidas,
  lasMesasDelServicio,
  losCostesDeLosPlatos,
  seVendio,
  sinIva,
  type LineaVendida,
  type MesaDelServicio,
} from '../lo-que-se-vende.ts';

/**
 * Servicio › Jornadas › Información y Negocio › Informes (la pausa del 8-nov, 0142).
 *
 *   lo_que_se_vende         las cuatro cifras, lo que más sale, factura y deja, por sección, y
 *                           lo que pasa ahora si es hoy (la línea en vivo que sustituye a «En marcha»)
 *   el_servicio_por_dentro  cuándo se vende, la cocina, lo que se tuerce y las semanas
 *
 * **De dónde sale**: de las mesas de Estook TPV, si las hay en el periodo; si no, de los cierres
 * de caja (Esencial, o Pro antes de usar el TPV): sus totales y, si los traen, sus platos. Lo dice
 * `origen`, y la pantalla lo cuenta. Con el cobro (T7), lo cobrado.
 */

const entrada = z
  .object({
    periodo: z.enum(PERIODOS_DEL_SERVICIO),
    del: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha se escribe así: 2026-11-04.')
      .optional(),
  })
  .strict();

type Entrada = z.infer<typeof entrada>;

function elLocal(contexto: Contexto): string {
  const localId = contexto.sesion?.localId;
  if (!localId) {
    throw new FalloDeAplicacion('faltan_datos', {
      porque: 'Hay que estar dentro de un local para ver lo que vende. Elige uno primero.',
    });
  }
  return localId;
}

async function elPeriodo(
  contexto: Contexto,
  localId: string,
  tipo: PeriodoDelServicio,
  del?: string,
) {
  const local = await elRelojYElFisco(contexto, localId);
  const hoy = jornadaDe(contexto.ahora, local.zonaHoraria, local.corte);
  const periodo = elPeriodoDelServicio(tipo, del ?? null, hoy);
  const iva = await elTipoDeRestauracion(contexto, local, hoy);
  return { hoy, periodo, iva };
}

// ── Lo que se vende ──────────────────────────────────────────────────────────

export interface PlatoVendido {
  readonly id: string;
  readonly nombre: string;
  readonly seccion: string | null;
  readonly bebida: boolean;
  readonly uds: number;
  /** Sin IVA, en céntimos. */
  readonly ventas: number;
  /** Lo que deja, sin IVA: lo vendido menos lo que cuesta. Nulo sin escandallo o sin permiso. */
  readonly margen: number | null;
  readonly margenPorUnidad: number | null;
}

export interface Cifra {
  readonly ahora: number | null;
  readonly antes: number | null;
}

export interface LoQueSeVende {
  readonly periodo: PeriodoDelServicio;
  readonly desde: string;
  readonly hasta: string;
  readonly hoy: string;
  readonly anteriorDel: string;
  readonly siguienteDel: string | null;
  readonly origen: 'tpv' | 'cierre' | 'nada';
  readonly cifras: {
    readonly ventas: Cifra;
    readonly platos: Cifra;
    readonly ticketMedio: Cifra;
    readonly personas: Cifra;
  };
  readonly platos: readonly PlatoVendido[];
  readonly secciones: readonly { readonly nombre: string; readonly ventas: number }[];
  /** Si quien mira puede ver lo que cuesta cada plato: sin eso, no hay «lo que más deja». */
  readonly conMargen: boolean;
  readonly sinEscandallo: { readonly platos: number; readonly ventas: number };
  /** Solo hoy y con mesas: lo que pasa ahora en el local. */
  readonly ahoraMismo: {
    readonly mesas: number;
    readonly personas: number;
    readonly enCocina: number;
    readonly minutosDeCocina: number | null;
  } | null;
}

/** Las cifras de un trozo de tiempo, de las mesas o de los cierres. */
async function lasCifras(
  contexto: Contexto,
  localId: string,
  desde: string,
  hasta: string,
  iva: number | null,
): Promise<{
  origen: 'tpv' | 'cierre' | 'nada';
  lineas: readonly LineaVendida[];
  mesas: readonly MesaDelServicio[];
  ventas: number | null;
  platos: number | null;
  ticketMedio: number | null;
  personas: number | null;
}> {
  const [lineas, mesas] = await Promise.all([
    lasLineasVendidas(contexto, localId, desde, hasta),
    lasMesasDelServicio(contexto, localId, desde, hasta),
  ]);
  const vendidas = lineas.filter(seVendio);
  if (vendidas.length > 0) {
    const conIva = vendidas.reduce((s, l) => s + importeDe(l), 0);
    const servidas = mesas.filter((m) => m.anuladaEn === null);
    const personas = servidas.reduce((s, m) => s + (m.personas ?? 0), 0);
    const platos = vendidas
      .filter((l) => l.destino === 'cocina')
      .reduce((s, l) => s + l.cantidad, 0);
    return {
      origen: 'tpv',
      lineas,
      mesas,
      ventas: sinIva(conIva, iva),
      platos,
      // Con IVA, como lo paga el cliente: «la mesa sale a 27 €».
      ticketMedio: servidas.length === 0 ? null : alCentimo(conIva / servidas.length),
      personas: personas === 0 ? null : personas,
    };
  }
  const cierres = await contexto.sql<
    {
      total: string | null;
      comensales: string | null;
      tickets: string | null;
      platos: string | null;
    }[]
  >`
    select sum(c.total_centimos)::text as total, sum(c.comensales)::text as comensales,
           sum(c.tickets)::text as tickets,
           (select sum(l.unidades) from estook.linea_de_cierre l
              join estook.cierre_de_caja c2 on c2.id = l.cierre_id
             where c2.local_id = ${localId}::uuid
               and c2.fecha_operativa between ${desde}::date and ${hasta}::date)::text as platos
      from estook.cierre_de_caja c
     where c.local_id = ${localId}::uuid
       and c.fecha_operativa between ${desde}::date and ${hasta}::date
  `;
  const fila = cierres[0];
  if (fila?.total == null) {
    return {
      origen: 'nada',
      lineas,
      mesas,
      ventas: null,
      platos: null,
      ticketMedio: null,
      personas: null,
    };
  }
  const total = Number(fila.total);
  const tickets = fila.tickets === null ? null : Number(fila.tickets);
  return {
    origen: 'cierre',
    lineas,
    mesas,
    ventas: sinIva(total, iva),
    platos: fila.platos === null ? null : alCentimo(Number(fila.platos)),
    ticketMedio: tickets === null || tickets === 0 ? null : alCentimo(total / tickets),
    personas: fila.comensales === null ? null : Number(fila.comensales),
  };
}

/** Los platos de lo vendido, juntos por plato (o menú), con lo que deja cada uno. */
function losPlatosVendidos(
  vendidas: readonly LineaVendida[],
  iva: number | null,
  costes: ReadonlyMap<string, number | null> | null,
): PlatoVendido[] {
  const delMenu = new Map<string, LineaVendida[]>();
  for (const l of vendidas) {
    if (l.parteDe === null) continue;
    const lista = delMenu.get(l.parteDe) ?? [];
    lista.push(l);
    delMenu.set(l.parteDe, lista);
  }
  const juntos = new Map<
    string,
    {
      nombre: string;
      seccion: string | null;
      bebida: boolean;
      uds: number;
      conIva: number;
      coste: number | null;
    }
  >();
  for (const l of vendidas) {
    const id = l.platoId ?? l.menuId ?? `nombre:${l.nombre}`;
    // Lo que cuesta: el plato, por su escandallo; un menú, lo que cuestan sus platos; el plato de
    // dentro de un menú, nada (ya lo cuenta su menú), y deja su suplemento.
    let coste: number | null = 0;
    if (costes === null) coste = null;
    else if (l.parteDe !== null) coste = 0;
    else if (l.menuId !== null && l.platoId === null) {
      for (const dentro of delMenu.get(l.lineaId) ?? []) {
        const uno = dentro.platoId === null ? null : (costes.get(dentro.platoId) ?? null);
        coste = coste === null || uno === null ? null : coste + uno * dentro.cantidad;
      }
      coste = coste === null ? null : coste;
    } else {
      const uno = l.platoId === null ? null : (costes.get(l.platoId) ?? null);
      coste = uno === null ? null : uno * l.cantidad;
    }
    const antes = juntos.get(id);
    juntos.set(id, {
      nombre: antes?.nombre ?? l.nombre,
      seccion: antes?.seccion ?? l.seccion,
      bebida: l.destino === 'barra',
      uds: (antes?.uds ?? 0) + l.cantidad,
      conIva: (antes?.conIva ?? 0) + importeDe(l),
      coste:
        antes === undefined
          ? coste
          : antes.coste === null || coste === null
            ? null
            : antes.coste + coste,
    });
  }
  return [...juntos.entries()].map(([id, p]) => {
    const ventas = sinIva(p.conIva, iva);
    const margen = p.coste === null ? null : ventas - p.coste;
    return {
      id,
      nombre: p.nombre,
      seccion: p.seccion,
      bebida: p.bebida,
      uds: p.uds,
      ventas,
      margen,
      margenPorUnidad: margen === null || p.uds === 0 ? null : alCentimo(margen / p.uds),
    };
  });
}

export const loQueSeVende = consulta<Entrada, LoQueSeVende>({
  nombre: 'lo_que_se_vende',
  entrada,
  exige: 'dato.ventas',

  async ejecutar(contexto, pedido) {
    const localId = elLocal(contexto);
    const { hoy, periodo, iva } = await elPeriodo(contexto, localId, pedido.periodo, pedido.del);
    const puede = await loQuePuede(contexto, localId, ['dato.coste_de_plato']);
    const conMargen = puede.ver('dato.coste_de_plato');

    const [ahora, antes] = await Promise.all([
      lasCifras(contexto, localId, periodo.desde, periodo.hasta, iva),
      lasCifras(contexto, localId, periodo.antesDesde, periodo.antesHasta, iva),
    ]);
    const vendidas = ahora.lineas.filter(seVendio);
    const costes = conMargen
      ? await losCostesDeLosPlatos(
          contexto,
          localId,
          vendidas.flatMap((l) => (l.platoId === null ? [] : [l.platoId])),
        )
      : null;

    let platos: PlatoVendido[];
    if (ahora.origen === 'tpv') {
      platos = losPlatosVendidos(vendidas, iva, costes);
    } else {
      // Sin mesas, los platos del cierre si los trae (el CSV de su TPV): sin sección ni margen.
      const filas = await contexto.sql<{ concepto: string; uds: string; importe: string | null }[]>`
        select min(l.concepto) as concepto, sum(l.unidades)::text as uds,
               sum(l.importe_centimos)::text as importe
          from estook.linea_de_cierre l
          join estook.cierre_de_caja c on c.id = l.cierre_id
         where c.local_id = ${localId}::uuid
           and c.fecha_operativa between ${periodo.desde}::date and ${periodo.hasta}::date
         group by l.concepto_normalizado
      `;
      platos = filas.map((f) => ({
        id: `cierre:${f.concepto}`,
        nombre: f.concepto,
        seccion: null,
        bebida: false,
        uds: alCentimo(Number(f.uds)),
        ventas: f.importe === null ? 0 : sinIva(Number(f.importe), iva),
        margen: null,
        margenPorUnidad: null,
      }));
    }
    platos.sort((a, b) => b.uds - a.uds || b.ventas - a.ventas);

    const porSeccion = new Map<string, number>();
    for (const p of platos) {
      const nombre = p.seccion ?? (p.bebida ? 'Bebidas' : 'Sin sección');
      porSeccion.set(nombre, (porSeccion.get(nombre) ?? 0) + p.ventas);
    }
    const sinEscandallo = platos.filter((p) => p.margen === null && !p.bebida && p.ventas > 0);

    // Hoy, con mesas: lo que pasa ahora (lo que se queda de «En marcha»).
    let ahoraMismo: LoQueSeVende['ahoraMismo'] = null;
    if (periodo.desde === hoy && periodo.hasta === hoy && ahora.mesas.length > 0) {
      const abiertas = ahora.mesas.filter((m) => m.liberadaEn === null && m.anuladaEn === null);
      const tiempos = vendidas
        .filter((l) => l.destino === 'cocina')
        .map((l) => minutosDeCocina(l.mandadaEn, l.marchadoEn, l.salioEn))
        .filter((m): m is number => m !== null);
      ahoraMismo = {
        mesas: abiertas.length,
        personas: abiertas.reduce((s, m) => s + (m.personas ?? 0), 0),
        enCocina: vendidas
          .filter((l) => l.destino === 'cocina' && l.mandadaEn !== null && l.salioEn === null)
          .reduce((s, l) => s + l.cantidad, 0),
        minutosDeCocina:
          tiempos.length === 0
            ? null
            : alCentimo(tiempos.reduce((s, m) => s + m, 0) / tiempos.length),
      };
    }

    return {
      periodo: pedido.periodo,
      desde: periodo.desde,
      hasta: periodo.hasta,
      hoy,
      anteriorDel: periodo.anteriorDel,
      siguienteDel: periodo.siguienteDel,
      origen: ahora.origen,
      cifras: {
        ventas: { ahora: ahora.ventas, antes: antes.ventas },
        platos: { ahora: ahora.platos, antes: antes.platos },
        ticketMedio: { ahora: ahora.ticketMedio, antes: antes.ticketMedio },
        personas: { ahora: ahora.personas, antes: antes.personas },
      },
      platos,
      secciones: [...porSeccion.entries()]
        .map(([nombre, ventas]) => ({ nombre, ventas }))
        .sort((a, b) => b.ventas - a.ventas),
      conMargen,
      sinEscandallo: {
        platos: sinEscandallo.length,
        ventas: sinEscandallo.reduce((s, p) => s + p.ventas, 0),
      },
      ahoraMismo,
    };
  },
});

// ── El servicio por dentro ───────────────────────────────────────────────────

export interface ElServicioPorDentro {
  readonly periodo: PeriodoDelServicio;
  readonly desde: string;
  readonly hasta: string;
  readonly hoy: string;
  readonly anteriorDel: string;
  readonly siguienteDel: string | null;
  /** Si hay mesas de Estook TPV en el periodo: sin ellas, solo las semanas de los cierres. */
  readonly conTpv: boolean;
  /** Lo vendido sin IVA por hora del día (de 0 a 23), ahora y antes. */
  readonly porHora: readonly {
    readonly hora: number;
    readonly ahora: number;
    readonly antes: number;
  }[];
  /** Lo vendido sin IVA por día de la semana (1 lunes) y hora. */
  readonly porDiaYHora: readonly {
    readonly dia: number;
    readonly hora: number;
    readonly ventas: number;
  }[];
  readonly cocina: {
    /** Platos con hora de salida: sin pantalla de cocina, cero. */
    readonly conTiempo: number;
    readonly media: number | null;
    readonly mediaAntes: number | null;
    readonly tarde: number;
    readonly mesasConTarde: number;
    readonly porDia: readonly {
      readonly dia: number;
      readonly ahora: number | null;
      readonly antes: number | null;
    }[];
    readonly masLentos: readonly {
      readonly nombre: string;
      readonly uds: number;
      readonly media: number;
      readonly tarde: number;
    }[];
  };
  readonly seTuerce: {
    readonly devueltos: {
      readonly ahora: number;
      readonly antes: number;
      readonly motivos: readonly { readonly motivo: string; readonly veces: number }[];
    };
    readonly cambiados: {
      readonly ahora: number;
      readonly antes: number;
      readonly yaHechos: number;
      readonly platos: readonly string[];
    };
    readonly quitados: { readonly ahora: number; readonly antes: number };
    readonly anuladas: {
      readonly ahora: number;
      readonly antes: number;
      readonly personas: number;
      readonly motivos: readonly { readonly motivo: string; readonly veces: number }[];
    };
  };
  /** Las ocho semanas hasta la del periodo, sin IVA: de las mesas o de los cierres. */
  readonly semanas: readonly { readonly lunes: string; readonly ventas: number | null }[];
  readonly mejorDia: { readonly dia: string; readonly ventas: number } | null;
  readonly peorDia: { readonly dia: string; readonly ventas: number } | null;
}

function porMotivo(motivos: readonly (string | null)[]): { motivo: string; veces: number }[] {
  const cuenta = new Map<string, number>();
  for (const m of motivos) {
    const limpio = (m ?? '').trim();
    const motivo = limpio === '' ? 'Sin motivo' : limpio.charAt(0).toUpperCase() + limpio.slice(1);
    cuenta.set(motivo, (cuenta.get(motivo) ?? 0) + 1);
  }
  return [...cuenta.entries()]
    .map(([motivo, veces]) => ({ motivo, veces }))
    .sort((a, b) => b.veces - a.veces);
}

function lasCuentasDeLaCocina(lineas: readonly LineaVendida[]) {
  const deCocina = lineas.filter((l) => seVendio(l) && l.destino === 'cocina');
  const tiempos = deCocina
    .map((l) => ({ l, minutos: minutosDeCocina(l.mandadaEn, l.marchadoEn, l.salioEn) }))
    .filter((t): t is { l: LineaVendida; minutos: number } => t.minutos !== null);
  return tiempos;
}

const media = mediaConUnDecimal;

export const elServicioPorDentro = consulta<Entrada, ElServicioPorDentro>({
  nombre: 'el_servicio_por_dentro',
  entrada,
  exige: 'dato.ventas',

  async ejecutar(contexto, pedido) {
    const localId = elLocal(contexto);
    const { hoy, periodo, iva } = await elPeriodo(contexto, localId, pedido.periodo, pedido.del);
    const ochoSemanasAntes = elPeriodoDelServicio('semana', periodo.hasta, hoy).desde;
    const primerLunes = new Date(Date.parse(`${ochoSemanasAntes}T12:00:00Z`) - 7 * 7 * 86_400_000)
      .toISOString()
      .slice(0, 10);

    const [lineas, mesas, lineasAntes, mesasAntes, todasLasSemanas] = await Promise.all([
      lasLineasVendidas(contexto, localId, periodo.desde, periodo.hasta),
      lasMesasDelServicio(contexto, localId, periodo.desde, periodo.hasta),
      lasLineasVendidas(contexto, localId, periodo.antesDesde, periodo.antesHasta),
      lasMesasDelServicio(contexto, localId, periodo.antesDesde, periodo.antesHasta),
      lasLineasVendidas(contexto, localId, primerLunes, periodo.hasta),
    ]);
    const vendidas = lineas.filter(seVendio);
    const vendidasAntes = lineasAntes.filter(seVendio);

    // Cuándo se vende.
    const porHora = Array.from({ length: 24 }, (_, hora) => ({
      hora,
      ahora: sinIva(
        vendidas.filter((l) => l.hora === hora).reduce((s, l) => s + importeDe(l), 0),
        iva,
      ),
      antes: sinIva(
        vendidasAntes.filter((l) => l.hora === hora).reduce((s, l) => s + importeDe(l), 0),
        iva,
      ),
    }));
    const calor = new Map<string, number>();
    for (const l of vendidas) {
      const clave = `${String(l.diaDeSemana)}-${String(l.hora)}`;
      calor.set(clave, (calor.get(clave) ?? 0) + importeDe(l));
    }
    const porDiaYHora = [...calor.entries()].map(([clave, conIva]) => {
      const [dia, hora] = clave.split('-').map(Number) as [number, number];
      return { dia, hora, ventas: sinIva(conIva, iva) };
    });

    // La cocina.
    const tiempos = lasCuentasDeLaCocina(lineas);
    const tiemposAntes = lasCuentasDeLaCocina(lineasAntes);
    const tarde = tiempos.filter((t) => t.minutos > MINUTOS_PARA_IR_TARDE);
    const porPlato = new Map<string, { uds: number; minutos: number[]; tarde: number }>();
    for (const t of tiempos) {
      const uno = porPlato.get(t.l.nombre) ?? { uds: 0, minutos: [], tarde: 0 };
      uno.uds += t.l.cantidad;
      uno.minutos.push(t.minutos);
      if (t.minutos > MINUTOS_PARA_IR_TARDE) uno.tarde += 1;
      porPlato.set(t.l.nombre, uno);
    }

    // Lo que se tuerce.
    const devueltos = lineas.filter((l) => l.vuelveEn !== null);
    const cambiados = lineas.filter((l) => l.cambiada);
    const quitados = lineas.filter(
      (l) => l.quitadaEn !== null && l.mandadaEn !== null && !l.cambiada,
    );
    const anuladas = mesas.filter((m) => m.anuladaEn !== null);

    // Las semanas: de las mesas, y la que no tenga, de los cierres.
    const lunesDe = (fecha: string) => elPeriodoDelServicio('semana', fecha, '9999-12-31').desde;
    const semanas = Array.from({ length: 8 }, (_, i) =>
      new Date(Date.parse(`${primerLunes}T12:00:00Z`) + i * 7 * 86_400_000)
        .toISOString()
        .slice(0, 10),
    );
    const deLasMesas = new Map<string, number>();
    for (const l of todasLasSemanas.filter(seVendio)) {
      const lunes = lunesDe(l.jornada);
      deLasMesas.set(lunes, (deLasMesas.get(lunes) ?? 0) + importeDe(l));
    }
    const cierres = await contexto.sql<{ fecha: string; total: string }[]>`
      select to_char(fecha_operativa, 'YYYY-MM-DD') as fecha, total_centimos::text as total
        from estook.cierre_de_caja
       where local_id = ${localId}::uuid
         and fecha_operativa between ${primerLunes}::date and ${periodo.hasta}::date
    `;
    const deLosCierres = new Map<string, number>();
    for (const c of cierres) {
      const lunes = lunesDe(c.fecha);
      deLosCierres.set(lunes, (deLosCierres.get(lunes) ?? 0) + Number(c.total));
    }

    // El mejor y el peor día del periodo.
    const porDia = new Map<string, number>();
    if (vendidas.length > 0) {
      for (const l of vendidas) porDia.set(l.jornada, (porDia.get(l.jornada) ?? 0) + importeDe(l));
    } else {
      for (const c of cierres) {
        if (c.fecha >= periodo.desde && c.fecha <= periodo.hasta)
          porDia.set(c.fecha, Number(c.total));
      }
    }
    const dias = [...porDia.entries()].sort((a, b) => b[1] - a[1]);
    const mejor = dias[0];
    const peor = dias.length > 1 ? dias[dias.length - 1] : undefined;

    return {
      periodo: pedido.periodo,
      desde: periodo.desde,
      hasta: periodo.hasta,
      hoy,
      anteriorDel: periodo.anteriorDel,
      siguienteDel: periodo.siguienteDel,
      conTpv: lineas.length > 0 || mesas.length > 0,
      porHora,
      porDiaYHora,
      cocina: {
        conTiempo: tiempos.length,
        media: media(tiempos.map((t) => t.minutos)),
        mediaAntes: media(tiemposAntes.map((t) => t.minutos)),
        tarde: tarde.length,
        mesasConTarde: new Set(tarde.map((t) => t.l.cuentaId)).size,
        porDia: Array.from({ length: 7 }, (_, i) => ({
          dia: i + 1,
          ahora: media(tiempos.filter((t) => t.l.diaDeSemana === i + 1).map((t) => t.minutos)),
          antes: media(tiemposAntes.filter((t) => t.l.diaDeSemana === i + 1).map((t) => t.minutos)),
        })),
        masLentos: [...porPlato.entries()]
          .map(([nombre, p]) => ({
            nombre,
            uds: p.uds,
            media: media(p.minutos) ?? 0,
            tarde: p.tarde,
          }))
          .filter((p) => p.uds >= 3)
          .sort((a, b) => b.media - a.media)
          .slice(0, 5),
      },
      seTuerce: {
        devueltos: {
          ahora: devueltos.length,
          antes: lineasAntes.filter((l) => l.vuelveEn !== null).length,
          motivos: porMotivo(devueltos.map((l) => l.motivoDeVuelve)),
        },
        cambiados: {
          ahora: cambiados.length,
          antes: lineasAntes.filter((l) => l.cambiada).length,
          yaHechos: cambiados.filter((l) => l.estabaHecho === true).length,
          platos: [...new Set(cambiados.map((l) => l.nombre))].slice(0, 6),
        },
        quitados: {
          ahora: quitados.length,
          antes: lineasAntes.filter(
            (l) => l.quitadaEn !== null && l.mandadaEn !== null && !l.cambiada,
          ).length,
        },
        anuladas: {
          ahora: anuladas.length,
          antes: mesasAntes.filter((m) => m.anuladaEn !== null).length,
          personas: anuladas.reduce((s, m) => s + (m.personas ?? 0), 0),
          motivos: porMotivo(anuladas.map((m) => m.motivoDeAnular)),
        },
      },
      semanas: semanas.map((lunes) => {
        const conIva = deLasMesas.get(lunes) ?? deLosCierres.get(lunes);
        return { lunes, ventas: conIva === undefined ? null : sinIva(conIva, iva) };
      }),
      mejorDia: mejor === undefined ? null : { dia: mejor[0], ventas: sinIva(mejor[1], iva) },
      peorDia: peor === undefined ? null : { dia: peor[0], ventas: sinIva(peor[1], iva) },
    };
  },
});
