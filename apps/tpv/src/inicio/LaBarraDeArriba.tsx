import type { ReactNode } from 'react';
import { inicialesDe } from '@estook/dominio';
import { usarSesion } from '../sesion/Sesion.tsx';
import { irA, irAlInicio, irAlPlano } from '../navegar.ts';

/**
 * **Arriba, siempre** (Anexo 11.5): el inicio a un toque en la esquina de la izquierda,
 * el local y el aparato, quién está y **Bloquear**. Lo de en medio, lo pone cada pantalla.
 *
 * **En la caja, «Fichar» en naranja** (0115): allí ficha el equipo. En un comandero no
 * hay inicio: la «E» lleva a la sala.
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
  return (
    <header className="flex flex-wrap items-center gap-e3 border-b border-borde bg-superficie px-e4 py-e2 md:px-e5">
      <button
        type="button"
        aria-label={enLaCaja ? 'Inicio' : 'La sala'}
        onClick={enLaCaja ? irAlInicio : irAlPlano}
        className="flex size-11 shrink-0 items-center justify-center rounded-grande bg-naranja text-seccion font-bold text-sobre-naranja"
      >
        E
      </button>
      <div className="flex min-w-0 flex-col">
        <span className="truncate text-seccion font-bold">{titulo ?? aparato.local.nombre}</span>
        <span className="truncate text-secundario text-texto-tenue">
          {titulo === undefined ? aparato.nombre : `${aparato.local.nombre} · ${aparato.nombre}`}
        </span>
      </div>
      {children}
      <div className="flex-1" />
      {enLaCaja && (
        <button
          type="button"
          onClick={() => {
            irA('fichar');
          }}
          className="min-h-toque rounded-redondo bg-naranja px-e4 font-bold text-sobre-naranja"
        >
          Fichar
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
