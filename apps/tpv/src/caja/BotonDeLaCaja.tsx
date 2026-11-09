import { useEffect, useRef, useState } from 'react';
import { irA } from '../navegar.ts';
import { laHora } from '../logica/texto.ts';
import { usarLaCaja } from './usarLaCaja.ts';

/**
 * **La caja, arriba en la sala** (Anexo 11.5; maqueta del 9-nov, tramo 3): un solo botón, verde con
 * la caja abierta; dentro, abrir el cajón, «Cómo va» y cerrar caja. Con la caja sin abrir, «Abrir
 * caja»; con la de ayer abierta, en ámbar, para cerrarla. Solo en la caja: un comandero no tiene
 * cajón.
 */
export function BotonDeLaCaja() {
  const caja = usarLaCaja();
  const [abierto, setAbierto] = useState(false);
  const fuera = useRef<HTMLDivElement>(null);

  // Tocar fuera cierra el menú.
  useEffect(() => {
    if (!abierto) return undefined;
    const alTocar = (e: PointerEvent) => {
      if (fuera.current !== null && !fuera.current.contains(e.target as Node)) setAbierto(false);
    };
    document.addEventListener('pointerdown', alTocar);
    return () => {
      document.removeEventListener('pointerdown', alTocar);
    };
  }, [abierto]);

  const c = caja.data;
  if (c === undefined || c.cajon === null) return null;

  if (c.abierta === null) {
    return (
      <button
        type="button"
        onClick={() => {
          irA('caja/abrir');
        }}
        className="flex min-h-toque items-center gap-e2 rounded-redondo border-2 border-bien px-e3 font-bold text-bien sm:px-e4"
      >
        Abrir caja
      </button>
    );
  }
  if (c.abierta.deOtroDia) {
    return (
      <button
        type="button"
        onClick={() => {
          irA('caja/cerrar');
        }}
        className="flex min-h-toque items-center gap-e2 rounded-redondo bg-atencion px-e3 font-bold text-fondo sm:px-e4"
      >
        Cerrar la de ayer
      </button>
    );
  }

  const ir = (a: string) => () => {
    setAbierto(false);
    irA(a);
  };
  return (
    <div ref={fuera} className="relative">
      <button
        type="button"
        aria-expanded={abierto}
        aria-haspopup="menu"
        onClick={() => {
          setAbierto((a) => !a);
        }}
        className="flex min-h-toque items-center gap-e2 rounded-redondo bg-bien px-e3 font-bold text-fondo sm:px-e4"
      >
        <span aria-hidden className="size-2.5 rounded-redondo bg-fondo" />
        Caja
      </button>
      {abierto && (
        <div
          role="menu"
          className="absolute right-0 top-full z-20 mt-e2 flex w-[18rem] flex-col gap-e2 rounded-grande border border-borde bg-superficie p-e3 shadow-lg"
        >
          <div className="flex items-baseline justify-between gap-e2 px-e1">
            <b>{c.cajon.nombre}</b>
            <span className="text-secundario text-texto-tenue">
              abierta por {c.abierta.abiertaPor} · {laHora(c.abierta.desde)}
            </span>
          </div>
          <button
            type="button"
            role="menuitem"
            onClick={ir('caja/cajon')}
            className="min-h-toque-cocina rounded-grande bg-charcoal font-bold"
          >
            Abrir el cajón
          </button>
          {c.puedoLlevarla && (
            <button
              type="button"
              role="menuitem"
              onClick={ir('caja/como-va')}
              className="min-h-toque-cocina rounded-grande bg-charcoal font-bold"
            >
              Cómo va
            </button>
          )}
          <button
            type="button"
            role="menuitem"
            onClick={ir('caja/cerrar')}
            className="min-h-toque-cocina rounded-grande bg-atencion font-bold text-fondo"
          >
            Cerrar caja
          </button>
        </div>
      )}
    </div>
  );
}
