import { describe, expect, it } from 'vitest';
import { MOTIVOS_DE_MERMA } from './merma.ts';
import { TIPOS_DE_MOVIMIENTO } from './inventario.ts';
import {
  FAMILIAS_DE_SALIDA,
  MOTIVOS_DE_SALIDA,
  QUE_ES_CADA_SALIDA,
  esMerma,
  esMotivoDeSalida,
  esVenta,
  losDeLaFamilia,
} from './salida.ts';

describe('por qué sale el género', () => {
  it('vender y gastar dejan de ser el mismo botón', () => {
    // Es el fallo entero que este catálogo arregla: «Gastado o vendido» decía que
    // las dos cosas eran una, y con ellas juntas no hay margen que valga.
    expect(QUE_ES_CADA_SALIDA.vendido.familia).toBe('se_vende');
    expect(QUE_ES_CADA_SALIDA.gastado.familia).toBe('se_usa');
    expect(QUE_ES_CADA_SALIDA.vendido.tipo).toBe('venta');
    expect(QUE_ES_CADA_SALIDA.gastado.tipo).toBe('salida');
  });

  it('solo lo vendido puede traer dinero', () => {
    const conDinero = MOTIVOS_DE_SALIDA.filter((motivo) => esVenta(motivo));
    expect(conDinero).toEqual(['vendido']);
  });

  it('los siete motivos de merma de la 0028 están, y se apuntan como merma', () => {
    const comoMerma = MOTIVOS_DE_SALIDA.filter((motivo) => esMerma(motivo));
    // Todos los de la lista cerrada menos «otro», que al sacar género no es una
    // pérdida: es una salida con su nota.
    expect([...comoMerma].sort()).toEqual([...MOTIVOS_DE_MERMA.filter((m) => m !== 'otro')].sort());
    for (const motivo of comoMerma) {
      expect(QUE_ES_CADA_SALIDA[motivo].tipo).toBe('merma');
      expect(QUE_ES_CADA_SALIDA[motivo].motivoDeMerma).toBe(motivo);
    }
  });

  it('«otra cosa» no cuenta como pérdida, y pide contarlo', () => {
    expect(QUE_ES_CADA_SALIDA.otro.motivoDeMerma).toBeNull();
    expect(QUE_ES_CADA_SALIDA.otro.tipo).toBe('salida');
    expect(QUE_ES_CADA_SALIDA.otro.pideNota).toBe(true);
  });

  it('cada motivo cae en una familia y en una sola', () => {
    const repartidos = FAMILIAS_DE_SALIDA.flatMap((familia) => losDeLaFamilia(familia));
    expect([...repartidos].sort()).toEqual([...MOTIVOS_DE_SALIDA].sort());
    expect(new Set(repartidos).size).toBe(MOTIVOS_DE_SALIDA.length);
  });

  it('ningún motivo produce un tipo de movimiento que no exista', () => {
    for (const motivo of MOTIVOS_DE_SALIDA) {
      expect(TIPOS_DE_MOVIMIENTO).toContain(QUE_ES_CADA_SALIDA[motivo].tipo);
    }
  });

  it('lo que llega de fuera se comprueba contra la lista', () => {
    expect(esMotivoDeSalida('vendido')).toBe(true);
    expect(esMotivoDeSalida('regalado')).toBe(false);
    expect(esMotivoDeSalida(7)).toBe(false);
  });
});
