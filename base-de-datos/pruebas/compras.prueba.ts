import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { fechaEnElLocal, masDias } from '@estook/dominio';
import { levantarBase, type BaseDePrueba } from './entorno.ts';
import { elFallo, losDatos, montarLaApi, type ApiDePrueba } from './despachador.ts';

/**
 * M7 · proveedores y compras, con el despachador de verdad y la base de verdad.
 *
 * «**Terminado cuando.** Un pedido recorre el ciclo, el inventario cuadra, el
 *  precio nuevo ya está repercutido, y una factura con tres albaranes y una
 *  diferencia sale conciliada con esa diferencia señalada.»
 *
 * Los dos criterios están aquí, cada uno en su bloque y con sus cifras, y junto a
 * ellos lo que no puede hacer cada rol: **un cocinero recibe el camión y no ve un
 * solo importe**, y **mandar un pedido pide su propio permiso**.
 *
 * Las pruebas de un mismo bloque van en orden y comparten lo que crean: es un
 * ciclo, y cada paso parte del anterior.
 */
let base: BaseDePrueba;
let api: ApiDePrueba;

const ROSA = 'rosa@ejemplo.estook.com'; // gerente de Bar Centro
const MARCOS = 'marcos@ejemplo.estook.com'; // cocinero de Bar Centro
const SARA = 'sara@ejemplo.estook.com'; // camarera de Bar Centro
const LUIS = 'luis@ejemplo.estook.com'; // jefe de cocina de Bar Puerto, otra organización

let rosa: string;
let marcos: string;
let sara: string;
let luis: string;

const hoy = fechaEnElLocal(new Date(Date.now()), 'Europe/Madrid');
const manana = masDias(hoy, 1);

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

async function comoDuena<T>(consulta: string, parametros: unknown[] = []): Promise<T[]> {
  const { rows } = await base.bd.query<T>(consulta, parametros);
  return rows;
}

async function loQueHay(productoId: string): Promise<number> {
  const [fila] = await comoDuena<{ cantidad: string }>(
    'select cantidad::text as cantidad from estook.existencias where producto_id = $1',
    [productoId],
  );
  return fila === undefined ? 0 : Number(fila.cantidad);
}

async function unProducto(entrada: Record<string, unknown>): Promise<string> {
  return losDatos<{ productoId: string }>(await api.ejecutar(rosa, 'crear_producto', entrada))
    .productoId;
}

async function titulosDeLoQueViene(token: string, dias = 2): Promise<string[]> {
  const viene = losDatos<{ dias: { ocurrencias: { titulo: string; capa: string }[] }[] }>(
    await api.consultar(token, 'lo_que_viene', { dias: String(dias) }),
  );
  return viene.dias.flatMap((d) => d.ocurrencias.map((o) => `${o.capa}: ${o.titulo}`));
}

// ── Lo que se va creando, para los bloques de después ────────────────────────

let makro: string;
let paco: string;
let aceite: string;
let tomate: string;
let pan: string;
let merluza: string;

describe('la ficha del proveedor', () => {
  it('se da de alta con sus días de reparto, a quién se le pide y su mínimo', async () => {
    makro = losDatos<{ proveedorId: string }>(
      await api.ejecutar(rosa, 'crear_proveedor', {
        nombre: 'Makro M7',
        contacto: 'Juan',
        whatsapp: '612 34 56 78',
        correo: 'pedidos@makro.example',
        como_se_pide: 'whatsapp',
        // Todos los días, para que siempre haya un reparto mañana. Desordenados a
        // propósito: se guardan en orden, que es como se leen.
        dias_de_reparto: [7, 1, 2, 3, 4, 5, 6],
        plazo_de_entrega: 1,
        pedido_minimo_centimos: 15_000,
        portes_centimos: 1_200,
        cif: 'b-12 345 678',
      }),
    ).proveedorId;

    const ficha = losDatos<{
      proveedor: {
        diasDeReparto: number[];
        cif: string;
        whatsappNumero: string;
        pedidoMinimoCentimos: number;
      };
    }>(await api.consultar(rosa, 'un_proveedor', { proveedor_id: makro }));

    // Los días ordenados y sin repetir, el CIF como se escribe en una factura, y
    // el número como lo quiere WhatsApp.
    expect(ficha.proveedor.diasDeReparto).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(ficha.proveedor.cif).toBe('B12345678');
    expect(ficha.proveedor.whatsappNumero).toBe('34612345678');
    expect(ficha.proveedor.pedidoMinimoCentimos).toBe(15_000);
  });

  it('sus repartos salen en el Calendario, para quien lleva Inventario', async () => {
    expect(await titulosDeLoQueViene(rosa)).toContain('entrega: Reparte Makro M7');
  });

  it('un cocinero ve la ficha y no ve el mínimo ni los portes: no le llegan', async () => {
    const ficha = losDatos<{ proveedor: Record<string, unknown> }>(
      await api.consultar(marcos, 'un_proveedor', { proveedor_id: makro }),
    );
    expect(ficha.proveedor['diasDeReparto']).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect('pedidoMinimoCentimos' in ficha.proveedor).toBe(false);
    expect('portesCentimos' in ficha.proveedor).toBe(false);
  });

  it('y si intenta poner el mínimo, se le dice que no', async () => {
    const intento = await api.ejecutar(marcos, 'crear_proveedor', {
      nombre: 'Proveedor de Marcos',
      pedido_minimo_centimos: 5_000,
    });
    expect(elFallo(intento)).toBe('sin_permiso');
  });

  it('la pantalla corta de M6 guarda sin borrar lo que puso la ficha entera', async () => {
    losDatos(
      await api.ejecutar(rosa, 'cambiar_proveedor', {
        proveedor_id: makro,
        nombre: 'Makro M7',
        notas: 'Preguntar por Juan',
        activo: true,
      }),
    );
    const ficha = losDatos<{
      proveedor: { diasDeReparto: number[]; contacto: string; notas: string };
    }>(await api.consultar(rosa, 'un_proveedor', { proveedor_id: makro }));
    expect(ficha.proveedor.diasDeReparto).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(ficha.proveedor.contacto).toBe('Juan');
    expect(ficha.proveedor.notas).toBe('Preguntar por Juan');
  });

  it('desactivado, sus repartos se van del Calendario; activado, vuelven', async () => {
    losDatos(
      await api.ejecutar(rosa, 'cambiar_proveedor', {
        proveedor_id: makro,
        nombre: 'Makro M7',
        notas: null,
        activo: false,
      }),
    );
    expect(await titulosDeLoQueViene(rosa)).not.toContain('entrega: Reparte Makro M7');

    losDatos(
      await api.ejecutar(rosa, 'cambiar_proveedor', {
        proveedor_id: makro,
        nombre: 'Makro M7',
        notas: null,
        activo: true,
      }),
    );
    expect(await titulosDeLoQueViene(rosa)).toContain('entrega: Reparte Makro M7');
  });
});

// ── El primer criterio de terminado ──────────────────────────────────────────

describe('un pedido recorre el ciclo, y el inventario cuadra', () => {
  let pedidoId: string;

  it('se prepara con la sugerencia: lo que falta, en garrafas enteras y con su motivo', async () => {
    // Hay 2 l y el mínimo son 10: faltan 8 l, que en garrafas de 5 l son dos.
    aceite = await unProducto({
      nombre: 'Aceite de oliva M7',
      formato: 'Garrafa 5 l',
      factor: 5,
      unidad_de_uso: 'l',
      minimo: 10,
      proveedor_id: makro,
      precio_centimos: 4_250,
      cantidad_inicial: 2,
    });

    const sugerida = losDatos<{
      lineas: { productoId: string; sugerencia: { formatos: number; motivo: string } }[];
      totalCentimos: number;
    }>(await api.consultar(rosa, 'sugerencia_de_pedido', { proveedor_id: makro }));
    const suya = sugerida.lineas.find((l) => l.productoId === aceite);
    expect(suya?.sugerencia.formatos).toBe(2);
    expect(suya?.sugerencia.motivo).toContain('mínimo que pusiste (10 l)');

    const creado = losDatos<{ pedidoId: string; numero: number; lineas: number; llegaEl: string }>(
      await api.ejecutar(marcos, 'crear_pedido', { proveedor_id: makro, con_la_sugerencia: true }),
    );
    pedidoId = creado.pedidoId;
    expect(creado.lineas).toBe(1);
    // Sin decirle cuándo, llega en el próximo reparto al que se llega: mañana.
    expect(creado.llegaEl).toBe(manana);
  });

  it('quien ve precios ve lo que costará y si llega al mínimo; el cocinero, no', async () => {
    const deRosa = losDatos<{
      totalCentimos: number;
      minimo: { frase: string };
      texto: string;
      proveedor: { whatsapp: string };
      lineas: { precioCentimos: number }[];
    }>(await api.consultar(rosa, 'un_pedido', { pedido_id: pedidoId }));
    expect(deRosa.totalCentimos).toBe(8_500);
    expect(deRosa.lineas[0]?.precioCentimos).toBe(4_250);
    expect(deRosa.minimo.frase).toBe(
      'Faltan 65,00 € para el pedido mínimo (150,00 €): si no, son 12,00 € de portes.',
    );
    // El pedido escrito para WhatsApp: con la garrafa, a Juan, y sin un precio.
    expect(deRosa.texto).toContain('Hola, Juan.');
    expect(deRosa.texto).toContain('· 2 × Garrafa 5 l de Aceite de oliva M7');
    expect(deRosa.texto).not.toContain('€');
    expect(deRosa.proveedor.whatsapp).toBe('34612345678');

    const deMarcos = losDatos<{ lineas: Record<string, unknown>[] } & Record<string, unknown>>(
      await api.consultar(marcos, 'un_pedido', { pedido_id: pedidoId }),
    );
    expect('totalCentimos' in deMarcos).toBe(false);
    expect('minimo' in deMarcos).toBe(false);
    expect('precioCentimos' in (deMarcos.lineas[0] ?? {})).toBe(false);
  });

  it('el cocinero lo prepara, pero mandarlo pide su propio permiso', async () => {
    const intento = await api.ejecutar(marcos, 'enviar_pedido', {
      pedido_id: pedidoId,
      canal: 'whatsapp',
    });
    expect(elFallo(intento)).toBe('sin_permiso');

    const mandado = losDatos<{ llegaEl: string }>(
      await api.ejecutar(rosa, 'enviar_pedido', { pedido_id: pedidoId, canal: 'whatsapp' }),
    );
    expect(mandado.llegaEl).toBe(manana);
  });

  it('la entrega sale en el Calendario, y tapa al reparto genérico de ese día', async () => {
    const titulos = await titulosDeLoQueViene(rosa);
    expect(titulos).toContain('entrega: Llega el pedido 1 de Makro M7');
    // Hoy sigue diciendo que reparte; mañana dice qué llega, y no las dos cosas.
    expect(titulos.filter((t) => t === 'entrega: Reparte Makro M7')).toHaveLength(1);
  });

  it('el cocinero lo recibe entero, en dos toques, y no le llega un solo importe', async () => {
    const recibido = losDatos<Record<string, unknown>>(
      await api.ejecutar(marcos, 'recibir_albaran', { pedido_id: pedidoId, entero: true }),
    );
    expect(recibido['estadoDelPedido']).toBe('recibido');
    expect(recibido['incidencias']).toEqual([]);
    expect('totalCentimos' in recibido).toBe(false);
    expect('precios' in recibido).toBe(false);
  });

  it('el inventario cuadra: lo que había más lo que ha llegado, en el libro', async () => {
    // 2 l que había y dos garrafas de 5 l.
    expect(await loQueHay(aceite)).toBe(12);

    const [entrada] = await comoDuena<{ origen: string; coste: string; cantidad: string }>(
      `select origen, coste_milesimas::text as coste, cantidad::text as cantidad
         from estook.movimiento_de_stock
        where producto_id = $1 and origen = 'albaran'`,
      [aceite],
    );
    expect(entrada?.origen).toBe('albaran');
    expect(Number(entrada?.cantidad)).toBe(10);
    // Al precio que se esperaba: 42,50 € la garrafa de 5 l son 8,50 € el litro.
    expect(Number(entrada?.coste)).toBe(850_000);
  });

  it('recibirlo otra vez no deja otro albarán: ya está hecho', async () => {
    const otra = await api.ejecutar(marcos, 'recibir_albaran', {
      pedido_id: pedidoId,
      entero: true,
    });
    expect(elFallo(otra)).toBe('ya_hecho');
    expect(await loQueHay(aceite)).toBe(12);
  });

  it('y con la misma clave, la segunda vez devuelve lo de la primera sin hacer nada', async () => {
    const otro = losDatos<{ pedidoId: string }>(
      await api.ejecutar(rosa, 'crear_pedido', {
        proveedor_id: makro,
        lineas: [{ producto_id: aceite, cantidad: 1 }],
      }),
    );
    losDatos(
      await api.ejecutar(rosa, 'enviar_pedido', { pedido_id: otro.pedidoId, canal: 'telefono' }),
    );

    const clave = 'la-misma-recepcion';
    const primera = await api.ejecutar(
      rosa,
      'recibir_albaran',
      { pedido_id: otro.pedidoId, entero: true },
      clave,
    );
    const segunda = await api.ejecutar(
      rosa,
      'recibir_albaran',
      { pedido_id: otro.pedidoId, entero: true },
      clave,
    );
    expect(primera.estado).toBe('ok');
    expect(segunda.estado).toBe('repetida');
    expect(await loQueHay(aceite)).toBe(17);
  });

  it('la entrega se queda en el Calendario, tachada, diciendo que ha llegado', async () => {
    const [evento] = await comoDuena<{ titulo: string; hecho: boolean }>(
      `select titulo, hecho from estook.evento_de_calendario
        where origen = 'pedido' and origen_id = $1`,
      [pedidoId],
    );
    expect(evento).toEqual({ titulo: 'Ha llegado el pedido 1 de Makro M7', hecho: true });
  });

  it('un pedido recibido ya no se cambia, ni pidiéndoselo a la base', async () => {
    await expect(
      comoDuena(`update estook.pedido_de_compra set notas = 'otra cosa' where id = $1`, [pedidoId]),
    ).rejects.toThrow(/ya no se cambia/);
    await expect(
      comoDuena(
        `insert into estook.linea_de_pedido (pedido_id, producto_id, cantidad, factor) values ($1, $2, 1, 1)`,
        [pedidoId, aceite],
      ),
    ).rejects.toThrow(/cerrado/);
    const cambio = await api.ejecutar(rosa, 'cambiar_pedido', { pedido_id: pedidoId, lineas: [] });
    expect(elFallo(cambio)).toBe('ya_hecho');
  });
});

describe('el precio nuevo, desde el albarán', () => {
  it('llega más caro: se abre el precio nuevo, se dice cuánto ha subido y es una incidencia', async () => {
    const pedido = losDatos<{ pedidoId: string }>(
      await api.ejecutar(rosa, 'crear_pedido', {
        proveedor_id: makro,
        lineas: [{ producto_id: aceite, cantidad: 1 }],
      }),
    );
    losDatos(
      await api.ejecutar(rosa, 'enviar_pedido', { pedido_id: pedido.pedidoId, canal: 'whatsapp' }),
    );

    const recibido = losDatos<{
      estadoDelPedido: string;
      precios: { producto: string; frase: string }[];
      incidencias: { producto: string; incidencias: string[] }[];
    }>(
      await api.ejecutar(rosa, 'recibir_albaran', {
        pedido_id: pedido.pedidoId,
        lineas: [{ producto_id: aceite, formatos: 1, precio_centimos: 4_500 }],
      }),
    );

    expect(recibido.precios).toEqual([
      { producto: 'Aceite de oliva M7', frase: 'Ha subido un 5,9 %.' },
    ]);
    expect(recibido.incidencias).toEqual([
      { producto: 'Aceite de oliva M7', incidencias: ['precio'] },
    ]);
    expect(recibido.estadoDelPedido).toBe('recibido_con_incidencias');

    const [vigente] = await comoDuena<{ precio: string; origen: string }>(
      `select precio_centimos::text as precio, origen::text as origen
         from estook.precio_de_producto
        where producto_id = $1 and proveedor_id = $2 and hasta is null`,
      [aceite, makro],
    );
    expect(vigente).toEqual({ precio: '4500', origen: 'albaran' });
  });

  it('y el siguiente pedido ya espera el precio nuevo', async () => {
    const pedido = losDatos<{ pedidoId: string }>(
      await api.ejecutar(rosa, 'crear_pedido', {
        proveedor_id: makro,
        lineas: [{ producto_id: aceite, cantidad: 1 }],
      }),
    );
    const ficha = losDatos<{ lineas: { precioCentimos: number }[] }>(
      await api.consultar(rosa, 'un_pedido', { pedido_id: pedido.pedidoId }),
    );
    expect(ficha.lineas[0]?.precioCentimos).toBe(4_500);
    losDatos(
      await api.ejecutar(rosa, 'cancelar_pedido', {
        pedido_id: pedido.pedidoId,
        motivo: 'Era una prueba',
      }),
    );
  });
});

describe('recibir con cambios', () => {
  it('lo que falta, lo que no se acepta y lo que no estaba pedido, cada uno dicho', async () => {
    tomate = await unProducto({
      nombre: 'Tomate pera M7',
      formato: 'Caja 10 kg',
      factor: 10,
      unidad_de_uso: 'kg',
      proveedor_id: makro,
      precio_centimos: 1_600,
    });
    pan = await unProducto({ nombre: 'Pan M7', formato: 'Barra', factor: 1, unidad_de_uso: 'ud' });

    const pedido = losDatos<{ pedidoId: string }>(
      await api.ejecutar(rosa, 'crear_pedido', {
        proveedor_id: makro,
        lineas: [
          { producto_id: tomate, cantidad: 3 },
          { producto_id: aceite, cantidad: 1 },
        ],
      }),
    );
    losDatos(
      await api.ejecutar(rosa, 'enviar_pedido', { pedido_id: pedido.pedidoId, canal: 'correo' }),
    );

    const antesAceite = await loQueHay(aceite);
    const recibido = losDatos<{
      estadoDelPedido: string;
      incidencias: { producto: string; incidencias: string[] }[];
    }>(
      await api.ejecutar(marcos, 'recibir_albaran', {
        pedido_id: pedido.pedidoId,
        numero: 'A-2231',
        lineas: [
          { producto_id: tomate, formatos: 2 },
          { producto_id: aceite, formatos: 1, rechazada: true, nota: 'Garrafa abierta' },
          { producto_id: pan, formatos: 4 },
        ],
      }),
    );

    expect(recibido.estadoDelPedido).toBe('recibido_con_incidencias');
    expect(recibido.incidencias).toEqual(
      expect.arrayContaining([
        { producto: 'Tomate pera M7', incidencias: ['falta'] },
        { producto: 'Aceite de oliva M7', incidencias: ['rechazado'] },
        { producto: 'Pan M7', incidencias: ['no_pedido'] },
      ]),
    );
    expect(await loQueHay(tomate)).toBe(20);
    // Lo rechazado en la puerta no entra.
    expect(await loQueHay(aceite)).toBe(antesAceite);
    expect(await loQueHay(pan)).toBe(4);
  });

  it('el peso variable no se supone: sin los kilos no se recibe', async () => {
    merluza = await unProducto({
      nombre: 'Merluza M7',
      formato: 'Pieza',
      factor: 2,
      unidad_de_uso: 'kg',
      peso_variable: true,
      proveedor_id: makro,
    });
    const pedido = losDatos<{ pedidoId: string }>(
      await api.ejecutar(rosa, 'crear_pedido', {
        proveedor_id: makro,
        lineas: [{ producto_id: merluza, cantidad: 2 }],
      }),
    );

    const sinKilos = await api.ejecutar(rosa, 'recibir_albaran', {
      pedido_id: pedido.pedidoId,
      entero: true,
    });
    expect(elFallo(sinKilos)).toBe('faltan_datos');
    expect(JSON.stringify(sinKilos)).toContain('Merluza M7');

    // «5,4 kg · 67,50 €»: entra lo que pesa, y el kilo sale a 12,50 €.
    losDatos(
      await api.ejecutar(rosa, 'recibir_albaran', {
        pedido_id: pedido.pedidoId,
        lineas: [{ producto_id: merluza, cantidad: 5.4, importe_centimos: 6_750 }],
      }),
    );
    expect(await loQueHay(merluza)).toBe(5.4);
    const [entrada] = await comoDuena<{ coste: string }>(
      `select coste_milesimas::text as coste from estook.movimiento_de_stock
        where producto_id = $1 and origen = 'albaran'`,
      [merluza],
    );
    expect(Number(entrada?.coste)).toBe(1_250_000);
  });

  it('quien no ve precios no puede escribir uno al recibir', async () => {
    const intento = await api.ejecutar(marcos, 'recibir_albaran', {
      proveedor_id: makro,
      lineas: [{ producto_id: pan, formatos: 1, precio_centimos: 30 }],
    });
    expect(elFallo(intento)).toBe('sin_permiso');
  });
});

// ── El segundo criterio de terminado ─────────────────────────────────────────

describe('una factura con tres albaranes y una diferencia sale conciliada, con la diferencia señalada', () => {
  const albaranes: string[] = [];
  let facturaId: string;

  it('llegan tres albaranes de Paco, sin pedido, como llega la fruta', async () => {
    paco = losDatos<{ proveedorId: string }>(
      await api.ejecutar(rosa, 'crear_proveedor', { nombre: 'Frutas Paco M7', dias_de_pago: 30 }),
    ).proveedorId;

    const lineas = [
      [{ producto_id: tomate, formatos: 2, precio_centimos: 1_500 }],
      [
        { producto_id: tomate, formatos: 1, precio_centimos: 1_500 },
        { producto_id: pan, formatos: 10, precio_centimos: 30 },
      ],
      [{ producto_id: tomate, formatos: 3, precio_centimos: 1_500 }],
    ];
    for (const [i, estas] of lineas.entries()) {
      const recibido = losDatos<{ albaranId: string; totalCentimos: number }>(
        await api.ejecutar(rosa, 'recibir_albaran', {
          proveedor_id: paco,
          numero: `P-${i + 1}`,
          lineas: estas,
        }),
      );
      albaranes.push(recibido.albaranId);
    }

    const sinFactura = losDatos<{ albaranes: { id: string }[] }>(
      await api.consultar(rosa, 'para_conciliar', { proveedor_id: paco }),
    );
    expect(sinFactura.albaranes.map((a) => a.id)).toEqual(albaranes);
  });

  it('la factura dice 6,50 € más de lo que suman: conciliada con esa diferencia', async () => {
    // 30,00 + 18,00 + 45,00 = 93,00 €. La factura dice 99,50 €.
    const conciliada = losDatos<{
      estado: string;
      diferenciaCentimos: number;
      frase: string;
      facturaId: string;
    }>(
      await api.ejecutar(rosa, 'registrar_factura', {
        proveedor_id: paco,
        numero: 'F-100',
        fecha: hoy,
        base_centimos: 9_950,
        total_centimos: 10_945,
        albaranes,
      }),
    );
    facturaId = conciliada.facturaId;

    expect(conciliada.estado).toBe('con_diferencia');
    expect(conciliada.diferenciaCentimos).toBe(650);
    expect(conciliada.frase).toBe(
      'La factura dice 99,50 € y los 3 albaranes suman 93,00 €: te cobran 6,50 € de más.',
    );

    const [factura] = await comoDuena<{ vence_el: string; albaranes: number }>(
      `select to_char(vence_el, 'YYYY-MM-DD') as vence_el,
              (select count(*)::int from estook.albaran where factura_id = f.id) as albaranes
         from estook.factura_de_compra f where id = $1`,
      [facturaId],
    );
    expect(factura?.albaranes).toBe(3);
    // A treinta días, que es como paga a Paco.
    expect(factura?.vence_el).toBe(masDias(hoy, 30));
  });

  it('se lee igual al volver a ella', async () => {
    const leida = losDatos<{
      factura: { estado: string; diferenciaCentimos: number };
      frase: string;
      albaranes: unknown[];
    }>(await api.consultar(rosa, 'una_factura', { factura_id: facturaId }));
    expect(leida.factura.estado).toBe('con_diferencia');
    expect(leida.factura.diferenciaCentimos).toBe(650);
    expect(leida.albaranes).toHaveLength(3);
    expect(leida.frase).toContain('te cobran 6,50 € de más');
  });

  it('la misma factura dos veces no se apunta dos veces', async () => {
    const otra = await api.ejecutar(rosa, 'registrar_factura', {
      proveedor_id: paco,
      numero: 'F-100',
      fecha: hoy,
      base_centimos: 9_950,
    });
    expect(elFallo(otra)).toBe('ya_hecho');
  });

  it('ni la factura conciliada ni sus albaranes se tocan, ni pidiéndoselo a la base', async () => {
    await expect(
      comoDuena(`update estook.factura_de_compra set notas = 'otra' where id = $1`, [facturaId]),
    ).rejects.toThrow(/ya no se cambia/);
    await expect(
      comoDuena(`update estook.albaran set numero = 'X' where id = $1`, [albaranes[0]]),
    ).rejects.toThrow(/no se cambia/);
    await expect(
      comoDuena(`update estook.albaran set factura_id = null where id = $1`, [albaranes[0]]),
    ).resolves.toBeDefined();
    // Quitarle la factura se puede —es lo que pasa si se borra una de ejemplo—;
    // ponerle otra, no. Se deja como estaba.
    await comoDuena(`update estook.albaran set factura_id = $1 where id = $2`, [
      facturaId,
      albaranes[0],
    ]);
  });

  it('una que cuadra al céntimo sale conciliada, sin más', async () => {
    const otro = losDatos<{ albaranId: string }>(
      await api.ejecutar(rosa, 'recibir_albaran', {
        proveedor_id: paco,
        lineas: [{ producto_id: tomate, formatos: 1, precio_centimos: 1_500 }],
      }),
    );
    const exacta = losDatos<{ estado: string; diferenciaCentimos: number }>(
      await api.ejecutar(rosa, 'registrar_factura', {
        proveedor_id: paco,
        numero: 'F-101',
        fecha: hoy,
        base_centimos: 1_500,
        albaranes: [otro.albaranId],
      }),
    );
    expect(exacta).toMatchObject({ estado: 'conciliada', diferenciaCentimos: 0 });
  });

  it('un albarán sin valorar recibe su precio de la factura, y el precio se abre desde ella', async () => {
    // Lo recibe el cocinero, que no ve precios: entra sin valorar.
    const sinValorar = losDatos<{ albaranId: string }>(
      await api.ejecutar(marcos, 'recibir_albaran', {
        proveedor_id: paco,
        lineas: [{ producto_id: pan, formatos: 5 }],
      }),
    );
    const albaran = losDatos<{ lineas: { id: string; importeCentimos: number | null }[] }>(
      await api.consultar(rosa, 'un_albaran', { albaran_id: sinValorar.albaranId }),
    );
    expect(albaran.lineas[0]?.importeCentimos).toBeNull();

    const conciliada = losDatos<{ estado: string; precios: { producto: string }[] }>(
      await api.ejecutar(rosa, 'registrar_factura', {
        proveedor_id: paco,
        numero: 'F-102',
        fecha: hoy,
        base_centimos: 250,
        albaranes: [sinValorar.albaranId],
        correcciones: [{ linea_de_albaran_id: albaran.lineas[0]?.id, importe_centimos: 250 }],
      }),
    );
    expect(conciliada.estado).toBe('conciliada');

    const [vigente] = await comoDuena<{ precio: string; origen: string }>(
      `select precio_centimos::text as precio, origen::text as origen from estook.precio_de_producto
        where producto_id = $1 and proveedor_id = $2 and hasta is null`,
      [pan, paco],
    );
    // 2,50 € por cinco barras: 0,50 € la barra, confirmado por la factura.
    expect(vigente).toEqual({ precio: '50', origen: 'factura' });
  });

  it('el cocinero no ve facturas: ni la lista le llega', async () => {
    expect(elFallo(await api.consultar(marcos, 'mis_facturas'))).toBe('sin_permiso');
  });
});

describe('devolver, y el abono que lo concilia', () => {
  it('lo devuelto sale del libro con su motivo, y el abono cuadra con la devolución', async () => {
    const antes = await loQueHay(aceite);
    const devuelto = losDatos<{ albaranId: string }>(
      await api.ejecutar(rosa, 'devolver_al_proveedor', {
        proveedor_id: makro,
        motivo: 'Llegó con el precinto roto',
        lineas: [{ producto_id: aceite, formatos: 1, importe_centimos: 4_500 }],
      }),
    );
    expect(await loQueHay(aceite)).toBe(antes - 5);

    const [salida] = await comoDuena<{ tipo: string; motivo: string; origen: string }>(
      `select tipo::text as tipo, motivo, origen from estook.movimiento_de_stock
        where producto_id = $1 and origen = 'devolucion'`,
      [aceite],
    );
    expect(salida).toEqual({
      tipo: 'salida',
      motivo: 'Devuelto a Makro M7: Llegó con el precinto roto',
      origen: 'devolucion',
    });

    const abono = losDatos<{ estado: string }>(
      await api.ejecutar(rosa, 'registrar_factura', {
        proveedor_id: makro,
        tipo: 'abono',
        numero: 'AB-1',
        fecha: hoy,
        base_centimos: 4_500,
        albaranes: [devuelto.albaranId],
      }),
    );
    expect(abono.estado).toBe('conciliada');
  });
});

describe('lo pactado, y quién te lo deja mejor', () => {
  it('te cobran por encima de lo pactado: se dice al recibir, y sale en la comparativa', async () => {
    losDatos(
      await api.ejecutar(rosa, 'pactar_precio', {
        producto_id: aceite,
        proveedor_id: makro,
        precio_centimos: 4_000,
        hasta: masDias(hoy, 90),
      }),
    );

    const recibido = losDatos<{ avisos: string[] }>(
      await api.ejecutar(rosa, 'recibir_albaran', {
        proveedor_id: makro,
        lineas: [{ producto_id: aceite, formatos: 1, precio_centimos: 4_500 }],
      }),
    );
    expect(recibido.avisos).toEqual([
      'Makro M7 te ha cobrado Aceite de oliva M7 a 45,00 € y teníais pactado 40,00 €.',
    ]);

    const comparativa = losDatos<{ pactados: { producto: string; porEncima: boolean }[] }>(
      await api.consultar(rosa, 'comparar_precios'),
    );
    expect(comparativa.pactados).toEqual([
      expect.objectContaining({ producto: 'Aceite de oliva M7', porEncima: true }),
    ]);
  });

  it('un pedido nuevo espera lo pactado, no lo último que se cobró', async () => {
    const pedido = losDatos<{ pedidoId: string }>(
      await api.ejecutar(rosa, 'crear_pedido', {
        proveedor_id: makro,
        lineas: [{ producto_id: aceite, cantidad: 1 }],
      }),
    );
    const ficha = losDatos<{ lineas: { precioCentimos: number }[] }>(
      await api.consultar(rosa, 'un_pedido', { pedido_id: pedido.pedidoId }),
    );
    expect(ficha.lineas[0]?.precioCentimos).toBe(4_000);
    losDatos(
      await api.ejecutar(rosa, 'cancelar_pedido', { pedido_id: pedido.pedidoId, motivo: 'Prueba' }),
    );
  });

  it('con dos proveedores para lo mismo, se dice quién lo deja mejor', async () => {
    losDatos(
      await api.ejecutar(rosa, 'poner_precio', {
        producto_id: aceite,
        proveedor_id: paco,
        precio_centimos: 4_000,
      }),
    );
    const comparativa = losDatos<{
      comparaciones: { producto: string; comparacion: { mejor: { proveedor: string } } }[];
    }>(await api.consultar(rosa, 'comparar_precios'));
    const delAceite = comparativa.comparaciones.find((c) => c.producto === 'Aceite de oliva M7');
    expect(delAceite?.comparacion.mejor.proveedor).toBe('Frutas Paco M7');
  });
});

describe('quién ve qué', () => {
  it('una camarera no lleva Inventario: ni pedidos ni entregas', async () => {
    expect(elFallo(await api.consultar(sara, 'mis_pedidos'))).toBe('sin_permiso');
    expect((await titulosDeLoQueViene(sara)).filter((t) => t.startsWith('entrega'))).toEqual([]);
  });

  it('un pedido de otro local no existe para quien no es de allí', async () => {
    const [unoDeRosa] = await comoDuena<{ id: string }>(
      `select id from estook.pedido_de_compra where proveedor_id = $1 limit 1`,
      [makro],
    );
    expect(
      elFallo(await api.consultar(luis, 'un_pedido', { pedido_id: unoDeRosa?.id ?? '' })),
    ).toBe('no_existe');
  });

  it('el cocinero ve la lista de pedidos sin un total', async () => {
    const lista = losDatos<{ pedidos: Record<string, unknown>[] }>(
      await api.consultar(marcos, 'mis_pedidos', { vista: 'todos' }),
    );
    expect(lista.pedidos.length).toBeGreaterThan(0);
    expect(lista.pedidos.some((p) => 'totalCentimos' in p)).toBe(false);
  });
});

describe('el Calendario de todos', () => {
  it('una caducidad apuntada al recibir sale en «Lo que viene»', async () => {
    losDatos(
      await api.ejecutar(rosa, 'recibir_albaran', {
        proveedor_id: paco,
        lineas: [
          {
            producto_id: tomate,
            formatos: 1,
            precio_centimos: 1_500,
            lote: 'L-77',
            caduca_el: manana,
          },
        ],
      }),
    );
    expect(await titulosDeLoQueViene(rosa)).toContain('caducidad: Caduca Tomate pera M7');
  });

  it('y una entrada a mano con fecha, también: M6 no la publicaba porque no había dónde', async () => {
    losDatos(
      await api.ejecutar(rosa, 'apuntar_entrada', {
        producto_id: pan,
        cuanto: 2,
        como: 'formatos',
        caduca_el: hoy,
      }),
    );
    expect(await titulosDeLoQueViene(rosa)).toContain('caducidad: Caduca Pan M7');
  });

  it('un aviso para la cocina lo ve la cocina, y no la sala: lo filtra la base', async () => {
    const centro = await base.localPorCodigo('bar-centro');
    const rosaId = await base.personaPorCorreo(ROSA);
    await base.comoPersona(rosaId, () =>
      base.bd.query(
        `insert into estook.evento_de_calendario
           (local_id, capa, origen, origen_id, dia, titulo, roles, publicado_por)
         values ($1, 'aviso', 'aviso', 'inspeccion', $2::date, 'Inspección de Sanidad', '{cocinero,jefe_de_cocina}', $3)`,
        [centro, manana, rosaId],
      ),
    );

    expect(await titulosDeLoQueViene(marcos)).toContain('aviso: Inspección de Sanidad');
    expect(await titulosDeLoQueViene(sara)).not.toContain('aviso: Inspección de Sanidad');
    // Quien lo puso, y quien edita el Calendario, lo ve siempre.
    expect(await titulosDeLoQueViene(rosa)).toContain('aviso: Inspección de Sanidad');
  });

  it('un aviso con un rol que no existe no se guarda', async () => {
    const centro = await base.localPorCodigo('bar-centro');
    await expect(
      comoDuena(
        `insert into estook.evento_de_calendario (local_id, capa, origen, origen_id, dia, titulo, roles)
         values ($1, 'aviso', 'aviso', 'raro', current_date, 'Raro', '{cocinillas}')`,
        [centro],
      ),
    ).rejects.toThrow(/rol que no existe/);
  });

  it('una camarera no puede publicar una entrega en el Calendario', async () => {
    const centro = await base.localPorCodigo('bar-centro');
    const saraId = await base.personaPorCorreo(SARA);
    await expect(
      base.comoPersona(saraId, () =>
        base.bd.query(
          `insert into estook.evento_de_calendario (local_id, capa, origen, origen_id, dia, titulo)
           values ($1, 'entrega', 'pedido', 'falso', current_date, 'Falso')`,
          [centro],
        ),
      ),
    ).rejects.toThrow();
  });
});

describe('lo de hoy', () => {
  it('a Makro toca pedirle hoy para que llegue mañana', async () => {
    const hoyEnCompras = losDatos<{ tocaPedir: { proveedor: string; llegaCuando: string }[] }>(
      await api.consultar(rosa, 'compras_de_hoy'),
    );
    expect(hoyEnCompras.tocaPedir).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ proveedor: 'Makro M7', llegaCuando: 'mañana' }),
      ]),
    );
  });

  it('la lista de proveedores dice cuándo llega lo que se pide y si toca hoy', async () => {
    const lista = losDatos<{
      proveedores: { nombre: string; llegaCuando: string | null; tocaPedirHoy: boolean }[];
    }>(await api.consultar(rosa, 'mis_proveedores'));
    expect(lista.proveedores.find((p) => p.nombre === 'Makro M7')).toMatchObject({
      llegaCuando: 'mañana',
      tocaPedirHoy: true,
    });
    // Paco no tiene días de reparto: no se inventa cuándo llega.
    expect(lista.proveedores.find((p) => p.nombre === 'Frutas Paco M7')?.llegaCuando).toBeNull();
  });
});
