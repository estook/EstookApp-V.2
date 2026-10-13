import { useNavigate } from 'react-router-dom';
import { IconoDocumento, IconoFlechaDerecha } from '@estook/iconos';
import { clases } from '@estook/ui';

/**
 * «Revisar movimientos» (la experiencia, 0083).
 *
 * Movimientos ya no está en la barra de Almacén: Richi, «es necesario, pero es un
 * lío; tal vez interese quitarlo de la página y añadir un botón largo de revisar
 * movimientos al inicio, debajo de las gráficas». Es este: a todo lo ancho, con lo
 * que hay dentro dicho en corto, y lleva a **Inventario**, que es lo primero.
 */
export function RevisarMovimientos() {
  const navegar = useNavigate();
  return (
    <button
      type="button"
      onClick={() => {
        navegar('/almacen/movimientos');
      }}
      className={clases(
        'group flex w-full items-center gap-e3 rounded-mayor border border-borde bg-superficie px-e4 py-e3 text-left',
        '[background-image:var(--relleno-tarjeta)] [box-shadow:var(--sombra-tarjeta)]',
        'transition-[border-color,transform] duration-[--normal] ease-curva hover:border-borde-fuerte active:scale-[0.99]',
      )}
    >
      <span
        aria-hidden
        className="grid size-10 shrink-0 place-items-center rounded-grande text-white"
        style={{
          background:
            'linear-gradient(140deg, color-mix(in srgb, var(--color-app-almacen) 92%, white), color-mix(in srgb, var(--color-app-almacen) 70%, black))',
        }}
      >
        <IconoDocumento size={18} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-cuerpo font-semibold">Revisar movimientos</span>
        <span className="block truncate text-secundario text-texto-suave">
          Inventario, lo que ha entrado y salido, y lo gastado de verdad
        </span>
      </span>
      <span
        aria-hidden
        className="shrink-0 text-texto-tenue transition-transform duration-[--normal] group-hover:translate-x-1"
      >
        <IconoFlechaDerecha size={18} />
      </span>
    </button>
  );
}
