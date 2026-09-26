import { IconoAvisos } from '@estook/iconos';
import { numeroDeLaCampana } from '@estook/dominio';

/**
 * La campana de las dos barras de arriba (entrega R · decisión 0052): el icono y,
 * encima, **cuántos avisos hay sin leer**, hasta «9+», como en cualquier app de
 * ahora. Antes era un punto, que decía «algo hay» pero no cuánto.
 *
 * El número va en el rojo de lo que pide atención, con el color de la superficie
 * encima: en claro, blanco sobre rojo oscuro; en oscuro, oscuro sobre rojo claro.
 */
export function LaCampana({ sinLeer }: { readonly sinLeer: number }) {
  const numero = numeroDeLaCampana(sinLeer);
  return (
    <span className="relative">
      <IconoAvisos size={20} />
      {numero !== null && (
        <span
          aria-hidden
          className="absolute -right-[9px] -top-[7px] h-[18px] min-w-[18px] rounded-redondo bg-mal px-[4px] text-center text-[11px] font-bold leading-[18px] text-superficie"
        >
          {numero}
        </span>
      )}
    </span>
  );
}
