import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ZONAS, ZONAS_DEL_ROL, type Zona } from '@estook/dominio';
import { levantarBase, type BaseDePrueba } from './entorno.ts';
import { elFallo, losDatos, montarLaApi, type ApiDePrueba } from './despachador.ts';

/**
 * Las apps conectadas · lo segundo que trajo Richi mirando el TPV.
 *
 *   · «El precio de venta no va en un ingrediente: va en la carta.»
 *   · «Añadir filtro de sala, cocina y limpieza, y que cada uno vea lo suyo.»
 *   · «Los congelados no funcionan: deberías poder elegir cuánto congelas.»
 *   · «Que se pueda subir el inventario que han hecho y actualizarlo todo.»
 *
 * Cada bloque es una de esas frases.
 */
let base: BaseDePrueba;
let api: ApiDePrueba;

const ROSA = 'rosa@ejemplo.estook.com'; // gerente de Bar Centro: lo ve todo
const MARCOS = 'marcos@ejemplo.estook.com'; // cocinero de Bar Centro

let rosa: string;
let marcos: string;

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

async function crear(nombre: string, zona: Zona, mas: Record<string, unknown> = {}) {
  return losDatos<{ productoId: string }>(
    await api.ejecutar(rosa, 'crear_producto', {
      nombre,
      unidad_de_uso: 'kg',
      zona,
      ...mas,
    }),
  ).productoId;
}

// ═══════════════════════════════════════════════════════════════════════════
// 1 · De dónde es cada producto, y quién lo ve
// ═══════════════════════════════════════════════════════════════════════════

describe('cada producto es de una zona, y cada uno trabaja con la suya', () => {
  let deCocina: string;
  let deSala: string;
  let deLimpieza: string;

  it('se dan de alta con su zona', async () => {
    deCocina = await crear('Merluza de las apps', 'cocina', { cantidad_inicial: 5 });
    deSala = await crear('Vermut de las apps', 'sala', { cantidad_inicial: 8 });
    deLimpieza = await crear('Lejía de las apps', 'limpieza', { cantidad_inicial: 3 });

    const zonas = await comoDuena<{ nombre: string; zona: string }>(
      `select nombre, zona::text as zona from estook.producto
        where id = any($1::uuid[]) order by nombre`,
      [[deCocina, deSala, deLimpieza]],
    );
    // Ordenados por nombre: Lejía, Merluza, Vermut.
    expect(zonas.map((z) => z.zona)).toEqual(['limpieza', 'cocina', 'sala']);
  });

  it('el filtro de zona trae solo la suya', async () => {
    const sala = losDatos<{ productos: { id: string }[] }>(
      await api.consultar(rosa, 'mis_productos', { zona: 'sala', limite: '200' }),
    );
    expect(sala.productos.some((p) => p.id === deSala)).toBe(true);
    expect(sala.productos.some((p) => p.id === deCocina)).toBe(false);
  });

  it('y dice cuántos hay en cada una, contados en el servidor', async () => {
    const todo = losDatos<{ porZona: { zona: string; cuantos: number }[] }>(
      await api.consultar(rosa, 'mis_productos', { limite: '200' }),
    );
    for (const zona of ZONAS) {
      expect(todo.porZona.find((z) => z.zona === zona)?.cuantos ?? 0).toBeGreaterThan(0);
    }
  });

  it('**la lista de un cocinero es su almacén**, no el del local entero', async () => {
    const suyos = losDatos<{ productos: { id: string }[]; porZona: { zona: string }[] }>(
      await api.consultar(marcos, 'mis_productos', { limite: '200' }),
    );
    expect(suyos.productos.some((p) => p.id === deCocina)).toBe(true);
    expect(suyos.productos.some((p) => p.id === deLimpieza)).toBe(true);
    expect(suyos.productos.some((p) => p.id === deSala)).toBe(false);

    // Y «Sala» ni siquiera se ofrece en el desplegable: un camino a una lista
    // vacía es peor que no ofrecerlo.
    expect(suyos.porZona.some((z) => z.zona === 'sala')).toBe(false);
  });

  it('ni pidiendo la zona a mano se la salta', async () => {
    const forzado = losDatos<{ productos: { id: string }[] }>(
      await api.consultar(marcos, 'mis_productos', { zona: 'sala', limite: '200' }),
    );
    expect(forzado.productos).toHaveLength(0);
  });

  it('pero SÍ puede apuntar la merma de algo de sala, y eso es a propósito', async () => {
    // «La merma la apunta quien la rompe» (0026). Filtrar esta búsqueda por la
    // zona dejaba a una camarera sin poder apuntar la nata que se le ha caído, y
    // lo cazó su prueba de extremo a extremo. La zona acota lo que cada uno
    // **gestiona**, no lo que puede romper.
    const buscado = losDatos<{ productos: { id: string }[] }>(
      await api.consultar(marcos, 'productos_para_merma', { texto: 'vermut' }),
    );
    expect(buscado.productos.some((p) => p.id === deSala)).toBe(true);
  });

  it('y no puede cambiarle la ficha: eso no es su almacén', async () => {
    expect(
      elFallo(
        await api.ejecutar(marcos, 'cambiar_producto', {
          producto_id: deSala,
          nombre: 'Vermut de las apps',
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
        }),
      ),
    ).not.toBe('no ha fallado (ok)');
  });

  it('las categorías se cuentan dentro de la zona que se mira', async () => {
    // Antes contaban sobre el local entero: en «Sala» salía «Carnes (14)» y al
    // elegirla no había ninguna. Una categoría que promete catorce y enseña cero
    // es peor que no ofrecerla.
    const [categoria] = await comoDuena<{ id: string }>(
      `select c.id::text as id from estook.categoria_de_producto c
        join estook.producto p on p.categoria_id = c.id
       where p.zona = 'cocina' and p.activo limit 1`,
    );
    if (categoria === undefined) return;

    const enSala = losDatos<{ categorias: { id: string; cuantos: number }[] }>(
      await api.consultar(rosa, 'mis_productos', { zona: 'sala', limite: '200' }),
    );
    expect(enSala.categorias.find((c) => c.id === categoria.id)?.cuantos ?? 0).toBe(0);
  });

  it('el catálogo de zonas de la base y el del dominio dicen lo mismo', async () => {
    // Dos copias del mismo vocabulario —`zona.ts` y `estook.zona_del_producto`—
    // y una prueba que las cuadra, igual que con los tipos de movimiento. Si un
    // día alguien añade «terraza» en un sitio y no en el otro, esto se pone rojo.
    const enLaBase = await comoDuena<{ valor: string }>(
      `select unnest(enum_range(null::estook.zona_del_producto))::text as valor`,
    );
    expect(enLaBase.map((f) => f.valor)).toEqual([...ZONAS]);

    // Y los roles que ve cada una, que los decide `zonas_que_ve` en la base y
    // `ZONAS_DEL_ROL` en el dominio: lo que prueba que dicen lo mismo es que
    // Marcos, cocinero, no ve el vermut de la barra. Está arriba.
    expect(ZONAS_DEL_ROL.cocinero).toEqual(['cocina', 'limpieza']);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 2 · Congelar una parte, no el producto entero
// ═══════════════════════════════════════════════════════════════════════════

describe('congelar dice cuánto', () => {
  let bacon: string;

  it('se congelan 10 de 43, y se apunta que son 10', async () => {
    bacon = await crear('Bacon de las apps', 'cocina', { cantidad_inicial: 43 });

    const congelado = losDatos<{ loteId: string }>(
      await api.ejecutar(rosa, 'congelar', { producto_id: bacon, cuanto: 10 }),
    );

    const [lote] = await comoDuena<{ cantidad: string | null }>(
      `select cantidad::text as cantidad from estook.lote where id = $1`,
      [congelado.loteId],
    );
    expect(Number(lote?.cantidad)).toBe(10);
  });

  it('y la ficha dice cuánto hay congelado, no solo que lo hay', async () => {
    const ficha = losDatos<{
      producto: { congelado: boolean; congeladoCuanto: number | null; cantidad: number };
      lotes: { cantidad: number | null }[];
    }>(await api.consultar(rosa, 'un_producto', { producto_id: bacon }));

    expect(ficha.producto.congelado).toBe(true);
    expect(ficha.producto.congeladoCuanto).toBe(10);
    // Y lo que hay no se ha movido: congelar no saca género de la cámara.
    expect(ficha.producto.cantidad).toBe(43);
    expect(ficha.lotes[0]?.cantidad).toBe(10);
  });

  it('sin decir cuánto se sigue pudiendo, y entonces no se inventa una cifra', async () => {
    const otro = await crear('Pollo de las apps', 'cocina', { cantidad_inicial: 6 });
    await api.ejecutar(rosa, 'congelar', { producto_id: otro });

    const ficha = losDatos<{ producto: { congelado: boolean; congeladoCuanto: number | null } }>(
      await api.consultar(rosa, 'un_producto', { producto_id: otro }),
    );
    expect(ficha.producto.congelado).toBe(true);
    expect(ficha.producto.congeladoCuanto).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 3 · El recuento · «esto es lo que hay»
// ═══════════════════════════════════════════════════════════════════════════

describe('el recuento cambia lo que hay, y dice cuánto bailaba', () => {
  let arroz: string;
  let harina: string;
  let sal: string;

  it('lo contado manda, y la diferencia queda apuntada', async () => {
    arroz = await crear('Arroz del recuento', 'cocina', { cantidad_inicial: 43 });
    harina = await crear('Harina del recuento', 'cocina', { cantidad_inicial: 10 });
    sal = await crear('Sal del recuento', 'cocina', { cantidad_inicial: 4 });

    const hecho = losDatos<{
      corregidos: number;
      yaCuadraban: number;
      vaciados: number;
      loQueMasBaila: { producto: string; decia: number; hay: number }[];
    }>(
      await api.ejecutar(rosa, 'cerrar_recuento', {
        lineas: [
          { producto_id: arroz, hay: 38 },
          { producto_id: harina, hay: 10 },
        ],
      }),
    );

    expect(hecho.corregidos).toBe(1);
    expect(hecho.yaCuadraban).toBe(1);
    expect(hecho.vaciados).toBe(0);
    expect(hecho.loQueMasBaila[0]?.producto).toBe('Arroz del recuento');
    expect(hecho.loQueMasBaila[0]?.decia).toBe(43);
    expect(hecho.loQueMasBaila[0]?.hay).toBe(38);
  });

  it('el libro guarda la corrección como recuento, no como ajuste', async () => {
    const [linea] = await comoDuena<{ tipo: string; cantidad: string }>(
      `select tipo::text as tipo, cantidad::text as cantidad
         from estook.movimiento_de_stock
        where producto_id = $1 order by id desc limit 1`,
      [arroz],
    );
    expect(linea?.tipo).toBe('recuento');
    expect(Number(linea?.cantidad)).toBe(-5);
  });

  it('lo que no se cuenta **no se toca**', async () => {
    const ficha = losDatos<{ producto: { cantidad: number } }>(
      await api.consultar(rosa, 'un_producto', { producto_id: sal }),
    );
    expect(ficha.producto.cantidad).toBe(4);
  });

  it('salvo que se pida vaciarlo, y entonces sí', async () => {
    const hecho = losDatos<{ vaciados: number }>(
      await api.ejecutar(rosa, 'cerrar_recuento', {
        lineas: [{ producto_id: arroz, hay: 38 }],
        lo_que_falta: 'a_cero',
        zona: 'cocina',
      }),
    );
    expect(hecho.vaciados).toBeGreaterThan(0);

    const ficha = losDatos<{ producto: { cantidad: number } }>(
      await api.consultar(rosa, 'un_producto', { producto_id: sal }),
    );
    expect(ficha.producto.cantidad).toBe(0);
  });

  it('y vaciar una zona no toca las otras', async () => {
    const enSala = losDatos<{ productos: { cantidad: number }[] }>(
      await api.consultar(rosa, 'mis_productos', { zona: 'sala', limite: '200' }),
    );
    expect(enSala.productos.some((p) => p.cantidad > 0)).toBe(true);
  });

  it('un cocinero no cierra recuentos: no es su permiso', async () => {
    expect(
      elFallo(
        await api.ejecutar(marcos, 'cerrar_recuento', {
          lineas: [{ producto_id: arroz, hay: 1 }],
        }),
      ),
    ).toBe('sin_permiso');
  });
});
