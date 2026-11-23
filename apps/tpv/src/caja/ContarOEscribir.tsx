import { ContarElCajon } from './ContarElCajon.tsx';
import { SIN_CONTAR, type LoContado } from './loContado.ts';

/**
 * **Contar el cajón, de una forma o de la otra** (maqueta corregida del 23-nov): «Billete a billete» o
 * «Escribir el total», solo si el local lo enciende en Ajustes; si no, billete a billete, como siempre.
 * Al abrir, al entregar y al cerrar.
 */
export function ContarOEscribir({
  valor,
  alCambiar,
  sePuedeEscribir,
}: {
  readonly valor: LoContado;
  readonly alCambiar: (nuevo: LoContado) => void;
  readonly sePuedeEscribir: boolean;
}) {
  const escribiendo = sePuedeEscribir && valor.modo === 'total';
  return (
    <div className="flex flex-col gap-e3">
      {sePuedeEscribir && (
        <div className="flex flex-wrap gap-e2" role="group" aria-label="Cómo contar">
          {(
            [
              ['billetes', 'Billete a billete'],
              ['total', 'Escribir el total'],
            ] as const
          ).map(([modo, texto]) => (
            <button
              key={modo}
              type="button"
              aria-pressed={valor.modo === modo}
              onClick={() => {
                if (valor.modo === modo) return;
                alCambiar(modo === 'billetes' ? SIN_CONTAR : { modo: 'total', texto: '' });
              }}
              className={`min-h-toque rounded-redondo border-2 px-e4 font-bold ${
                valor.modo === modo ? 'border-naranja bg-naranja-suave' : 'border-borde'
              }`}
            >
              {texto}
            </button>
          ))}
        </div>
      )}
      {escribiendo ? (
        <label className="flex max-w-[28rem] items-center justify-between gap-e3 rounded-grande border-2 border-borde bg-fondo px-e4 py-e2 focus-within:border-naranja">
          <span className="text-texto-suave">Total contado</span>
          <input
            inputMode="decimal"
            autoFocus
            placeholder="0,00"
            value={valor.texto}
            onChange={(e) => {
              alCambiar({ modo: 'total', texto: e.currentTarget.value });
            }}
            className="w-[9ch] bg-transparent text-right text-cifra-larga font-bold tabular-nums outline-none"
          />
        </label>
      ) : (
        <ContarElCajon
          recuento={valor.modo === 'billetes' ? valor.recuento : {}}
          alCambiar={(recuento) => {
            alCambiar({ modo: 'billetes', recuento });
          }}
        />
      )}
    </div>
  );
}
