/**
 * La geometria de la rueda de apps · Parte B5 del Plan.
 *
 * Esta aqui, aparte del componente, porque es **calculo puro**: recibe numeros y
 * devuelve numeros. Asi se prueba sin montar un navegador, que es lo unico que
 * permite comprobar de verdad que «los sectores se reparten» cuando un rol no
 * tiene las ocho apps.
 *
 * Convenio de angulos, y conviene fijarlo porque es donde se equivoca todo el
 * mundo: **0 es arriba y se crece en el sentido de las agujas del reloj**. Es lo
 * que espera quien mira una rueda. SVG mide desde las tres en punto y al reves,
 * asi que la conversion se hace en un solo sitio, aqui.
 */

export interface Sector {
  readonly indice: number;
  /** Grados donde empieza, midiendo desde arriba y en sentido horario. */
  readonly desde: number;
  readonly hasta: number;
  /** El centro del sector, que es donde va el icono. */
  readonly medio: number;
}

/**
 * Reparte la vuelta entera entre las apps que haya.
 *
 * «Las apps que el rol no tiene **no aparecen** y los sectores se reparten»
 * (B5). Con tres apps salen tres sectores de 120 grados, no tres de 45 y un
 * hueco: un hueco se lee como «aqui hay algo que no puedo tocar», y eso es
 * exactamente lo que el Manifiesto no quiere. «Un cocinero no usa Estook con
 * cosas ocultas, usa una aplicacion pensada para el.»
 *
 * El primero se centra arriba, no empieza arriba: con un numero impar de apps,
 * empezar arriba deja la rueda descolgada hacia un lado.
 */
export function sectores(cuantos: number): readonly Sector[] {
  if (cuantos <= 0) return [];

  const paso = 360 / cuantos;
  const inicio = -paso / 2;

  return Array.from({ length: cuantos }, (_, indice) => {
    const desde = inicio + indice * paso;
    return { indice, desde, hasta: desde + paso, medio: desde + paso / 2 };
  });
}

/** De grados de la rueda a coordenadas, sobre un centro y un radio. */
export function puntoEn(grados: number, radio: number, centro = 0): { x: number; y: number } {
  const radianes = ((grados - 90) * Math.PI) / 180;
  return {
    x: centro + radio * Math.cos(radianes),
    y: centro + radio * Math.sin(radianes),
  };
}

/**
 * El camino SVG de un sector: un trozo de corona circular.
 *
 * Se dibuja como camino y no como un cuadrado girado porque el area de toque
 * tiene que ser el sector de verdad. Si fuera un rectangulo, tocar cerca de un
 * borde abriria la app de al lado, y con ocho sectores eso pasa constantemente.
 */
export function caminoDeSector(
  sector: Sector,
  radioInterior: number,
  radioExterior: number,
  centro: number,
): string {
  // Un solo sector no tiene arco: es la corona entera, y un arco de 360 grados
  // en SVG no pinta nada porque el principio y el final son el mismo punto.
  if (sector.hasta - sector.desde >= 359.999) {
    return [
      `M ${centro - radioExterior} ${centro}`,
      `A ${radioExterior} ${radioExterior} 0 1 1 ${centro + radioExterior} ${centro}`,
      `A ${radioExterior} ${radioExterior} 0 1 1 ${centro - radioExterior} ${centro}`,
      `M ${centro - radioInterior} ${centro}`,
      `A ${radioInterior} ${radioInterior} 0 1 0 ${centro + radioInterior} ${centro}`,
      `A ${radioInterior} ${radioInterior} 0 1 0 ${centro - radioInterior} ${centro}`,
      'Z',
    ].join(' ');
  }

  const grande = sector.hasta - sector.desde > 180 ? 1 : 0;

  const fueraDesde = puntoEn(sector.desde, radioExterior, centro);
  const fueraHasta = puntoEn(sector.hasta, radioExterior, centro);
  const dentroHasta = puntoEn(sector.hasta, radioInterior, centro);
  const dentroDesde = puntoEn(sector.desde, radioInterior, centro);

  return [
    `M ${fueraDesde.x} ${fueraDesde.y}`,
    `A ${radioExterior} ${radioExterior} 0 ${grande} 1 ${fueraHasta.x} ${fueraHasta.y}`,
    `L ${dentroHasta.x} ${dentroHasta.y}`,
    `A ${radioInterior} ${radioInterior} 0 ${grande} 0 ${dentroDesde.x} ${dentroDesde.y}`,
    'Z',
  ].join(' ');
}

/** El angulo de la rueda que corresponde a un desplazamiento del dedo. */
export function anguloDe(dx: number, dy: number): number {
  const grados = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
  return ((grados % 360) + 360) % 360;
}

/**
 * Que sector cae bajo un angulo. `null` si no cae en ninguno.
 *
 * Se usa al arrastrar: «se mantiene el dedo en el boton central y se arrastra
 * hacia el» (B5).
 */
export function sectorEn(grados: number, cuantos: number): number | null {
  if (cuantos <= 0) return null;

  const paso = 360 / cuantos;
  // Los sectores empiezan medio paso antes de arriba, asi que se corrige antes
  // de dividir.
  const corregido = (((grados + paso / 2) % 360) + 360) % 360;
  const indice = Math.floor(corregido / paso);

  return indice >= cuantos ? cuantos - 1 : indice;
}
