import { expect, type Page } from '@playwright/test';

/**
 * **La puerta de Estook TPV** (el rediseño, 0148): la caja y el comandero compartido enseñan
 * botones (Entrar, Tickets, la caja) y el teclado sale al tocar uno, o al teclear en el PC; el
 * móvil de un camarero, que es suyo, sigue con el teclado a la vista. Esto reconoce la puerta en
 * los dos casos, para esperar a que esté antes de teclear el PIN.
 */
export const LA_PUERTA = /^(Teclea tu PIN|Entrar)$/;

/**
 * **Fichar, Ajustes y Bloquear**: arriba en la tablet y el PC; **en el móvil de la sala, dentro de
 * «Tú»**, en la barra de abajo (el rediseño, entrega 2 · 2, 0148). Lo toca donde esté, con el mismo
 * nombre en los dos sitios.
 */
export async function tocarEnElTpv(page: Page, nombre: string | RegExp): Promise<void> {
  const como = typeof nombre === 'string' ? { name: nombre, exact: true } : { name: nombre };
  const arriba = page.getByRole('banner').getByRole('button', como);
  await expect(page.getByRole('banner')).toBeVisible({ timeout: 15_000 });
  if (await arriba.isVisible()) {
    await arriba.click();
    return;
  }
  await page.getByRole('navigation', { name: 'Abajo' }).getByRole('button', { name: 'Tú' }).click();
  await page.getByRole('dialog', { name: 'Tú' }).getByRole('button', como).click();
}
