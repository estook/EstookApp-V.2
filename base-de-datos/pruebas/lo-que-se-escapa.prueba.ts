import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { tokenDelAparato } from '@estook/dominio';
import { codigoEn } from '../../servidor/dominio/doble-factor.ts';
import { verifactiDeMentira } from '../../servidor/facturacion/verifacti-de-mentira.ts';
import {
  ADMIN_DE_EJEMPLO,
  CLAVE_DE_EJEMPLO,
  SECRETO_DEL_ADMIN_DE_EJEMPLO,
} from '../semillas/acceso.ts';
import { levantarBase, type BaseDePrueba } from './entorno.ts';
import { entrarFichando, losDatos, montarLaApi, type ApiDePrueba } from './despachador.ts';

/**
 * **M20 · 2 · Lo que se escapa** (decisión 0151), contra la base: se vende en Estook TPV, se cuenta
 * dos veces y se mira Almacén › Movimientos › Consumo.
 *
 *   · antes de vender nada en el TPV, no hay tarjeta; con un solo inventario, espera al segundo
 *   · lo que se escapa es lo gastado menos lo vendido, las mermas y lo sacado a mano
 *   · lo que cae dentro del margen no sale, y la lejía (que no vende el TPV) tampoco
 *   · un plato vendido sin escandallo deja el periodo a medias y se dice cuál (0094, la A)
 *   · el food cost de tus escandallos sale junto al real, del mismo periodo y al céntimo
 *
 * Las horas, en UTC: se cuenta a las 06:00 (las 07:00 en Madrid, antes de abrir: Bar Centro cierra el
 * día a las 03:00) y se vende a las 19:00.
 */
let base: BaseDePrueba;
let api: ApiDePrueba;
const verifacti = verifactiDeMentira();
const hoy = new Date(Date.now());
/** Un instante de hace `dias` días, a una hora en UTC. */
const elDia = (dias: number, hora: number) =>
  new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate() - dias, hora));
let ahora = elDia(8, 9);

const ROSA = 'rosa@ejemplo.estook.com';
const SARA = 'sara@ejemplo.estook.com';

let barCentro: string;
let llaveDeLaCaja: string;
let carne: string;
let cebolla: string;
let lejia: string;
const plato: Record<string, string> = {};
const mesas: string[] = [];
let mesa = 0;

async function rosa(): Promise<string> {
  return api.entrar(ROSA);
}

async function enLaCaja(correo: string): Promise<string> {
  const dentro = losDatos<{ turno: string }>(
    await entrarFichando(api, llaveDeLaCaja, base.pinDe(correo, 'bar-centro'), llaveDeLaCaja),
  );
  return tokenDelAparato(dentro.turno, llaveDeLaCaja);
}

/** Una mesa, pedida y cobrada entera con tarjeta. */
async function venderEnElTpv(platos: { nombre: string; cantidad: number }[], total: number) {
  const cuenta = crypto.randomUUID();
  losDatos(
    await api.ejecutar(await enLaCaja(SARA), 'abrir_mesa', {
      cuenta_id: cuenta,
      mesa_id: mesas[mesa % mesas.length],
      personas: 2,
    }),
  );
  mesa += 1;
  losDatos(
    await api.ejecutar(await enLaCaja(SARA), 'pedir', {
      cuenta_id: cuenta,
      platos: platos.map((p) => ({
        id: crypto.randomUUID(),
        plato_id: plato[p.nombre],
        pase: 1,
        cantidad: p.cantidad,
      })),
    }),
  );
  losDatos(
    await api.ejecutar(await enLaCaja(SARA), 'cobrar', {
      cobro_id: crypto.randomUUID(),
      cuenta_id: cuenta,
      que: 'toda',
      importe: total,
      pagos: [{ forma: 'tarjeta', importe: total }],
    }),
  );
}

async function contar(lineas: { producto_id: string; hay: number }[]) {
  losDatos(await api.ejecutar(await rosa(), 'cerrar_recuento', { lineas }));
}

interface SeEscapa {
  desde: string | null;
  hasta: string | null;
  vigilados: number;
  seSalen: {
    id: string;
    nombre: string;
    unidadDeUso: string;
    falta: number;
    debiaSalir: number;
    parte: number | null;
    centimos?: number | null;
  }[];
  centimos?: number | null;
  sinEscandallo: string[];
  platosSinEscandallo: number;
  aMedias: number;
}

async function loQueSeEscapa(): Promise<SeEscapa | null> {
  return losDatos<{ seEscapa: SeEscapa | null }>(await api.consultar(await rosa(), 'la_desviacion'))
    .seEscapa;
}

beforeAll(async () => {
  base = await levantarBase();
  api = montarLaApi(base.bd, { facturacion: verifacti, ahora: () => ahora });
  barCentro = await base.localPorCodigo('bar-centro');
  // Lo de ejemplo no cuenta para nada (Manifiesto 8): el local, de verdad.
  await base.bd.query(
    `update estook.organizacion set es_ejemplo = false where codigo = 'bar-centro'`,
  );
  await base.bd.query(`update estook.local set es_ejemplo = false where codigo = 'bar-centro'`);
  await base.bd.query(
    `insert into estook.suscripcion (organizacion_id, estado, de_la_casa)
     select organizacion_id, 'activa', true from estook.local where id = $1
     on conflict (organizacion_id) do update set de_la_casa = true`,
    [barCentro],
  );
  const entrada = losDatos<{ token: string }>(
    await api.ejecutar(null, 'entrar_en_admin', {
      correo: ADMIN_DE_EJEMPLO,
      contrasena: CLAVE_DE_EJEMPLO,
    }),
  );
  losDatos(
    await api.ejecutar(entrada.token, 'superar_doble_factor', {
      codigo: await codigoEn(SECRETO_DEL_ADMIN_DE_EJEMPLO, ahora),
    }),
  );
  losDatos(
    await api.ejecutar(entrada.token, 'admin_poner_la_empresa_de_pruebas', { local_id: barCentro }),
  );
  losDatos(
    await api.ejecutar(await rosa(), 'poner_las_series', {
      ticket: 'T-SE',
      factura: 'F-SE',
      rectificativa: 'R-SE',
      otro_programa: false,
    }),
  );
  llaveDeLaCaja = losDatos<{ llave: string }>(
    await api.ejecutar(await rosa(), 'vincular_el_primer_aparato', {
      local_id: barCentro,
      funcion: 'caja',
      nombre: 'Caja 1',
      cajon_nuevo: 'Caja 1',
    }),
  ).llave;

  // El género: carne a 12 €/kg, cebolla a 2 €/kg y lejía a 3 € la botella.
  const crear = async (datos: Record<string, unknown>) =>
    losDatos<{ productoId: string }>(await api.ejecutar(await rosa(), 'crear_producto', datos))
      .productoId;
  carne = await crear({
    nombre: 'Carne de hamburguesa M20·2',
    formato: 'Kilo',
    factor: 1000,
    unidad_de_uso: 'g',
    precio_centimos: 1200,
    cantidad_inicial: 5000,
  });
  cebolla = await crear({
    nombre: 'Cebolla M20·2',
    formato: 'Kilo',
    factor: 1000,
    unidad_de_uso: 'g',
    precio_centimos: 200,
    cantidad_inicial: 2000,
  });
  lejia = await crear({
    nombre: 'Lejía M20·2',
    unidad_de_uso: 'ud',
    precio_centimos: 300,
    cantidad_inicial: 10,
  });

  // La hamburguesa, a 12,00 €, con su escandallo; el pulpo, a 16,50 €, sin él.
  const { seccionId } = losDatos<{ seccionId: string }>(
    await api.ejecutar(await rosa(), 'crear_seccion', { nombre: 'Principales M20·2' }),
  );
  const creados = losDatos<{ creados: { platoId: string }[] }>(
    await api.ejecutar(await rosa(), 'crear_platos', {
      seccion_id: seccionId,
      platos: [
        { nombre: 'Hamburguesa M20·2', precio_centimos: 1200 },
        { nombre: 'Pulpo M20·2', precio_centimos: 1650 },
      ],
    }),
  ).creados;
  plato['Hamburguesa'] = creados[0]?.platoId ?? '';
  plato['Pulpo'] = creados[1]?.platoId ?? '';
  losDatos(
    await api.ejecutar(await rosa(), 'guardar_ficha', {
      plato_id: plato['Hamburguesa'],
      version: 0,
      lineas: [
        { producto_id: carne, cantidad: 180, unidad: 'g' },
        { producto_id: cebolla, cantidad: 40, unidad: 'g' },
      ],
      pasos: [],
    }),
  );

  const { zonaId } = losDatos<{ zonaId: string }>(
    await api.ejecutar(await enLaCaja(ROSA), 'crear_zona_de_sala', { nombre: 'Salón M20·2' }),
  );
  for (const nombre of ['1', '2', '3']) {
    mesas.push(
      losDatos<{ mesaId: string }>(
        await api.ejecutar(await enLaCaja(ROSA), 'crear_mesa', {
          zona_id: zonaId,
          nombre,
          plazas: 4,
        }),
      ).mesaId,
    );
  }
  losDatos(
    await api.ejecutar(await enLaCaja(ROSA), 'abrir_caja', {
      turno_id: crypto.randomUUID(),
      contado: { '5000': 3 },
    }),
  );
}, 180_000);

afterAll(async () => {
  await base.cerrar();
});

describe('lo que se escapa', () => {
  it('sin vender nada en Estook TPV, no hay tarjeta', async () => {
    expect(await loQueSeEscapa()).toBeNull();
  });

  it('con un solo inventario desde que el TPV resta, espera al segundo', async () => {
    // Hace 5 días, la primera venta: el TPV empieza a restar.
    ahora = elDia(5, 19);
    await venderEnElTpv([{ nombre: 'Hamburguesa', cantidad: 2 }], 2400);
    // Hace 4 días, antes de abrir, el primer inventario: cuadra con el libro.
    ahora = elDia(4, 6);
    await contar([
      { producto_id: carne, hay: 4640 },
      { producto_id: cebolla, hay: 1920 },
      { producto_id: lejia, hay: 10 },
    ]);
    expect(await loQueSeEscapa()).toEqual({
      desde: null,
      hasta: null,
      vigilados: 0,
      seSalen: [],
      centimos: 0,
      sinEscandallo: [],
      platosSinEscandallo: 0,
      aMedias: 0,
    });
  });

  it('la carne se sale del margen; la cebolla y la lejía, no', async () => {
    // Tres hamburguesas hace 4 días y dos hace 3: 900 g de carne y 200 g de cebolla.
    ahora = elDia(4, 19);
    await venderEnElTpv([{ nombre: 'Hamburguesa', cantidad: 3 }], 3600);
    ahora = elDia(3, 19);
    await venderEnElTpv([{ nombre: 'Hamburguesa', cantidad: 2 }], 2400);
    // 100 g de carne, al limpiarla: apuntado, no se escapa.
    ahora = elDia(3, 20);
    losDatos(
      await api.ejecutar(await rosa(), 'apuntar_merma', {
        producto_id: carne,
        cuanto: 100,
        motivo: 'limpieza',
      }),
    );
    // Hace 2 días, el segundo inventario. El libro dice 3.640 g de carne y hay 3.100: faltan 540 g,
    // de los 1.000 g que tenían que salir (900 vendidos y 100 al limpiar), un 54 %, 6,48 €.
    // Cebolla: el libro dice 1.720 g y hay 1.700; faltan 20 g de 200, un 10 % pero 0,04 €.
    // Lejía: faltan 2 botellas, pero no la vende el TPV, y no se vigila.
    ahora = elDia(2, 6);
    await contar([
      { producto_id: carne, hay: 3100 },
      { producto_id: cebolla, hay: 1700 },
      { producto_id: lejia, hay: 8 },
    ]);

    const escapa = await loQueSeEscapa();
    expect(escapa).toEqual({
      desde: elDia(4, 6).toISOString().replace('.000', ''),
      hasta: elDia(2, 6).toISOString().replace('.000', ''),
      vigilados: 2,
      seSalen: [
        {
          id: carne,
          nombre: 'Carne de hamburguesa M20·2',
          unidadDeUso: 'g',
          falta: 540,
          debiaSalir: 1000,
          parte: 0.54,
          centimos: 648,
        },
      ],
      centimos: 648,
      sinEscandallo: [],
      platosSinEscandallo: 0,
      aMedias: 0,
    });
  });

  it('el food cost de tus escandallos, junto al real, del mismo periodo', async () => {
    // La caja de los dos días, cerrada: 36,00 € y 24,00 €, con IVA.
    for (const [dias, total] of [
      [4, 3600],
      [3, 2400],
    ] as const) {
      ahora = elDia(dias, 23);
      losDatos(
        await api.ejecutar(await rosa(), 'cerrar_la_caja', {
          fecha: elDia(dias, 12).toISOString().slice(0, 10),
          total_centimos: total,
          lineas: [],
        }),
      );
    }
    ahora = elDia(2, 10);
    const fc = losDatos<{
      periodo: string;
      desde: string;
      hasta: string;
      consumoRealCentimos: number;
      ventasSinImpuestoCentimos: number | null;
      real: number | null;
      escandallos: unknown;
    }>(await api.consultar(await rosa(), 'el_food_cost_real', { periodo: 'inventarios' }));
    expect([fc.periodo, fc.desde, fc.hasta]).toEqual([
      'inventarios',
      elDia(4, 12).toISOString().slice(0, 10),
      elDia(3, 12).toISOString().slice(0, 10),
    ]);
    // Real: 1.540 g de carne (18,48 €), 220 g de cebolla (0,44 €) y 2 botellas (6,00 €) = 24,92 €,
    // de 60,00 € con IVA, 54,55 € sin él: un 45,7 %.
    expect(fc.consumoRealCentimos).toBe(2492);
    expect(fc.ventasSinImpuestoCentimos).toBe(5455);
    expect(fc.real).toBe(45.7);
    // Escandallos: cinco hamburguesas a 2,24 € (180 g de carne y 40 g de cebolla) = 11,20 € de
    // 54,55 €: un 20,5 %. Diferencia: 25,2 puntos, 24,92 € − 11,20 € = 13,72 €.
    expect(fc.escandallos).toEqual({
      coste: 1120,
      ventasConCoste: 5455,
      ventas: 5455,
      teorico: 20.5,
      parteConEscandallo: 1,
      puntos: 25.2,
      centimos: 1372,
      dentroDeLoNormal: false,
    });
  });

  it('un plato vendido sin escandallo deja el periodo a medias, y se dice cuál', async () => {
    ahora = elDia(2, 19);
    await venderEnElTpv(
      [
        { nombre: 'Hamburguesa', cantidad: 1 },
        { nombre: 'Pulpo', cantidad: 2 },
      ],
      4500,
    );
    ahora = elDia(1, 6);
    await contar([
      { producto_id: carne, hay: 2900 },
      { producto_id: cebolla, hay: 1660 },
    ]);
    const escapa = await loQueSeEscapa();
    expect(escapa).toMatchObject({
      vigilados: 0,
      seSalen: [],
      sinEscandallo: ['Pulpo M20·2'],
      platosSinEscandallo: 1,
      aMedias: 2,
    });
  });

  it('quien no ve precios ve lo que falta, sin un euro', async () => {
    // Luis, jefe de cocina de Bar Centro con los precios de compra recortados: cierra inventarios
    // y no ve lo que cuesta el género (como en la prueba de M8).
    await base.bd.query(
      `insert into estook.membresia (persona_id, organizacion_id, local_id, alcance, rol)
       select p.id, o.id, l.id, 'local', 'jefe_de_cocina'
         from estook.persona p, estook.organizacion o
         join estook.local l on l.organizacion_id = o.id and l.codigo = 'bar-centro'
        where p.correo = 'luis@ejemplo.estook.com' and o.codigo = 'bar-centro'`,
    );
    await base.bd.query(
      `insert into estook.recorte_de_permiso (membresia_id, local_id, permiso, nivel, motivo)
       select m.id, m.local_id, 'dato.precio_de_compra', 'sin_acceso', 'la prueba de M20 · 2'
         from estook.membresia m
         join estook.persona p on p.id = m.persona_id
         join estook.local l on l.id = m.local_id
        where p.correo = 'luis@ejemplo.estook.com' and l.codigo = 'bar-centro'`,
    );
    const luis = await api.entrar('luis@ejemplo.estook.com');
    const [local] = (
      await base.bd.query<{ organizacion_id: string }>(
        'select organizacion_id::text as organizacion_id from estook.local where id = $1',
        [barCentro],
      )
    ).rows;
    losDatos(
      await api.ejecutar(luis, 'cambiar_de_contexto', {
        organizacion_id: local?.organizacion_id,
        local_id: barCentro,
      }),
    );
    const datos = losDatos<{ puedeVerPrecios: boolean; seEscapa: SeEscapa | null }>(
      await api.consultar(luis, 'la_desviacion'),
    );
    expect(datos.puedeVerPrecios).toBe(false);
    expect(datos.seEscapa).not.toBeNull();
    expect(datos.seEscapa).not.toHaveProperty('centimos');
  });
});
