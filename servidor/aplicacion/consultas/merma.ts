import { z } from 'zod';
import {
  MOTIVOS_DE_MERMA,
  fechaOperativa,
  horaDeCorte,
  jornadaDe,
  masDias,
} from '@estook/dominio';
import { consulta, FalloDeAplicacion, type Contexto } from '../contrato.ts';

/**
 * La merma, para verla y para exportarla (M6½).
 *
 * ── Por qué las sumas las hace Postgres ─────────────────────────────────────
 *
 * Porque la pregunta que se hace no es «dame las mermas», es **«cuánto se me ha
 * ido y en qué»**. Un mes de un bar son unas doscientas líneas de merma; traérselas
 * para sumarlas en JavaScript es traer doscientas filas para devolver tres cifras,
 * y el presupuesto de velocidad de B7 da un segundo para la pantalla entera.
 *
 * Lo que **no** hace Postgres es decidir qué cuenta como pérdida: eso lo decide
 * `estook.partida_de_la_merma`, que es el único dueño de esa clasificación y tiene
 * gemela en el dominio para la pantalla. Una prueba cuadra las dos.
 *
 * ── Y la regla de siempre: el dinero solo si se puede ver ───────────────────
 *
 * Un cocinero apunta mermas y no ve lo que valen. Los campos de dinero **no se
 * esconden: no se envían**.
 */

function elLocal(contexto: Contexto): string {
  const localId = contexto.sesion?.localId;
  if (!localId) {
    throw new FalloDeAplicacion('faltan_datos', {
      porque: 'Hay que estar dentro de un local para ver sus mermas. Elige uno primero.',
    });
  }
  return localId;
}

async function laJornada(contexto: Contexto, localId: string): Promise<string> {
  const filas = await contexto.sql<{ zona_horaria: string; hora_de_corte: string }[]>`
    select zona_horaria, to_char(hora_de_corte, 'HH24:MI') as hora_de_corte
      from estook.local where id = ${localId}
  `;
  const fila = filas[0];
  if (!fila) throw new FalloDeAplicacion('local_ajeno');
  return jornadaDe(contexto.ahora, fila.zona_horaria, horaDeCorte(fila.hora_de_corte));
}

async function puedeVerPrecios(contexto: Contexto, localId: string): Promise<boolean> {
  const filas = await contexto.sql<{ puede: boolean }[]>`
    select estook.puede_ver('dato.precio_de_compra', ${localId}::uuid) as puede
  `;
  return filas[0]?.puede === true;
}

// ── El resumen del día, y la tira de los anteriores ──────────────────────────

export interface DiaDeMerma {
  readonly fecha: string;
  readonly cuantas: number;
  readonly valorCentimos?: number | null;
}

export interface SalidaMermaDeHoy {
  readonly jornada: string;
  readonly deHoy: {
    readonly cuantas: number;
    readonly valorCentimos?: number | null;
    /** Lo más caro que se ha ido hoy, para poder decirlo con nombre. */
    readonly loPeor: { readonly producto: string; readonly valorCentimos?: number | null } | null;
  };
  /** Los últimos catorce días, de viejo a nuevo. Es la gráfica pequeña. */
  readonly dias: readonly DiaDeMerma[];
  /** La media diaria de los catorce, para poder decir si hoy va peor. */
  readonly mediaCentimos?: number | null;
  readonly puedeVerPrecios: boolean;
  readonly puedeApuntar: boolean;
}

/** Cuántos días trae la tira. Dos semanas: se ve el patrón semanal. */
const DIAS_DE_LA_TIRA = 14;

export const mermaDeHoy = consulta<Record<string, never>, SalidaMermaDeHoy>({
  nombre: 'merma_de_hoy',
  entrada: z.object({}).strict(),
  exige: 'app.inventario',

  async ejecutar(contexto) {
    const localId = elLocal(contexto);
    const jornada = await laJornada(contexto, localId);
    const conPrecios = await puedeVerPrecios(contexto, localId);
    const desde = masDias(fechaOperativa(jornada), -(DIAS_DE_LA_TIRA - 1));

    const puede = await contexto.sql<{ puede: boolean }[]>`
      select estook.puede_editar('accion.registrar_merma', ${localId}::uuid) as puede
    `;

    // Una sola pasada por el índice parcial de mermas, agrupada por día. **Los
    // ejemplos no cuentan** (Manifiesto 8): «no cuenta para nada, ni avisos, ni
    // análisis, ni informes».
    const filas = await contexto.sql<{ fecha: string; cuantas: number; valor: string | null }[]>`
      select to_char(m.fecha_operativa, 'YYYY-MM-DD') as fecha,
             count(*)::int as cuantas,
             sum(round(abs(m.cantidad) * m.coste_medio_despues / 1000))::text as valor
        from estook.movimiento_de_stock m
        join estook.producto p on p.id = m.producto_id
       where m.local_id = ${localId}
         and m.tipo = 'merma'
         and not p.es_ejemplo
         and m.fecha_operativa >= ${desde}::date
         and m.fecha_operativa <= ${jornada}::date
       group by m.fecha_operativa
       order by m.fecha_operativa
    `;

    const peor = await contexto.sql<{ producto: string; valor: string | null }[]>`
      select p.nombre as producto,
             round(abs(m.cantidad) * m.coste_medio_despues / 1000)::text as valor
        from estook.movimiento_de_stock m
        join estook.producto p on p.id = m.producto_id
       where m.local_id = ${localId}
         and m.tipo = 'merma'
         and not p.es_ejemplo
         and m.fecha_operativa = ${jornada}::date
       order by abs(m.cantidad) * m.coste_medio_despues desc
       limit 1
    `;

    // La tira lleva **los días vacíos también**, con su cero. Sin ellos, tres
    // mermas en tres semanas se pintarían como tres barras seguidas y parecería
    // que se tira algo todos los días.
    const porFecha = new Map(filas.map((f) => [f.fecha, f]));
    const dias: DiaDeMerma[] = [];
    for (let i = DIAS_DE_LA_TIRA - 1; i >= 0; i -= 1) {
      const fecha = masDias(fechaOperativa(jornada), -i);
      const suya = porFecha.get(fecha);
      dias.push({
        fecha,
        cuantas: suya?.cuantas ?? 0,
        ...(conPrecios ? { valorCentimos: suya === undefined ? 0 : Number(suya.valor ?? 0) } : {}),
      });
    }

    const hoy = porFecha.get(jornada);
    const total = conPrecios
      ? dias.reduce((suma, dia) => suma + (dia.valorCentimos ?? 0), 0)
      : null;
    const elPeor = peor[0];

    return {
      jornada,
      deHoy: {
        cuantas: hoy?.cuantas ?? 0,
        ...(conPrecios ? { valorCentimos: hoy === undefined ? 0 : Number(hoy.valor ?? 0) } : {}),
        loPeor:
          elPeor === undefined
            ? null
            : {
                producto: elPeor.producto,
                ...(conPrecios ? { valorCentimos: Number(elPeor.valor ?? 0) } : {}),
              },
      },
      dias,
      ...(conPrecios && total !== null
        ? { mediaCentimos: Math.round(total / DIAS_DE_LA_TIRA) }
        : {}),
      puedeVerPrecios: conPrecios,
      puedeApuntar: puede[0]?.puede === true,
    };
  },
});

// ── La lista, con sus filtros y sus totales ──────────────────────────────────

export interface LineaDeMerma {
  readonly id: string;
  readonly productoId: string;
  readonly producto: string;
  readonly unidadDeUso: string;
  readonly cuanto: number;
  readonly motivo: string;
  readonly partida: string;
  readonly detalle: string | null;
  readonly fechaOperativa: string;
  readonly ocurrioEn: string;
  readonly quien: string | null;
  readonly categoria: string | null;
  readonly valorCentimos?: number | null;
}

export interface SalidaMisMermas {
  readonly mermas: readonly LineaDeMerma[];
  readonly hayMas: boolean;
  readonly desde: string;
  readonly hasta: string;
  readonly jornada: string;
  /** Cuántas y cuánto, por partida. Es la cifra que se viene a buscar. */
  readonly porPartida: readonly {
    readonly partida: string;
    readonly cuantas: number;
    readonly valorCentimos?: number | null;
  }[];
  /** Y por motivo, para saber en qué se va: es lo que se acciona. */
  readonly porMotivo: readonly {
    readonly motivo: string;
    readonly cuantas: number;
    readonly valorCentimos?: number | null;
  }[];
  /** Los productos que más se van, con nombre. */
  readonly porProducto: readonly {
    readonly productoId: string;
    readonly producto: string;
    readonly cuantas: number;
    readonly valorCentimos?: number | null;
  }[];
  readonly cuantasEnTotal: number;
  readonly valorTotalCentimos?: number | null;
  readonly puedeVerPrecios: boolean;
  readonly puedeApuntar: boolean;
}

export const entradaMisMermas = z
  .object({
    desde: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    hasta: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    motivo: z.enum(MOTIVOS_DE_MERMA).optional(),
    partida: z.enum(['perdida', 'personal', 'atencion']).optional(),
    producto_id: z.string().uuid().optional(),
    texto: z.string().trim().max(120).optional(),
    limite: z.coerce.number().int().min(1).max(500).optional(),
    salto: z.coerce.number().int().min(0).max(100_000).optional(),
  })
  .strict();

export type EntradaMisMermas = z.infer<typeof entradaMisMermas>;

/** Cuántos días trae la lista por defecto. Un mes: es el periodo del food cost. */
const POR_DEFECTO_DIAS = 30;

export const misMermas = consulta<EntradaMisMermas, SalidaMisMermas>({
  nombre: 'mis_mermas',
  entrada: entradaMisMermas,
  exige: 'app.inventario',

  async ejecutar(contexto, entrada) {
    const localId = elLocal(contexto);
    const jornada = await laJornada(contexto, localId);
    const conPrecios = await puedeVerPrecios(contexto, localId);

    const hasta = entrada.hasta ?? jornada;
    const desde = entrada.desde ?? masDias(fechaOperativa(hasta), -(POR_DEFECTO_DIAS - 1));
    const limite = entrada.limite ?? 100;
    const salto = entrada.salto ?? 0;

    const puede = await contexto.sql<{ puede: boolean }[]>`
      select estook.puede_editar('accion.registrar_merma', ${localId}::uuid) as puede
    `;

    const filas = await contexto.sql<
      {
        id: string;
        producto_id: string;
        producto: string;
        unidad_de_uso: string;
        cantidad: string;
        motivo_de_merma: string;
        partida: string;
        motivo: string | null;
        fecha_operativa: string;
        ocurrido_en: string;
        quien: string | null;
        categoria: string | null;
        valor: string | null;
      }[]
    >`
      select m.id::text as id, p.id::text as producto_id, p.nombre as producto,
             p.unidad_de_uso::text as unidad_de_uso,
             m.cantidad::text as cantidad,
             m.motivo_de_merma::text as motivo_de_merma,
             estook.partida_de_la_merma(m.motivo_de_merma)::text as partida,
             m.motivo,
             to_char(m.fecha_operativa, 'YYYY-MM-DD') as fecha_operativa,
             to_char(m.ocurrido_en, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as ocurrido_en,
             pe.nombre as quien,
             c.nombre as categoria,
             round(abs(m.cantidad) * m.coste_medio_despues / 1000)::text as valor
        from estook.movimiento_de_stock m
        join estook.producto p on p.id = m.producto_id
        left join estook.categoria_de_producto c on c.id = p.categoria_id
        left join estook.persona pe on pe.id = m.persona_id
       where m.local_id = ${localId}
         and m.tipo = 'merma'
         and not p.es_ejemplo
         and m.fecha_operativa >= ${desde}::date
         and m.fecha_operativa <= ${hasta}::date
         and (${entrada.motivo ?? null}::text is null
              or m.motivo_de_merma::text = ${entrada.motivo ?? null})
         and (${entrada.partida ?? null}::text is null
              or estook.partida_de_la_merma(m.motivo_de_merma)::text = ${entrada.partida ?? null})
         and (${entrada.producto_id ?? null}::uuid is null
              or m.producto_id = ${entrada.producto_id ?? null}::uuid)
         and (
           ${entrada.texto ?? ''} = ''
           or estook.sin_acentos(p.nombre) like '%' || estook.sin_acentos(${entrada.texto ?? ''}) || '%'
           or estook.sin_acentos(coalesce(m.motivo, '')) like '%' || estook.sin_acentos(${entrada.texto ?? ''}) || '%'
           or estook.sin_acentos(coalesce(pe.nombre, '')) like '%' || estook.sin_acentos(${entrada.texto ?? ''}) || '%'
         )
       order by m.ocurrido_en desc, m.id desc
       limit ${limite + 1} offset ${salto}
    `;

    // Los totales van **sobre el periodo entero**, no sobre la página. Un total
    // que solo cuenta las cien primeras líneas es un total que miente, y es
    // exactamente el fallo que ya se cazó en la vista «sin precio» de productos.
    const totales = await contexto.sql<
      { partida: string; motivo: string; cuantas: number; valor: string | null }[]
    >`
      select estook.partida_de_la_merma(m.motivo_de_merma)::text as partida,
             m.motivo_de_merma::text as motivo,
             count(*)::int as cuantas,
             sum(round(abs(m.cantidad) * m.coste_medio_despues / 1000))::text as valor
        from estook.movimiento_de_stock m
        join estook.producto p on p.id = m.producto_id
       where m.local_id = ${localId}
         and m.tipo = 'merma'
         and not p.es_ejemplo
         and m.fecha_operativa >= ${desde}::date
         and m.fecha_operativa <= ${hasta}::date
       group by 1, 2
    `;

    const porProducto = await contexto.sql<
      { producto_id: string; producto: string; cuantas: number; valor: string | null }[]
    >`
      select p.id::text as producto_id, p.nombre as producto,
             count(*)::int as cuantas,
             sum(round(abs(m.cantidad) * m.coste_medio_despues / 1000))::text as valor
        from estook.movimiento_de_stock m
        join estook.producto p on p.id = m.producto_id
       where m.local_id = ${localId}
         and m.tipo = 'merma'
         and not p.es_ejemplo
         and m.fecha_operativa >= ${desde}::date
         and m.fecha_operativa <= ${hasta}::date
       group by 1, 2
       order by sum(abs(m.cantidad) * m.coste_medio_despues) desc
       limit 10
    `;

    const hayMas = filas.length > limite;

    /**
     * Juntar los totales por lo que diga `clave`.
     *
     * La base los devuelve cruzados —partida y motivo a la vez— porque agrupar dos
     * veces son dos consultas, y esa tabla ya está leída. Aquí solo se suman ocho
     * filas como mucho: nada que ver con clasificar líneas sueltas en JavaScript,
     * que es lo que este fichero se cuida de no hacer.
     */
    const juntar = <T extends string>(clave: (fila: (typeof totales)[number]) => T) => {
      const mapa = new Map<T, { cuantas: number; valor: number }>();
      for (const fila of totales) {
        const cual = clave(fila);
        const antes = mapa.get(cual) ?? { cuantas: 0, valor: 0 };
        mapa.set(cual, {
          cuantas: antes.cuantas + fila.cuantas,
          valor: antes.valor + Number(fila.valor ?? 0),
        });
      }
      return [...mapa.entries()];
    };

    const porPartida = juntar((f) => f.partida).map(([partida, suma]) => ({
      partida,
      cuantas: suma.cuantas,
      ...(conPrecios ? { valorCentimos: suma.valor } : {}),
    }));

    const porMotivo = juntar((f) => f.motivo)
      .map(([motivo, suma]) => ({
        motivo,
        cuantas: suma.cuantas,
        ...(conPrecios ? { valorCentimos: suma.valor } : {}),
      }))
      .sort((a, b) => (b.valorCentimos ?? b.cuantas) - (a.valorCentimos ?? a.cuantas));

    const cuantasEnTotal = totales.reduce((suma, f) => suma + f.cuantas, 0);
    const valorTotal = totales.reduce((suma, f) => suma + Number(f.valor ?? 0), 0);

    return {
      mermas: filas.slice(0, limite).map((f) => ({
        id: f.id,
        productoId: f.producto_id,
        producto: f.producto,
        unidadDeUso: f.unidad_de_uso,
        // Positiva en la lista: en el libro va con signo porque sale, pero «se
        // han ido 2 kg» se lee mejor que «se han ido −2 kg».
        cuanto: Math.abs(Number(f.cantidad)),
        motivo: f.motivo_de_merma,
        partida: f.partida,
        detalle: f.motivo,
        fechaOperativa: f.fecha_operativa,
        ocurrioEn: f.ocurrido_en,
        quien: f.quien,
        categoria: f.categoria,
        ...(conPrecios ? { valorCentimos: Number(f.valor ?? 0) } : {}),
      })),
      hayMas,
      desde,
      hasta,
      jornada,
      porPartida,
      porMotivo,
      porProducto: porProducto.map((f) => ({
        productoId: f.producto_id,
        producto: f.producto,
        cuantas: f.cuantas,
        ...(conPrecios ? { valorCentimos: Number(f.valor ?? 0) } : {}),
      })),
      cuantasEnTotal,
      ...(conPrecios ? { valorTotalCentimos: valorTotal } : {}),
      puedeVerPrecios: conPrecios,
      puedeApuntar: puede[0]?.puede === true,
    };
  },
});
