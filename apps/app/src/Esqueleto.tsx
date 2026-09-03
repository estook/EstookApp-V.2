import { useCallback, useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { appsVisibles } from '@estook/permisos';
import { IconoAtras, IconoLocal } from '@estook/iconos';
import {
  BarraDeApp,
  BarraEscritorio,
  BarraMovil,
  Deshacer,
  RuedaDeApps,
  appPorPermiso,
  clases,
  usarAtajos,
  usarDeshacer,
  type App,
} from '@estook/ui';
import { BuscadorUniversal } from './buscar/BuscadorUniversal.tsx';
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
  const { permisos, yo, cliente, refrescar } = usarSesion();
  const { sePuedeDeshacer } = usarDeshacer();

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
   * Donde estas, y como cambiarlo · **en movil** (M4).
   *
   * La barra de escritorio lleva el selector de local, pero esa barra es
   * `hidden lg:flex`: en un movil no existe. Y sin esto, quien trabaja en dos
   * locales **no tiene forma de cambiar de uno a otro con el telefono**, que es
   * justo el aparato con el que lo va a hacer.
   *
   * Lo encontro una prueba de extremo a extremo corriendo a 375 px, no la vista:
   * en escritorio funcionaba perfectamente.
   *
   * Se pinta arriba del contenido y no en una barra propia, porque «maximo tres
   * niveles» (B5) y una cuarta barra seria una de mas. Y lleva el nombre del
   * local siempre, aunque solo haya uno: «para que nadie apunte una merma en el
   * local equivocado» (Manifiesto 28) empieza por saber donde estas.
   */
  const dondeEstas =
    yo?.local === null || yo?.local === undefined ? null : (
      <div className="mb-e3 flex flex-wrap items-center gap-e2 lg:hidden">
        {/*
          La marca del local (M5). «Cambiar de local cambia el contexto, **y el
          color y el logo de la cabecera**, para que nadie apunte una merma en el
          local equivocado» (Manifiesto 31).
        */}
        <span
          className="inline-flex items-center gap-e1 rounded-redondo py-e1 pl-e1 pr-e3"
          style={
            yo.local.colorDeMarca === null ? undefined : { backgroundColor: yo.local.colorDeMarca }
          }
        >
          {yo.local.logo === null ? (
            <span
              className={clases(
                'inline-flex h-6 w-6 items-center justify-center rounded-redondo',
                yo.local.colorDeMarca === null ? 'text-texto-suave' : 'text-superficie',
              )}
            >
              <IconoLocal size={16} />
            </span>
          ) : (
            <img
              src={yo.local.logo}
              alt=""
              className="h-6 w-6 rounded-redondo bg-superficie object-contain"
            />
          )}
          {susLocales.length <= 1 && (
            <span
              className={clases(
                'text-secundario font-medium',
                yo.local.colorDeMarca === null ? 'text-texto-suave' : 'text-superficie',
              )}
            >
              {yo.local.nombre}
            </span>
          )}
        </span>

        {susLocales.length > 1 && (
          <label className="flex items-center gap-e1 text-secundario text-texto-suave">
            <span className="sr-only">Donde estas</span>
            <select
              aria-label="Donde estas"
              value={yo.local.id}
              onChange={(evento) => {
                void cambiarDeLocal(evento.target.value);
              }}
              className="min-h-toque cursor-pointer rounded-medio border border-borde-fuerte bg-superficie px-e2 text-cuerpo text-texto"
            >
              {susLocales.map((local) => (
                <option key={local.id} value={local.id}>
                  {local.nombre}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
    );

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
      />

      {/*
        El hueco de abajo es el alto de la barra de movil, para que la ultima
        linea de cualquier pantalla no quede debajo de ella. En escritorio no hay
        barra abajo, asi que no hace falta.
      */}
      <main className="mx-auto w-full max-w-[76rem] px-e3 pb-[calc(var(--alto-barra-movil)+env(safe-area-inset-bottom)+var(--spacing-e5))] pt-e4 lg:px-e5 lg:pb-e7">
        {(volverAlConjunto !== null || dondeEstas !== null) && (
          <div className="mb-e3 flex flex-col gap-e2">
            {volverAlConjunto}
            {dondeEstas}
          </div>
        )}
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
