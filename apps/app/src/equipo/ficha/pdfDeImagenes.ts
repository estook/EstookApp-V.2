/**
 * Un PDF hecho con páginas en imagen (la Ampliación 3 · 2, decisión 0153).
 *
 * **Por qué existe.** La gestoría manda un PDF con las nóminas de todos, y cada persona solo
 * puede ver la suya: el PDF entero no se puede guardar en la ficha de nadie. Así que cada
 * página se pinta en el móvil (PDF.js, el que ya lee la carta) y se mete sola en un PDF suyo.
 * Lo mismo con las fotos de una nómina en papel.
 *
 * **Sin librerías**: un PDF con una imagen JPEG por página son cinco objetos por página y una
 * tabla de dónde empieza cada uno. El JPEG va tal cual (`/DCTDecode`), sin volver a comprimir.
 * Cada página, en A4 vertical, con la imagen centrada y entera.
 */

export interface PaginaEnImagen {
  /** El JPEG, en bytes (de un lienzo: RGB y sin progresivo). */
  readonly jpeg: Uint8Array;
  readonly ancho: number;
  readonly alto: number;
}

/** A4 en puntos de PDF. */
const A4 = { ancho: 595.28, alto: 841.89 } as const;

const codificador = new TextEncoder();

function numero(n: number): string {
  // PDF lee números con punto y sin notación científica; dos decimales sobran.
  return n.toFixed(2).replace(/\.?0+$/, '');
}

export function pdfDeImagenes(paginas: readonly PaginaEnImagen[]): Uint8Array {
  if (paginas.length === 0) throw new Error('Un PDF necesita al menos una página.');
  const trozos: Uint8Array[] = [];
  const desplazamientos: number[] = [];
  let largo = 0;
  const escribir = (trozo: Uint8Array | string) => {
    const bytes = typeof trozo === 'string' ? codificador.encode(trozo) : trozo;
    trozos.push(bytes);
    largo += bytes.byteLength;
  };
  const objeto = (numeroDeObjeto: number, cabecera: string, flujo?: Uint8Array) => {
    desplazamientos[numeroDeObjeto] = largo;
    if (flujo === undefined) {
      escribir(`${String(numeroDeObjeto)} 0 obj\n${cabecera}\nendobj\n`);
      return;
    }
    escribir(`${String(numeroDeObjeto)} 0 obj\n${cabecera}\nstream\n`);
    escribir(flujo);
    escribir('\nendstream\nendobj\n');
  };

  // 1 el catálogo, 2 las páginas; y por cada página, su página, su imagen y su dibujo.
  const paginaDe = (i: number) => 3 + i * 3;
  escribir('%PDF-1.4\n%âãÏÓ\n');
  objeto(1, '<< /Type /Catalog /Pages 2 0 R >>');
  objeto(
    2,
    `<< /Type /Pages /Kids [${paginas.map((_, i) => `${String(paginaDe(i))} 0 R`).join(' ')}] /Count ${String(paginas.length)} >>`,
  );
  paginas.forEach((p, i) => {
    const pagina = paginaDe(i);
    const imagen = pagina + 1;
    const dibujo = pagina + 2;
    const escala = Math.min(A4.ancho / p.ancho, A4.alto / p.alto);
    const w = p.ancho * escala;
    const h = p.alto * escala;
    const x = (A4.ancho - w) / 2;
    const y = (A4.alto - h) / 2;
    objeto(
      pagina,
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${numero(A4.ancho)} ${numero(A4.alto)}] /Resources << /XObject << /Im0 ${String(imagen)} 0 R >> >> /Contents ${String(dibujo)} 0 R >>`,
    );
    objeto(
      imagen,
      `<< /Type /XObject /Subtype /Image /Width ${String(p.ancho)} /Height ${String(p.alto)} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${String(p.jpeg.byteLength)} >>`,
      p.jpeg,
    );
    const ordenes = codificador.encode(
      `q ${numero(w)} 0 0 ${numero(h)} ${numero(x)} ${numero(y)} cm /Im0 Do Q`,
    );
    objeto(dibujo, `<< /Length ${String(ordenes.byteLength)} >>`, ordenes);
  });

  const total = 3 + paginas.length * 3;
  const tabla = largo;
  escribir(`xref\n0 ${String(total)}\n0000000000 65535 f \n`);
  for (let n = 1; n < total; n++) {
    escribir(`${String(desplazamientos[n] ?? 0).padStart(10, '0')} 00000 n \n`);
  }
  escribir(
    `trailer\n<< /Size ${String(total)} /Root 1 0 R >>\nstartxref\n${String(tabla)}\n%%EOF\n`,
  );

  const pdf = new Uint8Array(largo);
  let donde = 0;
  for (const trozo of trozos) {
    pdf.set(trozo, donde);
    donde += trozo.byteLength;
  }
  return pdf;
}

/** Bytes a base64, para mandarlo a la API. */
export function aBase64(bytes: Uint8Array): string {
  let texto = '';
  const TROZO = 0x8000;
  for (let i = 0; i < bytes.length; i += TROZO) {
    texto += String.fromCharCode(...bytes.subarray(i, i + TROZO));
  }
  return btoa(texto);
}

/** Base64 a bytes. */
export function deBase64(base64: string): Uint8Array {
  const texto = atob(base64);
  const bytes = new Uint8Array(texto.length);
  for (let i = 0; i < texto.length; i++) bytes[i] = texto.charCodeAt(i);
  return bytes;
}
