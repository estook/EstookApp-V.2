import { useCallback, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import type { CuandoSuena } from '@estook/dominio';
import { Aviso, Boton, Cargando, ErrorEnCristiano, Tarjeta, clases } from '@estook/ui';
import { usarSesion } from '../sesion/Sesion.tsx';
import { CLAVE_DE_MI_MOVIL, type MiMovil } from '../ganchos/usarMiMovil.ts';
import {
  comoEstaEsteMovil,
  dejarDeRecibir,
  recibirEnEsteMovil,
  type ComoEstaElMovil,
} from '../sinConexion/avisosAlMovil.ts';
import { esUnIphone, esUnMovil } from '../sinConexion/instalar.ts';

/**
 * Ajustes → Avisos: **este móvil** y **cuándo suena** (I · decisión 0070).
 *
 * Arriba, lo que hay que saber de un vistazo: si este móvil recibe los avisos, y un
 * botón para lo que toca —recibirlos, probarlos o dejar de recibirlos—. Si no se
 * puede, por qué y qué hacer, en una línea. Debajo, cuándo puede sonar: en tu turno,
 * o fuera de tus horas de silencio (Richi: «que lo configuren como quieran»).
 */

/** Lo que se dice de cada estado, en una línea, y qué hacer. */
const LO_QUE_SE_DICE: Readonly<Record<Exclude<ComoEstaElMovil, 'activo' | 'sin_activar'>, string>> =
  {
    no_se_puede:
      'Este navegador no recibe avisos. Con Chrome, Safari o Edge al día, sí; mientras, todo llega a la campana.',
    instala_primero:
      'En el iPhone, los avisos solo llegan con Estook en la pantalla de inicio: Compartir → «Añadir a pantalla de inicio», y ábrela desde su icono.',
    apagado_en_estook:
      'Los avisos al móvil todavía no están encendidos en Estook. Mientras, todo llega a la campana y lo importante, al correo.',
    bloqueado: '',
  };

function comoDesbloquear(): string {
  return esUnIphone()
    ? 'Dijiste que no a los avisos. Para cambiarlo: Ajustes del iPhone → Notificaciones → Estook → Permitir notificaciones.'
    : 'Dijiste que no a los avisos. Para cambiarlo: toca el candado de la barra de direcciones (o los ajustes de la app) → Notificaciones → Permitir, y vuelve aquí.';
}

export function EsteMovil({ datos }: { readonly datos: MiMovil | undefined }) {
  const { cliente } = usarSesion();
  const cache = useQueryClient();
  const [como, setComo] = useState<ComoEstaElMovil | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);
  const [probado, setProbado] = useState<string | null>(null);

  const mirar = useCallback(async () => {
    if (datos === undefined) return;
    setComo(await comoEstaEsteMovil(datos.encendido));
  }, [datos]);

  useEffect(() => {
    void mirar();
  }, [mirar]);

  async function recibir() {
    if (datos?.clavePublica === null || datos?.clavePublica === undefined) return;
    setOcupado(true);
    setError(null);
    try {
      const hecho = await recibirEnEsteMovil(cliente, datos.clavePublica);
      if (!hecho.ok && typeof hecho.porque !== 'string') setError(hecho.porque);
    } finally {
      setOcupado(false);
      await cache.invalidateQueries({ queryKey: CLAVE_DE_MI_MOVIL });
      await mirar();
    }
  }

  async function probar() {
    setOcupado(true);
    setError(null);
    setProbado(null);
    const respuesta = await cliente.ejecutar<{ entregados: number }>('probar_mi_movil', {});
    setOcupado(false);
    if (!respuesta.ok) {
      setError(respuesta.error);
      return;
    }
    setProbado(
      respuesta.datos.entregados > 0
        ? 'Enviado. Si no lo ves en unos segundos, mira que el móvil no esté en «No molestar».'
        : 'No ha llegado a ningún móvil. Prueba a dejar de recibir y volver a decir que sí.',
    );
  }

  async function dejar() {
    setOcupado(true);
    setError(null);
    setProbado(null);
    try {
      await dejarDeRecibir(cliente);
    } finally {
      setOcupado(false);
      await cache.invalidateQueries({ queryKey: CLAVE_DE_MI_MOVIL });
      await mirar();
    }
  }

  async function quitarOtro(id: string) {
    setError(null);
    const respuesta = await cliente.ejecutar('quitar_este_movil', { id });
    if (!respuesta.ok) setError(respuesta.error);
    await cache.invalidateQueries({ queryKey: CLAVE_DE_MI_MOVIL });
  }

  const activo = como === 'activo';
  const otros = datos?.moviles ?? [];
  // En el ordenador también llegan (Chrome, Edge): se le llama por su nombre.
  const aqui = esUnMovil() ? 'este móvil' : 'este ordenador';

  return (
    <Tarjeta titulo={esUnMovil() ? 'Este móvil' : 'Este ordenador'}>
      {datos === undefined || como === null ? (
        <Cargando que={aqui} lineas={1} />
      ) : (
        <div className="flex flex-col gap-e3">
          {error !== null && <ErrorEnCristiano error={error} />}

          {activo || como === 'sin_activar' ? (
            <div className="flex flex-wrap items-center justify-between gap-e3">
              <p className="flex items-center gap-e2 text-cuerpo">
                <span
                  aria-hidden
                  className={clases(
                    'size-2.5 shrink-0 rounded-full',
                    activo ? 'bg-bien' : 'bg-borde-fuerte',
                  )}
                />
                {activo
                  ? 'Recibe tus avisos, aunque Estook esté cerrada.'
                  : 'Recibe aquí lo que no puede esperar, aunque Estook esté cerrada.'}
              </p>
              <div className="flex flex-wrap gap-e2">
                {activo ? (
                  <>
                    <Boton tono="secundario" disabled={ocupado} onClick={() => void probar()}>
                      Probar
                    </Boton>
                    <Boton tono="texto" disabled={ocupado} onClick={() => void dejar()}>
                      Dejar de recibir
                    </Boton>
                  </>
                ) : (
                  <Boton
                    tono="principal"
                    disabled={ocupado}
                    cargando={ocupado}
                    textoCargando="Preguntando"
                    onClick={() => void recibir()}
                  >
                    Recibir en {aqui}
                  </Boton>
                )}
              </div>
            </div>
          ) : (
            <Aviso
              tono={como === 'bloqueado' ? 'atencion' : 'info'}
              titulo={
                como === 'bloqueado'
                  ? 'Los avisos están bloqueados'
                  : como === 'instala_primero'
                    ? 'Primero, a la pantalla de inicio'
                    : 'Aquí no llegan avisos al móvil'
              }
            >
              {como === 'bloqueado' ? comoDesbloquear() : LO_QUE_SE_DICE[como]}
            </Aviso>
          )}

          {probado !== null && (
            <p role="status" className="text-secundario text-texto-suave">
              {probado}
            </p>
          )}

          {/* Los otros móviles de esta persona: para quitar el que ya no usa. */}
          {otros.length > (activo ? 1 : 0) && (
            <details className="text-secundario">
              <summary className="cursor-pointer text-texto-suave">
                Dónde te llegan los avisos ({otros.length})
              </summary>
              <ul className="mt-e2 flex flex-col divide-y divide-borde">
                {otros.map((m) => (
                  <li key={m.id} className="flex items-center justify-between gap-e3 py-e2">
                    <span>{m.aparato ?? 'Otro aparato'}</span>
                    <Boton tono="texto" onClick={() => void quitarOtro(m.id)}>
                      Quitar
                    </Boton>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </Tarjeta>
  );
}

/** «Cuándo suena el móvil»: en tu turno, o fuera de tus horas de silencio. */
export function CuandoSuenaElMovil({ datos }: { readonly datos: MiMovil | undefined }) {
  const { cliente } = usarSesion();
  const cache = useQueryClient();
  const [error, setError] = useState<ErrorDeLaApi | null>(null);
  if (datos === undefined) return null;
  const { modo, desde, hasta, deFabrica, tieneHorario } = datos.cuandoSuena;

  async function guardar(nuevo: { modo: CuandoSuena; desde: string; hasta: string }) {
    setError(null);
    const antes = cache.getQueryData<MiMovil>(CLAVE_DE_MI_MOVIL);
    if (antes !== undefined) {
      cache.setQueryData<MiMovil>(CLAVE_DE_MI_MOVIL, {
        ...antes,
        cuandoSuena: { ...antes.cuandoSuena, ...nuevo, deFabrica: false },
      });
    }
    const respuesta = await cliente.ejecutar('guardar_cuando_suena', nuevo);
    if (!respuesta.ok) {
      setError(respuesta.error);
      if (antes !== undefined) cache.setQueryData(CLAVE_DE_MI_MOVIL, antes);
    }
  }

  const OPCIONES: readonly { modo: CuandoSuena; nombre: string; explica: string }[] = [
    {
      modo: 'en_mi_turno',
      nombre: 'Solo en mi turno',
      explica: tieneHorario
        ? 'Y cinco minutos antes de entrar. Fuera, se queda en la campana.'
        : 'No tienes horario puesto: así no te sonaría nunca.',
    },
    {
      modo: 'fuera_del_silencio',
      nombre: 'Siempre, menos en mis horas de silencio',
      explica: 'Lo que llegue en silencio te espera, y suena todo junto al acabar.',
    },
  ];

  return (
    <Tarjeta
      titulo="Cuándo suena el móvil"
      {...(deFabrica ? { origen: 'Como viene de fábrica. Cámbialo cuando quieras.' } : {})}
    >
      <div className="flex flex-col gap-e3">
        {error !== null && <ErrorEnCristiano error={error} />}
        <div role="radiogroup" aria-label="Cuándo suena el móvil" className="flex flex-col gap-e2">
          {OPCIONES.map((opcion) => {
            const elegida = opcion.modo === modo;
            return (
              <button
                key={opcion.modo}
                type="button"
                role="radio"
                aria-checked={elegida}
                onClick={() => {
                  void guardar({ modo: opcion.modo, desde, hasta });
                }}
                className={clases(
                  'flex min-h-toque flex-col items-start rounded-medio border px-e3 py-e2 text-left transition-colors',
                  elegida ? 'border-naranja bg-naranja-suave' : 'border-borde hover:bg-fondo',
                )}
              >
                <span className="text-cuerpo font-medium">{opcion.nombre}</span>
                <span className="text-secundario text-texto-suave">{opcion.explica}</span>
              </button>
            );
          })}
        </div>
        {modo === 'fuera_del_silencio' && (
          <div className="flex flex-wrap items-end gap-e3">
            <label className="flex flex-col gap-e1 text-secundario">
              <span className="text-texto-suave">Silencio desde</span>
              <input
                type="time"
                value={desde}
                onChange={(e) => {
                  if (e.currentTarget.value !== '') {
                    void guardar({ modo, desde: e.currentTarget.value, hasta });
                  }
                }}
                className="min-h-toque rounded-medio border border-borde-fuerte bg-superficie px-e3 tabular-nums"
              />
            </label>
            <label className="flex flex-col gap-e1 text-secundario">
              <span className="text-texto-suave">hasta</span>
              <input
                type="time"
                value={hasta}
                onChange={(e) => {
                  if (e.currentTarget.value !== '') {
                    void guardar({ modo, desde, hasta: e.currentTarget.value });
                  }
                }}
                className="min-h-toque rounded-medio border border-borde-fuerte bg-superficie px-e3 tabular-nums"
              />
            </label>
          </div>
        )}
      </div>
    </Tarjeta>
  );
}
