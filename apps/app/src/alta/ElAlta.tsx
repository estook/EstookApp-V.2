import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CUANTOS_PASOS,
  PASOS_DEL_ALTA,
  numeroDelPaso,
  type PasoDelAlta,
  type Progreso,
} from '@estook/dominio';
import { Aviso, Boton, Cargando, ErrorEnCristiano, Logo } from '@estook/ui';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { FalloDeLaApi } from '../datos/FalloDeLaApi.ts';
import { usarSesion } from '../sesion/Sesion.tsx';
import { DondeEsta } from './pasos/DondeEsta.tsx';
import { ElEquipo } from './pasos/ElEquipo.tsx';
import { ElPaseo } from './pasos/ElPaseo.tsx';
import { FiscalYObjetivos } from './pasos/FiscalYObjetivos.tsx';
import { LaMarca } from './pasos/LaMarca.tsx';
import { QuienEres } from './pasos/QuienEres.tsx';
import { QueTipoDeLocal } from './pasos/QueTipoDeLocal.tsx';
import { CuantosLocales } from './pasos/CuantosLocales.tsx';
import type { ElAltaDelLocal, PropsDeUnPaso } from './contrato.ts';

/**
 * El alta de un local · los ocho pasos (M5).
 *
 * «Una conversación corta, una pregunta por pantalla, con botones grandes y la
 *  opción de saltar cualquier cosa» (Manifiesto 8).
 *
 * ── Una pregunta por pantalla, y por qué eso importa ─────────────────────────
 *
 * El criterio de terminado de M5 es **menos de cuatro minutos**. Cuatro minutos
 * entre ocho pasos son treinta segundos por pantalla, y en treinta segundos no
 * cabe un formulario de quince casillas. Cada paso pregunta una cosa, con la
 * respuesta más probable ya puesta, y se avanza.
 *
 * ── Y por qué se puede saltar todo ───────────────────────────────────────────
 *
 * Porque el alta compite con «ya lo miro luego», y luego no llega nunca. Un alta
 * que no deja pasar de la pantalla dos es un alta que se abandona en la pantalla
 * dos. Lo que se salta queda apuntado y vuelve a ofrecerse desde el Panel.
 *
 * ── Dónde está la lógica ─────────────────────────────────────────────────────
 *
 * Aquí no. Los ocho pasos, sus títulos y lo que se gana con cada uno viven en
 * `@estook/dominio`; qué se guarda en cada uno, en su comando del servidor. Esto
 * pinta y llama (regla 5).
 */
export function ElAlta() {
  const { cliente, refrescar } = usarSesion();
  const cache = useQueryClient();

  const consulta = useQuery({
    queryKey: ['el_alta'],
    // Se pregunta cada vez que se vuelve: el alta se puede estar haciendo desde
    // dos sitios, y lo que manda es lo que dice el servidor.
    staleTime: 0,
    retry: 1,
    queryFn: async (): Promise<ElAltaDelLocal> => {
      const respuesta = await cliente.consultar<ElAltaDelLocal>('el_alta');
      if (!respuesta.ok) throw new Error(respuesta.error.codigo);
      return respuesta.datos;
    },
  });

  const alta = consulta.data ?? null;

  /** Por dónde va: el paso del servidor, o el que se esté mirando ahora. */
  const [mirando, setMirando] = useState<number | null>(null);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);

  const paso = mirando ?? alta?.paso ?? 0;

  const volverAPreguntar = useCallback(async () => {
    await cache.invalidateQueries({ queryKey: ['el_alta'] });
  }, [cache]);

  /**
   * Avanzar.
   *
   * Se vuelve a preguntar al servidor **antes** de pasar de pantalla, no después:
   * el paso siguiente puede necesitar lo que acaba de guardarse —los objetivos de
   * partida dependen del tipo de local— y pintarlo con lo de antes enseñaría
   * números que no son.
   */
  const siguiente = useCallback(async () => {
    setError(null);
    await volverAPreguntar();
    setMirando(Math.min(paso + 1, CUANTOS_PASOS));
  }, [paso, volverAPreguntar]);

  /**
   * ¿Se vino a por una cosa sola?
   *
   * Lo dice el servidor en `retomadoPara`, que lo pone la tarjeta del Panel al
   * pedir el recado y lo borra `terminar_el_alta`. Se calcula aquí arriba —y no
   * junto a la pantalla— porque lo miran **las dos salidas del paso**: guardar y
   * dejarlo para luego.
   *
   * Que solo lo mirara «guardar» fue el segundo agujero del mismo fallo: quien
   * pulsaba «Esto lo dejo para luego» seguía cayendo en el paseo entero.
   */
  const elRecado = alta?.retomadoPara ?? null;
  const esElRecado = elRecado !== null && elRecado === PASOS_DEL_ALTA[paso]?.codigo;

  const saltar = useMutation({
    mutationFn: async (codigo: PasoDelAlta) => {
      const respuesta = await cliente.ejecutar('saltar_paso_del_alta', { paso: codigo });
      if (!respuesta.ok) throw new FalloDeLaApi(respuesta.error);
    },
    onSuccess: () => {
      // Dejar el recado para luego también termina: se vino a una cosa, y la
      // respuesta «ahora no» es una respuesta.
      if (esElRecado) terminar.mutate();
      else void siguiente();
    },
    onError: (fallo: FalloDeLaApi) => {
      setError(fallo.error);
    },
  });

  const terminar = useMutation({
    mutationFn: async () => {
      const respuesta = await cliente.ejecutar('terminar_el_alta', {});
      if (!respuesta.ok) throw new FalloDeLaApi(respuesta.error);
    },
    onSuccess: async () => {
      // Se refresca la sesión entera: la quinta comprobación deja de mandar al
      // alta, y quien la rehace es el servidor en la petición siguiente.
      await refrescar();
    },
    onError: (fallo: FalloDeLaApi) => {
      setError(fallo.error);
    },
  });

  const laPantalla = useMemo(() => PASOS_DEL_ALTA[paso] ?? null, [paso]);

  if (consulta.isLoading) {
    return (
      <Marco titulo="" progreso={null}>
        <Cargando que="tu local" />
      </Marco>
    );
  }

  if (alta === null) {
    return (
      <Marco titulo="No se ha podido abrir el alta" progreso={null}>
        <Aviso tono="atencion" titulo="No hemos podido leer los datos de tu local">
          Puede ser la conexión. Vuelve a intentarlo en un momento.
        </Aviso>
      </Marco>
    );
  }

  // Pasados los ocho, el resumen y el botón de entrar.
  if (laPantalla === null) {
    return (
      <Marco titulo="Ya está" progreso={alta.progreso}>
        <Terminar
          alta={alta}
          alTerminar={() => {
            terminar.mutate();
          }}
          alVolver={(codigo) => {
            setMirando(numeroDelPaso(codigo));
          }}
          esperando={terminar.isPending}
        />
        {error && <ErrorEnCristiano error={error} />}
      </Marco>
    );
  }

  /**
   * **Si se vino a por una cosa, se guarda esa cosa y se vuelve.**
   *
   * La tarjeta del Panel ofrece un recado —«Invita a tu equipo», y debajo «y 1
   * cosa más, cuando quieras»— y antes metía en el asistente completo: al
   * guardar el paso se avanzaba al siguiente, así que aparecían otra vez el
   * paseo y la guía de instalación, ya vistos.
   *
   * Quien acepta hacer una cosa no ha aceptado hacer las cinco siguientes.
   *
   * El paso al que se volvió lo dice el servidor en `retomadoPara`, y cerrar el
   * alta lo borra, así que no puede quedarse pegado.
   */
  const propiedades: PropsDeUnPaso = {
    alta,
    cliente,
    // `mutateAsync` y no `mutate`: el paso espera a que `alGuardar` termine para
    // apagar su «Guardando», y con la versión que no espera el botón se apagaba
    // antes de que el alta se hubiera cerrado.
    alGuardar: esElRecado ? () => terminar.mutateAsync() : siguiente,
    alFallar: setError,
  };

  return (
    <Marco titulo={laPantalla.titulo} progreso={alta.progreso}>
      <div className="flex flex-col gap-e5">
        {paso === 0 && <QuienEres {...propiedades} />}
        {paso === 1 && <QueTipoDeLocal {...propiedades} />}
        {paso === 2 && <CuantosLocales {...propiedades} />}
        {paso === 3 && <DondeEsta {...propiedades} />}
        {paso === 4 && <LaMarca {...propiedades} />}
        {paso === 5 && <FiscalYObjetivos {...propiedades} />}
        {paso === 6 && <ElEquipo {...propiedades} />}
        {paso === 7 && <ElPaseo {...propiedades} />}

        {error && <ErrorEnCristiano error={error} />}

        {/*
          Saltar está siempre, y en gris: es una salida, no una opción a la misma
          altura que responder. «Con la opción de saltar cualquier cosa.»
        */}
        <div className="flex justify-center border-t border-borde pt-e3">
          <Boton
            tono="texto"
            cargando={saltar.isPending}
            textoCargando="Un momento"
            onClick={() => {
              saltar.mutate(laPantalla.codigo);
            }}
          >
            Esto lo dejo para luego
          </Boton>
        </div>
      </div>
    </Marco>
  );
}

// ── El marco, con la barra de progreso ───────────────────────────────────────

function Marco({
  titulo,
  progreso,
  children,
}: {
  readonly titulo: string;
  readonly progreso: Progreso | null;
  readonly children: ReactNode;
}) {
  return (
    <main className="flex min-h-dvh flex-col items-center bg-fondo px-e4 py-e6">
      <div className="w-full max-w-[34rem]">
        <div className="mb-e5 flex justify-center">
          <Logo alto={32} />
        </div>

        {progreso !== null && <BarraDeProgreso progreso={progreso} />}

        {titulo !== '' && (
          <h1 className="mb-e5 mt-e4 text-center text-pantalla font-semibold">{titulo}</h1>
        )}

        {children}
      </div>
    </main>
  );
}

/**
 * La barra de progreso **con valor, no con tareas**.
 *
 * «Con lo que llevas ya calculo el margen de 6 platos; con 4 más te digo cuál te
 *  está costando dinero» (Manifiesto 8).
 *
 * La diferencia es todo: «3 de 8 pasos» dice cuánto trabajo queda, que es justo
 * lo que desanima. «Ya sé qué impuesto lleva cada cosa» dice qué te llevas. La
 * frase la compone el dominio, que es quien conoce el orden de lo valioso.
 */
function BarraDeProgreso({ progreso }: { readonly progreso: Progreso }) {
  // Un ancho en CSS admite decimales, asi que no hay nada que redondear. Y de
  // paso no se roza la regla 9: aqui no se cuenta dinero, pero un `Math.round`
  // suelto en una pantalla es lo que un dia acaba redondeando un importe.
  const porCiento = progreso.fraccion * 100;

  return (
    <div className="flex flex-col gap-e2">
      <div
        className="h-2 w-full overflow-hidden rounded-redondo bg-borde"
        role="progressbar"
        aria-valuenow={progreso.respondidos}
        aria-valuemin={0}
        aria-valuemax={progreso.deCuantos}
        aria-label="Lo que llevas del alta"
      >
        <div
          className="h-full rounded-redondo bg-naranja transition-[width] duration-normal"
          style={{ width: `${porCiento}%` }}
        />
      </div>

      {progreso.loQueYaTienes !== null && (
        <p className="text-center text-secundario text-texto-suave">{progreso.loQueYaTienes}</p>
      )}
    </div>
  );
}

// ── La última pantalla ───────────────────────────────────────────────────────

function Terminar({
  alta,
  alTerminar,
  alVolver,
  esperando,
}: {
  readonly alta: ElAltaDelLocal;
  readonly alTerminar: () => void;
  readonly alVolver: (paso: PasoDelAlta) => void;
  readonly esperando: boolean;
}) {
  const pendientes = PASOS_DEL_ALTA.filter((p) => alta.progreso.pendientes.includes(p.codigo));

  return (
    <div className="flex flex-col gap-e4">
      <p className="text-center text-cuerpo text-texto-suave">
        {alta.nombre} ya puede trabajar. Lo que falte se puede completar cuando quieras desde el
        Panel.
      </p>

      {pendientes.length > 0 && (
        <div className="rounded-medio border border-borde bg-superficie p-e4">
          <h2 className="mb-e2 text-etiqueta uppercase tracking-wide text-texto-suave">
            Te queda por decirme
          </h2>
          <ul className="flex flex-col gap-e2">
            {pendientes.map((paso) => (
              <li key={paso.codigo}>
                <button
                  type="button"
                  onClick={() => {
                    alVolver(paso.codigo);
                  }}
                  className="flex w-full min-h-toque flex-col rounded-medio px-e2 py-e1 text-left hover:bg-fondo"
                >
                  <span className="text-cuerpo font-medium">{paso.titulo}</span>
                  {/* Lo que se gana, no lo que cuesta. */}
                  <span className="text-secundario text-texto-suave">{paso.paraQue}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Boton
        tono="principal"
        ancho
        cargando={esperando}
        textoCargando="Abriendo tu local"
        onClick={alTerminar}
      >
        Entrar en {alta.nombre}
      </Boton>
    </div>
  );
}
