import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { puedeEditar } from '@estook/permisos';
import { usarTamanoDeLetra } from '@estook/ui';
import { LaPuerta } from './puerta/LaPuerta.tsx';
import { ElPlano } from './plano/ElPlano.tsx';
import { LaMesa } from './mesa/LaMesa.tsx';
import { ElInicio } from './inicio/ElInicio.tsx';
import { Fichar } from './inicio/Fichar.tsx';
import { Agotados } from './inicio/Agotados.tsx';
import { AjustesDelTpv } from './ajustes/AjustesDelTpv.tsx';
import { EditorDeLaSala } from './sala/EditorDeLaSala.tsx';
import { escucharLaDireccion, laDireccion } from './navegar.ts';
import { ContextoAlSegundo, usarEscucharAlSegundo } from './ganchos/usarLaSala.ts';
import { usarSesion } from './sesion/Sesion.tsx';

/**
 * Estook TPV (T1 · La puerta, decisión 0107): **una aplicación aparte**, en
 * `estook.com/tpv/`, que solo funciona en un aparato vinculado al local y en la que cada
 * uno entra con su PIN. Dentro: el inicio, las mesas y cada mesa, fichar, los agotados y
 * los Ajustes del TPV. Una pantalla completa, sin la barra de Estook.
 */

function Dentro() {
  const direccion = useSyncExternalStore(escucharLaDireccion, laDireccion);
  const { yo } = usarSesion();
  // Una sola escucha para todo el aparato: entrar y salir de una mesa no vuelve a conectar.
  const conectado = usarEscucharAlSegundo();
  const tomaNota = puedeEditar(yo.permisos, 'accion.tomar_nota');
  const dibuja = puedeEditar(yo.permisos, 'accion.ajustes_del_tpv');
  const mesa = /^mesa\/([0-9a-f-]{36})$/.exec(direccion)?.[1];

  let pantalla;
  if (direccion === 'inicio') pantalla = <ElInicio />;
  else if (direccion === 'fichar') pantalla = <Fichar />;
  else if (direccion === 'agotados') pantalla = <Agotados />;
  else if (direccion === 'ajustes' || direccion.startsWith('ajustes/')) {
    pantalla = <AjustesDelTpv direccion={direccion} />;
  } else if (direccion === 'sala/editar' && dibuja) {
    // T2 · La sala (0110): el plano se dibuja aquí, a ojo, en la caja o en la tablet.
    pantalla = <EditorDeLaSala />;
  } else if (!tomaNota) pantalla = <ElInicio />;
  else if (mesa !== undefined) pantalla = <LaMesa key={mesa} cuentaId={mesa} />;
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
      <LaPuerta>
        <Dentro />
      </LaPuerta>
    </QueryClientProvider>
  );
}
