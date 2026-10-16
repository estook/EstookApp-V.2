import { useEffect, useRef, useState } from 'react';
import { comoSeLeeLaCantidad } from '@estook/dominio';
import { clases } from '@estook/ui';
import { IconoCerrar, IconoFlechaDerecha, IconoFlechaIzquierda } from '@estook/iconos';
import { LosAlergenos } from './Alergenos.tsx';
import type { UnaFicha } from './contrato.ts';

/**
 * El modo cocina de una ficha (M9 · 2, 0087; Plan, M9: «la ficha a pantalla completa,
 * letra grande, **sin un solo importe**»).
 *
 * Primero **lo que lleva**, entero, que es lo que se prepara antes de empezar; después
 * **un paso por pantalla**, para leerlo desde el pase con las manos ocupadas. Se pasa
 * deslizando, con las flechas de abajo (grandes, para el dedo con guante) o con las
 * del teclado. Dictar «siguiente» es Fogón (M22).
 *
 * Es un `<dialog>` propio y no un `div` fijo: la ficha de debajo también es un
 * diálogo, y solo otro diálogo se pone encima de ella.
 */
export function ModoCocina({
  datos,
  alCerrar,
}: {
  readonly datos: UnaFicha;
  readonly alCerrar: () => void;
}) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const [pantalla, setPantalla] = useState(0);
  const total = 1 + datos.receta.pasos.length;
  const tocado = useRef<number | null>(null);

  useEffect(() => {
    const el = dialogo.current;
    if (el === null) return;
    if (!el.open) el.showModal();
    const alCerrarse = () => {
      alCerrar();
    };
    el.addEventListener('close', alCerrarse);
    return () => {
      el.removeEventListener('close', alCerrarse);
    };
  }, [alCerrar]);

  const ir = (salto: number) => {
    setPantalla((antes) => Math.min(total - 1, Math.max(0, antes + salto)));
  };

  return (
    <dialog
      ref={dialogo}
      aria-label={`Modo cocina · ${datos.nombre}`}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') ir(1);
        if (e.key === 'ArrowLeft') ir(-1);
      }}
      onTouchStart={(e) => {
        tocado.current = e.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(e) => {
        const desde = tocado.current;
        const hasta = e.changedTouches[0]?.clientX;
        tocado.current = null;
        if (desde === null || hasta === undefined) return;
        if (hasta - desde < -60) ir(1);
        if (hasta - desde > 60) ir(-1);
      }}
      className="fixed inset-0 m-0 h-full max-h-none w-full max-w-none bg-superficie p-0 text-texto backdrop:bg-charcoal/60"
    >
      <div className="flex h-full flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
        <header className="flex shrink-0 items-center gap-e3 border-b border-borde px-e4 py-e3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[1.5rem] font-semibold leading-tight">{datos.nombre}</p>
            <p className="text-secundario text-texto-suave">
              {pantalla === 0 ? 'Lo que lleva' : `Paso ${String(pantalla)} de ${String(total - 1)}`}
            </p>
          </div>
          <button
            type="button"
            onClick={alCerrar}
            aria-label="Salir del modo cocina"
            className="grid size-[56px] shrink-0 place-items-center rounded-grande bg-fondo"
          >
            <IconoCerrar size={26} />
          </button>
        </header>

        <main className="flex-1 overflow-y-auto px-e5 py-e5">
          {pantalla === 0 ? (
            <div className="mx-auto flex max-w-[48rem] flex-col gap-e5">
              <LosAlergenos
                alergenos={datos.alergenos}
                picante={datos.picante}
                distintivos={datos.distintivos}
                lado={34}
                conNombre
              />
              <ul aria-label="Lo que lleva" className="flex flex-col">
                {datos.receta.lineas.map((l) => (
                  <li
                    key={l.id}
                    className="flex items-baseline gap-e4 border-b border-borde py-e3 last:border-0"
                  >
                    <span className="min-w-0 flex-1 text-[1.5rem] leading-snug">
                      {l.nombre}
                      {l.nota !== null && (
                        <span className="block text-cuerpo text-texto-suave">{l.nota}</span>
                      )}
                    </span>
                    <span className="shrink-0 text-[1.75rem] font-bold tabular-nums">
                      {comoSeLeeLaCantidad(l.cantidad, l.unidad)}
                    </span>
                  </li>
                ))}
              </ul>
              {datos.receta.notas !== null && (
                <p className="rounded-grande bg-fondo p-e4 text-[1.25rem] whitespace-pre-line">
                  {datos.receta.notas}
                </p>
              )}
            </div>
          ) : (
            <div className="mx-auto flex h-full max-w-[48rem] flex-col justify-center gap-e5">
              <span className="grid size-[64px] place-items-center rounded-redondo bg-texto text-[1.75rem] font-bold text-superficie">
                {pantalla}
              </span>
              <p className="text-[2rem] font-medium leading-snug">
                {datos.receta.pasos[pantalla - 1]}
              </p>
            </div>
          )}
        </main>

        <footer className="flex shrink-0 items-center gap-e3 border-t border-borde px-e4 py-e3">
          <button
            type="button"
            onClick={() => {
              ir(-1);
            }}
            disabled={pantalla === 0}
            aria-label="Anterior"
            className="grid h-[64px] w-[88px] place-items-center rounded-grande bg-fondo disabled:opacity-30"
          >
            <IconoFlechaIzquierda size={30} />
          </button>
          <div className="flex flex-1 justify-center gap-e1" aria-hidden>
            {Array.from({ length: total }, (_, i) => (
              <span
                key={i}
                className={clases(
                  'h-[8px] rounded-redondo transition-all duration-rapido',
                  i === pantalla ? 'w-[24px] bg-texto' : 'w-[8px] bg-borde-fuerte',
                )}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => {
              if (pantalla === total - 1) alCerrar();
              else ir(1);
            }}
            aria-label={pantalla === total - 1 ? 'Terminar' : 'Siguiente'}
            className="grid h-[64px] min-w-[88px] place-items-center rounded-grande bg-texto px-e4 text-cuerpo font-semibold text-superficie"
          >
            {pantalla === total - 1 ? 'Hecho' : <IconoFlechaDerecha size={30} />}
          </button>
        </footer>
      </div>
    </dialog>
  );
}
