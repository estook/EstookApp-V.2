import { useMemo, useRef, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { puedeEditar } from '@estook/permisos';
import { Boton, Cargando, EstadoVacio } from '@estook/ui';
import { crearClienteDelTpv, DIRECCION_DE_ESTOOK, hayApi, leerToken } from '../datos/cliente.ts';
import { ContextoDeSesion, type YoEnLaSala } from './Sesion.tsx';

/**
 * La puerta de Estook TPV: con la sesión de Estook, quien toma nota entra en la sala.
 *
 *   · Sin sesión, o caducada, se dice y se lleva a Estook a entrar (no hay otra pantalla
 *     de entrar que mantener: la de Estook ya hace el segundo factor y el PIN).
 *   · Con sesión pero sin «Tomar nota» (la cocina, la gestoría), se dice que esto es de
 *     la sala. La cocina tendrá su pantalla en M20A · 1 · 3.
 */
export function LaPuerta({ children }: { readonly children: ReactNode }) {
  const [caducada, setCaducada] = useState(false);
  const alCaducar = useRef(() => {
    setCaducada(true);
  });
  const cliente = useMemo(
    () =>
      crearClienteDelTpv(() => {
        alCaducar.current();
      }),
    [],
  );
  const hayToken = leerToken() !== null;

  const consulta = useQuery({
    queryKey: ['quien_soy'],
    enabled: hayApi && hayToken && !caducada,
    retry: 1,
    queryFn: async (): Promise<YoEnLaSala> => {
      const respuesta = await cliente.consultar<YoEnLaSala>('quien_soy');
      if (!respuesta.ok) throw new Error(respuesta.error.codigo);
      return respuesta.datos;
    },
  });

  if (!hayApi) {
    return (
      <Pantalla>
        <EstadoVacio
          esLaPagina
          titulo="Estook TPV no tiene servidor"
          frase="Esta construcción no sabe dónde está la API. En estook.com/tpv/ sí."
          dibujo="perdido"
          sinAccionPorque="Sin servidor no hay nada que hacer desde aquí."
        />
      </Pantalla>
    );
  }
  if (!hayToken || caducada) {
    return (
      <Pantalla>
        <EstadoVacio
          esLaPagina
          titulo="Entra en Estook primero"
          frase="Estook TPV usa tu sesión de Estook: entra allí y vuelve a la sala."
          dibujo="candado"
          accion={<EnlaceAEstook texto="Entrar en Estook" />}
        />
      </Pantalla>
    );
  }
  if (consulta.isLoading) {
    return (
      <Pantalla>
        <Cargando que="la sala" />
      </Pantalla>
    );
  }
  const yo = consulta.data;
  if (yo === undefined) {
    return (
      <Pantalla>
        <EstadoVacio
          esLaPagina
          titulo="No llegamos a Estook"
          frase="Puede ser la conexión. Vuelve a probar en unos segundos."
          dibujo="perdido"
          accion={
            <Boton
              tono="principal"
              onClick={() => {
                void consulta.refetch();
              }}
            >
              Volver a probar
            </Boton>
          }
        />
      </Pantalla>
    );
  }
  if (yo.local === null || !puedeEditar(yo.permisos, 'accion.tomar_nota')) {
    return (
      <Pantalla>
        <EstadoVacio
          esLaPagina
          titulo="Esto es la sala"
          frase="Aquí se toma nota de las mesas. Tu puesto no toma nota en este local: si debería, díselo a quien lleva el local."
          dibujo="local"
          accion={<EnlaceAEstook texto="Volver a Estook" />}
        />
      </Pantalla>
    );
  }
  return <ContextoDeSesion.Provider value={{ yo, cliente }}>{children}</ContextoDeSesion.Provider>;
}

function Pantalla({ children }: { readonly children: ReactNode }) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-fondo p-e5">
      <div className="w-full max-w-[32rem]">{children}</div>
    </main>
  );
}

export function EnlaceAEstook({ texto }: { readonly texto: string }) {
  return (
    <a
      href={DIRECCION_DE_ESTOOK}
      className="inline-flex min-h-toque items-center rounded-medio bg-naranja px-e4 font-semibold text-sobre-naranja"
    >
      {texto}
    </a>
  );
}
