import type { ReactNode } from 'react';
import { inicialesDe } from '@estook/dominio';
import { puedeEditar } from '@estook/permisos';
import { usarSesion } from '../sesion/Sesion.tsx';
import { irA, irAlPlano } from '../navegar.ts';
import { Icono, IconoEnSuColor } from '../iconos.tsx';
import { COMO_SE_VE_LA_FUNCION } from '../logica/comoSeVeElAparato.ts';

/**
 * **Arriba, siempre** (la entrada nueva, maqueta 1; Anexo 11.5): a la izquierda la «E» y el
 * local, que **devuelven a la sala desde cualquier sitio**; en medio, lo que pone cada pantalla
 * (en la sala, las zonas y «Mías»); y a la derecha solo lo de todos los días: **Fichar en
 * naranja** (0115), **el engranaje** y quién está con **Bloquear**.
 *
 * Fichar y el engranaje, **solo en la caja**: un comandero solo pide (0115). El engranaje, solo
 * a quien puede tocar algo de dentro. La caja (abrir y cerrar) se pone aquí con el cobro (T7).
 */
export function LaBarraDeArriba({
  titulo,
  children,
}: {
  readonly titulo?: string;
  readonly children?: ReactNode;
}) {
  const { yo, aparato, bloquear } = usarSesion();
  const enLaCaja = aparato.funcion === 'caja';
  const ajusta =
    enLaCaja &&
    (puedeEditar(yo.permisos, 'accion.ajustes_del_tpv') ||
      puedeEditar(yo.permisos, 'accion.vincular_aparatos') ||
      puedeEditar(yo.permisos, 'accion.marcar_agotado'));
  return (
    <header className="flex flex-wrap items-center gap-e3 border-b border-borde bg-superficie px-e4 py-e2 md:px-e5">
      <button
        type="button"
        aria-label="La sala"
        onClick={irAlPlano}
        className="flex size-11 shrink-0 items-center justify-center rounded-grande bg-naranja text-seccion font-bold text-sobre-naranja"
      >
        E
      </button>
      <div className="flex min-w-0 flex-col">
        <span className="truncate text-seccion font-bold">{titulo ?? aparato.local.nombre}</span>
        <span className="flex items-center gap-e1 truncate text-secundario text-texto-tenue">
          {/* El dibujo y el color de este aparato, los de la lista de Aparatos. */}
          <IconoEnSuColor
            dibujo={COMO_SE_VE_LA_FUNCION[aparato.funcion].dibujo}
            tono={COMO_SE_VE_LA_FUNCION[aparato.funcion].tono}
            lado={20}
          />
          {titulo === undefined ? aparato.nombre : `${aparato.local.nombre} · ${aparato.nombre}`}
        </span>
      </div>
      {children}
      <div className="flex-1" />
      {enLaCaja && (
        <button
          type="button"
          aria-label="Fichar"
          onClick={() => {
            irA('fichar');
          }}
          className="flex min-h-toque min-w-toque items-center justify-center gap-e2 rounded-redondo bg-naranja px-e3 font-bold text-sobre-naranja sm:px-e4"
        >
          <Icono dibujo="reloj" lado={18} />
          {/* En el móvil, solo el reloj: la barra cabe en una fila. */}
          <span className="max-sm:hidden">Fichar</span>
        </button>
      )}
      {ajusta && (
        <button
          type="button"
          aria-label="Ajustes"
          title="Ajustes"
          onClick={() => {
            irA('ajustes');
          }}
          className="flex size-11 shrink-0 items-center justify-center rounded-redondo bg-charcoal"
        >
          <Icono dibujo="ajustes" lado={22} />
        </button>
      )}
      <button
        type="button"
        onClick={bloquear}
        aria-label={`${yo.nombre}: bloquear`}
        className="flex min-h-toque items-center gap-e2 rounded-redondo bg-fondo py-e1 pl-e1 pr-e4 font-bold"
      >
        <span className="flex size-8 items-center justify-center rounded-redondo bg-charcoal text-etiqueta">
          {inicialesDe(yo.nombre)}
        </span>
        <span className="max-sm:hidden">{yo.nombre} ·</span> Bloquear
      </button>
    </header>
  );
}
