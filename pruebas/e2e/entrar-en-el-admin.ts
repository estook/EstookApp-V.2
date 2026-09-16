import { createHmac } from 'node:crypto';
import { expect, type Page } from '@playwright/test';
import {
  ADMIN_DE_EJEMPLO,
  CLAVE_DE_EJEMPLO,
  SECRETO_DEL_ADMIN_DE_EJEMPLO,
} from '../../base-de-datos/semillas/claves-de-ejemplo.ts';

/**
 * Entrar en el admin como lo hace una persona (0041).
 *
 * Desde la puerta del admin, **todo** lo del admin va detrás del segundo factor,
 * incluido el catálogo del sistema de diseño. Así que las pruebas de pantalla del
 * admin entran igual que Ricardo: correo, contraseña y el código de su aplicación,
 * que aquí se calcula con el secreto de la semilla.
 *
 * El correo, la contraseña y el secreto se importan de la semilla, que es su
 * único dueño: copiados aquí, un día dejarían de coincidir.
 */
export const ADMIN = 'http://localhost:5176/';

export async function entrarEnElAdmin(page: Page): Promise<void> {
  await page.goto(ADMIN, { waitUntil: 'domcontentloaded' });
  await page.getByLabel('Tu correo').fill(ADMIN_DE_EJEMPLO);
  await page.getByLabel('Tu contraseña').fill(CLAVE_DE_EJEMPLO);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();

  await expect(page.getByRole('heading', { name: 'Tu código de seis dígitos' })).toBeVisible();
  await page.getByLabel('Código').fill(codigoAhora(SECRETO_DEL_ADMIN_DE_EJEMPLO));
  await page.getByRole('button', { name: 'Continuar' }).click();

  await expect(page.getByRole('heading', { level: 1, name: 'Administradores' })).toBeVisible();
}

// ── El código de seis dígitos, como lo calcula una aplicación de autenticación ─

function deBase32(texto: string): Buffer {
  const ALFABETO = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const limpio = texto.toUpperCase().replace(/[^A-Z2-7]/g, '');

  let bits = 0;
  let valor = 0;
  const bytes: number[] = [];

  for (const letra of limpio) {
    valor = (valor << 5) | ALFABETO.indexOf(letra);
    bits += 5;
    if (bits >= 8) {
      bytes.push((valor >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

export function codigoAhora(secreto: string = SECRETO_DEL_ADMIN_DE_EJEMPLO): string {
  const tramo = Math.floor(Date.now() / 1000 / 30);

  const contador = Buffer.alloc(8);
  contador.writeUInt32BE(Math.floor(tramo / 2 ** 32), 0);
  contador.writeUInt32BE(tramo >>> 0, 4);

  const firma = createHmac('sha1', deBase32(secreto)).update(contador).digest();
  const desde = (firma[19] ?? 0) & 15;
  const numero =
    (((firma[desde] ?? 0) & 127) << 24) |
    (((firma[desde + 1] ?? 0) & 255) << 16) |
    (((firma[desde + 2] ?? 0) & 255) << 8) |
    ((firma[desde + 3] ?? 0) & 255);

  return String(numero % 1_000_000).padStart(6, '0');
}
