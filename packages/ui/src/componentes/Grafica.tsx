import { Suspense, lazy } from 'react';
import { Cargando } from './Cargando.tsx';
import type { GraficaProps } from './grafica-tipos.ts';

export type { GraficaProps, SerieDeGrafica, FormaDeGrafica } from './grafica-tipos.ts';

/**
 * La grafica · Partes B4 y B7 del Plan.
 *
 * «Graficas: Recharts. Suficiente y ligero» (A3).
 *
 * ── Por que se carga aparte ──────────────────────────────────────────────────
 *
 * Recharts pesa mas de 100 KB comprimido: el presupuesto de B7 entero es 250 KB
 * **para toda la aplicacion**. Si entrara en el paquete inicial, la mitad del
 * presupuesto se la comeria una libreria que la mayoria de pantallas no usa: en
 * Inventario no hay graficas, en el Cuaderno tampoco, y en un movil de cocina
 * eso son segundos de espera para nada.
 *
 * Asi que se parte en dos: este fichero es un envoltorio de dos lineas que entra
 * en el paquete inicial, y Recharts vive detras de un `lazy` que solo se
 * descarga la primera vez que aparece una grafica en pantalla. Mientras baja se
 * ve un esqueleto, que es lo que manda B4.
 *
 * Esto lo comprueba `herramientas/presupuesto-tamano.mjs` en integracion
 * continua: si alguien importa Recharts directamente desde una pantalla, el
 * paquete inicial se pasa del presupuesto y la fusion se bloquea.
 */
const Dibujo = lazy(async () => {
  const modulo = await import('./GraficaDibujo.tsx');
  return { default: modulo.GraficaDibujo };
});

export function Grafica({ cuandoNoHay, ...resto }: GraficaProps) {
  if (resto.datos.length === 0) return <>{cuandoNoHay}</>;

  return (
    <Suspense fallback={<Cargando que={resto.titulo} lineas={4} />}>
      <Dibujo {...resto} />
    </Suspense>
  );
}
