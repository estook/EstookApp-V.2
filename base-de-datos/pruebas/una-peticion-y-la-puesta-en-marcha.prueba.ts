import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { fechaEnElLocal } from '@estook/dominio';
import { levantarBase, type BaseDePrueba } from './entorno.ts';
import { elFallo, losDatos, montarLaApi, type ApiDePrueba } from './despachador.ts';

/**
 * La entrega del 15-oct (decisión 0085), contra una base de verdad:
 *
 *   · **varias consultas en una petición**, con el permiso de cada una intacto;
 *   · **el buscador encuentra pedidos y facturas** (0067), por número o proveedor, y
 *     cada cosa solo a quien la puede abrir;
 *   · **la puesta en marcha** del local, con lo hecho de verdad.
 */
let base: BaseDePrueba;
let api: ApiDePrueba;

const ROSA = 'rosa@ejemplo.estook.com'; // gerente de Bar Centro
const MARCOS = 'marcos@ejemplo.estook.com'; // cocinero de Bar Centro: Almacén sin importes
const SARA = 'sara@ejemplo.estook.com'; // camarera de Bar Centro: sin Almacén
const LUIS = 'luis@ejemplo.estook.com'; // jefe de cocina de Bar Puerto, otra organización

let rosa: string;
let marcos: string;
let sara: string;
let luis: string;

const hoy = fechaEnElLocal(new Date(Date.now()), 'Europe/Madrid');

beforeAll(async () => {
  base = await levantarBase();
  api = montarLaApi(base.bd);
  rosa = await api.entrar(ROSA);
  marcos = await api.entrar(MARCOS);
  sara = await api.entrar(SARA);
  luis = await api.entrar(LUIS);
}, 120_000);

afterAll(async () => {
  await base.cerrar();
});

interface Encontrado {
  readonly tipo: string;
  readonly id: string;
  readonly titulo: string;
  readonly subtitulo: string;
}

async function buscar(token: string, texto: string): Promise<Encontrado[]> {
  return losDatos<Encontrado[]>(await api.consultar(token, 'buscar', { texto }));
}

// ── Varias consultas de una vez ──────────────────────────────────────────────

describe('varias consultas en una petición', () => {
  it('cada una contesta lo mismo que sola, y lo que no se puede ver no se ve', async () => {
    const consultas = [
      { nombre: 'almacen_hoy', entrada: {} },
      { nombre: 'mis_facturas', entrada: {} },
      { nombre: 'fichajes_de_hoy', entrada: {} },
    ];
    const juntas = await api.despachador.consultarVarias(
      { tokenDeSesion: sara, correlacionId: 'lote-de-sara' },
      consultas,
    );
    const sueltas = await Promise.all(
      consultas.map((c) => api.consultar(sara, c.nombre, c.entrada)),
    );
    // La camarera: sin Almacén, sin precios y sin Equipo. En lote, igual que sola.
    expect(juntas.map((r) => (r.estado === 'fallo' ? r.codigo : r.estado))).toEqual(
      sueltas.map((r) => (r.estado === 'fallo' ? r.codigo : r.estado)),
    );
    expect(juntas.every((r) => r.estado === 'fallo' && r.codigo === 'sin_permiso')).toBe(true);
  });

  it('la gerente recibe lo suyo de cada una', async () => {
    const [almacen, facturas] = await api.despachador.consultarVarias(
      { tokenDeSesion: rosa, correlacionId: 'lote-de-rosa' },
      [
        { nombre: 'almacen_hoy', entrada: {} },
        { nombre: 'mis_facturas', entrada: {} },
      ],
    );
    expect(almacen?.estado).toBe('ok');
    expect(facturas?.estado).toBe('ok');
  });
});

// ── El buscador, con pedidos y facturas (0067) ───────────────────────────────

describe('el buscador encuentra pedidos y facturas', () => {
  let proveedorId: string;
  let pedidoId: string;
  let numeroDelPedido: number;
  let facturaId: string;

  beforeAll(async () => {
    proveedorId = losDatos<{ proveedorId: string }>(
      await api.ejecutar(rosa, 'crear_proveedor', { nombre: 'Distribuciones Zubiri' }),
    ).proveedorId;
    const pedido = losDatos<{ pedidoId: string; numero: number }>(
      await api.ejecutar(rosa, 'crear_pedido', { proveedor_id: proveedorId }),
    );
    pedidoId = pedido.pedidoId;
    numeroDelPedido = pedido.numero;
    facturaId = losDatos<{ facturaId: string }>(
      await api.ejecutar(rosa, 'registrar_factura', {
        proveedor_id: proveedorId,
        numero: 'ZB-2026/00871',
        fecha: hoy,
        base_centimos: 12_345,
      }),
    ).facturaId;
  });

  it('un pedido, por su número, escrito de varias maneras', async () => {
    for (const escrito of [
      String(numeroDelPedido),
      `pedido ${numeroDelPedido}`,
      `nº ${numeroDelPedido}`,
      `#${numeroDelPedido}`,
    ]) {
      const encontrados = await buscar(rosa, escrito);
      expect(
        encontrados.some((e) => e.tipo === 'pedido' && e.id === pedidoId),
        `«${escrito}» no encuentra el pedido ${numeroDelPedido}`,
      ).toBe(true);
    }
  });

  it('una factura, por su número entero o por sus cifras', async () => {
    for (const escrito of ['ZB-2026/00871', 'zb-2026', '871', '00871']) {
      const encontrados = await buscar(rosa, escrito);
      expect(
        encontrados.some((e) => e.tipo === 'factura' && e.id === facturaId),
        `«${escrito}» no encuentra la factura`,
      ).toBe(true);
    }
  });

  it('por el proveedor: el proveedor primero, y debajo su pedido y su factura', async () => {
    const encontrados = await buscar(rosa, 'zubiri');
    expect(encontrados[0]?.tipo).toBe('proveedor');
    expect(encontrados.some((e) => e.id === pedidoId)).toBe(true);
    expect(encontrados.some((e) => e.id === facturaId)).toBe(true);
    const pedido = encontrados.find((e) => e.id === pedidoId);
    expect(pedido?.titulo).toBe(`Pedido ${numeroDelPedido} · Distribuciones Zubiri`);
    expect(pedido?.subtitulo).toBe('Borrador');
  });

  it('el cocinero encuentra el pedido, pero no la factura: es dinero', async () => {
    const encontrados = await buscar(marcos, 'zubiri');
    expect(encontrados.some((e) => e.id === pedidoId)).toBe(true);
    expect(encontrados.some((e) => e.tipo === 'factura')).toBe(false);
    // Y por el número de la factura, tampoco.
    expect((await buscar(marcos, '871')).some((e) => e.tipo === 'factura')).toBe(false);
  });

  it('la camarera, sin Almacén, no encuentra ni uno ni otra', async () => {
    const encontrados = await buscar(sara, 'zubiri');
    expect(encontrados.some((e) => e.tipo === 'pedido' || e.tipo === 'factura')).toBe(false);
  });

  it('desde otra organización no se encuentra nada', async () => {
    const encontrados = [...(await buscar(luis, 'zubiri')), ...(await buscar(luis, '871'))];
    expect(encontrados.some((e) => e.id === pedidoId || e.id === facturaId)).toBe(false);
  });

  it('de un proveedor con muchos, por su nombre solo salen los tres últimos', async () => {
    for (let i = 0; i < 4; i += 1) {
      await api.ejecutar(rosa, 'crear_pedido', { proveedor_id: proveedorId });
    }
    const encontrados = await buscar(rosa, 'zubiri');
    expect(encontrados.filter((e) => e.tipo === 'pedido')).toHaveLength(3);
    // Pero por su número, el primero sigue saliendo.
    expect((await buscar(rosa, String(numeroDelPedido))).some((e) => e.id === pedidoId)).toBe(true);
  });

  it('un número de una sola cifra se puede buscar; una letra sola, no', async () => {
    expect((await api.consultar(rosa, 'buscar', { texto: '7' })).estado).toBe('ok');
    expect(elFallo(await api.consultar(rosa, 'buscar', { texto: 'a' }))).toBe('faltan_datos');
  });
});

// ── La puesta en marcha ──────────────────────────────────────────────────────

interface Puesta {
  readonly pasos: readonly { readonly paso: string; readonly hecho: boolean }[];
  readonly oculta: boolean;
}

async function laPuesta(token: string): Promise<Puesta> {
  return losDatos<Puesta>(await api.consultar(token, 'la_puesta_en_marcha'));
}

describe('la puesta en marcha', () => {
  it('en un local de ejemplo no sale', async () => {
    expect((await laPuesta(rosa)).oculta).toBe(true);
  });

  it('en uno de verdad, los cinco pasos, con lo hecho de verdad', async () => {
    // Bar Centro deja de ser de ejemplo: así es como lo vería un local nuevo.
    await base.bd.query(
      `update estook.local set es_ejemplo = false
        where id = (select local_id from estook.membresia m
                      join estook.persona p on p.id = m.persona_id
                     where p.correo = $1 limit 1)`,
      [ROSA],
    );
    const antes = await laPuesta(rosa);
    expect(antes.oculta).toBe(false);
    expect(antes.pasos.map((p) => p.paso)).toEqual([
      'logo',
      'producto',
      'proveedor',
      'horario',
      'equipo',
    ]);
    const hecho = (paso: string, puesta: Puesta) =>
      puesta.pasos.find((p) => p.paso === paso)?.hecho;
    // Ya tiene equipo (Marcos y Sara) y el proveedor que se creó arriba.
    expect(hecho('equipo', antes)).toBe(true);
    expect(hecho('proveedor', antes)).toBe(true);
    expect(hecho('logo', antes)).toBe(false);

    // Bar Centro empieza sin género suyo. Con un producto, el paso se marca solo.
    expect(hecho('producto', antes)).toBe(false);
    losDatos(
      await api.ejecutar(rosa, 'crear_producto', {
        nombre: 'Aceite de oliva virgen extra',
        unidad_de_uso: 'l',
      }),
    );
    expect(hecho('producto', await laPuesta(rosa))).toBe(true);
  });

  it('lo de ejemplo no cuenta como hecho', async () => {
    await base.bd.query(`update estook.proveedor set es_ejemplo = true`);
    expect((await laPuesta(rosa)).pasos.find((p) => p.paso === 'proveedor')?.hecho).toBe(false);
    await base.bd.query(`update estook.proveedor set es_ejemplo = false`);
  });

  it('con «No me lo recuerdes más», se apaga', async () => {
    await api.ejecutar(rosa, 'ocultar_el_recordatorio_del_alta', {});
    expect((await laPuesta(rosa)).oculta).toBe(true);
  });

  it('quien no lleva el local no la pide: es de Ajustes', async () => {
    expect(elFallo(await api.consultar(sara, 'la_puesta_en_marcha'))).toBe('sin_permiso');
  });
});
