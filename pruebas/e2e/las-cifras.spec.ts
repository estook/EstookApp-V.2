import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { abrirSinQueSeCaiga } from './abrir.ts';

/**
 * V · punto 2 · «Cómo va»: las cifras con flecha de cada app.
 *
 * «Flechas y gráficas pequeñas también en Inventario, Servicio y Equipo.» Lo que
 * decidió Richi el 23 de septiembre de 2026, y lo que se comprueba aquí:
 *
 *   · **en la primera pantalla de cada app**, debajo de lo urgente
 *   · **siempre las mismas**, y cada uno ve las que su rol le deja
 *   · cada tarjeta entera lleva a su detalle
 *   · y el margen de los retrasos, **cinco minutos que cada local cambia**
 *
 * Que las cifras cuadren con las pantallas de donde salen se prueba contra la base
 * (`las-cifras-de-cada-app.prueba.ts`); aquí se prueba que una persona las ve y
 * las usa.
 */
const APP = 'http://localhost:5174/';
const API = 'http://localhost:5177/api';
const CLAVE = 'estook en desarrollo';

/** Rosa lleva Bar Centro: ve todas las cifras, las de dinero también. */
const ROSA = 'rosa@ejemplo.estook.com';
/** Marcos cocina en Bar Centro: Inventario sí, y ni un precio. */
const MARCOS = 'marcos@ejemplo.estook.com';

const UNA_VEZ = 'Cambia un ajuste del local: en un solo navegador, de una en una (regla 18).';

async function entrar(page: Page, correo: string) {
  await abrirSinQueSeCaiga(page, APP);
  await page.evaluate(() => {
    try {
      window.localStorage.clear();
    } catch {
      /* en navegación privada no se puede, y no pasa nada */
    }
  });
  // Por `abrir.ts`: el Safari de las pruebas se cae a veces por dentro al navegar.
  await abrirSinQueSeCaiga(page, APP);
  await page.getByLabel('Tu correo').fill(correo);
  await page.getByLabel('Tu contraseña').fill(CLAVE);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Entra en Estook' })).toHaveCount(0);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
}

/**
 * Un producto de Bar Centro, para que Inventario · Resumen tenga género que enseñar.
 *
 * Con la cámara vacía «Resumen» enseña cómo empezar y no las cifras, que serían todo
 * ceros. Sin esto la prueba solo pasaba si otra, antes, había dado de alta algo:
 * dependía del orden, que es no probar nada.
 */
async function queHayaGenero(peticion: APIRequestContext) {
  const entrada = await peticion.post(`${API}/v1/comandos/entrar`, {
    headers: { 'x-idempotencia': `cifras-entrar-${Date.now()}-${Math.random()}` },
    data: { correo: ROSA, contrasena: CLAVE },
  });
  const { datos } = (await entrada.json()) as { datos: { token: string } };
  const creado = await peticion.post(`${API}/v1/comandos/crear_producto`, {
    headers: {
      authorization: `Bearer ${datos.token}`,
      'x-idempotencia': `cifras-producto-${Date.now()}-${Math.random()}`,
    },
    data: {
      nombre: `Lubina de las cifras ${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
      unidad_de_uso: 'kg',
      zona: 'cocina',
      precio_centimos: 1_500,
      cantidad_inicial: 3,
      minimo: 5,
    },
  });
  expect(creado.status(), 'Rosa tiene que poder dar de alta el producto').toBe(200);
}

test.beforeAll(async ({ request }) => {
  await queHayaGenero(request);
});

function lasCifrasDe(page: Page, app: string) {
  return page.locator(`[data-cifras-de="${app}"]`);
}

test('Inventario abre con sus cuatro cifras, debajo de lo que hay que atender', async ({
  page,
}) => {
  await entrar(page, ROSA);
  await page.goto(`${APP}#/inventario/resumen`, { waitUntil: 'domcontentloaded' });

  const fila = lasCifrasDe(page, 'inventario');
  await expect(fila.getByRole('heading', { name: 'Cómo va' })).toBeVisible({ timeout: 15_000 });
  for (const cifra of ['valor-camara', 'merma', 'compras', 'bajo-minimo']) {
    await expect(fila.locator(`[data-cifra="${cifra}"]`), cifra).toBeVisible();
  }
  await expect(fila.getByRole('heading', { name: 'Valor de la cámara' })).toBeVisible();

  // Lo que hay que atender va antes que cualquier cifra (Evolución, capítulo 5).
  const atencion = await page
    .getByRole('heading', { name: /tu atención|Nada que atender/ })
    .first()
    .boundingBox();
  const cifras = await fila.boundingBox();
  expect(atencion?.y ?? 0).toBeLessThan(cifras?.y ?? 0);
});

test('la semana o el mes, y cada tarjeta lleva a su detalle', async ({ page }) => {
  await entrar(page, ROSA);
  await page.goto(`${APP}#/inventario/resumen`, { waitUntil: 'domcontentloaded' });
  const fila = lasCifrasDe(page, 'inventario');
  await expect(fila).toBeVisible({ timeout: 15_000 });

  const mes = fila.getByRole('radio', { name: '30 días' });
  await mes.click();
  await expect(mes).toHaveAttribute('aria-checked', 'true');

  // Y se recuerda en el aparato: al volver, sigue en el mes.
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(
    lasCifrasDe(page, 'inventario').getByRole('radio', { name: '30 días' }),
  ).toHaveAttribute('aria-checked', 'true', { timeout: 15_000 });

  await lasCifrasDe(page, 'inventario')
    .getByRole('button', { name: 'Ver bajo mínimo a detalle' })
    .click();
  await expect(page).toHaveURL(/#\/inventario\/productos\/bajo-minimo/);
});

test('un cocinero ve lo que se acaba, y ni un euro', async ({ page }) => {
  await entrar(page, MARCOS);
  await page.goto(`${APP}#/inventario/resumen`, { waitUntil: 'domcontentloaded' });

  const fila = lasCifrasDe(page, 'inventario');
  await expect(fila.locator('[data-cifra="bajo-minimo"]')).toBeVisible({ timeout: 15_000 });
  // Las de dinero no se esconden: no se piden, porque el servidor no se las daría.
  for (const cifra of ['valor-camara', 'merma', 'compras']) {
    await expect(fila.locator(`[data-cifra="${cifra}"]`), cifra).toHaveCount(0);
  }
});

test('Servicio enseña sus cifras debajo del cierre del día', async ({ page }) => {
  await entrar(page, ROSA);
  await page.goto(`${APP}#/servicio/jornada/cierre`, { waitUntil: 'domcontentloaded' });

  const fila = lasCifrasDe(page, 'servicio');
  await expect(fila.getByRole('heading', { name: 'Cómo va' })).toBeVisible({ timeout: 15_000 });
  for (const cifra of ['ventas', 'ticket-medio', 'food-cost', 'cierres']) {
    await expect(fila.locator(`[data-cifra="${cifra}"]`), cifra).toBeVisible();
  }
  // Ya se está en el Cierre: llevar al Cierre desde el Cierre no hace nada.
  await expect(fila.getByRole('button', { name: /a detalle/ })).toHaveCount(0);
});

test('Equipo enseña horas, coste y retrasos, y lleva a Fichajes', async ({ page }) => {
  await entrar(page, ROSA);
  await page.goto(`${APP}#/equipo/resumen`, { waitUntil: 'domcontentloaded' });

  const fila = lasCifrasDe(page, 'equipo');
  await expect(fila.getByRole('heading', { name: 'Cómo va' })).toBeVisible({ timeout: 15_000 });
  for (const cifra of ['horas-equipo', 'coste-personal', 'retrasos']) {
    await expect(fila.locator(`[data-cifra="${cifra}"]`), cifra).toBeVisible();
  }

  await fila.getByRole('button', { name: 'Ver retrasos a detalle' }).click();
  await expect(page).toHaveURL(/#\/equipo\/fichajes/);
  // Fichajes cuenta los retrasos persona a persona. La tabla se pinta dos
  // veces, una por ancho: se busca la que se ve (regla 68).
  await expect(
    page.getByText('Retrasos', { exact: true }).filter({ visible: true }).first(),
  ).toBeVisible({ timeout: 15_000 });
});

test('cuándo es llegar tarde lo cambia quien lleva el local', async ({ page }, info) => {
  test.skip(info.project.name !== 'escritorio', UNA_VEZ);
  await entrar(page, ROSA);
  await page.goto(`${APP}#/ajustes/local`, { waitUntil: 'domcontentloaded' });

  const margen = page.getByLabel('Cuenta como retraso');
  await expect(margen).toHaveValue('5', { timeout: 15_000 });

  await margen.selectOption('10');
  // Dice que está guardado, y entonces quien lo ha cambiado se va.
  await expect(
    page.getByRole('status').filter({ hasText: 'Guardado: más de 10 min.' }),
  ).toBeVisible();
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByLabel('Cuenta como retraso')).toHaveValue('10', { timeout: 15_000 });

  // Y se deja como estaba, que es lo de fábrica.
  await page.getByLabel('Cuenta como retraso').selectOption('5');
  await expect(
    page.getByRole('status').filter({ hasText: 'Guardado: más de 5 min.' }),
  ).toBeVisible();
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByLabel('Cuenta como retraso')).toHaveValue('5', { timeout: 15_000 });
});
