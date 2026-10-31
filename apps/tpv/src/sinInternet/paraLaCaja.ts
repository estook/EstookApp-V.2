import {
  losPasesQueSalenAlMandar,
  type LoQueSePasaPorLaCaja,
  type MesaPorLaCaja,
  type PaseDeLaMesa,
  type PlatoDeLaMesa,
  type PlatoPorLaCaja,
} from '@estook/dominio';
import type { LaMesa, PlatoDeLaCuenta } from '../datos/tipos.ts';
import type { LineaNueva } from '../logica/comanda.ts';
import { loQueEspera, type CosaPorSubir } from './laCola.ts';

/**
 * **Lo que el comandero le pasa a la caja** (T5 · 2 · 2, decisión 0123): sin internet, al mandar
 * o al marchar, se arma aquí lo que la cocina tiene que ver —la mesa, los platos y qué pase
 * espera— con lo que el comandero sabe: la mesa como la leyó, lo pedido ahora y lo que ya pasó
 * por la caja. **Con las mismas reglas que Estook** (`losPasesQueSalenAlMandar`): el papel de
 * la caja dice lo mismo que diría con internet. Cálculo puro.
 */

/** Lo pasado antes a la caja de esta mesa, en su orden. */
function loDeAntes(cuentaId: string, cola: readonly CosaPorSubir[]): LoQueSePasaPorLaCaja[] {
  return loQueEspera(cola).flatMap((c) =>
    c.paraLaCaja !== undefined && c.paraLaCaja.mesa.cuentaId === cuentaId ? [c.paraLaCaja] : [],
  );
}

export function laMesaParaLaCaja(mesa: LaMesa): MesaPorLaCaja {
  return {
    cuentaId: mesa.cuentaId,
    titulo: mesa.titulo,
    tipo: mesa.tipo,
    personas: mesa.personas,
    camarero: mesa.camarero,
    camareroId: null,
    notaParaCocina: mesa.notaParaCocina,
    paraLas: mesa.paraLas ?? null,
    porPases: mesa.porPases,
    alergias: mesa.alergias ?? [],
  };
}

function deLaCuenta(p: PlatoDeLaCuenta): PlatoPorLaCaja | null {
  if (p.destino === 'ninguno') return null;
  return {
    id: p.id,
    nombre: p.nombre,
    cantidad: p.cantidad,
    nota: p.nota,
    opciones: p.opciones ?? [],
    pesoGramos: p.pesoGramos ?? null,
    alergenos: p.alergenos ?? [],
    destino: p.destino,
    pase: p.destino === 'cocina' ? p.pase : null,
    delMenu: p.parteDe !== null,
  };
}

function delBorrador(
  l: LineaNueva,
  alergenosDe: (platoId: string) => readonly string[],
): PlatoPorLaCaja | null {
  if (l.destino === 'ninguno') return null;
  return {
    id: l.id,
    nombre: l.nombre,
    cantidad: l.cantidad,
    nota: l.nota,
    opciones: (l.opciones ?? []).map((o) => o.nombre),
    pesoGramos: l.pesoGramos ?? null,
    alergenos: l.platoId === null ? [] : alergenosDe(l.platoId),
    destino: l.destino,
    pase: l.destino === 'cocina' ? l.pase : null,
    delMenu: l.parteDe !== null,
  };
}

/** Los platos y pases de la mesa como los vería Estook, con lo pasado antes por la caja. */
function comoEstaLaMesa(
  mesa: LaMesa,
  antes: readonly LoQueSePasaPorLaCaja[],
): { platos: PlatoDeLaMesa[]; pases: PaseDeLaMesa[] } {
  const platos: PlatoDeLaMesa[] = mesa.platos.map((p) => ({
    destino: p.destino,
    pase: p.destino === 'cocina' ? p.pase : null,
    mandado: p.estado !== 'sin_mandar',
    salio: p.estado === 'salio',
    quitado: p.estado === 'quitado',
  }));
  const pases = new Map<number, PaseDeLaMesa>(
    mesa.pases.map((p) => [
      p.numero,
      { numero: p.numero, marchado: p.marchadoEn !== null, fuera: p.haSalido },
    ]),
  );
  const conocidos = new Set(mesa.platos.map((p) => p.id));
  for (const lo of antes) {
    if (lo.que === 'marcha') {
      pases.set(lo.pase, { numero: lo.pase, marchado: true, fuera: false });
      continue;
    }
    for (const p of lo.platos) {
      if (conocidos.has(p.id)) continue;
      conocidos.add(p.id);
      platos.push({
        destino: p.destino,
        pase: p.pase,
        mandado: true,
        salio: false,
        quitado: false,
      });
      if (p.pase !== null && !pases.has(p.pase)) {
        pases.set(p.pase, { numero: p.pase, marchado: !lo.esperan.includes(p.pase), fuera: false });
      }
    }
  }
  return { platos, pases: [...pases.values()] };
}

/**
 * **Lo mandado a cocina**, para la caja: lo del borrador y lo pedido sin mandar, con qué pases
 * salen ya y cuáles esperan a que la sala los marche. Nulo si no va nada a cocina ni a la barra.
 */
export function loMandadoParaLaCaja(
  id: string,
  mesa: LaMesa,
  borrador: readonly LineaNueva[],
  cola: readonly CosaPorSubir[],
  donde: { readonly hora: string; readonly aparato: string },
  alergenosDe: (platoId: string) => readonly string[] = () => [],
): LoQueSePasaPorLaCaja | null {
  const antes = loDeAntes(mesa.cuentaId, cola);
  const nuevos = [
    ...mesa.platos.filter((p) => p.estado === 'sin_mandar').map(deLaCuenta),
    ...borrador.map((l) => delBorrador(l, alergenosDe)),
  ].filter((p): p is PlatoPorLaCaja => p !== null);
  if (nuevos.length === 0) return null;

  const { platos, pases } = comoEstaLaMesa(mesa, antes);
  const yaEsperaban = pases.filter((p) => !p.marchado).map((p) => p.numero);
  const conLoNuevo = [
    ...platos,
    ...nuevos.map((p) => ({
      destino: p.destino,
      pase: p.pase,
      mandado: true,
      salio: false,
      quitado: false,
    })),
  ];
  const salen = new Set(losPasesQueSalenAlMandar(conLoNuevo, pases, mesa.porPases, yaEsperaban));
  const marchados = new Set(pases.filter((p) => p.marchado).map((p) => p.numero));
  const esperan = [
    ...new Set(
      nuevos.flatMap((p) =>
        p.destino === 'cocina' && p.pase !== null && !salen.has(p.pase) && !marchados.has(p.pase)
          ? [p.pase]
          : [],
      ),
    ),
  ].sort((a, b) => a - b);

  return {
    que: 'nueva',
    id,
    mesa: laMesaParaLaCaja(mesa),
    platos: nuevos,
    esperan,
    hora: donde.hora,
    aparato: donde.aparato,
  };
}

/** **La marcha de un pase**, para la caja: con lo que falta por salir de él. */
export function laMarchaParaLaCaja(
  id: string,
  mesa: LaMesa,
  pase: number,
  cola: readonly CosaPorSubir[],
  donde: { readonly hora: string; readonly aparato: string },
): LoQueSePasaPorLaCaja {
  const delPase = mesa.platos
    .filter(
      (p) =>
        p.destino === 'cocina' &&
        p.pase === pase &&
        p.estado !== 'sin_mandar' &&
        p.estado !== 'salio' &&
        p.estado !== 'quitado',
    )
    .map(deLaCuenta)
    .filter((p): p is PlatoPorLaCaja => p !== null);
  const conocidos = new Set(delPase.map((p) => p.id));
  const deAntes = loDeAntes(mesa.cuentaId, cola).flatMap((lo) =>
    lo.que === 'nueva'
      ? lo.platos.filter((p) => p.destino === 'cocina' && p.pase === pase && !conocidos.has(p.id))
      : [],
  );
  return {
    que: 'marcha',
    id,
    mesa: laMesaParaLaCaja(mesa),
    pase,
    platos: [...delPase, ...deAntes],
    hora: donde.hora,
    aparato: donde.aparato,
  };
}

/** «21:38», con el reloj del aparato: solo para el papel, no decide ningún día. */
export function laHoraDeAhora(ahoraMs: number = Date.now()): string {
  return new Date(ahoraMs).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}
