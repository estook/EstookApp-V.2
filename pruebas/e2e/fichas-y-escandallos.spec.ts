import { expect, test, type Page } from '@playwright/test';
import { abrirSinQueSeCaiga } from './abrir.ts';
import { cuentaNueva, pagarEsencial, sinElAlta, unico } from './cuenta-nueva.ts';
import { APP, ejecutarEnLaApi, entrarEnLaApp, tokenDe } from './en-la-app.ts';

/**
 * M9 · 2 · Fichas y escandallos (decisión 0087), en la pantalla.
 *
 * «Primero la carta» (0086): el plato ya existe y aquí se desgrana. Una cuenta nueva
 * hace su salsa con lo que rinde, desgrana la hamburguesa con ella, ve lo que cuesta y
 * lo que deja en sala y en Uber Eats, cambia la receta y recupera la de antes, la abre
 * en modo cocina, y en la Carta trae del Almacén lo que vende tal cual y marca lo que
 * pica. Y el cocinero ve la ficha sin un euro.
 */

async function elToken(page: Page): Promise<string> {
  return (await page.evaluate(() => window.localStorage.getItem('estook.sesion'))) ?? '';
}

/** Escribe un ingrediente en la última fila libre y lo elige de lo que propone. */
async function anadir(
  page: Page,
  buscado: string,
  nombre: string,
  cantidad: string,
  unidad?: string,
) {
  const editor = page.getByRole('dialog', { name: /la ficha$/ });
  const libre = editor.getByPlaceholder(/Carne picada, salsa de la casa…|Otro ingrediente/).last();
  await libre.fill(buscado);
  await editor.getByRole('option', { name: new RegExp(nombre) }).click();
  await editor.getByRole('textbox', { name: `Cantidad de ${nombre}` }).fill(cantidad);
  if (unidad !== undefined) {
    await editor.getByRole('combobox', { name: `Unidad de ${nombre}` }).selectOption(unidad);
  }
}

test('se desgrana un plato con su elaboración, y el escandallo dice lo que deja en cada canal', async ({
  page,
  request,
}, info) => {
  test.slow();
  await cuentaNueva(page, request, `fichas-${unico(info)}@correo-de-prueba.com`, 'Bar Fichas');
  await pagarEsencial(page);
  await sinElAlta(page);
  const token = await elToken(page);

  // Lo que hay antes: el Almacén con sus precios, y la hamburguesa en la Carta.
  const producto = (datos: Record<string, unknown>) =>
    ejecutarEnLaApi<{ productoId: string }>(request, token, 'crear_producto', datos);
  // 10 kg a 75 € con un 80 % útil: 9,375 €/kg de verdad.
  await producto({
    nombre: 'Carne picada',
    factor: 10,
    unidad_de_uso: 'kg',
    rendimiento: 0.8,
    precio_centimos: 7500,
  });
  await producto({
    nombre: 'Pan brioche',
    unidad_de_uso: 'ud',
    precio_centimos: 40,
    alergenos: ['gluten', 'huevos'],
  });
  await producto({
    nombre: 'Mayonesa',
    unidad_de_uso: 'l',
    precio_centimos: 400,
    alergenos: ['huevos'],
  });
  await producto({
    nombre: 'Refresco lata',
    factor: 24,
    unidad_de_uso: 'ud',
    precio_centimos: 1200,
  });
  await ejecutarEnLaApi(request, token, 'crear_platos', {
    seccion_id: null,
    platos: [{ nombre: 'Hamburguesa', precio_centimos: 1450 }],
  });
  await ejecutarEnLaApi(request, token, 'configurar_canal', { canal: 'uber_eats', activo: true });

  // ── La salsa, con lo que rinde ──────────────────────────────────────────────
  await abrirSinQueSeCaiga(page, `${APP}#/escandallos/elaboraciones`);
  await page.getByRole('button', { name: 'Nueva elaboración' }).first().click();
  const nueva = page.getByRole('dialog', { name: 'Nueva elaboración' });
  await nueva.getByLabel('Nombre').fill('Salsa de la casa');
  await nueva.getByRole('textbox', { name: 'Lo que sale de hacerla una vez' }).fill('1');
  await nueva.getByRole('button', { name: 'Crear' }).click();
  const salsa = page.getByRole('dialog', { name: 'Salsa de la casa' });
  await expect(salsa.getByText('Sin ficha todavía')).toBeVisible();
  await salsa.getByRole('button', { name: 'Desgranar' }).click();
  await anadir(page, 'mayo', 'Mayonesa', '1', 'l');
  await page.getByLabel('Paso 1').fill('Mezclar en frío');
  await page
    .getByRole('dialog', { name: 'Escribir la ficha' })
    .getByRole('button', { name: 'Guardar' })
    .click();
  await expect(salsa.getByText('Guardada')).toBeVisible();
  await page.keyboard.press('Escape');

  // ── El plato, desde «sin ficha» ─────────────────────────────────────────────
  await abrirSinQueSeCaiga(page, `${APP}#/escandallos/resumen`);
  await page
    .getByRole('list', { name: 'Sin ficha' })
    .getByRole('button', { name: /Hamburguesa/ })
    .click();
  const ficha = page.getByRole('dialog', { name: 'Hamburguesa' });
  await ficha.getByRole('button', { name: 'Desgranar' }).click();
  await anadir(page, 'carne', 'Carne picada', '180', 'g');
  await anadir(page, 'brioche', 'Pan brioche', '1');
  await anadir(page, 'salsa', 'Salsa de la casa', '30', 'ml');
  await page
    .getByRole('dialog', { name: 'Escribir la ficha' })
    .getByRole('button', { name: 'Guardar' })
    .click();
  await expect(ficha.getByText('Guardada')).toBeVisible();

  // La ficha: los gramos y los alérgenos, que vienen también de la salsa.
  await expect(
    ficha.getByRole('region', { name: 'Lo que lleva' }).getByText('180 g'),
  ).toBeVisible();
  await expect(ficha.getByText('Cereales con gluten')).toBeVisible();
  await expect(ficha.getByText('Huevos')).toBeVisible();

  // El escandallo: 0,18 kg × 9,375 = 1,69 €; pan 0,40 €; 30 ml de salsa, 0,12 €.
  await ficha.getByRole('tab', { name: 'Escandallo' }).click();
  await expect(ficha.getByText('2,21 €').first()).toBeVisible();
  // 14,50 € con un 10 %: 13,18 € sin IVA; le quedan 10,97 € en sala y, con el 30 % de
  // Uber Eats (4,35 €), 6,62 €.
  const canales = ficha.getByRole('region', { name: 'Lo que deja en cada canal' });
  await expect(canales.getByText('10,97 €')).toBeVisible();
  await expect(canales.getByText('6,62 €')).toBeVisible();

  // ── Cambiar la receta y recuperar la de antes ───────────────────────────────
  await ficha.getByRole('button', { name: 'Editar' }).click();
  const editor = page.getByRole('dialog', { name: 'Editar la ficha' });
  await editor.getByRole('textbox', { name: 'Cantidad de Carne picada' }).fill('200');
  await editor.getByRole('button', { name: 'Guardar' }).click();
  await ficha.getByText('Historial').click();
  const historial = ficha.getByRole('list', { name: 'Historial de la receta' });
  await expect(historial.getByText('Carne picada: 180 g → 200 g')).toBeVisible();
  await historial.getByRole('button', { name: 'Recuperar' }).click();
  await expect(ficha.getByText('Recuperada: ya es la receta de ahora')).toBeVisible();
  await expect(historial.getByText(/^Recuperó la del /)).toBeVisible();

  // ── El modo cocina, sin un euro ─────────────────────────────────────────────
  await ficha.getByRole('button', { name: 'Modo cocina' }).click();
  const cocina = page.getByRole('dialog', { name: 'Modo cocina · Hamburguesa' });
  await expect(cocina.getByRole('list', { name: 'Lo que lleva' }).getByText('180 g')).toBeVisible();
  await expect(cocina.getByText('€')).toHaveCount(0);
  await cocina.getByRole('button', { name: 'Salir del modo cocina' }).click();
  await expect(cocina).toHaveCount(0);
  await page.keyboard.press('Escape');

  // ── En la Carta: lo que se vende tal cual, de golpe, y lo que pica ──────────
  await abrirSinQueSeCaiga(page, `${APP}#/carta/carta/por-secciones`);
  await page.getByRole('button', { name: 'Desde el almacén' }).click();
  const almacen = page.getByRole('dialog', { name: 'Desde el almacén' });
  // Todo el Almacén (lección 190): la carne, en kilos, también sale.
  await expect(almacen.getByRole('checkbox', { name: /Carne picada/ })).toBeVisible();
  await almacen.getByRole('checkbox', { name: /Refresco lata/ }).click();
  await almacen.getByRole('textbox', { name: /Precio de Refresco lata/ }).fill('2,50');
  // Lo que va a peso o volumen pide cuánto lleva la ración; sin eso, no se añade.
  await almacen.getByRole('checkbox', { name: /Mayonesa/ }).click();
  await expect(almacen.getByRole('button', { name: 'Añadir 2 a la carta' })).toBeDisabled();
  await almacen.getByRole('textbox', { name: 'Cada ración de Mayonesa lleva' }).fill('50');
  await almacen.getByRole('textbox', { name: /Precio de Mayonesa/ }).fill('3');
  await almacen.getByRole('button', { name: 'Añadir 2 a la carta' }).click();
  await expect(almacen).toHaveCount(0);
  await expect(page.getByRole('img', { name: 'Vinculado a Refresco lata' })).toBeVisible();
  await expect(page.getByRole('img', { name: 'Vinculado a Mayonesa · 50 ml' })).toBeVisible();

  await page.getByRole('button', { name: /^Hamburguesa/ }).click();
  const plato = page.getByRole('dialog', { name: 'Hamburguesa' });
  await plato.getByText('Alérgenos, picante y más').click();
  // Lo que trae la receta ya está puesto, y no se quita desde aquí.
  await expect(plato.getByRole('checkbox', { name: /Huevos/ })).toHaveAttribute(
    'aria-checked',
    'true',
  );
  await plato.getByRole('radio', { name: 'Picante 1 de 3' }).click();
  await plato.getByRole('button', { name: 'Guardar' }).click();
  await expect(plato.getByText('Guardado')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('img', { name: 'Pica un poco' })).toBeVisible();
});

test('el cocinero ve la ficha entera y ni un euro', async ({ page, request }, info) => {
  const nombre = `Tortilla ${unico(info)}`;
  const rosa = await tokenDe(request, 'rosa@ejemplo.estook.com');
  const { productoId } = await ejecutarEnLaApi<{ productoId: string }>(
    request,
    rosa,
    'crear_producto',
    {
      nombre: `Huevo ${unico(info)}`,
      unidad_de_uso: 'ud',
      precio_centimos: 25,
      alergenos: ['huevos'],
    },
  );
  const { creados } = await ejecutarEnLaApi<{ creados: { platoId: string }[] }>(
    request,
    rosa,
    'crear_platos',
    { seccion_id: null, platos: [{ nombre, precio_centimos: 900 }] },
  );
  await ejecutarEnLaApi(request, rosa, 'guardar_ficha', {
    plato_id: creados[0]?.platoId,
    version: 0,
    lineas: [{ producto_id: productoId, cantidad: 3, unidad: 'ud' }],
    pasos: ['Batir', 'Cuajar'],
  });

  await entrarEnLaApp(page, 'marcos@ejemplo.estook.com');
  await abrirSinQueSeCaiga(
    page,
    `${APP}#/escandallos/fichas/todas?ficha=plato.${creados[0]?.platoId ?? ''}`,
  );
  const ficha = page.getByRole('dialog', { name: nombre });
  await expect(ficha.getByText('3 ud')).toBeVisible();
  await expect(ficha.getByText('Cuajar')).toBeVisible();
  await expect(ficha.getByRole('tab', { name: 'Escandallo' })).toHaveCount(0);
  await expect(ficha.getByRole('button', { name: 'Editar' })).toHaveCount(0);
  await expect(ficha.getByText(/€/)).toHaveCount(0);
});
