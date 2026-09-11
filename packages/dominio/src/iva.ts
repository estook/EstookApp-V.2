import { entreFactor, porCantidad, type Centimos } from './dinero.ts';

/**
 * El IVA de lo que se compra (M7, repaso).
 *
 * ── Cómo lo hacen las aplicaciones que funcionan, y por qué así ─────────────
 *
 * Las de contabilidad y las de compras para hostelería hacen lo mismo, y es lo
 * que se copia aquí:
 *
 *   · **El precio se guarda sin impuesto**, siempre. Es con lo que se comparan
 *     proveedores, se concilian facturas —la factura concilia su base— y se
 *     calcula el coste de un plato: el IVA de compra se recupera, no es coste.
 *   · **Cada producto lleva su tipo**, porque no todos pagan lo mismo: la leche,
 *     el pan o la fruta van al 4 %; casi toda la comida al 10 %; el alcohol y los
 *     refrescos azucarados al 21 %.
 *   · **Al escribir un precio se elige si lleva IVA o no**, con lo que el local
 *     suele usar puesto por defecto, y se enseña la otra cifra al lado. Quien
 *     copia del ticket del mayorista escribe lo del ticket, y Estook hace la
 *     cuenta.
 *
 * ── Lo que no se supone ──────────────────────────────────────────────────────
 *
 * En Canarias es IGIC y en Ceuta y Melilla IPSI, con tipos distintos por bien y
 * por operación: el motor fiscal ya lo tiene escrito como «pendiente de dato»
 * (decisión 0006). Ahí no hay tipo por defecto: se pone el suyo, o se escribe el
 * precio sin impuesto.
 */

/** Los tipos que se ofrecen, en fracción: 0,10 es un 10 %. */
export const TIPOS_DE_IVA_DE_COMPRA = [0.04, 0.1, 0.21] as const;

/**
 * El tipo que se paga al comprar algo de esta categoría fiscal.
 *
 * Es un punto de partida, y por eso se puede cambiar en cada producto: dentro de
 * «alimento» cabe el pan al 4 % y el jamón al 10 %.
 */
export function ivaDeCompraPorDefecto(categoriaFiscal: string, territorio: string): number | null {
  if (territorio !== 'peninsula_y_baleares') return null;
  switch (categoriaFiscal) {
    case 'alimento':
    case 'bebida_refrescante':
      return 0.1;
    case 'bebida_alcoholica':
    case 'bebida_refrescante_azucarada':
    case 'otros':
      return 0.21;
    default:
      return null;
  }
}

/** Lo que queda sin el impuesto: 11,00 € al 10 % son 10,00 €. */
export function sinIva(conElImpuesto: Centimos, tipo: number): Centimos {
  if (!Number.isFinite(tipo) || tipo < 0) throw new Error(`«${tipo}» no es un tipo de IVA.`);
  return entreFactor(conElImpuesto, 1 + tipo);
}

/** Lo que cuesta con el impuesto: 10,00 € al 10 % son 11,00 €. */
export function conIva(sinElImpuesto: Centimos, tipo: number): Centimos {
  if (!Number.isFinite(tipo) || tipo < 0) throw new Error(`«${tipo}» no es un tipo de IVA.`);
  return porCantidad(sinElImpuesto, 1 + tipo);
}

/** «10 %», «4 %», «21 %». */
export function comoSeDiceElTipo(tipo: number): string {
  return `${Number((tipo * 100).toFixed(2))
    .toString()
    .replace('.', ',')} %`;
}
