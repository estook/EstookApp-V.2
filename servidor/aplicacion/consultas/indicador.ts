import { z } from 'zod';
import {
  COMO_ES_EL_INDICADOR,
  INDICADORES,
  fechaOperativa,
  horaDeCorte,
  jornadaDe,
  lasFotosDeLaCamara,
  llegoTarde,
  loQueCuesta,
  masDias,
  minutosDeSegundos,
  porcentajeDe,
  ticketMedio,
  esPeriodoDelIndicador,
  type Indicador,
  type LineaDelLibro,
  type PeriodoDelIndicador,
  type ProductoDeLaFoto,
  type Retribucion,
} from '@estook/dominio';
import { LO_QUE_PIDE_EL_INDICADOR } from '@estook/permisos';
import { consulta, FalloDeAplicacion, type Contexto } from '../contrato.ts';
import { comoLista } from '../listas.ts';
import { lasEntradasDelHorario, lasHorasDelEquipo, lasRetribuciones } from './equipo.ts';

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
 * Y desde V (mejora 2), las de cada app:
 *
 *   valor-camara    foto del libro, a coste medio      app.inventario + precio de compra
 *   bajo-minimo     foto del libro, con los mínimos    app.inventario
 *   cierres         días con la caja cerrada           dato.ventas
 *   horas-equipo    fichajes de quien llevas           app.equipo
 *   coste-personal  esas horas por su salario          app.equipo + coste de personal
 *   retrasos        fichajes frente al horario         app.equipo
 *
 * Todas menos los cierres **no se cuentan por su cuenta**: la cámara se
 * reconstruye como la cuenta «Hoy» de Inventario, y las del equipo como el Resumen
 * de Equipo. Cada una tiene su prueba que compara.
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

/**
 * Los que se cuentan día a día desde una sola tabla, con numerador y denominador.
 * Los otros cinco van por su camino, abajo: la cámara es una foto, y las horas, el
 * coste y los retrasos del equipo se cuentan como en el Resumen.
 */
type PorDias = Exclude<
  Indicador,
  'valor-camara' | 'bajo-minimo' | 'horas-equipo' | 'coste-personal' | 'retrasos'
>;

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
  indicador: PorDias,
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

    case 'cierres':
      // Un día cuenta una vez, aunque tenga más de un cierre: la pregunta es
      // «¿se cerró la caja ese día?», no cuántas veces.
      filas = await sql<Fila[]>`
        select to_char(c.fecha_operativa, 'YYYY-MM-DD') as fecha,
               '1' as arriba, null::text as abajo
          from estook.cierre_de_caja c
         where c.local_id = ${localId}
           and c.fecha_operativa between ${desde}::date and ${hasta}::date
         group by c.fecha_operativa
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

    const fechasDe = (desdeHace: number): string[] =>
      Array.from({ length: dias }, (_, i) => masDias(hoy, -(desdeHace - i)));
    const periodos: LosDosPeriodos = {
      deAntes: fechasDe(dias * 2 - 1),
      deAhora: fechasDe(dias - 1),
      jornada,
    };

    let calculado: Calculado;
    switch (indicador) {
      case 'valor-camara':
      case 'bajo-minimo':
        calculado = await laCamara(contexto, localId, indicador, periodos);
        break;
      case 'horas-equipo':
      case 'coste-personal':
        calculado = await elEquipo(contexto, localId, indicador, periodos);
        break;
      case 'retrasos':
        calculado = await losRetrasos(contexto, localId, periodos);
        break;
      default:
        calculado = await porDias(contexto, localId, indicador, periodos);
    }

    return { indicador, dias, jornada, ...calculado };
  },
});

// ── Los caminos ─────────────────────────────────────────────────────────────

/** Los días del periodo pedido y los del anterior, del mismo largo, de viejo a nuevo. */
interface LosDosPeriodos {
  readonly deAntes: readonly string[];
  readonly deAhora: readonly string[];
  readonly jornada: string;
}

type Calculado = Pick<SalidaUnIndicador, 'serie' | 'total' | 'anterior' | 'diasConDato'>;

/** Lo que sale de una tabla día a día: ventas, ticket, food cost, merma, compras, horas y cierres. */
async function porDias(
  contexto: Contexto,
  localId: string,
  indicador: PorDias,
  { deAntes, deAhora, jornada }: LosDosPeriodos,
): Promise<Calculado> {
  const delDia = await losDias(contexto, localId, indicador, deAntes[0] ?? jornada, jornada);

  const serie = deAhora.map((fecha) => {
    const suyo = delDia.get(fecha);
    if (suyo === undefined) return { fecha, valor: sinFilaEsCero(indicador) ? 0 : null };
    return { fecha, valor: elValor(indicador, suyo.arriba, suyo.abajo) };
  });

  const ahora = elPeriodo(indicador, delDia, deAhora);
  const antes = elPeriodo(indicador, delDia, deAntes);

  return {
    serie,
    total: ahora.total,
    // Sin un solo dato antes, no hay con qué comparar: nulo, y no hay flecha.
    anterior: antes.conDato === 0 && !sinFilaEsCero(indicador) ? null : antes.total,
    diasConDato: ahora.conDato,
  };
}

/**
 * El valor de la cámara y lo que está bajo mínimo: **una foto de cada día**.
 *
 * Lo que hay no se suma: el valor de la semana es lo que había al acabar la
 * semana, y se compara con lo que había al acabar la anterior. Cada día se
 * reconstruye del libro con `lasFotosDeLaCamara`, que es del dominio (regla 6), y
 * el de hoy tiene que ser el mismo que enseña Inventario · Hoy.
 *
 * Aquí solo se lee: los productos que cuentan —activos y sin los ejemplos, como
 * en «Hoy»— y, de cada uno, **la última línea del libro de cada día**, más la
 * última de antes de empezar.
 */
async function laCamara(
  contexto: Contexto,
  localId: string,
  indicador: 'valor-camara' | 'bajo-minimo',
  { deAntes, deAhora, jornada }: LosDosPeriodos,
): Promise<Calculado> {
  const todas = [...deAntes, ...deAhora];
  const primera = todas[0] ?? jornada;

  const productos = await contexto.sql<
    {
      id: string;
      minimo: string | null;
      precio_de_hoy: string | null;
      en_mis_zonas: boolean;
      desde: string | null;
    }[]
  >`
    select p.id::text as id, p.minimo::text as minimo,
           pr.coste_milesimas::text as precio_de_hoy,
           -- El bajo mínimo es el de la lista de «Hoy», que es la de tus zonas
           -- (0038). El valor, el del local entero, como en «Hoy».
           p.zona = any (estook.zonas_que_ve(p.local_id)) as en_mis_zonas,
           -- Desde qué jornada existe: la de su alta, o la de su primer
           -- movimiento si es anterior (un alta de hoy con género de ayer).
           to_char(least(
             ((p.creado_en at time zone l.zona_horaria) - l.hora_de_corte::interval)::date,
             (select min(m.fecha_operativa) from estook.movimiento_de_stock m
               where m.producto_id = p.id)
           ), 'YYYY-MM-DD') as desde
      from estook.producto p
      join estook.local l on l.id = p.local_id
      left join estook.precio_vigente(p.id) pr on true
     where p.local_id = ${localId} and p.activo and not p.es_ejemplo
  `;

  const lineas = await contexto.sql<
    {
      producto_id: string;
      dia: string | null;
      orden: string;
      cantidad: string;
      coste: string;
    }[]
  >`
    -- La última línea de cada producto en cada día pedido, y la última de antes
    -- (dia nulo). «Última» por orden del libro, como la vista de existencias.
    select distinct on (m.producto_id, dia)
           m.producto_id::text as producto_id, dia, m.id::text as orden,
           m.cantidad_despues::text as cantidad, m.coste_medio_despues::text as coste
      from (
        select m.*,
               case when m.fecha_operativa < ${primera}::date then null
                    else to_char(m.fecha_operativa, 'YYYY-MM-DD') end as dia
          from estook.movimiento_de_stock m
         where m.local_id = ${localId}
           and m.fecha_operativa <= ${jornada}::date
      ) m
     order by m.producto_id, dia, m.id desc
  `;

  const antes = new Map<string, LineaDelLibro>();
  const delDia = new Map<string, Map<string, LineaDelLibro>>();
  for (const linea of lineas) {
    const hay: LineaDelLibro = {
      orden: Number(linea.orden),
      cantidad: Number(linea.cantidad),
      costeMedio: Number(linea.coste),
    };
    if (linea.dia === null) {
      antes.set(linea.producto_id, hay);
      continue;
    }
    const suyos = delDia.get(linea.producto_id) ?? new Map<string, LineaDelLibro>();
    suyos.set(linea.dia, hay);
    delDia.set(linea.producto_id, suyos);
  }

  const fotos = lasFotosDeLaCamara(
    productos.map((p): ProductoDeLaFoto => ({
      desde: p.desde ?? jornada,
      minimo: p.minimo === null ? null : Number(p.minimo),
      precioDeHoy: p.precio_de_hoy === null ? null : Number(p.precio_de_hoy),
      cuentaEnElMinimo: p.en_mis_zonas,
      antes: antes.get(p.id) ?? null,
      delDia: delDia.get(p.id) ?? new Map(),
    })),
    todas,
  );

  const deCadaDia = new Map(
    fotos.map((foto) => [foto.fecha, indicador === 'valor-camara' ? foto.valor : foto.bajoMinimo]),
  );
  const ultimoDe = (fechas: readonly string[]): number | null => {
    const ultima = fechas.at(-1);
    return ultima === undefined ? null : (deCadaDia.get(ultima) ?? null);
  };

  return {
    serie: deAhora.map((fecha) => ({ fecha, valor: deCadaDia.get(fecha) ?? null })),
    total: ultimoDe(deAhora),
    anterior: ultimoDe(deAntes),
    // Lo que hay se sabe todos los días.
    diasConDato: deAhora.length,
  };
}

/**
 * Las horas y el coste del equipo, **contados como en Equipo · Resumen**.
 *
 * El Resumen redondea el total de cada persona y le aplica **la retribución
 * vigente al final del periodo** («un resumen de marzo cuesta lo que costaba en
 * marzo»). El total de aquí hace exactamente lo mismo, persona a persona, para que
 * las dos pantallas digan las mismas horas y el mismo dinero —lo vigila una
 * prueba—. La línea de los días se cuenta día a día con la misma regla, así que
 * puede diferir del total en algún céntimo de redondeo, que en una línea no se ve.
 */
async function elEquipo(
  contexto: Contexto,
  localId: string,
  indicador: 'horas-equipo' | 'coste-personal',
  { deAntes, deAhora, jornada }: LosDosPeriodos,
): Promise<Calculado> {
  const horas = await lasHorasDelEquipo(contexto, localId, deAntes[0] ?? jornada, jornada);
  const personas = [...new Set(horas.map((h) => h.personaId))];

  const conCoste = indicador === 'coste-personal';
  const finDeAntes = deAntes.at(-1) ?? jornada;
  const cobraAhora = conCoste
    ? await lasRetribuciones(contexto, localId, personas, jornada)
    : new Map<string, Retribucion>();
  const cobraAntes = conCoste
    ? await lasRetribuciones(contexto, localId, personas, finDeAntes)
    : new Map<string, Retribucion>();

  /** Lo de una persona con sus minutos ya redondeados: minutos, o lo que cuestan. */
  const loDe = (personaId: string, minutos: number, cobra: ReadonlyMap<string, Retribucion>) => {
    if (!conCoste) return minutos;
    const retribucion = cobra.get(personaId);
    // Sin salario puesto no cuenta, como en el Resumen.
    return retribucion === undefined ? 0 : (loQueCuesta(minutos, retribucion) ?? 0);
  };

  const delPeriodo = (fechas: readonly string[], cobra: ReadonlyMap<string, Retribucion>) => {
    const dentro = new Set(fechas);
    const segundosDe = new Map<string, number>();
    const dias = new Set<string>();
    for (const h of horas) {
      if (!dentro.has(h.fecha)) continue;
      dias.add(h.fecha);
      segundosDe.set(h.personaId, (segundosDe.get(h.personaId) ?? 0) + h.segundos);
    }
    let total = 0;
    for (const [personaId, segundos] of segundosDe) {
      total += loDe(personaId, minutosDeSegundos(segundos), cobra);
    }
    return { total, conDato: dias.size };
  };

  const serie = deAhora.map((fecha) => {
    let valor = 0;
    for (const h of horas) {
      if (h.fecha === fecha) valor += loDe(h.personaId, minutosDeSegundos(h.segundos), cobraAhora);
    }
    return { fecha, valor };
  });

  const ahora = delPeriodo(deAhora, cobraAhora);
  const antes = delPeriodo(deAntes, cobraAntes);
  return { serie, total: ahora.total, anterior: antes.total, diasConDato: ahora.conDato };
}

/**
 * Los retrasos: las entradas del horario de siempre que se ficharon tarde.
 *
 * Con la pieza que usa el Resumen (`lasEntradasDelHorario`) y la regla del dominio
 * (`llegoTarde`): lo que aquí es un retraso, allí también. **Un día en el que nadie
 * tenía que entrar no tiene dato**, ni un periodo sin horarios puestos: un equipo
 * sin horario saldría perfecto, y es lo contrario de lo que se sabe.
 */
async function losRetrasos(
  contexto: Contexto,
  localId: string,
  { deAntes, deAhora, jornada }: LosDosPeriodos,
): Promise<Calculado> {
  const { margen, entradas } = await lasEntradasDelHorario(
    contexto,
    localId,
    deAntes[0] ?? jornada,
    jornada,
  );

  const tardeDe = new Map<string, number>();
  for (const entrada of entradas) {
    const tarde = entrada.minutosTarde !== null && llegoTarde(entrada.minutosTarde, margen);
    tardeDe.set(entrada.fecha, (tardeDe.get(entrada.fecha) ?? 0) + (tarde ? 1 : 0));
  }

  const delPeriodo = (fechas: readonly string[]) => {
    let total = 0;
    let conDato = 0;
    for (const fecha of fechas) {
      const suyos = tardeDe.get(fecha);
      if (suyos === undefined) continue;
      conDato += 1;
      total += suyos;
    }
    return { total: conDato === 0 ? null : total, conDato };
  };

  const ahora = delPeriodo(deAhora);
  const antes = delPeriodo(deAntes);
  return {
    serie: deAhora.map((fecha) => ({ fecha, valor: tardeDe.get(fecha) ?? null })),
    total: ahora.total,
    anterior: antes.total,
    diasConDato: ahora.conDato,
  };
}
