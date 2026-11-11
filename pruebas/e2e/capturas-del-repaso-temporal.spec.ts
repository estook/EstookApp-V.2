import { expect, test, type Page } from '@playwright/test';
import { abrirSinQueSeCaiga } from './abrir.ts';
import {
  APP,
  ejecutarEnLaApi,
  entrarEnLaApp,
  irA,
  tokenDe,
  type TemaDePrueba,
} from './en-la-app.ts';

/**
 * TEMPORAL: las capturas del repaso antes de M9, para mirarlas. Se borra antes de subir.
 */
const ROSA = 'rosa@ejemplo.estook.com';
const SALIDA = process.env['CAPTURAS_DEL_REPASO'] ?? 'capturas-del-repaso';

async function foto(page: Page, nombre: string, proyecto: string, tema: TemaDePrueba) {
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${SALIDA}/${nombre}-${proyecto}-${tema}.png` });
}

for (const tema of ['claro', 'oscuro'] as const) {
  test(`capturas del repaso · ${tema}`, async ({ page, request }, info) => {
    test.slow();
    const proyecto = info.project.name;
    const movil = (page.viewportSize()?.width ?? 0) < 1024;
    const token = await tokenDe(request, ROSA);

    await entrarEnLaApp(page, ROSA, tema);

    // 1 · El chat con el teclado del iPhone (en el móvil).
    if (movil) {
      await irA(page, 'chat');
      await page.getByRole('button', { name: /^Todo el equipo/ }).click();
      const caja = page
        .getByRole('region', { name: 'Conversación' })
        .getByRole('textbox', { name: 'Escribe un mensaje' });
      await expect(caja).toBeVisible();
      const alto = page.viewportSize()?.height ?? 0;
      await page.evaluate(
        ([desde, cuanto]) => {
          const visor = window.visualViewport;
          if (!visor) return;
          Object.defineProperty(visor, 'offsetTop', { configurable: true, get: () => desde });
          Object.defineProperty(visor, 'height', { configurable: true, get: () => cuanto });
          Object.defineProperty(window, 'innerHeight', { configurable: true, get: () => cuanto });
        },
        [0, alto - 300] as const,
      );
      await caja.click();
      await caja.fill('¿Viene el pescado a las nueve?');
      await foto(page, '1-chat-con-teclado', proyecto, tema);
      await caja.fill('');
      await page.evaluate(() => {
        (document.activeElement as HTMLElement | null)?.blur();
      });
    }

    // 2 · Productos → Valor, sin las vistas vacías.
    await abrirSinQueSeCaiga(page, `${APP}#/almacen/productos/valor`);
    await expect(page.getByText('Lo que vale hoy tu almacén')).toBeVisible();
    await foto(page, '2-productos-valor', proyecto, tema);

    // 3 · Un lote congelado: su línea y la hoja de sacarlo.
    const nombre = `Bacon congelado ${String(Date.now()).slice(-5)}`;
    const creado = await ejecutarEnLaApi<{ productoId: string }>(request, token, 'crear_producto', {
      nombre,
      factor: 1,
      unidad_de_uso: 'kg',
      precio_centimos: 900,
      cantidad_inicial: 4,
    });
    await ejecutarEnLaApi(request, token, 'congelar', {
      producto_id: creado.productoId,
      cuanto: 2,
    });
    await abrirSinQueSeCaiga(page, `${APP}#/almacen/productos/todo?producto=${creado.productoId}`);
    const ficha = page.getByRole('dialog', { name: nombre });
    await expect(ficha.getByText(/^Congelado el /)).toBeVisible();
    await ficha.getByText(/^Congelado el /).scrollIntoViewIfNeeded();
    await foto(page, '3-lote-congelado', proyecto, tema);
    await ficha.getByRole('button', { name: 'Sacar', exact: true }).click();
    const sacar = page.getByRole('dialog', { name: `Sacar ${nombre} del congelador` });
    await sacar.getByRole('radio', { name: /^Descongelar/ }).click();
    await foto(page, '4-sacar-del-congelador', proyecto, tema);

    // 4 · Equipo → Resumen, con el horario de la semana; y Calendario → Turnos.
    await abrirSinQueSeCaiga(page, `${APP}#/equipo/resumen`);
    await expect(page.getByRole('link', { name: 'Horario de la semana' })).toBeVisible();
    await foto(page, '5-equipo-resumen', proyecto, tema);
    await abrirSinQueSeCaiga(page, `${APP}#/calendario/turnos`);
    await expect(page.getByRole('heading', { name: 'Turnos', level: 1 })).toBeVisible();
    await foto(page, '6-calendario-turnos', proyecto, tema);
  });
}
