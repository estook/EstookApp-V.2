import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { levantarBase, type BaseDePrueba } from './entorno.ts';
import { elFallo, losDatos, montarLaApi, type ApiDePrueba } from './despachador.ts';

/**
 * **Cómo va hoy** · las cifras vivas del Panel (el rediseño, entrega 3 · 0148).
 *
 * Lo que contestó Richi el 21-nov, comprobado contra la base de verdad:
 *
 *   · Las ventas de hoy **con IVA**, y las del mismo día de la semana pasada **hasta la misma hora**:
 *     a las 21:00 no se compara con el martes pasado entero.
 *   · **Ventas según canal**, por el tipo de cada cuenta: la mesa, la barra y lo de llevar.
 *   · **El objetivo de hoy**, del semanal; y la cocina, con lo que espera ahora.
 *   · Solo quien ve las ventas: un cocinero no.
 */

let base: BaseDePrueba;
let api: ApiDePrueba;

/** Martes 20-oct-2026, a las 21:00 en Madrid. */
const AHORA = new Date('2026-10-20T19:00:00Z');

const ROSA = 'rosa@ejemplo.estook.com'; // gerente de Bar Centro
const MARCOS = 'marcos@ejemplo.estook.com'; // cocinero de Bar Centro

let local: string;

/** Una cuenta con sus platos, a la hora que se diga (en UTC), como las pide el TPV. */
async function unaCuenta(
  tipo: 'barra' | 'para_llevar',
  abierta: string,
  platos: { nombre: string; cantidad: number; precio: number; salio?: string | null }[],
  { libre = true }: { libre?: boolean } = {},
): Promise<void> {
  const { rows } = await base.bd.query<{ id: string }>(
    `insert into estook.cuenta (local_id, tipo, nombre, personas, abierta_en, liberada_en)
     values ($1, $2, 'Prueba', 2, $3, case when $4 then $3::timestamptz + interval '40 minutes' end)
     returning id`,
    [local, tipo, abierta, libre],
  );
  for (const p of platos) {
    await base.bd.query(
      `insert into estook.linea_de_cuenta
         (id, cuenta_id, local_id, nombre, cantidad, precio_centimos, destino, pase, pedida_en,
          mandada_en, salio_en)
       values (gen_random_uuid(), $1, $2, $3, $4, $5, 'cocina', 1, $6,
               $6::timestamptz + interval '1 minute', $7)`,
      [rows[0]?.id, local, p.nombre, p.cantidad, p.precio, abierta, p.salio ?? null],
    );
  }
}

beforeAll(async () => {
  base = await levantarBase();
  api = montarLaApi(base.bd, { ahora: () => AHORA });
  local = await base.localPorCodigo('bar-centro');

  // Hoy: una barra a las 13:00 y una para llevar a las 20:30, que todavía espera un plato.
  await unaCuenta('barra', '2026-10-20T11:00:00Z', [
    { nombre: 'Croquetas', cantidad: 2, precio: 1000, salio: '2026-10-20T11:15:00Z' },
  ]);
  await unaCuenta(
    'para_llevar',
    '2026-10-20T18:30:00Z',
    [{ nombre: 'Pizza', cantidad: 1, precio: 1200, salio: null }],
    { libre: false },
  );
  // El martes pasado: 13:00 (cuenta, es antes de las 21:00) y 22:00 (no cuenta a esta hora).
  await unaCuenta('barra', '2026-10-13T11:00:00Z', [
    { nombre: 'Croquetas', cantidad: 1, precio: 1000, salio: '2026-10-13T11:20:00Z' },
  ]);
  await unaCuenta('barra', '2026-10-13T20:00:00Z', [
    { nombre: 'Pizza', cantidad: 5, precio: 1200, salio: '2026-10-13T20:25:00Z' },
  ]);
  // El objetivo de la semana: 7.000 €.
  await base.bd.query(
    `insert into estook.objetivo (local_id, clave, importe_centimos, desde)
     values ($1, 'ventas_semanales', 700000, '2026-10-01')`,
    [local],
  );
}, 60_000);

afterAll(async () => {
  await base.cerrar();
});

interface ComoVaHoy {
  origen: string;
  ventas: {
    hoy: number | null;
    elOtroDia: string;
    aEstaHora: number | null;
    entero: number | null;
  };
  tickets: { hoy: number | null; medio: number | null };
  objetivo: { semanal: number; llevas: number; hoy: number; reparto: string } | null;
  canales: { canal: string; ventas: number; tickets: number }[];
  cocina: { esperando: number; mesasEsperando: number; sacados: number } | null;
}

describe('cómo va hoy (el Panel, 0148)', () => {
  it('lo de hoy con IVA, y el martes pasado hasta la misma hora', async () => {
    const hoy = losDatos<ComoVaHoy>(await api.consultar(await api.entrar(ROSA), 'como_va_hoy'));
    expect(hoy.origen).toBe('tpv');
    expect(hoy.ventas.hoy).toBe(3200);
    expect(hoy.ventas.elOtroDia).toBe('2026-10-13');
    // A las 21:00 el martes pasado llevaba 10 €; entero, 70 €.
    expect(hoy.ventas.aEstaHora).toBe(1000);
    expect(hoy.ventas.entero).toBe(7000);
    expect(hoy.tickets.hoy).toBe(2);
    expect(hoy.tickets.medio).toBe(1600);
  });

  it('cada canal, lo suyo; y la cocina, lo que espera ahora', async () => {
    const hoy = losDatos<ComoVaHoy>(await api.consultar(await api.entrar(ROSA), 'como_va_hoy'));
    expect(hoy.canales).toEqual([
      { canal: 'barra', ventas: 2000, tickets: 1 },
      { canal: 'para_llevar', ventas: 1200, tickets: 1 },
    ]);
    expect(hoy.cocina?.esperando).toBe(1);
    expect(hoy.cocina?.mesasEsperando).toBe(1);
    expect(hoy.cocina?.sacados).toBe(2);
  });

  it('el objetivo de hoy sale del semanal (a partes iguales, sin tres semanas de historial)', async () => {
    const hoy = losDatos<ComoVaHoy>(await api.consultar(await api.entrar(ROSA), 'como_va_hoy'));
    expect(hoy.objetivo?.semanal).toBe(700000);
    expect(hoy.objetivo?.reparto).toBe('igual');
    expect(hoy.objetivo?.hoy).toBe(100000);
    expect(hoy.objetivo?.llevas).toBe(3200);
  });

  it('un cocinero no lo ve: no tiene las ventas', async () => {
    expect(elFallo(await api.consultar(await api.entrar(MARCOS), 'como_va_hoy'))).toBe(
      'sin_permiso',
    );
  });
});
