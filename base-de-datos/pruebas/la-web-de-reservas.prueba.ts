import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { tokenDelAparato } from '@estook/dominio';
import { alSegundoDeMentira } from '../../servidor/infraestructura/al-segundo.ts';
import { correoEnMemoria } from '../../servidor/infraestructura/correo.ts';
import { levantarBase, type BaseDePrueba } from './entorno.ts';
import { elFallo, entrarFichando, losDatos, montarLaApi, type ApiDePrueba } from './despachador.ts';

/**
 * La Ampliación 5 · 2 · La web de reservas (decisión 0153, sección 6; migración 0133).
 *
 *   · sin encenderlas no hay web; encendidas, la ve cualquiera sin sesión
 *   · solo ofrece las mesas que salen por internet, y **nunca pasa del tope** (eso lo decide el camarero)
 *   · si no caben nunca, no ofrece «Avísame»: que llamen
 *   · la reserva sale con su código; repetirla no la duplica; con el correo encendido, el correo es obligatorio
 *   · **solo la ve quien da su teléfono y su código**, y los intentos tienen tope por dirección
 *   · confirmar y cancelar; cancelar suelta la mesa y avisa a quien espera ese día
 *   · el reloj cancela la que no se confirmó a tiempo y manda el recordatorio del día antes
 *   · otro local no ve nada de este, y sin Pro no hay web
 */
let base: BaseDePrueba;
let api: ApiDePrueba;
const correo = correoEnMemoria();
/** Martes 1-dic-2026, a las 16:00 en Madrid. */
const LAS_CUATRO = new Date('2026-12-01T15:00:00Z');
let reloj = LAS_CUATRO;
const HOY = '2026-12-01';
const PASADO = '2026-12-03';
/** El viernes: el día del «Avísame si se libera». */
const VIERNES = '2026-12-04';
const SECRETO = 'el-secreto-del-reloj-de-la-5-2';
const quienReloj = () => ({ tokenDeSesion: null, correlacionId: crypto.randomUUID() });

const ROSA = 'rosa@ejemplo.estook.com'; // gerente de Bar Centro
const SARA = 'sara@ejemplo.estook.com'; // camarera

let rosaTpv: string;
let saraTpv: string;
const mesa: Record<string, string> = {};
let direccion: string;

const AJUSTES = {
  encendidas: true,
  servicios: [{ nombre: 'Cena', desde: '20:00', hasta: '22:30' }],
  duraciones: [90, 105, 120, 150],
  tope_por_cuarto: null,
  liberar_tras: 15,
  avisar_por_correo: true,
  pedir_que_confirmen: true,
  minutos_para_confirmar: 30,
};

interface HorasDeLaWeb {
  dia: string;
  servicios: { nombre: string; horas: string[] }[];
  lleno: boolean;
  noCaben: boolean;
}

interface SuReserva {
  id: string;
  codigo: string;
  dia: string;
  hora: string;
  comensales: number;
  nombre: string;
  estado: string;
  confirmada: boolean;
  confirmarAntesDe: string | null;
  local: string;
}

interface ReservaDelTpv {
  id: string;
  nombre: string;
  origen: string;
  estado: string;
  confirmada: boolean;
  canceladaPor: string | null;
  mesas: { nombre: string }[];
}

async function comoDuena<T>(consulta: string, parametros: unknown[] = []): Promise<T[]> {
  const { rows } = await base.bd.query<T>(consulta, parametros);
  return rows;
}

async function lasHorasDeLaWeb(comensales: number, dia = HOY): Promise<HorasDeLaWeb> {
  return losDatos<HorasDeLaWeb>(
    await api.consultar(null, 'horas_en_la_web', {
      direccion,
      dia,
      comensales: String(comensales),
    }),
  );
}

/** Desde la web: sin sesión y desde una dirección, que es lo que cuenta los intentos. */
function desdeLaWeb(nombre: string, entrada: Record<string, unknown>, desde = '10.0.0.1') {
  return api.ejecutarDesde(desde, null, nombre, { direccion, ...entrada });
}

function reservarEnLaWeb(datos: Record<string, unknown>, desde?: string) {
  return desdeLaWeb(
    'reservar_en_la_web',
    {
      id: crypto.randomUUID(),
      dia: HOY,
      comensales: 2,
      telefono: '600 111 222',
      ...datos,
    },
    desde,
  );
}

async function lasDelTpv(dia = HOY): Promise<ReservaDelTpv[]> {
  return losDatos<{ reservas: ReservaDelTpv[] }>(
    await api.consultar(saraTpv, 'las_reservas', { dia }),
  ).reservas;
}

const losCorreosA = (para: string) => correo.mandados.filter((c) => c.para === para);

beforeAll(async () => {
  base = await levantarBase();
  api = montarLaApi(base.bd, {
    alSegundo: alSegundoDeMentira(),
    correo,
    ahora: () => reloj,
  });
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
  const enUnAparato = async (llave: string, correoDe: string) =>
    tokenDelAparato(
      losDatos<{ turno: string }>(
        await entrarFichando(api, llave, base.pinDe(correoDe, 'bar-centro'), laCaja),
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
  ] as const) {
    mesa[nombre] = losDatos<{ mesaId: string }>(
      await api.ejecutar(rosaTpv, 'crear_mesa', { zona_id: salon, nombre, x, y: 200 }),
    ).mesaId;
    losDatos(await api.ejecutar(rosaTpv, 'cambiar_mesa', { mesa_id: mesa[nombre], plazas }));
  }
  const [local] = await comoDuena<{ direccion: string }>(
    `select direccion_de_la_carta as direccion from estook.local where codigo = 'bar-centro'`,
  );
  direccion = local?.direccion ?? '';
}, 120_000);

afterAll(async () => {
  await base.cerrar();
});

describe('la web de cada local', () => {
  it('sin encender las reservas no hay web', async () => {
    expect(direccion).not.toBe('');
    expect(elFallo(await api.consultar(null, 'la_web_de_reservas', { direccion }))).toBe(
      'no_existe',
    );
    expect(elFallo(await api.consultar(null, 'la_web_de_reservas', { direccion: 'no-hay' }))).toBe(
      'no_existe',
    );
  });

  it('encendidas, la ve cualquiera: el local y lo que pide, sin datos de nadie', async () => {
    losDatos(await api.ejecutar(rosaTpv, 'guardar_ajustes_de_reservas', AJUSTES));
    const web = losDatos<Record<string, unknown>>(
      await api.consultar(null, 'la_web_de_reservas', { direccion }),
    );
    expect(web).toMatchObject({
      nombre: 'Bar Centro',
      hoy: HOY,
      comensalesMax: 12,
      avisaPorCorreo: true,
      pideQueConfirmen: true,
      minutosParaConfirmar: 30,
    });
    expect(Object.keys(web)).not.toContain('reservas');
  });

  it('el TPV ve el enlace y lo que eligió', async () => {
    const ajustes = losDatos<Record<string, unknown>>(
      await api.consultar(rosaTpv, 'los_ajustes_de_reservas', {}),
    );
    expect(ajustes).toMatchObject({
      direccion,
      avisarPorCorreo: true,
      pedirQueConfirmen: true,
      minutosParaConfirmar: 30,
    });
  });
});

describe('las horas de la web', () => {
  it('solo las mesas que salen por internet: sin la 7, para cuatro no hay', async () => {
    losDatos(
      await api.ejecutar(rosaTpv, 'cambiar_mesa', { mesa_id: mesa['7'], por_internet: false }),
    );
    const web = await lasHorasDeLaWeb(4);
    expect(web).toMatchObject({ lleno: true, noCaben: true, servicios: [] });
    // El camarero sí la tiene: la 7 no sale en la web, pero es del local.
    const delTpv = losDatos<{
      servicios: { horas: { hora: string; mesas: { nombre: string }[] | null }[] }[];
    }>(await api.consultar(saraTpv, 'horas_para_reservar', { dia: HOY, comensales: '4' }));
    const lasNueve = delTpv.servicios.flatMap((s) => s.horas).find((h) => h.hora === '21:00');
    expect(lasNueve?.mesas?.map((m) => m.nombre)).toEqual(['7']);
  });

  it('juntando la 1 y la 2 ya caben cuatro', async () => {
    losDatos(
      await api.ejecutar(rosaTpv, 'juntar_mesas_para_reservas', {
        mesa_a: mesa['1'],
        mesa_b: mesa['2'],
        juntas: true,
      }),
    );
    const web = await lasHorasDeLaWeb(4);
    expect(web.noCaben).toBe(false);
    expect(web.servicios[0]?.horas).toContain('21:00');
  });

  it('nunca pasa del tope del cuarto de hora: eso lo decide el camarero', async () => {
    losDatos(
      await api.ejecutar(rosaTpv, 'guardar_ajustes_de_reservas', {
        ...AJUSTES,
        tope_por_cuarto: 1,
      }),
    );
    expect(await lasHorasDeLaWeb(2)).toMatchObject({ lleno: true, noCaben: false });
    losDatos(await api.ejecutar(rosaTpv, 'guardar_ajustes_de_reservas', AJUSTES));
    expect((await lasHorasDeLaWeb(2)).lleno).toBe(false);
  });

  it('el día que el local no abre, la web lo dice y no deja reservar', async () => {
    // El 1-dic es martes: la cena, de miércoles a domingo.
    const sinMartes = {
      ...AJUSTES,
      servicios: [{ nombre: 'Cena', desde: '20:00', hasta: '22:30', dias: [0, 3, 4, 5, 6] }],
    };
    losDatos(await api.ejecutar(rosaTpv, 'guardar_ajustes_de_reservas', sinMartes));
    const web = losDatos<{ abre: number[] }>(
      await api.consultar(null, 'la_web_de_reservas', { direccion }),
    );
    expect(web.abre).toEqual([0, 3, 4, 5, 6]);
    expect(await lasHorasDeLaWeb(2)).toMatchObject({ cerrado: true, lleno: false, servicios: [] });
    expect(
      elFallo(await reservarEnLaWeb({ hora: '21:00', nombre: 'Ane', correo: 'a@b.com' })),
    ).toBe('faltan_datos');
    // Y en el TPV tampoco salen horas ese día.
    const delTpv = losDatos<{ servicios: unknown[] }>(
      await api.consultar(saraTpv, 'horas_para_reservar', { dia: HOY, comensales: '2' }),
    );
    expect(delTpv.servicios).toEqual([]);
    losDatos(await api.ejecutar(rosaTpv, 'guardar_ajustes_de_reservas', AJUSTES));
  });

  it('por la web, hasta dos horas antes: a las 21:00 ya no queda nada para hoy', async () => {
    reloj = new Date('2026-12-01T20:00:00Z'); // las 21:00 en Madrid; la última hora, las 22:30
    try {
      expect(await lasHorasDeLaWeb(2)).toMatchObject({ tarde: true, lleno: false });
      expect(
        elFallo(await reservarEnLaWeb({ hora: '22:30', nombre: 'Ane', correo: 'a@b.com' })),
      ).toBe('faltan_datos');
    } finally {
      reloj = LAS_CUATRO;
    }
  });

  it('ni días pasados ni más de dos meses vista, ni más de doce', async () => {
    expect(
      elFallo(
        await api.consultar(null, 'horas_en_la_web', {
          direccion,
          dia: '2026-11-30',
          comensales: '2',
        }),
      ),
    ).toBe('faltan_datos');
    expect(
      elFallo(
        await api.consultar(null, 'horas_en_la_web', {
          direccion,
          dia: '2027-03-01',
          comensales: '2',
        }),
      ),
    ).toBe('faltan_datos');
    expect(
      elFallo(
        await api.consultar(null, 'horas_en_la_web', { direccion, dia: HOY, comensales: '13' }),
      ),
    ).toBe('faltan_datos');
  });
});

describe('reservar en la web', () => {
  let laDeAne: SuReserva;

  it('con el correo encendido, el correo es obligatorio', async () => {
    expect(elFallo(await reservarEnLaWeb({ hora: '21:00', nombre: 'Ane' }))).toBe('faltan_datos');
  });

  it('la reserva sale con su código, en una mesa de la web, y llega el correo', async () => {
    const id = crypto.randomUUID();
    laDeAne = losDatos<SuReserva>(
      await reservarEnLaWeb({
        id,
        hora: '21:00',
        nombre: 'Ane',
        correo: 'ane@correo-de-prueba.com',
        nota: 'Una trona',
      }),
    );
    expect(laDeAne).toMatchObject({
      id,
      hora: '21:00',
      estado: 'reservada',
      confirmada: false,
      confirmarAntesDe: '20:30',
      local: 'Bar Centro',
    });
    expect(laDeAne.codigo).toMatch(/^\d{4}$/);
    const [elCorreo] = losCorreosA('ane@correo-de-prueba.com');
    expect(elCorreo?.texto).toContain(laDeAne.codigo);
    expect(elCorreo?.texto).toContain('20:30');
    // El enlace lleva el id y el código detrás de la almohadilla, nunca el teléfono.
    expect(elCorreo?.texto).toContain(`#/mi-reserva?r=${id}&c=${laDeAne.codigo}`);
    expect(elCorreo?.texto).not.toContain('600');

    const enElTpv = (await lasDelTpv()).find((r) => r.id === id);
    expect(enElTpv).toMatchObject({ origen: 'web', estado: 'reservada', confirmada: false });
    expect(enElTpv?.mesas.map((m) => m.nombre)).not.toContain('7');
  });

  it('repetirla (dos toques, la red) no la duplica ni manda otro correo', async () => {
    const otra = losDatos<SuReserva>(
      await reservarEnLaWeb({
        id: laDeAne.id,
        hora: '21:00',
        nombre: 'Ane',
        correo: 'ane@correo-de-prueba.com',
      }),
    );
    expect(otra.codigo).toBe(laDeAne.codigo);
    expect(losCorreosA('ane@correo-de-prueba.com')).toHaveLength(1);
    expect((await lasDelTpv()).filter((r) => r.nombre === 'Ane')).toHaveLength(1);
  });

  it('solo la ve quien da su teléfono y su código', async () => {
    expect(
      elFallo(
        await desdeLaWeb('mi_reserva_en_la_web', {
          codigo: laDeAne.codigo,
          telefono: '699 999 999',
        }),
      ),
    ).toBe('no_existe');
    const vista = losDatos<SuReserva & Record<string, unknown>>(
      await desdeLaWeb('mi_reserva_en_la_web', {
        codigo: laDeAne.codigo,
        telefono: '+34 600111222',
      }),
    );
    expect(vista).toMatchObject({ id: laDeAne.id, nombre: 'Ane' });
    expect(Object.keys(vista)).not.toContain('telefono');
    expect(Object.keys(vista)).not.toContain('correo');
  });

  it('probar códigos tiene tope por dirección', async () => {
    let fallo: string | null = null;
    for (let i = 0; i < 21 && fallo !== 'demasiados_intentos'; i += 1) {
      fallo = elFallo(
        await desdeLaWeb(
          'mi_reserva_en_la_web',
          { codigo: String(1000 + i), telefono: '600 111 222' },
          '10.9.9.9',
        ),
      );
    }
    expect(fallo).toBe('demasiados_intentos');
    // Desde otra dirección, sigue.
    losDatos(
      await desdeLaWeb(
        'mi_reserva_en_la_web',
        { codigo: laDeAne.codigo, telefono: '600 111 222' },
        '10.0.0.2',
      ),
    );
  });

  it('confirmar: la sala la ve confirmada', async () => {
    const confirmada = losDatos<SuReserva>(
      await desdeLaWeb('confirmar_mi_reserva', {
        codigo: laDeAne.codigo,
        reserva_id: laDeAne.id,
      }),
    );
    expect(confirmada).toMatchObject({ confirmada: true, confirmarAntesDe: null });
    expect((await lasDelTpv()).find((r) => r.id === laDeAne.id)?.confirmada).toBe(true);
  });
});

describe('el reloj', () => {
  it('la que no se confirma a tiempo se cancela sola, y se le dice', async () => {
    const laDeMikel = losDatos<SuReserva>(
      await reservarEnLaWeb({
        hora: '21:30',
        nombre: 'Mikel',
        correo: 'mikel@correo-de-prueba.com',
      }),
    );
    expect(laDeMikel.confirmarAntesDe).toBe('21:00');
    // A las 21:01 en Madrid: la de Mikel no se confirmó; la de Ane, sí.
    reloj = new Date('2026-12-01T20:01:00Z');
    await api.despachador.alMovil(quienReloj(), SECRETO);
    reloj = LAS_CUATRO;
    const lasDeHoy = await lasDelTpv();
    expect(lasDeHoy.find((r) => r.nombre === 'Mikel')).toMatchObject({
      estado: 'cancelada',
      canceladaPor: 'sin_confirmar',
      mesas: [],
    });
    expect(lasDeHoy.find((r) => r.nombre === 'Ane')?.estado).toBe('reservada');
    expect(losCorreosA('mikel@correo-de-prueba.com')).toHaveLength(2);
  });

  it('el recordatorio, a las 12:00 del día antes', async () => {
    const laDeJon = losDatos<SuReserva>(
      await reservarEnLaWeb({
        dia: PASADO,
        hora: '20:00',
        nombre: 'Jon',
        correo: 'jon@correo-de-prueba.com',
      }),
    );
    const apuntados = await comoDuena<{ cuando: Date }>(
      `select cuando from estook.al_movil_programado
        where tipo = 'reserva.recordatorio' and clave = $1`,
      [laDeJon.id],
    );
    expect(apuntados.map((a) => new Date(a.cuando).toISOString())).toEqual([
      '2026-12-02T11:00:00.000Z',
    ]);
    reloj = new Date('2026-12-02T11:01:00Z');
    await api.despachador.alMovil(quienReloj(), SECRETO);
    reloj = LAS_CUATRO;
    const deJon = losCorreosA('jon@correo-de-prueba.com');
    expect(deJon).toHaveLength(2);
    expect(deJon[1]?.texto).toContain(laDeJon.codigo);
  });
});

describe('cancelar y «Avísame si se libera»', () => {
  it('lleno para cuatro: quien lo pide queda apuntado', async () => {
    losDatos(
      await reservarEnLaWeb({
        dia: VIERNES,
        comensales: 4,
        hora: '21:00',
        nombre: 'Familia Arana',
        correo: 'arana@correo-de-prueba.com',
      }),
    );
    // La 1 y la 2, juntas, son de los cuatro: a las 21:00 ya no hay sitio para otros cuatro.
    expect((await lasHorasDeLaWeb(4, VIERNES)).servicios[0]?.horas).not.toContain('21:00');
    // Pedirlo dos veces (dos toques) no lo apunta dos veces.
    for (let vez = 0; vez < 2; vez += 1) {
      losDatos(
        await desdeLaWeb('avisame_si_se_libera', {
          dia: VIERNES,
          comensales: 4,
          nombre: 'Leire',
          telefono: '611 222 333',
          correo: 'leire@correo-de-prueba.com',
        }),
      );
    }
  });

  it('cancelar desde la web suelta la mesa, avisa a la sala y a quien espera', async () => {
    const laDeArana = (await lasDelTpv(VIERNES)).find((r) => r.nombre === 'Familia Arana');
    const [codigo] = await comoDuena<{ codigo: string }>(
      `select codigo from estook.reserva where id = $1`,
      [laDeArana?.id],
    );
    const cancelada = losDatos<SuReserva>(
      await desdeLaWeb('cancelar_mi_reserva', {
        codigo: codigo?.codigo,
        reserva_id: laDeArana?.id,
      }),
    );
    expect(cancelada.estado).toBe('cancelada');
    expect((await lasDelTpv(VIERNES)).find((r) => r.id === laDeArana?.id)).toMatchObject({
      estado: 'cancelada',
      canceladaPor: 'cliente',
      mesas: [],
    });
    expect((await lasHorasDeLaWeb(4, VIERNES)).servicios[0]?.horas).toContain('21:00');
    const aLeire = losCorreosA('leire@correo-de-prueba.com');
    expect(aLeire).toHaveLength(1);
    expect(aLeire[0]?.texto).toContain(`reservar/${direccion}`);
    // Una vez: si se libera otra, ya no se le vuelve a escribir.
    const otraVez = losDatos<SuReserva>(
      await desdeLaWeb('cancelar_mi_reserva', {
        codigo: codigo?.codigo,
        reserva_id: laDeArana?.id,
      }),
    );
    expect(otraVez.estado).toBe('cancelada');
    expect(losCorreosA('leire@correo-de-prueba.com')).toHaveLength(1);
  });

  it('una cancelada ya no se confirma', async () => {
    const laDeMikel = (await lasDelTpv()).find((r) => r.nombre === 'Mikel');
    const [codigo] = await comoDuena<{ codigo: string }>(
      `select codigo from estook.reserva where id = $1`,
      [laDeMikel?.id],
    );
    expect(
      elFallo(
        await desdeLaWeb('confirmar_mi_reserva', {
          codigo: codigo?.codigo,
          reserva_id: laDeMikel?.id,
        }),
      ),
    ).toBe('ya_hecho');
  });
});

describe('cada local lo suyo', () => {
  it('desde la web de otro local no se llega a esta reserva', async () => {
    const [otro] = await comoDuena<{ direccion: string }>(
      `select direccion_de_la_carta as direccion from estook.local where codigo = 'casa-lola'`,
    );
    const laDeAne = (await lasDelTpv()).find((r) => r.nombre === 'Ane');
    const [codigo] = await comoDuena<{ codigo: string }>(
      `select codigo from estook.reserva where id = $1`,
      [laDeAne?.id],
    );
    expect(
      elFallo(
        await api.ejecutarDesde('10.0.0.3', null, 'mi_reserva_en_la_web', {
          direccion: otro?.direccion,
          codigo: codigo?.codigo,
          reserva_id: laDeAne?.id,
        }),
      ),
    ).toBe('no_existe');
  });

  it('sin Pro no hay web de reservas', async () => {
    await comoDuena(
      `update estook.organizacion o set es_ejemplo = false
         from estook.local l where l.codigo = 'bar-centro' and o.id = l.organizacion_id`,
    );
    await comoDuena(
      `update estook.suscripcion s set plan = 'esencial', estado = 'activa', de_la_casa = false
         from estook.local l
        where l.codigo = 'bar-centro' and s.organizacion_id = l.organizacion_id`,
    );
    expect(elFallo(await api.consultar(null, 'la_web_de_reservas', { direccion }))).toBe(
      'no_existe',
    );
  });
});
