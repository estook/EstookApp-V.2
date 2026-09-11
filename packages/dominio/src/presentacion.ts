import { entreFactor, porCantidad, type Centimos } from './dinero.ts';

/**
 * Cómo se compra un producto, y lo que sale de ahí (M7, repaso).
 *
 * «Pongo queso azul, que viene en un envase de 250 g: tendremos que poner cuántas
 *  unidades, cuánto pesa cada una y cuánto cuestan todas o el precio unitario, y
 *  que haga la cuenta. Si compran fruta, por kilo; leche, por litro. Que sea
 *  rápido y lógico, que no cueste entenderlo: no explicándolo con texto sino con
 *  un buen diseño y quitándoles trabajo.»
 *
 * ── Tres formas de comprar, y nada más ───────────────────────────────────────
 *
 *   **Por peso**      la fruta, la carne, el pescado. Suelto o en cajas de un
 *                     peso fijo, y a tanto el kilo o a tanto la caja.
 *   **Por volumen**   el aceite en garrafa, la leche a granel.
 *   **Por unidades**  los paquetes, las latas, las botellas, los huevos. Cada una
 *                     puede traer algo —250 g, 1 l— y pueden venir en cajas.
 *
 * De lo que se contesta sale lo que el resto de Estook necesita, y nadie tiene
 * que saber que existe: **en qué se cuenta** (kg, l o ud), **cuánto trae lo que
 * se compra** (el factor), **cómo se llama** («Caja de 6 paquetes de 250 g») y
 * **a cuánto sale cada cosa**. Es la misma cuenta en el alta, al corregir la
 * ficha y al cambiar el precio.
 */

export type ModoDeCompra = 'peso' | 'volumen' | 'unidades';

/** La unidad en que se cuenta: la de siempre, o g y ml en los productos de antes. */
export type UnidadDeLaCompra = 'kg' | 'g' | 'l' | 'ml' | 'ud';

export type UnidadDelContenido = 'g' | 'kg' | 'ml' | 'l';

/** Cómo vienen, cuando se compra por unidades. Es lo que se escribe en un pedido. */
export const ENVASES = [
  'Unidad',
  'Paquete',
  'Botella',
  'Lata',
  'Brick',
  'Bolsa',
  'Bandeja',
  'Tarro',
  'Garrafa',
  'Pieza',
] as const;

/** Cómo vienen, cuando se compra por peso o por volumen en un bulto fijo. */
export const BULTOS = ['Caja', 'Saco', 'Garrafa', 'Bidón', 'Bolsa'] as const;

export interface ComoSeCompra {
  readonly modo: ModoDeCompra;
  /** En qué se cuenta. Peso: kg (o g); volumen: l (o ml); unidades: ud. */
  readonly unidad: UnidadDeLaCompra;
  /**
   * Por peso o volumen: lo que trae cada bulto, **en kg o en l**. Nulo: suelto.
   * Por unidades: cuántas vienen juntas en una caja. 1: de una en una.
   */
  readonly porBulto: number | null;
  /** «Caja», «Saco»… en peso y volumen; «Paquete», «Lata»… en unidades. */
  readonly envase: string;
  /** Por unidades: lo que trae cada una. Nulo si no importa. */
  readonly contenido: { readonly cantidad: number; readonly unidad: UnidadDelContenido } | null;
}

export interface Presentacion {
  readonly unidadDeUso: UnidadDeLaCompra;
  /** Cuántas unidades de uso trae lo que se compra. */
  readonly factor: number;
  /** Cómo se llama lo que se compra. Nulo: suelto, se compra en su unidad. */
  readonly formato: string | null;
  readonly contenidoPorUnidad: number | null;
  readonly unidadDelContenido: UnidadDelContenido | null;
  /** «la caja», «cada paquete», «el kg»: a qué se refiere el precio del formato. */
  readonly precioDelFormato: string;
  /** Y el de la unidad suelta, si es otra cosa: «cada paquete», «el kg». Nulo si es lo mismo. */
  readonly precioDeLaUnidad: string | null;
  /** «Caja de 6 paquetes de 250 g · 1,5 kg en total». */
  readonly resumen: string;
}

function numero(n: number): string {
  return Number(n.toFixed(4)).toString().replace('.', ',');
}

/** «Paquete» → «paquetes», «Unidad» → «unidades». */
export function enPlural(nombre: string): string {
  const minusculas = nombre.toLowerCase();
  return /[aeiouáéó]$/.test(minusculas) ? `${minusculas}s` : `${minusculas}es`;
}

/** Lo que trae el contenido, en kg o en l: para decir a cuánto sale el kilo. */
function enKiloOLitro(contenido: { cantidad: number; unidad: UnidadDelContenido }): {
  cuanto: number;
  unidad: 'kg' | 'l';
} {
  if (contenido.unidad === 'g') return { cuanto: contenido.cantidad / 1000, unidad: 'kg' };
  if (contenido.unidad === 'ml') return { cuanto: contenido.cantidad / 1000, unidad: 'l' };
  return { cuanto: contenido.cantidad, unidad: contenido.unidad };
}

/** De lo que se contesta, lo que Estook guarda. */
export function presentacionDe(como: ComoSeCompra): Presentacion {
  if (como.modo === 'unidades') {
    const porCaja = Math.max(1, Math.trunc(como.porBulto ?? 1));
    const envase = como.envase.trim() === '' ? 'Unidad' : como.envase.trim();
    const contenido =
      como.contenido !== null && como.contenido.cantidad > 0 ? como.contenido : null;
    const deCuanto =
      contenido === null ? '' : ` de ${numero(contenido.cantidad)} ${contenido.unidad}`;
    const cadaUna = envase === 'Unidad' ? 'cada unidad' : `cada ${envase.toLowerCase()}`;

    const formato =
      porCaja > 1
        ? `Caja de ${porCaja} ${enPlural(envase)}${deCuanto}`
        : envase === 'Unidad' && contenido === null
          ? null
          : `${envase}${deCuanto}`;

    const total =
      contenido === null
        ? ''
        : (() => {
            const kilo = enKiloOLitro(contenido);
            return ` · ${numero(kilo.cuanto * porCaja)} ${kilo.unidad} en total`;
          })();

    return {
      unidadDeUso: 'ud',
      factor: porCaja,
      formato,
      contenidoPorUnidad: contenido?.cantidad ?? null,
      unidadDelContenido: contenido?.unidad ?? null,
      precioDelFormato: porCaja > 1 ? 'la caja' : cadaUna,
      precioDeLaUnidad: porCaja > 1 ? cadaUna : null,
      resumen: formato === null ? 'Por unidades sueltas' : `${formato}${total}`,
    };
  }

  // Por peso o por volumen.
  const grande = como.modo === 'peso' ? 'kg' : 'l';
  const pequena = como.modo === 'peso' ? 'g' : 'ml';
  const unidad: UnidadDeLaCompra = como.unidad === pequena ? pequena : grande;
  const porBulto = como.porBulto !== null && como.porBulto > 0 ? como.porBulto : null;
  const envase = como.envase.trim() === '' ? 'Caja' : como.envase.trim();
  const laUnidad = grande === 'kg' ? 'el kg' : 'el litro';

  if (porBulto === null) {
    return {
      unidadDeUso: unidad,
      // En g o ml, el precio que se escribe es el del kilo o el litro: nadie
      // compra a tanto el gramo.
      factor: unidad === pequena ? 1000 : 1,
      formato: unidad === pequena ? (grande === 'kg' ? 'Kilo' : 'Litro') : null,
      contenidoPorUnidad: null,
      unidadDelContenido: null,
      precioDelFormato: laUnidad,
      precioDeLaUnidad: null,
      resumen: como.modo === 'peso' ? 'Suelto, a tanto el kilo' : 'A granel, a tanto el litro',
    };
  }

  const formato = `${envase} de ${numero(porBulto)} ${grande}`;
  return {
    unidadDeUso: unidad,
    factor: Number((unidad === pequena ? porBulto * 1000 : porBulto).toFixed(4)),
    formato,
    contenidoPorUnidad: null,
    unidadDelContenido: null,
    precioDelFormato: `${envase === 'Caja' ? 'la' : 'cada'} ${envase.toLowerCase()}`,
    precioDeLaUnidad: laUnidad,
    resumen: formato,
  };
}

/**
 * El precio de lo que se compra, sabiendo el de la unidad suelta.
 *
 * Tres paquetes a 3,50 € en una caja de seis: la caja son 21,00 €. Una caja de
 * 5 kg a 2,40 € el kilo: 12,00 €. Es lo que se guarda: **el precio del formato**.
 */
export function precioDelFormato(precioDeLaUnidad: Centimos, presentacion: Presentacion): Centimos {
  const porFormato =
    presentacion.unidadDeUso === 'g' || presentacion.unidadDeUso === 'ml'
      ? presentacion.factor / 1000
      : presentacion.factor;
  return porCantidad(precioDeLaUnidad, porFormato);
}

/** Lo que sale cada cosa, para enseñarlo mientras se escribe. */
export interface LoQueSale {
  /** El precio de la unidad suelta —cada paquete, el kilo—, si no es el del formato. */
  readonly porUnidad: Centimos | null;
  /** El kilo o el litro, cuando se compra por unidades que traen algo. */
  readonly porKiloOLitro: { readonly centimos: Centimos; readonly unidad: 'kg' | 'l' } | null;
}

export function loQueSale(precioFormato: Centimos, presentacion: Presentacion): LoQueSale {
  const unidades =
    presentacion.unidadDeUso === 'g' || presentacion.unidadDeUso === 'ml'
      ? presentacion.factor / 1000
      : presentacion.factor;
  const porUnidad =
    presentacion.precioDeLaUnidad === null || unidades <= 0
      ? null
      : entreFactor(precioFormato, unidades);

  let porKiloOLitro: LoQueSale['porKiloOLitro'] = null;
  if (
    presentacion.unidadDeUso === 'ud' &&
    presentacion.contenidoPorUnidad !== null &&
    presentacion.unidadDelContenido !== null
  ) {
    const kilo = enKiloOLitro({
      cantidad: presentacion.contenidoPorUnidad,
      unidad: presentacion.unidadDelContenido,
    });
    const totalKilos = kilo.cuanto * presentacion.factor;
    if (totalKilos > 0) {
      porKiloOLitro = { centimos: entreFactor(precioFormato, totalKilos), unidad: kilo.unidad };
    }
  }

  return { porUnidad, porKiloOLitro };
}

/**
 * Al revés: de un producto guardado, cómo se compra.
 *
 * Es lo que deja corregir la ficha con las mismas tres preguntas del alta, con lo
 * que ya tenía puesto.
 */
export function comoSeCompraDe(producto: {
  readonly unidadDeUso: string;
  readonly factor: number;
  readonly formato: string | null;
  readonly contenidoPorUnidad: number | null;
  readonly unidadDelContenido: string | null;
}): ComoSeCompra {
  const unidad = producto.unidadDeUso as UnidadDeLaCompra;
  const primeraPalabra = (producto.formato ?? '').trim().split(/\s+/)[0] ?? '';

  if (unidad === 'ud') {
    const contenido =
      producto.contenidoPorUnidad !== null && producto.unidadDelContenido !== null
        ? {
            cantidad: producto.contenidoPorUnidad,
            unidad: producto.unidadDelContenido as UnidadDelContenido,
          }
        : null;
    const envaseDelFormato = /^caja de \d+ (\S+)/i.exec(producto.formato ?? '')?.[1];
    const envase =
      producto.factor > 1
        ? (ENVASES.find((e) => enPlural(e) === envaseDelFormato?.toLowerCase()) ?? 'Unidad')
        : (ENVASES.find((e) => e.toLowerCase() === primeraPalabra.toLowerCase()) ?? 'Unidad');
    return { modo: 'unidades', unidad: 'ud', porBulto: producto.factor, envase, contenido };
  }

  const modo: ModoDeCompra = unidad === 'kg' || unidad === 'g' ? 'peso' : 'volumen';
  const enGrande = unidad === 'g' || unidad === 'ml' ? producto.factor / 1000 : producto.factor;
  const envase = BULTOS.find((b) => b.toLowerCase() === primeraPalabra.toLowerCase()) ?? 'Caja';
  return {
    modo,
    unidad,
    porBulto: enGrande === 1 ? null : Number(enGrande.toFixed(4)),
    envase,
    contenido: null,
  };
}
