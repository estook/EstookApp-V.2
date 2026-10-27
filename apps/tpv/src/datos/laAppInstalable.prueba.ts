import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * **Estook y Estook TPV son dos apps instalables distintas** (27-oct). El navegador las
 * distingue por el `id` del manifiesto, y lo resuelve **contra el dominio**, no contra la
 * carpeta: con `"id": "./"` en las dos, las dos eran `https://estook.com/` y Chrome las tomaba
 * por la misma. Al poner Estook TPV en el escritorio pedía «actualizar» y se quedaba en
 * `/app/` (Richi, 27-oct).
 *
 * **Estook no cambia el suyo**: es el de los móviles donde ya está instalada desde el 1-oct, y
 * cambiarlo la haría otra app distinta.
 */
const DOMINIO = 'https://estook.com';

function laIdentidad(app: 'app' | 'tpv'): string {
  const manifiesto = JSON.parse(
    readFileSync(new URL(`../../../${app}/public/manifest.webmanifest`, import.meta.url), 'utf8'),
  ) as { id: string; start_url: string };
  // Como lo hace el navegador (la norma del manifiesto, «id member»): el inicio, contra donde
  // vive el manifiesto; el id, contra el dominio del inicio.
  const inicio = new URL(manifiesto.start_url, `${DOMINIO}/${app}/manifest.webmanifest`);
  return new URL(manifiesto.id, inicio.origin).href;
}

describe('cada app, con su identidad', () => {
  it('Estook sigue siendo la de siempre, y Estook TPV es otra', () => {
    expect(laIdentidad('app')).toBe(`${DOMINIO}/`);
    expect(laIdentidad('tpv')).toBe(`${DOMINIO}/tpv/`);
  });
});
