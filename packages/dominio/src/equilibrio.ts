import { centimos, conSimbolo } from './dinero.ts';
import { plural } from './textos.ts';

/**
 * El equilibrio de la carta (M10 · 1, decisión 0102; Manifiesto, cap. 14).
 *
 * Con los **principios de Omnes** (años 60), los que se enseñan en las escuelas de
 * hostelería. Se miran **por sección**, porque el cliente compara entrantes con
 * entrantes. COMPROBADO el 20-oct-2026 en dos fuentes que coinciden
 * (koust.net, «Les principes d'Omnès»; qamarero.com, «Principios de Omnes»):
 *
 *   · **El salto de precios** (amplitud): el más caro no pasa de 2,5 veces el más
 *     barato con 9 platos o menos, ni de 3 veces con más.
 *   · **La franja media** (dispersión): partido el rango en tres franjas iguales, la del
 *     medio tiene al menos tantos platos como las otras dos juntas.
 *   · **El tamaño** (amplitud de gama): de 6 a 12 platos por sección. Solo se dice lo
 *     largo: una sección corta no es un problema que haya que arreglar (plantilla, 20).
 *
 * El tercero de Omnes —lo que se pide frente a lo que se ofrece— necesita lo vendido
 * plato a plato, y espera a M10 · 2. **Estook calcula y dice; no toca nada.**
 */

/** Con menos platos con precio no se juzga una sección: dos precios no son un rango. */
export const MINIMO_PARA_JUZGAR = 3;
/** Más platos que esto en una sección, y se dice (Omnes, amplitud de gama). */
export const MAXIMO_DE_PLATOS_POR_SECCION = 12;

/** El salto que admite una sección según cuántos platos tiene. */
export function saltoQueSeAdmite(platos: number): number {
  return platos > 9 ? 3 : 2.5;
}

export interface PlatoParaElEquilibrio {
  readonly nombre: string;
  /** El precio de sala, con IVA. Nulo si no tiene. */
  readonly precioCentimos: number | null;
}

export interface SeccionParaElEquilibrio {
  readonly nombre: string;
  readonly platos: readonly PlatoParaElEquilibrio[];
}

export interface EquilibrioDeUnaSeccion {
  readonly nombre: string;
  readonly platos: number;
  readonly conPrecio: number;
  /** Si hay platos con precio para juzgarla. */
  readonly juzgada: boolean;
  readonly masBarato: number | null;
  readonly masCaro: number | null;
  /** Cuántas veces el más caro es el más barato, con un decimal. */
  readonly salto: number | null;
  readonly saltoAdmitido: number;
  /** Los platos de cada franja: barata, media y cara. */
  readonly franjas: { readonly baja: number; readonly media: number; readonly alta: number } | null;
  /** Lo que hay que mirar, en frases cortas. Vacío: está equilibrada. */
  readonly avisos: readonly string[];
}

export interface EquilibrioDeLaCarta {
  readonly secciones: readonly EquilibrioDeUnaSeccion[];
  /** Cuántas secciones juzgadas tienen algo que mirar. */
  readonly conAlgoQueMirar: number;
  readonly juzgadas: number;
}

/** Un cociente (no dinero) con un decimal: «3,7 veces». */
function conUnDecimal(valor: number): number {
  return Number(valor.toFixed(1));
}

function comoVeces(valor: number): string {
  return `${String(conUnDecimal(valor)).replace('.', ',')} veces`;
}

/** Cómo está una sección. */
export function equilibrioDeUnaSeccion(seccion: SeccionParaElEquilibrio): EquilibrioDeUnaSeccion {
  const precios = seccion.platos
    .map((p) => p.precioCentimos)
    .filter((p): p is number => p !== null && p > 0)
    .sort((a, b) => a - b);
  const platos = seccion.platos.length;
  const admitido = saltoQueSeAdmite(precios.length);
  const avisos: string[] = [];

  if (platos > MAXIMO_DE_PLATOS_POR_SECCION) {
    avisos.push(
      `${String(platos)} platos: de 6 a 12 por sección se compran y se hacen mejor, y el cliente elige antes.`,
    );
  }

  const masBarato = precios[0];
  const masCaro = precios[precios.length - 1];
  if (precios.length < MINIMO_PARA_JUZGAR || masBarato === undefined || masCaro === undefined) {
    return {
      nombre: seccion.nombre,
      platos,
      conPrecio: precios.length,
      juzgada: false,
      masBarato: masBarato ?? null,
      masCaro: masCaro ?? null,
      salto: null,
      saltoAdmitido: admitido,
      franjas: null,
      avisos,
    };
  }

  const salto = masCaro / masBarato;
  if (salto > admitido) {
    avisos.push(
      `De ${conSimbolo(centimos(masBarato))} a ${conSimbolo(centimos(masCaro))}: el más caro es ${comoVeces(salto)} el más barato, y lo normal es hasta ${comoVeces(admitido)}. Al cliente le cuesta situarse.`,
    );
  }

  // Tres franjas iguales del rango. Lo que cae justo en un borde va a la del medio.
  const tercio = (masCaro - masBarato) / 3;
  const finDeLaBaja = masBarato + tercio;
  const principioDeLaAlta = masCaro - tercio;
  const franjas = { baja: 0, media: 0, alta: 0 };
  for (const precio of precios) {
    if (tercio === 0 || (precio >= finDeLaBaja && precio <= principioDeLaAlta)) franjas.media += 1;
    else if (precio < finDeLaBaja) franjas.baja += 1;
    else franjas.alta += 1;
  }
  if (franjas.media < franjas.baja + franjas.alta) {
    const lado =
      franjas.baja > franjas.alta
        ? 'casi todo es barato: el cliente va a lo barato y el ticket medio baja'
        : franjas.alta > franjas.baja
          ? 'casi todo es caro: el cliente se asusta o pide lo más barato'
          : 'hay platos baratos y caros, y pocos en medio';
    avisos.push(
      `${plural(franjas.baja, 'barato', 'baratos')}, ${String(franjas.media)} en medio y ${plural(franjas.alta, 'caro', 'caros')}: ${lado}. Lo normal es que la franja media tenga al menos tantos como las otras dos juntas.`,
    );
  }

  return {
    nombre: seccion.nombre,
    platos,
    conPrecio: precios.length,
    juzgada: true,
    masBarato,
    masCaro,
    salto: conUnDecimal(salto),
    saltoAdmitido: admitido,
    franjas,
    avisos,
  };
}

/** Cómo está la carta, sección a sección, en su orden. */
export function equilibrioDeLaCarta(
  secciones: readonly SeccionParaElEquilibrio[],
): EquilibrioDeLaCarta {
  const vistas = secciones.filter((s) => s.platos.length > 0).map(equilibrioDeUnaSeccion);
  return {
    secciones: vistas,
    conAlgoQueMirar: vistas.filter((s) => s.avisos.length > 0).length,
    juzgadas: vistas.filter((s) => s.juzgada).length,
  };
}
