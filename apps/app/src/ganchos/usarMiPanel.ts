import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  PANEL_DE_FABRICA,
  loQueSePuedePintar,
  usarDeshacer,
  usarEsEscritorio,
  widgetPorId,
  type TamanoDeWidget,
  type WidgetPuesto,
} from '@estook/ui';
import type { Permiso } from '@estook/permisos';
import { puedeVer } from '@estook/permisos';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { usarSesion } from '../sesion/Sesion.tsx';

/**
 * El Panel de esta persona en este aparato: cargarlo, tocarlo y guardarlo.
 *
 * ── Los dos agujeros por los que se perdía todo, y cómo se tapan ─────────────
 *
 * La primera versión guardaba lo que se estaba tocando en un `useState` propio y
 * lo sincronizaba con el servidor en un efecto. **Perdía la personalización de
 * dos maneras distintas**, y las dos se notaban en cuanto alguien usaba el Panel
 * de verdad:
 *
 *   1. **Al navegar y volver.** El guardado espera 800 ms desde el último gesto
 *      —arrastrar un widget son veinte reordenaciones, y no se mandan veinte
 *      comandos—. Si dentro de esos 800 ms se salía del Panel, el componente se
 *      desmontaba, **se cancelaba el reloj y lo pendiente se tiraba**. Colocabas
 *      un widget, entrabas en Inventario, volvías, y estaba donde estaba antes.
 *   2. **Al recargar.** Al guardar no se tocaba la caché de TanStack Query, así
 *      que seguía teniendo lo viejo **y la versión vieja**. Volver al Panel leía
 *      esa caché y pisaba lo tuyo; y el siguiente guardado mandaba una versión
 *      que ya no era la de la fila, así que el servidor contestaba «lo cambió
 *      otra persona» —contra ti mismo— y dejaba de guardar del todo.
 *
 * Ahora:
 *
 *   · **Los gestos sueltos se guardan al momento.** Quitar un widget, añadir uno o
 *     cambiarle el tamaño no esperan a nada. El retraso se queda **solo para el
 *     arrastre**, que es lo único que produce veinte cambios por segundo, y en
 *     cuanto se suelta el dedo se manda.
 *   · **La caché es el único dueño de lo que se pinta.** No hay un segundo estado
 *     con la misma información al lado (regla 6). Cada cambio se escribe en la
 *     caché al momento, así que navegar y volver encuentra lo tuyo aunque el
 *     servidor todavía no se haya enterado.
 *   · **Al guardar se escribe la versión nueva en la caché**, que es lo que hace
 *     que el segundo guardado funcione. Y **solo hay un guardado en vuelo**: el
 *     siguiente espera a que vuelva el anterior con su versión.
 *   · **Al desmontar y al cerrar la pestaña se manda lo pendiente**, en vez de
 *     tirarlo.
 *   · Y la consulta **no caduca sola** (`staleTime: Infinity`): estos datos solo
 *     cambian cuando los cambias tú, y un refresco automático en mitad de un
 *     guardado devolvería los widgets a donde estaban.
 */
export interface MiPanel {
  readonly puestos: readonly WidgetPuesto[];
  readonly cargando: boolean;
  readonly guardando: boolean;
  /** Si el servidor dice que otro aparato lo cambió mientras tanto. */
  readonly loCambioOtroAparato: boolean;
  /**
   * Lo que dijo el servidor la última vez que no se pudo guardar.
   *
   * ── Por qué esto existe, y por qué es la mitad del arreglo ─────────────────
   *
   * Porque **un guardado que falla no se notaba hasta el día siguiente**. La
   * pantalla escribe el cambio en la caché al momento —para que se vea al
   * instante, que es lo correcto—, así que si el comando volvía con un no, el
   * Panel seguía viéndose perfecto: colocado, ordenado, con «guardando…»
   * apagado. Y al recargar volvía el de antes, sin una sola pista de por qué.
   *
   * Eso es lo que hace que un fallo así se pueda arrastrar meses: por fuera se
   * ve exactamente igual que si funcionara. Ahora, si no se ha podido guardar,
   * se dice **en el sitio y en el momento**, con la frase del servidor y un
   * botón para reintentar.
   */
  readonly noSeHaGuardado: ErrorDeLaApi | null;
  /** Vuelve a mandar lo que no se pudo guardar. */
  readonly reintentar: () => void;
  readonly reordenar: (puestos: readonly WidgetPuesto[]) => void;
  readonly anadir: (id: string) => void;
  readonly quitar: (id: string) => void;
  readonly cambiarTamano: (id: string, tamano: TamanoDeWidget) => void;
  /** Vuelve al Panel de fábrica del rol. */
  readonly volverAlDeFabrica: () => void;
  /**
   * Guarda ya lo que estuviera esperando.
   *
   * Se llama al salir del modo de edición —que es lo que «Listo» quiere decir— y
   * al desmontar la pantalla.
   */
  readonly guardarYa: () => void;
  readonly recargar: () => void;
}

const ESPERA_ANTES_DE_GUARDAR = 800;

/** Lo que la caché guarda de esta consulta: los widgets y su versión. */
interface ElPanelGuardado {
  readonly widgets: readonly WidgetPuesto[] | null;
  readonly version: number;
}

export function usarMiPanel(): MiPanel {
  const { cliente, permisos } = usarSesion();
  const { sePuedeDeshacer } = usarDeshacer();
  const cache = useQueryClient();
  const esEscritorio = usarEsEscritorio();
  const aparato = esEscritorio ? 'escritorio' : 'movil';
  const clave = useMemo(() => ['mi_panel', aparato] as const, [aparato]);

  const tienePermiso = useCallback((permiso: Permiso) => puedeVer(permisos, permiso), [permisos]);

  const consulta = useQuery({
    queryKey: clave,
    // No caduca sola. Lo que hay aquí solo cambia cuando lo cambia esta persona,
    // y un refresco en mitad de un guardado devolvería los widgets a su sitio de
    // antes delante de sus narices.
    staleTime: Infinity,
    queryFn: async (): Promise<ElPanelGuardado> => {
      const respuesta = await cliente.consultar<{
        widgets: readonly { id: string; tamano: string }[] | null;
        version: number;
      }>('mi_panel', { aparato });
      if (!respuesta.ok) throw new Error(respuesta.error.codigo);
      return {
        widgets:
          respuesta.datos.widgets === null
            ? null
            : respuesta.datos.widgets.map((p) => ({
                id: p.id,
                tamano: p.tamano as TamanoDeWidget,
              })),
        version: respuesta.datos.version,
      };
    },
  });

  /**
   * Si queda algo por guardar · **de todo el camino, no solo del viaje**.
   *
   * Se enciende en cuanto se toca algo y se apaga cuando la cola esta vacia, no
   * cuando vuelve una peticion. Es lo honesto —«guardando…» tiene que durar hasta
   * que este guardado de verdad, no hasta que salga el primero de dos— y ademas es
   * lo unico que deja comprobarlo desde fuera: sin esto, una prueba que recarga
   * justo despues corta el segundo guardado por la mitad, que es lo que le pasaria
   * a una persona rapida.
   */
  const [guardando, setGuardando] = useState(false);
  const [loCambioOtroAparato, setLoCambioOtroAparato] = useState(false);
  const [noSeHaGuardado, setNoSeHaGuardado] = useState<ErrorDeLaApi | null>(null);
  const reloj = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Lo último que hay que guardar, para poder mandarlo antes de tiempo. */
  const pendiente = useRef<readonly WidgetPuesto[] | null>(null);
  /**
   * Si ya hay un guardado en vuelo.
   *
   * Sin esto, dos gestos seguidos —quitar dos widgets, que es lo normal— mandan
   * dos comandos **con la misma versión**, porque el segundo sale antes de que
   * vuelva el primero con la nueva. El segundo se lleva un «lo cambió otra
   * persona» contra sí mismo y no se guarda. Con esto, el segundo espera y sale
   * en cuanto vuelve el primero.
   */
  const enVuelo = useRef(false);

  /**
   * Lo que se pinta, **derivado de la caché**.
   *
   * Nulo en `widgets` quiere decir «nunca lo ha tocado», que es distinto de «lo ha
   * vaciado a propósito»: lo primero se rellena con el de fábrica, lo segundo se
   * respeta vacío.
   */
  const puestos = useMemo(() => {
    const datos = consulta.data;
    if (datos === undefined) return null;
    return loQueSePuedePintar(datos.widgets ?? PANEL_DE_FABRICA, tienePermiso);
  }, [consulta.data, tienePermiso]);

  const mandar = useCallback(async () => {
    if (enVuelo.current) return;
    const nuevos = pendiente.current;
    if (nuevos === null) return;
    enVuelo.current = true;

    // La versión sale de la caché, que es donde vive la de verdad: la del último
    // guardado que salió bien.
    const antes = cache.getQueryData<ElPanelGuardado>(clave);

    let respuesta;
    try {
      respuesta = await cliente.ejecutar<{ version: number }>('guardar_mi_panel', {
        aparato,
        widgets: nuevos.map((p) => ({ id: p.id, tamano: p.tamano })),
        version: antes?.version ?? 0,
      });
    } finally {
      // **`finally`, y no la línea de después.** Si la petición revienta —el
      // móvil pierde la red a mitad, que en un bar pasa— el `await` lanza y
      // `enVuelo` se quedaba en `true` **para siempre**: a partir de ahí ningún
      // guardado volvía a salir, en toda la sesión, sin un solo aviso. Es la
      // clase de fallo que solo se ve al día siguiente.
      enVuelo.current = false;
    }

    // **Se marca como mandado solo si nadie ha tocado nada mientras tanto.** Si
    // `pendiente` ya no es lo que se mandó, es que ha entrado otro cambio y ese
    // sigue esperando: ponerlo a nulo aquí sería tirarlo.
    if (respuesta.ok && pendiente.current === nuevos) pendiente.current = null;
    if (pendiente.current === null) setGuardando(false);

    if (respuesta.ok) {
      // **Solo la versión.** Los widgets se dejan como estén en la caché, que es
      // lo último que ha tocado la persona: entre que este guardado salió y
      // volvió puede haber movido otro widget, y escribir aquí lo que se mandó
      // haría que ese último gesto se viera saltar hacia atrás y volver.
      cache.setQueryData<ElPanelGuardado>(clave, (antes) => ({
        widgets: antes?.widgets ?? nuevos,
        version: respuesta.datos.version,
      }));
      setLoCambioOtroAparato(false);
      setNoSeHaGuardado(null);

      // Y lo que haya llegado mientras este iba y venía sale ahora. **Después de
      // escribir la versión**, no antes: si saliera antes se llevaría la versión
      // vieja y se estrellaría contra sí mismo, que es justo lo que esta cola
      // viene a evitar.
      if (pendiente.current !== null) void mandarAhora.current();
      return;
    }

    // ── Y si no se ha podido guardar, se dice ─────────────────────────────────
    //
    // Antes se callaba, y esa era la mitad que faltaba: la pantalla ya había
    // pintado el cambio, así que un no del servidor se veía **exactamente igual
    // que un sí** hasta que alguien recargaba. Ahora lo pendiente se queda
    // pendiente —no se tira— y arriba sale la frase del servidor con su botón.
    setGuardando(false);

    // «Lo cambió otra persona» aquí quiere decir «lo cambiaste tú en el otro
    // aparato». Tiene su propio aviso, que ofrece traerse el de allí, así que no
    // se cuenta dos veces.
    if (respuesta.error.codigo === 'lo_cambio_otra_persona') {
      setLoCambioOtroAparato(true);
      return;
    }
    setNoSeHaGuardado(respuesta.error);
  }, [cliente, aparato, cache, clave]);

  /**
   * `mandar` en una referencia, para poder llamarlo al desmontar.
   *
   * El efecto de limpieza no puede depender de `mandar` —se volvería a montar y a
   * desmontar en cada cambio, mandando de más—, así que se guarda la última
   * versión aquí y el efecto de limpieza no depende de nada.
   */
  const mandarAhora = useRef(mandar);
  mandarAhora.current = mandar;

  const guardar = useCallback((nuevos: readonly WidgetPuesto[]) => {
    pendiente.current = nuevos;
    if (reloj.current !== null) clearTimeout(reloj.current);
    reloj.current = setTimeout(() => {
      void mandarAhora.current();
    }, ESPERA_ANTES_DE_GUARDAR);
  }, []);

  const guardarYa = useCallback(() => {
    if (reloj.current !== null) clearTimeout(reloj.current);
    reloj.current = null;
    void mandarAhora.current();
  }, []);

  /**
   * Al irse de la pantalla, **se manda lo que estuviera esperando**.
   *
   * Antes se cancelaba el reloj y ya, así que colocar un widget y salir del Panel
   * antes de que pasaran los ochocientos milisegundos perdía el cambio. Y salir
   * del Panel justo después de colocar algo es lo normal: se coloca y se va uno a
   * mirar lo que ha colocado.
   */
  useEffect(
    () => () => {
      if (reloj.current !== null) clearTimeout(reloj.current);
      void mandarAhora.current();
    },
    [],
  );

  /**
   * Y al cerrar la pestaña o irse de la aplicación, lo mismo.
   *
   * `pagehide` es el que avisa de verdad —`beforeunload` no llega en móvil, y en
   * iOS la pestaña se congela sin desmontar nada—. Solo queda algo pendiente
   * mientras se arrastra, que es lo único que va con retraso; aun así, cerrar
   * justo ahí no debería perder el último gesto.
   */
  useEffect(() => {
    const alIrse = () => {
      if (pendiente.current === null) return;
      if (reloj.current !== null) clearTimeout(reloj.current);
      void mandarAhora.current();
    };
    window.addEventListener('pagehide', alIrse);
    document.addEventListener('visibilitychange', alIrse);
    return () => {
      window.removeEventListener('pagehide', alIrse);
      document.removeEventListener('visibilitychange', alIrse);
    };
  }, []);

  /**
   * Escribe en la caché al momento y guarda.
   *
   * ── Con retraso solo mientras se arrastra ──────────────────────────────────
   *
   * Arrastrar un widget de una esquina a otra son **veinte reordenaciones**,
   * porque el orden cambia cada vez que el dedo pasa por encima de otro: esas van
   * con retraso, o serían veinte comandos para acabar en el mismo sitio.
   *
   * **Todo lo demás se guarda ya.** Quitar un widget, añadir uno o cambiarle el
   * tamaño son gestos sueltos, y esperar ochocientos milisegundos a guardarlos era
   * abrir una ventana en la que recargar o cerrar la aplicación perdía el cambio.
   * Que es exactamente lo que pasaba: «todo lo que personalices, si refrescas, se
   * quita».
   */
  const cambiar = useCallback(
    (nuevos: readonly WidgetPuesto[], conRetraso = false) => {
      cache.setQueryData<ElPanelGuardado>(clave, (antes) => ({
        widgets: nuevos,
        version: antes?.version ?? 0,
      }));
      pendiente.current = nuevos;
      setGuardando(true);
      if (conRetraso) {
        guardar(nuevos);
        return;
      }
      if (reloj.current !== null) clearTimeout(reloj.current);
      reloj.current = null;
      void mandarAhora.current();
    },
    [cache, clave, guardar],
  );

  /** El arrastre, que es el único que va con retraso. */
  const reordenar = useCallback(
    (nuevos: readonly WidgetPuesto[]) => {
      cambiar(nuevos, true);
    },
    [cambiar],
  );

  const anadir = useCallback(
    (id: string) => {
      const widget = widgetPorId(id);
      if (widget === undefined) return;
      const tamano = widget.tamanos[0] ?? 'ancho';
      cambiar([...(puestos ?? []), { id, tamano }]);
    },
    [puestos, cambiar],
  );

  /**
   * Quitar un widget · **con deshacer**, porque destruye trabajo.
   *
   * «Deshacer siempre, diez segundos, en todo lo que no tenga consecuencia legal»
   * (B4). Quitar un widget no rompe ningún dato, pero se hace sin querer —la ✕
   * está a un centímetro del asa de arrastrar— y lo que se pierde es dónde lo
   * tenías puesto, que es justo lo que acabas de colocar a mano.
   */
  const quitar = useCallback(
    (id: string) => {
      const antes = puestos ?? [];
      const nombre = widgetPorId(id)?.nombre ?? 'Ese widget';
      cambiar(antes.filter((p) => p.id !== id));
      sePuedeDeshacer({
        que: `${nombre} fuera del panel`,
        deshacer: () => {
          cambiar(antes);
        },
      });
    },
    [puestos, cambiar, sePuedeDeshacer],
  );

  const cambiarTamano = useCallback(
    (id: string, tamano: TamanoDeWidget) => {
      cambiar((puestos ?? []).map((p) => (p.id === id ? { id: p.id, tamano } : p)));
    },
    [puestos, cambiar],
  );

  /**
   * Volver al de fábrica · también con deshacer, y con más razón.
   *
   * Esto se lleva por delante **el Panel entero** que alguien haya montado. Un
   * botón que borra media hora de colocar tarjetas y no se puede deshacer no
   * debería existir.
   */
  const volverAlDeFabrica = useCallback(() => {
    const antes = puestos ?? [];
    cambiar(loQueSePuedePintar(PANEL_DE_FABRICA, tienePermiso));
    sePuedeDeshacer({
      que: 'Panel de siempre puesto',
      deshacer: () => {
        cambiar(antes);
      },
    });
  }, [puestos, cambiar, tienePermiso, sePuedeDeshacer]);

  const recargar = useCallback(() => {
    setLoCambioOtroAparato(false);
    setNoSeHaGuardado(null);
    pendiente.current = null;
    void consulta.refetch();
  }, [consulta]);

  /**
   * Reintentar lo que no se pudo guardar.
   *
   * Lo pendiente sigue en su sitio —no se tira al fallar—, así que esto es
   * literalmente volver a mandarlo. Si el fallo era la red de un bar, con esto
   * se acabó; si no, vuelve a salir el aviso, que también es una respuesta.
   */
  const reintentar = useCallback(() => {
    setNoSeHaGuardado(null);
    if (pendiente.current === null) return;
    setGuardando(true);
    void mandarAhora.current();
  }, []);

  return {
    puestos: puestos ?? [],
    cargando: consulta.isPending,
    guardando,
    loCambioOtroAparato,
    noSeHaGuardado,
    reintentar,
    reordenar,
    anadir,
    quitar,
    cambiarTamano,
    volverAlDeFabrica,
    guardarYa,
    recargar,
  };
}
