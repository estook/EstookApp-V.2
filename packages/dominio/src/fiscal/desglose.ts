import { centimos, entreFactor, porFraccion, suma, type Centimos } from '../dinero.ts';
import type { Regimen } from './vocabulario.ts';

/**
 * Como viene el precio. En hosteleria los precios de carta llevan el impuesto
 * dentro; en una factura a otra empresa, aparte.
 */
export const MODOS_DE_PRECIO = ['impuesto_incluido', 'impuesto_aparte'] as const;
export type ModoDePrecio = (typeof MODOS_DE_PRECIO)[number];

export interface LineaAFacturar {
  /** Con impuesto dentro o sin el, segun el modo. */
  readonly importe: Centimos;
  readonly regimen: Regimen;
  readonly tipo: number;
}

export interface GrupoFiscal {
  readonly regimen: Regimen;
  readonly tipo: number;
  readonly base: Centimos;
  readonly cuota: Centimos;
  readonly total: Centimos;
}

export interface Desglose {
  readonly grupos: readonly GrupoFiscal[];
  readonly base: Centimos;
  readonly cuota: Centimos;
  readonly total: Centimos;
}

/**
 * Desglosa un ticket, una factura o un cierre. **Una sola capa para todos**: el
 * TPV, las facturas, los cierres y los informes llaman aqui, y por eso no pueden
 * dar cifras distintas.
 *
 * La politica, decidida el 1 de septiembre de 2026:
 *
 *   1. Agrupar las lineas por tratamiento fiscal (regimen + tipo).
 *   2. Sumar los importes de cada grupo, sin redondear nada por el camino.
 *   3. Calcular el impuesto **sobre el total del grupo**, no linea a linea.
 *   4. Redondear una sola vez, al final de cada grupo.
 *   5. Nunca mezclar tipos distintos.
 *
 * Y una garantia que el ejemplo de mano no suele contemplar: **con impuesto
 * incluido, base + cuota da exactamente lo que paga el cliente**. La cuota se
 * saca restando, no calculando aparte, para que no falte ni sobre un centimo en
 * el ticket.
 */
export function desglosar(lineas: readonly LineaAFacturar[], modo: ModoDePrecio): Desglose {
  const porTratamiento = new Map<string, { regimen: Regimen; tipo: number; importe: number }>();

  for (const linea of lineas) {
    if (!Number.isFinite(linea.tipo) || linea.tipo < 0) {
      throw new Error(`«${linea.tipo}» no es un tipo impositivo.`);
    }
    const clave = `${linea.regimen}|${linea.tipo}`;
    const grupo = porTratamiento.get(clave);
    if (grupo) grupo.importe += linea.importe;
    else
      porTratamiento.set(clave, {
        regimen: linea.regimen,
        tipo: linea.tipo,
        importe: linea.importe,
      });
  }

  // Orden estable: por regimen y luego por tipo. Dos ejecuciones dan lo mismo.
  const ordenados = [...porTratamiento.values()].sort(
    (uno, otro) => uno.regimen.localeCompare(otro.regimen) || uno.tipo - otro.tipo,
  );

  const grupos: GrupoFiscal[] = ordenados.map(({ regimen, tipo, importe }) => {
    const acumulado = centimos(importe);

    if (modo === 'impuesto_incluido') {
      const base = entreFactor(acumulado, 1 + tipo);
      // Restando, no calculando: asi base + cuota es exactamente lo que se cobro.
      const cuota = centimos(acumulado - base);
      return { regimen, tipo, base, cuota, total: acumulado };
    }

    const cuota = porFraccion(acumulado, tipo);
    return { regimen, tipo, base: acumulado, cuota, total: centimos(acumulado + cuota) };
  });

  return {
    grupos,
    base: suma(...grupos.map((g) => g.base)),
    cuota: suma(...grupos.map((g) => g.cuota)),
    total: suma(...grupos.map((g) => g.total)),
  };
}
