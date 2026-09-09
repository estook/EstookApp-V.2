/**
 * Reducir una imagen antes de subirla (M5).
 *
 * «La foto pesa 8 MB → **se reduce antes de subir** → barra de progreso, y nada
 *  más» (Auditoría, parte 5).
 *
 * ── Por qué en el navegador y no en el servidor ──────────────────────────────
 *
 * Porque lo que se quiere evitar es **subir ocho megas por una red de bar**. Un
 * logo sacado de la galería de un móvil son varios megabytes de foto; reducirlo
 * en el servidor significaría subirlo entero primero, que es justo lo que tarda.
 *
 * El servidor comprueba el tamaño otra vez, y eso no es duplicar el trabajo:
 * esconder algo en la pantalla no es protegerlo (regla 4). Aquí se reduce por
 * comodidad; allí se rechaza por seguridad.
 *
 * ── Y por qué sin librería ───────────────────────────────────────────────────
 *
 * «Ninguna dependencia nueva sin justificarla» (B4). Esto son cuarenta líneas
 * con `canvas`, que existe en todos los navegadores desde hace quince años.
 */

/** Lo más grande que se admite ya reducido. El servidor tiene el mismo tope. */
export const TOPE_DEL_LOGO = 512 * 1024;

/** El lado máximo. Un logo de cabecera se pinta a 32 px; 512 sobra de largo. */
const LADO = 512;

export interface ImagenReducida {
  readonly base64: string;
  readonly tipo: string;
  readonly ancho: number;
  readonly alto: number;
}

export async function reducirImagen(fichero: File): Promise<ImagenReducida> {
  const imagen = await cargar(fichero);

  // Se encoge, nunca se agranda: subir un logo de 40 px y estirarlo a 512 lo
  // dejaría borroso y ocuparía veinte veces más.
  const escala = Math.min(1, LADO / Math.max(imagen.width, imagen.height));
  // `Math.trunc` y no `Math.round`: aqui se cuentan pixeles, no dinero, y la
  // regla 9 prohibe `Math.round` fuera de los motores a proposito. Un pixel de
  // menos en un logo no lo nota nadie.
  const ancho = Math.max(1, Math.trunc(imagen.width * escala));
  const alto = Math.max(1, Math.trunc(imagen.height * escala));

  const lienzo = document.createElement('canvas');
  lienzo.width = ancho;
  lienzo.height = alto;

  const pincel = lienzo.getContext('2d');
  if (pincel === null) throw new Error('Este navegador no sabe redibujar la imagen.');

  pincel.drawImage(imagen, 0, 0, ancho, alto);

  // PNG conserva la transparencia, que en un logo es lo normal: sobre la
  // cabecera de color, un fondo blanco se vería como un recuadro.
  //
  // Si sale demasiado grande —un PNG con muchos colores lo hace— se baja a JPG,
  // que pesa una fracción. Se pierde la transparencia, y es mejor eso que no
  // poder subir el logo.
  const comoPng = lienzo.toDataURL('image/png');
  if (pesa(comoPng) <= TOPE_DEL_LOGO) {
    return { base64: soloElContenido(comoPng), tipo: 'image/png', ancho, alto };
  }

  for (const calidad of [0.9, 0.75, 0.6]) {
    const comoJpg = lienzo.toDataURL('image/jpeg', calidad);
    if (pesa(comoJpg) <= TOPE_DEL_LOGO) {
      return { base64: soloElContenido(comoJpg), tipo: 'image/jpeg', ancho, alto };
    }
  }

  throw new Error('Esa imagen no cabe ni reducida.');
}

function cargar(fichero: File): Promise<HTMLImageElement> {
  return new Promise((resolver, rechazar) => {
    const direccion = URL.createObjectURL(fichero);
    const imagen = new Image();

    imagen.onload = () => {
      // La dirección temporal se suelta siempre: sin esto, cada intento deja el
      // fichero entero en memoria hasta que se recargue la página.
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
