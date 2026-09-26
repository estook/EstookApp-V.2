import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { fechaEnElLocal, masDias } from '@estook/dominio';
import { almacenEnMemoria } from '../../servidor/infraestructura/almacen.ts';
import { levantarBase, type BaseDePrueba } from './entorno.ts';
import { elFallo, losDatos, montarLaApi, type ApiDePrueba } from './despachador.ts';

type Resultado = Awaited<ReturnType<ApiDePrueba['ejecutar']>>;

/**
 * El repaso del 25-sep (0048 · decisión 0049), con el despachador y la base de verdad.
 *
 *   2  «Inventario» se llama Almacén, y «Recuento», Inventario: el permiso cambia de
 *      nombre en la base con sus políticas, y nadie pierde lo que tenía.
 *   1  Lo congelado va aparte: no avisa por caducidad, avisa por lo que lleva en el
 *      congelador.
 *   6  El Tablón: notas del equipo, para todos o para cocina o sala, con hora si la
 *      tienen, y quién las ha leído.
 *   3  La carta del local, subida: lo que enseña su QR.
 */
let base: BaseDePrueba;
let api: ApiDePrueba;
const almacen = almacenEnMemoria();

const ROSA = 'rosa@ejemplo.estook.com'; // gerente de Bar Centro
const MARCOS = 'marcos@ejemplo.estook.com'; // cocinero de Bar Centro
const SARA = 'sara@ejemplo.estook.com'; // camarera de Bar Centro

let rosa: string;
let marcos: string;
let sara: string;

const hoy = fechaEnElLocal(new Date(Date.now()), 'Europe/Madrid');

/** Una página de carta de mentira: la firma de un JPG y poco más. */
const JPG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4, 5, 6, 7, 8]).toString('base64');

beforeAll(async () => {
  base = await levantarBase();
  api = montarLaApi(base.bd, { almacen });
  rosa = await api.entrar(ROSA);
  marcos = await api.entrar(MARCOS);
  sara = await api.entrar(SARA);
}, 120_000);

afterAll(async () => {
  await base.cerrar();
});

/** Vacío si ha ido bien; si no, el código del fallo, que es lo que se quiere leer si falla. */
function sinFallo(resultado: Resultado): string {
  return resultado.estado === 'fallo' ? resultado.codigo : '';
}

async function comoDuena<T>(consulta: string, parametros: unknown[] = []): Promise<T[]> {
  const { rows } = await base.bd.query<T>(consulta, parametros);
  return rows;
}

// ── 2 · Almacén e Inventario ─────────────────────────────────────────────────

describe('Almacén e Inventario', () => {
  it('el permiso se llama app.almacen, y del de antes no queda nada', async () => {
    const permisos = await comoDuena<{ codigo: string; nombre: string }>(
      `select codigo, nombre from estook.permiso where codigo in ('app.almacen', 'app.inventario')`,
    );
    expect(permisos).toEqual([{ codigo: 'app.almacen', nombre: 'Almacén' }]);

    const politicas = await comoDuena<{ cuantas: number }>(
      `select count(*)::int as cuantas from pg_policies
        where coalesce(qual, '') || coalesce(with_check, '') like '%app.inventario%'`,
    );
    expect(politicas[0]?.cuantas).toBe(0);
  });

  it('cada rol conserva lo que tenía: el cocinero sigue llevando el almacén', async () => {
    const nivel = await comoDuena<{ nivel: string }>(
      `select nivel::text as nivel from estook.permiso_de_rol
        where rol = 'cocinero' and permiso = 'app.almacen'`,
    );
    expect(nivel[0]?.nivel).toBe('ver_y_editar');

    // Y las políticas funcionan con el nombre nuevo: crea un producto.
    const creado = await api.ejecutar(marcos, 'crear_producto', {
      nombre: 'Harina del repaso',
      unidad_de_uso: 'kg',
    });
    expect(sinFallo(creado)).toBe('');
  });

  it('cerrar un inventario se llama así', async () => {
    const [permiso] = await comoDuena<{ nombre: string }>(
      `select nombre from estook.permiso where codigo = 'accion.cerrar_recuento'`,
    );
    expect(permiso?.nombre).toBe('Cerrar un inventario');
  });

  it('los enlaces del Calendario llevan al Almacén', async () => {
    const viejos = await comoDuena<{ cuantos: number }>(
      `select count(*)::int as cuantos from estook.evento_de_calendario where ir like '/inventario%'`,
    );
    expect(viejos[0]?.cuantos).toBe(0);
  });
});

// ── 1 · Lo congelado va aparte ───────────────────────────────────────────────

describe('lo congelado', () => {
  let bacon: string;
  let lote: string;

  it('congelar no pregunta ni toca la caducidad', async () => {
    bacon = losDatos<{ productoId: string }>(
      await api.ejecutar(rosa, 'crear_producto', {
        nombre: 'Bacon del repaso',
        unidad_de_uso: 'kg',
        cantidad_inicial: 43,
        caduca_el: masDias(hoy, 2),
      }),
    ).productoId;
    const ficha = losDatos<{ lotes: { id: string }[] }>(
      await api.consultar(rosa, 'un_producto', { producto_id: bacon }),
    );
    lote = ficha.lotes[0]?.id ?? '';

    // La caducidad ya no es parte de congelar: mandarla es un error de forma.
    expect(
      elFallo(
        await api.ejecutar(rosa, 'congelar', {
          producto_id: bacon,
          lote_id: lote,
          caduca_el: masDias(hoy, 90),
        }),
      ),
    ).toBe('faltan_datos');

    await api.ejecutar(rosa, 'congelar', { producto_id: bacon, lote_id: lote, cuanto: 10 });
    const despues = losDatos<{
      lotes: { caducaEl: string | null; cumpleCongeladoEl: string | null }[];
      producto: { congeladoAguantaMeses: number };
    }>(await api.consultar(rosa, 'un_producto', { producto_id: bacon }));
    expect(despues.lotes[0]?.caducaEl).toBe(masDias(hoy, 2));
    expect(despues.producto.congeladoAguantaMeses).toBe(3);
    expect(despues.lotes[0]?.cumpleCongeladoEl).not.toBeNull();
  });

  it('y ya no sale entre lo que caduca, aunque su fecha de fresco esté al caer', async () => {
    const almacenHoy = losDatos<{ caducan: { loteId: string }[] }>(
      await api.consultar(rosa, 'almacen_hoy', {}),
    );
    expect(almacenHoy.caducan.some((c) => c.loteId === lote)).toBe(false);
  });

  it('en el Calendario, el día que cumple lo que aguanta congelado', async () => {
    const [evento] = await comoDuena<{ titulo: string; dia: string; esperado: string }>(
      `select e.titulo, to_char(e.dia, 'YYYY-MM-DD') as dia,
              to_char(l.congelado_el + interval '3 months', 'YYYY-MM-DD') as esperado
         from estook.evento_de_calendario e
         join estook.lote l on l.id::text = e.origen_id
        where e.origen = 'lote' and e.origen_id = $1`,
      [lote],
    );
    expect(evento?.titulo).toBe('Bacon del repaso cumple 3 meses congelado');
    expect(evento?.dia).toBe(evento?.esperado);
  });

  it('cambiar lo que aguanta en la ficha mueve su aviso', async () => {
    const { producto } = losDatos<{
      producto: {
        nombre: string;
        categoriaId: string | null;
        formato: string | null;
        factor: number;
        unidadDeUso: string;
        rendimiento: number;
        categoriaFiscal: string;
        pesoVariable: boolean;
        codigoDeBarras: string | null;
        minimo: number | null;
        proveedorId: string | null;
        notas: string | null;
      };
    }>(await api.consultar(rosa, 'un_producto', { producto_id: bacon }));
    const cambiado = await api.ejecutar(rosa, 'cambiar_producto', {
      producto_id: bacon,
      nombre: producto.nombre,
      categoria_id: producto.categoriaId,
      formato: producto.formato,
      factor: producto.factor,
      unidad_de_uso: producto.unidadDeUso,
      rendimiento: producto.rendimiento,
      categoria_fiscal: producto.categoriaFiscal,
      alergenos: [],
      peso_variable: producto.pesoVariable,
      codigo_de_barras: producto.codigoDeBarras,
      minimo: producto.minimo,
      proveedor_id: producto.proveedorId,
      notas: producto.notas,
      congelado_aguanta_meses: 6,
    });
    expect(sinFallo(cambiado)).toBe('');

    const [evento] = await comoDuena<{ titulo: string; dia: string; esperado: string }>(
      `select e.titulo, to_char(e.dia, 'YYYY-MM-DD') as dia,
              to_char(l.congelado_el + interval '6 months', 'YYYY-MM-DD') as esperado
         from estook.evento_de_calendario e
         join estook.lote l on l.id::text = e.origen_id
        where e.origen = 'lote' and e.origen_id = $1`,
      [lote],
    );
    expect(evento?.titulo).toBe('Bacon del repaso cumple 6 meses congelado');
    expect(evento?.dia).toBe(evento?.esperado);
  });

  it('cuando lleva más de lo que aguanta, avisa en el Almacén y en «Hoy»', async () => {
    // Congelado hace siete meses: se ha pasado de los seis.
    await comoDuena(`update estook.lote set congelado_el = $2::date where id = $1`, [
      lote,
      masDias(hoy, -214),
    ]);
    const almacenHoy = losDatos<{ congelados: { loteId: string; dias: number }[] }>(
      await api.consultar(rosa, 'almacen_hoy', {}),
    );
    const suyo = almacenHoy.congelados.find((c) => c.loteId === lote);
    expect(suyo).toBeDefined();
    expect(suyo?.dias ?? 1).toBeLessThanOrEqual(0);

    const deHoy = losDatos<{ cosas: { id: string; titulo: string }[] }>(
      await api.consultar(rosa, 'lo_de_hoy', {}),
    );
    const aviso = deHoy.cosas.find((c) => c.id === 'congelados-pasados');
    expect(aviso?.titulo ?? '').toMatch(/demasiado tiempo congelado/);
  });
});

// ── 6 · El Tablón ────────────────────────────────────────────────────────────

describe('el Tablón', () => {
  let paraTodos: string;
  let paraSala: string;
  let paraCocina: string;

  it('escribe cualquiera del local, y a su nombre', async () => {
    paraTodos = losDatos<{ notaId: string }>(
      await api.ejecutar(sara, 'escribir_en_el_tablon', {
        texto: 'Reserva de 20 personas',
        hora: '17:00',
      }),
    ).notaId;
    paraSala = losDatos<{ notaId: string }>(
      await api.ejecutar(rosa, 'escribir_en_el_tablon', {
        texto: 'Faltan servilletas en la barra',
        zona: 'sala',
      }),
    ).notaId;
    paraCocina = losDatos<{ notaId: string }>(
      await api.ejecutar(rosa, 'escribir_en_el_tablon', {
        texto: 'Mañana viene el técnico del horno',
        zona: 'cocina',
        manana: true,
      }),
    ).notaId;

    const [nota] = await comoDuena<{ autor: string }>(
      `select p.correo as autor from estook.nota_del_tablon n
         join estook.persona p on p.id = n.autor_id where n.id = $1`,
      [paraTodos],
    );
    expect(nota?.autor).toBe(SARA);
  });

  it('cada uno ve lo suyo: la cocina no ve lo de sala, y la sala no ve lo de cocina', async () => {
    const deMarcos = losDatos<{ notas: { id: string }[] }>(
      await api.consultar(marcos, 'el_tablon', {}),
    ).notas.map((n) => n.id);
    expect(deMarcos).toContain(paraTodos);
    expect(deMarcos).toContain(paraCocina);
    expect(deMarcos).not.toContain(paraSala);

    const deSara = losDatos<{ notas: { id: string }[] }>(
      await api.consultar(sara, 'el_tablon', {}),
    ).notas.map((n) => n.id);
    expect(deSara).toContain(paraSala);
    expect(deSara).not.toContain(paraCocina);
  });

  it('marcarla leída una vez, aunque se marque dos', async () => {
    await api.ejecutar(marcos, 'marcar_nota_leida', { nota_id: paraTodos });
    await api.ejecutar(marcos, 'marcar_nota_leida', { nota_id: paraTodos });
    const [leidas] = await comoDuena<{ cuantas: number }>(
      `select count(*)::int as cuantas from estook.nota_leida where nota_id = $1`,
      [paraTodos],
    );
    expect(leidas?.cuantas).toBe(1);

    const deMarcos = losDatos<{ notas: { id: string; leida: boolean }[] }>(
      await api.consultar(marcos, 'el_tablon', {}),
    );
    expect(deMarcos.notas.find((n) => n.id === paraTodos)?.leida).toBe(true);
  });

  it('su autora ve quién la ha leído, y quien lleva al equipo, quién falta', async () => {
    const deSara = losDatos<{
      notas: { id: string; lectura: { leidas: number; quien: string[] } | null }[];
    }>(await api.consultar(sara, 'el_tablon', {}));
    const suya = deSara.notas.find((n) => n.id === paraTodos);
    expect(suya?.lectura?.leidas).toBe(1);
    expect(suya?.lectura?.quien).toEqual(['Marcos']);

    const deRosa = losDatos<{
      notas: { id: string; lectura: { faltan: string[] | null } | null }[];
    }>(await api.consultar(rosa, 'el_tablon', {}));
    const faltan = deRosa.notas.find((n) => n.id === paraTodos)?.lectura?.faltan ?? [];
    expect(faltan).toContain('Rosa');
    expect(faltan).not.toContain('Marcos');
    // La autora no espera a leer su propia nota.
    expect(faltan).not.toContain('Sara');
  });

  it('una nota con hora sale en el Calendario, y en «Hoy» en cuanto se ha leído', async () => {
    // Sin leer, está en el Tablón con su punto: en «Hoy» sería salir dos veces.
    const antes = losDatos<{ cosas: { id: string }[] }>(await api.consultar(rosa, 'lo_de_hoy', {}));
    expect(antes.cosas.some((c) => c.id === `nota:${paraTodos}`)).toBe(false);
    await api.ejecutar(rosa, 'marcar_nota_leida', { nota_id: paraTodos });

    const deHoy = losDatos<{ cosas: { id: string; titulo: string }[] }>(
      await api.consultar(rosa, 'lo_de_hoy', {}),
    );
    expect(deHoy.cosas.find((c) => c.id === `nota:${paraTodos}`)?.titulo).toBe(
      '17:00 · Reserva de 20 personas',
    );

    const viene = losDatos<{ dias: { ocurrencias: { titulo: string; desde: string | null }[] }[] }>(
      await api.consultar(rosa, 'lo_que_viene', {}),
    );
    const enElCalendario = viene.dias
      .flatMap((d) => d.ocurrencias)
      .find((o) => o.titulo === 'Reserva de 20 personas');
    expect(enElCalendario?.desde).toBe('17:00');
  });

  it('quitarla la puede su autor o quien lleva al equipo; los demás, no', async () => {
    expect(elFallo(await api.ejecutar(marcos, 'quitar_nota', { nota_id: paraTodos }))).toBe(
      'sin_permiso',
    );
    expect(sinFallo(await api.ejecutar(rosa, 'quitar_nota', { nota_id: paraTodos }))).toBe('');
    const deSara = losDatos<{ notas: { id: string }[] }>(
      await api.consultar(sara, 'el_tablon', {}),
    ).notas.map((n) => n.id);
    expect(deSara).not.toContain(paraTodos);
  });

  it('un día que ya ha pasado no se apunta', async () => {
    expect(
      elFallo(
        await api.ejecutar(rosa, 'escribir_en_el_tablon', {
          texto: 'Esto era ayer',
          dia: masDias(hoy, -1),
        }),
      ),
    ).toBe('faltan_datos');
  });
});

// ── 3 · La carta del local, subida ───────────────────────────────────────────

describe('la carta subida', () => {
  it('se sube página a página y se publica entera: la enseña su QR', async () => {
    const subida = Date.now();
    const paginas: string[] = [];
    for (const pagina of [1, 2]) {
      paginas.push(
        losDatos<{ clave: string }>(
          await api.ejecutar(rosa, 'subir_pagina_de_la_carta', {
            subida,
            pagina,
            tipo: 'image/jpeg',
            contenido: JPG,
          }),
        ).clave,
      );
    }
    expect(sinFallo(await api.ejecutar(rosa, 'publicar_la_carta', { paginas }))).toBe('');

    const [local] = await comoDuena<{ direccion: string }>(
      `select direccion_de_la_carta as direccion from estook.local where nombre = 'Bar Centro'`,
    );
    const carta = losDatos<{ paginas: string[] }>(
      await api.consultar(null, 'la_carta', { direccion: local?.direccion ?? '' }),
    );
    expect(carta.paginas).toHaveLength(2);
  });

  it('no se publica como carta un fichero que no es de la carta de ese local', async () => {
    expect(
      elFallo(
        await api.ejecutar(rosa, 'publicar_la_carta', {
          paginas: ['marca/otro-local/logo-1.png'],
        }),
      ),
    ).toBe('faltan_datos');
  });

  it('lo que no es una imagen no se sube, y quien no lleva la carta no la toca', async () => {
    expect(
      elFallo(
        await api.ejecutar(rosa, 'subir_pagina_de_la_carta', {
          subida: Date.now(),
          pagina: 1,
          tipo: 'image/jpeg',
          contenido: Buffer.from('no soy un jpg').toString('base64'),
        }),
      ),
    ).toBe('faltan_datos');
    expect(elFallo(await api.ejecutar(marcos, 'quitar_la_carta', {}))).toBe('sin_permiso');
  });

  it('publicar otra borra la de antes del almacén', async () => {
    const antes = almacen.claves().filter((c) => c.startsWith('cartas/'));
    expect(antes).toHaveLength(2);
    expect(sinFallo(await api.ejecutar(rosa, 'quitar_la_carta', {}))).toBe('');
    expect(almacen.claves().filter((c) => c.startsWith('cartas/'))).toHaveLength(0);
  });
});
