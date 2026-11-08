import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { levantarBase, type BaseDePrueba } from './entorno.ts';
import { elFallo, losDatos, montarLaApi, type ApiDePrueba } from './despachador.ts';

/**
 * **Lo que se vende y el servicio por dentro** (la pausa del 8-nov, P2, decisión 0142), contra la
 * base: Información e Informes leen las mesas de Estook TPV con las funciones de la 0112.
 *
 *   · lo vendido es lo pedido y no quitado de las mesas que no se anularon, sin IVA
 *   · la cocina tarda de que se manda a que se tacha, y lo de más de 20 minutos va tarde
 *   · lo que se tuerce: lo devuelto, lo quitado tras mandar y las mesas anuladas, con su motivo
 *   · solo lo ve quien ve las ventas: el cocinero, no
 *
 * Las mesas se escriben directamente en la base: lo que se prueba aquí es cómo se cuentan, y
 * cómo se piden en el TPV ya lo prueba `la-sala-y-la-cocina.prueba.ts`.
 */
let base: BaseDePrueba;
let api: ApiDePrueba;

/** Martes 20-oct-2026, a las 22:00 en Madrid. */
const AHORA = new Date('2026-10-20T20:00:00Z');
const HOY = '2026-10-20';

const ROSA = 'rosa@ejemplo.estook.com'; // gerente de Bar Centro: ve las ventas
const MARCOS = 'marcos@ejemplo.estook.com'; // cocinero de Bar Centro: no las ve

let local: string;

async function comoDuena(consulta: string, parametros: unknown[] = []): Promise<void> {
  await base.bd.query(consulta, parametros);
}

/** Una mesa del día con sus platos, como si la hubiera pedido el TPV. */
async function unaMesa(
  personas: number,
  platos: {
    nombre: string;
    cantidad: number;
    precio: number;
    destino: 'cocina' | 'barra';
    mandada?: string;
    salio?: string;
    quitada?: boolean;
    vuelve?: string;
  }[],
  { anulada }: { anulada?: string } = {},
): Promise<void> {
  const { rows } = await base.bd.query<{ id: string }>(
    `insert into estook.cuenta (local_id, tipo, nombre, personas, abierta_en, liberada_en, anulada_en, motivo_de_anular)
     values ($1, 'para_llevar', 'Prueba', $2, '2026-10-20T19:00:00Z', $3, $4, $5) returning id`,
    [
      local,
      personas,
      anulada === undefined ? '2026-10-20T19:50:00Z' : null,
      anulada === undefined ? null : '2026-10-20T19:30:00Z',
      anulada ?? null,
    ],
  );
  const cuenta = rows[0]?.id;
  for (const p of platos) {
    await comoDuena(
      `insert into estook.linea_de_cuenta
         (id, cuenta_id, local_id, nombre, cantidad, precio_centimos, destino, pase, pedida_en,
          mandada_en, salio_en, quitada_en, quitada_por, motivo_de_quitar, vuelve_en, motivo_de_vuelve)
       values (gen_random_uuid(), $1, $2, $3, $4, $5, $6, case when $6 = 'cocina' then 1 end,
               '2026-10-20T19:05:00Z', $7, $8,
               case when $9 then '2026-10-20T19:20:00Z'::timestamptz end,
               case when $9 then (select id from estook.persona where correo = $10) end,
               case when $9 then 'Se equivocó' end,
               case when $11::text is not null then '2026-10-20T19:25:00Z'::timestamptz end, $11)`,
      [
        cuenta,
        local,
        p.nombre,
        p.cantidad,
        p.precio,
        p.destino,
        p.mandada ?? null,
        p.salio ?? null,
        p.quitada === true,
        ROSA,
        p.vuelve ?? null,
      ],
    );
  }
}

beforeAll(async () => {
  base = await levantarBase();
  api = montarLaApi(base.bd, { ahora: () => AHORA });
  local = await base.localPorCodigo('bar-centro');
  await unaMesa(2, [
    // Tardan 14 minutos en salir.
    {
      nombre: 'Croquetas',
      cantidad: 2,
      precio: 990,
      destino: 'cocina',
      mandada: '2026-10-20T19:06:00Z',
      salio: '2026-10-20T19:20:00Z',
    },
    { nombre: 'Caña', cantidad: 3, precio: 330, destino: 'barra' },
    // 26 minutos: tarde. Y volvió a cocina, poco hecho.
    {
      nombre: 'Entrecot',
      cantidad: 1,
      precio: 2200,
      destino: 'cocina',
      mandada: '2026-10-20T19:06:00Z',
      salio: '2026-10-20T19:32:00Z',
      vuelve: 'Poco hecho',
    },
    // Se quitó después de mandar: no cuenta como vendido.
    {
      nombre: 'Ensalada',
      cantidad: 1,
      precio: 900,
      destino: 'cocina',
      mandada: '2026-10-20T19:06:00Z',
      quitada: true,
    },
  ]);
  await unaMesa(4, [{ nombre: 'Agua', cantidad: 1, precio: 200, destino: 'barra' }], {
    anulada: 'Se fueron esperando',
  });
}, 60_000);

afterAll(async () => {
  await base.cerrar();
});

interface LoQueSeVende {
  origen: string;
  cifras: Record<string, { ahora: number | null; antes: number | null }>;
  platos: { nombre: string; uds: number; ventas: number; bebida: boolean }[];
  ahoraMismo: unknown;
}

describe('lo que se vende (Información)', () => {
  it('cuenta lo pedido y no quitado de las mesas que no se anularon, sin IVA', async () => {
    const rosa = await api.entrar(ROSA);
    const hoy = losDatos<LoQueSeVende>(
      await api.consultar(rosa, 'lo_que_se_vende', { periodo: 'dia', del: HOY }),
    );
    expect(hoy.origen).toBe('tpv');
    // 2 × 9,90 + 3 × 3,30 + 22,00 = 51,70 € con IVA; al 10 %, 47,00 € sin él.
    expect(hoy.cifras['ventas']?.ahora).toBe(4700);
    // Los platos de cocina: las croquetas y el entrecot (la ensalada se quitó).
    expect(hoy.cifras['platos']?.ahora).toBe(3);
    // Una mesa servida de 51,70 €, y sus dos personas: la anulada no cuenta.
    expect(hoy.cifras['ticketMedio']?.ahora).toBe(5170);
    expect(hoy.cifras['personas']?.ahora).toBe(2);
    expect(hoy.platos.map((p) => [p.nombre, p.uds])).toEqual([
      ['Caña', 3],
      ['Croquetas', 2],
      ['Entrecot', 1],
    ]);
    expect(hoy.platos.find((p) => p.nombre === 'Caña')?.bebida).toBe(true);
  });

  it('el cocinero no ve lo que se vende', async () => {
    const marcos = await api.entrar(MARCOS);
    expect(
      elFallo(await api.consultar(marcos, 'lo_que_se_vende', { periodo: 'dia', del: HOY })),
    ).toBe('sin_permiso');
  });
});

describe('el servicio por dentro (Informes)', () => {
  it('la cocina, lo que se tuerce y cuándo se vende', async () => {
    const rosa = await api.entrar(ROSA);
    const dentro = losDatos<{
      conTpv: boolean;
      porHora: { hora: number; ahora: number }[];
      cocina: { conTiempo: number; media: number; tarde: number; mesasConTarde: number };
      seTuerce: {
        devueltos: { ahora: number; motivos: { motivo: string; veces: number }[] };
        quitados: { ahora: number };
        anuladas: { ahora: number; personas: number; motivos: { motivo: string }[] };
      };
    }>(await api.consultar(rosa, 'el_servicio_por_dentro', { periodo: 'dia', del: HOY }));
    expect(dentro.conTpv).toBe(true);
    // 14 y 26 minutos: 20 de media, y uno tarde.
    expect(dentro.cocina).toMatchObject({ conTiempo: 2, media: 20, tarde: 1, mesasConTarde: 1 });
    expect(dentro.seTuerce.devueltos).toMatchObject({
      ahora: 1,
      motivos: [{ motivo: 'Poco hecho', veces: 1 }],
    });
    expect(dentro.seTuerce.quitados.ahora).toBe(1);
    expect(dentro.seTuerce.anuladas).toMatchObject({
      ahora: 1,
      personas: 4,
      motivos: [{ motivo: 'Se fueron esperando' }],
    });
    // Todo se pidió a las 21:05 de Madrid.
    expect(dentro.porHora.find((h) => h.hora === 21)?.ahora).toBe(4700);
  });
});
