import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { puedeEditar } from '@estook/permisos';
import { Boton, EstadoVacio, usarTamanoDeLetra } from '@estook/ui';
import { LaPuerta } from './puerta/LaPuerta.tsx';
import { InstalaEstookTpv } from './puerta/InstalaEstookTpv.tsx';
import { ElPlano } from './plano/ElPlano.tsx';
import { LaMesa } from './mesa/LaMesa.tsx';
import { Fichar } from './inicio/Fichar.tsx';
import { Agotados } from './inicio/Agotados.tsx';
import { AjustesDelTpv } from './ajustes/AjustesDelTpv.tsx';
import { EditorDeLaSala } from './sala/EditorDeLaSala.tsx';
import { LaBarraDeArriba } from './inicio/LaBarraDeArriba.tsx';
import { escucharLaDireccion, laDireccion } from './navegar.ts';
import { ContextoAlSegundo, usarEscucharAlSegundo } from './ganchos/usarLaSala.ts';
import { usarSesion } from './sesion/Sesion.tsx';

/**
 * Estook TPV (T1 · La puerta, decisión 0107): **una aplicación aparte**, en
 * `estook.com/tpv/`, que solo funciona en un aparato vinculado al local y en la que cada
 * uno entra con su PIN. Dentro: **la sala, que es la entrada** (la entrada nueva, 26-oct), cada
 * mesa, fichar, los agotados y los Ajustes del TPV, detrás del engranaje. Una pantalla completa, sin la barra de Estook, **e instalable**
 * (0115).
 */

/**
 * **Se entra a la sala** (la entrada nueva; Richi, 26-oct): ya no hay inicio de baldosas, lo
 * primero es el plano, como en todos los TPV de restaurante. **Cada aparato, a lo suyo**
 * (0115): la caja tiene además fichar, los agotados y los Ajustes del TPV; **un comandero, solo
 * la sala**. Quien no toma nota no ve la sala: se le dice, y en la caja tiene arriba lo suyo.
 */
function Dentro() {
  const direccion = useSyncExternalStore(escucharLaDireccion, laDireccion);
  const { yo, aparato, bloquear } = usarSesion();
  const enLaCaja = aparato.funcion === 'caja';
  // Una sola escucha para todo el aparato: entrar y salir de una mesa no vuelve a conectar.
  const conectado = usarEscucharAlSegundo();
  const tomaNota = puedeEditar(yo.permisos, 'accion.tomar_nota');
  const dibuja = puedeEditar(yo.permisos, 'accion.ajustes_del_tpv');
  const mesa = /^mesa\/([0-9a-f-]{36})$/.exec(direccion)?.[1];

  let pantalla;
  if (enLaCaja && direccion === 'fichar') pantalla = <Fichar />;
  else if (enLaCaja && direccion === 'agotados') pantalla = <Agotados />;
  else if (enLaCaja && (direccion === 'ajustes' || direccion.startsWith('ajustes/'))) {
    pantalla = <AjustesDelTpv direccion={direccion} />;
  } else if (enLaCaja && direccion === 'sala/editar' && dibuja) {
    // T2 · La sala (0110): el plano se dibuja aquí, a ojo, en la caja (0115).
    pantalla = <EditorDeLaSala />;
  } else if (!tomaNota) {
    pantalla = (
      <div className="flex min-h-dvh flex-col bg-fondo text-texto">
        {enLaCaja && <LaBarraDeArriba />}
        <main className="flex flex-1 items-center justify-center p-e5">
          <div className="w-full max-w-[32rem]">
            <EstadoVacio
              esLaPagina
              titulo="Tu puesto no toma nota"
              frase={
                enLaCaja
                  ? `${yo.nombre}, la sala es de quien toma nota. Lo tuyo está arriba: fichar y los ajustes. Si tienes que tomar nota, quien lleva el local te lo cambia en Estook › Equipo.`
                  : `${yo.nombre}, este aparato es para pedir en la sala. Si tienes que tomar nota, quien lleva el local te lo cambia en Estook › Equipo.`
              }
              dibujo="candado"
              accion={
                <Boton tono="principal" onClick={bloquear}>
                  Salir
                </Boton>
              }
            />
          </div>
        </main>
      </div>
    );
  } else if (mesa !== undefined) pantalla = <LaMesa key={mesa} cuentaId={mesa} />;
  // Lo demás, también `#/inicio` de antes, es la sala.
  else pantalla = <ElPlano />;

  return <ContextoAlSegundo.Provider value={conectado}>{pantalla}</ContextoAlSegundo.Provider>;
}

export function Aplicacion() {
  // **Solo oscuro** (respuesta 8 de la 0107, Anexo 11.12): las fichas de Estook TPV.
  useEffect(() => {
    document.documentElement.dataset['tema'] = 'tpv';
  }, []);
  usarTamanoDeLetra();
  const cache = useMemo(
    () =>
      new QueryClient({
        defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: true } },
      }),
    [],
  );
  return (
    <QueryClientProvider client={cache}>
      {/* La primera vez, «Instala Estook TPV» (0115), antes de vincular. */}
      <InstalaEstookTpv />
      <LaPuerta>
        <Dentro />
      </LaPuerta>
    </QueryClientProvider>
  );
}
