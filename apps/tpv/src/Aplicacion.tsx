import { useMemo, useSyncExternalStore } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usarTamanoDeLetra, usarTema } from '@estook/ui';
import { LaPuerta } from './sesion/LaPuerta.tsx';
import { ElPlano } from './plano/ElPlano.tsx';
import { LaMesa } from './mesa/LaMesa.tsx';
import { escucharLaDireccion, laDireccion } from './navegar.ts';
import { ContextoAlSegundo, usarEscucharAlSegundo } from './ganchos/usarLaSala.ts';

/**
 * Estook TPV, la sala (M20A · 1 · 2, decisión 0106): **el plano** y **una mesa**. Una
 * pantalla completa, sin la barra de Estook, para un aparato que hace una sola cosa
 * durante el servicio (Anexo, 3.1).
 */

function LaSala() {
  const direccion = useSyncExternalStore(escucharLaDireccion, laDireccion);
  // Una sola escucha para toda la sala: entrar y salir de una mesa no vuelve a conectar.
  const conectado = usarEscucharAlSegundo();
  const mesa = /^mesa\/([0-9a-f-]{36})$/.exec(direccion)?.[1];
  return (
    <ContextoAlSegundo.Provider value={conectado}>
      {mesa === undefined ? <ElPlano /> : <LaMesa key={mesa} cuentaId={mesa} />}
    </ContextoAlSegundo.Provider>
  );
}

export function Aplicacion() {
  // El tema y la letra son del aparato, los mismos que en Estook.
  usarTema();
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
        <LaSala />
      </LaPuerta>
    </QueryClientProvider>
  );
}
