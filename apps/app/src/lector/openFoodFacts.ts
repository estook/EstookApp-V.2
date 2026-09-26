import { esDeTienda } from './codigos.ts';

/**
 * El nombre que propone Open Food Facts para un código que no es de ningún producto
 * del local (entrega L).
 *
 * «Si el código no existe, abre el alta con él puesto. **Y propone el nombre** si lo
 * conoce Open Food Facts (gratis y sin clave), como propuesta: en hostelería muchos
 * códigos son de distribuidor y no estarán.» Por eso:
 *
 *   · **Solo se pregunta por códigos de tienda** (EAN/UPC con su control bien).
 *   · **Tres segundos como mucho**: si no contesta, el alta sigue sin propuesta. Nunca
 *     se espera a un tercero para dar de alta un producto.
 *   · **Es una propuesta**: sale encima del nombre y se acepta con un toque.
 *   · Lo único que sale del aparato es **el código de barras del producto**, que no
 *     dice nada de nadie.
 */
export interface LoQueDiceOpenFoodFacts {
  readonly nombre: string;
  readonly marca: string | null;
  /** «1 l», «500 g», tal como lo escriben. */
  readonly cantidad: string | null;
}

const ESPERA_MAXIMA_MS = 3000;

export async function loQueDiceOpenFoodFacts(
  codigo: string,
): Promise<LoQueDiceOpenFoodFacts | null> {
  if (!esDeTienda(codigo)) return null;
  const corte = new AbortController();
  const reloj = setTimeout(() => {
    corte.abort();
  }, ESPERA_MAXIMA_MS);
  try {
    const respuesta = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${codigo}.json?fields=product_name,product_name_es,brands,quantity`,
      { signal: corte.signal },
    );
    if (!respuesta.ok) return null;
    const cuerpo = (await respuesta.json()) as {
      status?: number;
      product?: {
        product_name_es?: string;
        product_name?: string;
        brands?: string;
        quantity?: string;
      };
    };
    const producto = cuerpo.product;
    const nombre = (producto?.product_name_es ?? producto?.product_name ?? '').trim();
    if (cuerpo.status !== 1 || nombre === '') return null;
    const marca = producto?.brands?.split(',')[0]?.trim() ?? '';
    const cantidad = producto?.quantity?.trim() ?? '';
    return {
      nombre,
      marca: marca === '' ? null : marca,
      cantidad: cantidad === '' ? null : cantidad,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(reloj);
  }
}
