import { describe, expect, it } from 'vitest';
import { almacenDeSupabase, claveDeLaFoto } from './almacen.ts';

/**
 * Firmar muchas fotos de una vez contra Supabase (entrega V, punto 5).
 *
 * Una lista de cincuenta productos no puede costar cincuenta viajes al almacén.
 * Supabase firma una tanda por cubo en una petición; lo que se prueba es lo que
 * hacemos nosotros alrededor: agrupar por cubo, volver a poner el cubo delante de
 * cada camino, y **no romper la lista** si el almacén falla.
 *
 * No hay red: `pedir` es un Supabase de mentira que apunta lo que le piden y
 * contesta como lo hace el de verdad (`POST /object/sign/{cubo}`).
 */
function supabaseDeMentira(contestar: (cubo: string, caminos: string[]) => Response) {
  const pedidas: { cubo: string; caminos: string[] }[] = [];
  const pedir = ((direccion: string, opciones?: { body?: string }) => {
    const cubo = direccion.split('/object/sign/')[1] ?? '';
    const caminos = (JSON.parse(opciones?.body ?? '{}') as { paths?: string[] }).paths ?? [];
    pedidas.push({ cubo, caminos });
    return Promise.resolve(contestar(cubo, caminos));
  }) as unknown as typeof fetch;

  const almacen = almacenDeSupabase({
    url: 'https://proyecto.supabase.co',
    clave: 'clave-de-servicio',
    pedir,
  });
  if (almacen === null) throw new Error('Con url y clave tiene que haber almacén');
  return { almacen, pedidas };
}

describe('firmar fotos en tanda', () => {
  it('una sola petición por cubo, y cada enlace vuelve a su clave', async () => {
    const { almacen, pedidas } = supabaseDeMentira((cubo, caminos) =>
      Response.json(
        caminos.map((camino) => ({
          path: camino,
          signedURL: `/object/sign/${cubo}/${camino}?token=t`,
          error: null,
        })),
      ),
    );

    const ahora = new Date(Date.UTC(2026, 8, 24));
    const a = claveDeLaFoto('local', 'p1', 'miniatura', 'webp', ahora);
    const b = claveDeLaFoto('local', 'p2', 'miniatura', 'webp', ahora);

    const enlaces = await almacen.enlaces([a, b, a], 3600);

    expect(pedidas).toHaveLength(1);
    expect(pedidas[0]?.cubo).toBe('fotos-de-producto');
    // Sin repetir la que venía dos veces, y sin el cubo delante: así lo pide Supabase.
    expect(pedidas[0]?.caminos).toEqual([
      a.replace('fotos-de-producto/', ''),
      b.replace('fotos-de-producto/', ''),
    ]);
    expect(enlaces.get(a)).toBe(`https://proyecto.supabase.co/storage/v1/object/sign/${a}?token=t`);
    expect(enlaces.get(b)).toMatch(/\/p2\/miniatura-/);
  });

  it('si el almacén falla, vuelve vacío y no lanza: la lista sale con las iniciales', async () => {
    const { almacen } = supabaseDeMentira(() => new Response('caído', { status: 503 }));
    const enlaces = await almacen.enlaces(['fotos-de-producto/l/p/miniatura-1.webp'], 3600);
    expect(enlaces.size).toBe(0);
  });

  it('la que Supabase no ha podido firmar no sale, y las demás sí', async () => {
    const { almacen } = supabaseDeMentira((cubo, caminos) =>
      Response.json(
        caminos.map((camino, i) =>
          i === 0
            ? { path: camino, signedURL: null, error: 'Either the object does not exist' }
            : { path: camino, signedURL: `/object/sign/${cubo}/${camino}?token=t`, error: null },
        ),
      ),
    );
    const enlaces = await almacen.enlaces(
      ['fotos-de-producto/l/p1/miniatura-1.webp', 'fotos-de-producto/l/p2/miniatura-1.webp'],
      3600,
    );
    expect([...enlaces.keys()]).toEqual(['fotos-de-producto/l/p2/miniatura-1.webp']);
  });

  it('la clave lleva el local, el producto y la hora, para que el navegador no enseñe la vieja', () => {
    const clave = claveDeLaFoto('L', 'P', 'foto', 'jpg', new Date(1_700_000_000_000));
    expect(clave).toBe('fotos-de-producto/L/P/foto-1700000000000.jpg');
  });
});
