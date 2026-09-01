import type { ReactNode } from 'react';

/**
 * Los tipos de la grafica, aparte de los dos componentes.
 *
 * Estan aqui por una razon concreta: `Grafica.tsx` carga `GraficaDibujo.tsx` con
 * `lazy`, y el dibujo necesita los tipos de la grafica. Si los pidiera al primero
 * habria un **ciclo de dependencias**, y `.dependency-cruiser.cjs` lo bloquea con
 * razon: «un ciclo hace imposible razonar sobre el codigo».
 *
 * Que sea un ciclo «solo de tipos» no lo salva. Un tercer fichero sin
 * dependencias, del que tiran los dos, lo deshace y ademas se lee mejor.
 */
export type FormaDeGrafica = 'lineas' | 'barras';

export interface SerieDeGrafica {
  readonly clave: string;
  readonly nombre: string;
  /** El color. Lo normal es el acento de la app. */
  readonly color: string;
}

export interface GraficaProps {
  /** Que ensena, para quien no la ve. Obligatorio: una grafica sin esto es muda. */
  readonly titulo: string;
  readonly datos: readonly Record<string, number | string>[];
  /** La clave del eje de abajo. */
  readonly eje: string;
  readonly series: readonly SerieDeGrafica[];
  readonly forma?: FormaDeGrafica;
  readonly alto?: number;
  /** Como se escriben los valores. Aqui entra `conSimbolo` para el dinero. */
  readonly formato?: (valor: number) => string;
  /** Que sale cuando no hay datos. Nunca un lienzo vacio. */
  readonly cuandoNoHay: ReactNode;
}
