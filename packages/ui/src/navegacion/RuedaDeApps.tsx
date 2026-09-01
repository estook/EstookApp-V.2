import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { IconoCerrar } from '@estook/iconos';
import type { App } from '../apps.ts';
import { usarMovimientoReducido } from '../ganchos/usarMedia.ts';
import { RuedaCirculo } from './RuedaCirculo.tsx';
import { RuedaRejilla } from './RuedaRejilla.tsx';

/**
 * La rueda de apps · Parte B5 del Plan.
 *
 * «La rueda se abre sobre fondo desenfocado con un sector por app, con su icono,
 * su acento y su contador. Las apps que el rol no tiene **no aparecen** y los
 * sectores se reparten. Se pulsa un sector, o se mantiene el dedo en el boton
 * central y se arrastra hacia el. Con "reducir movimiento" activo, la rueda es
 * una rejilla de tarjetas con la misma informacion.»
 *
 * Aqui viven el dialogo, el teclado y la eleccion. El dibujo esta en
 * `RuedaCirculo` y `RuedaRejilla`, que son las dos caras de lo mismo.
 *
 * ── Las tres formas de abrir una app ─────────────────────────────────────────
 *
 *   1. Pulsar un sector.
 *   2. Mantener pulsado el centro y arrastrar hacia uno.
 *   3. Flechas y `Enter`. `Esc` cierra.
 *
 * La tercera no es un extra. Sin ella la rueda seria la unica parte de Estook
 * por la que no se puede pasar sin raton, y B8 dice «toda la app manejable con
 * teclado».
 *
 * Se usa `<dialog>` con `showModal()`, que trae el foco atrapado, el `Esc` y el
 * fondo inerte sin escribir nada de eso.
 */
export interface RuedaDeAppsProps {
  readonly abierta: boolean;
  readonly alCerrar: () => void;
  /** Las que el rol tiene. Llegan ya filtradas con `appsVisibles()`. */
  readonly apps: readonly App[];
  readonly alElegir: (app: App) => void;
  /** Los pendientes de cada app, por identificador. */
  readonly pendientes?: Readonly<Record<string, number>>;
}

export function RuedaDeApps({
  abierta,
  alCerrar,
  apps,
  alElegir,
  pendientes = {},
}: RuedaDeAppsProps) {
  const enRejilla = usarMovimientoReducido();
  const [señalada, setSeñalada] = useState(0);
  const dialogo = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = dialogo.current;
    if (!el) return;

    if (abierta && !el.open) {
      setSeñalada(0);
      el.showModal();
      // El foco al menu, para que las flechas funcionen desde el primer momento.
      el.querySelector<SVGSVGElement>('svg[role="menu"]')?.focus();
    }
    if (!abierta && el.open) el.close();
  }, [abierta]);

  useEffect(() => {
    const el = dialogo.current;
    if (!el) return;

    // `Esc` cierra el dialogo por su cuenta: hay que enterarse para que el
    // estado de fuera no se quede creyendo que sigue abierta.
    const alCerrarse = () => {
      alCerrar();
    };
    el.addEventListener('close', alCerrarse);
    return () => {
      el.removeEventListener('close', alCerrarse);
    };
  }, [alCerrar]);

  const elegir = useCallback(
    (indice: number) => {
      const app = apps[indice];
      if (!app) return;
      alCerrar();
      alElegir(app);
    },
    [apps, alElegir, alCerrar],
  );

  const alPulsarTecla = useCallback(
    (evento: KeyboardEvent) => {
      if (apps.length === 0) return;

      const salto = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[evento.key];

      if (salto !== undefined) {
        evento.preventDefault();
        setSeñalada((antes) => (antes + salto + apps.length) % apps.length);
        return;
      }

      if (evento.key === 'Enter' || evento.key === ' ') {
        evento.preventDefault();
        elegir(señalada);
      }
    },
    [apps.length, elegir, señalada],
  );

  return (
    <dialog
      ref={dialogo}
      aria-label="Las apps"
      className={[
        'fixed inset-0 m-0 h-full max-h-none w-full max-w-none bg-transparent p-0',
        // «La rueda se abre sobre fondo desenfocado» (B5). El desenfoque tarda
        // 120 ms, como pide B6.
        'backdrop:bg-charcoal/45 backdrop:backdrop-blur-[6px]',
        'backdrop:transition-opacity backdrop:duration-[--rapido]',
      ].join(' ')}
    >
      <div className="flex h-full w-full flex-col items-center justify-center gap-e5 p-e4">
        {apps.length === 0 ? (
          <p className="max-w-[32ch] text-center text-cuerpo text-white">
            Tu acceso todavia no incluye ninguna app. Pideselo a quien lleva el local.
          </p>
        ) : enRejilla ? (
          <RuedaRejilla apps={apps} pendientes={pendientes} alElegir={elegir} />
        ) : (
          <RuedaCirculo
            apps={apps}
            pendientes={pendientes}
            señalada={señalada}
            alSenalar={setSeñalada}
            alElegir={elegir}
            alPulsarTecla={alPulsarTecla}
          />
        )}

        <button
          type="button"
          onClick={alCerrar}
          className="inline-flex min-h-toque items-center gap-e2 rounded-redondo bg-superficie px-e5 text-cuerpo font-medium shadow-s2"
        >
          <IconoCerrar size={18} />
          Cerrar
        </button>
      </div>
    </dialog>
  );
}
