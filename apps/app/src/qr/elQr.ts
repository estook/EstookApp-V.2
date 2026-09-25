/**
 * El QR de la carta, en sus tres formas (entrega O, punto 20 · decisión 0047).
 *
 * La librería (`uqr`, MIT, sin dependencias) **solo da la matriz**: los cuadros
 * negros y blancos. El dibujo lo hace esto, así que el QR sale igual en pantalla, en
 * el SVG para la imprenta y en el PNG, y se pinta con React sin meter HTML a mano
 * (el único `dangerouslySetInnerHTML` del proyecto sigue siendo el de los iconos).
 *
 * Se carga **aparte y solo al abrir el QR**: nadie se descarga un codificador de QR
 * para fichar.
 *
 * Con corrección de errores **Q** (un 25 %): un QR pegado en una mesa se mancha, se
 * raya y se dobla, y con Q se sigue leyendo. Es lo que usan las cartas de verdad.
 */
export type MatrizDelQr = readonly (readonly boolean[])[];

export async function laMatriz(texto: string): Promise<MatrizDelQr> {
  const { encode } = await import('uqr');
  return encode(texto, { ecc: 'Q', border: 0 }).data;
}

/**
 * Los cuadros negros como un solo camino, fila a fila y juntando los seguidos:
 * cientos de rectángulos serían un SVG pesado y un DOM lento de pintar.
 */
export function elCaminoDelQr(matriz: MatrizDelQr, margen: number): string {
  const trozos: string[] = [];
  matriz.forEach((fila, y) => {
    let x = 0;
    while (x < fila.length) {
      if (!fila[x]) {
        x += 1;
        continue;
      }
      const empieza = x;
      while (x < fila.length && fila[x]) x += 1;
      trozos.push(
        `M${String(empieza + margen)} ${String(y + margen)}h${String(x - empieza)}v1h-${String(x - empieza)}z`,
      );
    }
  });
  return trozos.join('');
}

/** El margen blanco que piden los lectores: cuatro módulos por lado. */
export const MARGEN = 4;

export function elSvgDelQr(matriz: MatrizDelQr): string {
  const lado = matriz.length + MARGEN * 2;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${String(lado)} ${String(lado)}" shape-rendering="crispEdges">`,
    `<rect width="${String(lado)}" height="${String(lado)}" fill="#fff"/>`,
    `<path fill="#000" d="${elCaminoDelQr(matriz, MARGEN)}"/>`,
    '</svg>',
  ].join('');
}

/** Un PNG de `pixeles` de lado, en blanco y negro, para quien no sepa abrir un SVG. */
export async function elPngDelQr(matriz: MatrizDelQr, pixeles = 1200): Promise<Blob> {
  const lado = matriz.length + MARGEN * 2;
  const modulo = Math.floor(pixeles / lado);
  const lienzo = document.createElement('canvas');
  lienzo.width = modulo * lado;
  lienzo.height = modulo * lado;
  const pincel = lienzo.getContext('2d');
  if (pincel === null) throw new Error('Este navegador no deja dibujar el QR.');
  pincel.fillStyle = '#fff';
  pincel.fillRect(0, 0, lienzo.width, lienzo.height);
  pincel.fillStyle = '#000';
  matriz.forEach((fila, y) => {
    fila.forEach((negro, x) => {
      if (negro) pincel.fillRect((x + MARGEN) * modulo, (y + MARGEN) * modulo, modulo, modulo);
    });
  });
  return new Promise((resolver, fallar) => {
    lienzo.toBlob((blob) => {
      if (blob === null) fallar(new Error('No se ha podido hacer el PNG.'));
      else resolver(blob);
    }, 'image/png');
  });
}

/** Bajar un fichero hecho en el navegador, con su nombre. */
export function bajar(contenido: Blob, nombre: string): void {
  const enlace = document.createElement('a');
  enlace.href = URL.createObjectURL(contenido);
  enlace.download = nombre;
  document.body.append(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => {
    URL.revokeObjectURL(enlace.href);
  }, 1_000);
}
