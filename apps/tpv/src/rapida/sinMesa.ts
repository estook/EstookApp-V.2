import type { FormaDePago } from '@estook/dominio';
import type { LaMesa } from '../datos/tipos.ts';

/**
 * **La venta rápida, por dentro** (el rediseño, 0148): lo que no se pinta.
 *
 * Mientras se tica no hay cuenta todavía: se abre al cobrar o al pasarla a una mesa, con lo elegido
 * (aquí o para llevar, y el nombre). La botonera necesita una «mesa» para saber si va por pases o
 * tiene alergias: esta es la de una venta sin mesa, sin comensales y todo junto.
 */
export function laVentaSinMesa(tipo: 'barra' | 'para_llevar'): LaMesa {
  return {
    cuentaId: '',
    titulo: 'Venta rápida',
    tipo,
    mesaId: null,
    personas: null,
    camarero: null,
    porPases: false,
    notaParaCocina: null,
    conPrisa: false,
    cocinaLlamaEn: null,
    alergias: [],
    abierta: true,
    minutos: 0,
    totalCentimos: 0,
    platos: [],
    pases: [],
    loSiguiente: { que: 'pedir' },
  };
}

/** Los métodos de un toque: efectivo y tarjeta siempre; Bizum, si el local lo usa. El cheque, no. */
export const LOS_METODOS_DE_LA_RAPIDA: readonly FormaDePago[] = ['efectivo', 'tarjeta', 'bizum'];
