import { useCallback, useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { appsVisibles } from '@estook/permisos';
import { IconoAtras } from '@estook/iconos';
import {
  BarraArribaMovil,
  BarraDeApp,
  BarraEscritorio,
  BarraMovil,
  Deshacer,
  RuedaDeApps,
  appPorPermiso,
  usarAtajos,
  usarDeshacer,
  type App,
} from '@estook/ui';
import { BuscadorUniversal } from './buscar/BuscadorUniversal.tsx';
import { BurbujaDeFogon, VentanaDeFogon } from './fogon/Fogon.tsx';
import { LoQueLlegaDespues, type LoQueFalta } from './pantallas/LoQueLlegaDespues.tsx';
import { usarSesion } from './sesion/Sesion.tsx';

/**
 * El esqueleto · Parte B5 del Plan.
 *
 * Lo que envuelve a todas las pantallas: la barra de arriba en escritorio, la de
 * abajo en movil, la rueda, el buscador universal y la barra de deshacer.
 *
 * Las dos barras **no son la misma con condiciones**. En movil, dentro de una
 * app la barra de abajo pasa a ser la de esa app, y eso es lo que hace que se
 * sienta una aplicacion aparte (Manifiesto). En escritorio la barra de arriba es
 * siempre la misma, con las ocho apps y sus desplegables.
 *
 * Las apps que el rol no tiene no aparecen **en ningun sitio**: ni en la rueda,
 * ni en la barra de escritorio, ni respondiendo a su atajo. Se filtran una sola
 * vez aqui, con `appsVisibles()`, para que no haya dos listas que puedan
 * discrepar.
 */
export function Esqueleto() {
  const navegar = useNavigate();
  const { pathname } = useLocation();
  const { permisos, yo, cliente, refrescar, salir } = usarSesion();
  const { sePuedeDeshacer } = usarDeshacer();

  const [ruedaAbierta, setRuedaAbierta] = useState(false);
  const [buscadorAbierto, setBuscadorAbierto] = useState(false);
  const [loQueFalta, setLoQueFalta] = useState<LoQueFalta | null>(null);
  /**
   * Fogón, abierto o cerrado.
   *
   * Lo lleva el esqueleto y no cada barra a propósito: la burbuja del móvil, el
   * icono de arriba en escritorio y el atajo `Ctrl+J` abren **lo mismo**. Tres
   * ventanas distintas para lo mismo acabarían diciendo cosas distintas.
   */
  const [fogonAbierto, setFogonAbierto] = useState(false);

  const misApps = useMemo(
    () =>
      appsVisibles(permisos)
        .map((permiso) => appPorPermiso(permiso))
        .filter((app): app is App => app !== undefined),
    [permisos],
  );

  // De la direccion a donde se esta. Tres niveles como mucho (B5), asi que
  // basta con mirar los dos primeros trozos.
  const [, primero = '', segundo = ''] = pathname.split('/');
  const appActiva = misApps.find((app) => app.id === primero) ?? null;
  const enPanel = primero === '';
  const enAjustes = primero === 'ajustes';

  const irAApp = useCallback(
    (app: App, pestana?: string) => {
      const primeraPestana = app.pestanas[0]?.id;
      const destino = pestana ?? primeraPestana;
      navegar(destino === undefined ? `/${app.id}` : `/${app.id}/${destino}`);
    },
    [navegar],
  );

  usarAtajos({
    alBuscar: () => {
      setBuscadorAbierto(true);
    },
    alAbrirFogon: () => {
      setFogonAbierto(true);
    },
    alIrAApp: (numero) => {
      // «⌘1–⌘8 apps», en el orden de la rueda **de quien mira**: si solo tiene
      // cuatro, ⌘1 a ⌘4 son las suyas y ⌘5 no hace nada.
      const app = misApps[numero - 1];
      if (app) irAApp(app);
    },
  });

  // ── El contexto: en que local se esta, y como se cambia (M4) ───────────────

  const suOrganizacion = yo?.organizacion?.id;
  const susLocales = useMemo(
    () =>
      (yo?.locales ?? [])
        .filter((local) => local.organizacionId === suOrganizacion)
        .map((local) => ({ id: local.id, nombre: local.nombre })),
    [yo?.locales, suOrganizacion],
  );

  const localDeAhora = yo?.local?.id ?? null;

  const cambiarDeLocal = useCallback(
    async (id: string) => {
      const desdeDonde = localDeAhora;

      // El servidor decide: se le pide el cambio y se vuelve a preguntar quien
      // eres. Si ese local no fuera suyo, la resolucion no lo elegiria y volveria
      // a preguntar donde esta, en vez de dejarle en un sitio que no es el suyo.
      await cliente.ejecutar('cambiar_de_contexto', { local_id: id });
      await refrescar();
      navegar('/');

      // **Y se puede deshacer.** Cambiar de local es exactamente lo que se hace
      // sin querer con el movil en la mano, y la consecuencia es la que el
      // Manifiesto (28) da como razon de que el selector exista: apuntar una
      // merma en el local equivocado. Diez segundos para volver.
      if (desdeDonde !== null && desdeDonde !== id) {
        const nombre = susLocales.find((local) => local.id === id)?.nombre ?? 'otro local';
        sePuedeDeshacer({
          que: `Ahora estas en ${nombre}`,
          deshacer: () => {
            void (async () => {
              await cliente.ejecutar('cambiar_de_contexto', { local_id: desdeDonde });
              await refrescar();
            })();
          },
        });
      }
    },
    [cliente, refrescar, navegar, localDeAhora, susLocales, sePuedeDeshacer],
  );

  /**
   * «Una flecha permanente "← Zona Norte" que devuelve al consolidado desde
   *  cualquier pantalla, en un toque» (Roles, 2.2).
   *
   * Solo sale a quien tiene un conjunto al que volver: quien lleva un solo local
   * no tiene consolidado, y una flecha que lleva a una pantalla de un elemento es
   * una promesa vacia.
   */
  // La condición es **la misma** que la tercera comprobación de `aDondeEntra`, y
  // por eso el alcance viene del servidor en vez de deducirse aquí: si se
  // dedujera, la flecha podría salir donde la resolución no manda al consolidado.
  const tieneConjunto = (yo?.organizacion?.alcance ?? 'local') !== 'local' && susLocales.length > 1;
  const enElConjunto = primero === 'cadena';

  const volverAlConjunto =
    tieneConjunto && !enElConjunto ? (
      <button
        type="button"
        onClick={() => {
          navegar('/cadena');
        }}
        className="inline-flex min-h-toque items-center gap-e1 rounded-medio text-secundario text-texto-suave hover:text-texto"
      >
        <IconoAtras size={16} />← {yo?.organizacion?.nombre}
      </button>
    ) : null;

  /**
   * La barra de la demostración (M5).
   *
   * «Modo demostración aparte, con un restaurante ficticio entero. **Se entra y
   *  se sale sin dejar rastro**» (Manifiesto 8).
   *
   * ── Por qué esto tiene que verse ─────────────────────────────────────────
   *
   * Durante un tiempo la aplicación **no sabía** que estaba en una demostración:
   * el servidor paraba las escrituras, que es lo que protege de verdad, pero la
   * pantalla enseñaba los mismos botones de guardar que a cualquiera. Quien
   * pulsaba uno se llevaba un error en la cara sin que nadie le hubiera avisado
   * de nada, y eso convierte una demostración en una aplicación rota.
   *
   * Va arriba del todo y en toda la pantalla a propósito: es una condición de la
   * sesión entera, no de la pantalla que se esté mirando. Y lleva su propia
   * salida, porque quien está mirando un escaparate no busca «cerrar sesión».
   */
  const laDemostracion =
    yo?.esDemostracion !== true ? null : (
      <div className="flex flex-wrap items-center justify-center gap-e2 bg-texto px-e3 py-e2 text-center">
        <span className="text-secundario font-medium text-superficie">
          Estás viendo una demostración. Puedes trastear: no se guarda nada.
        </span>
        <button
          type="button"
          onClick={() => {
            void salir();
          }}
          className="min-h-toque rounded-medio bg-superficie px-e3 text-secundario font-semibold text-texto"
        >
          Salir de la demostración
        </button>
      </div>
    );

  return (
    <div className="min-h-dvh bg-fondo">
      {laDemostracion}
      <BarraEscritorio
        apps={misApps}
        appActiva={appActiva?.id ?? null}
        alIrAApp={irAApp}
        alIrAlPanel={() => {
          navegar('/');
        }}
        alIrAAjustes={() => {
          navegar('/ajustes');
        }}
        alBuscar={() => {
          setBuscadorAbierto(true);
        }}
        local={
          yo?.local
            ? {
                nombre: yo.local.nombre,
                organizacion: yo.organizacion?.nombre ?? '',
              }
            : null
        }
        locales={susLocales}
        alCambiarDeLocal={(id) => {
          void cambiarDeLocal(id);
        }}
        persona={yo?.nombre ?? ''}
        alAbrirAvisos={() => {
          setLoQueFalta('avisos');
        }}
        alAbrirChat={() => {
          setLoQueFalta('chat');
        }}
        alAbrirFogon={() => {
          setFogonAbierto(true);
        }}
      />

      {/*
        La misma barra, en movil: buscador, avisos, chat, Fogon, ajustes y el
        local donde estas. Antes ninguna de las seis existia en un telefono, que
        es donde de verdad se usa Estook.
      */}
      <BarraArribaMovil
        local={
          yo?.local
            ? {
                id: yo.local.id,
                nombre: yo.local.nombre,
                logo: yo.local.logo,
                colorDeMarca: yo.local.colorDeMarca,
              }
            : null
        }
        locales={susLocales}
        alCambiarDeLocal={(id) => {
          void cambiarDeLocal(id);
        }}
        persona={yo?.nombre ?? ''}
        alBuscar={() => {
          setBuscadorAbierto(true);
        }}
        alAbrirAvisos={() => {
          setLoQueFalta('avisos');
        }}
        alAbrirChat={() => {
          setLoQueFalta('chat');
        }}
        alAbrirFogon={() => {
          setFogonAbierto(true);
        }}
        alIrAAjustes={() => {
          navegar('/ajustes');
        }}
      />

      {/*
        El hueco de abajo es el alto de la barra de movil, para que la ultima
        linea de cualquier pantalla no quede debajo de ella. En escritorio no hay
        barra abajo, asi que no hace falta.
      */}
      <main className="mx-auto w-full max-w-[76rem] px-e3 pb-[calc(var(--alto-barra-movil)+env(safe-area-inset-bottom)+var(--spacing-e5))] pt-e4 lg:px-e5 lg:pb-e7">
        {volverAlConjunto !== null && <div className="mb-e3">{volverAlConjunto}</div>}
        <Outlet />
      </main>

      {appActiva === null ? (
        <BarraMovil
          enPanel={enPanel}
          enAjustes={enAjustes}
          alIrAlPanel={() => {
            navegar('/');
          }}
          alIrAAjustes={() => {
            navegar('/ajustes');
          }}
          alAbrirLaRueda={() => {
            setRuedaAbierta(true);
          }}
        />
      ) : (
        <BarraDeApp
          app={appActiva}
          pestanaActiva={segundo === '' ? (appActiva.pestanas[0]?.id ?? '') : segundo}
          alIrAPestana={(id) => {
            navegar(`/${appActiva.id}/${id}`);
          }}
          alAbrirLaRueda={() => {
            setRuedaAbierta(true);
          }}
        />
      )}

      <RuedaDeApps
        abierta={ruedaAbierta}
        alCerrar={() => {
          setRuedaAbierta(false);
        }}
        apps={misApps}
        appActiva={appActiva?.id ?? null}
        alElegir={(app) => {
          irAApp(app);
        }}
      />

      <BuscadorUniversal
        abierto={buscadorAbierto}
        alCerrar={() => {
          setBuscadorAbierto(false);
        }}
        apps={misApps}
      />

      {/*
        Fogón · su sitio, decidido y construido antes que él (decisión 0015). En
        el móvil, una burbuja que va contigo por toda la aplicación; en
        escritorio, el icono de arriba que ya mandaba B5. Los dos abren la misma
        ventana, y la ventana sabe en qué pantalla estás.
      */}
      <BurbujaDeFogon
        alPulsar={() => {
          setFogonAbierto(true);
        }}
      />

      <VentanaDeFogon
        abierta={fogonAbierto}
        alCerrar={() => {
          setFogonAbierto(false);
        }}
      />

      <LoQueLlegaDespues
        que={loQueFalta}
        alCerrar={() => {
          setLoQueFalta(null);
        }}
      />

      <Deshacer />
    </div>
  );
}
