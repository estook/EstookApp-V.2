import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  TIPOS_DE_MOVIMIENTO,
  cantidad,
  esTipoDeMovimiento,
  milesimas,
  reconstruir,
  siguienteEstado,
  type Movimiento,
} from '@estook/dominio';
import { levantarBase, type BaseDePrueba } from './entorno.ts';

/**
 * M6 · Inventario, contra Postgres de verdad.
 *
 * «Toda regla de acceso se prueba **llamando a la API a pelo**» (regla 4). Aquí
 * se llama incluso más abajo: contra el SQL, con `set role estook_api` y las
 * políticas aplicando, que es exactamente lo que hace la capa de aplicación.
 *
 * Lo que se comprueba aquí y no se puede comprobar en ningún otro sitio:
 *
 *   · que el libro de movimientos **no se puede modificar**, ni con permisos
 *   · que el stock que se lee es siempre la última línea del libro
 *   · que reconstruir da **exactamente** los mismos números
 *   · que un cocinero ve el género de su local y **no ve un solo precio**
 *   · que un local jamás ve el género de otro
 *   · y que las categorías nacen sembradas por tipo de local
 */
let base: BaseDePrueba;

const ROSA = 'rosa@ejemplo.estook.com'; // gerente de Bar Centro
const MARCOS = 'marcos@ejemplo.estook.com'; // cocinero de Bar Centro
const SARA = 'sara@ejemplo.estook.com'; // camarera de Bar Centro
const LUIS = 'luis@ejemplo.estook.com'; // jefe de cocina de Bar Puerto

beforeAll(async () => {
  base = await levantarBase();
}, 60_000);

afterAll(async () => {
  await base.cerrar();
});

async function comoDuena<T>(consulta: string, parametros: unknown[] = []): Promise<T[]> {
  const { rows } = await base.bd.query<T>(consulta, parametros);
  return rows;
}

// ── Las categorías, sembradas por tipo de local ──────────────────────────────

describe('las categorías vienen de serie', () => {
  it('ningún local con tipo se queda sin categorías', async () => {
    // «Categoría de producto · **Nunca vacío: vienen de serie**» (Auditoría,
    // parte 3). Es la promesa que la migración tiene que cumplir sobre los
    // locales que ya existían.
    const huerfanos = await comoDuena<{ codigo: string }>(
      `select l.codigo from estook.local l
        where l.tipo is not null
          and not exists (
            select 1 from estook.categoria_de_producto c where c.local_id = l.id
          )`,
    );
    expect(huerfanos).toEqual([]);
  });

  it('Casa Lola, que no ha dicho de qué tipo es, todavía no tiene ninguna', async () => {
    // Y eso es correcto: no se le inventa un tipo, así que no se le inventan
    // sus categorías. Las recibe al responder el paso 2 del alta.
    const [lola] = await comoDuena<{ cuantas: number }>(
      `select count(c.id)::int as cuantas
         from estook.local l
         left join estook.categoria_de_producto c on c.local_id = l.id
        where l.codigo = 'casa-lola'
        group by l.id`,
    );
    expect(lola?.cuantas).toBe(0);
  });

  it('un obrador no trae barra, y un bar de tapas sí', async () => {
    const barra = await comoDuena<{ tipo: string }>(
      `select tipo::text as tipo from estook.categoria_de_partida
        where nombre = 'Bebidas con alcohol' order by tipo`,
    );
    const tipos = barra.map((f) => f.tipo);
    expect(tipos).toContain('bar_de_tapas');
    expect(tipos).not.toContain('obrador');
  });

  it('todas las categorías de serie existen en el catálogo de referencia', async () => {
    // Si no cuadraran, al copiar un producto del catálogo su categoría no
    // existiría en el local y el producto nacería sin ella. Es la razón de que
    // los nombres sean los mismos veintidós.
    const sueltas = await comoDuena<{ nombre: string }>(
      `select distinct cp.nombre
         from estook.categoria_de_partida cp
        where not exists (
          select 1 from estook.producto_de_referencia pr where pr.categoria = cp.nombre
        )`,
    );
    expect(sueltas).toEqual([]);
  });

  it('sembrar dos veces no duplica ni una', async () => {
    const local = await base.localPorCodigo('bar-centro');
    const antes = await cuantasCategorias(local);

    await comoDuena(`select estook.sembrar_categorias($1::uuid)`, [local]);

    expect(await cuantasCategorias(local)).toBe(antes);
  });

  it('y no devuelve una que se había desactivado', async () => {
    const local = await base.localPorCodigo('bar-centro');
    await comoDuena(
      `update estook.categoria_de_producto set activa = false
        where local_id = $1 and nombre = 'Conservas'`,
      [local],
    );

    await comoDuena(`select estook.sembrar_categorias($1::uuid)`, [local]);

    const [conservas] = await comoDuena<{ activa: boolean; cuantas: number }>(
      `select bool_or(activa) as activa, count(*)::int as cuantas
         from estook.categoria_de_producto
        where local_id = $1 and nombre = 'Conservas'`,
      [local],
    );
    // Sigue habiendo una sola, y sigue desactivada: quien la quitó tenía sus
    // motivos y sembrar no es rehacer.
    expect(conservas?.cuantas).toBe(1);
    expect(conservas?.activa).toBe(false);

    await comoDuena(
      `update estook.categoria_de_producto set activa = true
        where local_id = $1 and nombre = 'Conservas'`,
      [local],
    );
  });

  it('sembrar un local ajeno levanta un 42501, aunque la función lleve privilegio', async () => {
    // `sembrar_categorias` es `security definer`, así que las políticas no la
    // paran solas: la comprobación la hace ella. Sin esto, la única puerta de
    // atrás de M6 dejaría escribir en cualquier local del mundo.
    const rosa = await base.personaPorCorreo(ROSA);
    const ajeno = await base.localPorCodigo('bar-puerto');

    await expect(
      base.comoPersona(rosa, () =>
        base.bd.query(`select estook.sembrar_categorias($1::uuid)`, [ajeno]),
      ),
    ).rejects.toThrow();
  });
});

async function cuantasCategorias(local: string): Promise<number> {
  const [fila] = await comoDuena<{ cuantas: number }>(
    `select count(*)::int as cuantas from estook.categoria_de_producto where local_id = $1`,
    [local],
  );
  return fila?.cuantas ?? 0;
}

// ── El libro de movimientos ──────────────────────────────────────────────────

describe('el libro solo se añade', () => {
  it('el tipo de movimiento de la base y el del dominio dicen lo mismo', async () => {
    // Dos catálogos cerrados que describen la misma cosa. Si se separan, un
    // comando podría intentar apuntar un tipo que la base no conoce y el fallo
    // saldría en la cara de quien esté en la cocina.
    const enLaBase = await comoDuena<{ valor: string }>(
      `select unnest(enum_range(null::estook.tipo_de_movimiento))::text as valor`,
    );
    expect(enLaBase.map((f) => f.valor)).toEqual([...TIPOS_DE_MOVIMIENTO]);
  });

  it('estook_api no tiene concedido update sobre el libro', async () => {
    const [permiso] = await comoDuena<{ puede: boolean }>(
      `select has_table_privilege('estook_api', 'estook.movimiento_de_stock', 'UPDATE') as puede`,
    );
    expect(permiso?.puede).toBe(false);
  });

  it('y aunque lo tuviera, un disparador lo impide', async () => {
    // Segunda barrera, como la auditoría de M1: los permisos no aplican al dueño
    // de la tabla, y esto sí. Es lo que protege de un `update` lanzado desde una
    // migración distraída.
    const { productoId } = await unProductoDePrueba();
    await apunteDirecto(productoId, 'entrada', 1000, 200);

    await expect(
      base.bd.query(`update estook.movimiento_de_stock set cantidad = 1 where producto_id = $1`, [
        productoId,
      ]),
    ).rejects.toThrow(/solo se anade/i);
  });

  it('un movimiento de cero no se puede apuntar', async () => {
    const { productoId, localId } = await unProductoDePrueba();
    await expect(
      base.bd.query(
        `insert into estook.movimiento_de_stock
           (local_id, producto_id, tipo, cantidad, cantidad_despues, coste_medio_despues, fecha_operativa)
         values ($1, $2, 'entrada', 0, 0, 0, current_date)`,
        [localId, productoId],
      ),
    ).rejects.toThrow();
  });

  it('un ajuste sin motivo tampoco', async () => {
    // «Los ajustes a mano también son movimientos, **con autor y motivo**»
    // (principio 5). Un descuadre sin explicar no se puede investigar después.
    const { productoId, localId } = await unProductoDePrueba();
    await expect(
      base.bd.query(
        `insert into estook.movimiento_de_stock
           (local_id, producto_id, tipo, cantidad, cantidad_despues, coste_medio_despues, fecha_operativa)
         values ($1, $2, 'ajuste', -5, -5, 0, current_date)`,
        [localId, productoId],
      ),
    ).rejects.toThrow();
  });

  it('una línea de verdad no se puede borrar ni con permiso de inventario', async () => {
    const rosa = await base.personaPorCorreo(ROSA);
    const { productoId } = await unProductoDePrueba();
    await apunteDirecto(productoId, 'entrada', 500, 100);

    const borradas = await base.comoPersona(rosa, async () => {
      const { rows } = await base.bd.query<{ id: string }>(
        `delete from estook.movimiento_de_stock where producto_id = $1 returning id::text as id`,
        [productoId],
      );
      return rows;
    });

    // Cero borradas, y sin error: la política simplemente no ve ninguna fila
    // borrable. Lo que sale del libro es solo lo que nunca fue de verdad.
    expect(borradas).toEqual([]);
  });
});

// ── El stock es la última línea del libro ────────────────────────────────────

describe('el stock sale de los movimientos y de ningún otro sitio', () => {
  it('la vista de existencias devuelve la última línea, no una suma aparte', async () => {
    const { productoId } = await unProductoDePrueba();

    await apunteDirecto(productoId, 'entrada', 5000, 392);
    await apunteDirecto(productoId, 'salida', -1200, null);
    await apunteDirecto(productoId, 'entrada', 5000, 450);

    const [existencias] = await comoDuena<{ cantidad: string; coste: string; ultimo: string }>(
      `select cantidad::text as cantidad, coste_milesimas::text as coste,
              ultimo_movimiento_id::text as ultimo
         from estook.existencias where producto_id = $1`,
      [productoId],
    );

    const [ultima] = await comoDuena<{ id: string; cantidad_despues: string }>(
      `select id::text as id, cantidad_despues::text as cantidad_despues
         from estook.movimiento_de_stock
        where producto_id = $1 order by id desc limit 1`,
      [productoId],
    );

    expect(existencias?.ultimo).toBe(ultima?.id);
    expect(existencias?.cantidad).toBe(ultima?.cantidad_despues);
  });

  it('reconstruir el libro con el motor del dominio da exactamente lo mismo', async () => {
    // **El tercer criterio de terminado de M6**, comprobado de la única forma
    // que vale: contra las líneas que de verdad quedaron guardadas.
    const { productoId } = await unProductoDePrueba();

    await apunteDirecto(productoId, 'entrada', 5000, 392);
    await apunteDirecto(productoId, 'salida', -1200, null);
    await apunteDirecto(productoId, 'entrada', 5000, 450);
    await apunteDirecto(productoId, 'ajuste', -140, null, 'Cuadrando la cámara');
    await apunteDirecto(productoId, 'salida', -900, null);
    await apunteDirecto(productoId, 'entrada', 10000, 410);

    const guardados = await comoDuena<{
      tipo: string;
      cantidad: string;
      coste_milesimas: string | null;
      cantidad_despues: string;
      coste_medio_despues: string;
    }>(
      `select tipo::text as tipo, cantidad::text as cantidad,
              coste_milesimas::text as coste_milesimas,
              cantidad_despues::text as cantidad_despues,
              coste_medio_despues::text as coste_medio_despues
         from estook.movimiento_de_stock where producto_id = $1 order by id`,
      [productoId],
    );

    expect(guardados.length).toBe(6);

    const replicados = reconstruir(
      guardados.map((m): Movimiento => ({
        tipo: 'entrada',
        cantidad: cantidad(Number(m.cantidad)),
        coste: m.coste_milesimas === null ? null : milesimas(Number(m.coste_milesimas)),
      })),
    );

    for (const [i, guardado] of guardados.entries()) {
      expect(Number(guardado.cantidad_despues), `línea ${i + 1}`).toBe(replicados[i]?.cantidad);
      expect(Number(guardado.coste_medio_despues), `línea ${i + 1}`).toBe(replicados[i]?.coste);
    }
  });

  it('el stock negativo se permite y se apunta tal cual', async () => {
    // «El stock negativo se permite. Si el sistema dice que no queda género,
    //  deja de creerse el sistema» (Manifiesto 28).
    const { productoId } = await unProductoDePrueba();
    await apunteDirecto(productoId, 'entrada', 2, 500);
    await apunteDirecto(productoId, 'salida', -5, null);

    const [ahora] = await comoDuena<{ cantidad: string }>(
      `select cantidad::text as cantidad from estook.existencias where producto_id = $1`,
      [productoId],
    );
    expect(Number(ahora?.cantidad)).toBe(-3);
  });
});

// ── El precio, con su vigencia ───────────────────────────────────────────────

describe('los precios', () => {
  it('solo puede haber uno vigente por proveedor', async () => {
    const { productoId, localId } = await unProductoDePrueba();

    const [proveedor] = await comoDuena<{ id: string }>(
      `insert into estook.proveedor (local_id, nombre) values ($1, 'Makro de prueba')
       returning id`,
      [localId],
    );

    await ponPrecio(productoId, 6000, proveedor?.id ?? null);

    await expect(ponPrecio(productoId, 7000, proveedor?.id ?? null)).rejects.toThrow();
  });

  it('pero sí dos vigentes de dos proveedores distintos, que es lo que permite comparar', async () => {
    const { productoId, localId } = await unProductoDePrueba();

    const [uno] = await comoDuena<{ id: string }>(
      `insert into estook.proveedor (local_id, nombre) values ($1, 'Proveedor uno') returning id`,
      [localId],
    );
    const [otro] = await comoDuena<{ id: string }>(
      `insert into estook.proveedor (local_id, nombre) values ($1, 'Proveedor dos') returning id`,
      [localId],
    );

    await ponPrecio(productoId, 6000, uno?.id ?? null);
    await ponPrecio(productoId, 5400, otro?.id ?? null);

    const vivos = await comoDuena<{ cuantos: number }>(
      `select count(*)::int as cuantos from estook.precio_de_producto
        where producto_id = $1 and hasta is null`,
      [productoId],
    );
    expect(vivos[0]?.cuantos).toBe(2);
  });

  it('y solo uno vigente sin proveedor, que es lo que los nulos dejarían colar', async () => {
    // En Postgres los nulos son distintos entre sí, así que un único índice
    // sobre (producto, proveedor) no impediría dos precios vigentes sin
    // proveedor. Por eso hay dos índices y no uno.
    const { productoId } = await unProductoDePrueba();
    await ponPrecio(productoId, 6000, null);
    await expect(ponPrecio(productoId, 6500, null)).rejects.toThrow();
  });

  it('el precio vigente que se enseña es el del proveedor principal', async () => {
    const { productoId, localId } = await unProductoDePrueba();

    const [caro] = await comoDuena<{ id: string }>(
      `insert into estook.proveedor (local_id, nombre) values ($1, 'El caro') returning id`,
      [localId],
    );
    const [barato] = await comoDuena<{ id: string }>(
      `insert into estook.proveedor (local_id, nombre) values ($1, 'El barato') returning id`,
      [localId],
    );

    await ponPrecio(productoId, 9000, caro?.id ?? null);
    await ponPrecio(productoId, 4000, barato?.id ?? null);

    await comoDuena(`update estook.producto set proveedor_id = $1 where id = $2`, [
      caro?.id,
      productoId,
    ]);

    const [vigente] = await comoDuena<{ precio_centimos: string }>(
      `select precio_centimos::text as precio_centimos from estook.precio_vigente($1::uuid)`,
      [productoId],
    );

    // **No el más barato, a propósito**: se enseña lo que te cuesta, no lo que
    // te podría costar. Lo barato se ve en la comparativa, que es otra pregunta.
    expect(Number(vigente?.precio_centimos)).toBe(9000);
  });
});

// ── Permisos: quién ve qué ───────────────────────────────────────────────────

describe('quién ve el género y quién ve lo que cuesta', () => {
  it('el cocinero ve los productos de su local', async () => {
    const marcos = await base.personaPorCorreo(MARCOS);
    const { productoId } = await unProductoDePrueba();

    const vistos = await base.comoPersona(marcos, async () => {
      const { rows } = await base.bd.query<{ id: string }>(
        `select id from estook.producto where id = $1`,
        [productoId],
      );
      return rows;
    });

    expect(vistos).toHaveLength(1);
  });

  it('y NO ve ni una fila de precios', async () => {
    // «Un rol sin costes no recibe ni un campo de coste en ninguna respuesta»
    // (Auditoría, parte 8). Un cocinero lleva Inventario entera y no tiene
    // `dato.precio_de_compra`: aquí se cierra por filas, en la propia tabla.
    const marcos = await base.personaPorCorreo(MARCOS);
    const { productoId } = await unProductoDePrueba();
    await ponPrecio(productoId, 6000, null);

    const vistos = await base.comoPersona(marcos, async () => {
      const { rows } = await base.bd.query(
        `select id from estook.precio_de_producto where producto_id = $1`,
        [productoId],
      );
      return rows;
    });

    expect(vistos).toEqual([]);
  });

  it('pero sí ve el libro de movimientos: tiene que saber qué entró ayer', async () => {
    const marcos = await base.personaPorCorreo(MARCOS);
    const { productoId } = await unProductoDePrueba();
    await apunteDirecto(productoId, 'entrada', 1000, 300);

    const vistos = await base.comoPersona(marcos, async () => {
      const { rows } = await base.bd.query(
        `select id from estook.movimiento_de_stock where producto_id = $1`,
        [productoId],
      );
      return rows;
    });

    expect(vistos.length).toBeGreaterThan(0);
  });

  it('la camarera no puede crear un producto', async () => {
    // Sara es camarera: no tiene `app.inventario` de ninguna manera.
    const sara = await base.personaPorCorreo(SARA);
    const local = await base.localPorCodigo('bar-centro');

    await expect(
      base.comoPersona(sara, () =>
        base.bd.query(`insert into estook.producto (local_id, nombre) values ($1, 'Lo que sea')`, [
          local,
        ]),
      ),
    ).rejects.toThrow();
  });

  it('un local jamás ve el género de otro', async () => {
    // Principio 8, sobre las tablas nuevas de M6.
    const luis = await base.personaPorCorreo(LUIS);
    const { productoId } = await unProductoDePrueba(); // de Bar Centro

    const vistos = await base.comoPersona(luis, async () => {
      const { rows } = await base.bd.query(`select id from estook.producto where id = $1`, [
        productoId,
      ]);
      return rows;
    });

    expect(vistos).toEqual([]);
  });

  it('ni sus movimientos, ni por la vista de existencias', async () => {
    // La vista es el sitio donde esto se podría escapar: sin
    // `security_invoker` se ejecutaría con los permisos de su dueño y **se
    // saltaría la seguridad por filas entera**. Se comprueba aquí a propósito.
    const luis = await base.personaPorCorreo(LUIS);
    const { productoId } = await unProductoDePrueba();
    await apunteDirecto(productoId, 'entrada', 1000, 300);

    const vistos = await base.comoPersona(luis, async () => {
      const { rows } = await base.bd.query(
        `select * from estook.existencias where producto_id = $1`,
        [productoId],
      );
      return rows;
    });

    expect(vistos).toEqual([]);
  });

  it('y sin decir quién pregunta no se ve absolutamente nada', async () => {
    const { productoId } = await unProductoDePrueba();

    const vistos = await base.comoPersona(null, async () => {
      const { rows } = await base.bd.query(`select id from estook.producto where id = $1`, [
        productoId,
      ]);
      return rows;
    });

    expect(vistos).toEqual([]);
  });
});

// ── Seguridad por filas y funciones con privilegio ───────────────────────────

describe('las tablas nuevas y la única puerta de atrás', () => {
  it('las siete tablas de M6 tienen seguridad por filas', async () => {
    const filas = await comoDuena<{ relname: string; relrowsecurity: boolean }>(
      `select c.relname, c.relrowsecurity from pg_class c
        where c.relnamespace = 'estook'::regnamespace
          and c.relkind = 'r'
          and c.relname in (
            'proveedor','categoria_de_producto','categoria_de_partida','producto',
            'precio_de_producto','lote','movimiento_de_stock'
          )
        order by c.relname`,
    );

    expect(filas).toHaveLength(7);
    for (const fila of filas) {
      expect(fila.relrowsecurity, `${fila.relname} sin RLS`).toBe(true);
    }
  });

  it('la vista de existencias se ejecuta con los permisos de quien pregunta', async () => {
    const [vista] = await comoDuena<{ opciones: string[] | null }>(
      `select c.reloptions as opciones from pg_class c
        where c.relnamespace = 'estook'::regnamespace and c.relname = 'existencias'`,
    );
    expect(vista?.opciones ?? []).toContain('security_invoker=true');
  });

  it('M6 añade UNA función con privilegio, y ninguna más', async () => {
    // «Las once funciones `security definer` son la única puerta de atrás del
    //  sistema. Hay una prueba que las cuenta: **si un día son trece, que sea a
    //  propósito**» (ESTADO.md).
    //
    // Con M4 (once), la 0019 (una), M5 (tres) y M6 (una) son dieciséis. Esta
    // prueba las lista enteras: una que aparezca sin estar aquí la pone en rojo.
    const nombres = (
      await comoDuena<{ proname: string }>(
        `select p.proname from pg_proc p
          where p.pronamespace = 'estook'::regnamespace and p.prosecdef
          order by p.proname`,
      )
    ).map((f) => f.proname);

    expect(nombres).toEqual([
      'abrir_demostracion',
      'abrir_sesion',
      'anotar_intento_de_contrasena',
      'anotar_intento_de_pin',
      'cerrar_demostracion',
      'cerrar_sesiones_de',
      'credencial_para_entrar',
      'dar_de_alta_persona',
      'locales_visibles',
      'nivel_de_permiso',
      'nivel_de_permiso_en_organizacion',
      'organizaciones_visibles',
      'persona_por_correo',
      'personas_visibles',
      'pin_del_quiosco',
      'pines_para_entrar',
      'poner_credencial',
      'reconocer_dispositivo',
      'sembrar_categorias',
      'sesion_activa',
      'suscripcion_al_crear_organizacion',
      'tiene_como_volver_a_entrar',
    ]);
  });

  it('y `sembrar_categorias` no la puede ejecutar cualquiera', async () => {
    const [publico] = await comoDuena<{ puede: boolean }>(
      `select has_function_privilege('public', p.oid, 'execute') as puede
         from pg_proc p
        where p.pronamespace = 'estook'::regnamespace and p.proname = 'sembrar_categorias'`,
    );
    expect(publico?.puede).toBe(false);
  });

  it('el buscador universal ahora encuentra género, y sigue sin privilegio', async () => {
    const rosa = await base.personaPorCorreo(ROSA);
    const { productoId } = await unProductoDePrueba('Mantequilla de prueba');

    const encontrados = await base.comoPersona(rosa, async () => {
      const { rows } = await base.bd.query<{ tipo: string; id: string }>(
        `select tipo, id from estook.buscar('mantequilla', 20)`,
      );
      return rows;
    });

    expect(encontrados.some((f) => f.tipo === 'producto' && f.id === productoId)).toBe(true);

    const [buscar] = await comoDuena<{ prosecdef: boolean }>(
      `select p.prosecdef from pg_proc p
        where p.pronamespace = 'estook'::regnamespace and p.proname = 'buscar'`,
    );
    expect(buscar?.prosecdef).toBe(false);
  });

  it('y el buscador no enseña el género de otro local', async () => {
    const luis = await base.personaPorCorreo(LUIS);
    await unProductoDePrueba('Azafran del Centro');

    const encontrados = await base.comoPersona(luis, async () => {
      const { rows } = await base.bd.query<{ titulo: string }>(
        `select titulo from estook.buscar('azafran', 20)`,
      );
      return rows;
    });

    expect(encontrados.map((f) => f.titulo)).not.toContain('Azafran del Centro');
  });
});

// ── Ayudas ───────────────────────────────────────────────────────────────────

let cuantos = 0;

/** Un producto de Bar Centro, creado como dueña para no depender de permisos. */
async function unProductoDePrueba(
  nombre?: string,
): Promise<{ productoId: string; localId: string }> {
  cuantos += 1;
  const localId = await base.localPorCodigo('bar-centro');

  const [fila] = await comoDuena<{ id: string }>(
    `insert into estook.producto (local_id, nombre, formato, factor, unidad_de_uso, rendimiento)
     values ($1, $2, 'Caja de 5 kg', 5000, 'g', 0.9500)
     returning id`,
    [localId, nombre ?? `Producto de prueba ${cuantos}`],
  );

  const productoId = fila?.id;
  if (productoId === undefined) throw new Error('No se ha podido crear el producto de prueba');
  return { productoId, localId };
}

/**
 * Apunta una línea del libro replicando lo que hace la capa de aplicación.
 *
 * Se hace a mano y no llamando al comando porque estas pruebas son de base de
 * datos: lo que comprueban es que la tabla, sus restricciones y sus políticas
 * hacen su trabajo. Que el comando la use bien lo comprueban las pruebas de
 * extremo a extremo.
 */
async function apunteDirecto(
  productoId: string,
  tipo: string,
  cuanto: number,
  coste: number | null,
  motivo: string | null = null,
  esEjemplo = false,
): Promise<void> {
  const [anterior] = await comoDuena<{ cantidad: string; coste: string }>(
    `select cantidad_despues::text as cantidad, coste_medio_despues::text as coste
       from estook.movimiento_de_stock where producto_id = $1 order by id desc limit 1`,
    [productoId],
  );

  const antes = {
    cantidad: cantidad(Number(anterior?.cantidad ?? 0)),
    coste: milesimas(Number(anterior?.coste ?? 0)),
  };

  // El saldo lo calcula el motor del dominio, igual que hace la capa de
  // aplicación. Escribirlo aquí a mano haría que la prueba comprobara su propia
  // aritmética en vez de la de verdad, que es la trampa de E4.
  const nuevo = siguienteEstado(antes, {
    tipo: esTipoDeMovimiento(tipo) ? tipo : 'entrada',
    cantidad: cantidad(cuanto),
    coste: coste === null ? null : milesimas(coste),
  });

  await comoDuena(
    `insert into estook.movimiento_de_stock
       (local_id, producto_id, tipo, cantidad, coste_milesimas,
        cantidad_despues, coste_medio_despues, motivo, fecha_operativa, es_ejemplo)
     select p.local_id, p.id, $2::estook.tipo_de_movimiento, $3, $4, $5, $6, $7, current_date, $8
       from estook.producto p where p.id = $1`,
    [productoId, tipo, cuanto, coste, nuevo.cantidad, nuevo.coste, motivo, esEjemplo],
  );
}

async function ponPrecio(
  productoId: string,
  precio: number,
  proveedorId: string | null,
): Promise<void> {
  await comoDuena(
    `insert into estook.precio_de_producto
       (producto_id, proveedor_id, precio_centimos, formato, factor, unidad_de_uso,
        rendimiento, coste_milesimas, desde, origen)
     select p.id, $2::uuid, $3::bigint, p.formato, p.factor, p.unidad_de_uso, p.rendimiento,
            round($3::numeric * 1000 / (p.factor * p.rendimiento)), current_date, 'a_mano'
       from estook.producto p where p.id = $1`,
    [productoId, proveedorId, precio],
  );
}

// ── El botón de M5, con las tablas de M6 debajo ──────────────────────────────

describe('quitar los ejemplos se lleva el inventario de mentira', () => {
  /**
   * **Esta es la promesa de M5 que M6 tiene que cumplir sin tocar su código.**
   *
   * «Un solo botón, **Quitar los ejemplos**, los borra todos de golpe»
   * (Manifiesto 8). M5 construyó el registro, el botón y la regla de que no
   * cuentan, y dejó escrito que las filas las siembran M6, M9 y M10.
   *
   * Lo que aquí se comprueba es que el botón **se lleva también lo que cuelga**:
   * el precio, el lote y las líneas del libro. Y hay dos cosas que podrían
   * romperlo y por eso se mira:
   *
   *   · El libro de movimientos **no tiene política de borrado** para las líneas
   *     de verdad, a propósito. Si la de ejemplo tampoco funcionara, el botón se
   *     quedaría a medias sin decir nada.
   *   · `quitar_ejemplos` **no lleva privilegio**, así que borra con los permisos
   *     de quien pulsa. Si el gerente no pudiera, quedarían huérfanos.
   */
  it('se lleva el producto, su precio, su lote y sus movimientos', async () => {
    const rosa = await base.personaPorCorreo(ROSA);
    const { productoId, localId } = await unProductoDePrueba('Ejemplo que hay que borrar');

    const [org] = await comoDuena<{ organizacion_id: string }>(
      `select organizacion_id from estook.local where id = $1`,
      [localId],
    );

    // Se marca como ejemplo y se apunta en el registro de M5, que es exactamente
    // lo que hace `sembrarElInventario` en el servidor.
    await comoDuena(`update estook.producto set es_ejemplo = true where id = $1`, [productoId]);
    await comoDuena(
      `insert into estook.dato_de_ejemplo (organizacion_id, local_id, tabla, fila_id)
       values ($1, $2, 'producto', $3)`,
      [org?.organizacion_id, localId, productoId],
    );

    await ponPrecio(productoId, 4250, null);
    await comoDuena(
      `insert into estook.lote (local_id, producto_id, codigo, caduca_el, recibido_el, es_ejemplo)
       values ($1, $2, 'L-1', current_date + 5, current_date, true)`,
      [localId, productoId],
    );
    // La marca se pone **al apuntar**, no después: el libro no admite `update`,
    // y eso también vale para el dueño de la tabla.
    await apunteDirecto(productoId, 'entrada', 5000, 392, null, true);
    await apunteDirecto(productoId, 'salida', -1200, null, null, true);

    // Antes: está todo.
    expect(await cuantasHay('producto', productoId)).toBe(1);
    expect(await cuantasHay('precio_de_producto', productoId)).toBe(1);
    expect(await cuantasHay('lote', productoId)).toBe(1);
    expect(await cuantasHay('movimiento_de_stock', productoId)).toBe(2);

    // Y se pulsa el botón, **con los permisos de quien lo pulsa**.
    const borradas = await base.comoPersona(rosa, async () => {
      const { rows } = await base.bd.query<{ quitar_ejemplos: number }>(
        `select estook.quitar_ejemplos($1) as quitar_ejemplos`,
        [localId],
      );
      return rows[0]?.quitar_ejemplos ?? 0;
    });

    expect(borradas).toBeGreaterThan(0);

    // Después: no queda nada, **ni colgando**.
    expect(await cuantasHay('producto', productoId)).toBe(0);
    expect(await cuantasHay('precio_de_producto', productoId)).toBe(0);
    expect(await cuantasHay('lote', productoId)).toBe(0);
    expect(await cuantasHay('movimiento_de_stock', productoId)).toBe(0);

    // Y el apunte del registro se va con él: si se quedara, la tarjeta del Panel
    // seguiría ofreciendo borrar algo que ya no existe.
    const [apuntes] = await comoDuena<{ cuantos: number }>(
      `select count(*)::int as cuantos from estook.dato_de_ejemplo where fila_id = $1`,
      [productoId],
    );
    expect(apuntes?.cuantos).toBe(0);
  });

  it('y no se lleva por delante el género de verdad', async () => {
    // Lo contrario también importa: el botón borra lo apuntado, y **nada más**.
    const rosa = await base.personaPorCorreo(ROSA);
    const { productoId, localId } = await unProductoDePrueba('Genero de verdad que se queda');
    await apunteDirecto(productoId, 'entrada', 1000, 300);

    await base.comoPersona(rosa, () =>
      base.bd.query(`select estook.quitar_ejemplos($1)`, [localId]),
    );

    expect(await cuantasHay('producto', productoId)).toBe(1);
    expect(await cuantasHay('movimiento_de_stock', productoId)).toBe(1);
  });
});

/** Cuántas filas de una tabla apuntan a ese producto. Se lee como dueña. */
async function cuantasHay(tabla: string, productoId: string): Promise<number> {
  const columna = tabla === 'producto' ? 'id' : 'producto_id';
  const [fila] = await comoDuena<{ cuantas: number }>(
    `select count(*)::int as cuantas from estook.${tabla} where ${columna} = $1`,
    [productoId],
  );
  return fila?.cuantas ?? 0;
}
