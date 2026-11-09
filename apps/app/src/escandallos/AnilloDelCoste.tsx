import { comoPorcentaje, type Semaforo } from './contrato.ts';

const REDONDO = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 });

/** El color del semáforo: verde hasta tu objetivo, ámbar un poco por encima, rojo más. */
const COLOR: Readonly<Record<Semaforo, string>> = {
  verde: 'var(--color-bien)',
  ambar: 'var(--color-atencion)',
  rojo: 'var(--color-mal)',
  sin_dato: 'var(--color-texto-tenue)',
};

/**
 * **El food cost en un anillo** (el repaso del 8-nov, 0143): cuánto se lleva el coste de lo que
 * se cobra, lleno hasta su porcentaje y del color de su semáforo. Se lee de un vistazo en una
 * lista larga, sin leer cifras: el rojo salta.
 */
export function AnilloDelCoste({
  foodCost,
  semaforo,
  lado = 40,
}: {
  /** En puntos: 28,4 es un 28,4 %. */
  readonly foodCost: number;
  readonly semaforo: Semaforo;
  readonly lado?: number;
}) {
  const lleno = Math.max(0, Math.min(100, foodCost));
  const grueso = Math.max(4, Math.floor(lado / 9));
  return (
    <span
      role="img"
      aria-label={`Food cost ${comoPorcentaje(foodCost)}`}
      className="grid shrink-0 place-items-center rounded-redondo"
      style={{
        width: lado,
        height: lado,
        background: `conic-gradient(${COLOR[semaforo]} ${String(lleno)}%, var(--color-fondo) 0)`,
      }}
    >
      {/* El número redondo y el «%» al lado, en una línea: en un anillo de 40 px, «37,7» y el
          «%» debajo no se leen. La cifra exacta va en su nombre y en el detalle del plato. */}
      <span
        className="flex items-center justify-center rounded-redondo bg-superficie font-bold leading-none tabular-nums"
        style={{
          width: lado - grueso * 2,
          height: lado - grueso * 2,
          fontSize: Math.max(11, Math.floor(lado / 3.4)),
        }}
      >
        {REDONDO.format(foodCost)}
        <span className="text-[0.62em] font-semibold text-texto-suave">%</span>
      </span>
    </span>
  );
}
