import { useEffect, useState } from 'react';
import { IconoCerrar, IconoDeshacer } from '@estook/iconos';
import { SEGUNDOS_PARA_DESHACER, usarDeshacer } from '../ganchos/usarDeshacer.tsx';
import { Aviso } from './Aviso.tsx';

/**
 * La barra de deshacer · Parte B4 del Plan.
 *
 * «`Deshacer` (barra inferior de 10 segundos)» · «Aparece abajo y se va sola a
 * los 10 s» (B6).
 *
 * Se pone **una sola vez**, en la raiz de la aplicacion, junto al proveedor. No
 * la pinta cada pantalla: si lo hiciera, al navegar se perderia la barra, y
 * navegar despues de hacer algo es justo cuando uno se da cuenta de que no
 * queria hacerlo.
 *
 * El plazo se ve. Una barra que se va sola sin avisar de cuanto queda obliga a
 * decidir con prisa y sin saber cuanta.
 */
export function Deshacer() {
  const { pendiente, deshacer, olvidar, fallo } = usarDeshacer();
  const quedan = useCuentaAtras(pendiente?.id ?? null);

  if (fallo !== null) {
    return (
      <div className="fixed inset-x-e3 bottom-e3 z-50 mx-auto max-w-[34rem] sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2">
        <Aviso tono="mal" titulo="No se ha podido deshacer" esNoticia alCerrar={olvidar}>
          {fallo}
        </Aviso>
      </div>
    );
  }

  if (!pendiente) return null;

  return (
    <div
      // `status` y no `alert`: se anuncia sin cortar lo que el lector este
      // diciendo, porque no es una urgencia.
      role="status"
      aria-live="polite"
      className={[
        'fixed inset-x-e3 z-50 mx-auto flex max-w-[34rem] items-center gap-e3',
        // Por encima de la barra de movil, y por encima de la barra del sistema
        // en un iPhone.
        'bottom-[calc(var(--alto-barra-movil)+env(safe-area-inset-bottom)+var(--spacing-e2))]',
        'sm:bottom-e4 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2',
        'rounded-grande border border-charcoal bg-charcoal px-e3 py-e2 text-white shadow-s3',
        'anima-deshacer',
      ].join(' ')}
    >
      <p className="min-w-0 flex-1 truncate text-secundario">{pendiente.que}</p>

      <button
        type="button"
        onClick={deshacer}
        className="inline-flex min-h-toque shrink-0 items-center gap-e2 rounded-medio px-e3 font-semibold text-naranja hover:bg-white/10"
      >
        <IconoDeshacer size={18} />
        Deshacer
        <span aria-hidden className="text-white/50 tabular-nums">
          {quedan}
        </span>
      </button>

      <button
        type="button"
        onClick={olvidar}
        aria-label="Descartar el aviso de deshacer"
        className="grid size-toque shrink-0 place-items-center rounded-medio text-white/60 hover:bg-white/10 hover:text-white"
      >
        <IconoCerrar size={18} />
      </button>
    </div>
  );
}

/**
 * Los segundos que quedan.
 *
 * Se reinicia cuando cambia el identificador de la accion, que es lo que
 * distingue «otra accion nueva» de «la misma repintada».
 */
function useCuentaAtras(id: number | null): number {
  const [quedan, setQuedan] = useState(SEGUNDOS_PARA_DESHACER);

  useEffect(() => {
    if (id === null) return;

    setQuedan(SEGUNDOS_PARA_DESHACER);
    const reloj = setInterval(() => {
      setQuedan((antes) => (antes <= 1 ? 0 : antes - 1));
    }, 1000);

    return () => {
      clearInterval(reloj);
    };
  }, [id]);

  return quedan;
}
