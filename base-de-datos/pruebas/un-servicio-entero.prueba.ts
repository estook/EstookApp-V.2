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
 * **Un servicio entero, con la cuenta hecha a mano en cada paso** (la Auditoría 3, segunda vuelta).
 *
 * Las demás pruebas miran cada pieza por su lado. Esta hace un servicio de principio a fin en Bar Centro,
 * con números redondos que se pueden comprobar con papel y lápiz:
 *
 *   · abrir la caja con 150,00 €
 *   · mesa 1: 2 hamburguesas (12,00) y 2 cañas (2,50) = 29,00 €, en efectivo con 50,00 € → 21,00 de cambio
 *   · mesa 2: 1 hamburguesa, 150 g de jamón a peso (90,00 €/kg = 13,50) y 1 caña = 28,00 €, en tres partes:
 *     9,34 y 9,33 con tarjeta y 9,33 en efectivo
 *   · se devuelve una caña de la mesa 1 («se cobró de más»), en efectivo: 2,50
 *   · el almacén baja lo justo: 540 g de carne, 120 g de cebolla y 150 g de jamón (el escandallo del jamón
 *     es el de un kilo, y se vendieron 150 g)
 *   · cerrar la caja: debería haber 150,00 + 29,00 + 9,33 − 2,50 = 185,83 € en el cajón
 */
let base: BaseDePrueba;
let api: ApiDePrueba;
const verifacti = verifactiDeMentira();

const ROSA = 'rosa@ejemplo.estook.com';
const SARA = 'sara@ejemplo.estook.com';

let barCentro: string;
let llave: string;
let rosaEnEstook: string;
let turno: string;
const producto: Record<string, string> = {};
const plato: Record<string, string> = {};
const mesas: string[] = [];
let ticketDeLaMesa1 = '';

const comoDuena = async <T>(texto: string, valores: unknown[] = []) =>
  (await base.bd.query<T>(texto, valores)).rows;

async function enLaCaja(correo: string): Promise<string> {
  const dentro = losDatos<{ turno: string }>(
    await entrarFichando(api, llave, base.pinDe(correo, 'bar-centro'), llave),
  );
  return tokenDelAparato(dentro.turno, llave);
}

async function loQueHay(productoId: string | undefined): Promise<number> {
  const [fila] = await comoDuena<{ cantidad: string }>(
    'select cantidad::text as cantidad from estook.existencias where producto_id = $1',
    [productoId],
  );
  return Number(fila?.cantidad ?? 0);
}

/** El desglose fiscal que se guardó de un documento: base, cuota y total. */
async function elDesglose(documentoId: string) {
  const [fila] = await comoDuena<{ base: number; cuota: number; total: number }>(
    `select base, cuota, total from facturacion.documento where id = $1`,
    [documentoId],
  );
  return fila;
}

beforeAll(async () => {
  base = await levantarBase();
  api = montarLaApi(base.bd, { facturacion: verifacti });
  barCentro = await base.localPorCodigo('bar-centro');

  await comoDuena(
    `insert into estook.suscripcion (organizacion_id, estado, de_la_casa)
     select organizacion_id, 'activa', true from estook.local where id = $1
     on conflict (organizacion_id) do update set de_la_casa = true`,
    [barCentro],
  );
  const admin = losDatos<{ token: string }>(
    await api.ejecutar(null, 'entrar_en_admin', {
      correo: ADMIN_DE_EJEMPLO,
      contrasena: CLAVE_DE_EJEMPLO,
    }),
  );
  losDatos(
    await api.ejecutar(admin.token, 'superar_doble_factor', {
      codigo: await codigoEn(SECRETO_DEL_ADMIN_DE_EJEMPLO, new Date(Date.now())),
    }),
  );
  losDatos(
    await api.ejecutar(admin.token, 'admin_poner_la_empresa_de_pruebas', { local_id: barCentro }),
  );
  rosaEnEstook = await api.entrar(ROSA);
  losDatos(
    await api.ejecutar(rosaEnEstook, 'poner_las_series', {
      ticket: 'T-SE',
      factura: 'F-SE',
      rectificativa: 'R-SE',
      otro_programa: false,
    }),
  );
  llave = losDatos<{ llave: string }>(
    await api.ejecutar(rosaEnEstook, 'vincular_el_primer_aparato', {
      local_id: barCentro,
      funcion: 'caja',
      nombre: 'Caja del servicio',
      cajon_nuevo: 'Caja del servicio',
    }),
  ).llave;
  rosaEnEstook = await api.entrar(ROSA);

  // El género, en gramos: 5 kg de carne a 12 €/kg, 2 kg de cebolla a 2 €/kg y 3 kg de jamón a 40 €/kg.
  for (const [nombre, precio, cantidad] of [
    ['Carne del servicio', 1200, 5000],
    ['Cebolla del servicio', 200, 2000],
    ['Jamón del servicio', 4000, 3000],
  ] as const) {
    producto[nombre] = losDatos<{ productoId: string }>(
      await api.ejecutar(rosaEnEstook, 'crear_producto', {
        nombre,
        formato: 'Kilo',
        factor: 1000,
        unidad_de_uso: 'g',
        precio_centimos: precio,
        cantidad_inicial: cantidad,
      }),
    ).productoId;
  }

  const { seccionId } = losDatos<{ seccionId: string }>(
    await api.ejecutar(rosaEnEstook, 'crear_seccion', { nombre: 'El servicio' }),
  );
  const creados = losDatos<{ creados: { platoId: string }[] }>(
    await api.ejecutar(rosaEnEstook, 'crear_platos', {
      seccion_id: seccionId,
      platos: [
        { nombre: 'Hamburguesa del servicio', precio_centimos: 1200 },
        { nombre: 'Caña del servicio', precio_centimos: 250 },
        // A peso, el precio es el del kilo: 90,00 €.
        { nombre: 'Jamón al corte del servicio', precio_centimos: 9000 },
      ],
    }),
  ).creados;
  plato['Hamburguesa'] = creados[0]?.platoId ?? '';
  plato['Caña'] = creados[1]?.platoId ?? '';
  plato['Jamón'] = creados[2]?.platoId ?? '';
  losDatos(
    await api.ejecutar(rosaEnEstook, 'guardar_ficha', {
      plato_id: plato['Hamburguesa'],
      version: 0,
      lineas: [
        { producto_id: producto['Carne del servicio'], cantidad: 180, unidad: 'g' },
        { producto_id: producto['Cebolla del servicio'], cantidad: 40, unidad: 'g' },
      ],
      pasos: [],
    }),
  );
  // El escandallo de lo que se vende a peso es el de un kilo (packages/dominio/src/lo-vendido.ts).
  losDatos(
    await api.ejecutar(rosaEnEstook, 'guardar_ficha', {
      plato_id: plato['Jamón'],
      version: 0,
      lineas: [{ producto_id: producto['Jamón del servicio'], cantidad: 1000, unidad: 'g' }],
      pasos: [],
    }),
  );
  losDatos(
    await api.ejecutar(await enLaCaja(ROSA), 'vender_a_peso', {
      plato_id: plato['Jamón'],
      si: true,
    }),
  );

  const { zonaId } = losDatos<{ zonaId: string }>(
    await api.ejecutar(await enLaCaja(ROSA), 'crear_zona_de_sala', {
      nombre: 'Salón del servicio',
    }),
  );
  for (const nombre of ['1', '2']) {
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
}, 180_000);

afterAll(async () => {
  await base.cerrar();
});

describe('un servicio entero', () => {
  it('se abre la caja con 150,00 €', async () => {
    turno = crypto.randomUUID();
    const abierta = losDatos<{ fondo: number }>(
      await api.ejecutar(await enLaCaja(ROSA), 'abrir_caja', {
        turno_id: turno,
        contado: { '5000': 3 },
      }),
    );
    expect(abierta.fondo).toBe(15000);
  });

  it('mesa 1: 29,00 € en efectivo, con 21,00 de cambio, y su ticket con el IVA bien', async () => {
    const cuenta = crypto.randomUUID();
    losDatos(
      await api.ejecutar(await enLaCaja(SARA), 'abrir_mesa', {
        cuenta_id: cuenta,
        mesa_id: mesas[0],
        personas: 2,
      }),
    );
    losDatos(
      await api.ejecutar(await enLaCaja(SARA), 'pedir', {
        cuenta_id: cuenta,
        platos: [
          { id: crypto.randomUUID(), plato_id: plato['Hamburguesa'], pase: 1, cantidad: 2 },
          { id: crypto.randomUUID(), plato_id: plato['Caña'], pase: 1, cantidad: 2 },
        ],
      }),
    );
    // Pedir apunta; «Mandar a cocina» es lo que la hace llegar, y la cocina la ve.
    losDatos(await api.ejecutar(await enLaCaja(SARA), 'mandar_a_cocina', { cuenta_id: cuenta }));
    expect(
      JSON.stringify(losDatos(await api.consultar(await enLaCaja(ROSA), 'la_cocina', {}))),
    ).toContain('Hamburguesa del servicio');

    const cobrado = losDatos<{ cambio: number; liberada: boolean; documentoId: string }>(
      await api.ejecutar(await enLaCaja(SARA), 'cobrar', {
        cobro_id: crypto.randomUUID(),
        cuenta_id: cuenta,
        que: 'toda',
        importe: 2900,
        pagos: [{ forma: 'efectivo', importe: 2900, entregado: 5000 }],
      }),
    );
    expect(cobrado.cambio).toBe(2100);
    expect(cobrado.liberada).toBe(true);
    ticketDeLaMesa1 = cobrado.documentoId;
    // 29,00 con el 10 %: 29,00 / 1,10 = 26,3636… → 26,36 de base y 2,64 de IVA.
    expect(await elDesglose(cobrado.documentoId)).toEqual({ base: 2636, cuota: 264, total: 2900 });
  });

  it('el almacén baja lo justo: 360 g de carne y 80 g de cebolla', async () => {
    expect(await loQueHay(producto['Carne del servicio'])).toBe(5000 - 360);
    expect(await loQueHay(producto['Cebolla del servicio'])).toBe(2000 - 80);
  });

  it('mesa 2: 150 g de jamón a 90 €/kg son 13,50; la mesa, 28,00, en tres partes', async () => {
    const cuenta = crypto.randomUUID();
    losDatos(
      await api.ejecutar(await enLaCaja(SARA), 'abrir_mesa', {
        cuenta_id: cuenta,
        mesa_id: mesas[1],
        personas: 3,
      }),
    );
    losDatos(
      await api.ejecutar(await enLaCaja(SARA), 'pedir', {
        cuenta_id: cuenta,
        platos: [
          { id: crypto.randomUUID(), plato_id: plato['Hamburguesa'], pase: 1 },
          { id: crypto.randomUUID(), plato_id: plato['Jamón'], pase: 1, peso_gramos: 150 },
          { id: crypto.randomUUID(), plato_id: plato['Caña'], pase: 1 },
        ],
      }),
    );
    const mesa = losDatos<{ platos: { nombre: string; precioCentimos: number }[] }>(
      await api.consultar(await enLaCaja(SARA), 'la_mesa', { cuenta_id: cuenta }),
    );
    expect(
      mesa.platos.find((p) => p.nombre === 'Jamón al corte del servicio')?.precioCentimos,
    ).toBe(1350);

    // 28,00 entre 3: 9,34 + 9,33 + 9,33. La última parte se lleva lo que quede.
    const partes: [number, number, 'tarjeta' | 'efectivo'][] = [
      [1, 934, 'tarjeta'],
      [2, 933, 'tarjeta'],
      [3, 933, 'efectivo'],
    ];
    const tickets: string[] = [];
    for (const [parte, importe, forma] of partes) {
      const hecho = losDatos<{ queda: number; documentoId: string }>(
        await api.ejecutar(await enLaCaja(SARA), 'cobrar', {
          cobro_id: crypto.randomUUID(),
          cuenta_id: cuenta,
          que: 'parte',
          parte,
          de: 3,
          importe,
          pagos: [{ forma, importe }],
        }),
      );
      tickets.push(hecho.documentoId);
    }
    // Los tres tickets suman la mesa, al céntimo, y su IVA también.
    const desgloses = await Promise.all(tickets.map((t) => elDesglose(t)));
    expect(desgloses.reduce((s, d) => s + (d?.total ?? 0), 0)).toBe(2800);
    for (const d of desgloses) expect((d?.base ?? 0) + (d?.cuota ?? 0)).toBe(d?.total);
  });

  it('el jamón baja por lo que pesó: 150 g, y la carne otra hamburguesa', async () => {
    expect(await loQueHay(producto['Jamón del servicio'])).toBe(3000 - 150);
    expect(await loQueHay(producto['Carne del servicio'])).toBe(5000 - 540);
    expect(await loQueHay(producto['Cebolla del servicio'])).toBe(2000 - 120);
  });

  it('se devuelve una caña de la mesa 1 en efectivo: −2,50, con su IVA', async () => {
    const [doc] = await comoDuena<{ lineas: { nombre: string }[] }>(
      `select lineas from facturacion.documento where id = $1`,
      [ticketDeLaMesa1],
    );
    const laCana = (doc?.lineas ?? []).findIndex((l) => l.nombre.startsWith('Caña'));
    expect(laCana).toBeGreaterThanOrEqual(0);
    const devuelto = losDatos<{ delCajon: number; documentoId: string }>(
      await api.ejecutar(await enLaCaja(ROSA), 'devolver_el_documento', {
        documento_id: ticketDeLaMesa1,
        que: 'partes',
        partes: [{ linea: laCana, cantidad: 1 }],
        motivo: 'de_mas',
      }),
    );
    expect(devuelto.delCajon).toBe(250);
    // −2,50 con el 10 %: −2,2727… → −2,27 de base y −0,23 de IVA.
    expect(await elDesglose(devuelto.documentoId)).toEqual({ base: -227, cuota: -23, total: -250 });
  });

  it('los cobros del día: 54,50 € (29,00 + 28,00 − 2,50)', async () => {
    const cobros = losDatos<{
      totales: { total: number; efectivo: number; tarjeta: number; devuelto: number };
    }>(await api.consultar(rosaEnEstook, 'los_cobros', { dias: '1' }));
    expect(cobros.totales.tarjeta).toBe(934 + 933);
    expect(cobros.totales.devuelto).toBe(250);
    expect(cobros.totales.total - cobros.totales.devuelto).toBe(5450);
  });

  it('lo vendido por producto, sin IVA y con su coste a mano', async () => {
    const r = losDatos<{
      ventas: number;
      productos: { nombre: string; uds: number; ventas: number; coste: number | null }[];
    }>(await api.consultar(rosaEnEstook, 'lo_vendido_por_producto', { dias: '1' }));
    const hamburguesa = r.productos.find((p) => p.nombre === 'Hamburguesa del servicio');
    const jamon = r.productos.find((p) => p.nombre === 'Jamón al corte del servicio');
    // Las ventas, sin IVA (A4, 1A): 3 × 12,00 = 36,00 / 1,10 = 32,73. Cada hamburguesa cuesta
    // 180 g × 1,2 c/g + 40 g × 0,2 c/g = 216 + 8 = 2,24 €.
    expect(hamburguesa).toMatchObject({ uds: 3, ventas: 3273, coste: 3 * 224 });
    // El jamón: 13,50 / 1,10 = 12,27 de venta, y 150 g × 4 c/g = 6,00 € de coste.
    expect(jamon).toMatchObject({ ventas: 1227, coste: 600 });
    expect(r.ventas).toBe(r.productos.reduce((s, p) => s + p.ventas, 0));
  });

  // **Fallo conocido** (la Auditoría 3, segunda vuelta): «Por producto» no resta lo devuelto ni lo anulado,
  // y «Cobros» sí. Se cobraron 3 cañas y se devolvió 1: deberían salir 2 (5,00 / 1,10 = 4,55). Cuando se
  // arregle, esta prueba se pondrá en rojo: entonces se le quita el `.fails`.
  it.fails('lo devuelto se resta de lo vendido por producto', async () => {
    const r = losDatos<{ productos: { nombre: string; uds: number; ventas: number }[] }>(
      await api.consultar(rosaEnEstook, 'lo_vendido_por_producto', { dias: '1' }),
    );
    expect(r.productos.find((p) => p.nombre === 'Caña del servicio')).toMatchObject({
      uds: 2,
      ventas: 455,
    });
  });

  it('cerrar la caja: deberían quedar 185,83 € y cuadra al céntimo', async () => {
    // 150,00 + 29,00 + 9,33 − 2,50 = 185,83 = 3 × 50 + 20 + 10 + 5 + 0,50 + 0,20 + 0,10 + 0,02 + 0,01
    const cerrada = losDatos<{
      deberiaHaber: number;
      contado: number;
      diferencia: number;
      tarjeta: number;
      diferenciaDeTarjeta: number | null;
    }>(
      await api.ejecutar(await enLaCaja(ROSA), 'cerrar_caja', {
        turno_id: turno,
        contado: {
          '5000': 3,
          '2000': 1,
          '1000': 1,
          '500': 1,
          '50': 1,
          '20': 1,
          '10': 1,
          '2': 1,
          '1': 1,
        },
        datafono: 934 + 933,
        para_manana: 15000,
      }),
    );
    expect(cerrada.deberiaHaber).toBe(18583);
    expect(cerrada.contado).toBe(18583);
    expect(cerrada.diferencia).toBe(0);
    expect(cerrada.tarjeta).toBe(1867);
    expect(cerrada.diferenciaDeTarjeta).toBe(0);
  });
});
