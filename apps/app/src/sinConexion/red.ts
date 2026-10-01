/**
 * Si hay señal (I · decisión 0070).
 *
 * `navigator.onLine` dice si el móvil **cree** que tiene red, y miente a menudo: con
 * una wifi sin internet o una cobertura de una raya dice que sí. Así que también
 * cuenta **lo que pasa de verdad**: si una llamada a la API no sale, sin red; si
 * sale, con red. Es lo que se enseña arriba («Sin conexión») y lo que decide si se
 * intenta mandar lo pendiente.
 */

type Oyente = () => void;

const oyentes = new Set<Oyente>();
let conRed = typeof navigator === 'undefined' ? true : navigator.onLine;

function avisar(): void {
  for (const oyente of oyentes) oyente();
}

function poner(valor: boolean): void {
  if (conRed === valor) return;
  conRed = valor;
  avisar();
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    poner(true);
  });
  window.addEventListener('offline', () => {
    poner(false);
  });
}

export function hayRed(): boolean {
  return conRed;
}

/** Una llamada a la API no ha llegado a salir. */
export function marcarSinRed(): void {
  poner(false);
}

/** Una llamada a la API ha contestado: hay red, diga lo que diga el navegador. */
export function marcarConRed(): void {
  poner(true);
}

export function alCambiarLaRed(oyente: Oyente): () => void {
  oyentes.add(oyente);
  return () => {
    oyentes.delete(oyente);
  };
}

/** Cada cuánto se mira si ha vuelto la señal, mientras no la hay. */
const MIRAR_LA_VUELTA_MS = 15_000;
let vigilando: ReturnType<typeof setInterval> | null = null;
/** A dónde se pregunta si hay red: `/salud` de la API. Nulo hasta que se sabe. */
let laSalud: string | null = null;

/**
 * `/salud` con un número distinto cada vez, para que nada guarde la respuesta.
 *
 * **No con `cache: 'no-store'`**: Safari puede añadir con eso, por su cuenta,
 * `Cache-Control` y `Pragma`, y a otro sitio una petición con cabeceras de más pregunta
 * antes por CORS, que la API no las admite. Así es una petición simple, sin sorpresas;
 * y `/salud` contesta que no se guarde (0070).
 */
function sinGuardar(salud: string): string {
  return `${salud}?r=${String(Date.now())}`;
}

/** Lo que se espera a que `/salud` conteste antes de darlo por «sin conexión». */
const CONTESTA_EN_MS = 3_000;

/**
 * **¿Contesta la API?** Se pregunta a `/salud`, **con un tope**: con una raya de
 * cobertura o una wifi sin internet, una petición se queda colgada minutos sin fallar,
 * y esperar a que falle era dejar a alguien mirando «Cargando» en la cámara.
 */
export async function laApiContesta(): Promise<boolean> {
  if (laSalud === null) return false;
  const corte = new AbortController();
  const tope = setTimeout(() => {
    corte.abort();
  }, CONTESTA_EN_MS);
  try {
    const respuesta = await fetch(sinGuardar(laSalud), { signal: corte.signal });
    return respuesta.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(tope);
  }
}

/**
 * **¿De verdad no hay red?** Una petición que no sale no basta para decirlo: puede ser
 * una que se cortó, o un tropiezo de un segundo, y declarar la app «sin conexión» por
 * eso la dejaba sin preguntar nada durante quince segundos (lo cazó la batería de
 * pantalla, 1-oct). Así que se pregunta a la API si está en pie, al momento: si
 * contesta, hay red.
 */
function comprobarLaRed(): void {
  // **Una sola pregunta a la vez, y un instante después.** Al cambiar de página, el
  // navegador corta lo que estaba pidiendo; sin esperar, cada corte lanzaba su pregunta
  // a `/salud`, que también se cortaba, y Safari lo apuntaba como un error (lo cazó la
  // integración continua en WebKit, 1-oct). Si la página se va, esto ya no sale.
  if (comprobando || saliendo) return;
  comprobando = true;
  setTimeout(() => {
    if (saliendo) {
      comprobando = false;
      return;
    }
    void laApiContesta().then((contesta) => {
      comprobando = false;
      if (contesta) marcarConRed();
      else marcarSinRed();
    });
  }, ANTES_DE_COMPROBAR_MS);
}

/** Lo que se espera antes de preguntar si hay red, tras una petición que no salió. */
const ANTES_DE_COMPROBAR_MS = 300;
let comprobando = false;
/** La página se está cerrando o cambiando: lo que falle ahora no dice nada de la red. */
let saliendo = false;
if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', () => {
    saliendo = true;
  });
  window.addEventListener('pageshow', () => {
    saliendo = false;
  });
}

/**
 * **Mirar si ha vuelto la señal**, sin esperar a que el navegador lo diga: sin red, la
 * app deja de preguntar (lo guardado se ve igual), y entonces nadie se daría cuenta
 * de que ha vuelto. Pregunta a la API si está en pie cada quince segundos, solo
 * mientras no hay señal, y con la primera respuesta todo vuelve a ir solo.
 */
export function vigilarLaVuelta(direccionDeLaApi: string): void {
  if (vigilando !== null || direccionDeLaApi === '' || typeof window === 'undefined') return;
  const salud = `${direccionDeLaApi.replace(/\/+$/, '')}/salud`;
  laSalud = salud;
  const mirar = () => {
    if (conRed) return;
    void fetch(sinGuardar(salud)).then(
      (respuesta) => {
        if (respuesta.ok) marcarConRed();
      },
      () => undefined,
    );
  };
  vigilando = setInterval(mirar, MIRAR_LA_VUELTA_MS);
  window.addEventListener('online', mirar);
}

/**
 * El `fetch` que usa el cliente de la app: el de siempre, apuntando si sale o no. Una
 * respuesta de error de la API **sí es red**: el servidor ha contestado.
 */
export const pedirMirandoLaRed: typeof fetch = async (...argumentos) => {
  try {
    const respuesta = await fetch(...argumentos);
    marcarConRed();
    return respuesta;
  } catch (fallo) {
    // Cancelada por la propia app (se cerró la pantalla que la pidió): no dice nada de la red.
    if (fallo instanceof DOMException && fallo.name === 'AbortError') throw fallo;
    // Sin señal del todo, el navegador ya lo sabe; si no, se comprueba antes de decirlo.
    if (typeof navigator !== 'undefined' && !navigator.onLine) marcarSinRed();
    else comprobarLaRed();
    throw fallo;
  }
};
