import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { correoEnMemoria } from '../../servidor/infraestructura/correo.ts';
import { almacenEnMemoria } from '../../servidor/infraestructura/almacen.ts';
import { levantarBase, type BaseDePrueba } from './entorno.ts';
import { elFallo, losDatos, montarLaApi, type ApiDePrueba } from './despachador.ts';

/**
 * R · la campana (0050 · decisión 0052), con el despachador y la base de verdad.
 *
 *   · Lo que hace el equipo le llega **a quien está por encima**, uno por cosa y
 *     persona: si lo sigue tocando, no suena otra vez; si lo toca otro, se suma.
 *   · Pedir ayuda con un pedido: le llega al invitado (también por correo), avisa
 *     con «Listo», y lo manda quien se lo pidió.
 *   · Una merma cara, una subida de precio, un albarán con incidencias, la carta y
 *     el Tablón, cada uno a quien le toca.
 *   · Cada uno elige lo suyo, y nadie lee ni escribe los avisos de otro.
 *
 * En Bar Centro: Rosa es la gerente, Marcos cocina y Sara hace sala. Pablo, gerente
 * de Casa Lola, entra aquí como **jefe de cocina** para tener a alguien entre Rosa y
 * Marcos: es lo que hace falta para ver «a quien está por encima».
 */
let base: BaseDePrueba;
let api: ApiDePrueba;
const correo = correoEnMemoria();
const almacen = almacenEnMemoria();

const ROSA = 'rosa@ejemplo.estook.com';
const MARCOS = 'marcos@ejemplo.estook.com';
const SARA = 'sara@ejemplo.estook.com';
const PABLO = 'pablo@ejemplo.estook.com';

let rosa: string;
let marcos: string;
let sara: string;
let pablo: string;
let barCentro: string;

let proveedor: string;
let otroProveedor: string;
let aceite: string;
let pedidoId: string;

interface Aviso {
  id: string;
  tipo: string;
  titulo: string;
  detalle: string | null;
  ir: string | null;
  leido: boolean;
}

async function comoDuena<T>(consulta: string, parametros: unknown[] = []): Promise<T[]> {
  const { rows } = await base.bd.query<T>(consulta, parametros);
  return rows;
}

async function susAvisos(token: string): Promise<{ sinLeer: number; avisos: Aviso[] }> {
  return losDatos(await api.consultar(token, 'mis_avisos'));
}

async function sinLeer(token: string): Promise<number> {
  return losDatos<{ sinLeer: number }>(await api.consultar(token, 'cuantos_avisos')).sinLeer;
}

async function elDe(token: string, tipo: string): Promise<Aviso | undefined> {
  return (await susAvisos(token)).avisos.find((a) => a.tipo === tipo);
}

/** Los mira todos, para que la prueba siguiente cuente solo lo suyo. */
async function leerTodo(token: string): Promise<void> {
  losDatos(await api.ejecutar(token, 'leer_avisos', {}));
}

beforeAll(async () => {
  base = await levantarBase();
  api = montarLaApi(base.bd, { correo, almacen });

  // Pablo, jefe de cocina también en Bar Centro.
  await comoDuena(`
    insert into estook.membresia (persona_id, organizacion_id, local_id, alcance, rol)
    select p.id, o.id, l.id, 'local', 'jefe_de_cocina'
      from estook.persona p, estook.organizacion o
      join estook.local l on l.organizacion_id = o.id and l.codigo = 'bar-centro'
     where p.correo = '${PABLO}' and o.codigo = 'bar-centro'
  `);
  const [local] = await comoDuena<{ id: string; organizacion_id: string }>(
    `select id, organizacion_id from estook.local where codigo = 'bar-centro'`,
  );
  barCentro = local?.id ?? '';

  rosa = await api.entrar(ROSA);
  marcos = await api.entrar(MARCOS);
  sara = await api.entrar(SARA);
  pablo = await api.entrar(PABLO);
  losDatos(
    await api.ejecutar(pablo, 'cambiar_de_contexto', {
      organizacion_id: local?.organizacion_id,
      local_id: barCentro,
    }),
  );

  proveedor = losDatos<{ proveedorId: string }>(
    await api.ejecutar(rosa, 'crear_proveedor', {
      nombre: 'Frutas Avisos',
      dias_de_reparto: [1, 2, 3, 4, 5, 6, 7],
      plazo_de_entrega: 1,
    }),
  ).proveedorId;
  otroProveedor = losDatos<{ proveedorId: string }>(
    await api.ejecutar(rosa, 'crear_proveedor', { nombre: 'Distribuciones Avisos' }),
  ).proveedorId;
  aceite = losDatos<{ productoId: string }>(
    await api.ejecutar(rosa, 'crear_producto', {
      nombre: 'Aceite de avisos',
      formato: 'Garrafa 5 l',
      factor: 5,
      unidad_de_uso: 'l',
      minimo: 10,
      proveedor_id: proveedor,
      precio_centimos: 4_000,
      cantidad_inicial: 10,
    }),
  ).productoId;

  // Lo que ha dejado montar todo esto no es de lo que se prueba.
  for (const token of [rosa, marcos, sara, pablo]) await leerTodo(token);
}, 120_000);

afterAll(async () => {
  await base.cerrar();
});

// ── Lo que hace el equipo, a quien está por encima ───────────────────────────

describe('un pedido empezado', () => {
  it('le llega a quien lo puede mandar y está por encima: el jefe de cocina y la gerente', async () => {
    pedidoId = losDatos<{ pedidoId: string }>(
      await api.ejecutar(marcos, 'crear_pedido', {
        proveedor_id: proveedor,
        lineas: [{ producto_id: aceite, cantidad: 1 }],
      }),
    ).pedidoId;

    const deRosa = await elDe(rosa, 'pedido.empezado');
    expect(deRosa?.titulo).toBe('Marcos ha empezado un pedido a Frutas Avisos');
    expect(deRosa?.ir).toBe(`/almacen/compras/pedidos?pedido=${pedidoId}`);
    expect(deRosa?.leido).toBe(false);
    expect(await sinLeer(rosa)).toBe(1);
    expect(await sinLeer(pablo)).toBe(1);
  });

  it('a quien lo hace no le avisa, ni a la sala, que no manda pedidos', async () => {
    expect(await sinLeer(marcos)).toBe(0);
    expect(await sinLeer(sara)).toBe(0);
  });

  it('si lo sigue tocando, no llega otro: uno por cosa y persona', async () => {
    losDatos(
      await api.ejecutar(marcos, 'cambiar_pedido', {
        pedido_id: pedidoId,
        lineas: [{ producto_id: aceite, cantidad: 2 }],
      }),
    );
    const deRosa = (await susAvisos(rosa)).avisos.filter((a) => a.tipo === 'pedido.empezado');
    expect(deRosa).toHaveLength(1);
    expect(await sinLeer(rosa)).toBe(1);
  });

  it('si lo rellena otro, su nombre se suma sin volver a sonar', async () => {
    await leerTodo(rosa);
    losDatos(
      await api.ejecutar(pablo, 'cambiar_pedido', {
        pedido_id: pedidoId,
        lineas: [{ producto_id: aceite, cantidad: 3 }],
      }),
    );
    const deRosa = await elDe(rosa, 'pedido.empezado');
    expect(deRosa?.titulo).toBe('Marcos y Pablo están preparando un pedido a Frutas Avisos');
    expect(deRosa?.leido).toBe(true);
    expect(await sinLeer(rosa)).toBe(0);
  });
});

// ── Pedir ayuda con un pedido ────────────────────────────────────────────────

describe('pedir ayuda con un pedido', () => {
  let delRosa: string;

  it('se le pide a quien lleva el almacén; a la sala, no', async () => {
    delRosa = losDatos<{ pedidoId: string }>(
      await api.ejecutar(rosa, 'crear_pedido', { proveedor_id: proveedor, lineas: [] }),
    ).pedidoId;

    const ayuda = losDatos<{ puedePedirAyuda: boolean; aQuien: { nombre: string }[] }>(
      await api.consultar(rosa, 'ayuda_con_el_pedido', { pedido_id: delRosa }),
    );
    expect(ayuda.puedePedirAyuda).toBe(true);
    const nombres = ayuda.aQuien.map((p) => p.nombre);
    expect(nombres).toContain('Marcos');
    expect(nombres).toContain('Pablo');
    expect(nombres).not.toContain('Sara');
    expect(nombres).not.toContain('Rosa');

    const [deSara] = await comoDuena<{ id: string }>(
      `select id from estook.persona where correo = $1`,
      [SARA],
    );
    const aSara = await api.ejecutar(rosa, 'pedir_ayuda_con_el_pedido', {
      pedido_id: delRosa,
      personas: [deSara?.id],
    });
    expect(elFallo(aSara)).toBe('faltan_datos');
  });

  it('el cocinero no puede pedir ayuda: no manda pedidos', async () => {
    const [deSara] = await comoDuena<{ id: string }>(
      `select id from estook.persona where correo = $1`,
      [SARA],
    );
    const intento = await api.ejecutar(marcos, 'pedir_ayuda_con_el_pedido', {
      pedido_id: delRosa,
      personas: [deSara?.id],
    });
    expect(elFallo(intento)).toBe('sin_permiso');
  });

  it('al invitado le llega a la campana y al correo, al momento', async () => {
    const [deMarcos] = await comoDuena<{ id: string }>(
      `select id from estook.persona where correo = $1`,
      [MARCOS],
    );
    const antes = correo.mandados.length;
    losDatos(
      await api.ejecutar(rosa, 'pedir_ayuda_con_el_pedido', {
        pedido_id: delRosa,
        personas: [deMarcos?.id],
      }),
    );

    const suyo = await elDe(marcos, 'pedido.invitacion');
    expect(suyo?.titulo).toBe('Rosa te pide que rellenes el pedido a Frutas Avisos');
    expect(suyo?.leido).toBe(false);

    const mandados = correo.mandados.slice(antes);
    expect(mandados.map((c) => c.para)).toEqual([MARCOS]);
    expect(mandados[0]?.asunto).toBe('Rosa te pide que rellenes el pedido a Frutas Avisos');
    expect(mandados[0]?.texto).toContain(`/almacen/compras/pedidos?pedido=${delRosa}`);

    const [fila] = await comoDuena<{ correo: string }>(
      `select correo from estook.aviso where tipo = 'pedido.invitacion' and clave = $1`,
      [delRosa],
    );
    expect(fila?.correo).toBe('mandado');
  });

  it('el invitado sabe quién se lo ha pedido, y no puede pedir ayuda él', async () => {
    const ayuda = losDatos<{ puedePedirAyuda: boolean; aMi: { quien: string } | null }>(
      await api.consultar(marcos, 'ayuda_con_el_pedido', { pedido_id: delRosa }),
    );
    expect(ayuda.aMi).toEqual({ quien: 'Rosa', terminada: false });
    expect(ayuda.puedePedirAyuda).toBe(false);
  });

  it('«Listo»: a quien se lo pidió le llega que ya está, y su invitación se da por vista', async () => {
    await leerTodo(rosa);
    losDatos(
      await api.ejecutar(marcos, 'cambiar_pedido', {
        pedido_id: delRosa,
        lineas: [{ producto_id: aceite, cantidad: 1 }],
      }),
    );
    losDatos(await api.ejecutar(marcos, 'he_terminado_el_pedido', { pedido_id: delRosa }));

    const deRosa = await elDe(rosa, 'pedido.listo');
    expect(deRosa?.titulo).toBe('Marcos ha terminado el pedido a Frutas Avisos');
    expect((await elDe(marcos, 'pedido.invitacion'))?.leido).toBe(true);

    const ayuda = losDatos<{ invitados: { nombre: string; terminada: boolean }[] }>(
      await api.consultar(rosa, 'ayuda_con_el_pedido', { pedido_id: delRosa }),
    );
    expect(ayuda.invitados).toEqual([
      expect.objectContaining({ nombre: 'Marcos', terminada: true }),
    ]);
  });

  it('quien no fue invitado no puede decir «Listo»', async () => {
    const intento = await api.ejecutar(pablo, 'he_terminado_el_pedido', { pedido_id: delRosa });
    expect(elFallo(intento)).toBe('sin_permiso');
  });

  it('mandado, le llega a quien ayudó, y lo del borrador queda resuelto', async () => {
    await leerTodo(marcos);
    losDatos(await api.ejecutar(rosa, 'enviar_pedido', { pedido_id: delRosa, canal: 'whatsapp' }));

    const deMarcos = await elDe(marcos, 'pedido.mandado');
    expect(deMarcos?.titulo).toMatch(/^Rosa ha mandado el pedido \d+ a Frutas Avisos$/);
    expect(deMarcos?.detalle).toMatch(/^Llega el /);
    // Sin importe: le llega a quien no ve precios.
    expect(deMarcos?.detalle).not.toContain('€');
    expect((await elDe(rosa, 'pedido.listo'))?.leido).toBe(true);
  });
});

// ── Lo que cuesta dinero ─────────────────────────────────────────────────────

describe('una merma cara', () => {
  it('desde 20 €, a quien está por encima de quien la apunta', async () => {
    // 1 l de aceite a 8 €/l son 8 €: no avisa.
    losDatos(
      await api.ejecutar(marcos, 'apuntar_merma', {
        producto_id: aceite,
        cuanto: 1,
        motivo: 'caducado',
      }),
    );
    expect((await susAvisos(rosa)).avisos.some((a) => a.tipo === 'merma.grande')).toBe(false);

    // 3 l son 24 €: sí.
    losDatos(
      await api.ejecutar(marcos, 'apuntar_merma', {
        producto_id: aceite,
        cuanto: 3,
        motivo: 'caducado',
      }),
    );
    const deRosa = await elDe(rosa, 'merma.grande');
    expect(deRosa?.titulo).toBe('Marcos ha tirado 3 l de Aceite de avisos');
    expect(deRosa?.detalle).toBe('24,00 € · Ha caducado');
    expect(deRosa?.ir).toBe('/almacen/mermas');
    expect((await susAvisos(pablo)).avisos.some((a) => a.tipo === 'merma.grande')).toBe(true);
  });
});

describe('una subida de precio', () => {
  it('desde el 5 %, sin IVA y por unidad, a quien compra y no la ha hecho', async () => {
    await leerTodo(pablo);
    // El otro proveedor lo deja más barato: se nombra.
    losDatos(
      await api.ejecutar(rosa, 'poner_precio', {
        producto_id: aceite,
        proveedor_id: otroProveedor,
        precio_centimos: 3_900,
      }),
    );
    losDatos(
      await api.ejecutar(rosa, 'poner_precio', {
        producto_id: aceite,
        proveedor_id: proveedor,
        precio_centimos: 4_500,
      }),
    );

    const dePablo = await elDe(pablo, 'precio.subida');
    expect(dePablo?.titulo).toBe('Frutas Avisos sube Aceite de avisos un 13 %');
    expect(dePablo?.detalle).toContain('Ahora 9,00 €/l; antes 8,00 €/l.');
    expect(dePablo?.detalle).toContain('Distribuciones Avisos te lo deja a 7,80 €/l');
    expect(dePablo?.ir).toBe(`/almacen/compras/precios?producto=${aceite}`);
    // Quien la ha puesto ya lo sabe.
    expect((await susAvisos(rosa)).avisos.some((a) => a.tipo === 'precio.subida')).toBe(false);
    // Y el cocinero, que no ve precios, no se entera.
    expect((await susAvisos(marcos)).avisos.some((a) => a.tipo === 'precio.subida')).toBe(false);
  });

  it('por debajo del umbral que ponga el local, no avisa', async () => {
    losDatos(await api.ejecutar(rosa, 'guardar_la_subida_que_avisa', { porcentaje: 20 }));
    await leerTodo(pablo);
    losDatos(
      await api.ejecutar(rosa, 'poner_precio', {
        producto_id: aceite,
        proveedor_id: proveedor,
        precio_centimos: 5_000,
      }),
    );
    expect(await sinLeer(pablo)).toBe(0);

    // El jefe de cocina manda pedidos pero no lleva los ajustes del local.
    expect(
      elFallo(await api.ejecutar(pablo, 'guardar_la_subida_que_avisa', { porcentaje: 3 })),
    ).toBe('sin_permiso');
  });
});

describe('un albarán con incidencias', () => {
  it('a quien reclama, que es quien manda los pedidos', async () => {
    await leerTodo(rosa);
    const pedido = losDatos<{ pedidoId: string }>(
      await api.ejecutar(rosa, 'crear_pedido', {
        proveedor_id: proveedor,
        lineas: [{ producto_id: aceite, cantidad: 2 }],
      }),
    ).pedidoId;
    losDatos(await api.ejecutar(rosa, 'enviar_pedido', { pedido_id: pedido, canal: 'telefono' }));
    // Llega una garrafa de dos: falta una.
    losDatos(
      await api.ejecutar(marcos, 'recibir_albaran', {
        pedido_id: pedido,
        lineas: [{ producto_id: aceite, formatos: 1 }],
      }),
    );

    const deRosa = await elDe(rosa, 'albaran.incidencias');
    expect(deRosa?.titulo).toBe('El albarán de Frutas Avisos llegó con 1 incidencia');
    expect(deRosa?.detalle).toBe('Lo recibió Marcos. Míralo para reclamarlo.');
    expect(deRosa?.ir).toMatch(/^\/almacen\/compras\/albaranes\?albaran=/);
  });
});

// ── Para todo el equipo ──────────────────────────────────────────────────────

describe('el Tablón', () => {
  let nota: string;

  it('una nota para la cocina le llega a la cocina y a quien lleva el local, no a la sala', async () => {
    for (const token of [rosa, marcos, sara, pablo]) await leerTodo(token);
    nota = losDatos<{ notaId: string }>(
      await api.ejecutar(sara, 'escribir_en_el_tablon', {
        texto: 'Viene el técnico de la cámara a las 12',
        zona: 'cocina',
        hora: '12:00',
      }),
    ).notaId;

    const deMarcos = await elDe(marcos, 'tablon.nota');
    expect(deMarcos?.titulo).toBe('Sara en el Tablón, para hoy a las 12:00');
    expect(deMarcos?.detalle).toBe('Viene el técnico de la cámara a las 12');
    expect(await sinLeer(rosa)).toBe(1);
    // Ni a quien la escribe.
    expect(await sinLeer(sara)).toBe(0);

    losDatos(
      await api.ejecutar(rosa, 'escribir_en_el_tablon', {
        texto: 'Mesa de 12 a las 21',
        zona: 'sala',
      }),
    );
    expect((await susAvisos(marcos)).avisos.filter((a) => a.tipo === 'tablon.nota')).toHaveLength(
      1,
    );
    expect(await sinLeer(sara)).toBe(1);
  });

  it('leída en el Tablón, leída en la campana', async () => {
    losDatos(await api.ejecutar(marcos, 'marcar_nota_leida', { nota_id: nota }));
    expect((await elDe(marcos, 'tablon.nota'))?.leido).toBe(true);
  });

  it('quitada la nota, su aviso se va de todas las campanas', async () => {
    losDatos(await api.ejecutar(sara, 'quitar_nota', { nota_id: nota }));
    const [quedan] = await comoDuena<{ n: number }>(
      `select count(*)::int as n from estook.aviso where tipo = 'tablon.nota' and clave = $1`,
      [nota],
    );
    expect(quedan?.n).toBe(0);
  });
});

describe('la carta nueva', () => {
  it('le llega a quien ve la Carta: la sala se entera de qué enseña el QR', async () => {
    await leerTodo(sara);
    const JPG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4, 5, 6, 7, 8]).toString('base64');
    const pagina = losDatos<{ clave: string }>(
      await api.ejecutar(rosa, 'subir_pagina_de_la_carta', {
        subida: Date.now(),
        pagina: 1,
        tipo: 'image/jpeg',
        contenido: JPG,
      }),
    ).clave;
    losDatos(await api.ejecutar(rosa, 'publicar_la_carta', { paginas: [pagina] }));

    const deSara = await elDe(sara, 'carta.publicada');
    expect(deSara?.titulo).toBe('Hay carta nueva');
    expect(deSara?.detalle).toBe('La ha publicado Rosa: 1 página. Es la que enseña el QR.');
  });
});

// ── Cada uno elige lo suyo ───────────────────────────────────────────────────

describe('lo que cada uno elige', () => {
  it('solo se enseña lo que te puede llegar', async () => {
    const deMarcos = losDatos<{ avisos: { tipo: string }[]; subidaQueAvisa: number | null }>(
      await api.consultar(marcos, 'mis_avisos_elegidos'),
    );
    const tipos = deMarcos.avisos.map((a) => a.tipo);
    expect(tipos).toContain('pedido.invitacion');
    expect(tipos).toContain('tablon.nota');
    expect(tipos).not.toContain('precio.subida');
    expect(tipos).not.toContain('pedido.empezado');
    expect(deMarcos.subidaQueAvisa).toBeNull();

    const deRosa = losDatos<{ subidaQueAvisa: number | null }>(
      await api.consultar(rosa, 'mis_avisos_elegidos'),
    );
    expect(deRosa.subidaQueAvisa).toBe(20);
  });

  it('quien apaga un aviso no lo recibe, y el correo no va sin la campana', async () => {
    const guardado = losDatos<{ enLaApp: boolean; porCorreo: boolean }>(
      await api.ejecutar(marcos, 'guardar_mis_avisos', {
        tipo: 'tablon.nota',
        en_la_app: false,
        por_correo: true,
      }),
    );
    // Sin decir nada del móvil, se queda como estaba; sin campana, apagado (0070).
    expect(guardado).toEqual({ enLaApp: false, porCorreo: false, alMovil: false });

    await leerTodo(marcos);
    await leerTodo(sara);
    losDatos(await api.ejecutar(rosa, 'escribir_en_el_tablon', { texto: 'Hoy cerramos a las 23' }));
    expect(await sinLeer(marcos)).toBe(0);
    expect(await sinLeer(sara)).toBe(1);
  });
});

// ── Nadie toca lo de otro ────────────────────────────────────────────────────

describe('los avisos son de cada uno', () => {
  it('nadie lee los de otro, ni marcándolos por su id', async () => {
    const deRosa = (await susAvisos(rosa)).avisos[0];
    expect(deRosa).toBeDefined();
    const [marcosId] = await comoDuena<{ id: string }>(
      `select id from estook.persona where correo = $1`,
      [MARCOS],
    );
    const vistos = await base.comoPersona(marcosId?.id ?? '', async () => {
      const { rows } = await base.bd.query(`select id from estook.aviso where id = $1`, [
        deRosa?.id,
      ]);
      return rows;
    });
    expect(vistos).toEqual([]);
  });

  it('de lo suyo, solo se marca leído: el título no se toca', async () => {
    const [marcosId] = await comoDuena<{ id: string }>(
      `select id from estook.persona where correo = $1`,
      [MARCOS],
    );
    const suyo = (await susAvisos(marcos)).avisos[0];
    await expect(
      base.comoPersona(marcosId?.id ?? '', () =>
        base.bd.query(`update estook.aviso set titulo = 'Otra cosa' where id = $1`, [suyo?.id]),
      ),
    ).rejects.toThrow(/solo se marca si está leído/);
  });

  it('y nadie escribe un aviso a otro: solo el sistema', async () => {
    const [marcosId] = await comoDuena<{ id: string }>(
      `select id from estook.persona where correo = $1`,
      [MARCOS],
    );
    const [rosaId] = await comoDuena<{ id: string }>(
      `select id from estook.persona where correo = $1`,
      [ROSA],
    );
    const [local] = await comoDuena<{ organizacion_id: string }>(
      `select organizacion_id from estook.local where id = $1`,
      [barCentro],
    );
    await expect(
      base.comoPersona(marcosId?.id ?? '', () =>
        base.bd.query(
          `insert into estook.aviso (organizacion_id, local_id, persona_id, tipo, clave, titulo)
           values ($1, $2, $3, 'tablon.nota', 'falso', 'Un aviso falso')`,
          [local?.organizacion_id, barCentro, rosaId?.id],
        ),
      ),
    ).rejects.toThrow();
  });

  it('a quién le llega solo lo contesta la base al sistema', async () => {
    const [marcosId] = await comoDuena<{ id: string }>(
      `select id from estook.persona where correo = $1`,
      [MARCOS],
    );
    const filas = await base.comoPersona(marcosId?.id ?? '', async () => {
      const { rows } = await base.bd.query(`select * from estook.quien_recibe($1, '{}')`, [
        barCentro,
      ]);
      return rows;
    });
    expect(filas).toEqual([]);
  });
});

// ── El reloj ─────────────────────────────────────────────────────────────────

describe('el reloj y los avisos', () => {
  const SECRETO = 'el-secreto-del-reloj-de-los-avisos';
  const UN_DIA = 24 * 60 * 60 * 1000;
  const quien = () => ({ tokenDeSesion: null, correlacionId: crypto.randomUUID() });

  /** Lo que solo hace el sistema, hecho como el sistema, para preparar la prueba. */
  async function comoElSistema(consulta: string, parametros: unknown[] = []): Promise<void> {
    await comoDuena(`select set_config('estook.sistema', 'si', false)`);
    try {
      await comoDuena(consulta, parametros);
    } finally {
      await comoDuena(`select set_config('estook.sistema', 'no', false)`);
    }
  }

  beforeAll(async () => {
    await comoDuena(
      `update plataforma.reloj set huella = encode(sha256(convert_to($1, 'UTF8')), 'hex')`,
      [SECRETO],
    );
  });

  it('cada hora, manda el correo que no salió al momento', async () => {
    const suyo = (await susAvisos(marcos)).avisos[0];
    await comoElSistema(
      `update estook.aviso set correo = 'pendiente', correo_para = $2 where id = $1`,
      [suyo?.id, MARCOS],
    );
    const antes = correo.mandados.length;

    // A las 06:30 de Madrid: no toca lo del día, y los correos salen igual.
    const manana = new Date(Date.now() + UN_DIA).toISOString().slice(0, 10);
    const temprano = montarLaApi(base.bd, {
      correo,
      ahora: () => new Date(`${manana}T04:30:00Z`),
    });
    expect(await temprano.despachador.latir(quien(), SECRETO)).toMatchObject({ diario: false });

    expect(correo.mandados.slice(antes).map((c) => c.para)).toEqual([MARCOS]);
    const [fila] = await comoDuena<{ correo: string }>(
      `select correo from estook.aviso where id = $1`,
      [suyo?.id],
    );
    expect(fila?.correo).toBe('mandado');
  });

  it('lo del día borra los avisos de hace más de un mes', async () => {
    const [viejo, nuevo] = (await susAvisos(rosa)).avisos;
    await comoElSistema(
      `update estook.aviso set actualizado_en = now() - interval '31 days' where id = $1`,
      [viejo?.id],
    );

    const manana = new Date(Date.now() + UN_DIA).toISOString().slice(0, 10);
    const despues = montarLaApi(base.bd, {
      correo,
      ahora: () => new Date(`${manana}T07:10:00Z`),
    });
    expect(await despues.despachador.latir(quien(), SECRETO)).toMatchObject({ diario: true });

    const quedan = await comoDuena<{ id: string }>(
      `select id from estook.aviso where id = any($1::uuid[])`,
      [[viejo?.id, nuevo?.id]],
    );
    expect(quedan.map((q) => q.id)).toEqual([nuevo?.id]);
  });
});
