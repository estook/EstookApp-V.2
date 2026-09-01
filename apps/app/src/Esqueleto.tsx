import { useCallback, useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { appsVisibles } from '@estook/permisos';
import {
  BarraDeApp,
  BarraEscritorio,
  BarraMovil,
  Deshacer,
  RuedaDeApps,
  appPorPermiso,
  usarAtajos,
  type App,
} from '@estook/ui';
import { BuscadorUniversal } from './buscar/BuscadorUniversal.tsx';
import { usarSesion } from './sesion/Sesion.tsx';
import { AvisoDelAndamio } from './sesion/AvisoDelAndamio.tsx';

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
  const { permisos, perfil, deDonde } = usarSesion();

  const [ruedaAbierta, setRuedaAbierta] = useState(false);
  const [buscadorAbierto, setBuscadorAbierto] = useState(false);

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
    alIrAApp: (numero) => {
      // «⌘1–⌘8 apps», en el orden de la rueda **de quien mira**: si solo tiene
      // cuatro, ⌘1 a ⌘4 son las suyas y ⌘5 no hace nada.
      const app = misApps[numero - 1];
      if (app) irAApp(app);
    },
  });

  return (
    <div className="min-h-dvh bg-fondo">
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
        local={{ nombre: perfil.donde, organizacion: perfil.donde }}
        locales={[]}
        alCambiarDeLocal={() => undefined}
        persona={perfil.nombre}
      />

      {/*
        El hueco de abajo es el alto de la barra de movil, para que la ultima
        linea de cualquier pantalla no quede debajo de ella. En escritorio no hay
        barra abajo, asi que no hace falta.
      */}
      <main className="mx-auto w-full max-w-[76rem] px-e3 pb-[calc(var(--alto-barra-movil)+env(safe-area-inset-bottom)+var(--spacing-e5))] pt-e4 lg:px-e5 lg:pb-e7">
        {deDonde === 'muestra' && <AvisoDelAndamio />}
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

      <Deshacer />
    </div>
  );
}
