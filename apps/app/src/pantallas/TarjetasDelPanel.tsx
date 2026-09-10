import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PASOS_DEL_ALTA } from '@estook/dominio';
import { puedeEditar } from '@estook/permisos';
import { Aviso, Boton, Tarjeta, clases } from '@estook/ui';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { FalloDeLaApi } from '../datos/FalloDeLaApi.ts';
import { usarSesion } from '../sesion/Sesion.tsx';
import { ComoEntranTusVentas } from '../servicio/ComoEntranTusVentas.tsx';
import type { ElAltaDelLocal } from '../alta/contrato.ts';

/**
 * Las tarjetas fijas del Panel (M5, recortadas en M6½).
 *
 * Tres, y las tres desaparecen solas cuando dejan de tener sentido:
 *
 *   ¿Cómo entran tus ventas?   hasta que se elige: a mano o con el TPV
 *   Termina de configurar      mientras queden pasos del alta sin responder
 *   Quita los ejemplos         mientras el local tenga datos de mentira
 *
 * ── Las dos que se han ido ──────────────────────────────────────────────────
 *
 *   · **«Conecta tus ventas».** Pedía conectar un TPV con un asistente que no
 *     existe —es M18— y un «recuérdamelo». Pedía siempre lo mismo y no se podía
 *     resolver. En su sitio va **la pregunta** de verdad —¿a mano o con tu TPV?—,
 *     que sí se contesta y desaparece al contestarla.
 *   · **«Tu equipo».** Ocupaba media pantalla con la plantilla entera en
 *     pastillas, para contestar algo que no se pregunta a diario. «Para eso van a
 *     Equipo.» Lo que sí se mira cada día son dos cosas —quién está trabajando y
 *     quién está en línea— y son dos widgets que cada uno pone si quiere.
 */
export function TarjetasDelPanel() {
  const { cliente, permisos, yo } = usarSesion();

  // La misma consulta que usa el alta: es la misma pregunta —«¿por dónde va y
  // qué falta?»— y dos consultas que la respondan acabarían discrepando.
  const consulta = useQuery({
    queryKey: ['el_alta'],
    enabled: yo?.local !== null && yo?.local !== undefined,
    retry: 1,
    queryFn: async (): Promise<ElAltaDelLocal> => {
      const respuesta = await cliente.consultar<ElAltaDelLocal>('el_alta');
      if (!respuesta.ok) throw new Error(respuesta.error.codigo);
      return respuesta.datos;
    },
  });

  const alta = consulta.data ?? null;
  // El mismo permiso que exigen los comandos del alta.
  const puedeGestionar = puedeEditar(permisos, 'app.ajustes');

  return (
    <>
      <ComoEntranTusVentas modo="tarjeta" />
      {alta !== null && puedeGestionar && !alta.recordatorioOculto && (
        <TerminaDeConfigurar alta={alta} />
      )}
      {alta !== null && alta.ejemplos > 0 && puedeGestionar && <QuitaLosEjemplos alta={alta} />}
    </>
  );
}

// ── «Termina de configurar tu local» ─────────────────────────────────────────

/**
 * Lo que quedó sin responder en el alta, ofrecido otra vez.
 *
 * «Barra de progreso **con valor, no con tareas**» (Manifiesto 8): no dice «te
 * faltan 3 de 8», dice qué se gana con lo siguiente. Y se puede apagar, en el
 * servidor, para que se apague en todos los aparatos (migración 0024).
 */
function TerminaDeConfigurar({ alta }: { readonly alta: ElAltaDelLocal }) {
  const { cliente, refrescar } = usarSesion();
  const cache = useQueryClient();
  const [error, setError] = useState<ErrorDeLaApi | null>(null);

  const retomar = useMutation({
    mutationFn: async (paso: string) => {
      // `solo_este_paso` es lo que hace que esto sea un recado y no el asistente
      // entero: se abre ese paso, y al guardarlo se vuelve aquí.
      const respuesta = await cliente.ejecutar('retomar_el_alta', {
        paso,
        solo_este_paso: true,
      });
      if (!respuesta.ok) throw new FalloDeLaApi(respuesta.error);
    },
    onSuccess: () => refrescar(),
    onError: (fallo: FalloDeLaApi) => {
      setError(fallo.error);
    },
  });

  const apagar = useMutation({
    mutationFn: async () => {
      const respuesta = await cliente.ejecutar('ocultar_el_recordatorio_del_alta', {});
      if (!respuesta.ok) throw new FalloDeLaApi(respuesta.error);
    },
    onSuccess: () => cache.invalidateQueries({ queryKey: ['el_alta'] }),
    onError: (fallo: FalloDeLaApi) => {
      setError(fallo.error);
    },
  });

  const pendientes = PASOS_DEL_ALTA.filter((p) => alta.progreso.pendientes.includes(p.codigo));
  if (pendientes.length === 0) return null;

  const elSiguiente = pendientes[0];
  if (elSiguiente === undefined) return null;

  const porCiento = alta.progreso.fraccion * 100;

  return (
    <Tarjeta titulo="Termina de configurar tu local">
      <div
        className="h-2 w-full overflow-hidden rounded-redondo bg-borde"
        role="progressbar"
        aria-valuenow={alta.progreso.respondidos}
        aria-valuemin={0}
        aria-valuemax={alta.progreso.deCuantos}
        aria-label="Lo que llevas del alta"
      >
        <div className="h-full rounded-redondo bg-naranja" style={{ width: `${porCiento}%` }} />
      </div>

      <p className="mt-e3 text-cuerpo">{elSiguiente.paraQue}</p>

      {error && (
        <Aviso tono="mal" titulo={error.quePasa}>
          {error.queSePuedeHacer}
        </Aviso>
      )}

      <div className="mt-e3 flex flex-wrap items-center gap-e2">
        <Boton
          tono="principal"
          cargando={retomar.isPending}
          textoCargando="Abriendo"
          onClick={() => {
            retomar.mutate(elSiguiente.codigo);
          }}
        >
          {elSiguiente.titulo}
        </Boton>

        <Boton
          tono="texto"
          cargando={apagar.isPending}
          textoCargando="Quitando"
          onClick={() => {
            apagar.mutate();
          }}
        >
          No me lo recuerdes más
        </Boton>
      </div>

      {pendientes.length > 1 && (
        <p className="mt-e2 text-secundario text-texto-suave">
          Y {pendientes.length - 1} {pendientes.length === 2 ? 'cosa más' : 'cosas más'}, cuando
          quieras. Lo que falte sigue en Ajustes.
        </p>
      )}
    </Tarjeta>
  );
}

// ── «Quitar los ejemplos» ────────────────────────────────────────────────────

/**
 * «Un solo botón, **Quitar los ejemplos**, los borra todos de golpe»
 * (Manifiesto 8). Solo aparece si hay ejemplos: una tarjeta que ofrece borrar
 * cero cosas es ruido.
 */
function QuitaLosEjemplos({ alta }: { readonly alta: ElAltaDelLocal }) {
  const { cliente } = usarSesion();
  const cache = useQueryClient();
  const [error, setError] = useState<ErrorDeLaApi | null>(null);
  const [hecho, setHecho] = useState<number | null>(null);

  const quitar = useMutation({
    mutationFn: async () => {
      const respuesta = await cliente.ejecutar<{ borrados: number }>('quitar_los_ejemplos', {});
      if (!respuesta.ok) throw new FalloDeLaApi(respuesta.error);
      return respuesta.datos.borrados;
    },
    onSuccess: async (borrados) => {
      setHecho(borrados);
      await cache.invalidateQueries({ queryKey: ['el_alta'] });
    },
    onError: (fallo: FalloDeLaApi) => {
      setError(fallo.error);
    },
  });

  if (hecho !== null) {
    return (
      <Tarjeta titulo="Los ejemplos, fuera">
        <p className="text-cuerpo text-texto-suave">
          {hecho === 1 ? 'Se ha borrado uno.' : `Se han borrado ${hecho}.`} Todo lo que ves ya es
          tuyo.
        </p>
      </Tarjeta>
    );
  }

  return (
    <Tarjeta titulo="Los datos de ejemplo">
      <p className="text-cuerpo text-texto-suave">
        Tienes {alta.ejemplos} {alta.ejemplos === 1 ? 'cosa' : 'cosas'} de ejemplo, en gris. No
        cuentan para nada.
      </p>

      {error && (
        <Aviso tono="mal" titulo={error.quePasa}>
          {error.queSePuedeHacer}
        </Aviso>
      )}

      <div className={clases('mt-e3')}>
        <Boton
          tono="secundario"
          cargando={quitar.isPending}
          textoCargando="Borrando"
          onClick={() => {
            quitar.mutate();
          }}
        >
          Quitar los ejemplos
        </Boton>
      </div>
    </Tarjeta>
  );
}
