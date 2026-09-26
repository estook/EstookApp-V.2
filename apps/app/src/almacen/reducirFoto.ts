/**
 * Reducir la foto de un producto antes de subirla (entrega V, punto 5).
 *
 * «Se reducen **en el móvil antes de subir**: 800 px de lado y WebP, unos 80 KB.
 *  Una foto de 4 MB por 3G desde la cámara es una merma que no se apunta.» Y se
 * guarda también **una miniatura** de 160 px para las listas.
 *
 * Es el mismo camino que el logo (`marca/reducirImagen.ts`), con lo que cambia de
 * una foto a un logo:
 *
 *   · **Nada de PNG.** Un logo lleva transparencia; una foto de una caja de
 *     tomates, no, y en PNG pesaría diez veces más. WebP, y JPG donde el navegador
 *     no sepa escribir WebP.
 *   · **Safari no sabe escribir WebP desde un lienzo**: le pides WebP y te da PNG
 *     sin avisar. Por eso se mira qué ha devuelto de verdad y, si no es WebP, se
 *     hace en JPG. Sin esto, un iPhone subiría fotos de un mega.
 *   · **La miniatura es cuadrada**, recortada por el centro: en una lista, cuarenta
 *     cuadrados iguales se leen; cuarenta rectángulos de proporciones distintas, no.
 *   · **Fondo blanco** debajo: si la foto trae transparencia, el JPG la pintaría
 *     de negro.
 *
 * Las cuentas —cuánto mide lo reducido y qué se recorta— están aparte y sin
 * navegador, para poder probarlas.
 */

/** El lado de la foto que va a la ficha. 800 se ve nítido en un móvil y en la tableta. */
export const LADO_DE_LA_FOTO = 800;
/** El lado de la miniatura: 40 px en la lista, con pantallas de hasta cuatro veces. */
export const LADO_DE_LA_MINIATURA = 160;

/** Lo que se intenta no pasar, y lo que no se pasa nunca (el servidor tiene el mismo tope). */
const OBJETIVO_DE_LA_FOTO = 150 * 1024;
export const TOPE_DE_LA_FOTO = 400 * 1024;
export const TOPE_DE_LA_MINIATURA = 40 * 1024;

export interface FotoReducida {
  readonly tipo: 'image/webp' | 'image/jpeg';
  /** La de 800 px, en base64 y sin el `data:` delante. */
  readonly foto: string;
  readonly miniatura: string;
}

/**
 * Cuánto mide una imagen metida en un cuadrado de `lado`, sin deformarla.
 *
 * Se encoge, **nunca se agranda**: estirar una foto pequeña la deja borrosa y
 * pesando más. Y con `Math.trunc`: aquí se cuentan píxeles, no dinero, y la regla 9
 * reserva el redondeo a los motores de dinero. Un píxel de menos no lo ve nadie.
 */
export function loQueCabe(
  ancho: number,
  alto: number,
  lado: number,
): { readonly ancho: number; readonly alto: number } {
  const escala = Math.min(1, lado / Math.max(ancho, alto));
  return {
    ancho: Math.max(1, Math.trunc(ancho * escala)),
    alto: Math.max(1, Math.trunc(alto * escala)),
  };
}

/** El cuadrado del centro de una imagen: lo que sale en la miniatura. */
export function elCuadradoDelCentro(
  ancho: number,
  alto: number,
): { readonly x: number; readonly y: number; readonly lado: number } {
  const lado = Math.min(ancho, alto);
  return { x: Math.trunc((ancho - lado) / 2), y: Math.trunc((alto - lado) / 2), lado };
}

export async function reducirFoto(fichero: File): Promise<FotoReducida> {
  const imagen = await cargar(fichero);
  const tipo = sabeEscribirWebp() ? 'image/webp' : 'image/jpeg';

  // ── La foto de la ficha ──────────────────────────────────────────────────
  const medidas = loQueCabe(imagen.naturalWidth, imagen.naturalHeight, LADO_DE_LA_FOTO);
  const grande = lienzo(medidas.ancho, medidas.alto);
  grande.pincel.drawImage(imagen, 0, 0, medidas.ancho, medidas.alto);

  let foto = grande.lienzo.toDataURL(tipo, 0.8);
  // Con mucho detalle (una estantería llena), se baja la calidad hasta el objetivo.
  for (const calidad of [0.7, 0.6, 0.5]) {
    if (pesa(foto) <= OBJETIVO_DE_LA_FOTO) break;
    foto = grande.lienzo.toDataURL(tipo, calidad);
  }
  if (pesa(foto) > TOPE_DE_LA_FOTO) throw new Error('Esa foto no cabe ni reducida.');

  // ── La miniatura, cuadrada y recortada por el centro ─────────────────────
  const recorte = elCuadradoDelCentro(imagen.naturalWidth, imagen.naturalHeight);
  const ladoMini = Math.min(LADO_DE_LA_MINIATURA, recorte.lado);
  const pequena = lienzo(ladoMini, ladoMini);
  pequena.pincel.drawImage(
    imagen,
    recorte.x,
    recorte.y,
    recorte.lado,
    recorte.lado,
    0,
    0,
    ladoMini,
    ladoMini,
  );
  const miniatura = pequena.lienzo.toDataURL(tipo, 0.75);
  if (pesa(miniatura) > TOPE_DE_LA_MINIATURA) throw new Error('La miniatura no cabe.');

  return { tipo, foto: soloElContenido(foto), miniatura: soloElContenido(miniatura) };
}

/** Un lienzo con su fondo blanco ya pintado. */
function lienzo(
  ancho: number,
  alto: number,
): { readonly lienzo: HTMLCanvasElement; readonly pincel: CanvasRenderingContext2D } {
  const elLienzo = document.createElement('canvas');
  elLienzo.width = ancho;
  elLienzo.height = alto;
  const pincel = elLienzo.getContext('2d');
  if (pincel === null) throw new Error('Este navegador no sabe redibujar la imagen.');
  // Blanco debajo: el JPG no tiene transparencia, y sin esto la pintaría negra.
  pincel.fillStyle = 'white';
  pincel.fillRect(0, 0, ancho, alto);
  pincel.imageSmoothingQuality = 'high';
  return { lienzo: elLienzo, pincel };
}

/** Si este navegador escribe WebP de verdad, o devuelve PNG sin decirlo (Safari). */
function sabeEscribirWebp(): boolean {
  const prueba = document.createElement('canvas');
  prueba.width = 1;
  prueba.height = 1;
  return prueba.toDataURL('image/webp').startsWith('data:image/webp');
}

function cargar(fichero: File): Promise<HTMLImageElement> {
  return new Promise((resolver, rechazar) => {
    const direccion = URL.createObjectURL(fichero);
    const imagen = new Image();
    imagen.onload = () => {
      // La dirección temporal se suelta siempre: si no, cada intento deja la foto
      // entera en memoria hasta recargar, y en un móvil eso son megas.
      URL.revokeObjectURL(direccion);
      resolver(imagen);
    };
    imagen.onerror = () => {
      URL.revokeObjectURL(direccion);
      rechazar(new Error('No es una imagen que este navegador sepa abrir.'));
    };
    imagen.src = direccion;
  });
}

/** Cuánto ocupan los bytes detrás de un `data:`, sin decodificarlo entero. */
function pesa(dataUrl: string): number {
  const contenido = soloElContenido(dataUrl);
  const relleno = contenido.endsWith('==') ? 2 : contenido.endsWith('=') ? 1 : 0;
  return Math.floor((contenido.length * 3) / 4) - relleno;
}

function soloElContenido(dataUrl: string): string {
  return dataUrl.slice(dataUrl.indexOf(',') + 1);
}
