import { expect, test, type APIRequestContext } from '@playwright/test';
import { abrirSinQueSeCaiga } from './abrir.ts';
import { API, APP, ejecutarEnLaApi, entrarEnLaApp, tokenDe } from './en-la-app.ts';

/**
 * El repaso del 9-oct (0081), por la pantalla.
 *
 *   1 · Un tramo publicado en Horarios que acaba sin fichar sale en Equipo →
 *       Incidencias como «No vino»; se justifica y se quita la justificación.
 *   2 · En la ficha de la persona, donde ponía «Su horario», sus incidencias, con
 *       «Ver más» que lleva a Incidencias con solo las suyas.
 *   3 · En Equipo → Resumen, la cifra «Incidencias» al lado de las otras tres, y
 *       pulsarla abre Incidencias.
 *   4 · En Almacén → Productos, «Sin precio», «Congelados» y «Desactivados» solo
 *       salen si tienen algo.
 *
 * La 1 y la 2 escriben en una semana pasada que comparten los navegadores: van una
 * vez, en el escritorio, con un tramo que solo es de esta vuelta.
 */
const ROSA = 'rosa@ejemplo.estook.com';
const MARCOS = 'marcos@ejemplo.estook.com';

async function consultar<T>(
  peticion: APIRequestContext,
  token: string,
  nombre: string,
  entrada: Record<string, string>,
): Promise<T> {
  const respuesta = await peticion.get(
    `${API}/v1/consultas/${nombre}?${new URLSearchParams(entrada).toString()}`,
    { headers: { authorization: `Bearer ${token}` } },
  );
  expect(respuesta.status(), `${nombre}: ${await respuesta.text()}`).toBe(200);
  return ((await respuesta.json()) as { datos: T }).datos;
}

/** El lunes de hace dos semanas, y un día de esa semana. */
function haceDosSemanas(dia: number): { lunes: string; fecha: string } {
  const hoy = new Date(Date.now());
  const lunes = new Date(
    Date.UTC(
      hoy.getUTCFullYear(),
      hoy.getUTCMonth(),
      hoy.getUTCDate() - 14 - ((hoy.getUTCDay() + 6) % 7),
    ),
  );
  const fecha = new Date(lunes.getTime() + dia * 86_400_000);
  return { lunes: lunes.toISOString().slice(0, 10), fecha: fecha.toISOString().slice(0, 10) };
}

test('la falta sale en Incidencias, se justifica y se quita; y está en su ficha', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'escritorio', 'Escribe en una semana que comparten todos.');
  test.slow();
  const rosa = await tokenDe(page.request, ROSA);
  const marcos = await tokenDe(page.request, MARCOS);
  const marcosId = (await consultar<{ personaId: string }>(page.request, marcos, 'quien_soy', {}))
    .personaId;

  // Un tramo de esta vuelta: un día y una hora que no se repiten.
  const vuelta = Math.floor(Date.now() / 1000);
  const { lunes, fecha } = haceDosSemanas(vuelta % 7);
  const minuto = String(vuelta % 50).padStart(2, '0');
  const entra = `05:${minuto}`;
  const sale = `05:${String(Number(minuto) + 9).padStart(2, '0')}`;
  await ejecutarEnLaApi(page.request, rosa, 'poner_tramo', {
    lunes,
    persona_id: marcosId,
    dia: fecha,
    tipo: 'trabajo',
    entra,
    sale,
  });
  await ejecutarEnLaApi(page.request, rosa, 'publicar_el_horario', { lunes });

  await entrarEnLaApp(page, ROSA);
  await abrirSinQueSeCaiga(page, `${APP}#/equipo/incidencias/faltas`);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Incidencias');
  await expect(page.getByRole('tab', { name: 'Faltas', selected: true })).toBeVisible();

  const fila = page.getByRole('listitem').filter({ hasText: `Turno de ${entra} a ${sale}` });
  await expect(fila).toContainText('Marcos');
  await expect(fila).toContainText('No vino');

  // Justificar: el motivo en un toque.
  await fila.getByRole('button', { name: 'Justificar' }).click();
  const hoja = page.getByRole('dialog', { name: 'Justificar · Marcos' });
  await hoja.getByRole('radio', { name: 'Enfermedad o baja' }).click();
  await hoja.getByLabel('Una nota, si quieres').fill('Con fiebre');
  await hoja.getByRole('button', { name: 'Justificar' }).click();
  await expect(hoja).toHaveCount(0);
  await expect(fila).toContainText('Justificada');
  await expect(fila).toContainText('Enfermedad o baja: Con fiebre');

  // Quitarla la vuelve a contar.
  await fila.getByRole('button', { name: 'Quitar la justificación' }).click();
  await expect(fila.getByRole('button', { name: 'Justificar' })).toBeVisible();

  // ── Su ficha: sus incidencias donde estaba «Su horario» ────────────────────
  await abrirSinQueSeCaiga(page, `${APP}#/equipo/personas/con-acceso?persona=${marcosId}`);
  const ficha = page.getByRole('dialog', { name: /Marcos/ });
  await expect(ficha.getByRole('heading', { name: 'Incidencias' })).toBeVisible();
  await expect(ficha.getByRole('heading', { name: 'Su horario' })).toHaveCount(0);
  await ficha.getByRole('button', { name: /^Ver (más|en Incidencias)/ }).click();
  await expect(page).toHaveURL(new RegExp(`/equipo/incidencias/todas\\?de=${marcosId}`));
  await expect(page.getByRole('button', { name: /Solo Marcos/ })).toBeVisible();
});

test('la cifra «Incidencias» está con las otras tres, y lleva a Incidencias', async ({ page }) => {
  await entrarEnLaApp(page, ROSA);
  await abrirSinQueSeCaiga(page, `${APP}#/equipo/resumen`);
  const cifras = page.locator('[data-cifras-de="equipo"]');
  await expect(cifras.locator('[data-cifra]')).toHaveCount(4);
  await cifras.locator('[data-cifra="incidencias"]').getByRole('button').click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Incidencias');
});

test('en Productos, las vistas vacías no ocupan sitio', async ({ page }) => {
  const rosa = await tokenDe(page.request, ROSA);
  const lo = await consultar<{
    cuantosEnLasVistas: { sinPrecio: number; congelados: number; desactivados: number };
  }>(page.request, rosa, 'mis_productos', {});

  await entrarEnLaApp(page, ROSA);
  await abrirSinQueSeCaiga(page, `${APP}#/almacen/productos/todo`);
  await expect(page.getByRole('tab', { name: 'Todo', selected: true })).toBeVisible();
  for (const [nombre, cuantos] of [
    ['Sin precio', lo.cuantosEnLasVistas.sinPrecio],
    ['Congelados', lo.cuantosEnLasVistas.congelados],
    ['Desactivados', lo.cuantosEnLasVistas.desactivados],
  ] as const) {
    await expect(page.getByRole('tab', { name: nombre })).toHaveCount(cuantos > 0 ? 1 : 0);
  }
  // Y la que se está mirando no desaparece aunque esté vacía.
  await abrirSinQueSeCaiga(page, `${APP}#/almacen/productos/desactivados`);
  await expect(page.getByRole('tab', { name: 'Desactivados', selected: true })).toBeVisible();
});

/**
 * Lo que vio Richi el 10-oct: «al pulsar "Valor" vuelven a salir "Sin precio",
 * "Congelados" y "Desactivados" aunque estén vacías», y «al entrar en Almacén aparecen
 * por un milisegundo y desaparecen». Rosa no tiene nada desactivado.
 */
test('en Productos, las vistas vacías no vuelven en «Valor» ni parpadean al entrar', async ({
  page,
}) => {
  const rosa = await tokenDe(page.request, ROSA);
  const lo = await consultar<{ cuantosEnLasVistas: { desactivados: number } }>(
    page.request,
    rosa,
    'mis_productos',
    {},
  );
  expect(lo.cuantosEnLasVistas.desactivados, 'Bar Centro no tiene nada desactivado').toBe(0);
  const desactivados = page.getByRole('tab', { name: 'Desactivados' });

  await entrarEnLaApp(page, ROSA);
  // Mientras no llega lo que hay en cada vista, ninguna de las tres sale: se retrasa
  // la respuesta para ver ese rato, que en un móvil con poca señal es largo.
  let soltar: () => void = () => undefined;
  const retenida = new Promise<void>((resolver) => {
    soltar = resolver;
  });
  await page.route('**/v1/consultas/mis_productos*', async (ruta) => {
    await retenida;
    // Si la página ya no la espera (se ha ido), no hay nada que soltar.
    await ruta.continue().catch(() => undefined);
  });
  await abrirSinQueSeCaiga(page, `${APP}#/almacen/productos/todo`);
  await expect(page.getByRole('tab', { name: 'Todo', selected: true })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Valor' })).toBeVisible();
  await expect(desactivados).toHaveCount(0);
  const llegada = page.waitForResponse('**/v1/consultas/mis_productos*');
  soltar();
  await llegada;
  await expect(page.getByRole('heading', { name: 'Productos', level: 1 })).toBeVisible();
  await expect(desactivados).toHaveCount(0);

  // Y en «Valor», tampoco.
  await page.getByRole('tab', { name: 'Valor' }).click();
  await expect(page.getByRole('tab', { name: 'Valor', selected: true })).toBeVisible();
  await expect(page.getByText('Lo que vale hoy tu almacén')).toBeVisible();
  await expect(desactivados).toHaveCount(0);
});
