import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { tokenDelAparato } from '@estook/dominio';
import { alSegundoDeMentira } from '../../servidor/infraestructura/al-segundo.ts';
import { levantarBase, type BaseDePrueba } from './entorno.ts';
import { elFallo, entrarFichando, losDatos, montarLaApi, type ApiDePrueba } from './despachador.ts';

/**
 * La Ampliación 5 · 1 · Las reservas: el motor y la sala (decisión 0153, sección 6; migración 0132).
 *
 *   · apagadas de fábrica: sin encenderlas no se reserva; las enciende quien lleva los Ajustes del TPV
 *   · las horas que quedan, con la mesa que pone Estook (la que deja menos sillas vacías)
 *   · **dos aparatos reservan la misma mesa a la misma hora a la vez, y solo entra una** (la base)
 *   · para seis, dos mesas que se juntan, solo si el local las marcó
 *   · «Sentar» abre la mesa con sus comensales y la une a la reserva; cancelar libera la mesa
 *   · el tope de comensales por cuarto de hora avisa, y no impide al camarero
 */
let base: BaseDePrueba;
let api: ApiDePrueba;
const alSegundo = alSegundoDeMentira();
/** Martes 1-dic-2026, a las 16:00 en Madrid. */
const reloj = new Date('2026-12-01T15:00:00Z');
const HOY = '2026-12-01';

const ROSA = 'rosa@ejemplo.estook.com'; // gerente de Bar Centro: los ajustes y el plano
const SARA = 'sara@ejemplo.estook.com'; // camarera: reserva y sienta

let rosaTpv: string;
let saraTpv: string;
const mesa: Record<string, string> = {};

interface Horas {
  duracion: number;
  servicios: {
    nombre: string;
    horas: { hora: string; mesas: { nombre: string }[] | null; pasaDelTope: boolean }[];
  }[];
}

async function lasHoras(comensales: number): Promise<Horas> {
  return losDatos<Horas>(
    await api.consultar(saraTpv, 'horas_para_reservar', {
      dia: HOY,
      comensales: String(comensales),
    }),
  );
}

function aLas(horas: Horas, hora: string) {
  return horas.servicios.flatMap((s) => s.horas).find((h) => h.hora === hora);
}

function reservar(token: string, datos: Record<string, unknown>) {
  return api.ejecutar(token, 'poner_reserva', {
    id: crypto.randomUUID(),
    dia: HOY,
    telefono: '600 123 456',
    ...datos,
  });
}

beforeAll(async () => {
  base = await levantarBase();
  api = montarLaApi(base.bd, { alSegundo, ahora: () => reloj });
  const laCaja = losDatos<{ llave: string }>(
    await api.ejecutar(await api.entrar(ROSA), 'vincular_el_primer_aparato', {
      local_id: await base.localPorCodigo('bar-centro'),
      funcion: 'caja',
      nombre: 'Caja 1',
      cajon_nuevo: 'Cajón 1',
    }),
  ).llave;
  const enUnAparato = async (llave: string, correo: string) =>
    tokenDelAparato(
      losDatos<{ turno: string }>(
        await entrarFichando(api, llave, base.pinDe(correo, 'bar-centro'), laCaja),
      ).turno,
      llave,
    );
  rosaTpv = await enUnAparato(laCaja, ROSA);
  const { codigo } = losDatos<{ codigo: string }>(
    await api.ejecutar(rosaTpv, 'sacar_codigo_para_vincular', {
      funcion: 'comandero',
      nombre: 'Tablet de la sala',
    }),
  );
  const tablet = losDatos<{ llave: string }>(
    await api.ejecutar(null, 'vincular_con_codigo', { codigo }),
  ).llave;
  saraTpv = await enUnAparato(tablet, SARA);

  const salon = losDatos<{ zonaId: string }>(
    await api.ejecutar(rosaTpv, 'crear_zona_de_sala', { nombre: 'Salón' }),
  ).zonaId;
  for (const [nombre, plazas, x] of [
    ['1', 2, 100],
    ['2', 2, 250],
    ['7', 4, 400],
    ['8', 2, 550],
  ] as const) {
    mesa[nombre] = losDatos<{ mesaId: string }>(
      await api.ejecutar(rosaTpv, 'crear_mesa', { zona_id: salon, nombre, x, y: 200 }),
    ).mesaId;
    losDatos(await api.ejecutar(rosaTpv, 'cambiar_mesa', { mesa_id: mesa[nombre], plazas }));
  }
}, 120_000);

afterAll(async () => {
  await base.cerrar();
});

const AJUSTES = {
  encendidas: true,
  servicios: [{ nombre: 'Cena', desde: '20:00', hasta: '22:30' }],
  duraciones: [90, 105, 120, 150],
  tope_por_cuarto: null,
  liberar_tras: 15,
};

describe('encenderlas', () => {
  it('apagadas de fábrica: no se reserva, y la camarera no las enciende', async () => {
    expect(elFallo(await reservar(saraTpv, { hora: '21:00', comensales: 2, nombre: 'Jon' }))).toBe(
      'faltan_datos',
    );
    expect(elFallo(await api.ejecutar(saraTpv, 'guardar_ajustes_de_reservas', AJUSTES))).toBe(
      'sin_permiso',
    );
    losDatos(await api.ejecutar(rosaTpv, 'guardar_ajustes_de_reservas', AJUSTES));
    const lo = losDatos<{ encendidas: boolean; reservas: unknown[] }>(
      await api.consultar(saraTpv, 'las_reservas', {}),
    );
    expect(lo).toMatchObject({ encendidas: true, reservas: [] });
  });
});

describe('reservar', () => {
  let laDeJon: string;

  it('las horas de la cena, con la mesa que deja menos sillas vacías', async () => {
    const horas = await lasHoras(2);
    expect(horas.duracion).toBe(90);
    expect(horas.servicios[0]?.horas.map((h) => h.hora)[0]).toBe('20:00');
    expect(aLas(horas, '21:00')?.mesas?.map((m) => m.nombre)).toEqual(['1']);
    expect(aLas(await lasHoras(3), '21:00')?.mesas?.map((m) => m.nombre)).toEqual(['7']);
  });

  it('reserva Jon para dos a las 21:00: Estook le pone la 1; repetir no duplica', async () => {
    const id = crypto.randomUUID();
    const entrada = {
      id,
      dia: HOY,
      hora: '21:00',
      comensales: 2,
      nombre: 'Jon Etxabe',
      telefono: '600 123 456',
    };
    const hecha = losDatos<{ mesas: string[] }>(
      await api.ejecutar(saraTpv, 'poner_reserva', entrada),
    );
    expect(hecha.mesas).toEqual([mesa['1']]);
    losDatos(await api.ejecutar(saraTpv, 'poner_reserva', entrada));
    laDeJon = id;
    const lo = losDatos<{ reservas: { nombre: string; mesas: { nombre: string }[] }[] }>(
      await api.consultar(saraTpv, 'las_reservas', { dia: HOY }),
    );
    expect(lo.reservas.map((r) => [r.nombre, r.mesas.map((m) => m.nombre)])).toEqual([
      ['Jon Etxabe', ['1']],
    ]);
  });

  it('dos aparatos dan la misma mesa a la misma hora a la vez: solo entra una', async () => {
    const [una, otra] = await Promise.all([
      reservar(saraTpv, { hora: '21:15', comensales: 2, nombre: 'Marta', mesas: [mesa['2']] }),
      reservar(rosaTpv, { hora: '21:30', comensales: 2, nombre: 'Iñaki', mesas: [mesa['2']] }),
    ]);
    const fallos = [una, otra].map((r) => elFallo(r));
    expect(fallos.filter((f) => f === 'ya_hecho')).toHaveLength(1);
    // Y sin elegir mesa, a esa hora ya no le toca la 2.
    expect(aLas(await lasHoras(2), '21:15')?.mesas?.map((m) => m.nombre)).not.toContain('2');
    void laDeJon;
  });

  it('para seis no cabe en ninguna sola; juntando la 7 con la 8, sí', async () => {
    expect(
      elFallo(await reservar(saraTpv, { hora: '22:00', comensales: 6, nombre: 'Arana' })),
    ).toBe('faltan_datos');
    expect(
      elFallo(
        await api.ejecutar(saraTpv, 'juntar_mesas_para_reservas', {
          mesa_a: mesa['8'],
          mesa_b: mesa['7'],
          juntas: true,
        }),
      ),
    ).toBe('sin_permiso');
    losDatos(
      await api.ejecutar(rosaTpv, 'juntar_mesas_para_reservas', {
        mesa_a: mesa['8'],
        mesa_b: mesa['7'],
        juntas: true,
      }),
    );
    const hecha = losDatos<{ mesas: string[] }>(
      await reservar(saraTpv, { hora: '22:00', comensales: 6, nombre: 'Familia Arana' }),
    );
    expect([...hecha.mesas].sort()).toEqual([mesa['7'], mesa['8']].sort());
  });
});

describe('en servicio', () => {
  it('«Sentar» abre la mesa con sus comensales y la une a la reserva', async () => {
    const lo = losDatos<{ reservas: { id: string; nombre: string; mesas: { id: string }[] }[] }>(
      await api.consultar(saraTpv, 'las_reservas', {}),
    );
    const jon = lo.reservas.find((r) => r.nombre === 'Jon Etxabe');
    const cuentaId = crypto.randomUUID();
    losDatos(
      await api.ejecutar(saraTpv, 'abrir_mesa', {
        cuenta_id: cuentaId,
        mesa_id: jon?.mesas[0]?.id,
        reserva_id: jon?.id,
      }),
    );
    const { rows } = await base.bd.query<{ personas: number; reserva_id: string; estado: string }>(
      `select c.personas, c.reserva_id::text as reserva_id, r.estado
         from estook.cuenta c join estook.reserva r on r.id = c.reserva_id where c.id = $1`,
      [cuentaId],
    );
    expect(rows[0]).toEqual({ personas: 2, reserva_id: jon?.id, estado: 'sentada' });
    expect(
      elFallo(
        await api.ejecutar(saraTpv, 'abrir_mesa', {
          cuenta_id: crypto.randomUUID(),
          mesa_id: mesa['2'],
          reserva_id: jon?.id,
        }),
      ),
    ).toBe('ya_hecho');
  });

  it('cancelar libera la mesa', async () => {
    const lo = losDatos<{ reservas: { id: string; nombre: string; hora: string }[] }>(
      await api.consultar(saraTpv, 'las_reservas', {}),
    );
    const arana = lo.reservas.find((r) => r.nombre === 'Familia Arana');
    losDatos(await api.ejecutar(saraTpv, 'cancelar_reserva', { reserva_id: arana?.id }));
    const { rows } = await base.bd.query<{ cuantas: number }>(
      'select count(*)::int as cuantas from estook.reserva_de_mesa where reserva_id = $1',
      [arana?.id],
    );
    expect(rows[0]?.cuantas).toBe(0);
    expect(aLas(await lasHoras(6), '22:00')?.mesas?.map((m) => m.nombre)).toEqual(['7', '8']);
  });

  it('el tope por cuarto de hora avisa en las horas, y el camarero reserva igual', async () => {
    losDatos(
      await api.ejecutar(rosaTpv, 'guardar_ajustes_de_reservas', {
        ...AJUSTES,
        tope_por_cuarto: 3,
      }),
    );
    // A las 21:00 ya empieza Jon (2): dos más pasan de 3.
    expect(aLas(await lasHoras(2), '21:00')?.pasaDelTope).toBe(true);
    expect(aLas(await lasHoras(2), '20:30')?.pasaDelTope).toBe(false);
    losDatos(await reservar(saraTpv, { hora: '21:00', comensales: 2, nombre: 'Laura' }));
  });
});
