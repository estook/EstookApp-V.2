import type { LoQueTieneLaCaja, PlatoPorLaCaja } from '@estook/dominio';
import type { LaPantallaDeCocina, PlatoEnCocina, TarjetaDeCocina } from '../datos/tipos.ts';

/**
 * **La pantalla de cocina sin internet** (T5 · 2 · 2, decisión 0123; maqueta de T5 · 2,
 * sección 4). Lo que tenía la pantalla la última vez que llegó a Estook **sigue a la vista**, y
 * encima:
 *
 *   · **lo que le llega por la caja de centro**: lo mandado y lo marchado en los comanderos,
 *     con las mismas reglas que Estook (en marcha, esperando, fuera)
 *   · **lo tachado aquí sin internet**, que sube al volver
 *
 * Un plato que ya estaba no se repite: lo de una vez anterior sin internet ya subió y lo trae
 * Estook. Cálculo puro: se prueba sin abrir nada.
 */

/** Un toque en un plato sin internet: tachado o destachado, en su orden. */
export interface TachadoSinInternet {
  readonly lineaId: string;
  readonly salio: boolean;
  readonly en: number;
}

type Tarjeta = { -readonly [K in keyof TarjetaDeCocina]: TarjetaDeCocina[K] };

function todas(p: LaPantallaDeCocina): TarjetaDeCocina[] {
  return [...p.enMarcha, ...p.esperando, ...p.fuera];
}

function comoPlato(p: PlatoPorLaCaja, alergias: readonly string[]): PlatoEnCocina {
  return {
    id: p.id,
    nombre: p.nombre,
    cantidad: p.cantidad,
    nota: p.nota,
    delMenu: p.delMenu,
    salioEn: null,
    nuevo: true,
    cambio: false,
    anulado: false,
    vuelve: null,
    opciones: p.opciones,
    pesoGramos: p.pesoGramos,
    lleva: alergias.filter((a) => p.alergenos.includes(a)),
  };
}

function tarjetaNueva(lo: LoQueTieneLaCaja): Tarjeta {
  return {
    cuentaId: lo.mesa.cuentaId,
    titulo: lo.mesa.titulo,
    tipo: lo.mesa.tipo,
    personas: lo.mesa.personas,
    camarero: lo.mesa.camarero,
    camareroId: lo.mesa.camareroId,
    notaParaCocina: lo.mesa.notaParaCocina,
    paraLas: lo.mesa.paraLas,
    porPases: lo.mesa.porPases,
    conPrisa: false,
    cocinaLlamaEn: null,
    alergias: lo.mesa.alergias,
    estado: 'en_marcha',
    anulada: null,
    llegoEn: lo.llegoEn,
    minutos: 0,
    ultimaMarcha: null,
    fueraEn: null,
    pases: [],
  };
}

const pendiente = (p: PlatoEnCocina) => p.salioEn === null && !p.anulado;

/** Dónde va la tarjeta, como lo dice Estook (`laMesaEnCocina`): en marcha, esperando o fuera. */
function recolocar(t: Tarjeta, barra: boolean, ahoraMs: number): void {
  const pases = [...t.pases].sort((a, b) => a.numero - b.numero);
  t.pases = pases;
  const sigue = pases.some(
    (p) => (barra || p.marchadoEn !== null) && p.fueraEn === null && p.platos.some(pendiente),
  );
  const espera = !barra && pases.some((p) => p.marchadoEn === null && p.platos.length > 0);
  t.estado = sigue ? 'en_marcha' : espera ? 'esperando' : 'fuera';
  if (t.estado === 'fuera') {
    const salidas = pases.flatMap((p) =>
      p.platos.flatMap((pl) => (pl.salioEn === null ? [] : [pl.salioEn])),
    );
    t.fueraEn = t.fueraEn ?? salidas.sort().at(-1) ?? new Date(ahoraMs).toISOString();
  } else {
    t.fueraEn = null;
  }
  const llego = Date.parse(t.llegoEn);
  if (!Number.isNaN(llego)) t.minutos = Math.max(0, Math.floor((ahoraMs - llego) / 60_000));
}

function enSuSitio(
  base: LaPantallaDeCocina,
  tarjetas: readonly TarjetaDeCocina[],
): LaPantallaDeCocina {
  return {
    ...base,
    enMarcha: tarjetas
      .filter((t) => t.estado === 'en_marcha')
      .sort((a, b) => Number(b.conPrisa) - Number(a.conPrisa) || b.minutos - a.minutos),
    esperando: tarjetas.filter((t) => t.estado === 'esperando'),
    fuera: tarjetas
      .filter((t) => t.estado === 'fuera')
      .sort((a, b) => (b.fueraEn ?? '').localeCompare(a.fueraEn ?? '')),
  };
}

function copiar(t: TarjetaDeCocina): Tarjeta {
  return { ...t, pases: t.pases.map((p) => ({ ...p, platos: [...p.platos] })) };
}

/** Lo que tenía la pantalla, con lo que le ha llegado por la caja encima. */
export function laCocinaConLoDeLaCaja(
  base: LaPantallaDeCocina,
  llegado: readonly LoQueTieneLaCaja[],
  ahoraMs: number,
): LaPantallaDeCocina {
  const barra = base.prepara === 'barra';
  const sitio = barra ? 'barra' : 'cocina';
  const tarjetas = new Map<string, Tarjeta>(todas(base).map((t) => [t.cuentaId, copiar(t)]));
  const tocadas = new Set<string>();
  const conocidos = new Set(
    todas(base).flatMap((t) => t.pases.flatMap((p) => p.platos.map((pl) => pl.id))),
  );

  for (const lo of [...llegado].sort((a, b) => a.llegoEn.localeCompare(b.llegoEn))) {
    const id = lo.mesa.cuentaId;
    const nuevos = lo.platos.filter((p) => p.destino === sitio && !conocidos.has(p.id));

    if (lo.que === 'marcha') {
      if (barra) continue;
      const t = tarjetas.get(id) ?? tarjetaNueva(lo);
      let pase = t.pases.find((p) => p.numero === lo.pase);
      if (pase === undefined) {
        pase = { numero: lo.pase, marchadoEn: null, fueraEn: null, platos: [] };
        t.pases = [...t.pases, pase];
      }
      const marchado = {
        ...pase,
        marchadoEn: lo.llegoEn,
        platos: [...pase.platos, ...nuevos.map((p) => comoPlato(p, lo.mesa.alergias))],
      };
      t.pases = t.pases.map((p) => (p.numero === lo.pase ? marchado : p));
      t.ultimaMarcha = lo.llegoEn;
      for (const p of nuevos) conocidos.add(p.id);
      tarjetas.set(id, t);
      tocadas.add(id);
      continue;
    }

    if (nuevos.length === 0) continue;
    const antes = tarjetas.get(id);
    // En la barra, lo pedido con lo de antes ya servido es otra ronda: tarjeta nueva.
    const t = antes === undefined || (barra && antes.estado === 'fuera') ? tarjetaNueva(lo) : antes;
    for (const p of nuevos) {
      conocidos.add(p.id);
      const numero = barra ? 0 : (p.pase ?? 1);
      const sale = barra || !lo.esperan.includes(numero);
      const pase = t.pases.find((x) => x.numero === numero);
      const plato = comoPlato(p, lo.mesa.alergias);
      if (pase === undefined) {
        t.pases = [
          ...t.pases,
          { numero, marchadoEn: sale ? lo.llegoEn : null, fueraEn: null, platos: [plato] },
        ];
      } else {
        // Un plato nuevo en un pase que había salido lo devuelve a «En marcha», como en Estook.
        t.pases = t.pases.map((x) =>
          x.numero === numero
            ? {
                ...x,
                marchadoEn: x.marchadoEn ?? (sale ? lo.llegoEn : null),
                fueraEn: null,
                platos: [...x.platos, plato],
              }
            : x,
        );
      }
    }
    tarjetas.set(id, t);
    tocadas.add(id);
  }

  for (const id of tocadas) {
    const t = tarjetas.get(id);
    if (t !== undefined) recolocar(t, barra, ahoraMs);
  }
  return enSuSitio(base, [...tarjetas.values()]);
}

/** Con lo tachado y destachado aquí sin internet, en su orden: lo último manda. */
export function conLoTachado(
  pantalla: LaPantallaDeCocina,
  tachados: readonly TachadoSinInternet[],
  ahoraMs: number,
): LaPantallaDeCocina {
  if (tachados.length === 0) return pantalla;
  const ultimo = new Map<string, TachadoSinInternet>();
  for (const t of tachados) ultimo.set(t.lineaId, t);
  const barra = pantalla.prepara === 'barra';
  const tarjetas = todas(pantalla).map((t) => {
    if (!t.pases.some((p) => p.platos.some((pl) => ultimo.has(pl.id)))) return t;
    const copia = copiar(t);
    copia.pases = copia.pases.map((p) => ({
      ...p,
      platos: p.platos.map((pl) => {
        const toque = ultimo.get(pl.id);
        return toque === undefined
          ? pl
          : { ...pl, salioEn: toque.salio ? new Date(toque.en).toISOString() : null };
      }),
    }));
    recolocar(copia, barra, ahoraMs);
    return copia;
  });
  return enSuSitio(pantalla, tarjetas);
}
