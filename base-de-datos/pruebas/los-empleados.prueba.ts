import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { levantarBase, type BaseDePrueba } from './entorno.ts';
import { elFallo, losDatos, montarLaApi, type ApiDePrueba } from './despachador.ts';

/**
 * **Servicio › Empleados** (la pausa del 8-nov, P3, decisión 0142), contra la base:
 *
 *   · quien ve las ventas ve a todo el equipo, con lo que vende cada uno de sus mesas
 *   · los objetivos: uno general en € por hora y uno distinto para quien haga falta
 *   · la camarera ve **solo lo suyo**, y nada si el gerente lo oculta
 *   · quien no pone objetivos no los cambia
 */
let base: BaseDePrueba;
let api: ApiDePrueba;

const AHORA = new Date('2026-10-20T20:00:00Z');
const ROSA = 'rosa@ejemplo.estook.com'; // gerente de Bar Centro
const SARA = 'sara@ejemplo.estook.com'; // camarera de Bar Centro

let local: string;
let sara: string;
let rosa: string;

/** Una mesa liberada hoy, de quien se diga, con un plato. */
async function unaMesaDe(camarero: string, nombre: string, cantidad: number, precio: number) {
  const { rows } = await base.bd.query<{ id: string }>(
    `insert into estook.cuenta (local_id, tipo, nombre, personas, camarero_id, abierta_en, liberada_en)
     values ($1, 'para_llevar', 'Prueba', 2, $2, '2026-10-20T19:00:00Z', '2026-10-20T19:50:00Z')
     returning id`,
    [local, camarero],
  );
  await base.bd.query(
    `insert into estook.linea_de_cuenta
       (id, cuenta_id, local_id, nombre, cantidad, precio_centimos, destino, pase, pedida_en)
     values (gen_random_uuid(), $1, $2, $3, $4, $5, 'cocina', 1, '2026-10-20T19:05:00Z')`,
    [rows[0]?.id, local, nombre, cantidad, precio],
  );
}

beforeAll(async () => {
  base = await levantarBase();
  api = montarLaApi(base.bd, { ahora: () => AHORA });
  local = await base.localPorCodigo('bar-centro');
  sara = await base.personaPorCorreo(SARA);
  rosa = await base.personaPorCorreo(ROSA);
  // Sara, dos mesas; Rosa, una.
  await unaMesaDe(sara, 'Croquetas', 2, 990);
  await unaMesaDe(sara, 'Entrecot', 1, 2200);
  await unaMesaDe(rosa, 'Croquetas', 1, 990);
}, 60_000);

afterAll(async () => {
  await base.cerrar();
});

interface LaVenta {
  modo: string;
  puedeCambiar: boolean;
  general: { centimosPorHora: number; cadaUnoLoVe: boolean } | null;
  personas: {
    personaId: string;
    ventas: number;
    mesas: number;
    objetivoPorHora: number | null;
    objetivoSuyo: boolean;
    platos: { nombre: string; uds: number }[];
  }[];
}

const semana = { periodo: 'semana', del: '2026-10-20' };

describe('lo que vende cada uno', () => {
  it('quien ve las ventas ve a todo el equipo, de mayor a menor', async () => {
    const token = await api.entrar(ROSA);
    const venta = losDatos<LaVenta>(await api.consultar(token, 'la_venta_de_cada_uno', semana));
    expect(venta.modo).toBe('todos');
    expect(venta.personas.map((p) => p.personaId)).toEqual([sara, rosa]);
    // 2 × 9,90 + 22,00 = 41,80 € con IVA; al 10 %, 38,00 € sin él.
    expect(venta.personas[0]).toMatchObject({ ventas: 3800, mesas: 2 });
    expect(venta.personas[0]?.platos).toEqual([
      { nombre: 'Croquetas', uds: 2 },
      { nombre: 'Entrecot', uds: 1 },
    ]);
  });

  it('el gerente pone el general y uno distinto, y la camarera no puede', async () => {
    const token = await api.entrar(ROSA);
    losDatos(
      await api.ejecutar(token, 'guardar_los_objetivos_de_venta', {
        general: 4500,
        cada_uno_lo_ve: true,
        distintos: [{ persona_id: rosa, centimos_por_hora: 3500 }],
      }),
    );
    const venta = losDatos<LaVenta>(await api.consultar(token, 'la_venta_de_cada_uno', semana));
    expect(venta.general).toEqual({ centimosPorHora: 4500, cadaUnoLoVe: true });
    expect(venta.personas.find((p) => p.personaId === sara)).toMatchObject({
      objetivoPorHora: 4500,
      objetivoSuyo: false,
    });
    expect(venta.personas.find((p) => p.personaId === rosa)).toMatchObject({
      objetivoPorHora: 3500,
      objetivoSuyo: true,
    });

    const deSara = await api.entrar(SARA);
    expect(
      elFallo(
        await api.ejecutar(deSara, 'guardar_los_objetivos_de_venta', {
          general: 100,
          cada_uno_lo_ve: true,
          distintos: [],
        }),
      ),
    ).toBe('sin_permiso');
  });

  it('la camarera ve solo lo suyo, y nada si el gerente lo oculta', async () => {
    const deSara = await api.entrar(SARA);
    const suyo = losDatos<LaVenta>(await api.consultar(deSara, 'la_venta_de_cada_uno', semana));
    expect(suyo.modo).toBe('yo');
    expect(suyo.personas).toHaveLength(1);
    expect(suyo.personas[0]).toMatchObject({ personaId: sara, ventas: 3800, mesas: 2 });

    const token = await api.entrar(ROSA);
    losDatos(
      await api.ejecutar(token, 'guardar_los_objetivos_de_venta', {
        general: 4500,
        cada_uno_lo_ve: false,
        distintos: [],
      }),
    );
    const oculto = losDatos<LaVenta>(await api.consultar(deSara, 'la_venta_de_cada_uno', semana));
    expect(oculto).toMatchObject({ modo: 'yo', personas: [] });
  });
});
