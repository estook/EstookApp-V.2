import { expect, type Locator, type Page } from '@playwright/test';

/**
 * **Abrir una sección en Ajustes del TPV › Productos y precios** (R3, 0133): la lista de
 * secciones a la izquierda y la que se toca a la derecha. En el móvil, con una sección ya
 * abierta, la lista no se ve: se vuelve con «Secciones» y se toca la otra.
 */
export async function laSeccion(page: Page, nombre: string): Promise<Locator> {
  const volver = page.getByRole('button', { name: 'Secciones', exact: true });
  if (await volver.isVisible()) await volver.click();
  await page.getByRole('button', { name: new RegExp(`^${nombre}: `) }).click({ timeout: 15_000 });
  const seccion = page.getByRole('region', { name: `Sección ${nombre}` });
  await expect(seccion).toBeVisible({ timeout: 15_000 });
  return seccion;
}
