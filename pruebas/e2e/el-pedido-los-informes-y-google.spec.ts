import { expect, test } from '@playwright/test';
import { ejecutarEnLaApi, entrarEnLaApp, irA, tokenDe } from './en-la-app.ts';

/**
 * R2 · los informes y la nota en Google (decisión 0053), desde la pantalla.
 *
 *   · Negocio → Informes: Tu día frente al mismo día de la semana anterior, con sus
 *     tres frases y sus cifras, las flechas para ir hacia atrás y las tres vistas
 *   · Negocio → Reseñas: la nota en Google, cuántas reseñas y el enlace a Google
 *   · Ajustes → Avisos: los informes, en su grupo, con el correo de la semana y del
 *     mes encendido de fábrica; y lo bajo mínimo, apagado
 *
 * Las cajas del informe van en un lunes de hace unos diez meses, lejos de cualquier
 * otra prueba y dentro del año que se puede mirar hacia atrás: los tres navegadores
 * corren a la vez contra la misma base, y cerrar la misma caja dos veces la corrige,
 * no la duplica.
 */
const ROSA = 'rosa@ejemplo.estook.com';
const UN_DIA = 86_400_000;

/** Un lunes de hace unos trescientos días, el de la semana anterior y el domingo de antes. */
function losLunes(): {
  lunes: string;
  antes: string;
  domingo: string;
  enLetra: string;
  domingoEnLetra: string;
} {
  const hace = new Date(Date.now() - 300 * UN_DIA);
  const lunes = new Date(hace.getTime() - ((hace.getUTCDay() + 6) % 7) * UN_DIA);
  const antes = new Date(lunes.getTime() - 7 * UN_DIA);
  const domingo = new Date(lunes.getTime() - UN_DIA);
  const enLetra = (d: Date) =>
    d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', timeZone: 'UTC' });
  return {
    lunes: lunes.toISOString().slice(0, 10),
    antes: antes.toISOString().slice(0, 10),
    domingo: domingo.toISOString().slice(0, 10),
    enLetra: enLetra(lunes),
    domingoEnLetra: enLetra(domingo),
  };
}

test('Negocio → Informes: Tu día frente al mismo día de la semana anterior, y hacia atrás', async ({
  page,
  request,
}) => {
  const rosa = await tokenDe(request, ROSA);
  const { lunes, antes, domingo, enLetra, domingoEnLetra } = losLunes();
  for (const [fecha, total] of [
    [lunes, 123_400],
    [antes, 100_000],
  ] as const) {
    await ejecutarEnLaApi(request, rosa, 'cerrar_la_caja', {
      fecha,
      total_centimos: total,
      tickets: 30,
    });
  }

  await entrarEnLaApp(page, ROSA);
  await irA(page, `negocio/informes/dia?del=${lunes}`);

  await expect(page.getByRole('heading', { level: 2, name: 'Tu día' })).toBeVisible();
  await expect(page.getByText(`El lunes ${enLetra}`, { exact: true })).toBeVisible();
  const frases = page.getByRole('list', { name: 'Lo mejor, lo peor y lo que mirar' });
  await expect(frases).toContainText(
    'Lo mejor: las ventas, 1.234,00 €, un 23,4 % más que el lunes anterior.',
  );
  // La tarjeta de las ventas, con su flecha: la misma cifra que la frase.
  await expect(page.getByText('1.234,00 €', { exact: true })).toBeVisible();

  // Hacia atrás, **un día**: el domingo de antes, no el lunes con el que se compara
  // (Richi, 9-oct: atrás saltaba una semana y adelante, un día). Y adelante, de vuelta.
  await page.getByRole('button', { name: 'El periodo anterior' }).click();
  await expect(page.getByText(`El domingo ${domingoEnLetra}`, { exact: true })).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`del=${domingo}`));
  await page.getByRole('button', { name: 'El periodo siguiente' }).click();
  await expect(page.getByText(`El lunes ${enLetra}`, { exact: true })).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`del=${lunes}`));

  // Y las tres vistas, Día, Semana y Mes.
  await page.getByRole('tab', { name: 'Semana' }).click();
  await expect(page.getByRole('heading', { level: 2, name: 'Tu semana' })).toBeVisible();
  await page.getByRole('tab', { name: 'Mes' }).click();
  await expect(page.getByRole('heading', { level: 2, name: 'Tu mes' })).toBeVisible();
});

test('Negocio → Reseñas: la nota en Google, sus reseñas y el enlace para leerlas', async ({
  page,
  request,
}) => {
  const rosa = await tokenDe(request, ROSA);
  // Enlazado con el Google de mentira de la API de pruebas, que da un 4,4.
  await ejecutarEnLaApi(request, rosa, 'elegir_mi_local_de_google', {
    id: 'lugar-de-prueba',
    sesion: null,
    usar_su_posicion: false,
  });

  await entrarEnLaApp(page, ROSA);
  await irA(page, 'negocio/resenas');
  await expect(page.getByRole('heading', { level: 2, name: 'Tu nota en Google' })).toBeVisible();
  await expect(page.getByText('★ 4,4', { exact: true })).toBeVisible();
  await expect(page.getByText('212 reseñas', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Ver las reseñas en Google' })).toHaveAttribute(
    'href',
    'https://maps.google.com/?cid=1',
  );
  // Contestar, plegado: espera a Business Profile.
  await expect(page.getByText('¿Y contestarlas desde aquí?')).toBeVisible();
});

test('Ajustes → Avisos: los informes, con el correo de la semana y del mes de fábrica', async ({
  page,
}) => {
  await entrarEnLaApp(page, ROSA);
  await irA(page, 'ajustes/avisos');
  const negocio = page.getByRole('region', { name: 'Negocio' });
  await expect(negocio.getByText('Tu día', { exact: true })).toBeVisible();
  await expect(negocio.getByText('Tu semana', { exact: true })).toBeVisible();
  await expect(negocio.getByText('Tu mes', { exact: true })).toBeVisible();
  await expect(negocio.getByRole('switch', { name: 'Tu semana: en la campana' })).toBeChecked();
  await expect(
    negocio.getByRole('switch', { name: 'Tu semana: también por correo' }),
  ).toBeChecked();
  await expect(
    negocio.getByRole('switch', { name: 'Tu día: también por correo' }),
  ).not.toBeChecked();
  // Lo bajo mínimo ya sale en «Hoy»: de fábrica, apagado.
  await expect(
    page.getByRole('switch', { name: 'Productos bajo mínimo: en la campana' }),
  ).not.toBeChecked();
});
