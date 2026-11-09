import { BILLETES, CUANTOS_COMO_MUCHO, MONEDAS, nombreDeLaDenominacion } from '@estook/dominio';
import { eurosConSimbolo } from '../logica/texto.ts';
import type { ElRecuento } from './tipos.ts';

/**
 * **Contar el cajón, billete a billete** (Anexo 11.6; maqueta del 9-nov): de 500 € a 1 céntimo, con
 * el «+» y el «−» o escribiendo cuántos, y lo de cada uno debajo. El total lo pone quien lo usa:
 * al abrir se ve; al cerrar, **no se ve lo que debería haber** hasta acabar.
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
    <div className="flex flex-col gap-e3">
      {(
        [
          ['Billetes', BILLETES],
          ['Monedas', MONEDAS],
        ] as const
      ).map(([titulo, lista]) => (
        <section key={titulo} className="flex flex-col gap-e2" aria-label={titulo}>
          <h3 className="text-etiqueta font-bold uppercase tracking-wider text-texto-tenue">
            {titulo}
          </h3>
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(10.5rem,1fr))] gap-e2">
            {lista.map((d) => {
              const cuantos = recuento[String(d)] ?? 0;
              const nombre = nombreDeLaDenominacion(d);
              return (
                <li
                  key={d}
                  className="grid grid-cols-[1fr_auto] items-center gap-x-e2 gap-y-e1 rounded-grande border border-borde bg-superficie py-e2 pl-e3 pr-e2"
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
                      className="flex size-10 items-center justify-center rounded-grande bg-charcoal text-seccion font-bold"
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
                      className="h-10 w-12 rounded-chico border border-borde bg-fondo text-center font-bold tabular-nums"
                    />
                    <button
                      type="button"
                      aria-label={`Uno más de ${nombre}`}
                      onClick={() => {
                        poner(d, cuantos + 1);
                      }}
                      className="flex size-10 items-center justify-center rounded-grande bg-charcoal text-seccion font-bold"
                    >
                      +
                    </button>
                  </span>
                  <span
                    className={`col-span-2 text-etiqueta tabular-nums ${cuantos > 0 ? 'text-texto-suave' : 'text-texto-tenue opacity-60'}`}
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
