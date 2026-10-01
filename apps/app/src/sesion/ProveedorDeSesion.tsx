import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Boton, Botones, Hoja, usarDeshacer } from '@estook/ui';
import { crearClienteDeLaApp, guardarToken, hayApi, leerToken } from '../datos/cliente.ts';
import { dejarDeRecibir } from '../sinConexion/avisosAlMovil.ts';
import {
  guardarAlCambiar,
  olvidarLoGuardado,
  recuperarLoGuardado,
} from '../sinConexion/cacheGuardada.ts';
import { loPendienteDe, mandarLoPendiente, tirarLoDe } from '../sinConexion/cola.ts';
import { hayRed, laApiContesta, marcarSinRed } from '../sinConexion/red.ts';
import { ContextoDeSesion, type QuienSoy, type Sesion } from './Sesion.tsx';

/** Lo que se espera a `quien_soy` antes de mirar si hay red de verdad (0070). */
const SIN_CONTESTAR_MS = 4_000;

/**
 * Quien ha entrado, y cómo se mantiene al día (M4). Lo que se sabe, y por qué sale
 * todo de `quien_soy`, está explicado en `Sesion.tsx`.
 */
export function ProveedorDeSesion({ children }: { readonly children: ReactNode }) {
  const cache = useQueryClient();
  const { avisarDeUnFallo } = usarDeshacer();
  const [hayToken, setHayToken] = useState(() => leerToken() !== null);

  // El cliente se crea **una vez** y lee el token en cada llamada. Recrearlo al
  // entrar dejaria a medias cualquier consulta que ya tuviera el viejo.
  const olvidarToken = useRef<() => void>(() => undefined);
  const cliente = useMemo(
    () =>
      crearClienteDeLaApp({
        alCaducarLaSesion: () => {
          olvidarToken.current();
        },
      }),
    [],
  );

  olvidarToken.current = useCallback(() => {
    guardarToken(null);
    setHayToken(false);
    // Se tira la cache entera, no solo `quien_soy`: dentro puede haber datos del
    // local de quien acaba de salir, y no tienen por que estar cuando entre otra
    // persona en la misma tablet. **Y lo guardado en el móvil también** (0070).
    cache.clear();
    void olvidarLoGuardado();
  }, [cache]);

  // Lo último que se ha visto, guardado en el móvil para mirarlo sin señal (0070).
  useEffect(() => guardarAlCambiar(cache, leerToken), [cache]);

  const consulta = useQuery({
    queryKey: ['quien_soy'],
    enabled: hayApi && hayToken,
    /*
      ── Un fallo no es «tu sesión ha caducado» ────────────────────────────────

      Antes no se reintentaba nada, y cualquier fallo de `quien_soy` —sin red, el
      servidor que no llega a la base— dejaba `yo` vacío y la app pintaba la
      pantalla de entrar **con la sesión todavía guardada**. Richi recargó dos
      veces en el móvil, vio «Entra en Estook» en mitad de Almacén, y entrar
      tampoco le funcionaba (24-sep; la causa de fondo estaba en la API y se
      arregló allí, en `laPuertaDeLaApi`).

      Ahora: si el servidor dice que el token no vale (`sin_sesion`), no se
      reintenta, porque ya ha contestado y el cliente olvida el token. Cualquier
      otro fallo se reintenta tres veces, esperando cada vez el doble; y si sigue,
      la Puerta dice que no llega al servidor, con un botón para volver a probar.
    */
    retry: (veces, error) => error.message !== 'sin_sesion' && veces < 3,
    retryDelay: (veces) => Math.min(500 * 2 ** veces, 4000),
    queryFn: async (): Promise<QuienSoy> => {
      const respuesta = await cliente.consultar<QuienSoy>('quien_soy');
      if (!respuesta.ok) throw new Error(respuesta.error.codigo);
      return respuesta.datos;
    },
  });

  // **El servidor no contesta porque no hay conexión** (0070): en vez de «no llego
  // al servidor», lo último que se vio, con el aviso de arriba. Una vez por apertura.
  // También **en pausa**: sin red, la consulta ni sale y espera; sin datos, eso no es
  // «no has entrado» (lo cazó una prueba con una wifi sin internet, 1-oct).
  const enPausaSinDatos = consulta.fetchStatus === 'paused' && consulta.data === undefined;
  const sinConexion =
    enPausaSinDatos || (consulta.isError && consulta.error.message === 'sin_conexion');
  const recuperado = useRef(false);
  useEffect(() => {
    if (!sinConexion || recuperado.current) return;
    recuperado.current = true;
    void recuperarLoGuardado(cache, leerToken(), 'sin_conexion');
  }, [sinConexion, cache]);

  // **Una señal colgada** (0070): el móvil cree que tiene red, pero nada contesta, y
  // la petición tarda minutos en fallar. Si en cuatro segundos no ha contestado y
  // `/salud` tampoco, es «sin conexión»: lo último que se vio, con su aviso, como hace
  // el trabajador de servicio con las pantallas. Si la API sí está, se sigue esperando.
  const esperando = consulta.isPending && consulta.fetchStatus === 'fetching';
  useEffect(() => {
    if (!esperando || recuperado.current) return;
    const tope = setTimeout(() => {
      void laApiContesta().then(async (contesta) => {
        if (contesta || recuperado.current) return;
        marcarSinRed();
        recuperado.current = true;
        await recuperarLoGuardado(cache, leerToken(), 'sin_conexion');
      });
    }, SIN_CONTESTAR_MS);
    return () => {
      clearTimeout(tope);
    };
  }, [esperando, cache]);

  const { refetch } = consulta;
  const volverAProbar = useCallback(() => {
    void refetch();
  }, [refetch]);

  const entrar = useCallback(
    async (token: string) => {
      guardarToken(token);
      setHayToken(true);
      await cache.invalidateQueries({ queryKey: ['quien_soy'] });
    },
    [cache],
  );

  /**
   * **Salir con cosas sin mandar** (0070): lo hecho sin señal es de quien sale, y si se
   * va se pierde. Antes de salir se intenta mandar; si sigue sin salir, se pregunta,
   * con el número delante. Y al salir, **este móvil deja de recibir sus avisos**: si
   * entra otra persona en él, no le llegan los del anterior.
   */
  const [sinMandarAlSalir, setSinMandarAlSalir] = useState<number | null>(null);
  const personaId = consulta.data?.personaId ?? null;

  const salirDeVerdad = useCallback(
    async (tirarLoPendiente: boolean) => {
      setSinMandarAlSalir(null);
      if (tirarLoPendiente && personaId !== null) await tirarLoDe(personaId);
      try {
        await dejarDeRecibir(cliente);
      } catch {
        // Si no se puede quitar ahora, se quita al entrar otra persona en este móvil.
      }
      // Se avisa al servidor para que cierre la fila, y **luego** se borra el
      // token pase lo que pase: si el aviso fallara y no se borrara, quien pulsa
      // «salir» se quedaría dentro. La sesión del servidor caduca sola de todas formas.
      try {
        await cliente.ejecutar('salir', {});
      } finally {
        olvidarToken.current();
      }
    },
    [cliente, personaId],
  );

  const salirConCuidado = useCallback(async () => {
    if (personaId !== null) {
      if (hayRed()) await mandarLoPendiente(cliente, personaId);
      const quedan = loPendienteDe(personaId).length;
      if (quedan > 0) {
        setSinMandarAlSalir(quedan);
        return;
      }
    }
    await salirDeVerdad(false);
  }, [cliente, personaId, salirDeVerdad]);

  // Lo de siempre, con cuidado (0070): ver `salirConCuidado`.
  const salir = salirConCuidado;

  const refrescar = useCallback(async () => {
    await cache.invalidateQueries({ queryKey: ['quien_soy'] });
  }, [cache]);

  const cambiarDeSitio = useCallback(
    async (a: { readonly local?: string; readonly organizacion?: string }) => {
      const respuesta = await cliente.ejecutar('cambiar_de_contexto', {
        ...(a.local === undefined ? {} : { local_id: a.local }),
        ...(a.organizacion === undefined ? {} : { organizacion_id: a.organizacion }),
      });
      if (!respuesta.ok) {
        avisarDeUnFallo({
          titulo: 'No has cambiado de sitio',
          texto: `${respuesta.error.quePasa} Sigues donde estabas, así que lo que apuntes va al local de antes.`,
        });
        return false;
      }
      // **Se espera a que vuelva.** Sin el `await`, quien llama navegaría con la
      // sesión todavía en el local viejo, que es medio problema resuelto.
      await cache.refetchQueries({ queryKey: ['quien_soy'] });
      return true;
    },
    [cliente, cache, avisarDeUnFallo],
  );

  /**
   * **Cambiar de sitio vacia la cache.** Es la regla mas importante del fichero.
   *
   * ── Lo que pasaba ────────────────────────────────────────────────────────
   *
   * `cambiar_de_contexto` cambia el local en el servidor y luego se llama a
   * `refrescar`, que invalida `quien_soy` **y nada mas**. Todo lo demas seguia
   * en la cache con los datos del local anterior: los productos, el stock, el
   * libro de movimientos, lo que caduca. Y como la cache aguanta un minuto sin
   * caducar (`staleTime` en `Aplicacion.tsx`), **durante ese minuto la pantalla
   * ensenaba el genero de un local con el nombre de otro arriba**.
   *
   * Eso es exactamente lo que el selector de local existe para evitar: «para que
   * no acabes apuntando una merma en el local equivocado» (Manifiesto 28). El
   * servidor nunca estuvo en peligro —cada consulta filtra por el local de la
   * sesion, y las politicas de M1 no dejan ver otro— pero la pantalla mentia, y
   * una merma se apunta mirando la pantalla.
   *
   * Y hay un segundo consumidor que lo hace peor: **el contexto de Fogon** se
   * arma con `almacen_hoy`, o sea con la cache. En M22 eso es lo que se le
   * manda al modelo. Un resumen del local equivocado no es una pantalla mal
   * pintada: es una respuesta con datos de otro sitio, dicha con seguridad.
   *
   * ── Por que aqui y no en cada `queryKey` ─────────────────────────────────
   *
   * La otra opcion era meter el local en la clave de cada consulta. Funciona, y
   * se rompe el dia que alguien anada la consulta numero cuarenta y se olvide.
   * Es la misma eleccion que hace el despachador con las puertas de sesion: la
   * regla no se cumple porque quien escribe se acuerde, se cumple porque **no
   * hay camino que la rodee**. Aqui es un sitio, y no hay forma de anadir una
   * consulta que se escape.
   *
   * `quien_soy` se queda: es la que acaba de traer la identidad nueva, y tirarla
   * seria pedirla otra vez para saber lo que ya se sabe.
   *
   * ── Y se vacía con `resetQueries`, no con `removeQueries` (25-sep) ─────────
   *
   * Quitar una consulta que ya tiene una pantalla esperándola **la deja colgada**:
   * la pantalla sigue mirando la que se quitó, que no vuelve a pedirse nunca. Y eso
   * pasaba siempre al elegir local al entrar, porque React monta el Panel **antes**
   * de que corra este efecto: quien tiene dos locales elegía uno y se quedaba en
   * «Cargando tu panel» para siempre. Lo encontró una prueba de la entrega O.
   * `resetQueries` tira lo del local de antes igual, y **vuelve a pedir** lo que
   * está a la vista.
   */
  const dondeEstaba = useRef<string | null>(null);
  useEffect(() => {
    const yo = consulta.data;
    if (yo === undefined) return;

    const ahora = `${yo.personaId}·${yo.organizacion?.id ?? ''}·${yo.local?.id ?? ''}`;
    const antes = dondeEstaba.current;
    dondeEstaba.current = ahora;

    // La primera vez no hay nada que tirar, y tirarlo forzaria una segunda
    // vuelta de consultas nada mas entrar.
    if (antes === null || antes === ahora) return;

    void cache.resetQueries({
      predicate: (consultaGuardada) => consultaGuardada.queryKey[0] !== 'quien_soy',
    });
  }, [consulta.data, cache]);

  const valor = useMemo<Sesion>(
    () => ({
      yo: consulta.data ?? null,
      permisos: consulta.data?.permisos ?? {},
      cargando: hayApi && hayToken && consulta.isLoading,
      sinServidor:
        hayApi && hayToken && consulta.data === undefined && (consulta.isError || enPausaSinDatos),
      probandoOtraVez: consulta.isFetching,
      volverAProbar,
      hayApi,
      cliente,
      entrar,
      salir,
      refrescar,
      cambiarDeSitio,
    }),
    [
      consulta.data,
      consulta.isLoading,
      consulta.isError,
      consulta.isFetching,
      enPausaSinDatos,
      volverAProbar,
      hayToken,
      cliente,
      entrar,
      salir,
      refrescar,
      cambiarDeSitio,
    ],
  );

  return (
    <ContextoDeSesion.Provider value={valor}>
      {children}
      <Hoja
        abierta={sinMandarAlSalir !== null}
        alCerrar={() => {
          setSinMandarAlSalir(null);
        }}
        titulo={
          sinMandarAlSalir === 1
            ? 'Tienes una cosa sin mandar'
            : `Tienes ${String(sinMandarAlSalir ?? 0)} cosas sin mandar`
        }
        pie={
          <Botones>
            <Boton
              tono="texto"
              onClick={() => {
                setSinMandarAlSalir(null);
              }}
            >
              Esperar a tener señal
            </Boton>
            <Boton
              tono="peligro"
              onClick={() => {
                void salirDeVerdad(true);
              }}
            >
              Salir y perderlo
            </Boton>
          </Botones>
        }
      >
        <p className="text-cuerpo">
          Lo hiciste sin señal y todavía no ha llegado a Estook. Si sales ahora, se pierde: con
          señal sale solo en unos segundos.
        </p>
      </Hoja>
    </ContextoDeSesion.Provider>
  );
}
