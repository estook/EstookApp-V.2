import { useState } from 'react';
import {
  TIPOS_DE_IVA_DE_COMPRA,
  centimos,
  comoSeDiceElTipo,
  conIva,
  sinIva,
  type Centimos,
} from '@estook/dominio';
import { CampoMoneda, clases } from '@estook/ui';
import { comoDinero } from './contrato.ts';

/**
 * Un precio de compra, escrito con IVA o sin él (M7, repaso).
 *
 * «Los precios que pusiste llevan IVA: estaría genial una opción para elegir si
 *  el IVA está incluido o excluido, bien puesta, como lo hacen las mejores.»
 *
 * Es el patrón de las aplicaciones de compras y de contabilidad: **el precio se
 * guarda sin IVA** y se escribe como venga el papel. Debajo del campo, dos
 * pastillas —«Sin IVA», «Con IVA»— y, si lleva, su tipo; y al lado, la otra cifra
 * ya calculada, para ver lo que se va a guardar antes de guardarlo. La cuenta la
 * hace el dominio (`sinIva`), que es su único dueño.
 *
 * Empieza como escribe el local —«apunto los precios con IVA», en Ajustes— y se
 * puede cambiar en cada precio: el ticket del mayorista trae IVA y el albarán del
 * pescadero no.
 */
export function CampoPrecioDeCompra({
  etiqueta,
  ayuda,
  valor,
  alCambiar,
  iva,
  conIvaDeEntrada,
  alElegirTipo,
}: {
  readonly etiqueta: string;
  readonly ayuda?: string;
  /** Lo que se guarda: **sin IVA**, en céntimos. */
  readonly valor: number | null;
  readonly alCambiar: (sinElImpuesto: Centimos | null) => void;
  /** El tipo del producto. Nulo: sin tipo, como en Canarias; entonces solo se escribe sin impuesto. */
  readonly iva: number | null;
  /** Cómo escribe este local: con IVA o sin él. */
  readonly conIvaDeEntrada: boolean;
  /** Si se elige otro tipo aquí, para guardarlo en el producto. */
  readonly alElegirTipo?: (tipo: number) => void;
}) {
  const [conElImpuesto, setConElImpuesto] = useState(conIvaDeEntrada && iva !== null);
  const [tipo, setTipo] = useState<number>(iva ?? 0.1);

  // Lo que se ve en el campo, según cómo se esté escribiendo.
  const escrito =
    valor === null ? null : conElImpuesto ? conIva(centimos(valor), tipo) : centimos(valor);

  function escribir(nuevo: Centimos | null, comoSeEscribe = conElImpuesto, conTipo = tipo) {
    if (nuevo === null) {
      alCambiar(null);
      return;
    }
    alCambiar(comoSeEscribe ? sinIva(nuevo, conTipo) : nuevo);
  }

  const pastilla = (puesta: boolean) =>
    clases(
      'inline-flex min-h-[36px] items-center rounded-redondo border px-e3 text-secundario font-medium',
      puesta
        ? 'border-naranja bg-naranja-suave text-texto'
        : 'border-borde-fuerte bg-superficie text-texto-suave hover:bg-fondo',
    );

  return (
    <div className="flex flex-col gap-e2">
      <CampoMoneda
        etiqueta={etiqueta}
        {...(ayuda === undefined ? {} : { ayuda })}
        valor={escrito}
        alCambiar={(nuevo) => {
          escribir(nuevo);
        }}
      />

      {iva !== null && (
        <div className="flex flex-wrap items-center gap-e2">
          <div role="radiogroup" aria-label={`${etiqueta}: con o sin IVA`} className="flex gap-e1">
            {[false, true].map((con) => (
              <button
                key={String(con)}
                type="button"
                role="radio"
                aria-checked={conElImpuesto === con}
                onClick={() => {
                  // Se queda lo que se guarda, y cambia lo que se ve.
                  setConElImpuesto(con);
                }}
                className={pastilla(conElImpuesto === con)}
              >
                {con ? 'Con IVA' : 'Sin IVA'}
              </button>
            ))}
          </div>

          {conElImpuesto && (
            <div role="radiogroup" aria-label="Qué IVA lleva" className="flex gap-e1">
              {TIPOS_DE_IVA_DE_COMPRA.map((t) => (
                <button
                  key={t}
                  type="button"
                  role="radio"
                  aria-checked={tipo === t}
                  onClick={() => {
                    setTipo(t);
                    alElegirTipo?.(t);
                    // Lo escrito se queda: lo que cambia es lo que se guarda.
                    escribir(escrito, true, t);
                  }}
                  className={pastilla(tipo === t)}
                >
                  {comoSeDiceElTipo(t)}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {valor !== null && iva !== null && (
        <p aria-live="polite" className="text-secundario text-texto-suave">
          {conElImpuesto
            ? `Se guarda ${comoDinero(valor)} sin IVA (${comoSeDiceElTipo(tipo)}).`
            : `Con IVA serían ${comoDinero(conIva(centimos(valor), tipo))} (${comoSeDiceElTipo(tipo)}).`}
        </p>
      )}
      {iva === null && (
        <p className="text-secundario text-texto-suave">Sin impuesto, como en el albarán.</p>
      )}
    </div>
  );
}
