/**
 * La politica de seguridad de contenido, en un solo sitio.
 *
 * ── Por que existe ───────────────────────────────────────────────────────────
 *
 * El token de sesion vive en `localStorage` a proposito, y esta razonado en
 * `apps/app/src/datos/cliente.ts`: la aplicacion y la API estan en dominios
 * distintos, y una cookie entre dominios lleva anos bloqueada por los
 * navegadores. Lo que se paga a cambio es que **quien consiga ejecutar
 * JavaScript dentro de la pagina puede leerlo**.
 *
 * Contra eso habia un solo argumento —«no hay ningun innerHTML con datos de
 * nadie»— que es verdad hoy y es una promesa sobre el codigo que se escriba
 * manana. Esto es lo mismo dicho como una regla que cumple el navegador:
 *
 *   · `script-src 'self'` · no se ejecuta ningun script que no venga de aqui, ni
 *     inyectado en la pagina ni traido de otro sitio. Vite no mete scripts en
 *     linea en el HTML, asi que no hace falta abrirle la mano.
 *   · `object-src 'none'` y `base-uri 'self'` · las dos formas clasicas de
 *     colarse cuando lo de arriba esta cerrado.
 *   · `form-action 'self'` · un formulario inyectado no puede mandar a nadie lo
 *     que se escriba en el.
 *   · `img-src` deja `https:` porque los logos de los locales son enlaces
 *     firmados del almacen, y su direccion cambia con el despliegue.
 *   · `style-src` lleva `'unsafe-inline'` porque React pinta estilos en el
 *     atributo `style`. No es lo mismo que un script: no ejecuta nada.
 *
 * ── Y por que se calcula al construir y no se escribe en el HTML ─────────────
 *
 * Por `connect-src`. La API vive en otro dominio y **cual es se decide al
 * construir** (`VITE_API_URL` se hornea, igual que la direccion base). Escrita a
 * mano en los cuatro `index.html` habria cuatro sitios donde equivocarse y una
 * politica que en desarrollo bloquea la API de pruebas —que va por `http` y por
 * otro puerto— y deja la aplicacion diciendo «no hay conexion» sin que nada
 * explique por que. Aqui se saca el origen de la propia variable.
 *
 * `frame-ancestors` no se pone: en una etiqueta `meta` el navegador la ignora,
 * solo vale como cabecera, y GitHub Pages no deja poner cabeceras. Queda
 * apuntado para cuando esto se sirva desde un sitio que si deje.
 */

/**
 * Los tipos van escritos aqui y **no se importan de `vite`**.
 *
 * Este fichero vive en `herramientas/`, que no tiene `vite` entre sus
 * dependencias —lo tienen las cuatro aplicaciones, cada una la suya— y con pnpm
 * eso quiere decir que desde aqui no se resuelve. Escribir la forma que Vite
 * espera es media docena de lineas y evita meter una dependencia entera en la
 * raiz para un tipo.
 */
interface EtiquetaDeHtml {
  tag: string;
  attrs: Record<string, string>;
  injectTo: 'head-prepend';
}

/** Lo justo del complemento de Vite que este fichero usa. */
export interface ComplementoDeVite {
  name: string;
  transformIndexHtml: () => EtiquetaDeHtml[];
}

export interface OpcionesDeLaPolitica {
  /** `VITE_API_URL`, tal cual. Vacia si no hay. */
  readonly direccionDeLaApi: string;
  readonly enDesarrollo: boolean;
}

/** El origen de una direccion, o nulo si no se puede leer. */
export function origenDe(direccion: string | undefined): string | null {
  if (!direccion) return null;
  try {
    return new URL(direccion).origin;
  } catch {
    return null;
  }
}

export function politicaDeSeguridad({
  direccionDeLaApi,
  enDesarrollo,
}: OpcionesDeLaPolitica): string {
  const origen = origenDe(direccionDeLaApi);

  const conecta: string[] = ["'self'", 'https:'];
  // Solo si no es `https:`, que ya esta puesto. En desarrollo la API de pruebas
  // va por `http://localhost:5177`.
  if (origen !== null && !origen.startsWith('https:')) conecta.push(origen);
  // Y el canal de recarga en caliente de Vite, que es un websocket.
  if (enDesarrollo) conecta.push('ws://localhost:*', 'http://localhost:*');

  return [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    // `blob:` no es un adorno: al elegir un logo, la aplicacion lo carga con
    // `URL.createObjectURL` para medirlo y reducirlo antes de subirlo
    // (apps/app/src/alta/reducirImagen.ts). Sin `blob:` la imagen no carga, el
    // paso de la marca se queda sin boton de quitar y **no lo dice ningun error**:
    // el navegador lo bloquea en silencio. Lo cazo la prueba del alta.
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    `connect-src ${conecta.join(' ')}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');
}

/** El complemento de Vite que la mete en el HTML de las cuatro aplicaciones. */
export function laPoliticaDeSeguridad({
  direccionDeLaApi,
  enDesarrollo,
}: OpcionesDeLaPolitica): ComplementoDeVite {
  return {
    name: 'estook-politica-de-seguridad',
    transformIndexHtml() {
      return [
        {
          tag: 'meta',
          attrs: {
            'http-equiv': 'Content-Security-Policy',
            content: politicaDeSeguridad({ direccionDeLaApi, enDesarrollo }),
          },
          injectTo: 'head-prepend',
        },
      ];
    },
  };
}
