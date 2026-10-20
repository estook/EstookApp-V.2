import { expect, test } from '@playwright/test';
import { abrirSinQueSeCaiga } from './abrir.ts';
import { cuentaNueva, pagarEsencial, sinElAlta, unico } from './cuenta-nueva.ts';
import { APP } from './en-la-app.ts';

/**
 * M10 · 1 · La carta que trabaja (decisión 0102), en la pantalla y con una cuenta nueva:
 *
 *   · se acaba un plato: dos toques en Agotados, sale marcado en la carta y «Ya hay» lo
 *     devuelve
 *   · leer tu carta en PDF: propone los nuevos, el precio distinto y lo que ya no está
 *     (sin marcar), y al actualizar la carta queda como la leída
 *   · el equilibrio, en Análisis, dice la sección que hay que mirar
 */
test('agotados, leer tu carta en PDF y el equilibrio', async ({ page, request }, info) => {
  test.slow();
  await cuentaNueva(page, request, `m10-${unico(info)}@correo-de-prueba.com`, 'Bar Diez');
  await pagarEsencial(page);
  await sinElAlta(page);

  // La carta de partida, de golpe.
  await abrirSinQueSeCaiga(page, `${APP}#/carta/carta/por-secciones?hacer=nuevo`);
  const anadir = page.getByRole('dialog', { name: 'Añadir platos' });
  const filas: readonly [string, string][] = [
    ['Croquetas de jamón', '9,50'],
    ['Patatas bravas', '6,50'],
    ['Ensaladilla rusa', '6,00'],
  ];
  for (const [i, [nombre, precio]] of filas.entries()) {
    await anadir.getByLabel(`Plato ${String(i + 1)}`).fill(nombre);
    await anadir.getByRole('textbox', { name: 'Precio' }).nth(i).fill(precio);
  }
  await anadir.getByRole('button', { name: 'Añadir 3 platos' }).click();
  await expect(anadir).toHaveCount(0);

  // ── Agotados: dos toques ──
  await abrirSinQueSeCaiga(page, `${APP}#/carta/carta/agotados`);
  await expect(page.getByText('Nada agotado ahora.')).toBeVisible();
  await page.getByRole('button', { name: 'Marcar agotado Croquetas de jamón' }).click();
  const agotados = page.getByRole('list', { name: 'Agotados ahora' });
  await expect(agotados.getByText('Croquetas de jamón')).toBeVisible();
  await expect(agotados.getByText(/Hasta mañana/)).toBeVisible();
  // El recordatorio del TPV, en la barra de deshacer.
  await expect(page.getByText(/Quítalo también de tu TPV/)).toBeVisible();

  // En la carta, marcado.
  await abrirSinQueSeCaiga(page, `${APP}#/carta/carta/por-secciones`);
  const croquetas = page.getByRole('button', { name: /Croquetas de jamón/ });
  await expect(croquetas.getByText('Agotado')).toBeVisible();

  // «Ya hay» lo devuelve.
  await abrirSinQueSeCaiga(page, `${APP}#/carta/carta/agotados`);
  await agotados.getByRole('button', { name: 'Ya hay' }).click();
  await expect(page.getByText('Nada agotado ahora.')).toBeVisible();

  // ── Leer tu carta, en PDF ──
  await abrirSinQueSeCaiga(page, `${APP}#/carta/carta/por-secciones`);
  await page.getByRole('button', { name: 'Leer tu carta' }).click();
  const leer = page.getByRole('dialog', { name: 'Leer tu carta' });
  await leer.getByLabel('El PDF o las fotos de tu carta').setInputFiles({
    name: 'carta.pdf',
    mimeType: 'application/pdf',
    buffer: unaCartaEnPdf([
      ['ENTRANTES', null],
      ['Croquetas de jamón', '9,50'],
      ['Patatas bravas', '7,00'],
      ['Pulpo a la gallega', '15,00'],
      ['POSTRES', null],
      ['Tarta de queso', '5,50'],
    ]),
  });
  await expect(
    leer.getByRole('heading', { name: '2 platos nuevos · 1 precio distinto · 1 que ya no está' }),
  ).toBeVisible();
  await expect(leer.getByText('6,50 € → 7,00 €')).toBeVisible();
  // Lo que ya no está, sin marcar: quitar un plato lo decides tú.
  await expect(leer.getByRole('checkbox', { name: /Ensaladilla rusa/ })).not.toBeChecked();
  await leer.getByRole('button', { name: 'Actualizar tu carta (3)' }).click();
  // Son varios comandos seguidos: con el ordenador cargado, tarda.
  await expect(leer.getByText('Hecho: 2 añadidos, 1 precios cambiados.')).toBeVisible({
    timeout: 20_000,
  });
  await leer.getByRole('button', { name: 'Listo' }).click();

  await expect(
    page.getByRole('list', { name: 'Postres' }).getByText('Tarta de queso'),
  ).toBeVisible();
  await expect(
    page.getByRole('list', { name: 'Entrantes' }).getByText('Pulpo a la gallega'),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: /Patatas bravas/ }).getByText('7,00 €'),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: /Ensaladilla rusa/ })).toBeVisible();

  // ── El equilibrio ──
  await abrirSinQueSeCaiga(page, `${APP}#/carta/analisis`);
  await expect(page.getByRole('heading', { name: 'Una sección que mirar' })).toBeVisible();
  await expect(page.getByText(/franja media/).first()).toBeVisible();
});

/**
 * Una carta en PDF de verdad, escrita a mano: el nombre a la izquierda y el precio
 * pegado al margen derecho, **sin puntitos**, como en muchas cartas; las cabeceras
 * solas. Helvetica con WinAnsi, para que salgan los acentos.
 */
function unaCartaEnPdf(lineas: readonly (readonly [string, string | null])[]): Buffer {
  const escapar = (t: string) =>
    t.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  const partes = lineas.flatMap(([texto, precio], i) => {
    const y = 780 - i * 24;
    return [
      `BT /F1 14 Tf 72 ${String(y)} Td (${escapar(texto)}) Tj ET`,
      ...(precio === null ? [] : [`BT /F1 14 Tf 480 ${String(y)} Td (${precio}) Tj ET`]),
    ];
  });
  const contenido = partes.join('\n');
  const objetos = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [4 0 R] /Count 1 >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents 5 0 R >>',
    `<< /Length ${String(Buffer.byteLength(contenido, 'latin1'))} >>\nstream\n${contenido}\nendstream`,
  ];
  let pdf = '%PDF-1.4\n';
  const posiciones: number[] = [];
  objetos.forEach((objeto, i) => {
    posiciones.push(Buffer.byteLength(pdf, 'latin1'));
    pdf += `${String(i + 1)} 0 obj\n${objeto}\nendobj\n`;
  });
  const indice = Buffer.byteLength(pdf, 'latin1');
  pdf += `xref\n0 ${String(objetos.length + 1)}\n0000000000 65535 f \n`;
  for (const posicion of posiciones) pdf += `${String(posicion).padStart(10, '0')} 00000 n \n`;
  pdf += `trailer\n<< /Size ${String(objetos.length + 1)} /Root 1 0 R >>\nstartxref\n${String(indice)}\n%%EOF\n`;
  return Buffer.from(pdf, 'latin1');
}
