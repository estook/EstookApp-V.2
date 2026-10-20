import { loQueCabe } from '../almacen/reducirFoto.ts';

/**
 * La carta del local, pasada a páginas en imagen antes de subirla (repaso del
 * 25-sep · decisión 0049).
 *
 * Lo que se sube es **lo que se lee bien en el móvil de quien escanea el QR**: una
 * imagen por página, de 1600 px de ancho, en WebP (o JPG en Safari, que no sabe
 * escribir WebP desde un lienzo). Un PDF en el móvil abre un visor aparte, a veces
 * solo la primera página, y a veces una descarga; una imagen se ve y se amplía con
 * dos dedos, sin salir de la carta.
 *
 *   · **Un PDF** se pinta página a página con PDF.js, la librería de Mozilla que
 *     usa Firefox para enseñar los PDF. **Se descarga solo al elegir un PDF**: el
 *     resto de la app no la carga nunca.
 *   · **Una foto** (una carta de papel fotografiada, o un diseño exportado en JPG o
 *     PNG) se reduce igual, sin librería.
 *
 * Como mucho doce páginas: una carta de verdad tiene dos, cuatro, seis.
 */

/** El ancho de cada página: nítida en un móvil grande, ampliada con dos dedos. */
export const ANCHO_DE_LA_PAGINA = 1600;
/** Lo que se intenta no pasar por página, y lo que no se pasa nunca (el servidor tiene el mismo tope). */
const OBJETIVO_DE_LA_PAGINA = 700 * 1024;
export const TOPE_DE_LA_PAGINA = 1536 * 1024;
export const PAGINAS_DE_LA_CARTA = 12;

export interface PaginaLista {
  readonly tipo: 'image/webp' | 'image/jpeg';
  /** En base64, sin el `data:` delante: como viaja a la API. */
  readonly contenido: string;
  /** Para enseñarla antes de publicar. */
  readonly vista: string;
}

export class NoSeHaPodidoLeer extends Error {}

/** Lo que el usuario elige —un PDF o varias fotos—, en páginas listas para subir. */
export async function paginasDe(ficheros: readonly File[]): Promise<readonly PaginaLista[]> {
  const paginas: PaginaLista[] = [];
  for (const fichero of ficheros) {
    if (paginas.length >= PAGINAS_DE_LA_CARTA) break;
    if (esPdf(fichero)) {
      paginas.push(...(await paginasDelPdf(fichero, PAGINAS_DE_LA_CARTA - paginas.length)));
    } else if (fichero.type.startsWith('image/')) {
      paginas.push(aPagina(await lienzoDeLaFoto(fichero)));
    } else {
      throw new NoSeHaPodidoLeer(`«${fichero.name}» no es un PDF ni una foto.`);
    }
  }
  if (paginas.length === 0) throw new NoSeHaPodidoLeer('No hay ninguna página que subir.');
  return paginas;
}

function esPdf(fichero: File): boolean {
  return fichero.type === 'application/pdf' || fichero.name.toLowerCase().endsWith('.pdf');
}

async function paginasDelPdf(fichero: File, cuantasCaben: number): Promise<PaginaLista[]> {
  // PDF.js y su trabajador, solo ahora: pesan lo que el resto de la app junta.
  const [pdfjs, trabajador] = await Promise.all([
    import('pdfjs-dist'),
    import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
  ]);
  pdfjs.GlobalWorkerOptions.workerSrc = trabajador.default;

  let documento;
  try {
    // PDF.js 5 no usa `eval`, que la política de seguridad no deja (script-src
    // 'self'): lo prueba `el-repaso-del-25-sep.spec.ts` con un PDF de verdad.
    documento = await pdfjs.getDocument({ data: new Uint8Array(await fichero.arrayBuffer()) })
      .promise;
  } catch {
    throw new NoSeHaPodidoLeer(`«${fichero.name}» no se ha podido abrir. ¿Tiene contraseña?`);
  }

  const paginas: PaginaLista[] = [];
  const cuantas = Math.min(documento.numPages, cuantasCaben);
  for (let numero = 1; numero <= cuantas; numero++) {
    const pagina = await documento.getPage(numero);
    const tal = pagina.getViewport({ scale: 1 });
    const escala = ANCHO_DE_LA_PAGINA / tal.width;
    const vista = pagina.getViewport({ scale: escala });
    const { lienzo, pincel } = lienzoEnBlanco(Math.trunc(vista.width), Math.trunc(vista.height));
    await pagina.render({ canvas: lienzo, canvasContext: pincel, viewport: vista }).promise;
    paginas.push(aPagina(lienzo));
    pagina.cleanup();
  }
  await documento.destroy();
  return paginas;
}

async function lienzoDeLaFoto(fichero: File): Promise<HTMLCanvasElement> {
  const imagen = await cargar(fichero);
  // Por el ancho, no por el lado mayor: una carta es alta, y lo que se lee es el ancho.
  const medidas = loQueCabe(
    imagen.naturalWidth,
    imagen.naturalHeight,
    Math.max(ANCHO_DE_LA_PAGINA, (ANCHO_DE_LA_PAGINA * imagen.naturalHeight) / imagen.naturalWidth),
  );
  const { lienzo, pincel } = lienzoEnBlanco(medidas.ancho, medidas.alto);
  pincel.drawImage(imagen, 0, 0, medidas.ancho, medidas.alto);
  return lienzo;
}

function aPagina(lienzo: HTMLCanvasElement): PaginaLista {
  const tipo = sabeEscribirWebp() ? 'image/webp' : 'image/jpeg';
  let direccion = lienzo.toDataURL(tipo, 0.82);
  for (const calidad of [0.72, 0.62, 0.5]) {
    if (pesa(direccion) <= OBJETIVO_DE_LA_PAGINA) break;
    direccion = lienzo.toDataURL(tipo, calidad);
  }
  if (pesa(direccion) > TOPE_DE_LA_PAGINA) {
    throw new NoSeHaPodidoLeer('Una página pesa demasiado aun reducida. Prueba con otro PDF.');
  }
  return { tipo, contenido: direccion.slice(direccion.indexOf(',') + 1), vista: direccion };
}

function lienzoEnBlanco(
  ancho: number,
  alto: number,
): { readonly lienzo: HTMLCanvasElement; readonly pincel: CanvasRenderingContext2D } {
  const lienzo = document.createElement('canvas');
  lienzo.width = ancho;
  lienzo.height = alto;
  const pincel = lienzo.getContext('2d');
  if (pincel === null) throw new NoSeHaPodidoLeer('Este navegador no sabe pintar la carta.');
  // Blanco debajo: el JPG no tiene transparencia, y un PDF sin fondo saldría negro.
  pincel.fillStyle = 'white';
  pincel.fillRect(0, 0, ancho, alto);
  pincel.imageSmoothingQuality = 'high';
  return { lienzo, pincel };
}

function sabeEscribirWebp(): boolean {
  const prueba = document.createElement('canvas');
  prueba.width = 1;
  prueba.height = 1;
  return prueba.toDataURL('image/webp').startsWith('data:image/webp');
}

/** Lo que pesa de verdad lo que hay detrás de una dirección `data:` en base64. */
function pesa(direccion: string): number {
  return Math.trunc(((direccion.length - direccion.indexOf(',') - 1) * 3) / 4);
}

function cargar(fichero: File): Promise<HTMLImageElement> {
  return new Promise((resolver, rechazar) => {
    const direccion = URL.createObjectURL(fichero);
    const imagen = new Image();
    imagen.onload = () => {
      URL.revokeObjectURL(direccion);
      resolver(imagen);
    };
    imagen.onerror = () => {
      URL.revokeObjectURL(direccion);
      rechazar(new NoSeHaPodidoLeer(`«${fichero.name}» no se ha podido abrir como foto.`));
    };
    imagen.src = direccion;
  });
}

// ═══ Leer la carta (M10 · 1, decisión 0102) ════════════════════════════════════
//
// Para «Leer tu carta» no hace falta subir nada: un PDF con texto se lee aquí, en el
// móvil, y viajan sus líneas (gratis y sin IA); una foto o un PDF escaneado se pasa a
// imágenes para que Fogón las lea, página a página. Nada se guarda.

/** Las páginas que se le enseñan a Fogón de una vez: cada una son 3 créditos. */
export const PAGINAS_PARA_FOGON = 4;

/** Con menos letras que esto en todo el PDF, es un escaneado: lo tiene que leer Fogón. */
const LETRAS_DE_UN_PDF_CON_TEXTO = 40;

interface Trozo {
  readonly x: number;
  readonly fin: number;
  readonly y: number;
  readonly alto: number;
  readonly texto: string;
}

/** «8,50 €», «14», «6,00 / 10,00»: un trozo que es solo un precio. */
function esSoloUnPrecio(texto: string): boolean {
  return /^[\s.·…_\-–—|/]*\d{1,4}([.,]\d{1,2})?\s*(€|eur(os)?)?([\s/]+\d{1,4}([.,]\d{1,2})?\s*(€|eur(os)?)?)*$/i.test(
    texto.trim(),
  );
}

/**
 * Las líneas de una página, como se leen: de arriba abajo y **columna a columna**.
 *
 * Los trozos que están a la misma altura son una línea. Si en una línea hay un hueco
 * grande, son dos columnas (la carta a dos columnas, la de casi todos los bares), salvo
 * que lo de la derecha sea solo un precio: entonces es el precio del plato, que en
 * muchas cartas va pegado al margen sin puntitos.
 */
export function lineasDeLaPagina(trozos: readonly Trozo[], ancho: number): string[] {
  const ordenados = [...trozos]
    .filter((t) => t.texto.trim() !== '')
    .sort((a, b) => b.y - a.y || a.x - b.x);
  const filas: Trozo[][] = [];
  for (const trozo of ordenados) {
    const ultima = filas[filas.length - 1];
    const suY = ultima?.[0]?.y;
    if (
      ultima !== undefined &&
      suY !== undefined &&
      Math.abs(suY - trozo.y) <= Math.max(2, trozo.alto * 0.5)
    ) {
      ultima.push(trozo);
    } else {
      filas.push([trozo]);
    }
  }
  const columnas: [string[], string[]] = [[], []];
  for (const fila of filas) {
    fila.sort((a, b) => a.x - b.x);
    const partes: { x: number; texto: string; fin: number }[] = [];
    for (const trozo of fila) {
      const anterior = partes[partes.length - 1];
      const hueco = anterior === undefined ? 0 : trozo.x - anterior.fin;
      if (anterior !== undefined && (hueco < ancho * 0.08 || esSoloUnPrecio(trozo.texto))) {
        anterior.texto = `${anterior.texto}${hueco > 1 ? ' ' : ''}${trozo.texto}`;
        anterior.fin = trozo.fin;
      } else {
        partes.push({ x: trozo.x, texto: trozo.texto, fin: trozo.fin });
      }
    }
    for (const parte of partes) {
      const texto = parte.texto.replace(/\s+/g, ' ').trim();
      if (texto !== '') columnas[parte.x > ancho * 0.45 ? 1 : 0].push(texto);
    }
  }
  return [...columnas[0], ...columnas[1]];
}

/**
 * Las líneas de texto de un PDF, o nulo si es un escaneado (casi sin letras): entonces
 * lo lee Fogón.
 */
export async function lineasDelPdf(fichero: File): Promise<string[] | null> {
  const [pdfjs, trabajador] = await Promise.all([
    import('pdfjs-dist'),
    import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
  ]);
  pdfjs.GlobalWorkerOptions.workerSrc = trabajador.default;
  let documento;
  try {
    documento = await pdfjs.getDocument({ data: new Uint8Array(await fichero.arrayBuffer()) })
      .promise;
  } catch {
    throw new NoSeHaPodidoLeer(`«${fichero.name}» no se ha podido abrir. ¿Tiene contraseña?`);
  }
  const lineas: string[] = [];
  const cuantas = Math.min(documento.numPages, PAGINAS_DE_LA_CARTA);
  for (let numero = 1; numero <= cuantas; numero++) {
    const pagina = await documento.getPage(numero);
    const ancho = pagina.getViewport({ scale: 1 }).width;
    const contenido = await pagina.getTextContent();
    const trozos: Trozo[] = [];
    for (const item of contenido.items) {
      if (!('str' in item)) continue;
      const [, , , , x, y] = item.transform as [number, number, number, number, number, number];
      trozos.push({ x, y, alto: item.height, fin: x + item.width, texto: item.str });
    }
    lineas.push(...lineasDeLaPagina(trozos, ancho));
    pagina.cleanup();
  }
  await documento.destroy();
  const letras = lineas.join('').replace(/[^\p{L}]/gu, '').length;
  return letras < LETRAS_DE_UN_PDF_CON_TEXTO ? null : lineas;
}

/** Una página para que la lea Fogón: JPEG, que con letras se lee mejor, y bajo su tope. */
export interface PaginaParaLeer {
  readonly tipo: 'image/jpeg';
  readonly base64: string;
}

const TOPE_PARA_FOGON = 1_400 * 1024;

function paraFogon(lienzo: HTMLCanvasElement): PaginaParaLeer {
  let direccion = lienzo.toDataURL('image/jpeg', 0.85);
  for (const calidad of [0.75, 0.65, 0.55, 0.45]) {
    if (pesa(direccion) <= 900 * 1024) break;
    direccion = lienzo.toDataURL('image/jpeg', calidad);
  }
  if (pesa(direccion) > TOPE_PARA_FOGON) {
    throw new NoSeHaPodidoLeer('Una página pesa demasiado aun reducida. Prueba con otra foto.');
  }
  return { tipo: 'image/jpeg', base64: direccion.slice(direccion.indexOf(',') + 1) };
}

/** Las fotos o el PDF escaneado, en páginas para Fogón: como mucho `PAGINAS_PARA_FOGON`. */
export async function paginasParaFogon(
  ficheros: readonly File[],
): Promise<readonly PaginaParaLeer[]> {
  const paginas: PaginaParaLeer[] = [];
  for (const fichero of ficheros) {
    if (paginas.length >= PAGINAS_PARA_FOGON) break;
    if (esPdf(fichero)) {
      const [pdfjs, trabajador] = await Promise.all([
        import('pdfjs-dist'),
        import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
      ]);
      pdfjs.GlobalWorkerOptions.workerSrc = trabajador.default;
      const documento = await pdfjs.getDocument({
        data: new Uint8Array(await fichero.arrayBuffer()),
      }).promise;
      const cuantas = Math.min(documento.numPages, PAGINAS_PARA_FOGON - paginas.length);
      for (let numero = 1; numero <= cuantas; numero++) {
        const pagina = await documento.getPage(numero);
        const tal = pagina.getViewport({ scale: 1 });
        const vista = pagina.getViewport({ scale: ANCHO_DE_LA_PAGINA / tal.width });
        const { lienzo, pincel } = lienzoEnBlanco(
          Math.trunc(vista.width),
          Math.trunc(vista.height),
        );
        await pagina.render({ canvas: lienzo, canvasContext: pincel, viewport: vista }).promise;
        paginas.push(paraFogon(lienzo));
        pagina.cleanup();
      }
      await documento.destroy();
    } else if (fichero.type.startsWith('image/')) {
      paginas.push(paraFogon(await lienzoDeLaFoto(fichero)));
    } else {
      throw new NoSeHaPodidoLeer(`«${fichero.name}» no es un PDF ni una foto.`);
    }
  }
  if (paginas.length === 0) throw new NoSeHaPodidoLeer('No hay ninguna página que leer.');
  return paginas;
}

export { esPdf };
