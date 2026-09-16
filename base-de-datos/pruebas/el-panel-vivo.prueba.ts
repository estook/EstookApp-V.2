import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { masDias, porcentajeDe, ticketMedio, type FechaOperativa } from '@estook/dominio';
import { levantarBase, type BaseDePrueba } from './entorno.ts';
import { elFallo, losDatos, montarLaApi, type ApiDePrueba } from './despachador.ts';

/**
 * El Panel vivo · los indicadores (decisión 0039).
 *
 * «Me gustaría algo más moderno: gráficas, flechas de subida y bajada.» Una
 * flecha que compara mal es peor que ninguna, así que lo que se prueba aquí es
 * que **compare lo mismo con lo mismo** y que **cuadre con el sitio de donde sale**:
 *
 *   · el total de ventas es lo cerrado en caja, y el periodo anterior va aparte
 *   · el food cost del Panel es el mismo que el de Servicio
 *   · la merma y las compras suben lo que se apunta, a su coste
 *   · un día sin caja no es un cero
 *   · un cocinero no ve las ventas, y sus horas sí
 */
let base: BaseDePrueba;
let api: ApiDePrueba;

const ROSA = 'rosa@ejemplo.estook.com'; // gerente de Bar Centro: lo ve todo
const MARCOS = 'marcos@ejemplo.estook.com'; // cocinero de Bar Centro

let rosa: string;
let marcos: string;

interface Indicador {
  jornada: string;
  serie: { fecha: string; valor: number | null }[];
  total: number | null;
  anterior: number | null;
  diasConDato: number;
}

beforeAll(async () => {
  base = await levantarBase();
  api = montarLaApi(base.bd);
  rosa = await api.entrar(ROSA);
  marcos = await api.entrar(MARCOS);
}, 120_000);

afterAll(async () => {
  await base.cerrar();
});

async function comoDuena<T>(consulta: string, parametros: unknown[] = []): Promise<T[]> {
  const { rows } = await base.bd.query<T>(consulta, parametros);
  return rows;
}

async function indicador(token: string, cual: string, dias = '7'): Promise<Indicador> {
  return losDatos<Indicador>(await api.consultar(token, 'un_indicador', { indicador: cual, dias }));
}

async function cerrarCaja(fecha: string, total: number, tickets?: number) {
  losDatos(
    await api.ejecutar(rosa, 'cerrar_la_caja', {
      fecha,
      total_centimos: total,
      ...(tickets === undefined ? {} : { tickets }),
    }),
  );
}

describe('un indicador compara lo mismo con lo mismo', () => {
  it('trae los días del periodo, de viejo a nuevo, y el último es hoy', async () => {
    const semana = await indicador(rosa, 'ventas', '7');
    expect(semana.serie).toHaveLength(7);
    expect(semana.serie.at(-1)?.fecha).toBe(semana.jornada);
    expect(semana.serie[0]?.fecha).toBe(masDias(semana.jornada as FechaOperativa, -6));

    const mes = await indicador(rosa, 'ventas', '30');
    expect(mes.serie).toHaveLength(30);
  });

  it('solo se piden la semana y el mes', async () => {
    const pedido = await api.consultar(rosa, 'un_indicador', { indicador: 'ventas', dias: '14' });
    expect(pedido.estado).toBe('fallo');
  });

  it('las ventas son lo cerrado en caja, y lo de hace una semana va al periodo anterior', async () => {
    const antes = await indicador(rosa, 'ventas');
    const hoy = antes.jornada as FechaOperativa;

    // Una caja de ayer, que es de este periodo, y una de hace diez días, que es
    // del anterior (del día −13 al −7).
    await cerrarCaja(masDias(hoy, -1), 120_000, 40);
    await cerrarCaja(masDias(hoy, -10), 80_000, 20);

    const despues = await indicador(rosa, 'ventas');
    expect(despues.total).toBe((antes.total ?? 0) + 120_000);
    expect(despues.anterior).toBe((antes.anterior ?? 0) + 80_000);
    expect(despues.serie.find((d) => d.fecha === masDias(hoy, -1))?.valor).toBe(120_000);
  });

  it('**un día sin caja no vendió cero**: no se sabe, y va como nulo', async () => {
    const semana = await indicador(rosa, 'ventas');
    const cerrados = await comoDuena<{ fecha: string }>(
      `select to_char(fecha_operativa, 'YYYY-MM-DD') as fecha from estook.cierre_de_caja
        where local_id = (select id from estook.local where codigo = 'bar-centro')`,
    );
    const conCaja = new Set(cerrados.map((c) => c.fecha));
    for (const dia of semana.serie) {
      if (conCaja.has(dia.fecha)) expect(dia.valor, dia.fecha).not.toBeNull();
      else expect(dia.valor, dia.fecha).toBeNull();
    }
    expect(semana.diasConDato).toBe(semana.serie.filter((d) => d.valor !== null).length);
  });

  it('el ticket medio es lo del periodo entre sus tickets, no la media de los días', async () => {
    const ticket = await indicador(rosa, 'ticket-medio');
    const cierres = await comoDuena<{ total: string; tickets: number }>(
      `select total_centimos::text as total, tickets from estook.cierre_de_caja
        where local_id = (select id from estook.local where codigo = 'bar-centro')
          and fecha_operativa between $1::date and $2::date
          and tickets > 0`,
      [ticket.serie[0]?.fecha, ticket.jornada],
    );
    const total = cierres.reduce((s, c) => s + Number(c.total), 0);
    const tickets = cierres.reduce((s, c) => s + c.tickets, 0);
    expect(ticket.total).toBe(ticketMedio(total, tickets));
  });

  it('**el food cost del Panel es el mismo que el de Servicio**', async () => {
    const delPanel = await indicador(rosa, 'food-cost');
    const deServicio = losDatos<{
      totalDelPeriodoCentimos: number;
      consumoDelPeriodoCentimos: number;
      foodCost: number | null;
    }>(await api.consultar(rosa, 'mis_cierres', { dias: '7' }));

    expect(delPanel.total).toBe(deServicio.foodCost);
    expect(delPanel.total).toBe(
      porcentajeDe(deServicio.consumoDelPeriodoCentimos, deServicio.totalDelPeriodoCentimos),
    );
  });
});

describe('lo que sale del libro sube lo que se apunta', () => {
  let productoId: string;

  beforeAll(async () => {
    productoId = losDatos<{ productoId: string }>(
      await api.ejecutar(rosa, 'crear_producto', {
        nombre: 'Rape del panel vivo',
        unidad_de_uso: 'kg',
        zona: 'cocina',
        precio_centimos: 2_000,
      }),
    ).productoId;
  });

  it('las compras suben lo que entra, a lo que costó', async () => {
    const antes = await indicador(rosa, 'compras');
    losDatos(
      await api.ejecutar(rosa, 'apuntar_entrada', {
        producto_id: productoId,
        cuanto: 3,
        como: 'unidades_de_uso',
        precio_centimos: 2_000,
      }),
    );
    const despues = await indicador(rosa, 'compras');
    expect((despues.total ?? 0) - (antes.total ?? 0)).toBe(6_000);
    // Y los días sin entradas son cero, no nulos: el libro está siempre.
    expect(despues.serie.every((d) => d.valor !== null)).toBe(true);
  });

  it('la merma sube lo que se tira, a coste medio', async () => {
    const antes = await indicador(rosa, 'merma');
    losDatos(
      await api.ejecutar(rosa, 'apuntar_merma', {
        producto_id: productoId,
        cuanto: 1,
        motivo: 'caducado',
      }),
    );
    const despues = await indicador(rosa, 'merma');
    expect((despues.total ?? 0) - (antes.total ?? 0)).toBe(2_000);
  });
});

describe('cada uno ve lo suyo', () => {
  it('un cocinero no ve las ventas ni el food cost, ni pidiéndolos', async () => {
    for (const cual of ['ventas', 'ticket-medio', 'food-cost']) {
      const pedido = await api.consultar(marcos, 'un_indicador', { indicador: cual, dias: '7' });
      expect(elFallo(pedido), cual).toBe('sin_permiso');
    }
  });

  it('y sus horas sí, que son suyas', async () => {
    const antes = await indicador(marcos, 'mis-horas');
    const marcosId = await base.personaPorCorreo(MARCOS);
    const centro = await base.localPorCodigo('bar-centro');
    await comoDuena(
      `insert into estook.fichaje (
         local_id, persona_id, fecha_operativa, entro_en, salio_en,
         entro_latitud, entro_longitud, salio_latitud, salio_longitud
       )
       values ($1, $2, $3::date, now() - interval '100 minutes', now() - interval '40 minutes', 43.3, -1.98, 43.3, -1.98)`,
      [centro, marcosId, antes.jornada],
    );
    const despues = await indicador(marcos, 'mis-horas');
    expect((despues.total ?? 0) - (antes.total ?? 0)).toBe(60);
  });
});
