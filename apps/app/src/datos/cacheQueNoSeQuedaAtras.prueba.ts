import { describe, expect, it } from 'vitest';
import { QueryClient, QueryObserver } from '@tanstack/react-query';
import { CacheQueNoSeQuedaAtras } from './cacheQueNoSeQuedaAtras.ts';

/**
 * Lo que se guarda mientras una pantalla aún lee por primera vez (0085): la lectura de
 * antes del cambio no puede ser lo que se quede a la vista.
 */
async function loQueSeQueda(cache: QueryClient): Promise<string | undefined> {
  let veces = 0;
  const soltar: (() => void)[] = [];
  const observador = new QueryObserver<string>(cache, {
    queryKey: ['el_tablon'],
    queryFn: () =>
      new Promise<string>((listo) => {
        veces += 1;
        const cual = veces === 1 ? 'antes del cambio' : 'después del cambio';
        soltar.push(() => {
          listo(cual);
        });
      }),
  });
  const quitar = observador.subscribe(() => undefined);

  // La primera lectura va de camino, y en ese momento se guarda algo y se pide ponerlo al día.
  await new Promise((listo) => setTimeout(listo, 0));
  const alDia = cache.invalidateQueries({ queryKey: ['el_tablon'] });
  await new Promise((listo) => setTimeout(listo, 0));
  // La primera vuelve tarde, con lo de antes; si hubo otra, vuelve con lo de después.
  for (const suelta of soltar) suelta();
  await alDia;
  await new Promise((listo) => setTimeout(listo, 0));
  quitar();
  return cache.getQueryData<string>(['el_tablon']);
}

describe('poner al día lo que todavía se está leyendo', () => {
  it('con la caché de siempre, se queda lo de antes del cambio (el fallo)', async () => {
    expect(await loQueSeQueda(new QueryClient())).toBe('antes del cambio');
  });

  it('con la de Estook, se vuelve a pedir y se queda lo de después', async () => {
    expect(await loQueSeQueda(new CacheQueNoSeQuedaAtras())).toBe('después del cambio');
  });
});
