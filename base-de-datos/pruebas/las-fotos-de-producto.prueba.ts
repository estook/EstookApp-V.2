import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { almacenEnMemoria } from '../../servidor/infraestructura/almacen.ts';
import { levantarBase, type BaseDePrueba } from './entorno.ts';
import { elFallo, losDatos, montarLaApi, type ApiDePrueba } from './despachador.ts';

/**
 * La foto de cada producto (entrega V, punto 5), llamando a la API a pelo.
 *
 * Lo que la pantalla no puede garantizar, y por eso se prueba aquí (regla 4):
 *
 *   · que **lo viejo se borra** al cambiar o quitar la foto, y el almacén no se
 *     llena de fotos que ya no nombra nadie;
 *   · que **decide la política de la tabla**: un cocinero pone la foto de lo de su
 *     cocina y no la de la barra, y la gestoría no pone ninguna;
 *   · que **lo que llega es una foto**, y no cualquier cosa con su nombre;
 *   · y que la lista y la ficha traen **su enlace**, firmado de una tanda.
 */
let base: BaseDePrueba;
let api: ApiDePrueba;
const almacen = almacenEnMemoria();
let rosa: string;
let marcos: string;
let sara: string;

/** Lo mínimo que empieza como un JPG y como un WebP de verdad: su firma. */
const JPG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4, 5, 6, 7, 8]).toString('base64');
const WEBP = Buffer.concat([
  Buffer.from('RIFF'),
  Buffer.from([20, 0, 0, 0]),
  Buffer.from('WEBPVP8 '),
  Buffer.from([1, 2, 3, 4]),
]).toString('base64');

const fotosDe = (productoId: string) =>
  almacen.claves().filter((clave) => clave.includes(`/${productoId}/`));

async function unProductoDe(token: string, nombre: string, zona = 'cocina'): Promise<string> {
  return losDatos<{ productoId: string }>(
    await api.ejecutar(token, 'crear_producto', {
      nombre,
      unidad_de_uso: 'ud',
      zona,
      cantidad_inicial: 3,
    }),
  ).productoId;
}

beforeAll(async () => {
  base = await levantarBase();
  api = montarLaApi(base.bd, { almacen });
  rosa = await api.entrar('rosa@ejemplo.estook.com');
  marcos = await api.entrar('marcos@ejemplo.estook.com');
  sara = await api.entrar('sara@ejemplo.estook.com');
}, 120_000);

afterAll(async () => {
  await base.cerrar();
});

describe('la foto de un producto', () => {
  it('se pone, sale en la ficha y en la lista, y al cambiarla la vieja se borra', async () => {
    const productoId = await unProductoDe(rosa, 'Tomate de la foto');

    losDatos(
      await api.ejecutar(rosa, 'poner_foto_de_producto', {
        producto_id: productoId,
        tipo: 'image/webp',
        foto: WEBP,
        miniatura: WEBP,
      }),
    );
    const primeras = fotosDe(productoId);
    expect(primeras).toHaveLength(2);
    expect(primeras.every((c) => c.startsWith('fotos-de-producto/'))).toBe(true);

    // La ficha trae la grande y la miniatura; la lista, la miniatura.
    const ficha = losDatos<{ foto: string | null; producto: { miniatura?: string | null } }>(
      await api.consultar(rosa, 'un_producto', { producto_id: productoId }),
    );
    expect(ficha.foto).toMatch(/^data:image\/webp;base64,/);
    expect(ficha.producto.miniatura).toMatch(/^data:image\/webp;base64,/);

    const lista = losDatos<{ productos: { id: string; miniatura?: string | null }[] }>(
      await api.consultar(rosa, 'mis_productos', { texto: 'Tomate de la foto' }),
    );
    expect(lista.productos.find((p) => p.id === productoId)?.miniatura).toMatch(/^data:image/);

    // Cambiarla: dos ficheros nuevos, y los dos de antes ya no están.
    await new Promise((listo) => setTimeout(listo, 5));
    losDatos(
      await api.ejecutar(rosa, 'poner_foto_de_producto', {
        producto_id: productoId,
        tipo: 'image/jpeg',
        foto: JPG,
        miniatura: JPG,
      }),
    );
    const segundas = fotosDe(productoId);
    expect(segundas).toHaveLength(2);
    expect(segundas.some((c) => primeras.includes(c))).toBe(false);
    expect(segundas.every((c) => c.endsWith('.jpg'))).toBe(true);
  });

  it('al quitarla no queda nada en el almacén, y la ficha vuelve a no tenerla', async () => {
    const productoId = await unProductoDe(rosa, 'Pimiento de la foto');
    losDatos(
      await api.ejecutar(rosa, 'poner_foto_de_producto', {
        producto_id: productoId,
        tipo: 'image/jpeg',
        foto: JPG,
        miniatura: JPG,
      }),
    );

    const quitada = losDatos<{ quitada: boolean }>(
      await api.ejecutar(rosa, 'quitar_foto_de_producto', { producto_id: productoId }),
    );
    expect(quitada.quitada).toBe(true);
    expect(fotosDe(productoId)).toEqual([]);

    const ficha = losDatos<{ foto: string | null; producto: { miniatura?: string | null } }>(
      await api.consultar(rosa, 'un_producto', { producto_id: productoId }),
    );
    expect(ficha.foto).toBeNull();
    expect(ficha.producto.miniatura).toBeNull();

    // Quitar la que no hay no es un error: ya está como se quería.
    const otraVez = losDatos<{ quitada: boolean }>(
      await api.ejecutar(rosa, 'quitar_foto_de_producto', { producto_id: productoId }),
    );
    expect(otraVez.quitada).toBe(false);
  });

  it('lo que no es una foto no entra, aunque diga que lo es', async () => {
    const productoId = await unProductoDe(rosa, 'Cebolla de la foto');
    const hola = Buffer.from('hola, esto no es una foto').toString('base64');

    expect(
      elFallo(
        await api.ejecutar(rosa, 'poner_foto_de_producto', {
          producto_id: productoId,
          tipo: 'image/webp',
          foto: hola,
          miniatura: hola,
        }),
      ),
    ).toBe('faltan_datos');

    // Ni un PNG, que es otro tipo: una foto en PNG pesa diez veces más.
    expect(
      elFallo(
        await api.ejecutar(rosa, 'poner_foto_de_producto', {
          producto_id: productoId,
          tipo: 'image/png',
          foto: JPG,
          miniatura: JPG,
        }),
      ),
    ).toBe('faltan_datos');

    // Ni una foto de medio mega, que el móvil tenía que haber reducido.
    const enorme = Buffer.concat([
      Buffer.from([0xff, 0xd8, 0xff]),
      Buffer.alloc(420 * 1024),
    ]).toString('base64');
    expect(
      elFallo(
        await api.ejecutar(rosa, 'poner_foto_de_producto', {
          producto_id: productoId,
          tipo: 'image/jpeg',
          foto: enorme,
          miniatura: JPG,
        }),
      ),
    ).toBe('faltan_datos');

    expect(fotosDe(productoId)).toEqual([]);
  });

  it('decide la política: el cocinero, lo de su cocina sí y lo de la barra no', async () => {
    const deLaCocina = await unProductoDe(rosa, 'Harina de la foto', 'cocina');
    const deLaBarra = await unProductoDe(rosa, 'Tónica de la foto', 'sala');

    losDatos(
      await api.ejecutar(marcos, 'poner_foto_de_producto', {
        producto_id: deLaCocina,
        tipo: 'image/jpeg',
        foto: JPG,
        miniatura: JPG,
      }),
    );
    expect(fotosDe(deLaCocina)).toHaveLength(2);

    expect(
      elFallo(
        await api.ejecutar(marcos, 'poner_foto_de_producto', {
          producto_id: deLaBarra,
          tipo: 'image/jpeg',
          foto: JPG,
          miniatura: JPG,
        }),
      ),
    ).toBe('no_existe');
    expect(fotosDe(deLaBarra)).toEqual([]);

    // Y quien no lleva Almacén, ninguna: lo para la puerta antes de llegar.
    expect(
      elFallo(
        await api.ejecutar(sara, 'poner_foto_de_producto', {
          producto_id: deLaCocina,
          tipo: 'image/jpeg',
          foto: JPG,
          miniatura: JPG,
        }),
      ),
    ).toBe('sin_permiso');
  });

  it('un producto de otro negocio contesta que no existe, y no sube nada', async () => {
    const elena = await api.entrar('elena@ejemplo.estook.com');
    const deRosa = await unProductoDe(rosa, 'Ajo de la foto');

    expect(
      elFallo(
        await api.ejecutar(elena, 'poner_foto_de_producto', {
          producto_id: deRosa,
          tipo: 'image/jpeg',
          foto: JPG,
          miniatura: JPG,
        }),
      ),
    ).toMatch(/no_existe|faltan_datos/);
    expect(fotosDe(deRosa)).toEqual([]);
  });

  it('sin almacén lo dice claro, y el producto sigue igual', async () => {
    const sinAlmacen = montarLaApi(base.bd);
    const suyo = await sinAlmacen.entrar('rosa@ejemplo.estook.com');
    const productoId = losDatos<{ productoId: string }>(
      await sinAlmacen.ejecutar(suyo, 'crear_producto', {
        nombre: 'Laurel sin almacén',
        unidad_de_uso: 'ud',
        zona: 'cocina',
      }),
    ).productoId;

    expect(
      elFallo(
        await sinAlmacen.ejecutar(suyo, 'poner_foto_de_producto', {
          producto_id: productoId,
          tipo: 'image/jpeg',
          foto: JPG,
          miniatura: JPG,
        }),
      ),
    ).toBe('fallo_nuestro');

    // Y la ficha se lee igual, sin foto y sin romperse.
    const ficha = losDatos<{ foto: string | null }>(
      await sinAlmacen.consultar(suyo, 'un_producto', { producto_id: productoId }),
    );
    expect(ficha.foto).toBeNull();
  });
});
