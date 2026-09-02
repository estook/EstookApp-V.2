import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PASOS_DEL_ALTA } from '@estook/dominio';
import { puedeEditar } from '@estook/permisos';
import { Aviso, Boton, Tarjeta, clases } from '@estook/ui';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { FalloDeLaApi } from '../datos/FalloDeLaApi.ts';
import { usarSesion } from '../sesion/Sesion.tsx';
import type { ElAltaDelLocal } from '../alta/contrato.ts';

/**
 * Las tarjetas fijas del Panel (M5).
 *
 * Tres, y las tres desaparecen solas cuando dejan de tener sentido. Una tarjeta
 * que no se puede quitar y que no dice nada es lo peor que se le puede poner
 * encima al Panel a alguien.
 *
 *   Conecta tus ventas       hasta que el TPV esté conectado (M18)
 *   Termina de configurar    mientras queden pasos del alta sin responder
 *   Quita los ejemplos       mientras el local tenga datos de mentira
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
  // El mismo permiso que exigen los comandos del alta. Un gerente lleva su
  // local y no crea locales nuevos: eso es `accion.gestionar_locales`, que es
  // de organizacion.
  const puedeGestionar = puedeEditar(permisos, 'app.ajustes');

  return (
    <>
      <ConectaTusVentas />
      {alta !== null && puedeGestionar && <TerminaDeConfigurar alta={alta} />}
      {alta !== null && alta.ejemplos > 0 && puedeGestionar && <QuitaLosEjemplos alta={alta} />}
    </>
  );
}

// ── «Conecta tus ventas» ─────────────────────────────────────────────────────

/**
 * «Al terminar el paseo aparece **una tarjeta fija en el Panel que no se va
 *  hasta que se resuelve**» (Manifiesto 8).
 *
 * ── Lo que esta tarjeta NO hace, y es lo importante ──────────────────────────
 *
 * No conecta nada. **El asistente de conexión con el TPV no se construye en
 * M5**: vive en M18 y M20, y la ficha de M5 en el Plan lo dice con esas
 * palabras. Aquí solo existe la tarjeta.
 *
 * Y por eso el botón dice la verdad en vez de llevar a una pantalla vacía:
 * «Pedirle credenciales de otro programa en el minuto dos es la forma más rápida
 * de asustar a un gerente», así que mientras el asistente no exista, lo honesto
 * es decir cuándo llega.
 *
 * ── El «recuérdamelo» ────────────────────────────────────────────────────────
 *
 * Se guarda en este navegador, no en el servidor. No es un dato del negocio: es
 * «hoy no me apetece», y siete días después vuelve. Es la misma regla que la
 * Auditoría (hallazgo 10) le pone a cualquier aviso: «con "ahora no" vuelve en
 * siete días».
 */
const CUANDO_VUELVE = 'estook.recordar-el-tpv';

function ConectaTusVentas() {
  const [escondida, setEscondida] = useState(() => {
    try {
      const hasta = window.localStorage.getItem(CUANDO_VUELVE);
      return hasta !== null && Number(hasta) > Date.now();
    } catch {
      return false;
    }
  });

  if (escondida) return null;

  return (
    <Tarjeta titulo="Conecta tus ventas">
      <p className="text-cuerpo text-texto-suave">
        Trae tu carta y tus ventas automáticamente. Se hace una vez y son cinco minutos.
      </p>
      <div className="mt-e3 flex flex-wrap gap-e2">
        <Boton tono="principal" disabled>
          Conectar ahora
        </Boton>
        <Boton
          tono="texto"
          onClick={() => {
            try {
              window.localStorage.setItem(
                CUANDO_VUELVE,
                String(Date.now() + 7 * 24 * 60 * 60 * 1000),
              );
            } catch {
              // Si no se puede guardar, se esconde solo hasta recargar. Mejor
              // eso que no poder quitarla de la pantalla.
            }
            setEscondida(true);
          }}
        >
          Recuérdamelo
        </Boton>
      </div>
      <p className="mt-e2 text-secundario text-texto-suave">
        El asistente de conexión llega con el módulo de conectores. Hasta entonces, las ventas se
        pueden meter a mano.
      </p>
    </Tarjeta>
  );
}

// ── «Termina de configurar tu local» ─────────────────────────────────────────

/**
 * Lo que quedó sin responder en el alta, ofrecido otra vez.
 *
 * «Barra de progreso **con valor, no con tareas**» (Manifiesto 8): no dice «te
 * faltan 3 de 8», dice qué se gana con lo siguiente. La frase la compone el
 * dominio, que es quien conoce el orden de lo valioso.
 */
function TerminaDeConfigurar({ alta }: { readonly alta: ElAltaDelLocal }) {
  const { cliente, refrescar } = usarSesion();
  const [error, setError] = useState<ErrorDeLaApi | null>(null);

  const retomar = useMutation({
    mutationFn: async (paso: string) => {
      const respuesta = await cliente.ejecutar('retomar_el_alta', { paso });
      if (!respuesta.ok) throw new FalloDeLaApi(respuesta.error);
    },
    // Al reabrir el alta, la quinta comprobación vuelve a mandar allí en la
    // petición siguiente. No se navega desde aquí: lo decide `Puerta`.
    onSuccess: () => refrescar(),
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

      <div className="mt-e3">
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
      </div>

      {pendientes.length > 1 && (
        <p className="mt-e2 text-secundario text-texto-suave">
          Y {pendientes.length - 1} {pendientes.length === 2 ? 'cosa más' : 'cosas más'}, cuando
          quieras.
        </p>
      )}
    </Tarjeta>
  );
}

// ── «Quitar los ejemplos» ────────────────────────────────────────────────────

/**
 * «Un solo botón, **Quitar los ejemplos**, los borra todos de golpe»
 * (Manifiesto 8).
 *
 * La tarjeta **solo aparece si hay ejemplos**. Hoy los cuenta
 * `estook.contar_ejemplos`, que lee el registro donde cada módulo apunta lo que
 * crea de mentira; mientras nadie apunte nada, esta tarjeta no se ve. Es lo
 * correcto: una tarjeta que ofrece borrar cero cosas es ruido.
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
          {hecho === 1 ? 'Se ha borrado uno.' : `Se han borrado ${hecho}.`} A partir de ahora todo
          lo que veas es tuyo.
        </p>
      </Tarjeta>
    );
  }

  return (
    <Tarjeta titulo="Los datos de ejemplo">
      <p className="text-cuerpo text-texto-suave">
        Tienes {alta.ejemplos} {alta.ejemplos === 1 ? 'cosa' : 'cosas'} de ejemplo, marcadas en
        gris. No cuentan para nada: ni avisos, ni análisis, ni informes.
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
