import { z } from 'zod';
import { fechaOperativa, horaDeCorte, jornadaDe, masDias } from '@estook/dominio';
import { consulta, FalloDeAplicacion, type Contexto } from '../contrato.ts';

/**
 * Lo que ha entrado (M6½).
 *
 * ── Y el food cost, que es la mitad del asunto ──────────────────────────────
 *
 * Con las ventas de un día y lo que se gastó de género ese día, Estook puede decir
 * por fin **qué porcentaje de lo que entra se va en comida**. Es el número que un
 * gerente busca cada mañana y el que no existía.
 *
 * Se calcula con el consumo del libro de movimientos —salidas y mermas valoradas a
 * su coste medio— y no con las compras del día, y esa distinción importa: un día
 * que llega un pedido de dos mil euros no tiene un food cost del 300 %, tiene el
 * mismo de siempre y una compra. **Se mide lo que se gasta, no lo que se compra.**
 *
 * Mientras no exista el emparejamiento de M20, el consumo que se cuenta es el que
 * alguien ha apuntado a mano; cuando llegue, cada venta lo generará sola. La cifra
 * lleva escrito de dónde sale, como todas.
 */

function elLocal(contexto: Contexto): string {
  const localId = contexto.sesion?.localId;
  if (!localId) {
    throw new FalloDeAplicacion('faltan_datos', {
      porque: 'Hay que estar dentro de un local para ver sus ventas. Elige uno primero.',
    });
  }
  return localId;
}

interface FichaDeCierre {
  readonly jornada: string;
  readonly comoSeCierra: string;
  readonly tpv: string | null;
}

async function comoCierra(contexto: Contexto, localId: string): Promise<FichaDeCierre> {
  const filas = await contexto.sql<
    { zona_horaria: string; hora_de_corte: string; como: string; tpv: string | null }[]
  >`
    select zona_horaria, to_char(hora_de_corte, 'HH24:MI') as hora_de_corte,
           como_se_cierra::text as como, tpv
      from estook.local where id = ${localId}
  `;
  const fila = filas[0];
  if (!fila) throw new FalloDeAplicacion('local_ajeno');
  return {
    jornada: jornadaDe(contexto.ahora, fila.zona_horaria, horaDeCorte(fila.hora_de_corte)),
    comoSeCierra: fila.como,
    tpv: fila.tpv,
  };
}

export interface UnCierre {
  readonly cierreId: string;
  readonly fecha: string;
  readonly totalCentimos: number;
  readonly efectivoCentimos: number | null;
  readonly tarjetaCentimos: number | null;
  readonly otrosCentimos: number | null;
  readonly comensales: number | null;
  readonly tickets: number | null;
  readonly origen: string;
  readonly notas: string | null;
  readonly quien: string | null;
  readonly cerradoEn: string;
  readonly cuantasLineas: number;
  /** Lo que se gastó de género esa jornada, a coste medio. Con permiso. */
  readonly consumoCentimos?: number | null;
}

export interface SalidaMisCierres {
  readonly cierres: readonly UnCierre[];
  readonly jornada: string;
  readonly comoSeCierra: string;
  readonly tpv: string | null;
  readonly desde: string;
  readonly hasta: string;
  /** Si la jornada de hoy ya está cerrada. Es lo que decide la tarjeta del Panel. */
  readonly hoyEstaCerrado: boolean;
  readonly totalDelPeriodoCentimos: number;
  readonly diasConVentas: number;
  readonly puedeCerrar: boolean;
  readonly puedeVerCostes: boolean;
  readonly consumoDelPeriodoCentimos?: number | null;
  /** Lo que se va en género de cada cien euros que entran. Nulo si no se sabe. */
  readonly foodCost?: number | null;
}

export const entradaMisCierres = z
  .object({
    desde: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    hasta: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    limite: z.coerce.number().int().min(1).max(400).optional(),
  })
  .strict();

export type EntradaMisCierres = z.infer<typeof entradaMisCierres>;

/** Cuántos días trae por defecto. Un mes: es el periodo del que se habla. */
const POR_DEFECTO_DIAS = 30;

export const misCierres = consulta<EntradaMisCierres, SalidaMisCierres>({
  nombre: 'mis_cierres',
  entrada: entradaMisCierres,
  exige: 'dato.ventas',

  async ejecutar(contexto, entrada) {
    const localId = elLocal(contexto);
    const ficha = await comoCierra(contexto, localId);

    const hasta = entrada.hasta ?? ficha.jornada;
    const desde = entrada.desde ?? masDias(fechaOperativa(hasta), -(POR_DEFECTO_DIAS - 1));
    const limite = entrada.limite ?? 90;

    const permisos = await contexto.sql<{ cerrar: boolean; costes: boolean }[]>`
      select estook.puede_editar('app.servicio', ${localId}::uuid)
             and estook.puede_editar('dato.ventas', ${localId}::uuid) as cerrar,
             estook.puede_ver('dato.precio_de_compra', ${localId}::uuid) as costes
    `;
    const puedeCerrar = permisos[0]?.cerrar === true;
    const puedeVerCostes = permisos[0]?.costes === true;

    const filas = await contexto.sql<
      {
        id: string;
        fecha: string;
        total: string;
        efectivo: string | null;
        tarjeta: string | null;
        otros: string | null;
        comensales: number | null;
        tickets: number | null;
        origen: string;
        notas: string | null;
        quien: string | null;
        cerrado_en: string;
        cuantas: number;
        consumo: string | null;
      }[]
    >`
      select c.id, to_char(c.fecha_operativa, 'YYYY-MM-DD') as fecha,
             c.total_centimos::text as total,
             c.efectivo_centimos::text as efectivo,
             c.tarjeta_centimos::text as tarjeta,
             c.otros_centimos::text as otros,
             c.comensales, c.tickets, c.origen, c.notas,
             p.nombre as quien,
             to_char(c.cerrado_en, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as cerrado_en,
             (select count(*)::int from estook.linea_de_cierre l where l.cierre_id = c.id) as cuantas,
             -- El consumo de esa jornada: lo que salió de cámara valorado a su
             -- coste medio. Salidas y mermas; las entradas no, y los ajustes
             -- tampoco: un ajuste es género que apareció o desapareció sin saber
             -- por dónde, y meterlo aquí haría que cuadrar la cámara moviera el
             -- food cost.
             (
               select sum(round(abs(m.cantidad) * m.coste_medio_despues / 1000))::text
                 from estook.movimiento_de_stock m
                 join estook.producto pr on pr.id = m.producto_id
                where m.local_id = c.local_id
                  and m.fecha_operativa = c.fecha_operativa
                  and m.tipo in ('salida', 'merma', 'consumo')
                  and not pr.es_ejemplo
             ) as consumo
        from estook.cierre_de_caja c
        left join estook.persona p on p.id = c.cerrado_por
       where c.local_id = ${localId}
         and c.fecha_operativa >= ${desde}::date
         and c.fecha_operativa <= ${hasta}::date
       order by c.fecha_operativa desc
       limit ${limite}
    `;

    const total = filas.reduce((suma, f) => suma + Number(f.total), 0);
    const consumo = filas.reduce((suma, f) => suma + Number(f.consumo ?? 0), 0);

    return {
      cierres: filas.map((f) => ({
        cierreId: f.id,
        fecha: f.fecha,
        totalCentimos: Number(f.total),
        efectivoCentimos: f.efectivo === null ? null : Number(f.efectivo),
        tarjetaCentimos: f.tarjeta === null ? null : Number(f.tarjeta),
        otrosCentimos: f.otros === null ? null : Number(f.otros),
        comensales: f.comensales,
        tickets: f.tickets,
        origen: f.origen,
        notas: f.notas,
        quien: f.quien,
        cerradoEn: f.cerrado_en,
        cuantasLineas: f.cuantas,
        ...(puedeVerCostes ? { consumoCentimos: Number(f.consumo ?? 0) } : {}),
      })),
      jornada: ficha.jornada,
      comoSeCierra: ficha.comoSeCierra,
      tpv: ficha.tpv,
      desde,
      hasta,
      hoyEstaCerrado: filas.some((f) => f.fecha === ficha.jornada),
      totalDelPeriodoCentimos: total,
      diasConVentas: filas.length,
      puedeCerrar,
      puedeVerCostes,
      ...(puedeVerCostes
        ? {
            consumoDelPeriodoCentimos: consumo,
            // Un porcentaje con un decimal. Nulo cuando no hay ventas: un food
            // cost sin denominador no es cero, es que no se sabe, y poner cero
            // ahí sería inventarse la cifra más importante de la pantalla.
            foodCost: total > 0 ? Math.round((consumo / total) * 1000) / 10 : null,
          }
        : {}),
    };
  },
});

// ── Un cierre, con sus líneas ────────────────────────────────────────────────

export interface SalidaUnCierre {
  readonly cierre: UnCierre | null;
  readonly lineas: readonly {
    readonly concepto: string;
    readonly unidades: number;
    readonly importeCentimos: number | null;
  }[];
  readonly fecha: string;
  readonly comoSeCierra: string;
  readonly puedeCerrar: boolean;
}

export const unCierre = consulta<{ fecha?: string | undefined }, SalidaUnCierre>({
  nombre: 'un_cierre',
  entrada: z
    .object({
      fecha: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional(),
    })
    .strict(),
  exige: 'dato.ventas',

  async ejecutar(contexto, entrada) {
    const localId = elLocal(contexto);
    const ficha = await comoCierra(contexto, localId);
    const fecha = entrada.fecha ?? ficha.jornada;

    const permisos = await contexto.sql<{ cerrar: boolean }[]>`
      select estook.puede_editar('app.servicio', ${localId}::uuid)
             and estook.puede_editar('dato.ventas', ${localId}::uuid) as cerrar
    `;

    const filas = await contexto.sql<
      {
        id: string;
        fecha: string;
        total: string;
        efectivo: string | null;
        tarjeta: string | null;
        otros: string | null;
        comensales: number | null;
        tickets: number | null;
        origen: string;
        notas: string | null;
        quien: string | null;
        cerrado_en: string;
      }[]
    >`
      select c.id, to_char(c.fecha_operativa, 'YYYY-MM-DD') as fecha,
             c.total_centimos::text as total,
             c.efectivo_centimos::text as efectivo,
             c.tarjeta_centimos::text as tarjeta,
             c.otros_centimos::text as otros,
             c.comensales, c.tickets, c.origen, c.notas,
             p.nombre as quien,
             to_char(c.cerrado_en, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as cerrado_en
        from estook.cierre_de_caja c
        left join estook.persona p on p.id = c.cerrado_por
       where c.local_id = ${localId} and c.fecha_operativa = ${fecha}::date
    `;

    const fila = filas[0];

    const lineas =
      fila === undefined
        ? []
        : await contexto.sql<
            { concepto: string; unidades: string; importe: string | null }[]
          >`
            select concepto, unidades::text as unidades, importe_centimos::text as importe
              from estook.linea_de_cierre
             where cierre_id = ${fila.id}
             order by importe_centimos desc nulls last, unidades desc
          `;

    return {
      cierre:
        fila === undefined
          ? null
          : {
              cierreId: fila.id,
              fecha: fila.fecha,
              totalCentimos: Number(fila.total),
              efectivoCentimos: fila.efectivo === null ? null : Number(fila.efectivo),
              tarjetaCentimos: fila.tarjeta === null ? null : Number(fila.tarjeta),
              otrosCentimos: fila.otros === null ? null : Number(fila.otros),
              comensales: fila.comensales,
              tickets: fila.tickets,
              origen: fila.origen,
              notas: fila.notas,
              quien: fila.quien,
              cerradoEn: fila.cerrado_en,
              cuantasLineas: lineas.length,
            },
      lineas: lineas.map((l) => ({
        concepto: l.concepto,
        unidades: Number(l.unidades),
        importeCentimos: l.importe === null ? null : Number(l.importe),
      })),
      fecha,
      comoSeCierra: ficha.comoSeCierra,
      puedeCerrar: permisos[0]?.cerrar === true,
    };
  },
});
