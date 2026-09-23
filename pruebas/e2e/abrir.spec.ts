import { expect, test, type Page } from '@playwright/test';
import { abrirSinQueSeCaiga } from './abrir.ts';

/**
 * `abrirSinQueSeCaiga` repite **solo** cuando Safari se cae por dentro, o cuando la
 * página se estaba moviendo sola a su primera pestaña.
 *
 * **No necesita navegador**, y por eso va en `SIN_PANTALLA`: lo que se prueba es la
 * regla del ayudante —ese error se repite una vez; cualquier otro, no— con una página
 * de mentira que falla como se le diga. Probarlo con un Safari de verdad obligaría a
 * esperar a que se cayera solo, que es justo lo que no se puede provocar.
 *
 * Existe para que el ayudante no se convierta en un «reintentar hasta que pase»: si
 * un día tapara un fallo de la aplicación, esta prueba lo diría.
 */
function paginaQueFalla(...fallos: (string | null)[]): { page: Page; veces: () => number } {
  let veces = 0;
  const page = {
    goto: () => {
      const fallo = fallos[veces];
      veces += 1;
      return fallo === null || fallo === undefined
        ? Promise.resolve(null)
        : Promise.reject(new Error(fallo));
    },
  } as unknown as Page;
  return { page, veces: () => veces };
}

test('si Safari se cae por dentro, se vuelve a abrir una vez', async () => {
  const { page, veces } = paginaQueFalla('page.goto: WebKit encountered an internal error', null);
  await abrirSinQueSeCaiga(page, 'http://localhost:5174/');
  expect(veces()).toBe(2);
});

test('si la página se estaba moviendo sola a su pestaña, se vuelve a abrir una vez', async () => {
  const { page, veces } = paginaQueFalla(
    'page.goto: Navigation to "http://localhost:5174/#/cuaderno" is interrupted by another navigation to "http://localhost:5174/app/#/negocio/ventas"',
    null,
  );
  await abrirSinQueSeCaiga(page, 'http://localhost:5174/#/cuaderno');
  expect(veces()).toBe(2);
});

test('y si se interrumpe dos veces seguidas, tampoco se tapa', async () => {
  const interrumpida = 'page.goto: Navigation to "x" is interrupted by another navigation to "y"';
  const { page, veces } = paginaQueFalla(interrumpida, interrumpida);
  await expect(abrirSinQueSeCaiga(page, 'http://localhost:5174/')).rejects.toThrow(/interrupted/);
  expect(veces()).toBe(2);
});

test('cualquier otro fallo rompe la prueba, sin repetir', async () => {
  const { page, veces } = paginaQueFalla('page.goto: net::ERR_CONNECTION_REFUSED');
  await expect(abrirSinQueSeCaiga(page, 'http://localhost:5174/')).rejects.toThrow(
    /ERR_CONNECTION_REFUSED/,
  );
  expect(veces()).toBe(1);
});

test('y si Safari se cae dos veces seguidas, tampoco se tapa', async () => {
  const caida = 'page.goto: WebKit encountered an internal error';
  const { page, veces } = paginaQueFalla(caida, caida);
  await expect(abrirSinQueSeCaiga(page, 'http://localhost:5174/')).rejects.toThrow(
    /internal error/,
  );
  expect(veces()).toBe(2);
});
