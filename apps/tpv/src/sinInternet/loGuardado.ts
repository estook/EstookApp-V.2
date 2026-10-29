import type { CuentaEnElPlano, ElPlano, LaMesa } from '../datos/tipos.ts';
import { loQueEspera, type CosaPorSubir, type LineaGuardada } from './laCola.ts';

/**
 * **Lo guardado sin internet, en la sala** (T5 · 2 · 1): la mesa que se abrió sin internet
 * sale ocupada en el plano y se puede abrir; lo pedido y mandado sin internet se ve en su
 * mesa, aparte, como «guardado en este aparato». La pantalla **no se inventa lo que diría la
 * cocina**: qué sale y qué espera lo decide Estook al llegarle.
 */

interface AbrirGuardado {
  readonly cuenta_id: string;
  readonly mesa_id?: string;
  readonly personas?: number;
  readonly por_pases?: boolean;
  readonly tipo?: 'barra' | 'para_llevar';
  readonly nombre?: string;
  readonly para_las?: string;
}

function lasAperturas(cola: readonly CosaPorSubir[]): readonly (AbrirGuardado & {
  readonly cosa: CosaPorSubir;
})[] {
  return loQueEspera(cola)
    .filter((c) => c.nombre === 'abrir_mesa')
    .map((c) => ({ ...(c.entrada as AbrirGuardado), cosa: c }));
}

/** Lo pedido sin internet en esta cuenta, aún sin subir. */
export function lineasGuardadas(
  cuentaId: string,
  cola: readonly CosaPorSubir[],
): readonly LineaGuardada[] {
  return loQueEspera(cola)
    .filter((c) => c.cuentaId === cuentaId && c.nombre === 'pedir')
    .flatMap((c) => c.lineas ?? []);
}

function loQueValen(lineas: readonly LineaGuardada[]): number {
  return lineas.reduce((suma, l) => suma + l.precioCentimos * l.cantidad, 0);
}

function elTitulo(abierta: AbrirGuardado, nombreDeLaMesa: string | null): string {
  if (abierta.mesa_id !== undefined) return `Mesa ${nombreDeLaMesa ?? ''}`.trim();
  const nombre = abierta.nombre ?? null;
  if (abierta.tipo === 'para_llevar')
    return nombre === null ? 'Para llevar' : `Para llevar · ${nombre}`;
  return nombre === null ? 'Barra' : `Barra · ${nombre}`;
}

function laCuenta(
  abierta: AbrirGuardado & { readonly cosa: CosaPorSubir },
  titulo: string,
  cola: readonly CosaPorSubir[],
  ahora: number,
): CuentaEnElPlano {
  const lineas = lineasGuardadas(abierta.cuenta_id, cola);
  const quien = abierta.cosa.quien;
  return {
    cuentaId: abierta.cuenta_id,
    titulo,
    tipo: abierta.mesa_id === undefined ? (abierta.tipo ?? 'barra') : 'mesa',
    personas: abierta.personas ?? null,
    camarero: quien.nombre,
    camareroId: quien.id,
    iniciales: quien.nombre.slice(0, 2).toUpperCase(),
    esMia: true,
    minutos: Math.max(0, Math.floor((ahora - abierta.cosa.hechoEn) / 60_000)),
    totalCentimos: loQueValen(lineas),
    porPases: abierta.tipo === 'para_llevar' ? false : (abierta.por_pases ?? true),
    notaParaCocina: null,
    paraLas: abierta.para_las ?? null,
    conPrisa: false,
    cocinaLlamaEn: null,
    alergias: [],
    loSiguiente: lineas.length > 0 ? { que: 'mandar' } : { que: 'pedir' },
    suCamareroSeHaIdo: false,
  };
}

/** Si este pase ya se marchó sin internet: no se ofrece marcharlo otra vez. */
export function marchadoSinInternet(
  cuentaId: string,
  pase: number,
  cola: readonly CosaPorSubir[],
): boolean {
  return loQueEspera(cola).some(
    (c) =>
      c.nombre === 'marchar' &&
      c.cuentaId === cuentaId &&
      (c.entrada as { readonly pase?: number }).pase === pase,
  );
}

/** El plano con las mesas abiertas sin internet, como las vería quien las abrió. */
export function elPlanoConLoGuardado(
  plano: ElPlano,
  cola: readonly CosaPorSubir[],
  ahora: number,
): ElPlano {
  if (loQueEspera(cola).length === 0) return plano;
  const tocaMarchar = plano.tocaMarchar.filter(
    (t) => !marchadoSinInternet(t.cuentaId, t.pase, cola),
  );
  const abiertas = lasAperturas(cola);
  if (abiertas.length === 0) return { ...plano, tocaMarchar };
  const yaEstan = new Set([
    ...plano.zonas.flatMap((z) =>
      z.mesas.flatMap((m) => (m.cuenta === null ? [] : [m.cuenta.cuentaId])),
    ),
    ...plano.sinMesa.map((c) => c.cuentaId),
  ]);
  const nuevas = abiertas.filter((a) => !yaEstan.has(a.cuenta_id));
  return {
    ...plano,
    tocaMarchar,
    zonas: plano.zonas.map((z) => ({
      ...z,
      mesas: z.mesas.map((m) => {
        const suya = nuevas.find((a) => a.mesa_id === m.id);
        if (suya === undefined || m.cuenta !== null) return m;
        const cuenta = laCuenta(suya, elTitulo(suya, m.nombre), cola, ahora);
        return { ...m, estado: cuenta.totalCentimos > 0 ? 'por_mandar' : 'sin_pedir', cuenta };
      }),
    })),
    sinMesa: [
      ...plano.sinMesa,
      ...nuevas
        .filter((a) => a.mesa_id === undefined)
        .map((a) => laCuenta(a, elTitulo(a, null), cola, ahora)),
    ],
  };
}

/** La mesa abierta sin internet, para entrar en ella sin que Estook la conozca todavía. */
export function laMesaGuardada(
  cuentaId: string,
  cola: readonly CosaPorSubir[],
  plano: ElPlano | undefined,
  ahora: number,
): LaMesa | undefined {
  const abierta = lasAperturas(cola).find((a) => a.cuenta_id === cuentaId);
  if (abierta === undefined) return undefined;
  const mesa = plano?.zonas.flatMap((z) => z.mesas).find((m) => m.id === abierta.mesa_id);
  const cuenta = laCuenta(abierta, elTitulo(abierta, mesa?.nombre ?? null), cola, ahora);
  return {
    cuentaId,
    titulo: cuenta.titulo,
    tipo: cuenta.tipo,
    mesaId: abierta.mesa_id ?? null,
    personas: cuenta.personas,
    camarero: cuenta.camarero,
    porPases: cuenta.porPases,
    notaParaCocina: null,
    paraLas: cuenta.paraLas ?? null,
    conPrisa: false,
    cocinaLlamaEn: null,
    alergias: [],
    abierta: true,
    minutos: cuenta.minutos,
    // Lo pedido va aparte, como guardado: el total de Estook empieza en cero.
    totalCentimos: 0,
    platos: [],
    pases: [],
    loSiguiente: { que: 'pedir' },
  };
}
