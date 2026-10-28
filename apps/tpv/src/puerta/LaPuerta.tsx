import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { minutosDelBloqueo, tokenDelAparato } from '@estook/dominio';
import { Boton, Cargando, EstadoVacio } from '@estook/ui';
import {
  crearClienteDelTpv,
  DIRECCION_DE_LA_API,
  guardarLaLlave,
  hayApi,
  LA_VERSION,
  leerLaLlave,
} from '../datos/cliente.ts';
import { laCajaParaWindows } from '../datos/laCajaParaWindows.ts';
import type {
  AparatoVinculado,
  DentroDelTpv,
  ElAparatoPorDentro,
  YoEnElTpv,
} from '../datos/tipos.ts';
import { DONDE, FalloDeLaSala } from '../ganchos/usarLaSala.ts';
import { irA } from '../navegar.ts';
import { ContextoDeSesion, type SesionDeLaSala } from '../sesion/Sesion.tsx';
import { ElPin } from './ElPin.tsx';
import { LaPantallaDeCocina } from '../cocina/LaPantallaDeCocina.tsx';
import { usarElBloqueo } from '../ganchos/usarElBloqueo.ts';
import { Vincular } from './Vincular.tsx';
import { YaNoEstaVinculado } from './YaNoEstaVinculado.tsx';

/**
 * La puerta de Estook TPV (T1 · La puerta, decisión 0107; Anexo 11.3 y 11.4).
 *
 *   sin llave       → Vincular este aparato (el código, o el correo en el primero)
 *   con llave       → su latido cada minuto; si ya no vale, «ya no está vinculado»
 *     · fichar      → ya no se usa (0115): se ficha en la caja; lo dice, y cómo cambiarlo
 *     · cocina      → la pantalla de cocina, sin PIN (0116)
 *     · caja o comandero, sin nadie dentro → el PIN
 *     · con alguien dentro → lo de dentro, con su turno, hasta que se bloquea
 *
 * **No entra con la sesión de Estook**, y no lleva a Estook: un aparato vinculado no es
 * una puerta a la gestión. El turno vive solo en la memoria: al recargar, se bloquea.
 */
export function LaPuerta({ children }: { readonly children: ReactNode }) {
  const [llave, setLlave] = useState<string | null>(() => leerLaLlave());
  /** Desvinculado desde otro aparato: el nombre del local, para decirlo. */
  const [desvinculado, setDesvinculado] = useState<{ readonly local: string | null } | null>(null);

  const alVincular = useCallback((vinculado: AparatoVinculado) => {
    guardarLaLlave(vinculado.llave);
    setLlave(vinculado.llave);
  }, []);

  const alDesvincular = useCallback((local: string | null) => {
    // En la caja para Windows (0119), el programa deja de imprimir la cola de esta caja.
    laCajaParaWindows()?.desconectar();
    guardarLaLlave(null);
    setLlave(null);
    setDesvinculado({ local });
  }, []);

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
  if (desvinculado !== null) {
    return (
      <YaNoEstaVinculado
        local={desvinculado.local}
        alVincular={() => {
          setDesvinculado(null);
        }}
      />
    );
  }
  if (llave === null) return <Vincular alVincular={alVincular} />;
  return (
    <ConLlave key={llave} llave={llave} alDesvincular={alDesvincular}>
      {children}
    </ConLlave>
  );
}

/** La versión que dice el latido: la de la web, y la del programa si está dentro (0119). */
function laVersion(): string {
  const caja = laCajaParaWindows();
  return (caja === null ? LA_VERSION : `${LA_VERSION} · caja ${caja.version}`).slice(0, 40);
}

function Pantalla({ children }: { readonly children: ReactNode }) {
  return (
    <main className="flex min-h-pantalla items-center justify-center bg-fondo p-e5 text-texto">
      <div className="w-full max-w-[32rem]">{children}</div>
    </main>
  );
}

/** El aparato, con su latido: cada minuto dice «en línea», su versión y lo de su pantalla. */
function ConLlave({
  llave,
  alDesvincular,
  children,
}: {
  readonly llave: string;
  readonly alDesvincular: (local: string | null) => void;
  readonly children: ReactNode;
}) {
  const cliente = useMemo(() => crearClienteDelTpv({ token: () => null }), []);
  const [dentro, setDentro] = useState<DentroDelTpv | null>(null);

  // **Dentro de la caja para Windows** (T5 · 1, 0119): el programa imprime la cola de esta
  // caja con su llave, también bloqueada. Si no es una caja, la API se lo dice y no hace nada.
  useEffect(() => {
    laCajaParaWindows()?.conectar({ api: DIRECCION_DE_LA_API, llave, supabase: DONDE });
  }, [llave]);
  const local = useRef<string | null>(null);

  const latido = useQuery({
    queryKey: ['latido', llave],
    queryFn: async () => {
      const respuesta = await cliente.ejecutar<ElAparatoPorDentro>('latir_el_aparato', {
        llave,
        version: laVersion(),
      });
      if (!respuesta.ok) throw new FalloDeLaSala(respuesta.error);
      return respuesta.datos;
    },
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    retry: (veces, fallo) =>
      !(
        fallo instanceof FalloDeLaSala &&
        (fallo.error.codigo === 'aparato_retirado' || fallo.error.codigo === 'estook_tpv_es_de_pro')
      ) && veces < 2,
  });

  const aparato = latido.data;
  if (aparato !== undefined) local.current = aparato.local.nombre;
  const retirado =
    latido.error instanceof FalloDeLaSala && latido.error.error.codigo === 'aparato_retirado';

  useEffect(() => {
    if (retirado) alDesvincular(local.current);
  }, [retirado, alDesvincular]);

  const alSalir = useCallback(() => {
    setDentro(null);
    void latido.refetch();
  }, [latido]);

  // **Estook TPV es de Pro** (0120): si el local no lo tiene, el aparato espera vinculado y sin
  // borrar nada, aunque guarde lo de antes; vuelve solo en cuanto el local pase a Pro.
  if (
    latido.error instanceof FalloDeLaSala &&
    latido.error.error.codigo === 'estook_tpv_es_de_pro'
  ) {
    return (
      <Pantalla>
        <EstadoVacio
          esLaPagina
          titulo={latido.error.error.quePasa}
          frase={latido.error.error.queSePuedeHacer}
          dibujo="local"
          sinAccionPorque="El plan lo cambia quien lleva la suscripción, en Estook."
        />
      </Pantalla>
    );
  }

  if (aparato === undefined) {
    if (latido.isLoading || retirado) {
      return (
        <Pantalla>
          <Cargando que="el aparato" />
        </Pantalla>
      );
    }
    return (
      <Pantalla>
        <EstadoVacio
          esLaPagina
          titulo="No llegamos a Estook"
          frase="Puede ser la conexión. Se vuelve a probar solo."
          dibujo="perdido"
          accion={
            <Boton
              tono="principal"
              onClick={() => {
                void latido.refetch();
              }}
            >
              Volver a probar
            </Boton>
          }
        />
      </Pantalla>
    );
  }

  if (aparato.funcion === 'fichar') {
    // **El aparato para fichar ya no se usa** (0115): se ficha en la caja o en Estook.
    return (
      <Pantalla>
        <EstadoVacio
          esLaPagina
          titulo="Ahora se ficha en la caja"
          frase="Con el botón naranja «Fichar» de la caja, o en Estook con el móvil. Para usar este aparato como comandero, quítalo en la caja (Ajustes del TPV › Aparatos) y vincúlalo otra vez."
          dibujo="local"
          sinAccionPorque="Este aparato ya no sirve para fichar."
        />
      </Pantalla>
    );
  }
  // **Las pantallas de cocina y de barra, sin PIN y siempre encendidas** (T4, 0116 y 0117):
  // valen por su llave.
  if (aparato.funcion === 'cocina' || aparato.funcion === 'barra') {
    return <LaPantallaDeCocina llave={llave} aparato={aparato} />;
  }

  if (dentro === null) {
    return (
      <ElPin
        llave={llave}
        aparato={aparato}
        alDesvincularse={() => {
          alDesvincular(local.current);
        }}
        alEntrar={(nuevo) => {
          // **Todos a la sala** (la entrada nueva, 26-oct): ya no hay inicio de baldosas.
          irA('');
          setDentro(nuevo);
        }}
      />
    );
  }
  return (
    <ConTurno key={dentro.turno} llave={llave} aparato={aparato} dentro={dentro} alSalir={alSalir}>
      {children}
    </ConTurno>
  );
}

/** Quien tecleó su PIN, con su turno, hasta que se bloquea o entra otro. */
function ConTurno({
  llave,
  aparato,
  dentro,
  alSalir,
  children,
}: {
  readonly llave: string;
  readonly aparato: ElAparatoPorDentro;
  readonly dentro: DentroDelTpv;
  readonly alSalir: () => void;
  readonly children: ReactNode;
}) {
  const cache = useQueryClient();
  const salir = useRef(alSalir);
  salir.current = alSalir;
  const cliente = useMemo(
    () =>
      crearClienteDelTpv({
        token: () => tokenDelAparato(dentro.turno, llave),
        // El turno ya no vale (lo acabó otro aparato, o lo desvincularon): al PIN, y el
        // latido dirá si sigue vinculado.
        alCaducar: () => {
          salir.current();
        },
      }),
    [dentro.turno, llave],
  );

  const yo = useQuery({
    queryKey: ['yo_en_el_tpv', dentro.turno],
    queryFn: async () => {
      const respuesta = await cliente.consultar<YoEnElTpv>('yo_en_el_tpv');
      if (!respuesta.ok) throw new FalloDeLaSala(respuesta.error);
      return respuesta.datos;
    },
  });

  const bloquear = useCallback(() => {
    // Lo de quien estaba no se le enseña al siguiente: se vacía lo leído.
    void cliente.ejecutar('bloquear', {});
    cache.removeQueries({ queryKey: ['sala'] });
    cache.removeQueries({ queryKey: ['yo_en_el_tpv'] });
    salir.current();
  }, [cliente, cache]);

  usarElBloqueo(minutosDelBloqueo(aparato.funcion, aparato.esPersonal, aparato.bloqueo), bloquear);

  const datos = yo.data;
  const valor = useMemo<SesionDeLaSala | null>(
    () =>
      datos === undefined
        ? null
        : {
            yo: {
              personaId: datos.persona.id,
              nombre: datos.persona.nombre,
              local: datos.local,
              permisos: datos.permisos,
            },
            cliente,
            aparato,
            datos,
            bloquear,
            refrescar: () => {
              void yo.refetch();
            },
          },
    [datos, cliente, aparato, bloquear, yo],
  );

  if (valor === null) {
    return (
      <Pantalla>
        {yo.isLoading ? (
          <Cargando que="tu turno" />
        ) : (
          <EstadoVacio
            esLaPagina
            titulo="No llegamos a Estook"
            frase="Puede ser la conexión. Vuelve a probar, o bloquea y entra otra vez."
            dibujo="perdido"
            accion={
              <Boton tono="principal" onClick={bloquear}>
                Bloquear
              </Boton>
            }
          />
        )}
      </Pantalla>
    );
  }
  return <ContextoDeSesion.Provider value={valor}>{children}</ContextoDeSesion.Provider>;
}
