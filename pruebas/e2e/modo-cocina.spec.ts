import { expect, test, type Page } from '@playwright/test';

/**
 * V · punto 1 · el modo cocina, medido en las pantallas de verdad.
 *
 * «Terminado cuando: con el modo puesto, una prueba recorre las pantallas de cocina
 * y ningún botón mide menos de 64 px ni baja de 7:1» (mejoras antes de M8). Las
 * fichas ya se prueban solas (`contraste.prueba.ts`), pero **cumplir en la ficha no
 * es cumplir en la pantalla**: basta una clase suelta con un alto fijo, o un botón
 * sobre un fondo que no es el de la ficha, para que el guante no acierte o el texto
 * no se lea con vapor. Eso solo se ve preguntándole al navegador (regla 14).
 *
 * Entra Marcos, que es cocinero y es para quien existe este modo.
 */
const APP = 'http://localhost:5174/';
const CLAVE = 'estook en desarrollo';
const MARCOS = 'marcos@ejemplo.estook.com';

/** De `usarModoCocina`: la clave del aparato y lo que guarda. */
const DONDE_SE_GUARDA = 'estook.modo-cocina';

/** Las pantallas de un cocinero. */
const PANTALLAS = [
  '#/',
  '#/inventario/hoy',
  '#/inventario/productos/todo',
  '#/inventario/movimientos/todo',
  '#/inventario/compras/pedidos',
  '#/calendario',
  '#/servicio',
  '#/ajustes',
] as const;

async function entrarConElModoPuesto(page: Page) {
  await page.goto(APP, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    try {
      window.localStorage.clear();
    } catch {
      /* en navegación privada no se puede, y no pasa nada */
    }
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByLabel('Tu correo').fill(MARCOS);
  await page.getByLabel('Tu contraseña').fill(CLAVE);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Entra en Estook' })).toHaveCount(0);

  // Como lo deja el interruptor de Ajustes: en el aparato.
  await page.evaluate((clave) => {
    window.localStorage.setItem(clave, 'si');
  }, DONDE_SE_GUARDA);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('html')).toHaveAttribute('data-cocina', 'si');
}

interface Incumplimiento {
  readonly que: string;
  /** La etiqueta y sus clases, para encontrarlo sin adivinar. */
  readonly donde: string;
  readonly alto: number;
  readonly ancho: number;
  readonly contraste: number | null;
}

/**
 * Lo que se toca y no cumple, medido en el navegador.
 *
 * El tamaño es la caja que se toca. El contraste, el del texto contra **el fondo
 * que tiene de verdad debajo**: se suben los ancestros componiendo los fondos
 * semitransparentes hasta llegar a uno opaco, que es lo que ve el ojo. Lo apagado
 * no cuenta: WCAG deja fuera los controles que no se pueden usar.
 */
async function loQueNoCumple(page: Page): Promise<readonly Incumplimiento[]> {
  return page.evaluate(() => {
    type Rgba = [number, number, number, number];

    // El navegador no siempre contesta en `rgb()`: con Tailwind 4, lo que lleva
    // transparencia llega en `oklab(...)` o `color-mix(...)`. Leerlo a mano daba
    // negro, y un botón con el ratón encima salía a 1,2:1. Se pinta en un lienzo de
    // un píxel y se lee el píxel, que entiende cualquier color que entienda CSS.
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

    function fondoDe(elemento: Element): Rgba {
      let color: Rgba = [0, 0, 0, 0];
      for (let nodo: Element | null = elemento; nodo !== null; nodo = nodo.parentElement) {
        color = encima(color, comoColor(getComputedStyle(nodo).backgroundColor));
        if (color[3] >= 0.999) return color;
      }
      return encima(color, [255, 255, 255, 1]);
    }

    function luz([r, g, b]: Rgba): number {
      const lineal = (c: number) => {
        const s = c / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * lineal(r) + 0.7152 * lineal(g) + 0.0722 * lineal(b);
    }

    function contraste(elemento: Element): number | null {
      const texto = elemento.textContent.trim();
      if (texto === '') return null;
      const fondo = fondoDe(elemento);
      const tinta = encima(comoColor(getComputedStyle(elemento).color), fondo);
      const [clara, oscura] = [luz(tinta), luz(fondo)].sort((x, y) => y - x) as [number, number];
      return (clara + 0.05) / (oscura + 0.05);
    }

    const tocables = document.querySelectorAll<HTMLElement>(
      'button, a[href], [role="button"], [role="radio"], [role="tab"], [role="switch"], select, input:not([type="hidden"])',
    );
    const fallos: Incumplimiento[] = [];
    for (const tocable of Array.from(tocables)) {
      // Una casilla escondida detrás de su etiqueta —el patrón de los interruptores
      // y de «elegir el logo»— no se toca ella: se toca la etiqueta. Se mide esa.
      const escondida = (() => {
        const c = tocable.getBoundingClientRect();
        return c.width <= 2 && c.height <= 2;
      })();
      const suEtiqueta =
        tocable.closest('label') ??
        (tocable.id === '' ? null : document.querySelector(`label[for="${tocable.id}"]`));
      if (escondida && suEtiqueta === null) continue;
      const elemento = escondida && suEtiqueta !== null ? (suEtiqueta as HTMLElement) : tocable;
      const caja = elemento.getBoundingClientRect();
      const estilo = getComputedStyle(elemento);
      const seVe =
        caja.width > 0 &&
        caja.height > 0 &&
        estilo.visibility !== 'hidden' &&
        estilo.display !== 'none' &&
        elemento.closest('[aria-hidden="true"], [inert]') === null;
      const apagado =
        (elemento as HTMLButtonElement).disabled ||
        elemento.getAttribute('aria-disabled') === 'true';
      if (!seVe || apagado) continue;

      const razon = contraste(elemento);
      const pequeno = caja.height < 63.5 || caja.width < 63.5;
      const pocoContraste = razon !== null && razon < 7;
      if (pequeno || pocoContraste) {
        fallos.push({
          que:
            elemento.getAttribute('aria-label') ??
            (elemento.textContent.trim().slice(0, 40) === ''
              ? elemento.tagName.toLowerCase()
              : elemento.textContent.trim().slice(0, 40)),
          donde: `${elemento.tagName.toLowerCase()}.${elemento.className.slice(0, 80)}`,
          alto: Math.floor(caja.height),
          ancho: Math.floor(caja.width),
          contraste: razon === null ? null : Math.floor(razon * 10) / 10,
        });
      }
    }
    return fallos;
  });
}

for (const pantalla of PANTALLAS) {
  test(`con el modo cocina, nada que se toque en ${pantalla} baja de 64 px ni de 7:1`, async ({
    page,
  }) => {
    await entrarConElModoPuesto(page);
    await page.goto(`${APP}${pantalla}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 15_000 });
    // Que termine de llegar lo que se carga aparte, que también se toca.
    await page.waitForLoadState('networkidle');

    const fallos = await loQueNoCumple(page);
    expect(fallos, JSON.stringify(fallos, null, 2)).toEqual([]);

    // Y con todo más grande, nada se sale por los lados: una pantalla que se
    // desplaza de lado con un guante es una pantalla que no se usa.
    const seSale = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1,
    );
    expect(seSale, 'la pantalla se sale por los lados').toBe(false);
  });
}

test('con el modo cocina, la hoja de apuntar una merma también se toca con guantes', async ({
  page,
}) => {
  await entrarConElModoPuesto(page);
  await page.goto(`${APP}#/inventario/hoy`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Apuntar merma' }).first().click();
  const hoja = page.getByRole('dialog');
  await expect(hoja).toBeVisible({ timeout: 15_000 });
  await page.waitForLoadState('networkidle');

  const fallos = (await loQueNoCumple(page)).filter((f) => f.alto > 0);
  expect(fallos, JSON.stringify(fallos, null, 2)).toEqual([]);
});

/**
 * Los ajustes del aparato se ponen **al abrir la aplicación**, no al pasar por
 * Ajustes. Hasta V solo los ponía la pantalla de Ajustes, y la letra grande y el
 * modo cocina se perdían cada vez que se volvía a abrir: la tableta del pase
 * arrancaba cada mañana con los botones pequeños. La letra llevaba así desde M3.
 */
test('la letra y el modo cocina guardados se ponen al abrir, antes de entrar', async ({ page }) => {
  await page.goto(APP, { waitUntil: 'domcontentloaded' });
  await page.evaluate((clave) => {
    window.localStorage.setItem('estook.tamano-de-letra', 'grande');
    window.localStorage.setItem(clave, 'si');
  }, DONDE_SE_GUARDA);
  await page.reload({ waitUntil: 'domcontentloaded' });

  // En la pantalla de entrar, que es lo primero que ve la tableta al encenderse.
  await expect(page.getByLabel('Tu correo')).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-letra', 'grande');
  await expect(page.locator('html')).toHaveAttribute('data-cocina', 'si');
});
