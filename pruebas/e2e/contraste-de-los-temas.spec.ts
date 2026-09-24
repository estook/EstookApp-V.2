import { expect, test, type Page } from '@playwright/test';
import { abrirConTema, entrarEnLaApp, irA, type TemaDePrueba } from './en-la-app.ts';

/**
 * V · punto 5 · el oscuro, repasado: **todo el texto se lee**, en los dos temas.
 *
 * Las fichas ya se miden solas (`contraste.prueba.ts`): cada pareja de colores de
 * la paleta, en claro y en oscuro, llega a su mínimo. Pero **cumplir en la ficha no
 * es cumplir en la pantalla** (regla 29): basta un texto «tenue» sobre un fondo
 * que no es el suyo, una etiqueta encima de un tinte, o un color puesto a mano para
 * que en oscuro salga gris sobre gris. Eso solo se ve preguntándole al navegador.
 *
 * Esta prueba recorre pantallas de verdad —con datos, las de Rosa; vacías, las de
 * Vera— y mide **cada texto visible contra el fondo que tiene debajo de verdad**,
 * componiendo los fondos semitransparentes de sus antepasados hasta llegar a uno
 * opaco. El mínimo es el de B8, el de WCAG AA: 4,5:1, y 3:1 para el texto grande
 * (24 px, o 18,66 px en negrita).
 *
 * Lo que no cuenta, como en WCAG: lo apagado (un botón que no se puede pulsar), lo
 * que un lector de pantalla no lee (`aria-hidden`) y lo que está escondido.
 */
const ROSA = 'rosa@ejemplo.estook.com';
const VERA = 'vera@ejemplo.estook.com';
const TEMAS: readonly TemaDePrueba[] = ['claro', 'oscuro'];

// En Chromium, en el ordenador y en el móvil: el móvil tiene piezas que solo salen
// ahí —la barra de abajo— y fue donde apareció la mitad de lo que no se leía. Safari
// no añade nada: los colores los decide la aplicación, no el navegador.
test.skip(({ browserName }) => browserName !== 'chromium', 'El contraste se mide en Chromium');

const PANTALLAS = [
  { quien: ROSA, direccion: '' },
  { quien: ROSA, direccion: 'inventario/resumen' },
  { quien: ROSA, direccion: 'inventario/productos/todo' },
  { quien: ROSA, direccion: 'inventario/movimientos/todo' },
  { quien: ROSA, direccion: 'inventario/movimientos/mermas' },
  { quien: ROSA, direccion: 'inventario/compras/pedidos' },
  { quien: ROSA, direccion: 'inventario/compras/proveedores' },
  { quien: ROSA, direccion: 'servicio' },
  { quien: ROSA, direccion: 'negocio/ventas' },
  { quien: ROSA, direccion: 'equipo/resumen' },
  { quien: ROSA, direccion: 'equipo/fichajes' },
  { quien: ROSA, direccion: 'equipo/personas/con-acceso' },
  { quien: ROSA, direccion: 'calendario' },
  { quien: ROSA, direccion: 'ajustes/aparato' },
  { quien: VERA, direccion: 'inventario/resumen' },
  { quien: VERA, direccion: 'inventario/productos/todo' },
] as const;

interface TextoQueNoSeLee {
  readonly texto: string;
  readonly donde: string;
  readonly razon: number;
  readonly minimo: number;
}

/** Cada texto visible, medido contra lo que tiene debajo. Corre en el navegador. */
async function loQueNoSeLee(page: Page): Promise<readonly TextoQueNoSeLee[]> {
  return page.evaluate(() => {
    type Rgba = [number, number, number, number];

    // Se pinta el color en un lienzo de un píxel y se lee: así se entiende
    // cualquier color que entienda CSS, `oklab()` y `color-mix()` incluidos, que
    // es como llegan los de Tailwind 4 con transparencia.
    const lienzo = document.createElement('canvas').getContext('2d', {
      willReadFrequently: true,
    });
    function comoColor(texto: string): Rgba {
      if (lienzo === null || texto === 'transparent') return [0, 0, 0, 0];
      lienzo.clearRect(0, 0, 1, 1);
      lienzo.fillStyle = texto;
      lienzo.fillRect(0, 0, 1, 1);
      const [r = 0, g = 0, b = 0, a = 0] = lienzo.getImageData(0, 0, 1, 1).data;
      return [r, g, b, a / 255];
    }

    function encima(arriba: Rgba, abajo: Rgba): Rgba {
      const a = arriba[3] + abajo[3] * (1 - arriba[3]);
      if (a === 0) return [0, 0, 0, 0];
      const canal = (i: 0 | 1 | 2) =>
        (arriba[i] * arriba[3] + abajo[i] * abajo[3] * (1 - arriba[3])) / a;
      return [canal(0), canal(1), canal(2), a];
    }

    const pagina = comoColor(getComputedStyle(document.body).backgroundColor);
    function fondoDe(elemento: Element): Rgba {
      let color: Rgba = [0, 0, 0, 0];
      for (let nodo: Element | null = elemento; nodo !== null; nodo = nodo.parentElement) {
        color = encima(color, comoColor(getComputedStyle(nodo).backgroundColor));
        if (color[3] >= 0.999) return color;
      }
      return encima(color, pagina[3] > 0 ? pagina : [255, 255, 255, 1]);
    }

    function opacidadDe(elemento: Element): number {
      let total = 1;
      for (let nodo: Element | null = elemento; nodo !== null; nodo = nodo.parentElement) {
        total *= Number(getComputedStyle(nodo).opacity);
      }
      return total;
    }

    function luz([r, g, b]: Rgba): number {
      const lineal = (c: number) => {
        const s = c / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * lineal(r) + 0.7152 * lineal(g) + 0.0722 * lineal(b);
    }

    const fallos: TextoQueNoSeLee[] = [];
    for (const elemento of Array.from(document.body.querySelectorAll('*'))) {
      const suyo = Array.from(elemento.childNodes)
        .filter((n) => n.nodeType === Node.TEXT_NODE)
        .map((n) => n.textContent ?? '')
        .join('')
        .trim();
      if (suyo === '' || elemento.closest('svg, [aria-hidden="true"], [inert]') !== null) continue;

      const caja = elemento.getBoundingClientRect();
      const estilo = getComputedStyle(elemento);
      if (caja.width <= 1 || caja.height <= 1) continue;
      if (estilo.visibility === 'hidden' || estilo.display === 'none') continue;
      const apagado =
        elemento.closest(
          'button:disabled, [aria-disabled="true"], fieldset:disabled, input:disabled, select:disabled',
        ) !== null;
      if (apagado) continue;

      const fondo = fondoDe(elemento);
      const tinta = comoColor(estilo.color);
      const visto = encima([tinta[0], tinta[1], tinta[2], tinta[3] * opacidadDe(elemento)], fondo);
      const [clara, oscura] = [luz(visto), luz(fondo)].sort((x, y) => y - x) as [number, number];
      const razon = (clara + 0.05) / (oscura + 0.05);

      const tamano = Number.parseFloat(estilo.fontSize);
      const negrita = Number(estilo.fontWeight) >= 600;
      const minimo = tamano >= 24 || (tamano >= 18.66 && negrita) ? 3 : 4.5;
      if (razon < minimo) {
        fallos.push({
          texto: suyo.slice(0, 40),
          donde: `${elemento.tagName.toLowerCase()}.${elemento.className.slice(0, 70)}`,
          razon: Math.floor(razon * 100) / 100,
          minimo,
        });
      }
    }
    return fallos;
  });
}

for (const tema of TEMAS) {
  test(`en ${tema}, entrar se lee entero`, async ({ page }) => {
    await abrirConTema(page, tema);
    await expect(page.getByLabel('Tu correo')).toBeVisible();
    const fallos = await loQueNoSeLee(page);
    expect(fallos, JSON.stringify(fallos, null, 2)).toEqual([]);
  });

  for (const pantalla of PANTALLAS) {
    const quien = pantalla.quien.split('@')[0] ?? '';
    test(`en ${tema}, ${pantalla.direccion || 'el Panel'} (${quien}) se lee entera`, async ({
      page,
    }) => {
      await entrarEnLaApp(page, pantalla.quien, tema);
      await irA(page, pantalla.direccion);
      await page.waitForLoadState('networkidle');

      const fallos = await loQueNoSeLee(page);
      expect(fallos, JSON.stringify(fallos, null, 2)).toEqual([]);
    });
  }
}
