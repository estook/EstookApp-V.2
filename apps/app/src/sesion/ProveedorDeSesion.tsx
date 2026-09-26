import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { usarDeshacer } from '@estook/ui';
import { crearClienteDeLaApp, guardarToken, hayApi, leerToken } from '../datos/cliente.ts';
import { ContextoDeSesion, type QuienSoy, type Sesion } from './Sesion.tsx';

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
    // persona en la misma tablet.
    cache.clear();
  }, [cache]);

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

  const salir = useCallback(async () => {
    // Se avisa al servidor para que cierre la fila, y **luego** se borra el
    // token pase lo que pase. Si el aviso fallara y no se borrara, quien pulsa
    // «salir» se quedaria dentro, que es lo peor que puede hacer un boton de
    // salir. La sesion del servidor caduca sola de todas formas.
    //
    // Este `finally` tapo un fallo durante un tiempo: `salir` no admitia
    // demostraciones y devolvia 403, la pantalla se olvidaba del token igual, y
    // por eso nadie noto que **la sesion seguia viva en el servidor**. Un
    // remiendo que funciona esconde el agujero que hay debajo. Ya no: `salir`
    // borra la visita, y ademas hay un boton propio en la barra de demostracion.
    try {
      await cliente.ejecutar('salir', {});
    } finally {
      olvidarToken.current();
    }
  }, [cliente]);

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
      sinServidor: hayApi && hayToken && consulta.isError && consulta.data === undefined,
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
      volverAProbar,
      hayToken,
      cliente,
      entrar,
      salir,
      refrescar,
      cambiarDeSitio,
    ],
  );

  return <ContextoDeSesion.Provider value={valor}>{children}</ContextoDeSesion.Provider>;
}
