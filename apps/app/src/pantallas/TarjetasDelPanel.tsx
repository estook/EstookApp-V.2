import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { PASOS_DEL_ALTA } from '@estook/dominio';
import { puedeEditar, puedeVer } from '@estook/permisos';
import { Aviso, Boton, Cargando, Etiqueta, Lista, Tarjeta, clases } from '@estook/ui';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { FalloDeLaApi } from '../datos/FalloDeLaApi.ts';
import { LoQueLlegaDespues } from './LoQueLlegaDespues.tsx';
import { usarSesion } from '../sesion/Sesion.tsx';
import type { ElAltaDelLocal } from '../alta/contrato.ts';
import { aplazar, estaAplazado } from './recordatorios.ts';

/**
 * Las tarjetas fijas del Panel (M5).
 *
 * Tres, y las tres desaparecen solas cuando dejan de tener sentido. Una tarjeta
 * que no se puede quitar y que no dice nada es lo peor que se le puede poner
 * encima al Panel a alguien.
 *
 *   Conecta tus ventas       hasta que el TPV esté conectado (M18)
 *   Termina de configurar    mientras queden pasos del alta sin responder
 *   Tu equipo                en cuanto haya alguien más con acceso
 *   Quita los ejemplos       mientras el local tenga datos de mentira
 *
 * ── Las dos que no se iban ───────────────────────────────────────────────────
 *
 * Dos de estas tarjetas mentían, y las dos las vio Richi en el móvil:
 *
 *   · «Conecta tus ventas» tenía un «Recuérdamelo» que la escondía siete días.
 *     Siete días después nadie se acuerda de nada, así que en la práctica era un
 *     «no me lo enseñes nunca más» disfrazado. Ahora el aplazamiento **dura la
 *     sesión**: al volver a entrar con la contraseña, vuelve.
 *
 *   · «Termina de configurar tu local» **no se podía quitar**. Iba la primera de
 *     todas, y quien lleva el local solo y no va a invitar a nadie la tenía ahí
 *     para siempre. Ahora se puede apagar, y se apaga en el servidor para que se
 *     apague en todos sus aparatos (migración 0024).
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
      {alta !== null && puedeGestionar && !alta.recordatorioOculto && (
        <TerminaDeConfigurar alta={alta} />
      )}
      <TuEquipo />
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
 * ── Y por qué el botón ya no está apagado ───────────────────────────────────
 *
 * Estaba `disabled`, con la explicación debajo en letra pequeña. Sonaba honesto y
 * no lo era del todo: un botón apagado no se lee, se ignora, y quien tenía la
 * pregunta —«¿esto qué me va a traer?»— se quedaba sin respuesta. Ahora se pulsa
 * y contesta, igual que avisos, chat y Fogón.
 *
 * ── El «recuérdamelo» ────────────────────────────────────────────────────────
 *
 * Se guarda en este navegador, no en el servidor. No es un dato del negocio: es
 * «hoy no me apetece». Lo que dura es **la sesión**: vuelve en cuanto alguien
 * entra otra vez con su contraseña, que es el momento en el que uno se sienta a
 * configurar cosas. La lista de aplazamientos y el olvido viven en
 * `recordatorios.ts`, que es su único dueño.
 *
 * Y sigue habiendo un tope de siete días por si alguien deja la sesión abierta
 * un mes, que es lo que la Auditoría (hallazgo 10) le pide a cualquier aviso.
 */
function ConectaTusVentas() {
  const [escondida, setEscondida] = useState(() => estaAplazado('tpv'));
  const [contando, setContando] = useState(false);

  if (escondida) return null;

  return (
    <Tarjeta titulo="Conecta tus ventas">
      <p className="text-cuerpo text-texto-suave">
        Trae tu carta y tus ventas automáticamente. Se hace una vez y son cinco minutos.
      </p>
      <div className="mt-e3 flex flex-wrap gap-e2">
        <Boton
          tono="principal"
          onClick={() => {
            setContando(true);
          }}
        >
          Conectar ahora
        </Boton>
        <Boton
          tono="texto"
          onClick={() => {
            aplazar('tpv');
            setEscondida(true);
          }}
        >
          Recuérdamelo
        </Boton>
      </div>
      <LoQueLlegaDespues
        que={contando ? 'tpv' : null}
        alCerrar={() => {
          setContando(false);
        }}
      />

      <p className="mt-e2 text-secundario text-texto-suave">
        El asistente de conexión llega con el módulo de conectores. Hasta entonces, las ventas se
        pueden meter a mano. Si lo aplazas, vuelve la próxima vez que entres.
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
  const cache = useQueryClient();
  const [error, setError] = useState<ErrorDeLaApi | null>(null);

  const retomar = useMutation({
    mutationFn: async (paso: string) => {
      // `solo_este_paso` es lo que hace que esto sea un recado y no el asistente
      // entero: se abre ese paso, y al guardarlo se vuelve aquí. Esta tarjeta
      // ofrece «y 1 cosa más, **cuando quieras**», así que meter a alguien en el
      // recorrido completo es no cumplir lo que se le ofreció.
      const respuesta = await cliente.ejecutar('retomar_el_alta', {
        paso,
        solo_este_paso: true,
      });
      if (!respuesta.ok) throw new FalloDeLaApi(respuesta.error);
    },
    // Al reabrir el alta, la quinta comprobación vuelve a mandar allí en la
    // petición siguiente. No se navega desde aquí: lo decide `Puerta`.
    onSuccess: () => refrescar(),
    onError: (fallo: FalloDeLaApi) => {
      setError(fallo.error);
    },
  });

  /**
   * «No me lo recuerdes más».
   *
   * No marca nada como hecho ni como saltado: lo que falta sigue faltando y el
   * progreso sigue siendo el que es. Solo apaga el recordatorio, y lo apaga en el
   * servidor —columna `panel_recordatorio_oculto`, migración 0024— para que
   * apagarlo en el ordenador lo apague también en el teléfono. Guardarlo en este
   * navegador habría sido la clase de mentira pequeña que hace que uno deje de
   * fiarse de los botones.
   *
   * Lo que se apaga se puede volver a encender: los pasos siguen en Ajustes.
   */
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
          quieras.
        </p>
      )}

      <p className="mt-e2 text-secundario text-texto-suave">
        Si lo quitas, no se da nada por hecho: lo que falte sigue estando en Ajustes cuando lo
        quieras.
      </p>
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

// ── «Tu equipo» ──────────────────────────────────────────────────────────────

/** Lo que devuelve `quien_tiene_acceso`, de lo que aquí se usa. */
interface QuienTieneAcceso {
  readonly personaId: string;
  readonly nombre: string;
  readonly apellidos: string | null;
  readonly rolNombre: string;
  readonly estado: 'dentro' | 'sin_estrenar' | 'fuera';
  readonly ultimoAccesoEn: string | null;
}

/**
 * Quién más trabaja aquí.
 *
 * ── Por qué aparece cuando aparece ───────────────────────────────────────────
 *
 * Sale **en cuanto hay alguien más**. Hasta entonces no hay nada que enseñar:
 * una lista con una sola persona, que además eres tú, es ruido. Y esa es
 * exactamente la recompensa de haber invitado a alguien desde la tarjeta de
 * arriba: la tarjeta que pedía se convierte en la tarjeta que informa.
 *
 * ── Lo que enseña, y lo que todavía no ───────────────────────────────────────
 *
 * Enseña lo que Estook **sabe de verdad hoy**: quién tiene acceso, con qué rol,
 * y si ha entrado alguna vez o su PIN sigue sin estrenar. Eso es M4.
 *
 * Lo que no enseña es si alguien está **fichado ahora mismo** y sus horas del
 * mes. Eso no es un dato que se pueda deducir de nada de lo que hay: son los
 * fichajes, y llegan en M15. Ponerlo aquí en gris con un cero sería inventarse
 * una cifra, que es la única cosa que un panel no puede hacer. Se dice qué irá
 * ahí y de dónde saldrá, como el resto del Panel.
 */
function TuEquipo() {
  const { cliente, permisos, yo } = usarSesion();
  const navegar = useNavigate();

  const localId = yo?.local?.id ?? null;
  // La misma puerta que la app: quien no tiene Equipo en su rueda tampoco tiene
  // por qué tener la plantilla en su Panel.
  const puedeMirar = puedeVer(permisos, 'app.equipo');

  const consulta = useQuery({
    queryKey: ['quien_tiene_acceso', localId],
    enabled: localId !== null && puedeMirar,
    retry: 1,
    queryFn: async (): Promise<readonly QuienTieneAcceso[]> => {
      const respuesta = await cliente.consultar<readonly QuienTieneAcceso[]>('quien_tiene_acceso', {
        local_id: localId ?? '',
      });
      if (!respuesta.ok) throw new Error(respuesta.error.codigo);
      return respuesta.datos;
    },
  });

  if (!puedeMirar || localId === null) return null;
  if (consulta.isPending && consulta.fetchStatus === 'fetching') {
    return (
      <Tarjeta titulo="Tu equipo">
        <Cargando que="tu equipo" />
      </Tarjeta>
    );
  }

  const gente = (consulta.data ?? []).filter((quien) => quien.estado !== 'fuera');

  // Solo tú todavía: no hay equipo que enseñar, y la tarjeta de arriba ya pide
  // que invites a alguien. Dos tarjetas pidiendo lo mismo son una de más.
  if (gente.length < 2) return null;

  return (
    <Tarjeta
      titulo={gente.length === 1 ? '1 persona' : `${gente.length} personas`}
      origen="Quién tiene acceso a este local"
      accion={
        <Boton
          tono="secundario"
          onClick={() => {
            navegar('/equipo/personas');
          }}
        >
          Ver el equipo
        </Boton>
      }
    >
      <Lista
        titulo="Tu equipo"
        elementos={gente.slice(0, 6).map((quien) => ({
          clave: quien.personaId,
          titulo: (
            <span className="flex flex-wrap items-center gap-e2">
              <span>
                {quien.nombre}
                {quien.apellidos === null ? '' : ` ${quien.apellidos}`}
              </span>
              {quien.estado === 'sin_estrenar' && (
                <Etiqueta tono="atencion">todavía no ha entrado</Etiqueta>
              )}
            </span>
          ),
          // «Hace tres días» necesitaría preguntarle la hora al navegador, y la
          // fecha la decide el servidor (regla 10). Lo que sí es un hecho, y es lo
          // que hace falta saber, es si esa persona ha llegado a entrar: sin eso,
          // quien invita a cinco el lunes no sabe el viernes a quién hay que
          // volver a darle el PIN.
          detalle:
            quien.estado === 'sin_estrenar'
              ? `${quien.rolNombre} · su PIN sigue valiendo`
              : quien.rolNombre,
        }))}
        cuandoNoHay={<span className="text-texto-suave">Todavía no hay nadie más.</span>}
      />

      {gente.length > 6 && (
        <p className="mt-e2 text-secundario text-texto-suave">Y {gente.length - 6} más.</p>
      )}

      <p className="mt-e3 text-secundario text-texto-suave">
        Quién está fichado ahora mismo y las horas de cada uno llegan con los fichajes, en el módulo
        15. Poner aquí un cero mientras tanto sería inventarse una cifra.
      </p>
    </Tarjeta>
  );
}
