import { BILLETES, CUANTOS_COMO_MUCHO, MONEDAS, nombreDeLaDenominacion } from '@estook/dominio';
import { eurosConSimbolo } from '../logica/texto.ts';
import type { ElRecuento } from './tipos.ts';

/**
 * **Contar el cajón, billete a billete** (Anexo 11.6; maqueta del 9-nov): de 500 € a 1 céntimo, con
 * el «+» y el «−» o escribiendo cuántos, y lo de cada uno a su derecha. El total lo pone quien lo usa:
 * al abrir se ve; al cerrar, **no se ve lo que debería haber** hasta acabar.
 *
 * **Una fila por billete o moneda**, en dos columnas en la caja (billetes a un lado, monedas al otro) y
 * una sola en el móvil: así se cuenta de arriba abajo, como se vacía el cajón. Antes eran baldosas en
 * rejilla, y en una pantalla ancha el «+» de una se montaba encima de la siguiente (Richi, 10-nov).
 */
export function ContarElCajon({
  recuento,
  alCambiar,
}: {
  readonly recuento: ElRecuento;
  readonly alCambiar: (nuevo: ElRecuento) => void;
}) {
  function poner(denominacion: number, cuantos: number) {
    const n = Number.isFinite(cuantos)
      ? Math.max(0, Math.min(CUANTOS_COMO_MUCHO, Math.trunc(cuantos)))
      : 0;
    alCambiar({ ...recuento, [String(denominacion)]: n });
  }

  return (
    <div className="grid grid-cols-1 gap-e4 md:grid-cols-2 md:gap-e5">
      {(
        [
          ['Billetes', BILLETES],
          ['Monedas', MONEDAS],
        ] as const
      ).map(([titulo, lista]) => (
        <section key={titulo} className="flex min-w-0 flex-col gap-e2" aria-label={titulo}>
          <h3 className="text-etiqueta font-bold uppercase tracking-wider text-texto-tenue">
            {titulo}
          </h3>
          <ul className="flex flex-col divide-y divide-borde rounded-grande border border-borde bg-superficie">
            {lista.map((d) => {
              const cuantos = recuento[String(d)] ?? 0;
              const nombre = nombreDeLaDenominacion(d);
              return (
                <li
                  key={d}
                  className="grid grid-cols-[4rem_auto_minmax(0,1fr)] items-center gap-e3 px-e3 py-e2"
                >
                  <label htmlFor={`contar-${String(d)}`} className="whitespace-nowrap font-bold">
                    {nombre}
                  </label>
                  <span className="flex items-center gap-e1">
                    <button
                      type="button"
                      aria-label={`Uno menos de ${nombre}`}
                      onClick={() => {
                        poner(d, cuantos - 1);
                      }}
                      className="flex size-11 items-center justify-center rounded-grande bg-charcoal text-seccion font-bold"
                    >
                      −
                    </button>
                    <input
                      id={`contar-${String(d)}`}
                      inputMode="numeric"
                      value={String(cuantos)}
                      onFocus={(e) => {
                        e.currentTarget.select();
                      }}
                      onChange={(e) => {
                        poner(d, Number(e.currentTarget.value.replace(/\D/g, '') || '0'));
                      }}
                      className="h-11 w-14 rounded-chico border border-borde bg-fondo text-center font-bold tabular-nums"
                    />
                    <button
                      type="button"
                      aria-label={`Uno más de ${nombre}`}
                      onClick={() => {
                        poner(d, cuantos + 1);
                      }}
                      className="flex size-11 items-center justify-center rounded-grande bg-charcoal text-seccion font-bold"
                    >
                      +
                    </button>
                  </span>
                  <span
                    className={`truncate text-right tabular-nums ${cuantos > 0 ? 'font-bold' : 'text-texto-tenue'}`}
                  >
                    {eurosConSimbolo(d * cuantos)}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
