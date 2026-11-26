import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { tokenDelAparato } from '@estook/dominio';
import { alSegundoDeMentira } from '../../servidor/infraestructura/al-segundo.ts';
import { levantarBase, type BaseDePrueba } from './entorno.ts';
import { elFallo, entrarFichando, losDatos, montarLaApi, type ApiDePrueba } from './despachador.ts';

/**
 * La Ampliación 5 · 3 · Los clientes, la lista de espera y los que no vienen (decisión 0153, sección 21;
 * migración 0135).
 *
 *   · cada reserva crea o encuentra a su cliente por su teléfono (sus nueve últimas cifras), también la
 *     que entra a pelo en la base
 *   · VIP, sus alergias y su nota; **la alergia guardada pasa sola a la mesa al sentarlo**, y la de la
 *     mesa solo se guarda en su ficha si se dice (su sí)
 *   · la ficha se rellena sola: visitas, gasto medio por persona (quien ve las ventas), lo que suele pedir
 *   · habitual con más de cinco visitas en medio año; «2 sin venir» solo con lo que marca la sala
 *   · «En espera»: apuntar, sentar (abre la mesa con los que son) y «se ha ido»
 *   · **otro local no ve los clientes nunca**, y las reservas grandes salen en el calendario, sin nombre
 *   · borrar a un cliente (derecho de supresión) y lo que borra el reloj
 */
let base: BaseDePrueba;
let api: ApiDePrueba;
/** Martes 1-dic-2026, a las 16:00 en Madrid. */
const reloj = new Date('2026-12-01T15:00:00Z');
const HOY = '2026-12-01';
const MANANA = '2026-12-02';
const SECRETO = 'el-secreto-del-reloj-de-la-5-3';

const ROSA = 'rosa@ejemplo.estook.com'; // gerente de Bar Centro
const SARA = 'sara@ejemplo.estook.com'; // camarera
const MARCOS = 'marcos@ejemplo.estook.com'; // cocinero
const PABLO = 'pablo@ejemplo.estook.com'; // gerente de Casa Lola, otra empresa
const VERA = 'vera@ejemplo.estook.com'; // de Bar Ribera, otra empresa

let rosaTpv: string;
let saraTpv: string;
const mesa: Record<string, string> = {};

interface Marcas {
  id: string;
  vip: boolean;
  habitual: boolean;
  alergenos: string[];
  vecesSinVenir: number;
  visitas: number;
  nota: string | null;
}
interface Reserva {
  id: string;
  nombre: string;
  estado: string;
  cliente: Marcas | null;
}
interface Espera {
  id: string;
  nombre: string;
  comensales: number;
}
interface Ficha extends Marcas {
  nombre: string;
  ultimaVisita: string | null;
  loQueSuelePedir: string[];
  gastoMedioPorPersona: number | null;
  veElGasto: boolean;
}

async function lasDeHoy(): Promise<{ reservas: Reserva[]; espera: Espera[] }> {
  return losDatos(await api.consultar(saraTpv, 'las_reservas', {}));
}

function reservar(datos: Record<string, unknown>) {
  return api.ejecutar(saraTpv, 'poner_reserva', {
    id: crypto.randomUUID(),
    dia: HOY,
    ...datos,
  });
}

async function comoDuena<T>(consulta: string, parametros: unknown[] = []): Promise<T[]> {
  return (await base.bd.query<T>(consulta, parametros)).rows;
}

beforeAll(async () => {
  base = await levantarBase();
  api = montarLaApi(base.bd, { alSegundo: alSegundoDeMentira(), ahora: () => reloj });
  await comoDuena(
    `update plataforma.reloj set huella = encode(sha256(convert_to($1, 'UTF8')), 'hex')`,
    [SECRETO],
  );
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
    ['3', 2, 400],
    ['7', 4, 550],
    ['8', 4, 700],
  ] as const) {
    mesa[nombre] = losDatos<{ mesaId: string }>(
      await api.ejecutar(rosaTpv, 'crear_mesa', { zona_id: salon, nombre, x, y: 200 }),
    ).mesaId;
    losDatos(await api.ejecutar(rosaTpv, 'cambiar_mesa', { mesa_id: mesa[nombre], plazas }));
  }
  losDatos(
    await api.ejecutar(rosaTpv, 'guardar_ajustes_de_reservas', {
      encendidas: true,
      servicios: [{ nombre: 'Cena', desde: '20:00', hasta: '22:30' }],
      duraciones: [90, 105, 120, 150],
      tope_por_cuarto: null,
      liberar_tras: 15,
    }),
  );
}, 120_000);

afterAll(async () => {
  await base.cerrar();
});

let jon: Marcas;
let laCuentaDeJon: string;

describe('cada reserva, con su cliente', () => {
  it('reserva Jon y nace su cliente; mañana, con su número escrito de otra forma, es el mismo', async () => {
    losDatos(
      await reservar({
        hora: '21:00',
        comensales: 2,
        nombre: 'Jon Etxabe',
        telefono: '600 123 456',
      }),
    );
    losDatos(
      await reservar({
        dia: MANANA,
        hora: '21:00',
        comensales: 2,
        nombre: 'Jon',
        telefono: '+34 600123456',
      }),
    );
    const deHoy = (await lasDeHoy()).reservas.find((r) => r.nombre === 'Jon Etxabe');
    expect(deHoy?.cliente).toMatchObject({ vip: false, habitual: false, vecesSinVenir: 0 });
    jon = deHoy?.cliente as Marcas;
    const deManana = losDatos<{ reservas: Reserva[] }>(
      await api.consultar(saraTpv, 'las_reservas', { dia: MANANA }),
    ).reservas;
    expect(deManana[0]?.cliente?.id).toBe(jon.id);
    const clientes = await comoDuena<{ cuantos: number }>(
      'select count(*)::int as cuantos from estook.cliente_del_local',
    );
    expect(clientes[0]?.cuantos).toBe(1);
  });

  it('al escribir el teléfono en «+ Reserva», sale quién es', async () => {
    const encontrado = losDatos<{ cliente: { id: string; nombre: string } | null }>(
      await api.consultar(saraTpv, 'buscar_al_cliente', { telefono: '600 12 34 56' }),
    );
    expect(encontrado.cliente).toMatchObject({ id: jon.id, nombre: 'Jon' });
    expect(
      losDatos<{ cliente: unknown }>(
        await api.consultar(saraTpv, 'buscar_al_cliente', { telefono: '699 999 999' }),
      ).cliente,
    ).toBeNull();
    // Con un trozo no se busca: no se van probando números.
    expect(elFallo(await api.consultar(saraTpv, 'buscar_al_cliente', { telefono: '600 12' }))).toBe(
      'faltan_datos',
    );
  });
});

describe('su alergia, sola a la mesa', () => {
  it('la camarera le apunta VIP y la alergia a los frutos secos (con su sí)', async () => {
    losDatos(
      await api.ejecutar(saraTpv, 'guardar_al_cliente', {
        cliente_id: jon.id,
        vip: true,
        alergenos: ['frutos_de_cascara'],
        nota: 'Trona',
      }),
    );
    const deHoy = (await lasDeHoy()).reservas.find((r) => r.nombre === 'Jon Etxabe');
    expect(deHoy?.cliente).toMatchObject({
      vip: true,
      alergenos: ['frutos_de_cascara'],
      nota: 'Trona',
    });
  });

  it('al sentarlo, la mesa ya lleva la alergia', async () => {
    const deHoy = (await lasDeHoy()).reservas.find((r) => r.nombre === 'Jon Etxabe');
    laCuentaDeJon = crypto.randomUUID();
    losDatos(
      await api.ejecutar(saraTpv, 'abrir_mesa', {
        cuenta_id: laCuentaDeJon,
        mesa_id: mesa['1'],
        reserva_id: deHoy?.id,
      }),
    );
    const alergias = await comoDuena<{ alergeno: string }>(
      'select alergeno from estook.alergeno_de_la_cuenta where cuenta_id = $1',
      [laCuentaDeJon],
    );
    expect(alergias.map((a) => a.alergeno)).toEqual(['frutos_de_cascara']);
  });

  it('lo que se marca en la mesa solo pasa a su ficha si se dice que sí', async () => {
    losDatos(
      await api.ejecutar(saraTpv, 'cambiar_las_alergias', {
        cuenta_id: laCuentaDeJon,
        alergenos: ['frutos_de_cascara', 'lacteos'],
      }),
    );
    const sinGuardar = await comoDuena<{ alergenos: string[] }>(
      'select alergenos from estook.cliente_del_local where id = $1',
      [jon.id],
    );
    expect(sinGuardar[0]?.alergenos).toEqual(['frutos_de_cascara']);
    losDatos(
      await api.ejecutar(saraTpv, 'cambiar_las_alergias', {
        cuenta_id: laCuentaDeJon,
        alergenos: ['gluten', 'frutos_de_cascara', 'lacteos'],
        guardar_en_su_ficha: true,
      }),
    );
    const guardadas = await comoDuena<{ alergenos: string[] }>(
      'select alergenos from estook.cliente_del_local where id = $1',
      [jon.id],
    );
    // En el orden del reglamento.
    expect(guardadas[0]?.alergenos).toEqual(['gluten', 'lacteos', 'frutos_de_cascara']);
  });
});

describe('la ficha se rellena sola', () => {
  it('visitas, lo que suele pedir y el gasto medio por persona, para quien ve las ventas', async () => {
    const local = await base.localPorCodigo('bar-centro');
    await comoDuena(
      `insert into estook.linea_de_cuenta (id, cuenta_id, local_id, nombre, cantidad, precio_centimos, destino, pase)
       values (gen_random_uuid(), $1, $2, 'Chuletón', 1, 4000, 'cocina', 1),
              (gen_random_uuid(), $1, $2, 'Agua', 2, 200, 'barra', null)`,
      [laCuentaDeJon, local],
    );
    losDatos(await api.ejecutar(saraTpv, 'liberar_mesa', { cuenta_id: laCuentaDeJon }));
    const paraRosa = losDatos<Ficha>(
      await api.consultar(rosaTpv, 'la_ficha_del_cliente', { cliente_id: jon.id }),
    );
    expect(paraRosa).toMatchObject({
      visitas: 1,
      ultimaVisita: HOY,
      loQueSuelePedir: ['Chuletón'],
      veElGasto: true,
      // (40 € + 2 × 2 €) entre los dos.
      gastoMedioPorPersona: 2200,
    });
    const paraSara = losDatos<Ficha>(
      await api.consultar(saraTpv, 'la_ficha_del_cliente', { cliente_id: jon.id }),
    );
    if (!paraSara.veElGasto) expect(paraSara.gastoMedioPorPersona).toBeNull();
  });

  it('habitual: más de cinco visitas en medio año', async () => {
    const insertar = (dia: string) =>
      comoDuena(
        `insert into estook.reserva
           (id, organizacion_id, local_id, dia, hora, empieza, acaba, comensales, nombre, telefono,
            estado, sentada_en)
         select gen_random_uuid(), organizacion_id, local_id, $1::date, '21:00',
                ($1 || 'T20:00:00Z')::timestamptz, ($1 || 'T21:30:00Z')::timestamptz, 2, 'Ane',
                '622 000 111', 'sentada', ($1 || 'T20:05:00Z')::timestamptz
           from estook.reserva limit 1`,
        [dia],
      );
    for (const dia of ['2026-07-01', '2026-08-01', '2026-09-01', '2026-10-01', '2026-11-01']) {
      await insertar(dia);
    }
    const habitual = async () =>
      losDatos<{ cliente: Marcas | null }>(
        await api.consultar(saraTpv, 'buscar_al_cliente', { telefono: '622000111' }),
      ).cliente?.habitual;
    expect(await habitual()).toBe(false);
    await insertar('2026-11-20');
    expect(await habitual()).toBe(true);
  });
});

describe('los que no vienen', () => {
  it('con dos «No han venido», sale marcado; la que cancela el cliente no cuenta', async () => {
    for (const hora of ['20:00', '20:15']) {
      const id = crypto.randomUUID();
      losDatos(
        await reservar({ id, hora, comensales: 2, nombre: 'Iñaki', telefono: '611 222 333' }),
      );
      losDatos(await api.ejecutar(saraTpv, 'cancelar_reserva', { reserva_id: id, no_vino: true }));
    }
    const cancelada = crypto.randomUUID();
    losDatos(
      await reservar({
        id: cancelada,
        hora: '20:30',
        comensales: 2,
        nombre: 'Iñaki',
        telefono: '611 222 333',
      }),
    );
    losDatos(await api.ejecutar(saraTpv, 'cancelar_reserva', { reserva_id: cancelada }));
    const encontrado = losDatos<{ cliente: Marcas | null }>(
      await api.consultar(saraTpv, 'buscar_al_cliente', { telefono: '611222333' }),
    );
    expect(encontrado.cliente?.vecesSinVenir).toBe(2);
  });
});

describe('«En espera»', () => {
  it('se apunta Ander con dos; tocar dos veces no lo apunta dos veces', async () => {
    const id = crypto.randomUUID();
    const entrada = { id, nombre: 'Ander', comensales: 2 };
    losDatos(await api.ejecutar(saraTpv, 'poner_en_espera', entrada));
    losDatos(await api.ejecutar(saraTpv, 'poner_en_espera', entrada));
    expect((await lasDeHoy()).espera.map((e) => [e.nombre, e.comensales])).toEqual([['Ander', 2]]);
  });

  it('sentarle abre la mesa con los que son, y sale de la lista', async () => {
    const ander = (await lasDeHoy()).espera[0];
    expect(
      elFallo(
        await api.ejecutar(saraTpv, 'abrir_mesa', {
          cuenta_id: crypto.randomUUID(),
          mesa_id: mesa['2'],
          espera_id: ander?.id,
          reserva_id: crypto.randomUUID(),
        }),
      ),
    ).toBe('faltan_datos');
    const cuenta = crypto.randomUUID();
    losDatos(
      await api.ejecutar(saraTpv, 'abrir_mesa', {
        cuenta_id: cuenta,
        mesa_id: mesa['2'],
        espera_id: ander?.id,
      }),
    );
    const abierta = await comoDuena<{ personas: number }>(
      'select personas from estook.cuenta where id = $1',
      [cuenta],
    );
    expect(abierta[0]?.personas).toBe(2);
    expect((await lasDeHoy()).espera).toEqual([]);
  });

  it('«Se ha ido» la quita de la lista', async () => {
    const id = crypto.randomUUID();
    losDatos(
      await api.ejecutar(saraTpv, 'poner_en_espera', {
        id,
        nombre: 'Maite',
        comensales: 4,
        telefono: '633 444 555',
      }),
    );
    losDatos(await api.ejecutar(saraTpv, 'quitar_de_espera', { id }));
    expect((await lasDeHoy()).espera).toEqual([]);
  });
});

describe('los datos de un cliente son de ese local', () => {
  it('otro local, de otra empresa, no ve ni uno; la gerente del suyo, sí', async () => {
    const cuantosVe = async (correo: string) =>
      base.comoPersona(await base.personaPorCorreo(correo), async () => {
        const { rows } = await base.bd.query<{ cuantos: number }>(
          'select count(*)::int as cuantos from estook.cliente_del_local',
        );
        return rows[0]?.cuantos ?? 0;
      });
    expect(await cuantosVe(PABLO)).toBe(0);
    expect(await cuantosVe(VERA)).toBe(0);
    expect(await cuantosVe(ROSA)).toBe(3);
    // Desde la 0119 todos toman nota, también la cocina: Marcos los ve, como las reservas.
    expect(await cuantosVe(MARCOS)).toBe(3);
  });

  it('en Estook, Servicio › Reservas › Clientes: la lista con su buscador', async () => {
    const rosa = await api.entrar(ROSA);
    const todos = losDatos<{
      clientes: { nombre: string; vip: boolean }[];
      puedeBorrar: boolean;
      veElGasto: boolean;
    }>(await api.consultar(rosa, 'los_clientes_del_local', {}));
    expect(todos.clientes.map((c) => c.nombre).sort()).toEqual(['Ane', 'Iñaki', 'Jon']);
    expect(todos).toMatchObject({ puedeBorrar: true, veElGasto: true });
    const porNombre = losDatos<{ clientes: { nombre: string }[] }>(
      await api.consultar(rosa, 'los_clientes_del_local', { buscar: 'inaki' }),
    );
    expect(porNombre.clientes.map((c) => c.nombre)).toEqual(['Iñaki']);
    const porTelefono = losDatos<{ clientes: { nombre: string }[] }>(
      await api.consultar(rosa, 'los_clientes_del_local', { buscar: '123 456' }),
    );
    expect(porTelefono.clientes.map((c) => c.nombre)).toEqual(['Jon']);
  });

  it('las reservas de 12 o más salen en el calendario del equipo, sin nombre ni teléfono', async () => {
    losDatos(
      await reservar({
        hora: '22:00',
        comensales: 14,
        nombre: 'Familia Arana',
        telefono: '644 555 666',
        mesas: [mesa['7'], mesa['8']],
      }),
    );
    const calendario = losDatos<{ reservas: Record<string, unknown>[] }>(
      await api.consultar(await api.entrar(MARCOS), 'el_calendario_del_equipo', {
        desde: HOY,
        hasta: MANANA,
      }),
    );
    expect(calendario.reservas).toEqual([
      { id: expect.any(String) as string, dia: HOY, hora: '22:00', comensales: 14 },
    ]);
  });
});

describe('borrar a un cliente', () => {
  it('la camarera no; la gerente sí, y sus reservas pasadas se quedan sin nada suyo', async () => {
    const inaki = losDatos<{ cliente: Marcas | null }>(
      await api.consultar(saraTpv, 'buscar_al_cliente', { telefono: '611222333' }),
    ).cliente;
    const rosa = await api.entrar(ROSA);
    expect(
      elFallo(await api.ejecutar(saraTpv, 'borrar_al_cliente', { cliente_id: inaki?.id })),
    ).toBe('sin_permiso');
    losDatos(await api.ejecutar(rosa, 'borrar_al_cliente', { cliente_id: inaki?.id }));
    const suyas = await comoDuena<{ nombre: string; telefono: string; cliente_id: string | null }>(
      "select nombre, telefono, cliente_id from estook.reserva where nombre = 'Cliente borrado'",
    );
    expect(suyas).toHaveLength(3);
    expect(suyas.every((r) => r.telefono === '000000' && r.cliente_id === null)).toBe(true);
    expect(
      losDatos<{ cliente: unknown }>(
        await api.consultar(saraTpv, 'buscar_al_cliente', { telefono: '611222333' }),
      ).cliente,
    ).toBeNull();
  });

  it('a quien tiene una reserva por llegar no se le borra: antes se cancela', async () => {
    expect(
      elFallo(
        await api.ejecutar(await api.entrar(ROSA), 'borrar_al_cliente', { cliente_id: jon.id }),
      ),
    ).toBe('faltan_datos');
  });
});

describe('lo que borra el reloj', () => {
  it('la espera de hace dos días y el cliente que lleva dos años sin reservar', async () => {
    await comoDuena(`update estook.espera set llego_en = now() - interval '3 days'`);
    await comoDuena(
      `update estook.cliente_del_local set creado_en = now() - interval '3 years'
        where cifras = '622000111'`,
    );
    await comoDuena(
      `update estook.reserva set creada_en = now() - interval '3 years' where telefono = '622 000 111'`,
    );
    await api.despachador.latir(
      { tokenDeSesion: null, correlacionId: crypto.randomUUID() },
      SECRETO,
    );
    const quedan = await comoDuena<{ espera: number; ane: number; jon: number }>(
      `select (select count(*) from estook.espera)::int as espera,
              (select count(*) from estook.cliente_del_local where cifras = '622000111')::int as ane,
              (select count(*) from estook.cliente_del_local where cifras = '600123456')::int as jon`,
    );
    expect(quedan[0]).toEqual({ espera: 0, ane: 0, jon: 1 });
  });
});
