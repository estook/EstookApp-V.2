import { variable } from '@estook/utiles';

/**
 * El motor de los PDF, detrás de un puerto (H1 · decisión 0068).
 *
 * Un PDF bonito lo hace un navegador que «imprime» la página, y en una función de
 * Supabase no cabe ninguno (0002). Así que el servidor escribe la página con
 * `@estook/documentos` y **se la manda a un navegador de fuera**: Cloudflare Browser
 * Run. La capa de aplicación no sabe que detrás está Cloudflare: sabe hacer un PDF
 * de una página. Si un día hay que cambiar de motor (el plan B es el mismo Chromium
 * en Google Cloud Run), se cambia este fichero y ninguna plantilla.
 *
 * ── Sin sus dos secretos, no se rompe nada ─────────────────────────────────
 *
 * `CLOUDFLARE_ACCOUNT_ID` y `CLOUDFLARE_PDF_TOKEN` (`config/claves.md`). Sin ellos el
 * motor es nulo, y pedir un PDF **dice que todavía no están encendidos** en vez de
 * romperse. Igual que Google Places sin su clave.
 *
 * ── Lo que se manda ────────────────────────────────────────────────────────
 *
 * La página entera, con la letra dentro, y nada más: el nombre del local, las
 * cifras o los fichajes de ese documento. **No se guarda nada allí**: Cloudflare la
 * imprime y devuelve el PDF. Por eso está en la lista de encargados de `docs/legal/`.
 */

export interface OpcionesDelPdf {
  /** Apaisado, para las tablas anchas. */
  readonly apaisado: boolean;
  /** El pie de cada página, ya escrito (`pieDelDocumento`). */
  readonly pie: string;
}

export interface MotorDePdf {
  /** Quién lo hace, para los registros: nunca sale a la pantalla. */
  readonly quien: string;
  hacer(html: string, opciones: OpcionesDelPdf): Promise<Uint8Array>;
}

/**
 * El motor no ha contestado bien. Lo traduce a una frase la capa de aplicación.
 * `ocupado` es el «espera un poco» del plan gratuito, que deja uno cada diez segundos.
 */
export class MotorNoContesta extends Error {
  // Sin propiedad en el constructor: la API de pruebas corre con Node quitando tipos.
  readonly estado: number;
  readonly ocupado: boolean;

  constructor(estado: number) {
    super(`El motor de los PDF ha contestado ${estado}`);
    this.name = 'MotorNoContesta';
    this.estado = estado;
    this.ocupado = estado === 429;
  }
}

/** Lo que tarda como mucho: más, y quien lo pidió ya se ha ido. */
const ESPERA_MAXIMA_MS = 30_000;

/**
 * Cloudflare Browser Run, por su API REST
 * ([documentación](https://developers.cloudflare.com/browser-rendering/rest-api/pdf-endpoint/),
 * mirada el 30-sep-2026): `POST …/accounts/<cuenta>/browser-run/pdf` con la página en
 * `html` y las opciones de impresión en `pdfOptions`, y contesta el PDF tal cual.
 */
export function pdfDeCloudflare(
  cuenta: string | undefined = variable('CLOUDFLARE_ACCOUNT_ID'),
  clave: string | undefined = variable('CLOUDFLARE_PDF_TOKEN'),
): MotorDePdf | null {
  if (cuenta === undefined || cuenta.trim() === '' || clave === undefined || clave.trim() === '') {
    return null;
  }
  const direccion = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(cuenta.trim())}/browser-run/pdf`;

  return {
    quien: 'cloudflare',
    async hacer(html, opciones) {
      const respuesta = await fetch(direccion, {
        method: 'POST',
        headers: { Authorization: `Bearer ${clave.trim()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          html,
          pdfOptions: {
            format: 'a4',
            landscape: opciones.apaisado,
            printBackground: true,
            preferCSSPageSize: true,
            displayHeaderFooter: true,
            headerTemplate: '<span></span>',
            footerTemplate: opciones.pie,
            timeout: ESPERA_MAXIMA_MS,
          },
        }),
        signal: AbortSignal.timeout(ESPERA_MAXIMA_MS + 5_000),
      });
      if (!respuesta.ok) throw new MotorNoContesta(respuesta.status);
      const bytes = new Uint8Array(await respuesta.arrayBuffer());
      // Un 200 que no es un PDF es un fallo, no un documento.
      if (!esUnPdf(bytes)) throw new MotorNoContesta(502);
      return bytes;
    },
  };
}

/** Si unos bytes empiezan como un PDF: `%PDF-`. */
export function esUnPdf(bytes: Uint8Array): boolean {
  return (
    bytes.length > 5 &&
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46 &&
    bytes[4] === 0x2d
  );
}

/**
 * Uno de mentira, para las pruebas: no llama a nadie y devuelve un PDF mínimo, y
 * guarda las páginas que le han mandado para que una prueba mire qué decían. Para
 * ver de verdad cómo queda un documento: `pnpm documentos:muestra`.
 */
export function pdfDeMentira(): MotorDePdf & {
  readonly hechos: { html: string; opciones: OpcionesDelPdf }[];
  ocupar(veces: number): void;
} {
  const hechos: { html: string; opciones: OpcionesDelPdf }[] = [];
  let ocupado = 0;
  return {
    quien: 'de_mentira',
    hechos,
    ocupar(veces) {
      ocupado = veces;
    },
    async hacer(html, opciones) {
      if (ocupado > 0) {
        ocupado -= 1;
        throw new MotorNoContesta(429);
      }
      hechos.push({ html, opciones });
      return Promise.resolve(
        new TextEncoder().encode(
          '%PDF-1.4\n% Un PDF de mentira de las pruebas de Estook\n1 0 obj << /Type /Catalog >> endobj\ntrailer << /Root 1 0 R >>\n%%EOF\n',
        ),
      );
    },
  };
}
