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
  /**
   * En que app se esta, si se esta en alguna.
   *
   * ── El fallo que esto arregla ──────────────────────────────────────────────
   *
   * La rueda abria siempre con el primer sector resaltado en naranja, porque el
   * cursor del teclado empezaba en cero. En un movil eso no se lee como «por
   * aqui empiezan las flechas»: se lee como **«estas aqui»**. Abriendola desde
   * el Panel, la rueda decia que estabas en Inventario. Lo vio Richi en el
   * telefono.
   *
   * Ahora el cursor empieza donde de verdad estas, y **en ninguna parte** si
   * estas en el Panel o en Ajustes: entonces no se resalta nada, que es la
   * verdad.
   */
  readonly appActiva?: string | null;
}

export function RuedaDeApps({
  abierta,
  alCerrar,
  apps,
  alElegir,
  pendientes = {},
  appActiva = null,
}: RuedaDeAppsProps) {
  const enRejilla = usarMovimientoReducido();
  /** El cursor. `-1` es «en ninguna», y entonces no se resalta ningun sector. */
  const [señalada, setSeñalada] = useState(-1);
  const dialogo = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = dialogo.current;
    if (!el) return;

    if (abierta && !el.open) {
      setSeñalada(apps.findIndex((app) => app.id === appActiva));
      el.showModal();
      // El foco al menu, para que las flechas funcionen desde el primer momento.
      el.querySelector<SVGSVGElement>('svg[role="menu"]')?.focus();
    }
    if (!abierta && el.open) el.close();
    // `apps` y `appActiva` no entran en las dependencias a proposito: esto solo
    // tiene que correr cuando la rueda se abre o se cierra. Si entraran, un
    // cambio de permisos con la rueda abierta le movería el cursor al dedo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        setSeñalada((antes) =>
          // Desde «ninguna», hacia delante es la primera y hacia atras la ultima.
          antes < 0
            ? salto > 0
              ? 0
              : apps.length - 1
            : (antes + salto + apps.length) % apps.length,
        );
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
            Tu acceso todavía no incluye ninguna app. Pídeselo a quien lleva el local.
          </p>
        ) : enRejilla ? (
          <RuedaRejilla
            apps={apps}
            pendientes={pendientes}
            alElegir={elegir}
            appActiva={appActiva}
          />
        ) : (
          <RuedaCirculo
            apps={apps}
            pendientes={pendientes}
            señalada={señalada}
            appActiva={appActiva}
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
