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
import { elFallo, entrarFichando, losDatos, montarLaApi, type ApiDePrueba } from './despachador.ts';

/**
 * **M20 · 1 · Lo vendido baja del almacén** (decisión 0149, migración 0121), contra la base y con el
 * Verifacti de mentira. Cobra una camarera, que no lleva Almacén:
 *
 *   · cobrar resta el escandallo de cada plato, tal cual, con su coste congelado; el plato sin
 *     escandallo cuenta en dinero y no resta nada
 *   · el mismo cobro dos veces no resta dos veces
 *   · si restar falla, el cobro sigue, y el siguiente cobro lo vuelve a intentar
 *   · el ticket anulado devuelve todo; «Se cobró de más» devuelve lo suyo; «Mal hecho», nada
 *   · «Sacar género» ya no deja apuntar lo vendido ni lo cocinado
 *   · Cobros cuenta por el día del cobro, no por el de la caja (lección 277)
 *   · Por producto y Vendidos sin escandallo dicen lo cobrado, al céntimo
 */
let base: BaseDePrueba;
let api: ApiDePrueba;
const verifacti = verifactiDeMentira();
const SECRETO_DEL_RELOJ = 'el-secreto-del-reloj-de-lo-vendido';
const UN_DIA = 24 * 60 * 60 * 1000;
/** El reloj de la API: la caja se abre hace cinco días y se cobra hoy (lección 277). */
let ahora = new Date(Date.now() - 5 * UN_DIA);

const ROSA = 'rosa@ejemplo.estook.com';
const SARA = 'sara@ejemplo.estook.com';

let barCentro: string;
let llaveDeLaCaja: string;
let rosaEnEstook: string;
let carne: string;
let cebolla: string;
const plato: Record<string, string> = {};
const mesas: string[] = [];

const comoDuena = async <T>(texto: string, valores: unknown[] = []) =>
  (await base.bd.query<T>(texto, valores)).rows;

async function enLaCaja(correo: string): Promise<string> {
  const dentro = losDatos<{ turno: string }>(
    await entrarFichando(api, llaveDeLaCaja, base.pinDe(correo, 'bar-centro'), llaveDeLaCaja),
  );
  return tokenDelAparato(dentro.turno, llaveDeLaCaja);
}

/** Lo que hay en la cámara de un producto, según la última línea de su libro. */
async function loQueHay(productoId: string): Promise<number> {
  const [fila] = await comoDuena<{ cantidad: string }>(
    'select cantidad::text as cantidad from estook.existencias where producto_id = $1',
    [productoId],
  );
  return Number(fila?.cantidad ?? 0);
}

/** Abre una mesa, pide y la cobra entera con tarjeta. Devuelve el cobro y su ticket. */
async function cobrarUnaMesa(
  mesa: number,
  platos: { nombre: string; cantidad?: number }[],
  total: number,
): Promise<{ cobroId: string; documentoId: string; numero: string }> {
  const cuenta = crypto.randomUUID();
  losDatos(
    await api.ejecutar(await enLaCaja(SARA), 'abrir_mesa', {
      cuenta_id: cuenta,
      mesa_id: mesas[mesa],
      personas: 2,
    }),
  );
  losDatos(
    await api.ejecutar(await enLaCaja(SARA), 'pedir', {
      cuenta_id: cuenta,
      platos: platos.map((p) => ({
        id: crypto.randomUUID(),
        plato_id: plato[p.nombre],
        pase: 1,
        cantidad: p.cantidad ?? 1,
      })),
    }),
  );
  const cobroId = crypto.randomUUID();
  const hecho = losDatos<{ documentoId: string; numero: string }>(
    await api.ejecutar(await enLaCaja(SARA), 'cobrar', {
      cobro_id: cobroId,
      cuenta_id: cuenta,
      que: 'toda',
      importe: total,
      pagos: [{ forma: 'tarjeta', importe: total }],
    }),
  );
  return { cobroId, documentoId: hecho.documentoId, numero: hecho.numero };
}

/** Hacienda dice «Correcto» de un documento, y el reloj lo lee. */
async function correcto(numero: string): Promise<void> {
  const registro = verifacti.registros.find(
    (x) => x.numero === numero.slice(-6) && numero.startsWith(x.serie) && x.operacion === 'Alta',
  );
  if (registro === undefined) throw new Error(`Verifacti no tiene el alta de ${numero}`);
  verifacti.decirHacienda(registro.uuid, 'Correcto');
  ahora = new Date(ahora.getTime() + 3 * 60 * 1000);
  await api.despachador.repasarDocumentos(
    { tokenDeSesion: null, correlacionId: crypto.randomUUID() },
    SECRETO_DEL_RELOJ,
  );
}

beforeAll(async () => {
  base = await levantarBase();
  api = montarLaApi(base.bd, { facturacion: verifacti, ahora: () => ahora });
  barCentro = await base.localPorCodigo('bar-centro');

  await comoDuena(
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
  rosaEnEstook = await api.entrar(ROSA);
  losDatos(
    await api.ejecutar(rosaEnEstook, 'poner_las_series', {
      ticket: 'T-LV',
      factura: 'F-LV',
      rectificativa: 'R-LV',
      otro_programa: false,
    }),
  );
  llaveDeLaCaja = losDatos<{ llave: string }>(
    await api.ejecutar(rosaEnEstook, 'vincular_el_primer_aparato', {
      local_id: barCentro,
      funcion: 'caja',
      nombre: 'Caja 1',
      cajon_nuevo: 'Caja 1',
    }),
  ).llave;
  rosaEnEstook = await api.entrar(ROSA);

  // El género: 5 kg de carne a 12 €/kg, y 2 kg de cebolla a 2 €/kg.
  carne = losDatos<{ productoId: string }>(
    await api.ejecutar(rosaEnEstook, 'crear_producto', {
      nombre: 'Carne de hamburguesa M20',
      formato: 'Kilo',
      factor: 1000,
      unidad_de_uso: 'g',
      precio_centimos: 1200,
      cantidad_inicial: 5000,
    }),
  ).productoId;
  cebolla = losDatos<{ productoId: string }>(
    await api.ejecutar(rosaEnEstook, 'crear_producto', {
      nombre: 'Cebolla M20',
      formato: 'Kilo',
      factor: 1000,
      unidad_de_uso: 'g',
      precio_centimos: 200,
      cantidad_inicial: 2000,
    }),
  ).productoId;

  // La carta: la hamburguesa, a 12,00 €, con su escandallo; el pulpo, a 16,50 €, sin él.
  const { seccionId } = losDatos<{ seccionId: string }>(
    await api.ejecutar(rosaEnEstook, 'crear_seccion', { nombre: 'Principales M20' }),
  );
  const creados = losDatos<{ creados: { platoId: string }[] }>(
    await api.ejecutar(rosaEnEstook, 'crear_platos', {
      seccion_id: seccionId,
      platos: [
        { nombre: 'Hamburguesa M20', precio_centimos: 1200 },
        { nombre: 'Pulpo M20', precio_centimos: 1650 },
      ],
    }),
  ).creados;
  plato['Hamburguesa'] = creados[0]?.platoId ?? '';
  plato['Pulpo'] = creados[1]?.platoId ?? '';
  losDatos(
    await api.ejecutar(rosaEnEstook, 'guardar_ficha', {
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
    await api.ejecutar(await enLaCaja(ROSA), 'crear_zona_de_sala', { nombre: 'Salón M20' }),
  );
  for (const nombre of ['1', '2', '3', '4', '5', '6']) {
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
  await comoDuena(
    `update plataforma.reloj set huella = encode(sha256(convert_to($1, 'UTF8')), 'hex')`,
    [SECRETO_DEL_RELOJ],
  );
  // La caja se abrió hace cinco días y sigue abierta: desde aquí, se cobra hoy.
  ahora = new Date(Date.now());
}, 180_000);

afterAll(async () => {
  await base.cerrar();
});

let primero: { cobroId: string; documentoId: string };

describe('cobrar resta del almacén', () => {
  it('dos hamburguesas y un pulpo: resta lo que pide el escandallo; el pulpo, nada', async () => {
    primero = await cobrarUnaMesa(
      0,
      [{ nombre: 'Hamburguesa', cantidad: 2 }, { nombre: 'Pulpo' }],
      4050,
    );
    // 2 × 180 g de carne y 2 × 40 g de cebolla: lo que pide el escandallo (0150).
    expect(await loQueHay(carne)).toBe(4640);
    expect(await loQueHay(cebolla)).toBe(1920);

    const movimientos = await comoDuena<{
      tipo: string;
      origen: string;
      cantidad: string;
      motivo: string;
      persona: string | null;
    }>(
      `select m.tipo::text as tipo, m.origen, m.cantidad::text as cantidad, m.motivo,
              p.correo as persona
         from estook.movimiento_de_stock m left join estook.persona p on p.id = m.persona_id
        where m.referencia ->> 'cobro' = $1 order by m.producto_id = $2 desc`,
      [primero.cobroId, carne],
    );
    expect(movimientos).toEqual([
      {
        tipo: 'consumo',
        origen: 'venta',
        cantidad: '-360.0000',
        motivo: 'Vendido · Mesa 1',
        persona: SARA,
      },
      {
        tipo: 'consumo',
        origen: 'venta',
        cantidad: '-80.0000',
        motivo: 'Vendido · Mesa 1',
        persona: SARA,
      },
    ]);

    const bajadas = await comoDuena<{
      nombre: string;
      estado: string;
      coste: string | null;
      importe: number;
    }>(
      `select nombre, estado, coste_milesimas::text as coste, importe_centimos as importe
         from estook.linea_bajada where cobro_id = $1 order by nombre`,
      [primero.cobroId],
    );
    // 360 g × 1.200 milésimas + 80 g × 200 milésimas = 448.000 milésimas: 4,48 €.
    expect(bajadas).toEqual([
      { nombre: 'Hamburguesa M20', estado: 'bajada', coste: '448000', importe: 2400 },
      { nombre: 'Pulpo M20', estado: 'sin_escandallo', coste: null, importe: 1650 },
    ]);
    const [cola] = await comoDuena<{ n: number }>(
      'select count(*)::int as n from estook.lo_vendido_por_bajar where local_id = $1',
      [barCentro],
    );
    expect(cola?.n).toBe(0);
  });

  it('el mismo cobro otra vez no resta otra vez', async () => {
    const [cuenta] = await comoDuena<{ cuenta_id: string }>(
      'select cuenta_id::text as cuenta_id from estook.cobro where id = $1',
      [primero.cobroId],
    );
    const otraVez = losDatos<{ yaEstaba: boolean }>(
      await api.ejecutar(await enLaCaja(SARA), 'cobrar', {
        cobro_id: primero.cobroId,
        cuenta_id: cuenta?.cuenta_id,
        que: 'toda',
        importe: 4050,
        pagos: [{ forma: 'tarjeta', importe: 4050 }],
      }),
    );
    expect(otraVez.yaEstaba).toBe(true);
    expect(await loQueHay(carne)).toBe(4640);
  });

  it('si restar falla, el cobro sigue; y el siguiente cobro lo vuelve a intentar', async () => {
    // Se le quita al sistema el permiso de apuntar lo vendido: restar falla.
    await comoDuena('drop policy movimiento_lo_vendido on estook.movimiento_de_stock');
    const atascado = await cobrarUnaMesa(1, [{ nombre: 'Hamburguesa' }], 1200);
    expect(atascado.documentoId).toBeTruthy();
    expect(await loQueHay(carne)).toBe(4640);
    const [enCola] = await comoDuena<{ intentos: number; ultimo_fallo: string | null }>(
      'select intentos, ultimo_fallo from estook.lo_vendido_por_bajar where cobro_id = $1',
      [atascado.cobroId],
    );
    expect(enCola?.intentos).toBe(1);
    expect(enCola?.ultimo_fallo).toBeTruthy();

    // Vuelve el permiso, y el siguiente cobro hace lo suyo y lo que quedaba.
    await comoDuena(
      `create policy movimiento_lo_vendido on estook.movimiento_de_stock
         for insert with check (tipo = 'consumo' and origen = 'venta' and estook.es_el_sistema())`,
    );
    await cobrarUnaMesa(2, [{ nombre: 'Hamburguesa' }], 1200);
    expect(await loQueHay(carne)).toBe(4640 - 180 - 180);
    const [vacia] = await comoDuena<{ n: number }>(
      'select count(*)::int as n from estook.lo_vendido_por_bajar where local_id = $1',
      [barCentro],
    );
    expect(vacia?.n).toBe(0);
  });
});

describe('lo que vuelve', () => {
  it('el ticket anulado devuelve todo lo que restó, a sus lotes', async () => {
    const antes = { carne: await loQueHay(carne), cebolla: await loQueHay(cebolla) };
    const { cobroId, documentoId, numero } = await cobrarUnaMesa(
      3,
      [{ nombre: 'Hamburguesa', cantidad: 2 }],
      2400,
    );
    expect(await loQueHay(carne)).toBe(antes.carne - 360);
    // Anular es para lo que Hacienda ya tiene.
    await correcto(numero);
    losDatos(
      await api.ejecutar(rosaEnEstook, 'anular_el_documento', {
        documento_id: documentoId,
        motivo: 'Se cobró la mesa que no era',
      }),
    );
    expect(await loQueHay(carne)).toBe(antes.carne);
    expect(await loQueHay(cebolla)).toBe(antes.cebolla);
    const [anula] = await comoDuena<{ n: number }>(
      `select count(*)::int as n from estook.movimiento_de_stock
        where referencia ->> 'cobro' = $1 and referencia ? 'anula'`,
      [cobroId],
    );
    expect(anula?.n).toBe(2);
  });

  it('«Se cobró de más» devuelve lo suyo; «Mal hecho», nada', async () => {
    const antes = await loQueHay(carne);
    const { documentoId } = await cobrarUnaMesa(4, [{ nombre: 'Hamburguesa', cantidad: 3 }], 3600);
    expect(await loQueHay(carne)).toBe(antes - 540);

    // Se cobraron tres y se sirvieron dos: la tercera no salió de la cocina y vuelve.
    losDatos(
      await api.ejecutar(await enLaCaja(ROSA), 'devolver_el_documento', {
        documento_id: documentoId,
        que: 'partes',
        partes: [{ linea: 0, cantidad: 1 }],
        motivo: 'de_mas',
      }),
    );
    expect(await loQueHay(carne)).toBe(antes - 360);

    // Otra salió mal y se devuelve el dinero: esa sí se gastó.
    losDatos(
      await api.ejecutar(await enLaCaja(ROSA), 'devolver_el_documento', {
        documento_id: documentoId,
        que: 'partes',
        partes: [{ linea: 0, cantidad: 1 }],
        motivo: 'mal_hecho',
      }),
    );
    expect(await loQueHay(carne)).toBe(antes - 360);
  });
});

describe('sacar género, sin contar dos veces', () => {
  it('ya no deja apuntar lo vendido ni lo cocinado; una merma, sí', async () => {
    const yo = losDatos<{ local: { loVendidoBaja?: boolean } }>(
      await api.consultar(rosaEnEstook, 'quien_soy', {}),
    );
    expect(yo.local.loVendidoBaja).toBe(true);
    for (const por_que of ['gastado', 'vendido']) {
      const fallo = await api.ejecutar(rosaEnEstook, 'apuntar_salida', {
        producto_id: carne,
        cuanto: 100,
        por_que,
      });
      expect(elFallo(fallo)).toBe('faltan_datos');
      expect(JSON.stringify(fallo)).toContain('ya lo resta cada cobro');
    }
    losDatos(
      await api.ejecutar(rosaEnEstook, 'apuntar_salida', {
        producto_id: carne,
        cuanto: 100,
        por_que: 'traspaso',
      }),
    );
  });
});

describe('lo que se lee', () => {
  it('Cobros cuenta por el día del cobro, aunque la caja se abriera otro día (lección 277)', async () => {
    // La caja se abrió hace cinco días y sigue abierta: lo cobrado hoy es de hoy.
    const [caja] = await comoDuena<{ dias: number }>(
      `select (current_date - fecha_operativa)::int as dias from estook.turno_de_caja
        where local_id = $1 and cerrada_en is null`,
      [barCentro],
    );
    expect(caja?.dias).toBeGreaterThanOrEqual(4);
    const hoy = losDatos<{ totales: { cobros: number; tarjeta: number } }>(
      await api.consultar(rosaEnEstook, 'los_cobros', { dias: '1' }),
    );
    // Las cinco mesas cobradas hoy, la anulada también: Cobros dice lo que se cobró.
    expect(hoy.totales.cobros).toBe(5);
    expect(hoy.totales.tarjeta).toBe(4050 + 1200 + 1200 + 2400 + 3600);
  });

  it('Por producto dice lo cobrado, al céntimo, y su coste de aquel día', async () => {
    const r = losDatos<{
      conCoste: boolean;
      productos: {
        nombre: string;
        uds: number;
        ventas: number;
        coste: number | null;
        sinEscandallo: boolean;
      }[];
      ventas: number;
      coste: number | null;
      ventasConCoste: number | null;
      foodCost: number | null;
      sinEscandallo: number;
    }>(await api.consultar(rosaEnEstook, 'lo_vendido_por_producto', { dias: '1' }));
    expect(r.conCoste).toBe(true);
    const hamburguesa = r.productos.find((p) => p.nombre === 'Hamburguesa M20');
    const pulpo = r.productos.find((p) => p.nombre === 'Pulpo M20');
    // 2 + 1 + 1 + 2 + 3 hamburguesas cobradas (la anulada y la devuelta, cobradas igual).
    expect(hamburguesa?.uds).toBe(9);
    expect(pulpo).toMatchObject({ uds: 1, coste: null, sinEscandallo: true });
    // La tabla suma exactamente su total.
    expect(r.ventas).toBe(r.productos.reduce((s, p) => s + p.ventas, 0));
    expect(r.sinEscandallo).toBe(1);
    // Cada hamburguesa costó 180 g × 12 €/kg + 40 g × 2 €/kg = 2,24 €.
    expect(hamburguesa?.coste).toBe(9 * 224);
  });

  it('Vendidos sin escandallo: el pulpo, y deja de salir al crearle uno', async () => {
    const antes = losDatos<{ platos: { nombre: string; uds: number }[] }>(
      await api.consultar(rosaEnEstook, 'vendidos_sin_escandallo', {}),
    );
    expect(antes.platos).toEqual([{ platoId: plato['Pulpo'], nombre: 'Pulpo M20', uds: 1 }]);
    losDatos(
      await api.ejecutar(rosaEnEstook, 'guardar_ficha', {
        plato_id: plato['Pulpo'],
        version: 0,
        lineas: [{ producto_id: cebolla, cantidad: 10, unidad: 'g' }],
        pasos: [],
      }),
    );
    const despues = losDatos<{ platos: unknown[] }>(
      await api.consultar(rosaEnEstook, 'vendidos_sin_escandallo', {}),
    );
    expect(despues.platos).toEqual([]);
  });
});
