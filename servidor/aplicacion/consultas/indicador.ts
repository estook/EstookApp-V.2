import { z } from 'zod';
import {
  COMO_ES_EL_INDICADOR,
  INDICADORES,
  fechaOperativa,
  horaDeCorte,
  jornadaDe,
  masDias,
  porcentajeDe,
  ticketMedio,
  esPeriodoDelIndicador,
  type Indicador,
  type PeriodoDelIndicador,
} from '@estook/dominio';
import { LO_QUE_PIDE_EL_INDICADOR } from '@estook/permisos';
import { consulta, FalloDeAplicacion, type Contexto } from '../contrato.ts';
import { comoLista } from '../listas.ts';

/**
 * Un indicador del Panel, con su línea de días (M7, decisión 0039).
 *
 * «Me gustaría algo más moderno: gráficas, flechas de subida y bajada.» Una flecha
 * solo significa algo si compara lo mismo con lo mismo, así que esta consulta
 * devuelve **el periodo pedido y el anterior, del mismo largo**, y la pantalla no
 * suma nada: pinta.
 *
 * ── De dónde sale cada uno, y ninguno se inventa ────────────────────────────
 *
 *   ventas        cierre de caja, con IVA            dato.ventas
 *   ticket-medio  cierre de caja con tickets          dato.ventas
 *   food-cost     consumo del libro ÷ caja del día    dato.ventas + precio de compra
 *   merma         libro, a coste medio                app.inventario + precio de compra
 *   compras       entradas del libro, sin IVA         app.inventario + precio de compra
 *   mis-horas     tus fichajes                        cualquiera con sesión
 *
 * Las cuentas del food cost son **las mismas que `mis_cierres`**: el consumo es lo
 * que salió de cámara ese día —salidas, mermas, ventas y consumos—, y solo cuenta
 * en los días con la caja cerrada. Si aquí se contara distinto, el Panel y
 * Servicio dirían dos food cost para la misma semana.
 *
 * ── Los días sin dato, como nulos y no como ceros ───────────────────────────
 *
 * Un día sin caja cerrada **no vendió cero**: no se sabe. Pintarlo como cero hunde
 * la línea y hace que la flecha diga «bajan las ventas» porque el lunes se cerró.
 * La merma, las compras y las horas sí son cero cuando no hay nada: el libro y los
 * fichajes están siempre, y un día sin apuntes es un día sin apuntes.
 *
 * ── Y el permiso, dentro ────────────────────────────────────────────────────
 *
 * No hay un `exige` fijo porque cada indicador pide lo suyo, y alguno pide dos. El
 * catálogo no ofrece lo que no se puede ver, pero eso es la pantalla: aquí se
 * comprueba otra vez y se contesta `sin_permiso` (regla 26, dos capas).
 */

export const entradaUnIndicador = z
  .object({
    indicador: z.enum(INDICADORES),
    // La semana o el mes, y nada más: son los periodos que se ofrecen.
    dias: z.coerce
      .number()
      .int()
      .refine(
        (cuantos): boolean => esPeriodoDelIndicador(cuantos),
        'Los periodos son 7 o 30 días.',
      ),
  })
  .strict();

export type EntradaUnIndicador = z.infer<typeof entradaUnIndicador>;

export interface DiaDelIndicador {
  readonly fecha: string;
  /** Nulo si ese día no hay dato, que no es lo mismo que cero. */
  readonly valor: number | null;
}

export interface SalidaUnIndicador {
  readonly indicador: Indicador;
  readonly dias: PeriodoDelIndicador;
  readonly jornada: string;
  /** Los días del periodo, de viejo a nuevo. El último es hoy. */
  readonly serie: readonly DiaDelIndicador[];
  /** El periodo entero: suma o cociente, según el indicador. */
  readonly total: number | null;
  /** El periodo anterior, del mismo largo. */
  readonly anterior: number | null;
  /** Cuántos días del periodo tienen dato. «4 de 7 con caja cerrada». */
  readonly diasConDato: number;
}

function elLocal(contexto: Contexto): string {
  const localId = contexto.sesion?.localId;
  if (!localId) {
    throw new FalloDeAplicacion('faltan_datos', {
      porque: 'Hay que estar dentro de un local para ver sus cifras. Elige uno primero.',
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

/** Lo de un día: el numerador y, si es un cociente, el denominador. */
interface DelDia {
  readonly arriba: number;
  readonly abajo: number | null;
}

/**
 * Los días, del primero del periodo anterior hasta hoy, en una sola pasada.
 *
 * Una consulta por indicador, agrupada por día y por el índice de cada tabla.
 * Treinta días y los treinta de antes son sesenta filas como mucho.
 */
async function losDias(
  contexto: Contexto,
  localId: string,
  indicador: Indicador,
  desde: string,
  hasta: string,
): Promise<Map<string, DelDia>> {
  const sql = contexto.sql;
  type Fila = { fecha: string; arriba: string | null; abajo: string | null };
  let filas: Fila[];

  switch (indicador) {
    case 'ventas':
      filas = await sql<Fila[]>`
        select to_char(c.fecha_operativa, 'YYYY-MM-DD') as fecha,
               c.total_centimos::text as arriba, null::text as abajo
          from estook.cierre_de_caja c
         where c.local_id = ${localId}
           and c.fecha_operativa between ${desde}::date and ${hasta}::date
      `;
      break;

    case 'ticket-medio':
      // Solo los días con tickets apuntados: un día sin tickets no tiene ticket
      // medio, y meter su dinero arriba sin sus tickets abajo lo inflaría.
      filas = await sql<Fila[]>`
        select to_char(c.fecha_operativa, 'YYYY-MM-DD') as fecha,
               c.total_centimos::text as arriba, c.tickets::text as abajo
          from estook.cierre_de_caja c
         where c.local_id = ${localId}
           and c.fecha_operativa between ${desde}::date and ${hasta}::date
           and c.tickets is not null and c.tickets > 0
      `;
      break;

    case 'food-cost':
      filas = await sql<Fila[]>`
        select to_char(c.fecha_operativa, 'YYYY-MM-DD') as fecha,
               coalesce((
                 select sum(round(abs(m.cantidad) * m.coste_medio_despues / 1000))
                   from estook.movimiento_de_stock m
                   join estook.producto pr on pr.id = m.producto_id
                  where m.local_id = c.local_id
                    and m.fecha_operativa = c.fecha_operativa
                    and m.tipo in ('salida', 'merma', 'venta', 'consumo')
                    and not pr.es_ejemplo
               ), 0)::text as arriba,
               c.total_centimos::text as abajo
          from estook.cierre_de_caja c
         where c.local_id = ${localId}
           and c.fecha_operativa between ${desde}::date and ${hasta}::date
      `;
      break;

    case 'merma':
      filas = await sql<Fila[]>`
        select to_char(m.fecha_operativa, 'YYYY-MM-DD') as fecha,
               sum(round(abs(m.cantidad) * m.coste_medio_despues / 1000))::text as arriba,
               null::text as abajo
          from estook.movimiento_de_stock m
          join estook.producto p on p.id = m.producto_id
         where m.local_id = ${localId}
           and m.tipo = 'merma'
           and not p.es_ejemplo
           and m.fecha_operativa between ${desde}::date and ${hasta}::date
         group by m.fecha_operativa
      `;
      break;

    case 'compras':
      // Lo que entró, a lo que costó al entrar. Si una entrada no trae coste
      // —género de un regalo, un ajuste de alta—, a su coste medio, que es lo que
      // hace el valor de la cámara con lo mismo.
      filas = await sql<Fila[]>`
        select to_char(m.fecha_operativa, 'YYYY-MM-DD') as fecha,
               sum(round(m.cantidad * coalesce(nullif(m.coste_milesimas, 0), m.coste_medio_despues) / 1000))::text as arriba,
               null::text as abajo
          from estook.movimiento_de_stock m
          join estook.producto p on p.id = m.producto_id
         where m.local_id = ${localId}
           and m.tipo = 'entrada'
           and m.cantidad > 0
           and not p.es_ejemplo
           and m.fecha_operativa between ${desde}::date and ${hasta}::date
         group by m.fecha_operativa
      `;
      break;

    case 'mis-horas': {
      const personaId = contexto.personaId;
      if (personaId === null) throw new FalloDeAplicacion('sin_sesion');
      // Las de todos sus locales, como «Llevas hoy» en la cabecera: son las horas
      // de la persona, no del local. El turno abierto cuenta hasta ahora.
      filas = await sql<Fila[]>`
        select to_char(f.fecha_operativa, 'YYYY-MM-DD') as fecha,
               floor(sum(extract(epoch from (coalesce(f.salio_en, ${contexto.ahora.toISOString()}::timestamptz) - f.entro_en)) / 60))::text as arriba,
               null::text as abajo
          from estook.fichaje f
         where f.persona_id = ${personaId}
           and f.fecha_operativa between ${desde}::date and ${hasta}::date
         group by f.fecha_operativa
      `;
      break;
    }
  }

  return new Map(
    filas.map((f) => [
      f.fecha,
      { arriba: Number(f.arriba ?? 0), abajo: f.abajo === null ? null : Number(f.abajo) },
    ]),
  );
}

/** El valor de un día, o de un periodo entero ya sumado. */
function elValor(indicador: Indicador, arriba: number, abajo: number | null): number | null {
  switch (indicador) {
    case 'food-cost':
      return abajo === null ? null : porcentajeDe(arriba, abajo);
    case 'ticket-medio':
      return ticketMedio(arriba, abajo);
    default:
      return arriba;
  }
}

/** Si un día sin fila vale cero o «no se sabe». Lo decide el dominio. */
function sinFilaEsCero(indicador: Indicador): boolean {
  return COMO_ES_EL_INDICADOR[indicador].sinDatoEsCero;
}

function elPeriodo(
  indicador: Indicador,
  dias: Map<string, DelDia>,
  fechas: readonly string[],
): { total: number | null; conDato: number } {
  let arriba = 0;
  let abajo = 0;
  let conDato = 0;
  for (const fecha of fechas) {
    const delDia = dias.get(fecha);
    if (delDia === undefined) continue;
    conDato += 1;
    arriba += delDia.arriba;
    abajo += delDia.abajo ?? 0;
  }
  if (conDato === 0) return { total: sinFilaEsCero(indicador) ? 0 : null, conDato };
  const esCociente = COMO_ES_EL_INDICADOR[indicador].periodo === 'cociente';
  return { total: elValor(indicador, arriba, esCociente ? abajo : null), conDato };
}

export const unIndicador = consulta<EntradaUnIndicador, SalidaUnIndicador>({
  nombre: 'un_indicador',
  entrada: entradaUnIndicador,

  async ejecutar(contexto, entrada) {
    const localId = elLocal(contexto);
    const { indicador } = entrada;
    const dias: PeriodoDelIndicador = entrada.dias === 30 ? 30 : 7;

    const pide = LO_QUE_PIDE_EL_INDICADOR[indicador];
    if (pide.length > 0) {
      const permisos = await contexto.sql<{ puede: boolean }[]>`
        select bool_and(estook.puede_ver(p, ${localId}::uuid)) as puede
          from unnest(${comoLista(pide)}::text::text[]) as p
      `;
      if (permisos[0]?.puede !== true) throw new FalloDeAplicacion('sin_permiso');
    }

    const jornada = await laJornada(contexto, localId);
    const hoy = fechaOperativa(jornada);
    const desdeElAnterior = masDias(hoy, -(dias * 2 - 1));
    const delDia = await losDias(contexto, localId, indicador, desdeElAnterior, jornada);

    const fechasDe = (desdeHace: number): string[] =>
      Array.from({ length: dias }, (_, i) => masDias(hoy, -(desdeHace - i)));
    const deAhora = fechasDe(dias - 1);
    const deAntes = fechasDe(dias * 2 - 1);

    const serie = deAhora.map((fecha) => {
      const suyo = delDia.get(fecha);
      if (suyo === undefined) return { fecha, valor: sinFilaEsCero(indicador) ? 0 : null };
      return { fecha, valor: elValor(indicador, suyo.arriba, suyo.abajo) };
    });

    const ahora = elPeriodo(indicador, delDia, deAhora);
    const antes = elPeriodo(indicador, delDia, deAntes);

    return {
      indicador,
      dias,
      jornada,
      serie,
      total: ahora.total,
      // Sin un solo dato antes, no hay con qué comparar: nulo, y no hay flecha.
      anterior: antes.conDato === 0 && !sinFilaEsCero(indicador) ? null : antes.total,
      diasConDato: ahora.conDato,
    };
  },
});
