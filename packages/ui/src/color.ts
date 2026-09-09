/**
 * La aritmética de color · lo que hace que elegir un color no rompa la pantalla.
 *
 * ── Por qué existe ───────────────────────────────────────────────────────────
 *
 * Desde M5 cada local elige **su color**, y ahora ese color puede pintar la
 * aplicación entera. Eso es exactamente donde se rompen las aplicaciones que
 * dejan personalizar: alguien pone el granate de su bodega, el botón principal
 * se pinta de granate, y el texto del botón —que era oscuro porque el naranja de
 * Estook es claro— **desaparece**.
 *
 * B8 no admite eso: «contraste mínimo 4,5:1 en texto y 3:1 en iconos con
 * significado», y no dice «salvo que lo haya elegido el usuario». Así que el
 * color que se guarda es el que la persona eligió, y el color que se **pinta**
 * sale de aquí, ajustado hasta que cumple.
 *
 * ── Por qué es un fichero aparte y sin React ─────────────────────────────────
 *
 * Porque es aritmética, y la aritmética se prueba sola. Lo mismo que hace
 * `@estook/dominio` con el dinero: la cuenta vive donde se puede comprobar línea
 * a línea, y la pantalla solo la usa. Aquí además lo usan dos sitios —el gancho
 * que pinta la aplicación y la vista previa de Ajustes— y una cuenta con dos
 * dueños acaba dando dos resultados (regla 6).
 */

/** Un color de seis dígitos, con la almohadilla delante. */
export type ColorHex = string;

export function esColorHex(valor: unknown): valor is ColorHex {
  return typeof valor === 'string' && /^#[0-9a-fA-F]{6}$/.test(valor);
}

function canales(hex: ColorHex): [number, number, number] {
  return [
    Number.parseInt(hex.slice(1, 3), 16),
    Number.parseInt(hex.slice(3, 5), 16),
    Number.parseInt(hex.slice(5, 7), 16),
  ];
}

function aHex(r: number, v: number, a: number): ColorHex {
  // eslint-disable-next-line no-restricted-syntax -- canal de color de 0 a 255, no dinero
  const cabe = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  return `#${[cabe(r), cabe(v), cabe(a)].map((n) => n.toString(16).padStart(2, '0')).join('')}`;
}

/** Luminancia relativa, tal cual la define WCAG. */
export function luminancia(hex: ColorHex): number {
  const [r, v, a] = canales(hex);
  const canal = (bruto: number) => {
    const x = bruto / 255;
    return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * canal(r) + 0.7152 * canal(v) + 0.0722 * canal(a);
}

/** La razón de contraste entre dos colores, de 1 a 21. */
export function contraste(uno: ColorHex, otro: ColorHex): number {
  const a = luminancia(uno);
  const b = luminancia(otro);
  const [claro, oscuro] = a > b ? [a, b] : [b, a];
  return (claro + 0.05) / (oscuro + 0.05);
}

/** Mezcla dos colores. `cuanto` es cuánto del segundo entra, de 0 a 1. */
export function mezclar(uno: ColorHex, otro: ColorHex, cuanto: number): ColorHex {
  const [r1, v1, a1] = canales(uno);
  const [r2, v2, a2] = canales(otro);
  const t = Math.max(0, Math.min(1, cuanto));
  return aHex(r1 + (r2 - r1) * t, v1 + (v2 - v1) * t, a1 + (a2 - a1) * t);
}

/**
 * El blanco o el negro, el que mejor se lea encima de un color.
 *
 * No se elige a ojo ni por «si es oscuro, blanco»: se miden los dos y gana el
 * que más contrasta. Con un amarillo la diferencia es de 1,07 contra 14,7, y
 * elegir mal es el botón ilegible del que va todo esto.
 */
export function loQueSeLeeEncima(fondo: ColorHex): ColorHex {
  return contraste('#ffffff', fondo) >= contraste('#111c1f', fondo) ? '#ffffff' : '#111c1f';
}

/**
 * Acerca un color al blanco o al negro **hasta que contrasta lo suficiente**.
 *
 * Se va en la dirección que aleja del fondo: sobre fondo claro se oscurece,
 * sobre fondo oscuro se aclara. Y se avanza a pasos pequeños en vez de calcular
 * el salto exacto porque el objetivo es el color **más parecido al elegido** que
 * cumple: pasarse de largo daría un granate casi negro cuando bastaba con un
 * punto menos de luz.
 *
 * Si ni el blanco ni el negro puros llegan —no puede pasar con los mínimos de
 * B8, pero se escribe por si mañana alguien sube el listón— devuelve el extremo,
 * que es lo más contrastado que hay.
 */
export function ajustarHasta(color: ColorHex, fondo: ColorHex, minimo: number): ColorHex {
  if (contraste(color, fondo) >= minimo) return color;

  const hacia = luminancia(fondo) > 0.35 ? '#000000' : '#ffffff';
  for (let paso = 1; paso <= 40; paso += 1) {
    const intento = mezclar(color, hacia, paso / 40);
    if (contraste(intento, fondo) >= minimo) return intento;
  }
  return hacia;
}

/** Los mínimos de B8, escritos una vez. */
export const CONTRASTE_DE_TEXTO = 4.5;
export const CONTRASTE_DE_ICONO = 3;

/**
 * El acento, empujado hasta que cumple **las dos cosas a la vez**.
 *
 * Se ve sobre la tarjeta (3:1) y además algo se lee encima de él (4,5:1). Son dos
 * exigencias distintas y hay colores que no cumplen ninguna de las dos: un gris
 * del 50 % da 3,95 contra el blanco y 4,34 con lo mejor que se le puede escribir
 * encima. No hay texto que se lea sobre un gris medio, y por eso hay que moverlo.
 *
 * Y se empuja **en una sola dirección**: la contraria a la superficie. Sobre
 * fondo claro se oscurece, y eso mejora las dos cosas a la vez —se separa del
 * blanco de la tarjeta y deja sitio al texto blanco encima—. Sobre fondo oscuro,
 * al revés. Ir a la otra dirección arreglaría una y rompería la otra, y así es
 * como se acaba con un botón que se ve pero no se lee.
 */
function acentoQueSePinta(
  marca: ColorHex,
  superficie: ColorHex,
  tinte: ColorHex = superficie,
): ColorHex {
  const hacia = luminancia(superficie) > 0.35 ? '#000000' : '#ffffff';

  for (let paso = 0; paso <= 40; paso += 1) {
    const intento = paso === 0 ? marca : mezclar(marca, hacia, paso / 40);
    // Sobre la tarjeta **y sobre el tinte**: el mismo icono aparece en los dos
    // sitios, y con solo la tarjeta se colaba un acento que daba justo 3,00 allí
    // y 2,98 sobre la pastilla. Los dos fondos van en la misma dirección, así
    // que exigirlos juntos no se contradice nunca.
    const seVe =
      contraste(intento, superficie) >= CONTRASTE_DE_ICONO &&
      contraste(intento, tinte) >= CONTRASTE_DE_ICONO;
    const seLeeEncima = contraste(loQueSeLeeEncima(intento), intento) >= CONTRASTE_DE_TEXTO;
    if (seVe && seLeeEncima) return intento;
  }
  return hacia;
}

/** Dónde se va a pintar el acento. Los cuatro colores que le condicionan. */
export interface DondeSePinta {
  /** El fondo de una tarjeta. Lo que hay detrás de un icono o un borde. */
  readonly superficie: ColorHex;
  /** El color del texto normal. Tiene que leerse sobre el tinte del acento. */
  readonly texto: ColorHex;
  /** La pieza oscura de la aplicación: la barra de deshacer, el pie de Fogón. */
  readonly oscuro: ColorHex;
}

export interface AcentoPintable {
  /** Con el que se pinta sobre una tarjeta: iconos, bordes, rellenos. */
  readonly acento: ColorHex;
  /** Lo que se escribe **encima** del acento. Blanco o charcoal, medido. */
  readonly sobreAcento: ColorHex;
  /** El fondo tenue de una pastilla, con el texto normal legible encima. */
  readonly acentoSuave: ColorHex;
  /** El acento **dentro de una pieza oscura**, donde se usa como texto. */
  readonly acentoEnOscuro: ColorHex;
  /** Si hubo que tocar el color elegido para que cumpliera. */
  readonly seAjusto: boolean;
}

/**
 * De un color de marca a los cuatro que la aplicación necesita.
 *
 * Cuatro y no uno, porque un color se usa de cuatro maneras y **cada una tiene
 * su mínimo**:
 *
 *   · **Pintar** sobre una tarjeta —un icono, un borde, el relleno de un botón—
 *     pide 3:1 contra la superficie, que es lo que B8 exige a «un icono con
 *     significado».
 *   · **Escribir encima** del acento pide 4,5:1. Por eso el texto del botón no
 *     es siempre charcoal: sobre un azul noche tiene que ser blanco.
 *   · **Servir de fondo tenue** a una pastilla seleccionada. Ahí el texto no es
 *     el acento, es el texto normal, así que lo que hay que garantizar es que el
 *     texto normal se lea sobre el tinte.
 *   · Y **ser texto dentro de una pieza oscura**: «Deshacer» va en naranja sobre
 *     la barra charcoal. Ahí el fondo es otro y el mínimo es el de texto, así que
 *     sale un tono distinto. Sin esto, un color de marca oscuro deja «Deshacer»
 *     invisible sobre negro, que es justo el fallo que da miedo.
 */
export function derivarAcento(marca: ColorHex, donde: DondeSePinta): AcentoPintable {
  /*
    Primero el tinte, y después el acento. El orden importa.

    El tinte nace de la superficie con una pizca del color elegido —del elegido y
    no del ajustado: el tinte se mira, no se lee, y así se parece más a lo que la
    persona puso—, y se acerca a la superficie hasta que **el texto normal se lee
    encima**, que es lo que lleva escrito una pastilla seleccionada.

    Y con el tinte ya decidido se saca el acento, exigiéndole que se vea en los
    dos sitios donde va a aparecer: la tarjeta y la pastilla.
  */
  const enClaro = luminancia(donde.superficie) > 0.35;
  let acentoSuave = mezclar(donde.superficie, marca, enClaro ? 0.12 : 0.22);
  for (
    let paso = 0;
    paso < 24 && contraste(donde.texto, acentoSuave) < CONTRASTE_DE_TEXTO;
    paso += 1
  ) {
    acentoSuave = mezclar(acentoSuave, donde.superficie, 0.3);
  }

  const acento = acentoQueSePinta(marca, donde.superficie, acentoSuave);

  return {
    acento,
    sobreAcento: loQueSeLeeEncima(acento),
    acentoSuave,
    acentoEnOscuro: ajustarHasta(marca, donde.oscuro, CONTRASTE_DE_TEXTO),
    seAjusto: acento !== marca,
  };
}
