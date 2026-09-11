import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { fechaEnElLocal, horaDeCorte, jornadaDe, masDias } from '@estook/dominio';
import { levantarBase, type BaseDePrueba } from './entorno.ts';
import { elFallo, losDatos, montarLaApi, type ApiDePrueba } from './despachador.ts';

/**
 * Lo que vio Richi después de M7, con el despachador y la base de verdad.
 *
 *   · «Me da error al cambiar el salario, a veces: "se nos ha roto algo".»
 *   · «Que los gerentes, o gente del mismo nivel, no se puedan echar entre ellos.»
 *   · «Si hay un producto caducado, poder quitarlo; si no, se queda siempre.»
 *   · «Indicar que un producto está congelado, y cuándo.»
 *   · «Los precios que puse llevan IVA: una opción para elegir si va incluido.»
 *
 * Cada bloque es una de esas frases, y cada prueba dice qué fallaba o qué faltaba.
 */
let base: BaseDePrueba;
let api: ApiDePrueba;

const ROSA = 'rosa@ejemplo.estook.com'; // gerente de Bar Centro
const MARCOS = 'marcos@ejemplo.estook.com'; // cocinero de Bar Centro
const ELENA = 'elena@ejemplo.estook.com'; // dirección de Grupo Costa
const LUIS = 'luis@ejemplo.estook.com'; // jefe de cocina de Bar Puerto; aquí, también gerente
const NURIA = 'nuria@ejemplo.estook.com'; // camarera; aquí, también gerente de Bar Puerto

let rosa: string;
let marcos: string;

const hoy = fechaEnElLocal(new Date(Date.now()), 'Europe/Madrid');

/**
 * La jornada de hoy en Bar Centro, que cierra a las 03:00.
 *
 * No es lo mismo que la fecha del calendario, y por eso está aquí: lo que se
 * congela a las dos de la madrugada pertenece a la jornada del día anterior,
 * igual que una venta (regla 10). Comparar con la fecha de Madrid hacía que esta
 * prueba fallara sola al pasar la medianoche, y con razón: lo que estaba mal era
 * la comparación, no el servidor.
 */
const laJornada = jornadaDe(new Date(Date.now()), 'Europe/Madrid', horaDeCorte('03:00'));

beforeAll(async () => {
  base = await levantarBase();
  api = montarLaApi(base.bd);
  rosa = await api.entrar(ROSA);
  marcos = await api.entrar(MARCOS);
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

async function personaId(correo: string): Promise<string> {
  const [fila] = await comoDuena<{ id: string }>(
    'select id from estook.persona where correo = $1',
    [correo],
  );
  if (fila === undefined) throw new Error(correo);
  return fila.id;
}

// ── El salario ───────────────────────────────────────────────────────────────

describe('cambiar el salario dos veces el mismo día', () => {
  it('ya no rompe: lo de hoy se corrige en el sitio', async () => {
    const marcosId = await personaId(MARCOS);
    const primera = await api.ejecutar(rosa, 'poner_retribucion', {
      persona_id: marcosId,
      forma: 'por_hora',
      importe_centimos: 1_100,
    });
    expect(primera.estado).toBe('ok');

    // La segunda, el mismo día. Antes: «se nos ha roto algo por dentro».
    const segunda = await api.ejecutar(rosa, 'poner_retribucion', {
      persona_id: marcosId,
      forma: 'por_hora',
      importe_centimos: 1_250,
    });
    expect(elFallo(segunda)).toBe('no ha fallado (ok)');

    const vivas = await comoDuena<{ importe: string }>(
      `select importe_centimos::text as importe from estook.retribucion
        where persona_id = $1 and hasta is null`,
      [marcosId],
    );
    expect(vivas.map((v) => Number(v.importe))).toEqual([1_250]);
  });
});

// ── Los rangos ───────────────────────────────────────────────────────────────

describe('a un igual no se le retira el acceso', () => {
  let luis: string;
  let elena: string;
  let membresiaDeNuria: string;
  let nuriaId: string;

  beforeAll(async () => {
    // Luis y Nuria, los dos gerentes de Bar Puerto: dos del mismo nivel.
    await comoDuena(
      `insert into estook.membresia (persona_id, organizacion_id, local_id, alcance, rol)
       select p.id, l.organizacion_id, l.id, 'local', 'gerente'
         from estook.persona p, estook.local l
        where p.correo in ($1, $2) and l.codigo = 'bar-puerto'
       on conflict do nothing`,
      [LUIS, NURIA],
    );
    nuriaId = await personaId(NURIA);
    const [membresia] = await comoDuena<{ id: string }>(
      `select m.id from estook.membresia m join estook.local l on l.id = m.local_id
        where m.persona_id = $1 and m.rol = 'gerente' and l.codigo = 'bar-puerto'`,
      [nuriaId],
    );
    membresiaDeNuria = membresia?.id ?? '';
    luis = await api.entrar(LUIS);
    elena = await api.entrar(ELENA);
  });

  it('un gerente no le retira el acceso a otro gerente', async () => {
    const intento = await api.ejecutar(luis, 'retirar_acceso', {
      persona_id: nuriaId,
      membresia_id: membresiaDeNuria,
    });
    expect(elFallo(intento)).toBe('sin_permiso');
  });

  it('ni le da un PIN nuevo, que es entrar como ella', async () => {
    const [puerto] = await comoDuena<{ id: string }>(
      "select id from estook.local where codigo = 'bar-puerto'",
    );
    const intento = await api.ejecutar(luis, 'regenerar_pin', {
      persona_id: nuriaId,
      local_id: puerto?.id ?? '',
    });
    expect(elFallo(intento)).toBe('sin_permiso');
  });

  it('la lista lo dice antes de pulsar: a Nuria no la puede gestionar', async () => {
    const [puerto] = await comoDuena<{ id: string }>(
      "select id from estook.local where codigo = 'bar-puerto'",
    );
    const lista = losDatos<{ personaId: string; puedoGestionar: boolean }[]>(
      await api.consultar(luis, 'quien_tiene_acceso', { local_id: puerto?.id ?? '' }),
    );
    expect(lista.filter((a) => a.personaId === nuriaId).every((a) => !a.puedoGestionar)).toBe(true);
  });

  it('dirección sí puede, porque está por encima de los dos', async () => {
    const hecho = await api.ejecutar(elena, 'retirar_acceso', {
      persona_id: nuriaId,
      membresia_id: membresiaDeNuria,
    });
    expect(elFallo(hecho)).toBe('no ha fallado (ok)');
  });

  it('y nadie da un rol por encima del suyo', async () => {
    const [organizacion] = await comoDuena<{ id: string }>(
      "select id from estook.organizacion where codigo = 'grupo-costa'",
    );
    const intento = await api.ejecutar(luis, 'invitar_persona', {
      correo: 'nuevo-jefe@ejemplo.estook.com',
      nombre: 'Nuevo',
      rol: 'direccion',
      organizacion_id: organizacion?.id ?? '',
    });
    expect(elFallo(intento)).toBe('sin_permiso');
  });

  /**
   * Ni el suyo. La primera versión dejaba invitar «hasta tu nivel», y lo destapó
   * una prueba de pantalla: Rosa nombraba a otra gerente y en el mismo minuto no
   * podía darle la contraseña, porque ya era su igual. Quien nombra es quien
   * después gestiona.
   */
  it('ni el suyo: una gerente no nombra a otra gerente', async () => {
    const [centro] = await comoDuena<{ id: string; organizacion_id: string }>(
      "select id, organizacion_id from estook.local where codigo = 'bar-centro'",
    );
    const intento = await api.ejecutar(rosa, 'invitar_persona', {
      correo: 'otra-gerente@ejemplo.estook.com',
      nombre: 'Otra',
      rol: 'gerente',
      local_id: centro?.id ?? '',
      organizacion_id: centro?.organizacion_id ?? '',
    });
    expect(elFallo(intento)).toBe('sin_permiso');
  });

  it('y la pantalla de invitar solo ofrece lo que se puede dar', async () => {
    const deRosa = losDatos<{ rolesQuePuedoDar: string[] }>(
      await api.consultar(rosa, 'quien_soy'),
    ).rolesQuePuedoDar;
    expect(deRosa).toContain('jefe_de_cocina');
    expect(deRosa).toContain('camarero');
    expect(deRosa).not.toContain('gerente');
    expect(deRosa).not.toContain('direccion');

    // La dirección, todos: por encima de ella no hay nadie.
    const deElena = losDatos<{ rolesQuePuedoDar: string[] }>(
      await api.consultar(elena, 'quien_soy'),
    ).rolesQuePuedoDar;
    expect(deElena).toContain('direccion');
    expect(deElena).toContain('gerente');
  });
});

// ── Los lotes ────────────────────────────────────────────────────────────────

describe('un lote que caduca se quita, y deja de avisar', () => {
  let burrata: string;
  let loteId: string;

  it('la burrata que caduca mañana sale en «Hoy» y en el Calendario', async () => {
    burrata = losDatos<{ productoId: string }>(
      await api.ejecutar(rosa, 'crear_producto', {
        nombre: 'Burrata de prueba',
        unidad_de_uso: 'ud',
        cantidad_inicial: 10,
        caduca_el: masDias(hoy, 1),
      }),
    ).productoId;

    const deHoy = losDatos<{ caducan: { loteId: string; productoId: string }[] }>(
      await api.consultar(rosa, 'inventario_hoy'),
    );
    const suyo = deHoy.caducan.find((c) => c.productoId === burrata);
    expect(suyo).toBeDefined();
    loteId = suyo?.loteId ?? '';

    const viene = losDatos<{ dias: { ocurrencias: { titulo: string }[] }[] }>(
      await api.consultar(rosa, 'lo_que_viene'),
    );
    expect(viene.dias.flatMap((d) => d.ocurrencias.map((o) => o.titulo))).toContain(
      'Caduca Burrata de prueba',
    );
  });

  it('tirar 4 es una merma por caducado, que sale de cámara', async () => {
    const tirado = losDatos<{ quedan: number }>(
      await api.ejecutar(marcos, 'quitar_lote', { lote_id: loteId, como: 'tirado', cuanto: 4 }),
    );
    expect(tirado.quedan).toBe(6);
    expect(await loQueHay(burrata)).toBe(6);

    const [merma] = await comoDuena<{ motivo: string; cantidad: string }>(
      `select motivo_de_merma::text as motivo, cantidad::text as cantidad
         from estook.movimiento_de_stock where producto_id = $1 and tipo = 'merma'`,
      [burrata],
    );
    expect(merma?.motivo).toBe('caducado');
    expect(Number(merma?.cantidad)).toBe(-4);
  });

  it('y ya no sale en «Hoy», ni en el Calendario, ni en su ficha', async () => {
    const deHoy = losDatos<{ caducan: { productoId: string }[] }>(
      await api.consultar(rosa, 'inventario_hoy'),
    );
    expect(deHoy.caducan.some((c) => c.productoId === burrata)).toBe(false);

    const viene = losDatos<{ dias: { ocurrencias: { titulo: string }[] }[] }>(
      await api.consultar(rosa, 'lo_que_viene'),
    );
    expect(viene.dias.flatMap((d) => d.ocurrencias.map((o) => o.titulo))).not.toContain(
      'Caduca Burrata de prueba',
    );

    const ficha = losDatos<{ lotes: unknown[] }>(
      await api.consultar(rosa, 'un_producto', { producto_id: burrata }),
    );
    expect(ficha.lotes).toHaveLength(0);
  });

  it('quitarlo dos veces no tira dos veces', async () => {
    expect(
      elFallo(await api.ejecutar(rosa, 'quitar_lote', { lote_id: loteId, como: 'gastado' })),
    ).toBe('ya_hecho');
    expect(await loQueHay(burrata)).toBe(6);
  });

  it('«se ha gastado» no mueve nada: lo que salió ya salió', async () => {
    const otro = losDatos<{ loteId: string }>(
      await api.ejecutar(rosa, 'congelar', { producto_id: burrata, caduca_el: masDias(hoy, 1) }),
    ).loteId;
    await api.ejecutar(rosa, 'quitar_lote', { lote_id: otro, como: 'gastado' });
    expect(await loQueHay(burrata)).toBe(6);
  });

  it('tirar sin decir cuánto no se puede', async () => {
    const lote = losDatos<{ loteId: string }>(
      await api.ejecutar(rosa, 'congelar', { producto_id: burrata }),
    ).loteId;
    expect(
      elFallo(await api.ejecutar(rosa, 'quitar_lote', { lote_id: lote, como: 'tirado' })),
    ).toBe('faltan_datos');
  });
});

describe('congelar', () => {
  let carne: string;

  it('un lote que ya había se congela, con su nueva caducidad', async () => {
    carne = losDatos<{ productoId: string }>(
      await api.ejecutar(rosa, 'crear_producto', {
        nombre: 'Carne picada de prueba',
        unidad_de_uso: 'kg',
        cantidad_inicial: 5,
        caduca_el: masDias(hoy, 2),
      }),
    ).productoId;

    const ficha = losDatos<{ lotes: { id: string; congeladoEl: string | null }[] }>(
      await api.consultar(rosa, 'un_producto', { producto_id: carne }),
    );
    const lote = ficha.lotes[0]?.id ?? '';
    expect(ficha.lotes[0]?.congeladoEl).toBeNull();

    await api.ejecutar(rosa, 'congelar', {
      producto_id: carne,
      lote_id: lote,
      caduca_el: masDias(hoy, 20),
    });

    const despues = losDatos<{ lotes: { congeladoEl: string | null; caducaEl: string }[] }>(
      await api.consultar(rosa, 'un_producto', { producto_id: carne }),
    );
    expect(despues.lotes[0]?.congeladoEl).toBe(laJornada);
    expect(despues.lotes[0]?.caducaEl).toBe(masDias(hoy, 20));
  });

  it('sale en la vista «Congelados», marcado', async () => {
    const lista = losDatos<{ productos: { id: string; congelado: boolean }[] }>(
      await api.consultar(rosa, 'mis_productos', { congelados: 'true' }),
    );
    expect(lista.productos.find((p) => p.id === carne)?.congelado).toBe(true);
  });

  it('y en el Calendario dice «congelado», para saber de qué cámara sacarlo', async () => {
    const viene = losDatos<{ dias: { ocurrencias: { titulo: string }[] }[] }>(
      await api.consultar(rosa, 'lo_que_viene', { dias: '31' }),
    );
    expect(viene.dias.flatMap((d) => d.ocurrencias.map((o) => o.titulo))).toContain(
      'Caduca Carne picada de prueba (congelado)',
    );
  });

  it('se puede dar de alta ya congelado', async () => {
    const gambas = losDatos<{ productoId: string }>(
      await api.ejecutar(rosa, 'crear_producto', {
        nombre: 'Gambas de prueba',
        unidad_de_uso: 'kg',
        cantidad_inicial: 3,
        congelado: true,
      }),
    ).productoId;
    const ficha = losDatos<{ producto: { congelado: boolean } }>(
      await api.consultar(rosa, 'un_producto', { producto_id: gambas }),
    );
    expect(ficha.producto.congelado).toBe(true);
  });
});

// ── El IVA ───────────────────────────────────────────────────────────────────

describe('los precios con IVA', () => {
  let leche: string;
  let cerveza: string;

  it('cada producto sabe su IVA de compra: el de su categoría, o el que se le elige', async () => {
    leche = losDatos<{ productoId: string }>(
      await api.ejecutar(rosa, 'crear_producto', {
        nombre: 'Leche de prueba',
        unidad_de_uso: 'l',
        precio_centimos: 104,
        iva_de_compra: 0.04,
      }),
    ).productoId;
    cerveza = losDatos<{ productoId: string }>(
      await api.ejecutar(rosa, 'crear_producto', {
        nombre: 'Cerveza de prueba',
        unidad_de_uso: 'ud',
        precio_centimos: 121,
        categoria_fiscal: 'bebida_alcoholica',
      }),
    ).productoId;

    const lecheLeida = losDatos<{ producto: { ivaDeCompra: number; ivaDeCompraElegido: boolean } }>(
      await api.consultar(rosa, 'un_producto', { producto_id: leche }),
    );
    expect(lecheLeida.producto).toMatchObject({ ivaDeCompra: 0.04, ivaDeCompraElegido: true });

    const cervezaLeida = losDatos<{
      producto: { ivaDeCompra: number; ivaDeCompraElegido: boolean };
    }>(await api.consultar(rosa, 'un_producto', { producto_id: cerveza }));
    expect(cervezaLeida.producto).toMatchObject({ ivaDeCompra: 0.21, ivaDeCompraElegido: false });
  });

  it('el local dice cómo escribe sus precios', async () => {
    await api.ejecutar(rosa, 'guardar_precios_con_iva', { con_iva: true });
    const lista = losDatos<{ preciosConIva: boolean }>(await api.consultar(rosa, 'mis_productos'));
    expect(lista.preciosConIva).toBe(true);
  });

  it('a lo ya apuntado con IVA se le quita, cada uno con su tipo', async () => {
    const hecho = losDatos<{ cambiados: number }>(
      await api.ejecutar(rosa, 'quitar_iva_a_los_precios', { confirmado: true }),
    );
    expect(hecho.cambiados).toBeGreaterThanOrEqual(2);

    const precio = async (id: string) =>
      losDatos<{ producto: { precioCentimos: number } }>(
        await api.consultar(rosa, 'un_producto', { producto_id: id }),
      ).producto.precioCentimos;
    // 1,04 € con el 4 % son 1,00 €; 1,21 € con el 21 %, también.
    expect(await precio(leche)).toBe(100);
    expect(await precio(cerveza)).toBe(100);
  });

  it('una sola vez: la segunda lo dejaría mal', async () => {
    expect(
      elFallo(await api.ejecutar(rosa, 'quitar_iva_a_los_precios', { confirmado: true })),
    ).toBe('ya_hecho');
  });

  it('y quien no ve precios no toca nada de esto', async () => {
    expect(elFallo(await api.ejecutar(marcos, 'guardar_precios_con_iva', { con_iva: false }))).toBe(
      'sin_permiso',
    );
  });
});

// ── La unidad ────────────────────────────────────────────────────────────────

describe('la unidad de un producto con género no se cambia', () => {
  it('pasar de g a kg con 750 dentro diría 750 kg: no se deja', async () => {
    const queso = losDatos<{ productoId: string }>(
      await api.ejecutar(rosa, 'crear_producto', {
        nombre: 'Queso azul de prueba',
        unidad_de_uso: 'g',
        cantidad_inicial: 750,
      }),
    ).productoId;

    const intento = await api.ejecutar(rosa, 'cambiar_producto', {
      producto_id: queso,
      nombre: 'Queso azul de prueba',
      categoria_id: null,
      formato: null,
      factor: 1,
      unidad_de_uso: 'kg',
      rendimiento: 1,
      categoria_fiscal: 'alimento',
      alergenos: [],
      peso_variable: false,
      codigo_de_barras: null,
      minimo: null,
      proveedor_id: null,
      notas: null,
    });
    expect(elFallo(intento)).toBe('faltan_datos');
    expect(await loQueHay(queso)).toBe(750);
  });

  it('y guardar la ficha sin mandar el IVA ni el contenido no se los borra', async () => {
    const paquete = losDatos<{ productoId: string }>(
      await api.ejecutar(rosa, 'crear_producto', {
        nombre: 'Paquete de prueba',
        unidad_de_uso: 'ud',
        iva_de_compra: 0.04,
        contenido_por_unidad: 250,
        unidad_del_contenido: 'g',
      }),
    ).productoId;

    await api.ejecutar(rosa, 'cambiar_producto', {
      producto_id: paquete,
      nombre: 'Paquete de prueba, corregido',
      categoria_id: null,
      formato: null,
      factor: 1,
      unidad_de_uso: 'ud',
      rendimiento: 1,
      categoria_fiscal: 'alimento',
      alergenos: [],
      peso_variable: false,
      codigo_de_barras: null,
      minimo: null,
      proveedor_id: null,
      notas: null,
    });

    const leido = losDatos<{
      producto: { ivaDeCompra: number; contenidoPorUnidad: number; unidadDelContenido: string };
    }>(await api.consultar(rosa, 'un_producto', { producto_id: paquete }));
    expect(leido.producto).toMatchObject({
      ivaDeCompra: 0.04,
      contenidoPorUnidad: 250,
      unidadDelContenido: 'g',
    });
  });
});
